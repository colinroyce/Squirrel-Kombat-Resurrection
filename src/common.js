// Helpers shared by the screens and the fight.

import { Delay, detectCollision, offsetRect, untilTick } from './mac.js';
import { worldRect } from './gfx.js';
import { GetMouse, Button } from './input.js';
import { RectVisible, RectVisible2 } from './camera.js';
import { DrawSprites, GetNumSprites, HandleSprites, KillSprite, NewSpriteFromCICNSpecial, SetSpritePath, SetSpriteProcPtr } from './sprites.js';
import { MakeSparks, KillSparks } from './sparks.js';
import { PlaySound } from './sound.js';
import { GetBloodPref, GetSuperBlood } from './state.js';
import { T } from './templates.js';

// Loops in the original that have no frame limiter ran as fast as the Mac could draw; they are
// run at 60 frames per second here.
export function uncappedFrame() {
  return Delay(1);
}

// OnScreen(s, 0): visible in a camera; OnScreen(s, 1): still inside the world.
export function OnScreen(s, mode) {
  if (mode === 0) return RectVisible(s.rect) || RectVisible2(s.rect) ? 1 : 0;
  return detectCollision(s.rect, worldRect, 0, 0, 0, 0);
}

// Push a sprite back inside the world on the right, left and bottom (not the top).
export function KeepSpriteOnScreen(s) {
  if (worldRect.right < s.rect.right) offsetRect(s.rect, worldRect.right - s.rect.right, 0);
  if (s.rect.left < worldRect.left) offsetRect(s.rect, worldRect.left - s.rect.left, 0);
  if (worldRect.bottom < s.rect.bottom) offsetRect(s.rect, 0, worldRect.bottom - s.rect.bottom);
}

export function DoNothing(s) {
  s.frame = s.frame; // eslint-disable-line no-self-assign
}

// The animated cursor (cicn 7000) lives in slot 199 and drips blood when blood is red.
export function NewCursorSprite() {
  const m = GetMouse();
  const r = { top: m.v, left: m.h, bottom: m.v + 32, right: m.h + 32 };
  NewSpriteFromCICNSpecial(T.cursor, r, HandleCursor, 199);
}

export function HandleCursor(s) {
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.frame < 0 || s.frame > 5) s.frame = 0;
  const m = GetMouse();
  s.rect.top = m.v - 4;
  s.rect.left = m.h - 16;
  s.rect.bottom = m.v + 28;
  s.rect.right = m.h + 16;
  Button();
  if (GetBloodPref() === 0) {
    if (GetSuperBlood() === 0) MakeSparks(m.h - 16 + 18, m.v - 4 + 28, 2, 2, 20, 1, 0xcd, 1, 2, 2);
    else MakeSparks(m.h - 16 + 18, m.v - 4 + 28, 2, 12, 38, 1, 0xcd, 1, 3, 3);
  }
}

// Everything on screen falls away (16 px per frame) before a screen change.
export function HandleDeadControl(s) {
  offsetRect(s.rect, 0, 16);
  if (!RectVisible(s.rect)) KillSprite(s);
}

export async function KillSpriteControls() {
  PlaySound(15);
  KillSparks();
  for (let i = 0; i < 200; i++) {
    SetSpriteProcPtr(i, HandleDeadControl);
    SetSpritePath(i, 0, 10);
  }
  for (;;) {
    const none = GetNumSprites() === 0;
    DrawSprites();
    await HandleSprites();
    if (none) break;
    await uncappedFrame();
  }
}

// The per-frame wait used by every game loop: until 2 ticks after `start` (30 fps).
export function nextFrame(start) {
  return untilTick(start + 2);
}
