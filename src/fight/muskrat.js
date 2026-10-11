// Military Muskrat (character 11): HandleMuskrat and his specials — Proximity Mine, Grenades,
// Air Strike (NewAirBombs) and the homing Tracker — plus NewExplosion, which they all end in
// (Mech's bombs use it too).

import { Rand, Rand1, detectCollision, insetRect, offsetRect } from '../mac.js';
import {
  GetNumSpritesType, GetSpriteAction2, GetSpritePathH, GetSpritePathV, GetSpritePicID, GetSpriteRect,
  KillSprite, NewSpriteFromCICN, SetSpriteAction2, SetSpriteDirection, SetSpriteFrame, SetSpriteInfo,
  SetSpritePath,
} from '../sprites.js';
import { MakeSparks } from '../sparks.js';
import { PlaySound } from '../sound.js';
import { DoDamage } from '../hud.js';
import { T } from '../templates.js';
import { KeepSpriteOnScreen, OnScreen } from '../common.js';
import { GetOpp, HandlePlayer, HandlePlayer2, OnSurface } from './player.js';
import { HandleDeadPlayer } from './game.js';
import { HandleAI, isCPU } from './chars.js';

export async function HandleMuskrat(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    const o = GetSpriteRect(opp);
    if (s.action2 === 0xf) { // call in the air strike (a one-frame state)
      s.action2 = 2;
      if (GetNumSpritesType(0x431) < 6) NewAirBombs(o, s.info[1], s.num);
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

// ---- explosions ---------------------------------------------------------------------------------

export function NewExplosion(r, oppIndex, num) {
  T.explosion.info[1] = oppIndex;
  T.explosion.info[2] = num;
  T.explosion.vx = Rand(T.explosion.f42 * 2) - T.explosion.f42;
  T.explosion.vy = Rand(T.explosion.f42) - T.explosion.f42 * 2;
  NewSpriteFromCICN(T.explosion, r, HandleExplosion);
  PlaySound(0x11);
}

// Drifts up and falls; plays its 11 frames once. Hurts the opponent once (info7).
function HandleExplosion(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame >= s.nframes) KillSprite(s);
  if (detectCollision(s.rect, o, 2, 2, 2, 2) && s.info[7] === 0) {
    DoDamage(opp, 0xf, s.info[2]);
    const v = GetSpritePathV(opp);
    const dx = Rand(0xf);
    SetSpritePath(opp, dx + GetSpritePathH(opp) - 7, v - 0xc);
    SetSpriteDirection(opp, 1);
    if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) {
      SetSpriteFrame(opp, 0x22);
      SetSpriteAction2(opp, 5);
    }
    SetSpriteInfo(opp, 2, 0);
    s.info[7] = 1;
  }
}

// ---- Proximity Mine -------------------------------------------------------------------------------

export function NewProxMine(r, oppIndex, num) {
  if (GetNumSpritesType(0x42c) >= 3) return;
  const rect = { ...r };
  insetRect(rect, 0xb, 0xc);
  T.proxMine.info[1] = oppIndex;
  T.proxMine.info[2] = num;
  NewSpriteFromCICN(T.proxMine, rect, HandleProxMine);
}

// Drops to the ground and waits; blows up when the opponent comes within 50 px.
function HandleProxMine(s) {
  insetRect(s.rect, -0x32, -0x32);
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  insetRect(s.rect, 0x32, 0x32);
  if (OnSurface(s.rect, s.num) || s.rect.bottom > 0x300) s.vy = 0;
  KeepSpriteOnScreen(s);
  insetRect(s.rect, -0x32, -0x32);
  if (detectCollision(s.rect, o, 0, 0, 0, 0)) {
    insetRect(s.rect, 0x32, 0x32);
    insetRect(s.rect, -0xb, -0xc);
    NewExplosion(s.rect, s.info[1], s.info[2]);
    KillSprite(s);
  } else {
    insetRect(s.rect, 0x32, 0x32);
  }
}

// ---- Grenades -----------------------------------------------------------------------------------------

// Four grenades lobbed forward. The limit is checked once, so up to 8 can be in the air.
export function NewGrenades(r, oppIndex, num, dir) {
  if (GetNumSpritesType(0x42d) >= 5) return;
  const rect = { ...r };
  insetRect(rect, 10, 10);
  rect.left -= 1;
  rect.top -= 1;
  T.grenade.info[1] = oppIndex;
  T.grenade.info[2] = num;
  for (let i = 0; i < 4; i++) {
    if (dir === 0) T.grenade.vx = Rand(4) + T.grenade.f42;
    else T.grenade.vx = -Rand(4) - T.grenade.f42;
    T.grenade.vy = -5 - Rand(7);
    NewSpriteFromCICN(T.grenade, rect, HandleGrenade);
  }
}

function HandleGrenade(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  // Bounce: vy × −0.75, truncated (fctiwz), as the Tundra's snowballs.
  if (OnSurface(s.rect, s.num) || s.rect.bottom > 0x300 || s.rect.top < 0) s.vy = Math.trunc(s.vy * -0.75);
  if (s.rect.right > 0x400 || s.rect.left < 0) KillSprite(s);
  KeepSpriteOnScreen(s);
  if (detectCollision(s.rect, o, 0, 0, 0, 0)) {
    insetRect(s.rect, -10, -10);
    s.rect.left += 1;
    s.rect.top += 1;
    NewExplosion(s.rect, s.info[1], s.info[2]);
    KillSprite(s);
  }
}

// ---- Air Strike ---------------------------------------------------------------------------------------

// Five bombs fall from the top of the world above the opponent: 48 px apart starting 96 px to
// their left, each one 8 px higher than the last.
function NewAirBombs(o, oppIndex, num) {
  const rect = { top: 0, left: o.left, bottom: 0x20, right: o.right };
  T.airBomb.info[1] = oppIndex;
  T.airBomb.info[2] = num;
  offsetRect(rect, -0x60, 0);
  for (let i = 0; i < 5; i++) {
    NewSpriteFromCICN(T.airBomb, rect, HandleAirBomb);
    offsetRect(rect, 0x30, -8);
  }
}

function HandleAirBomb(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  if (s.vy > 0x14) s.vy = 0x14;
  if (detectCollision(s.rect, o, 2, 2, 2, 2) && s.info[7] === 0) {
    NewExplosion(s.rect, s.info[1], s.info[2]);
    KillSprite(s);
  }
  if (s.rect.bottom > 0x300) KillSprite(s);
}

// ---- Tracker --------------------------------------------------------------------------------------------

export function NewTracker(r, oppIndex, num) {
  if (GetNumSpritesType(0x432) >= 2) return;
  const rect = { ...r };
  insetRect(rect, 3, 5);
  T.tracker.info[1] = oppIndex;
  T.tracker.info[2] = num;
  NewSpriteFromCICN(T.tracker, rect, HandleTracker);
}

// Homes on the opponent like the Forest's birds; fizzles in cyan sparks after 200 frames.
function HandleTracker(s) {
  s.info[4] -= 1;
  if (s.info[4] < 1) {
    for (const d of [3, 2, 0, 1]) {
      const x = s.rect.left + Math.trunc((s.rect.left - s.rect.right) / 2);
      const y = s.rect.top + Math.trunc((s.rect.top - s.rect.bottom) / 2);
      MakeSparks(x, y, d, 10, 0x14, 7, 0x111, 0, 2, 2);
    }
    KillSprite(s); // still finishes this frame, as in the original
  }
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  offsetRect(s.rect, s.vx, s.vy);
  s.dir = s.vx < 1 ? 1 : 0;
  s.frame = s.dir === 0 ? 0 : 1;
  const t = GetSpriteRect(opp);
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
  if (!OnScreen(s, 1)) KillSprite(s);
  if (detectCollision(s.rect, t, 2, 2, 2, 2)) {
    KillSprite(s);
    insetRect(s.rect, -3, -5);
    NewExplosion(s.rect, s.info[1], s.info[2]);
    insetRect(s.rect, 3, 5);
  }
}
