# Squirrel Kombat (1999) — behaviour recovered from the PowerPC binary

Source: `Squirrel Kombat` app (PEF, CodeWarrior), decompiled with Ghidra 11.0.3 plus raw
disassembly (`disasm.txt`) where the decompiler drops arguments. Addresses are Ghidra
addresses (code 0x10000000, data 0x1003cab0, TOC r2 = 0x10044ab0).

Tools: `tools/defsprites.py` (sprite templates), `tools/callargs.py` (all args at call sites,
including stack args 9+ that Ghidra drops), `tools/dd.py` (read data/doubles).

## Main loop
- `Run`: per frame: CheckKeyDown, MyRun, HandleCameras, HandleSprites, HandleQuakes,
  HandleSparks, DrawSprites; then busy-wait until TickCount advanced >= 2 (60 Hz ticks) → **30 fps cap**.
- `MyRun`: tutorial in practice mode; per-scene ambient spawns:
  - scene 0 (Forest): Rand(10000) > 9900 (or >9000 while < 20 leaves) and < 20 leaves (type 0x43a) → NewLeaf;
    Rand(10000) > 9950 → NewDeathAcorn.
  - scene 2 (Tundra): same pattern with snow (type 0x9a, cap 50) → NewSnow; Rand(10000) > 9875 → NewSnowBall.
  - scene 4 (City): fewer than 10 type 0x43f → NewFlock.
- Scene numbers: 0 Forest, 1 Field, 2 Tundra, 3 Great Wall, 4 City.
- `MyInit`: CreateBackGWorld(1024,768), DoStarting, InitSelectionData, InitRadar, InitSceneSelector,
  InitRoundGraphics, InitSpecialMoves, InitHint, LoadCharacters, DoTitle(1).
- `Rand(n)` returns 0..n-1.
- playMode: 0 = normal 1-on-1, 1 = practice (DoDamage deals no damage), 2 = team (2-on-2).

## Sprites
200 slots × 100 bytes at 0x10040504. Fields:
0x00 image · 0x02 nframes · 0x04 frame · 0x06 inUse · 0x0a rect(top,left,bottom,right) · 0x12 oldRect ·
0x1a frameW · 0x1c frameH · 0x1e type = **first cicn ID (picID)** · 0x20 proc · 0x24 vy · 0x26 vx ·
0x28 info[10] · 0x3c num (own slot index) · 0x3e action1 · 0x40 action2 · 0x42 speed ·
0x46 doDraw · 0x50 dir · 0x52 world coords · 0x5e character index · 0x56 animCounter · 0x58 animDelay · 0x60 f60.
- Frame N is drawn with cicn (type + N).
- HandleSprites calls proc for all sprites, types 500 and 0x14c last.
- RenderSprites: type 0x434 drawn first (behind), then all others in slot order; then sparks, life bars,
  round stuff, time, radar, tutorial, scores, hint.
- Player sprites occupy slots 0..1 (0..3 in team mode). Forest elevator is slot 2 (4 in team mode).
- Generic animation (projectiles etc.): animCounter++; if animCounter > animDelay → frame++, counter = 0.

### Sprite templates (DefSprites → InitSprite(t, type, nframes, delay, w, h, speed))
InitSprite defaults: frame 0, vx = vy = 0, doDraw 1, action1 = action2 = 2, dir 0, world 1, counter 0.
New* spawners copy the template, set rect + proc and call NewSpriteFromCICN.
Full table: `re/templates.txt`. Milestone-relevant rows:

| template | type (cicn) | nframes | delay | w×h | speed | extra | spawner |
|---|---|---|---|---|---|---|---|
| Ed | 128 | 66 | 2 | 32×32 | 5 | char 0 | CreatePlayers |
| Speedy | 202 | 62 | 2 | 32×32 | 8 | char 1 | CreatePlayers |
| Ice 270 (60f, spd 5), Invisible 339 (60, 5), Ninja 405 (68, 5), Mech 504 (62, 5), Kathy 595 (62, 5), George 667 (70, 4), Philbert 757 (74, 3), Super Squirrel 847 (64, 5), Corpse 915 (60, 5), Military Muskrat 1008 (60, 5) | | | | | | | |
| Nut | 194 | 2 | 2 | 8×8 | 14 | | NewNut |
| Purple beam | 196 | 1 | 2 | 32×32 | 14 | action2 0 | NewPurpleBeam(2) |
| Purple ball | 197 | 1 | 2 | 8×8 | 14 | | NewPurpleBalls |
| Spin ball | 198 | 4 | 0 | 32×32 | 9 | action2 0 | NewSpin3Ball |
| Fire | 264 | 4 | 1 | 32×16 | 8 | | NewFire |
| Fireball | 268 | 2 | 1 | 32×32 | 16 | | NewFireBall |
| dummy/practice | 500 | 4 | 2 | 32×32 | 4 | | CreatePlayers |
| Round banner | 151 | 3 | 2 | 176×52 | 4 | | DoRoundAnimation |
| Death acorn | 591 | 1 | 2 | 20×29 | 18 | action2 0 | NewDeathAcorn |
| Tree eyes | 1076 | 6 | 4 | 24×16 | 0 | action1 0 | NewEye |
| Leaf | 1082 | 4 | 7 | 16×16 | 3 | | NewLeaf |
| Nest | 1086 | 1 | 7 | 28×16 | 3 | action1 0, info2 −1 | NewNest |
| Bird | 1087 | 6 | 1 | 24×14 | 9 | info4 200 | NewBird, NewFlock |
| Log | 1093 | 1 | 7 | 64×18 | 2 | action1 0 | NewSceneSprites |
| Butterfly | 1094 | 8 | 5 | 16×16 | 4 | | NewButterfly |
| (scene) | 1107 | 1 | 4 | 32×24 | 9 | | NewSceneSprites |
| Cursor | 7000 | 6 | 3 | 32×32 | 8 | | NewCursorSprite |

## Player state machine (HandlePlayer, shared by all fighters)
dir 0 = facing right (+x), dir 1 = facing left.
action1: 1 = walking, 2 = idle, 0x12 = frozen/flying (see HandlePlayer2).  action2 states:
| action2 | meaning | frames dir0 / dir1 | delay | hit (inset) | damage | knockback to opp (h, v) | opp frame |
|---|---|---|---|---|---|---|---|
| 2 | grounded | idle 0-1 / 5-6 (delay 10); walk 1-4 / 6-9 (delay 2) | | | | | |
| 3 | airborne | 10-13 / 14-17 (delay 2) | | | | | |
| 4 | punch | 18-19 / 20-21 | 2 | 2 | 1 (at f56==2) | +1/-1, -1 | 23/22 |
| 6 | kick | 24-25 / 26-27 | 2 | 2 | 3 | ±3, -2 | 23/22 |
| 7 | uppercut | 28-30 / 31-33 | 2 | 2 | 35 (frame 30/33) | ±8, -20 | 34/35, info2=0 |
| 8 | spin kick | 36-39 / 40-43 | 2 | 0 | 30 (frame 39/43) | ±12, -10 | 34/35 |
| 9 | power slam | 44-47 / 48-51 | 2 | 2 | 25 on landing; sound 3 or 4 | carries opp up 15/frame for 20 frames, then down; opp path (±8, 10) | |
| 10 | throw | 52-53 / 54-55 | 2 | 4 | 4 (frame 53/55) | ∓1, -30 | 34/35 |
| 11 | flying side kick | 56 / 57 | | (0,4,0,2) | 18 | ±15, -5 | 34/35 |
| 12 | jump spin kick | 36-39 / 40-43 airborne | 2 | 0 | 16 | ±12, -10 | 34/35 |
| 13-16 | character specials | see below | | | | | |
| 5 | being hit (HandlePlayer2) | | | | | | |
| 0x11 | dead (HandleDeadPlayer) | | | | | | |
- Gravity: vy += 1 per frame while airborne; vy capped at 16. Walking moves `speed` px/frame.
- Anim counter: f56++ each frame; when f56 > f58, frame++ and f56 = 0.
- Hit reaction: opponent action2 = 5 (unless dead 0x11); opp path += knockback; opp dir flips to face attacker.
- Flying side kick moves by (vx, vy) plus 2× walk speed in facing direction.

### HandlePlayer2 (after the per-character code)
- action1 0x12 (frozen/carried): doDraw 1, f60 0, frame = info[4]; move (vx, vy), vy += 1;
  if right > 1024 or left < 0: vx = vx × −0.75; KeepSpriteOnScreen; on surface: vy = vy × −0.5, info2 = 1,
  |vy| < 2 → vx = vy = 0. info7--; info7 < 1 or action2 == 5 → action1 = 2.
- action2 5 (hit): action1 = 2, doDraw 1, f60 0; move (vx, vy), vy += 1; wall bounce vx × −0.75 (0x1003d510);
  KeepSpriteOnScreen; on surface: if frame 0x22/0x23 → vy × −0.5 (0x1003d508), info2 = 1, |vy| < 2 →
  action2 = 2, vx = vy = 0; other frames → action2 2, vx 0 ... frame 0/5.
- Blood: colour red (0xcd) for blood pref 0, yellow (0x45) for pref 2. Normal blood: 3 × MakeSparks(…, dir, 2, 8, 3, colour, gravity 1, 2×2)
  at (left, top+16), (left+32, top+16), (left+16, top). Super blood: same 3 points with count 12, life 36, size 3×3.
- info[0]++ > 1 → action1 = 2.

### OnSurface
- bottom > 767 counts as ground.
- Platforms: list at 0x1004ae74 (25 rects) via SetPlatRect(left, top, right, bottom).
- Player rect inset 8 px horizontally, tested with bottom + 2; lands when bottom ≤ plat.top + 16 and vy ≥ 0;
  snaps bottom = plat.top + 1.
- Forest: the elevator sprite (slot 2, or 4 in team mode) also counts as a surface.

### GetOpp(info1, rect, num)
- 1 player or playMode 0 → returns info1 (= opponent's slot index, stored at creation).
- Team mode: whichever enemy (2/3 for nums 0/1, 0/1 for nums 2/3) collides with rect (inset 2), else the
  living one, preferring the "partner-opposite". PartnerOfMe: 0↔1, 2↔3.

### DoDamage(victim, dmg, attackerNum)
- PlaySound(Rand(5) + 3).
- Unless playMode 1: life[victim] -= dmg (life array 0x1004ac50, 200 each). ≤ 0 → life 0, action2 0x11, info9 = 0
  (only if not already 0x11). Capped at 200.
- If victim not dead and dmg > 0: ChangeScore(attacker, dmg); again if victim action2 == 5 (double points).
- ChangeScore(n, d): if n != −1: score[n] += d (array 0x1004b1cc).
- Original bug, preserve: Speedy's Scorch fire passes its sprite type (202) as attacker num → ChangeScore
  writes score[202] (a stray global), i.e. scorch damage earns no visible points.

## Life bars
Rects (left, top, right, bottom). Non-team: P0 (10,10,210,17), P1 (430,10,630,17), P2 (10,27,210,34), P3 (430,27,630,34).
Team: P0 (10,10,210,17), P2 (430,10,630,17), P1 (10,38,210,45), P3 (430,38,630,45). Outline inset −2.
Colours RGB (0xffff, 0x08c2, 0x06a2) and (0x8000, 0, 0).

## Controls (DefaultKeys; slot order 0 left, 1 jump, 2 right, 3 punch, 4 kick, 5 uppercut, 6 spin)
- P1: A, W, D, S, E, Space, Q.   P2: keypad 4, 8, 6, 5, 9, 0, 7.
- CheckKeyDown per player:
  - jump: on ground → action2 3, vy = −17, sound 2; during uppercut (7) → power slam (9), sound Rand(7)+8.
  - left/right: walk, or turn if not facing that way.
  - punch → 4; during uppercut → throw (10).
  - kick → 6; airborne → flying side kick (0xb), sound Rand(7)+8.
  - uppercut → 7.
  - spin → 8; airborne → 0xc with sound.
- System: Cmd-Q quit; Esc → selection; P or keycode 0x71 → pause (PICT 9000 at (240,218)-(400,263)),
  pause time added back to the round timer.

## Special move input
Ring buffer of the last 5 distinct key slots per player; a key is recorded only when it differs from the
last recorded; "last" resets when no key is held. Patterns are absolute key slots; the mirrored form
(left↔right swapped) is also accepted.
- Ed: (3,4,3,5) teleport → 0xd · (0,0,2,5) machine-gun nuts → 0xe · (0,3,2,4,2) atomic scatter → 0xf + NewPurpleBeam ·
  (2,2,3,3) tri ball → 0x10 + NewSpin3Ball.
- Speedy: (0,2,3) speed-by → 0xd · (0,0,2,4) hit and run → 0xe · (0,5,0,2,4) scorch → 0xf ·
  (0,0,2,2,6) fireball → NewFireBall(rect, info1, 0, dir).

## Ed (HandleEd)
Runs HandleAI first when the sprite is CPU-controlled (no type 0x97 sprites, type ≠ 0x96, and 1 player with num 1,
or 2 players in team mode with num 2/3). Then HandlePlayer, then:
- 0xd teleport: frame 64/65; info7++; when info7 > 7: 4 × MakeSparks(left+16, top+16, d=3,2,1,0, count 20, life 15,
  speed 3, cyan 0x111, grav 0, 2×2); move to opponent: rect = opp rect, then left = opp.left − 24 if opp dir 0
  else opp.right − 8; dir = opp dir; frame 1/6; repeat the 4 sparks at new spot; action2 2 (3 if not on surface).
  KeepSpriteOnScreen is skipped while in 0xd.
- 0xe machine-gun nuts: info5++; < 10 → frame 60/61; else frame 62/63 and NewNut every frame; info5 > 20 → action2 3 if bottom < 768 else 2.
- 0xf atomic scatter: frame 64/65 until no type 0xc4/0xc5 sprites with info3 == num remain → 3/2 as above.
- 0x10 tri ball: frame 64/65 until no type 0xc6 sprites remain.
- Then HandlePlayer2.

## Speedy (HandleSpeedy)
Same AI/HandlePlayer prologue. info5 counts frames; each ends after info5 > 7 → action2 3 if bottom < 768 else 2.
- 0xd speed-by: frame 60/61, move ±32 px/frame.
- 0xe hit and run: frame 60/61, move ±30 px/frame; each frame touching opponent: DoDamage(opp, 7), opp action2 5
  (unless dead), opp path (±10, −2), opp dir faces away, opp frame 0x17/0x16.
- 0xf scorch: frame 60/61; NewFire(rect, info1, type) each frame then move ±32 px/frame.
- Then HandlePlayer2; KeepSpriteOnScreen always.

## Projectiles
Hit test is DetectCollision(a, b, insets…) — rects shrunk by the given insets before intersecting.
Standard "hit" = DoDamage, opp action2 5 unless dead, path += knockback, set dir and frame unless dead or picID 500.
- **Nut** (Ed): spawn rect = Ed rect inset 12 (8×8), offset +18 (dir 0) / −18 (dir 1); info1/2 = opp, Ed num; dir.
  Each frame: move ±14; frame 0/1 by dir; offscreen → kill. Hit (opp inset 2): 3 dmg, path (±1, −1), opp dir 1/0,
  frame 0x17/0x16; nut dies.
- **Purple beam** (Ed atomic scatter): NewPurpleBeam(rect, info1, num, num): rect top 0, bottom 32 (column above Ed
  from the sky). action2 0: hit check, → 1. action2 1: spawn next segment 32 px lower (NewPurpleBeam2), hit check, → 2.
  action2 2+: hit check; if the segment touches Ed (info2's rect, inset 2): kill all type-196 sprites with this info3
  and NewPurpleBalls at Ed's rect. If top ≥ 785 the column is killed. Hit: 10 dmg, path (±1, −1), frame 0x17/0x16.
- **Purple balls**: 40 balls; rect = Ed rect inset 12; vx = Rand(30) − 15, vy = Rand(8) − 20; each pre-moved 5 times
  (MoveSprite). Each frame: move (vx, vy), vy += 1; offscreen → kill. Hit (both inset 2): 10 dmg, path += (vx, vy),
  opp dir 1/0, frame 0x22/0x23, info2 = 0; ball dies.
- **Spin balls** (Ed tri ball): 3 balls at Ed's rect with (vx, vy) = (0, −4), (−4, 0), (4, 0). Animate frames 0-3
  (delay 0); action2++: < 8 → move +v, else move −v; > 15 → kill. Hit: 10 dmg, path += (4vx, 4vy), opp dir 1,
  frame 0x22, info2 0. (Ball is not killed on hit.)
- **Fire** (Speedy scorch): rect = Speedy rect with top += 16 (32×16); info2 = 202 (bug above). Animates 0-3 (delay 1),
  lives 32 frames. Each frame touching: 1 dmg, path v −1, frame 0x17, info2 0.
- **Fireball** (Speedy): rect = Speedy rect, dir. Each frame: frame 0/1 by dir, move ±16; trail: Rand(2) picks yellow
  (0x45) or red (0xcd): MakeSparks(dir0: left, top+16, d1 | dir1: left+32, top+16, d0, count 2, life 8, speed 5, grav 0, 2×2).
  Hit (inset 2): 8 burst MakeSparks at centre (d 0,1,3,2 × red+yellow, count 3, life 6, speed 5, 2×2); 20 dmg, opp frame 0x17,
  info2 0; dies. Offscreen → kill.
- **TriCenter** (used by another character's tri move): on hit sets the opp to action1 0x12 for 120 frames
  (info4 = current frame), damage 3.

## Sparks
250 slots × 20 bytes at 0x10045828: +0 y, +2 x, +4 colour, +6 gravity, +8 vy, +0xa vx, +0xc h, +0xe w, +0x10 active, +0x12 life.
- MakeSparks(x, y, dir, count, life, speed, colour, gravity, w, h): only if (x, y) visible in a camera and inside
  the 1024×768 world; fills the first `count` free slots via NewSpark.
- NewSpark: x += Rand(5) − 2, y += Rand(5) − 2. dir 0: vx = speed + Rand(5) − 2, vy = Rand(7) − 3; dir 1: vx negated;
  dir 2: vy = speed + Rand(5) − 2, vx = Rand(7) − 3; dir 3: vy negated.
- HandleSpark (each frame): x += vx, y += vy; gravity → vy += 1; life--; dies when life ≤ 0, not visible, or outside the world.
- DrawSpark1: filled rect (x, y, x + w, y + h) in world→screen coords, ForeColor(colour).
- Colours are classic QuickDraw ForeColor constants: 0xcd red, 0x45 yellow, 0x89 magenta, 0x111 cyan
  (also 0x155 green, 0x199 blue, 0x21 black, 0x1e white).

## Random numbers
- `Rand(n)` = (Random() & 0x7fff) % n; `Rand1(n)` = Rand(n) + 1. Random() is the QuickDraw Toolbox generator
  (randSeed = randSeed × 16807 mod (2^31 − 1); result = low 16 bits as signed; 0x8000 → 0).
- InitToolbox seeds qd.randSeed with TickCount().

## Display and blitting
- DrawSprocket context 640×480, 8-bit, back buffer 8-bit, default system CLUT (no custom colour table).
  Everything is drawn through the Mac 256-colour system palette. All 1,072 cicns already use only system-palette
  colours. PICTs 11000, 600, 802–808 contain off-palette colours and must be mapped to the system palette
  (QuickDraw nearest-colour via inverse table) when drawn.
- Each sprite's frames are pre-rendered into an 8-bit strip GWorld (frames side by side, frameW apart), filled
  white first then PlotCIcon. Sprites are drawn with CopyBits mode 0x24 = `transparent`: **white pixels are
  transparent** (masked-out areas and any opaque pure-white pixel). Destination rect = sprite rect (CopyBits scales
  if sizes differ).
- QDGlobals patterns used: +0xba black (solid fill in ForeColor), +0xc2 white.
- QuickDraw old-style colours via ForeColor: 0x21 black, 0x1e white, 0xcd red, 0x45 yellow, 0x89 magenta,
  0x111 cyan, 0x155 green, 0x199 blue. These map to the nearest system-palette entries on the 8-bit screen.
- Text: TextFont(1) = application font (Geneva) — sizes 9 and 10, plain (bold for hint strings 15/16).
  **Geneva bitmap font is not in the game archive.**

## Render order (RenderSprites, non-split)
1. Background: copy view rect of the 1024×768 back GWorld (renderOption 1) to the buffer.
2. Sprites of type 0x434 (tree eyes, 1076) in slot order; then every other visible sprite in slot order
   (visible = rect intersects the view and doDraw != 0). World coords unless world == 0.
3. DrawSparks1, DrawLifeBars, DrawRoundStuff, DrawTime, DrawRadar, DrawTutorial, DrawScores, DrawHint.
4. Buffer → screen.
- HandleSprites: proc of every in-use sprite in slot order, except types 500 and 0x14c, which run in a second pass.

## Camera
- View rect (0x100400b0), world rect (0x100400c2) = (0, 0, 1024, 768) for stages.
- In-game (`HandleCameras` every frame): camera sprite 1 = player 0 (SetCameraUp(0, picID, 32)); camera 2 only when
  2 humans. 1 player: `HandleSingleCamera` → view = 640×480 centred on player 0's rect centre (integer halves,
  C truncation), then clamped inside the world (OffCamera(0,0)). 2 players: CalcDistance gives the gap between
  the two rects and their midpoint; if gap.x < 641 and gap.y < 481 → single view centred on the midpoint,
  else split screen (two 320×480 views, HandleDoubleCamera).
- `HandleCamera` (smooth follow, speed 32 px/frame, deadzone at view centre) is used only by HandleTitle,
  RunOptions and RunSelection.

## Players (CreatePlayers)
- Rects: P0 (410, 736)-(442, 768), P1 (582, 736)-(614, 768) (left, top, right, bottom). Team partners at ∓16 px.
- 1 player or 2-player versus: P0 = chosen char 0, info1 = 1, frame 0, dir 0. P1 = chosen char 1 (or the practice
  dummy, type 500, in playMode 1), info1 = 0, frame 5, dir 1.
- Slots: P0 = 0, P1 = 1 (sprites allocated in the first free slot; KillAllSprites before each round).

## AI (HandleAI, runs before HandlePlayer for CPU fighters)
Skipped when action1 == 0x12, action2 == 5, or (action2 == 0xd and char == Invisible).
Fields: f5a = aiState, f5c = previous aiState, f60 = special flag. Percent table from SetPercents(p1, p2, p3, p4):
P0 = p1, P1 = p1 + p2, P2 = p1 + p2 + p3, special threshold p4.
Difficulty pref 0 → (25, 25, 50, 75); 1 → (30, 25, 45, 50); 2 → (50, 20, 30, 30).
- If f60 != 0 and action2 != 0xd and Rand(1200) > 1185 → action2 0xd, info5 = 11.
- action2 0x13 has its own random-walk sub-AI (character-specific, not needed for Ed/Speedy).
- aiState 0 and action2 ∈ {2, 3} → choose:
  c = Rand(100) ≤ P0 ? 0 : Rand ≤ P1 ? 1 : 2 (same roll); life < 50 and Rand(2) → c = 1; life ≥ 200 and Rand(2) → c = 0;
  Rand(100) > p4 → c = 3; touching opponent (no insets) → c = 0.
  - c 0: aiState 1 (approach); if touching and Rand(100) > 100 − P0 → aiState 2 (attack).
  - c 1: aiState 3 (retreat).  c 2: Rand(3): 0 → 1, 1 → 3, 2 → 4 (hold).
  - c 3: lvl = Rand(100) ≤ P0 ? 0 : ≤ P1 ? 1 : 2; allowed[i] = EvalSpecialMove(char, lvl, i) for i 0..3;
    draw Rand(4) until an allowed index (or all four tried → none). If f60 and pick == 0 → none.
    DoSpecialMove(num, char, pick). aiState 0.
- aiState 1 approach: action1 1 (walk); face the opponent (dir 1 if opp.left+16 < self.left+16). aiState → 0 when
  self.left+16 > opp.left and self.left < opp.right; (bug: "jump if opponent higher" compares opp.bottom with
  opp.top − 100 → never fires); Rand(1000) > 990 → 0; touching → 0; self.right ≥ 1024 or self.left ≤ 0 → 0.
- aiState 2 attack: only when action2 ∈ {2, 3}. Airborne: Rand(2) 0 → 0xb flying side kick, 1 → 0xc jump spin kick.
  Grounded: Rand(4): 0 → **action1 = 4** (bug: meant punch; no attack happens), 1 → kick (6),
  2 → Rand(3) < 2 ? uppercut (7) : power slam (9), 3 → nothing (spin kick unreachable). Always aiState → 0.
- aiState 3 retreat: action1 1; face away from opponent; Rand(1000) > 990, at world edge, or touching → 0.
- aiState 4 hold: if not airborne: action2 2; Rand(1000) > 980 or touching → 0.
- aiState 0x14 / 0x15: action1 0x14 / 0x15 (flying chars).
- Afterwards: if action1 == 1, Rand(1000) > 980, action2 == 2 and on a surface → jump (action2 3, vy −17).
  George (7) in 0xd: flip dir at world edge, Rand(1500) > 1490 ends it. Super Squirrel (9) in 0xe touching opp → stop.
  Speedy (1) in 0xd/0xe/0xf: flip dir at world edge. f5c = f5a.
- EvalSpecialMove(char, lvl, i): lvl 0 → table row +8, lvl 1 → row +0, lvl 2 → row +0x10 (row = 0x1004af80 + char·0x18).
  Allowed specials (index 0..3) per lvl0 / lvl1 / lvl2:
  Ed 1111/1011/1000 · Speedy 0111/1000/1100 · Ice 1101/0010/0010 · Invisible 0111/0000/1000 · Ninja 1011/0101/1101 ·
  Mech 1111/0000/0000 · Kathy 1111/1000/0000 · George 0111/1000/0000 · Philbert 1111/0000/0000 ·
  Super 0011/1000/1100 · Corpse 1011/0100/1010 · Muskrat 1011/0100/0100.
- DoSpecialMove: Ed 0 teleport (0xd, info5 = info7 = 0), 1 nuts (0xe, info5 0), 2 atomic scatter (0xf + NewPurpleBeam(rect,
  info1, num, num)), 3 tri ball (0x10 + NewSpin3Ball); all skipped while action2 == 5.
  Speedy 0 speed-by (0xd), 1 hit-and-run (0xe), 2 scorch (0xf) (info5 0), 3 NewFireBall(rect, info1, num, dir);
  all skipped while action2 ∈ {5, 0xd, 0xe, 0xf}.

## Special-move key recorder (player 1 = RecordKey1/CheckPattern1/ClearPattern1)
- Ring of 5 shorts (init −1), write index wraps 0..4; RecordKey(k) only if k != last; last reset elsewhere when no key held.
- CheckPattern(a, b, c, d, e, n): for each start 0..4, compare n consecutive ring entries (circular) with the pattern.
- CheckMoves1 (player slot 0, by chosen char). On match: ClearPattern, then trigger (same guards as DoSpecialMove).
  Ed: (3,4,3,5) teleport; (0,0,2,5)/(2,2,0,5) nuts; (0,3,2,4,2)/(2,3,0,4,0) atomic; (2,2,3,3)/(0,0,3,3) tri ball.
  Speedy: (0,2,3)/(2,0,3) speed-by; (0,0,2,4)/(2,2,0,4) hit-and-run; (0,5,0,2,4)/(2,5,2,0,4) scorch; (0,0,2,2,6)/(2,2,0,0,6) fireball.
  Patterns are checked in that order; first match wins.

## Dead player (HandleDeadPlayer, action2 0x11)
- Each frame: info6++, doDraw 1, f60 0, info7--; physics like the hit state (move, vy += 1, wall bounce ×−0.75,
  KeepSpriteOnScreen, landing vy ×−0.5, stop when |vy| < 2). Frame 58 (dir 0) / 59 (dir 1).
- Team mode: waits for the partner to be dead too (else info6 = −1).
- When info6 ≥ 101: AddWin(num) (gives the win to the other side), then CheckWin:
  - nobody has 2 wins: Fade, IncreaseRoundNum, KillAllSprites, CreatePlayers, cameras, AddPointsForLife, InitLife,
    NewSceneSprites, DrawSprites, InitKeyRecorder, DoRoundAnimation, Run (next round).
  - match over: AddPointsForLife; playMode 0/3 → back to selection. Tournament (2): unregistered and place > 4 →
    high score + selection; human died → high score + selection; else IncreasePlace → next opponent
    (tournament screen, random scene, new round) or, after the last, Fade, DoWinScreen, high score, selection.

## Rounds, timer, HUD
- Round data: roundNum (0x1004ad4a), wins P-side 0 (ad4c), side 1 (ad4e). CheckWin: someone has ≥ 2 wins (best of 3).
- AddPointsForLife: score[i] += life[i] for each human player.
- DoRoundAnimation: banner sprite from PICT 151 (3 frames of 176×52, frame = roundNum). With the view rect V:
  rect = (V.left − 175, V.bottom − 266, V.left + 1, V.bottom − 214) (left, top, right, bottom); info0 = V.left + 321.
  HandleRound: if left + 88 < info0 → move +32 px; else wait 40 frames (info1 counts to 40); then move +32 px/frame
  until it no longer intersects the world rect, then it is killed. DoRoundAnimation runs HandleSprites once, FadeBack(0),
  then loops DrawSprites + HandleSprites until the banner is gone (fighters' procs run during the banner).
  Then InitTime (not practice) or StartTutorial (practice).
- Time pref → round time: 0 → 1800 ticks (30 s), 1 → 3600 (60 s), 2 → 5400 (90 s), 3 → −666 (no limit).
  InitTime: box rect (300, 50)-(340, 65); dest = TickCount + time.
- DrawTime: text "M:SS" (seconds zero-padded), "- --" when unlimited, "0:00" at timeout. Box: rect inset −2 filled red,
  rect filled black, text red Geneva 10 at (left + 8, top + 12). At timeout (not practice): lower life dies
  (action2 0x11) — equal life: nothing happens; team mode compares summed life.
- Pause adds the paused ticks to dest time.
- DrawRoundStuff: PICT 152 (96×32, digits 1–3 as 32×32 frames, index roundNum) at (304, 8)-(336, 40), srcCopy.
  Win acorns PICT 153 (8×8), transparent: side 0 wins at (202,22)-(210,30) and (191,22)-(199,30); side 1 at
  (622,22)-(630,30) and (611,22)-(619,30). Team mode: all +28 px down.
- Life bars (DrawLifeBars): per bar: outline rect (inset −2) black; fill rect with RGB (0x8000,0,0) dark red; then
  life portion (left .. left + life) in RGB (0xffff,0x08c2,0x06a2). When life < 51 the bar flashes: alternate frames
  skip the dark-red/red colours (draw black). Low-life warning: PlaySound(20) at most every 30 ticks while a human
  (1P: P0 < 51; 2P: either < 50) is low.
- Radar (InitRadar): rect (288, 75)-(352, 123) (64×48 = world/16). Outline inset −1 red, inside black. Dots 2×2 at
  (287 + (left+16)/16, 74 + (top+16)/16): P0 red, P1 yellow, (team) P2 blue, P3 green; dead players hidden.
- Scores (InitScores): boxes (15,22)-(105,33) and (435,22)-(525,33) (team: also (15,50)-(105,61), (435,50)-(525,61)).
  Displayed score counts toward the real score by 1 per frame. Box: outline red (inset −1), black inside, number
  right-aligned at (right − 2 − width, top + 9) red Geneva 9.
- Tutorial (practice): box at 0x1004b0a4, text at (left + 5, top + 11) red Geneva 10.
- Hint ticker (DrawHint, when enabled): box outline red, black inside, STR# 130 strings scroll left 2 px/frame,
  clipped to the box, Geneva 10 (bold for strings 15/16); wraps to the next string (0..14) when fully scrolled out,
  restarting at x = 445.

## Scenes (InitScene → FillBackWithPict(id, 1024, 768), platforms, NewSceneSprites)
Platforms SetPlatRect(left, top, right, bottom):
- 0 Forest (PICT 8000): (0,217,413,254), (624,225,1000,247), (624,95,855,129), (629,319,737,332).
- 1 Field (12000): none.  2 Tundra (13000): (42,652,132,673), (106,567,203,592), (0,484,273,507), (226,423,345,441),
  (344,340,608,363), (556,414,657,431), (671,458,818,478), (814,532,868,553), (893,686,994,703), (805,603,1024,634).
- 3 Great Wall (14000): (156,538,456,758), (576,538,876,758), (973,608,1273,758), (0,608,52,758).
- 4 City (15000): (23,656,106,671), (766,727,1003,741), (769,665,1000,685).
- Unregistered builds pick random scenes from {Forest, Field} only; registered: Rand(5).
Forest sprites (NewSceneSprites), created after the players so the log is slot 2:
- Log "elevator" (cicn 1093, 64×18) at (480,240)-(544,258), speed 2: moves down 2 px/frame until top > 704, then up
  until top < 200. Counts as a surface.
- Tree eyes (1076, 24×16, 6 frames, delay 4) at (504,292), (527,343), (927,498), (34,571): closed → Rand(640) > 635 →
  open (frames up to 5) → Rand(10) > 7 → close (frames down to 0).
- 6 × NewLeaf; nests (1086, 28×16) with bottom-left at (70,218), (760,226), (844,88).
- Leaf: rect x = Rand(1008), top −16; vy = Rand(3) + 2, vx 0. Each frame move; Rand(40) > 37 → vx += Rand(3) − 1,
  clamp ±2; frames 0–3, delay 7; dies when top > 768.
- Death acorn (591, 20×29): x = Rand(1004), top −29. **The template's vy accumulates Rand(3) − 1 every spawn** (original
  quirk). Each frame: move, vy += 1 (max 14); top > 768 → dies. Touching a player (both inset 2): DoDamage(p, 25, −1),
  dies, player path (h − Rand(7) − 3, v − 9), frame 0x22 + action2 5 (unless dead/dummy), info2 0. Checks every player even
  after it died this frame.
- Nest: for each player touching it (both inset 2): if info2 != p → NewBird(p); info2 = p. Nobody touching → info2 = −1.
- Bird (1087, 24×14, 6 frames, delay 1, speed 9, info4 200): spawns at (1012, −100)-(1036, −86), info2 = target.
  Each frame: info4--; at 0 → 4 × MakeSparks(left − 12, top − 7, d 3/2/0/1, 10, life 20, speed 7, blue 0x199, 0, 2×2) and dies
  (still finishes this frame). Move; dir = vx < 1 ? 1 : 0; frames 0–2 (dir 0) / 3–5 (dir 1). Homing on target rect:
  Rand(2) → vx ±= Rand1(2) toward target.right; Rand(2) → vy += Rand1(2) if bird.bottom < target.bottom, vy −= Rand1(2)
  if target.top < bird.top. Clamp vx to ±9; vy > 10 → 9; vy < −8 → −9. KeepSpriteOnScreen. Touching target (bird inset 5,
  target inset 2) → dies, DoDamage(target, 18, −1), path (h − Rand(7) − 3, v − 3), dir 1, frame 0x22 + action2 5, info2 0.
- MyRun adds leaves and death acorns over time (see Main loop).

## Sounds and music
- `PlaySound(i)` plays snd resource 128 + i (i = 0..20) on the first idle channel of 15 (none free → dropped);
  only when sound pref on. 0 "Monkey Farm" voice · 1 whoosh · 2 jump · 3–7 hits (Rand(5)+3) · 8–14 attack yells
  (Rand(7)+8) · 15 "Dialog Open" (screen appears) · 16 "Click 1" · 17 Explosion · 18 "Over" (hover) · 19 "Click 2" ·
  20 low-life warning (snd 148).
- Music: snd 1000 on its own channel, looped via callBackCmd; PlayMusic(0) restarts it only if a different track.
  DoTitle(1) calls PlayMusic(0). Music pref off → silent.

## Preferences (defaults, DefaultPrefs)
sound 1 (on), music 1 (on), difficulty 1 (medium), blood 2 (**yellow**), time 1 (60 s). Blood: 0 red, 1 off, 2 yellow.
Keys as listed under Controls. Initial selection state: numPlayers 1, playMode 2 (tournament), chosen chars 0/0.
Registered build is the target (video shows PICT 4000 select background, all 11 fighters + Military Muskrat).

## Fades (DrawSprocket gamma)
Fade(n) = DSpContext_FadeGammaOut to colour n; FadeBack(n) = FadeGammaIn from colour n. Colours: 0 black, 1 white,
2 red (ffff,0,0), 3 blue, 4 green (0,ffff,0), 5 (0241,ab54,eaff), 6 (fc00,f37d,052f). Fade also kills sparks/quakes.
Duration: DrawSprocket's fixed fade time (to be measured from the gameplay video).

## Startup sequence
1. DoStarting (splash): background PICT 5128 (barn) shown, FadeBack(0) from black.
   Letters PICTs 5129..5139 (50×50) for i = 0..10 except i = 6 (space): "MONKEY FARM". Each: PlaySound(1); rect
   left = 51·i + 39, from top −50 dropping 40 px per tick (60 Hz) while bottom < 220 → drawn at bottoms 0,40,…,200,
   then stamped into the background at bottom 240. Then PICT 5140 (142×30) slides from left = −131, top 250, +40 px/tick
   while left + 71 < 320, then stamped. If the mouse button is not held: PlaySound(0) + wait 300 ticks (5 s).
   Fade(1) to white, clear screen, FadeBack(1), Fade(0) to black.
2. LoadCharacters: PICT 156 (LOADING) background, 12 bar segments (9 + 52k, 340)-(59 + 52k, 364) filled dark red
   (8000,0,0); FadeBack(0). For each of the 12 characters: segment fills bright red (ffff,08c2,06a2) from the left in
   10 px steps, one step per tick (5 ticks/segment). Then Fade(2) to red.
3. DoTitle(1): PlayMusic(0); title background PICT 7000; NewTitleScreenSprites; StartHint; FadeBack(2) (from red).

## Title screen (TitleLoop → HandleTitle every 2 ticks = 30 fps)
- HandleTitle: CustomLoop, CheckTitleKeyDown, camera (inactive), HandleSprites, HandleQuakes, HandleSparks,
  HandleLightning, DrawSprites.
- Sprites (NewTitleScreenSprites; PlaySound(15) first): 4 buttons at y top 480 (64×32 cicn strips, 3 frames: normal,
  hover, pressed): Start 1109 at x 48, Options 1112 at x 208, Scores 1115 at x 368, Quit 1136 at x 528 (vy −7 in template).
  Then the cursor (slot 199) and 15 title letters (cicn 1120 + i, 32×32, speed 10) all starting at (304,150)-(336,182),
  homing to (info0 = 112 + 32i, info1 = 150).
- Button handler: action1 0 rising 12 px/frame until top < 401 → 1. 1: hover → 2 (PlaySound 18). 2: leave → 1 (PlaySound 16);
  click → 3, two "swoosh" sprites (1118 dir 0 going right from rect top + 8..., 1119 dir 1 going left; 64×8, 25 px/frame)
  and PlaySound(1). 3: button falls (vy from −7, +1/frame) until it leaves the world. frame = action1 − 1 (not in state 0).
  Start's swoosh (HandleStartProj) leaving the world → game message 2 → OpenSelection. Options' → QuitHint + OpenOptions.
- Letters (HandleLetter): move by (vx, vy); Rand(2): vx ±= Rand1(2) toward info0 (compares right + 16); Rand(2): vy ±= Rand1(2)
  toward info1 (compares top + 16); clamp vx ±speed, vy (> speed+1 → speed, < 1−speed → −speed); every 11 frames speed−1 (min 1).
- Cursor (HandleCursor, cicn 7000, 6 frames delay 3): rect = (mouse.x − 16, mouse.y − 4) 32×32. Blood pref red (0) → drips
  MakeSparks(x + 18, y + 28, down, 2, life 20, speed 1, red, gravity, 2×2); super blood: 12, life 38, 3×3.
- CustomLoop: if Rand(9000) > 8900 or fewer than 23 sprites → spawn a flying kicker (Rand(2): FlyKicker2 / FlyKicker).
  Random char Rand(12) (any of the 12, Muskrat included). Spawn: Rand(2)=0 → from bottom (x Rand(540), y 480);
  else Rand(2)=0 → from right (x 640, y Rand(305)+75) moving left, else from left (x −32). vy −19.
  FlyKicker: vx ±10, frame 56/57. FlyKicker2: vx ±5, spin frames 36–39 / 40–43. Gravity +1; dies when bottom > 480,
  left > 640 or right < 0.
- Credits hot spot (0,428)-(94,480): click → draw PICT 158 there, PlaySound(16), DoCredits, then rebuild the title.
- Keys: Esc or Cmd-Q → quit; Return/Enter → selection. Typing F-I-R-E-M-O-N-K-E-Y toggles super blood (registered),
  with a red spark burst at the mouse and hint strings 16/17.
- Hint ticker box (StartHint): (115,460)-(445,476), text starts at x 445.

## Screen transition (KillSpriteControls)
PlaySound(15), kill sparks, set every sprite's proc to HandleDeadControl (fall 16 px/frame until outside the view),
then loop DrawSprites/HandleSprites (no frame limiter) until no sprites remain.

## Options (OpenOptions)
Fade(0); background PICT 3000; sprites; FadeBack(0); PlaySound(15); RunOptions (30 fps) until OK; KillSpriteControls;
Fade(0); title rebuilt; FadeBack(0).
- Slots 0–19 reserved then killed. Slot 20 OK button (PICT 129, 100×32 ×3) at (508,479)-(608,511): rises 8 px/frame
  until top < 417; hover frame 1, click frame 2 → exit. Return/Enter also exits.
- Main buttons, all at x 270..370 starting top −31, falling `speed` px/frame until top ≥ target:
  Sound PICT 130 (4, 16) · Music 133 (8, 64) · Blood 134 (12, 112) · Difficulty 136 (16, 160) · Time 140 (20, 208) · Keys 145 (24, 256).
- Main button: action1 0 frame 0, hover → 1 (sound 18); 1 frame 1: leave → 0, click → KillSubButtons, action1 2,
  sound 16, spawn its sub-buttons at its rect offset +3 px; 2 frame 2: click → KillSubButtons, back to 1 (sound 19).
- Sub-buttons (PICT strips 100×32 ×3): ON 131 / OFF 132 / YELLOW 135 / EASY 137 / MEDIUM 138 / HARD 139 /
  0:30 141 / 1:00 142 / 1:30 143 / UNLIMITED 144. The current value starts selected (info5 = 1, frame 1).
  Each slides for 10 frames by its own step then waits: Sound/Music ON (+10,0), OFF (+20,0); Blood ON(red) (+10,−3),
  OFF (+10,+3), YELLOW (+10,0); Easy (+10,−3), Medium (+10,0), Hard (+10,+3); 0:30 (+10,−3), 1:00 (+10,0),
  1:30 (+10,+3), Unlimited (+10,+6). Click → becomes selected (flashes pressed frame 2 for 5 frames then frame 1),
  previously selected → unselected, pref set, sound 16. Retract (action1 3): reverse step for 10 frames then killed.
- Keys button → key configuration screen (OpenKeyScreen; PICT 600 "KEYS").

## Character selection (OpenSelection)
Fade(0); background PICT 4000 (registered); sprites; FadeBack(0); PlaySound(15); RunSelection (30 fps).
Slots: 0 OK (PICT 129) at (508,479), 1 Cancel (PICT 146) at (32,479) — both rise 8 px/frame until top < 417;
2 one-player icon (cicn 2002, 50×50, 2 frames) at (32,−49) falling 8 px/frame until bottom ≥ 66;
3–5 play-mode buttons ONE ON ONE 147 / PRACTICE 148 / TOURNAMENT 149 (+ 6 = 150 two-on-two, 2 players only) at
(508,−31) falling 4/8/12/16 px/frame to tops 16/64/112/160; 7 P1 frame (cicn 2000, 36×40), 8 P2 frame (2001);
9 P1 preview (cicn 5000 + char, bouncing x 272↔320 at 1 px/frame), 10 P2 preview (6000 + char, 336↔320);
cursor 199; two-player icon (cicn 2004) in slot 198 at (90,−49).
- Character rects (32×32): chars 0–4 at x 163 + 70k, y 194; chars 5–10 at x 114 + 70k, y 286; Muskrat (11) at (272,378).
  Selection frame = char rect inset −2 with top −4.
- Input (debounced 10 ticks): P1 left/right cycle P1's char (wrapping), P2 left/right cycle P2's; Return/Enter → OK
  (frame 2); Esc → cancel (back to title); Cmd-Q quit; in 1-player mode clicking a portrait (or the 30 px below it)
  picks P1's char. Sounds 18 on change.
- Play-mode button: click → selected (pressed 5 frames then frame 1), previous unselected, playMode = slot − 3, sound 16.
- OK → KillSpriteControls → (tournament: ladder screen) else OpenSceneSelector → Fade(0), CreatePlayers…, fight.
  1 player + ONE ON ONE: the CPU opponent's char = Rand(numChars) (SetCharRand(1)). Esc/Cancel → title.

## Scene selector (OpenSceneSelector)
Fade(2) (red); background PICT 11000; current scene thumbnail (PICT 10001 Forest, 10002 Field, 10006 Tundra, 10007 Great Wall,
10008 City) drawn into the background at (192,144)-(448,336); cursor; FadeBack(2). Loop at 30 fps:
click thumbnail → start; click (460,362)-(494,396) → next scene; click (146,362)-(180,396) → previous (wrapping 0..4),
sound 16 each; Space/Return/Enter → start. Then the fight starts with Fade(0).
