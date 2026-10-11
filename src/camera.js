// Cameras: the view rect into the 1024x768 world, and how it follows the fighters.

import { copyRect, idiv, insetRect, offsetRect, ptInRect, sectRect, setRect } from './mac.js';
import { worldRect } from './gfx.js';
import { GetSpritePicID, GetSpriteRect } from './sprites.js';

export const view = { top: 0, left: 0, bottom: 480, right: 640 }; // 0x100400b0
export const view2 = { top: 0, left: 0, bottom: 480, right: 320 }; // 0x100400b8 (split screen)
export const cam = {
  handle: 0, // camera following on/off (DoHandleCamera / DontHandleCamera)
  sprite: 0x29a, // camera 1 sprite (0x1003d9ac)
  sprite2: 0x29a, // camera 2 sprite
  pic: 0, pic2: 0, // their picIDs when set up
  speed: 0, // smooth-follow speed (0x100400c0)
  renderOption: 0, // 0 whole back, 1 view rect, 2 tiles
  split: 0,
  mid: { h: 0, v: 0 }, // CalcDistance midpoint
  dist: { h: 0, v: 0 },
};

export function SetRenderOptions(option, split) {
  cam.renderOption = option;
  cam.split = split;
  if (split === 0) setRect(view, 0, 0, 640, 480);
  else {
    setRect(view, 0, 0, 320, 480);
    setRect(view2, 0, 0, 320, 480);
  }
}

export function GetSplit() {
  return cam.split;
}

export function InitCamera() {
  setRect(view, 0, 0, 640, 480);
}

export function DontHandleCamera() {
  cam.handle = 0;
  InitCamera();
}

export function DoHandleCamera() {
  cam.handle = 1;
  ResetVisRects();
}

export function ResetVisRects() {
  const a = GetSpriteRect(cam.sprite);
  setRect(view, a.left, a.top, a.right, a.bottom);
  insetRect(view, -144, -224);
}

export function SetCameraUp(sprite, pic, speed) {
  cam.sprite = sprite;
  cam.pic = pic;
  cam.speed = speed;
}

export function SetCameraUp2(sprite, pic) {
  cam.sprite2 = sprite;
  cam.pic2 = pic;
}

export function KillCamera() { cam.sprite = 0x29a; }
export function KillCamera2() { cam.sprite2 = 0x29a; }

export function IsCameraSprite(n) {
  return cam.sprite === n && GetSpritePicID(n) === cam.pic ? 1 : 0;
}

export function IsCameraSprite2(n) {
  return cam.sprite2 === n && GetSpritePicID(n) === cam.pic2 ? 1 : 0;
}

// Move the view and keep it inside the world.
export function OffCamera(dh, dv) {
  offsetRect(view, dh, dv);
  if (worldRect.right < view.right) offsetRect(view, worldRect.right - view.right, 0);
  if (view.left < worldRect.left) offsetRect(view, worldRect.left - view.left, 0);
  if (worldRect.bottom < view.bottom) offsetRect(view, 0, worldRect.bottom - view.bottom);
  if (view.top < worldRect.top) offsetRect(view, 0, worldRect.top - view.top);
}

// The same for the second (split-screen) view.
export function OffCamera2(dh, dv) {
  offsetRect(view2, dh, dv);
  if (worldRect.right < view2.right) offsetRect(view2, worldRect.right - view2.right, 0);
  if (view2.left < worldRect.left) offsetRect(view2, worldRect.left - view2.left, 0);
  if (worldRect.bottom < view2.bottom) offsetRect(view2, 0, worldRect.bottom - view2.bottom);
  if (view2.top < worldRect.top) offsetRect(view2, 0, worldRect.top - view2.top);
}

export function GetVisRect() {
  return copyRect(view);
}

export function RectVisible(r) {
  return sectRect(view, r) ? 1 : 0;
}

export function RectVisible2(r) {
  return cam.split && sectRect(view2, r) ? 1 : 0;
}

export function PointVisible(h, v) {
  return ptInRect(h, v, view) ? 1 : 0;
}

export function PointVisible2(h, v) {
  return cam.split && ptInRect(h, v, view2) ? 1 : 0;
}

export function WorldToLocal(r) {
  offsetRect(r, -view.left, -view.top);
}

function centre(a, b) {
  return a + idiv(b - a, 2);
}

// Smooth follow used by the title, options and selection screens.
export function HandleCamera() {
  if (!cam.handle || cam.sprite === 0x29a) return;
  const r = GetSpriteRect(cam.sprite);
  const sp = cam.speed;
  if (view.left + 320 < centre(r.left, r.right)) {
    if (view.right < r.right) OffCamera(sp + (r.right - view.right), 0);
    else if (centre(r.left, r.right) < view.left + sp + 320) OffCamera(centre(r.left, r.right) - (view.left + 320), 0);
    else OffCamera(sp, 0);
  }
  if (centre(r.left, r.right) < view.left + 320) {
    if (r.left < view.left) OffCamera(r.left - view.left, 0);
    else if (view.left + 320 - sp < centre(r.left, r.right)) OffCamera(-((view.left + 320) - centre(r.left, r.right)), 0);
    else OffCamera(-sp, 0);
  }
  if (view.top + 240 < centre(r.top, r.bottom)) {
    if (view.bottom < r.bottom) OffCamera(0, r.bottom - view.bottom);
    else if (centre(r.top, r.bottom) < view.top + sp + 240) OffCamera(0, centre(r.top, r.bottom) - (view.top + 240));
    else OffCamera(0, sp);
  }
  if (centre(r.top, r.bottom) < view.top + 240) {
    if (r.top < view.top) OffCamera(0, r.top - view.top);
    else if (view.top + 240 - sp < centre(r.top, r.bottom)) OffCamera(0, -((view.top + 240) - centre(r.top, r.bottom)));
    else OffCamera(0, -sp);
  }
}

export function HandleCameraSplit() {
  // Split-screen camera: only used with two human players (not part of this build yet).
}

function CalcDistance() {
  const a = GetSpriteRect(cam.sprite);
  const b = GetSpriteRect(cam.sprite2);
  if (a.left + 16 < b.left + 16) {
    cam.dist.h = b.left - a.right;
    cam.mid.h = a.right + idiv(cam.dist.h, 2);
  } else {
    cam.dist.h = a.left - b.right;
    cam.mid.h = b.right + idiv(cam.dist.h, 2);
  }
  if (a.top + 16 < b.top + 16) {
    cam.dist.v = b.top - a.bottom;
    cam.mid.v = a.bottom + idiv(cam.dist.v, 2);
  } else {
    cam.dist.v = a.top - b.bottom;
    cam.mid.v = b.bottom + idiv(cam.dist.v, 2);
  }
}

export function HandleSingleCamera() {
  if (cam.sprite2 === 0x29a) {
    const r = GetSpriteRect(cam.sprite);
    const h = centre(r.left, r.right), v = centre(r.top, r.bottom);
    setRect(view, h, v, h, v);
  } else {
    setRect(view, cam.mid.h, cam.mid.v, cam.mid.h, cam.mid.v);
  }
  view.left -= 320; view.right += 320; view.top -= 240; view.bottom += 240;
  OffCamera(0, 0);
}

export function HandleCameras() {
  if (cam.sprite !== 0x29a && cam.sprite2 !== 0x29a) {
    if (cam.pic === GetSpritePicID(cam.sprite) && cam.pic2 === GetSpritePicID(cam.sprite2)) {
      CalcDistance();
      cam.split = cam.dist.h < 641 && cam.dist.v < 481 ? 0 : 1;
    }
  }
  if (cam.split === 0) HandleSingleCamera();
  // split screen (two humans far apart) is not part of this build yet
}
