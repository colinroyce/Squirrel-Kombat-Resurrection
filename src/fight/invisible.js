// Invisible (character 3): HandleInvisible and his specials — Invisibility, the Boxing Glove,
// a Fire Ball (Speedy's) and an Ice Ball (Ice's blast).

import { detectCollision, offsetRect } from '../mac.js';
import {
  GetSpriteAction2, GetSpriteDirection, GetSpriteRect, KillSprite, MoveSprite, NewSpriteFromCICN,
  SetSpriteAction2, SetSpriteFrame, SetSpriteInfo,
} from '../sprites.js';
import { DoDamage } from '../hud.js';
import { T } from '../templates.js';
import { KeepSpriteOnScreen, OnScreen } from '../common.js';
import { GetOpp, HandlePlayer, HandlePlayer2 } from './player.js';
import { HandleDeadPlayer } from './game.js';
import { HandleAI, HandleFireBall, isCPU } from './chars.js';
import { HandleIceBlast } from './ice.js';

// Invisibility (action2 0xd, info5 = 11): he flickers for 11 frames. The flicker toggles doDraw
// an odd number of times, so he ends up not drawn, and stays unseen until he is hit
// (HandlePlayer2 sets doDraw again). f60 tells the AI he has used it.
export async function HandleInvisible(s) {
  const opp = GetOpp(s.info[1], s.rect, s.num);
  if (s.action2 === 0x11) {
    await HandleDeadPlayer(s);
  } else {
    if (isCPU(s)) HandleAI(s);
    HandlePlayer(s);
    GetSpriteRect(opp);
    if (s.action2 === 0xd) {
      s.f60 = 1;
      s.info[5] -= 1;
      if (s.info[5] < 1) s.action2 = 3;
      s.doDraw = s.doDraw === 0 ? 1 : 0;
    }
    HandlePlayer2(s);
  }
  KeepSpriteOnScreen(s);
}

// ---- Boxing Glove ----------------------------------------------------------------------------

export function NewInvBoxGlove(r, oppIndex, num, dir) {
  T.invBoxGlove.info[1] = oppIndex;
  T.invBoxGlove.info[2] = num;
  T.invBoxGlove.dir = dir;
  NewSpriteFromCICN(T.invBoxGlove, r, HandleInvBoxGlove);
}

// Flies across the screen and doesn't stop on a hit: it shoves the opponent along with it,
// 2 damage every frame they touch.
export function HandleInvBoxGlove(s) {
  const opp = GetOpp(s.info[1], s.rect, s.info[2]);
  const o = GetSpriteRect(opp);
  s.frame = s.dir === 0 ? 0 : 1;
  if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
  else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
  if (detectCollision(s.rect, o, 2, 2, 2, 2)) {
    DoDamage(opp, 2, s.info[2]);
    if (GetSpriteAction2(opp) !== 0x11) SetSpriteAction2(opp, 5);
    // (the original tests the opponent's direction here but sets frame 0x17 either way)
    if (GetSpriteDirection(opp) === 0) SetSpriteFrame(opp, 0x17);
    else SetSpriteFrame(opp, 0x17);
    if (s.dir === 0) MoveSprite(opp, s.f42 - 2, 0);
    else MoveSprite(opp, 2 - s.f42, 0);
    SetSpriteInfo(opp, 2, 0);
  }
  if (!OnScreen(s, 1)) KillSprite(s);
}

// ---- Fire Ball and Ice Ball (Speedy's and Ice's handlers, his own pictures) -------------------

export function NewInvFireBall(r, oppIndex, num, dir) {
  T.invFireBall.info[1] = oppIndex;
  T.invFireBall.info[2] = num;
  T.invFireBall.dir = dir;
  NewSpriteFromCICN(T.invFireBall, r, HandleFireBall);
}

export function NewInvIceBall(r, oppIndex, num, dir, group) {
  T.invIceBall.info[1] = oppIndex;
  T.invIceBall.info[2] = num;
  T.invIceBall.info[3] = group;
  T.invIceBall.dir = dir;
  NewSpriteFromCICN(T.invIceBall, r, HandleIceBlast);
}
