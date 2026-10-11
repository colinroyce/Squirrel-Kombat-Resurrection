// Scenes: InitScene (background + platforms) and NewSceneSprites for all five scenes, plus the
// Forest's creatures. The other scenes' creatures are in field.js, tundra.js and city.js.

import { Rand, Rand1, detectCollision, offsetRect, setRect } from '../mac.js';
import { fillBackWithPict } from '../gfx.js';
import {
  GetNumSpritesType, GetSpriteAction2, GetSpritePathH, GetSpritePathV, GetSpritePicID, GetSpriteRect,
  KillSprite, NewSpriteFromCICN, SetSpriteAction2, SetSpriteDirection, SetSpriteFrame, SetSpriteInfo,
  SetSpritePath,
} from '../sprites.js';
import { MakeSparks } from '../sparks.js';
import { DoDamage } from '../hud.js';
import { GetNumPlayers, GetPlayMode, GetScene } from '../state.js';
import { T } from '../templates.js';
import { DoNothing, KeepSpriteOnScreen } from '../common.js';
import { NewButterfly } from './field.js';
import { NewSnow } from './tundra.js';

const versus = () => GetNumPlayers() === 1 || (GetNumPlayers() === 2 && GetPlayMode() === 0);

// Platform list (25 rects); `count` is one more than the number set, as in the original.
export const plats = { rects: Array.from({ length: 25 }, () => ({ top: 0, left: 0, bottom: 0, right: 0 })), n: 0, count: 0 };

function InitPlats() {
  plats.n = 0;
  plats.count = 0;
  for (const r of plats.rects) setRect(r, 0, 0, 0, 0);
}

function SetPlatRect(left, top, right, bottom) {
  setRect(plats.rects[plats.n], left, top, right, bottom);
  plats.count = plats.n + 2;
  plats.n += 1;
}

export function InitScene() {
  if (GetScene() === 0) {
    fillBackWithPict(8000, 1024, 768);
    InitPlats();
    SetPlatRect(0, 217, 413, 254);
    SetPlatRect(624, 225, 1000, 247);
    SetPlatRect(624, 95, 855, 129);
    SetPlatRect(629, 319, 737, 332);
  } else if (GetScene() === 1) {
    InitPlats();
    fillBackWithPict(12000, 1024, 768);
  } else if (GetScene() === 2) {
    InitPlats();
    fillBackWithPict(13000, 1024, 768);
    SetPlatRect(42, 652, 132, 673);
    SetPlatRect(106, 567, 203, 592);
    SetPlatRect(0, 484, 273, 507);
    SetPlatRect(226, 423, 345, 441);
    SetPlatRect(344, 340, 608, 363);
    SetPlatRect(556, 414, 657, 431);
    SetPlatRect(671, 458, 818, 478);
    SetPlatRect(814, 532, 868, 553);
    SetPlatRect(893, 686, 994, 703);
    SetPlatRect(805, 603, 1024, 634);
  } else if (GetScene() === 3) {
    InitPlats();
    SetPlatRect(156, 538, 456, 758);
    SetPlatRect(576, 538, 876, 758);
    SetPlatRect(973, 608, 1273, 758);
    SetPlatRect(0, 608, 52, 758);
    fillBackWithPict(14000, 1024, 768);
  } else if (GetScene() === 4) {
    InitPlats();
    SetPlatRect(23, 656, 106, 671);
    SetPlatRect(766, 727, 1003, 741);
    SetPlatRect(769, 665, 1000, 685);
    fillBackWithPict(15000, 1024, 768);
  }
  NewSceneSprites();
}

export function NewSceneSprites() {
  if (GetScene() === 0) {
    NewSpriteFromCICN(T.log, setRect({}, 480, 240, 544, 258), HandleElevator);
    NewEye(504, 292);
    NewEye(527, 343);
    NewEye(927, 498);
    NewEye(34, 571);
    for (let i = 0; i < 6; i++) NewLeaf();
    NewNest(70, 218);
    NewNest(760, 226);
    NewNest(844, 88);
  } else if (GetScene() === 1) {
    for (let i = 0; i < 0x14; i++) {
      const y = Rand(0x300); // the original rolls y before x
      const x = Rand(0x400);
      NewButterfly(x - 0x10, y - 0x10);
    }
  } else if (GetScene() === 2) {
    for (let i = 0; i < 0x14; i++) NewSnow();
  } else if (GetScene() === 3) {
    // Great Wall: 10 grey blocks along the bottom, 102 px apart; scenery only (DoNothing).
    const r = setRect({}, 0x24, 0x2e8, 0x44, 0x300);
    for (let i = 0; i < 10; i++) {
      NewSpriteFromCICN(T.wallThing, r, DoNothing);
      offsetRect(r, 0x66, 0);
    }
  }
}

// MyRun's ambient spawns for the Forest.
export function ForestRun() {
  const r = Rand(10000);
  if ((r > 9900 || (GetNumSpritesType(0x43a) < 20 && Rand(10000) > 9000)) && GetNumSpritesType(0x43a) < 20) NewLeaf();
  if (Rand(10000) > 9950) NewDeathAcorn();
}

// ---- the log "elevator" -----------------------------------------------------------------------

function HandleElevator(s) {
  if (s.action1 === 0) {
    offsetRect(s.rect, 0, s.f42);
    if (s.rect.top > 0x2c0) s.action1 = 1;
  } else {
    offsetRect(s.rect, 0, -s.f42);
    if (s.rect.top < 200) s.action1 = 0;
  }
}

// ---- eyes in the tree hollows --------------------------------------------------------------

function NewEye(x, y) {
  NewSpriteFromCICN(T.eye, setRect({}, x, y, x + T.eye.frameW, y + T.eye.frameH), HandleEye);
}

function HandleEye(s) {
  if (s.action1 === 0) {
    if (Rand(640) > 635) s.action1 = 1;
  } else if (s.action1 === 1) {
    s.f56 += 1;
    if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
    if (s.frame === s.nframes - 1) s.action1 = 2;
  } else if (s.action1 === 2) {
    if (Rand(10) > 7) s.action1 = 3;
  } else if (s.action1 === 3) {
    s.f56 += 1;
    if (s.f58 < s.f56) { s.frame -= 1; s.f56 = 0; }
    if (s.frame === 0) s.action1 = 0;
  }
}

// ---- falling leaves --------------------------------------------------------------------------

function NewLeaf() {
  const x = Rand(1008);
  T.leaf.vy = Rand(3) + 2;
  NewSpriteFromCICN(T.leaf, setRect({}, x, -16, x + T.leaf.frameW, T.leaf.frameH - 16), HandleLeaf);
}

function HandleLeaf(s) {
  offsetRect(s.rect, s.vx, s.vy);
  if (Rand(40) > 37) s.vx = Rand(3) + s.vx - 1;
  if (s.vx > 2) s.vx = 2;
  if (s.vx < -2) s.vx = -2;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  if (s.rect.top > 0x300) KillSprite(s);
}

// ---- death acorns ------------------------------------------------------------------------------

function NewDeathAcorn() {
  const x = Rand(1004);
  const r = setRect({}, x, -29, x + T.deathAcorn.frameW, T.deathAcorn.frameH - 29);
  T.deathAcorn.vy = T.deathAcorn.vy + Rand(3) - 1; // accumulates on the template, as in the original
  NewSpriteFromCICN(T.deathAcorn, r, HandleDeathAcorn);
}

function acornHit(s, p) {
  if (!detectCollision(GetSpriteRect(p), s.rect, 2, 2, 2, 2)) return;
  DoDamage(p, 0x19, -1);
  KillSprite(s);
  const v = GetSpritePathV(p);
  const dx = Rand(7);
  SetSpritePath(p, GetSpritePathH(p) - dx - 3, v - 9);
  if (GetSpriteAction2(p) !== 0x11 && GetSpritePicID(p) !== 500) {
    SetSpriteFrame(p, 0x22);
    SetSpriteAction2(p, 5);
  }
  SetSpriteInfo(p, 2, 0);
}

function HandleDeathAcorn(s) {
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  if (s.vy > 14) s.vy = 14;
  if (s.rect.top > 0x300) KillSprite(s);
  const players = versus() ? [0, 1] : [0, 1, 2, 3];
  for (const p of players) acornHit(s, p);
}

// ---- nests and the birds they release ------------------------------------------------------------

function NewNest(x, y) {
  NewSpriteFromCICN(T.nest, setRect({}, x, y - T.nest.frameH, x + T.nest.frameW, y), HandleNest);
}

function HandleNest(s) {
  let touched = false;
  const players = versus() ? [0, 1] : [0, 1, 2, 3];
  for (const p of players) {
    if (detectCollision(GetSpriteRect(p), s.rect, 2, 2, 2, 2)) {
      if (s.info[2] !== p) NewBird(p);
      s.info[2] = p;
      touched = true;
    }
  }
  if (!touched) s.info[2] = -1;
}

function NewBird(target) {
  T.bird.info[2] = target;
  NewSpriteFromCICN(T.bird, setRect({}, 1012, -100, 1036, -86), HandleBird);
}

function HandleBird(s) {
  s.info[4] -= 1;
  if (s.info[4] < 1) {
    const x = s.rect.left + Math.trunc((s.rect.left - s.rect.right) / 2);
    const y = s.rect.top + Math.trunc((s.rect.top - s.rect.bottom) / 2);
    for (const d of [3, 2, 0, 1]) MakeSparks(x, y, d, 10, 20, 7, 0x199, 0, 2, 2);
    KillSprite(s);
  }
  const target = s.info[2];
  offsetRect(s.rect, s.vx, s.vy);
  s.dir = s.vx < 1 ? 1 : 0;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.dir === 0 && (s.frame < 0 || s.frame > 2)) s.frame = 0;
  if (s.dir === 1 && (s.frame < 3 || s.frame > 5)) s.frame = 3;
  const t = GetSpriteRect(target);
  if (Rand(2) !== 0) {
    if (s.rect.right < t.right) s.vx += Rand1(2);
    if (t.right < s.rect.right) s.vx -= Rand1(2);
  }
  if (Rand(2) !== 0) {
    if (s.rect.bottom < t.bottom) s.vy += Rand1(2);
    if (t.top < s.rect.top) s.vy -= Rand1(2);
  }
  if (s.f42 < s.vx) s.vx = s.f42;
  if (s.vx < -s.f42) s.vx = -s.f42;
  if (s.f42 + 1 < s.vy) s.vy = s.f42;
  if (s.vy < 1 - s.f42) s.vy = -s.f42;
  KeepSpriteOnScreen(s);
  if (detectCollision(s.rect, t, 5, 5, 2, 2)) {
    KillSprite(s);
    DoDamage(target, 0x12, -1);
    const v = GetSpritePathV(target);
    const dx = Rand(7);
    SetSpritePath(target, GetSpritePathH(target) - dx - 3, v - 3);
    SetSpriteDirection(target, 1);
    if (GetSpriteAction2(target) !== 0x11 && GetSpritePicID(target) !== 500) {
      SetSpriteFrame(target, 0x22);
      SetSpriteAction2(target, 5);
    }
    SetSpriteInfo(target, 2, 0);
  }
}
