// George (character 7, HandleOldSquirrel): his specials — Cane Charge (he rushes along hitting
// the opponent), Fart (freezes), Thrown Cane and the homing Teeth.

import { Rand, Rand1, detectCollision, insetRect, offsetRect } from '../mac.js';
import {
  GetNumSpritesTypeInfo3, GetSpriteAction1, GetSpriteAction2, GetSpriteDirection, GetSpriteFrame,
  GetSpriteInfo, GetSpritePathH, GetSpritePathV, GetSpritePicID, GetSpriteRect, KillSprite,
  NewSpriteFromCICN, SetSpriteAction1, SetSpriteAction2, SetSpriteDirection, SetSpriteFrame, SetSpriteInfo,
  SetSpritePath,
} from '../sprites.js';
import { MakeSparks } from '../sparks.js';
import { DoDamage } from '../hud.js';
import { T } from '../templates.js';
import { KeepSpriteOnScreen, OnScreen } from '../common.js';
import { GetOpp, HandlePlayer, HandlePlayer2, OnSurface } from './player.js';
import { HandleDeadPlayer } from './game.js';
import { HandleAI, isCPU } from './chars.js';

export async function HandleOldSquirrel(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    const o = GetSpriteRect(opp);
    // Cane charge: 12 px a frame, hurting the opponent on every touch. Original quirk: nothing
    // ends it for a human George (no key does, see CheckKeyDown) until he is hit; the CPU's George
    // turns at the edges and stops at random (HandleAI).
    if (s.action2 === 0xd) {
      offsetRect(s.rect, s.dir === 0 ? 0xc : -0xc, 0);
      s.f56 += 1;
      if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
      if (s.dir === 0 && (s.frame < 0x3c || s.frame > 0x3f)) s.frame = 0x3c;
      if (s.dir === 1 && (s.frame < 0x40 || s.frame > 0x43)) s.frame = 0x40;
      if (detectCollision(s.rect, o, 0, 4, 0, 2)) {
        DoDamage(opp, 0xc, s.num);
        if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
        if (s.dir === 0) {
          SetSpritePath(opp, GetSpritePathH(opp) + 0xf, GetSpritePathV(opp) - 5);
          SetSpriteDirection(opp, 1);
          SetSpriteFrame(opp, 0x22);
        } else {
          SetSpritePath(opp, GetSpritePathH(opp) - 0xf, GetSpritePathV(opp) - 5);
          SetSpriteDirection(opp, 0);
          SetSpriteFrame(opp, 0x23);
        }
        SetSpriteInfo(opp, 2, 0);
      }
      offsetRect(s.rect, s.vx, s.vy);
      s.vy += 1;
      KeepSpriteOnScreen(s);
      if (OnSurface(s.rect, s.num)) {
        s.vx = 0;
        s.vy = 0;
      }
    } else if (s.action2 === 0xe) { // fart pose
      s.frame = s.dir === 0 ? 0x44 : 0x45;
      s.info[5] -= 1;
      if (s.info[5] < 1) s.action2 = 2;
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

// The four specials (CheckMoves1 uses n = 0; DoSpecialMove the CPU's slot).
export function GeorgeSpecial(n, move) {
  const r = GetSpriteRect(n);
  if (GetSpriteAction2(n) === 5) return;
  if (move === 0) {
    if (GetSpriteAction2(n) !== 3) SetSpriteAction2(n, 0xd);
  } else if (move === 1) {
    NewFart(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    if (GetSpriteAction2(n) !== 3) {
      SetSpriteInfo(n, 5, 10);
      SetSpriteAction2(n, 0xe);
    }
  } else if (move === 2) {
    NewCane(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
  } else if (move === 3) {
    NewTeeth(r, GetSpriteInfo(n, 1), n);
  }
}

// ---- Fart -----------------------------------------------------------------------------------------

function NewFart(r, oppIndex, num, dir) {
  const rect = { ...r };
  offsetRect(rect, dir === 0 ? 0x20 : -0x20, 0);
  T.fart.info[1] = oppIndex;
  T.fart.info[2] = num;
  T.fart.dir = dir;
  NewSpriteFromCICN(T.fart, rect, HandleFart);
}

// A slow cloud; a hit freezes the opponent for 120 frames (10 damage) inside a cloud.
function HandleFart(s) {
  let victim = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(victim);
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.dir === 0 && (s.frame < 0 || s.frame > 3)) s.frame = 0;
  if (s.dir === 1 && (s.frame < 4 || s.frame > 7)) s.frame = 4;
  if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
  else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
  if (detectCollision(s.rect, o, 2, 6, 2, 2)) {
    // Original quirk: if the opponent is already frozen, George freezes himself.
    if (GetSpriteAction1(victim) === 0x12) victim = s.info[2];
    SetSpriteInfo(victim, 4, GetSpriteFrame(victim));
    SetSpriteInfo(victim, 2, 0);
    SetSpriteInfo(victim, 7, 0x78);
    SetSpriteAction1(victim, 0x12);
    SetSpriteAction2(victim, 2);
    DoDamage(victim, 10, s.info[2]);
    SetSpriteInfo(victim, 2, 0);
    NewFrozenFart(victim);
    KillSprite(s);
  }
  if (!OnScreen(s, 1)) KillSprite(s);
}

// The cloud around a frozen victim. The original passes an uninitialised rect; the cloud copies
// the victim's rect on its first update, so it starts on the victim here.
function NewFrozenFart(victim) {
  T.fart.info[1] = victim;
  NewSpriteFromCICN(T.fart, GetSpriteRect(victim), HandleFrozenFart);
}

function HandleFrozenFart(s) {
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  s.rect = GetSpriteRect(s.info[1]);
  if (GetSpriteAction1(s.info[1]) !== 0x12) KillSprite(s);
}

// ---- Thrown Cane ------------------------------------------------------------------------------------

function NewCane(r, oppIndex, num, dir) {
  T.cane.vx = dir === 0 ? T.cane.f42 : -T.cane.f42;
  T.cane.info[1] = oppIndex;
  T.cane.info[2] = num;
  T.cane.dir = dir;
  T.cane.vy = -8 - Rand(8);
  NewSpriteFromCICN(T.cane, r, HandleCane);
}

// Arcs through the air; hurts once (25) and carries on.
export function HandleCane(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.dir === 0 && (s.frame < 0 || s.frame > 3)) s.frame = 0;
  if (s.dir === 1 && (s.frame < 4 || s.frame > 7)) s.frame = 4;
  if (detectCollision(s.rect, o, 2, 2, 2, 2) && s.info[7] === 0) {
    DoDamage(opp, 0x19, s.info[2]);
    const v = GetSpritePathV(opp);
    const dx = Rand(0xd);
    SetSpritePath(opp, GetSpritePathH(opp) - dx - 6, v - 6);
    SetSpriteDirection(opp, 1);
    if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) {
      SetSpriteFrame(opp, 0x22);
      SetSpriteAction2(opp, 5);
    }
    SetSpriteInfo(opp, 2, 0);
    s.info[7] = 1;
  }
  if (!OnScreen(s, 1)) KillSprite(s);
}

// ---- Teeth ------------------------------------------------------------------------------------------------

// One set at a time per George. Homes on the opponent (25 damage); falls apart after 240 frames.
function NewTeeth(r, oppIndex, num) {
  if (GetNumSpritesTypeInfo3(T.teeth.type, num) >= 1) return;
  const rect = { ...r };
  insetRect(rect, 8, 8);
  T.teeth.info[1] = oppIndex;
  T.teeth.info[2] = num;
  T.teeth.info[3] = num;
  NewSpriteFromCICN(T.teeth, rect, HandleTeeth);
}

function HandleTeeth(s) {
  s.info[4] -= 1;
  if (s.info[4] < 1) {
    for (const d of [3, 2, 0, 1]) {
      const x = s.rect.left + Math.trunc((s.rect.left - s.rect.right) / 2);
      const y = s.rect.top + Math.trunc((s.rect.top - s.rect.bottom) / 2);
      MakeSparks(x, y, d, 10, 0x14, 7, 0x1e, 0, 2, 2);
    }
    KillSprite(s); // still finishes this frame, as in the original
  }
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  offsetRect(s.rect, s.vx, s.vy);
  s.dir = s.vx < 1 ? 1 : 0;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.dir === 0 && (s.frame < 0 || s.frame > 1)) s.frame = 0;
  if (s.dir === 1 && (s.frame < 2 || s.frame > 3)) s.frame = 2;
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
  KeepSpriteOnScreen(s);
  if (detectCollision(s.rect, t, 2, 2, 2, 2)) {
    KillSprite(s);
    DoDamage(opp, 0x19, s.info[2]);
    const v = GetSpritePathV(opp);
    const dx = Rand(0xd);
    SetSpritePath(opp, GetSpritePathH(opp) - dx - 6, v - 6);
    SetSpriteDirection(opp, 1);
    if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) {
      SetSpriteFrame(opp, 0x22);
      SetSpriteAction2(opp, 5);
    }
    SetSpriteInfo(opp, 2, 0);
  }
}
