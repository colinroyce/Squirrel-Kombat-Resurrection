/* A kombatant: state machine, physics, input handling, hits and drawing. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const P = SK.rig.P;
  const GRAV = 0.9;
  const NEUTRAL = ['idle', 'walk', 'crouch', 'block'];
  const NOINPUT = { u: false, d: false, l: false, r: false, p: false, k: false, b: false };

  class Fighter {
    constructor(match, ch, o) {
      this.match = match;
      this.char = ch;
      this.st = ch.stats;
      this.skin = ch.skin;
      this.moves = SK.Moves.movesFor(ch);
      this.team = o.team;
      this.slot = o.slot || 0;
      this.player = o.player == null ? null : o.player;
      this.ai = null;
      this.scale = this.st.scale;
      this.maxHp = this.st.hp;
      this.hp = this.maxHp;
      this.dispHp = this.maxHp;
      this.x = o.x || 0;
      this.y = o.y || 0;
      this.vx = 0; this.vy = 0;
      this.facing = o.facing || 1;
      this.onGround = true;
      this.platform = null;
      this.airJumps = this.st.airJumps;
      this.state = 'idle';
      this.stateT = 0;
      this.stunT = 0;
      this.move = null;
      this.invuln = 0;
      this.juggle = 0;
      this.comboHits = 0;
      this.in = Object.assign({}, NOINPUT);
      this.pin = Object.assign({}, NOINPUT);
      this.hist = [];
      this.clock = 0;
      this.t = 0;
      this.pose = SK.rig.pose(P.stance);
      this.frozen = 0; this.burn = 0; this.acid = 0; this.shock = 0; this.invisible = 0;
      this.flash = 0;
      this.dropT = 0; this.dropPlat = null;
      this.noGravity = false;
      this.gravityScale = 1;
      this.out = false;
      this.finishMe = false;
      this.flipT = 0;
      this.crouchBlock = false;
      this.grabber = null;
      this.pullBy = null;
      this.target = null;
      this.controlEnabled = false;
      this.damageTaken = 0;
      this.scriptPose = null;
      this.hidden = false;
      this.lastDownTap = -99;
      this.alpha = 1;
      this.squash = [1, 1];
      this.drawRot = 0;
      this.jitter = 0;
      this.skeleton = false;
    }

    // Restore everything for a fresh round.
    resetForRound(x, y, facing) {
      this.cancelMove();
      this.x = x; this.y = y; this.vx = 0; this.vy = 0;
      this.facing = facing;
      this.hp = this.maxHp; this.dispHp = this.maxHp;
      this.onGround = true; this.platform = null;
      this.airJumps = this.st.airJumps;
      this.state = 'intro'; this.stateT = 0; this.stunT = 0;
      this.invuln = 0; this.juggle = 0; this.comboHits = 0;
      this.frozen = 0; this.burn = 0; this.acid = 0; this.shock = 0; this.invisible = 0;
      this.flash = 0; this.dropT = 0; this.noGravity = false; this.gravityScale = 1;
      this.out = false; this.finishMe = false; this.flipT = 0; this.crouchBlock = false;
      this.grabber = null; this.pullBy = null; this.controlEnabled = false;
      this.damageTaken = 0; this.scriptPose = null; this.hidden = false; this.alpha = 1;
      this.squash = [1, 1]; this.drawRot = 0; this.jitter = 0; this.skeleton = false;
      this.hist.length = 0;
      this.pose = SK.rig.pose(P.stance);
    }

    get alive() { return !this.out; }
    get name() { return this.char.name; }

    // ------------------------------------------------------------------ input
    held(b) { return this.in[b]; }
    hit(b) { return this.in[b] && !this.pin[b]; }
    get fwdKey() { return this.facing > 0 ? 'r' : 'l'; }
    get backKey() { return this.facing > 0 ? 'l' : 'r'; }
    inDir() { return this.in.r ? 1 : this.in.l ? -1 : 0; }

    readInput() {
      this.pin = this.in;
      let src = NOINPUT;
      if (this.ai) src = this.ai.update() || NOINPUT;
      else if (this.player != null) src = SK.input.players[this.player].held;
      this.in = this.controlEnabled ? Object.assign({}, src) : Object.assign({}, NOINPUT);
      this.clock++;
      if (!this.controlEnabled) return;
      const push = (d) => { this.hist.push({ d, t: this.clock }); if (this.hist.length > 12) this.hist.shift(); };
      if (this.hit(this.fwdKey)) push('F');
      if (this.hit(this.backKey)) push('B');
      if (this.hit('d')) push('D');
      if (this.hit('u')) push('U');
    }

    matchSeq(seq) {
      const dirs = seq.slice(0, -1);
      let idx = this.hist.length - 1;
      let lastT = this.clock;
      for (let i = dirs.length - 1; i >= 0; i--) {
        const h = this.hist[idx];
        if (!h || h.d !== dirs[i]) return false;
        if (lastT - h.t > (i === dirs.length - 1 ? 12 : 16)) return false;
        lastT = h.t;
        idx--;
      }
      return true;
    }

    trySpecial(btn) {
      for (let i = 0; i < 4; i++) {
        const seq = SK.SPECIAL_SEQS[i];
        if (seq[seq.length - 1] !== btn) continue;
        if (!this.matchSeq(seq)) continue;
        const def = this.moves.specials[i];
        if (!this.onGround && !def.air) continue;
        if (this.startMove(def)) { this.hist.length = 0; return true; }
      }
      return false;
    }

    tryNutality(btn) {
      const m = this.match;
      if (!m.finishing || m.finishing.winnerTeam !== this.team || btn !== 'k') return false;
      if (!this.matchSeq(SK.NUTALITY_SEQ)) return false;
      const v = m.finishing.loser;
      if (!v || Math.abs(v.x - this.x) > 120 * Math.max(this.scale, 1) || Math.abs(v.y - this.y) > 50) return false;
      if (!this.onGround) return false;
      this.hist.length = 0;
      m.startNutality(this, v);
      return true;
    }

    tryThrow() {
      const tg = this.match.enemiesOf(this).find((e) => e.onGround && e.canBeGrabbed(false) &&
        Math.abs(e.y - this.y) < 20 && (e.x - this.x) * this.facing > 0 && Math.abs(e.x - this.x) < 34 * this.scale + 22 * e.scale &&
        ['idle', 'walk', 'crouch', 'block', 'blockstun'].includes(e.state));
      if (!tg) return false;
      return this.startMove(this.moves.toss);
    }

    // ------------------------------------------------------------------ moves
    startMove(def) {
      if (!def) return false;
      if (def.canStart && !def.canStart(this)) return false;
      if (this.move && this.move.def.onEnd) this.move.def.onEnd(this, this.move);
      this.move = { def, frame: 0, hits: new Set(), data: {}, connected: false, next: null };
      this.state = 'attack';
      this.stateT = 0;
      if (this.onGround && !def.keepMomentum) this.vx = 0;
      if (def.onStart) def.onStart(this, this.move);
      return true;
    }

    endMove() {
      const m = this.move;
      if (m && m.def.onEnd) m.def.onEnd(this, m);
      if (m && m.data.caught) { m.data.caught.release(); }
      this.move = null;
      this.noGravity = false;
      this.gravityScale = 1;
      this.setState(this.onGround ? 'idle' : 'air');
    }

    cancelMove() {
      if (!this.move) return;
      const m = this.move;
      if (m.def.onEnd) m.def.onEnd(this, m);
      if (m.data.caught) m.data.caught.release();
      this.move = null;
      this.noGravity = false;
      this.gravityScale = 1;
    }

    updateMove() {
      const m = this.move, d = m.def;
      if (d.onUpdate) d.onUpdate(this, m);
      if (!this.move || this.move !== m) return;
      if (m.end) { this.endMove(); return; }
      const total = d.startup + d.active + d.recovery;
      const inActive = m.frame >= d.startup && m.frame < d.startup + d.active;
      if (d.sfx && (m.frame === d.startup || (d.sfxEvery && inActive && (m.frame - d.startup) % d.sfxEvery === 0))) SK.audio.sfx(d.sfx);
      if (inActive && d.hitbox) {
        if (d.hitEvery && (m.frame - d.startup) % d.hitEvery === 0) m.hits.clear();
        this.checkHits();
      }
      if (d.invuln) this.invulnMove = m.frame >= d.invuln[0] && m.frame <= d.invuln[1];
      else this.invulnMove = false;
      // special cancel off a connected normal
      if (m.connected && (d.kind === 'normal' || d.kind === 'combo') && !d.isGrab && (this.hit('p') || this.hit('k'))) {
        if (this.trySpecial(this.hit('p') ? 'p' : 'k')) return;
      }
      // chain into the next part of a combo string
      if (d.chain && !m.next) {
        if (this.hit('p') && d.chain.p) m.next = d.chain.p;
        else if (this.hit('k') && d.chain.k) m.next = d.chain.k;
      }
      if (m.next && m.frame >= d.startup + d.active) {
        const nd = this.moves[m.next];
        this.move = null;
        if (!this.startMove(nd)) this.endMove();
        return;
      }
      if (d.landCancel && this.onGround && m.frame > 1) { this.endMove(); this.setState('land'); this.stunT = 4; return; }
      if (d.untilLand) {
        if (m.frame >= d.startup + d.active && this.onGround) {
          this.endMove();
          if (d.landLag) { this.setState('land'); this.stunT = d.landLag; }
          return;
        }
      } else if (m.frame >= total - 1 && d.active < 999) { this.endMove(); return; }
      m.frame++;
    }

    hitboxRect(hb) {
      const s = this.scale;
      const [ox, oy, w, h] = hb;
      return this.facing > 0
        ? { x: this.x + ox * s, y: this.y + oy * s, w: w * s, h: h * s }
        : { x: this.x - (ox + w) * s, y: this.y + oy * s, w: w * s, h: h * s };
    }

    checkHits() {
      const m = this.move, d = m.def;
      const hb = this.hitboxRect(d.hitbox);
      this.lastHitbox = hb;
      for (const e of this.match.enemiesOf(this)) {
        if (m.hits.has(e)) continue;
        if (!SK.overlap(hb, e.hurtbox())) continue;
        let hit = d.hit;
        if (d.finalHit && d.hitEvery && m.frame - d.startup >= d.active - d.hitEvery) hit = Object.assign({}, d.hit, d.finalHit);
        hit = Object.assign({}, hit, { dirX: this.facing });
        const res = e.takeHit(hit, this, this.x, 'melee');
        if (res) {
          m.hits.add(e);
          if (res === 'hit' || res === 'blocked') m.connected = true;
          if (d.onHit) d.onHit(this, e, m);
        }
      }
    }

    spawnProjectile(o, raw) {
      const s = this.scale;
      const dir = o.dir || this.facing;
      const p = {
        owner: this, team: this.team, kind: o.kind, dir,
        x: o.x != null ? o.x : this.x + dir * 34 * s,
        y: o.y != null ? o.y : this.y - 66 * s,
        vx: dir * (o.speed || 8), vy: o.vy || 0, gravity: o.gravity || 0,
        hit: o.hit, ground: !!o.ground, life: o.life || 240, wobble: o.wobble, fuse: o.fuse,
      };
      if (!raw) SK.audio.sfx('projectile');
      return this.match.addProjectile(p);
    }

    // ------------------------------------------------------------------ state
    setState(s) {
      if (this.state === s) return;
      this.state = s;
      this.stateT = 0;
    }

    isNeutral() { return NEUTRAL.includes(this.state) || this.state === 'air'; }

    canBeGrabbed(air) {
      if (!this.alive || this.invuln > 0 || this.invulnMove) return false;
      if (['grabbed', 'down', 'getup', 'launched', 'ko', 'pulled', 'script'].includes(this.state)) return false;
      if (!this.onGround && !air) return false;
      return true;
    }

    grabbedBy(f) {
      this.cancelMove();
      this.grabber = f;
      this.setState('grabbed');
      this.vx = 0; this.vy = 0;
      this.onGround = false; this.platform = null;
      this.noGravity = true;
    }

    release() {
      this.grabber = null;
      this.noGravity = false;
      if (this.state === 'grabbed') { this.setState('hitstun'); this.stunT = 10; }
    }

    pullTo(owner) {
      this.cancelMove();
      this.pullBy = owner;
      this.setState('pulled');
      this.noGravity = true;
      this.onGround = false; this.platform = null;
    }

    freeze(n) {
      this.cancelMove();
      this.frozen = n;
      this.frozenPose = SK.rig.pose(this.pose);
      this.frozenPose.expr = 'shock';
      this.setState('frozen');
      this.vx = 0;
      SK.audio.sfx('freeze');
    }

    launch(vx, vy) {
      this.setState('launched');
      this.vx = vx;
      this.vy = Math.min(vy, -4);
      this.onGround = false;
      this.platform = null;
      this.juggle++;
      if (this.juggle > 4) this.invuln = Math.max(this.invuln, 60);
    }

    damage(n) {
      if (this.match.practice) this.hp = Math.max(1, this.hp - n);
      else this.hp = Math.max(0, this.hp - n);
      this.damageTaken += n;
      this.lastDamageT = this.match.frame;
    }

    takeHit(hit, attacker, srcX, src) {
      if (!this.alive) return false;
      const ms = this.match.state;
      if (ms !== 'fight' && ms !== 'finish') return false;
      if (ms === 'finish' && !this.finishMe) return false;
      const fromGrab = src === 'grab';
      if ((this.invuln > 0 || this.invulnMove) && !fromGrab && src !== 'nutality') return false;
      if (this.state === 'grabbed' && !fromGrab) return false;
      if (['down', 'getup', 'ko', 'script'].includes(this.state) && !fromGrab) return false;
      if (hit.groundOnly && !this.onGround) return false;
      if (attacker && attacker.team === this.team) return false;
      const m = this.match;
      const dir = hit.dirX || SK.sign(this.x - srcX) || 1;
      const s = this.scale;
      const cx = this.x - dir * 12 * s, cy = this.y - 56 * s;

      // Counter stance
      const mv = this.move;
      const isHazard = src === 'hazard' || !!(src && src.hazard);
      if (mv && mv.def.counter && !mv.data.countered && mv.frame >= mv.def.startup && mv.frame < mv.def.startup + mv.def.active &&
        !isHazard && !fromGrab && src !== 'counter' && src !== 'beam') {
        if (src instanceof SK.Projectile) {
          if (this.char.id === 'mailman') {
            src.owner = this; src.team = this.team; src.vx = -src.vx * 1.2; src.dir = -src.dir; src.hits.clear();
            m.fx.text(this.x, this.y - 120 * s, 'RETURN TO SENDER!', '#ffd040', 20);
            SK.audio.sfx('stamp');
            return 'reflected';
          }
          src.dead = true;
          m.fx.ice(src.x, src.y, 5);
          return 'blocked';
        }
        if (attacker) {
          mv.data.countered = true;
          mv.data.at = mv.frame;
          mv.data.attacker = attacker;
          mv.frame = mv.def.startup + mv.def.active; // jump to recovery
          this.facing = SK.sign(attacker.x - this.x) || this.facing;
          m.fx.hitSpark(cx, cy, true, '#bfe9ff');
          SK.audio.sfx('block');
          m.hitstop = 10;
          m.fx.text(this.x, this.y - 110 * s, 'COUNTER!', '#bfe9ff', 22);
          return 'countered';
        }
      }

      // Blocking
      const facingSrc = SK.sign(srcX - this.x) === this.facing || Math.abs(srcX - this.x) < 6;
      const blocking = (this.state === 'block' || this.state === 'blockstun') && this.onGround;
      if (blocking && facingSrc && !hit.unblockable) {
        const crouching = this.crouchBlock;
        if (!(hit.low && !crouching) && !(hit.overhead && crouching)) {
          if (hit.special) this.damage(hit.dmg * 0.12 * (attacker ? attacker.st.power : 1));
          if (this.hp <= 0 && !m.practice) { this.hp = 1; }
          this.setState('blockstun');
          this.stunT = hit.bstun || 12;
          this.vx = dir * ((hit.kb ? hit.kb[0] : 4) * 0.7 + 1.5);
          m.fx.blockSpark(cx, cy);
          SK.audio.sfx('block');
          m.hitstop = Math.max(m.hitstop, 3);
          return 'blocked';
        }
      }

      // Taking the hit
      let dmg = hit.dmg * (attacker ? attacker.st.power : 1);
      if (!hit.held) dmg *= Math.max(0.35, 1 - this.comboHits * 0.08);
      if (this.frozen > 0 && hit.effect === 'freeze') dmg *= 0.5;
      const wasFrozen = this.frozen > 0;
      const heavy = hit.heavy || hit.launch || hit.knockdown || dmg >= 80;
      // super armor (the boss shrugs off light hits and keeps attacking)
      const armored = this.st.armor && this.onGround && !hit.launch && !hit.knockdown && !heavy && !hit.effect &&
        !wasFrozen && !hit.held && !this.finishMe && this.hp - dmg > 0;
      this.frozen = 0;
      if (!armored) this.cancelMove();
      if (this.comboHits === 0) this.comboStartHp = this.hp;
      this.damage(dmg);
      this.comboHits++;
      this.flash = 5;
      if (attacker) { attacker.lastHitT = m.frame; m.onComboHit(attacker, this); }
      // visuals & sound
      m.fx.hitSpark(cx, cy, heavy, hit.effect === 'freeze' ? '#bfe9ff' : hit.effect === 'shock' ? '#cfefff' : null);
      m.fx.fur(cx, cy, this.skin.fur, heavy ? 7 : 4, this.y);
      m.fx.blood(cx, cy, dir, heavy ? 10 : 4, this.y);
      SK.audio.sfx(heavy ? 'hitHeavy' : 'hit');
      if (SK.chance(0.6)) SK.audio.sfx(this.skin.human ? 'grunt' : 'hurt', { pitch: 1 / this.scale });
      m.hitstop = Math.max(m.hitstop, heavy ? 9 : 5);
      if (heavy) m.shake(heavy && dmg > 90 ? 9 : 5);

      // status effects
      if (hit.effect === 'burn') this.burn = 90;
      if (hit.effect === 'acid') this.acid = 150;
      if (hit.effect === 'shock') { this.shock = 30; m.fx.zap(this.x, this.y - 50 * s, 5); }

      // finishing a dizzy loser
      if (this.finishMe) { m.onFinishHit(this, attacker); return 'hit'; }
      if (hit.held) { if (this.hp <= 0) this.hp = 1; return 'hit'; }

      const kb = hit.kb || [4, 0];
      const w = this.st.weight;
      if (this.hp <= 0) {
        this.launch(dir * Math.max(5, kb[0]) * w, Math.min(-9, kb[1] * w));
        m.onKO(this, attacker);
        return 'hit';
      }
      if (armored) {
        this.vx += dir * 1.5;
        return 'hit';
      }
      if (hit.effect === 'freeze' && !wasFrozen) {
        this.freeze(85);
        if (!this.onGround) this.vy = Math.max(this.vy, 0);
        return 'hit';
      }
      if (hit.effect === 'stun') { this.setState('dizzy'); this.stunT = 50; return 'hit'; }
      if (hit.launch || hit.knockdown || !this.onGround) {
        this.launch(dir * kb[0] * w, (kb[1] || -6) * w);
        return 'hit';
      }
      this.setState('hitstun');
      this.stunT = (hit.stun || 16) + (this.shock > 0 ? 6 : 0);
      this.vx = dir * kb[0] * w;
      return 'hit';
    }

    // ------------------------------------------------------------------ update
    update() {
      this.t++;
      if (this.flash > 0) this.flash--;
      if (this.invuln > 0) this.invuln--;
      if (this.invisible > 0) this.invisible--;
      if (this.dropT > 0) this.dropT--;
      if (this.flipT > 0) this.flipT--;
      if (this.shock > 0) { this.shock--; if (this.shock % 6 === 0) this.match.fx.zap(this.x, this.y - 45 * this.scale, 1); }
      if (this.burn > 0) {
        this.burn--;
        if (this.burn % 3 === 0) this.match.fx.fire(this.x + SK.rand(-14, 14), this.y - SK.rand(10, 80) * this.scale, 1);
        if (this.burn % 18 === 0 && this.alive && !this.finishMe) { this.damage(4); if (this.hp <= 0) { this.hp = 1; } }
      }
      if (this.acid > 0) {
        this.acid--;
        if (this.acid % 8 === 0) this.match.fx.add({ type: 'dot', x: this.x + SK.rand(-12, 12), y: this.y - SK.rand(20, 80) * this.scale, vy: 0.5, grav: 0.15, life: 24, size: 2.5, color: '#7cff3a' });
        if (this.acid % 25 === 0 && this.alive && !this.finishMe) { this.damage(5); if (this.hp <= 0) this.hp = 1; }
      }

      if (this.state === 'script') { this.stateT++; return; }

      this.target = this.match.nearestEnemy(this);
      const st = this.state;
      this.stateT++;

      switch (st) {
        case 'intro':
        case 'victory':
        case 'idle': case 'walk': case 'crouch': case 'block':
          if (st === 'intro' || st === 'victory') { this.vx *= 0.8; break; }
          this.groundControl();
          break;
        case 'air': this.airControl(); break;
        case 'land':
          if (--this.stunT <= 0) this.setState('idle');
          break;
        case 'attack':
          if (this.move) this.updateMove();
          else this.setState(this.onGround ? 'idle' : 'air');
          break;
        case 'hitstun': case 'blockstun':
          if (--this.stunT <= 0) { this.setState(this.onGround ? 'idle' : 'air'); }
          break;
        case 'frozen':
          if (--this.frozen <= 0) {
            this.frozen = 0;
            this.setState(this.onGround ? 'idle' : 'air');
            this.match.fx.ice(this.x, this.y - 50 * this.scale, 8);
            SK.audio.sfx('shatter');
          }
          break;
        case 'launched':
          break; // physics handles landing
        case 'down':
          if (this.stateT > 32 && !this.out) { this.setState('getup'); this.invuln = 22; }
          break;
        case 'getup':
          if (this.stateT > 16) this.setState('idle');
          break;
        case 'grabbed':
          if (!this.grabber || !this.grabber.alive || this.grabber.state !== 'attack') this.release();
          break;
        case 'pulled': {
          const o = this.pullBy;
          if (!o || !o.alive) { this.noGravity = false; this.setState('air'); break; }
          const tx = o.x + o.facing * 46 * o.scale;
          const dx = tx - this.x;
          this.x += SK.clamp(dx, -18, 18);
          this.y += SK.clamp(o.y - this.y, -12, 12);
          if (Math.abs(dx) < 4 || this.stateT > 50) {
            this.noGravity = false;
            this.y = o.y; this.onGround = o.onGround; this.platform = o.platform;
            this.setState('dizzy'); this.stunT = 46;
            this.facing = SK.sign(o.x - this.x) || this.facing;
          }
          break;
        }
        case 'dizzy':
          this.vx *= 0.8;
          if (!this.finishMe && --this.stunT <= 0) this.setState('idle');
          if (this.t % 20 === 0 && this.finishMe) SK.audio.sfx('chitter', { pitch: 0.7 });
          break;
        case 'ko':
          break;
        default: break;
      }

      // reset combo counters once we're actionable again
      if (this.isNeutral() && this.state !== 'air') { this.comboHits = 0; this.juggle = 0; }
      if (this.state === 'air' && this.stateT > 2 && this.comboHits && !this.match.hitstop) { this.comboHits = 0; this.juggle = 0; }

      this.physics();
      this.computePose();
    }

    faceTarget() {
      const tg = this.target;
      if (!tg) return;
      const dx = tg.x - this.x;
      if (Math.abs(dx) > 6) this.facing = dx > 0 ? 1 : -1;
    }

    groundControl() {
      this.faceTarget();
      const spd = this.st.speed;
      // drop through one-way platforms with a double-tap down
      if (this.hit('d')) {
        if (this.clock - this.lastDownTap < 14 && this.platform && this.platform.oneway) {
          this.dropT = 14; this.dropPlat = this.platform; this.onGround = false; this.platform = null;
          this.vy = 2; this.setState('air'); return;
        }
        this.lastDownTap = this.clock;
      }
      if (this.hit('p') || this.hit('k')) {
        const btn = this.hit('p') ? 'p' : 'k';
        if (this.tryNutality(btn)) return;
        if (this.trySpecial(btn)) return;
        if (btn === 'p' && this.held(this.fwdKey) && this.tryThrow()) return;
        const M = this.moves;
        if (this.held('d')) this.startMove(btn === 'p' ? M.uppercut : M.sweep);
        else this.startMove(btn === 'p' ? M.jab : M.kick);
        return;
      }
      if (this.hit('u')) { this.jump(); return; }
      if (this.held('b')) {
        this.crouchBlock = this.held('d');
        this.setState('block');
        this.vx *= 0.6;
        return;
      }
      this.crouchBlock = false;
      if (this.held('d')) { this.setState('crouch'); this.vx *= 0.6; return; }
      const dir = this.inDir();
      if (dir) {
        const back = dir !== this.facing;
        const target = dir * spd * (back ? 0.78 : 1);
        this.vx += (target - this.vx) * this.match.stage.friction;
        this.setState('walk');
      } else {
        this.vx *= 1 - 0.5 * this.match.stage.friction;
        if (Math.abs(this.vx) < 0.1) this.vx = 0;
        this.setState('idle');
      }
    }

    jump() {
      const dir = this.inDir();
      this.vy = -this.st.jump;
      this.vx = dir * this.st.speed * 1.1;
      this.onGround = false;
      this.platform = null;
      this.setState('air');
      SK.audio.sfx('jump');
      this.match.fx.dust(this.x, this.y, 4);
    }

    airControl() {
      if (!this.move) this.faceTarget();
      if (this.hit('p') || this.hit('k')) {
        const btn = this.hit('p') ? 'p' : 'k';
        if (this.trySpecial(btn)) return;
        this.startMove(btn === 'p' ? this.moves.airPunch : this.moves.airKick);
        return;
      }
      if (this.hit('u') && this.airJumps > 0) {
        this.airJumps--;
        this.vy = -this.st.jump * 0.82;
        const dir = this.inDir();
        if (dir) this.vx = dir * this.st.speed * 1.1;
        this.flipT = 22;
        SK.audio.sfx('jump');
        this.match.fx.dust(this.x, this.y, 3, 'rgba(255,255,255,0.6)');
      }
      const dir = this.inDir();
      const target = dir * this.st.speed * 1.1;
      this.vx += (target - this.vx) * 0.12;
    }

    physics() {
      const st = this.match.stage;
      const prevY = this.y;
      if (this.state === 'grabbed' || this.state === 'pulled' || this.state === 'script') return;
      if (!this.onGround && !this.noGravity) {
        let g = GRAV * this.gravityScale;
        if (this.state === 'air' && this.held('d') && this.vy > 0) g *= 1.5;
        if (this.state === 'launched') g *= 0.85;
        this.vy = Math.min(this.vy + g, 19);
      }
      this.x += this.vx;
      this.y += this.vy;
      if (this.onGround) {
        const slow = ['hitstun', 'blockstun', 'down', 'ko', 'getup', 'frozen', 'dizzy', 'land', 'intro', 'victory'].includes(this.state) ||
          (this.state === 'attack' && !this.dashing());
        if (slow) this.vx *= 1 - 0.16 * st.friction;
      } else if (this.state === 'launched') this.vx *= 0.995;
      // walls
      const half = 16 * this.scale;
      if (this.x < st.left + half) { this.x = st.left + half; if (this.state === 'launched' && Math.abs(this.vx) > 5) this.wallBounce(); else if (this.vx < 0) this.vx = 0; }
      if (this.x > st.right - half) { this.x = st.right - half; if (this.state === 'launched' && Math.abs(this.vx) > 5) this.wallBounce(); else if (this.vx > 0) this.vx = 0; }
      const wasGround = this.onGround;
      st.collideFighter(this, prevY);
      if (!wasGround && this.onGround) this.onLand();
      if (wasGround && !this.onGround && (this.state === 'idle' || this.state === 'walk' || this.state === 'crouch' || this.state === 'block')) this.setState('air');
    }

    dashing() { return this.move && this.move.def.kind === 'special' && Math.abs(this.vx) > 3; }

    wallBounce() {
      this.vx = -this.vx * 0.4;
      this.match.shake(5);
      this.match.fx.dust(this.x, this.y - 40, 5);
      SK.audio.sfx('thud');
    }

    onLand() {
      this.airJumps = this.st.airJumps;
      this.flipT = 0;
      const st = this.state;
      if (st === 'launched') {
        if (this.vy > 9 || this.lastVy > 9) {
          // small bounce
        }
        this.match.fx.dust(this.x, this.y, 8);
        SK.audio.sfx('thud');
        this.vx *= 0.5;
        if (this.out) { this.setState('ko'); }
        else this.setState('down');
        this.juggle = 0;
        return;
      }
      if (st === 'air') { this.setState('land'); this.stunT = 3; SK.audio.sfx('land'); this.match.fx.dust(this.x, this.y, 3); }
      if (st === 'hitstun') { /* keep */ }
    }

    // ------------------------------------------------------------------ boxes
    hurtbox() {
      const s = this.scale;
      let w = 34 * s, h = 86 * s, oy = 0;
      if (this.state === 'crouch' || (this.state === 'block' && this.crouchBlock) || (this.state === 'blockstun' && this.crouchBlock)) h = 58 * s;
      if (this.state === 'down' || this.state === 'ko') { w = 72 * s; h = 26 * s; }
      if (this.state === 'launched') { w = 50 * s; h = 56 * s; oy = -10 * s; }
      if (this.move && this.move.def.lowProfile && this.move.frame >= this.move.def.startup) h = 46 * s;
      if (!this.onGround && this.state === 'air') { h = 72 * s; oy = -6 * s; }
      return { x: this.x - w / 2, y: this.y - h + oy, w, h };
    }

    // ------------------------------------------------------------------ pose
    computePose() {
      if (this.scriptPose) { this.pose = this.scriptPose; return; }
      let target;
      const t = this.t;
      switch (this.state) {
        case 'idle': case 'intro': {
          target = SK.rig.pose(this.state === 'intro' && this.stateT < 70 ? P.taunt : P.stance);
          target.hip[1] += Math.sin(t * 0.12) * 1.4;
          target.tail[0] += Math.sin(t * 0.05) * 0.1;
          break;
        }
        case 'walk': {
          target = SK.rig.pose(P.stance);
          const ph = t * 0.32;
          const dir = SK.sign(this.vx) * this.facing || 1;
          target.fF = [13 + Math.sin(ph * dir) * 9, -Math.max(0, Math.cos(ph * dir)) * 8];
          target.fB = [-12 - Math.sin(ph * dir) * 9, -Math.max(0, -Math.cos(ph * dir)) * 8];
          target.hip[1] += -Math.abs(Math.sin(ph)) * 3;
          target.tail[0] += Math.sin(ph) * 0.15;
          break;
        }
        case 'crouch': target = P.crouch; break;
        case 'block': target = this.crouchBlock ? P.crouchBlock : P.block; break;
        case 'blockstun': target = this.crouchBlock ? P.crouchBlock : P.block; break;
        case 'land': target = P.land; break;
        case 'air': {
          target = this.vy < 0 ? P.jumpUp : P.jumpDown;
          if (this.flipT > 0) { target = SK.rig.pose(P.jumpUp); target.rot = (1 - this.flipT / 22) * Math.PI * 2; this.pose = target; return; }
          break;
        }
        case 'attack': {
          const m = this.move;
          if (!m) { target = P.stance; break; }
          const d = m.def;
          if (typeof d.anim === 'function') target = d.anim(this, m);
          else target = animAt(d.anim, m.frame);
          if (target) { this.pose = SK.rig.blend(this.pose, target, 0.55); this.pose.rot = target.rot || 0; this.pose.sx = target.sx == null ? 1 : target.sx; this.pose.ball = target.ball || 0; return; }
          target = P.stance;
          break;
        }
        case 'hitstun': target = this.crouchBlock ? P.hitLow : P.hit; break;
        case 'launched': {
          target = SK.rig.pose(P.launched);
          target.rot = -SK.clamp(this.stateT * 0.12, 0, 1.2);
          this.pose = SK.rig.blend(this.pose, target, 0.4);
          this.pose.rot = target.rot;
          return;
        }
        case 'down': case 'ko': target = P.down; break;
        case 'getup': target = SK.rig.blend(P.down, P.stance, this.stateT / 16); break;
        case 'grabbed': target = P.grabbed; break;
        case 'pulled': target = P.launched; break;
        case 'dizzy': {
          target = SK.rig.pose(P.dizzy);
          target.lean += Math.sin(t * 0.1) * 0.2;
          target.hip[0] += Math.sin(t * 0.1) * 4;
          break;
        }
        case 'frozen': this.pose = this.frozenPose || this.pose; return;
        case 'victory': {
          target = SK.rig.pose(P.victory);
          const hop = Math.abs(Math.sin(this.stateT * 0.12));
          target.oy = -hop * 14;
          target.tail[0] += Math.sin(this.stateT * 0.2) * 0.3;
          break;
        }
        default: target = P.stance;
      }
      this.pose = SK.rig.blend(this.pose, target, 0.35);
      this.pose.rot = target.rot || 0;
      this.pose.sx = target.sx == null ? 1 : target.sx;
      this.pose.ball = target.ball || 0;
      this.pose.expr = target.expr;
    }

    // ------------------------------------------------------------------ draw
    draw(ctx) {
      if (this.hidden) return;
      const s = this.scale;
      const m = this.match;
      // shadow
      const sy = m.stage.surfaceBelow(this.x, this.y - 1);
      const hgt = Math.max(0, sy - this.y);
      const sh = Math.max(0.25, 1 - hgt / 300);
      ctx.save();
      ctx.globalAlpha = 0.28 * sh * (this.invisible > 0 ? 0.3 : 1);
      SK.gfx.ellipse(ctx, this.x, sy, 26 * s * sh, 6 * s * sh, 0, '#000');
      ctx.restore();

      let alpha = this.alpha;
      if (this.move && this.move.data.alpha != null) alpha *= SK.clamp(this.move.data.alpha, 0, 1);
      if (this.invisible > 0) {
        const human = this.player != null;
        alpha *= human ? 0.22 : 0.04 + (this.flash ? 0.6 : 0);
        if (this.invisible < 40 && this.invisible % 6 < 3) alpha = Math.max(alpha, 0.5);
      }
      const jitter = (m.hitstop > 0 && this.flash > 0 ? SK.rand(-2, 2) : 0) + (this.jitter ? SK.rand(-this.jitter, this.jitter) : 0);
      ctx.save();
      ctx.translate(this.x + jitter, this.y);
      if (this.drawRot) { ctx.translate(0, -40 * s); ctx.rotate(this.drawRot); ctx.translate(0, 40 * s); }
      ctx.scale(this.facing * s * this.squash[0], s * this.squash[1]);
      SK.rig.draw(ctx, this.pose, this.skin, { t: this.t, flash: this.flash > 2, alpha, skeleton: this.skeleton });
      if (this.frozen > 0) {
        ctx.globalAlpha = 0.5;
        SK.gfx.roundRect(ctx, -32, -112, 64, 114, 8);
        ctx.fillStyle = '#a8dcff'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#e8f8ff'; ctx.stroke();
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-22, -100); ctx.lineTo(-10, -70); ctx.moveTo(14, -96); ctx.lineTo(20, -84); ctx.stroke();
      }
      ctx.restore();
      if (this.state === 'dizzy') {
        const hx = this.x + this.facing * 6 * s, hy = this.y - 108 * s;
        for (let i = 0; i < 3; i++) {
          const a = this.t * 0.12 + (i * Math.PI * 2) / 3;
          SK.gfx.star(ctx, hx + Math.cos(a) * 20 * s, hy + Math.sin(a) * 6 * s, 6, 2.6, 5, a, '#ffe040', '#7a5a00');
        }
      }
      if (m.debug) {
        const hb = this.hurtbox();
        ctx.strokeStyle = 'lime'; ctx.lineWidth = 1; ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
        if (this.move && this.lastHitbox) { const b = this.lastHitbox; ctx.strokeStyle = 'red'; ctx.strokeRect(b.x, b.y, b.w, b.h); }
      }
    }
  }

  function animAt(keys, frame) {
    if (!keys) return null;
    let acc = 0;
    for (let i = 0; i < keys.length; i++) {
      acc += keys[i][0];
      if (frame < acc) return keys[i][1];
    }
    return keys[keys.length - 1][1];
  }

  SK.Fighter = Fighter;
  SK.GRAV = GRAV;
})(typeof window !== 'undefined' ? window : globalThis);
