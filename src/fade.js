// DrawSprocket gamma fades. Fade(n) fades the display out to colour n, FadeBack(n) fades it
// back in from colour n. Each takes about one second (measured from footage of the original)
// and blocks the game while it runs, as DSpContext_FadeGammaOut/In do.

import { TickCount, untilTick } from './mac.js';
import { gamma } from './gfx.js';
import { KillSparks } from './sparks.js';

const COLORS = [
  [0, 0, 0], [0xffff, 0xffff, 0xffff], [0xffff, 0, 0], [0, 0, 0xffff], [0, 0xffff, 0],
  [0x0241, 0xab54, 0xeaff], [0xfc00, 0xf37d, 0x052f],
];
const TICKS = 60;

export const fadeState = { faded: 0, last: 0 };

function css(n) {
  const c = COLORS[n] || COLORS[0];
  return 'rgb(' + (c[0] >> 8) + ',' + (c[1] >> 8) + ',' + (c[2] >> 8) + ')';
}

async function ramp(from, to) {
  const start = TickCount();
  for (;;) {
    const t = Math.min(1, (TickCount() - start) / TICKS);
    gamma.level = from + (to - from) * t;
    if (t >= 1) break;
    await untilTick(TickCount() + 1);
  }
}

export async function Fade(n) {
  gamma.color = css(n);
  if (gamma.level > 0) await ramp(gamma.level, 0);
  gamma.level = 0;
  fadeState.faded = 1;
  fadeState.last = n;
  KillSparks();
  KillQuakes();
}

export async function FadeBack(n) {
  gamma.color = css(n);
  await ramp(gamma.level, 1);
  gamma.level = 1;
  fadeState.faded = 0;
}

// GetFadeNormal: if the screen is faded, fade back in from the colour it went to.
export async function GetFadeNormal() {
  if (fadeState.faded) await FadeBack(fadeState.last);
}

let killQuakes = () => {};
export function setKillQuakes(fn) { killQuakes = fn; }
function KillQuakes() { killQuakes(); }
