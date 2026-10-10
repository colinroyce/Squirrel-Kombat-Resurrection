/* In-fight heads-up display: health bars, timer, round acorns, combo counters. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const G = () => SK.gfx;

  function bar(ctx, x, y, w, h, f, flip) {
    const frac = SK.clamp(f.hp / f.maxHp, 0, 1);
    const disp = SK.clamp(f.dispHp / f.maxHp, 0, 1);
    ctx.save();
    // frame
    ctx.fillStyle = '#1a0a04';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#5a0a0a';
    ctx.fillRect(x, y, w, h);
    // damage trail
    ctx.fillStyle = '#ffdc40';
    const tw = w * disp;
    ctx.fillRect(flip ? x + w - tw : x, y, tw, h);
    // health
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (frac > 0.5) { g.addColorStop(0, '#9cff6a'); g.addColorStop(0.5, '#34c018'); g.addColorStop(1, '#1a7a08'); }
    else if (frac > 0.25) { g.addColorStop(0, '#fff07a'); g.addColorStop(0.5, '#e0b010'); g.addColorStop(1, '#8a6a00'); }
    else { g.addColorStop(0, '#ff9a8a'); g.addColorStop(0.5, '#e02a10'); g.addColorStop(1, '#801008'); }
    ctx.fillStyle = g;
    const hw = w * frac;
    ctx.fillRect(flip ? x + w - hw : x, y, hw, h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x, y + 2, w, 3);
    ctx.strokeStyle = '#d8a050'; ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    ctx.restore();
    if (f.out && f.match.cfg.mode === 'teams') {
      G().text(ctx, 'K.O.', x + w / 2, y + h / 2 + 1, { size: h * 0.8, align: 'center', color: '#fff', stroke: '#000', strokeW: 3 });
    }
  }

  const HUD = {
    draw(ctx, m) {
      const teams = [0, 1].map((t) => m.fighters.filter((f) => f.team === t));
      const twoVtwo = teams[0].length > 1 || teams[1].length > 1;
      const bw = 380, bx0 = 60, bx1 = SK.W - 60 - bw;
      teams.forEach((tf, ti) => {
        const bx = ti === 0 ? bx0 : bx1;
        const flip = ti === 1;
        tf.forEach((f, i) => {
          const h = twoVtwo ? 16 : 26;
          const y = 22 + i * (h + 16);
          bar(ctx, bx, y, bw, h, f, flip);
          G().text(ctx, f.char.name + (f.player != null ? '  ' + (f.player === 0 ? '1P' : f.player === 1 ? '2P' : (f.player + 1) + 'P') : '  CPU'),
            flip ? bx + bw - 8 : bx + 8, y + h / 2 + 1,
            { size: twoVtwo ? 13 : 17, align: flip ? 'right' : 'left', color: '#fff', stroke: '#000', strokeW: 3, font: G().UI_FONT });
          // portrait medallion
          if (!twoVtwo || i === 0) {
            const px = ti === 0 ? bx - 30 : bx + bw + 30, py = twoVtwo ? 38 : 34;
            ctx.save();
            G().circle(ctx, px, py, 24, '#2a1408', '#d8a050', 3);
            ctx.beginPath(); ctx.arc(px, py, 22, 0, Math.PI * 2); ctx.clip();
            SK.rig.portrait(ctx, px, py - 24, 48, f.skin, { flip: ti === 1, t: m.frame });
            ctx.restore();
          }
        });
        // round wins
        if (!m.practice) {
          const yy = twoVtwo ? 96 : 62;
          for (let i = 0; i < m.winsNeeded; i++) {
            const x = ti === 0 ? bx + 14 + i * 26 : bx + bw - 14 - i * 26;
            if (i < m.wins[ti]) SK.gfx.acorn(ctx, x, yy, 11, 0);
            else G().circle(ctx, x, yy, 7, 'rgba(0,0,0,0.4)', 'rgba(255,220,150,0.6)', 2);
          }
        }
      });
      // timer
      if (!m.practice) {
        G().panel(ctx, SK.W / 2 - 34, 14, 68, 48, { r: 8, fill: 'rgba(20,8,2,0.85)' });
        const tStr = m.cfg.timer > 0 ? String(Math.max(0, Math.ceil(m.timer))) : '∞';
        G().text(ctx, tStr, SK.W / 2, 39, { size: 36, align: 'center', font: G().TITLE_FONT, gradient: ['#fff8c0', '#ffb020'], stroke: '#200800', strokeW: 4 });
      } else {
        G().text(ctx, 'PRACTICE', SK.W / 2, 34, { size: 28, align: 'center', font: G().TITLE_FONT, gradient: ['#c0ffc0', '#40c040'], stroke: '#002000', strokeW: 4 });
      }
      // combo counters
      m.comboDisp.forEach((c, ti) => {
        if (!c || c.t <= 0) return;
        const a = Math.min(1, c.t / 20);
        const pop = 1 + Math.max(0, (c.t - 80) / 10) * 0.4;
        const x = ti === 0 ? 70 : SK.W - 70;
        G().text(ctx, c.n + ' HITS', x, 140, { size: 34 * pop, align: ti === 0 ? 'left' : 'right', font: G().TITLE_FONT, gradient: ['#ffffff', '#ffd040', '#ff7a00'], stroke: '#300', strokeW: 6, alpha: a });
        if (c.dmg) G().text(ctx, Math.round((c.dmg / c.max) * 100) + '% DAMAGE', x, 172, { size: 16, align: ti === 0 ? 'left' : 'right', color: '#ffe0a0', stroke: '#000', strokeW: 3, alpha: a });
      });
    },

    messages(ctx, m) {
      m.messages.forEach((msg) => {
        const k = msg.t / msg.max;
        const inT = Math.min(1, (msg.max - msg.t) / 8);
        const size = (msg.size || 92) * (1.6 - 0.6 * SK.ease.out(inT));
        const alpha = Math.min(1, k * 4) * inT;
        G().banner(ctx, msg.str, SK.W / 2, msg.y || SK.H * 0.42, size, { alpha, gradient: msg.gradient });
        if (msg.sub) G().text(ctx, msg.sub, SK.W / 2, (msg.y || SK.H * 0.42) + size * 0.6, { size: 20, align: 'center', color: '#fff', stroke: '#000', strokeW: 4, alpha });
      });
    },
  };

  SK.HUD = HUD;
})(typeof window !== 'undefined' ? window : globalThis);
