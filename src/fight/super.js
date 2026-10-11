// Super Squirrel (character 9, HandleSuper): his specials — Fly (jump = up, punch = down, walk to
// fly sideways, other attack keys land; see CheckKeyDown), Super Dash (homes on the opponent
// leaving after-images), Eye Beam and the falling Phone Booth.

import { Rand, Rand1, detectCollision, offsetRect } from '../mac.js';
import {
  GetNumSpritesTypeInfo3, GetSpriteAction2, GetSpriteDirection, GetSpriteInfo, GetSpriteInUse,
  GetSpritePathH, GetSpritePathV, GetSpritePicID, GetSpriteRect, KillSprite, KillSpriteByNumber,
  NewSpriteFromCICN, SetSpriteAction2, SetSpriteDirection, SetSpriteFrame, SetSpriteInfo, SetSpritePath,
} from '../sprites.js';
import { DoDamage } from '../hud.js';
import { T } from '../templates.js';
import { KeepSpriteOnScreen } from '../common.js';
import { GetOpp, HandlePlayer, HandlePlayer2 } from './player.js';
import { HandleDeadPlayer } from './game.js';
import { HandleAI, isCPU } from './chars.js';

export async function HandleSuper(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    const o = GetSpriteRect(opp);
    if (s.action2 === 0x13) { // flying
      s.frame = s.dir === 0 ? 0x3e : 0x3f;
      if (s.action1 !== 2) {
        if (s.action1 === 1) { // sideways at twice his walking speed
          for (let i = 0; i < 2; i++) {
            if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
            else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
          }
        } else if (s.action1 === 0x15) {
          offsetRect(s.rect, 0, -10);
        } else if (s.action1 === 0x14) {
          offsetRect(s.rect, 0, 10);
        }
      }
    } else if (s.action2 === 0xe) { // super dash: homes on the opponent (it does no damage itself)
      // (Any attack key or jump ends it, CheckKeyDown, so in the original a player who is still
      // holding the move's last key on the next frame cancels it straight away.)
      offsetRect(s.rect, s.vx, s.vy);
      s.dir = s.vx < 1 ? 1 : 0;
      s.frame = s.dir === 0 ? 0x3e : 0x3f;
      const t = GetSpriteRect(opp);
      if (Rand(2) !== 0) {
        if (s.rect.right < t.right) s.vx += Rand1(2);
        if (t.right < s.rect.right) s.vx -= Rand1(2);
      }
      if (Rand(2) !== 0) {
        if (s.rect.bottom < t.bottom) s.vy += Rand1(2);
        if (t.top < s.rect.top) s.vy -= Rand1(2);
      }
      if (s.vx > 7) s.vx = 7;
      if (s.vx < -7) s.vx = -7;
      if (s.vy > 7) s.vy = 7;
      if (s.vy < -7) s.vy = -7;
      s.info[7] += 1;
      if (s.info[7] > 1) {
        NewSuperGhost(s.rect, s.dir);
        s.info[7] = 0;
      }
    } else if (s.action2 === 0xf) { // eye beam pose while his beam lasts
      s.frame = s.dir === 0 ? 0x3c : 0x3d;
      if (GetNumSpritesTypeInfo3(0x38f, s.num) < 1) s.action2 = 2;
    } else if (s.action2 === 0x10) {
      NewPhoneBooth(o, s.info[1], s.num);
      s.action2 = 2;
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

// The four specials (CheckMoves1 uses n = 0; DoSpecialMove the CPU's slot).
export function SuperSpecial(n, move) {
  const r = GetSpriteRect(n);
  if (GetSpriteAction2(n) === 5) return;
  if (move === 0) {
    SetSpriteAction2(n, 0x13);
  } else if (move === 1) {
    SetSpriteAction2(n, 0xe);
    SetSpriteInfo(n, 7, 0);
  } else if (move === 2) {
    SetSpriteAction2(n, 0xf);
    SetSpriteInfo(n, 5, 0);
    NewEyeBlast(r, GetSpriteInfo(n, 1), n);
  } else if (move === 3) {
    SetSpriteAction2(n, 0x10);
  }
}

// ---- after-images ---------------------------------------------------------------------------------

function NewSuperGhost(r, dir) {
  T.superGhost.dir = dir;
  NewSpriteFromCICN(T.superGhost, r, HandleSuperGhost);
}

function HandleSuperGhost(s) {
  s.frame = s.dir === 0 ? 0 : 1;
  s.info[0] -= 1;
  if (s.info[0] < 1) KillSprite(s);
}

// ---- Eye Beam -----------------------------------------------------------------------------------------

// Grows across the screen like Mech's Power Blast (12 px tall). It hurts once: 25 if the first
// piece hits, 30 for any later piece (and the second piece tests without the 2 px inset).
function NewEyeBlast(r, oppIndex, num) {
  T.eyeBlast.info[1] = oppIndex;
  T.eyeBlast.info[2] = num;
  T.eyeBlast.info[3] = num;
  T.eyeBlast.dir = GetSpriteDirection(num);
  T.eyeBlast.info[7] = 1;
  const rect = { ...r };
  offsetRect(rect, GetSpriteDirection(num) === 0 ? 0x20 : -0x20, 0);
  rect.bottom = rect.top + T.eyeBlast.frameH;
  NewSpriteFromCICN(T.eyeBlast, rect, HandleEyeBlast);
}

function NewEyeBlast2(r, oppIndex, num, group, dir, armed) {
  T.eyeBlast.info[1] = oppIndex;
  T.eyeBlast.info[2] = num;
  T.eyeBlast.info[3] = group;
  T.eyeBlast.info[7] = armed;
  T.eyeBlast.dir = dir;
  const rect = { ...r };
  offsetRect(rect, dir === 0 ? 0x20 : -0x20, 0);
  NewSpriteFromCICN(T.eyeBlast, rect, HandleEyeBlast);
}

function forBeam(s, fn) {
  for (let i = 0; i < 200; i++) {
    if (GetSpriteInUse(i) && GetSpritePicID(i) === s.type && GetSpriteInfo(i, 3) === s.info[3]) fn(i);
  }
}

function eyeBlastHit(s, opp, o, dmg, oppInset) {
  if (!detectCollision(s.rect, o, 0, 0, oppInset, oppInset) || s.info[7] === 0) return;
  DoDamage(opp, dmg, s.info[2]);
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

function HandleEyeBlast(s) {
  if (s.rect.right < 0x421 && s.rect.left > -0x21) {
    const opp = GetOpp(s.info[1], s.rect, s.info[2]);
    const o = GetSpriteRect(opp);
    if (s.action2 === 0) {
      eyeBlastHit(s, opp, o, 0x19, 2);
      s.action2 = 1;
    } else if (s.action2 === 1) {
      NewEyeBlast2(s.rect, s.info[1], s.info[2], s.info[3], s.dir, s.info[7]);
      eyeBlastHit(s, opp, o, 0x1e, 0);
      s.action2 = 2;
    } else {
      eyeBlastHit(s, opp, o, 0x1e, 2);
    }
  } else {
    forBeam(s, KillSpriteByNumber);
  }
}

// ---- Phone Booth ----------------------------------------------------------------------------------------

// Drops from the top of the world onto the opponent (drawn squeezed to their width), 15 damage once.
function NewPhoneBooth(o, oppIndex, num) {
  T.phoneBooth.info[1] = oppIndex;
  T.phoneBooth.info[2] = num;
  T.phoneBooth.vy = Rand(10);
  NewSpriteFromCICN(T.phoneBooth, { top: 0, left: o.left, bottom: 0x40, right: o.right }, HandlePhoneBooth);
}

function HandlePhoneBooth(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  if (s.vy > 0x20) s.vy = 0x20;
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
