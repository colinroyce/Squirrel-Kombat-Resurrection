// Key configuration screen (Options > Keys): OpenKeyScreen and DrawKeys.

import { TickCount, offsetRect, ptInRect, setRect, untilTick } from '../mac.js';
import { drawString, fillBackWithPict, fillRect, foreColor, kctx, mapRGB16, stringWidth } from '../gfx.js';
import { Button, CheckKey, FlushEvents, GetMouse, GetNextEvent } from '../input.js';
import { DrawSprites, HandleSprites, KillAllSprites, NewSpriteFromPICT, SetSpriteFrame } from '../sprites.js';
import { HandleSparks } from '../sparks.js';
import { PlaySound } from '../sound.js';
import { Fade, FadeBack } from '../fade.js';
import { T } from '../templates.js';
import { KillSpriteControls, NewCursorSprite, nextFrame } from '../common.js';
import { DEFAULT_KEYS, prefs, savePrefs } from '../state.js';
import { NewOptionsScreenSprites } from './options.js';

const LABELS = ['Left', 'Jump', 'Right', 'Punch', 'Kick', 'Uppercut', 'Spin Kick'];
const NAMES = {
  0x24: 'Return', 0x30: 'Tab', 0x31: 'Space', 0x33: 'Delete', 0x47: 'Clear', 0x4c: 'Enter',
  0x60: 'F5', 0x61: 'F6', 0x62: 'F7', 0x63: 'F3', 0x64: 'F8', 0x65: 'F9', 0x67: 'F11', 0x69: 'F13',
  0x6b: 'F14', 0x6d: 'F10', 0x6f: 'F12', 0x72: 'Help', 0x73: 'Home', 0x74: 'Page Up', 0x75: 'Del',
  0x76: 'F4', 0x77: 'End', 0x78: 'F2', 0x79: 'Page Down', 0x7a: 'F1', 0x7b: 'Left Ar.',
  0x7c: 'Right Ar.', 0x7d: 'Down Ar.', 0x7e: 'Up Ar.',
};

const ks = { done: 0, editing: -1, rects: Array.from({ length: 14 }, () => ({ top: 0, left: 0, bottom: 0, right: 0 })) };

// CharToString2: the key's name, or the character stored with it.
function keyName(slot) {
  const [ch, code] = prefs.keys[slot];
  return NAMES[code] !== undefined ? NAMES[code] : ch;
}

// Label boxes (bright red) and key boxes (dark red) drawn into the background, in white Geneva 9.
function DrawKeys() {
  const w = stringWidth('Page Down', 9);
  const bright = mapRGB16(0xffff, 0x08c2, 0x06a2);
  const dark = mapRGB16(0x8000, 0, 0);
  const white = foreColor(0x1e);
  const draw = (r, slot) => {
    fillRect(kctx, r, bright);
    drawString(kctx, r.left + 3, r.top + 15, LABELS[slot % 7], 9, white);
    ks.rects[slot] = { ...r };
    offsetRect(r, w, 0);
    fillRect(kctx, r, dark);
    drawString(kctx, r.left + 3, r.top + 15, ks.editing === slot ? '<hit key>' : keyName(slot), 9, white);
  };
  const column = (r, base) => {
    draw(r, base + 1);
    offsetRect(r, -w, 25);
    offsetRect(r, -2 * w, 0);
    draw(r, base + 0);
    offsetRect(r, 3 * w, 0);
    draw(r, base + 2);
    offsetRect(r, -w, 25);
    offsetRect(r, -2 * w, 0);
    for (let i = 3; i < 7; i++) {
      draw(r, base + i);
      offsetRect(r, -w, 25);
    }
  };
  const x0 = 265 - 3 * w;
  column(setRect({}, x0, 128, x0 + w, 150), 0);
  column(setRect({}, w + 375, 128, 2 * w + 375, 150), 7);
  for (const r of ks.rects) r.right += w;
}

function okButton(onClick) {
  return (s) => {
    if (s.rect.top < 417) {
      s.frame = 0;
      const m = GetMouse();
      if (ptInRect(m.h, m.v, s.rect)) {
        s.frame = 1;
        if (Button()) {
          PlaySound(0x10);
          s.frame = 2;
          onClick();
        }
      }
    } else {
      offsetRect(s.rect, 0, -8);
    }
  };
}

const HandleKeyOK = okButton(() => { ks.done = 1; });
const HandleKeyDefault = okButton(() => {
  prefs.keys = DEFAULT_KEYS.map((k) => k.slice());
  savePrefs();
  DrawKeys();
  DrawSprites();
});

// Waits for a key for the selected slot. Keys that are taken (pause, quit, another slot)
// are refused; the original says why in an alert box, which is not part of this build yet.
async function editKey(slot) {
  ks.editing = slot;
  DrawKeys();
  DrawSprites();
  FlushEvents();
  for (;;) {
    const start = TickCount();
    const e = GetNextEvent();
    if (e && e.what === 3) {
      const code = e.mac;
      const taken = prefs.keys.some(([, c], i) => c === code && i !== slot);
      if (code !== 0x23 && code !== 0x71 && code !== 0x35 && !taken) {
        const ch = e.key.length === 1 ? e.key : '';
        prefs.keys[slot] = [ch, code];
        savePrefs();
      }
      break;
    }
    if (e && e.what === 1) break;
    await HandleSprites();
    HandleSparks();
    DrawSprites();
    await nextFrame(start);
  }
  ks.editing = -1;
  FlushEvents();
  DrawKeys();
  DrawSprites();
}

export async function OpenKeyScreen() {
  ks.done = 0;
  await KillSpriteControls();
  await Fade(0);
  KillAllSprites();
  NewCursorSprite();
  NewSpriteFromPICT(T.ok, setRect({}, 508, 479, 608, 511), HandleKeyOK);
  NewSpriteFromPICT(T.keyOk, setRect({}, 32, 479, 132, 511), HandleKeyDefault);
  DrawKeys();
  DrawSprites();
  await FadeBack(0);
  while (!ks.done) {
    const start = TickCount();
    if (CheckKey(0x35) || CheckKey(0x24) || CheckKey(0x4c)) {
      ks.done = 1;
      SetSpriteFrame(0, 2);
      DrawSprites();
      await untilTick(TickCount() + 5);
    }
    if (Button()) {
      const m = GetMouse();
      for (let i = 0; i < 14; i++) {
        if (ptInRect(m.h, m.v, ks.rects[i])) await editKey(i);
      }
    }
    await HandleSprites();
    HandleSparks();
    DrawSprites();
    await nextFrame(start);
  }
  await Fade(0);
  KillAllSprites();
  fillBackWithPict(3000, 640, 480);
  NewOptionsScreenSprites();
  DrawSprites();
  await FadeBack(0);
}
