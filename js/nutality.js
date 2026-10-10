/* Scripted finishing moves ("Nutalities"). One per kombatant. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const P = SK.rig.P;
  const R = (a, b) => SK.rand(a, b);

  class Nutality {
    constructor(match, winner, victim) {
      this.m = match;
      this.w = winner;
      this.v = victim;
      this.t = 0;
      this.done = false;
      this.type = winner.char.nutality.type;
      this.title = winner.char.nutality.name;
      this.props = {};
      [winner, victim].forEach((f) => {
        f.cancelMove();
        f.setState('script');
        f.vx = 0; f.vy = 0;
        f.invisible = 0;
        f.burn = 0; f.acid = 0;
      });
      winner.facing = SK.sign(victim.x - winner.x) || winner.facing;
      victim.facing = -winner.facing;
      winner.scriptPose = SK.rig.pose(P.stance);
      victim.scriptPose = SK.rig.pose(P.dizzy);
      if (!this[this.type]) this.type = 'overcharge';
    }

    update() {
      this.t++;
      const v = this.v;
      if (v.scriptPose && !v.hidden && this.t % 2 === 0 && v.scriptPose.expr === 'dizzy') {
        v.scriptPose = SK.rig.pose(P.dizzy);
        v.scriptPose.lean += Math.sin(this.t * 0.1) * 0.2;
      }
      this[this.type]();
      if (this.t > (this.length || 175)) this.done = true;
    }

    pose(f, name, over) {
      f.scriptPose = SK.rig.pose(Object.assign({}, P[name], over || {}));
    }

    // victim position helpers
    vx() { return this.v.x; }
    vy() { return this.v.y - 50 * this.v.scale; }

    // --- Nutso: a giant acorn falls from the heavens --------------------------------
    squash() {
      const t = this.t, w = this.w, v = this.v, m = this.m;
      if (t === 1) { this.pose(w, 'cast', { pF: [10, -34], pB: [-6, 6] }); SK.audio.sfx('whistle'); }
      if (t >= 30 && t < 70) {
        const k = (t - 30) / 40;
        this.props.acornY = v.y - 700 + 700 * k * k - 60;
        if (t === 30) SK.audio.sfx('whoosh');
      }
      if (t === 70) {
        this.props.acornY = v.y - 40 * v.scale;
        v.squash = [1.9, 0.12];
        v.scriptPose = SK.rig.pose(P.down);
        m.shake(18);
        SK.audio.sfx('splat'); SK.audio.sfx('thud');
        m.fx.blood(v.x, v.y - 10, 1, 30, v.y); m.fx.blood(v.x, v.y - 10, -1, 30, v.y);
        m.fx.fur(v.x, v.y - 10, v.skin.fur, 14, v.y);
        m.fx.dust(v.x, v.y, 16);
      }
      if (t === 90) this.pose(w, 'victory');
    }

    // --- Frostbite: freeze solid, then shatter --------------------------------------
    shatter() {
      const t = this.t, w = this.w, v = this.v, m = this.m;
      if (t === 1) this.pose(w, 'breath');
      if (t > 1 && t < 30) {
        for (let i = 0; i < 3; i++) m.fx.add({ type: 'frost', x: w.x + w.facing * 26 * w.scale, y: w.y - 72 * w.scale, vx: w.facing * R(5, 10), vy: R(-1.5, 1.5), life: 20, size: R(6, 12) });
      }
      if (t === 30) { v.frozen = 9999; v.frozenPose = SK.rig.pose(v.scriptPose); v.frozenPose.expr = 'shock'; v.scriptPose = v.frozenPose; SK.audio.sfx('freeze'); this.pose(w, 'stance'); }
      if (t === 50) this.pose(w, 'upperWind');
      if (t > 50 && t < 64) w.x += (v.x - w.facing * 40 * w.scale - w.x) * 0.25;
      if (t === 64) {
        this.pose(w, 'uppercut');
        v.hidden = true; v.frozen = 0;
        m.shake(16);
        SK.audio.sfx('shatter'); SK.audio.sfx('hitHeavy');
        for (let i = 0; i < 4; i++) m.fx.ice(v.x, v.y - 50 * v.scale, 12);
        m.fx.fur(v.x, v.y - 50, v.skin.fur, 10, v.y);
        m.fx.acorns(v.x, v.y - 60, 4);
      }
      if (t === 110) this.pose(w, 'victory');
    }

    // --- Scurrion: hellfire. TOASTY! ----------------------------------------------
    toasty() {
      const t = this.t, w = this.w, v = this.v, m = this.m;
      if (t === 1) { this.pose(w, 'breath'); SK.audio.sfx('fire'); }
      if (t > 1 && t < 100) {
        const n = t < 30 ? 2 : 5;
        for (let i = 0; i < n; i++) m.fx.fire(v.x + R(-24, 24) * v.scale, v.y - R(0, 90) * v.scale, 1);
        if (t < 40) m.fx.add({ type: 'fire', x: w.x + w.facing * 26 * w.scale, y: w.y - 72 * w.scale, vx: w.facing * R(6, 10), vy: R(-1, 1), life: 18, size: R(8, 14) });
        if (t % 12 === 0) SK.audio.sfx('fire');
      }
      if (t === 40) this.pose(w, 'taunt');
      if (t === 60) { v.skeleton = true; v.scriptPose = SK.rig.pose(P.dizzy); }
      if (t === 98) {
        v.hidden = true;
        SK.audio.sfx('crack');
        for (let i = 0; i < 18; i++) m.fx.add({ type: 'shard', x: v.x + R(-20, 20), y: v.y - R(10, 80), vx: R(-3, 3), vy: R(-4, 0), life: 120, size: R(4, 8), color: '#f4efe0', grav: 0.4, rot: R(0, 6), vr: R(-0.2, 0.2), floor: v.y });
        m.fx.smoke(v.x, v.y - 30, 10, 'rgba(40,40,40,0.6)');
      }
      if (t === 60) { this.props.toastyT = 0; SK.audio.say('Toasty!', { pitch: 1.6, rate: 1.3 }); }
      if (this.props.toastyT != null) this.props.toastyT++;
      if (t === 120) this.pose(w, 'victory');
    }

    // --- Thundertail: overcharged until he pops -------------------------------------
    overcharge() {
      const t = this.t, w = this.w, v = this.v, m = this.m;
      if (t === 1) this.pose(w, 'cast', { pF: [8, -36], pB: [2, -34] });
      if (t > 10 && t < 90) {
        if (t % 8 === 0) {
          this.props.bolt = { t: 6, x: v.x + R(-10, 10) };
          SK.audio.sfx('zap');
          m.shake(4);
          v.flash = 4;
        }
        m.fx.zap(v.x, v.y - 50 * v.scale, 1);
        v.scriptPose = SK.rig.pose(P.launched);
        v.scriptPose.oy = -Math.min(30, (t - 10) * 0.6);
        v.jitter = 3;
      }
      if (this.props.bolt && this.props.bolt.t > 0) this.props.bolt.t--;
      if (t === 92) {
        v.hidden = true;
        m.fx.explosion(v.x, v.y - 60, 1.2);
        m.fx.blood(v.x, v.y - 60, 1, 24, v.y); m.fx.blood(v.x, v.y - 60, -1, 24, v.y);
        m.fx.fur(v.x, v.y - 60, v.skin.fur, 16, v.y);
        m.fx.acorns(v.x, v.y - 60, 6);
        SK.audio.sfx('explode');
        m.shake(18);
      }
      if (t === 110) this.pose(w, 'victory');
    }

    // --- Bruiser: slam left, slam right, pancake -------------------------------------
    pancake() {
      const t = this.t, w = this.w, v = this.v, m = this.m;
      if (t === 1) this.pose(w, 'grabPose');
      if (t >= 14 && t < 110) {
        const slamT = (t - 14) % 22;
        const side = Math.floor((t - 14) / 22) % 2 ? 1 : -1;
        const k = slamT / 22;
        const ang = side > 0 ? Math.PI * (1 - k) : Math.PI * k;
        v.x = w.x + Math.cos(ang) * 52 * w.scale * -w.facing;
        v.y = w.y - Math.sin(ang) * 70 * w.scale;
        v.scriptPose = SK.rig.pose(P.launched);
        v.drawRot = ang * -w.facing;
        this.pose(w, 'throwPose');
        if (slamT === 21) {
          m.shake(10);
          SK.audio.sfx('thud');
          m.fx.dust(v.x, w.y, 8);
          m.fx.blood(v.x, w.y - 10, SK.sign(v.x - w.x), 8, w.y);
          v.flash = 3;
        }
      }
      if (t === 110) {
        v.x = w.x + w.facing * 50 * w.scale; v.y = w.y; v.drawRot = 0;
        v.scriptPose = SK.rig.pose(P.down);
        v.squash = [1.7, 0.18];
        this.pose(w, 'pound');
        m.shake(16);
        SK.audio.sfx('splat');
        m.fx.dust(v.x, v.y, 14);
      }
      if (t === 130) this.pose(w, 'victory');
    }

    // --- Glider: whisked off into the stratosphere -----------------------------------
    tornado() {
      const t = this.t, w = this.w, v = this.v, m = this.m;
      if (t === 1) { this.pose(w, 'spin'); SK.audio.sfx('whoosh'); }
      if (t > 1 && t < 40) { w.scriptPose.sx = Math.cos(t * 0.6) || 0.2; }
      if (t === 40) this.pose(w, 'victory');
      if (t > 20 && t < 140) {
        this.props.wind = (this.props.wind || 0) + 1;
        if (t % 20 === 0) SK.audio.sfx('whoosh');
        v.drawRot = (v.drawRot || 0) + 0.35;
        if (t > 50) v.y -= Math.min(16, (t - 50) * 0.3);
        if (t % 3 === 0) m.fx.fur(v.x, v.y - 40, v.skin.fur, 1);
      }
      if (t === 140) { this.props.twinkle = 0; SK.audio.sfx('unlock'); v.hidden = true; }
      if (this.props.twinkle != null) this.props.twinkle++;
    }

    // --- Chip: swallowed whole -------------------------------------------------------
    chomp() {
      const t = this.t, w = this.w, v = this.v, m = this.m;
      if (t === 1) { this.pose(w, 'eat'); this.props.startX = v.x; this.props.startY = v.y; }
      if (t > 1 && t < 60) {
        const k = SK.clamp((t - 10) / 50, 0, 1);
        w.squash = [1 + 0.5 * Math.sin(Math.min(1, t / 20) * Math.PI / 2), 1 + 0.35 * Math.sin(Math.min(1, t / 20) * Math.PI / 2)];
        const mx = w.x + w.facing * 24 * w.scale, my = w.y - 60 * w.scale;
        v.x = SK.lerp(this.props.startX, mx, k * k);
        v.y = SK.lerp(this.props.startY, my + 30, k * k);
        v.squash = [1 - k * 0.95, 1 - k * 0.95];
        v.drawRot = k * 6;
        if (t % 10 === 0) SK.audio.sfx('squeak', { pitch: 1.2 });
      }
      if (t === 60) { v.hidden = true; SK.audio.sfx('gulp'); w.squash = [1.25, 1.1]; this.pose(w, 'stance'); }
      if (t > 60 && t < 100) w.squash = [1.25 + Math.sin(t * 0.5) * 0.06, 1.1];
      if (t === 100) {
        w.squash = [1, 1];
        this.pose(w, 'taunt');
        SK.audio.sfx('grunt');
        m.fx.text(w.x + w.facing * 30, w.y - 110 * w.scale, 'BURP!', '#7cff3a', 30);
        for (let i = 0; i < 6; i++) m.fx.add({ type: 'shard', x: w.x + w.facing * 24, y: w.y - 66 * w.scale, vx: w.facing * R(2, 6), vy: R(-6, -1), life: 90, size: R(4, 7), color: '#f4efe0', grav: 0.4, rot: R(0, 6), vr: 0.2, floor: w.y });
      }
      if (t === 130) this.pose(w, 'victory');
    }

    // --- Rocco: laser-pixelated ------------------------------------------------------
    disintegrate() {
      const t = this.t, w = this.w, v = this.v, m = this.m;
      if (t === 1) this.pose(w, 'castWind');
      if (t === 18) { this.pose(w, 'cast'); SK.audio.sfx('laser'); }
      if (t >= 18 && t < 100) {
        const ex = w.x + w.facing * 20 * w.scale, ey = w.y - 74 * w.scale;
        const k = (t - 18) / 82;
        const ty = v.y - 100 * v.scale + 100 * v.scale * k;
        this.props.beam = { x: ex, y: ey, x2: v.x, y2: ty };
        v.alpha = 1 - k * 0.85;
        if (t % 14 === 0) SK.audio.sfx('laser');
        for (let i = 0; i < 4; i++) {
          m.fx.add({ type: 'pixel', x: v.x + R(-24, 24) * v.scale, y: ty + R(-6, 6), vx: R(-1, 1), vy: R(-2, 0.5), life: R(30, 60), size: R(3, 6), grav: 0.05, color: SK.pick([v.skin.fur, v.skin.belly, '#ff3030', '#ffffff']) });
        }
      }
      if (t === 100) { v.hidden = true; this.props.beam = null; m.fx.smoke(v.x, v.y - 40, 8, 'rgba(255,60,60,0.4)'); SK.audio.sfx('zap'); }
      if (t === 115) this.pose(w, 'victory');
    }

    // --- The Mailman: return to sender ------------------------------------------------
    mail() {
      const t = this.t, w = this.w, v = this.v, m = this.m;
      if (t === 1) this.pose(w, 'cast', { pF: [6, -34] });
      if (t < 34) this.props.box = { x: v.x, y: v.y - 600 + Math.min(1, t / 30) * 600, r: 0 };
      if (t === 30) { v.hidden = true; m.shake(10); SK.audio.sfx('thud'); m.fx.dust(v.x, v.y, 12); }
      if (t === 46 || t === 60) { SK.audio.sfx('stamp'); m.shake(4); this.props.stamps = (this.props.stamps || 0) + 1; }
      if (t === 74) this.pose(w, 'kickWind');
      if (t > 60 && t < 82) w.x += (v.x - w.facing * 56 * w.scale - w.x) * 0.2;
      if (t === 82) { this.pose(w, 'kick'); SK.audio.sfx('hitHeavy'); m.shake(8); this.props.flyT = 0; }
      if (this.props.flyT != null) {
        this.props.flyT++;
        const b = this.props.box;
        b.x += w.facing * 14; b.y -= 9 - this.props.flyT * 0.15; b.r += 0.25 * w.facing;
      }
      if (t === 100) this.pose(w, 'victory');
    }

    drawFront(ctx) {
      const p = this.props, v = this.v;
      if (p.acornY != null) {
        SK.gfx.acorn(ctx, v.x, p.acornY - 30, 90, 0);
      }
      if (p.bolt && p.bolt.t > 0) {
        ctx.save();
        ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 5; ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 20;
        ctx.beginPath();
        let x = p.bolt.x, y = v.y - 800;
        ctx.moveTo(x, y);
        while (y < v.y - 60) { y += 40; x += R(-22, 22); ctx.lineTo(x, y); }
        ctx.stroke();
        ctx.restore();
      }
      if (p.wind) {
        ctx.save();
        ctx.strokeStyle = 'rgba(235,240,255,0.7)'; ctx.lineWidth = 3;
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          for (let a = 0; a < 12; a += 0.25) {
            const r = 10 + a * 5;
            ctx.lineTo(v.x + Math.cos(a + p.wind * 0.3 + k) * r, this.v.y + 20 - a * 30 + k * 4);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      if (p.twinkle != null && p.twinkle < 60) {
        const cam = this.m.camera;
        const sx = v.x, sy = cam.y - SK.H / 2 / cam.zoom + 60;
        SK.gfx.star(ctx, sx, sy, 16 * Math.sin((p.twinkle / 60) * Math.PI) + 2, 5, 4, p.twinkle * 0.2, '#fff');
      }
      if (p.beam) {
        ctx.save();
        ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(p.beam.x, p.beam.y); ctx.lineTo(p.beam.x2, p.beam.y2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.beam.x, p.beam.y); ctx.lineTo(p.beam.x2, p.beam.y2); ctx.stroke();
        ctx.restore();
      }
      if (p.box) {
        ctx.save();
        ctx.translate(p.box.x, p.box.y - 50);
        ctx.rotate(p.box.r);
        ctx.fillStyle = '#b88a52'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3;
        ctx.fillRect(-50, -50, 100, 100); ctx.strokeRect(-50, -50, 100, 100);
        ctx.fillStyle = '#e0c890'; ctx.fillRect(-50, -8, 100, 16);
        ctx.fillStyle = '#c02020'; ctx.fillRect(18, -42, 24, 18);
        if (p.stamps) {
          SK.gfx.text(ctx, 'RETURN TO', 0, -24, { size: 14, align: 'center', color: '#c01010', font: SK.gfx.UI_FONT });
          if (p.stamps > 1) SK.gfx.text(ctx, 'SENDER', 0, 26, { size: 18, align: 'center', color: '#c01010', font: SK.gfx.UI_FONT });
        }
        ctx.restore();
      }
    }

    // Screen-space overlay (e.g. the TOASTY! pop-up)
    drawScreen(ctx) {
      const p = this.props;
      if (p.toastyT != null && p.toastyT < 70) {
        const k = p.toastyT < 12 ? p.toastyT / 12 : p.toastyT > 58 ? (70 - p.toastyT) / 12 : 1;
        const x = SK.W - 110 * k, y = SK.H - 110;
        ctx.save();
        ctx.translate(x + 60, y + 60);
        const mailSkin = SK.CHARS.mailman.skin;
        SK.rig.portrait(ctx, 0, -20, 120, mailSkin, { expr: 'happy', flip: true });
        ctx.restore();
        SK.gfx.text(ctx, 'TOASTY!', x - 60 + 60 * (1 - k), y + 20, { size: 34, color: '#ffd020', stroke: '#300', strokeW: 6, font: SK.gfx.TITLE_FONT, align: 'right' });
      }
    }
  }

  SK.Nutality = Nutality;
})(typeof window !== 'undefined' ? window : globalThis);
