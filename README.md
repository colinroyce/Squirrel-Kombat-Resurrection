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
- Tournament mode: climb the ladder of fighters, then the win screen and the high score table.
  The SCORES button on the title screen shows the tables.
- The theme music plays on the menus but not during fights (the original played it throughout).
- Pausing (P) shows a move guide: the controls and every fighter's special moves in your own keys,
  one page each, flipped with the arrow keys. (An addition: in 1999 the moves were in a separate
  text file.)
- 2 Players in One on One: click 2 Players on the character screen; player 2 picks with their
  walk keys (L and '). When the fighters get more than a screen apart, the screen splits in two.
- Practice mode: hit the training dummy (nobody gets hurt) while tutorial tips cycle above.
- Credits: click the CREDITS corner of the title screen.
- The title screen has no QUIT button (an addition: there's nothing to quit in a browser).

Everything else on these screens is shown and animates as in the original, but does nothing when
clicked yet:

- Two on Two, and Practice or Tournament with 2 Players
- Alert dialogs

The character screen opens in Tournament mode, as the original does, so click **ONE ON ONE**
first. The CPU picks its fighter at random.

## Additions to the original

- The title screen has a second line, RESURREKTION, under SQUIRREL KOMBAT. Its letters fly in and
  wobble like the original's and are brightened copies of the original letter tiles, so the new
  line stands out. The original has no N, so that one is new art built from the original M (see
  `assets/added/`).
- Military Muskrat is unlocked by winning the Tournament, or by the original's secret key code,
  or on the Cheats page. For testing, adding `?debug` to the address unlocks him.
- Cheats aren't hidden: Options → CHEATS switches super blood and Military Muskrat on and off, and
  shows the original's codes (type FIREMONKEY on the title screen for super blood; press left,
  jump, right, punch, uppercut, spin kick on the character screen for Military Muskrat). The
  CHEATS button is new art made from the original buttons' letters. Cheats are remembered.
- The original Tournament can't be won (its last place on the ladder is left empty), so Military
  Muskrat is the final opponent there.
- The high-score name window is a plain rebuild: in 1999 Mac OS drew its frame and button. Its
  pictures, text and layout are the original's. High scores are saved in the browser.

## Controls

These are the defaults. You can change them in Options → Keys, and they're saved in the browser.
They're an addition: the original's uppercut was Space and player 2 used the number pad, so the new
layout lets two players share a laptop keyboard (player 2's keys mirror player 1's).

| Action | Player 1 | Player 2 |
|---|---|---|
| Walk left / right | A / D | L / ' |
| Jump | W | P |
| Punch | S | ; |
| Kick | E | [ |
| Uppercut | Left Shift | Right Shift |
| Spin kick | Q | O |

Other keys:

- Return or Enter starts from the title screen and confirms on every menu. Space also starts the
  scene.
- On the character screen, Esc cancels and the walk keys change fighter.
- During a fight, Esc pauses and shows the move guide. To leave the fight, click QUIT in the
  top left of the pause screen. (An addition: in the original, P paused and Esc quit straight away.)

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
- **10 pt text** (the round timer, the hint ticker, the practice tutorial, the win screen) is
  drawn with the Geneva 9 letters as a stand-in, until a freely usable 10 pt Geneva is found.

## Repository

| Path | Contents |
|---|---|
| `index.html`, `src/` | the game |
| `assets/` | sprites, pictures, sounds, text and fonts extracted from the original archive |
| `docs/SPEC.md` | game behaviour recovered from the PowerPC binary (timings, physics, damage, AI, screens) |
| `tools/extract/` | the extraction pipeline (`.sit` → `assets/`) |
| `tools/re/` | disassembly / decompilation tools used to write the spec |
