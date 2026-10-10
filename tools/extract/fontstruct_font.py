"""Turn the FontStruct "Geneva 9.1" OTF back into a 9 pt bitmap font for the game.

usage: python3 fontstruct_font.py geneva-9-1.otf assets/fonts/geneva9.json   (needs fontTools)

The game draws its smaller HUD text in Geneva 9 (TextFont 1, size 9). The original Mac bitmap
font is not available here; "Geneva 9.1" by Kelsey Higham (SIL OFL 1.1) is a pixel recreation of
System 1's Geneva 9 that its author deliberately changed. Those documented changes are undone
as literally as the change list allows (marked "best reading" where the amount is not stated):

  - restore the 1-pixel space to the left of A, I and the ASCII punctuation
  - move the second pixel below the baseline of , and ; back right by 1 (best reading)
  - move j back right by 1 (best reading)
  - raise / \\ and ~ by 1 (best reading)
  - the redrawn # cannot be undone and is kept

Output JSON: {"ascent", "descent", "glyphs": {code: {"w": advance, "x": ink left offset,
"rows": [ascent + descent strings of '#'/'.' from the top row down]}}}
"""
import json
import sys

from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.ttLib import TTFont

UNIT = 125  # font units per pixel in FontStruct output
PUNCT = set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~')


def rasterize(path):
    f = TTFont(path)
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f['hmtx']
    asc, desc = f['hhea'].ascent // UNIT, -f['hhea'].descent // UNIT
    glyphs = {}
    for code, gn in sorted(cmap.items()):
        adv = hmtx[gn][0] // UNIT
        pix = set()
        for py in range(-desc, asc):
            for px in range(-3, adv + 3):
                pen = PointInsidePen(gs, ((px + 0.5) * UNIT, (py + 0.5) * UNIT))
                gs[gn].draw(pen)
                if pen.getResult():
                    pix.add((px, py))
        glyphs[code] = {'adv': adv, 'pix': pix}
    return asc, desc, glyphs


def revert(glyphs):
    for code, g in glyphs.items():
        ch = chr(code)
        if ch in PUNCT or ch in 'AI':
            g['pix'] = {(x + 1, y) for x, y in g['pix']}
            g['adv'] += 1
        if ch in ',;':
            g['pix'] = {(x + 1, y) if y == -2 else (x, y) for x, y in g['pix']}
        if ch == 'j':
            g['pix'] = {(x + 1, y) for x, y in g['pix']}
        if ch in '/\\~':
            g['pix'] = {(x, y + 1) for x, y in g['pix']}


def to_json(asc, desc, glyphs):
    out = {}
    for code, g in glyphs.items():
        xs = [x for x, _ in g['pix']]
        x0, x1 = (min(xs), max(xs)) if xs else (0, -1)
        rows = []
        for y in range(asc - 1, -desc - 1, -1):
            rows.append(''.join('#' if (x, y) in g['pix'] else '.' for x in range(x0, x1 + 1)))
        out[str(code)] = {'w': g['adv'], 'x': x0, 'rows': rows}
    return {'name': 'Geneva 9 (from "Geneva 9.1" by Kelsey Higham, SIL OFL 1.1; see geneva-9.1/)',
            'size': 9, 'ascent': asc, 'descent': desc, 'glyphs': out}


if __name__ == '__main__':
    asc, desc, glyphs = rasterize(sys.argv[1])
    revert(glyphs)
    with open(sys.argv[2], 'w') as fh:
        json.dump(to_json(asc, desc, glyphs), fh, separators=(',', ':'))
