// The Field's butterflies (NewButterfly / HandleButterfly). The Field has no platforms and no
// per-frame spawns; NewSceneSprites (forest.js) releases 20 butterflies at random spots.

import { Rand, offsetRect, setRect } from '../mac.js';
import { NewSpriteFromCICN } from '../sprites.js';
import { T } from '../templates.js';

export function NewButterfly(x, y) {
  const r = setRect({}, x, y, x + 0x10, y + 0x10);
  // The template's speeds are set before each copy (and keep the last values, as in the original).
  T.butterfly.vx = Rand(9) - 4;
  T.butterfly.vy = Rand(9) - 4;
  NewSpriteFromCICN(T.butterfly, r, HandleButterfly);
}

function HandleButterfly(s) {
  offsetRect(s.rect, s.vx, s.vy);
  s.dir = s.vx < 0 ? 1 : 0;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.dir === 0 && (s.frame < 0 || s.frame > 3)) s.frame = 0;
  if (s.dir === 1 && (s.frame < 4 || s.frame > 7)) s.frame = 4;
  // Original quirk: the edge test only flips the speed and never moves the butterfly back inside,
  // so one can get stuck jittering at (or just past) the edge of the world.
  if (s.rect.right > 0x3ff || s.rect.left < 1) s.vx = -s.vx;
  if (s.rect.bottom > 0x2ff || s.rect.top < 1) s.vy = -s.vy;
  if (Rand(0x14) > 0x11) s.vx = Rand(3) + s.vx - 1;
  if (Rand(0x14) > 0x11) s.vy = Rand(3) + s.vy - 1;
  if (s.f42 < s.vx) s.vx = s.f42;
  if (s.f42 < s.vy) s.vy = s.f42;
  if (s.vx < -s.f42) s.vx = -s.f42;
  if (s.vy < -s.f42) s.vy = -s.f42;
}
