"""Read values from the game's data section using Ghidra addresses.

usage: python dd.py <pef> <cmd> ...
  dbl <addr>            print big-endian double
  words <addr> <n>      print n 16-bit words
  longs <addr> <n>      print n 32-bit words
  str <addr>            C string
  pstr <addr>           Pascal string
  toc <off>             value of TOC entry at r2+off (and describe)
"""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pef as P  # noqa: E402

P.CODE_BASE = 0x10000000
P.DATA_BASE = 0x1003CAB0
P.IMPORT_BASE = 0x1004CD20
TOC = 0x10044AB0


def main():
    pe = P.PEF(open(sys.argv[1], 'rb').read())
    cmd = sys.argv[2]
    a = int(sys.argv[3], 16) if cmd != 'toc' else int(sys.argv[3], 0)
    if cmd == 'dbl':
        hi, lo = pe.u32(a), pe.u32(a + 4)
        print('%08x: %r' % (a, struct.unpack('>d', struct.pack('>II', hi, lo))[0]))
    elif cmd == 'words':
        n = int(sys.argv[4])
        vals = []
        for i in range(n):
            w = pe.u32(a + i * 2 - (a + i * 2) % 4)
            half = (w >> 16) if (a + i * 2) % 4 == 0 else (w & 0xFFFF)
            vals.append(half - 0x10000 if half >= 0x8000 else half)
        print(vals)
    elif cmd == 'longs':
        n = int(sys.argv[4])
        print(['%08x' % pe.u32(a + i * 4) for i in range(n)])
    elif cmd == 'str':
        print(repr(pe.cstring(a)))
    elif cmd == 'pstr':
        print(repr(pe.pstring(a)))
    elif cmd == 'toc':
        v = pe.u32(TOC + a)
        print('TOC%+d -> %08x' % (a, v))


if __name__ == '__main__':
    main()
