// The sprite table: 200 slots of the original's 100-byte Sprite struct.
//
// Field names follow the original layout: f42 = speed, f56 = animation counter, f58 =
// animation delay, f5a/f5c = AI state, f5e = character index, f60 = special flag.

import { bctx, buffer, cicnStrip, copyBits, pictStrip, sctx } from './gfx.js';
import { copyRect, offsetRect } from './mac.js';
import { IsCameraSprite, IsCameraSprite2, KillCamera, KillCamera2, RectVisible, WorldToLocal } from './camera.js';
import { drawOverlays, renderBackground } from './render.js';

function blank() {
  return {
    image: null, nframes: 0, frame: 0, inUse: 0, f08: 0,
    rect: { top: 0, left: 0, bottom: 0, right: 0 },
    oldRect: { top: 0, left: 0, bottom: 0, right: 0 },
    frameW: 0, frameH: 0, type: 0, proc: null, vy: 0, vx: 0,
    info: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    num: 0, action1: 0, action2: 0, f42: 0, f44: 0, doDraw: 0,
    dir: 0, world: 0, f54: 0, f56: 0, f58: 0, f5a: 0, f5c: 0, f5e: 0, f60: 0, f62: 0,
  };
}

export const gSprites = Array.from({ length: 200 }, blank);

function load(slot, t, rect, proc, strip) {
  const s = gSprites[slot];
  Object.assign(s, t);
  s.info = t.info.slice();
  s.inUse = 1;
  s.proc = proc;
  s.num = slot;
  s.image = strip;
  s.rect = copyRect(rect);
  s.oldRect = copyRect(rect);
  return slot;
}

function firstFree() {
  for (let i = 0; i < 200; i++) if (!gSprites[i].inUse) return i;
  throw new Error('Too many sprites');
}

export function NewSpriteFromCICN(t, rect, proc) {
  const slot = firstFree();
  return load(slot, t, rect, proc, cicnStrip(t.type, t.nframes, t.frameW, t.frameH));
}

export function NewSpriteFromPICT(t, rect, proc) {
  const slot = firstFree();
  return load(slot, t, rect, proc, pictStrip(t.type, t.nframes, t.frameW, t.frameH));
}

// Like NewSpriteFromCICN but into a fixed slot (used for the cursor, slot 199, etc.).
export function NewSpriteFromCICNSpecial(t, rect, proc, slot) {
  firstFree();
  return load(slot, t, rect, proc, cicnStrip(t.type, t.nframes, t.frameW, t.frameH));
}

// LoadSpriteCICN: builds the strip ahead of time (the loading screen).
export function LoadSpriteCICN(t) {
  cicnStrip(t.type, t.nframes, t.frameW, t.frameH);
}

// ---- accessors (same names as the original) ---------------------------------------------------

export const GetSpriteRect = (n) => copyRect(gSprites[n].rect);
export const SetSpriteRect = (n, r) => { const s = gSprites[n]; s.rect = copyRect(r); };
export const GetSpriteAction1 = (n) => gSprites[n].action1;
export const SetSpriteAction1 = (n, v) => { gSprites[n].action1 = v; };
export const GetSpriteAction2 = (n) => gSprites[n].action2;
export const SetSpriteAction2 = (n, v) => { gSprites[n].action2 = v; };
export const GetSpriteDirection = (n) => gSprites[n].dir;
export const SetSpriteDirection = (n, v) => { gSprites[n].dir = v; };
export const GetSpriteFrame = (n) => gSprites[n].frame;
export const SetSpriteFrame = (n, v) => { gSprites[n].frame = v; };
export const GetSpriteInfo = (n, i) => gSprites[n].info[i];
export const SetSpriteInfo = (n, i, v) => { gSprites[n].info[i] = v; };
export const GetSpritePathH = (n) => gSprites[n].vx;
export const GetSpritePathV = (n) => gSprites[n].vy;
export const SetSpritePath = (n, h, v) => { gSprites[n].vx = h; gSprites[n].vy = v; };
export const MoveSprite = (n, dh, dv) => offsetRect(gSprites[n].rect, dh, dv);
export const GetSpritePicID = (n) => gSprites[n].type;
export const GetSpriteInUse = (n) => gSprites[n].inUse;
export const SetSpriteProcPtr = (n, p) => { gSprites[n].proc = p; };

export function KillSprite(s) {
  s.inUse = 0;
}

export function KillSpriteByNumber(n) {
  gSprites[n].inUse = 0;
  if (IsCameraSprite(n)) KillCamera();
  if (IsCameraSprite2(n)) KillCamera2();
}

export function KillAllSprites() {
  for (const s of gSprites) s.inUse = 0;
}

export function GetNumSprites() {
  let n = 0;
  for (const s of gSprites) if (s.inUse === 1) n++;
  return n;
}

export function GetNumSpritesType(type) {
  let n = 0;
  for (const s of gSprites) if (s.inUse === 1 && s.type === type) n++;
  return n;
}

export function GetNumSpritesTypeInfo3(type, v) {
  let n = 0;
  for (const s of gSprites) if (s.inUse === 1 && s.type === type && s.info[3] === v) n++;
  return n;
}

// ---- per-frame update and drawing ------------------------------------------------------------

// Procs run in slot order; types 500 (practice dummy) and 0x14c run in a second pass.
// A proc may return a promise (a fighter's death can start the next round from inside it).
export async function HandleSprites() {
  for (let i = 0; i < 200; i++) {
    const s = gSprites[i];
    if (s.inUse && s.type !== 500 && s.type !== 0x14c && s.proc) {
      const r = s.proc(s);
      if (r && r.then) await r;
    }
  }
  for (let i = 0; i < 200; i++) {
    const s = gSprites[i];
    if (s.inUse && (s.type === 500 || s.type === 0x14c) && s.proc) {
      const r = s.proc(s);
      if (r && r.then) await r;
    }
  }
}

function drawSprite(s) {
  const src = { left: s.frame * s.frameW, top: 0, right: s.frame * s.frameW + s.frameW, bottom: s.frameH };
  const dst = copyRect(s.rect);
  if (s.world) WorldToLocal(dst);
  copyBits(bctx, s.image, src, dst);
}

export function RenderSprites() {
  renderBackground();
  for (const s of gSprites) {
    if (s.inUse && RectVisible(s.rect) && s.doDraw && s.type === 0x434) drawSprite(s);
  }
  for (const s of gSprites) {
    if (s.inUse && RectVisible(s.rect) && s.doDraw && s.type !== 0x434) drawSprite(s);
  }
  drawOverlays();
  BufferToScreen();
}

export function DrawSprites() {
  RenderSprites();
}


export function BufferToScreen() {
  sctx.drawImage(buffer, 0, 0);
}
