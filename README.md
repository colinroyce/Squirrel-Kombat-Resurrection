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
after a click or key press. The 640×480 screen is scaled to fill the window, keeping its 4:3 shape.

## First milestone

Built so far: splash → loading → title → options (and the Keys screen) → character select → scene
select → a one-on-one fight between **Ed** and **Speedy** in the **Forest**, with rounds, the HUD,
the CPU opponent, and both fighters' special moves.

Since then:

- All five scenes are playable: Forest, Field (butterflies), Tundra (ledges, snow and rolling
  snowballs), Great Wall (towers and pits) and City (ledges and passing flocks of birds).
- All twelve fighters are playable in One on One, each with their four special moves and the
  CPU playing them as the original does.

Everything else on these screens is shown and animates as in the original, but does nothing when
clicked yet:

- Scores, Quit, and credits on the title screen
- 2 Players, Practice, Tournament, and Two on Two
- Cheat codes, alert dialogs, and split screen

The character screen opens in Tournament mode, as the original does, so click **ONE ON ONE**
first. The CPU picks its fighter at random.

## Additions to the original

- The title screen has a second line, RESURREKTION, under SQUIRREL KOMBAT. Its letters fly in and
  wobble like the original's and are brightened copies of the original letter tiles, so the new
  line stands out. The original has no N, so that one is new art built from the original M (see
  `assets/added/`).
- Military Muskrat is unlocked by winning the Tournament (not built yet) rather than by the
  original's secret key code. For testing, adding `?debug` to the address unlocks him.

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
`u` uppercut, `s` spin kick, `^` jump). Tap the keys: holding one down counts once.

| Fighter | Move 1 | Move 2 | Move 3 | Move 4 |
|---|---|---|---|---|
| Ed | Machine Gun Nuts `<<<>u` | Tri Ball `>>pp` | Atomic Scatter `<p>k>` | Teleport `pkpu` |
| Speedy | Speed By `<>p` | Hit and Run `<<>k` | Scorch `<u<>k` | Fire Ball `<<>>s` |
| Ice | Ice Blast `>>pu` | Ice Fist `<<>k` | Ice Column `pku` | Sneak Attack `ps^` |
| Invisible | Toggle Visibility `<^<>p` | Boxing Glove `<<>>u` | Fire Ball `<<>>p` | Ice Ball `<<>>k` |
| Ninja | Chain Grab `<<<>u` | Random Teleport `<pkkp` | Ninja Stars `>>>k>` | Decoy `>>ppk` |
| Mech | Power Fist `<<>>u` | Electric Blast `<<<>s` | Scatter Bomb `>>p^` | Missile `<>>k` |
| Kathy | Sonic Scream `<kk>` | Tri-Heart Stasis `>>p>k` | Heart Bomb `<<upk` | Flower Power `>>sk` * |
| George | Drive By `<>pku` | Paralyzing Fart `supk>` | Cane Throw `<>kp` | False Teeth `<<p<>` |
| Philbert | Pie `<<>u` | Earthquake `pp>>u` | Stomach `pk>>` | Chew 'em up and Spit 'em out `p<<>p` |
| Super Squirrel | Fly `p<>k^` | Chase `pppu>` | Laser Eye Beam `>>>k` | Phone Booth `<k>ku` |
| Corpse | Life Drain `<<>>p` | Body Explode `u<>p^` | Dark Beam `<<>k` | Summon Bats `<ps>k` |
| Military Muskrat | Proximity Mine `p<k>u` | Grenade Attack `>>us` | Air Strike `<<pk>` | Chaser Missile `s<<^>` |

\* The sheet says `>>s>`, but the game itself only accepts `>>sk`, so that is what works here too.

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
