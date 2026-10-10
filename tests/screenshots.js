/* Visual smoke test: renders screens & fights in headless Chromium and saves PNGs.
 * Usage: node tests/screenshots.js <outDir> [shotName ...]
 * Needs the `playwright` package (global install is fine). */
'use strict';
const path = require('path');
const fs = require('fs');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')));
}

const ROOT = path.join(__dirname, '..');
const url = (q) => 'file://' + path.join(ROOT, 'index.html') + (q ? '?' + q : '');

const SHOTS = [
  ['boot', '', 800],
  ['intro-walk', 'screen=intro', 4000],
  ['intro-brawl', 'screen=intro', 13500],
  ['title', 'screen=title', 1500],
  ['menu', 'screen=menu', 800],
  ['select', 'screen=select', 800],
  ['stage-select', 'screen=stage', 1200],
  ['ladder', 'screen=ladder', 800],
  ['help-moves', 'screen=help&page=2', 800],
  ['options', 'screen=options', 600],
  ['ending', 'screen=ending&char=glider', 1200],
  ['fight-field', 'fight=nutso,chip&stage=field&watch=1', 9000],
  ['fight-forest', 'fight=frostbite,scurrion&stage=forest&watch=1', 12000],
  ['fight-tundra', 'fight=thundertail,glider&stage=tundra&watch=1', 10000],
  ['fight-wall', 'fight=bruiser,rocco&stage=greatwall&watch=1', 10000],
  ['fight-city', 'fight=mailman,nutso&stage=city&watch=1', 10000],
  ['fight-teams', 'fight=nutso,glider,bruiser,chip&stage=city', 10000],
];

(async () => {
  const out = process.argv[2] || path.join(ROOT, 'shots');
  const only = process.argv.slice(3);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  for (const [name, q, wait] of SHOTS) {
    if (only.length && !only.includes(name)) continue;
    await page.goto(url(q));
    await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(out, name + '.png') });
    console.log('shot', name);
  }
  await browser.close();
  const real = errors.filter((e) => !/fonts\.g|ERR_|net::|Failed to load resource/i.test(e));
  if (real.length) { console.log('PAGE ERRORS:\n' + real.join('\n')); process.exit(1); }
  console.log('no page errors');
})();
