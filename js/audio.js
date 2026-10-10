/* Synthesized sound effects, a tiny chiptune sequencer, and the announcer. */
(function (root) {
  'use strict';
  const SK = root.SK;

  // ---------------------------------------------------------------------------
  // Note helpers
  // ---------------------------------------------------------------------------
  const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function midi(name) {
    const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(name);
    if (!m) return null;
    return NOTE_IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  }
  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
  const tr = (note, semis) => name(midi(note) + semis);

  // Pattern builders -----------------------------------------------------------
  function bass(roots, style) {
    const out = [];
    roots.forEach((r) => {
      const R = r, O = tr(r, 12), F = tr(r, 7);
      let bar;
      switch (style) {
        case 'oompah': bar = [R, '-', '-', '-', F, '-', '-', '-', R, '-', '-', '-', F, '-', '-', '-']; break;
        case 'pulse': bar = [R, '.', R, '.', R, '.', R, '.', R, '.', R, '.', R, '.', O, '.']; break;
        case 'slow': bar = [R, '.', '.', '.', '.', '.', '.', '.', O, '.', '.', '.', R, '.', '.', '.']; break;
        case 'gallop': bar = [R, '-', R, R, '-', R, R, '-', R, '-', R, R, '-', O, F, '-']; break;
        default: bar = [R, '-', R, O, '-', R, '-', O, R, '-', R, O, '-', R, '-', O];
      }
      out.push(...bar);
    });
    return out.join(' ');
  }
  function arp(chords) {
    const out = [];
    chords.forEach((c) => {
      const [r, q] = c;
      const third = q === 'm' ? 3 : 4;
      const seq = [0, third, 7, 12, 7, third, 0, third, 7, 12, 15 - (q === 'm' ? 0 : -1), 12, 7, third, 7, 12];
      seq.forEach((s) => out.push(tr(r, s)));
    });
    return out.join(' ');
  }
  const rep = (s, n) => Array(n).fill(s).join(' ');

  const DR1 = 'k - h - s - h k k - h - s - h -';
  const DR2 = 'k - h k s - h - k k h - s - h h';
  const DR3 = 'k h h h s h h h k h k h s h h h';

  const TRACKS = {
    title: {
      bpm: 116,
      ch: [
        { wave: 'square', vol: 0.07, notes:
          'A4 . . . . . . . E5 . . . . . . . F5 . . . . . E5 . D5 . . . C5 . . . ' +
          'E5 . . . . . . . G5 . . . . . . . D5 . . . . . . . B4 . . . G4 . . . ' +
          'A4 . . . . . C5 . E5 . . . A5 . . . F5 . . . . . E5 . D5 . . . C5 . . . ' +
          'D5 . . . . . E5 . F5 . . . D5 . . . E5 . . . . . . . G#4 . . . B4 . . .' },
        { wave: 'square', vol: 0.025, notes: arp([['A3', 'm'], ['F3', 'M'], ['C4', 'M'], ['G3', 'M'], ['A3', 'm'], ['F3', 'M'], ['D3', 'm'], ['E3', 'M']]) },
        { wave: 'triangle', vol: 0.18, notes: bass(['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'D2', 'E2'], 'slow') },
        { drum: true, vol: 0.5, notes: rep('k - - - s - - - k - k - s - - -', 8) },
      ],
    },
    select: {
      bpm: 132,
      ch: [
        { wave: 'square', vol: 0.05, notes:
          'E5 . - E5 G5 . - B5 . . A5 . G5 . - - D5 . - D5 F#5 . - A5 . . G5 . F#5 . - - ' +
          'C5 . - C5 E5 . - G5 . . F#5 . E5 . - - B4 . - D5 F#5 . - B5 . . A5 . F#5 . . .' },
        { wave: 'square', vol: 0.02, notes: arp([['E4', 'm'], ['D4', 'M'], ['C4', 'M'], ['B3', 'm']]) },
        { wave: 'triangle', vol: 0.18, notes: bass(['E2', 'D2', 'C2', 'B1'], 'pulse') },
        { drum: true, vol: 0.4, notes: rep(DR1, 4) },
      ],
    },
    fight1: {
      bpm: 150,
      ch: [
        { wave: 'square', vol: 0.06, notes:
          'E5 . . . D5 . C5 . B4 . C5 . A4 . . . - - A4 . C5 . E5 . A5 . . . G5 . E5 . ' +
          'F5 . . . E5 . D5 . C5 . . . A4 . C5 . D5 . . . . . B4 . G4 . . . B4 . D5 . ' +
          'E5 . . . D5 . C5 . B4 . C5 . A4 . . . - - A4 . C5 . E5 . A5 . B5 . C6 . . . ' +
          'A5 . . . G5 . F5 . E5 . . . D5 . C5 . B4 . . . . . G#4 . E4 . . . - - - -' },
        { wave: 'sawtooth', vol: 0.06, filter: 900, notes: bass(['A1', 'A1', 'F1', 'G1', 'A1', 'A1', 'F1', 'E1'], 'drive') },
        { drum: true, vol: 0.55, notes: rep(DR1, 7) + ' ' + DR3 },
      ],
    },
    fight2: {
      bpm: 160,
      ch: [
        { wave: 'square', vol: 0.06, notes:
          'D5 . F5 . A5 . . . G5 . F5 . E5 . D5 . F5 . . . D5 . . . A#4 . . . D5 . F5 . ' +
          'E5 . . . G5 . . . C6 . . . A#5 . A5 . A5 . . . . . . . - - D5 . E5 . F5 . ' +
          'G5 . . . F5 . E5 . D5 . . . A4 . D5 . F5 . . . E5 . D5 . A#4 . . . - - A#4 . ' +
          'C5 . E5 . G5 . C6 . A#5 . A5 . G5 . E5 . A5 . . . . . . . C#5 . . . E5 . A4 .' },
        { wave: 'sawtooth', vol: 0.06, filter: 1000, notes: bass(['D2', 'A#1', 'C2', 'D2', 'D2', 'A#1', 'C2', 'A1'], 'gallop') },
        { drum: true, vol: 0.55, notes: rep(DR2, 7) + ' ' + DR3 },
      ],
    },
    fight3: {
      bpm: 140,
      ch: [
        { wave: 'square', vol: 0.06, notes:
          'E5 . G5 . A5 . B5 . . . A5 . G5 . E5 . D5 . . . E5 . G5 . A5 . . . G5 . D5 . ' +
          'E5 . . . . . G5 . E5 . D5 . B4 . . . D#5 . . . F#5 . . . B4 . . . - - - - ' +
          'B5 . . . A5 . G5 . A5 . B5 . D6 . B5 . A5 . . . G5 . E5 . D5 . . . E5 . G5 . ' +
          'E5 . . . D5 . B4 . A4 . B4 . D5 . E5 . F#5 . . . D#5 . . . B4 . . . - - - -' },
        { wave: 'triangle', vol: 0.03, notes: arp([['E4', 'm'], ['D4', 'M'], ['C4', 'M'], ['B3', 'M'], ['E4', 'm'], ['D4', 'M'], ['C4', 'M'], ['B3', 'M']]) },
        { wave: 'sawtooth', vol: 0.055, filter: 800, notes: bass(['E2', 'D2', 'C2', 'B1', 'E2', 'D2', 'C2', 'B1'], 'drive') },
        { drum: true, vol: 0.5, notes: rep(DR1, 3) + ' ' + DR3 + ' ' + rep(DR2, 3) + ' ' + DR3 },
      ],
    },
    boss: {
      bpm: 172,
      ch: [
        { wave: 'square', vol: 0.06, notes:
          'C5 . C5 . D#5 . C5 . G5 . . . F5 . D#5 . G#4 . . . C5 . D#5 . G#5 . . . G5 . F5 . ' +
          'A#4 . . . D5 . F5 . A#5 . . . G#5 . G5 . G5 . . . F5 . . . D5 . . . B4 . . .' },
        { wave: 'sawtooth', vol: 0.065, filter: 1200, notes: bass(['C2', 'G#1', 'A#1', 'G1'], 'gallop') },
        { drum: true, vol: 0.6, notes: rep(DR3, 4) },
      ],
    },
    mailman: {
      bpm: 128,
      ch: [
        { wave: 'sine', vol: 0.12, notes:
          'E5 . G5 . C6 . . . B5 . A5 . G5 . . . A5 . . . E5 . . . C5 . D5 . E5 . . . ' +
          'F5 . . . A5 . . . G5 . F5 . E5 . D5 . G5 . . . . . . . - - G4 . A4 . B4 .' },
        { wave: 'triangle', vol: 0.18, notes: bass(['C3', 'A2', 'F2', 'G2'], 'oompah') },
        { drum: true, vol: 0.3, notes: rep('k - h - s - h - k - h - s - h -', 4) },
      ],
    },
    victory: {
      bpm: 140, loop: false,
      ch: [
        { wave: 'square', vol: 0.08, notes: 'C5 . E5 . G5 . C6 . . . G5 . C6 . . . . . . . - - - -' },
        { wave: 'triangle', vol: 0.2, notes: 'C3 . . . . . . . G2 . . . C3 . . . . . . . - - - -' },
        { drum: true, vol: 0.5, notes: 'k - - - s - - - k - - - s - s - k - - - - - - -' },
      ],
    },
  };

  // ---------------------------------------------------------------------------
  // Engine
  // ---------------------------------------------------------------------------
  const audio = {
    ctx: null,
    ready: false,
    master: null,
    musicGain: null,
    sfxGain: null,
    noiseBuf: null,
    track: null,
    trackName: null,
    chState: [],
    step: 0,
    nextTime: 0,
    voices: [],

    init() {
      if (this.ctx) return;
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (e) { return; }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp);
      comp.connect(c.destination);
      this.musicGain = c.createGain();
      this.sfxGain = c.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.applyVolumes();
      const len = c.sampleRate * 1.0;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.ready = true;
      if (c.state === 'suspended') c.resume();
      if (this.trackName) { const t = this.trackName; this.trackName = null; this.play(t); }
      this.loadVoices();
    },

    applyVolumes() {
      if (!this.ctx) return;
      this.musicGain.gain.value = SK.settings.music * 0.9;
      this.sfxGain.gain.value = SK.settings.sfx;
    },

    // --- primitive voices ------------------------------------------------------
    tone(f, dur, opts) {
      if (!this.ready) return;
      const o = opts || {};
      const c = this.ctx, t = c.currentTime + (o.delay || 0);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
      if (o.vib) {
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = o.vib; lg.gain.value = o.vibDepth || 30;
        lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
      }
      const v = o.vol == null ? 0.2 : o.vol;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(o.out || this.sfxGain);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    },
    noise(dur, opts) {
      if (!this.ready) return;
      const o = opts || {};
      const c = this.ctx, t = c.currentTime + (o.delay || 0);
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = o.filter || 'lowpass';
      f.frequency.setValueAtTime(o.f || 2000, t);
      if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
      f.Q.value = o.q || 1;
      const g = c.createGain();
      const v = o.vol == null ? 0.2 : o.vol;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(o.out || this.sfxGain);
      src.start(t, Math.random() * 0.5);
      src.stop(t + dur + 0.05);
    },

    // --- named effects ---------------------------------------------------------
    sfx(name, opt) {
      if (!this.ready) return;
      const r = (a, b) => a + Math.random() * (b - a);
      switch (name) {
        case 'swing': this.noise(0.12, { filter: 'bandpass', f: 700, fTo: 2600, q: 1.5, vol: 0.18 }); break;
        case 'swingHeavy': this.noise(0.2, { filter: 'bandpass', f: 400, fTo: 1600, q: 1.2, vol: 0.25 }); break;
        case 'hit':
          this.noise(0.08, { f: 2600, fTo: 500, vol: 0.35 });
          this.tone(r(150, 180), 0.12, { type: 'sine', to: 60, vol: 0.4 });
          break;
        case 'hitHeavy':
          this.noise(0.2, { f: 1800, fTo: 200, vol: 0.5 });
          this.tone(110, 0.28, { type: 'sine', to: 35, vol: 0.6 });
          this.tone(70, 0.15, { type: 'square', to: 40, vol: 0.15 });
          break;
        case 'block':
          this.tone(1100, 0.05, { type: 'square', to: 700, vol: 0.12 });
          this.noise(0.05, { filter: 'highpass', f: 3000, vol: 0.2 });
          break;
        case 'jump': this.tone(420, 0.09, { type: 'square', to: 900, vol: 0.05 }); break;
        case 'land': this.tone(130, 0.07, { type: 'sine', to: 60, vol: 0.2 }); break;
        case 'thud':
          this.tone(90, 0.25, { type: 'sine', to: 30, vol: 0.5 });
          this.noise(0.18, { f: 600, fTo: 100, vol: 0.3 });
          break;
        case 'squeak': {
          const b = (opt && opt.pitch) || 1;
          this.tone(1500 * b, 0.12, { type: 'triangle', to: 2300 * b, vol: 0.12, vib: 40, vibDepth: 200 });
          this.tone(2100 * b, 0.08, { type: 'triangle', to: 1300 * b, vol: 0.1, delay: 0.1 });
          break;
        }
        case 'chitter': {
          const b = (opt && opt.pitch) || 1;
          for (let i = 0; i < 4; i++) this.tone(r(1700, 2500) * b, 0.04, { type: 'triangle', vol: 0.08, delay: i * 0.055 });
          break;
        }
        case 'hurt': {
          const b = (opt && opt.pitch) || 1;
          this.tone(1300 * b, 0.18, { type: 'sawtooth', to: 700 * b, vol: 0.07, vib: 30, vibDepth: 120 });
          break;
        }
        case 'grunt': this.tone(160, 0.2, { type: 'sawtooth', to: 90, vol: 0.12, vib: 18, vibDepth: 20 }); break;
        case 'projectile':
          this.tone(300, 0.14, { type: 'square', to: 700, vol: 0.08 });
          this.noise(0.12, { filter: 'bandpass', f: 1200, vol: 0.12 });
          break;
        case 'throw': this.noise(0.15, { filter: 'bandpass', f: 1500, fTo: 3000, vol: 0.15 }); break;
        case 'explode':
          this.noise(0.7, { f: 1600, fTo: 80, vol: 0.6 });
          this.tone(90, 0.6, { type: 'sine', to: 25, vol: 0.6 });
          break;
        case 'freeze':
          for (let i = 0; i < 5; i++) this.tone(r(1800, 3200), 0.25, { type: 'sine', vol: 0.06, delay: i * 0.04 });
          this.noise(0.3, { filter: 'highpass', f: 4000, vol: 0.12 });
          break;
        case 'shatter':
          for (let i = 0; i < 8; i++) this.tone(r(2000, 5000), 0.12, { type: 'triangle', vol: 0.06, delay: i * 0.025 });
          this.noise(0.4, { filter: 'highpass', f: 2500, fTo: 6000, vol: 0.3 });
          break;
        case 'fire': this.noise(0.5, { filter: 'bandpass', f: 500, fTo: 1400, q: 0.7, vol: 0.3, attack: 0.05 }); break;
        case 'zap':
          for (let i = 0; i < 6; i++) this.tone(r(200, 1400), 0.05, { type: 'square', vol: 0.08, delay: i * 0.035 });
          this.noise(0.25, { filter: 'highpass', f: 2000, vol: 0.2 });
          break;
        case 'laser': this.tone(1800, 0.35, { type: 'sawtooth', to: 600, vol: 0.08, vib: 60, vibDepth: 300 }); break;
        case 'teleport':
          this.tone(200, 0.25, { type: 'sine', to: 1600, vol: 0.12 });
          this.tone(1600, 0.2, { type: 'sine', to: 200, vol: 0.08, delay: 0.2 });
          break;
        case 'spear': this.noise(0.3, { filter: 'bandpass', f: 2500, fTo: 600, q: 3, vol: 0.2 }); this.tone(600, 0.2, { type: 'sawtooth', to: 200, vol: 0.05 }); break;
        case 'ko': this.tone(500, 0.8, { type: 'sawtooth', to: 70, vol: 0.12 }); break;
        case 'menuMove': this.tone(660, 0.05, { type: 'square', vol: 0.05 }); break;
        case 'menuOk': this.tone(660, 0.06, { type: 'square', vol: 0.06 }); this.tone(990, 0.1, { type: 'square', vol: 0.06, delay: 0.06 }); break;
        case 'menuBack': this.tone(500, 0.08, { type: 'square', to: 300, vol: 0.06 }); break;
        case 'lock': this.tone(220, 0.12, { type: 'square', vol: 0.1 }); this.noise(0.25, { f: 3000, fTo: 300, vol: 0.25 }); break;
        case 'unlock': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.15, { type: 'square', vol: 0.07, delay: i * 0.08 })); break;
        case 'bird':
          for (let i = 0; i < 3; i++) this.tone(r(2600, 3600), 0.06, { type: 'sine', to: r(1800, 4000), vol: 0.07, delay: i * 0.08 });
          break;
        case 'birdArmy':
          for (let i = 0; i < 14; i++) this.tone(r(2000, 4200), 0.07, { type: 'sine', to: r(1500, 4500), vol: 0.05, delay: i * 0.05 });
          this.noise(0.8, { filter: 'bandpass', f: 1500, vol: 0.12, attack: 0.1 });
          break;
        case 'horn':
          this.tone(392, 0.35, { type: 'square', vol: 0.07 });
          this.tone(330, 0.35, { type: 'square', vol: 0.07 });
          break;
        case 'mower': this.tone(55, 0.9, { type: 'sawtooth', vol: 0.08, vib: 24, vibDepth: 15, attack: 0.1 }); break;
        case 'whoosh': this.noise(0.5, { filter: 'bandpass', f: 300, fTo: 2000, q: 0.8, vol: 0.2, attack: 0.1 }); break;
        case 'firework': this.noise(0.4, { filter: 'highpass', f: 1500, fTo: 6000, vol: 0.12, attack: 0.1 }); break;
        case 'crack': this.noise(0.1, { filter: 'highpass', f: 1200, vol: 0.3 }); break;
        case 'whistle':
          this.tone(1200, 0.25, { type: 'sine', to: 1700, vol: 0.08 });
          this.tone(1700, 0.3, { type: 'sine', to: 1100, vol: 0.08, delay: 0.25 });
          break;
        case 'bark':
          for (let i = 0; i < 2; i++) {
            this.noise(0.09, { filter: 'bandpass', f: 700, q: 2, vol: 0.35, delay: i * 0.2 });
            this.tone(260, 0.09, { type: 'sawtooth', to: 160, vol: 0.12, delay: i * 0.2 });
          }
          break;
        case 'gulp': this.tone(300, 0.2, { type: 'sine', to: 90, vol: 0.3 }); this.tone(120, 0.3, { type: 'square', to: 80, vol: 0.05, delay: 0.3 }); break;
        case 'stamp': this.tone(80, 0.15, { type: 'square', to: 40, vol: 0.25 }); this.noise(0.1, { f: 900, vol: 0.4 }); break;
        case 'splat': this.noise(0.25, { f: 900, fTo: 150, vol: 0.5 }); this.tone(200, 0.2, { type: 'sine', to: 50, vol: 0.4 }); break;
        case 'bounce': this.tone(200, 0.15, { type: 'sine', to: 500, vol: 0.2 }); break;
        case 'gong':
          this.tone(110, 2.0, { type: 'sine', vol: 0.3, attack: 0.01 });
          this.tone(166, 1.8, { type: 'sine', vol: 0.12 });
          this.tone(231, 1.5, { type: 'triangle', vol: 0.06 });
          break;
        default: break;
      }
    },

    // --- music -------------------------------------------------------------------
    play(trackName) {
      if (this.trackName === trackName) return;
      this.stopMusic();
      this.trackName = trackName;
      const def = TRACKS[trackName];
      if (!def || !this.ready) return;
      this.track = def;
      this.chState = def.ch.map((ch) => ({ ch, events: this.parse(ch.notes), len: ch.notes.trim().split(/\s+/).length }));
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.08;
      this.busGain = this.ctx.createGain();
      this.busGain.gain.value = 1;
      this.busGain.connect(this.musicGain);
    },
    stopMusic() {
      this.trackName = null;
      this.track = null;
      if (this.busGain && this.ready) {
        const g = this.busGain;
        try {
          g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
          setTimeout(() => g.disconnect(), 400);
        } catch (e) { /* ignore */ }
      }
      this.busGain = null;
    },
    parse(str) {
      const toks = str.trim().split(/\s+/);
      const events = {};
      for (let i = 0; i < toks.length; i++) {
        const t = toks[i];
        if (t === '-' || t === '.') continue;
        let len = 1;
        while (toks[i + len] === '.') len++;
        events[i] = { tok: t, len };
      }
      return events;
    },
    tick() {
      if (!this.ready || !this.track) return;
      const c = this.ctx;
      const stepDur = 60 / this.track.bpm / 4;
      while (this.nextTime < c.currentTime + 0.15) {
        let anyLeft = false;
        this.chState.forEach((s) => {
          let idx = this.step;
          if (this.track.loop === false) { if (idx >= s.len) return; } else idx %= s.len;
          anyLeft = true;
          const ev = s.events[idx];
          if (ev) this.playEvent(s.ch, ev, this.nextTime, stepDur);
        });
        if (!anyLeft && this.track.loop === false) { this.track = null; return; }
        this.step++;
        this.nextTime += stepDur;
      }
    },
    playEvent(ch, ev, t, stepDur) {
      const c = this.ctx;
      const out = this.busGain;
      if (!out) return;
      if (ch.drum) {
        const v = ch.vol;
        if (ev.tok === 'k') {
          const o = c.createOscillator(), g = c.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(150, t);
          o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
          g.gain.setValueAtTime(v * 0.9, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
          o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2);
        } else {
          const src = c.createBufferSource();
          src.buffer = this.noiseBuf;
          const f = c.createBiquadFilter();
          f.type = 'highpass';
          f.frequency.value = ev.tok === 'h' ? 7000 : 1200;
          const g = c.createGain();
          const d = ev.tok === 'h' ? 0.03 : 0.12;
          g.gain.setValueAtTime(ev.tok === 'h' ? v * 0.25 : v * 0.5, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          src.connect(f); f.connect(g); g.connect(out);
          src.start(t, Math.random() * 0.5); src.stop(t + d + 0.02);
        }
        return;
      }
      const m = midi(ev.tok);
      if (m == null) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = ch.wave || 'square';
      o.frequency.setValueAtTime(freq(m), t);
      const dur = ev.len * stepDur * 0.92;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(ch.vol, t + 0.008);
      g.gain.setValueAtTime(ch.vol, t + Math.max(0.01, dur - 0.03));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (ch.filter) {
        const f = c.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = ch.filter; f.Q.value = 4;
        o.connect(f); f.connect(g);
      } else o.connect(g);
      g.connect(out);
      o.start(t); o.stop(t + dur + 0.05);
    },

    // --- announcer ------------------------------------------------------------------
    voice: null,
    loadVoices() {
      const ss = root.speechSynthesis;
      if (!ss) return;
      const pickVoice = () => {
        const vs = ss.getVoices() || [];
        const en = vs.filter((v) => /^en/i.test(v.lang));
        this.voice = en.find((v) => /male|daniel|fred|alex|david|george|guy/i.test(v.name)) || en[0] || vs[0] || null;
      };
      pickVoice();
      if (ss.addEventListener) ss.addEventListener('voiceschanged', pickVoice);
    },
    say(text, opts) {
      if (!SK.settings.announcer) return;
      const ss = root.speechSynthesis;
      if (!ss || typeof root.SpeechSynthesisUtterance === 'undefined') return;
      try {
        const o = opts || {};
        if (o.interrupt !== false) ss.cancel();
        const u = new root.SpeechSynthesisUtterance(text);
        if (this.voice) u.voice = this.voice;
        u.pitch = o.pitch == null ? 0.4 : o.pitch;
        u.rate = o.rate == null ? 0.9 : o.rate;
        u.volume = Math.min(1, SK.settings.sfx + 0.2);
        ss.speak(u);
      } catch (e) { /* speech unavailable */ }
    },
  };

  audio.TRACKS = TRACKS;
  SK.audio = audio;
})(typeof window !== 'undefined' ? window : globalThis);
