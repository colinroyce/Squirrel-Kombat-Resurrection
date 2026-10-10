// Scene selector (OpenSceneSelector / HandleSceneSelector).

import { TickCount, ptInRect, setRect, untilTick } from '../mac.js';
import { drawPicture, fillBackWithPict, kctx } from '../gfx.js';
import { Button, CheckKey, GetMouse } from '../input.js';
import { OffCamera, SetRenderOptions } from '../camera.js';
import { DrawSprites, HandleSprites, KillAllSprites } from '../sprites.js';
import { HandleSparks } from '../sparks.js';
import { PlaySound } from '../sound.js';
import { DontDrawLifeBars, InitRoundData } from '../hud.js';
import { Fade, FadeBack } from '../fade.js';
import { NewCursorSprite, nextFrame } from '../common.js';
import { STAGED_SCENES, sel } from '../state.js';

// Forest, Field, Tundra, Great Wall, City (registered thumbnails).
const THUMBS = [10001, 10002, 10006, 10007, 10008];
const thumbRect = setRect({}, 192, 144, 448, 336);
const prevRect = setRect({}, 146, 362, 180, 396);
const nextRect = setRect({}, 460, 362, 494, 396);

export async function OpenSceneSelector() {
  await Fade(2);
  SetRenderOptions(0, 0);
  fillBackWithPict(11000, 640, 480);
  KillAllSprites();
  OffCamera(-9000, -9000);
  DontDrawLifeBars();
  InitRoundData();
  drawPicture(kctx, THUMBS[sel.scene], thumbRect);
  NewCursorSprite();
  DrawSprites();
  await FadeBack(2);
  await HandleSceneSelector();
}

// Scenes other than the Forest can be browsed but not started yet.
const canStart = () => STAGED_SCENES.includes(sel.scene);

async function HandleSceneSelector() {
  let done = 0;
  while (!done) {
    const start = TickCount();
    if (Button()) {
      const m = GetMouse();
      if (ptInRect(m.h, m.v, thumbRect) && canStart()) {
        PlaySound(0x10);
        done = 1;
      }
      if (ptInRect(m.h, m.v, nextRect)) {
        PlaySound(0x10);
        sel.scene += 1;
        if (sel.scene > 4) sel.scene = 0;
        drawPicture(kctx, THUMBS[sel.scene], thumbRect);
      }
      if (ptInRect(m.h, m.v, prevRect)) {
        PlaySound(0x10);
        sel.scene -= 1;
        if (sel.scene < 0) sel.scene = 4;
        drawPicture(kctx, THUMBS[sel.scene], thumbRect);
      }
      while (Button()) await untilTick(TickCount() + 1);
    }
    if ((CheckKey(0x31) || CheckKey(0x24) || CheckKey(0x4c)) && canStart()) {
      PlaySound(0x10);
      done = 1;
    }
    DrawSprites();
    await HandleSprites();
    HandleSparks();
    await nextFrame(start);
  }
}
