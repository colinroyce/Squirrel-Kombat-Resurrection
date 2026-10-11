// Mech (character 5): HandleMech and his specials — Boxing Glove (Invisible's), Power Blast,
// Bombs and Missile. Bombs and the missile end in NewExplosion (muskrat.js).

import { Rand, detectCollision, offsetRect } from '../mac.js';
import {
  GetSpriteAction2, GetSpriteDirection, GetSpriteInfo, GetSpriteInUse, GetSpritePathH, GetSpritePathV,
  GetSpritePicID, GetSpriteRect, KillSprite, KillSpriteByNumber, NewSpriteFromCICN, SetSpriteAction2,
  SetSpriteDirection, SetSpriteFrame, SetSpriteInfo, SetSpritePath,
} from '../sprites.js';
import { DoDamage } from '../hud.js';
import { T } from '../templates.js';
import { KeepSpriteOnScreen, OnScreen } from '../common.js';
import { GetOpp, HandlePlayer, HandlePlayer2, OnSurface } from './player.js';
import { HandleDeadPlayer } from './game.js';
import { HandleAI, isCPU } from './chars.js';
import { HandleInvBoxGlove } from './invisible.js';
import { NewExplosion } from './muskrat.js';

// Every special puts him in 0xd (firing pose for 16 frames) unless he is in the air.
export async function HandleMech(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    GetSpriteRect(opp);
    if (s.action2 === 0xd) {
      s.frame = s.dir === 0 ? 0x3c : 0x3d;
      s.info[5] += 1;
      if (s.info[5] > 0xf) s.action2 = 2;
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

// The four specials (CheckMoves1 and DoSpecialMove use the same steps).
export function MechSpecial(n, move) {
  const r = GetSpriteRect(n);
  if (GetSpriteAction2(n) === 5) return;
  if (GetSpriteAction2(n) !== 3) {
    SetSpriteAction2(n, 0xd);
    SetSpriteInfo(n, 5, 0);
  }
  const opp = GetSpriteInfo(n, 1);
  const dir = GetSpriteDirection(n);
  if (move === 0) NewMechBoxGlove(r, opp, n, dir);
  else if (move === 1) NewPowerBlast(r, opp, n, dir);
  else if (move === 2) NewMechBombs(r, opp, n, dir);
  else if (move === 3) NewMechMissile(r, opp, n, dir);
}

// ---- Boxing Glove ----------------------------------------------------------------------------

function NewMechBoxGlove(r, oppIndex, num, dir) {
  T.mechBoxGlove.info[1] = oppIndex;
  T.mechBoxGlove.info[2] = num;
  T.mechBoxGlove.dir = dir;
  NewSpriteFromCICN(T.mechBoxGlove, r, HandleInvBoxGlove);
}

// ---- Power Blast -------------------------------------------------------------------------------

// A beam that grows 32 px a frame (each piece adds the next on its second frame) until its end
// leaves the world, then the whole beam vanishes. It can hurt only once (info7, shared by the beam).
// Original quirk: the callers pass the facing direction where the beam's group id goes (info3),
// so two beams facing the same way count as one beam.
function NewPowerBlast(r, oppIndex, num, group) {
  T.powerBlast.info[1] = oppIndex;
  T.powerBlast.info[2] = num;
  T.powerBlast.info[3] = group;
  T.powerBlast.dir = GetSpriteDirection(num);
  T.powerBlast.info[7] = 1;
  const rect = { ...r };
  offsetRect(rect, GetSpriteDirection(num) === 0 ? 0x19 : -0x19, 0);
  NewSpriteFromCICN(T.powerBlast, rect, HandlePowerBlast);
}

function NewPowerBlast2(r, oppIndex, num, group, dir, armed) {
  T.powerBlast.info[1] = oppIndex;
  T.powerBlast.info[2] = num;
  T.powerBlast.info[3] = group;
  T.powerBlast.info[7] = armed;
  T.powerBlast.dir = dir;
  const rect = { ...r };
  offsetRect(rect, dir === 0 ? 0x20 : -0x20, 0);
  NewSpriteFromCICN(T.powerBlast, rect, HandlePowerBlast);
}

function forBeam(s, fn) {
  for (let i = 0; i < 200; i++) {
    if (GetSpriteInUse(i) && GetSpritePicID(i) === s.type && GetSpriteInfo(i, 3) === s.info[3]) fn(i);
  }
}

function powerBlastHit(s, opp, o) {
  if (!detectCollision(s.rect, o, 0, 0, 2, 2) || s.info[7] === 0) return;
  DoDamage(opp, 0x19, s.info[2]);
  forBeam(s, (i) => SetSpriteInfo(i, 7, 0));
  if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
  if (s.dir === 0) {
    SetSpritePath(opp, GetSpritePathH(opp) + 1, GetSpritePathV(opp) - 1);
    SetSpriteDirection(opp, 1);
    if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) SetSpriteFrame(opp, 0x17);
  } else {
    SetSpritePath(opp, GetSpritePathH(opp) - 1, GetSpritePathV(opp) - 1);
    SetSpriteDirection(opp, 0);
    if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) SetSpriteFrame(opp, 0x16);
  }
}

function HandlePowerBlast(s) {
  if (s.rect.right < 0x421 && s.rect.left > -0x21) {
    const opp = GetOpp(s.info[1], s.rect, s.info[2]);
    const o = GetSpriteRect(opp);
    if (s.action2 === 0) {
      powerBlastHit(s, opp, o);
      s.action2 = 1;
    } else if (s.action2 === 1) {
      NewPowerBlast2(s.rect, s.info[1], s.info[2], s.info[3], s.dir, s.info[7]);
      powerBlastHit(s, opp, o);
      s.action2 = 2;
    } else {
      powerBlastHit(s, opp, o);
    }
  } else {
    forBeam(s, KillSpriteByNumber);
  }
}

// ---- Bombs ----------------------------------------------------------------------------------------

// Five bouncing bombs thrown forward; each blows up (two explosions) after 60 frames.
// Original quirk: the original also works out a start spot 6 steps along each bomb's path,
// but then throws every bomb from Mech's own rect, so that work is unused (left out here).
function NewMechBombs(r, oppIndex, num, dir) {
  T.mechBomb.info[1] = oppIndex;
  T.mechBomb.info[2] = num;
  for (let i = 0; i < 5; i++) {
    if (dir === 0) T.mechBomb.vx = Rand(4) + 3;
    else T.mechBomb.vx = -(Rand(4) + 3);
    T.mechBomb.vy = Rand(T.mechBomb.f42) - Math.trunc(T.mechBomb.f42 / 2);
    NewSpriteFromCICN(T.mechBomb, r, HandleMechBomb);
  }
}

function HandleMechBomb(s) {
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 2) s.frame = 0;
  if (OnSurface(s.rect, s.num) || s.rect.bottom > 0x300 || s.rect.top < 0) s.vy = Math.trunc(s.vy * -0.75);
  if (s.rect.right > 0x400 || s.rect.left < 0) s.vx = -s.vx;
  s.info[7] -= 1;
  if (s.info[7] < 1) {
    KillSprite(s);
    NewExplosion(s.rect, s.info[1], s.info[2]);
    NewExplosion(s.rect, s.info[1], s.info[2]);
  }
}

// ---- Missile --------------------------------------------------------------------------------------

function NewMechMissile(r, oppIndex, num, dir) {
  const rect = { top: r.top + 8, left: r.left, bottom: r.bottom - 8, right: r.right };
  T.mechMissile.info[1] = oppIndex;
  T.mechMissile.info[2] = num;
  T.mechMissile.dir = dir;
  NewSpriteFromCICN(T.mechMissile, rect, HandleMechMissile);
}

function HandleMechMissile(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
  else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.dir === 0 && (s.frame < 0 || s.frame > 3)) s.frame = 0;
  if (s.dir === 1 && (s.frame < 4 || s.frame > 7)) s.frame = 4;
  if (!OnScreen(s, 1)) KillSprite(s);
  if (detectCollision(s.rect, o, 2, 2, 2, 2)) {
    s.rect.bottom += 8;
    s.rect.top -= 8;
    NewExplosion(s.rect, s.info[1], s.info[2]);
    s.rect.bottom -= 8;
    s.rect.top += 8;
    KillSprite(s);
  }
}
