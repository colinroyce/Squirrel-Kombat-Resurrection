// Boot: load the original assets, then run the game exactly as Init / MyInit did.

import { seedRandom } from './mac.js';
import { createBackGWorld, gamma, initPalette, present } from './gfx.js';
import { loadAssets } from './assets.js';
import { initInput } from './input.js';
import { audioContext, loadSounds } from './sound.js';
import { loadPrefs, sel } from './state.js';
import { InitRadar, hud } from './hud.js';
import { gSprites } from './sprites.js';
import { DoStarting, LoadCharacters } from './screens/splash.js';
import { InitSelectionData } from './screens/select.js';
import { DoTitle } from './screens/title.js';

const canvas = document.getElementById('screen');
const gate = document.getElementById('gate');
const status = document.getElementById('status');

function fit() {
  const s = Math.min(window.innerWidth / 640, window.innerHeight / 480);
  const k = s >= 1 ? Math.floor(s) : s;
  canvas.style.width = 640 * k + 'px';
  canvas.style.height = 480 * k + 'px';
}

async function main() {
  if (location.search.includes('debug')) window.__sk = { hud, gSprites, sel }; // for automated tests
  fit();
  window.addEventListener('resize', fit);
  initInput(canvas);
  gamma.level = 0; // InitScreen starts with the display faded to black
  present(canvas);
  await loadAssets('assets/', (n, total) => { status.textContent = 'Loading ' + Math.round(100 * n / total) + '%'; });
  initPalette();
  loadPrefs();
  // Browsers only allow sound after a click or key press.
  status.textContent = 'Click to start';
  await new Promise((resolve) => {
    const go = () => { window.removeEventListener('keydown', go); gate.removeEventListener('click', go); resolve(); };
    gate.addEventListener('click', go);
    window.addEventListener('keydown', go);
  });
  await audioContext().resume();
  gate.style.display = 'none';
  await loadSounds('assets/');
  seedRandom(Date.now() % 0x7fffffff);
  // MyInit
  createBackGWorld(1024, 768);
  await DoStarting();
  InitSelectionData();
  InitRadar();
  await LoadCharacters();
  await DoTitle(1);
}

main().catch((e) => {
  status.textContent = 'Error: ' + e.message;
  gate.style.display = 'flex';
  throw e;
});
