/* Attract-mode intro: the ballad of the mailman and the killer squirrels. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const G = () => SK.gfx;
  const P = () => SK.rig.P;
  const TAU = Math.PI * 2;

  // Original lyrics written for this remake.
  const LYRICS = [
    [30, 210, 'Mister Mailman walkin\' down the street,'],
    [210, 390, 'whistlin\' a tune with the mail at his feet...'],
    [390, 540, 'He don\'t see the eyes up in the old oak tree,'],
    [540, 660, 'one...  two...  three...'],
    [720, 870, 'They want your nuts and they want your mail,'],
    [870, 1020, 'they want your hat and they want your tail!'],
    [1020, 1200, 'Run, Mailman, RUN!'],
  ];

  const GANG = ['nutso', 'frostbite', 'scurrion', 'chip'];

  function walkPose(t, speed) {
    const p = SK.rig.pose(P().stance);
    const ph = t * speed;
    p.fF = [13 + Math.sin(ph) * 10, -Math.max(0, Math.cos(ph)) * 8];
    p.fB = [-12 - Math.sin(ph) * 10, -Math.max(0, -Math.cos(ph)) * 8];
    p.pF = [10 - Math.sin(ph) * 8, 16];
    p.pB = [6 + Math.sin(ph) * 8, 16];
    p.hip[1] += -Math.abs(Math.sin(ph)) * 3;
    p.lean = 0.05;
    return p;
  }

  class IntroScene {
    constructor() {
      this.t = 0;
      this.mailX = -80;
      this.mailPose = 'walk';
      this.squirrels = GANG.map((id, i) => ({ id, x: 760 + i * 30, y: 220 + (i % 2) * 40, vx: 0, vy: 0, state: 'hide', t: 0 }));
      this.comic = [];
      this.letters = [];
    }

    enter() { SK.audio.play('mailman'); SK.input.swallow(); }

    update() {
      const t = ++this.t;
      SK.audio.tick();
      if (t > 15 && (SK.input.menu.any || SK.input.menu.ok)) { this.done(); return; }
      if (t < 420) this.mailX += 1.4;
      if (t % 150 === 40 && t < 540) SK.audio.sfx('whistle');
      if (t === 560 || t === 600 || t === 640) SK.audio.sfx('chitter', { pitch: 0.8 + (t - 560) / 200 });
      if (t === 660) {
        SK.audio.play('fight1');
        SK.audio.say('Squirrel Kombat!', { pitch: 0.3, rate: 0.85 });
        SK.audio.sfx('gong');
        this.squirrels.forEach((s, i) => { s.state = 'leap'; s.vx = (this.mailX - s.x + (i - 1.5) * 20) / 50; s.vy = -10; s.t = 0; });
      }
      this.squirrels.forEach((s) => {
        s.t++;
        if (s.state === 'leap') {
          s.vy += 0.42; s.x += s.vx; s.y += s.vy;
          if (s.y >= 430) { s.y = 430; s.state = 'brawl'; }
        } else if (s.state === 'chase') {
          s.x += 4.2; s.y = 430 - Math.abs(Math.sin(s.t * 0.25)) * 26;
        }
      });
      if (t >= 720 && t < 1020) {
        if (t % 9 === 0) SK.audio.sfx(SK.pick(['hit', 'hitHeavy', 'squeak', 'swing', 'chitter']));
        if (t % 26 === 0) this.comic.push({ str: SK.pick(['POW!', 'BONK!', 'THWACK!', 'NUTS!', 'ZAP!', 'CHOMP!', 'OOF!']), x: this.mailX + SK.rand(-90, 90), y: SK.rand(300, 380), t: 40, rot: SK.rand(-0.4, 0.4) });
        if (t % 7 === 0) this.letters.push({ x: this.mailX + SK.rand(-20, 20), y: 380, vx: SK.rand(-5, 5), vy: SK.rand(-9, -4), r: SK.rand(0, TAU), vr: SK.rand(-0.2, 0.2) });
      }
      if (t === 1020) {
        this.mailPose = 'run';
        this.squirrels.forEach((s, i) => { s.state = 'chase'; s.x = this.mailX - 110 - i * 55; s.t = i * 7; });
        SK.audio.sfx('grunt');
      }
      if (this.mailPose === 'run') this.mailX += 6;
      this.comic.forEach((c) => c.t--);
      this.comic = this.comic.filter((c) => c.t > 0);
      this.letters.forEach((l) => { l.vy += 0.3; l.x += l.vx; l.y += l.vy; l.r += l.vr; if (l.y > 470) { l.y = 470; l.vx *= 0.8; l.vy = 0; l.vr = 0; } });
      if (t === 1240) SK.audio.sfx('gong');
      if (t > 1380) this.done();
    }

    done() {
      if (this.leaving) return;
      this.leaving = true;
      SK.game.setScene(new SK.Screens.TitleScene());
    }

    drawBackground(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, SK.H);
      g.addColorStop(0, '#6ab8f0'); g.addColorStop(0.75, '#d8f0ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SK.W, SK.H);
      // houses
      [[40, '#d8b890', '#8a3a2a'], [300, '#b8c8d8', '#4a4a6a'], [560, '#e8d8a8', '#6a3a2a']].forEach(([x, wall, roof]) => {
        ctx.fillStyle = wall; ctx.fillRect(x, 250, 200, 190);
        ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - 20, 252); ctx.lineTo(x + 100, 170); ctx.lineTo(x + 220, 252); ctx.fill();
        ctx.fillStyle = '#5a3a20'; ctx.fillRect(x + 80, 350, 40, 90);
        ctx.fillStyle = '#9fd0f0'; ctx.fillRect(x + 20, 290, 44, 40); ctx.fillRect(x + 136, 290, 44, 40);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(x + 20, 290, 44, 40); ctx.strokeRect(x + 136, 290, 44, 40);
      });
      // lawn & sidewalk
      ctx.fillStyle = '#5ca83a'; ctx.fillRect(0, 430, SK.W, 30);
      ctx.fillStyle = '#c8c0b0'; ctx.fillRect(0, 440, SK.W, 40);
      ctx.strokeStyle = '#a8a090'; ctx.lineWidth = 2;
      for (let x = 0; x < SK.W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 440); ctx.lineTo(x - 10, 480); ctx.stroke(); }
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(0, 480, SK.W, 60);
      // mailbox
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(546, 380, 8, 60);
      G().roundRect(ctx, 520, 350, 60, 34, 12); ctx.fillStyle = '#c02a1a'; ctx.fill(); ctx.strokeStyle = '#300'; ctx.lineWidth = 2; ctx.stroke();
      // the old oak
      ctx.fillStyle = '#5a3a1a';
      ctx.beginPath(); ctx.moveTo(800, 445); ctx.lineTo(820, 190); ctx.lineTo(870, 190); ctx.lineTo(900, 445); ctx.fill();
      ctx.beginPath(); ctx.moveTo(840, 240); ctx.lineTo(720, 200); ctx.lineTo(722, 212); ctx.lineTo(842, 262); ctx.fill();
      [[840, 150, 120, '#3f8a2a'], [730, 190, 80, '#47952e'], [950, 190, 90, '#3a7f26'], [860, 80, 90, '#52a034'], [760, 110, 70, '#4a9a30']].forEach(([x, y, r, c]) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      });
    }

    render(ctx) {
      const t = this.t;
      this.drawBackground(ctx);
      // glowing eyes in the tree
      if (t > 300 && t < 680) {
        this.squirrels.forEach((s, i) => {
          if (t < 300 + i * 50) return;
          if (Math.floor((t + i * 13) / 50) % 7 === 0) return; // blink
          const ex = s.x, ey = s.y - 40;
          G().ellipse(ctx, ex - 6, ey, 4, 3, 0, '#ffef40');
          G().ellipse(ctx, ex + 6, ey, 4, 3, 0, '#ffef40');
          G().circle(ctx, ex - 5, ey, 1.5, '#000'); G().circle(ctx, ex + 7, ey, 1.5, '#000');
        });
      }
      // mailman
      const brawl = t >= 700 && t < 1020;
      if (!brawl) {
        ctx.save();
        ctx.translate(this.mailX, 440);
        ctx.scale(1.4, 1.4);
        let p;
        if (this.mailPose === 'run') { p = walkPose(t, 0.5); p.lean = 0.35; p.pF = [24, -10]; p.pB = [-14, -18]; p.expr = 'shock'; }
        else if (t >= 420) { p = SK.rig.pose(P().stance); p.pF = [24, 0]; p.expr = t > 600 ? 'shock' : 'normal'; }
        else p = walkPose(t, 0.22);
        SK.rig.draw(ctx, p, SK.CHARS.mailman.skin, { t });
        ctx.restore();
      }
      // squirrels
      this.squirrels.forEach((s, i) => {
        if (s.state === 'hide' || s.state === 'brawl') return;
        const ch = SK.CHARS[s.id];
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(1.1, 1.1);
        const p = SK.rig.pose(s.state === 'leap' ? P().airKick : P().jumpUp);
        p.expr = 'angry';
        if (s.state === 'leap') p.rot = s.t * 0.1;
        SK.rig.draw(ctx, p, ch.skin, { t: t + i * 10 });
        ctx.restore();
      });
      // brawl cloud
      if (brawl) {
        const cx = this.mailX, cy = 370;
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU + t * 0.05;
          G().circle(ctx, cx + Math.cos(a) * 70, cy + Math.sin(a) * 40, 46 + Math.sin(t * 0.3 + i) * 6, '#efe6d8', '#8a7a6a', 3);
        }
        G().circle(ctx, cx, cy, 70, '#efe6d8');
        // limbs and tails poking out
        for (let i = 0; i < 4; i++) {
          const a = t * 0.13 + i * 1.7;
          const lx = cx + Math.cos(a) * 92, ly = cy + Math.sin(a) * 58;
          ctx.save(); ctx.translate(lx, ly); ctx.rotate(a);
          if (i % 2) { G().ellipse(ctx, 0, 0, 22, 9, 0, SK.CHARS[GANG[i]].skin.tail, '#24130a', 2); }
          else { ctx.strokeStyle = '#24130a'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(10, 0); ctx.stroke(); ctx.strokeStyle = i === 0 ? '#9cc3e6' : '#c0582a'; ctx.lineWidth = 6; ctx.stroke(); }
          ctx.restore();
        }
        // mailman cap pops out
        if (Math.floor(t / 40) % 2) {
          ctx.save(); ctx.translate(cx + 20, cy - 90 - Math.abs(Math.sin(t * 0.2)) * 20); ctx.rotate(Math.sin(t * 0.3));
          ctx.fillStyle = '#26467a'; ctx.beginPath(); ctx.arc(0, 0, 16, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#111'; ctx.fillRect(4, -2, 20, 5);
          ctx.restore();
        }
        G().star(ctx, cx - 60, cy - 60, 10, 4, 5, t * 0.1, '#ffe040', '#7a5a00');
      }
      // flying letters
      this.letters.forEach((l) => {
        ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
        ctx.fillRect(-10, -6, 20, 12); ctx.strokeRect(-10, -6, 20, 12);
        ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(0, 1); ctx.lineTo(10, -6); ctx.stroke();
        ctx.restore();
      });
      this.comic.forEach((c) => {
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        G().star(ctx, 0, 0, 52, 30, 10, 0, '#ffe040', '#000');
        G().text(ctx, c.str, 0, 2, { size: 26, align: 'center', font: G().TITLE_FONT, color: '#d01010', stroke: '#fff', strokeW: 4 });
        ctx.restore();
      });
      if (t >= 660 && t < 760) {
        const k = SK.clamp((t - 660) / 14, 0, 1);
        G().banner(ctx, 'SQUIRREL KOMBAT!', SK.W / 2, 150, 96 * (2 - SK.ease.out(k)), { alpha: SK.clamp((760 - t) / 20, 0, 1) });
      }
      // lyrics
      LYRICS.forEach(([a, b, str]) => {
        if (t < a || t >= b) return;
        const alpha = Math.min(1, (t - a) / 15, (b - t) / 15);
        ctx.save();
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, SK.H - 56, SK.W, 44);
        ctx.restore();
        G().text(ctx, '♪ ' + str + ' ♪', SK.W / 2, SK.H - 34, { size: 24, align: 'center', color: '#fff8d8', font: G().BODY_FONT, weight: 'italic bold', alpha });
      });
      // ending: logo slam
      if (t >= 1200) {
        const k = SK.clamp((t - 1200) / 40, 0, 1);
        ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SK.W, SK.H); ctx.restore();
        if (t >= 1240) {
          const s = SK.clamp((t - 1240) / 16, 0, 1);
          SK.Screens.logo(ctx, SK.W / 2, SK.H / 2, 2.2 - 1.3 * SK.ease.out(s), t);
        }
      }
      if (t < 1200 && Math.floor(t / 40) % 2 === 0) G().text(ctx, 'PRESS ANY KEY TO SKIP', SK.W - 14, 18, { size: 13, align: 'right', color: 'rgba(255,255,255,0.7)', font: G().BODY_FONT });
    }
  }

  SK.IntroScene = IntroScene;
})(typeof window !== 'undefined' ? window : globalThis);
