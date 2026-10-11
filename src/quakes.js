// Screen shakes (DoQuake / HandleQuakes / KillQuakes): two sets of 20 quakes, one per view.
// Each active quake nudges its view by (±h, ±v) every frame, in a random one of four ways, for
// `time` + 1 frames. Run calls HandleQuakes after HandleSprites; Fade calls KillQuakes.

import { Rand1 } from './mac.js';
import { OffCamera, OffCamera2 } from './camera.js';
import { setKillQuakes } from './fade.js';

const sets = [1, 2].map(() => ({ on: 0, q: Array.from({ length: 20 }, () => ({ time: 0, h: 0, v: 0, active: 0 })) }));

// Original quirk: the loop doesn't stop at the first free slot, so the quake is copied into
// every free slot of the set (up to 20 at once, each shaking separately).
export function DoQuake(n, time, h, v) {
  const set = sets[n === 1 ? 0 : 1];
  set.on = 1;
  for (const q of set.q) {
    if (q.active === 0) {
      q.active = 1;
      q.time = time;
      q.h = h;
      q.v = v;
    }
  }
}

function shake(set, off) {
  let none = true;
  for (const q of set.q) {
    if (q.active !== 1) continue;
    none = false;
    const r = Rand1(4);
    if (r === 1) off(q.h, q.v);
    else if (r === 2) off(-q.h, -q.v);
    else if (r === 3) off(q.h, -q.v);
    else if (r === 4) off(-q.h, q.v);
    q.time -= 1;
    if (q.time < 0) q.active = 0;
  }
  if (none) set.on = 0;
}

export function HandleQuakes() {
  if (sets[0].on !== 0) shake(sets[0], OffCamera);
  if (sets[1].on !== 0) shake(sets[1], OffCamera2);
}

export function KillQuakes() {
  for (const set of sets) for (const q of set.q) q.active = 0;
}

setKillQuakes(KillQuakes);
