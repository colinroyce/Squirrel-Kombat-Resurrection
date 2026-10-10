/* Loads the game scripts into a sandbox with a fake canvas so logic can run headless. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ORDER = [
  'core', 'input', 'audio', 'gfx', 'rig', 'characters', 'effects', 'moves', 'fighter',
  'nutality', 'stages', 'ai', 'hud', 'match', 'screens', 'intro', 'main',
];

// A 2D-context stand-in that swallows every call.
function fakeCtx() {
  const grad = { addColorStop() {} };
  const target = {
    measureText: (s) => ({ width: String(s).length * 8 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => ({}),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    calls: 0,
  };
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      return function () { t.calls++; };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function load(seed) {
  const sandbox = {
    console, Math, Date, JSON, Object, Array, Set, WeakSet, Map, Number, String, Boolean, Error, Infinity, NaN, parseInt, parseFloat, Uint8ClampedArray,
    setTimeout: () => 0,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  ORDER.forEach((name) => {
    const file = path.join(ROOT, 'js', name + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  });
  const SK = sandbox.SK;
  if (seed != null) SK.seed(seed);
  SK.settings.announcer = false;
  // Stub the scene switcher so match callbacks can be observed.
  return { SK, sandbox, fakeCtx };
}

module.exports = { load, fakeCtx };
