# Squirrel Kombat: Resurrection

A browser remake of **Squirrel Kombat**, the 1999 classic Mac OS shareware fighting game by John Butler (Monkey Farm Software). It's Mortal Kombat with squirrels: one or two players, rodents with kung-fu, a FINISH 'EM moment and a secret boss at the top of the tournament.

Everything here is new. The characters, art, music, sound effects and code were made from scratch: the fighters are drawn procedurally on a `<canvas>` and all audio is synthesized with the Web Audio API. No original game assets are included.

## Play

Open `index.html` in any modern browser. There's no build step and no dependencies, and it works straight from `file://` or from any static host (GitHub Pages included).

```sh
npm start            # serves the folder on http://localhost:8080 (uses npx http-server)
```

Click or press a key on the first screen so the browser allows audio.

## Controls

|               | Player 1  | Player 2              |
|---------------|-----------|-----------------------|
| Move / jump / crouch | `W A S D` | Arrow keys     |
| Punch (P)     | `F`       | `,` or `K` (or Numpad 1) |
| Kick (K)      | `G`       | `.` or `L` (or Numpad 2) |
| Block (BL)    | `H`       | `/` or `;` (or Numpad 3) |
| Pause         | `Esc` / `Enter` | `Esc` / `Enter` |

- **Gamepads:** gamepad 1 drives Player 1 and gamepad 2 drives Player 2. D-pad/stick moves, X/Y punch, A/B kick, the shoulder buttons block and Start pauses.
- **Touch screens:** an on-screen D-pad with P / K / BL buttons appears as soon as you touch the game.
- Press Up in the air to double-jump. Double-tap Down to drop through a platform.

## How to kombat

Directions are relative to your opponent: **F** means toward them, **B** away, **D** down.

| Move type | Input |
|-----------|-------|
| Claw jab / hind kick | P / K |
| Nut uppercut (launcher) | D + P |
| Tail sweep (hits low) | D + K |
| Nut toss (throw, beats block) | F + P when touching |
| Air attacks | P / K while jumping |
| Block / low block | BL / D + BL |
| **Combos** | P P P · P P K · K K K · K K P |
| **Specials** | B F + P · D F + P · F F + K · D B + K |
| **Nutality** | F B F + K, close to a dazed opponent |

Every squirrel has 4 normal moves, 4 combo strings and 4 unique specials, matching what the original advertised. You can cancel a connecting normal or combo straight into a special. When you win the deciding round your rival stands dazed: **FINISH 'EM!** Hit them, or do your Nutality.

The full move list for each fighter is in **How to Play** and in the pause menu.

## Modes

- **One on One:** against a friend on the same keyboard (Player 2 presses Punch to join on the select screen) or against the CPU.
- **Tournament:** fight up the ranks through every squirrel, then face the secret boss. You get continues, and each squirrel has its own ending.
- **Two on Two:** four fighters on screen at once. Player 2 can join as a rival or switch to being your ally (Player 2's Block button toggles this). CPU partners fill any empty slots.
- **Practice:** the dummy never dies and refills its health. Tab cycles the dummy's behaviour (stand, crouch, block, low block, jump, full CPU), and the pause menu shows the move list.
- **Options:** difficulty (Easy/Medium/Hard), best-of 1/3/5 rounds, round timer, blood on/off, announcer voice, music and effects volume. Settings are saved in the browser.

## The kombatants

| Squirrel | Style | Specials |
|----------|-------|----------|
| **Nutso** | Shaolin red squirrel | Flaming Acorn, Nut Cracker, Flying Squirrel Kick, Bicycle Tail |
| **Frostbite** | Lin Kuei gray ninja | Ice Nut (freezes), Glacier Slide, Ice Statue (counter), Avalanche Stomp |
| **Scurrion** | Hellfire hunter | Tail Spear ("GET OVER HERE!"), Teleport Claw, Leg Takedown, Hellfire Breath |
| **Thundertail** | God of thunder nuts | Lightning Nut, Thunder Teleport, Squirrel Torpedo, Static Grab |
| **Bruiser** | Metal-armed fox squirrel | Acorn Missile, Ground Pound, Gotcha Grab, Back Breaker |
| **Glider** | Flying squirrel princess | Fan Toss, Fan Lift, Glide Kick, Whirlwind |
| **Chip** | "Reptilian" chipmunk | Acid Spit, Rolling Ball, Invisibility, Nut Spray |
| **Rocco** | Cybernetic black squirrel | Knife Toss, Eye Laser, Cannonball, Nut Bomb |
| **???** | Secret boss | You'll have to find out. |

## The five fight scenes

The original's five scenes are all here, and each one fights back:

- **The Field:** fence, hay bales and an old oak. A lawnmower sweeps the ground now and then.
- **The Forest:** ride the elevator up to the branches. Watch out for **death acorns** falling from the canopy and **angry momma birds** guarding their nests. Get two squirrels into the same nest and the **bird army** appears and attacks anyone in its path, just like the original's best-known trick.
- **The Tundra:** slippery ice, falling icicles and blizzard gusts.
- **The Great Wall:** a watchtower to climb and fireworks raining down on marked targets.
- **The City:** fire escapes, a bus stop, a billboard, and traffic that does not stop for squirrels.

## Secrets

- Beat the Tournament to unlock the secret boss as a playable character.
- Impatient? Type a certain four-letter word on the character select screen.
- Win with a particular finisher and you might hear something... *toasty*.

## Project layout

```
index.html          page shell, loads the scripts in order
css/style.css       full-window letterboxed canvas
js/core.js          namespace, seeded RNG, settings, scene manager
js/input.js         keyboard, gamepad and touch controls
js/audio.js         synthesized SFX, chiptune sequencer, speech announcer
js/gfx.js           canvas drawing helpers
js/rig.js           procedural squirrel/mailman skeleton (IK limbs, bushy tail) and poses
js/characters.js    the roster
js/moves.js         normals, combo strings and the special-move builders
js/fighter.js       fighter state machine, physics, hits, blocking, drawing
js/effects.js       particles and projectiles
js/nutality.js      scripted finishing moves
js/stages.js        five stages, platforms, parallax art and hazards
js/ai.js            CPU opponents (3 difficulty levels plus a boss profile)
js/hud.js           health bars, timer, round acorns, combo counter
js/match.js         rounds, FINISH 'EM, KO/time-up, camera, pause menu
js/screens.js       title, menus, select screens, ladder, options, help, credits
js/intro.js         the intro cutscene: the ballad of the mailman and the killer squirrels
js/main.js          boot, fixed 60 Hz loop, HiDPI scaling
tests/run.js        headless test suite (runs the real game code in a Node sandbox)
tests/screenshots.js  renders screens and fights in headless Chromium via Playwright
```

## Development

```sh
npm test                                  # headless suite: inputs, specials, combos, full CPU matches on all stages, nutalities, hazards, menus
node tests/screenshots.js /tmp/shots      # PNG screenshots (needs Playwright + Chromium)
```

URL shortcuts for testing:

- `index.html?fight=nutso,chip&stage=forest` jumps straight into a fight. Add `&watch=1` to make it CPU vs CPU. Four names start a 2-on-2.
- `index.html?screen=select&mode=teams` opens a screen directly. The screens are `title`, `menu`, `select`, `stage`, `options`, `help`, `credits`, `intro`, `ladder` and `ending`.
- In a fight, the backquote key (`` ` ``) toggles the hitbox debug view.

## Credits

- **Original game:** *Squirrel Kombat* (1999) for the classic Mac OS, by John Butler, published by Monkey Farm Software.
- **This remake:** a non-commercial fan tribute. Mortal Kombat is a trademark of its owners, and this project is not affiliated with them or with the original authors.
