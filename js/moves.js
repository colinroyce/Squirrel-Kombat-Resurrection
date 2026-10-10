/* Move definitions: normals, combo strings, and the special-move builder. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const P = SK.rig.P;
  const pose = SK.rig.pose;

  // Animation helper: [frames, pose] keyframes.
  const strike = (su, ac, rc, wind, hitP) => [[su, wind], [ac, hitP], [rc, P.stance]];

  // ---------------------------------------------------------------------------
  // Normal moves (shared by the whole roster, scaled by character power/size)
  // ---------------------------------------------------------------------------
  const N = {
    jab: {
      name: 'Claw Jab', kind: 'normal', startup: 4, active: 3, recovery: 9,
      hitbox: [14, -76, 36, 24], hit: { dmg: 28, stun: 15, bstun: 10, kb: [3.5, 0] },
      anim: strike(4, 3, 9, P.jabWind, P.jab), chain: { p: 'jab2' }, sfx: 'swing',
    },
    jab2: {
      name: 'Claw Jab 2', kind: 'normal', startup: 3, active: 3, recovery: 11,
      hitbox: [14, -76, 36, 24], hit: { dmg: 30, stun: 17, bstun: 10, kb: [3.5, 0] },
      anim: strike(3, 3, 11, P.jab, P.jab2), chain: { p: 'comboPPP', k: 'comboPPK' }, sfx: 'swing',
    },
    kick: {
      name: 'Hind Kick', kind: 'normal', startup: 6, active: 4, recovery: 13,
      hitbox: [10, -60, 48, 26], hit: { dmg: 48, stun: 18, bstun: 12, kb: [5, 0] },
      anim: strike(6, 4, 13, P.kickWind, P.kick), chain: { k: 'kick2' }, sfx: 'swing',
    },
    kick2: {
      name: 'High Kick', kind: 'normal', startup: 5, active: 4, recovery: 14,
      hitbox: [10, -88, 48, 32], hit: { dmg: 45, stun: 18, bstun: 12, kb: [5, 0] },
      anim: strike(5, 4, 14, P.kick, P.kickHigh), chain: { k: 'comboKKK', p: 'comboKKP' }, sfx: 'swing',
    },
    uppercut: {
      name: 'Nut Uppercut', kind: 'normal', startup: 7, active: 4, recovery: 20,
      hitbox: [6, -112, 36, 70], hit: { dmg: 95, stun: 30, bstun: 14, kb: [3, -15], launch: true, heavy: true },
      anim: strike(7, 4, 20, P.upperWind, P.uppercut), sfx: 'swingHeavy', crouchStart: true,
    },
    sweep: {
      name: 'Tail Sweep', kind: 'normal', startup: 7, active: 5, recovery: 18,
      hitbox: [8, -20, 62, 20], hit: { dmg: 55, stun: 24, bstun: 12, kb: [2, -6], low: true, knockdown: true },
      anim: strike(7, 5, 18, P.sweepWind, P.sweep), sfx: 'swing', crouchStart: true,
    },
    airPunch: {
      name: 'Diving Claw', kind: 'air', air: true, startup: 4, active: 10, recovery: 4, landCancel: true,
      hitbox: [10, -70, 38, 34], hit: { dmg: 40, stun: 18, bstun: 12, kb: [4, -1], overhead: true },
      anim: [[4, P.jumpUp], [10, P.airPunch], [4, P.jumpDown]], sfx: 'swing',
    },
    airKick: {
      name: 'Flying Kick', kind: 'air', air: true, startup: 5, active: 12, recovery: 4, landCancel: true,
      hitbox: [6, -48, 50, 34], hit: { dmg: 55, stun: 20, bstun: 12, kb: [5, -2], overhead: true },
      anim: [[5, P.jumpUp], [12, P.airKick], [4, P.jumpDown]], sfx: 'swing',
    },
    toss: null, // built below from the grab builder
  };

  // ---------------------------------------------------------------------------
  // Combo finishers (P P P, P P K, K K K, K K P)
  // ---------------------------------------------------------------------------
  const C = {
    comboPPP: {
      kind: 'combo', comboIndex: 0, startup: 3, active: 16, recovery: 14, hitEvery: 4,
      hitbox: [10, -84, 44, 40], hit: { dmg: 15, stun: 20, bstun: 8, kb: [2, 0] },
      finalHit: { dmg: 24, stun: 26, kb: [8, -7], knockdown: true, heavy: true },
      anim: (f, m) => {
        if (m.frame < 3) return P.jab2;
        if (m.frame < 19) return Math.floor(m.frame / 4) % 2 ? P.clawA : P.clawB;
        return P.stance;
      },
      sfx: 'swing', sfxEvery: 4,
    },
    comboPPK: {
      kind: 'combo', comboIndex: 1, startup: 6, active: 8, recovery: 16,
      hitbox: [-40, -70, 104, 54], hit: { dmg: 70, stun: 28, bstun: 14, kb: [8, -7], knockdown: true, heavy: true },
      anim: (f, m) => {
        const k = SK.clamp((m.frame - 2) / 14, 0, 1);
        const p = SK.rig.blend(P.stance, P.spin, Math.min(1, m.frame / 4));
        p.sx = Math.cos(k * Math.PI * 2);
        if (Math.abs(p.sx) < 0.15) p.sx = 0.15 * (p.sx < 0 ? -1 : 1);
        if (m.frame > 16) return SK.rig.blend(p, P.stance, (m.frame - 16) / 10);
        return p;
      },
      sfx: 'swingHeavy',
    },
    comboKKK: {
      kind: 'combo', comboIndex: 2, startup: 5, active: 7, recovery: 18,
      hitbox: [4, -112, 50, 80], hit: { dmg: 80, stun: 30, bstun: 14, kb: [4, -15], launch: true, heavy: true },
      onUpdate(f, m) { if (m.frame === 3 && f.onGround) { f.vy = -7; f.onGround = false; f.platform = null; } },
      anim: (f, m) => {
        const k = SK.clamp((m.frame - 3) / 16, 0, 1);
        const p = SK.rig.blend(P.kick, P.flipKick, Math.min(1, m.frame / 5));
        p.rot = -k * Math.PI * 2;
        return m.frame > 22 ? SK.rig.blend(p, P.stance, (m.frame - 22) / 8) : p;
      },
      sfx: 'swingHeavy',
    },
    comboKKP: {
      kind: 'combo', comboIndex: 3, startup: 8, active: 6, recovery: 16,
      hitbox: [14, -84, 42, 44], hit: { dmg: 80, stun: 30, bstun: 16, kb: [12, -4], knockdown: true, heavy: true },
      onUpdate(f, m) { if (m.frame === 8) f.vx = f.facing * 7 * f.scale; },
      anim: [[8, P.headbuttWind], [6, P.headbutt], [16, P.stance]],
      sfx: 'swingHeavy',
    },
  };

  // ---------------------------------------------------------------------------
  // Special-move builder
  // ---------------------------------------------------------------------------
  function hitFrom(spec, base) {
    return Object.assign({ dmg: spec.dmg || 60, stun: 22, bstun: 14, kb: spec.kb || [6, -2], special: true }, base || {},
      spec.knockdown ? { knockdown: true } : {}, spec.low ? { low: true } : {}, spec.launch ? { launch: true } : {},
      spec.effect ? { effect: spec.effect } : {});
  }

  const DASH_POSES = { kick: P.airKick, slide: P.slide, ball: P.ball, torpedo: P.torpedo, dash: P.dash };

  const builders = {
    projectile(spec) {
      return {
        kind: 'special', startup: 13, active: 1, recovery: 22, air: !!spec.air,
        anim: [[13, P.castWind], [8, P.cast], [15, P.stance]],
        canStart(f) { return !f.match.projectiles.some((p) => p.owner === f && !p.dead && p.kind !== 'bomb'); },
        onUpdate(f, m) {
          if (m.frame === 13) {
            const pr = spec.proj;
            f.spawnProjectile({
              kind: pr.kind, speed: pr.speed, vy: pr.vy || 0, gravity: pr.gravity || 0, wobble: pr.wobble,
              hit: Object.assign({ dmg: pr.dmg, stun: pr.stun || 20, bstun: 14, kb: pr.kb || [5, -2], special: true },
                pr.effect ? { effect: pr.effect } : {}, pr.launch ? { launch: true } : {}, pr.knockdown ? { knockdown: true } : {},
                pr.low ? { low: true } : {}),
            });
          }
        },
      };
    },
    spear(spec) {
      const d = builders.projectile(spec);
      d.recovery = 30;
      d.anim = [[13, P.castWind], [30, P.cast]];
      d.onUpdate = function (f, m) {
        if (m.frame === 13) {
          SK.audio.sfx('spear');
          f.spawnProjectile({ kind: 'spear', speed: spec.proj.speed, hit: { dmg: spec.proj.dmg, stun: 16, bstun: 12, kb: [0, 0], special: true } });
        }
        // hold the cast pose while the spear is out
        if (m.frame > 20 && f.match.projectiles.some((p) => p.owner === f && p.kind === 'spear' && !p.dead)) m.frame = Math.min(m.frame, 30);
      };
      return d;
    },
    rising(spec) {
      return {
        kind: 'special', startup: 3, active: 14, recovery: 0, untilLand: true, landLag: 10, invuln: [0, 9],
        hitbox: [-4, -116, 46, 96], hit: hitFrom(spec, { stun: 30, kb: [3, -16], launch: true, heavy: true }),
        onUpdate(f, m) {
          if (m.frame === 3) { f.vy = spec.vy; f.vx = f.facing * spec.vx; f.onGround = false; f.platform = null; f.match.fx.dust(f.x, f.y, 6); }
          if (m.frame > 3 && m.frame < 17 && m.frame % 2 === 0) f.match.fx.add({ type: 'ghost', x: f.x, y: f.y, facing: f.facing, scale: f.scale, pose: f.pose, skin: f.skin, life: 10 });
        },
        anim: (f, m) => {
          if (m.frame < 3) return P.upperWind;
          const p = SK.rig.pose(P.uppercut);
          p.rot = m.frame < 17 ? -0.3 + Math.sin(m.frame * 0.4) * 0.15 : 0;
          return m.frame > 17 ? P.jumpDown : p;
        },
        sfx: 'swingHeavy',
      };
    },
    dash(spec) {
      const dur = spec.dur || 20;
      const ps = DASH_POSES[spec.pose] || P.dash;
      const def = {
        kind: 'special', startup: 6, active: dur, recovery: 14, air: !!spec.air,
        hitbox: spec.hitbox || [0, -72, 54, 52], hitEvery: spec.hitEvery,
        hit: hitFrom(spec, { stun: 24, kb: spec.kb || [7, -4] }),
        finalHit: spec.finalKb ? { kb: spec.finalKb, knockdown: true } : null,
        onStart(f, m) { m.data.air = !f.onGround; },
        onUpdate(f, m) {
          const a = m.frame >= 6 && m.frame < 6 + dur && !m.data.stopped;
          if (m.frame === 6) {
            if (spec.vy) { f.vy = spec.vy; f.onGround = false; f.platform = null; }
            SK.audio.sfx(spec.sfx || 'whoosh');
          }
          if (a) {
            f.vx = f.facing * spec.speed * (spec.pose === 'bike' ? 1 : 1);
            if (!spec.gravity && (m.data.air || spec.pose === 'torpedo' || spec.pose === 'kick')) f.noGravity = true;
            if (m.frame % 2 === 0) f.match.fx.add({ type: 'ghost', x: f.x, y: f.y, facing: f.facing, scale: f.scale, pose: f.pose, skin: f.skin, life: 12 });
            if (spec.trail && m.frame % 2 === 0) f.match.fx.add({ type: 'puff', x: f.x - f.facing * 10, y: f.y - 40 * f.scale, life: 14, size: 7, color: spec.trail });
          } else {
            f.noGravity = false;
            if (m.frame === 6 + dur) f.vx *= 0.3;
          }
        },
        onHit(f, t, m) { if (spec.stopOnHit) { m.data.stopped = true; f.vx = -f.facing * 2; } },
        anim: (f, m) => {
          if (m.frame < 6) return P.dash;
          if (m.frame >= 6 + dur) return m.data.air || !f.onGround ? P.jumpDown : P.land;
          if (spec.pose === 'bike') return (Math.floor(m.frame / 4) % 2 ? P.kick : P.kickHigh);
          if (spec.pose === 'ball') { const p = SK.rig.pose(P.ball); p.rot = m.frame * 0.5; return p; }
          return ps;
        },
      };
      if (spec.pose === 'ball' || spec.pose === 'slide') def.lowProfile = true;
      return def;
    },
    teleport(spec) {
      return {
        kind: 'special', startup: 14, active: spec.attack ? 6 : 1, recovery: spec.attack ? 18 : 14, invuln: [4, 24],
        hitbox: spec.attack ? [6, -86, 46, 50] : null, hit: hitFrom(spec, { stun: 26, kb: [8, -6], knockdown: true }),
        onStart() { SK.audio.sfx('teleport'); },
        onUpdate(f, m) {
          if (m.frame < 14) m.data.alpha = 1 - m.frame / 12;
          if (m.frame === 13) {
            const tg = f.target;
            if (tg) {
              const st = f.match.stage;
              let nx = tg.x - tg.facing * 64;
              if (nx < st.left + 30 || nx > st.right - 30) nx = tg.x + tg.facing * 64;
              f.x = SK.clamp(nx, st.left + 30, st.right - 30);
              f.y = tg.y; f.vx = 0; f.vy = 0;
              f.onGround = tg.onGround; f.platform = tg.platform;
              f.facing = SK.sign(tg.x - f.x) || f.facing;
              f.match.fx.smoke(f.x, f.y - 40, 5, 'rgba(255,240,200,0.5)');
            }
          }
          if (m.frame >= 14) m.data.alpha = Math.min(1, (m.frame - 13) / 6);
        },
        anim: (f, m) => (m.frame < 14 ? P.teleport : spec.attack ? (m.frame < 20 ? P.jab : P.stance) : P.stance),
      };
    },
    groundPound(spec) {
      return {
        kind: 'special', startup: 8, active: 999, recovery: 0, untilLand: false, air: true,
        hit: hitFrom(spec, { stun: 24, kb: [5, -8], low: true, knockdown: true }),
        onStart(f, m) { m.data.phase = f.onGround ? 'jump' : 'fall'; },
        onUpdate(f, m) {
          const d = m.data;
          if (d.phase === 'jump' && m.frame === 8) { f.vy = -12; f.onGround = false; f.platform = null; d.phase = 'rise'; }
          if ((d.phase === 'rise' && f.vy > -2) || (d.phase === 'fall' && m.frame > 4)) { d.phase = 'slam'; f.vy = 16; }
          if (d.phase === 'slam' && f.onGround) {
            d.phase = 'land'; d.landAt = m.frame;
            const m2 = f.match;
            m2.shake(14);
            SK.audio.sfx('thud');
            m2.fx.dust(f.x, f.y, 12);
            const kind = spec.wave === 'ice' ? 'iceSpike' : 'shock';
            [-1, 1].forEach((dir) => {
              f.spawnProjectile({
                kind, x: f.x + dir * 30, y: f.y - 22, speed: 8.5, dir, ground: true, life: 70,
                hit: Object.assign(hitFrom(spec, { stun: 24, kb: [5, -8], low: true, knockdown: true }), { groundOnly: true, effect: spec.wave === 'ice' ? 'freeze' : undefined }),
              }, true);
            });
            if (spec.wave === 'ice') SK.audio.sfx('freeze');
          }
          if (d.phase === 'land' && m.frame - d.landAt > 18) m.end = true;
        },
        anim: (f, m) => {
          const ph = m.data.phase;
          if (ph === 'jump') return P.crouch;
          if (ph === 'rise') return P.poundAir;
          if (ph === 'slam') { const p = SK.rig.pose(P.poundAir); p.pF = [16, 30]; p.pB = [10, 30]; return p; }
          return P.pound;
        },
      };
    },
    breath(spec) {
      const dur = spec.dur || 36;
      return {
        kind: 'special', startup: 10, active: dur, recovery: 16, hitEvery: 8,
        hitbox: [18, -92, 110, 56], hit: hitFrom(spec, { stun: 14, bstun: 10, kb: [2, 0] }),
        onStart(f) { SK.audio.sfx(spec.effect === 'burn' ? 'fire' : 'freeze'); },
        onUpdate(f, m) {
          if (m.frame >= 10 && m.frame < 10 + dur) {
            const hx = f.x + f.facing * 26 * f.scale, hy = f.y - 72 * f.scale;
            for (let i = 0; i < 3; i++) {
              const v = SK.rand(5, 9);
              f.match.fx.add({
                type: spec.color === 'fire' ? 'fire' : 'frost', x: hx, y: hy + SK.rand(-4, 4),
                vx: f.facing * v, vy: SK.rand(-1.6, 1.2), life: SK.rand(14, 20), size: SK.rand(6, 12), drag: 0.95,
              });
            }
            if (m.frame % 12 === 0) SK.audio.sfx(spec.effect === 'burn' ? 'fire' : 'freeze');
          }
        },
        anim: [[10, P.castWind], [dur, P.breath], [16, P.stance]],
      };
    },
    grab(spec) {
      const dash = spec.dashDur || 0;
      const range = spec.range || 44;
      return {
        kind: 'special', startup: 5 + dash, active: 2, recovery: 22, air: !!spec.air && !spec.throwMove,
        isGrab: true, grabSpec: spec,
        onUpdate(f, m) {
          const d = m.data;
          if (dash && m.frame < 5 + dash && !d.caught) { f.vx = f.facing * spec.dashSpeed; if (m.frame % 2 === 0) f.match.fx.add({ type: 'ghost', x: f.x, y: f.y, facing: f.facing, scale: f.scale, pose: f.pose, skin: f.skin, life: 10 }); }
          if (!d.caught && m.frame >= 5 + dash && m.frame < 7 + dash) {
            const tg = f.match.enemiesOf(f).find((e) => e.canBeGrabbed(spec.air) && Math.abs(e.y - f.y) < 40 * f.scale &&
              (e.x - f.x) * f.facing > -10 && Math.abs(e.x - f.x) < range * f.scale + e.scale * 18);
            if (tg) {
              d.caught = tg; d.at = m.frame;
              tg.grabbedBy(f);
              f.vx = 0;
              SK.audio.sfx(spec.toss ? 'throw' : 'grunt');
            }
          }
          if (d.caught) {
            const tg = d.caught;
            d.holdT = (d.holdT || 0) + 1;
            const t = d.holdT;
            const holdHits = spec.holdHits || 0;
            const holdEnd = holdHits * 10;
            if (spec.toss || spec.slam) {
              // lift overhead
              const k = SK.clamp(t / 14, 0, 1);
              tg.x = f.x + f.facing * (24 - 34 * k) * f.scale;
              tg.y = f.y - (10 + 60 * Math.sin(k * Math.PI * 0.9)) * f.scale;
              if (t === 16) {
                tg.release();
                const dir = spec.slam ? f.facing : -f.facing;
                tg.takeHit({ dmg: spec.finalDmg || 100, stun: 30, kb: spec.slam ? [3, 6] : [7, -9], knockdown: true, heavy: true, unblockable: true, dirX: dir, special: !!spec.slam }, f, f.x - dir * 10, 'grab');
                if (spec.slam) { f.match.shake(12); SK.audio.sfx('thud'); }
                d.caught = null; d.done = true; m.frame = Math.max(m.frame, 7 + dash);
                m.recoverFrom = m.frame;
              }
            } else {
              tg.x = f.x + f.facing * 30 * f.scale;
              tg.y = f.y;
              if (t > 0 && t <= holdEnd && t % 10 === 0) {
                tg.takeHit({ dmg: spec.holdDmg, stun: 30, kb: [0, 0], unblockable: true, effect: spec.effect, dirX: f.facing, special: true, held: true }, f, f.x, 'grab');
                if (spec.effect === 'shock') { SK.audio.sfx('zap'); f.match.fx.zap(tg.x, tg.y - 40, 4); }
              }
              if (t >= holdEnd + 8) {
                tg.release();
                tg.takeHit({ dmg: spec.finalDmg || 40, stun: 30, kb: [8, -8], knockdown: true, heavy: true, unblockable: true, dirX: f.facing, effect: spec.effect, special: true }, f, f.x, 'grab');
                d.caught = null; d.done = true;
              }
            }
            if (tg.state !== 'grabbed' && d.caught) { d.caught = null; d.done = true; }
            if (d.caught) m.frame = Math.min(m.frame, 6 + dash); // freeze move timeline while holding
          }
        },
        anim: (f, m) => {
          const d = m.data;
          if (d.caught || d.done) {
            if (spec.toss || spec.slam) return P.throwPose;
            return Math.floor((d.holdT || 0) / 5) % 2 ? P.jab : P.jab2;
          }
          if (m.frame < 5 + dash) return dash ? P.dash : P.jabWind;
          return P.grabPose;
        },
      };
    },
    counter(spec) {
      const win = spec.window || 34;
      return {
        kind: 'special', startup: 3, active: win, recovery: 18, counter: true, counterSpec: spec,
        anim: (f, m) => (m.data.countered ? (m.frame < m.data.at + 6 ? P.jabWind : P.cast) : P.counter),
        onStart(f) { f.match.fx.add({ type: 'ring', x: f.x, y: f.y - 44 * f.scale, life: 16, size: 50, color: spec.effect === 'freeze' ? '#bfe9ff' : '#ffe080' }, true); },
        onUpdate(f, m) {
          if (m.data.countered && m.frame === m.data.at + 6) {
            const a = m.data.attacker;
            if (a && a.alive) {
              a.takeHit({ dmg: spec.dmg, stun: 30, kb: [8, -8], knockdown: spec.effect !== 'freeze', effect: spec.effect, unblockable: true, heavy: true, dirX: f.facing, special: true }, f, f.x, 'counter');
            }
          }
          if (!m.data.countered && m.frame % 6 === 0 && m.frame < 3 + win) {
            f.match.fx.add({ type: spec.effect === 'freeze' ? 'frost' : 'spark', x: f.x + SK.rand(-20, 20), y: f.y - SK.rand(20, 80) * f.scale, vx: 0, vy: -1, life: 14, size: 3, color: '#ffe080' });
          }
        },
      };
    },
    invisible(spec) {
      return {
        kind: 'special', startup: 12, active: 1, recovery: 10,
        anim: [[12, P.teleport], [11, P.stance]],
        onUpdate(f, m) {
          if (m.frame === 12) { f.invisible = spec.dur || 360; SK.audio.sfx('teleport'); f.match.fx.smoke(f.x, f.y - 40, 6, 'rgba(120,255,120,0.4)'); }
        },
      };
    },
    glide(spec) {
      const dur = spec.dur || 40;
      return {
        kind: 'special', startup: 4, active: dur, recovery: 0, air: true,
        hitbox: [0, -64, 56, 44], hit: hitFrom(spec, { stun: 24, kb: [8, -6], knockdown: true }),
        onStart(f, m) { if (f.onGround) { f.vy = -9; f.onGround = false; f.platform = null; } else f.vy = Math.min(f.vy, -2); SK.audio.sfx('whoosh'); },
        onUpdate(f, m) {
          if (m.frame >= 4 && m.frame < 4 + dur) {
            f.vx = f.facing * spec.speed;
            f.gravityScale = 0.18;
            if (m.frame % 3 === 0) f.match.fx.add({ type: 'ghost', x: f.x, y: f.y, facing: f.facing, scale: f.scale, pose: f.pose, skin: f.skin, life: 10 });
            if (f.onGround && m.frame > 10) m.end = true;
          } else f.gravityScale = 1;
        },
        onEnd(f) { f.gravityScale = 1; },
        anim: [[4, P.jumpUp], [dur, P.glide], [4, P.jumpDown]],
      };
    },
    spin(spec) {
      const dur = spec.dur || 40;
      return {
        kind: 'special', startup: 6, active: dur, recovery: 14, hitEvery: spec.hitEvery || 6, armor: true,
        hitbox: [-52, -92, 104, 84], hit: hitFrom(spec, { stun: 18, bstun: 8, kb: [3, -2] }),
        finalHit: { kb: [9, -8], knockdown: true },
        onUpdate(f, m) {
          if (m.frame >= 6 && m.frame < 6 + dur) {
            const dir = f.inDir();
            f.vx = dir * (spec.move || 2);
            if (m.frame % 8 === 0) SK.audio.sfx('swing');
            if (m.frame % 2 === 0) f.match.fx.add({ type: 'puff', x: f.x + SK.rand(-40, 40), y: f.y - SK.rand(10, 70) * f.scale, vx: SK.rand(-2, 2), vy: -1, life: 14, size: 6, color: 'rgba(240,240,255,0.45)' });
          }
        },
        anim: (f, m) => {
          const p = SK.rig.pose(P.spin);
          p.sx = Math.cos(m.frame * 0.6);
          if (Math.abs(p.sx) < 0.15) p.sx = 0.15 * (p.sx < 0 ? -1 : 1);
          return m.frame >= 6 + dur ? P.stance : p;
        },
      };
    },
    beam(spec) {
      return {
        kind: 'special', startup: 16, active: 1, recovery: 20,
        anim: [[16, P.castWind], [20, P.cast]],
        onStart(f) { f.match.fx.add({ type: 'flash', x: f.x + f.facing * 18 * f.scale, y: f.y - 76 * f.scale, life: 16, size: 18, color: '#ff4040' }, true); },
        onUpdate(f, m) {
          if (m.frame !== 16) return;
          SK.audio.sfx('laser');
          const ex = f.x + f.facing * 20 * f.scale, ey = f.y - 74 * f.scale;
          let endX = ex + f.facing * spec.range;
          let victim = null;
          f.match.enemiesOf(f).forEach((e) => {
            const hb = e.hurtbox();
            if (ey < hb.y || ey > hb.y + hb.h) return;
            const nearX = f.facing > 0 ? hb.x : hb.x + hb.w;
            if ((nearX - ex) * f.facing < -10) return;
            if (Math.abs(nearX - ex) > spec.range) return;
            if (!victim || Math.abs(nearX - ex) < Math.abs(endX - ex)) { victim = e; endX = nearX + f.facing * 10; }
          });
          endX = SK.clamp(endX, f.match.stage.left, f.match.stage.right);
          f.match.fx.add({ type: 'beam', x: ex, y: ey, x2: endX, y2: ey, life: 14 }, true);
          if (victim) victim.takeHit(hitFrom(spec, { stun: 24, kb: [6, -3], dirX: f.facing }), f, f.x, 'beam');
        },
      };
    },
    trap(spec) {
      return {
        kind: 'special', startup: 10, active: 1, recovery: 14,
        canStart(f) { return !f.match.projectiles.some((p) => p.owner === f && p.kind === 'bomb' && !p.dead); },
        anim: [[10, P.castWind], [15, P.cast]],
        onUpdate(f, m) {
          if (m.frame === 10) {
            f.spawnProjectile({ kind: 'bomb', speed: 3.5, vy: -5, gravity: 0.45, life: 400, fuse: spec.fuse, hit: hitFrom(spec, { stun: 30, kb: [7, -10], knockdown: true, heavy: true }) });
            SK.audio.sfx('throw');
          }
        },
      };
    },
    multiProj(spec) {
      return {
        kind: 'special', startup: 12, active: 1, recovery: 24,
        anim: [[12, P.castWind], [25, P.cast]],
        canStart(f) { return !f.match.projectiles.some((p) => p.owner === f && !p.dead && p.kind === 'pellet'); },
        onUpdate(f, m) {
          if (m.frame === 12) {
            const n = spec.count || 5;
            for (let i = 0; i < n; i++) {
              f.spawnProjectile({ kind: 'pellet', speed: spec.proj.speed * SK.rand(0.85, 1.1), vy: -3 + (i * 4.5) / (n - 1), gravity: 0.08, hit: { dmg: spec.proj.dmg, stun: 12, bstun: 8, kb: [2, -1], special: true } }, true);
            }
            SK.audio.sfx('projectile');
          }
        },
      };
    },
    summon(spec) {
      return {
        kind: 'special', startup: 18, active: 1, recovery: 20,
        anim: [[18, P.cast], [21, P.taunt]],
        canStart(f) { return !f.match.projectiles.some((p) => p.owner === f && !p.dead && p.kind === 'dog'); },
        onStart() { SK.audio.sfx('whistle'); },
        onUpdate(f, m) {
          if (m.frame === 18) {
            const pr = spec.proj;
            f.spawnProjectile({ kind: 'dog', x: f.x - f.facing * 30, y: f.y - 17, speed: pr.speed, ground: true, life: 200, hit: { dmg: pr.dmg, stun: 26, bstun: 14, kb: [7, -8], knockdown: true, low: true, special: true } }, true);
          }
        },
      };
    },
  };

  // Universal close-range throw (Forward + Punch when touching).
  N.toss = builders.grab({ toss: true, finalDmg: 100, range: 30, throwMove: true });
  N.toss.kind = 'normal';
  N.toss.name = 'Nut Toss';

  // Build (and cache) move tables per character.
  const cache = {};
  function movesFor(ch) {
    if (cache[ch.id]) return cache[ch.id];
    const t = {};
    Object.keys(N).forEach((k) => { t[k] = Object.assign({ id: k }, N[k]); });
    Object.keys(C).forEach((k) => { t[k] = Object.assign({ id: k, name: ch.combos[C[k].comboIndex] }, C[k]); });
    t.specials = ch.specials.map((s, i) => {
      const b = builders[s.type];
      if (!b) throw new Error('Unknown special type ' + s.type);
      const def = b(s);
      def.id = 'special' + i;
      def.name = s.name;
      def.spec = s;
      def.special = true;
      return def;
    });
    cache[ch.id] = t;
    return t;
  }

  SK.Moves = { N, C, builders, movesFor, pose };
})(typeof window !== 'undefined' ? window : globalThis);
