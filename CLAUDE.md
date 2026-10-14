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
- **The "Resurrektion" direction:** the original's game behaviour comes first, but Colin will
  increasingly ask for changes that stray from it to make the game more modern and fun. When he
  asks, build them (marked as additions). Where the original relied on Mac OS itself (system
  dialogs, window chrome), a plain rebuild is fine; he'll restyle it later if he wants.
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
5. Cheats: the original's two codes (FIREMONKEY super blood on the title screen, the secret-character
   key code on the character screen) work as in the original, and (an addition, Colin's choice) are
   also switches on a Cheats page in Options (`src/screens/cheats.js`), remembered in the browser.
6. It's a browser game that runs straight from the repo.
7. Fonts:
   - Geneva 9 uses "Geneva 9.1", a FontStruct remake under the OFL, with its documented changes
     undone (`assets/fonts/geneva9.json`, `tools/extract/fontstruct_font.py`).
   - Geneva 10 has no free source (the "Geneva 10px" FontStruct remake's licence forbids
     redistribution and web use). Colin chose a stand-in: 10 pt text is drawn with the Geneva 9
     glyphs (`fontFor` in `src/gfx.js`, an addition) until a usable 10 pt font turns up.
8. Loops the original runs uncapped run at 60 fps. Everything else runs at the original's 30 fps
   (2 ticks per frame).
9. Parts not built yet are **shown but inactive**: they look and animate like the original, but
   clicking them does nothing.
10. Blood defaults to **yellow**, as the original's `DefaultPrefs` sets it. Red blood and the
    dripping cursor appear only with Options → Blood → ON. This matches the original, so leave it.
11. **Military Muskrat is unlocked by winning the Tournament** (Colin's choice, an addition).
    - The original's way, a key code on the character screen (six presses in a row: left, jump,
      right, punch, uppercut, spin; A W D S Space Q by default), also works, as a cheat (see 5).
      See docs/SPEC.md "Military Muskrat".
    - The original Tournament can't be won (its 12th place is left empty), so Colin chose to make
      Military Muskrat the 12th, final opponent. Beating him unlocks him (`UnlockMuskrat` in
      `src/state.js`, remembered in the browser). `?debug` also unlocks him.

## Current state: milestone 1 (done)

Working:
- Splash, loading, title, options (with the Keys screen), character select and scene select.
- A one-on-one fight between **Ed** and **Speedy** in the **Forest**:
  - best of 3 rounds, the HUD and the CPU AI
  - projectiles and all four special moves for both fighters
  - Forest hazards: the log elevator, tree eyes, leaves, death acorns, and nests with birds
  - pause, and back to character select after a match
- Since milestone 1 (branch `characters-full-buildout`, awaiting Colin's check):
  - the Field, Tundra, Great Wall and City scenes, each with its hazards and creatures
  - all twelve fighters in ONE ON ONE, with their four specials, projectiles and AI, one file
    each in `src/fight/` (Military Muskrat is unlocked by winning the Tournament, or with `?debug`)
  - screen shakes (`src/quakes.js`, used by Philbert)
  - Tournament mode (`src/screens/tournament.js`) with the win screen, and high scores (`src/screens/scores.js`):
    the name entry after a Tournament and the title's SCORES screen
  - Practice mode (`src/fight/practice.js`): the training dummy and the timed tutorial messages
  - the credits (`DoCredits` in `src/screens/title.js`)
  - 2 Players in ONE ON ONE: player 2's keys and special moves (`CheckKeyDown`, `CheckMoves(n)` in
    `src/fight/game.js`), and their keys on the pause guide
  - split screen when the two players are more than a screen apart (`HandleDoubleCamera` in
    `src/camera.js`, `RenderSpritesSplit` in `src/sprites.js`)

Shown but inactive:
- Character select: Two on Two, and PRACTICE / TOURNAMENT with 2 Players (team fights; `canStart`
  in `src/screens/select.js`).
- The original's alert dialogs.

Notes:
- The character screen opens in TOURNAMENT mode, as the original does, so click ONE ON ONE first.
- The CPU picks its fighter at random from the built ones below `numChars` (`STAGED_CHARS` in
  `src/state.js`); the original uses `Rand(numChars)`. All twelve are built, so this now matches.
- `GetRegistered()` returns 1: we behave as the registered version, so all characters and
  scenes are allowed.
- Open questions: the spark colours 2 (secret selector) and 6 (Corpse's bats appearing) aren't
  standard QuickDraw colours; what ForeColor shows for them isn't recovered, so those sparks
  aren't drawn yet (`isOldColor` in `src/gfx.js`).

## Where each fighter lives

- Ed, Speedy, the AI (`HandleAI`) and `DoSpecialMove` for everyone: `src/fight/chars.js`.
- Everyone else: `src/fight/<name>.js` (ice, invisible, ninja, mech, kathy, george, philbert,
  super, corpse, muskrat), each with `Handle<Name>`, a `<Name>Special(n, move)` used by both
  `CheckMoves1` (player 1) and `DoSpecialMove` (CPU) where their steps match, and the projectiles.
- Key patterns: `CheckMoves1` in `src/fight/game.js`. Templates: `T` in `src/templates.js`.
- The behaviour of every fighter is written up in docs/SPEC.md, one section each.

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
  - `quakes.js` — screen shakes
  - `combofeed.js` — the combo display (an addition)
  - `common.js` — cursor, screen transitions, `nextFrame`
- **`screens/`:**
  - `splash.js` — the Monkey Farm splash and the loading screen
  - `title.js`
  - `options.js`
  - `keys.js`
  - `select.js`
  - `scene.js`
  - `tournament.js` — the Tournament ladder and win screen (`ScrollText`)
  - `scores.js` — high score tables, the SCORES screen and the name entry
  - `pauseguide.js` — the pause screen's move guide (an addition)
  - `cheats.js` — the Cheats page in Options (an addition)
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
  - `ice.js`, `invisible.js`, `ninja.js`, `mech.js`, `kathy.js`, `george.js`, `philbert.js`,
    `super.js`, `corpse.js`, `muskrat.js` — one fighter each (`NewExplosion` is in muskrat.js)

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
- **Military Muskrat's unlock**: winning the Tournament instead of the original's key code; `?debug`
  also unlocks him (`UnlockMuskrat` in `src/state.js`, `src/main.js`, `CreateSecretSelector`).
- **Military Muskrat as the Tournament's 12th, final opponent** (the original leaves that place empty,
  so its Tournament can't be won): `InitTournament` in `src/screens/tournament.js`.
- **The high-score name window's frame, field and button**: Mac OS drew these, so they are plain
  rebuilds; the contents and layout are the game's own DLOG/DITL 999 (`OpenScoreDialog`).
- **High scores and the Muskrat unlock are saved in the browser** (the original used its
  preferences file).
- **The Cheats page** (`src/screens/cheats.js`, opened by a CHEATS button under KEYS in Options):
  switches for super blood and Military Muskrat, each with its original code written out. The
  button's art is built from the original buttons' letters (`assets/added/cheats-button.png`, made
  by `tools/extract/cheats_button.py`). Cheats are remembered in the browser (the original forgot
  them on quitting).
- **The combo display** (`src/combofeed.js`, fed by `RecordKey1/2` and `CheckMoves` in
  `src/fight/game.js`): a see-through strip under each human player's life bar shows their last key
  presses (forward / back / up arrows, P K U S) and flashes the special move's name in green when its
  keys are recognised. Names come from the pause guide's move list. On by default; switched on the
  Cheats page. No failure flash (Colin's choice): the original never knows a combo was attempted.
- **No QUIT button on the title screen** (Colin's choice): a web page has nothing to quit to
  (`NewTitleScreenSprites` in `src/screens/title.js`).
- **No music during fights**: the theme plays on the title, character and scene screens and stops
  when a fight (or the Tournament ladder) starts (`OpenSelection` in `src/screens/select.js`). The
  original kept it playing throughout.
- **10 pt text in the Geneva 9 glyphs** (see decision 7).
- **The pause move guide** (`src/screens/pauseguide.js`): Esc shows a Controls page and one page per
  fighter (combos in the player's current keys, facing right; Military Muskrat hidden until
  unlocked), flipped with the arrow or walk keys or the on-screen buttons. The original pause only
  showed PICT 9000. The original paused on P and quit on Esc; now only Esc pauses (P is player 2's
  jump) and quitting a fight is the guide's QUIT button. The menus' squirrel-head cursor is drawn on the guide (no blood
  drips) so its buttons are easy to click.
- **The pause picture shows only PAUSED**: PICT 9000's "HIT P TO UNPAUSE" line is cut off, since P no
  longer pauses (`drawPaused` in `src/screens/pauseguide.js`).
- **New default keys** (`DEFAULT_KEYS` in `src/state.js`): player 2 is L ' P ; [ O and Right Shift
  (was the number pad). Player 1 keeps the original keys, but in two-player games their uppercut is
  Left Shift while it is still set to Space (Colin's choice; `GetKey`). Right Shift gets its own key
  code (`src/input.js`). Saved keys still on an original default move to the new ones.
- New art goes in `assets/added/`, with a line in `assets/added/README.md`.
- Never hand-edit the extracted originals in `assets/`; regenerate them with `tools/extract`.
- One extraction fix so far: cicn 1128 (the title's blank tile) lists colour value 0 twice. The
  first entry wins, matching frames of the original (`tools/extract/cicn.py`).

## Running and testing

1. Run `python3 -m http.server 8000` in the repo root, open http://localhost:8000/, and click to
   start (browsers need a click before playing sound).
2. Adding `?debug` to the address exposes `window.__sk = {hud, gSprites, sel}` and unlocks
   Military Muskrat.
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
