/* Title, menus, character/stage select, tournament ladder, options, help, credits. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const G = () => SK.gfx;
  const I = () => SK.input;
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------------------
  // Shared visuals
  // ---------------------------------------------------------------------------
  const embers = Array.from({ length: 60 }, (_, i) => ({ x: (i * 97) % SK.W, y: (i * 53) % SK.H, s: 1 + (i % 3), v: 0.4 + (i % 5) * 0.2 }));

  function menuBg(ctx, t, tint) {
    const g = ctx.createRadialGradient(SK.W / 2, SK.H * 0.45, 40, SK.W / 2, SK.H / 2, SK.W * 0.7);
    g.addColorStop(0, tint || '#5a1806');
    g.addColorStop(0.6, '#260803');
    g.addColorStop(1, '#0a0201');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SK.W, SK.H);
    embers.forEach((e, i) => {
      const y = (e.y - t * e.v) % SK.H;
      const yy = y < 0 ? y + SK.H : y;
      const x = e.x + Math.sin(t * 0.02 + i) * 14;
      ctx.globalAlpha = 0.25 + 0.5 * ((i % 7) / 7);
      G().circle(ctx, x, yy, e.s, i % 2 ? '#ff9a30' : '#ffd060');
    });
    ctx.globalAlpha = 1;
  }

  const LOGO_SKIN = Object.assign({}, null);
  function logoSkin() {
    if (!LOGO_SKIN.fur) Object.assign(LOGO_SKIN, SK.CHARS.nutso.skin, {
      fur: '#140602', dark: '#140602', belly: '#140602', tail: '#140602', tailHi: '#140602', outline: '#ffc840', acc: [], mask: null, innerEar: '#140602',
    });
    return LOGO_SKIN;
  }

  function logo(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // emblem
    const glow = 0.5 + 0.5 * Math.sin(t * 0.05);
    G().circle(ctx, 0, -10, 78, 'rgba(255,160,40,' + (0.12 + glow * 0.1) + ')');
    G().circle(ctx, 0, -10, 64, '#140602', '#ffc840', 6);
    G().circle(ctx, 0, -10, 56, null, '#a06010', 2);
    ctx.save();
    ctx.beginPath(); ctx.arc(0, -10, 54, 0, TAU); ctx.clip();
    ctx.translate(-4, 40);
    ctx.scale(1.05, 1.05);
    const p = SK.rig.pose(SK.rig.P.kick);
    p.expr = 'angry';
    SK.rig.draw(ctx, p, logoSkin(), { t });
    ctx.restore();
    G().text(ctx, 'SQUIRREL', -84, -12, { size: 82, align: 'right', font: G().TITLE_FONT, gradient: ['#fff6b0', '#ffc020', '#ff5a00', '#8a1000'], stroke: '#1a0400', strokeW: 10, shadow: 'rgba(0,0,0,0.6)', shadowOff: 6 });
    G().text(ctx, 'KOMBAT', 84, -12, { size: 82, align: 'left', font: G().TITLE_FONT, gradient: ['#fff6b0', '#ffc020', '#ff5a00', '#8a1000'], stroke: '#1a0400', strokeW: 10, shadow: 'rgba(0,0,0,0.6)', shadowOff: 6 });
    ctx.restore();
  }

  function header(ctx, str, y) {
    G().banner(ctx, str, SK.W / 2, y || 52, 52);
  }

  function hint(ctx, str) {
    G().text(ctx, str, SK.W / 2, SK.H - 18, { size: 14, align: 'center', color: '#d8c0a0', font: G().BODY_FONT });
  }

  function drawFighterPreview(ctx, ch, x, y, scale, t, flip, o) {
    o = o || {};
    const p = SK.rig.pose(o.pose ? SK.rig.P[o.pose] : SK.rig.P.stance);
    p.hip[1] += Math.sin(t * 0.12) * 1.5;
    p.tail[0] += Math.sin(t * 0.05) * 0.1;
    if (o.expr) p.expr = o.expr;
    const s = scale * (ch.skin.human ? 0.72 : 1) * (ch.stats.scale > 1.05 && !ch.skin.human ? 0.95 : 1);
    ctx.save();
    ctx.globalAlpha = 0.35;
    G().ellipse(ctx, x, y, 34 * s, 8 * s, 0, '#000');
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((flip ? -1 : 1) * s, s);
    SK.rig.draw(ctx, p, ch.skin, { t, alpha: o.alpha });
    ctx.restore();
  }

  // Move list panel, also used by the pause menu.
  SK.drawMoveList = function (ctx, ch, x, y, w, h) {
    G().panel(ctx, x, y, w, h, { fill: 'rgba(20,8,2,0.94)' });
    ctx.save();
    ctx.beginPath(); ctx.rect(x + 10, y + 10, 120, 120); ctx.clip();
    SK.rig.portrait(ctx, x + 70, y + 12, 110, ch.skin, { t: SK.game.frame });
    ctx.restore();
    G().text(ctx, ch.name, x + 140, y + 36, { size: 38, font: G().TITLE_FONT, gradient: ['#fff6b0', '#ffc020', '#ff5a00'], stroke: '#200800', strokeW: 6 });
    G().text(ctx, ch.title, x + 142, y + 72, { size: 16, color: '#ffd8a0', font: G().BODY_FONT });
    G().wrap(ctx, ch.bio, x + 142, y + 88, w - 170, 18, { size: 13, color: '#c8b8a0' });
    const col = (cx, cy, title, rows) => {
      G().text(ctx, title, cx, cy, { size: 20, color: '#ff9a40', font: G().UI_FONT });
      rows.forEach(([n, k], i) => {
        G().text(ctx, n, cx, cy + 28 + i * 22, { size: 15, color: '#fff', font: G().BODY_FONT });
        G().text(ctx, k, cx + (w / 2 - 60), cy + 28 + i * 22, { size: 15, color: '#ffd040', font: G().UI_FONT, align: 'right' });
      });
    };
    const cy = y + 150;
    col(x + 24, cy, 'NORMALS', [['Claw Jab', 'P'], ['Hind Kick', 'K'], ['Nut Uppercut', 'D + P'], ['Tail Sweep', 'D + K'], ['Nut Toss (close)', 'F + P'], ['Air attacks', 'P / K in air'], ['Block / Low block', 'BL / D + BL']]);
    col(x + w / 2 + 12, cy, 'SPECIALS', ch.specials.map((s, i) => [s.name, SK.SPECIAL_INPUTS[i]]));
    col(x + w / 2 + 12, cy + 130, 'COMBOS', ch.combos.map((c, i) => [c, SK.COMBO_INPUTS[i]]));
    col(x + 24, cy + 200, 'NUTALITY', [[ch.nutality.name, 'F B F + K']]);
    G().text(ctx, 'F = toward opponent   B = away   D = down   P = punch   K = kick   BL = block   Double-tap D to drop through platforms', x + w / 2, y + h - 18, { size: 12, align: 'center', color: '#a89880', font: G().BODY_FONT });
  };

  // ---------------------------------------------------------------------------
  // Boot (needed so the browser lets us start audio)
  // ---------------------------------------------------------------------------
  class BootScene {
    constructor() { this.t = 0; }
    enter() { this.t = 0; }
    update() {
      this.t++;
      if (I().menu.any && this.t > 5) {
        SK.audio.init();
        SK.game.setScene(new SK.IntroScene());
      }
    }
    render(ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SK.W, SK.H);
      logo(ctx, SK.W / 2, SK.H * 0.42, 0.9, this.t);
      if (Math.floor(this.t / 30) % 2 === 0) G().text(ctx, 'CLICK OR PRESS ANY KEY', SK.W / 2, SK.H * 0.72, { size: 26, align: 'center', color: '#ffd8a0', font: G().UI_FONT });
      G().text(ctx, 'A tribute to the 1999 Macintosh shareware classic', SK.W / 2, SK.H - 30, { size: 14, align: 'center', color: '#806040', font: G().BODY_FONT });
    }
  }

  // ---------------------------------------------------------------------------
  // Title
  // ---------------------------------------------------------------------------
  class TitleScene {
    constructor() { this.t = 0; }
    enter() { this.t = 0; SK.audio.play('title'); I().swallow(); }
    update() {
      this.t++;
      SK.audio.tick();
      if (this.t > 20 && (I().menu.ok || I().menu.start || I().menu.any)) {
        SK.audio.sfx('menuOk');
        SK.game.setScene(new MenuScene());
        return;
      }
      if (this.t > 60 * 22) SK.game.setScene(demoMatch());
    }
    render(ctx) {
      menuBg(ctx, this.t);
      // silhouettes
      const sk = logoSkin();
      ctx.save();
      ctx.globalAlpha = 0.5;
      [[150, 520, 2.3, 1, 'uppercut'], [810, 520, 2.3, -1, 'kick']].forEach(([x, y, s, f, pn]) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
        const p = SK.rig.pose(SK.rig.P[pn]);
        SK.rig.draw(ctx, p, Object.assign({}, sk, { outline: '#3a1004' }), { t: this.t });
        ctx.restore();
      });
      ctx.restore();
      const k = Math.min(1, this.t / 40);
      logo(ctx, SK.W / 2, SK.H * 0.36, 0.6 + 0.4 * SK.ease.back(k), this.t);
      G().text(ctx, 'R E S U R R E C T I O N', SK.W / 2, SK.H * 0.36 + 72, { size: 24, align: 'center', color: '#ffe0b0', font: G().UI_FONT, stroke: '#300', strokeW: 4, alpha: k });
      if (Math.floor(this.t / 28) % 2 === 0) G().text(ctx, 'PRESS START', SK.W / 2, SK.H * 0.76, { size: 34, align: 'center', font: G().TITLE_FONT, gradient: ['#ffffff', '#ffd040'], stroke: '#300', strokeW: 5 });
      G().text(ctx, '© 1999 Monkey Farm Software (original)  ·  fan remake ' + SK.VERSION, SK.W / 2, SK.H - 20, { size: 13, align: 'center', color: '#a07850', font: G().BODY_FONT });
    }
  }

  function demoMatch() {
    const ids = SK.ROSTER.filter((c) => !c.secret).map((c) => c.id);
    const a = SK.pick(ids);
    let b = SK.pick(ids);
    if (b === a) b = ids[(ids.indexOf(a) + 3) % ids.length];
    const scene = new SK.Match({
      mode: 'demo', stageId: SK.pick(SK.STAGES).id, rounds: 1, timer: 40,
      teams: [[{ char: a, player: null, level: 2 }], [{ char: b, player: null, level: 2 }]],
      onEnd: () => SK.game.setScene(new TitleScene()),
      onQuit: () => SK.game.setScene(new TitleScene()),
    });
    const up = scene.update.bind(scene);
    scene.update = function () {
      if (I().menu.any || I().menu.ok) { SK.game.setScene(new TitleScene()); return; }
      up();
    };
    const rd = scene.render.bind(scene);
    scene.render = function (ctx) {
      rd(ctx);
      if (Math.floor(SK.game.frame / 30) % 2 === 0) G().text(ctx, 'DEMO  ·  PRESS ANY KEY', SK.W / 2, SK.H - 30, { size: 22, align: 'center', color: '#fff', stroke: '#000', strokeW: 4 });
    };
    return scene;
  }

  // ---------------------------------------------------------------------------
  // Main menu
  // ---------------------------------------------------------------------------
  const MENU = [
    { id: 'versus', label: 'ONE ON ONE', desc: 'Fight a friend on the same keyboard, or the computer.' },
    { id: 'tournament', label: 'TOURNAMENT', desc: 'Fight up the ranks against every squirrel... and whoever is waiting at the top.' },
    { id: 'teams', label: 'TWO ON TWO', desc: 'Four squirrels on screen at once. Team up with a friend or a CPU partner.' },
    { id: 'practice', label: 'PRACTICE', desc: 'Learn moves and combos against a training dummy.' },
    { id: 'options', label: 'OPTIONS', desc: 'Difficulty, rounds, timer, blood, announcer and volume.' },
    { id: 'help', label: 'HOW TO PLAY', desc: 'Controls, rules and every move list.' },
    { id: 'credits', label: 'CREDITS', desc: 'Who made what.' },
  ];

  class MenuScene {
    constructor(sel) { this.sel = sel || 0; this.t = 0; }
    enter() { SK.audio.play('title'); I().swallow(); }
    update() {
      this.t++;
      SK.audio.tick();
      const m = I().menu;
      if (m.up) { this.sel = (this.sel + MENU.length - 1) % MENU.length; SK.audio.sfx('menuMove'); }
      if (m.down) { this.sel = (this.sel + 1) % MENU.length; SK.audio.sfx('menuMove'); }
      if (m.back) { SK.audio.sfx('menuBack'); SK.game.setScene(new TitleScene()); return; }
      if (m.ok) {
        SK.audio.sfx('menuOk');
        const id = MENU[this.sel].id;
        if (id === 'options') SK.game.setScene(new OptionsScene(this.sel));
        else if (id === 'help') SK.game.setScene(new HelpScene(this.sel));
        else if (id === 'credits') SK.game.setScene(new CreditsScene(this.sel));
        else SK.game.setScene(new SelectScene(id));
      }
    }
    render(ctx) {
      menuBg(ctx, this.t);
      logo(ctx, SK.W / 2, 92, 0.62, this.t);
      MENU.forEach((it, i) => {
        const sel = i === this.sel;
        const y = 178 + i * 46;
        if (sel) {
          ctx.save();
          ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.t * 0.15);
          G().roundRect(ctx, SK.W / 2 - 190, y - 20, 380, 40, 8);
          ctx.fillStyle = '#8a2a08'; ctx.fill();
          ctx.restore();
          SK.gfx.acorn(ctx, SK.W / 2 - 170, y, 13, Math.sin(this.t * 0.1) * 0.3);
          SK.gfx.acorn(ctx, SK.W / 2 + 170, y, 13, -Math.sin(this.t * 0.1) * 0.3);
        }
        G().text(ctx, it.label, SK.W / 2, y, { size: sel ? 34 : 28, align: 'center', font: G().TITLE_FONT, gradient: sel ? ['#ffffff', '#ffd040', '#ff8000'] : ['#e8d0b0', '#a08060'], stroke: '#200800', strokeW: 5 });
      });
      G().text(ctx, MENU[this.sel].desc, SK.W / 2, SK.H - 50, { size: 16, align: 'center', color: '#ffe0b0', font: G().BODY_FONT });
      hint(ctx, '↑ ↓ choose   ·   Enter / Punch select   ·   Esc back');
    }
  }

  // ---------------------------------------------------------------------------
  // Character select
  // ---------------------------------------------------------------------------
  const GRID_COLS = 3;

  class SelectScene {
    constructor(mode) {
      this.mode = mode;
      this.t = 0;
      this.roster = SK.ROSTER.slice();
      this.cursors = [];
      this.picks = { t0: [], t1: [] };
      this.p2Joined = false;
      this.coop = false;
      this.secretBuf = '';
      this.flashUnlock = 0;
      this.ready = 0;
      this.addCursor(0, [{ team: 0, human: true }]);
    }

    enter() { SK.audio.play('select'); I().swallow(); }

    addCursor(player, queue) {
      const c = { player, idx: player === 0 ? 0 : 2, queue, done: false, humanDone: false, blink: 0 };
      this.cursors.push(c);
      return c;
    }

    available(i) {
      const ch = this.roster[i];
      return !!ch && (!ch.secret || SK.settings.unlockedMailman);
    }

    needed() {
      if (this.mode === 'tournament') return [1, 0];
      if (this.mode === 'teams') return [2, 2];
      return [1, 1];
    }

    canJoinP2() {
      return (this.mode === 'versus' || this.mode === 'teams') && !this.p2Joined && !this.ready && this.picks.t1.length === 0;
    }

    cpuLabel(team) {
      if (this.mode === 'practice') return 'DUMMY';
      return team === 0 ? 'PARTNER' : 'CPU';
    }

    // Player 1 picks every slot nobody else is going to pick.
    refreshQueues() {
      const c1 = this.cursors[0];
      if (c1.humanDone) {
        c1.queue = c1.queue.filter((q) => q.human);
        const need = this.needed();
        const claimed = [this.picks.t0.length, this.picks.t1.length];
        this.cursors.forEach((c) => c.queue.forEach((q) => { claimed[q.team]++; }));
        [0, 1].forEach((tm) => {
          for (let k = claimed[tm]; k < need[tm]; k++) c1.queue.push({ team: tm, human: false, label: this.cpuLabel(tm) });
        });
      }
      this.cursors.forEach((c) => { c.done = c.humanDone && c.queue.length === 0; });
    }

    pick(c, i) {
      const slot = c.queue.shift();
      const ch = this.roster[i];
      this.picks['t' + slot.team].push({ char: ch.id, player: slot.human ? c.player : null, level: SK.settings.difficulty });
      if (slot.human) c.humanDone = true;
      SK.audio.sfx('lock');
      SK.audio.say(ch.name.toLowerCase(), { pitch: 0.4, rate: 0.95 });
      c.blink = 20;
      this.refreshQueues();
    }

    allDone() {
      const need = this.needed();
      return this.picks.t0.length >= need[0] && this.picks.t1.length >= need[1] && this.cursors.every((c) => c.done);
    }

    p2Queue() {
      if (this.coop) return [{ team: 0, human: true }];
      const q = [{ team: 1, human: true }];
      if (this.mode === 'teams') q.push({ team: 1, human: false, label: 'PARTNER' });
      return q;
    }

    update() {
      this.t++;
      SK.audio.tick();
      if (this.flashUnlock > 0) this.flashUnlock--;
      const inp = I();
      // secret: type N U T S to unlock the mailman
      ['KeyN', 'KeyU', 'KeyT', 'KeyS'].forEach((k) => { if (inp.keyHit(k)) this.secretBuf = (this.secretBuf + k.slice(3)).slice(-4); });
      if (this.secretBuf === 'NUTS' && !SK.settings.unlockedMailman) {
        SK.settings.unlockedMailman = true;
        SK.saveSettings();
        this.flashUnlock = 120;
        SK.audio.sfx('unlock');
        SK.audio.say('The mailman is here!', { pitch: 0.5 });
        this.secretBuf = '';
      }
      if (this.ready) {
        this.ready++;
        if (this.ready > 50) this.proceed();
        return;
      }
      if (inp.keyHit('Escape')) {
        SK.audio.sfx('menuBack');
        SK.game.setScene(new MenuScene(MENU.findIndex((m) => m.id === this.mode)));
        return;
      }
      // Player 2 joins in
      if (this.canJoinP2() && (inp.players[1].pressed('p') || inp.players[1].pressed('k'))) {
        this.p2Joined = true;
        this.addCursor(1, this.p2Queue());
        this.refreshQueues();
        SK.audio.sfx('menuOk');
        return;
      }
      // Two-on-two: Player 2 can switch between rival and ally
      const c2 = this.cursors[1];
      if (this.mode === 'teams' && c2 && !c2.humanDone && inp.players[1].pressed('b')) {
        if (this.coop || this.picks.t0.length < 2) {
          this.coop = !this.coop;
          c2.queue = this.p2Queue();
          this.refreshQueues();
          SK.audio.sfx('menuMove');
        }
        return;
      }
      this.cursors.forEach((c) => {
        if (c.blink > 0) c.blink--;
        if (c.done || !c.queue.length) return;
        const pl = inp.players[c.player];
        const n = this.roster.length;
        const move = (d) => { c.idx = (c.idx + d + n) % n; SK.audio.sfx('menuMove'); };
        if (pl.pressed('l')) move(-1);
        if (pl.pressed('r')) move(1);
        if (pl.pressed('u')) move(-GRID_COLS);
        if (pl.pressed('d')) move(GRID_COLS);
        const okKey = pl.pressed('p') || pl.pressed('k') || (c.player === 0 && (inp.keyHit('Enter') || inp.keyHit('Space')));
        if (pl.pressed('b') && !(c.player === 1 && this.mode === 'teams')) {
          const opts = this.roster.map((_, i) => i).filter((i) => this.available(i));
          c.idx = SK.pick(opts);
          this.pick(c, c.idx);
        } else if (okKey) {
          if (!this.available(c.idx)) { SK.audio.sfx('menuBack'); return; }
          this.pick(c, c.idx);
        }
      });
      if (this.allDone()) this.ready = 1;
    }

    proceed() {
      if (this.mode === 'tournament') { SK.game.setScene(new LadderScene(newTournament(this.picks.t0[0].char))); return; }
      SK.game.setScene(new StageSelectScene({ mode: this.mode, teams: [this.picks.t0, this.picks.t1] }));
    }

    render(ctx) {
      menuBg(ctx, this.t, '#3a1206');
      const title = { versus: 'ONE ON ONE', tournament: 'TOURNAMENT', teams: 'TWO ON TWO', practice: 'PRACTICE' }[this.mode];
      header(ctx, 'CHOOSE YOUR SQUIRREL', 44);
      G().text(ctx, title, SK.W / 2, 82, { size: 18, align: 'center', color: '#ffb060', font: G().UI_FONT });
      // grid
      const cell = 92, gx = SK.W / 2 - (cell * GRID_COLS) / 2, gy = 104;
      this.roster.forEach((ch, i) => {
        const cx = gx + (i % GRID_COLS) * cell, cy = gy + Math.floor(i / GRID_COLS) * cell;
        const locked = !this.available(i);
        ctx.save();
        G().roundRect(ctx, cx + 4, cy + 4, cell - 8, cell - 8, 8);
        ctx.fillStyle = locked ? '#1a0a04' : '#3a1a0a';
        ctx.fill();
        ctx.clip();
        if (!locked) {
          const bg = ctx.createLinearGradient(0, cy, 0, cy + cell);
          bg.addColorStop(0, ch.color); bg.addColorStop(1, '#1a0804');
          ctx.globalAlpha = 0.35; ctx.fillStyle = bg; ctx.fillRect(cx, cy, cell, cell); ctx.globalAlpha = 1;
          SK.rig.portrait(ctx, cx + cell / 2, cy + 6, 80, ch.skin, { t: this.t, expr: 'angry' });
        } else {
          G().text(ctx, '?', cx + cell / 2, cy + cell / 2, { size: 56, align: 'center', font: G().TITLE_FONT, color: '#5a3010' });
        }
        ctx.restore();
        ctx.lineWidth = 2; ctx.strokeStyle = '#6a3a14';
        G().roundRect(ctx, cx + 4, cy + 4, cell - 8, cell - 8, 8); ctx.stroke();
      });
      // cursors
      this.cursors.forEach((c) => {
        if (c.done || !c.queue.length) return;
        const cx = gx + (c.idx % GRID_COLS) * cell, cy = gy + Math.floor(c.idx / GRID_COLS) * cell;
        const col = c.player === 0 ? '#ff3a2a' : '#3aa0ff';
        const inset = c.player * 4;
        ctx.save();
        ctx.lineWidth = 5; ctx.strokeStyle = col;
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.t * 0.25);
        G().roundRect(ctx, cx + 1 + inset, cy + 1 + inset, cell - 2 - inset * 2, cell - 2 - inset * 2, 10);
        ctx.stroke();
        ctx.restore();
        const slot = c.queue[0];
        const lbl = (c.player === 0 ? '1P' : '2P') + (slot.human ? '' : ': ' + slot.label);
        G().text(ctx, lbl, cx + (c.player === 0 ? 8 : cell - 8), cy + cell - 12, { size: 14, align: c.player === 0 ? 'left' : 'right', color: '#fff', stroke: col, strokeW: 4 });
      });
      // big previews
      const show = (side, ch, label, done) => {
        const x = side === 0 ? 150 : SK.W - 150;
        drawFighterPreview(ctx, ch, x, 410, 2.3, this.t, side === 1, { pose: done ? 'victory' : 'stance', expr: done ? 'happy' : 'angry' });
        G().text(ctx, ch.name, x, 446, { size: 34, align: 'center', font: G().TITLE_FONT, gradient: ['#fff6b0', '#ffc020', '#ff5a00'], stroke: '#200800', strokeW: 6 });
        G().text(ctx, ch.title, x, 474, { size: 15, align: 'center', color: '#ffd8a0', font: G().BODY_FONT });
        G().text(ctx, label, x, 118, { size: 22, align: 'center', color: side === 0 ? '#ff6a4a' : '#6ab8ff', stroke: '#000', strokeW: 4, font: G().UI_FONT });
      };
      [0, 1].forEach((side) => {
        const c = this.cursors.find((k) => !k.done && k.queue[0] && k.queue[0].team === side);
        const list = this.picks['t' + side];
        if (c && this.available(c.idx)) {
          const q = c.queue[0];
          show(side, this.roster[c.idx], q.human ? 'PLAYER ' + (c.player + 1) : q.label, false);
        } else if (list.length) {
          const p = list[list.length - 1];
          show(side, SK.CHARS[p.char], p.player != null ? 'PLAYER ' + (p.player + 1) : this.cpuLabel(side), true);
        } else if (side === 1 && this.mode === 'tournament') {
          G().text(ctx, '???', SK.W - 150, 330, { size: 64, align: 'center', font: G().TITLE_FONT, color: '#5a3010' });
        } else if (side === 1 && this.canJoinP2()) {
          if (Math.floor(this.t / 30) % 2 === 0) G().text(ctx, 'PLAYER 2', SK.W - 150, 300, { size: 26, align: 'center', color: '#6ab8ff', stroke: '#000', strokeW: 4, font: G().UI_FONT });
          G().text(ctx, 'PRESS , OR K TO JOIN', SK.W - 150, 334, { size: 16, align: 'center', color: '#c8d8ff', font: G().UI_FONT });
        }
      });
      // team rosters
      if (this.mode === 'teams') {
        [0, 1].forEach((tm) => {
          this.picks['t' + tm].forEach((p, i) => {
            const x = tm === 0 ? 40 + i * 64 : SK.W - 40 - i * 64;
            ctx.save();
            ctx.beginPath(); ctx.arc(x, 500, 26, 0, TAU); ctx.fillStyle = '#2a1006'; ctx.fill(); ctx.clip();
            SK.rig.portrait(ctx, x, 474, 52, SK.CHARS[p.char].skin, { t: this.t, flip: tm === 1 });
            ctx.restore();
          });
        });
        if (this.p2Joined) G().text(ctx, this.coop ? '2P is your ALLY  (2P Block: switch)' : '2P is your RIVAL  (2P Block: switch)', SK.W / 2, 466, { size: 15, align: 'center', color: '#c8e0ff', font: G().BODY_FONT });
      }
      if (this.flashUnlock > 0) G().banner(ctx, 'THE MAILMAN HAS ARRIVED!', SK.W / 2, SK.H / 2, 48);
      if (this.ready) G().banner(ctx, 'GET READY!', SK.W / 2, SK.H / 2, 64);
      hint(ctx, 'Move · Punch/Kick choose · Block random · Esc back' + (SK.settings.unlockedMailman ? '' : '   ·   psst... type a 4-letter word'));
    }
  }

  // ---------------------------------------------------------------------------
  // Stage select
  // ---------------------------------------------------------------------------
  let THUMBS = null;
  function thumbs() {
    if (THUMBS) return THUMBS;
    THUMBS = SK.STAGES.map((def) => {
      const c = G().makeCanvas(240, 135);
      if (!c) return null;
      SK.drawStageThumb(c.getContext('2d'), def, 0, 0, 240, 135);
      return c;
    });
    return THUMBS;
  }

  class StageSelectScene {
    constructor(cfg) { this.cfg = cfg; this.sel = 0; this.t = 0; }
    enter() { I().swallow(); thumbs(); }
    update() {
      this.t++;
      SK.audio.tick();
      const m = I().menu;
      const n = SK.STAGES.length + 1;
      if (m.left || m.up) { this.sel = (this.sel + n - 1) % n; SK.audio.sfx('menuMove'); }
      if (m.right || m.down) { this.sel = (this.sel + 1) % n; SK.audio.sfx('menuMove'); }
      if (m.back) { SK.audio.sfx('menuBack'); SK.game.setScene(new SelectScene(this.cfg.mode)); return; }
      if (m.ok) {
        SK.audio.sfx('menuOk');
        const def = this.sel === SK.STAGES.length ? SK.pick(SK.STAGES) : SK.STAGES[this.sel];
        startFight(Object.assign({}, this.cfg, { stageId: def.id }));
      }
    }
    render(ctx) {
      menuBg(ctx, this.t, '#2a1a06');
      header(ctx, 'CHOOSE YOUR BATTLEGROUND', 50);
      const th = thumbs();
      const items = SK.STAGES.concat([{ id: 'random', name: 'RANDOM', blurb: 'Let fate decide.' }]);
      const w = 240, h = 135;
      items.forEach((def, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = SK.W / 2 - w * 1.5 - 20 + col * (w + 20), y = 100 + row * (h + 56);
        const sel = i === this.sel;
        ctx.save();
        if (th && th[i]) ctx.drawImage(th[i], x, y, w, h);
        else { ctx.fillStyle = '#1a0a04'; ctx.fillRect(x, y, w, h); G().text(ctx, '?', x + w / 2, y + h / 2, { size: 70, align: 'center', font: G().TITLE_FONT, color: '#ffb040' }); }
        ctx.lineWidth = sel ? 5 : 2; ctx.strokeStyle = sel ? '#ffd040' : '#6a3a14';
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
        G().text(ctx, def.name, x + w / 2, y + h + 18, { size: sel ? 24 : 20, align: 'center', font: G().TITLE_FONT, gradient: sel ? ['#fff', '#ffd040'] : ['#d8c0a0', '#a08060'], stroke: '#200800', strokeW: 4 });
      });
      const cur = items[this.sel];
      G().text(ctx, cur.blurb || '', SK.W / 2, SK.H - 50, { size: 16, align: 'center', color: '#ffe0b0', font: G().BODY_FONT });
      hint(ctx, '← → choose   ·   Enter / Punch fight   ·   Esc back');
    }
  }

  function startFight(cfg) {
    const back = () => SK.game.setScene(new MenuScene(MENU.findIndex((m) => m.id === cfg.mode)));
    const scene = new SK.Match(Object.assign({}, cfg, {
      onEnd: (res) => SK.game.setScene(new ResultScene(cfg, res)),
      onQuit: back,
    }));
    SK.game.setScene(scene);
  }

  class ResultScene {
    constructor(cfg, res) { this.cfg = cfg; this.res = res; this.t = 0; this.sel = 0; }
    enter() { I().swallow(); }
    update() {
      this.t++;
      SK.audio.tick();
      const m = I().menu;
      if (this.t < 40) return;
      if (m.up || m.down) { this.sel = 1 - this.sel; SK.audio.sfx('menuMove'); }
      if (m.ok) {
        SK.audio.sfx('menuOk');
        if (this.sel === 0) startFight(this.cfg);
        else SK.game.setScene(new SelectScene(this.cfg.mode));
      }
      if (m.back) SK.game.setScene(new MenuScene());
    }
    render(ctx) {
      menuBg(ctx, this.t, '#3a1606');
      const team = this.cfg.teams[this.res.winnerTeam];
      header(ctx, team.length > 1 ? 'TEAM ' + (this.res.winnerTeam + 1) + ' WINS' : SK.CHARS[team[0].char].name + ' WINS', 70);
      team.forEach((p, i) => drawFighterPreview(ctx, SK.CHARS[p.char], SK.W / 2 + (i - (team.length - 1) / 2) * 180, 360, 2.4, this.t, false, { pose: 'victory', expr: 'happy' }));
      G().text(ctx, 'Rounds ' + this.res.wins[0] + ' – ' + this.res.wins[1] + (this.res.nutality ? '   ·   NUTALITY!' : ''), SK.W / 2, 400, { size: 20, align: 'center', color: '#ffe0b0', font: G().UI_FONT });
      ['REMATCH', 'CHOOSE NEW SQUIRRELS'].forEach((s, i) => {
        const sel = i === this.sel;
        G().text(ctx, (sel ? '▶ ' : '') + s, SK.W / 2, 446 + i * 38, { size: sel ? 28 : 22, align: 'center', color: sel ? '#ffd040' : '#d8c0a0', stroke: '#000', strokeW: 4, font: G().TITLE_FONT });
      });
      hint(ctx, 'Enter / Punch select   ·   Esc main menu');
    }
  }

  // ---------------------------------------------------------------------------
  // Tournament
  // ---------------------------------------------------------------------------
  const STAGE_ORDER = ['field', 'forest', 'tundra', 'greatwall', 'city'];
  function newTournament(charId) {
    const others = SK.shuffle(SK.ROSTER.filter((c) => !c.secret && c.id !== charId).map((c) => c.id));
    return { player: charId, ladder: others.concat(['mailman']), idx: 0, continues: 0 };
  }

  class LadderScene {
    constructor(tour) { this.tour = tour; this.t = 0; }
    enter() { SK.audio.play('select'); I().swallow(); }
    update() {
      this.t++;
      SK.audio.tick();
      if (this.t === 30) SK.audio.say(this.tour.idx === this.tour.ladder.length - 1 ? 'Final battle' : 'Battle ' + (this.tour.idx + 1), { pitch: 0.35 });
      if (I().menu.back) { SK.game.setScene(new MenuScene(1)); return; }
      if ((this.t > 30 && I().menu.ok) || this.t > 240) this.fight();
    }
    fight() {
      const tour = this.tour;
      const opp = tour.ladder[tour.idx];
      const boss = opp === 'mailman';
      const lvl = SK.settings.difficulty;
      const level = boss ? Math.max(lvl, 1) + 1 : SK.clamp(lvl + (tour.idx >= 5 && lvl < 2 ? 1 : 0), 0, 2);
      const cfg = {
        mode: 'tournament', stageId: boss ? 'city' : STAGE_ORDER[tour.idx % STAGE_ORDER.length],
        teams: [[{ char: tour.player, player: 0 }], [{ char: opp, player: null, level }]],
      };
      const scene = new SK.Match(Object.assign({}, cfg, {
        onEnd: (res) => {
          if (res.winnerTeam === 0) {
            tour.idx++;
            if (tour.idx >= tour.ladder.length) SK.game.setScene(new EndingScene(tour));
            else SK.game.setScene(new LadderScene(tour));
          } else SK.game.setScene(new ContinueScene(tour));
        },
        onQuit: () => SK.game.setScene(new MenuScene(1)),
      }));
      SK.game.setScene(scene);
    }
    render(ctx) {
      menuBg(ctx, this.t, '#2a0a10');
      header(ctx, 'CHOOSE YOUR DESTINY', 50);
      const tour = this.tour;
      const n = tour.ladder.length;
      const h = 50;
      const baseY = SK.H - 70;
      for (let i = 0; i < n; i++) {
        const y = baseY - i * h;
        const cur = i === tour.idx;
        const done = i < tour.idx;
        const x = SK.W / 2 + 150;
        G().panel(ctx, x - 100, y - h / 2 + 3, 200, h - 6, { r: 6, fill: cur ? '#8a2a08' : done ? '#2a2a2a' : '#3a1606', stroke: cur ? '#ffd040' : '#6a3a14' });
        const ch = SK.CHARS[tour.ladder[i]];
        const hidden = ch.secret && i > tour.idx;
        if (hidden) G().text(ctx, '?', x, y, { size: 32, align: 'center', font: G().TITLE_FONT, color: '#ffb040' });
        else {
          ctx.save(); ctx.beginPath(); ctx.rect(x - 98, y - h / 2 + 4, 60, h - 8); ctx.clip();
          SK.rig.portrait(ctx, x - 68, y - 24, 48, ch.skin, { t: this.t, flip: true });
          ctx.restore();
          G().text(ctx, ch.name, x - 30, y + 2, { size: 16, align: 'left', color: done ? '#888' : '#fff', font: G().UI_FONT });
          if (done) { ctx.strokeStyle = '#d02020'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 90, y - 16); ctx.lineTo(x + 90, y + 16); ctx.stroke(); }
        }
      }
      const me = SK.CHARS[tour.player];
      const curY = baseY - tour.idx * h;
      drawFighterPreview(ctx, me, SK.W / 2 - 200, 420, 2.1, this.t, false, {});
      G().text(ctx, me.name, SK.W / 2 - 200, 458, { size: 30, align: 'center', font: G().TITLE_FONT, gradient: ['#fff6b0', '#ffc020', '#ff5a00'], stroke: '#200800', strokeW: 5 });
      G().text(ctx, '◀', SK.W / 2 + 30 + Math.sin(this.t * 0.2) * 4, curY, { size: 26, align: 'center', color: '#ffd040' });
      G().text(ctx, 'BATTLE ' + (tour.idx + 1) + ' OF ' + n, SK.W / 2 - 200, 104, { size: 26, align: 'center', color: '#ffe0b0', font: G().UI_FONT });
      hint(ctx, 'Enter / Punch to fight   ·   Esc quit tournament');
    }
  }

  class ContinueScene {
    constructor(tour) { this.tour = tour; this.t = 0; }
    enter() { SK.audio.stopMusic(); I().swallow(); }
    update() {
      this.t++;
      const left = 9 - Math.floor(this.t / 60);
      if (this.t % 60 === 1 && left >= 0) SK.audio.say(String(left), { pitch: 0.4, rate: 1 });
      if (I().menu.ok && this.t > 20) { this.tour.continues++; SK.audio.sfx('menuOk'); SK.game.setScene(new LadderScene(this.tour)); return; }
      if (left < 0 || I().menu.back) SK.game.setScene(new GameOverScene());
    }
    render(ctx) {
      menuBg(ctx, this.t, '#1a0606');
      const left = Math.max(0, 9 - Math.floor(this.t / 60));
      header(ctx, 'CONTINUE?', 150);
      G().banner(ctx, String(left), SK.W / 2, 290, 140);
      drawFighterPreview(ctx, SK.CHARS[this.tour.player], SK.W / 2, 500, 1.8, this.t, false, { pose: 'dizzy', expr: 'dizzy' });
      hint(ctx, 'Enter / Punch to continue');
    }
  }

  class GameOverScene {
    constructor() { this.t = 0; }
    update() { this.t++; if (this.t > 200 || (this.t > 40 && I().menu.ok)) SK.game.setScene(new TitleScene()); }
    render(ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SK.W, SK.H); G().banner(ctx, 'GAME OVER', SK.W / 2, SK.H / 2, 96); }
  }

  const ENDINGS = {
    nutso: 'With the Mailman defeated, Nutso returned to the Great Oak and opened a kung-fu school for young squirrels. Tuition is paid in acorns. Late fees are paid in pain.',
    frostbite: 'Frostbite froze the Mailman\'s route solid. Now nobody in the neighbourhood gets their mail, and every squirrel agrees this is an improvement.',
    scurrion: 'Scurrion dragged the Mailman back to the Netherwoods. His stolen stash was found in the mailbag all along, filed under "Return to Sender".',
    thundertail: 'Thundertail restored balance to the storm-struck oak. Squirrels everywhere still flinch when they hear a mail truck backfire.',
    bruiser: 'Bruiser bench-pressed the mail truck, then the mailman, then the post office. The Squirrel Kombat trophy now doubles as a nutcracker.',
    glider: 'Glider soared over the defeated Mailman and claimed the skies of the neighbourhood. Her fans have since been registered as lethal weapons.',
    chip: 'Chip won Squirrel Kombat and was immediately disqualified for being a chipmunk. He ate the trophy. Nobody has seen it since.',
    rocco: 'Rocco sold the Mailman\'s uniform, his bag, his cap and his route. He is now the richest black squirrel in the county, and the most wanted.',
    mailman: 'The Mailman defeated every squirrel and completed his route on time for the first time in years. Neither rain, nor snow, nor squirrels.',
  };

  class EndingScene {
    constructor(tour) { this.tour = tour; this.t = 0; this.unlocked = false; }
    enter() {
      SK.audio.play('title');
      SK.settings.tournamentWins = (SK.settings.tournamentWins || 0) + 1;
      if (!SK.settings.unlockedMailman) { SK.settings.unlockedMailman = true; this.unlocked = true; }
      SK.saveSettings();
      SK.audio.say('Congratulations. You are the Squirrel Kombat champion.', { pitch: 0.4, rate: 0.9 });
      I().swallow();
    }
    update() { this.t++; SK.audio.tick(); if (this.t > 90 && I().menu.ok) SK.game.setScene(new CreditsScene()); }
    render(ctx) {
      menuBg(ctx, this.t, '#3a2a06');
      header(ctx, 'SQUIRREL KOMBAT CHAMPION', 60);
      const me = SK.CHARS[this.tour.player];
      drawFighterPreview(ctx, me, 190, 460, 2.6, this.t, false, { pose: 'victory', expr: 'happy' });
      SK.gfx.acorn(ctx, 630, 470 + Math.sin(this.t * 0.05) * 4, 26, Math.sin(this.t * 0.03) * 0.2, { cap: '#c09020', nut: '#ffd040' });
      G().panel(ctx, 360, 120, 540, 260);
      G().wrap(ctx, ENDINGS[me.id] || '', 384, 144, 492, 26, { size: 19, color: '#ffe8c8' });
      if (this.unlocked) G().text(ctx, 'SECRET UNLOCKED: THE MAILMAN is now playable!', 630, 410, { size: 20, align: 'center', color: '#7cff6a', stroke: '#000', strokeW: 4, font: G().UI_FONT });
      if (this.tour.continues === 0) G().text(ctx, 'NO CONTINUES USED. RESPECT.', 630, 444, { size: 18, align: 'center', color: '#ffd040', font: G().UI_FONT });
      if (this.t > 90) hint(ctx, 'Enter / Punch to continue');
    }
  }

  // ---------------------------------------------------------------------------
  // Options
  // ---------------------------------------------------------------------------
  const OPTS = [
    { key: 'difficulty', label: 'DIFFICULTY', values: [0, 1, 2], fmt: (v) => SK.DIFFICULTY_NAMES[v] },
    { key: 'rounds', label: 'ROUNDS (BEST OF)', values: [1, 3, 5], fmt: (v) => String(v) },
    { key: 'timer', label: 'ROUND TIMER', values: [30, 60, 99, 0], fmt: (v) => (v ? v + ' SEC' : 'OFF') },
    { key: 'blood', label: 'BLOOD', values: [true, false], fmt: (v) => (v ? 'ON' : 'OFF') },
    { key: 'announcer', label: 'ANNOUNCER VOICE', values: [true, false], fmt: (v) => (v ? 'ON' : 'OFF') },
    { key: 'music', label: 'MUSIC VOLUME', values: [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'sfx', label: 'EFFECTS VOLUME', values: [0, 0.2, 0.4, 0.6, 0.8, 1], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'unlockedMailman', label: 'SECRET BOSS', values: [false, true], fmt: (v) => (v ? 'UNLOCKED' : 'LOCKED') },
  ];

  class OptionsScene {
    constructor(back) { this.sel = 0; this.t = 0; this.back = back; }
    enter() { I().swallow(); }
    update() {
      this.t++;
      SK.audio.tick();
      const m = I().menu;
      const n = OPTS.length + 1;
      if (m.up) { this.sel = (this.sel + n - 1) % n; SK.audio.sfx('menuMove'); }
      if (m.down) { this.sel = (this.sel + 1) % n; SK.audio.sfx('menuMove'); }
      if (m.back || (m.ok && this.sel === OPTS.length)) { SK.saveSettings(); SK.audio.sfx('menuBack'); SK.game.setScene(new MenuScene(this.back)); return; }
      const o = OPTS[this.sel];
      if (o && (m.left || m.right || m.ok)) {
        if (o.key === 'unlockedMailman' && !SK.settings.unlockedMailman) { SK.audio.sfx('menuBack'); return; }
        const i = o.values.indexOf(SK.settings[o.key]);
        const d = m.left ? -1 : 1;
        SK.settings[o.key] = o.values[((i < 0 ? 0 : i) + d + o.values.length) % o.values.length];
        SK.audio.applyVolumes();
        SK.audio.sfx('menuMove');
        SK.saveSettings();
      }
    }
    render(ctx) {
      menuBg(ctx, this.t);
      header(ctx, 'OPTIONS', 60);
      OPTS.concat([{ label: 'BACK' }]).forEach((o, i) => {
        const sel = i === this.sel, y = 130 + i * 42;
        G().text(ctx, o.label, SK.W / 2 - 40, y, { size: sel ? 26 : 22, align: 'right', color: sel ? '#ffd040' : '#e0c8a8', stroke: '#000', strokeW: 4, font: G().UI_FONT });
        if (o.key) G().text(ctx, (sel ? '◀ ' : '') + o.fmt(SK.settings[o.key]) + (sel ? ' ▶' : ''), SK.W / 2 + 40, y, { size: sel ? 26 : 22, color: sel ? '#fff' : '#c8b090', stroke: '#000', strokeW: 4, font: G().UI_FONT });
      });
      hint(ctx, '↑ ↓ choose   ·   ← → change   ·   Esc back (settings save automatically)');
    }
  }

  // ---------------------------------------------------------------------------
  // How to play
  // ---------------------------------------------------------------------------
  class HelpScene {
    constructor(back) { this.page = 0; this.t = 0; this.back = back; }
    enter() { I().swallow(); }
    pages() { return 2 + SK.playableRoster().length; }
    update() {
      this.t++;
      SK.audio.tick();
      const m = I().menu;
      const n = this.pages();
      if (m.left || m.up) { this.page = (this.page + n - 1) % n; SK.audio.sfx('menuMove'); }
      if (m.right || m.down || m.ok) { this.page = (this.page + 1) % n; SK.audio.sfx('menuMove'); }
      if (m.back) { SK.audio.sfx('menuBack'); SK.game.setScene(new MenuScene(this.back)); }
    }
    render(ctx) {
      menuBg(ctx, this.t, '#2a1206');
      if (this.page === 0) {
        header(ctx, 'CONTROLS', 50);
        const L = SK.input.KEY_LABELS;
        const rows = [['', 'PLAYER 1', 'PLAYER 2'], ['Move / Jump / Crouch', L[0].move, L[1].move], ['Punch (P)', L[0].p, L[1].p], ['Kick (K)', L[0].k, L[1].k], ['Block (BL)', L[0].b, L[1].b]];
        rows.forEach((r, i) => {
          const y = 120 + i * 40;
          G().text(ctx, r[0], 300, y, { size: 20, align: 'right', color: '#ffb060', font: G().UI_FONT });
          G().text(ctx, r[1], 460, y, { size: i ? 22 : 24, align: 'center', color: i ? '#fff' : '#ff6a4a', font: G().UI_FONT });
          G().text(ctx, r[2], 680, y, { size: i ? 22 : 24, align: 'center', color: i ? '#fff' : '#6ab8ff', font: G().UI_FONT });
        });
        G().wrap(ctx, 'Gamepads work too: D-pad/stick to move, X/Y punch, A/B kick, shoulders block, Start pauses. Gamepad 1 drives Player 1, gamepad 2 drives Player 2.', 160, 330, SK.W - 320, 22, { size: 16, color: '#e8d8c0' });
        G().wrap(ctx, 'Esc or Enter pauses a fight. Up jumps, press Up again in the air to double-jump. Double-tap Down to drop through a platform.', 160, 400, SK.W - 320, 22, { size: 16, color: '#e8d8c0' });
      } else if (this.page === 1) {
        header(ctx, 'HOW TO KOMBAT', 50);
        const lines = [
          'Win rounds by knocking your rival\'s health to zero, or by having more health when time runs out.',
          'Every squirrel has 4 normal moves, 4 combo strings and 4 special moves (see the move lists on the next pages).',
          'Specials are entered as quick directional taps relative to your opponent, then a button: B F + P means tap Back, tap Forward, then Punch.',
          'Hold Block to stop attacks. Sweeps hit low and must be blocked crouching; jump attacks hit high. Throws beat blocking.',
          'Hit a special after a connecting normal or combo to cancel straight into it.',
          'When you win the deciding round your rival is left dazed: FINISH \'EM! Get close and enter F B F + K for a NUTALITY.',
          'Stages fight back: lawnmowers, death acorns, angry momma birds (two squirrels in one nest summon the BIRD ARMY), icicles, blizzards, fireworks and traffic.',
          'Beat the Tournament to meet the secret boss and unlock him.',
        ];
        let y = 100;
        lines.forEach((l) => { G().acorn(ctx, 132, y + 10, 9, 0); y += G().wrap(ctx, l, 150, y, SK.W - 300, 21, { size: 16, color: '#ffe8c8' }) + 10; });
      } else {
        const ch = SK.playableRoster()[this.page - 2];
        SK.drawMoveList(ctx, ch, 60, 30, SK.W - 120, SK.H - 70);
      }
      hint(ctx, 'Page ' + (this.page + 1) + ' / ' + this.pages() + '   ·   ← → turn page   ·   Esc back');
    }
  }

  // ---------------------------------------------------------------------------
  // Credits
  // ---------------------------------------------------------------------------
  class CreditsScene {
    constructor(back) { this.t = 0; this.back = back; }
    enter() { I().swallow(); }
    update() {
      this.t++;
      SK.audio.tick();
      if (this.t > 30 && (I().menu.ok || I().menu.back)) SK.game.setScene(new MenuScene(this.back || 0));
    }
    render(ctx) {
      menuBg(ctx, this.t);
      header(ctx, 'CREDITS', 54);
      const lines = [
        ['SQUIRREL KOMBAT: RESURRECTION', '#ffd040', 26],
        ['A fan-made browser remake', '#ffe0b0', 18],
        ['', '', 10],
        ['ORIGINAL GAME', '#ff9a40', 20],
        ['Squirrel Kombat (1999) for the classic Mac OS', '#fff', 17],
        ['by John Butler · published by Monkey Farm Software', '#fff', 17],
        ['', '', 10],
        ['THIS REMAKE', '#ff9a40', 20],
        ['All characters, art, music, sound and code are newly made:', '#fff', 17],
        ['procedural canvas drawing, synthesized audio, no original assets.', '#fff', 17],
        ['', '', 10],
        ['No squirrels, mailmen or dogs were harmed.', '#c8b8a0', 15],
      ];
      let y = 110;
      lines.forEach(([s, c, z]) => { if (s) G().text(ctx, s, SK.W / 2, y, { size: z, align: 'center', color: c, font: z >= 20 ? G().UI_FONT : G().BODY_FONT }); y += z + 12; });
      hint(ctx, 'Any button to return');
    }
  }

  SK.Screens = { BootScene, TitleScene, MenuScene, SelectScene, StageSelectScene, LadderScene, ContinueScene, EndingScene, OptionsScene, HelpScene, CreditsScene, ResultScene, newTournament, startFight, menuBg, logo, drawFighterPreview };
})(typeof window !== 'undefined' ? window : globalThis);
