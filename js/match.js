/* A fight: rounds, timer, KOs, FINISH 'EM, Nutalities, camera, pause menu. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const G = () => SK.gfx;

  const DUMMY_MODES = ['stand', 'crouch', 'block', 'crouchblock', 'jump', 'cpu'];

  class Match {
    /**
     * cfg: {
     *   mode: 'versus' | 'tournament' | 'practice' | 'teams',
     *   teams: [[{ char, player, level }...], [...]],
     *   stageId, rounds, timer, hazards, onEnd(result), onQuit()
     * }
     */
    constructor(cfg) {
      this.cfg = Object.assign({ rounds: SK.settings.rounds, timer: SK.settings.timer, hazards: true }, cfg);
      this.practice = this.cfg.mode === 'practice';
      if (this.practice) { this.cfg.timer = 0; this.cfg.hazards = false; }
      this.stage = SK.makeStage(this.cfg.stageId);
      this.hazardsOn = this.cfg.hazards;
      this.fx = new SK.FX();
      this.projectiles = [];
      this.fighters = [];
      this.camera = { x: this.stage.width / 2, y: this.stage.groundY - 200, zoom: 1 };
      this.wins = [0, 0];
      this.winsNeeded = this.practice ? 99 : Math.ceil(this.cfg.rounds / 2);
      this.round = 0;
      this.frame = 0;
      this.hitstop = 0;
      this.shakeAmt = 0;
      this.slowmo = 0;
      this.messages = [];
      this.comboDisp = [null, null];
      this.paused = false;
      this.pauseSel = 0;
      this.showMoves = false;
      this.dummyMode = 0;
      this.debug = false;
      this.results = [];
      this.cfg.teams.forEach((team, ti) => {
        team.forEach((slot, si) => {
          const f = new SK.Fighter(this, SK.CHARS[slot.char], { team: ti, slot: si, player: slot.player });
          const dupes = this.fighters.filter((g) => g.char.id === slot.char).length;
          if (dupes) f.skin = SK.altSkin(f.char.skin, dupes - 1);
          if (slot.player == null) {
            f.ai = new SK.AI(f, slot.level == null ? SK.settings.difficulty : slot.level);
            if (this.practice && ti === 1) f.ai.dummy = DUMMY_MODES[this.dummyMode];
          }
          this.fighters.push(f);
        });
      });
      this.startRound();
    }

    enter() {
      const boss = this.fighters.some((f) => f.char.id === 'mailman' && f.ai) && this.cfg.mode === 'tournament';
      SK.audio.play(boss ? 'boss' : this.stage.music);
    }

    // ---------------------------------------------------------------- queries
    enemiesOf(f) { return this.fighters.filter((g) => g.team !== f.team && g.alive); }
    nearestEnemy(f) {
      let best = null, bd = Infinity;
      for (const g of this.fighters) {
        if (g.team === f.team || !g.alive) continue;
        const d = Math.abs(g.x - f.x) + Math.abs(g.y - f.y) * 1.3;
        if (d < bd) { bd = d; best = g; }
      }
      return best;
    }
    addProjectile(o) { const p = new SK.Projectile(this, o); this.projectiles.push(p); return p; }
    shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); }
    bigText(str, frames, color, o) {
      this.messages = this.messages.filter((m) => m.str !== str);
      this.messages.push(Object.assign({ str, t: frames, max: frames }, o || {}));
    }

    // ---------------------------------------------------------------- rounds
    startRound() {
      this.round++;
      const st = this.stage;
      st.t = 0;
      st.state = {};
      st.platforms.forEach((p) => { p.x = p.baseX; p.y = p.baseY; p.prevY = p.y; p.dx = 0; p.dy = 0; });
      if (st.def.init) st.def.init(st);
      this.projectiles = [];
      this.fx = new SK.FX();
      this.messages = [];
      this.comboDisp = [null, null];
      this.finishing = null;
      this.nutality = null;
      this.nutalityDone = false;
      this.roundWinner = null;
      this.timer = this.cfg.timer || 0;
      this.timerFrac = 0;
      this.state = 'intro';
      this.stateT = 0;
      this.slowmo = 0;
      const per = Math.max(...this.cfg.teams.map((t) => t.length));
      const pts = st.spawnPoints(per * 2);
      this.fighters.forEach((f) => {
        const idx = per === 1 ? f.team : f.team * 2 + (f.team === 0 ? f.slot : 1 - f.slot);
        const [x, y, facing] = pts[idx];
        f.resetForRound(x, y, facing);
        if (f.ai) { f.ai.queue = []; f.ai.finishPlanned = null; }
      });
      this.camera.x = st.width / 2;
      this.camera.y = st.groundY - 150;
      this.camera.zoom = 1;
      this.snapCamera = true;
    }

    onComboHit(attacker, target) {
      if (target.comboHits >= 2) {
        const dmg = (target.comboStartHp != null ? target.comboStartHp : target.hp) - target.hp;
        this.comboDisp[attacker.team] = { n: target.comboHits, t: 90, dmg: this.practice ? dmg : 0, max: target.maxHp };
        if (target.comboHits === 5) SK.audio.say('Excellent!', { pitch: 0.5, rate: 1 });
      }
    }

    teamAlive(team) { return this.fighters.some((f) => f.team === team && f.alive && f.hp > 0); }

    onKO(f, attacker) {
      if (this.practice) { f.hp = 1; return; }
      if (this.state !== 'fight') { f.out = true; return; }
      const team = f.team;
      const others = this.fighters.filter((g) => g.team === team && g !== f && g.alive && g.hp > 0);
      if (others.length === 0) {
        const winnerTeam = 1 - team;
        const decides = this.wins[winnerTeam] + 1 >= this.winsNeeded;
        const oneVone = this.fighters.length === 2;
        if (decides && oneVone && !this.finishing) {
          f.out = false;
          f.finishMe = true;
          f.hp = 0;
          f.cancelMove();
          f.vx = 0;
          f.vy = Math.max(f.vy, 0);
          f.setState('dizzy');
          f.invuln = 45;
          this.finishing = { loser: f, winnerTeam, t: 0 };
          this.state = 'finish';
          this.stateT = 0;
          this.projectiles = this.projectiles.filter((p) => !p.owner);
          this.bigText("FINISH 'EM!", 120, null, { size: 84 });
          SK.audio.say('Finish them!', { pitch: 0.3, rate: 0.85 });
          this.slowmo = 30;
          const w = this.fighters.find((g) => g.team === winnerTeam);
          if (w && w.player != null) this.bigText(' ', 300, null, { sub: 'NUTALITY:  ' + SK.NUTALITY_INPUT, size: 1, y: SK.H * 0.62 });
          return;
        }
        f.out = true;
        this.endRoundKO(winnerTeam);
      } else {
        f.out = true;
      }
    }

    onFinishHit(f, attacker) {
      f.finishMe = false;
      f.out = true;
      const dir = attacker ? attacker.facing : -f.facing;
      f.launch(dir * 8, -11);
      this.finishing = null;
      this.endRoundKO(1 - f.team);
    }

    endRoundKO(winnerTeam) {
      this.state = 'ko';
      this.stateT = 0;
      this.roundWinner = winnerTeam;
      this.slowmo = 50;
      this.bigText('K.O.', 90, null, { size: 130 });
      SK.audio.sfx('ko');
      SK.audio.sfx('gong');
      this.fighters.forEach((g) => { g.controlEnabled = false; });
    }

    timeUp() {
      this.state = 'ko';
      this.stateT = 0;
      const frac = (t) => {
        const fs = this.fighters.filter((f) => f.team === t);
        return fs.reduce((a, f) => a + Math.max(0, f.hp) / f.maxHp, 0) / fs.length;
      };
      const a = frac(0), b = frac(1);
      this.roundWinner = Math.abs(a - b) < 0.001 ? -1 : a > b ? 0 : 1;
      this.bigText('TIME!', 90, null, { size: 120 });
      SK.audio.say('Time!', { pitch: 0.3 });
      this.fighters.forEach((g) => { g.controlEnabled = false; });
      // losers drop
      if (this.roundWinner >= 0) this.fighters.forEach((f) => { if (f.team !== this.roundWinner) { f.cancelMove(); f.setState('dizzy'); f.stunT = 999; } });
    }

    startNutality(winner, victim) {
      this.state = 'nutality';
      this.stateT = 0;
      this.finishing = null;
      this.messages = [];
      this.nutality = new SK.Nutality(this, winner, victim);
      this.nutalityDone = false;
      SK.audio.stopMusic();
      SK.audio.sfx('gong');
      this.fighters.forEach((g) => { g.controlEnabled = false; });
    }

    finishRound() {
      // Called once the KO / nutality has played out.
      const w = this.roundWinner;
      this.state = 'roundEnd';
      this.stateT = 0;
      if (w >= 0) this.wins[w]++;
      const winners = this.fighters.filter((f) => f.team === w);
      const flawless = w >= 0 && winners.every((f) => f.damageTaken <= 0.01);
      const name = winners.length === 1 ? winners[0].char.name : (w === 0 ? 'TEAM 1' : 'TEAM 2');
      this.lastRound = { winnerTeam: w, flawless, nutality: !!this.nutalityDone };
      this.results.push(this.lastRound);
      if (w < 0) {
        this.bigText('DRAW', 150, null, { size: 110 });
        SK.audio.say('Draw');
        return;
      }
      winners.forEach((f) => { if (f.alive && f.state !== 'script') { f.cancelMove(); f.setState('victory'); } else if (f.state === 'script') { f.scriptPose = SK.rig.pose(SK.rig.P.victory); } });
      this.bigText(name + ' WINS', 160, null, { size: 76, y: SK.H * 0.3, sub: flawless ? 'FLAWLESS VICTORY' : '' });
      SK.audio.say(name.toLowerCase() + ' wins' + (flawless ? '. Flawless victory.' : ''), { pitch: 0.35, rate: 0.9 });
      if (this.wins[w] >= this.winsNeeded) SK.audio.play('victory');
    }

    // ---------------------------------------------------------------- update
    update() {
      const inp = SK.input;
      if (this.paused) { this.updatePause(); return; }
      if (inp.menu.start && !this.practiceNoPause && this.state !== 'matchOver') { this.paused = true; this.pauseSel = 0; SK.audio.sfx('menuOk'); return; }
      if (this.practice && inp.keyHit('Tab')) this.cycleDummy();
      if (inp.keyHit('Backquote')) this.debug = !this.debug;

      this.frame++;
      SK.audio.tick();

      // slow motion on knockouts
      if (this.slowmo > 0) {
        this.slowmo--;
        if (this.frame % 3 !== 0) { this.updateCamera(); this.fx.update(); return; }
      }
      this.stateT++;

      switch (this.state) {
        case 'intro':
          if (this.stateT === 20) {
            const last = this.wins[0] === this.winsNeeded - 1 && this.wins[1] === this.winsNeeded - 1 && this.round > 1;
            this.bigText(last ? 'FINAL ROUND' : 'ROUND ' + this.round, 80, null, { size: 90 });
            SK.audio.say(last ? 'Final round' : 'Round ' + this.round, { pitch: 0.3, rate: 0.85 });
            if (this.practice) this.stateT = 100;
          }
          if (this.stateT === 110) {
            this.bigText('FIGHT!', 50, null, { size: 120, gradient: ['#ffffff', '#ffe060', '#ff4000', '#800000'] });
            SK.audio.say('Fight!', { pitch: 0.3, rate: 1 });
            SK.audio.sfx('hitHeavy');
          }
          if (this.stateT === 120) {
            this.state = 'fight';
            this.stateT = 0;
            this.fighters.forEach((f) => { f.controlEnabled = true; if (f.state === 'intro') f.setState('idle'); });
          }
          break;
        case 'fight':
          if (this.cfg.timer > 0) {
            this.timer -= 1 / 60;
            if (this.timer <= 0) { this.timer = 0; this.timeUp(); }
          }
          break;
        case 'finish':
          this.finishing.t++;
          if (this.finishing.t > 330) {
            const f = this.finishing.loser;
            f.finishMe = false; f.out = true;
            f.launch(-f.facing * 2, -4);
            this.finishing = null;
            this.endRoundKO(1 - f.team);
          }
          break;
        case 'nutality':
          this.nutality.update();
          if (this.stateT === 20) this.bigText(this.nutality.title, 140, null, { size: 54, y: 110 });
          if (this.nutality.done && !this.nutalityDone) {
            this.nutalityDone = true;
            this.nutality.v.out = true;
            this.bigText('NUTALITY', 140, null, { size: 110, gradient: ['#ffe0e0', '#ff4040', '#a00000', '#400000'] });
            SK.audio.say('Nutality!', { pitch: 0.25, rate: 0.8 });
            SK.audio.sfx('explode');
            this.roundWinner = this.nutality.w.team;
            this.state = 'ko';
            this.stateT = -40;
          }
          break;
        case 'ko':
          if (this.stateT === 110) this.finishRound();
          break;
        case 'roundEnd':
          if (this.stateT === 230) {
            const done = this.wins[0] >= this.winsNeeded || this.wins[1] >= this.winsNeeded;
            if (done) {
              this.state = 'matchOver';
              this.stateT = 0;
              const winnerTeam = this.wins[0] >= this.winsNeeded ? 0 : 1;
              if (this.cfg.onEnd) this.cfg.onEnd({ winnerTeam, wins: this.wins.slice(), rounds: this.results, nutality: this.results.some((r) => r.nutality && r.winnerTeam === winnerTeam), match: this });
            } else {
              this.startRound();
            }
          }
          break;
        default: break;
      }

      if (this.hitstop > 0) {
        this.hitstop--;
        this.fx.update();
        this.updateCamera();
        this.decay();
        return;
      }

      this.fighters.forEach((f) => f.readInput());
      this.fighters.forEach((f) => f.update());
      this.pushApart();
      for (const p of this.projectiles) if (!p.dead) p.update();
      this.projectiles = this.projectiles.filter((p) => !p.dead);
      this.stage.update(this);
      this.fx.update();
      this.fighters.forEach((f) => {
        if (f.dispHp > f.hp) f.dispHp = Math.max(f.hp, f.dispHp - f.maxHp * 0.004);
        else f.dispHp = f.hp;
        if (this.practice && f.hp < f.maxHp && this.frame - (f.lastDamageT || 0) > 100 && f.comboHits === 0) { f.hp = f.maxHp; f.dispHp = f.maxHp; }
      });
      this.updateCamera();
      this.decay();
    }

    decay() {
      if (this.shakeAmt > 0) this.shakeAmt *= 0.85;
      if (this.shakeAmt < 0.3) this.shakeAmt = 0;
      this.messages.forEach((m) => m.t--);
      this.messages = this.messages.filter((m) => m.t > 0);
      this.comboDisp.forEach((c) => { if (c) c.t--; });
    }

    pushApart() {
      const fs = this.fighters;
      for (let i = 0; i < fs.length; i++) {
        for (let j = i + 1; j < fs.length; j++) {
          const a = fs[i], b = fs[j];
          if (!a.onGround || !b.onGround) continue;
          if (Math.abs(a.y - b.y) > 20) continue;
          const skip = (f) => ['grabbed', 'pulled', 'script', 'ko', 'down'].includes(f.state) || (f.move && f.move.def.isGrab && f.move.data.caught);
          if (skip(a) || skip(b)) continue;
          const minD = 17 * (a.scale + b.scale);
          const dx = b.x - a.x;
          if (Math.abs(dx) < minD) {
            const push = (minD - Math.abs(dx)) / 2;
            const s = SK.sign(dx) || a.facing;
            a.x -= s * push; b.x += s * push;
            const st = this.stage;
            a.x = SK.clamp(a.x, st.left + 16 * a.scale, st.right - 16 * a.scale);
            b.x = SK.clamp(b.x, st.left + 16 * b.scale, st.right - 16 * b.scale);
          }
        }
      }
    }

    updateCamera() {
      const st = this.stage, cam = this.camera;
      let fs = this.fighters.filter((f) => !f.hidden && (f.alive || f.state === 'ko' || f.state === 'launched'));
      if (this.nutality) fs = [this.nutality.w, this.nutality.v].filter((f) => !f.hidden || f === this.nutality.w);
      if (!fs.length) fs = this.fighters;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      fs.forEach((f) => {
        minX = Math.min(minX, f.x); maxX = Math.max(maxX, f.x);
        minY = Math.min(minY, f.y - 100 * f.scale); maxY = Math.max(maxY, f.y);
      });
      const minZoom = Math.max(SK.W / st.width, SK.H / st.height);
      const close = this.state === 'nutality' || this.state === 'finish';
      const mx = close ? 200 : 250, my = close ? 140 : 150;
      let zoom = Math.min(SK.W / (maxX - minX + mx * 2), SK.H / (maxY - minY + my * 2));
      zoom = SK.clamp(zoom, minZoom, close ? 1.35 : 1.12);
      const halfW = SK.W / 2 / zoom, halfH = SK.H / 2 / zoom;
      let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2 - 20;
      cx = SK.clamp(cx, halfW, st.width - halfW);
      cy = SK.clamp(cy, halfH, st.height - halfH);
      if (this.snapCamera) { cam.x = cx; cam.y = cy; cam.zoom = zoom; this.snapCamera = false; return; }
      cam.zoom += (zoom - cam.zoom) * 0.06;
      const hw2 = SK.W / 2 / cam.zoom, hh2 = SK.H / 2 / cam.zoom;
      cam.x += (cx - cam.x) * 0.14;
      cam.y += (cy - cam.y) * 0.1;
      cam.x = SK.clamp(cam.x, hw2, st.width - hw2);
      cam.y = SK.clamp(cam.y, hh2, st.height - hh2);
    }

    cycleDummy() {
      this.dummyMode = (this.dummyMode + 1) % DUMMY_MODES.length;
      this.fighters.forEach((f) => { if (f.ai && f.team === 1) { f.ai.dummy = DUMMY_MODES[this.dummyMode]; f.ai.queue = []; } });
      this.fx.text(this.camera.x, this.camera.y - 120, 'DUMMY: ' + DUMMY_MODES[this.dummyMode].toUpperCase(), '#c0ffc0', 26);
    }

    // ---------------------------------------------------------------- pause
    pauseItems() {
      const items = ['RESUME', 'MOVE LIST'];
      if (this.practice) items.push('DUMMY: ' + DUMMY_MODES[this.dummyMode].toUpperCase(), 'RESET POSITIONS');
      items.push(this.cfg.mode === 'tournament' ? 'QUIT TOURNAMENT' : 'QUIT TO MENU');
      return items;
    }

    updatePause() {
      const inp = SK.input.menu;
      if (this.showMoves) {
        if (inp.ok || inp.back || inp.start) { this.showMoves = false; SK.audio.sfx('menuBack'); }
        if (inp.left || inp.right) { this.moveListIdx = ((this.moveListIdx || 0) + (inp.left ? -1 : 1) + this.fighters.length) % this.fighters.length; SK.audio.sfx('menuMove'); }
        return;
      }
      const items = this.pauseItems();
      if (inp.up) { this.pauseSel = (this.pauseSel + items.length - 1) % items.length; SK.audio.sfx('menuMove'); }
      if (inp.down) { this.pauseSel = (this.pauseSel + 1) % items.length; SK.audio.sfx('menuMove'); }
      if (inp.back || (inp.start && !inp.ok)) { this.paused = false; return; }
      if (inp.ok) {
        const it = items[this.pauseSel];
        SK.audio.sfx('menuOk');
        if (it === 'RESUME') this.paused = false;
        else if (it === 'MOVE LIST') { this.showMoves = true; this.moveListIdx = 0; }
        else if (it.startsWith('DUMMY')) this.cycleDummy();
        else if (it === 'RESET POSITIONS') { this.round = 0; this.startRound(); this.paused = false; }
        else { this.paused = false; if (this.cfg.onQuit) this.cfg.onQuit(); }
      }
    }

    // ---------------------------------------------------------------- render
    render(ctx) {
      const cam = this.camera;
      ctx.save();
      this.stage.drawSky(ctx, this);
      const sx = this.shakeAmt ? SK.rand(-this.shakeAmt, this.shakeAmt) : 0;
      const sy = this.shakeAmt ? SK.rand(-this.shakeAmt, this.shakeAmt) : 0;
      ctx.translate(SK.W / 2 + sx, SK.H / 2 + sy);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);
      this.stage.drawBack(ctx, this);
      if (this.state === 'nutality' || (this.nutalityDone && this.state !== 'intro')) {
        const k = this.nutality ? Math.min(1, this.nutality.t / 30) : 1;
        ctx.fillStyle = 'rgba(10,0,0,' + (0.62 * k) + ')';
        ctx.fillRect(cam.x - SK.W / cam.zoom, cam.y - SK.H / cam.zoom, (SK.W * 2) / cam.zoom, (SK.H * 2) / cam.zoom);
      }
      this.fx.draw(ctx, false);
      const order = this.fighters.slice().sort((a, b) => {
        const ra = a.state === 'ko' || a.state === 'down' ? 0 : a.state === 'grabbed' ? 2 : 1;
        const rb = b.state === 'ko' || b.state === 'down' ? 0 : b.state === 'grabbed' ? 2 : 1;
        return ra - rb;
      });
      order.forEach((f) => f.draw(ctx));
      this.projectiles.forEach((p) => p.draw(ctx));
      if (this.nutality) this.nutality.drawFront(ctx);
      this.stage.drawFront(ctx, this);
      this.fx.draw(ctx, true);
      ctx.restore();

      SK.HUD.draw(ctx, this);
      SK.HUD.messages(ctx, this);
      if (this.nutality) this.nutality.drawScreen(ctx);
      if (this.state === 'finish' && this.finishing) {
        const left = Math.max(0, Math.ceil((330 - this.finishing.t) / 60));
        G().text(ctx, String(left), SK.W / 2, 100, { size: 30, align: 'center', color: '#ff4040', stroke: '#000', strokeW: 4, font: G().TITLE_FONT });
      }
      if (this.practice) this.renderPracticeInfo(ctx);
      if (this.paused) this.renderPause(ctx);
    }

    renderPracticeInfo(ctx) {
      const p1 = this.fighters.find((f) => f.player === 0);
      G().text(ctx, 'TAB: dummy mode (' + DUMMY_MODES[this.dummyMode] + ')   ESC: pause / move list', SK.W / 2, SK.H - 16, { size: 14, align: 'center', color: '#fff', stroke: '#000', strokeW: 3, font: G().BODY_FONT });
      if (!p1) return;
      const keys = ['u', 'd', 'l', 'r', 'p', 'k', 'b'];
      const labels = { u: '↑', d: '↓', l: '←', r: '→', p: 'P', k: 'K', b: 'BL' };
      keys.forEach((k, i) => {
        const on = p1.in[k];
        G().panel(ctx, 20 + i * 34, SK.H - 52, 30, 26, { r: 5, fill: on ? '#ffb020' : 'rgba(0,0,0,0.5)', stroke: '#c27a2c', lw: 2 });
        G().text(ctx, labels[k], 35 + i * 34, SK.H - 38, { size: 14, align: 'center', color: on ? '#000' : '#fff' });
      });
      if (p1.move) G().text(ctx, (p1.move.def.name || p1.move.def.id || '').toUpperCase(), 20, SK.H - 70, { size: 18, color: '#ffe080', stroke: '#000', strokeW: 3 });
    }

    renderPause(ctx) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, SK.W, SK.H);
      ctx.restore();
      if (this.showMoves) {
        const f = this.fighters[this.moveListIdx || 0];
        SK.drawMoveList(ctx, f.char, 80, 40, SK.W - 160, SK.H - 80);
        G().text(ctx, '← → switch fighter   ·   any button to close', SK.W / 2, SK.H - 22, { size: 14, align: 'center', color: '#ccc', font: G().BODY_FONT });
        return;
      }
      G().banner(ctx, 'PAUSED', SK.W / 2, 130, 70);
      const items = this.pauseItems();
      items.forEach((it, i) => {
        const sel = i === this.pauseSel;
        G().text(ctx, (sel ? '▶ ' : '') + it, SK.W / 2, 220 + i * 44, { size: sel ? 32 : 26, align: 'center', color: sel ? '#ffd040' : '#e8d8c0', stroke: '#000', strokeW: 4 });
      });
    }

    exit() {}
  }

  Match.DUMMY_MODES = DUMMY_MODES;
  SK.Match = Match;
})(typeof window !== 'undefined' ? window : globalThis);
