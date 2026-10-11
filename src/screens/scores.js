// High scores: the two top-ten tables (one player / two players), the high score screen
// (DoHighScores, from the title's SCORES button), and the name entry after a Tournament
// (AskHighScore / OpenScoreDialog).

import { Rand, TickCount, insetRect, ptInRect, setRect, untilTick } from '../mac.js';
import { bctx, drawPicture, drawString, fillBackWithPict, fillRect, foreColor, kctx, mapRGB16, stringWidth } from '../gfx.js';
import { Button, CheckKey, FlushEvents, GetMouse, GetNextEvent } from '../input.js';
import { DontHandleCamera, KillCamera, KillCamera2, OffCamera, SetRenderOptions } from '../camera.js';
import { BufferToScreen, DrawSprites, HandleSprites, KillAllSprites, NewSpriteFromPICT, SetSpriteFrame } from '../sprites.js';
import { renderBackground } from '../render.js';
import { HandleSparks, KillSparks } from '../sparks.js';
import { PlaySound } from '../sound.js';
import { GetScore } from '../hud.js';
import { Fade, FadeBack } from '../fade.js';
import { T } from '../templates.js';
import { NewCursorSprite, nextFrame } from '../common.js';
import { GetNumPlayers, prefs, savePrefs } from '../state.js';

// DefaultPrefs: ten entries of score 0, name "-", in each table. The original keeps them in its
// preferences file; here they are saved with the other preferences in the browser.
const emptyTable = () => Array.from({ length: 10 }, () => ({ score: 0, name: '-' }));
const table = (two) => {
  const k = two ? 'highTwo' : 'highNorm';
  if (!Array.isArray(prefs[k])) prefs[k] = emptyTable();
  return prefs[k];
};

// SetCurrent: the entry just added (shown in bold).
const cur = { row: -1, table: 0 };
const done = { v: 0 };

// The first row the score beats (scores must be higher than the entry, not equal), or -1.
function placeFor(t, score) {
  for (let i = 0; i < 10; i++) if (score > t[i].score) return i;
  return -1;
}
const CheckNormScore = (s) => placeFor(table(false), s) !== -1;
const CheckTwoScore = (s) => placeFor(table(true), s) !== -1;

// SubmitHighNorm / SubmitHighTwo: shift the lower entries down and put the new one in.
function Submit(two, score, name) {
  const t = table(two);
  const i = placeFor(t, score);
  if (i === -1) return;
  for (let k = 8; k >= i; k--) t[k + 1] = { ...t[k] };
  t[i] = { score, name: name.slice(0, 31) };
  cur.row = i;
  cur.table = two ? 2 : 1;
  savePrefs();
}

// DrawHighScores (into the background): headings, then ten rows per table. Each row is the rank
// in white right-aligned before it, the name on red and the score on dark red, both in black,
// bold for the entry just added. Column width is the width of "12345678912345678912345678955555".
export function DrawHighScores() {
  const red = mapRGB16(0xffff, 0x08c2, 0x06a2);
  const dark = mapRGB16(0x8000, 0, 0);
  const W = stringWidth('12345678912345678912345678955555', 9);
  const heading = (top) => {
    drawString(kctx, 0x80 + 3, top + 9, 'Name', 9, foreColor(0x1e));
    drawString(kctx, W + 0x84 + 3, top + 9, 'Score', 9, foreColor(0x1e));
  };
  const rows = (two, top0) => {
    const t = table(two);
    let bottom = 0;
    for (let i = 0; i < 10; i++) {
      const bold = cur.table === (two ? 2 : 1) && cur.row === i;
      const top = top0 + i * 0xd;
      bottom = top + 0xb;
      const r1 = setRect({}, 0x80, top, W + 0x84, bottom);
      fillRect(kctx, r1, red);
      drawString(kctx, r1.left + 3, top + 9, t[i].name, 9, foreColor(0x21), bold);
      const rank = `${i + 1}.`;
      drawString(kctx, r1.left - 2 - stringWidth(rank, 9), top + 9, rank, 9, foreColor(0x1e));
      const r2 = setRect({}, W + 0x84, top, W * 2 + 0x84, bottom);
      fillRect(kctx, r2, dark);
      drawString(kctx, r2.left + 3, top + 9, String(t[i].score), 9, foreColor(0x21), bold);
    }
    return bottom;
  };
  heading(0x33);
  const b = rows(false, 0x40);
  heading(b + 0x33);
  rows(true, b + 0x40);
}

// ---- the OK button ---------------------------------------------------------------------------

function NewHighScoreOK() {
  NewSpriteFromPICT(T.ok, setRect({}, 0x1fc, 0x1df, 0x260, 0x1ff), HandleHighScoreOK);
}

function HandleHighScoreOK(s) {
  if (s.rect.top < 0x1a1) {
    s.frame = 0;
    const m = GetMouse();
    if (ptInRect(m.h, m.v, s.rect)) {
      s.frame = 1;
      if (Button()) {
        PlaySound(0x10);
        s.frame = 2;
        done.v = 1;
      }
    }
  } else {
    s.rect.top -= 8;
    s.rect.bottom -= 8;
  }
}

// Shows the tables with the OK button rising into place; OK, Esc, Return or Enter leaves.
async function ScoresLoop() {
  done.v = 0;
  while (CheckKey(0x35) || CheckKey(0x24) || CheckKey(0x4c)) await untilTick(TickCount() + 1);
  while (done.v === 0) {
    const start = TickCount();
    if (CheckKey(0x35) || CheckKey(0x24) || CheckKey(0x4c)) {
      done.v = 1;
      SetSpriteFrame(0, 2);
      DrawSprites();
      await untilTick(TickCount() + 5);
    }
    await HandleSprites();
    HandleSparks();
    DrawSprites();
    await nextFrame(start);
  }
}

export async function DoHighScores() {
  await Fade(2);
  fillBackWithPict(0x9f, 640, 480);
  DrawHighScores();
  KillAllSprites();
  NewCursorSprite();
  NewHighScoreOK();
  DrawSprites();
  await FadeBack(2);
  await ScoresLoop();
}

// AskHighScore(player): if that player's score makes the table, show it, ask for a name, add it.
export async function AskHighScore(n) {
  OffCamera(-9999, -9999);
  KillCamera();
  KillCamera2();
  DontHandleCamera();
  SetRenderOptions(0, 0);
  const score = GetScore(n);
  const two = GetNumPlayers() === 2;
  if ((!two && CheckNormScore(score)) || (two && CheckTwoScore(score))) {
    await Fade(0);
    fillBackWithPict(0x9f, 640, 480);
    DrawHighScores();
    KillAllSprites();
    KillSparks();
    DrawSprites();
    await FadeBack(0);
    const name = await OpenScoreDialog(n);
    Submit(two, score, name);
    DrawHighScores();
    KillAllSprites();
    NewCursorSprite();
    NewHighScoreOK();
    DrawSprites();
    await ScoresLoop();
  }
}

// ---- the name entry window --------------------------------------------------------------------

// The 42 names the original offers by default (one picked with Rand(42)), typos and all.
const NAMES = [
  'Big Monkey', 'I.P. Freely', 'Seymour Butz', 'King Squirrel', 'Bill Gates', 'John Butler',
  'Carey Phelps', 'George of the Jungle', 'Xena, Princess Warrior', 'Bob',
  'Billy Bob Jimmy Ray Fleetwood Earl', 'Steve Jobs', 'Supreme Ruler', 'Ima Dork', 'Monkey Man',
  'Jelly Beans good', 'I kicked your butt!', 'I am SO good', 'Sensei Dragon Master', 'Bob the Fish',
  'Earl', 'Mac Master', 'Ow! My clamacle!', 'Ooh, that has got to hurt!', 'Little Bo Peep',
  'Tooth Fairy', 'Santa Clause', 'Squirrel Kombat rules!', 'Ninja Punk', 'I win!!!!',
  "I'm better than you!", "Don't mess with me!", 'Fight! Fight! Fight!', 'Rabid Squirrel',
  'I got his nuts! (Heh heh)', 'Nutty Squirrel', 'Suicidal Squirrel', 'Psycho Squirrel',
  'P.O.ed Squirrel', 'Squirrel with an attitude', 'Bruce Lee', 'Bond, James Bond',
];

// OpenScoreDialog: dialog 999 (240×240), titled "Player 1" / "Player 2", holding PICT 9910
// ("YES!!!!! You got a high score..."), PICT 9911 ("NAME:"), a name field (the default name
// selected) and a "Yeah Baby!" button with the default-button ring. Return or Enter also OKs.
// Not in the original: the window frame, title bar, field and button were drawn by Mac OS
// itself, so they are rebuilt plainly here (Colin may restyle them later). The contents and
// their positions come from the game's own DLOG/DITL 999 resources.
const DLG = setRect({}, 200, 120, 440, 360); // centred on the 640×480 screen
const at = (l, t, r, b) => setRect({}, DLG.left + l, DLG.top + t, DLG.left + r, DLG.top + b);

function drawDialog(title, text, selected) {
  renderBackground();
  const frame = { ...DLG };
  frame.top -= 18;
  insetRect(frame, -1, -1);
  fillRect(bctx, frame, foreColor(0x21));
  const bar = setRect({}, DLG.left, DLG.top - 18, DLG.right, DLG.top - 1);
  fillRect(bctx, bar, mapRGB16(0xdddd, 0xdddd, 0xdddd));
  drawString(bctx, DLG.left + 120 - (stringWidth(title, 9, true) >> 1), DLG.top - 5, title, 9, foreColor(0x21), true);
  fillRect(bctx, DLG, foreColor(0x1e));
  drawPicture(bctx, 9910, at(0, 0, 240, 128));
  drawPicture(bctx, 9911, at(90, 135, 150, 155));
  const field = at(5, 171, 235, 187);
  const edge = { ...field };
  insetRect(edge, -1, -1);
  fillRect(bctx, edge, foreColor(0x21));
  fillRect(bctx, field, foreColor(0x1e));
  if (selected && text) {
    fillRect(bctx, setRect({}, field.left + 2, field.top + 2, field.left + 4 + stringWidth(text, 9), field.bottom - 2), foreColor(0x21));
    drawString(bctx, field.left + 3, field.top + 11, text, 9, foreColor(0x1e));
  } else {
    const end = drawString(bctx, field.left + 3, field.top + 11, text, 9, foreColor(0x21));
    if ((TickCount() >> 5) & 1) fillRect(bctx, setRect({}, end + 1, field.top + 3, end + 2, field.bottom - 3), foreColor(0x21));
  }
  const btn = at(81, 208, 159, 228);
  bctx.save();
  bctx.strokeStyle = foreColor(0x21);
  bctx.lineWidth = 1;
  bctx.beginPath(); bctx.roundRect(btn.left + 0.5, btn.top + 0.5, btn.right - btn.left - 1, btn.bottom - btn.top - 1, 6); bctx.stroke();
  bctx.lineWidth = 3;
  bctx.beginPath(); bctx.roundRect(btn.left - 2.5, btn.top - 2.5, btn.right - btn.left + 5, btn.bottom - btn.top + 5, 7.5); bctx.stroke();
  bctx.restore();
  const label = 'Yeah Baby!';
  drawString(bctx, btn.left + ((btn.right - btn.left - stringWidth(label, 9, true)) >> 1), btn.top + 13, label, 9, foreColor(0x21), true);
  BufferToScreen();
}

async function OpenScoreDialog(n) {
  const title = n === 0 ? 'Player 1' : 'Player 2';
  FlushEvents();
  let text = NAMES[Rand(0x2a)];
  let selected = true;
  const btn = at(81, 208, 159, 228);
  for (;;) {
    const start = TickCount();
    let e;
    let ok = false;
    while ((e = GetNextEvent())) {
      if (e.what === 1) {
        const m = GetMouse();
        if (ptInRect(m.h, m.v, btn)) ok = true;
      } else if (e.what === 3) {
        if (e.mac === 0x24 || e.mac === 0x4c) ok = true;
        else if (e.mac === 0x33) { text = selected ? '' : text.slice(0, -1); selected = false; }
        else if (e.key && e.key.length === 1) {
          if (selected) { text = ''; selected = false; }
          if (text.length < 31) text += e.key;
        }
      }
    }
    drawDialog(title, text, selected);
    if (ok) break;
    await untilTick(start + 2);
  }
  FlushEvents();
  return text;
}
