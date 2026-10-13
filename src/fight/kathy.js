// Kathy (character 6): HandleKathy and her specials — Scream (pushes the opponent away while they
// are near), Tri Heart (freezes the opponent, three hearts circle them), Heart Bomb and Flower.

import { Rand, Rand1, detectCollision, insetRect, offsetRect } from '../mac.js';
import {
  GetSpriteAction1, GetSpriteAction2, GetSpriteDirection, GetSpriteFrame, GetSpriteInfo, GetSpritePathH, GetSpritePathV, GetSpritePicID,
  GetSpriteRect, KillSprite, KillSpriteByNumber, NewSpriteFromCICN, SetSpriteAction1, SetSpriteAction2,
  SetSpriteFrame, SetSpriteInfo, SetSpritePath,
} from '../sprites.js';
import { MakeSparks } from '../sparks.js';
import { PlaySound } from '../sound.js';
import { DoDamage } from '../hud.js';
import { T } from '../templates.js';
import { KeepSpriteOnScreen, OnScreen } from '../common.js';
import { GetOpp, HandlePlayer, HandlePlayer2 } from './player.js';
import { HandleDeadPlayer } from './game.js';
import { HandleAI, isCPU } from './chars.js';

export async function HandleKathy(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    const o = GetSpriteRect(opp);
    if (s.action2 === 0xd) { // scream: pushes the opponent while they are within range
      s.frame = s.dir === 0 ? 0x3c : 0x3d;
      if (s.info[5] === 0) PlaySound(0xb);
      if (Math.abs(o.left + 0x20 - s.rect.left) < 0x140 && Math.abs(o.top + 0x20 - s.rect.top) < 0x118) {
        if (s.dir === 0) {
          SetSpritePath(opp, GetSpritePathH(opp) + 2, GetSpritePathV(opp) - 2);
          if (GetSpriteAction2(opp) !== 0x11) SetSpriteFrame(opp, 0x16);
        } else {
          SetSpritePath(opp, GetSpritePathH(opp) - 2, GetSpritePathV(opp) - 2);
          if (GetSpriteAction2(opp) !== 0x11) SetSpriteFrame(opp, 0x17);
        }
        // Original quirk: sets the hit state even on a dead opponent.
        SetSpriteAction2(opp, 5);
      } else {
        s.action2 = 2;
      }
      s.info[5] += 1;
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

// The four specials (CheckMoves1 uses n = 0; DoSpecialMove the CPU's slot).
export function KathySpecial(n, move) {
  const r = GetSpriteRect(n);
  const a2 = GetSpriteAction2(n);
  if (a2 === 5) return;
  if (move === 0) {
    if (a2 !== 3) { SetSpriteAction2(n, 0xd); SetSpriteInfo(n, 5, 0); }
  } else if (move === 1) {
    NewTriHeart(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
  } else if (move === 2) {
    NewHeartBomb(r, GetSpriteInfo(n, 1), n);
  } else if (move === 3) {
    NewFlower(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
  }
}

// ---- Tri Heart -----------------------------------------------------------------------------------

// A heart flies out with three small hearts chasing it. If it hits, the opponent is frozen for
// 120 frames (3 damage) and the three hearts circle them until they thaw.
function NewTriHeart(r, oppIndex, num, dir) {
  const rect = { ...r };
  insetRect(rect, 8, 8);
  T.triCenter.dir = dir;
  T.triCenter.info[1] = oppIndex;
  T.triCenter.info[2] = num;
  const center = NewSpriteFromCICN(T.triCenter, rect, HandleTriCenter);
  T.lilHeart.info[3] = center;
  T.lilHeart.info[1] = oppIndex;
  T.lilHeart.info[2] = num;
  const dv = Rand1(2); // the original rolls the vertical offset first
  const dh = Rand1(2);
  offsetRect(rect, dh, dv);
  const a = NewSpriteFromCICN(T.lilHeart, rect, HandleChaserHeart);
  const b = NewSpriteFromCICN(T.lilHeart, rect, HandleChaserHeart);
  const c = NewSpriteFromCICN(T.lilHeart, rect, HandleChaserHeart);
  SetSpriteInfo(center, 4, a);
  SetSpriteInfo(center, 5, b);
  SetSpriteInfo(center, 6, c);
}

function HandleTriCenter(s) {
  let victim = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(victim);
  if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
  else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
  if (detectCollision(s.rect, o, 0, 0, 0, 0)) {
    for (const d of [0, 1, 3, 2]) {
      MakeSparks(s.rect.left + 0x10, s.rect.top + 0x10, d, 3, 6, 5, 0xcd, 0, 2, 2);
      MakeSparks(s.rect.left + 0x10, s.rect.top + 0x10, d, 3, 6, 5, 0x89, 0, 2, 2);
    }
    // Original quirk: if the opponent is already frozen, the victim is this heart's info3, which
    // is never set (0), so the fighter in slot 0 is frozen instead.
    if (GetSpriteAction1(victim) === 0x12) victim = s.info[3];
    SetSpriteInfo(victim, 4, GetSpriteFrame(victim));
    SetSpriteInfo(victim, 2, 0);
    SetSpriteInfo(victim, 7, 0x78);
    SetSpriteAction1(victim, 0x12);
    SetSpriteAction2(victim, 2);
    SetSpriteInfo(victim, 2, 0);
    DoDamage(victim, 3, s.info[2]);
    SetSpriteInfo(s.info[4], 3, victim);
    SetSpriteInfo(s.info[5], 3, victim);
    SetSpriteInfo(s.info[6], 3, victim);
    KillSprite(s);
  }
  if (!OnScreen(s, 1)) {
    KillSprite(s);
    KillSpriteByNumber(s.info[4]);
    KillSpriteByNumber(s.info[5]);
    KillSpriteByNumber(s.info[6]);
  }
}

// Homes on info3 (the flying heart, then the frozen victim); goes when that is neither frozen
// nor a flying heart (type 657).
function HandleChaserHeart(s) {
  const target = s.info[3];
  offsetRect(s.rect, s.vx, s.vy);
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
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
  if (GetSpriteAction1(target) !== 0x12 && GetSpritePicID(target) !== 0x291) KillSprite(s);
}

// ---- Heart Bomb -----------------------------------------------------------------------------------

// Sits where Kathy stood for 80 frames, then bursts into 15 little hearts (10 damage each).
function NewHeartBomb(r, oppIndex, num) {
  T.heartBomb.info[1] = oppIndex;
  T.heartBomb.info[2] = num;
  NewSpriteFromCICN(T.heartBomb, r, HandleHeartBomb);
}

function HandleHeartBomb(s) {
  s.info[9] -= 1;
  if (s.info[9] < 1) {
    KillSprite(s);
    NewLilHearts(s.rect, s.info[1], s.info[2]);
  }
}

function NewLilHearts(r, oppIndex, num) {
  const rect = { ...r };
  insetRect(rect, 8, 8);
  T.lilHeart.info[1] = oppIndex;
  T.lilHeart.info[2] = num;
  for (let i = 0; i < 0xf; i++) {
    const v = Rand(6);
    const h = Rand(0xd);
    T.lilHeart.vx = h - 6;
    T.lilHeart.vy = v - 0x14;
    NewSpriteFromCICN(T.lilHeart, rect, HandleLilHeart);
  }
}

function HandleLilHeart(s) {
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  if (detectCollision(s.rect, GetSpriteRect(opp), 2, 2, 2, 2)) {
    KillSprite(s);
    DoDamage(opp, 10, s.info[2]);
  }
  if (!OnScreen(s, 1)) KillSprite(s);
}

// ---- Flower -----------------------------------------------------------------------------------------

function NewFlower(r, oppIndex, num, dir) {
  T.flower.info[1] = oppIndex;
  T.flower.info[2] = num;
  T.flower.dir = dir;
  NewSpriteFromCICN(T.flower, r, HandleFlower);
}

function HandleFlower(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
  else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
  if (detectCollision(s.rect, o, 2, 2, 2, 2)) {
    for (const d of [0, 1, 3, 2]) {
      MakeSparks(s.rect.left + 0x10, s.rect.top + 0x10, d, 3, 6, 5, 0x1e, 0, 2, 2);
      MakeSparks(s.rect.left + 0x10, s.rect.top + 0x10, d, 3, 6, 5, 0x45, 0, 2, 2);
    }
    DoDamage(opp, 0x14, s.info[2]);
    if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
    // (the original tests the opponent's direction here but sets frame 0x17 either way)
    SetSpriteFrame(opp, 0x17);
    SetSpriteInfo(opp, 2, 0);
    SetSpritePath(opp, 0, -0x14);
    KillSprite(s);
  }
  if (!OnScreen(s, 1)) KillSprite(s);
}
