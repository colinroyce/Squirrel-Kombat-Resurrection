/* The five fight scenes: Field, Forest, Tundra, Great Wall and City. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const G = () => SK.gfx;
  const R = (a, b) => SK.rand(a, b);
  const TAU = Math.PI * 2;

  // Deterministic pseudo-random for static scenery so it never flickers.
  function srand(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // ---------------------------------------------------------------------------
  // Scenery helpers
  // ---------------------------------------------------------------------------
  function cloud(ctx, x, y, s, col) {
    ctx.fillStyle = col || 'rgba(255,255,255,0.9)';
    [[0, 0, 30], [28, -12, 26], [55, 2, 28], [25, 8, 26], [-24, 6, 20], [78, 8, 18]].forEach(([dx, dy, r]) => {
      ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill();
    });
  }

  function hills(ctx, y0, amp, freq, col, w, seed, bottom) {
    const rnd = srand(seed);
    const ph = rnd() * 10, ph2 = rnd() * 10;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-400, bottom);
    for (let x = -400; x <= w + 400; x += 20) {
      ctx.lineTo(x, y0 - Math.sin(x * freq + ph) * amp - Math.sin(x * freq * 2.3 + ph2) * amp * 0.4);
    }
    ctx.lineTo(w + 400, bottom);
    ctx.closePath();
    ctx.fill();
  }

  function mountains(ctx, y0, h, col, w, seed, snow, bottom) {
    const rnd = srand(seed);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-400, bottom);
    const peaks = [];
    for (let x = -400; x <= w + 400;) {
      const pw = 140 + rnd() * 220, ph = h * (0.5 + rnd() * 0.5);
      ctx.lineTo(x + pw / 2, y0 - ph);
      peaks.push([x + pw / 2, y0 - ph, pw]);
      ctx.lineTo(x + pw, y0 - ph * (0.15 + rnd() * 0.25));
      x += pw;
    }
    ctx.lineTo(w + 400, bottom);
    ctx.closePath();
    ctx.fill();
    if (snow) {
      ctx.fillStyle = snow;
      peaks.forEach(([px, py, pw]) => {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - pw * 0.16, py + pw * 0.22);
        ctx.lineTo(px - pw * 0.05, py + pw * 0.17);
        ctx.lineTo(px + pw * 0.04, py + pw * 0.24);
        ctx.lineTo(px + pw * 0.16, py + pw * 0.2);
        ctx.closePath();
        ctx.fill();
      });
    }
  }

  function leafyTree(ctx, x, y, s, trunk, leaves, rnd) {
    ctx.fillStyle = trunk;
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y); ctx.lineTo(x - 8 * s, y - 120 * s); ctx.lineTo(x + 8 * s, y - 120 * s); ctx.lineTo(x + 14 * s, y);
    ctx.fill();
    const blobs = [[0, -150, 60], [-50, -120, 45], [50, -120, 45], [-30, -190, 45], [30, -190, 45], [0, -215, 38]];
    blobs.forEach(([dx, dy, r], i) => {
      ctx.fillStyle = i % 2 ? leaves[0] : leaves[1];
      ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s * (0.9 + (rnd ? rnd() * 0.2 : 0)), 0, TAU); ctx.fill();
    });
  }

  function pine(ctx, x, y, s, col, snow) {
    ctx.fillStyle = '#3a2614';
    ctx.fillRect(x - 5 * s, y - 20 * s, 10 * s, 20 * s);
    for (let i = 0; i < 4; i++) {
      const ty = y - 20 * s - i * 34 * s, tw = (60 - i * 12) * s;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x - tw, ty); ctx.lineTo(x, ty - 56 * s); ctx.lineTo(x + tw, ty); ctx.closePath(); ctx.fill();
      if (snow) {
        ctx.fillStyle = snow;
        ctx.beginPath(); ctx.moveTo(x - tw * 0.55, ty - 26 * s); ctx.lineTo(x, ty - 56 * s); ctx.lineTo(x + tw * 0.55, ty - 26 * s);
        ctx.quadraticCurveTo(x, ty - 20 * s, x - tw * 0.55, ty - 26 * s); ctx.fill();
      }
    }
  }

  function plank(ctx, p, col, dark) {
    ctx.fillStyle = col;
    ctx.fillRect(p.x, p.y, p.w, 12);
    ctx.fillStyle = dark;
    ctx.fillRect(p.x, p.y + 10, p.w, 4);
    ctx.strokeStyle = dark; ctx.lineWidth = 1;
    for (let x = p.x + 30; x < p.x + p.w; x += 34) { ctx.beginPath(); ctx.moveTo(x, p.y + 1); ctx.lineTo(x, p.y + 11); ctx.stroke(); }
  }

  function branch(ctx, p, fromRight, col, leafCol) {
    const x0 = fromRight ? p.x + p.w + 40 : p.x - 40;
    ctx.fillStyle = col;
    ctx.beginPath();
    if (fromRight) {
      ctx.moveTo(x0, p.y - 10); ctx.lineTo(p.x, p.y - 2); ctx.lineTo(p.x, p.y + 10); ctx.lineTo(x0, p.y + 26);
    } else {
      ctx.moveTo(x0, p.y - 10); ctx.lineTo(p.x + p.w, p.y - 2); ctx.lineTo(p.x + p.w, p.y + 10); ctx.lineTo(x0, p.y + 26);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x + 10, p.y + 4); ctx.lineTo(p.x + p.w - 10, p.y + 5); ctx.stroke();
    if (leafCol) {
      const tip = fromRight ? p.x : p.x + p.w;
      ctx.fillStyle = leafCol;
      [[0, -14, 22], [fromRight ? -18 : 18, -4, 18], [fromRight ? -8 : 8, -26, 16]].forEach(([dx, dy, r]) => {
        ctx.beginPath(); ctx.arc(tip + dx, p.y + dy, r, 0, TAU); ctx.fill();
      });
    }
  }

  function nest(ctx, x, y) {
    ctx.fillStyle = '#6b4a24';
    ctx.beginPath(); ctx.ellipse(x, y - 6, 34, 14, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#8a6434'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath(); ctx.moveTo(x - 34 + i * 8, y - 8); ctx.quadraticCurveTo(x - 30 + i * 8, y + 4, x - 22 + i * 8, y - 6); ctx.stroke();
    }
    ctx.strokeStyle = '#4a3014';
    ctx.beginPath(); ctx.ellipse(x, y - 8, 34, 6, 0, 0, TAU); ctx.stroke();
  }

  function warningSign(ctx, x, y, t, label) {
    if (Math.floor(t / 8) % 2) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(28, 18); ctx.lineTo(-28, 18); ctx.closePath();
    ctx.fillStyle = '#ffd020'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#201000'; ctx.stroke();
    G().text(ctx, '!', 0, 2, { size: 30, align: 'center', color: '#201000', font: G().UI_FONT });
    if (label) G().text(ctx, label, 0, 36, { size: 16, align: 'center', color: '#ffd020', stroke: '#000', strokeW: 4 });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Stage class
  // ---------------------------------------------------------------------------
  class Stage {
    constructor(def) {
      this.def = def;
      this.id = def.id;
      this.name = def.name;
      this.width = def.width;
      this.height = def.height;
      this.groundY = def.groundY;
      this.left = 0;
      this.right = def.width;
      this.friction = def.friction || 1;
      this.music = def.music;
      this.t = 0;
      this.platforms = def.platforms.map((p) => Object.assign({ oneway: true, dx: 0, dy: 0 }, p, { baseX: p.x, baseY: p.y, prevY: p.y }));
      this.state = {};
      this.cache = {};
      if (def.init) def.init(this);
    }

    spawnPoints(n) {
      const c = this.width / 2, y = this.groundY;
      if (n <= 2) return [[c - 190, y, 1], [c + 190, y, -1]];
      return [[c - 300, y, 1], [c - 170, y, 1], [c + 170, y, -1], [c + 300, y, -1]];
    }

    surfaceBelow(x, y) {
      let best = this.groundY;
      for (const p of this.platforms) {
        if (x >= p.x && x <= p.x + p.w && p.y >= y && p.y < best) best = p.y;
      }
      return best;
    }

    collideFighter(f, prevY) {
      if (f.onGround) {
        const p = f.platform;
        if (p) {
          if (f.x < p.x - 3 || f.x > p.x + p.w + 3) { f.onGround = false; f.platform = null; return; }
          f.y = p.y;
          f.x += p.dx;
          f.vy = 0;
        } else {
          f.y = this.groundY;
          f.vy = 0;
        }
        return;
      }
      if (f.vy < 0) return;
      let landed = null, landY = Infinity;
      for (const p of this.platforms) {
        if (f.dropT > 0 && p === f.dropPlat) continue;
        if (f.x < p.x || f.x > p.x + p.w) continue;
        if (prevY <= Math.max(p.y, p.prevY) + 1 && f.y >= p.y && p.y < landY) { landed = p; landY = p.y; }
      }
      if (landed) {
        f.y = landed.y; f.vy = 0; f.onGround = true; f.platform = landed;
        return;
      }
      if (f.y >= this.groundY) { f.y = this.groundY; f.vy = 0; f.onGround = true; f.platform = null; }
    }

    update(match) {
      this.t++;
      for (const p of this.platforms) {
        p.prevY = p.y;
        if (p.move) {
          const mv = p.move;
          const cyc = mv.wait * 2 + mv.travel * 2;
          const tt = (this.t + (mv.offset || 0)) % cyc;
          let k;
          if (tt < mv.wait) k = 0;
          else if (tt < mv.wait + mv.travel) k = SK.ease.inOut((tt - mv.wait) / mv.travel);
          else if (tt < mv.wait * 2 + mv.travel) k = 1;
          else k = 1 - SK.ease.inOut((tt - mv.wait * 2 - mv.travel) / mv.travel);
          const nx = mv.axis === 'x' ? SK.lerp(mv.from, mv.to, k) : p.baseX;
          const ny = mv.axis === 'y' ? SK.lerp(mv.from, mv.to, k) : p.baseY;
          p.dx = nx - p.x; p.dy = ny - p.y;
          p.x = nx; p.y = ny;
        }
      }
      if (this.def.update && match.hazardsOn && match.state === 'fight') this.def.update(this, match);
      if (this.def.ambient) this.def.ambient(this, match);
    }

    // Cache static artwork into an offscreen canvas when possible.
    cached(key, w, h, draw) {
      if (this.noCache) return null;
      if (!(key in this.cache)) {
        const c = G().makeCanvas(w, h);
        const cx = c && c.getContext ? c.getContext('2d') : null;
        if (cx) draw(cx);
        this.cache[key] = cx ? c : null;
      }
      return this.cache[key];
    }

    // Static world-space art: drawn from the cache when we have one.
    drawCached(ctx, key, draw) {
      const cv = this.cached(key, this.width, this.height, draw);
      if (cv) ctx.drawImage(cv, 0, 0);
      else draw(ctx);
    }

    drawLayer(ctx, cam, f, key, draw) {
      const cx = this.width / 2, cy = this.height / 2;
      ctx.save();
      ctx.translate((cam.x - cx) * (1 - f), (cam.y - cy) * (1 - f));
      const pad = 500;
      const cv = this.cached(key, this.width + pad * 2, this.height + pad, (c) => { c.translate(pad, pad / 2); draw(c); });
      if (cv) ctx.drawImage(cv, -pad, -pad / 2);
      else draw(ctx);
      ctx.restore();
    }

    drawSky(ctx, match) { this.def.sky(ctx, this, match); }
    drawBack(ctx, match) { this.def.back(ctx, this, match); }
    drawFront(ctx, match) { if (this.def.front) this.def.front(ctx, this, match); }
    drawOverlay(ctx, match) { if (this.def.overlay) this.def.overlay(ctx, this, match); }
  }

  // Shared hazard spawner for things that drive along the ground.
  function groundVehicle(st, match, o) {
    const dir = o.dir;
    const x = dir > 0 ? -o.w : st.width + o.w;
    const p = match.addProjectile({
      owner: null, team: -1, kind: o.kind, x, y: st.groundY - o.h / 2, vx: dir * o.speed, dir, ground: true,
      w: o.w, h: o.h, life: 600, pierce: true, passWalls: true, hazard: true,
      hit: { dmg: o.dmg, stun: 30, kb: [12, -12], knockdown: true, heavy: true, unblockable: true, special: false },
    });
    p.drawFn = o.draw;
    return p;
  }

  function drawMower(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.dir, 1);
    const b = Math.sin(p.t * 0.8) * 1.5;
    ctx.fillStyle = '#c02818'; ctx.strokeStyle = '#300'; ctx.lineWidth = 3;
    G().roundRect(ctx, -46, -14 + b, 92, 30, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-30, -10 + b, 40, 8);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-40, -12 + b); ctx.lineTo(-62, -44); ctx.lineTo(-74, -44); ctx.stroke();
    [[-30, 18], [30, 18]].forEach(([x, y]) => G().circle(ctx, x, y, 10, '#222', '#000', 2));
    // grass clippings
    ctx.fillStyle = '#5ab030';
    for (let i = 0; i < 5; i++) ctx.fillRect(-60 - Math.random() * 40, 6 - Math.random() * 20, 4, 2);
    ctx.restore();
  }

  function drawCar(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.dir, 1);
    const col = p.color || '#f0c020';
    ctx.lineWidth = 3; ctx.strokeStyle = '#111';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-90, 18); ctx.lineTo(-90, -6); ctx.lineTo(-60, -10); ctx.lineTo(-36, -36); ctx.lineTo(30, -36); ctx.lineTo(56, -10); ctx.lineTo(90, -4); ctx.lineTo(92, 18); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9fd0f0';
    ctx.fillRect(-30, -31, 26, 20); ctx.fillRect(2, -31, 24, 20);
    if (p.taxi) { ctx.fillStyle = '#222'; ctx.fillRect(-10, -46, 24, 10); G().text(ctx, 'TAXI', 2, -41, { size: 9, align: 'center', color: '#ffd020' }); }
    G().circle(ctx, -56, 20, 14, '#1a1a1a', '#000', 2); G().circle(ctx, 56, 20, 14, '#1a1a1a', '#000', 2);
    G().circle(ctx, -56, 20, 5, '#888'); G().circle(ctx, 56, 20, 5, '#888');
    ctx.fillStyle = '#fff6a0'; ctx.fillRect(84, -2, 8, 8);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff6a0';
    ctx.beginPath(); ctx.moveTo(92, -2); ctx.lineTo(260, -30); ctx.lineTo(260, 40); ctx.lineTo(92, 8); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // FIELD
  // ---------------------------------------------------------------------------
  const FIELD = {
    id: 'field', name: 'THE FIELD', width: 1600, height: 720, groundY: 640, music: 'fight1',
    blurb: 'An open meadow. Watch out for the lawnmower.',
    platforms: [
      { x: 250, y: 556, w: 250 },
      { x: 1100, y: 566, w: 150 },
      { x: 1125, y: 496, w: 100 },
      { x: 1290, y: 400, w: 230 },
      { x: 620, y: 430, w: 170 },
    ],
    init(st) { st.state.nextMower = 900 + R(0, 600); st.state.clouds = [0, 1, 2, 3, 4].map((i) => ({ x: i * 400 + R(0, 200), y: R(60, 220), s: R(0.6, 1.2), v: R(0.1, 0.3) })); st.state.mailX = -200; },
    update(st, m) {
      const s = st.state;
      if (--s.nextMower === 90) { s.warnDir = SK.chance(0.5) ? 1 : -1; s.warn = 90; SK.audio.sfx('mower'); }
      if (s.warn > 0) s.warn--;
      if (s.nextMower <= 0) {
        groundVehicle(st, m, { kind: 'mower', dir: s.warnDir, w: 96, h: 40, speed: 7, dmg: 90, draw: drawMower });
        s.nextMower = 1300 + R(0, 700);
      }
      m.projectiles.forEach((p) => { if (p.kind === 'mower' && p.t % 14 === 0) { SK.audio.sfx('mower'); m.fx.add({ type: 'dot', x: p.x - p.dir * 50, y: p.y, vx: -p.dir * R(1, 4), vy: R(-4, -1), grav: 0.2, life: 30, size: 2.5, color: '#5ab030' }); } });
    },
    ambient(st) {
      st.state.clouds.forEach((c) => { c.x += c.v; if (c.x > st.width + 300) c.x = -300; });
      st.state.mailX += 0.6;
      if (st.state.mailX > st.width + 600) st.state.mailX = -600;
    },
    sky(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, SK.H);
      g.addColorStop(0, '#4aa6f0'); g.addColorStop(0.7, '#bfe6ff'); g.addColorStop(1, '#e8f6ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SK.W, SK.H);
      G().circle(ctx, SK.W * 0.82, 90, 46, 'rgba(255,250,200,0.5)');
      G().circle(ctx, SK.W * 0.82, 90, 34, '#fff6c0');
    },
    back(ctx, st, m) {
      const cam = m.camera;
      st.state.clouds.forEach((c) => {
        ctx.save(); ctx.translate((cam.x - st.width / 2) * 0.8, (cam.y - st.height / 2) * 0.8);
        cloud(ctx, c.x, c.y, c.s); ctx.restore();
      });
      st.drawLayer(ctx, cam, 0.25, 'far', (c) => {
        hills(c, 470, 40, 0.004, '#8cc86a', st.width, 3, st.height + 200);
        // barn & silo
        c.fillStyle = '#b02a1a'; c.fillRect(1180, 380, 110, 80);
        c.beginPath(); c.moveTo(1170, 382); c.lineTo(1235, 330); c.lineTo(1300, 382); c.closePath(); c.fill();
        c.fillStyle = '#f2e8d8'; c.fillRect(1220, 410, 30, 50);
        c.fillStyle = '#c8c8c0'; c.fillRect(1300, 340, 36, 120);
        G().ellipse(c, 1318, 340, 18, 12, 0, '#a8a8a0');
      });
      st.drawLayer(ctx, cam, 0.5, 'mid', (c) => {
        hills(c, 540, 30, 0.006, '#6cb048', st.width, 7, st.height + 200);
        const rnd = srand(11);
        for (let i = 0; i < 7; i++) leafyTree(c, 80 + i * 260 + rnd() * 80, 560, 0.6 + rnd() * 0.3, '#5a3a1a', ['#3f8a2a', '#52a034'], rnd);
        // road
        c.fillStyle = '#cbb48a'; c.fillRect(-400, 568, st.width + 800, 14);
      });
      // mailman cameo on the far road
      ctx.save();
      ctx.translate((cam.x - st.width / 2) * 0.5, (cam.y - st.height / 2) * 0.5);
      const mp = SK.rig.pose(SK.rig.P.stance);
      const ph = st.t * 0.2;
      mp.fF = [13 + Math.sin(ph) * 9, -Math.max(0, Math.cos(ph)) * 6]; mp.fB = [-12 - Math.sin(ph) * 9, -Math.max(0, -Math.cos(ph)) * 6];
      ctx.translate(st.state.mailX, 570);
      ctx.scale(0.5, 0.5);
      SK.rig.draw(ctx, mp, SK.CHARS.mailman.skin, { t: st.t });
      ctx.restore();
      // world: big oak on the right
      ctx.fillStyle = '#5a3a1a';
      ctx.beginPath(); ctx.moveTo(1490, 640); ctx.lineTo(1510, 280); ctx.lineTo(1560, 280); ctx.lineTo(1590, 640); ctx.fill();
      branch(ctx, st.platforms[3], true, '#5a3a1a', '#3f8a2a');
      ['#3f8a2a', '#52a034', '#47952e'].forEach((col, i) => {
        ctx.fillStyle = col;
        [[1530, 250, 90], [1440, 280, 60], [1600, 230, 80], [1500, 180, 70]].forEach(([x, y, r], j) => {
          if (j % 3 === i % 3 || i === 0) { ctx.beginPath(); ctx.arc(x + i * 6, y + i * 4, r - i * 8, 0, TAU); ctx.fill(); }
        });
      });
      // fence
      const fp = st.platforms[0];
      ctx.fillStyle = '#9a6a3a'; ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 2;
      for (let x = fp.x; x <= fp.x + fp.w; x += 50) { ctx.fillRect(x - 5, fp.y - 6, 10, st.groundY - fp.y + 6); ctx.strokeRect(x - 5, fp.y - 6, 10, st.groundY - fp.y + 6); }
      plank(ctx, fp, '#b07a44', '#6a4220');
      plank(ctx, { x: fp.x, y: fp.y + 40, w: fp.w }, '#a87240', '#6a4220');
      // hay bales
      [st.platforms[1], st.platforms[2]].forEach((p) => {
        const h = p === st.platforms[1] ? st.groundY - p.y : 70;
        ctx.fillStyle = '#e6c25a'; ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 3;
        G().roundRect(ctx, p.x, p.y, p.w, h, 10); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(140,100,20,0.5)'; ctx.lineWidth = 1;
        for (let y = p.y + 10; y < p.y + h; y += 9) { ctx.beginPath(); ctx.moveTo(p.x + 6, y); ctx.lineTo(p.x + p.w - 6, y + 2); ctx.stroke(); }
      });
      // floating log (platform 4) on a stump pole
      const lp = st.platforms[4];
      ctx.fillStyle = '#6a4220'; ctx.fillRect(lp.x + lp.w / 2 - 12, lp.y, 24, st.groundY - lp.y);
      ctx.fillStyle = '#8a5a2a'; G().roundRect(ctx, lp.x, lp.y - 2, lp.w, 18, 9); ctx.fill();
      ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 2; ctx.stroke();
      G().ellipse(ctx, lp.x + 8, lp.y + 7, 6, 8, 0, '#c8945a', '#4a2a10', 2);
      // ground
      const gg = ctx.createLinearGradient(0, st.groundY, 0, st.height);
      gg.addColorStop(0, '#5ca83a'); gg.addColorStop(0.15, '#4a8f2c'); gg.addColorStop(1, '#3a6a20');
      ctx.fillStyle = gg; ctx.fillRect(-50, st.groundY, st.width + 100, st.height - st.groundY + 50);
      ctx.fillStyle = '#6cc046'; ctx.fillRect(-50, st.groundY, st.width + 100, 6);
      // warning sign
      if (st.state.warn > 0) warningSign(ctx, st.state.warnDir > 0 ? cam.x - SK.W / 2 / cam.zoom + 60 : cam.x + SK.W / 2 / cam.zoom - 60, st.groundY - 100, st.t, 'MOWER!');
    },
    front(ctx, st) {
      const rnd = srand(5);
      ctx.strokeStyle = '#4a9a2a'; ctx.lineWidth = 3;
      for (let x = 0; x < st.width; x += 14) {
        const h = 8 + rnd() * 14, sway = Math.sin(st.t * 0.03 + x) * 2;
        ctx.beginPath(); ctx.moveTo(x, st.groundY + 8); ctx.quadraticCurveTo(x + sway, st.groundY - h / 2, x + sway * 2, st.groundY - h + 6); ctx.stroke();
      }
    },
  };

  // ---------------------------------------------------------------------------
  // FOREST
  // ---------------------------------------------------------------------------
  const FOREST = {
    id: 'forest', name: 'THE FOREST', width: 1600, height: 1100, groundY: 1020, music: 'fight2',
    blurb: 'Ride the elevator to the treetops. Beware angry momma birds and death acorns.',
    platforms: [
      { x: 110, y: 820, w: 300 }, { x: 250, y: 600, w: 270 }, { x: 90, y: 380, w: 290 },
      { x: 1190, y: 820, w: 300 }, { x: 1080, y: 600, w: 270 }, { x: 1220, y: 380, w: 290 },
      { x: 620, y: 250, w: 360 },
      { x: 700, y: 1000, w: 200, elevator: true, move: { axis: 'y', from: 1000, to: 330, wait: 110, travel: 260 } },
    ],
    init(st) {
      st.state.nextAcorn = 200;
      st.state.nests = [
        { x: 800, plat: 6, anger: 0, cool: 0, mom: { x: 800, y: 236, mode: 'sit', t: 0 } },
        { x: 1150, plat: 4, anger: 0, cool: 0, mom: { x: 1150, y: 586, mode: 'sit', t: 0 } },
      ];
      st.state.armyCool = 0;
      st.state.marks = [];
    },
    update(st, m) {
      const s = st.state;
      // death acorns
      if (--s.nextAcorn <= 0) {
        const tgt = SK.chance(0.6) && m.fighters.length ? SK.pick(m.fighters.filter((f) => f.alive)) : null;
        const x = SK.clamp(tgt ? tgt.x + R(-80, 80) : R(80, st.width - 80), 40, st.width - 40);
        s.marks.push({ x, t: 70 });
        s.nextAcorn = 160 + R(0, 220);
      }
      s.marks.forEach((mk) => {
        mk.t--;
        if (mk.t === 0) {
          m.addProjectile({ owner: null, team: -1, kind: 'deathAcorn', x: mk.x, y: -40, vy: 6, gravity: 0.5, life: 300, passWalls: true, hazard: true,
            hit: { dmg: 60, stun: 26, kb: [2, -6], knockdown: true, special: false, heavy: true } });
          SK.audio.sfx('whoosh');
        }
      });
      s.marks = s.marks.filter((mk) => mk.t > 0);
      // nests & momma birds
      if (s.armyCool > 0) s.armyCool--;
      s.nests.forEach((n) => {
        const p = st.platforms[n.plat];
        const onNest = m.fighters.filter((f) => f.alive && f.onGround && f.platform === p && Math.abs(f.x - n.x) < 70);
        if (onNest.length >= 2 && s.armyCool <= 0) {
          s.armyCool = 900;
          const dir = SK.chance(0.5) ? 1 : -1;
          [-1, 0, 1].forEach((row) => {
            m.addProjectile({ owner: null, team: -1, kind: 'birds', x: dir > 0 ? -150 - row * 60 : st.width + 150 + row * 60, y: p.y - 60 + row * 70, vx: dir * 9, dir, life: 400, pierce: true, passWalls: true, hazard: true,
              hit: { dmg: 70, stun: 30, kb: [10, -10], knockdown: true, unblockable: false, special: false } });
          });
          m.bigText('BIRD ARMY!', 70, '#ffd040');
          SK.audio.sfx('birdArmy');
          m.shake(6);
        }
        if (n.cool > 0) n.cool--;
        if (onNest.length) n.anger++; else n.anger = Math.max(0, n.anger - 2);
        const mom = n.mom;
        mom.t++;
        if (mom.mode === 'sit' && n.anger > 50 && n.cool <= 0) {
          mom.mode = 'swoop'; mom.t = 0; mom.target = onNest[0]; n.cool = 260; n.anger = 0;
          SK.audio.sfx('bird');
          m.fx.text(mom.x, mom.y - 30, 'SQUAWK!', '#ff6040', 18);
        }
        if (mom.mode === 'swoop') {
          const tg = mom.target;
          if (!tg || !tg.alive || mom.t > 90) { mom.mode = 'return'; }
          else {
            const tx = tg.x, ty = tg.y - 50 * tg.scale;
            mom.x += SK.clamp(tx - mom.x, -9, 9);
            mom.y += SK.clamp(ty - mom.y, -9, 9);
            if (Math.abs(tx - mom.x) < 26 && Math.abs(ty - mom.y) < 30 && !mom.hit) {
              mom.hit = true;
              tg.takeHit({ dmg: 45, stun: 24, kb: [5, -6], knockdown: false, dirX: SK.sign(tg.x - mom.x) || 1 }, null, mom.x, 'hazard');
              SK.audio.sfx('bird');
              m.fx.add({ type: 'feather', x: mom.x, y: mom.y, vx: R(-2, 2), vy: R(-2, 0), grav: 0.05, life: 60, size: 6, rot: R(0, 6), vr: 0.1, color: '#6b4024' });
              mom.mode = 'return';
            }
          }
        }
        if (mom.mode === 'return') {
          const hx = n.x, hy = p.y - 14;
          mom.x += SK.clamp(hx - mom.x, -6, 6); mom.y += SK.clamp(hy - mom.y, -6, 6);
          if (Math.abs(hx - mom.x) < 4 && Math.abs(hy - mom.y) < 4) { mom.mode = 'sit'; mom.hit = false; }
        }
        if (mom.mode === 'sit') { mom.x = n.x; mom.y = p.y - 14; }
      });
    },
    ambient(st, m) {
      if (st.t % 24 === 0) {
        const cam = m.camera;
        m.fx.add({ type: 'feather', x: cam.x + R(-600, 600), y: cam.y - 400, vx: R(-0.6, 0.6), vy: R(0.6, 1.4), life: 500, size: 5, rot: R(0, 6), vr: R(-0.05, 0.05), color: SK.pick(['#5a9a30', '#c8a030', '#7aa838']) });
      }
    },
    sky(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, SK.H);
      g.addColorStop(0, '#2a5a2a'); g.addColorStop(0.5, '#4e8a3e'); g.addColorStop(1, '#2a4a20');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SK.W, SK.H);
    },
    back(ctx, st, m) {
      const cam = m.camera;
      st.drawLayer(ctx, cam, 0.2, 'far', (c) => {
        const rnd = srand(21);
        for (let i = 0; i < 16; i++) {
          const x = -300 + i * 140 + rnd() * 60, w = 30 + rnd() * 30;
          c.fillStyle = 'rgba(30,60,30,0.7)'; c.fillRect(x, -300, w, st.height + 600);
        }
        c.globalAlpha = 0.15;
        for (let i = 0; i < 6; i++) {
          c.fillStyle = '#fff8c0';
          c.beginPath(); c.moveTo(i * 300, -300); c.lineTo(i * 300 + 80, -300); c.lineTo(i * 300 + 300, st.height); c.lineTo(i * 300 + 160, st.height); c.fill();
        }
        c.globalAlpha = 1;
      });
      st.drawLayer(ctx, cam, 0.55, 'mid', (c) => {
        const rnd = srand(31);
        for (let i = 0; i < 12; i++) {
          const x = -300 + i * 200 + rnd() * 80, w = 50 + rnd() * 40;
          c.fillStyle = '#3a2a16'; c.fillRect(x, -300, w, st.height + 600);
          c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + w * 0.6, -300, w * 0.4, st.height + 600);
        }
        for (let i = 0; i < 30; i++) {
          c.fillStyle = rnd() > 0.5 ? '#2f6a24' : '#3c7a2c';
          c.beginPath(); c.arc(-300 + rnd() * (st.width + 600), -120 + rnd() * 260, 90 + rnd() * 80, 0, TAU); c.fill();
        }
      });
      st.drawCached(ctx, 'world', (c) => {
        // giant trunks
        [[260, 120], [1340, 120]].forEach(([x, w]) => {
          const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
          g.addColorStop(0, '#4a3018'); g.addColorStop(0.5, '#6a4626'); g.addColorStop(1, '#3a2410');
          c.fillStyle = g; c.fillRect(x - w / 2, 0, w, st.height);
          c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3;
          for (let y = 40; y < st.height; y += 70) { c.beginPath(); c.moveTo(x - w / 2 + 10, y); c.quadraticCurveTo(x, y + 20, x + w / 2 - 10, y + 6); c.stroke(); }
        });
        st.platforms.forEach((p, i) => {
          if (p.elevator) return;
          if (i === 6) { plank(c, p, '#7a5430', '#4a3018'); c.fillStyle = '#4a3018'; c.fillRect(p.x + 20, p.y + 12, 14, 40); c.fillRect(p.x + p.w - 34, p.y + 12, 14, 40); return; }
          branch(c, p, p.x > 800, '#5a3a1c', '#3c7a2c');
        });
        // canopy
        const rnd = srand(41);
        for (let i = 0; i < 26; i++) {
          c.fillStyle = rnd() > 0.5 ? '#2f6a24' : '#3c7a2c';
          c.beginPath(); c.arc(rnd() * st.width, rnd() * 140, 70 + rnd() * 70, 0, TAU); c.fill();
        }
        // ground
        const gg = c.createLinearGradient(0, st.groundY, 0, st.height);
        gg.addColorStop(0, '#4a3a20'); gg.addColorStop(1, '#2a2010');
        c.fillStyle = gg; c.fillRect(0, st.groundY, st.width, st.height - st.groundY);
        c.fillStyle = '#5a7a2a'; c.fillRect(0, st.groundY, st.width, 8);
        for (let i = 0; i < 40; i++) { c.fillStyle = SK.pick(['#8a5a2a', '#a06a2a', '#6a8a2a']); c.beginPath(); c.ellipse(rnd() * st.width, st.groundY + 14 + rnd() * 60, 8, 3, rnd(), 0, TAU); c.fill(); }
        // mushrooms
        [[160, 1020], [980, 1020], [1460, 1020]].forEach(([x, y]) => {
          c.fillStyle = '#f0e8d8'; c.fillRect(x - 4, y - 18, 8, 18);
          G().ellipse(c, x, y - 18, 16, 10, 0, '#d02a1a'); c.fillStyle = '#fff'; [[-6, -22], [4, -24], [8, -18]].forEach(([dx, dy]) => G().circle(c, x + dx, y + dy, 2.5, '#fff'));
        });
      });
      // elevator ropes + car
      const el = st.platforms[7];
      ctx.strokeStyle = '#c8a870'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(el.x + 12, 0); ctx.lineTo(el.x + 12, el.y); ctx.moveTo(el.x + el.w - 12, 0); ctx.lineTo(el.x + el.w - 12, el.y); ctx.stroke();
      G().circle(ctx, el.x + 12, 12, 12, '#6a4a2a', '#2a1a0a', 3); G().circle(ctx, el.x + el.w - 12, 12, 12, '#6a4a2a', '#2a1a0a', 3);
      ctx.fillStyle = '#8a6438'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3;
      ctx.fillRect(el.x, el.y, el.w, 14); ctx.strokeRect(el.x, el.y, el.w, 14);
      ctx.fillRect(el.x, el.y + 14, 10, 20); ctx.fillRect(el.x + el.w - 10, el.y + 14, 10, 20);
      ctx.fillRect(el.x, el.y + 30, el.w, 8);
      // nests and momma birds
      st.state.nests.forEach((n) => {
        const p = st.platforms[n.plat];
        nest(ctx, n.x, p.y + 2);
        const mom = n.mom;
        const angry = n.anger > 20 || mom.mode !== 'sit';
        SK.drawBird(ctx, mom.x, mom.y - (mom.mode === 'sit' ? Math.abs(Math.sin(st.t * 0.05)) * 2 : 0), mom.mode === 'sit' ? -1 : (mom.target && mom.target.x > mom.x ? 1 : -1), mom.mode === 'sit' ? 0 : st.t, 1.6);
        if (angry && mom.mode === 'sit') G().text(ctx, '!', mom.x, mom.y - 40, { size: 26, align: 'center', color: '#ff3020', stroke: '#000', strokeW: 4 });
      });
      // falling acorn warning marks
      st.state.marks.forEach((mk) => {
        const y = st.surfaceBelow(mk.x, 0);
        ctx.save(); ctx.globalAlpha = 0.25 + 0.4 * (1 - mk.t / 70);
        G().ellipse(ctx, mk.x, y, 30 * (1 - mk.t / 90), 7 * (1 - mk.t / 90), 0, '#000');
        ctx.restore();
      });
    },
    front(ctx, st) {
      ctx.fillStyle = '#2a4a18';
      const rnd = srand(9);
      for (let x = 0; x < st.width; x += 40) {
        ctx.beginPath(); ctx.ellipse(x + rnd() * 20, st.groundY + 30, 30, 16 + rnd() * 10, 0, Math.PI, 0); ctx.fill();
      }
    },
  };

  // ---------------------------------------------------------------------------
  // TUNDRA
  // ---------------------------------------------------------------------------
  const TUNDRA = {
    id: 'tundra', name: 'THE TUNDRA', width: 1600, height: 760, groundY: 680, music: 'fight3', friction: 0.16,
    blurb: 'Slippery ice, falling icicles and the occasional blizzard.',
    platforms: [
      { x: 190, y: 520, w: 240 }, { x: 1170, y: 520, w: 240 }, { x: 640, y: 380, w: 320 },
    ],
    init(st) {
      st.state.icicles = [];
      for (let x = 120; x < st.width; x += 160) st.state.icicles.push({ x: x + R(-30, 30), shake: 0, regrow: 0 });
      st.state.nextIcicle = 240;
      st.state.nextGust = 1100;
      st.state.gust = 0;
    },
    update(st, m) {
      const s = st.state;
      if (--s.nextIcicle <= 0) {
        const ready = s.icicles.filter((i) => i.regrow <= 0 && i.shake <= 0);
        const tgt = m.fighters.filter((f) => f.alive);
        if (ready.length) {
          let ic = SK.pick(ready);
          if (tgt.length && SK.chance(0.6)) { const f = SK.pick(tgt); ic = ready.reduce((a, b) => (Math.abs(b.x - f.x) < Math.abs(a.x - f.x) ? b : a)); }
          ic.shake = 50;
        }
        s.nextIcicle = 140 + R(0, 180);
      }
      s.icicles.forEach((ic) => {
        if (ic.regrow > 0) ic.regrow--;
        if (ic.shake > 0 && --ic.shake === 0) {
          ic.regrow = 400;
          m.addProjectile({ owner: null, team: -1, kind: 'icicle', x: ic.x, y: 60, vy: 2, gravity: 0.55, life: 200, passWalls: true, hazard: true,
            hit: { dmg: 65, stun: 24, kb: [2, -5], knockdown: true, heavy: true, special: false } });
          SK.audio.sfx('crack');
        }
      });
      if (--s.nextGust === 0) { s.gustDir = SK.chance(0.5) ? 1 : -1; s.gust = 150; m.bigText('BLIZZARD!', 60, '#cfefff'); SK.audio.sfx('whoosh'); }
      if (s.nextGust < 0 && s.gust <= 0) s.nextGust = 1000 + R(0, 700);
      if (s.gust > 0) {
        s.gust--;
        m.fighters.forEach((f) => { if (f.alive && f.state !== 'script' && f.state !== 'grabbed') f.x += s.gustDir * (f.onGround ? 1.3 : 2.2) / f.st.scale; });
        if (s.gust % 3 === 0) {
          const cam = m.camera;
          for (let i = 0; i < 4; i++) m.fx.add({ type: 'spark', x: cam.x - s.gustDir * 600 + R(-100, 100), y: cam.y + R(-300, 300), vx: s.gustDir * R(14, 20), vy: R(-1, 1), life: 70, size: 2, color: 'rgba(255,255,255,0.8)' }, true);
        }
      }
    },
    ambient(st, m) {
      if (st.t % 3 === 0) {
        const cam = m.camera;
        m.fx.add({ type: 'snow', x: cam.x + R(-700, 700), y: cam.y - 420, vx: R(-0.5, 0.5) + (st.state.gust > 0 ? st.state.gustDir * 6 : 0), vy: R(1, 2.2), life: 600, size: R(1.5, 3.5) });
      }
    },
    sky(ctx, st) {
      const g = ctx.createLinearGradient(0, 0, 0, SK.H);
      g.addColorStop(0, '#081028'); g.addColorStop(0.6, '#1c2c58'); g.addColorStop(1, '#3a4a78');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SK.W, SK.H);
      const rnd = srand(77);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(st.t * 0.02 + i)); ctx.fillRect(rnd() * SK.W, rnd() * SK.H * 0.6, 2, 2); }
      ctx.globalAlpha = 1;
      // aurora
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = k === 1 ? '#a050ff' : '#40ff9a';
        ctx.beginPath();
        for (let x = 0; x <= SK.W; x += 20) ctx.lineTo(x, 80 + k * 30 + Math.sin(x * 0.01 + st.t * 0.01 + k) * 40);
        for (let x = SK.W; x >= 0; x -= 20) ctx.lineTo(x, 160 + k * 30 + Math.sin(x * 0.012 + st.t * 0.012 + k) * 40);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    back(ctx, st, m) {
      const cam = m.camera;
      st.drawLayer(ctx, cam, 0.15, 'far', (c) => mountains(c, 560, 360, '#4a5a88', st.width, 4, '#e8f0ff', st.height + 200));
      st.drawLayer(ctx, cam, 0.45, 'mid', (c) => {
        mountains(c, 620, 220, '#6a7aa8', st.width, 8, '#f4f8ff', st.height + 200);
        const rnd = srand(12);
        for (let i = 0; i < 16; i++) pine(c, -200 + i * 130 + rnd() * 50, 640, 0.6 + rnd() * 0.4, '#1e4a3a', '#eef6ff');
      });
      st.drawCached(ctx, 'world', (c) => {
        // overhang with icicle roots
        c.fillStyle = '#3a4a6a';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(st.width, 0); c.lineTo(st.width, 40);
        for (let x = st.width; x >= 0; x -= 40) c.lineTo(x, 40 + (x % 80 ? 12 : 0));
        c.closePath(); c.fill();
        c.fillStyle = '#e8f4ff'; c.fillRect(0, 34, st.width, 10);
        st.platforms.forEach((p) => {
          c.fillStyle = '#bfe6ff'; c.strokeStyle = '#5a98c8'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + p.w, p.y); c.lineTo(p.x + p.w - 20, p.y + 26); c.lineTo(p.x + p.w / 2, p.y + 46); c.lineTo(p.x + 20, p.y + 26); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#fff'; c.fillRect(p.x + 4, p.y, p.w - 8, 6);
        });
        // ground ice
        const gg = c.createLinearGradient(0, st.groundY, 0, st.height);
        gg.addColorStop(0, '#e8f6ff'); gg.addColorStop(0.2, '#b8dcf4'); gg.addColorStop(1, '#7aa8d0');
        c.fillStyle = gg; c.fillRect(0, st.groundY, st.width, st.height - st.groundY);
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
        const rnd = srand(3);
        for (let i = 0; i < 18; i++) { const x = rnd() * st.width; c.beginPath(); c.moveTo(x, st.groundY + 10); c.lineTo(x + 40, st.groundY + 14 + rnd() * 10); c.stroke(); }
        // igloo
        c.fillStyle = '#f4faff'; c.strokeStyle = '#9ac4e0'; c.lineWidth = 2;
        c.beginPath(); c.arc(140, st.groundY, 70, Math.PI, 0); c.fill(); c.stroke();
        for (let k = 1; k < 4; k++) { c.beginPath(); c.arc(140, st.groundY, 70, Math.PI + k * 0.1, -k * 0.1); c.stroke(); }
        c.fillStyle = '#2a3a5a'; c.beginPath(); c.arc(170, st.groundY, 22, Math.PI, 0); c.fill();
      });
      st.state.icicles.forEach((ic) => {
        if (ic.regrow > 300) return;
        const k = ic.regrow > 0 ? 1 - ic.regrow / 300 : 1;
        const sx = ic.shake > 0 ? Math.sin(st.t * 1.5) * 3 : 0;
        ctx.fillStyle = '#e6f7ff'; ctx.strokeStyle = '#5ab0e8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ic.x - 10 + sx, 44); ctx.lineTo(ic.x + 10 + sx, 44); ctx.lineTo(ic.x + sx, 44 + 46 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
    },
  };

  // ---------------------------------------------------------------------------
  // GREAT WALL
  // ---------------------------------------------------------------------------
  const WALL = {
    id: 'greatwall', name: 'THE GREAT WALL', width: 1800, height: 760, groundY: 660, music: 'fight3',
    blurb: 'Ten thousand li of battlements. The tower guards love their fireworks.',
    platforms: [
      { x: 730, y: 470, w: 340 }, { x: 820, y: 290, w: 160 },
      { x: 260, y: 500, w: 170 }, { x: 1370, y: 500, w: 170 },
    ],
    init(st) { st.state.nextRocket = 400; st.state.targets = []; st.state.shows = []; },
    update(st, m) {
      const s = st.state;
      if (--s.nextRocket <= 0) {
        const live = m.fighters.filter((f) => f.alive);
        if (live.length) {
          const f = SK.pick(live);
          s.targets.push({ x: SK.clamp(f.x + R(-60, 60), 40, st.width - 40), t: 80 });
          SK.audio.sfx('firework');
        }
        s.nextRocket = 300 + R(0, 240);
      }
      s.targets.forEach((tg) => {
        tg.t--;
        if (tg.t === 50) {
          // launch from the tower; aim to land on the mark
          const sx = 900, sy = 260;
          const T = 50;
          const tyGround = st.surfaceBelow(tg.x, 0);
          const vx = (tg.x - sx) / T;
          const g = 0.35;
          const vy = (tyGround - sy - 0.5 * g * T * T) / T;
          m.addProjectile({ owner: null, team: -1, kind: 'firework', x: sx, y: sy, vx, vy, gravity: g, life: 200, passWalls: true, hazard: true,
            hit: { dmg: 70, stun: 26, kb: [6, -10], knockdown: true, heavy: true, special: false } });
        }
      });
      s.targets = s.targets.filter((tg) => tg.t > 0);
    },
    ambient(st, m) {
      const s = st.state;
      if (st.t % 140 === 0) s.shows.push({ x: R(200, st.width - 200), y: R(60, 220), t: 0, col: SK.pick(['#ff5070', '#ffd040', '#60e0ff', '#a0ff60']) });
      s.shows.forEach((sh) => sh.t++);
      s.shows = s.shows.filter((sh) => sh.t < 70);
      m.projectiles.forEach((p) => { if (p.kind === 'firework' && p.t % 2 === 0) m.fx.add({ type: 'spark', x: p.x, y: p.y, vx: R(-1, 1), vy: R(0, 1), life: 16, size: 2, color: '#ffd040' }); });
    },
    sky(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, SK.H);
      g.addColorStop(0, '#3a2a6a'); g.addColorStop(0.45, '#d8687a'); g.addColorStop(0.8, '#ffb070'); g.addColorStop(1, '#ffd8a0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SK.W, SK.H);
      G().circle(ctx, SK.W * 0.25, SK.H * 0.62, 60, 'rgba(255,230,160,0.5)');
      G().circle(ctx, SK.W * 0.25, SK.H * 0.62, 44, '#ffe8a0');
    },
    back(ctx, st, m) {
      const cam = m.camera;
      // ambient fireworks in the sky
      ctx.save();
      ctx.translate((cam.x - st.width / 2) * 0.9, (cam.y - st.height / 2) * 0.9);
      st.state.shows.forEach((sh) => {
        const k = sh.t / 70;
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * TAU;
          G().circle(ctx, sh.x + Math.cos(a) * 70 * SK.ease.out(k), sh.y + Math.sin(a) * 70 * SK.ease.out(k) + k * k * 30, 3, sh.col);
        }
      });
      ctx.restore();
      st.drawLayer(ctx, cam, 0.1, 'far', (c) => {
        mountains(c, 520, 260, 'rgba(120,70,110,0.8)', st.width, 15, null, st.height + 200);
        mountains(c, 580, 180, 'rgba(90,60,90,0.9)', st.width, 16, null, st.height + 200);
      });
      st.drawLayer(ctx, cam, 0.4, 'mid', (c) => {
        mountains(c, 640, 160, '#5a4a60', st.width, 17, null, st.height + 200);
        // distant wall snaking over the ridge
        c.strokeStyle = '#a08070'; c.lineWidth = 10;
        c.beginPath();
        for (let x = -300; x < st.width + 300; x += 20) c.lineTo(x, 520 - Math.sin(x * 0.005) * 60 - Math.sin(x * 0.013) * 20);
        c.stroke();
        c.fillStyle = '#a08070';
        for (let x = -300; x < st.width + 300; x += 260) { const y = 520 - Math.sin(x * 0.005) * 60 - Math.sin(x * 0.013) * 20; c.fillRect(x - 12, y - 30, 24, 30); }
      });
      st.drawCached(ctx, 'world', (c) => {
        // tower
        c.fillStyle = '#b89878'; c.strokeStyle = '#5a4030'; c.lineWidth = 3;
        c.fillRect(760, 470, 280, st.groundY - 470); c.strokeRect(760, 470, 280, st.groundY - 470);
        c.fillStyle = '#3a2a20'; c.beginPath(); c.arc(900, st.groundY, 50, Math.PI, 0); c.fill();
        // lower roof
        c.fillStyle = '#8a2a1a';
        c.beginPath(); c.moveTo(700, 480); c.quadraticCurveTo(750, 470, 760, 440); c.lineTo(1040, 440); c.quadraticCurveTo(1050, 470, 1100, 480); c.closePath(); c.fill();
        c.fillStyle = '#b89878'; c.fillRect(840, 300, 120, 140); c.strokeRect(840, 300, 120, 140);
        c.fillStyle = '#3a2a20'; c.fillRect(880, 340, 40, 50);
        c.fillStyle = '#8a2a1a';
        c.beginPath(); c.moveTo(790, 300); c.quadraticCurveTo(830, 290, 840, 260); c.lineTo(960, 260); c.quadraticCurveTo(970, 290, 1010, 300); c.closePath(); c.fill();
        c.fillStyle = '#ffd040'; c.beginPath(); c.moveTo(890, 260); c.lineTo(900, 230); c.lineTo(910, 260); c.fill();
        // lantern posts
        [st.platforms[2], st.platforms[3]].forEach((p) => {
          c.fillStyle = '#5a3020'; c.fillRect(p.x + p.w / 2 - 6, p.y, 12, st.groundY - p.y);
          c.fillStyle = '#7a4028'; c.fillRect(p.x, p.y, p.w, 12);
          [p.x + 18, p.x + p.w - 18].forEach((lx) => { c.strokeStyle = '#3a2010'; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, p.y + 12); c.lineTo(lx, p.y + 24); c.stroke(); G().ellipse(c, lx, p.y + 36, 12, 14, 0, '#e83a20', '#5a1008', 2); });
        });
        // back battlements
        c.fillStyle = '#9a7a62';
        c.fillRect(0, st.groundY - 50, st.width, 50);
        for (let x = 0; x < st.width; x += 60) c.fillRect(x, st.groundY - 76, 34, 28);
        // walkway bricks
        c.fillStyle = '#c8a888'; c.fillRect(0, st.groundY, st.width, st.height - st.groundY);
        c.strokeStyle = 'rgba(80,50,30,0.5)'; c.lineWidth = 2;
        for (let y = st.groundY; y < st.height; y += 18) {
          c.beginPath(); c.moveTo(0, y); c.lineTo(st.width, y); c.stroke();
          for (let x = (y / 18) % 2 ? 0 : 30; x < st.width; x += 60) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 18); c.stroke(); }
        }
      });
      // reticles
      st.state.targets.forEach((tg) => {
        const y = st.surfaceBelow(tg.x, 0);
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(st.t * 0.5);
        ctx.strokeStyle = '#ff2020'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(tg.x, y, 34, 9, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tg.x - 40, y); ctx.lineTo(tg.x + 40, y); ctx.stroke();
        ctx.restore();
      });
    },
    front(ctx, st) {
      ctx.fillStyle = '#a88a70';
      for (let x = 0; x < st.width; x += 90) { ctx.fillRect(x, st.height - 40, 50, 40); }
    },
  };

  // ---------------------------------------------------------------------------
  // CITY
  // ---------------------------------------------------------------------------
  const CITY = {
    id: 'city', name: 'THE CITY', width: 1800, height: 760, groundY: 670, music: 'fight2',
    blurb: 'Fire escapes, mailboxes and traffic that does not stop for squirrels.',
    platforms: [
      { x: 110, y: 520, w: 260 }, { x: 110, y: 370, w: 260 },
      { x: 1430, y: 520, w: 260 }, { x: 1430, y: 370, w: 260 },
      { x: 780, y: 520, w: 240 }, { x: 700, y: 300, w: 400 },
    ],
    init(st) { st.state.nextCar = 500; st.state.warn = 0; },
    update(st, m) {
      const s = st.state;
      if (--s.nextCar === 60) { s.warnDir = SK.chance(0.5) ? 1 : -1; s.warn = 60; SK.audio.sfx('horn'); }
      if (s.warn > 0) s.warn--;
      if (s.nextCar <= 0) {
        const p = groundVehicle(st, m, { kind: 'car', dir: s.warnDir, w: 184, h: 60, speed: 15, dmg: 85, draw: drawCar });
        p.taxi = SK.chance(0.5);
        p.color = p.taxi ? '#f0c020' : SK.pick(['#c03030', '#3060c0', '#40a060', '#e0e0e0']);
        SK.audio.sfx('horn');
        s.nextCar = 600 + R(0, 500);
      }
    },
    ambient(st, m) {
      if (st.t % 10 === 0) m.fx.add({ type: 'puff', x: 560 + R(-10, 10), y: st.groundY - 4, vx: R(-0.3, 0.3), vy: -1.2, life: 60, size: 10, color: 'rgba(230,230,240,0.35)' });
    },
    sky(ctx, st) {
      const g = ctx.createLinearGradient(0, 0, 0, SK.H);
      g.addColorStop(0, '#0a0a20'); g.addColorStop(0.7, '#2a2050'); g.addColorStop(1, '#5a3060');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SK.W, SK.H);
      G().circle(ctx, SK.W * 0.7, 80, 34, '#fff8e0');
      G().circle(ctx, SK.W * 0.7 + 12, 74, 30, '#1a1638');
    },
    back(ctx, st, m) {
      const cam = m.camera;
      st.drawLayer(ctx, cam, 0.15, 'far', (c) => {
        const rnd = srand(91);
        for (let x = -400; x < st.width + 400;) {
          const w = 60 + rnd() * 80, h = 160 + rnd() * 260;
          c.fillStyle = '#1c1a34'; c.fillRect(x, 600 - h, w, h + 400);
          c.fillStyle = 'rgba(255,220,120,0.5)';
          for (let wy = 600 - h + 10; wy < 600; wy += 16) for (let wx = x + 6; wx < x + w - 6; wx += 12) if (rnd() > 0.6) c.fillRect(wx, wy, 5, 8);
          x += w + 6;
        }
      });
      st.drawLayer(ctx, cam, 0.45, 'mid', (c) => {
        const rnd = srand(92);
        for (let x = -400; x < st.width + 400;) {
          const w = 100 + rnd() * 120, h = 120 + rnd() * 200;
          c.fillStyle = '#2a2448'; c.fillRect(x, 640 - h, w, h + 400);
          c.fillStyle = 'rgba(255,230,140,0.75)';
          for (let wy = 640 - h + 14; wy < 630; wy += 22) for (let wx = x + 10; wx < x + w - 10; wx += 18) if (rnd() > 0.55) c.fillRect(wx, wy, 8, 12);
          x += w + 10;
        }
        // neon sign
        c.fillStyle = '#ff3a8a'; c.font = 'bold 34px Impact, sans-serif'; c.fillText('NUTS 24/7', 860, 380);
      });
      st.drawCached(ctx, 'world', (c) => {
        // foreground buildings with fire escapes
        [[60, 360, 0, 1], [1400, 360, 2, 3]].forEach(([bx, bw, a, b]) => {
          c.fillStyle = '#6a3a2a'; c.fillRect(bx, 200, bw, st.groundY - 200);
          c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
          for (let y = 210; y < st.groundY; y += 12) { c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + bw, y); c.stroke(); }
          c.fillStyle = '#2a2a3a';
          for (let y = 240; y < st.groundY - 60; y += 150) for (let x = bx + 30; x < bx + bw - 40; x += 90) { c.fillRect(x, y, 44, 64); c.fillStyle = 'rgba(255,220,120,0.6)'; c.fillRect(x + 4, y + 4, 36, 56); c.fillStyle = '#2a2a3a'; }
          [st.platforms[a], st.platforms[b]].forEach((p) => {
            c.fillStyle = '#2a2a2a'; c.fillRect(p.x, p.y, p.w, 8);
            c.strokeStyle = '#2a2a2a'; c.lineWidth = 3;
            c.beginPath(); c.moveTo(p.x, p.y - 30); c.lineTo(p.x + p.w, p.y - 30); c.stroke();
            for (let x = p.x; x <= p.x + p.w; x += 20) { c.beginPath(); c.moveTo(x, p.y); c.lineTo(x, p.y - 30); c.stroke(); }
          });
          c.strokeStyle = '#2a2a2a'; c.lineWidth = 4;
          c.beginPath(); c.moveTo(st.platforms[a].x + 40, st.platforms[a].y); c.lineTo(st.platforms[b].x + 120, st.platforms[b].y); c.stroke();
        });
        // bus stop
        const bs = st.platforms[4];
        c.fillStyle = '#444'; c.fillRect(bs.x + 10, bs.y, 8, st.groundY - bs.y); c.fillRect(bs.x + bs.w - 18, bs.y, 8, st.groundY - bs.y);
        c.fillStyle = '#3070c0'; c.fillRect(bs.x, bs.y, bs.w, 12);
        c.fillStyle = 'rgba(180,220,255,0.25)'; c.fillRect(bs.x + 18, bs.y + 12, bs.w - 36, 90);
        // billboard
        const bb = st.platforms[5];
        c.fillStyle = '#333'; c.fillRect(bb.x + 60, bb.y, 14, 220); c.fillRect(bb.x + bb.w - 74, bb.y, 14, 220);
        c.fillStyle = '#f4f0e0'; c.fillRect(bb.x + 10, bb.y + 14, bb.w - 20, 110);
        c.strokeStyle = '#222'; c.lineWidth = 4; c.strokeRect(bb.x + 10, bb.y + 14, bb.w - 20, 110);
        c.fillStyle = '#555'; c.fillRect(bb.x, bb.y, bb.w, 12);
        c.fillStyle = '#c02020'; c.font = 'bold 30px Impact, sans-serif'; c.textAlign = 'center';
        c.fillText('SQUIRREL KOMBAT', bb.x + bb.w / 2, bb.y + 60);
        c.fillStyle = '#222'; c.font = 'bold 18px Impact, sans-serif';
        c.fillText('NOW ON CLASSIC MAC OS', bb.x + bb.w / 2, bb.y + 95);
        // sidewalk & street
        c.fillStyle = '#8a8a90'; c.fillRect(0, st.groundY, st.width, 14);
        c.fillStyle = '#2c2c34'; c.fillRect(0, st.groundY + 14, st.width, st.height - st.groundY);
        c.fillStyle = '#e8d040';
        for (let x = 0; x < st.width; x += 90) c.fillRect(x, st.groundY + 50, 50, 6);
        // mailbox + hydrant
        c.fillStyle = '#2a50a0'; c.strokeStyle = '#102040'; c.lineWidth = 3;
        G().roundRect(c, 520, st.groundY - 70, 46, 60, 14); c.fill(); c.stroke();
        c.fillRect(530, st.groundY - 12, 8, 12); c.fillRect(548, st.groundY - 12, 8, 12);
        c.fillStyle = '#fff'; c.font = 'bold 9px sans-serif'; c.fillText('U.S. MAIL', 543, st.groundY - 40);
        c.fillStyle = '#d02a1a'; c.fillRect(1250, st.groundY - 36, 22, 36); G().circle(c, 1261, st.groundY - 38, 12, '#d02a1a');
        // manhole
        G().ellipse(c, 560, st.groundY + 30, 30, 7, 0, '#1a1a1a');
      });
      if (st.state.warn > 0) warningSign(ctx, st.state.warnDir > 0 ? cam.x - SK.W / 2 / cam.zoom + 60 : cam.x + SK.W / 2 / cam.zoom - 60, st.groundY - 110, st.t, 'CAR!');
    },
  };

  const DEFS = [FIELD, FOREST, TUNDRA, WALL, CITY];
  SK.STAGES = DEFS;
  SK.makeStage = (id) => new Stage(DEFS.find((d) => d.id === id) || DEFS[0]);
  SK.Stage = Stage;

  // Small thumbnail renderer for the stage-select screen.
  SK.drawStageThumb = function (ctx, def, x, y, w, h) {
    const st = SK.makeStage(def.id);
    st.noCache = true;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x, y);
    const zoom = Math.min(w / st.width, h / st.height) * 1.0;
    // sky (scaled from screen space)
    ctx.save(); ctx.scale(w / SK.W, h / SK.H); st.drawSky(ctx, { camera: { x: st.width / 2, y: st.height / 2, zoom: 1 } }); ctx.restore();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-st.width / 2, -st.height / 2);
    const fake = { camera: { x: st.width / 2, y: st.height / 2, zoom }, fighters: [], projectiles: [], fx: { add() {} } };
    st.drawBack(ctx, fake);
    st.drawFront(ctx, fake);
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
