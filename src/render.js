// Render(): background into the frame buffer, then the overlays drawn after the sprites.

import { back, bctx } from './gfx.js';
import { cam, view } from './camera.js';
import { DrawSparks1 } from './sparks.js';
import { DrawHint, DrawLifeBars, DrawRadar, DrawRoundStuff, DrawScores, DrawTime, DrawTutorial } from './hud.js';

export function renderBackground() {
  if (cam.renderOption === 0) {
    // CopyBackToBuffer: the background world's own rect onto the buffer (top-left 640x480).
    bctx.drawImage(back, 0, 0);
  } else if (cam.renderOption === 1) {
    // CopyBackToBufferRect: the view rect of the world onto the whole buffer.
    bctx.drawImage(back, view.left, view.top, view.right - view.left, view.bottom - view.top, 0, 0, 640, 480);
  }
}

export function drawOverlays() {
  DrawSparks1();
  DrawLifeBars();
  DrawRoundStuff();
  DrawTime();
  DrawRadar();
  DrawTutorial();
  DrawScores();
  DrawHint();
}
