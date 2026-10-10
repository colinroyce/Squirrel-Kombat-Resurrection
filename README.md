# Squirrel Kombat Resurrection

A faithful browser recreation of **Squirrel Kombat** (Monkey Farm Software, 1999, classic Mac OS),
built from the original game's own art, sound and code.

## Running it

The game is plain HTML and JavaScript modules with no build step. Browsers won't load modules from
`file://`, so serve the repository root over HTTP:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/> and click (or press a key) to start. Browsers only allow sound
after a click or key press. The 640×480 screen is scaled by whole steps to fit the window.

## First milestone

Built so far: splash → loading → title → options (and the Keys screen) → character select → scene
select → a one-on-one fight between **Ed** and **Speedy** in the **Forest**, with rounds, the HUD,
the CPU opponent, and both fighters' special moves.

Everything else on these screens is shown and animates as in the original, but does nothing when
clicked yet:

- Scores, Quit, and credits on the title screen
- 2 Players, Practice, Tournament, and Two on Two
- The other ten fighters and four scenes
- Cheat codes, alert dialogs, and split screen

The character screen opens in Tournament mode, as the original does, so click **ONE ON ONE**
first. The CPU picks its fighter at random from Ed and Speedy.

## Controls

These are the original defaults, recovered from the binary. You can change them in Options → Keys,
and they're saved in the browser.

| Action | Player 1 | Player 2 (keypad) |
|---|---|---|
| Walk left / right | A / D | 4 / 6 |
| Jump | W | 8 |
| Punch | S | 5 |
| Kick | E | 9 |
| Uppercut | Space | 0 |
| Spin kick | Q | 7 |

Other keys:

- Return or Enter starts from the title screen and confirms on every menu. Space also starts the
  scene.
- On the character screen, Esc cancels and the walk keys change fighter.
- During a fight, P (or F15) pauses and Esc goes back to character select.

Special moves, from the original "Special Moves" sheet (`<` back, `>` forward, `p` punch, `k` kick,
`u` uppercut, `s` spin kick):

| Ed | | Speedy | |
|---|---|---|---|
| Machine Gun Nuts | `<<<>u` | Speed By | `<>p` |
| Tri Ball | `>>pp` | Hit and Run | `<<>k` |
| Atomic Scatter | `<p>k>` | Scorch | `<u<>k` |
| Teleport | `pkpu` | Fire Ball | `<<>>s` |

## Fonts

The original draws text in the Mac's Geneva bitmap font, which can't be redistributed:

- **9 pt text** (scores, the Keys screen) uses Geneva 9.1, a FontStruct remake under the OFL. Its
  documented changes from the real font are undone. See `tools/extract/fontstruct_font.py` and
  `assets/fonts/`.
- **10 pt text** (the round timer, the hint ticker, and the practice tutorial) is blank until a
  10 pt source is found.

## Repository

| Path | Contents |
|---|---|
| `index.html`, `src/` | the game |
| `assets/` | sprites, pictures, sounds, text and fonts extracted from the original archive |
| `docs/SPEC.md` | game behaviour recovered from the PowerPC binary (timings, physics, damage, AI, screens) |
| `tools/extract/` | the extraction pipeline (`.sit` → `assets/`) |
| `tools/re/` | disassembly / decompilation tools used to write the spec |
