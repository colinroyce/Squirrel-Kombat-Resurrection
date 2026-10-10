# Asset extraction

Builds `assets/` from the original shareware archive `Squirrel_Kombat.sit` (Squirrel Kombat 1.x,
Monkey Farm Software, 1999). The archive itself is not stored in this repository.

```sh
# 1. build deark with the StuffIt "Arsenic" decompressor (see deark/README.md)
# 2. extract (Python 3 standard library only)
python3 -I tools/extract/extract.py --sit Squirrel_Kombat.sit --deark /path/to/deark --out assets
```

| Output | What it is |
|---|---|
| `assets/cicn/sheet-N.png` | all 1,072 `cicn` icons (sprite frames) packed into 1024×1024 atlases, RGBA with alpha = icon mask |
| `assets/pict/<id>.png` | every bitmap `PICT` (backgrounds, buttons, banners), 76 in total |
| `assets/snd/<id>.wav` | every `snd ` resource as PCM WAV at its original sample rate (23 sounds incl. the theme, snd 1000) |
| `assets/text.json` | `STR#` lists (win story, credits, hints) and the Extras folder's documents |
| `assets/manifest.json` | atlas placements (`[sheet, x, y, w, h, depth]` per icon id), picture and sound index, system palette |

Fidelity notes:

- The game runs in an 8-bit DrawSprocket context with the standard Mac system colour table, so
  every colour on screen is one of the 256 system colours. All icons already use only those
  colours. Seven pictures (600, 802–805, 808, 11000) contain other colours; they are matched to the
  system palette the way QuickDraw's inverse table does (4 bits per component, nearest entry).
  Everything else is a lossless conversion (checked pixel-for-pixel against deark's PICT output).
- Icons keep their white backgrounds. The game blits sprites in QuickDraw `transparent` mode, so
  white becomes see-through when drawn; the engine does that keying, as the original did.
- IMA4 sounds are decoded like Apple's decoder (sample-identical to ffmpeg's `adpcm_ima_qt`).
  Three effects (133, 134, 139) are stored at the Sound Manager's maximum rate (~65,536 Hz) and
  really do play sped up.
- PICT 2000 (a 128×128 pattern picture) is not referenced by the game and is skipped.
