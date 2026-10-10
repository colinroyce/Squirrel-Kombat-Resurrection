// Startup: the Monkey Farm splash (DoStarting) and the loading screen (LoadCharacters).

import { TickCount, offsetRect, setRect, untilTick } from '../mac.js';
import { bctx, eraseRect, fillBackWithPict, fillRect, kctx, mapRGB16, pictCanvas, sctx } from '../gfx.js';
import { Button } from '../input.js';
import { OffCamera, SetRenderOptions } from '../camera.js';
import { BufferToScreen, DrawSprites, LoadSpriteCICN } from '../sprites.js';
import { renderBackground } from '../render.js';
import { PlaySound } from '../sound.js';
import { Fade, FadeBack } from '../fade.js';
import { CHARS } from '../templates.js';

function Render() {
  renderBackground();
}

export async function DoStarting() {
  SetRenderOptions(0, 0);
  OffCamera(-5000, -5000);
  fillBackWithPict(5128, 640, 480);
  Render();
  BufferToScreen();
  await FadeBack(0);
  // "MONKEY FARM": letters 5129..5139 (no 5135, the space) drop in 40 px per tick.
  for (let i = 0; i <= 10; i++) {
    if (i === 6) continue;
    const letter = pictCanvas(5129 + i, 50, 50, true);
    const r = setRect({}, i * 50 + 39 + i, -50, (i + 1) * 50 + 39 + i, 0);
    PlaySound(1);
    while (r.bottom < 220) {
      const start = TickCount();
      Render();
      bctx.drawImage(letter, r.left, r.top);
      BufferToScreen();
      offsetRect(r, 0, 40);
      await untilTick(start + 1);
    }
    kctx.drawImage(letter, r.left, r.top);
  }
  Render();
  BufferToScreen();
  // "SOFTWARE" slides in from the left.
  const soft = pictCanvas(5140, 142, 30, true);
  const r = setRect({}, -142, 250, 0, 280);
  offsetRect(r, 11, 0);
  PlaySound(1);
  while (r.left + 71 < 320) {
    const start = TickCount();
    Render();
    bctx.drawImage(soft, r.left, r.top);
    BufferToScreen();
    offsetRect(r, 40, 0);
    await untilTick(start + 1);
  }
  kctx.drawImage(soft, r.left, r.top);
  if (!Button()) {
    PlaySound(0);
    await untilTick(TickCount() + 300);
  }
  await Fade(1);
  eraseRect(bctx, setRect({}, 0, 0, 640, 480));
  BufferToScreen();
  await FadeBack(1);
  await Fade(0);
}

// The loading screen: one bar segment per fighter fills in 10 px per tick.
export async function LoadCharacters() {
  fillBackWithPict(156, 640, 480);
  DrawSprites();
  const r = setRect({}, 9, 340, 59, 364);
  for (let i = 0; i < 12; i++) {
    fillRect(sctx, r, mapRGB16(0x8000, 0, 0));
    offsetRect(r, 52, 0);
  }
  await FadeBack(0);
  setRect(r, 9, 340, 59, 364);
  for (const t of CHARS) {
    LoadSpriteCICN(t);
    const bar = { ...r };
    bar.right = bar.left;
    while (bar.right !== r.right) {
      const start = TickCount();
      bar.right += 10;
      fillRect(sctx, bar, mapRGB16(0xffff, 0x08c2, 0x06a2));
      await untilTick(start + 1);
    }
    offsetRect(r, 52, 0);
  }
  await Fade(2);
}
