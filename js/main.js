/* Boot, fixed-timestep game loop and canvas scaling. */
(function (root) {
  'use strict';
  const SK = root.SK;

  function boot() {
    SK.loadSettings();
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    SK.canvas = canvas;
    SK.ctx = ctx;
    SK.input.init(canvas);
    SK.input.onFirstInteraction = () => SK.audio.init();
    let pixelScale = 1;

    function resize() {
      const scale = Math.min(root.innerWidth / SK.W, root.innerHeight / SK.H);
      const cssW = Math.floor(SK.W * scale), cssH = Math.floor(SK.H * scale);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      pixelScale = canvas.width / SK.W;
    }
    root.addEventListener('resize', resize);
    resize();

    // URL shortcuts (handy for testing): ?fight=nutso,chip&stage=forest&mode=versus
    const q = new URLSearchParams(root.location.search);
    if (q.get('fight')) {
      const [a, b, c, d] = q.get('fight').split(',');
      const mode = q.get('mode') || (c ? 'teams' : 'versus');
      const cpu = q.get('cpu') !== '0';
      const teams = c
        ? [[{ char: a, player: 0 }, { char: b, player: null }], [{ char: c, player: null }, { char: d || a, player: null }]]
        : [[{ char: a, player: cpu && q.get('watch') ? null : 0 }], [{ char: b || 'chip', player: null }]];
      SK.audio.init();
      SK.Screens.startFight({ mode, stageId: q.get('stage') || 'field', teams });
      SK.game.fade = 0; SK.game.fadeDir = 0;
      if (SK.game.pending) { SK.game.scene = SK.game.pending; SK.game.pending = null; SK.game.scene.enter && SK.game.scene.enter(); }
    } else if (q.get('screen')) {
      const name = q.get('screen');
      const S = SK.Screens;
      const map = {
        title: () => new S.TitleScene(), menu: () => new S.MenuScene(), select: () => new S.SelectScene(q.get('mode') || 'versus'),
        stage: () => new S.StageSelectScene({ mode: 'versus', teams: [[{ char: 'nutso', player: 0 }], [{ char: 'chip', player: null }]] }),
        options: () => new S.OptionsScene(), help: () => new S.HelpScene(), credits: () => new S.CreditsScene(),
        intro: () => new SK.IntroScene(), ladder: () => new S.LadderScene(S.newTournament('nutso')),
        ending: () => new S.EndingScene({ player: q.get('char') || 'nutso', ladder: [], idx: 0, continues: 0 }),
      };
      SK.game.setScene((map[name] || map.title)(), true);
      if (q.get('page')) SK.game.scene.page = parseInt(q.get('page'), 10);
    } else {
      SK.game.setScene(new SK.Screens.BootScene(), true);
    }

    const STEP = 1000 / SK.FPS;
    let last = performance.now();
    let acc = 0;
    function frame(now) {
      let dt = now - last;
      last = now;
      if (dt > 250) dt = STEP; // tab was hidden; don't fast-forward
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        SK.input.update();
        SK.game.update();
        SK.input.endFrame();
        acc -= STEP;
        steps++;
      }
      if (steps === 5) acc = 0;
      ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      SK.game.render(ctx);
      SK.input.touch.draw(ctx);
      root.requestAnimationFrame(frame);
    }
    root.requestAnimationFrame(frame);

    // Pause fights automatically when the tab or window loses focus.
    const autoPause = () => {
      const s = SK.game.scene;
      if (s instanceof SK.Match && !s.paused && s.state !== 'matchOver' && s.cfg.mode !== 'demo') { s.paused = true; s.pauseSel = 0; }
    };
    root.addEventListener('blur', autoPause);
    document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  }

  SK.boot = boot;
  if (typeof document !== 'undefined' && document.getElementById && document.getElementById('game')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
