// Corpse (character 10): HandleCorpse and his specials — Bubble (drains life), Body Parts (he
// bursts apart and rises from the ground elsewhere), Dark Beam (freezes) and Bats.

import { Rand, Rand1, detectCollision, insetRect, offsetRect, setRect } from '../mac.js';
import {
  GetSpriteAction2, GetSpriteDirection, GetSpriteFrame, GetSpriteInfo, GetSpriteInUse, GetSpritePathH,
  GetSpritePathV, GetSpritePicID, GetSpriteRect, KillSprite, KillSpriteByNumber, NewSpriteFromCICN,
  SetSpriteAction1, SetSpriteAction2, SetSpriteDirection, SetSpriteFrame, SetSpriteInfo, SetSpritePath,
  SetSpriteRect,
} from '../sprites.js';
import { MakeSparks } from '../sparks.js';
import { DoDamage } from '../hud.js';
import { GetBloodPref } from '../state.js';
import { T } from '../templates.js';
import { KeepSpriteOnScreen, OnScreen } from '../common.js';
import { GetOpp, HandlePlayer, HandlePlayer2 } from './player.js';
import { HandleDeadPlayer } from './game.js';
import { HandleAI, isCPU } from './chars.js';
import { NewIceCube } from './ice.js';

// Body Parts (action2 0xe): he is parked below the world (and the flying head keeps him there,
// following it sideways) until a new Corpse rises from the ground (HandleFake).
export async function HandleCorpse(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    GetSpriteRect(opp);
    if (s.action2 === 0xe) {
      s.info[7] = 10;
      s.action1 = 0x12;
      s.rect.top = 900;
      s.rect.bottom = 0x3a4;
      s.vx = 0;
      s.vy = 0;
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

// ---- Bubble -----------------------------------------------------------------------------------------

export function NewBubble(r, oppIndex, num, dir) {
  T.bubble.info[1] = oppIndex;
  T.bubble.info[2] = num;
  T.bubble.dir = dir;
  NewSpriteFromCICN(T.bubble, r, HandleBubble);
}

function stickTo(s, n) {
  const o = GetSpriteRect(n);
  setRect(s.rect, o.left + s.info[4], o.top + s.info[5], o.left + s.info[4] + 0x20, o.top + s.info[5] + 0x20);
}

// Flies out, wraps the opponent (15 damage), flies back to Corpse and gives him 15 life, then
// floats away.
function HandleBubble(s) {
  if (s.action1 === 0) {
    if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
    else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
    const opp = GetOpp(s.info[1], s.rect, s.info[2]);
    const o = GetSpriteRect(opp);
    if (detectCollision(s.rect, o, 5, 5, 2, 2)) {
      DoDamage(opp, 0xf, s.info[2]);
      // Original quirk: sets the hit state even if that blow killed the opponent.
      SetSpriteAction2(opp, 5);
      s.action1 = 1;
      s.info[4] = s.rect.left - o.left;
      s.info[5] = s.rect.top - o.top;
      s.info[6] = opp;
    }
    if (!OnScreen(s, 1)) KillSprite(s);
  } else if (s.action1 === 1) {
    s.f56 += 1;
    if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
    if (s.frame > 4) s.action1 = 2;
    stickTo(s, s.info[6]);
  } else if (s.action1 === 2) {
    offsetRect(s.rect, s.vx, s.vy);
    s.frame = 5;
    const c = GetSpriteRect(s.info[2]);
    if (Rand(2) !== 0) {
      if (s.rect.right < c.right) s.vx += Rand1(2);
      if (c.right < s.rect.right) s.vx -= Rand1(2);
    }
    if (Rand(2) !== 0) {
      if (s.rect.bottom < c.bottom) s.vy += Rand1(2);
      if (c.top < s.rect.top) s.vy -= Rand1(2);
    }
    if (s.vx > 8) s.vx = 8;
    if (s.vx < -8) s.vx = -8;
    if (s.vy > 8) s.vy = 8;
    if (s.vy < -8) s.vy = -8;
    if (detectCollision(s.rect, c, 5, 5, 2, 2)) {
      DoDamage(s.info[2], -0xf, s.info[2]); // negative damage: Corpse gets 15 life back
      s.action1 = 3;
      s.info[4] = s.rect.left - c.left;
      s.info[5] = s.rect.top - c.top;
      s.info[6] = s.info[2];
    }
  } else if (s.action1 === 3) {
    s.f56 += 1;
    if (s.f58 < s.f56) { s.frame -= 1; s.f56 = 0; }
    if (s.frame < 1) s.action1 = 4;
    stickTo(s, s.info[6]);
  } else if (s.action1 === 4) {
    offsetRect(s.rect, 0, -0x19);
    if (!OnScreen(s, 1)) KillSprite(s);
  }
}

// ---- Body Parts -----------------------------------------------------------------------------------

export function NewBodyParts(r, num) {
  const rect = { ...r };
  insetRect(rect, 5, 5);
  T.head.info[1] = num;
  T.head.vx = 0;
  T.head.vy = -0x19;
  NewSpriteFromCICN(T.head, rect, HandleHead);
  insetRect(rect, 6, 6);
  for (const t of [T.bodyPart1, T.bodyPart1, T.bodyPart2, T.bodyPart2]) {
    t.vx = Rand(0xb) - 5;
    t.vy = -0xc - Rand(0xc);
    NewSpriteFromCICN(t, rect, HandleBodyPart);
  }
}

function bloodTrail(s) {
  if (GetBloodPref() === 0) MakeSparks(s.rect.left + 0x10, s.rect.top, 3, 2, 6, 3, 0xcd, 1, 2, 2);
  else if (GetBloodPref() === 2) MakeSparks(s.rect.left + 0x10, s.rect.top, 3, 2, 6, 3, 0x45, 1, 2, 2);
}

function fall(s) {
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  bloodTrail(s);
}

function HandleBodyPart(s) {
  fall(s);
  if (!OnScreen(s, 1)) KillSprite(s);
}

// Keeps Corpse below the world, under the head, until the head has fallen past y 1500.
function HandleHead(s) {
  fall(s);
  if (s.rect.top > 0x5dc) {
    NewFake(s.info[1]);
    KillSprite(s);
  }
  SetSpriteRect(s.info[1], { top: 1000, left: s.rect.left, bottom: 0x408, right: s.rect.right });
}

// The new Corpse: rises out of the ground at a random spot, 1 px a frame; when fully up, the real
// Corpse is put there and the fake goes.
function NewFake(num) {
  const x = Rand(0x3e0);
  T.fake.info[1] = num;
  NewSpriteFromCICN(T.fake, setRect({}, x, 0x300, x + 0x20, 800), HandleFake);
}

function HandleFake(s) {
  s.dir = GetSpriteDirection(s.info[1]);
  s.frame = s.dir === 0 ? 0 : 1;
  offsetRect(s.rect, 0, -1);
  SetSpriteRect(s.info[1], { top: 1000, left: s.rect.left, bottom: 0x408, right: s.rect.right });
  if (s.rect.bottom < 0x301) {
    SetSpriteRect(s.info[1], s.rect);
    SetSpriteAction2(s.info[1], 2);
    SetSpriteAction1(s.info[1], 2);
    KillSprite(s);
  }
}

// ---- Dark Beam --------------------------------------------------------------------------------------

// Mech's Power Blast, but a hit freezes the opponent for 200 frames instead of hurting.
// Original quirk (as Mech's): the callers pass the direction as the beam's group id (info3).
export function NewDarkBeam(r, oppIndex, num, group) {
  T.darkBeam.info[1] = oppIndex;
  T.darkBeam.info[2] = num;
  T.darkBeam.info[3] = group;
  T.darkBeam.dir = GetSpriteDirection(num);
  T.darkBeam.info[7] = 1;
  const rect = { ...r };
  offsetRect(rect, GetSpriteDirection(num) === 0 ? 0x19 : -0x19, 0);
  NewSpriteFromCICN(T.darkBeam, rect, HandleDarkBeam);
}

function NewDarkBeam2(r, oppIndex, num, group, dir, armed) {
  T.darkBeam.info[1] = oppIndex;
  T.darkBeam.info[2] = num;
  T.darkBeam.info[3] = group;
  T.darkBeam.info[7] = armed;
  T.darkBeam.dir = dir;
  const rect = { ...r };
  offsetRect(rect, dir === 0 ? 0x20 : -0x20, 0);
  NewSpriteFromCICN(T.darkBeam, rect, HandleDarkBeam);
}

function forBeam(s, fn) {
  for (let i = 0; i < 200; i++) {
    if (GetSpriteInUse(i) && GetSpritePicID(i) === s.type && GetSpriteInfo(i, 3) === s.info[3]) fn(i);
  }
}

function darkBeamHit(s, opp, o) {
  if (!detectCollision(s.rect, o, 0, 0, 2, 2) || s.info[7] === 0) return;
  SetSpriteInfo(opp, 4, GetSpriteFrame(opp));
  SetSpriteInfo(opp, 2, 0);
  NewIceCube(opp);
  SetSpriteInfo(opp, 7, 200);
  SetSpriteInfo(opp, 2, 0);
  SetSpriteAction1(opp, 0x12);
  SetSpriteAction2(opp, 2);
  forBeam(s, (i) => SetSpriteInfo(i, 7, 0));
}

function HandleDarkBeam(s) {
  if (s.rect.right < 0x421 && s.rect.left > -0x21) {
    const opp = GetOpp(s.info[1], s.rect, s.info[2]);
    const o = GetSpriteRect(opp);
    if (s.action2 === 0) {
      darkBeamHit(s, opp, o);
      s.action2 = 1;
    } else if (s.action2 === 1) {
      NewDarkBeam2(s.rect, s.info[1], s.info[2], s.info[3], s.dir, s.info[7]);
      darkBeamHit(s, opp, o);
      s.action2 = 2;
    } else {
      darkBeamHit(s, opp, o);
    }
  } else {
    forBeam(s, KillSpriteByNumber);
  }
}

// ---- Bats ----------------------------------------------------------------------------------------------

// Three bats appear in a puff at a random spot and home on the opponent (7 damage each); they
// vanish in a black puff after 180 frames. The appearing puff uses colour 6, which is not
// recovered yet (see isOldColor in gfx.js), so it is not drawn.
export function NewBats(oppIndex, num) {
  T.bat.info[1] = oppIndex;
  T.bat.info[2] = num;
  const x = Rand(0x3e0);
  const y = Rand(0x2e0);
  for (const d of [3, 2, 0, 1]) MakeSparks(x, y, d, 10, 0x14, 7, 6, 0, 2, 2);
  const r = setRect({}, x, y, x + 0x20, y + 0x20);
  for (let i = 0; i < 3; i++) {
    const dv = Rand(0x11); // the original rolls the vertical offset first
    const dh = Rand(0x11);
    offsetRect(r, dh - 8, dv - 8);
    T.bat.vx = Rand(0xb) - 5;
    T.bat.vy = Rand(0xb) - 5;
    NewSpriteFromCICN(T.bat, r, HandleBat);
  }
}

function HandleBat(s) {
  s.info[4] -= 1;
  if (s.info[4] < 1) {
    for (const d of [3, 2, 0, 1]) {
      const x = s.rect.left + Math.trunc((s.rect.left - s.rect.right) / 2);
      const y = s.rect.top + Math.trunc((s.rect.top - s.rect.bottom) / 2);
      MakeSparks(x, y, d, 10, 0x14, 7, 0x21, 0, 2, 2);
    }
    KillSprite(s); // still finishes this frame, as in the original
  }
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  offsetRect(s.rect, s.vx, s.vy);
  s.dir = s.vx < 1 ? 1 : 0;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.dir === 0 && (s.frame < 0 || s.frame > 5)) s.frame = 0;
  if (s.dir === 1 && (s.frame < 6 || s.frame > 0xb)) s.frame = 6;
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
  if (detectCollision(s.rect, t, 5, 5, 2, 2)) {
    KillSprite(s);
    DoDamage(opp, 7, s.info[2]);
    const v = GetSpritePathV(opp);
    const dx = Rand(7);
    SetSpritePath(opp, GetSpritePathH(opp) - dx - 3, v - 3);
    SetSpriteDirection(opp, 1);
    if (GetSpriteAction2(opp) !== 0x11 && GetSpritePicID(opp) !== 500) {
      SetSpriteFrame(opp, 0x22);
      SetSpriteAction2(opp, 5);
    }
    SetSpriteInfo(opp, 2, 0);
  }
}
