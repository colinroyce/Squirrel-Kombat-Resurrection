// Philbert (character 8, HandlePhil): his specials — Pie (thrown like George's cane), Ground Pound
// (the screen shakes and rocks fall on the opponent), Stomach Punch and Swallow.

import { Rand, offsetRect, detectCollision } from '../mac.js';
import {
  GetSpriteAction2, GetSpriteDirection, GetSpriteInfo, GetSpritePathH, GetSpritePathV, GetSpritePicID,
  GetSpriteRect, KillSprite, MoveSprite, NewSpriteFromCICN, SetSpriteAction1, SetSpriteAction2,
  SetSpriteDirection, SetSpriteDoDraw, SetSpriteFrame, SetSpriteInfo, SetSpritePath, SetSpriteRect,
} from '../sprites.js';
import { DoDamage } from '../hud.js';
import { T } from '../templates.js';
import { KeepSpriteOnScreen } from '../common.js';
import { DoQuake } from '../quakes.js';
import { GetOpp, HandlePlayer, HandlePlayer2, OnSurface } from './player.js';
import { HandleDeadPlayer } from './game.js';
import { HandleAI, isCPU } from './chars.js';
import { HandleCane } from './george.js';

export async function HandlePhil(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    const o = GetSpriteRect(opp);
    if (s.action2 === 0xe) { // ground pound
      s.info[5] += 1;
      if (s.info[5] < 10) {
        s.frame = s.dir === 0 ? 0x3c : 0x3e;
      } else {
        s.frame = s.dir === 0 ? 0x3d : 0x3f;
        let v = Rand(0xb);
        let h = Rand(0xb);
        DoQuake(1, 0x3c, h - 5, v - 5);
        v = Rand(0xb);
        h = Rand(0xb);
        DoQuake(2, 0x3c, h - 5, v - 5);
        s.action2 = 2;
        NewRocks(o, s.info[1], s.num);
      }
    } else if (s.action2 === 0xf) { // stomach punch
      s.info[5] += 1;
      if (s.info[5] < 10) s.frame = s.dir === 0 ? 0x46 : 0x47;
      else s.frame = s.dir === 0 ? 0x48 : 0x49;
      if (s.info[5] === 0xb) NewStomach(s.rect, s.info[1], s.num, s.dir);
      if (s.info[5] > 0xc) s.action2 = 2;
    } else if (s.action2 === 0x10) { // swallow
      if (s.info[5] === 0) { // suck the opponent in
        SetSpriteAction2(opp, 5);
        SetSpriteAction1(opp, 0x12);
        SetSpritePath(opp, 0, 0);
        s.frame = s.dir === 0 ? 0x40 : 0x41;
        s.info[7] += 1;
        if (o.left + 0x10 < s.rect.left + 0x10) MoveSprite(opp, 9, 2);
        else MoveSprite(opp, -9, 2);
        if (s.info[7] > 0xf) s.action2 = 2;
        if (detectCollision(o, s.rect, 2, 2, 2, 2)) {
          s.info[5] = 1;
          s.info[7] = 0;
        }
      } else if (s.info[5] === 1) { // chew (the opponent is hidden inside him)
        // Original quirk: sets his animation delay to 4 for good (2 for every other fighter).
        s.f58 = 4;
        SetSpriteRect(opp, s.rect);
        SetSpriteDoDraw(opp, 0);
        s.f56 += 1;
        if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
        if (s.dir === 0 && (s.frame < 0x42 || s.frame > 0x43)) s.frame = 0x42;
        if (s.dir === 1 && (s.frame < 0x44 || s.frame > 0x45)) s.frame = 0x44;
        s.info[7] += 1;
        SetSpriteAction2(opp, 2);
        SetSpriteAction1(opp, 0x12);
        SetSpriteInfo(opp, 7, 1);
        if (s.info[7] > 0x1e) { // spit them out: 30 damage
          s.info[5] = 2;
          s.info[7] = 0;
          DoDamage(opp, 0x1e, s.num);
          let h;
          if (s.dir === 0) { SetSpriteDirection(opp, 1); h = 0x10; }
          else { SetSpriteDirection(opp, 0); h = -0x10; }
          SetSpriteAction2(opp, 5);
          SetSpriteAction1(opp, 2);
          SetSpritePath(opp, h, -10);
          SetSpriteRect(opp, s.rect);
          MoveSprite(opp, h, 0);
          SetSpriteDoDraw(opp, 1);
        }
      } else if (s.info[5] === 2) {
        s.frame = s.dir === 0 ? 0x40 : 0x41;
        s.info[7] += 1;
        if (s.info[7] > 0x14) s.action2 = 2;
      }
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

// The four specials (CheckMoves1 uses n = 0; DoSpecialMove the CPU's slot).
export function PhilSpecial(n, move) {
  const r = GetSpriteRect(n);
  if (GetSpriteAction2(n) === 5) return;
  if (move === 0) {
    NewPie(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
  } else if (move === 1) {
    if (OnSurface(r, n)) {
      SetSpriteAction2(n, 0xe);
      SetSpriteInfo(n, 5, 0);
    }
  } else if (move === 2) {
    SetSpriteAction2(n, 0xf);
    SetSpriteInfo(n, 5, 0);
  } else if (move === 3) {
    SetSpriteAction2(n, 0x10);
    SetSpriteInfo(n, 5, 0);
    SetSpriteInfo(n, 7, 0);
  }
}

// ---- Pie ------------------------------------------------------------------------------------------

// Thrown in an arc, using George's cane handler.
function NewPie(r, oppIndex, num, dir) {
  T.pie.vx = dir === 0 ? T.pie.f42 : -T.pie.f42;
  T.pie.info[1] = oppIndex;
  T.pie.info[2] = num;
  T.pie.dir = dir;
  T.pie.vy = -8 - Rand(8);
  NewSpriteFromCICN(T.pie, r, HandleCane);
}

// ---- Ground Pound rocks -----------------------------------------------------------------------------

// Five rocks drop from the top of the world around the opponent: starting 96 px to their left,
// 48 px apart, each nudged by (Rand(32) − 16, Rand(65) − 32) on top of the previous ones.
function NewRocks(o, oppIndex, num) {
  const rect = { top: 0, left: o.left, bottom: 0x20, right: o.right };
  T.rock.info[1] = oppIndex;
  T.rock.info[2] = num;
  offsetRect(rect, -0x60, 0);
  for (let i = 0; i < 5; i++) {
    const dv = Rand(0x41); // the original rolls the vertical nudge first
    const dh = Rand(0x20);
    offsetRect(rect, dh - 0x10, dv - 0x20);
    T.rock.vy = Rand(10);
    NewSpriteFromCICN(T.rock, rect, HandleRock);
    offsetRect(rect, 0x30, 0);
  }
}

function HandleRock(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  if (s.vy > 0x10) s.vy = 0x10;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  if (detectCollision(s.rect, o, 2, 2, 2, 2) && s.info[7] === 0) {
    DoDamage(opp, 0xf, s.info[2]);
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
  if (s.rect.bottom > 0x300) KillSprite(s);
}

// ---- Stomach Punch ---------------------------------------------------------------------------------

// An 18×16 punch in front of his belly that lasts 3 frames.
function NewStomach(r, oppIndex, num, dir) {
  const rect = { top: r.top + 0x10, left: r.left, bottom: r.bottom, right: r.right };
  T.stomach.info[1] = oppIndex;
  T.stomach.info[2] = num;
  T.stomach.dir = dir;
  if (dir === 0) {
    rect.right -= 0xe;
    offsetRect(rect, 0x20, 0);
  } else {
    rect.left += 0xe;
    offsetRect(rect, -0x20, 0);
  }
  NewSpriteFromCICN(T.stomach, rect, HandleStomach);
}

// Original quirk: it tests info7 but never sets it, so it can hit on each of its 3 frames.
function HandleStomach(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.dir === 0 && (s.frame < 0 || s.frame > 1)) s.frame = 0;
  if (s.dir === 1 && (s.frame < 2 || s.frame > 3)) s.frame = 2;
  s.info[5] += 1;
  if (s.info[5] === 3) KillSprite(s);
  if (detectCollision(s.rect, o, 0, 0, 0, 0) && s.info[7] === 0) {
    DoDamage(opp, 0x1e, s.info[2]);
    if (s.dir === 0) {
      const v = GetSpritePathV(opp);
      const dx = Rand(6);
      SetSpritePath(opp, GetSpritePathH(opp) + dx + 8, v - 6);
      SetSpriteDirection(opp, 1);
    } else {
      const v = GetSpritePathV(opp);
      const h = GetSpritePathH(opp);
      SetSpritePath(opp, h - Rand(6) - 8, v - 6);
      SetSpriteDirection(opp, 0);
    }
    if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) {
      SetSpriteFrame(opp, 0x22);
      SetSpriteAction2(opp, 5);
    }
    SetSpriteInfo(opp, 2, 0);
  }
  if (s.rect.bottom > 0x300) KillSprite(s);
}
