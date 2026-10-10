"""Annotated disassembly of a classic Mac PowerPC PEF application.

usage: python disasm.py <pef-file> <out-dir>
Writes:
  functions.tsv   start, end, name
  disasm.txt      every function, with names for bl targets, TOC references
                  (strings, imports, globals) and literal values
  toc.tsv         TOC entries
"""
import os
import struct
import sys

from capstone import Cs, CS_ARCH_PPC, CS_MODE_32, CS_MODE_BIG_ENDIAN

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pef as peflib  # noqa: E402


def parse_tracebacks(code, base):
    """Return list of (func_start, tb_marker_addr, tb_end, name)."""
    out = []
    n = len(code) // 4
    words = struct.unpack('>%dI' % n, code[:n * 4])
    i = 1
    while i < n - 2:
        if words[i] == 0 and words[i - 1] in (0x4E800020, 0x4E800420) or (words[i] == 0 and (words[i - 1] >> 26) == 18):
            p = (i + 1) * 4
            b = code[p:p + 8]
            if len(b) < 8:
                break
            version, lang, f1, f2, f3, f4, fixedparms, f5 = b
            if version != 0:
                i += 1
                continue
            has_tboff = (f1 >> 5) & 1
            int_hndl = (f2 >> 7) & 1
            name_present = (f2 >> 6) & 1
            uses_alloca = (f2 >> 5) & 1
            has_ctl = (f1 >> 3) & 1
            floatparms = f5 >> 1
            q = p + 8
            if fixedparms or floatparms:
                q += 4
            tboff = None
            if has_tboff:
                tboff = struct.unpack('>I', code[q:q + 4])[0]
                q += 4
            if int_hndl:
                q += 4
            if has_ctl:
                nctl = struct.unpack('>I', code[q:q + 4])[0]
                q += 4 + 4 * nctl
            name = None
            if name_present:
                ln = struct.unpack('>H', code[q:q + 2])[0]
                raw = code[q + 2:q + 2 + ln]
                if 0 < ln < 128 and all(32 <= c < 127 for c in raw):
                    name = raw.decode('ascii')
                q += 2 + ln
            if uses_alloca:
                q += 1
            q = (q + 3) & ~3
            marker = base + i * 4
            start = marker - tboff if tboff else None
            if name or tboff:
                out.append((start, marker, base + q, name))
                i = (q - 0) // 4
                continue
        i += 1
    return out


def main(path, outdir):
    os.makedirs(outdir, exist_ok=True)
    P = peflib.PEF(open(path, 'rb').read())
    code = bytes(P.mem[P.code_idx])
    cbase = P.base[P.code_idx]
    ms, mo = P.main
    toc = P.u32(P.base[ms] + mo + 4)
    tbs = parse_tracebacks(code, cbase)
    funcs = []
    prev_end = cbase
    for start, marker, tbend, name in tbs:
        s = start if start is not None else prev_end
        funcs.append([s, marker, name or ('sub_%08x' % s)])
        prev_end = tbend
    names = {f[0]: f[2] for f in funcs}
    imports = {P.import_addr(i): n for i, (n, lib) in enumerate(P.imports)}

    # Transition vectors in data that point at code -> function pointers
    data = P.mem[P.data_idx]
    dbase = P.base[P.data_idx]

    def describe_ptr(v):
        if v in imports:
            return 'import:' + imports[v]
        if v in names:
            return 'func:' + names[v]
        if cbase <= v < cbase + len(code):
            return 'code:%08x' % v
        if dbase <= v < dbase + len(data):
            # a transition vector (code ptr, toc)?
            w0 = P.u32(v)
            if w0 in names and P.u32(v + 4) == toc:
                return 'tvec:' + names[w0]
            if w0 in imports:
                return 'tvec-import:' + imports[w0]
            s = P.cstring(v, 80)
            if s and len(s) >= 3 and all(31 < ord(ch) < 127 or ch in '\r\t' for ch in s):
                return 'str:"%s"' % s.replace('\r', '\\r')
            ps = P.pstring(v)
            if ps and len(ps) >= 3 and all(31 < ord(ch) < 127 for ch in ps):
                return 'pstr:"%s"' % ps
            return 'data:%08x' % v
        return None

    with open(os.path.join(outdir, 'toc.tsv'), 'w') as fh:
        for off in range(-0x8000, 0x8000, 4):
            a = toc + off
            v = P.u32(a)
            if v is None:
                continue
            d = describe_ptr(v)
            fh.write('%d\t%08x\t%08x\t%s\n' % (off, a, v, d or ''))

    md = Cs(CS_ARCH_PPC, CS_MODE_32 | CS_MODE_BIG_ENDIAN)
    md.detail = False
    with open(os.path.join(outdir, 'functions.tsv'), 'w') as fh:
        for s, e, n in funcs:
            fh.write('%08x\t%08x\t%s\n' % (s, e, n))
    with open(os.path.join(outdir, 'disasm.txt'), 'w') as fh:
        for s, e, n in funcs:
            fh.write('\n\n==== %s  [%08x-%08x]\n' % (n, s, e))
            blob = code[s - cbase:e - cbase]
            for ins in md.disasm(blob, s):
                note = ''
                ops = ins.op_str
                if ins.mnemonic in ('bl', 'b', 'bla') or ins.mnemonic.startswith('b') and ops.startswith('0x'):
                    try:
                        tgt = int(ops.split(',')[-1].strip(), 16)
                        if tgt in names:
                            note = names[tgt]
                    except ValueError:
                        pass
                if '(r2)' in ops:
                    try:
                        disp = int(ops.split(',')[-1].split('(')[0].strip(), 0)
                        v = P.u32(toc + disp)
                        d = describe_ptr(v) if v is not None else None
                        note = 'TOC[%d] -> %s' % (disp, d or ('%08x' % v if v is not None else '?'))
                    except ValueError:
                        pass
                fh.write('%08x: %-8s %-30s %s\n' % (ins.address, ins.mnemonic, ops, ('; ' + note) if note else ''))
    print('functions:', len(funcs), 'named:', sum(1 for f in funcs if not f[2].startswith('sub_')), 'toc=%08x' % toc)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
