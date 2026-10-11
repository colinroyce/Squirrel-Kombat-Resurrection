// Ninja (character 4): HandleNinja and his specials — the Magnet on a chain (drags the opponent
// back frozen), Vanish (reappears somewhere at random), Ninja Stars and the Decoy (he leaves a
// decoy, the camera follows it, and he drops onto the opponent 3 seconds later).

import { Rand, detectCollision, insetRect, offsetRect, setRect } from '../mac.js';
import { GetNumPlayers } from '../state.js';
import {
  GetSpriteAction2, GetSpriteDirection, GetSpriteFrame, GetSpriteInfo, GetSpriteInUse, GetSpritePicID,
  GetSpriteRect, KillSprite, KillSpriteByNumber, NewSpriteFromCICN, SetSpriteAction1, SetSpriteAction2,
  SetSpriteFrame, SetSpriteInfo, SetSpritePath, SetSpriteRect,
} from '../sprites.js';
import { SetCameraUp, SetCameraUp2 } from '../camera.js';
import { DoDamage } from '../hud.js';
import { T } from '../templates.js';
import { DoNothing, KeepSpriteOnScreen, OnScreen } from '../common.js';
import { GetOpp, HandlePlayer, HandlePlayer2, OnSurface } from './player.js';
import { HandleDeadPlayer } from './game.js';
import { HandleAI, isCPU } from './chars.js';

export async function HandleNinja(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    const o = GetSpriteRect(opp);
    if (s.action2 === 0xe) { // vanish: frames up, jump to a random spot, frames back down
      // Original quirk: sets his animation delay to 3 for good (2 for every other fighter).
      s.f58 = 3;
      if (s.info[5] === 0) {
        s.f56 += 1;
        if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
        if (s.frame === 0x3f || s.frame === 0x43) {
          const x = Rand(0x3e0);
          const y = Rand(0x2e0);
          setRect(s.rect, x, y, x + 0x20, y + 0x20);
          s.info[5] = 1;
        }
      } else {
        s.f56 += 1;
        if (s.f58 < s.f56) { s.frame -= 1; s.f56 = 0; }
        if (s.frame === 0x3c || s.frame === 0x40) {
          s.action2 = 3;
          s.vx = 0;
          s.vy = 0;
        }
      }
    } else if (s.action2 === 0xf) { // decoy: gone for 90 frames, then leaps up from the opponent's spot
      s.info[7] += 1;
      if (s.info[7] < 0x5b) {
        setRect(s.rect, 0, 0, 0, 0);
      } else {
        setRect(s.rect, 0, 0x300, 0, 0x300);
        SetSpriteRect(s.num, o);
        SetSpriteAction2(s.num, 3);
        SetSpritePath(s.num, 0, -0x12);
      }
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

// The four specials (CheckMoves1 uses n = 0; DoSpecialMove the CPU's slot).
export function NinjaSpecial(n, move) {
  const r = GetSpriteRect(n);
  if (GetSpriteAction2(n) === 5) return;
  if (move === 0) {
    if (OnSurface(r, n)) {
      SetSpriteAction2(n, 0xd);
      NewMagnet(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    }
  } else if (move === 1) {
    SetSpriteAction2(n, 0xe);
    SetSpriteAction1(n, 0xe);
    SetSpriteInfo(n, 5, 0);
    SetSpriteFrame(n, GetSpriteDirection(n) === 0 ? 0x3c : 0x40);
  } else if (move === 2) {
    NewNinjaStars(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
  } else if (move === 3) {
    if (OnSurface(r, n)) {
      NewNinjaDecoy(n);
      SetSpriteAction2(n, 0xf);
      // Original quirk: parks him above sprite 1's spot (the opponent only when he is slot 0).
      const p = GetSpriteRect(1);
      p.top = 0xa8;
      p.bottom = 200;
      SetSpriteInfo(n, 7, 0);
      SetSpriteRect(n, p);
    }
  }
}

// ---- Magnet --------------------------------------------------------------------------------------

function NewMagnet(r, oppIndex, num, dir) {
  T.magnet.info[1] = oppIndex;
  T.magnet.info[2] = num;
  T.magnet.info[3] = num;
  T.magnet.dir = dir;
  const rect = { ...r };
  insetRect(rect, 0, 0xc);
  offsetRect(rect, dir === 0 ? 8 : -8, 0);
  NewSpriteFromCICN(T.magnet, rect, HandleMagnet);
}

function NewChain(r, group) {
  T.chain.info[3] = group;
  NewSpriteFromCICN(T.chain, r, DoNothing);
}

function killChain(group) {
  for (let i = 0; i < 200; i++) {
    if (GetSpriteInUse(i) && GetSpritePicID(i) === 0x1d9 && GetSpriteInfo(i, 3) === group) KillSpriteByNumber(i);
  }
}

// Flies out leaving a chain link every other frame; at the screen edge or the opponent it comes
// back, gathering the chain. If it caught the opponent, it carries them frozen (90 frames).
// It all goes if Ninja leaves the ground; while it is out his keys do nothing (CheckKeyDown).
function HandleMagnet(s) {
  const ninja = GetSpriteRect(s.info[2]);
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  if (s.action1 === 0) {
    if (s.info[4] === 0) {
      NewChain(s.rect, s.info[3]);
      s.info[4] = 1;
    } else {
      s.info[4] = 0;
    }
    if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
    else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
    s.frame = s.dir === 0 ? 0 : 1;
    if (!OnScreen(s, 1) || detectCollision(s.rect, o, 0, 0, 0, 0)) {
      s.action1 = 1;
      if (detectCollision(s.rect, o, 0, 0, 0, 0)) {
        s.info[7] = 1;
        s.info[6] = opp;
      }
    }
  } else {
    if (s.f42 > 0) s.f42 = -s.f42;
    if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
    else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
    s.frame = s.dir === 0 ? 0 : 1;
    for (let i = 0; i < 200; i++) {
      if (GetSpriteInUse(i) && GetSpritePicID(i) === 0x1d9 && GetSpriteInfo(i, 3) === s.info[3] &&
        detectCollision(s.rect, GetSpriteRect(i), 0, 0, 0, 0)) KillSpriteByNumber(i);
    }
    if (detectCollision(GetSpriteRect(s.info[3]), s.rect, 8, 0, 8, 0)) {
      KillSprite(s);
      SetSpriteAction2(s.info[3], 2);
    }
    if (s.info[7] !== 0) {
      const c = { ...s.rect };
      insetRect(c, 0, -0xc);
      offsetRect(c, s.dir === 0 ? 0x10 : -0x10, 0);
      SetSpriteRect(s.info[6], c);
      SetSpriteInfo(opp, 4, GetSpriteFrame(opp));
      SetSpriteInfo(opp, 2, 0);
      SetSpriteAction1(opp, 0x12);
      SetSpriteAction2(opp, 2);
      SetSpriteInfo(s.info[6], 7, 0x5a);
    }
  }
  if (!OnSurface(ninja, s.info[2])) {
    killChain(s.info[3]);
    KillSprite(s);
  }
}

// ---- Ninja Stars ------------------------------------------------------------------------------------

function NewNinjaStars(r, oppIndex, num, dir) {
  T.ninjaStar.info[1] = oppIndex;
  T.ninjaStar.info[2] = num;
  T.ninjaStar.info[3] = num;
  T.ninjaStar.dir = dir;
  const rect = { ...r };
  insetRect(rect, 8, 8);
  if (dir === 0) {
    offsetRect(rect, 8, 0);
    T.ninjaStar.vx = T.ninjaStar.f42;
  } else {
    offsetRect(rect, -8, 0);
    T.ninjaStar.vx = -T.ninjaStar.f42;
  }
  for (const vy of [-3, 0, -1]) {
    T.ninjaStar.vy = vy;
    NewSpriteFromCICN(T.ninjaStar, rect, HandleNinjaStar);
  }
}

function HandleNinjaStar(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  offsetRect(s.rect, s.vx, s.vy);
  if (detectCollision(s.rect, o, 2, 2, 2, 2)) {
    DoDamage(opp, 0xf, s.info[2]);
    if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
    // (the original tests the opponent's direction here but sets frame 0x17 either way)
    SetSpriteFrame(opp, 0x17);
    SetSpriteInfo(opp, 2, 0);
    KillSprite(s);
  }
  if (!OnScreen(s, 1)) KillSprite(s);
}

// ---- Decoy ------------------------------------------------------------------------------------------

function NewNinjaDecoy(n) {
  T.ninjaDecoy.frame = GetSpriteDirection(n) !== 0 ? 1 : 0;
  T.ninjaDecoy.info[3] = n;
  const slot = NewSpriteFromCICN(T.ninjaDecoy, GetSpriteRect(n), HandleNinjaDecoy);
  if (n === 0) SetCameraUp(slot, T.ninjaDecoy.type, 0x20);
  else if (n === 1 && GetNumPlayers() === 2) SetCameraUp2(slot, T.ninjaDecoy.type, 0x20);
}

// Stands there until Ninja is back on the ground, gives the camera back, and goes 30 frames later.
function HandleNinjaDecoy(s) {
  if (s.info[0] === 0) {
    if (OnSurface(GetSpriteRect(s.info[3]), s.info[3])) {
      if (s.info[3] === 0) SetCameraUp(0, GetSpritePicID(0), 0x20);
      else if (s.info[3] === 1 && GetNumPlayers() === 2) SetCameraUp2(1, GetSpritePicID(1), 0x20);
      s.info[0] = 0x1e;
    }
  } else {
    s.info[0] -= 1;
    if (s.info[0] < 1) KillSprite(s);
  }
}
