// The Tundra's falling snow (NewSnow / HandleSnow) and rolling snowballs (NewSnowBall /
// HandleSnowBall), plus TundraRun, MyRun's per-frame spawns for scene 2.

import { Rand, detectCollision, offsetRect, setRect } from '../mac.js';
import {
  GetNumSpritesType, GetSpriteAction2, GetSpritePathH, GetSpritePathV, GetSpritePicID, GetSpriteRect,
  KillSprite, NewSpriteFromCICN, NewSpriteFromPICT, SetSpriteAction2, SetSpriteFrame, SetSpriteInfo,
  SetSpritePath,
} from '../sprites.js';
import { DoDamage } from '../hud.js';
import { GetNumPlayers, GetPlayMode } from '../state.js';
import { T } from '../templates.js';
import { OnSurface } from './player.js';

const versus = () => GetNumPlayers() === 1 || (GetNumPlayers() === 2 && GetPlayMode() === 0);

// MyRun, scene 2: snow up to 50 flakes (type 154), and the odd snowball.
export function TundraRun() {
  const r = Rand(10000);
  if ((r > 9900 || (GetNumSpritesType(0x9a) < 0x32 && Rand(10000) > 9000)) && GetNumSpritesType(0x9a) < 0x32) NewSnow();
  if (Rand(10000) > 0x2693) NewSnowBall();
}

// ---- snow ----------------------------------------------------------------------------------------

export function NewSnow() {
  const x = Rand(0x3fa);
  const r = setRect({}, x, -6, x + T.snow.frameW, T.snow.frameH - 6);
  T.snow.vy = Rand(3) + 2; // set on the template, as in the original
  NewSpriteFromPICT(T.snow, r, HandleSnow);
}

function HandleSnow(s) {
  offsetRect(s.rect, s.vx, s.vy);
  if (Rand(0x28) > 0x25) s.vx = Rand(3) + s.vx - 1;
  if (s.vx > 2) s.vx = 2;
  if (s.vx < -2) s.vx = -2;
  if (s.rect.top > 0x300) KillSprite(s);
}

// ---- snowballs -----------------------------------------------------------------------------------

function NewSnowBall() {
  const y = Rand(0x218);
  let r;
  if (Rand(2) === 0) {
    r = setRect({}, -0x1c, y + 200, 4, y + 0xe8);
    T.snowBall.vx = T.snowBall.f42 + Rand(7) - 3;
  } else {
    r = setRect({}, 0x3fc, y + 200, 0x41c, y + 0xe8);
    T.snowBall.vx = (Rand(7) - 3) - T.snowBall.f42;
  }
  NewSpriteFromCICN(T.snowBall, r, HandleSnowBall);
}

function snowBallHit(s, p) {
  if (!detectCollision(GetSpriteRect(p), s.rect, 2, 2, 2, 2)) return;
  DoDamage(p, 0x19, -1);
  KillSprite(s);
  const v = GetSpritePathV(p);
  const dx = Rand(7);
  SetSpritePath(p, GetSpritePathH(p) - dx - 3, v - 9);
  if (GetSpriteAction2(p) !== 0x11 && GetSpritePicID(p) !== 500) {
    SetSpriteFrame(p, 0x22);
    SetSpriteAction2(p, 5);
  }
  SetSpriteInfo(p, 2, 0);
}

function HandleSnowBall(s) {
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 3) s.frame = 0;
  // Bounce: OnSurface may also lift the snowball onto a ledge. vy × −0.75, truncated (fctiwz).
  if (OnSurface(s.rect, s.num) || s.rect.bottom > 0x300 || s.rect.top < 0) s.vy = Math.trunc(s.vy * -0.75);
  if (s.rect.left > 0x400 || s.rect.right < 0) KillSprite(s);
  // Original quirk: every player is still tested after the snowball has been killed this frame,
  // so one snowball can hit two fighters at once.
  const players = versus() ? [0, 1] : [0, 1, 2, 3];
  for (const p of players) snowBallHit(s, p);
}
