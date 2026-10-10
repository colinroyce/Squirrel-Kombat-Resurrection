"""The Mac OS 8-bit system colour table and QuickDraw-style colour matching.

The game reserves a 640x480 8-bit DrawSprocket context with no custom colour table, so
everything it draws ends up in the standard 256-colour system palette. Colours that are not
in that palette are matched through an inverse table at 4 bits per component (the default
inverse-table resolution): each cell maps to the palette entry nearest the cell's colour
(component value = cell * 0x11), so every system colour maps to itself.
"""


def system_clut():
    lv = [0xFF, 0xCC, 0x99, 0x66, 0x33, 0x00]
    pal = [(r, g, b) for r in lv for g in lv for b in lv][:215]
    ramp = [0xEE, 0xDD, 0xBB, 0xAA, 0x88, 0x77, 0x55, 0x44, 0x22, 0x11]
    pal += [(v, 0, 0) for v in ramp]
    pal += [(0, v, 0) for v in ramp]
    pal += [(0, 0, v) for v in ramp]
    pal += [(v, v, v) for v in ramp]
    pal.append((0, 0, 0))
    assert len(pal) == 256
    return pal


CLUT = system_clut()
_INDEX = {c: i for i, c in enumerate(CLUT)}
_ITABLE = None


def _build_itable():
    table = []
    for r in range(16):
        for g in range(16):
            for b in range(16):
                rr, gg, bb = r * 0x11, g * 0x11, b * 0x11
                best, bd = 0, None
                for i, (pr, pg, pb) in enumerate(CLUT):
                    d = (pr - rr) ** 2 + (pg - gg) ** 2 + (pb - bb) ** 2
                    if bd is None or d < bd:
                        best, bd = i, d
                table.append(best)
    return table


def color_index(rgb16):
    """Map a 16-bit-per-component RGB to a system palette index."""
    global _ITABLE
    r, g, b = rgb16
    exact = _INDEX.get((r >> 8, g >> 8, b >> 8))
    if exact is not None and (r >> 8) * 0x101 == r and (g >> 8) * 0x101 == g and (b >> 8) * 0x101 == b:
        return exact
    if _ITABLE is None:
        _ITABLE = _build_itable()
    return _ITABLE[((r >> 12) << 8) | ((g >> 12) << 4) | (b >> 12)]


def map_rgb16(rgb16):
    return CLUT[color_index(rgb16)]
