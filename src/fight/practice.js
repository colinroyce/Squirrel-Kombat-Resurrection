// Practice mode (playMode 1): the training dummy (HandleDummy, cicn 500) and the tutorial
// messages (StartTutorial / HandleTutorial) shown in the box under the timer. Nobody can be hurt
// (DoDamage deals no damage in practice) and there is no round time.

import { MakeSparks } from '../sparks.js';
import { TickCount, offsetRect, setRect } from '../mac.js';
import { hud, FullLife } from '../hud.js';
import { GetNumPlayers } from '../state.js';
import { KeepSpriteOnScreen } from '../common.js';
import { keyName } from '../screens/keys.js';
import { OnSurface } from './player.js';

// The dummy always has full life. When knocked it flies and tumbles (frames 0–3), bouncing off
// the walls (×−0.75) and the ground (×−0.5), with yellow sparks while it moves; frozen (action1
// 0x12) it keeps its frozen frame until info7 runs out.
export function HandleDummy(s) {
  FullLife(s.num);
  s.frame = s.info[5];
  if (s.action1 === 0x12) {
    s.frame = s.info[4];
    offsetRect(s.rect, s.vx, s.vy);
    s.vy += 1;
    if (s.rect.right > 0x400 || s.rect.left < 0) s.vx = Math.trunc(s.vx * -0.75);
    KeepSpriteOnScreen(s);
    if (OnSurface(s.rect, s.num)) {
      s.vy = Math.trunc(s.vy * -0.5);
      s.info[2] = 1;
      if (Math.abs(s.vy) < 2) { s.vx = 0; s.vy = 0; }
    }
    s.info[7] -= 1;
    if (s.info[7] < 1) {
      s.action1 = 2;
      s.action2 = 3;
    }
  } else {
    s.info[2] = 1;
    offsetRect(s.rect, s.vx, s.vy);
    s.vy += 1;
    if (s.rect.right > 0x400 || s.rect.left < 0) s.vx = Math.trunc(s.vx * -0.75);
    KeepSpriteOnScreen(s);
    if (!OnSurface(s.rect, s.num)) {
      s.f56 += 1;
      if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
      if (s.frame < 0 || s.frame > 3) s.frame = 0;
    } else {
      s.vy = Math.trunc(s.vy * -0.5);
      if (Math.abs(s.vy) < 2) {
        s.info[2] = 0;
        s.vx = 0;
        s.vy = 0;
        s.frame = 0;
      }
    }
    if (s.info[2] !== 0) {
      if (s.dir === 0) MakeSparks(s.rect.left, s.rect.top + 0x10, s.dir, 2, 6, 3, 0x45, 1, 2, 2);
      else MakeSparks(s.rect.left + 0x20, s.rect.top + 0x10, s.dir, 2, 6, 3, 0x45, 1, 2, 2);
    }
  }
  s.info[5] = s.frame;
}

// ---- tutorial ----------------------------------------------------------------------------------

const tut = { start: 0 };

export function StartTutorial() {
  setRect(hud.tutorialRect, 0x73, 0x85, 0x20d, 0x95);
  hud.tutorialText = 'Welcome to the Squirrel Kombat Tutorial!';
  tut.start = TickCount();
}

// "'K'" for one player, "'K' or 'K2'" for two (player 2's slot is 7 further on).
const k = (slot) => (GetNumPlayers() === 1 ? keyName(slot) : `${keyName(slot)}' or '${keyName(slot + 7)}`);
const TRY = "'. Try it on the dummy.";

// A new message every 480 ticks (8 s); after the last the script starts again.
const STEPS = [
  [0x3c1, () => (GetNumPlayers() === 1
    ? "The bar to the left is your life, the bar to the right is your opponent's."
    : "The bars to the left are your lives, the bars to the right are your opponents'.")],
  [0x5a1, () => 'No one can get hurt in Practice mode.'],
  [0x781, () => 'The number in the middle of the screen is the round number.'],
  [0x961, () => 'The next number would be the time left. There is no round time in Practice mode.'],
  [0xb41, () => 'The screen below the time is the radar.'],
  [0xd21, () => (GetNumPlayers() === 1
    ? 'On the radar you are red and your opponent is yellow.'
    : 'You are red and yellow and your opponents are green and blue.')],
  [0xf01, () => (GetNumPlayers() === 1
    ? 'Any wins will appear as an acorn below your life bar.'
    : 'Any wins will appear as an acorn below both of your life bars.')],
  [0x10e1, () => 'The number below each life bar is the points that that player has earned.'],
  [0x12c1, () => (GetNumPlayers() === 1
    ? `To walk left push '${keyName(0)}' and to walk right push '${keyName(2)}'.`
    : `To walk right push '${keyName(0)}' or '${keyName(7)}' and to walk left push '${keyName(2)}' or '${keyName(9)}'.`)],
  [0x14a1, () => `To jump push '${k(1)}'. To move while in the air hold the walk keys.`],
  [0x1681, () => `To punch push or hold '${k(3)}${TRY}`],
  [0x1861, () => `To kick push or hold '${k(4)}${TRY}`],
  [0x1a41, () => `To uppercut push or hold '${k(5)}${TRY}`],
  [0x1c21, () => `To spin kick push or hold '${k(6)}${TRY}`],
  [0x1e01, () => `To execute a flying side kick push '${k(1)}' to jump and then push '${k(4)}'.`],
  [0x1fe1, () => `To execute a jump spin kick push '${k(1)}' to jump and then push '${k(6)}'.`],
  [0x21c1, () => `To execute a power slam push '${k(5)}' to uppercut and then push '${k(1)}'.`],
  [0x23a1, () => `To execute a throw push '${k(5)}' to uppercut and then push '${k(3)}'.`],
  [0x2581, () => "To learn your character's special moves, read the 'Special Moves' file."],
  [0x26e9, () => 'Have fun!'],
];

// Original quirk: the two-player walk line says "walk right" for the left keys and "walk left"
// for the right keys.
export function HandleTutorial() {
  const e = TickCount() - tut.start;
  if (e >= 0x26e9) { tut.start = TickCount(); return; }
  if (e <= 0x1e0) return; // the welcome line stays for the first 8 seconds
  for (const [end, text] of STEPS) {
    if (e < end) { hud.tutorialText = text(); return; }
  }
}
