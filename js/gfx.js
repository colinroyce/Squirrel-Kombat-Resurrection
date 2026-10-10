/* Canvas drawing helpers shared by every screen. */
(function (root) {
  'use strict';
  const SK = root.SK;

  const TITLE_FONT = '"Bangers", Impact, "Arial Black", sans-serif';
  const UI_FONT = 'Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif';
  const BODY_FONT = '"Trebuchet MS", "Helvetica Neue", Arial, sans-serif';

  const gfx = {
    TITLE_FONT,
    UI_FONT,
    BODY_FONT,

    text(ctx, str, x, y, o) {
      o = o || {};
      ctx.save();
      const size = o.size || 24;
      ctx.font = (o.weight || '') + ' ' + size + 'px ' + (o.font || UI_FONT);
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'middle';
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      if (o.shadow) {
        ctx.fillStyle = o.shadow === true ? 'rgba(0,0,0,0.6)' : o.shadow;
        ctx.fillText(str, x + (o.shadowOff || 3), y + (o.shadowOff || 3));
      }
      if (o.stroke) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = o.strokeW || Math.max(2, size / 7);
        ctx.strokeStyle = o.stroke;
        ctx.strokeText(str, x, y);
      }
      if (o.gradient) {
        const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
        o.gradient.forEach((c, i) => g.addColorStop(i / (o.gradient.length - 1), c));
        ctx.fillStyle = g;
      } else ctx.fillStyle = o.color || '#fff';
      ctx.fillText(str, x, y);
      ctx.restore();
    },

    // Big MK-style banner text with fiery gradient.
    banner(ctx, str, x, y, size, o) {
      o = o || {};
      gfx.text(ctx, str, x, y, {
        size, align: 'center', font: TITLE_FONT, stroke: o.stroke || '#200800', strokeW: size / 6,
        gradient: o.gradient || ['#fff6a0', '#ffc020', '#ff5a00', '#a01000'], alpha: o.alpha,
        shadow: 'rgba(0,0,0,0.5)', shadowOff: size / 14,
      });
    },

    roundRect(ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },

    panel(ctx, x, y, w, h, o) {
      o = o || {};
      ctx.save();
      gfx.roundRect(ctx, x, y, w, h, o.r == null ? 10 : o.r);
      ctx.fillStyle = o.fill || 'rgba(20,10,4,0.82)';
      ctx.fill();
      ctx.lineWidth = o.lw || 3;
      ctx.strokeStyle = o.stroke || '#c27a2c';
      ctx.stroke();
      ctx.restore();
    },

    ellipse(ctx, x, y, rx, ry, rot, fill, stroke, lw) {
      ctx.beginPath();
      ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
    },

    circle(ctx, x, y, r, fill, stroke, lw) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
    },

    acorn(ctx, x, y, s, rot, o) {
      o = o || {};
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot || 0);
      ctx.scale(s / 10, s / 10);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = o.outline || '#2a1408';
      // nut
      ctx.beginPath();
      ctx.moveTo(-7, -1);
      ctx.quadraticCurveTo(-8, 9, 0, 13);
      ctx.quadraticCurveTo(8, 9, 7, -1);
      ctx.closePath();
      ctx.fillStyle = o.nut || '#c98a3c';
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.ellipse(-3, 4, 1.6, 4, 0.2, 0, Math.PI * 2); ctx.fill();
      // cap
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.quadraticCurveTo(-9, -8, 0, -8);
      ctx.quadraticCurveTo(9, -8, 9, 0);
      ctx.closePath();
      ctx.fillStyle = o.cap || '#6b4220';
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(6, -3); ctx.moveTo(-4, -6); ctx.lineTo(4, -6); ctx.stroke();
      // stem
      ctx.strokeStyle = o.outline || '#2a1408';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(1, -12, 3, -12); ctx.stroke();
      ctx.restore();
    },

    star(ctx, x, y, r1, r2, n, rot, fill, stroke) {
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const r = i % 2 ? r2 : r1;
        const a = rot + (i * Math.PI) / n;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
    },

    // Wrapped paragraph text; returns height used.
    wrap(ctx, str, x, y, maxW, lineH, o) {
      o = o || {};
      ctx.save();
      ctx.font = (o.weight || '') + ' ' + (o.size || 16) + 'px ' + (o.font || BODY_FONT);
      ctx.fillStyle = o.color || '#fff';
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = 'top';
      const words = str.split(' ');
      let line = '', yy = y;
      for (let i = 0; i < words.length; i++) {
        const test = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, x, yy);
          line = words[i];
          yy += lineH;
        } else line = test;
      }
      if (line) { ctx.fillText(line, x, yy); yy += lineH; }
      ctx.restore();
      return yy - y;
    },

    shade(hex, amt) {
      // amt -1..1 darken/lighten a #rrggbb colour
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; } else {
        r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
      }
      const h = (v) => ('0' + Math.round(SK.clamp(v, 0, 255)).toString(16)).slice(-2);
      return '#' + h(r) + h(g) + h(b);
    },

    makeCanvas(w, h) {
      if (typeof document !== 'undefined' && document.createElement) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
      }
      return null;
    },
  };

  SK.gfx = gfx;
})(typeof window !== 'undefined' ? window : globalThis);
