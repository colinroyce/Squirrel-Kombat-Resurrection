// Not in the original: the combo display (Colin's request). A small see-through strip under each
// human player's life bar (player 1 top left, player 2 top right) shows their last key presses as
// the special-move recorder sees them (forward / back / up arrows and P K U S), and flashes green
// with the move's name when a special move's keys are recognised. It only reads the recorder
// (RecordKey1 / RecordKey2 and CheckMoves in src/fight/game.js); it changes nothing in the fight.
// Options > CHEATS has a switch for it (on by default).

import { TickCount } from './mac.js';
import { bctx, drawString, fillRect, mapRGB16, stringWidth } from './gfx.js';
import { GetDrawLifeBars } from './hud.js';
import { GetSpriteDirection } from './sprites.js';
import { GetChosenChar, GetComboFeed, GetNumPlayers } from './state.js';
import { MOVES } from './screens/pauseguide.js';

const KEEP = 8; // presses shown
const FADE = 120; // ticks after the last press before the presses fade out
const FLASH = 90; // ticks the move name stays up

const feed = [0, 1].map(() => ({ keys: [], last: 0, name: '', flashAt: -1000 }));

// Slots 0 left, 1 jump, 2 right, 3 punch, 4 kick, 5 uppercut, 6 spin. Left and right are shown as
// back / forward for the way the fighter faces, since special moves flip when you turn round.
export function ComboKey(n, slot) {
  const f = feed[n];
  let sym;
  if (slot === 1) sym = 'up';
  else if (slot === 0 || slot === 2) sym = (slot === 2) === (GetSpriteDirection(n) === 0) ? 'fwd' : 'back';
  else sym = 'PKUS'[slot - 3];
  f.keys.push(sym);
  if (f.keys.length > KEEP) f.keys.shift();
  f.last = TickCount();
}

// A special move's keys were recognised. `pat` is the key-slot pattern CheckMoves matched; the name
// is the move on the "Special Moves" sheet whose keys contain it (either way round).
export function ComboHit(n, pat) {
  const s = pat.map((k) => '<^>pkus'[k]).join('');
  const m = s.replace(/[<>]/g, (c) => (c === '<' ? '>' : '<'));
  const move = (MOVES[GetChosenChar(n)] || []).find(([, c]) => (c + c).includes(s) || (c + c).includes(m));
  const f = feed[n];
  f.name = move ? move[0].toUpperCase() : 'SPECIAL MOVE';
  f.flashAt = TickCount();
}

export function ClearComboFeed() {
  for (const f of feed) { f.keys = []; f.flashAt = -1000; }
}

const W = 132;
const H = 16;

function arrow(x, y, dir, color) {
  // A 9 x 9 arrow: a triangle head and a 2-px stem.
  bctx.fillStyle = color;
  bctx.beginPath();
  if (dir === 'up') {
    bctx.moveTo(x + 4.5, y); bctx.lineTo(x + 9, y + 5); bctx.lineTo(x, y + 5);
    bctx.fill();
    bctx.fillRect(x + 3.5, y + 5, 2, 4);
  } else {
    const r = dir === 'fwd';
    bctx.moveTo(r ? x + 9 : x, y + 4.5); bctx.lineTo(r ? x + 4 : x + 5, y); bctx.lineTo(r ? x + 4 : x + 5, y + 9);
    bctx.fill();
    bctx.fillRect(r ? x : x + 5, y + 3.5, 4, 2);
  }
}

function drawOne(n, left) {
  const f = feed[n];
  const now = TickCount();
  const flashing = now - f.flashAt < FLASH;
  const fresh = now - f.last < FADE;
  if (!flashing && !fresh) return;
  const top = 38;
  bctx.save();
  bctx.globalAlpha = 0.55;
  fillRect(bctx, { left, top, right: left + W, bottom: top + H }, '#000');
  bctx.restore();
  const white = mapRGB16(0xffff, 0xffff, 0xffff);
  if (fresh) {
    let x = left + 4;
    const shown = f.keys.slice(-KEEP);
    for (const k of shown) {
      if (k === 'fwd' || k === 'back' || k === 'up') arrow(x, top + 3, k, white);
      else drawString(bctx, x + 1, top + 12, k, 9, white, true);
      x += 15;
    }
  }
  if (flashing) {
    const green = mapRGB16(0, 0xd000, 0);
    const r = { left, top: top + H + 1, right: left + W, bottom: top + 2 * H + 1 };
    bctx.save();
    bctx.globalAlpha = 0.8;
    fillRect(bctx, r, green);
    bctx.restore();
    const w = stringWidth(f.name, 9, true);
    drawString(bctx, left + ((W - w) >> 1), r.top + 12, f.name, 9, white, true);
  }
}

// Drawn with the HUD, in fights only, for human players.
export function DrawComboFeed() {
  if (!GetComboFeed() || !GetDrawLifeBars()) return;
  drawOne(0, 8);
  if (GetNumPlayers() === 2) drawOne(1, 640 - 8 - W);
}
