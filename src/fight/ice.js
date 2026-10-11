// Ice (character 2): HandleIce and his specials — Ice Blast, Ice Fist, Ice Column and the Ice
// Blast that comes in from the far edge (NewIceBlast2) — plus the ice cube that freezes a victim.

import { Rand, detectCollision, offsetRect } from '../mac.js';
import {
  GetSpriteAction1, GetSpriteAction2, GetSpriteFrame, GetSpriteInfo, GetSpriteInUse, GetSpritePathH,
  GetSpritePathV, GetSpritePicID, GetSpriteRect, KillSprite, KillSpriteByNumber, NewSpriteFromCICN,
  SetSpriteAction1, SetSpriteAction2, SetSpriteDirection, SetSpriteFrame, SetSpriteInfo, SetSpritePath,
} from '../sprites.js';
import { MakeSparks } from '../sparks.js';
import { DoDamage } from '../hud.js';
import { T } from '../templates.js';
import { KeepSpriteOnScreen, OnScreen } from '../common.js';
import { GetOpp, HandlePlayer, HandlePlayer2 } from './player.js';
import { HandleDeadPlayer } from './game.js';
import { HandleAI, isCPU } from './chars.js';

export async function HandleIce(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    GetSpriteRect(opp);
    if (s.action2 === 0xf) { // riding the ice column up
      s.info[5] += 1;
      if (s.info[5] < 8) offsetRect(s.rect, 0, -0x20);
      if (s.info[5] > 7) {
        s.vx = 0;
        s.vy = -10;
        s.action2 = 3;
      }
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

// ---- Ice Blast (and the one from the far edge) -------------------------------------------------

export function NewIceBlast(r, oppIndex, num, dir, group) {
  T.iceBlast.info[1] = oppIndex;
  T.iceBlast.info[2] = num;
  T.iceBlast.info[3] = group;
  T.iceBlast.dir = dir;
  NewSpriteFromCICN(T.iceBlast, r, HandleIceBlast);
}

// Starts off the far edge of the world at Ice's height and flies back across it: from the right
// edge when Ice faces right, from the left edge when he faces left.
export function NewIceBlast2(r, oppIndex, num, dir, group) {
  const rect = { top: r.top, left: 0x400, bottom: r.bottom, right: 0x420 };
  if (dir !== 0) { rect.left = -0x20; rect.right = 0; }
  T.iceBlast2.dir = dir === 0 ? 1 : 0;
  T.iceBlast2.info[1] = oppIndex;
  T.iceBlast2.info[2] = num;
  T.iceBlast2.info[3] = group;
  NewSpriteFromCICN(T.iceBlast2, rect, HandleIceBlast);
}

export function HandleIceBlast(s) {
  let victim = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(victim);
  s.frame = s.dir === 0 ? 0 : 1;
  if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
  else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
  const color = Rand(2) === 0 ? 0x111 : 0x1e;
  if (s.dir === 0) MakeSparks(s.rect.left, s.rect.top + 0x10, 1, 2, 8, 5, color, 0, 2, 2);
  else MakeSparks(s.rect.left + 0x20, s.rect.top + 0x10, 0, 2, 8, 5, color, 0, 2, 2);
  if (detectCollision(s.rect, o, 2, 6, 2, 2)) {
    for (const d of [0, 1, 3, 2]) {
      MakeSparks(s.rect.left + 0x10, s.rect.top + 0x10, d, 3, 6, 5, 0x1e, 0, 2, 2);
      MakeSparks(s.rect.left + 0x10, s.rect.top + 0x10, d, 3, 6, 5, 0x111, 0, 2, 2);
    }
    // Original quirk: if the opponent is already frozen, the blast freezes its owner (info3)
    // instead, so Ice freezes himself.
    if (GetSpriteAction1(victim) === 0x12) victim = s.info[3];
    DoDamage(victim, 10, s.info[2]);
    SetSpriteInfo(victim, 4, GetSpriteFrame(victim));
    SetSpriteInfo(victim, 2, 0);
    NewIceCube(victim);
    KillSprite(s);
    SetSpriteInfo(victim, 7, 0x96); // frozen for 150 frames (HandlePlayer2 counts it down)
    SetSpriteInfo(victim, 2, 0);
    SetSpriteAction1(victim, 0x12);
    SetSpriteAction2(victim, 2);
  }
  if (!OnScreen(s, 1)) KillSprite(s);
}

// ---- the ice cube drawn over a frozen fighter ------------------------------------------------------

export function NewIceCube(victim) {
  T.iceCube.info[1] = victim;
  // The original passes an uninitialised rect here. The cube (type 0x14c) runs in HandleSprites'
  // second pass the same frame and copies the victim's rect before it is ever drawn.
  NewSpriteFromCICN(T.iceCube, GetSpriteRect(victim), HandleIceCube);
}

function HandleIceCube(s) {
  s.rect = GetSpriteRect(s.info[1]);
  if (GetSpriteAction1(s.info[1]) !== 0x12) KillSprite(s);
}

// ---- Ice Fist ---------------------------------------------------------------------------------------

export function NewIceFist(r, oppIndex, num, dir, group) {
  T.iceFist.info[1] = oppIndex;
  T.iceFist.info[2] = num;
  T.iceFist.info[3] = group;
  T.iceFist.dir = dir;
  const rect = { ...r };
  offsetRect(rect, dir === 0 ? 0x20 : -0x20, 0);
  NewSpriteFromCICN(T.iceFist, rect, HandleIceFist);
}

// The fist shoots out 32 px a frame, leaving arm pieces behind for its first three frames, then
// comes back, removing the arm pieces it passes over.
function HandleIceFist(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  if (s.info[7] === 0) {
    s.info[7] = 1;
  } else {
    if (s.info[5] < 3) NewIceArm(s.rect, s.info[3]);
    if (s.info[5] > 3) s.dir = s.dir === 0 ? 1 : 0;
    if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
    else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
    if (s.info[5] > 3) s.dir = s.dir === 0 ? 1 : 0;
    s.frame = s.dir === 0 ? 0 : 1;
    s.info[5] += 1;
  }
  if (s.info[5] > 8) KillSprite(s);
  if (s.info[5] > 2) {
    for (let i = 0; i < 200; i++) {
      if (GetSpriteInUse(i) && GetSpritePicID(i) === 0x14d && GetSpriteInfo(i, 3) === s.info[3] &&
        detectCollision(s.rect, GetSpriteRect(i), 0, 0, 0, 0)) KillSpriteByNumber(i);
    }
  }
  // Hits on every frame it overlaps the opponent, as in the original.
  if (detectCollision(s.rect, o, 2, 2, 2, 2)) {
    if (s.dir === 0) {
      SetSpritePath(opp, GetSpritePathH(opp) + 0x14, GetSpritePathV(opp) - 5);
      SetSpriteDirection(opp, 1);
      if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) SetSpriteFrame(opp, 0x22);
    } else {
      SetSpritePath(opp, GetSpritePathH(opp) - 0x14, GetSpritePathV(opp) - 5);
      SetSpriteDirection(opp, 0);
      if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) SetSpriteFrame(opp, 0x23);
    }
    SetSpriteInfo(opp, 2, 0);
    DoDamage(opp, 0xf, s.info[2]);
    if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
    SetSpriteInfo(opp, 2, 0);
  }
}

function NewIceArm(r, group) {
  T.iceArm.info[3] = group;
  NewSpriteFromCICN(T.iceArm, r, HandleIceArm);
}

function HandleIceArm() {}

// ---- Ice Column ---------------------------------------------------------------------------------------

// Original quirk: the callers pass the fighter's slot as the starting count, so the column is
// 7 pieces tall for player 1 (slot 0) but one piece shorter for the CPU/player 2 (slot 1).
export function NewIceColumn(r, group, n) {
  T.iceColumn.info[9] = n + 1;
  T.iceColumn.info[3] = group;
  NewSpriteFromCICN(T.iceColumn, r, HandleIceColumn);
}

function NewIceColumn2(r, group, n) {
  T.iceColumn.info[9] = n + 1;
  T.iceColumn.info[3] = group;
  const rect = { ...r };
  offsetRect(rect, 0, -0x20);
  NewSpriteFromCICN(T.iceColumn, rect, HandleIceColumn);
}

// Each piece waits a frame, adds the next piece on top, then after 50 frames removes the column.
function HandleIceColumn(s) {
  if (s.action2 === 0) {
    s.action2 = 1;
  } else if (s.action2 === 1) {
    if (s.info[9] < 7) NewIceColumn2(s.rect, s.info[3], s.info[9]);
    s.action2 = 2;
  } else {
    s.info[7] += 1;
    if (s.info[7] > 0x32) {
      for (let i = 0; i < 200; i++) {
        if (GetSpriteInUse(i) && GetSpritePicID(i) === 0x150 && GetSpriteInfo(i, 3) === s.info[3]) KillSpriteByNumber(i);
      }
    }
  }
}
