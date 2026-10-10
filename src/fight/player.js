// The fighter state machine shared by every character: HandlePlayer (moves and attacks),
// HandlePlayer2 (being hit / frozen), OnSurface, GetOpp, plus the dead-fighter handler.

import { Rand, detectCollision, offsetRect } from '../mac.js';
import {
  GetSpriteAction2, GetSpriteDirection, GetSpritePathH, GetSpritePathV, GetSpriteRect, MoveSprite,
  SetSpriteAction2, SetSpriteDirection, SetSpriteFrame, SetSpriteInfo, SetSpritePath,
} from '../sprites.js';
import { MakeSparks } from '../sparks.js';
import { PlaySound } from '../sound.js';
import { DoDamage } from '../hud.js';
import { GetBloodPref, GetNumPlayers, GetPlayMode, GetScene, GetSuperBlood } from '../state.js';
import { KeepSpriteOnScreen } from '../common.js';
import { plats } from './forest.js';

const versus = () => GetNumPlayers() === 1 || (GetNumPlayers() === 2 && GetPlayMode() === 0);

// ---- surfaces ------------------------------------------------------------------------------

// OnSurface(rect, num): the world floor, a platform or (Forest) the log. Landing on a platform
// snaps sprite `num` so its bottom sits 1 px into the platform.
export function OnSurface(rect, num) {
  if (rect.bottom > 767) return 1;
  const r = { top: rect.top, left: rect.left, bottom: rect.bottom + 2, right: rect.right };
  if (num === 0 || num === 1 || (GetNumPlayers() === 2 && GetPlayMode() !== 0 && (num === 2 || num === 3))) {
    r.left += 8;
    r.right -= 8;
  }
  for (let i = 0; i < plats.count; i++) {
    const p = plats.rects[i];
    if (detectCollision(r, p, 0, 0, 0, 0) && r.bottom <= p.top + 16 && GetSpritePathV(num) > -1) {
      MoveSprite(num, 0, -((r.bottom - 3) - p.top));
      return 1;
    }
  }
  if (GetScene() === 0) {
    const log = GetSpriteRect(versus() ? 2 : 4);
    if (detectCollision(r, log, 0, 0, 0, 0) && r.bottom <= log.top + 16 && GetSpritePathV(num) > -1) {
      MoveSprite(num, 0, -((r.bottom - 3) - log.top));
      return 1;
    }
  }
  return 0;
}

// ---- opponents -----------------------------------------------------------------------------

export function GetOpp(oppIndex, rect, num) {
  if (GetNumPlayers() === 1 || GetPlayMode() === 0) return oppIndex;
  const tries = num === 0 || num === 1 ? [2, 3] : num === 2 ? [0, 1] : num === 3 ? [1, 0] : [];
  for (const t of tries) if (detectCollision(rect, GetSpriteRect(t), 2, 2, 2, 2)) return t;
  if (oppIndex === 2) {
    if (GetSpriteAction2(num + 2) === 0x11) return num === 0 ? 3 : 2;
    return num === 0 ? 2 : 3;
  }
  if (GetSpriteAction2(num - 2) === 0x11) return num === 2 ? 1 : 0;
  return num === 2 ? 0 : 1;
}

export function PartnerOfMe(n) {
  return n === 0 ? 1 : n === 1 ? 0 : n === 2 ? 3 : n === 3 ? 2 : n;
}

// ---- HandlePlayer --------------------------------------------------------------------------

function anim(s, delay) {
  s.f58 = delay;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
}

function clamp(s, a0, a1, b0, b1) {
  if (s.dir === 0 && (s.frame < a0 || s.frame > a1)) s.frame = a0;
  if (s.dir === 1 && (s.frame < b0 || s.frame > b1)) s.frame = b0;
}

function walkStep(s) {
  if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
  else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
}

function fallIfUnsupported(s) {
  if (!OnSurface(s.rect, s.num)) { s.action2 = 3; s.vx = 0; s.vy = 0; }
}

function reel(opp) {
  if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
}

// A hit that knocks the opponent (h, v) relative to its current path and sets its frame.
function knock(s, opp, h, v, frame0, frame1, checkDead, clearInfo2) {
  reel(opp);
  const dh = s.dir === 0 ? h : -h;
  SetSpritePath(opp, GetSpritePathH(opp) + dh, GetSpritePathV(opp) + v);
  SetSpriteDirection(opp, s.dir === 0 ? 1 : 0);
  if (!checkDead || GetSpriteAction2(opp) !== 0x11) SetSpriteFrame(opp, s.dir === 0 ? frame0 : frame1);
  if (clearInfo2) SetSpriteInfo(opp, 2, 0);
}

function endAttack(s, last0, last1, resetFrame) {
  if ((s.frame === last0 || s.frame === last1) && s.f56 === s.f58) {
    s.action2 = 2;
    if (resetFrame) s.frame = s.dir === 0 ? 1 : 5;
  }
}

export function HandlePlayer(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  const o = GetSpriteRect(opp);
  if (s.vy > 16) s.vy = 16;
  if (s.action2 === 2 && !OnSurface(s.rect, s.num)) { s.action2 = 3; s.vx = 0; s.vy = 0; }
  if (s.action1 === 2) {
    if (s.action2 === 2) {
      anim(s, 10);
      clamp(s, 0, 1, 5, 6);
      if (s.f60 === 0) s.doDraw = 1;
    }
  } else if (s.action1 === 1 && s.action2 !== 0x13) {
    if (s.action2 === 2) {
      anim(s, 2);
      clamp(s, 1, 4, 6, 9);
    }
    if (s.action2 === 3 || s.action2 === 2 || s.action2 === 0xc) walkStep(s);
  }
  // airborne
  if (s.action2 === 3) {
    offsetRect(s.rect, s.vx, s.vy);
    s.vy += 1;
    KeepSpriteOnScreen(s);
    if (!OnSurface(s.rect, s.num)) {
      anim(s, 2);
      clamp(s, 10, 13, 14, 17);
    } else {
      s.action2 = 2; s.vx = 0; s.vy = 0;
    }
  }
  // punch
  if (s.action2 === 4) {
    fallIfUnsupported(s);
    anim(s, 2);
    clamp(s, 0x12, 0x13, 0x14, 0x15);
    if (detectCollision(s.rect, o, 2, 2, 2, 2) && s.f56 === 2) {
      DoDamage(opp, 1, s.num);
      knock(s, opp, 1, -1, 0x17, 0x16, true, false);
    }
    if (s.f56 === 2) s.action2 = 2;
  }
  // kick
  if (s.action2 === 6) {
    fallIfUnsupported(s);
    anim(s, 2);
    clamp(s, 0x18, 0x19, 0x1a, 0x1b);
    if (detectCollision(s.rect, o, 2, 2, 2, 2) && s.f56 === 0) {
      DoDamage(opp, 3, s.num);
      knock(s, opp, 3, -2, 0x17, 0x16, false, false);
    }
    endAttack(s, 0x19, 0x1b, true);
  }
  // uppercut
  if (s.action2 === 7) {
    fallIfUnsupported(s);
    anim(s, 2);
    clamp(s, 0x1c, 0x1e, 0x1f, 0x21);
    if (detectCollision(s.rect, o, 2, 2, 2, 2) && s.f56 === 0 && (s.frame === 0x1e || s.frame === 0x21)) {
      DoDamage(opp, 0x23, s.num);
      knock(s, opp, 8, -20, 0x22, 0x23, false, true);
    }
    endAttack(s, 0x1e, 0x21, true);
  }
  // spin kick
  if (s.action2 === 8) {
    fallIfUnsupported(s);
    anim(s, 2);
    clamp(s, 0x24, 0x27, 0x28, 0x2b);
    if (detectCollision(s.rect, o, 0, 0, 0, 0) && s.f56 === 0 && (s.frame === 0x27 || s.frame === 0x2b)) {
      DoDamage(opp, 0x1e, s.num);
      knock(s, opp, 12, -10, 0x22, 0x23, false, true);
    }
    endAttack(s, 0x27, 0x2b, true);
  }
  // throw (punch during an uppercut)
  if (s.action2 === 10) {
    fallIfUnsupported(s);
    anim(s, 2);
    clamp(s, 0x34, 0x35, 0x36, 0x37);
    if (detectCollision(s.rect, o, 4, 4, 4, 4) && s.f56 === 0 && (s.frame === 0x35 || s.frame === 0x37)) {
      DoDamage(opp, 4, s.num);
      knock(s, opp, -1, -30, 0x22, 0x23, false, true);
      s.action2 = 2;
    }
    endAttack(s, 0x35, 0x37, false);
  }
  // power slam (jump during an uppercut): carry the opponent up for 20 frames, then slam down
  if (s.action2 === 9) {
    offsetRect(s.rect, 0, -15);
    s.info[3] += 1;
    if (s.info[3] < 21) s.frame = s.dir === 0 ? 0x2c : 0x30;
    const carried = (dv) => {
      MoveSprite(opp, 0, dv);
      reel(opp);
      SetSpritePath(opp, 0, 0);
      SetSpriteFrame(opp, GetSpriteDirection(opp === 0 ? 1 : 0) === 0 ? 0x17 : 0x16);
    };
    if (detectCollision(s.rect, o, 2, 2, 2, 2)) carried(-15);
    if (s.info[3] > 20) {
      if (detectCollision(s.rect, o, 2, 2, 2, 2)) carried(15);
      offsetRect(s.rect, 0, 15);
      anim(s, 2);
      clamp(s, 0x2c, 0x2f, 0x30, 0x33);
      if ((s.frame === 0x2d || s.frame === 0x31) && s.f56 === s.f58) {
        if (s.info[4] === 0) {
          s.info[4] = 1;
        } else {
          s.vy = 0;
          s.action2 = 3;
          if (detectCollision(s.rect, o, 2, 2, 2, 2)) {
            DoDamage(opp, 0x19, s.num);
            reel(opp);
            PlaySound(Rand(2) === 0 ? 4 : 3);
            if (s.dir === 0) { SetSpriteFrame(opp, 0x23); SetSpritePath(opp, 8, 10); }
            else { SetSpriteFrame(opp, 0x22); SetSpritePath(opp, -8, 10); }
          }
        }
      }
    }
  }
  // flying side kick (kick in the air)
  if (s.action2 === 0xb) {
    s.frame = s.dir === 0 ? 0x38 : 0x39;
    offsetRect(s.rect, s.vx, s.vy);
    s.vy += 1;
    walkStep(s);
    walkStep(s);
    if (detectCollision(s.rect, o, 0, 4, 0, 2)) {
      DoDamage(opp, 0x12, s.num);
      knock(s, opp, 15, -5, 0x22, 0x23, false, true);
    }
    if (OnSurface(s.rect, s.num)) { s.action2 = 2; s.vx = 0; s.vy = 0; }
  }
  // jump spin kick (spin in the air)
  if (s.action2 === 0xc) {
    anim(s, 2);
    clamp(s, 0x24, 0x27, 0x28, 0x2b);
    if (detectCollision(s.rect, o, 0, 0, 0, 0)) {
      DoDamage(opp, 0x10, s.num);
      knock(s, opp, 12, -10, 0x22, 0x23, false, true);
    }
    offsetRect(s.rect, s.vx, s.vy);
    s.vy += 1;
    KeepSpriteOnScreen(s);
    if (OnSurface(s.rect, s.num)) { s.action2 = 2; s.vx = 0; s.vy = 0; }
  }
}

// ---- HandlePlayer2 -------------------------------------------------------------------------

function bounceWalls(s) {
  if (s.rect.right > 0x400 || s.rect.left < 0) s.vx = Math.trunc(s.vx * -0.75);
}

function blood(s) {
  const pref = GetBloodPref();
  if (pref !== 0 && pref !== 2) return;
  const color = pref === 0 ? 0xcd : 0x45;
  const sup = GetSuperBlood();
  const count = sup ? 12 : 2, life = sup ? 36 : 8, size = sup ? 3 : 2;
  if (s.frame === 0x22 || s.frame === 0x23) {
    if (s.info[2] === 0) {
      if (s.frame === 0x23) MakeSparks(s.rect.left, s.rect.top + 16, s.dir, count, life, 3, color, 1, size, size);
      else MakeSparks(s.rect.left + 32, s.rect.top + 16, s.dir, count, life, 3, color, 1, size, size);
    }
  } else {
    MakeSparks(s.rect.left + 16, s.rect.top, s.dir, count, life, 3, color, 1, size, size);
  }
}

export function HandlePlayer2(s) {
  if (s.action1 === 0x12) {
    s.doDraw = 1;
    s.f60 = 0;
    s.frame = s.info[4];
    offsetRect(s.rect, s.vx, s.vy);
    s.vy += 1;
    bounceWalls(s);
    KeepSpriteOnScreen(s);
    if (OnSurface(s.rect, s.num)) {
      s.vy = Math.trunc(s.vy * -0.5);
      s.info[2] = 1;
      if (Math.abs(s.vy) < 2) { s.vx = 0; s.vy = 0; }
    }
    s.info[7] -= 1;
    if (s.info[7] < 1 || s.action2 === 5) s.action1 = 2;
    return;
  }
  if (s.action2 === 5) {
    s.action1 = 2;
    s.doDraw = 1;
    s.f60 = 0;
    offsetRect(s.rect, s.vx, s.vy);
    s.vy += 1;
    bounceWalls(s);
    KeepSpriteOnScreen(s);
    if (OnSurface(s.rect, s.num)) {
      if (s.frame === 0x22 || s.frame === 0x23) {
        s.vy = Math.trunc(s.vy * -0.5);
        s.info[2] = 1;
        if (Math.abs(s.vy) < 2) { s.action2 = 2; s.vx = 0; s.vy = 0; }
      } else {
        s.action2 = 2;
        s.vx = 0;
        s.vy = 0;
        s.frame = s.dir === 0 ? 0 : 5;
      }
    }
    blood(s);
  }
  s.info[0] += 1;
  if (s.info[0] > 1) { s.action1 = 2; s.info[0] = 0; }
}
