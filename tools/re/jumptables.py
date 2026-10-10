"""Find CodeWarrior switch jump tables (cmplwi rN,max / addi rT,r2,off / ... / bctr).

Writes one line per table: bctr_addr <tab> table_addr <tab> count <tab> comma-separated targets
(all Ghidra addresses). Used by DecompileAll.java to override the jump tables Ghidra misses.

usage: python jumptables.py <pef> <disasm.txt> <out.tsv>
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pef as P  # noqa: E402

P.CODE_BASE = 0x10000000
P.DATA_BASE = 0x1003CAB0
P.IMPORT_BASE = 0x1004CD20
TOC = 0x10044AB0

INS = re.compile(r'^([0-9a-f]{8}): (\S+)\s*(.*?)\s*(;.*)?$')


def main():
    pe = P.PEF(open(sys.argv[1], 'rb').read())
    lines = []
    for line in open(sys.argv[2]):
        m = INS.match(line.rstrip('\n'))
        if m:
            lines.append((int(m.group(1), 16), m.group(2), m.group(3)))
    out = open(sys.argv[3], 'w')
    for i, (addr, op, args) in enumerate(lines):
        if op != 'bctr':
            continue
        cmax = tbl = None
        for a2, op2, args2 in reversed(lines[max(0, i - 10):i]):
            if op2 == 'cmplwi' and cmax is None:
                cmax = int(args2.split(',')[1].strip(), 0)
            m = re.match(r'(r\d+), r2, (-?0x[0-9a-f]+|-?\d+)$', args2)
            if op2 == 'addi' and m and tbl is None:
                tbl = TOC + int(m.group(2), 0)
        if cmax is None or tbl is None:
            continue
        targets = [pe.u32(tbl + 4 * k) for k in range(cmax + 1)]
        out.write('%08x\t%08x\t%d\t%s\n' % (addr, tbl, cmax + 1, ','.join('%08x' % t for t in targets)))
    out.close()


if __name__ == '__main__':
    main()
