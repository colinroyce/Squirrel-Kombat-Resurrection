// Render(): background into the frame buffer, then the overlays drawn after the sprites.

import { back, bctx, fillRect, foreColor } from './gfx.js';
import { cam, view, view2 } from './camera.js';
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

// RenderSplit(n): view n of the world onto its half of the buffer (left for 1, right for 2).
// The tile mode (render option 2) isn't used by the fights, so only the view-rect copy is here.
export function renderSplit(n) {
  if (cam.renderOption !== 1) return;
  const v = n === 1 ? view : view2;
  bctx.drawImage(back, v.left, v.top, v.right - v.left, v.bottom - v.top, n === 1 ? 0 : 320, 0, 320, 480);
}

// The split screen's divider (a red line at x 320) and the HUD, which leaves out the hint box.
export function drawSplitOverlays() {
  fillRect(bctx, { left: 320, top: 0, right: 321, bottom: 481 }, foreColor(0xcd));
  DrawLifeBars();
  DrawRoundStuff();
  DrawTime();
  DrawRadar();
  DrawTutorial();
  DrawScores();
}
