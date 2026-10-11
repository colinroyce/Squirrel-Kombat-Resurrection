# Squirrel Kombat Resurrection: notes for Claude

A faithful browser recreation of **Squirrel Kombat** (Monkey Farm Software, 1999, classic Mac OS
shareware), built from the original game's own art, sound and code. It is plain HTML and
JavaScript modules with no build step. The owner is Colin (`colinroyce` on GitHub). The repo is
public.

## How to work with Colin (read this first)

- **Fidelity to the original is the whole point.** In Colin's words: "I AM ABSOLUTELY NOT OKAY
  WITH SOME BULLSHIT APPROXIMATION", "focus on true fidelity of the original artstyle first and
  foremost", and "Slow but correct is the way to go!"
  - Every behaviour (frames, timings, damage, physics, AI, sounds) comes from the original
    binary. Never take it from guesses, articles or memories of the game.
  - If something can't be recovered, say so and ask. Don't fill gaps with invented behaviour.
- **Ask before building.** Before any sizeable piece of work, lay out the plan and your open
  questions, then wait for his answer. Small, clearly requested changes can go ahead.
- **Say up front if something is hard**, before starting. Don't go "down a rabbithole". Give it
  to him straight; he can handle the decision.
- **Use plain language.** He is not a programmer. Describe changes by what he'll see in the
  game, and keep it short. He is careful with his usage, so work efficiently.
- **Keep the original's bugs and quirks**, with a comment marking each one as an original quirk.
- **Mark additions clearly.** Anything that isn't in the original (art or features) must be
  marked as an addition (see "Additions to the original"). He wants people to see what's new.
- **Don't push, open pull requests or merge unless he asks.** He may commit and push himself in
  GitHub Desktop. When he asks you to commit, write a clear message.

## Decisions already made (don't ask again)

1. Use the original assets, extracted from the original archive into `assets/`.
2. Keep the original 640×480 screen. The page scales it to fill the window and keeps it 4:3
   (`fit()` in `src/main.js`).
3. All behaviour comes from disassembling the original PowerPC code.
4. Default controls come from the binary (`DefaultKeys`).
5. No cheats for now: the FIREMONKEY super-blood code, the secret-character code, and so on.
6. It's a browser game that runs straight from the repo.
7. Fonts:
   - Geneva 9 uses "Geneva 9.1", a FontStruct remake under the OFL, with its documented changes
     undone (`assets/fonts/geneva9.json`, `tools/extract/fontstruct_font.py`).
   - Geneva 10 is still missing. It's used by the round timer, the hint ticker and the practice
     tutorial, which stay blank until Colin finds a 10 pt source.
8. Loops the original runs uncapped run at 60 fps. Everything else runs at the original's 30 fps
   (2 ticks per frame).
9. Parts not built yet are **shown but inactive**: they look and animate like the original, but
   clicking them does nothing.
10. Blood defaults to **yellow**, as the original's `DefaultPrefs` sets it. Red blood and the
    dripping cursor appear only with Options → Blood → ON. This matches the original, so leave it.
11. **Military Muskrat: unresolved, ask Colin before building him.**
    - Colin's instruction: he "is unlocked after you beat all the other squirrels".
    - The binary does it differently. In `CheckSelectionKeyDown`, a registered build sets
      `numChars` from 11 to 12 and calls `CreateSecretSelector` when six recorded values match
      0, 1, 2, 3, 5, 6. If those are Mac key codes, that's A S D F G Z; verify where that ring is
      filled.
    - Tell him the difference and let him choose.

## Current state: milestone 1 (done)

Working:
- Splash, loading, title, options (with the Keys screen), character select and scene select.
- A one-on-one fight between **Ed** and **Speedy** in the **Forest**:
  - best of 3 rounds, the HUD and the CPU AI
  - projectiles and all four special moves for both fighters
  - Forest hazards: the log elevator, tree eyes, leaves, death acorns, and nests with birds
  - pause, and back to character select after a match
- Since milestone 1: Field, Tundra, Great Wall and City, each with its hazards and creatures.

Shown but inactive:
- Title screen: Scores, Quit and Credits.
- Character select: 2 Players, Practice, Tournament and Two on Two.
- The other ten fighters plus the Muskrat.
- Cheats, the original's alert dialogs, split screen, and player 2's keyboard controls in fights.

Notes:
- The character screen opens in TOURNAMENT mode, as the original does, so click ONE ON ONE first.
- The CPU picks its fighter at random from the built ones (`STAGED_CHARS` in `src/state.js`).
  The original uses `Rand(numChars)`.
- `GetRegistered()` returns 1: we behave as the registered version, so all characters and
  scenes are allowed.

## NEXT GOAL: every fighter and every scene playable one-on-one

Make all of these fully playable in ONE ON ONE mode (1 player vs the CPU), faithful to the binary:

- **Fighters:** ICE (done, awaiting Colin's check), INVISIBLE, NINJA, MECH, KATHY, GEORGE, PHILBERT, SUPER SQUIRREL, CORPSE,
  plus MILITARY MUSKRAT once the unlock rule is settled. ED and SPEEDY are done.
- **Scenes:** all five are done (Field, Tundra, Great Wall and City added after milestone 1; awaiting
  Colin's check).

Each fighter needs:
- its `Handle<Name>` procedure
- special-move inputs (`CheckMoves1` in `src/fight/game.js`), with the original patterns
- `DoSpecialMove` and the `SPECIALS` table entries in `src/fight/chars.js`
- projectiles and effects
- the AI's special-move choices (`EvalSpecialMove`, `HandleAI`)
- every per-character case in `HandlePlayer`, `HandlePlayer2` and `CheckKeyDown`, e.g. character
  9 (Super Squirrel) and character 4 (Ninja)
- an entry in `PROCS` in `CreatePlayers`
- the death sequence
- the character-select preview

Each scene needs:
- the `InitScene` background and platforms (see docs/SPEC.md "Scenes"; the platform rects are
  already recovered)
- `NewSceneSprites`
- its per-frame hazards, like `ForestRun`, called from `MyRun`
- any special surfaces handled in `OnSurface`

Then widen `STAGED_CHARS` in `src/state.js` (`STAGED_SCENES` already holds all five), and the CPU pick, to the full
roster (`Rand(numChars)`).

Work one fighter at a time and have Colin check each before moving on; agree the order with him
first. The original move list for every fighter is in `assets/text.json` under "Special Moves",
taken from the archive's own help file. `src/fight/chars.js` already holds Ed and Speedy; with
ten more fighters, per-character files may be cleaner.

## How the port is written

- **Names:** every function keeps the original's name (`HandleEd`, `NewNut`, `DoDamage`, …) so it
  can be matched to `re/decomp.c`.
- **Method:** port each function line by line from the decompile, in the original's order,
  including its bugs. Add what you recover to `docs/SPEC.md`, which is the written record of the
  game's behaviour.
- **Sprite fields** use the decompile's struct names: `action1`, `action2`, `info[0..9]`, `f42`
  (speed), `f56`/`f58` (frame timer), `f5e` (character index), and so on. See SPEC "Sprites" and
  `src/templates.js`. Templates are mutable game state: some spawners change them on purpose, and
  some of those changes persist.
- **QuickDraw rules:**
  - A Rect is `{top, left, bottom, right}`.
  - `setRect(r, left, top, right, bottom)` takes its arguments in SetRect's order.
  - `insetRect`, `sectRect`, `detectCollision` and the Toolbox `Random`/`Rand`/`Rand1` are
    emulated exactly in `src/mac.js`.
  - `TickCount` runs at 60 Hz.
- **Game loops** are async functions that mirror the original's nested blocking loops.
  `await nextFrame(start)` waits 2 ticks.
- **Transparency:** white pixels in sprites are see-through. The original draws icons into
  white-filled strips and copies them in "transparent" mode.
- **Colours** come from the Mac's 8-bit system palette. `foreColor()` in `src/gfx.js` maps the
  original's QuickDraw colour constants.

Code map (`src/`):
- **Startup and engine:**
  - `main.js` — startup
  - `mac.js` — Toolbox and QuickDraw helpers
  - `assets.js` — asset loading, plus the added and brightened icons
  - `gfx.js` — screens, palette, strips, text, fades
  - `input.js` — keyboard and mouse, using Mac key codes
  - `sound.js`
  - `state.js` — preferences and the selection state
- **Sprites and drawing:**
  - `templates.js` — sprite templates (DefSprites) and the `CHARS` list
  - `sprites.js` — the 200-slot sprite table
  - `camera.js`
  - `render.js`
  - `sparks.js`
  - `hud.js` — life bars, scores, rounds, timer, radar, hint
  - `fade.js`
  - `common.js` — cursor, screen transitions, `nextFrame`
- **`screens/`:**
  - `splash.js` — the Monkey Farm splash and the loading screen
  - `title.js`
  - `options.js`
  - `keys.js`
  - `select.js`
  - `scene.js`
- **`fight/`:**
  - `game.js` — `CreatePlayers`, rounds, `Run`/`MyRun`, the key recorder and `CheckMoves1`,
    pause, `HandleDeadPlayer`
  - `player.js` — `HandlePlayer`/`HandlePlayer2`, the state machine shared by every fighter,
    plus `OnSurface` and `GetOpp`
  - `chars.js` — Ed, Speedy, their projectiles, and the AI
  - `forest.js` — platforms, `InitScene` and `NewSceneSprites` for every scene, and the Forest's sprites
  - `field.js` — the Field's butterflies
  - `tundra.js` — the Tundra's snow and snowballs (`TundraRun`)
  - `city.js` — the City's bird flocks (`CityRun`)
  - `ice.js` — Ice: `HandleIce`, Ice Blast, Ice Fist, Ice Column, the ice cube

## Reverse-engineering files (not in git)

The repo is public, so the decompiled code and the binary stay out of it. They live in two
folders at the repo root, both in `.gitignore`. Colin unzips them from
`squirrel-kombat-workfiles.zip`.

`re/`:
- `decomp.c` — the whole game decompiled by Ghidra, with names applied and jump tables recovered.
  Search for `==== FunctionName @` to find a function.
- `disasm.txt` — the full PowerPC disassembly.
- Lists: `functions.tsv`, `toc.tsv`, `jumptables.tsv`, `templates.txt` (every DefSprites
  template), `makesparks_calls.txt`, `specialtable.txt`, `sprite_funcs.txt`,
  `sprite_param_funcs.txt`.
- A few per-topic extracts (`*.c`).
- `SquirrelKombat.pef` — the game's code itself, for `tools/re/dd.py` (reads data tables and
  strings) and `tools/re/callargs.py`.

Addresses:
- Code starts at 0x10000000.
- The data base is 0x1003CAB0.
- The TOC (r2) is 0x10044AB0.

Known decompiler gap: Ghidra drops call arguments 9 and up. Use `tools/re/callargs.py` on
`disasm.txt` to see them, and check anything odd against the disassembly.

`reference/`:
- Colin's screenshots of the original (art style, character select, controls)
- the theme music
- `Squirrel_Kombat.sit`, the original archive
- the original game's resource fork and its Extras files
- the Geneva 9.1 font

If these folders are missing, ask Colin for the zip. They can also be regenerated with
`tools/re/README.md` and `tools/extract/README.md`, which needs Ghidra 11, Java, Python with
capstone, and a patched deark.

## References

- Gameplay video Colin provided: https://youtu.be/P-qvijzHgbA. He also has a compressed copy.
  Use it to check visuals and timing.
- The original archive: https://archive.org/details/tucows_205608_Squirrel_Kombat

## Additions to the original (must stay clearly marked)

- **The RESURREKTION line** on the title screen (`T.subtitle` in `src/templates.js`, used in
  `src/screens/title.js`):
  - It's centred under SQUIRREL KOMBAT.
  - The letters are the original tiles brightened by +0x44 red (`BRIGHT_CICN` in
    `src/assets.js`), plus a new N (`assets/added/title-n.png`, built from the original M).
  - These letters are left out of the sprite count that decides when flying kickers appear, so
    the original pacing is kept.
- New art goes in `assets/added/`, with a line in `assets/added/README.md`.
- Never hand-edit the extracted originals in `assets/`; regenerate them with `tools/extract`.
- One extraction fix so far: cicn 1128 (the title's blank tile) lists colour value 0 twice. The
  first entry wins, matching frames of the original (`tools/extract/cicn.py`).

## Running and testing

1. Run `python3 -m http.server 8000` in the repo root, open http://localhost:8000/, and click to
   start (browsers need a click before playing sound).
2. Adding `?debug` to the address exposes `window.__sk = {hud, gSprites, sel}`.
3. To reach a fight, click these spots (in game coordinates):
   1. PLAY at (80,418)
   2. ONE ON ONE at (558,32)
   3. a fighter
   4. OK at (558,430)
   5. the scene picture at (320,240)

- Headless checks with Playwright and Chromium worked well in the cloud. Screenshot the canvas
  with `toDataURL`, and read the sprite table through `?debug`. This is optional; Colin can also
  check by playing.
- A 404 for `assets/fonts/geneva10.json` is expected.

## Git

- The work branch is `claude/eloquent-curie-vv5eha`, which is also the repo's default branch.
- Colin uses GitHub Desktop.
- `re/` and `reference/` are ignored and must never be committed.
