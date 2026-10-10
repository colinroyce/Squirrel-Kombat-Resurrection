/* Procedural squirrel (and mailman) rig: IK limbs, bushy tail, costumes, poses. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const TAU = Math.PI * 2;

  // Bone lengths in rig units (1 unit = 1px at scale 1)
  const L = { thigh: 20, shin: 19, upper: 13, fore: 13, torso: 32, shoulder: 25 };

  // ---------------------------------------------------------------------------
  // Poses. Paw targets are relative to the shoulder, foot targets relative to
  // the root (feet on ground at 0,0). Facing right.
  // ---------------------------------------------------------------------------
  const BASE = {
    hip: [0, -36], lean: 0.12, head: 0,
    pB: [12, 10], pF: [17, 3],
    fB: [-12, 0], fF: [13, 0],
    tail: [0, 0], rot: 0, ox: 0, oy: 0, ball: 0, sx: 1, sy: 1,
    expr: 'normal',
  };

  function pose(over) {
    const p = {};
    for (const k in BASE) p[k] = Array.isArray(BASE[k]) ? BASE[k].slice() : BASE[k];
    if (over) for (const k in over) p[k] = Array.isArray(over[k]) ? over[k].slice() : over[k];
    return p;
  }

  function blend(a, b, t) {
    if (t <= 0) return a;
    if (t >= 1) return b;
    const p = {};
    for (const k in a) {
      const va = a[k], vb = b[k] === undefined ? va : b[k];
      if (Array.isArray(va)) p[k] = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t];
      else if (typeof va === 'number') p[k] = va + (vb - va) * t;
      else p[k] = t < 0.5 ? va : vb;
    }
    return p;
  }

  // Common poses
  const P = {
    stance: pose(),
    crouch: pose({ hip: [0, -21], lean: 0.45, fB: [-16, 0], fF: [16, 0], pB: [14, 2], pF: [18, -4], tail: [0.3, 0.3] }),
    block: pose({ lean: -0.05, pB: [15, -8], pF: [17, -14], head: -0.15, expr: 'angry' }),
    crouchBlock: pose({ hip: [0, -21], lean: 0.35, fB: [-16, 0], fF: [16, 0], pB: [16, -10], pF: [18, -15], head: -0.1, tail: [0.3, 0.3], expr: 'angry' }),
    jumpUp: pose({ hip: [0, -40], lean: 0.2, fB: [-8, -14], fF: [12, -16], pB: [8, -14], pF: [14, -18], tail: [-0.3, -0.4] }),
    jumpDown: pose({ hip: [0, -40], lean: 0.05, fB: [-10, -4], fF: [10, -6], pB: [-4, 4], pF: [18, -6], tail: [0.4, 0.4] }),
    land: pose({ hip: [0, -26], lean: 0.35, fB: [-16, 0], fF: [16, 0], pB: [10, 8], pF: [16, 6] }),
    hit: pose({ lean: -0.4, head: -0.4, pB: [-8, 14], pF: [-2, 16], fB: [-16, 0], fF: [10, 0], tail: [0.5, 0.6], expr: 'hurt' }),
    hitLow: pose({ hip: [0, -30], lean: 0.6, head: 0.3, pB: [6, 18], pF: [12, 16], tail: [0.5, 0.6], expr: 'hurt' }),
    launched: pose({ hip: [0, -38], lean: -0.6, head: -0.5, pB: [-14, -8], pF: [-6, -16], fB: [-14, -10], fF: [6, -4], tail: [0.8, 0.8], expr: 'hurt' }),
    down: pose({ hip: [0, -10], lean: -1.45, head: -0.2, pB: [-30, -6], pF: [-26, 0], fB: [24, -6], fF: [30, -10], tail: [1.4, 0.5], oy: 0, expr: 'ko' }),
    dizzy: pose({ hip: [0, -33], lean: 0.05, head: 0.2, pB: [4, 18], pF: [8, 18], fB: [-10, 0], fF: [10, 0], tail: [0.2, 0.5], expr: 'dizzy' }),
    victory: pose({ hip: [0, -38], lean: -0.1, head: -0.25, pB: [6, -26], pF: [12, -26], tail: [-0.2, -0.3], expr: 'happy' }),
    taunt: pose({ lean: 0.2, head: 0.1, pB: [4, 2], pF: [20, -14], expr: 'happy' }),
    frozen: pose({ expr: 'shock' }),
    grabbed: pose({ hip: [0, -40], lean: -0.3, head: -0.3, pB: [-2, -10], pF: [6, -14], fB: [-6, -6], fF: [6, -6], tail: [0.5, 0.6], expr: 'hurt' }),
    ball: pose({ ball: 1, hip: [0, -26] }),
    // attack poses
    jabWind: pose({ lean: 0.05, pF: [6, 4], pB: [14, 2] }),
    jab: pose({ lean: 0.3, pF: [30, -2], pB: [8, 8], fB: [-16, 0], fF: [16, 0], expr: 'angry' }),
    jab2: pose({ lean: 0.32, pB: [30, -4], pF: [8, 8], fB: [-16, 0], fF: [16, 0], expr: 'angry' }),
    kickWind: pose({ lean: -0.15, fF: [6, -14], pF: [10, -2], pB: [-6, 8] }),
    kick: pose({ lean: -0.35, hip: [0, -38], fF: [36, -34], fB: [-10, 0], pF: [0, 6], pB: [-12, 6], tail: [0.3, 0], expr: 'angry' }),
    kickHigh: pose({ lean: -0.5, hip: [0, -38], fF: [34, -52], fB: [-10, 0], pF: [-2, 2], pB: [-14, 2], tail: [0.4, 0], expr: 'angry' }),
    upperWind: pose({ hip: [0, -22], lean: 0.5, fB: [-16, 0], fF: [14, 0], pF: [6, 18], pB: [10, 8], tail: [0.3, 0.3] }),
    uppercut: pose({ hip: [0, -40], lean: -0.15, head: -0.3, fB: [-12, 0], fF: [12, -4], pF: [12, -34], pB: [2, 10], tail: [-0.3, -0.2], expr: 'angry' }),
    sweepWind: pose({ hip: [0, -20], lean: 0.6, fB: [-14, 0], fF: [12, 0], pF: [16, 10], pB: [6, 14], tail: [0.4, 0.4] }),
    sweep: pose({ hip: [0, -16], lean: 0.8, fB: [-12, 0], fF: [46, -2], pF: [6, 18], pB: [-4, 18], tail: [0.9, 0.2], expr: 'angry' }),
    airPunch: pose({ hip: [0, -40], lean: 0.4, fB: [-8, -12], fF: [10, -18], pF: [28, 12], pB: [6, 4], expr: 'angry' }),
    airKick: pose({ hip: [0, -40], lean: -0.2, fB: [-10, -18], fF: [38, -14], pF: [4, -6], pB: [-8, -2], tail: [0.4, 0], expr: 'angry' }),
    clawA: pose({ lean: 0.4, pF: [26, -12], pB: [22, 12], fB: [-16, 0], fF: [16, 0], expr: 'angry' }),
    clawB: pose({ lean: 0.4, pB: [26, -12], pF: [22, 12], fB: [-16, 0], fF: [16, 0], expr: 'angry' }),
    spin: pose({ lean: 0.1, pF: [20, 6], pB: [-20, 6], tail: [-0.8, -1.2], expr: 'angry' }),
    headbutt: pose({ lean: 0.9, head: 0.4, hip: [0, -32], fB: [-22, 0], fF: [12, 0], pB: [-14, 12], pF: [-6, 14], tail: [0.2, -0.5], expr: 'angry' }),
    headbuttWind: pose({ lean: -0.4, head: -0.4, pB: [-6, 4], pF: [0, 2] }),
    flipKick: pose({ hip: [0, -44], lean: -0.6, fB: [-8, -16], fF: [26, -60], pF: [-10, 0], pB: [-16, 6], tail: [0.6, 0.3], expr: 'angry' }),
    throwPose: pose({ lean: -0.4, head: -0.3, pF: [-4, -30], pB: [-10, -26], fB: [-16, 0], fF: [12, 0], expr: 'angry' }),
    cast: pose({ lean: 0.35, pF: [30, -10], pB: [24, -4], fB: [-18, 0], fF: [16, 0], expr: 'angry' }),
    castWind: pose({ lean: -0.15, pF: [-10, 4], pB: [-14, 2], fB: [-14, 0], fF: [12, 0] }),
    dash: pose({ hip: [0, -34], lean: 0.85, head: 0.2, pF: [30, 2], pB: [-16, 10], fB: [-24, -4], fF: [10, -2], tail: [0.8, -0.6], expr: 'angry' }),
    torpedo: pose({ hip: [0, -40], lean: 1.45, head: 0.3, pF: [30, 0], pB: [28, 6], fB: [-34, -36], fF: [-30, -42], tail: [1.1, -0.8], expr: 'angry' }),
    slide: pose({ hip: [0, -12], lean: -0.9, fF: [40, 0], fB: [20, -4], pB: [-20, 8], pF: [-14, 12], tail: [1.0, 0.3], expr: 'angry' }),
    glide: pose({ hip: [0, -40], lean: 1.2, head: 0.4, pF: [24, -16], pB: [22, -10], fB: [-30, -30], fF: [-26, -24], tail: [1.2, -1.2], expr: 'angry' }),
    breath: pose({ lean: 0.3, head: 0.2, pB: [8, 10], pF: [12, 12], fB: [-18, 0], fF: [14, 0], expr: 'shock' }),
    pound: pose({ hip: [0, -24], lean: 0.6, pF: [26, 22], pB: [20, 24], fB: [-18, 0], fF: [18, 0], expr: 'angry' }),
    poundAir: pose({ hip: [0, -42], lean: 0.1, pF: [10, -30], pB: [4, -28], fB: [-10, -10], fF: [10, -10], expr: 'angry' }),
    grabPose: pose({ lean: 0.35, pF: [26, -6], pB: [22, -2], fB: [-16, 0], fF: [14, 0], expr: 'angry' }),
    counter: pose({ lean: -0.1, pF: [20, -14], pB: [14, -18], head: -0.1, expr: 'angry' }),
    teleport: pose({ hip: [0, -38], lean: 0, pB: [-4, -26], pF: [4, -26], fB: [-4, 0], fF: [4, 0], tail: [-0.4, -0.6] }),
    eat: pose({ lean: 0.45, head: 0.35, pF: [20, 6], pB: [16, 10], expr: 'shock' }),
  };

  // ---------------------------------------------------------------------------
  // Two-bone IK
  // ---------------------------------------------------------------------------
  function ik(bx, by, tx, ty, l1, l2, bend) {
    let dx = tx - bx, dy = ty - by;
    let d = Math.hypot(dx, dy) || 0.0001;
    const maxd = l1 + l2 - 0.01;
    if (d > maxd) { tx = bx + (dx / d) * maxd; ty = by + (dy / d) * maxd; dx = tx - bx; dy = ty - by; d = maxd; }
    const mind = Math.abs(l1 - l2) + 0.5;
    if (d < mind) d = mind;
    const a = Math.atan2(dy, dx);
    const c = SK.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const ang = a + bend * Math.acos(c);
    return { jx: bx + Math.cos(ang) * l1, jy: by + Math.sin(ang) * l1, ex: tx, ey: ty };
  }

  // Compute skeleton points for a pose.
  function solve(p) {
    const hx = p.hip[0] + p.ox, hy = p.hip[1] + p.oy;
    const ux = Math.sin(p.lean), uy = -Math.cos(p.lean);
    const neck = { x: hx + ux * L.torso, y: hy + uy * L.torso };
    const sh = { x: hx + ux * L.shoulder, y: hy + uy * L.shoulder };
    const ha = p.lean * 0.45 + p.head;
    const head = { x: neck.x + Math.cos(ha) * 4 - Math.sin(ha) * -12, y: neck.y + Math.sin(ha) * 4 + Math.cos(ha) * -12, a: ha };
    const legB = ik(hx - 3, hy, p.fB[0] + p.ox, p.fB[1] + p.oy, L.thigh, L.shin, -1);
    const legF = ik(hx + 3, hy, p.fF[0] + p.ox, p.fF[1] + p.oy, L.thigh, L.shin, -1);
    const armB = ik(sh.x - 2, sh.y, sh.x + p.pB[0], sh.y + p.pB[1], L.upper, L.fore, 1);
    const armF = ik(sh.x + 2, sh.y, sh.x + p.pF[0], sh.y + p.pF[1], L.upper, L.fore, 1);
    return { hip: { x: hx, y: hy }, ux, uy, neck, sh, head, legB, legF, armB, armF };
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------
  const FLASH_SKIN = {
    fur: '#ffffff', dark: '#e8e8e8', belly: '#ffffff', tail: '#ffffff', tailHi: '#ffffff', outline: '#ffffff',
    acc: [], accColor: '#ffffff', mask: null, skinTone: '#fff', shirt: '#fff', pants: '#fff',
  };

  function limb(ctx, x1, y1, x2, y2, w, col, outline) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = outline;
    ctx.lineWidth = w + 4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function tailPoints(s, p, skin, t) {
    const pts = [];
    const ax = s.hip.x - s.ux * 2 - 10 * Math.cos(p.lean), ay = s.hip.y - s.uy * 2 - 10 * Math.sin(p.lean) + 2;
    let ang = -2.15 + p.tail[0] + p.lean * 0.6 + Math.sin(t * 0.07) * 0.06;
    const curl = 1 + p.tail[1];
    const n = 14, seg = 6 * (skin.tailLen || 1);
    let x = ax, y = ay;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const r = (6 + 12 * Math.sin(Math.PI * (0.15 + 0.75 * u))) * (skin.tailFat || 1);
      pts.push({ x, y, r });
      ang += curl * (0.03 + u * 0.2) + Math.sin(t * 0.05 + i * 0.5) * 0.012;
      x += Math.cos(ang) * seg;
      y += Math.sin(ang) * seg;
    }
    return pts;
  }

  function drawTail(ctx, s, p, skin, t) {
    const pts = tailPoints(s, p, skin, t);
    ctx.fillStyle = skin.outline;
    pts.forEach((q) => { ctx.beginPath(); ctx.arc(q.x, q.y, q.r + 2.5, 0, TAU); ctx.fill(); });
    ctx.fillStyle = skin.tail;
    pts.forEach((q) => { ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); });
    ctx.fillStyle = skin.tailHi;
    ctx.globalAlpha *= 0.55;
    pts.forEach((q, i) => {
      if (i < 3) return;
      ctx.beginPath(); ctx.arc(q.x - q.r * 0.25, q.y - q.r * 0.2, q.r * 0.55, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha /= 0.55;
    if (skin.stripes) {
      ctx.strokeStyle = skin.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((q, i) => { if (i > 1) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
      ctx.stroke();
    }
  }

  function drawLeg(ctx, s, leg, hipOff, col, skin) {
    const hx = s.hip.x + hipOff, hy = s.hip.y;
    if (skin.human) {
      limb(ctx, hx, hy, leg.jx, leg.jy, 11, col, skin.outline);
      limb(ctx, leg.jx, leg.jy, leg.ex, leg.ey - 3, 9, col, skin.outline);
      SK.gfx.ellipse(ctx, leg.ex + 6, leg.ey - 3, 10, 5, 0, skin.shoes || '#111', skin.outline, 2);
      return;
    }
    // haunch
    const a = Math.atan2(leg.jy - hy, leg.jx - hx);
    SK.gfx.ellipse(ctx, (hx + leg.jx) / 2, (hy + leg.jy) / 2, 13, 9, a, col, skin.outline, 2.5);
    limb(ctx, leg.jx, leg.jy, leg.ex, leg.ey - 3, 6, col, skin.outline);
    SK.gfx.ellipse(ctx, leg.ex + 5, leg.ey - 3, 9, 4, 0, col, skin.outline, 2.5);
  }

  function drawArm(ctx, s, arm, shOff, col, skin, front) {
    const sx = s.sh.x + shOff, sy = s.sh.y;
    const upperCol = skin.human ? (skin.shirt) : (skin.metalArms ? '#9aa3ad' : col);
    const foreCol = skin.human ? skin.skinTone : (skin.metalArms ? '#b8c0c8' : col);
    limb(ctx, sx, sy, arm.jx, arm.jy, skin.human ? 9 : (skin.metalArms ? 8 : 6), upperCol, skin.outline);
    limb(ctx, arm.jx, arm.jy, arm.ex, arm.ey, skin.human ? 8 : (skin.metalArms ? 8 : 5.5), foreCol, skin.outline);
    if (skin.metalArms) {
      ctx.fillStyle = '#5d646b';
      ctx.beginPath(); ctx.arc(arm.jx, arm.jy, 3, 0, TAU); ctx.fill();
    }
    const pawCol = skin.human ? skin.skinTone : (skin.metalArms ? '#d0d6dc' : (front ? col : col));
    SK.gfx.circle(ctx, arm.ex, arm.ey, skin.human ? 6 : (skin.metalArms ? 5.5 : 4.5), pawCol, skin.outline, 2.5);
  }

  function drawTorso(ctx, s, p, skin) {
    const cx = (s.hip.x + s.neck.x) / 2, cy = (s.hip.y + s.neck.y) / 2;
    const bulk = skin.bulk || 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.lean);
    if (skin.human) {
      SK.gfx.ellipse(ctx, 0, 0, 17 * bulk, 22, 0, skin.shirt, skin.outline, 2.5);
      // belt
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(-16 * bulk, 12, 32 * bulk, 5);
      // strap
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-12, -18); ctx.lineTo(12, 14); ctx.stroke();
      // badge
      SK.gfx.circle(ctx, 8, -8, 3, '#e8c040', skin.outline, 1);
    } else {
      SK.gfx.ellipse(ctx, 0, 0, 15 * bulk, 21, 0, skin.fur, skin.outline, 2.5);
      SK.gfx.ellipse(ctx, 6 * bulk, 3, 8.5 * bulk, 15, 0, skin.belly, null);
      if (skin.stripes) {
        ctx.strokeStyle = skin.outline; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-10 * bulk, -14); ctx.quadraticCurveTo(-15 * bulk, 0, -9 * bulk, 15); ctx.stroke();
        ctx.strokeStyle = skin.belly; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-6 * bulk, -15); ctx.quadraticCurveTo(-11 * bulk, 0, -5 * bulk, 16); ctx.stroke();
      }
      if (skin.acc.includes('sash')) {
        ctx.strokeStyle = skin.accColor; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(13, 12); ctx.stroke();
      }
      if (skin.acc.includes('belt')) {
        ctx.fillStyle = skin.accColor;
        ctx.fillRect(-15 * bulk, 10, 30 * bulk, 5);
      }
    }
    ctx.restore();
  }

  function drawMembrane(ctx, s, skin) {
    // flying squirrel gliding membrane between front paw and front foot
    ctx.beginPath();
    ctx.moveTo(s.sh.x, s.sh.y);
    ctx.lineTo(s.armF.ex, s.armF.ey);
    ctx.quadraticCurveTo((s.armF.ex + s.legF.ex) / 2 + 4, (s.armF.ey + s.legF.ey) / 2 + 6, s.legF.ex, s.legF.ey - 3);
    ctx.lineTo(s.hip.x, s.hip.y);
    ctx.closePath();
    ctx.fillStyle = skin.membrane || skin.belly;
    ctx.globalAlpha *= 0.9;
    ctx.fill();
    ctx.globalAlpha /= 0.9;
    ctx.lineWidth = 2; ctx.strokeStyle = skin.outline; ctx.stroke();
  }

  function drawEye(ctx, x, y, expr, skin, big) {
    const o = skin.outline;
    const k = big ? 1.25 : 1;
    if (expr === 'ko') {
      ctx.strokeStyle = o; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke();
      return;
    }
    if (expr === 'hurt') {
      ctx.strokeStyle = o; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 3, y); ctx.lineTo(x - 4, y + 4); ctx.stroke();
      return;
    }
    SK.gfx.ellipse(ctx, x, y, 5 * k, 6 * k, 0, '#fff', o, 2);
    if (expr === 'dizzy') {
      ctx.strokeStyle = o; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) ctx.lineTo(x + Math.cos(a) * a * 0.45, y + Math.sin(a) * a * 0.5);
      ctx.stroke();
      return;
    }
    const pr = expr === 'shock' ? 1.6 : 2.8;
    SK.gfx.circle(ctx, x + 2 * k, y, pr * k, skin.eye || '#111');
    SK.gfx.circle(ctx, x + 2.8 * k, y - 1.5 * k, 0.9 * k, '#fff');
    if (skin.glowEye) SK.gfx.circle(ctx, x + 2 * k, y, pr * k, skin.glowEye);
    if (expr === 'angry') {
      ctx.strokeStyle = o; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 5, y - 9); ctx.lineTo(x + 6, y - 5); ctx.stroke();
    }
    if (expr === 'happy') {
      ctx.fillStyle = skin.fur;
      ctx.fillRect(x - 6, y + 2.5 * k, 12, 5);
    }
  }

  function drawSquirrelHead(ctx, s, p, skin, t, expr) {
    const o = skin.outline;
    ctx.save();
    ctx.translate(s.head.x, s.head.y);
    ctx.rotate(s.head.a);
    const dark = skin.dark;
    // back ear
    ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(-6, -26); ctx.lineTo(0, -11); ctx.closePath();
    ctx.fillStyle = dark; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = o; ctx.stroke();
    // head
    SK.gfx.ellipse(ctx, 0, 0, 16, 15, 0, skin.fur, o, 2.5);
    if (skin.stripes) {
      ctx.strokeStyle = o; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -14); ctx.quadraticCurveTo(-2, -4, 4, -12); ctx.stroke();
    }
    // snout
    SK.gfx.ellipse(ctx, 13, 5, 10, 8, 0.1, skin.fur, o, 2.5);
    SK.gfx.ellipse(ctx, 9, 8, 9, 5.5, 0, skin.belly, null);
    // nose & teeth
    const mouthOpen = expr === 'hurt' || expr === 'shock' || expr === 'ko';
    if (mouthOpen) {
      SK.gfx.ellipse(ctx, 16, 12, 4.5, 3.5, 0, '#5a0d0d', o, 1.5);
    }
    ctx.fillStyle = '#fff'; ctx.strokeStyle = o; ctx.lineWidth = 1.5;
    ctx.fillRect(16, 10, 5, 5.5); ctx.strokeRect(16, 10, 5, 5.5);
    ctx.beginPath(); ctx.moveTo(18.5, 10); ctx.lineTo(18.5, 15.5); ctx.stroke();
    if (expr === 'ko') {
      ctx.fillStyle = '#e86a8a';
      ctx.beginPath(); ctx.ellipse(13, 16, 3, 5, 0.4, 0, TAU); ctx.fill();
    }
    SK.gfx.circle(ctx, 22, 2, 3.4, '#2a1010', o, 1);
    // whiskers
    ctx.strokeStyle = 'rgba(30,15,5,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(18, 6); ctx.lineTo(30, 3); ctx.moveTo(18, 7); ctx.lineTo(29, 9); ctx.stroke();
    // mask (ninja squirrels)
    if (skin.mask) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 15, 0, 0, TAU);
      ctx.ellipse(13, 5, 10, 8, 0.1, 0, TAU);
      ctx.clip();
      ctx.fillStyle = skin.mask;
      ctx.fillRect(-20, 1, 50, 30);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(-20, 1, 50, 2);
      ctx.restore();
      SK.gfx.circle(ctx, 22, 2, 3.4, SK.gfx.shade(skin.mask, -0.3), o, 1);
    }
    // eye
    drawEye(ctx, 6, -3, expr, skin, skin.bigEyes);
    // front ear
    ctx.beginPath(); ctx.moveTo(-4, -11); ctx.lineTo(1, -29); ctx.lineTo(8, -12); ctx.closePath();
    ctx.fillStyle = skin.fur; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = o; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, -13); ctx.lineTo(1.5, -23); ctx.lineTo(5, -13); ctx.closePath();
    ctx.fillStyle = skin.innerEar || '#e7a39a'; ctx.fill();
    // tuft
    ctx.strokeStyle = o; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(1, -29); ctx.lineTo(-1, -33); ctx.moveTo(1, -29); ctx.lineTo(4, -33); ctx.stroke();

    // accessories
    if (skin.acc.includes('headband')) {
      ctx.fillStyle = skin.accColor;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, 0, 16.5, 15.5, 0, 0, TAU); ctx.clip();
      ctx.fillRect(-20, -11, 40, 6);
      ctx.restore();
      ctx.strokeStyle = o; ctx.lineWidth = 1.5;
      // tails
      const w1 = Math.sin(t * 0.25) * 4, w2 = Math.cos(t * 0.21) * 4;
      ctx.lineWidth = 4; ctx.strokeStyle = skin.accColor; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-15, -8); ctx.quadraticCurveTo(-24, -10 + w1, -32, -4 + w1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-15, -7); ctx.quadraticCurveTo(-24, -2 + w2, -30, 4 + w2); ctx.stroke();
    }
    if (skin.acc.includes('hat')) {
      ctx.beginPath();
      ctx.moveTo(-34, -6); ctx.lineTo(0, -32); ctx.lineTo(34, -6);
      ctx.quadraticCurveTo(0, -12, -34, -6);
      ctx.closePath();
      ctx.fillStyle = skin.accColor; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = o; ctx.stroke();
      ctx.strokeStyle = 'rgba(80,50,10,0.5)'; ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(i * 10, -9); ctx.stroke(); }
    }
    if (skin.acc.includes('cybereye')) {
      ctx.beginPath();
      ctx.moveTo(-1, -12); ctx.lineTo(13, -10); ctx.lineTo(14, 3); ctx.lineTo(0, 4); ctx.closePath();
      ctx.fillStyle = '#9ba5ad'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = o; ctx.stroke();
      SK.gfx.circle(ctx, 7, -3, 3.8, '#ff2020', o, 1);
      ctx.globalAlpha *= 0.5 + 0.5 * Math.abs(Math.sin(t * 0.1));
      SK.gfx.circle(ctx, 7, -3, 6, 'rgba(255,40,40,0.5)');
      ctx.globalAlpha = 1;
      SK.gfx.circle(ctx, 2, -9, 1, '#555'); SK.gfx.circle(ctx, 11, 1, 1, '#555');
    }
    if (skin.acc.includes('goldtooth')) {
      ctx.fillStyle = '#ffd040'; ctx.fillRect(18.5, 10, 2.5, 5.5);
    }
    ctx.restore();
  }

  function drawHumanHead(ctx, s, p, skin, t, expr) {
    const o = skin.outline;
    ctx.save();
    ctx.translate(s.head.x, s.head.y - 2);
    ctx.rotate(s.head.a);
    // ear
    SK.gfx.ellipse(ctx, -6, 2, 4, 6, 0, skin.skinTone, o, 2);
    // head
    SK.gfx.ellipse(ctx, 0, 0, 15, 17, 0, skin.skinTone, o, 2.5);
    // nose
    SK.gfx.ellipse(ctx, 15, 2, 6, 5, 0, SK.gfx.shade(skin.skinTone, -0.1), o, 2);
    // mustache
    ctx.fillStyle = '#4a2c14';
    ctx.beginPath();
    ctx.moveTo(4, 7); ctx.quadraticCurveTo(12, 3, 20, 8); ctx.quadraticCurveTo(14, 12, 10, 9); ctx.quadraticCurveTo(6, 12, 4, 7);
    ctx.fill();
    // mouth
    if (expr === 'hurt' || expr === 'shock' || expr === 'ko') SK.gfx.ellipse(ctx, 11, 13, 3.5, 3, 0, '#5a0d0d', o, 1.5);
    else { ctx.strokeStyle = o; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8, 13); ctx.lineTo(13, 13); ctx.stroke(); }
    drawEye(ctx, 7, -4, expr, skin, false);
    // cap
    ctx.beginPath();
    ctx.moveTo(-16, -6); ctx.quadraticCurveTo(-14, -22, 2, -22); ctx.quadraticCurveTo(16, -22, 15, -8); ctx.closePath();
    ctx.fillStyle = '#26467a'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = o; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -9); ctx.lineTo(27, -6); ctx.lineTo(12, -4); ctx.closePath();
    ctx.fillStyle = '#1a1a1a'; ctx.fill(); ctx.stroke();
    SK.gfx.circle(ctx, 4, -15, 3, '#e8c040', o, 1);
    ctx.restore();
  }

  function drawBall(ctx, s, p, skin, t, expr) {
    const cx = 0 + p.ox, cy = -26 + p.oy;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.rot);
    SK.gfx.circle(ctx, 0, 0, 25, skin.outline);
    SK.gfx.circle(ctx, 0, 0, 22.5, skin.tail);
    ctx.strokeStyle = skin.tailHi; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 13, 0.3, 4.6); ctx.stroke();
    ctx.strokeStyle = skin.outline; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let a = 0; a < 12; a += 0.3) ctx.lineTo(Math.cos(a) * a * 1.7, Math.sin(a) * a * 1.7);
    ctx.stroke();
    // face peeking
    SK.gfx.circle(ctx, 14, -6, 7, skin.fur, skin.outline, 2);
    SK.gfx.circle(ctx, 16, -8, 2.5, '#111');
    ctx.restore();
  }

  function drawSkeleton(ctx, s, p, skin) {
    const bone = '#f4efe0', o = '#2a2a2a';
    const seg = (x1, y1, x2, y2, w) => limb(ctx, x1, y1, x2, y2, w, bone, o);
    seg(s.hip.x, s.hip.y, s.neck.x, s.neck.y, 4);
    for (let i = 0; i < 4; i++) {
      const y = s.hip.y + (s.neck.y - s.hip.y) * (0.3 + i * 0.17), x = s.hip.x + (s.neck.x - s.hip.x) * (0.3 + i * 0.17);
      seg(x - 9, y, x + 9, y + 2, 2);
    }
    [s.legB, s.legF].forEach((l) => { seg(s.hip.x, s.hip.y, l.jx, l.jy, 4); seg(l.jx, l.jy, l.ex, l.ey, 3); seg(l.ex, l.ey, l.ex + 9, l.ey, 3); });
    [s.armB, s.armF].forEach((a) => { seg(s.sh.x, s.sh.y, a.jx, a.jy, 3); seg(a.jx, a.jy, a.ex, a.ey, 3); });
    ctx.save();
    ctx.translate(s.head.x, s.head.y);
    SK.gfx.ellipse(ctx, 0, 0, 14, 13, 0, bone, o, 2);
    SK.gfx.ellipse(ctx, 12, 5, 9, 6, 0, bone, o, 2);
    SK.gfx.circle(ctx, 5, -2, 4, '#111');
    SK.gfx.circle(ctx, 20, 3, 1.8, '#111');
    ctx.restore();
    // tail bones
    const pts = tailPoints(s, p, { tailLen: 1, tailFat: 1 }, 0);
    for (let i = 1; i < pts.length; i++) seg(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, 2);
  }

  /**
   * Draw a character. Origin = feet. Caller sets translate/scale/facing.
   * opts: { t, flash, skeleton, alpha }
   */
  function draw(ctx, p, skin, opts) {
    const o = opts || {};
    const t = o.t || 0;
    const sk = o.flash ? Object.assign({}, skin, FLASH_SKIN, { human: skin.human }) : skin;
    const expr = p.expr || 'normal';
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (p.ball > 0.5) { drawBall(ctx, null, p, sk, t, expr); ctx.restore(); return; }
    // whole-body rotation around the body centre
    if (p.rot) {
      ctx.translate(0, -36);
      ctx.rotate(p.rot);
      ctx.translate(0, 36);
    }
    if (p.sx !== 1 || p.sy !== 1) ctx.scale(p.sx, p.sy);
    const s = solve(p);
    if (o.skeleton) { drawSkeleton(ctx, s, p, sk); ctx.restore(); return; }
    const dark = sk.dark;
    if (!sk.human && !o.noTail) drawTail(ctx, s, p, sk, t);
    drawArm(ctx, s, s.armB, -2, dark, sk, false);
    drawLeg(ctx, s, s.legB, -3, sk.human ? SK.gfx.shade(sk.pants, -0.2) : dark, sk);
    if (sk.human) {
      // mail bag behind body
      ctx.save();
      ctx.translate(s.hip.x - 14, s.hip.y - 4);
      SK.gfx.roundRect(ctx, -12, -10, 22, 18, 4);
      ctx.fillStyle = '#7a4e22'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = sk.outline; ctx.stroke();
      ctx.restore();
    }
    drawTorso(ctx, s, p, sk);
    drawLeg(ctx, s, s.legF, 3, sk.human ? sk.pants : sk.fur, sk);
    if (sk.membrane) drawMembrane(ctx, s, sk);
    if (sk.human) drawHumanHead(ctx, s, p, sk, t, expr);
    else drawSquirrelHead(ctx, s, p, sk, t, expr);
    drawArm(ctx, s, s.armF, 2, sk.fur, sk, true);
    ctx.restore();
  }

  // Head-and-shoulders portrait used on select screens and the HUD.
  // (x, y) is the top-centre of a size×size box; the head is centred in it.
  function portrait(ctx, x, y, size, skin, o) {
    o = o || {};
    const p = pose({ expr: o.expr || 'angry', lean: 0.05, pF: [14, 4], pB: [10, 6], tail: [-0.15, 0.1] });
    const s = solve(p);
    const k = (size / 56) * (skin.human ? 0.9 : 1);
    ctx.save();
    ctx.translate(x, y + size * 0.5);
    ctx.scale(k * (o.flip ? -1 : 1), k);
    ctx.translate(-s.head.x - 4, -s.head.y + (skin.human ? 4 : 2));
    draw(ctx, p, skin, { t: o.t || 0 });
    ctx.restore();
  }

  SK.rig = { L, BASE, P, pose, blend, solve, draw, portrait, tailPoints };
})(typeof window !== 'undefined' ? window : globalThis);
