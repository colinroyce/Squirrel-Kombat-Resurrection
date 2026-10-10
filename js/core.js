/* Squirrel Kombat: Resurrection - core namespace, math helpers, settings, scenes. */
(function (root) {
  'use strict';
  const SK = (root.SK = root.SK || {});

  SK.W = 960;
  SK.H = 540;
  SK.FPS = 60;
  SK.VERSION = '1.0.0';

  // ---------------------------------------------------------------------------
  // Seedable RNG (mulberry32) so headless tests can be reproducible.
  // ---------------------------------------------------------------------------
  let rngState = (Date.now() ^ 0x5eed) >>> 0;
  SK.seed = function (n) { rngState = n >>> 0; };
  SK.random = function () {
    rngState = (rngState + 0x6d2b79f5) >>> 0;
    let t = rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  SK.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  SK.lerp = (a, b, t) => a + (b - a) * t;
  SK.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  SK.rand = (a, b) => a + SK.random() * (b - a);
  SK.randi = (a, b) => Math.floor(SK.rand(a, b + 1));
  SK.pick = (arr) => arr[Math.floor(SK.random() * arr.length)];
  SK.chance = (p) => SK.random() < p;
  SK.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  SK.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(SK.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  SK.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  SK.ease = {
    out: (t) => 1 - (1 - t) * (1 - t),
    in: (t) => t * t,
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    bounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  };

  // ---------------------------------------------------------------------------
  // Settings (persisted in localStorage when available)
  // ---------------------------------------------------------------------------
  const DEFAULTS = {
    difficulty: 1, // 0 easy, 1 medium, 2 hard
    rounds: 3, // best of
    timer: 99, // seconds, 0 = infinite
    blood: true,
    announcer: true,
    music: 0.5,
    sfx: 0.8,
    unlockedMailman: false,
    tournamentWins: 0,
  };
  SK.settings = Object.assign({}, DEFAULTS);
  SK.loadSettings = function () {
    try {
      const raw = root.localStorage && root.localStorage.getItem('squirrel-kombat-settings');
      if (raw) Object.assign(SK.settings, JSON.parse(raw));
    } catch (e) { /* storage unavailable */ }
  };
  SK.saveSettings = function () {
    try {
      if (root.localStorage) root.localStorage.setItem('squirrel-kombat-settings', JSON.stringify(SK.settings));
    } catch (e) { /* storage unavailable */ }
  };
  SK.DIFFICULTY_NAMES = ['EASY', 'MEDIUM', 'HARD'];

  // ---------------------------------------------------------------------------
  // Scene manager. A scene is any object with update(), render(ctx), and
  // optional enter()/exit().
  // ---------------------------------------------------------------------------
  SK.game = {
    scene: null,
    frame: 0,
    fade: 0, // 0..1 overlay used for transitions
    fadeDir: 0,
    pending: null,
    setScene(scene, instant) {
      if (instant || !this.scene) {
        if (this.scene && this.scene.exit) this.scene.exit();
        this.scene = scene;
        if (scene.enter) scene.enter();
        this.fade = instant ? 0 : 1;
        this.fadeDir = instant ? 0 : -1;
        return;
      }
      this.pending = scene;
      this.fadeDir = 1;
    },
    update() {
      this.frame++;
      if (this.fadeDir > 0) {
        this.fade += 0.12;
        if (this.fade >= 1) {
          this.fade = 1;
          if (this.scene && this.scene.exit) this.scene.exit();
          this.scene = this.pending;
          this.pending = null;
          if (this.scene.enter) this.scene.enter();
          this.fadeDir = -1;
        }
        return;
      }
      if (this.fadeDir < 0) {
        this.fade -= 0.08;
        if (this.fade <= 0) { this.fade = 0; this.fadeDir = 0; }
      }
      if (this.scene && this.scene.update) this.scene.update();
    },
    render(ctx) {
      if (this.scene && this.scene.render) this.scene.render(ctx);
      if (this.fade > 0) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = SK.clamp(this.fade, 0, 1);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, SK.W, SK.H);
        ctx.restore();
      }
    },
    get transitioning() { return this.fadeDir > 0; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
