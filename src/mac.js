// Classic Mac OS Toolbox pieces the game relies on: QuickDraw rectangles, the Toolbox
// pseudo-random generator, and the 60 Hz tick clock.

// ---- Rect (top, left, bottom, right), as QuickDraw ---------------------------------------

export function newRect(left = 0, top = 0, right = 0, bottom = 0) {
  return { top, left, bottom, right };
}

// SetRect(r, left, top, right, bottom) — note QuickDraw's argument order.
export function setRect(r, left, top, right, bottom) {
  r.left = left; r.top = top; r.right = right; r.bottom = bottom;
  return r;
}

export function copyRect(r) {
  return { top: r.top, left: r.left, bottom: r.bottom, right: r.right };
}

export function assignRect(dst, src) {
  dst.top = src.top; dst.left = src.left; dst.bottom = src.bottom; dst.right = src.right;
}

export function offsetRect(r, dh, dv) {
  r.left += dh; r.right += dh; r.top += dv; r.bottom += dv;
}

// InsetRect empties the rect when it would become narrower or shorter than 1 pixel.
export function insetRect(r, dh, dv) {
  r.left += dh; r.right -= dh; r.top += dv; r.bottom -= dv;
  if (r.right <= r.left || r.bottom <= r.top) { r.top = r.left = r.bottom = r.right = 0; }
}

// SectRect: true when the intersection is non-empty.
export function sectRect(a, b) {
  const top = Math.max(a.top, b.top), left = Math.max(a.left, b.left);
  const bottom = Math.min(a.bottom, b.bottom), right = Math.min(a.right, b.right);
  return right > left && bottom > top;
}

export function ptInRect(h, v, r) {
  return h >= r.left && h < r.right && v >= r.top && v < r.bottom;
}

// DetectCollision(a, b, a_dh, a_dv, b_dh, b_dv): inset both rects, then intersect.
export function detectCollision(a, b, adh, adv, bdh, bdv) {
  const ra = copyRect(a), rb = copyRect(b);
  insetRect(ra, adh, adv);
  insetRect(rb, bdh, bdv);
  return sectRect(ra, rb) ? 1 : 0;
}

// ---- 16-bit integer helpers --------------------------------------------------------------

export function s16(v) {
  v &= 0xffff;
  return v >= 0x8000 ? v - 0x10000 : v;
}

// C integer division (truncates toward zero), as the compiled code does for /2 and /16.
export function idiv(a, b) {
  return Math.trunc(a / b);
}

// ---- Toolbox Random ---------------------------------------------------------------------

let randSeed = 1;

export function seedRandom(seed) {
  randSeed = (seed >>> 0) % 0x7fffffff || 1;
}

// randSeed = randSeed * 16807 mod (2^31 - 1); result = low 16 bits, signed; 0x8000 -> 0.
export function Random() {
  randSeed = (randSeed * 16807) % 0x7fffffff;
  let r = randSeed & 0xffff;
  if (r === 0x8000) r = 0;
  return r >= 0x8000 ? r - 0x10000 : r;
}

// The game's Rand(n) = (Random() & 0x7fff) % n, and Rand1(n) = Rand(n) + 1.
export function Rand(n) {
  return (Random() & 0x7fff) % n;
}

export function Rand1(n) {
  return (Random() & 0x7fff) % n + 1;
}

// ---- TickCount (60 Hz) and frame waiting ---------------------------------------------------

const t0 = performance.now();

export function TickCount() {
  return Math.floor((performance.now() - t0) * 60 / 1000);
}

let frameWaiters = [];

function pump() {
  if (frameWaiters.length) {
    const now = TickCount();
    const ready = frameWaiters.filter((w) => now >= w.tick);
    frameWaiters = frameWaiters.filter((w) => now < w.tick);
    for (const w of ready) w.resolve();
  }
  requestAnimationFrame(pump);
}
requestAnimationFrame(pump);

// Resolve once TickCount() >= tick (checked on every display frame).
export function untilTick(tick) {
  if (TickCount() >= tick) return new Promise((r) => requestAnimationFrame(() => r()));
  return new Promise((resolve) => frameWaiters.push({ tick, resolve }));
}

// The game's per-frame wait: `do now = TickCount(); while (now - start < n);`
export function waitTicksFrom(start, n) {
  return untilTick(start + n);
}

// Delay(ticks)
export function Delay(n) {
  return untilTick(TickCount() + n);
}
