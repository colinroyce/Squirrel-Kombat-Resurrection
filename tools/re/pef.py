"""Minimal PEF (Preferred Executable Format) loader for classic Mac PowerPC code.

Loads sections, expands pattern-initialized data, applies loader relocations,
resolves imports and finds the TOC. Used by disasm.py.
"""
import struct

CODE_BASE = 0x10000000
DATA_BASE = 0x20000000
IMPORT_BASE = 0x30000000


def _varint(buf, p):
    v = 0
    while True:
        b = buf[p]
        p += 1
        v = (v << 7) | (b & 0x7F)
        if not b & 0x80:
            return v, p


def unpack_pidata(packed, size):
    out = bytearray()
    p = 0
    while p < len(packed):
        b = packed[p]
        p += 1
        op, cnt = b >> 5, b & 0x1F
        if cnt == 0:
            cnt, p = _varint(packed, p)
        if op == 0:
            out += b'\x00' * cnt
        elif op == 1:
            out += packed[p:p + cnt]
            p += cnt
        elif op == 2:
            rep, p = _varint(packed, p)
            blk = packed[p:p + cnt]
            p += cnt
            out += blk * (rep + 1)
        elif op == 3:
            custom, p = _varint(packed, p)
            rep, p = _varint(packed, p)
            common = packed[p:p + cnt]
            p += cnt
            for _ in range(rep):
                out += common
                out += packed[p:p + custom]
                p += custom
            out += common
        elif op == 4:
            custom, p = _varint(packed, p)
            rep, p = _varint(packed, p)
            for _ in range(rep):
                out += b'\x00' * cnt
                out += packed[p:p + custom]
                p += custom
            out += b'\x00' * cnt
        else:
            raise ValueError('bad pidata opcode %d' % op)
    if len(out) < size:
        out += b'\x00' * (size - len(out))
    return bytes(out)


class PEF:
    def __init__(self, blob):
        self.blob = blob
        if blob[:12] != b'Joy!peffpwpc':
            raise ValueError('not a PowerPC PEF container')
        nsec, ninst = struct.unpack('>HH', blob[32:36])
        self.sections = []
        for i in range(nsec):
            h = blob[40 + i * 28: 68 + i * 28]
            name_off, def_addr, total, unpacked, packed, coff, kind, share, align, _ = struct.unpack('>iIIIIIBBBB', h)
            self.sections.append(dict(index=i, kind=kind, total=total, unpacked=unpacked, packed=packed, offset=coff))
        self.inst = [s for s in self.sections if s['kind'] in (0, 1, 2, 3, 6)]
        self.base = {}
        self.mem = {}
        for s in self.inst:
            raw = blob[s['offset']:s['offset'] + s['packed']]
            if s['kind'] == 2:
                data = unpack_pidata(raw, s['total'])
            else:
                data = raw + b'\x00' * (s['total'] - len(raw))
            self.mem[s['index']] = bytearray(data[:s['total']] if len(data) >= s['total'] else data + b'\x00' * (s['total'] - len(data)))
            self.base[s['index']] = CODE_BASE if s['kind'] == 0 else DATA_BASE
        self.code_idx = next(s['index'] for s in self.inst if s['kind'] == 0)
        self.data_idx = next(s['index'] for s in self.inst if s['kind'] in (1, 2))
        self.imports = []
        self._load_loader()

    def _load_loader(self):
        ld = next(s for s in self.sections if s['kind'] == 4)
        L = self.blob[ld['offset']:ld['offset'] + ld['packed']]
        (main_sec, main_off, init_sec, init_off, term_sec, term_off, nlibs, nsyms, nreloc_secs,
         reloc_instr_off, strings_off, hash_off, hash_pow, nexports) = struct.unpack('>iIiIiIIIIIIIII', L[:56])
        p = 56
        libs = []
        for i in range(nlibs):
            name_off, _, _, cnt, first, opts, _, _ = struct.unpack('>IIIIIBBH', L[p:p + 24])
            libs.append((self._cstr(L, strings_off + name_off), cnt, first))
            p += 24
        sym_lib = {}
        for lname, cnt, first in libs:
            for k in range(cnt):
                sym_lib[first + k] = lname
        for i in range(nsyms):
            w = struct.unpack('>I', L[p:p + 4])[0]
            p += 4
            self.imports.append((self._cstr(L, strings_off + (w & 0xFFFFFF)), sym_lib.get(i, '?')))
        self.main = (main_sec, main_off)
        reloc_heads = []
        for i in range(nreloc_secs):
            sec, _, cnt, first = struct.unpack('>HHII', L[p:p + 12])
            reloc_heads.append((sec, cnt, first))
            p += 12
        for sec, cnt, first in reloc_heads:
            instrs = struct.unpack('>%dH' % cnt, L[reloc_instr_off + first: reloc_instr_off + first + cnt * 2])
            self._relocate(sec, instrs)

    @staticmethod
    def _cstr(buf, p):
        e = buf.index(b'\x00', p)
        return buf[p:e].decode('mac_roman')

    def import_addr(self, i):
        return IMPORT_BASE + i * 16

    def _relocate(self, sec, instrs):
        mem = self.mem[sec]
        pos = 0
        sect_c = self.base[self.code_idx]
        sect_d = self.base[self.data_idx]
        imp = 0

        def add(v):
            nonlocal pos
            w = struct.unpack('>I', mem[pos:pos + 4])[0]
            struct.pack_into('>I', mem, pos, (w + v) & 0xFFFFFFFF)
            pos += 4

        def sect_base(idx):
            return self.base[idx]

        i = 0
        history = []
        while i < len(instrs):
            start = i
            w = instrs[i]
            i += 1
            if w >> 14 == 0:  # RelocBySectDWithSkip
                skip, cnt = (w >> 6) & 0xFF, w & 0x3F
                pos += skip * 4
                for _ in range(cnt):
                    add(sect_d)
            elif w >> 13 == 0b010:
                sub, run = (w >> 9) & 0xF, (w & 0x1FF) + 1
                for _ in range(run):
                    if sub == 0:
                        add(sect_c)
                    elif sub == 1:
                        add(sect_d)
                    elif sub == 2:
                        add(sect_c); add(sect_d); pos += 4
                    elif sub == 3:
                        add(sect_c); add(sect_d)
                    elif sub == 4:
                        add(sect_d); pos += 4
                    elif sub == 5:
                        add(self.import_addr(imp)); imp += 1
                    else:
                        raise ValueError('reloc run sub %d' % sub)
            elif w >> 13 == 0b011:
                sub, idx = (w >> 9) & 0xF, w & 0x1FF
                if sub == 0:
                    add(self.import_addr(idx)); imp = idx + 1
                elif sub == 1:
                    sect_c = sect_base(idx)
                elif sub == 2:
                    sect_d = sect_base(idx)
                elif sub == 3:
                    add(sect_base(idx))
                else:
                    raise ValueError('reloc sm sub %d' % sub)
            elif w >> 12 == 0b1000:
                pos += (w & 0xFFF) + 1
            elif w >> 12 == 0b1001:
                blocks, rep = ((w >> 8) & 0xF) + 1, (w & 0xFF) + 1
                seg = history[-blocks:]
                for _ in range(rep):
                    for (a, b) in seg:
                        sub_instrs = instrs[a:b]
                        self._run_simple(sub_instrs, locals())
                continue
            elif w >> 10 == 0b101000:
                pos = ((w & 0x3FF) << 16) | instrs[i]; i += 1
            elif w >> 10 == 0b101001:
                idx = ((w & 0x3FF) << 16) | instrs[i]; i += 1
                add(self.import_addr(idx)); imp = idx + 1
            elif w >> 10 == 0b101101:
                sub = (w >> 6) & 0xF
                idx = ((w & 0x3F) << 16) | instrs[i]; i += 1
                if sub == 0:
                    add(sect_base(idx))
                elif sub == 1:
                    sect_c = sect_base(idx)
                elif sub == 2:
                    sect_d = sect_base(idx)
            elif w >> 10 == 0b101100:
                raise ValueError('RelocLgRepeat not implemented')
            else:
                raise ValueError('unknown reloc opcode %04x' % w)
            history.append((start, i))
        self._pos_after = pos

    def _run_simple(self, sub_instrs, env):
        raise NotImplementedError('relocation repeat blocks not supported yet')

    # --- memory helpers -----------------------------------------------------
    def section_for(self, addr):
        for idx, base in self.base.items():
            if base <= addr < base + len(self.mem[idx]):
                return idx, addr - base
        return None, None

    def u32(self, addr):
        idx, off = self.section_for(addr)
        if idx is None:
            return None
        return struct.unpack('>I', self.mem[idx][off:off + 4])[0]

    def cstring(self, addr, maxlen=200):
        idx, off = self.section_for(addr)
        if idx is None:
            return None
        m = self.mem[idx]
        e = off
        while e < len(m) and m[e] != 0 and e - off < maxlen:
            e += 1
        return bytes(m[off:e]).decode('mac_roman', 'replace')

    def pstring(self, addr):
        idx, off = self.section_for(addr)
        if idx is None:
            return None
        m = self.mem[idx]
        n = m[off]
        return bytes(m[off + 1:off + 1 + n]).decode('mac_roman', 'replace')
