/* Particles, floating text and projectiles. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const TAU = Math.PI * 2;
  const R = (a, b) => SK.rand(a, b);

  // ---------------------------------------------------------------------------
  // Particle system
  // ---------------------------------------------------------------------------
  class FX {
    constructor() { this.list = []; this.front = []; }
    add(p, front) {
      const q = Object.assign({ vx: 0, vy: 0, life: 30, grav: 0, drag: 1, size: 4, rot: 0, vr: 0, alpha: 1 }, p);
      q.max = q.life;
      (front ? this.front : this.list).push(q);
      if (this.list.length > 900) this.list.splice(0, 100);
      return q;
    }
    update() {
      const step = (arr) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          const p = arr[i];
          p.vy += p.grav;
          p.vx *= p.drag; p.vy *= p.drag;
          p.x += p.vx; p.y += p.vy;
          p.rot += p.vr;
          if (p.floor != null && p.y > p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; if (p.type === 'blood') p.stuck = true; }
          if (--p.life <= 0) arr.splice(i, 1);
        }
      };
      step(this.list); step(this.front);
    }
    draw(ctx, front) {
      const arr = front ? this.front : this.list;
      for (let i = 0; i < arr.length; i++) drawParticle(ctx, arr[i]);
    }

    // --- emitters --------------------------------------------------------------
    hitSpark(x, y, big, color) {
      this.add({ type: 'flash', x, y, life: 6, size: big ? 46 : 30, color: color || '#fff6b0' }, true);
      const n = big ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const a = R(0, TAU), s = R(3, big ? 10 : 7);
        this.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: R(8, 16), size: R(2, 4), color: color || '#ffe070', drag: 0.85 }, true);
      }
    }
    blockSpark(x, y) {
      this.add({ type: 'flash', x, y, life: 6, size: 26, color: '#a0d8ff' }, true);
      for (let i = 0; i < 5; i++) {
        const a = R(0, TAU), s = R(2, 6);
        this.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 10, size: 2.5, color: '#cfefff', drag: 0.85 }, true);
      }
    }
    fur(x, y, color, n, floor) {
      for (let i = 0; i < (n || 5); i++) {
        this.add({ type: 'fur', x, y, vx: R(-4, 4), vy: R(-6, -1), life: R(40, 70), size: R(4, 7), color, grav: 0.12, drag: 0.96, rot: R(0, TAU), vr: R(-0.2, 0.2), floor });
      }
    }
    blood(x, y, dir, n, floor) {
      if (!SK.settings.blood) return;
      for (let i = 0; i < (n || 6); i++) {
        this.add({ type: 'blood', x, y, vx: dir * R(1, 6) + R(-1.5, 1.5), vy: R(-7, -1), life: R(40, 90), size: R(2, 4.5), color: i % 3 ? '#c8101a' : '#8a0610', grav: 0.4, floor });
      }
    }
    dust(x, y, n, color) {
      for (let i = 0; i < (n || 6); i++) {
        this.add({ type: 'puff', x: x + R(-10, 10), y: y - R(0, 6), vx: R(-2, 2), vy: R(-1.2, -0.2), life: R(18, 30), size: R(6, 12), color: color || 'rgba(220,200,170,0.8)', drag: 0.94 });
      }
    }
    smoke(x, y, n, color) {
      for (let i = 0; i < (n || 4); i++) {
        this.add({ type: 'puff', x: x + R(-8, 8), y: y + R(-8, 8), vx: R(-1, 1), vy: R(-2, -0.5), life: R(30, 50), size: R(8, 16), color: color || 'rgba(70,70,70,0.6)', drag: 0.97 });
      }
    }
    explosion(x, y, scale) {
      const s = scale || 1;
      this.add({ type: 'flash', x, y, life: 10, size: 90 * s, color: '#fff2a0' }, true);
      this.add({ type: 'ring', x, y, life: 18, size: 80 * s, color: '#ffd060' }, true);
      for (let i = 0; i < 16 * s; i++) {
        const a = R(0, TAU), v = R(2, 9) * s;
        this.add({ type: 'fire', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: R(20, 40), size: R(8, 16) * s, drag: 0.9 });
      }
      this.smoke(x, y, 8 * s);
    }
    fire(x, y, n) {
      for (let i = 0; i < (n || 2); i++) {
        this.add({ type: 'fire', x: x + R(-6, 6), y: y + R(-6, 6), vx: R(-0.8, 0.8), vy: R(-2.5, -0.8), life: R(14, 26), size: R(5, 10), drag: 0.96 });
      }
    }
    ice(x, y, n) {
      for (let i = 0; i < (n || 8); i++) {
        this.add({ type: 'shard', x, y, vx: R(-6, 6), vy: R(-9, -1), life: R(40, 70), size: R(4, 9), color: i % 2 ? '#bfe9ff' : '#ffffff', grav: 0.4, rot: R(0, TAU), vr: R(-0.3, 0.3) });
      }
    }
    zap(x, y, n) {
      for (let i = 0; i < (n || 2); i++) {
        this.add({ type: 'bolt', x: x + R(-14, 14), y: y + R(-30, 10), life: R(4, 8), size: R(14, 28), rot: R(0, TAU), color: '#bfefff' }, true);
      }
    }
    text(x, y, str, color, size) {
      this.add({ type: 'text', x, y, vy: -1.2, life: 50, size: size || 22, str, color: color || '#fff', drag: 0.97 }, true);
    }
    acorns(x, y, n) {
      for (let i = 0; i < n; i++) {
        this.add({ type: 'acorn', x, y, vx: R(-6, 6), vy: R(-11, -3), life: R(60, 100), size: R(8, 12), grav: 0.45, rot: R(0, TAU), vr: R(-0.3, 0.3), floor: y + 40 });
      }
    }
  }

  function drawParticle(ctx, p) {
    const t = p.life / p.max;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2) * p.alpha;
    switch (p.type) {
      case 'flash':
        ctx.globalAlpha = t;
        SK.gfx.star(ctx, p.x, p.y, p.size * (1.2 - t * 0.4), p.size * 0.35, 8, p.rot, p.color);
        SK.gfx.circle(ctx, p.x, p.y, p.size * 0.35, '#fff');
        break;
      case 'spark':
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); ctx.stroke();
        break;
      case 'fur':
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.strokeStyle = p.color; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.quadraticCurveTo(0, -p.size * 0.6, p.size, 0); ctx.stroke();
        break;
      case 'blood':
        ctx.fillStyle = p.color;
        if (p.stuck) { SK.gfx.ellipse(ctx, p.x, p.y, p.size * 1.6, p.size * 0.5, 0, p.color); } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        }
        break;
      case 'puff':
        ctx.globalAlpha = t * 0.8;
        SK.gfx.circle(ctx, p.x, p.y, p.size * (1.6 - t * 0.6), p.color);
        break;
      case 'ring':
        ctx.globalAlpha = t;
        ctx.strokeStyle = p.color; ctx.lineWidth = 6 * t;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - t) + 6, 0, TAU); ctx.stroke();
        break;
      case 'fire': {
        const k = t;
        const c = k > 0.7 ? '#fff4a0' : k > 0.45 ? '#ffb020' : k > 0.25 ? '#f05010' : '#602010';
        ctx.globalAlpha = Math.min(1, k * 1.6);
        SK.gfx.circle(ctx, p.x, p.y, p.size * (0.4 + k * 0.6), c);
        break;
      }
      case 'frost':
        ctx.globalAlpha = t * 0.85;
        SK.gfx.circle(ctx, p.x, p.y, p.size * (1.4 - t * 0.5), t > 0.5 ? '#ffffff' : '#9fdcff');
        break;
      case 'shard':
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.strokeStyle = '#5aa8d8'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.5, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size * 0.5, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 'bolt':
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.strokeStyle = p.color; ctx.lineWidth = 2.5; ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let i = 1; i <= 4; i++) ctx.lineTo((i * p.size) / 4, R(-5, 5));
        ctx.stroke();
        break;
      case 'text':
        SK.gfx.text(ctx, p.str, p.x, p.y, { size: p.size, align: 'center', color: p.color, stroke: '#000', strokeW: 4, font: SK.gfx.TITLE_FONT });
        break;
      case 'acorn':
        SK.gfx.acorn(ctx, p.x, p.y, p.size, p.rot);
        break;
      case 'feather':
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        SK.gfx.ellipse(ctx, 0, 0, p.size, p.size * 0.35, 0, p.color || '#6b4a2a');
        break;
      case 'pixel':
        ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
        break;
      case 'beam': {
        ctx.globalAlpha = t;
        ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = 10 * t + 2; ctx.lineCap = 'round';
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * t + 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
        break;
      }
      case 'snow':
        SK.gfx.circle(ctx, p.x, p.y, p.size, '#fff');
        break;
      case 'confetti':
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        break;
      case 'ghost':
        // afterimage of a fighter
        ctx.globalAlpha = t * 0.35;
        ctx.translate(p.x, p.y);
        ctx.scale(p.facing * p.scale, p.scale);
        SK.rig.draw(ctx, p.pose, p.skin, { t: 0 });
        break;
      default:
        SK.gfx.circle(ctx, p.x, p.y, p.size, p.color || '#fff');
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Projectiles
  // ---------------------------------------------------------------------------
  const PROJ_SIZE = {
    fireAcorn: [24, 24], ice: [24, 24], spear: [20, 12], bolt: [34, 28], missile: [36, 20], fan: [30, 30],
    gust: [40, 56], acid: [20, 20], pellet: [14, 14], knife: [30, 10], package: [34, 30], dog: [56, 34],
    bomb: [22, 22], shock: [40, 30], iceSpike: [40, 44], explosion: [130, 130], birds: [180, 120], deathAcorn: [26, 30],
    icicle: [18, 40], firework: [20, 20], egg: [16, 20],
  };

  class Projectile {
    constructor(match, o) {
      Object.assign(this, {
        owner: null, team: -1, kind: 'pellet', x: 0, y: 0, vx: 0, vy: 0, gravity: 0, life: 240, t: 0,
        dead: false, dir: 1, hits: new Set(), pierce: false, ground: false, solid: true,
      }, o);
      const sz = PROJ_SIZE[this.kind] || [20, 20];
      this.w = o.w || sz[0];
      this.h = o.h || sz[1];
      this.match = match;
      this.hit = Object.assign({ dmg: 50, stun: 18, bstun: 14, kb: [5, -2], special: true }, o.hit || {});
      if (this.kind === 'spear') { this.startX = this.x; this.retract = false; }
    }

    box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

    update() {
      const m = this.match;
      this.t++;
      if (--this.life <= 0) { this.die(); return; }
      if (this.kind === 'spear') return this.updateSpear();
      if (this.kind === 'fan' && this.wobble) this.vy = Math.sin(this.t * 0.25) * 2.2;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      // trails
      const fx = m.fx;
      switch (this.kind) {
        case 'fireAcorn': fx.fire(this.x - this.vx, this.y, 2); break;
        case 'ice': if (this.t % 2 === 0) fx.add({ type: 'frost', x: this.x, y: this.y + R(-6, 6), vx: -this.vx * 0.1, vy: R(-0.5, 0.5), life: 18, size: R(3, 7) }); break;
        case 'bolt': if (this.t % 2 === 0) fx.zap(this.x, this.y + 10, 1); break;
        case 'missile': fx.smoke(this.x - this.dir * 18, this.y, 1, 'rgba(200,200,200,0.5)'); fx.fire(this.x - this.dir * 18, this.y, 1); break;
        case 'acid': if (this.t % 3 === 0) fx.add({ type: 'dot', x: this.x, y: this.y, vy: 1, life: 20, size: 2.5, color: '#7cff3a', grav: 0.2 }); break;
        case 'gust': if (this.t % 2 === 0) fx.add({ type: 'puff', x: this.x + R(-12, 12), y: this.y + R(-20, 20), vx: this.vx * 0.2, vy: -1, life: 16, size: 6, color: 'rgba(230,240,255,0.5)' }); break;
        case 'dog': if (this.t % 6 === 0) fx.dust(this.x - this.dir * 20, this.y + 14, 1); if (this.t % 30 === 1) SK.audio.sfx('bark'); break;
        case 'bomb': if (this.t % 3 === 0) fx.add({ type: 'spark', x: this.x + 4, y: this.y - 14, vx: R(-2, 2), vy: R(-3, -1), life: 8, size: 2, color: '#ffd040' }, true); break;
        case 'shock': case 'iceSpike': if (this.t % 3 === 0) fx.dust(this.x, this.y + this.h / 2, 1); break;
        case 'deathAcorn': break;
        default: break;
      }
      // ground interaction
      const st = m.stage;
      const floorY = st.surfaceBelow(this.x, this.y - this.vy - 2);
      if (this.ground) {
        this.y = floorY - this.h / 2;
        this.vy = 0;
        // fall off platforms for ground-runners
      } else if (this.gravity > 0 && this.y + this.h / 2 >= floorY) {
        this.y = floorY - this.h / 2;
        if (this.kind === 'bomb') { this.vx *= 0.5; this.vy = this.vy > 3 ? -this.vy * 0.35 : 0; }
        else if (this.kind === 'package' && !this.bounced) { this.bounced = true; this.vy = -5; this.vx *= 0.7; SK.audio.sfx('thud'); m.fx.dust(this.x, this.y + this.h / 2, 5); }
        else if (this.kind === 'deathAcorn' || this.kind === 'icicle' || this.kind === 'egg') { this.shatter(); return; }
        else if (this.kind === 'firework') { this.explode(); return; }
        else { this.die(true); return; }
      }
      if (this.kind === 'bomb') {
        this.fuse = (this.fuse == null ? 75 : this.fuse) - 1;
        const near = m.fighters.some((f) => f.team !== this.team && f.alive && Math.abs(f.x - this.x) < 34 && Math.abs(f.y - 30 - this.y) < 50);
        if (this.fuse <= 0 || (near && this.t > 20)) { this.explode(); return; }
        return; // bombs only hurt via explosion
      }
      if (this.kind === 'explosion') { if (this.t > 8) this.dead = true; }
      // bounds
      if (this.x < st.left - 200 || this.x > st.right + 200 || this.y > st.height + 200 || this.y < -600) { this.dead = true; return; }
      if (!this.passWalls && (this.x < st.left || this.x > st.right) && this.kind !== 'birds') { this.die(true); return; }
      this.collide();
    }

    updateSpear() {
      const o = this.owner;
      if (!o || !o.alive || o.state === 'hitstun' || o.state === 'launched' || o.frozen > 0) { this.dead = true; return; }
      this.y = o.y - 66 * o.scale;
      if (!this.retract) {
        this.x += this.vx;
        if (Math.abs(this.x - this.startX) > 420 || this.x < this.match.stage.left || this.x > this.match.stage.right) this.retract = true;
        if (this.collide()) { this.dead = true; return; }
      } else {
        this.x -= this.vx * 1.6;
        if ((this.dir > 0 && this.x <= o.x + 20) || (this.dir < 0 && this.x >= o.x - 20)) this.dead = true;
      }
    }

    // Returns true if something was struck.
    collide() {
      const m = this.match;
      const b = this.box();
      // projectile vs projectile clash
      if (this.owner) {
        for (const q of m.projectiles) {
          if (q === this || q.dead || !q.owner || q.team === this.team || q.kind === 'bomb' || q.kind === 'explosion' || q.kind === 'shock' || q.kind === 'iceSpike') continue;
          if (SK.overlap(b, q.box())) {
            m.fx.hitSpark((this.x + q.x) / 2, (this.y + q.y) / 2, true);
            SK.audio.sfx('hit');
            if (this.kind !== 'spear') this.die(true); else this.retract = true;
            if (q.kind !== 'spear') q.die(true); else q.retract = true;
            return true;
          }
        }
      }
      for (const f of m.fighters) {
        if (!f.alive || f === this.owner) continue;
        if (this.team >= 0 && f.team === this.team) continue;
        if (this.hits.has(f)) continue;
        if (!SK.overlap(b, f.hurtbox())) continue;
        const hit = Object.assign({}, this.hit);
        hit.dirX = this.dir;
        if (this.kind === 'explosion' || this.kind === 'birds') hit.dirX = SK.sign(f.x - this.x) || 1;
        const res = f.takeHit(hit, this.owner, this.x, this);
        if (!res) continue;
        this.hits.add(f);
        if (res === 'reflected') return true;
        if (this.kind === 'spear' && res === 'hit') {
          f.pullTo(this.owner);
          this.retract = true;
          SK.audio.say('Get over here!', { pitch: 0.2, rate: 1.1 });
          m.bigText('GET OVER HERE!', 50, '#ffd020');
          return true;
        }
        if (this.kind === 'missile') { this.explode(); return true; }
        if (!this.pierce) { this.die(false, f); return true; }
      }
      return false;
    }

    explode() {
      const m = this.match;
      this.dead = true;
      m.fx.explosion(this.x, this.y, this.kind === 'firework' ? 0.8 : 1);
      SK.audio.sfx('explode');
      m.shake(10);
      m.addProjectile({
        owner: this.owner, team: this.team, kind: 'explosion', x: this.x, y: this.y, life: 10, pierce: true,
        hit: Object.assign({}, this.hit, { dmg: this.kind === 'firework' ? 70 : this.hit.dmg, knockdown: true, kb: [7, -10], heavy: true, unblockable: false }),
      });
    }

    shatter() {
      const m = this.match;
      this.dead = true;
      if (this.kind === 'icicle') { m.fx.ice(this.x, this.y, 8); SK.audio.sfx('shatter'); }
      else if (this.kind === 'egg') { m.fx.add({ type: 'puff', x: this.x, y: this.y, life: 30, size: 12, color: '#fff3a0' }); SK.audio.sfx('splat'); }
      else { m.fx.acorns(this.x, this.y - 10, 3); m.fx.dust(this.x, this.y + this.h / 2, 6); SK.audio.sfx('thud'); }
    }

    die(fizzle) {
      if (this.dead) return;
      this.dead = true;
      const fx = this.match.fx;
      switch (this.kind) {
        case 'fireAcorn': fx.explosion(this.x, this.y, 0.35); break;
        case 'ice': fx.ice(this.x, this.y, 6); SK.audio.sfx('shatter'); break;
        case 'bolt': fx.zap(this.x, this.y, 6); break;
        case 'acid': for (let i = 0; i < 8; i++) fx.add({ type: 'dot', x: this.x, y: this.y, vx: R(-3, 3), vy: R(-4, 0), life: 30, size: 3, color: '#7cff3a', grav: 0.3 }); break;
        case 'package': fx.add({ type: 'text', x: this.x, y: this.y - 20, str: 'FRAGILE!', color: '#ff6040', size: 18, life: 40, vy: -1 }, true); fx.dust(this.x, this.y, 6); break;
        case 'missile': fx.explosion(this.x, this.y, 0.7); break;
        case 'deathAcorn': case 'icicle': case 'egg': this.shatter(); this.dead = true; break;
        default: if (fizzle) fx.dust(this.x, this.y, 4, 'rgba(255,255,255,0.6)');
      }
    }

    draw(ctx) {
      const t = this.t;
      if (this.drawFn) { this.drawFn(ctx, this); return; }
      ctx.save();
      ctx.translate(this.x, this.y);
      const d = this.dir;
      switch (this.kind) {
        case 'fireAcorn':
          SK.gfx.circle(ctx, 0, 0, 16, 'rgba(255,140,20,0.45)');
          SK.gfx.acorn(ctx, 0, 0, 12, t * 0.4 * d);
          break;
        case 'pellet':
          SK.gfx.acorn(ctx, 0, 0, 8, t * 0.5 * d);
          break;
        case 'deathAcorn':
          SK.gfx.acorn(ctx, 0, 0, 16, Math.sin(t * 0.2) * 0.3, { nut: '#8a5a2a', cap: '#3a2410' });
          break;
        case 'ice':
          SK.gfx.circle(ctx, 0, 0, 15, 'rgba(160,220,255,0.4)');
          SK.gfx.star(ctx, 0, 0, 13, 6, 6, t * 0.1, '#e6f7ff', '#5ab0e8');
          SK.gfx.circle(ctx, 0, 0, 5, '#ffffff');
          break;
        case 'spear': {
          const o = this.owner;
          if (o) {
            const ox = o.x + o.facing * 16 * o.scale - this.x;
            ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(ox, 0);
            const segs = 10;
            for (let i = 1; i <= segs; i++) ctx.lineTo(ox * (1 - i / segs), Math.sin(i + t * 0.6) * 2);
            ctx.stroke();
            ctx.strokeStyle = '#c4955a'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(0, 0); ctx.stroke();
          }
          ctx.scale(d, 1);
          ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-4, -8); ctx.lineTo(0, 0); ctx.lineTo(-4, 8); ctx.closePath();
          ctx.fillStyle = '#d8dde2'; ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke();
          break;
        }
        case 'bolt':
          ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 18;
          SK.gfx.circle(ctx, 0, 0, 14 + Math.sin(t) * 2, 'rgba(190,240,255,0.8)');
          SK.gfx.circle(ctx, 0, 0, 7, '#fff');
          ctx.strokeStyle = '#e0f6ff'; ctx.lineWidth = 2;
          for (let k = 0; k < 3; k++) {
            ctx.beginPath(); ctx.moveTo(0, 0);
            let a = SK.random() * TAU;
            for (let i = 1; i < 4; i++) ctx.lineTo(Math.cos(a) * i * 7 + R(-3, 3), Math.sin(a) * i * 7 + R(-3, 3));
            ctx.stroke();
          }
          break;
        case 'missile':
          ctx.scale(d, 1);
          ctx.rotate(Math.PI / 2);
          SK.gfx.acorn(ctx, 0, 0, 18, 0, { nut: '#9a6a3a' });
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = '#c03020';
          ctx.beginPath(); ctx.moveTo(-16, -8); ctx.lineTo(-24, -14); ctx.lineTo(-20, 0); ctx.lineTo(-24, 14); ctx.lineTo(-16, 8); ctx.fill();
          break;
        case 'fan':
          ctx.rotate(t * 0.5 * d);
          for (let i = 0; i < 2; i++) {
            ctx.rotate(Math.PI);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 16, -0.7, 0.7); ctx.closePath();
            ctx.fillStyle = '#c070ff'; ctx.fill(); ctx.strokeStyle = '#2a0a40'; ctx.lineWidth = 2; ctx.stroke();
            ctx.strokeStyle = '#e8e8f0'; ctx.lineWidth = 1;
            for (let a = -0.6; a <= 0.6; a += 0.3) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.stroke(); }
          }
          break;
        case 'gust':
          ctx.strokeStyle = 'rgba(230,240,255,0.85)'; ctx.lineWidth = 3;
          for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            for (let a = 0; a < 10; a += 0.3) ctx.lineTo(Math.cos(a + t * 0.4 + k * 2) * (4 + a * 1.4), -26 + a * 5.2);
            ctx.stroke();
          }
          break;
        case 'acid':
          SK.gfx.circle(ctx, 0, 0, 9, '#58e020', '#1a5a08', 2);
          SK.gfx.circle(ctx, -3, -3, 3, '#c8ff90');
          break;
        case 'knife':
          ctx.scale(d, 1);
          ctx.fillStyle = '#e8eef4'; ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-2, -4); ctx.lineTo(-2, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#4a2a14'; ctx.fillRect(-14, -3, 12, 6); ctx.strokeRect(-14, -3, 12, 6);
          break;
        case 'package':
          ctx.rotate(t * 0.12 * d);
          ctx.fillStyle = '#b88a52'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2;
          ctx.fillRect(-16, -14, 32, 28); ctx.strokeRect(-16, -14, 32, 28);
          ctx.fillStyle = '#e0c890'; ctx.fillRect(-16, -3, 32, 6);
          ctx.fillStyle = '#c02020'; ctx.fillRect(2, -12, 10, 6);
          break;
        case 'dog': {
          ctx.scale(d, 1);
          const leg = Math.sin(t * 0.8) * 6;
          ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-14, 6); ctx.lineTo(-14 + leg, 16);
          ctx.moveTo(-8, 6); ctx.lineTo(-8 - leg, 16);
          ctx.moveTo(12, 6); ctx.lineTo(12 + leg, 16);
          ctx.moveTo(18, 6); ctx.lineTo(18 - leg, 16);
          ctx.stroke();
          SK.gfx.ellipse(ctx, 2, 0, 22, 10, 0, '#c8964e', '#3a2410', 2);
          ctx.beginPath(); ctx.moveTo(-20, -2); ctx.quadraticCurveTo(-30, -14 + leg, -26, -18); ctx.stroke();
          SK.gfx.ellipse(ctx, 24, -8, 10, 8, 0, '#c8964e', '#3a2410', 2);
          SK.gfx.ellipse(ctx, 32, -5, 6, 4, 0, '#c8964e', '#3a2410', 2);
          SK.gfx.circle(ctx, 37, -6, 2, '#111');
          SK.gfx.ellipse(ctx, 19, -14, 4, 7, -0.5, '#6a4420', '#3a2410', 1.5);
          SK.gfx.circle(ctx, 26, -10, 1.8, '#111');
          ctx.fillStyle = '#e04040'; ctx.fillRect(14, -4, 4, 8);
          break;
        }
        case 'bomb': {
          const flash = this.fuse != null && this.fuse < 30 && Math.floor(t / 3) % 2 === 0;
          SK.gfx.circle(ctx, 0, 0, 11, flash ? '#c02020' : '#222', '#000', 2);
          SK.gfx.circle(ctx, -4, -4, 3, 'rgba(255,255,255,0.4)');
          ctx.strokeStyle = '#a07040'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(2, -10); ctx.quadraticCurveTo(6, -16, 4, -18); ctx.stroke();
          break;
        }
        case 'shock':
          ctx.fillStyle = 'rgba(255,220,120,0.85)';
          ctx.beginPath();
          ctx.moveTo(-20, 15);
          for (let i = 0; i <= 8; i++) ctx.lineTo(-20 + i * 5, 15 - (i % 2 ? 26 : 8) * (0.7 + 0.3 * Math.sin(t + i)));
          ctx.lineTo(20, 15); ctx.closePath(); ctx.fill();
          break;
        case 'iceSpike':
          ctx.fillStyle = '#d8f2ff'; ctx.strokeStyle = '#4a98c8'; ctx.lineWidth = 2;
          for (let i = -1; i <= 1; i++) {
            const hh = (i === 0 ? 44 : 28) * Math.min(1, t / 6);
            ctx.beginPath(); ctx.moveTo(i * 12 - 8, 22); ctx.lineTo(i * 12, 22 - hh); ctx.lineTo(i * 12 + 8, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
          break;
        case 'icicle':
          ctx.fillStyle = '#e6f7ff'; ctx.strokeStyle = '#5ab0e8'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(9, -20); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
          break;
        case 'egg':
          SK.gfx.ellipse(ctx, 0, 0, 7, 9, 0, '#e8f0ff', '#556', 1.5);
          break;
        case 'firework':
          SK.gfx.circle(ctx, 0, 0, 6, '#ff4060');
          ctx.fillStyle = '#ffd040';
          for (let i = 0; i < 3; i++) ctx.fillRect(R(-6, 6), R(4, 14), 2, 2);
          break;
        case 'birds': {
          for (let i = 0; i < 14; i++) {
            const bx = ((i * 37) % 160) - 80, by = ((i * 53) % 100) - 50 + Math.sin(t * 0.3 + i) * 6;
            drawBird(ctx, bx, by, d, t + i * 7, 1);
          }
          break;
        }
        default:
          if (this.kind !== 'explosion') SK.gfx.circle(ctx, 0, 0, this.w / 2, '#fff');
      }
      ctx.restore();
    }
  }

  function drawBird(ctx, x, y, dir, t, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * (s || 1), s || 1);
    const flap = Math.sin(t * 0.6) * 9;
    ctx.fillStyle = '#6b4024'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(-10, -4 - flap); ctx.lineTo(4, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    SK.gfx.circle(ctx, 9, -4, 5, '#7a4a2a', '#2a1408', 1.5);
    ctx.fillStyle = '#f0b020';
    ctx.beginPath(); ctx.moveTo(13, -5); ctx.lineTo(19, -3); ctx.lineTo(13, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e04020';
    ctx.beginPath(); ctx.ellipse(6, 1, 4, 3, 0, 0, TAU); ctx.fill();
    SK.gfx.circle(ctx, 10, -5, 1.4, '#000');
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(7, -9); ctx.lineTo(12, -7); ctx.stroke();
    ctx.restore();
  }

  SK.FX = FX;
  SK.Projectile = Projectile;
  SK.drawBird = drawBird;
})(typeof window !== 'undefined' ? window : globalThis);
