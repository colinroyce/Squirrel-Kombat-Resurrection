// Not in the original: the Cheats page (Options > CHEATS, Colin's request). The original's two cheats
// are typed codes that the game never mentions; here each one is a switch, with its code written
// next to it. The codes still work: FIREMONKEY on the title screen (CheckTitleKeyDown in title.js)
// and the secret key code on the character screen (CheckSelectionKeyDown in select.js). The page is
// drawn like the original's Keys page: bright red label boxes and dark red value boxes in Geneva 9.

import { TickCount, offsetRect, ptInRect, setRect, untilTick } from '../mac.js';
import { drawString, fillBackWithPict, fillRect, foreColor, kctx, mapRGB16 } from '../gfx.js';
import { Button, CheckKey, GetMouse } from '../input.js';
import { DrawSprites, HandleSprites, KillAllSprites, NewSpriteFromPICT, SetSpriteFrame } from '../sprites.js';
import { HandleSparks } from '../sparks.js';
import { PlaySound } from '../sound.js';
import { Fade, FadeBack } from '../fade.js';
import { T } from '../templates.js';
import { KillSpriteControls, NewCursorSprite, nextFrame } from '../common.js';
import { GetMuskratCheat, GetSuperBlood, MuskratWon, SetMuskratCheat, SetSuperBlood } from '../state.js';
import { keyName } from './keys.js';
import { NewOptionsScreenSprites } from './options.js';

const cs = { done: 0, rects: [] };

const LABEL = 180; // label box width
const VALUE = 110; // value box width
const LEFT = 320 - ((LABEL + VALUE) >> 1);

function rows() {
  const code = [0, 1, 2, 3, 5, 6].map(keyName).join(' ');
  return [
    {
      label: 'Super Blood',
      value: GetSuperBlood() ? 'ON' : 'OFF',
      notes: [
        'Much bigger blood bursts in fights (Blood must be ON or YELLOW).',
        'Original code: type FIREMONKEY on the title screen.',
      ],
      toggle: () => SetSuperBlood(GetSuperBlood() ? 0 : 1),
    },
    {
      label: 'Military Muskrat',
      value: MuskratWon() || GetMuskratCheat() ? 'UNLOCKED' : 'LOCKED',
      notes: MuskratWon()
        ? ['Unlocked for good by winning the Tournament.', `Original code: on the character screen, press ${code}.`]
        : ['Adds him to the character screen (winning the Tournament unlocks him too).',
          `Original code: on the character screen, press ${code}.`],
      toggle: MuskratWon() ? null : () => SetMuskratCheat(GetMuskratCheat() ? 0 : 1),
    },
  ];
}

function DrawCheats() {
  const bright = mapRGB16(0xffff, 0x08c2, 0x06a2);
  const dark = mapRGB16(0x8000, 0, 0);
  const white = foreColor(0x1e);
  const black = foreColor(0x21);
  let top = 140;
  cs.rects = [];
  for (const row of rows()) {
    const r = setRect({}, LEFT, top, LEFT + LABEL, top + 22);
    fillRect(kctx, r, bright);
    drawString(kctx, r.left + 3, r.top + 15, row.label, 9, white);
    offsetRect(r, LABEL, 0);
    r.right = r.left + VALUE;
    fillRect(kctx, r, dark);
    drawString(kctx, r.left + 3, r.top + 15, row.value, 9, white);
    cs.rects.push({ rect: { ...r }, toggle: row.toggle });
    const n = setRect({}, 100, top + 24, 540, top + 24 + 4 + 14 * row.notes.length);
    fillRect(kctx, n, black);
    row.notes.forEach((line, i) => drawString(kctx, n.left + 4, n.top + 13 + 14 * i, line, 9, white));
    top += 100;
  }
  drawString(kctx, LEFT, top - 8, 'Click a value box to switch it.', 9, white);
}

function HandleCheatsOK(s) {
  if (s.rect.top < 417) {
    s.frame = 0;
    const m = GetMouse();
    if (ptInRect(m.h, m.v, s.rect)) {
      s.frame = 1;
      if (Button()) {
        PlaySound(0x10);
        s.frame = 2;
        cs.done = 1;
      }
    }
  } else {
    offsetRect(s.rect, 0, -8);
  }
}

export async function OpenCheatScreen() {
  cs.done = 0;
  await KillSpriteControls();
  await Fade(0);
  KillAllSprites();
  NewCursorSprite();
  NewSpriteFromPICT(T.ok, setRect({}, 508, 479, 608, 511), HandleCheatsOK);
  DrawCheats();
  DrawSprites();
  await FadeBack(0);
  while (!cs.done) {
    const start = TickCount();
    if (CheckKey(0x35) || CheckKey(0x24) || CheckKey(0x4c)) {
      cs.done = 1;
      SetSpriteFrame(0, 2);
      DrawSprites();
      await untilTick(TickCount() + 5);
    }
    if (Button()) {
      const m = GetMouse();
      const hit = cs.rects.find((c) => c.toggle && ptInRect(m.h, m.v, c.rect));
      if (hit) {
        hit.toggle();
        PlaySound(0x10);
        DrawCheats();
        while (Button()) await untilTick(TickCount() + 1);
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
