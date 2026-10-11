// The City's flocks of birds (NewFlock): a leader (HandleBird3) flies in from the left and 15
// followers (HandleBird2) home on it. They never touch the fighters. CityRun is MyRun's part
// for scene 4.

import { Rand, Rand1, offsetRect, setRect } from '../mac.js';
import { GetNumSpritesType, GetSpriteRect, KillSprite, NewSpriteFromCICN } from '../sprites.js';
import { T } from '../templates.js';

// MyRun, scene 4: a new flock whenever fewer than 10 birds (type 1087) are left.
export function CityRun() {
  if (GetNumSpritesType(0x43f) < 10) NewFlock();
}

// The flock reuses the Forest bird's template and leaves its vx = 0, vy = 0 and info2 = the
// leader's slot on it, as in the original.
function NewFlock() {
  const y = Rand(0x189) + 0x12c;
  const r = setRect({}, -0xc, y, 0, y + 0xe);
  T.bird.vy = 0;
  T.bird.vx = T.bird.f42 + 1;
  const leader = NewSpriteFromCICN(T.bird, r, HandleBird3);
  T.bird.vx = 0;
  T.bird.info[2] = leader;
  for (let i = 0; i < 0xf; i++) {
    const dv = Rand(0x15); // the original rolls the vertical offset first
    const dh = Rand(0x15);
    offsetRect(r, dh - 10, dv - 10); // each follower starts from the previous one's spot
    NewSpriteFromCICN(T.bird, r, HandleBird2);
  }
}

function animate(s) {
  offsetRect(s.rect, s.vx, s.vy);
  s.dir = s.vx < 1 ? 1 : 0;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.dir === 0 && (s.frame < 0 || s.frame > 2)) s.frame = 0;
  if (s.dir === 1 && (s.frame < 3 || s.frame > 5)) s.frame = 3;
}

function clampAndLeave(s) {
  if (s.f42 < s.vx) s.vx = s.f42;
  if (s.vx < -s.f42) s.vx = -s.f42;
  if (s.f42 + 1 < s.vy) s.vy = s.f42;
  if (s.vy < 1 - s.f42) s.vy = -s.f42;
  if (s.rect.left > 0x400) KillSprite(s);
}

// Follower: homes on the leader's slot (info2).
// Original quirk: once the leader has flown off and its slot is reused (or left empty), the
// followers keep homing on whatever rect is in that slot.
function HandleBird2(s) {
  const target = s.info[2];
  animate(s);
  const t = GetSpriteRect(target);
  if (Rand(2) !== 0) {
    if (s.rect.right < t.right) s.vx += Rand1(2);
    if (t.right < s.rect.right) s.vx -= Rand1(2);
  }
  if (Rand(2) !== 0) {
    if (s.rect.bottom < t.bottom) s.vy += Rand1(2);
    if (t.top < s.rect.top) s.vy -= Rand1(2);
  }
  clampAndLeave(s);
}

// Leader: flies right, drifting up and down at random.
// Original quirk: nothing keeps it inside the world vertically, so a flock can wander above or
// below the screen until it leaves on the right.
function HandleBird3(s) {
  animate(s);
  if (Rand(2) !== 0) {
    if (Rand(2) === 0) s.vy -= Rand1(2);
    else s.vy += Rand1(2);
  }
  clampAndLeave(s);
}
