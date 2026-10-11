// Not in the original: the pause screen's move guide (Colin's request). The original pause only
// shows the PAUSED picture (PICT 9000) and waits; its move list was a separate "Special Moves"
// text file. Here the pause shows a Controls page and one page per fighter, opening on the
// fighter you're playing. Esc opens it (the original paused on P and quit on Esc), and a QUIT button in the
// top left ends the fight. The arrow keys (or the walk keys) or the arrow buttons flip pages; Esc or F15
// resumes, and so does a click anywhere else, as in the original. Combos are written with your
// current keys, for facing right.

import { TickCount, ptInRect, setRect, untilTick } from '../mac.js';
import { cicnStrip, copyBits, drawString, fillRect, foreColor, sctx, stringWidth } from '../gfx.js';
import { CheckKey, FlushEvents, GetMouse, GetNextEvent } from '../input.js';
import { BufferToScreen } from '../sprites.js';
import { PlaySound } from '../sound.js';
import { CHAR_NAMES } from '../templates.js';
import { GetChosenChar, GetKey, sel } from '../state.js';
import { keyName } from './keys.js';
import { assets } from '../assets.js';

// From the original "Special Moves" sheet (< back, > forward, p punch, k kick, u uppercut,
// s spin kick, ^ jump), except Kathy's Flower Power: the sheet says >>s> but the game only
// accepts >>sk.
const MOVES = [
  [['Machine Gun Nuts', '<<<>u'], ['Tri Ball', '>>pp'], ['Atomic Scatter', '<p>k>'], ['Teleport', 'pkpu']],
  [['Speed By', '<>p'], ['Hit and Run', '<<>k'], ['Scorch', '<u<>k'], ['Fire Ball', '<<>>s']],
  [['Ice Blast', '>>pu'], ['Ice Fist', '<<>k'], ['Ice Column', 'pku'], ['Sneak Attack', 'ps^']],
  [['Toggle Visibility', '<^<>p'], ['Boxing Glove', '<<>>u'], ['Fire Ball', '<<>>p'], ['Ice Ball', '<<>>k']],
  [['Chain Grab', '<<<>u'], ['Random Teleport', '<pkkp'], ['Ninja Stars', '>>>k>'], ['Decoy', '>>ppk']],
  [['Power Fist', '<<>>u'], ['Electric Blast', '<<<>s'], ['Scatter Bomb', '>>p^'], ['Missile', '<>>k']],
  [['Sonic Scream', '<kk>'], ['Tri-Heart Stasis', '>>p>k'], ['Heart Bomb', '<<upk'], ['Flower Power', '>>sk']],
  [['Drive By', '<>pku'], ['Paralyzing Fart', 'supk>'], ['Cane Throw', '<>kp'], ['False Teeth', '<<p<>']],
  [['Pie', '<<>u'], ['Earthquake', 'pp>>u'], ['Stomach', 'pk>>'], ["Chew 'em up and Spit 'em out", 'p<<>p']],
  [['Fly', 'p<>k^'], ['Chase', 'pppu>'], ['Laser Eye Beam', '>>>k'], ['Phone Booth', '<k>ku']],
  [['Life Drain', '<<>>p'], ['Body Explode', 'u<>p^'], ['Dark Beam', '<<>k'], ['Summon Bats', '<ps>k']],
  [['Proximity Mine', 'p<k>u'], ['Grenade Attack', '>>us'], ['Air Strike', '<<pk>'], ['Chaser Missile', 's<<^>']],
];

// Extra notes for fighters whose moves need explaining.
const NOTES = {
  9: ['While flying: Jump = up, Punch = down, walk = sideways,', 'Kick, Uppercut or Spin Kick = land.'],
};

const SLOT = { '<': 0, '^': 1, '>': 2, p: 3, k: 4, u: 5, s: 6 };
const keys = (combo) => [...combo].map((c) => keyName(SLOT[c])).join(' ');

// Page 0 is Controls, then one page per fighter (Military Muskrat only once he's unlocked).
const fighters = () => Array.from({ length: sel.numChars }, (_, i) => i);
const pageCount = () => 1 + fighters().length;

const PANEL = setRect({}, 80, 72, 560, 456);
const PREV = setRect({}, 96, 420, 136, 444);
const QUIT = setRect({}, 96, 86, 160, 106);
const NEXT = setRect({}, 504, 420, 544, 444);

const red = () => foreColor(0xcd);
const white = () => foreColor(0x1e);
const yellow = () => foreColor(0x45);
const black = () => foreColor(0x21);

function box(r, fill, edge) {
  fillRect(sctx, setRect({}, r.left - 1, r.top - 1, r.right + 1, r.bottom + 1), edge);
  fillRect(sctx, r, fill);
}

function centred(y, text, color, bold = false) {
  drawString(sctx, 320 - (stringWidth(text, 9, bold) >> 1), y, text, 9, color, bold);
}

function row(y, label, value) {
  drawString(sctx, 112, y, label, 9, white());
  drawString(sctx, 300, y, value, 9, yellow());
}

function drawControls() {
  centred(108, 'CONTROLS', red(), true);
  let y = 132;
  const rows = [
    ['Walk left / right', `${keyName(0)} / ${keyName(2)}`],
    ['Jump', keyName(1)],
    ['Punch', keyName(3)],
    ['Kick', keyName(4)],
    ['Uppercut', keyName(5)],
    ['Spin kick', keyName(6)],
    ['Flying side kick', `${keyName(1)} then ${keyName(4)} in the air`],
    ['Jump spin kick', `${keyName(1)} then ${keyName(6)} in the air`],
    ['Power slam', `${keyName(5)} then ${keyName(1)}`],
    ['Throw', `${keyName(5)} then ${keyName(3)}`],
    ['Pause / resume', 'Esc'],
    ['Quit the fight', 'QUIT button (top left, while paused)'],
  ];
  for (const [l, v] of rows) { row(y, l, v); y += 18; }
  y += 6;
  centred(y, 'Special moves: tap the keys in order (holding one counts once).', white());
  centred(y + 14, 'Each fighter\'s page below shows them for facing right;', white());
  centred(y + 28, `facing left, swap ${keyName(0)} and ${keyName(2)}.`, white());
}

function drawFighter(ch) {
  const icon = cicnStrip(5000, 12, 32, 32);
  copyBits(sctx, icon, setRect({}, ch * 32, 0, ch * 32 + 32, 32), setRect({}, 304, 86, 336, 118));
  centred(134, CHAR_NAMES[ch], red(), true);
  let y = 166;
  for (const [name, combo] of MOVES[ch]) {
    row(y, name, keys(combo));
    y += 22;
  }
  y += 8;
  for (const line of NOTES[ch] || []) { centred(y, line, white()); y += 14; }
  centred(388, `Facing left, swap ${keyName(0)} and ${keyName(2)}. Tap the keys in order.`, white());
}

// PICT 9000 (160 x 45) says PAUSED over "HIT P TO UNPAUSE". P no longer pauses, so only its top 33
// rows (the PAUSED word) are drawn, closed with its bottom border row.
function drawPaused() {
  const img = assets.pict.get(9000);
  if (!img) return;
  sctx.drawImage(img, 0, 0, 160, 33, 0xf0, 18, 160, 33);
  sctx.drawImage(img, 0, 44, 160, 1, 0xf0, 51, 160, 1);
}

function draw(page) {
  BufferToScreen(); // the frozen fight underneath
  drawPaused();
  box(PANEL, black(), red());
  if (page === 0) drawControls();
  else drawFighter(fighters()[page - 1]);
  box(QUIT, black(), red());
  drawString(sctx, QUIT.left + ((QUIT.right - QUIT.left - stringWidth('QUIT', 9, true)) >> 1), QUIT.top + 14, 'QUIT', 9, red(), true);
  box(PREV, black(), red());
  box(NEXT, black(), red());
  centred(436, `${page + 1} / ${pageCount()}     ${keyName(0)} / ${keyName(2)} or arrow keys: flip pages     Esc: resume`, white());
  drawString(sctx, PREV.left + 15, PREV.top + 16, '<', 9, red(), true);
  drawString(sctx, NEXT.left + 16, NEXT.top + 16, '>', 9, red(), true);
}

// Replaces WaitPause while the guide is up. Returns 'quit' if QUIT was clicked, else resumes.
export async function PauseGuide() {
  const mine = fighters().indexOf(GetChosenChar(0));
  let page = mine >= 0 ? mine + 1 : 0;
  FlushEvents();
  draw(page);
  for (;;) {
    const e = GetNextEvent();
    if (e) {
      const n = pageCount();
      let flip = 0;
      if (e.what === 3) {
        if (e.mac === 0x71 || e.mac === 0x35) break; // Esc or F15 resume
        if (e.mac === 0x7b || e.mac === GetKey(0)) flip = -1;
        if (e.mac === 0x7c || e.mac === GetKey(2)) flip = 1;
      } else if (e.what === 1) {
        const m = GetMouse();
        if (ptInRect(m.h, m.v, QUIT)) {
          PlaySound(0x10);
          FlushEvents();
          return 'quit';
        }
        if (ptInRect(m.h, m.v, PREV)) flip = -1;
        else if (ptInRect(m.h, m.v, NEXT)) flip = 1;
        else break;
      }
      if (flip) {
        page = (page + flip + n) % n;
        PlaySound(0x12);
        draw(page);
      }
    }
    await untilTick(TickCount() + 1);
  }
  FlushEvents();
  while (CheckKey(0x71) || CheckKey(0x35)) await untilTick(TickCount() + 1);
  return 'resume';
}
