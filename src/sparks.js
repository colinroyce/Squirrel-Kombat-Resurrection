// Sparks (blood, teleport and fireball bursts): 250 slots of tiny coloured rectangles.

import { Rand } from './mac.js';
import { bctx, fillRect, foreColor, worldRect } from './gfx.js';
import { PointVisible, PointVisible2, view } from './camera.js';

const sparks = Array.from({ length: 250 }, () => ({
  y: 0, x: 0, color: 0, gravity: 0, vy: 0, vx: 0, h: 0, w: 0, active: 0, life: 0,
}));

export function KillSparks() {
  for (const s of sparks) s.active = 0;
}

function NewSpark(s, x, y, dir, life, speed, color, gravity, w, h) {
  s.x = Rand(5) + x - 2;
  s.y = Rand(5) + y - 2;
  s.color = color;
  s.gravity = gravity;
  s.w = w;
  s.h = h;
  s.active = 1;
  s.life = life;
  if (dir === 0) {
    s.vx = speed + Rand(5) - 2;
    s.vy = Rand(7) - 3;
  } else if (dir === 1) {
    s.vx = -(speed + Rand(5) - 2);
    s.vy = Rand(7) - 3;
  } else if (dir === 2) {
    s.vy = speed + Rand(5) - 2;
    s.vx = Rand(7) - 3;
  } else if (dir === 3) {
    s.vy = -(speed + Rand(5) - 2);
    s.vx = Rand(7) - 3;
  }
}

// MakeSparks(x, y, dir, count, life, speed, colour, gravity, w, h)
export function MakeSparks(x, y, dir, count, life, speed, color, gravity, w, h) {
  if (!(PointVisible(x, y) || PointVisible2(x, y))) return;
  if (x < 0 || y < 0 || x > worldRect.right || y > worldRect.bottom) return;
  let made = 0;
  for (let i = 0; i < 250; i++) {
    if (!sparks[i].active) {
      NewSpark(sparks[i], x, y, dir, life, speed, color, gravity, w, h);
      if (++made >= count) break;
    }
  }
}

export function HandleSparks() {
  for (const s of sparks) {
    if (!s.active) continue;
    s.x += s.vx;
    s.y += s.vy;
    if (s.gravity) s.vy += 1;
    s.life -= 1;
    const ok = s.life > 0 && (PointVisible(s.x, s.y) || PointVisible2(s.x, s.y)) && s.x >= 0 && s.y >= 0 &&
      s.x <= worldRect.right && s.y <= worldRect.bottom;
    if (!ok) s.active = 0;
  }
}

export function DrawSparks1() {
  for (const s of sparks) {
    if (!s.active) continue;
    const h = s.x - view.left, v = s.y - view.top;
    fillRect(bctx, { left: h, top: v, right: h + s.w, bottom: v + s.h }, foreColor(s.color));
  }
}
