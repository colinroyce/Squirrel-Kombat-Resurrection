"""Decode 'cicn' (colour icon) resources.

Returns RGBA pixels: colour from the icon's own colour table (matched to the system palette,
which in this game is always an exact match) and alpha from the icon mask. The game draws
icons into white-filled strips and blits them in QuickDraw `transparent` mode, so white
pixels become see-through at run time; that keying is done by the engine, not here.
"""
import struct

from qdpal import map_rgb16


def decode(blob):
    rb = struct.unpack('>H', blob[4:6])[0] & 0x3FFF
    top, left, bottom, right = struct.unpack('>hhhh', blob[6:14])
    w, h = right - left, bottom - top
    depth = struct.unpack('>h', blob[32:34])[0]
    p = 50
    mask_rb = struct.unpack('>H', blob[p + 4:p + 6])[0]
    p += 14
    bm_rb = struct.unpack('>H', blob[p + 4:p + 6])[0]
    p += 14 + 4
    mask = blob[p:p + mask_rb * h]
    p += mask_rb * h + bm_rb * h
    ct_flags, ct_size = struct.unpack('>Hh', blob[p + 4:p + 8])
    p += 8
    colors = {}
    for i in range(ct_size + 1):
        val, r, g, b = struct.unpack('>4H', blob[p:p + 8])
        colors[i if ct_flags & 0x8000 else val] = map_rgb16((r, g, b))
        p += 8
    pix = blob[p:p + rb * h]
    out = bytearray(w * h * 4)
    for y in range(h):
        row = pix[y * rb:(y + 1) * rb]
        mrow = mask[y * mask_rb:(y + 1) * mask_rb]
        for x in range(w):
            if not (mrow[x >> 3] >> (7 - (x & 7))) & 1:
                continue
            bit = x * depth
            idx = (row[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1)
            r, g, b = colors[idx]
            o = (y * w + x) * 4
            out[o:o + 4] = bytes((r, g, b, 255))
    return w, h, depth, bytes(out)
