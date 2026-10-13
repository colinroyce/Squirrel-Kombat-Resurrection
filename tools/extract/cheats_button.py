#!/usr/bin/env python3
"""Builds assets/added/cheats-button.png, the Options screen's CHEATS button (an addition).

The original has no CHEATS button, so this one is put together from the original's own buttons:
the HARD button (PICT 139) is the base, the middle of its face is wiped by repeating a blank part of
the face (columns 17-24, so the dither and shading match), and the letters are copied from
CANCEL (146: C), HARD (139: H, A), TIME (140: E, T) and KEYS (145: S), one column wider than each
letter so its shadow comes along. All three frames (normal, hover, pressed) are built the same way.

Usage: python3 tools/extract/cheats_button.py   (run from the repo root)
"""

import struct
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from extract import write_png  # noqa: E402

PICT = Path('assets/pict')
OUT = Path('assets/added/cheats-button.png')

# (source PICT, first column, last column) within a 100-px frame, in CHEATS order.
LETTERS = [(146, 21, 29), (139, 27, 37), (140, 60, 69), (139, 38, 49), (140, 29, 40), (145, 64, 72)]
START = 16  # first column of the C
FACE = (17, 25)  # blank face columns copied across the middle
WIPE = (25, 77)


def read_png(path):
    """Decodes an 8-bit RGB, non-interlaced PNG into rows of [r, g, b] lists."""
    b = path.read_bytes()
    pos, idat, w, h = 8, b'', 0, 0
    while pos < len(b):
        n = struct.unpack('>I', b[pos:pos + 4])[0]
        tag, body = b[pos + 4:pos + 8], b[pos + 8:pos + 8 + n]
        if tag == b'IHDR':
            w, h, depth, ctype = struct.unpack('>IIBB', body[:10])
            assert depth == 8 and ctype == 2, path
        elif tag == b'IDAT':
            idat += body
        pos += 12 + n
    raw = zlib.decompress(idat)
    stride = w * 3
    rows, prev = [], bytearray(stride)
    for y in range(h):
        f = raw[y * (stride + 1)]
        line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - 3] if i >= 3 else 0
            up = prev[i]
            c = prev[i - 3] if i >= 3 else 0
            if f == 1:
                line[i] = (line[i] + a) & 255
            elif f == 2:
                line[i] = (line[i] + up) & 255
            elif f == 3:
                line[i] = (line[i] + ((a + up) >> 1)) & 255
            elif f == 4:
                p = a + up - c
                pa, pb, pc = abs(p - a), abs(p - up), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else up if pb <= pc else c)) & 255
        rows.append(line)
        prev = line
    return w, h, rows


def main():
    src = {i: read_png(PICT / f'{i}.png')[2] for i in (139, 140, 145, 146)}
    out = [bytearray(r) for r in src[139]]

    def copy(rows, sx, dx, w, frame):
        for y in range(32):
            o = frame * 100
            out[y][(o + dx) * 3:(o + dx + w) * 3] = rows[y][(o + sx) * 3:(o + sx + w) * 3]

    for f in range(3):
        for x in range(WIPE[0], WIPE[1], FACE[1] - FACE[0]):
            w = min(FACE[1] - FACE[0], WIPE[1] - x)
            copy(src[139], FACE[0], x, w, f)
        x = START
        for pic, a, b in LETTERS:
            copy(src[pic], a, x, b - a + 1, f)
            x += b - a + 2
    write_png(str(OUT), 300, 32, b''.join(bytes(r) for r in out), 3)
    print('wrote', OUT)


if __name__ == '__main__':
    main()
