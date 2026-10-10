/* CPU opponents. The AI emits the same button states a human would. */
(function (root) {
  'use strict';
  const SK = root.SK;

  const LEVELS = [
    { react: 26, block: 0.12, aggr: 0.42, special: 0.10, combo: 0.15, antiAir: 0.1, nutality: 0.0, jump: 0.14, throw: 0.08, dodge: 0.25 },
    { react: 15, block: 0.36, aggr: 0.58, special: 0.2, combo: 0.45, antiAir: 0.35, nutality: 0.35, jump: 0.18, throw: 0.25, dodge: 0.5 },
    { react: 8, block: 0.66, aggr: 0.72, special: 0.28, combo: 0.75, antiAir: 0.65, nutality: 0.9, jump: 0.2, throw: 0.45, dodge: 0.8 },
    { react: 7, block: 0.55, aggr: 0.8, special: 0.34, combo: 0.7, antiAir: 0.6, nutality: 1.0, jump: 0.12, throw: 0.5, dodge: 0.75 },
  ];

  const SEQ = {
    s0: [['B', 2], ['', 1], ['F', 2], ['F+p', 2]],
    s1: [['D', 2], ['', 1], ['F', 2], ['F+p', 2]],
    s2: [['F', 2], ['', 2], ['F', 2], ['F+k', 2]],
    s3: [['D', 2], ['', 1], ['B', 2], ['B+k', 2]],
    nut: [['F', 2], ['', 1], ['B', 2], ['', 1], ['F', 2], ['F+k', 3]],
  };
  const press = (k, gap) => [[k, 2], ['', gap || 6]];

  class AI {
    constructor(f, level) {
      this.f = f;
      this.level = level;
      this.L = LEVELS[SK.clamp(level, 0, LEVELS.length - 1)];
      this.out = {};
      this.queue = [];
      this.think = SK.randi(5, 20);
      this.moveDir = 0;
      this.holdBlock = 0;
      this.holdCrouch = 0;
      this.seenThreats = new WeakSet();
      this.plan = 'approach';
      this.planT = 0;
      this.dummy = null;
    }

    blank() { return { u: false, d: false, l: false, r: false, p: false, k: false, b: false }; }

    apply(out, keys) {
      const f = this.f;
      keys.split('+').forEach((k) => {
        if (!k) return;
        if (k === 'F') out[f.facing > 0 ? 'r' : 'l'] = true;
        else if (k === 'B') out[f.facing > 0 ? 'l' : 'r'] = true;
        else if (k === 'D') out.d = true;
        else if (k === 'U') out.u = true;
        else out[k] = true;
      });
    }

    push(seq) { seq.forEach(([k, n]) => this.queue.push({ k, n })); }

    update() {
      const f = this.f;
      const out = (this.out = this.blank());
      if (this.dummy && this.dummy !== 'cpu') return this.dummyUpdate(out);
      if (!f.controlEnabled) return out;
      const m = f.match;

      if (this.queue.length) {
        const step = this.queue[0];
        this.apply(out, step.k);
        if (--step.n <= 0) this.queue.shift();
        return out;
      }

      // Finish 'em!
      if (m.finishing) {
        if (m.finishing.winnerTeam === f.team) return this.finish(out);
        return out;
      }

      const tg = f.target;
      if (!tg) return out;

      // Hold defensive inputs
      if (this.holdBlock > 0) {
        this.holdBlock--;
        out.b = true;
        if (this.holdCrouch > 0) { this.holdCrouch--; out.d = true; }
        return out;
      }

      if (this.react(out)) return out;

      if (--this.think <= 0) {
        this.decide();
        this.think = Math.max(3, Math.round(this.L.react * SK.rand(0.6, 1.4)));
      }
      this.navigate(out);
      return out;
    }

    // React to incoming attacks/projectiles. Returns true if it set inputs.
    react(out) {
      const f = this.f, m = f.match, L = this.L;
      if (!f.onGround || !f.isNeutral()) return false;
      // projectiles & hazards
      for (const p of m.projectiles) {
        if (p.dead || p.owner === f || (p.team === f.team && p.team >= 0)) continue;
        if (this.seenThreats.has(p)) continue;
        const dx = p.x - f.x;
        const approaching = (p.vx === 0 && Math.abs(dx) < 60) || SK.sign(p.vx) === -SK.sign(dx);
        const ground = p.ground || p.kind === 'shock' || p.kind === 'iceSpike';
        const verticalHit = p.y > f.y - 110 * f.scale && p.y < f.y + 10;
        const falling = p.vy > 0 && Math.abs(dx) < 50 && p.y < f.y;
        if ((approaching && Math.abs(dx) < (p.hazard ? 330 : 240) && verticalHit) || falling) {
          this.seenThreats.add(p);
          if (!SK.chance(L.dodge)) continue;
          if (falling) { this.moveDir = SK.sign(f.x - p.x) || 1; this.queue.push({ k: f.x > p.x ? (f.facing > 0 ? 'F' : 'B') : (f.facing > 0 ? 'B' : 'F'), n: 18 }); return true; }
          if (p.hit.unblockable || ground || p.hazard || SK.chance(0.35)) { this.push([['U', 3], ['', 4]]); return true; }
          this.holdBlock = 22; this.holdCrouch = p.hit.low ? 22 : 0;
          out.b = true;
          return true;
        }
      }
      // melee threats
      for (const e of m.enemiesOf(f)) {
        if (!e.move || this.seenThreats.has(e.move)) continue;
        const d = e.move.def;
        if (!d.hitbox && !d.isGrab) continue;
        const dx = Math.abs(e.x - f.x), dy = Math.abs(e.y - f.y);
        if (dx > 140 * e.scale || dy > 90) continue;
        this.seenThreats.add(e.move);
        if (d.isGrab) { if (SK.chance(L.block * 0.6)) { this.push([['U', 3], ['', 3]]); return true; } continue; }
        if (SK.chance(L.block)) {
          this.holdBlock = (d.startup + d.active + 6) - e.move.frame;
          this.holdCrouch = d.hit && d.hit.low ? this.holdBlock : 0;
          out.b = true;
          if (this.holdCrouch) out.d = true;
          return true;
        }
      }
      // anti-air
      const tg = f.target;
      if (tg && !tg.onGround && tg.state === 'air' && tg.vy > 0 && Math.abs(tg.x - f.x) < 90 && tg.y < f.y - 30 && tg.y > f.y - 200) {
        if (!this.aaSeen || this.aaSeen !== tg.stateT) {
          this.aaSeen = tg.stateT;
          if (SK.chance(L.antiAir * 0.25)) {
            if (SK.chance(0.4)) this.push(SEQ.s1); else this.push([['D', 3], ['D+p', 3], ['', 4]]);
            return true;
          }
        }
      }
      return false;
    }

    decide() {
      const f = this.f, L = this.L, tg = f.target;
      const dx = tg.x - f.x, dy = tg.y - f.y, adx = Math.abs(dx);
      const reach = 64 * f.scale + 14 * tg.scale;
      const lowHp = f.hp < f.maxHp * 0.3;
      this.planT = 0;

      // vertically separated: navigate
      if (Math.abs(dy) > 60 && adx < 500) { this.plan = 'climb'; return; }

      if (adx < reach && Math.abs(dy) < 40) {
        if (SK.chance(L.aggr)) this.attackClose(tg);
        else if (SK.chance(0.5)) { this.plan = 'block'; this.holdBlock = SK.randi(10, 26); }
        else { this.plan = 'retreat'; this.moveDir = -SK.sign(dx); }
        return;
      }
      // mid/long range
      if (adx > 180 && SK.chance(L.special)) {
        const specials = f.char.specials;
        const zoners = [];
        specials.forEach((s, i) => {
          if (['projectile', 'spear', 'beam', 'multiProj', 'summon'].includes(s.type)) zoners.push(i);
        });
        const gap = specials.map((s, i) => (['dash', 'glide', 'teleport', 'groundPound'].includes(s.type) ? i : -1)).filter((i) => i >= 0);
        const pool = adx > 300 ? zoners.concat(zoners, gap) : gap.concat(zoners);
        if (pool.length && Math.abs(dy) < 50) {
          const i = SK.pick(pool);
          this.push(SEQ['s' + i]);
          return;
        }
      }
      if (lowHp && SK.chance(0.25)) { this.plan = 'retreat'; this.moveDir = -SK.sign(dx); return; }
      if (adx < 280 && adx > 90 && SK.chance(L.jump)) {
        this.push([['F+U', 3], ['F', 14]]);
        this.plan = 'jumpin';
        return;
      }
      if (SK.chance(0.08)) {
        // occasional use of buff/utility specials
        const util = f.char.specials.map((s, i) => (['invisible', 'counter', 'trap', 'spin'].includes(s.type) ? i : -1)).filter((i) => i >= 0);
        if (util.length) { this.push(SEQ['s' + SK.pick(util)]); return; }
      }
      this.plan = 'approach';
    }

    attackClose(tg) {
      const L = this.L;
      const opts = [];
      const comboOk = SK.chance(L.combo);
      if (tg.state === 'block' && SK.chance(L.throw)) { this.push([['F', 2], ['F+p', 2], ['', 4]]); return; }
      if (tg.state === 'block' && tg.crouchBlock === false && SK.chance(0.4)) { this.push([['D', 3], ['D+k', 3], ['', 6]]); return; }
      if (comboOk) {
        const c = SK.randi(0, 3);
        const seqs = [['p', 'p', 'p'], ['p', 'p', 'k'], ['k', 'k', 'k'], ['k', 'k', 'p']][c];
        seqs.forEach((b) => opts.push(...press(b, 6)));
        // occasional special cancel
        if (SK.chance(L.special)) {
          const i = SK.randi(0, 3);
          opts.push(...SEQ['s' + i]);
        }
        this.push(opts);
        return;
      }
      const r = SK.random();
      if (r < 0.3) this.push(press('p', 8));
      else if (r < 0.55) this.push(press('k', 10));
      else if (r < 0.7) this.push([['D', 3], ['D+k', 3], ['', 8]]);
      else if (r < 0.85) this.push([['D', 3], ['D+p', 3], ['', 10]]);
      else this.push([['p', 2], ['', 5], ['p', 2], ['', 8]]);
      this.plan = 'attack';
    }

    finish(out) {
      const f = this.f, m = f.match, v = m.finishing.loser;
      const dx = v.x - f.x;
      if (Math.abs(dx) > 70 * Math.max(1, f.scale)) { out[dx > 0 ? 'r' : 'l'] = true; return out; }
      if (this.finishPlanned == null) this.finishPlanned = SK.chance(this.L.nutality);
      if (this.finishPlanned) { this.push(SEQ.nut); this.finishPlanned = false; return out; }
      if (m.finishing.t > 60) { this.push(press('p', 6)); }
      return out;
    }

    // Movement planning, including climbing between platforms.
    navigate(out) {
      const f = this.f, tg = f.target, m = f.match, st = m.stage;
      this.planT++;
      const fwd = f.facing > 0 ? 'r' : 'l';
      const dx = tg.x - f.x, dy = tg.y - f.y;
      if (this.plan === 'block') { out.b = true; return; }
      if (this.plan === 'retreat') {
        if (this.planT > 30) this.plan = 'approach';
        out[this.moveDir > 0 ? 'r' : 'l'] = true;
        if (f.x < st.left + 80 || f.x > st.right - 80) { this.plan = 'approach'; if (SK.chance(0.5)) out.u = true; }
        return;
      }
      if (!f.onGround) {
        // steer in the air
        const goal = this.airGoal != null ? this.airGoal : tg.x;
        if (Math.abs(goal - f.x) > 10) out[goal > f.x ? 'r' : 'l'] = true;
        if (this.wantDouble && f.vy > -3 && f.airJumps > 0) { out.u = !f.pin.u; this.wantDouble = false; }
        if (Math.abs(dx) < 70 && Math.abs(dy) < 70 && SK.chance(0.15)) out[SK.chance(0.5) ? 'k' : 'p'] = true;
        return;
      }
      this.airGoal = null;
      this.wantDouble = false;
      if (this.plan === 'climb' || Math.abs(dy) > 60) {
        if (dy < -60) return this.climb(out, tg);
        if (dy > 60) {
          // go down: drop through or walk off
          if (f.platform && f.platform.oneway && Math.abs(dx) < 260) {
            if (!this.dropTap) { out.d = true; this.dropTap = 1; return; }
            if (this.dropTap === 1) { this.dropTap = 2; return; }
            out.d = true; this.dropTap = 0; return;
          }
          out[dx > 0 ? 'r' : 'l'] = true;
          return;
        }
      }
      // approach
      const reach = 54 * f.scale + 14 * tg.scale;
      if (Math.abs(dx) > reach) out[dx > 0 ? 'r' : 'l'] = true;
      else if (SK.chance(0.02)) out[fwd] = true;
    }

    climb(out, tg) {
      const f = this.f, st = f.match.stage;
      const jh = (f.st.jump * f.st.jump) / (2 * SK.GRAV);
      const dj = f.st.airJumps > 0 ? ((f.st.jump * 0.82) ** 2) / (2 * SK.GRAV) : 0;
      const reach = (jh + dj) * 0.85;
      let best = null, bestScore = Infinity;
      for (const p of st.platforms) {
        if (p.y >= f.y - 20 || p.y < f.y - reach) continue;
        if (p === f.platform) continue;
        const cx = p.x + p.w / 2;
        const score = Math.abs(cx - tg.x) * 0.7 + Math.abs(cx - f.x) * 0.5 + Math.abs(p.y - tg.y) * 0.6;
        if (score < bestScore) { bestScore = score; best = p; }
      }
      if (!best) {
        const el = st.platforms.find((p) => p.elevator);
        if (el) {
          if (f.platform === el) return; // ride it
          const cx = el.x + el.w / 2;
          if (Math.abs(cx - f.x) > 40) out[cx > f.x ? 'r' : 'l'] = true;
          else if (el.y < f.y - 20 && el.y > f.y - reach) { out.u = true; this.airGoal = cx; }
          return;
        }
        out[tg.x > f.x ? 'r' : 'l'] = true;
        return;
      }
      const edgeX = SK.clamp(f.x, best.x - 30, best.x + best.w + 30);
      const goalX = SK.clamp(tg.x, best.x + 30, best.x + best.w - 30);
      if (Math.abs(edgeX - f.x) > 30) { out[edgeX > f.x ? 'r' : 'l'] = true; return; }
      out.u = true;
      this.airGoal = goalX;
      this.wantDouble = best.y < f.y - jh * 0.8;
    }

    dummyUpdate(out) {
      const f = this.f;
      switch (this.dummy) {
        case 'crouch': out.d = true; break;
        case 'block': out.b = true; break;
        case 'crouchblock': out.b = true; out.d = true; break;
        case 'jump': if (f.onGround && f.state === 'idle') out.u = true; break;
        default: break;
      }
      return out;
    }
  }

  AI.LEVELS = LEVELS;
  SK.AI = AI;
})(typeof window !== 'undefined' ? window : globalThis);
