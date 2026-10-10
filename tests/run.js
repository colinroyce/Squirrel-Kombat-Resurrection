/* Headless test-suite: `node tests/run.js` */
'use strict';
const { load, fakeCtx } = require('./harness');

let failures = 0, passes = 0;
function test(name, fn) {
  try {
    fn();
    passes++;
    console.log('  ok   ' + name);
  } catch (e) {
    failures++;
    console.log('  FAIL ' + name + '\n       ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n       ') : e));
  }
}
function assert(c, msg) { if (!c) throw new Error(msg || 'assertion failed'); }

// Run a match until it ends (or frames run out). Returns { result, match, frames }.
function runMatch(SK, cfg, maxFrames, opts) {
  opts = opts || {};
  let result = null;
  const m = new SK.Match(Object.assign({ rounds: 3, timer: 99 }, cfg, { onEnd: (r) => { result = r; }, onQuit: () => {} }));
  m.enter();
  const ctx = fakeCtx();
  let f = 0;
  for (; f < maxFrames && !result; f++) {
    SK.input.update();
    m.update();
    SK.input.endFrame();
    if (opts.render && f % 7 === 0) m.render(ctx);
    if (opts.check) opts.check(m, f);
  }
  return { result, match: m, frames: f };
}

function checkSane(m) {
  for (const f of m.fighters) {
    if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) throw new Error(f.char.id + ' position is not finite');
    if (f.x < m.stage.left - 5 || f.x > m.stage.right + 5) throw new Error(f.char.id + ' left the stage horizontally: ' + f.x);
    if (f.y > m.stage.height + 5) throw new Error(f.char.id + ' fell out of the stage: ' + f.y);
    if (f.hp < 0 || f.hp > f.maxHp) throw new Error(f.char.id + ' hp out of range ' + f.hp);
  }
}

console.log('Squirrel Kombat headless tests');

// ---------------------------------------------------------------------------
test('roster has 8 squirrels + secret boss, each with 4 combos & 4 specials', () => {
  const { SK } = load(1);
  assert(SK.ROSTER.length === 9, 'roster size');
  assert(SK.ROSTER.filter((c) => c.secret).length === 1, 'one secret');
  SK.ROSTER.forEach((c) => {
    assert(c.combos.length === 4, c.id + ' combos');
    assert(c.specials.length === 4, c.id + ' specials');
    const mv = SK.Moves.movesFor(c);
    assert(mv.specials.length === 4, c.id + ' built specials');
    ['jab', 'kick', 'uppercut', 'sweep'].forEach((k) => assert(mv[k], c.id + ' missing ' + k));
    ['comboPPP', 'comboPPK', 'comboKKK', 'comboKKP'].forEach((k) => assert(mv[k], c.id + ' missing ' + k));
    assert(c.nutality && c.nutality.type, c.id + ' nutality');
  });
});

test('five stages exist: Field, Forest, Tundra, Great Wall, City', () => {
  const { SK } = load(1);
  const ids = SK.STAGES.map((s) => s.id).join(',');
  assert(ids === 'field,forest,tundra,greatwall,city', ids);
});

// ---------------------------------------------------------------------------
test('special-move motion inputs trigger the right special for every character', () => {
  const { SK } = load(2);
  const seqs = [['B', 'F', 'p'], ['D', 'F', 'p'], ['F', 'F', 'k'], ['D', 'B', 'k']];
  SK.ROSTER.forEach((ch) => {
    seqs.forEach((seq, si) => {
      const m = new SK.Match({ mode: 'versus', stageId: 'field', teams: [[{ char: ch.id, player: null }], [{ char: 'nutso', player: null }]], hazards: false });
      const f = m.fighters[0];
      f.ai = null; f.player = null;
      m.state = 'fight';
      m.fighters.forEach((g) => { g.controlEnabled = true; g.setState('idle'); });
      m.fighters[1].ai = null;
      m.fighters[1].x = f.x + 300; // keep the opponent away, facing stays right
      f.facing = 1;
      const frames = [];
      const dirKey = (d) => (d === 'F' ? 'r' : d === 'B' ? 'l' : d === 'D' ? 'd' : 'u');
      seq.slice(0, -1).forEach((d) => { frames.push({ [dirKey(d)]: true }, { [dirKey(d)]: true }, {}); });
      frames.pop();
      const lastDir = dirKey(seq[seq.length - 2]);
      frames.push({ [lastDir]: true, [seq[seq.length - 1]]: true });
      let started = null;
      const orig = f.startMove.bind(f);
      f.startMove = (def) => { const ok = orig(def); if (ok && !started) started = def; return ok; };
      frames.forEach((inp) => {
        f.ai = { update: () => Object.assign({ u: false, d: false, l: false, r: false, p: false, k: false, b: false }, inp), queue: [] };
        f.readInput();
        f.update();
      });
      assert(started, ch.id + ' special ' + si + ' did not start');
      assert(started === f.moves.specials[si], ch.id + ' expected special ' + si + ' got ' + (started.name || started.id));
    });
  });
});

// ---------------------------------------------------------------------------
test('every special move runs to completion without errors on every character', () => {
  const { SK } = load(3);
  SK.ROSTER.forEach((ch) => {
    for (let si = 0; si < 4; si++) {
      const m = new SK.Match({ mode: 'versus', stageId: 'field', teams: [[{ char: ch.id, player: null }], [{ char: 'bruiser', player: null }]], hazards: false });
      m.state = 'fight';
      const [a, b] = m.fighters;
      a.ai = null; b.ai = null;
      m.fighters.forEach((g) => { g.controlEnabled = true; g.setState('idle'); });
      b.x = a.x + 70;
      a.facing = 1; b.facing = -1;
      a.startMove(a.moves.specials[si]);
      for (let i = 0; i < 240; i++) { m.update(); checkSane(m); }
      assert(a.state !== 'attack' || a.move.def.active >= 999 || a.move.def.untilLand, ch.id + ' special ' + si + ' never ended (state ' + a.state + ')');
    }
  });
});

test('combo strings chain P P P / P P K / K K K / K K P into their finishers', () => {
  const { SK } = load(4);
  const strings = { comboPPP: ['p', 'p', 'p'], comboPPK: ['p', 'p', 'k'], comboKKK: ['k', 'k', 'k'], comboKKP: ['k', 'k', 'p'] };
  Object.keys(strings).forEach((id) => {
    const m = new SK.Match({ mode: 'versus', stageId: 'field', teams: [[{ char: 'nutso', player: null }], [{ char: 'chip', player: null }]], hazards: false });
    m.state = 'fight';
    const [a, b] = m.fighters;
    a.ai = null; b.ai = null;
    m.fighters.forEach((g) => { g.controlEnabled = true; g.setState('idle'); });
    b.x = a.x + 300;
    let seen = false;
    const seq = strings[id];
    let step = 0;
    for (let i = 0; i < 120; i++) {
      const press = i % 6 === 0 && step < seq.length ? seq[step++] : null;
      a.ai = { update: () => ({ u: false, d: false, l: false, r: false, p: press === 'p', k: press === 'k', b: false }), queue: [] };
      a.readInput();
      a.update();
      if (a.move && a.move.def.id === id) seen = true;
    }
    assert(seen, id + ' never started');
  });
});

// ---------------------------------------------------------------------------
test('CPU vs CPU matches finish on every stage', () => {
  const { SK } = load(5);
  const ids = SK.ROSTER.map((c) => c.id);
  SK.STAGES.forEach((st, i) => {
    const a = ids[i % ids.length], b = ids[(i * 3 + 4) % ids.length];
    const { result, frames } = runMatch(SK, { mode: 'versus', stageId: st.id, teams: [[{ char: a, player: null, level: 2 }], [{ char: b, player: null, level: 2 }]] }, 60 * 60 * 8, { render: true, check: checkSane });
    assert(result, st.id + ': match did not finish in ' + frames + ' frames (' + a + ' vs ' + b + ')');
    console.log('       ' + st.id + ': ' + a + ' vs ' + b + ' → team ' + result.winnerTeam + ' won ' + result.wins.join('-') + ' in ' + Math.round(frames / 60) + 's' + (result.nutality ? ' with a NUTALITY' : ''));
  });
});

test('every character can play a full CPU match (timer forces an end)', () => {
  const { SK } = load(6);
  SK.ROSTER.forEach((c, i) => {
    const opp = SK.ROSTER[(i + 1) % SK.ROSTER.length].id;
    const { result, frames } = runMatch(SK, { mode: 'versus', stageId: SK.STAGES[i % 5].id, rounds: 1, timer: 60, teams: [[{ char: c.id, player: null, level: i % 3 }], [{ char: opp, player: null, level: 1 }]] }, 60 * 60 * 3, { check: checkSane });
    assert(result, c.id + ' match did not finish (' + frames + ' frames)');
  });
});

test('two-on-two matches finish', () => {
  const { SK } = load(7);
  const { result, frames, match } = runMatch(SK, {
    mode: 'teams', stageId: 'forest', rounds: 1, timer: 99,
    teams: [[{ char: 'nutso', player: null }, { char: 'glider', player: null }], [{ char: 'bruiser', player: null }, { char: 'rocco', player: null }]],
  }, 60 * 60 * 3, { render: true, check: checkSane });
  assert(result, 'teams match did not finish in ' + frames);
  assert(match.fighters.length === 4, 'four fighters');
});

test('practice mode keeps everyone alive and never ends', () => {
  const { SK } = load(8);
  const { result, match } = runMatch(SK, { mode: 'practice', stageId: 'tundra', teams: [[{ char: 'nutso', player: null, level: 2 }], [{ char: 'chip', player: null }]] }, 60 * 40, { render: true, check: checkSane });
  assert(!result, 'practice ended');
  match.fighters.forEach((f) => assert(f.hp >= 1, 'practice fighter died'));
});

// ---------------------------------------------------------------------------
test('FINISH \'EM leads to a Nutality for every character', () => {
  const { SK } = load(9);
  SK.ROSTER.forEach((c) => {
    const m = new SK.Match({ mode: 'versus', stageId: 'city', rounds: 1, teams: [[{ char: c.id, player: null }], [{ char: 'nutso', player: null }]], hazards: false });
    let result = null;
    m.cfg.onEnd = (r) => { result = r; };
    m.state = 'fight';
    m.fighters.forEach((g) => { g.controlEnabled = true; g.setState('idle'); g.ai = null; });
    const [w, v] = m.fighters;
    v.x = w.x + 60;
    v.takeHit({ dmg: 99999, kb: [2, -2], dirX: 1 }, w, w.x, 'melee');
    assert(m.state === 'finish', c.id + ': expected finish state, got ' + m.state);
    for (let i = 0; i < 80; i++) m.update();
    v.x = w.x + 60 * w.facing; v.y = w.y; v.onGround = true;
    m.startNutality(w, v);
    const ctx = fakeCtx();
    for (let i = 0; i < 700 && !result; i++) { m.update(); if (i % 5 === 0) m.render(ctx); }
    assert(result, c.id + ' nutality round never finished');
    assert(result.nutality, c.id + ' nutality not recorded');
  });
});

test('nutality input F B F + K works for a human-style input sequence', () => {
  const { SK } = load(10);
  const m = new SK.Match({ mode: 'versus', stageId: 'field', rounds: 1, teams: [[{ char: 'scurrion', player: null }], [{ char: 'chip', player: null }]], hazards: false });
  m.state = 'fight';
  m.fighters.forEach((g) => { g.controlEnabled = true; g.setState('idle'); g.ai = null; });
  const [w, v] = m.fighters;
  v.x = w.x + 70;
  v.takeHit({ dmg: 99999, kb: [1, -1], dirX: 1 }, w, w.x, 'melee');
  for (let i = 0; i < 90; i++) m.update();
  w.facing = SK.sign(v.x - w.x) || 1;
  const F = w.facing > 0 ? 'r' : 'l', B = w.facing > 0 ? 'l' : 'r';
  const frames = [{ [F]: true }, { [F]: true }, {}, { [B]: true }, { [B]: true }, {}, { [F]: true }, { [F]: true, k: true }];
  frames.forEach((inp) => {
    w.ai = { update: () => Object.assign({ u: false, d: false, l: false, r: false, p: false, k: false, b: false }, inp), queue: [] };
    m.update();
  });
  assert(m.state === 'nutality', 'expected nutality, got ' + m.state + ' (dist ' + Math.abs(v.x - w.x) + ')');
});

// ---------------------------------------------------------------------------
test('forest: two fighters in one nest summon the bird army', () => {
  const { SK } = load(11);
  const m = new SK.Match({ mode: 'versus', stageId: 'forest', teams: [[{ char: 'nutso', player: null }], [{ char: 'chip', player: null }]] });
  m.state = 'fight';
  m.fighters.forEach((g) => { g.controlEnabled = true; g.setState('idle'); g.ai = null; });
  const st = m.stage;
  const nestPlat = st.platforms[6];
  m.fighters.forEach((f, i) => { f.x = 790 + i * 20; f.y = nestPlat.y; f.onGround = true; f.platform = nestPlat; });
  for (let i = 0; i < 5; i++) m.update();
  assert(m.projectiles.some((p) => p.kind === 'birds'), 'no bird army');
});

test('forest elevator carries a fighter up', () => {
  const { SK } = load(12);
  const m = new SK.Match({ mode: 'versus', stageId: 'forest', teams: [[{ char: 'nutso', player: null }], [{ char: 'chip', player: null }]], hazards: false });
  m.state = 'fight';
  m.fighters.forEach((g) => { g.controlEnabled = true; g.setState('idle'); g.ai = null; });
  const el = m.stage.platforms.find((p) => p.elevator);
  const f = m.fighters[0];
  f.x = el.x + el.w / 2; f.y = el.y - 40; f.vy = 2; f.onGround = false; f.setState('air');
  m.fighters[1].x = 100;
  let minY = Infinity;
  for (let i = 0; i < 600; i++) { m.update(); minY = Math.min(minY, f.y); }
  assert(minY < 500, 'elevator did not lift the fighter (min y ' + minY + ')');
});

test('hazards (mower, death acorns, icicles, fireworks, cars) all spawn', () => {
  const { SK } = load(13);
  const kinds = { field: 'mower', forest: 'deathAcorn', tundra: 'icicle', greatwall: 'firework', city: 'car' };
  Object.keys(kinds).forEach((id) => {
    const m = new SK.Match({ mode: 'versus', stageId: id, teams: [[{ char: 'nutso', player: null }], [{ char: 'chip', player: null }]] });
    m.state = 'fight';
    m.fighters.forEach((g) => { g.controlEnabled = true; g.setState('idle'); g.ai = null; });
    let seen = false;
    for (let i = 0; i < 60 * 45 && !seen; i++) { m.update(); m.state = 'fight'; if (m.projectiles.some((p) => p.kind === kinds[id])) seen = true; }
    assert(seen, id + ' hazard ' + kinds[id] + ' never appeared');
  });
});

// ---------------------------------------------------------------------------
test('menus, select, ladder, options, help, credits, intro and ending render', () => {
  const { SK } = load(14);
  const S = SK.Screens;
  const ctx = fakeCtx();
  const scenes = [
    new S.BootScene(), new S.TitleScene(), new S.MenuScene(), new S.SelectScene('versus'), new S.SelectScene('teams'),
    new S.SelectScene('practice'), new S.SelectScene('tournament'),
    new S.StageSelectScene({ mode: 'versus', teams: [[{ char: 'nutso', player: 0 }], [{ char: 'chip', player: null }]] }),
    new S.LadderScene(S.newTournament('glider')), new S.ContinueScene(S.newTournament('rocco')),
    new S.EndingScene({ player: 'chip', ladder: [], idx: 0, continues: 0 }), new S.OptionsScene(), new S.HelpScene(), new S.CreditsScene(),
    new SK.IntroScene(),
  ];
  scenes.forEach((s) => {
    SK.game.scene = s;
    if (s.enter) s.enter();
    for (let i = 0; i < 30; i++) { s.update(); s.render(ctx); }
  });
  const help = new S.HelpScene();
  for (let p = 0; p < help.pages(); p++) { help.page = p; help.render(ctx); }
  const intro = new SK.IntroScene();
  for (let i = 0; i < 1300; i++) { intro.update(); if (i % 10 === 0) intro.render(ctx); }
});

test('character select: P1 vs CPU flow reaches stage select', () => {
  const { SK } = load(15);
  const S = SK.Screens;
  const sel = new S.SelectScene('versus');
  let next = null;
  SK.game.setScene = (s) => { next = s; };
  const press = (code) => { SK.input.justDown.add(code); SK.input.keys[code] = true; SK.input.update(); sel.update(); SK.input.keys[code] = false; SK.input.endFrame(); SK.input.update(); sel.update(); };
  press('KeyF'); // P1 picks
  press('KeyD'); // move cursor
  press('KeyF'); // P1 picks CPU opponent
  for (let i = 0; i < 60; i++) { SK.input.update(); sel.update(); }
  assert(next && next.constructor.name === 'StageSelectScene', 'expected StageSelectScene, got ' + (next && next.constructor.name));
  assert(sel.picks.t0.length === 1 && sel.picks.t1.length === 1, 'picks');
  assert(sel.picks.t1[0].player === null, 'opponent should be CPU');
});

test('character select: two-on-two with P2 joining as rival', () => {
  const { SK } = load(16);
  const S = SK.Screens;
  const sel = new S.SelectScene('teams');
  let next = null;
  SK.game.setScene = (s) => { next = s; };
  const press = (code) => { SK.input.justDown.add(code); SK.input.keys[code] = true; SK.input.update(); sel.update(); SK.input.keys[code] = false; SK.input.endFrame(); SK.input.update(); sel.update(); };
  press('Comma'); // P2 joins
  press('KeyF'); // P1 own
  press('Comma'); // P2 own
  press('KeyF'); // P1 partner
  press('Comma'); // P2 partner
  for (let i = 0; i < 60; i++) { SK.input.update(); sel.update(); }
  assert(sel.picks.t0.length === 2 && sel.picks.t1.length === 2, 'picks ' + sel.picks.t0.length + '/' + sel.picks.t1.length);
  assert(sel.picks.t1[0].player === 1, 'P2 should be human on team 2');
  assert(next && next.constructor.name === 'StageSelectScene', 'expected stage select');
});

test('secret code N U T S unlocks the mailman', () => {
  const { SK } = load(17);
  SK.settings.unlockedMailman = false;
  const sel = new SK.Screens.SelectScene('versus');
  ['KeyN', 'KeyU', 'KeyT', 'KeyS'].forEach((k) => { SK.input.justDown.add(k); SK.input.update(); sel.update(); SK.input.endFrame(); });
  assert(SK.settings.unlockedMailman, 'mailman should be unlocked');
});

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
