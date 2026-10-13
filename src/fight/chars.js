// Ed and Speedy (HandleEd / HandleSpeedy), their special moves and projectiles, the CPU AI and
// DoSpecialMove for every fighter. Later fighters live in their own files (ice.js, ...).

import { Rand, detectCollision, insetRect, offsetRect } from '../mac.js';
import {
  GetNumSpritesType, GetNumSpritesTypeInfo3, GetSpriteAction2, GetSpriteDirection,
  GetSpriteInfo, GetSpriteInUse, GetSpritePathH, GetSpritePathV, GetSpritePicID, GetSpriteRect,
  KillSprite, KillSpriteByNumber, MoveSprite, NewSpriteFromCICN, SetSpriteAction2,
  SetSpriteDirection, SetSpriteFrame, SetSpriteInfo, SetSpritePath,
} from '../sprites.js';
import { MakeSparks } from '../sparks.js';
import { DoDamage, GetLife } from '../hud.js';
import { GetNumPlayers, GetPlayMode } from '../state.js';
import { T } from '../templates.js';
import { KeepSpriteOnScreen, OnScreen } from '../common.js';
import { GetOpp, HandlePlayer, HandlePlayer2, OnSurface } from './player.js';
import { ClearPattern1, HandleDeadPlayer, percents } from './game.js';
import { NewIceBlast, NewIceBlast2, NewIceColumn, NewIceFist } from './ice.js';
import { NewGrenades, NewProxMine, NewTracker } from './muskrat.js';
import { NewInvBoxGlove, NewInvFireBall, NewInvIceBall } from './invisible.js';
import { MechSpecial } from './mech.js';
import { NinjaSpecial } from './ninja.js';
import { KathySpecial } from './kathy.js';
import { GeorgeSpecial } from './george.js';
import { PhilSpecial } from './philbert.js';
import { SuperSpecial } from './super.js';
import { NewBats, NewBodyParts, NewBubble, NewDarkBeam } from './corpse.js';

// ---- shared ----------------------------------------------------------------------------------

export function isCPU(s) {
  if (GetNumSpritesType(0x97) >= 1 || s.type === 0x96) return false;
  return (GetNumPlayers() === 1 && s.num === 1) ||
    (GetNumPlayers() === 2 && GetPlayMode() !== 0 && (s.num === 2 || s.num === 3));
}

function settle(s) {
  s.action2 = s.rect.bottom < 0x300 ? 3 : 2;
}

// Standard projectile hit: opponent reels (unless dead), knocked (h, v), facing away.
function projectileHit(opp, dir, h, v, frame0, frame1, clearInfo2) {
  if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
  SetSpritePath(opp, GetSpritePathH(opp) + h, GetSpritePathV(opp) + v);
  SetSpriteDirection(opp, dir === 0 ? 1 : 0);
  if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) SetSpriteFrame(opp, dir === 0 ? frame0 : frame1);
  if (clearInfo2) SetSpriteInfo(opp, 2, 0);
}

function teleportSparks(s) {
  for (const d of [3, 2, 1, 0]) MakeSparks(s.rect.left + 16, s.rect.top + 16, d, 0x14, 0xf, 3, 0x111, 0, 2, 2);
}

// ---- Ed --------------------------------------------------------------------------------------

export async function HandleEd(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    const o = GetSpriteRect(opp);
    if (s.action2 === 0xd) { // teleport behind the opponent
      s.frame = s.dir === 0 ? 0x40 : 0x41;
      s.info[7] += 1;
      if (s.info[7] > 7) {
        teleportSparks(s);
        s.rect = { top: o.top, left: o.left, bottom: o.top + 32, right: o.left + 32 };
        s.rect.left = GetSpriteDirection(opp) === 0 ? o.left - 24 : o.right - 8;
        s.dir = GetSpriteDirection(opp);
        s.frame = s.dir === 0 ? 1 : 6;
        s.rect.right = s.rect.left + 32;
        teleportSparks(s);
        s.action2 = 2;
        if (!OnSurface(s.rect, s.num)) s.action2 = 3;
      }
    } else if (s.action2 === 0xe) { // machine-gun nuts
      s.info[5] += 1;
      if (s.info[5] < 10) {
        s.frame = s.dir === 0 ? 0x3c : 0x3d;
      } else {
        s.frame = s.dir === 0 ? 0x3e : 0x3f;
        NewNut(s.rect, s.dir, s.info[1], s.num);
      }
      if (s.info[5] > 0x14) settle(s);
    } else if (s.action2 === 0xf) { // atomic scatter
      s.frame = s.dir === 0 ? 0x40 : 0x41;
      if (GetNumSpritesTypeInfo3(0xc4, s.num) === 0 && GetNumSpritesTypeInfo3(0xc5, s.num) === 0) settle(s);
    } else if (s.action2 === 0x10) { // tri ball
      s.frame = s.dir === 0 ? 0x40 : 0x41;
      if (GetNumSpritesType(0xc6) === 0) settle(s);
    }
    HandlePlayer2(s);
  }
  if (s.action2 !== 0xd) KeepSpriteOnScreen(s);
}

function NewNut(r, dir, oppIndex, num) {
  const rect = { ...r };
  insetRect(rect, 12, 12);
  offsetRect(rect, dir === 0 ? 18 : -18, 0);
  T.nut.dir = dir;
  T.nut.info[1] = oppIndex;
  T.nut.info[2] = num;
  NewSpriteFromCICN(T.nut, rect, HandleNut);
}

function HandleNut(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
  else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
  s.frame = s.dir === 0 ? 0 : 1;
  if (!OnScreen(s, 1)) KillSprite(s);
  if (detectCollision(s.rect, o, 0, 0, 2, 2)) {
    DoDamage(opp, 3, s.info[2]);
    projectileHit(opp, s.dir, s.dir === 0 ? 1 : -1, -1, 0x17, 0x16, false);
    KillSprite(s);
  }
}

export function NewPurpleBeam(r, oppIndex, num, group) {
  T.purpleBeam.info[1] = oppIndex;
  T.purpleBeam.info[2] = num;
  T.purpleBeam.info[3] = group;
  NewSpriteFromCICN(T.purpleBeam, { top: 0, left: r.left, bottom: 32, right: r.right }, HandlePurpleBeam);
}

function NewPurpleBeam2(r, oppIndex, num, group) {
  T.purpleBeam.info[1] = oppIndex;
  T.purpleBeam.info[2] = num;
  T.purpleBeam.info[3] = group;
  const rect = { ...r };
  offsetRect(rect, 0, 32);
  NewSpriteFromCICN(T.purpleBeam, rect, HandlePurpleBeam);
}

function killBeam(s) {
  for (let i = 0; i < 200; i++) {
    if (GetSpriteInUse(i) && GetSpritePicID(i) === s.type && GetSpriteInfo(i, 3) === s.info[3]) KillSpriteByNumber(i);
  }
}

// A column of beam segments grows down from the sky (32 px per frame) until it reaches Ed.
function HandlePurpleBeam(s) {
  if (s.rect.top >= 0x311) { killBeam(s); return; }
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  const hit = () => {
    if (detectCollision(s.rect, o, 0, 0, 2, 2)) {
      DoDamage(opp, 10, s.info[2]);
      projectileHit(opp, s.dir, s.dir === 0 ? 1 : -1, -1, 0x17, 0x16, false);
    }
  };
  if (s.action2 === 0) {
    hit();
    s.action2 = 1;
  } else if (s.action2 === 1) {
    NewPurpleBeam2(s.rect, s.info[1], s.info[2], s.info[3]);
    hit();
    s.action2 = 2;
  } else {
    hit();
    const ed = GetSpriteRect(s.info[2]);
    if (detectCollision(s.rect, ed, 0, 0, 2, 2)) {
      killBeam(s);
      NewPurpleBalls(ed, s.info[1], s.info[2], s.info[3]);
    }
  }
}

function NewPurpleBalls(r, oppIndex, num, group) {
  T.purpleBall.info[1] = oppIndex;
  T.purpleBall.info[2] = num;
  T.purpleBall.info[3] = group;
  const rect = { ...r };
  insetRect(rect, 12, 12);
  for (let i = 0; i < 40; i++) {
    T.purpleBall.vx = Rand(30) - 15;
    T.purpleBall.vy = Rand(8) - 20;
    const n = NewSpriteFromCICN(T.purpleBall, rect, HandlePurpleBall);
    for (let k = 0; k < 5; k++) MoveSprite(n, GetSpritePathH(n), GetSpritePathV(n));
  }
}

function HandlePurpleBall(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  if (!OnScreen(s, 1)) KillSprite(s);
  if (detectCollision(s.rect, o, 2, 2, 2, 2)) {
    DoDamage(opp, 10, s.info[2]);
    projectileHit(opp, s.dir, s.vx, s.vy, 0x22, 0x23, true);
    KillSprite(s);
  }
}

export function NewSpin3Ball(r, oppIndex, num, group) {
  const t = T.spinBall;
  t.info[1] = oppIndex;
  t.info[2] = num;
  t.info[3] = group;
  for (const [vx, vy] of [[0, -4], [-4, 0], [4, 0]]) {
    t.vx = vx;
    t.vy = vy;
    NewSpriteFromCICN(t, r, HandleSpin3Ball);
  }
}

function HandleSpin3Ball(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  s.action2 += 1;
  if (s.action2 < 8) offsetRect(s.rect, s.vx, s.vy);
  else offsetRect(s.rect, -s.vx, -s.vy);
  if (s.action2 > 0xf) KillSprite(s);
  if (detectCollision(s.rect, o, 2, 2, 2, 2)) {
    DoDamage(opp, 10, s.info[2]);
    if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
    SetSpritePath(opp, GetSpritePathH(opp) + s.vx * 4, GetSpritePathV(opp) + s.vy * 4);
    SetSpriteDirection(opp, 1);
    if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) SetSpriteFrame(opp, 0x22);
    SetSpriteInfo(opp, 2, 0);
  }
}

// ---- Speedy ----------------------------------------------------------------------------------

export async function HandleSpeedy(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    const o = GetSpriteRect(opp);
    if (s.action2 === 0xd) { // speed by
      s.frame = s.dir === 0 ? 0x3c : 0x3d;
      s.info[5] += 1;
      offsetRect(s.rect, s.dir === 0 ? 32 : -32, 0);
      if (s.info[5] > 7) settle(s);
    } else if (s.action2 === 0xe) { // hit and run
      s.frame = s.dir === 0 ? 0x3c : 0x3d;
      s.info[5] += 1;
      offsetRect(s.rect, s.dir === 0 ? 30 : -30, 0);
      if (detectCollision(o, s.rect, 0, 0, 0, 0)) {
        DoDamage(opp, 7, s.num);
        if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
        SetSpritePath(opp, GetSpritePathH(opp) + (s.dir === 0 ? 10 : -10), GetSpritePathV(opp) - 2);
        SetSpriteDirection(opp, s.dir === 0 ? 1 : 0);
        SetSpriteFrame(opp, s.dir === 0 ? 0x17 : 0x16);
      }
      if (s.info[5] > 7) settle(s);
    } else if (s.action2 === 0xf) { // scorch
      s.frame = s.dir === 0 ? 0x3c : 0x3d;
      s.info[5] += 1;
      NewFire(s.rect, s.info[1], s.type); // the original passes its sprite type as the attacker
      offsetRect(s.rect, s.dir === 0 ? 32 : -32, 0);
      if (s.info[5] > 7) settle(s);
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

function NewFire(r, oppIndex, attacker) {
  T.fire.info[1] = oppIndex;
  T.fire.info[2] = attacker;
  NewSpriteFromCICN(T.fire, { top: r.top + 16, left: r.left, bottom: r.bottom, right: r.right }, HandleFire);
}

function HandleFire(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  s.action2 += 1;
  if (s.action2 > 0x1f) KillSprite(s);
  if (detectCollision(s.rect, o, 2, 2, 2, 2)) {
    DoDamage(opp, 1, s.info[2]);
    if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
    SetSpritePath(opp, GetSpritePathH(opp), GetSpritePathV(opp) - 1);
    SetSpriteFrame(opp, 0x17);
    SetSpriteInfo(opp, 2, 0);
  }
}

export function NewFireBall(r, oppIndex, num, dir) {
  T.fireBall.info[1] = oppIndex;
  T.fireBall.info[2] = num;
  T.fireBall.dir = dir;
  NewSpriteFromCICN(T.fireBall, r, HandleFireBall);
}

export function HandleFireBall(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  s.frame = s.dir === 0 ? 0 : 1;
  if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
  else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
  const color = Rand(2) === 0 ? 0x45 : 0xcd;
  if (s.dir === 0) MakeSparks(s.rect.left, s.rect.top + 16, 1, 2, 8, 5, color, 0, 2, 2);
  else MakeSparks(s.rect.left + 32, s.rect.top + 16, 0, 2, 8, 5, color, 0, 2, 2);
  if (detectCollision(s.rect, o, 2, 2, 2, 2)) {
    for (const d of [0, 1, 3, 2]) {
      MakeSparks(s.rect.left + 16, s.rect.top + 16, d, 3, 6, 5, 0xcd, 0, 2, 2);
      MakeSparks(s.rect.left + 16, s.rect.top + 16, d, 3, 6, 5, 0x45, 0, 2, 2);
    }
    DoDamage(opp, 0x14, s.info[2]);
    if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
    SetSpriteFrame(opp, 0x17);
    SetSpriteInfo(opp, 2, 0);
    KillSprite(s);
  }
  if (!OnScreen(s, 1)) KillSprite(s);
}

// ---- special moves (from the AI) -------------------------------------------------------------

export function DoSpecialMove(n, ch, move) {
  const r = GetSpriteRect(n);
  const a2 = GetSpriteAction2(n);
  if (ch === 0) {
    if (a2 === 5) return;
    if (move === 0) { SetSpriteAction2(n, 0xd); SetSpriteInfo(n, 5, 0); SetSpriteInfo(n, 7, 0); }
    else if (move === 1) { SetSpriteAction2(n, 0xe); SetSpriteInfo(n, 5, 0); }
    else if (move === 2) { SetSpriteAction2(n, 0xf); NewPurpleBeam(r, GetSpriteInfo(n, 1), n, n); }
    else if (move === 3) { SetSpriteAction2(n, 0x10); NewSpin3Ball(r, GetSpriteInfo(n, 1), n, n); }
  } else if (ch === 1) {
    if (a2 === 5 || a2 === 0xd || a2 === 0xe || a2 === 0xf) return;
    if (move === 0) { SetSpriteAction2(n, 0xd); SetSpriteInfo(n, 5, 0); }
    else if (move === 1) { SetSpriteAction2(n, 0xe); SetSpriteInfo(n, 5, 0); }
    else if (move === 2) { SetSpriteAction2(n, 0xf); SetSpriteInfo(n, 5, 0); }
    else if (move === 3) NewFireBall(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
  } else if (ch === 2) {
    if (move === 0) {
      if (a2 !== 5) NewIceBlast(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n), n);
    } else if (move === 1) {
      if (a2 !== 5) NewIceFist(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n), n);
    } else if (move === 2) {
      ClearPattern1(); // the original clears player 1's key pattern even when the CPU does this
      if (OnSurface(r, n) && GetSpriteAction2(n) !== 5) {
        NewIceColumn(r, n, n);
        SetSpriteAction2(n, 0xf);
        SetSpriteInfo(n, 5, 0);
      }
    } else if (move === 3) {
      if (a2 !== 5) NewIceBlast2(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n), n);
    }
  } else if (ch === 3) {
    if (move === 0) {
      if (a2 !== 5) { SetSpriteAction2(n, 0xd); SetSpriteInfo(n, 5, 0xb); }
    } else if (move === 1) {
      if (a2 !== 5) NewInvBoxGlove(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    } else if (move === 2) {
      if (a2 !== 5) NewInvFireBall(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    } else if (move === 3) {
      // Original quirk: tests sprite 1's state, not this fighter's.
      if (GetSpriteAction2(1) !== 5) NewInvIceBall(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n), n);
    }
  } else if (ch === 4) {
    NinjaSpecial(n, move);
  } else if (ch === 5) {
    MechSpecial(n, move);
  } else if (ch === 6) {
    KathySpecial(n, move);
  } else if (ch === 7) {
    GeorgeSpecial(n, move);
  } else if (ch === 8) {
    PhilSpecial(n, move);
  } else if (ch === 9) {
    SuperSpecial(n, move);
  } else if (ch === 10) {
    if (a2 === 5) return;
    if (move === 0) NewBubble(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    else if (move === 1) { NewBodyParts(r, n); SetSpriteAction2(n, 0xe); }
    else if (move === 2) NewDarkBeam(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    else if (move === 3) NewBats(GetSpriteInfo(n, 1), n);
  } else if (ch === 0xb) {
    if (a2 === 5) return;
    if (move === 0) NewProxMine(r, GetSpriteInfo(n, 1), n);
    else if (move === 1) NewGrenades(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    else if (move === 2) SetSpriteAction2(n, 0xf);
    else if (move === 3) NewTracker(r, GetSpriteInfo(n, 1), n);
  }
}

// Which specials the AI may use, per character, at each skill level (lvl 0/1/2), moves 0-3.
const SPECIALS = [
  ['1111', '1011', '1000'], ['0111', '1000', '1100'], ['1101', '0010', '0010'], ['0111', '0000', '1000'],
  ['1011', '0101', '1101'], ['1111', '0000', '0000'], ['1111', '1000', '0000'], ['0111', '1000', '0000'],
  ['1111', '0000', '0000'], ['0011', '1000', '1100'], ['1011', '0100', '1010'], ['1011', '0100', '0100'],
];

function EvalSpecialMove(ch, lvl, move) {
  return SPECIALS[ch][lvl].charCodeAt(move) === 49 ? 1 : 0;
}

// ---- HandleAI --------------------------------------------------------------------------------

function level() {
  const r = Rand(100);
  return percents.p0 < r ? (percents.p1 < r ? 2 : 1) : 0;
}

export function HandleAI(s) {
  if (s.action1 === 0x12 || s.action2 === 5 || (s.action2 === 0xd && s.f5e === 3)) return;
  const opp = GetOpp(s.info[1], s.rect, s.num);
  const o = GetSpriteRect(opp);
  const touching = () => detectCollision(o, s.rect, 0, 0, 0, 0);
  if (s.f60 !== 0 && s.action2 !== 0xd && Rand(1200) > 1185) {
    s.action2 = 0xd;
    s.info[5] = 0xb;
  }
  if (s.action2 === 0x13) { // Super Squirrel flying: wander up, down, toward or away
    if (Rand(5000) > 0x1386) {
      s.action2 = 2;
      s.f5a = 0;
    }
    if (s.f5a === 0) {
      const r = Rand(4);
      if (r === 2) s.f5a = 0x15;
      else if (r === 0) s.f5a = 1;
      else if (r === 1) s.f5a = 3;
      else if (r === 3) s.f5a = 0x14;
    }
    if (Rand(1000) > 990) s.f5a = 0;
    if (s.f5a === 1 || s.f5a === 3) {
      s.action1 = 1;
      if (s.f5a === 1) s.dir = o.left + 16 < s.rect.left + 16 ? 1 : 0;
      else s.dir = s.rect.left + 16 < o.left + 16 ? 1 : 0;
      if (o.left < s.rect.left + 16 && s.rect.left < o.right) s.f5a = 0;
      if (touching()) {
        s.f5a = 0;
        s.action2 = 2;
      }
      if (s.rect.right > 0x3ff || s.rect.left < 1) s.f5a = 0;
    } else if (s.f5a === 0x15) {
      s.action1 = 0x15;
      if (s.rect.top < 1) s.f5a = 0;
    } else if (s.f5a === 0x14) {
      s.action1 = 0x14;
      // Original quirk: tests bottom > 1023, which can't happen in a 768-high world.
      if (s.rect.bottom > 0x3ff) s.f5a = 0;
    }
    return;
  }
  if (s.f5a === 0 && (s.action2 === 2 || s.action2 === 3)) {
    let c = level();
    if (GetLife(s.num) < 0x32 && Rand(2) !== 0) c = 1;
    if (GetLife(s.num) > 199 && Rand(2) !== 0) c = 0;
    if (Rand(100) > percents.p4) c = 3;
    if (touching()) c = 0;
    if (c === 0) {
      if (Rand(1) === 0) s.f5a = 1;
      if (touching() && Rand(100) > 100 - percents.p0) s.f5a = 2;
    } else if (c === 1) {
      if (Rand(1) === 0) s.f5a = 3;
    } else if (c === 2) {
      const r = Rand(3);
      if (r === 1) s.f5a = 3;
      else if (r === 0) s.f5a = 1;
      else s.f5a = 4;
    } else if (c === 3) {
      const lvl = level();
      const allowed = [0, 1, 2, 3].map((m) => EvalSpecialMove(s.f5e, lvl, m));
      const tried = [0, 0, 0, 0];
      let pick;
      for (;;) {
        pick = Rand(4);
        if (tried[0] && tried[1] && tried[2] && tried[3]) { pick = -1; break; }
        tried[pick] = 1;
        if (allowed[pick] === 1) break;
      }
      if (s.f60 !== 0 && pick === 0) pick = -1;
      if (pick !== -1) DoSpecialMove(s.num, s.f5e, pick);
      s.f5a = 0;
    }
  } else {
    switch (s.f5a) {
      case 1: // approach
        s.action1 = 1;
        s.dir = o.left + 16 < s.rect.left + 16 ? 1 : 0;
        if (o.left < s.rect.left + 16 && s.rect.left < o.right) s.f5a = 0;
        // The original's "jump at a higher opponent" compares the opponent with itself and never fires.
        if (o.bottom < o.top - 100 && s.action2 === 2 && OnSurface(s.rect, 0)) { s.action2 = 3; s.vy = -0x11; }
        if (Rand(1000) > 990) s.f5a = 0;
        if (touching()) s.f5a = 0;
        if (s.rect.right >= 0x400 || s.rect.left <= 0) s.f5a = 0;
        break;
      case 2: // attack
        if (s.action2 === 2 || s.action2 === 3) {
          if (s.action2 === 3) {
            s.action2 = Rand(2) === 1 ? 0xc : 0xb;
          } else {
            const r = Rand(4);
            if (r === 0) s.action1 = 4; // the original sets action1 here, so the CPU never punches
            else if (r === 1) s.action2 = 6;
            else if (r === 2) s.action2 = Rand(3) < 2 ? 7 : 9;
          }
        }
        s.f5a = 0;
        break;
      case 3: // retreat
        s.action1 = 1;
        s.dir = o.left + 16 < s.rect.left + 16 ? 0 : 1;
        if (Rand(1000) > 990) s.f5a = 0;
        if (s.rect.right >= 0x400 || s.rect.left <= 0) s.f5a = 0;
        if (touching()) s.f5a = 0;
        break;
      case 4: // hold still
        if (s.action2 === 3) break;
        s.action2 = 2;
        if (Rand(1000) > 980) s.f5a = 0;
        if (touching()) s.f5a = 0;
        break;
      case 0x14:
        s.action1 = 0x14;
        if (Rand(1000) > 990) s.f5a = 0;
        if (s.rect.top >= 0) s.f5a = 0;
        if (touching()) s.f5a = 0;
        break;
      case 0x15:
        s.action1 = 0x15;
        if (Rand(1000) > 990) s.f5a = 0;
        if (s.rect.top <= 0) s.f5a = 0;
        if (touching()) s.f5a = 0;
        break;
      default:
        break;
    }
  }
  if (s.action1 === 1 && Rand(1000) > 980 && s.action2 === 2 && OnSurface(s.rect, 0)) {
    s.action2 = 3;
    s.vy = -0x11;
  }
  if (s.f5e === 7 && s.action2 === 0xd) { // George's cane charge: turn at the edges, stop at random
    if (s.rect.right > 0x3ff || s.rect.left < 1) s.dir = s.dir === 0 ? 1 : 0;
    if (Rand(0x5dc) > 0x5d2) {
      s.f5a = 0;
      s.action2 = 2;
    }
  }
  if (s.f5e === 9 && s.action2 === 0xe && touching()) { // Super Squirrel: stop on reaching the opponent
    s.f5a = 0;
    s.action1 = 2;
    s.action2 = 2;
  }
  if (s.f5e === 1 && (s.action2 === 0xd || s.action2 === 0xe || s.action2 === 0xf) &&
    (s.rect.right >= 0x400 || s.rect.left <= 0)) {
    s.dir = s.dir === 0 ? 1 : 0;
  }
  s.f5c = s.f5a;
}
