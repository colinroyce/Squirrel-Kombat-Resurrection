"""Decode the version-2 PICT resources used by the game.

Every PICT the game draws is a single bitmap opcode (BitsRect 0x90, PackBitsRect 0x98 or
DirectBitsRect 0x9A) drawn in srcCopy mode. The result is matched to the system palette, as
QuickDraw does when drawing into the game's 8-bit offscreen worlds.
"""
import struct

from qdpal import map_rgb16


def _unpack_bits(src, p, n_out):
    out = bytearray()
    while len(out) < n_out:
        c = src[p]
        p += 1
        if c < 128:
            out += src[p:p + c + 1]
            p += c + 1
        elif c > 128:
            out += bytes([src[p]]) * (257 - c)
            p += 1
    return bytes(out[:n_out]), p


def _unpack_words(src, p, n_words):
    """PackBits on 16-bit units (packType 3, used by 16-bit DirectBitsRect)."""
    out = bytearray()
    while len(out) < n_words * 2:
        c = src[p]
        p += 1
        if c < 128:
            out += src[p:p + (c + 1) * 2]
            p += (c + 1) * 2
        elif c > 128:
            out += src[p:p + 2] * (257 - c)
            p += 2
    return bytes(out[:n_words * 2]), p


def _skip_header_ops(b):
    p = 10
    while True:
        if p & 1:
            p += 1
        op = struct.unpack('>H', b[p:p + 2])[0]
        p += 2
        if op == 0x0011:
            p += 2
        elif op == 0x0C00:
            p += 24
        elif op == 0x001E:
            pass
        elif op == 0x0001:
            p += struct.unpack('>H', b[p:p + 2])[0]
        elif op == 0x00A0:
            p += 2
        elif op == 0x00A1:
            p += 4 + struct.unpack('>H', b[p + 2:p + 4])[0]
        else:
            return op, p


def decode(b):
    """Return (width, height, rgb bytes) or raise ValueError for unsupported pictures."""
    op, p = _skip_header_ops(b)
    if op not in (0x0090, 0x0098, 0x009A):
        raise ValueError('unsupported PICT opcode %04x' % op)
    direct = op == 0x009A
    if direct:
        p += 4
    rb_raw = struct.unpack('>H', b[p:p + 2])[0]
    rb = rb_raw & 0x3FFF
    top, left, bottom, right = struct.unpack('>4h', b[p + 2:p + 10])
    w, h = right - left, bottom - top
    p += 10
    pack_type = struct.unpack('>H', b[p + 2:p + 4])[0]
    depth = struct.unpack('>H', b[p + 18:p + 20])[0]
    p += 36
    colors = {}
    if not direct:
        ct_flags, ct_size = struct.unpack('>Hh', b[p + 4:p + 8])
        p += 8
        for i in range(ct_size + 1):
            val, r, g, bb = struct.unpack('>4H', b[p:p + 8])
            colors[i if ct_flags & 0x8000 else val] = map_rgb16((r, g, bb))
            p += 8
    p += 8 + 8 + 2  # srcRect, dstRect, mode (srcCopy, except ditherCopy on the 6x6 snowflake 154)
    rows = []
    for _ in range(h):
        if direct and pack_type == 4:  # 32-bit, PackBits on component planes R..R G..G B..B
            n = b[p] if rb <= 250 else struct.unpack('>H', b[p:p + 2])[0]
            p += 1 if rb <= 250 else 2
            planes, _ = _unpack_bits(b, p, w * 3)
            p += n
            row = bytes(v for x in range(w) for v in (0, planes[x], planes[w + x], planes[2 * w + x]))
        elif direct and pack_type == 3:
            n = b[p] if rb <= 250 else struct.unpack('>H', b[p:p + 2])[0]
            p += 1 if rb <= 250 else 2
            row, _ = _unpack_words(b, p, w)
            p += n
        elif rb < 8 or op == 0x0090:
            row = b[p:p + rb]
            p += rb
        else:
            n = b[p] if rb <= 250 else struct.unpack('>H', b[p:p + 2])[0]
            p += 1 if rb <= 250 else 2
            row, _ = _unpack_bits(b, p, rb)
            p += n
        rows.append(row)
    out = bytearray(w * h * 3)
    for y, row in enumerate(rows):
        for x in range(w):
            if direct and depth == 32:
                rgb = map_rgb16(tuple(c * 0x101 for c in row[x * 4 + 1:x * 4 + 4]))
            elif direct:
                v = struct.unpack('>H', row[x * 2:x * 2 + 2])[0]
                r5, g5, b5 = (v >> 10) & 31, (v >> 5) & 31, v & 31
                rgb = map_rgb16(tuple(((c << 11) | (c << 6) | (c << 1) | (c >> 4)) for c in (r5, g5, b5)))
            else:
                bit = x * depth
                idx = (row[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1)
                rgb = colors[idx]
            o = (y * w + x) * 3
            out[o:o + 3] = bytes(rgb)
    return w, h, bytes(out)
