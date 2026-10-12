# Added art

Everything in `assets/` outside this folder comes from the original game. This folder holds art
made for the Resurrection that the original does not have. The game loads each file as an extra
icon (cicn) or picture (PICT) with an id far above the original's.

| File | Icon id | What it is |
|---|---|---|
| `cheats-button.png` | PICT 30001 | The Options screen's CHEATS button (3 frames, like the other option buttons). Built by `tools/extract/cheats_button.py` from the original buttons: the HARD button's face with its letters wiped, and the letters C (CANCEL), H and A (HARD), E and T (TIME) and S (KEYS). |
| `title-n.png` | 30000 | The N in the title screen's RESURREKTION line. The original's title letters have no N, so this one is built from the original M: its top half and left stem are the M's own pixels, and the lower middle is redrawn so the diagonal runs into the right stem. |

The RESURREKTION line also uses brightened copies of the original title letters and of this N
(every red raised by 0x44), made when the game loads. See `BRIGHT_CICN` in `src/assets.js`.
