// Drawing surfaces and QuickDraw-style drawing, all in the Mac 8-bit system palette.
//
// The original draws into three places: a 1024x768 background GWorld (`back`), a 640x480 buffer
// GWorld that each frame is composed in (`buffer`), and the DrawSprocket screen (`screen`).
// DrawSprocket's gamma fades act on the whole display; `present` applies them when showing
// `screen` in the page.

import { assets, cicnInfo } from './assets.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return c;
}

export const screen = makeCanvas(640, 480);
export const buffer = makeCanvas(640, 480);
export let back = makeCanvas(1024, 768);
export const sctx = screen.getContext('2d');
export const bctx = buffer.getContext('2d');
export let kctx = back.getContext('2d');

// ---- palette -------------------------------------------------------------------------------

let clut = null;
let itable = null;

export function initPalette() {
  clut = assets.manifest.palette;
  itable = new Uint8Array(4096);
  for (let r = 0; r < 16; r++) {
    for (let g = 0; g < 16; g++) {
      for (let b = 0; b < 16; b++) {
        const rr = r * 0x11, gg = g * 0x11, bb = b * 0x11;
        let best = 0, bd = Infinity;
        for (let i = 0; i < 256; i++) {
          const c = clut[i];
          const d = (c[0] - rr) ** 2 + (c[1] - gg) ** 2 + (c[2] - bb) ** 2;
          if (d < bd) { bd = d; best = i; }
        }
        itable[(r << 8) | (g << 4) | b] = best;
      }
    }
  }
}

// Colour actually shown for a 16-bit-per-component RGB on the 8-bit screen.
export function mapRGB16(r, g, b) {
  const c = clut[itable[((r >> 12) << 8) | ((g >> 12) << 4) | (b >> 12)]];
  return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
}

// QuickDraw old-style colour constants used with ForeColor.
const OLD_COLORS = {
  0x21: [0, 0, 0], // blackColor
  0x1e: [0xffff, 0xffff, 0xffff], // whiteColor
  0xcd: [0xdd6b, 0x08c2, 0x06a2], // redColor
  0x45: [0xfc00, 0xf37d, 0x052f], // yellowColor
  0x89: [0xf2d7, 0x0856, 0x84ec], // magentaColor
  0x111: [0x0241, 0xab54, 0xeaff], // cyanColor
  0x155: [0x0000, 0x8000, 0x11b0], // greenColor
  0x199: [0x0000, 0x0000, 0xd400], // blueColor
};

// Whether `c` is one of the eight constants above. The original also passes other values (the
// secret selector's sparks use 2); what Color QuickDraw shows for those is not recovered yet.
export const isOldColor = (c) => c in OLD_COLORS;

export function foreColor(c) {
  const v = OLD_COLORS[c];
  return mapRGB16(v[0], v[1], v[2]);
}

// ---- background world ------------------------------------------------------------------------

export const worldRect = { top: 0, left: 0, bottom: 768, right: 1024 };

// CreateBackGWorld(w, h): new background world, erased to white; it is also the world rect.
export function createBackGWorld(w, h) {
  back = makeCanvas(w, h);
  kctx = back.getContext('2d');
  kctx.fillStyle = '#fff';
  kctx.fillRect(0, 0, w, h);
  worldRect.top = 0; worldRect.left = 0; worldRect.bottom = h; worldRect.right = w;
}

// FillBackWithPict(id, w, h): DrawPicture scaled into (0, 0, w, h) of the background world.
export function fillBackWithPict(id, w, h) {
  const img = assets.pict.get(id);
  if (img) kctx.drawImage(img, 0, 0, w, h);
}

export function drawPicture(ctx, id, r) {
  const img = assets.pict.get(id);
  if (img) ctx.drawImage(img, r.left, r.top, r.right - r.left, r.bottom - r.top);
}

export function fillRect(ctx, r, color) {
  if (r.right <= r.left || r.bottom <= r.top) return;
  ctx.fillStyle = color;
  ctx.fillRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
}

export function eraseRect(ctx, r) {
  fillRect(ctx, r, '#fff');
}

// ---- sprite strips (the original's per-picID image cache) -----------------------------------

const strips = new Map();

// QuickDraw `transparent` mode skips source pixels equal to the background colour (white).
function keyWhite(canvas) {
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255) d[i + 3] = 0;
  }
  ctx.putImageData(img, 0, 0);
}

// NewSpriteFromCICN's strip: nframes icons (picID + i) plotted into frameW-wide cells of a
// white-filled offscreen world.
export function cicnStrip(picID, nframes, fw, fh) {
  let c = strips.get(picID);
  if (c) return c;
  c = makeCanvas(Math.max(1, nframes * fw), Math.max(1, fh));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < nframes; i++) {
    const p = cicnInfo(picID + i);
    if (!p) continue;
    ctx.drawImage(assets.sheets[p[0]], p[1], p[2], p[3], p[4], i * fw, 0, fw, fh);
  }
  keyWhite(c);
  strips.set(picID, c);
  return c;
}

// NewSpriteFromPICT's strip: the picture drawn scaled into nframes * frameW by frameH.
export function pictStrip(picID, nframes, fw, fh) {
  let c = strips.get(picID);
  if (c) return c;
  c = makeCanvas(Math.max(1, nframes * fw), Math.max(1, fh));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  const img = assets.pict.get(picID);
  if (img) ctx.drawImage(img, 0, 0, c.width, c.height);
  keyWhite(c);
  strips.set(picID, c);
  return c;
}

// An offscreen picture drawn opaque (srcCopy), e.g. the round digits, keyed copy for transparent.
export function pictCanvas(picID, w, h, transparent) {
  const key = 'p' + picID + (transparent ? 't' : '');
  let c = strips.get(key);
  if (c) return c;
  c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  const img = assets.pict.get(picID);
  if (img) ctx.drawImage(img, 0, 0, w, h);
  if (transparent) keyWhite(c);
  strips.set(key, c);
  return c;
}

// CopyBits(src, dst, srcRect, dstRect, mode): sources are pre-keyed for transparent mode.
export function copyBits(ctx, src, sr, dr) {
  const sw = sr.right - sr.left, sh = sr.bottom - sr.top;
  const dw = dr.right - dr.left, dh = dr.bottom - dr.top;
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;
  ctx.drawImage(src, sr.left, sr.top, sw, sh, dr.left, dr.top, dw, dh);
}

// ---- text (Geneva bitmap strikes, drawn srcOr in the foreground colour) ----------------------

function fontFor(size) {
  return assets.fonts[size] || null;
}

// Width of a string. If a size is missing, the 9 pt metrics stand in so text layout logic
// (e.g. the hint ticker's scrolling) still runs; nothing is drawn for missing sizes.
export function stringWidth(str, size, bold = false) {
  const f = fontFor(size) || fontFor(9);
  if (!f) return 0;
  let w = 0;
  for (const ch of str) {
    const g = f.glyphs[String(ch.codePointAt(0))];
    if (g) w += g.w + (bold ? 1 : 0);
  }
  return w;
}

// DrawString at the pen (h, v = baseline); returns the new pen h.
export function drawString(ctx, h, v, str, size, color, bold = false) {
  const f = fontFor(size);
  if (!f) return h + stringWidth(str, size, bold);
  ctx.fillStyle = color;
  for (const ch of str) {
    const g = f.glyphs[String(ch.codePointAt(0))];
    if (!g) continue;
    const top = v - f.ascent;
    for (let y = 0; y < g.rows.length; y++) {
      const row = g.rows[y];
      for (let x = 0; x < row.length; x++) {
        if (row.charCodeAt(x) === 35) {
          ctx.fillRect(h + g.x + x, top + y, 1, 1);
          if (bold) ctx.fillRect(h + g.x + x + 1, top + y, 1, 1);
        }
      }
    }
    h += g.w + (bold ? 1 : 0);
  }
  return h;
}

// ---- DrawSprocket gamma fades -----------------------------------------------------------------

export const gamma = { level: 1, color: 'rgb(0,0,0)' };

export function present(visible) {
  const vctx = visible.getContext('2d');
  vctx.imageSmoothingEnabled = false;
  const frame = () => {
    vctx.globalAlpha = 1;
    vctx.drawImage(screen, 0, 0);
    if (gamma.level < 1) {
      vctx.globalAlpha = 1 - gamma.level;
      vctx.fillStyle = gamma.color;
      vctx.fillRect(0, 0, 640, 480);
      vctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
