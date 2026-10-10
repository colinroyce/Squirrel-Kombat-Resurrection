/* Keyboard + gamepad input. Produces per-player button states with edges. */
(function (root) {
  'use strict';
  const SK = root.SK;

  const BUTTONS = ['u', 'd', 'l', 'r', 'p', 'k', 'b'];

  // Two keyboard schemes share one keyboard (classic same-Mac two-player style).
  const KEYMAPS = [
    { u: ['KeyW'], d: ['KeyS'], l: ['KeyA'], r: ['KeyD'], p: ['KeyF'], k: ['KeyG'], b: ['KeyH'] },
    {
      u: ['ArrowUp'], d: ['ArrowDown'], l: ['ArrowLeft'], r: ['ArrowRight'],
      p: ['Comma', 'Numpad1', 'KeyK'], k: ['Period', 'Numpad2', 'KeyL'], b: ['Slash', 'Numpad3', 'Semicolon'],
    },
  ];
  const KEY_LABELS = [
    { move: 'W A S D', p: 'F', k: 'G', b: 'H' },
    { move: 'ARROWS', p: ', or K', k: '. or L', b: '/ or ;' },
  ];

  const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Tab', 'Backspace']);

  class PlayerInput {
    constructor(index) {
      this.index = index;
      this.held = {};
      this.prev = {};
      BUTTONS.forEach((b) => { this.held[b] = false; this.prev[b] = false; });
      this.usedPadLast = false;
    }
    pressed(b) { return this.held[b] && !this.prev[b]; }
    released(b) { return !this.held[b] && this.prev[b]; }
    anyPressed() { return BUTTONS.some((b) => this.pressed(b)); }
    snapshot() { const s = {}; BUTTONS.forEach((b) => { s[b] = this.held[b]; }); return s; }
  }

  // On-screen controls for phones/tablets (logical 960x540 coordinates).
  const touch = {
    active: false,
    pointers: new Map(),
    held: { u: false, d: false, l: false, r: false, p: false, k: false, b: false, esc: false },
    prevEsc: false,
    pad: { x: 118, y: 418, r: 84 },
    buttons: [
      { id: 'k', x: 888, y: 396, r: 40, label: 'K' },
      { id: 'p', x: 800, y: 452, r: 40, label: 'P' },
      { id: 'b', x: 888, y: 490, r: 34, label: 'BL' },
      { id: 'esc', x: 480, y: 516, r: 20, label: 'II' },
    ],
    compute() {
      const h = this.held;
      Object.keys(h).forEach((k) => { h[k] = false; });
      this.pointers.forEach((pt) => {
        const dx = pt.x - this.pad.x, dy = pt.y - this.pad.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.pad.r * 1.5 && pt.x < SK.W / 2) {
          if (dist > 16) {
            if (dx > dist * 0.42) h.r = true;
            if (dx < -dist * 0.42) h.l = true;
            if (dy > dist * 0.42) h.d = true;
            if (dy < -dist * 0.42) h.u = true;
          }
          return;
        }
        this.buttons.forEach((b) => { if (Math.hypot(pt.x - b.x, pt.y - b.y) < b.r * 1.3) h[b.id] = true; });
      });
    },
    draw(ctx) {
      if (!this.active) return;
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#000'; ctx.strokeStyle = '#ffd890'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.pad.x, this.pad.y, this.pad.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const h = this.held;
      [['u', 0, -1], ['d', 0, 1], ['l', -1, 0], ['r', 1, 0]].forEach(([k, ax, ay]) => {
        ctx.globalAlpha = h[k] ? 0.7 : 0.35;
        ctx.fillStyle = '#ffd890';
        const cx = this.pad.x + ax * this.pad.r * 0.62, cy = this.pad.y + ay * this.pad.r * 0.62;
        ctx.beginPath();
        ctx.moveTo(cx + ax * 16, cy + ay * 16);
        ctx.lineTo(cx - ay * 14 - ax * 8, cy + ax * 14 - ay * 8);
        ctx.lineTo(cx + ay * 14 - ax * 8, cy - ax * 14 - ay * 8);
        ctx.closePath(); ctx.fill();
      });
      this.buttons.forEach((b) => {
        ctx.globalAlpha = h[b.id] ? 0.7 : 0.35;
        ctx.fillStyle = h[b.id] ? '#ffb030' : '#000';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(b.r * 0.7) + 'px Impact, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.label, b.x, b.y + 1);
      });
      ctx.restore();
    },
  };

  const input = {
    BUTTONS,
    touch,
    KEYMAPS,
    KEY_LABELS,
    keys: Object.create(null),
    justDown: new Set(),
    players: [0, 1, 2, 3].map((i) => new PlayerInput(i)),
    padsPrev: [],
    padsNow: [],
    menu: { up: false, down: false, left: false, right: false, ok: false, back: false, start: false, any: false },
    menuHeld: { up: false, down: false, left: false, right: false },
    repeat: { up: 0, down: 0, left: 0, right: 0 },
    anyKeyHit: false,
    onFirstInteraction: null,

    init(target) {
      const fire = () => {
        if (this.onFirstInteraction) { const f = this.onFirstInteraction; this.onFirstInteraction = null; f(); }
      };
      root.addEventListener('keydown', (e) => {
        if (PREVENT.has(e.code)) e.preventDefault();
        if (!this.keys[e.code]) this.justDown.add(e.code);
        this.keys[e.code] = true;
        fire();
      });
      root.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      root.addEventListener('blur', () => { this.keys = Object.create(null); });
      if (target) {
        const toLogical = (e) => {
          const r = target.getBoundingClientRect();
          return { x: ((e.clientX - r.left) / r.width) * SK.W, y: ((e.clientY - r.top) / r.height) * SK.H };
        };
        target.addEventListener('pointerdown', (e) => {
          this.justDown.add('Pointer');
          fire();
          target.focus();
          if (e.pointerType === 'touch') {
            touch.active = true;
            touch.pointers.set(e.pointerId, toLogical(e));
            e.preventDefault();
          }
        });
        target.addEventListener('pointermove', (e) => {
          if (touch.pointers.has(e.pointerId)) { touch.pointers.set(e.pointerId, toLogical(e)); e.preventDefault(); }
        });
        const up = (e) => { touch.pointers.delete(e.pointerId); };
        target.addEventListener('pointerup', up);
        target.addEventListener('pointercancel', up);
        target.addEventListener('pointerleave', up);
        target.addEventListener('contextmenu', (e) => e.preventDefault());
      }
    },

    key(code) { return !!this.keys[code] || this.justDown.has(code); },
    keyHit(code) { return this.justDown.has(code); },

    pollPads() {
      this.padsPrev = this.padsNow;
      this.padsNow = [];
      const nav = root.navigator;
      if (!nav || !nav.getGamepads) return;
      const pads = nav.getGamepads() || [];
      let slot = 0;
      for (let i = 0; i < pads.length; i++) {
        const gp = pads[i];
        if (!gp || !gp.connected) continue;
        const btn = (n) => !!(gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.5));
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        this.padsNow[slot++] = {
          u: btn(12) || ay < -0.5,
          d: btn(13) || ay > 0.5,
          l: btn(14) || ax < -0.5,
          r: btn(15) || ax > 0.5,
          p: btn(2) || btn(3),
          k: btn(0) || btn(1),
          b: btn(4) || btn(5) || btn(6) || btn(7),
          start: btn(9),
          select: btn(8),
          a: btn(0),
          bb: btn(1),
        };
      }
    },

    padCount() { return this.padsNow.length; },
    padPressed(i, name) {
      const now = this.padsNow[i], prev = this.padsPrev[i];
      return !!(now && now[name] && !(prev && prev[name]));
    },

    // Called once per fixed update before scenes run.
    update() {
      this.pollPads();
      if (touch.active) {
        touch.compute();
        if (touch.held.esc && !touch.prevEsc) this.justDown.add('Escape');
        touch.prevEsc = touch.held.esc;
      }
      this.players.forEach((pl, i) => {
        BUTTONS.forEach((b) => { pl.prev[b] = pl.held[b]; });
        const map = KEYMAPS[i];
        const pad = this.padsNow[i];
        BUTTONS.forEach((b) => {
          let v = false;
          if (map) v = map[b].some((c) => this.key(c));
          if (pad && pad[b]) { v = true; pl.usedPadLast = true; }
          if (i === 0 && touch.active && touch.held[b]) v = true;
          pl.held[b] = v;
        });
        // Opposite directions cancel each other.
        if (pl.held.l && pl.held.r) { pl.held.l = pl.held.r = false; }
      });

      // Aggregate menu navigation across every device.
      const p0 = this.players[0], p1 = this.players[1];
      const anyPad = (name) => this.padsNow.some((_, i) => this.padPressed(i, name));
      const anyPadHeld = (name) => this.padsNow.some((p) => p && p[name]);
      const dirs = { up: 'u', down: 'd', left: 'l', right: 'r' };
      Object.keys(dirs).forEach((d) => {
        const b = dirs[d];
        const held = p0.held[b] || p1.held[b] || anyPadHeld(b);
        const was = this.menuHeld[d];
        this.menuHeld[d] = held;
        let fireDir = false;
        if (held && !was) { fireDir = true; this.repeat[d] = 0; }
        else if (held) {
          this.repeat[d]++;
          if (this.repeat[d] > 22 && this.repeat[d] % 6 === 0) fireDir = true;
        }
        this.menu[d] = fireDir;
      });
      this.menu.ok = this.keyHit('Enter') || this.keyHit('Space') || this.keyHit('NumpadEnter') ||
        p0.pressed('p') || p1.pressed('p') || anyPad('a') || anyPad('p');
      this.menu.back = this.keyHit('Escape') || this.keyHit('Backspace') || anyPad('bb');
      this.menu.start = this.keyHit('Enter') || this.keyHit('Escape') || this.keyHit('KeyP') || anyPad('start');
      this.anyKeyHit = this.justDown.size > 0 || this.padsNow.some((p, i) =>
        ['a', 'bb', 'p', 'k', 'start'].some((n) => this.padPressed(i, n)));
      this.menu.any = this.anyKeyHit;
    },

    // Clear one-frame key hits after the scene has consumed them.
    endFrame() { this.justDown.clear(); },

    // Reset edges (used when switching scenes so a held button does not
    // immediately trigger something on the next screen).
    swallow() {
      this.players.forEach((pl) => BUTTONS.forEach((b) => { pl.prev[b] = pl.held[b]; }));
      Object.keys(this.menu).forEach((k) => { this.menu[k] = false; });
      this.justDown.clear();
    },
  };

  SK.input = input;
})(typeof window !== 'undefined' ? window : globalThis);
