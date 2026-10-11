// Title screen: DoTitle, TitleLoop, HandleTitle and the title sprites.

import { Rand, Rand1, TickCount, offsetRect, ptInRect, setRect, untilTick } from '../mac.js';
import { fillBackWithPict } from '../gfx.js';
import { Button, CheckKey, GetMouse } from '../input.js';
import { DontHandleCamera, GetSplit, HandleCamera, HandleCameraSplit, OffCamera, SetRenderOptions } from '../camera.js';
import { DrawSprites, GetNumSprites, HandleSprites, KillAllSprites, KillSprite, NewSpriteFromCICN } from '../sprites.js';
import { HandleSparks } from '../sparks.js';
import { PlayMusic, PlaySound } from '../sound.js';
import { DontDrawLifeBars, QuitHint, StartHint } from '../hud.js';
import { Fade, FadeBack, GetFadeNormal } from '../fade.js';
import { CHARS, T } from '../templates.js';
import { NewCursorSprite, OnScreen, nextFrame } from '../common.js';
import { OpenOptions } from './options.js';
import { OpenSelection } from './select.js';
import { DoHighScores } from './scores.js';

const title = { message: 0 };

export function SetGameMessage(m) {
  title.message = m;
}

export async function DoTitle(playMusic) {
  if (playMusic) PlayMusic(0);
  DontHandleCamera();
  DontDrawLifeBars();
  SetRenderOptions(0, 0);
  OffCamera(-5000, -5000);
  fillBackWithPict(7000, 640, 480);
  NewTitleScreenSprites();
  StartHint();
  DrawSprites();
  await GetFadeNormal();
  title.message = 0;
  await TitleLoop();
}

async function TitleLoop() {
  while (title.message === 0) {
    const start = TickCount();
    await HandleTitle();
    await untilTick(start + 1);
  }
  if (title.message === 1) {
    QuitHint();
  } else if (title.message === 2) {
    QuitHint();
    await OpenSelection(1);
  }
}

async function HandleTitle() {
  const start = TickCount();
  CustomLoop();
  CheckTitleKeyDown();
  if (GetSplit() === 0) HandleCamera(); else HandleCameraSplit();
  await HandleSprites();
  HandleSparks();
  DrawSprites();
  await nextFrame(start);
}

function CustomLoop() {
  // The added RESURREKTION letters are left out of the count, so kickers spawn as in the original.
  if (Rand(9000) > 8900 || GetNumSprites() - T.subtitle.length < 23) {
    if (Rand(2) === 0) NewFlyKicker(2); else NewFlyKicker(1);
  }
  // The credits hot spot (0,428)-(94,480) is not part of this build yet.
}

function CheckTitleKeyDown() {
  // Esc / Cmd-Q quit the original application; there is nothing to quit to in a browser.
  if (CheckKey(0x24) || CheckKey(0x4c)) title.message = 2;
  // The FIREMONKEY super-blood code is not part of this build yet.
}

export function NewTitleScreenSprites() {
  KillAllSprites();
  PlaySound(15);
  const h = T.start.frameH;
  NewSpriteFromCICN(T.start, setRect({}, 48, 480, 112, 480 + h), HandleStart);
  NewSpriteFromCICN(T.options, setRect({}, 208, 480, 272, 480 + h), HandleOptions);
  NewSpriteFromCICN(T.scores, setRect({}, 368, 480, 432, 480 + h), HandleScores);
  NewSpriteFromCICN(T.quit, setRect({}, 528, 480, 592, 480 + h), HandleQuit);
  NewCursorSprite();
  for (let i = 0; i < 15; i++) {
    NewSpriteFromCICN(T.letters[i], setRect({}, 304, 150, 336, 182), HandleLetter);
  }
  for (const t of T.subtitle) NewSpriteFromCICN(t, setRect({}, 304, 150, 336, 182), HandleLetter);
}

// ---- the four title buttons ----------------------------------------------------------------

function titleButton(s, onClick) {
  const m = GetMouse();
  if (s.action1 === 0) {
    offsetRect(s.rect, 0, -12);
    if (s.rect.top < 401) s.action1 = 1;
    return;
  }
  if (s.action1 === 1) {
    if (ptInRect(m.h, m.v, s.rect)) { s.action1 = 2; PlaySound(0x12); }
  } else if (s.action1 === 2) {
    if (!ptInRect(m.h, m.v, s.rect)) { s.action1 = 1; PlaySound(0x10); }
    else if (Button() && onClick) {
      s.action1 = 3;
      onClick(s.rect);
      PlaySound(1);
    }
  } else if (s.action1 === 3) {
    offsetRect(s.rect, s.vx, s.vy);
    s.vy += 1;
    if (!OnScreen(s, 1)) KillSprite(s);
  }
  s.frame = s.action1 - 1;
}

// A click sends two "swooshes" off the button: one right along its top edge (whose exit
// triggers the action) and one left along its bottom edge.
function newProj(r, proc) {
  NewSpriteFromCICN(T.projRight, { top: r.top, left: r.left, bottom: r.top + 8, right: r.right }, proc);
  NewSpriteFromCICN(T.projLeft, { top: r.bottom - 8, left: r.left, bottom: r.bottom, right: r.right }, HandleNotProj);
}

function moveProj(s) {
  if (s.dir === 0) offsetRect(s.rect, s.f42, 0);
  else if (s.dir === 1) offsetRect(s.rect, -s.f42, 0);
  return OnScreen(s, 1);
}

function HandleStart(s) { titleButton(s, (r) => newProj(r, HandleStartProj)); }
function HandleOptions(s) { titleButton(s, (r) => newProj(r, HandleOptionsProj)); }
function HandleScores(s) { titleButton(s, (r) => newProj(r, HandleScoresProj)); }
// Quit is not part of this build: the button highlights but ignores clicks.
function HandleQuit(s) { titleButton(s, null); }

function HandleStartProj(s) {
  if (!moveProj(s)) {
    KillSprite(s);
    SetGameMessage(2);
  }
}

async function HandleOptionsProj(s) {
  if (!moveProj(s)) {
    KillSprite(s);
    QuitHint();
    await OpenOptions();
  }
}

// The high score screen, then back to the title.
async function HandleScoresProj(s) {
  if (!moveProj(s)) {
    KillSprite(s);
    QuitHint();
    await DoHighScores();
    await Fade(0);
    NewTitleScreenSprites();
    fillBackWithPict(7000, 640, 480);
    StartHint();
    DrawSprites();
    await FadeBack(0);
  }
}

function HandleNotProj(s) {
  if (!moveProj(s)) KillSprite(s);
}

// ---- title letters and flying kickers ----------------------------------------------------------

function HandleLetter(s) {
  offsetRect(s.rect, s.vx, s.vy);
  if (Rand(2) !== 0) {
    if (s.rect.right + 16 < s.info[0]) s.vx += Rand1(2);
    if (s.info[0] < s.rect.right + 16) s.vx -= Rand1(2);
  }
  if (Rand(2) !== 0) {
    if (s.rect.top + 16 < s.info[1]) s.vy += Rand1(2);
    if (s.info[1] < s.rect.top + 16) s.vy -= Rand1(2);
  }
  if (s.f42 < s.vx) s.vx = s.f42;
  if (s.vx < -s.f42) s.vx = -s.f42;
  if (s.f42 + 1 < s.vy) s.vy = s.f42;
  if (s.vy < 1 - s.f42) s.vy = -s.f42;
  s.info[2] += 1;
  if (s.info[2] > 10) {
    s.f42 -= 1;
    if (s.f42 < 1) s.f42 = 1;
    s.info[2] = 0;
  }
}

// NewFlyKicker (kind 1: flying side kick, vx 10) / NewFlyKicker2 (kind 2: spin kick, vx 5).
function NewFlyKicker(kind) {
  const ch = Rand(12);
  const speed = kind === 1 ? 10 : 5;
  let r, vx;
  if (Rand(2) === 0) {
    Rand(2);
    const x = Rand(540);
    r = setRect({}, x, 480, x + 32, 512);
    vx = speed;
  } else if (Rand(2) === 0) {
    const y = Rand(305);
    r = setRect({}, 640, y + 75, 672, y + 107);
    vx = -speed;
  } else {
    const y = Rand(305);
    r = setRect({}, -32, y + 75, 0, y + 107);
    vx = speed;
  }
  const t = CHARS[ch];
  t.vy = -19;
  t.vx = vx;
  NewSpriteFromCICN(t, r, kind === 1 ? HandleFlyKicker : HandleFlyKicker2);
  t.vy = 0;
  t.vx = 0;
}

function HandleFlyKicker(s) {
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  s.dir = s.vx < 0 ? 1 : 0;
  s.frame = s.dir === 0 ? 0x38 : 0x39;
  if (s.rect.bottom > 480 || s.rect.left > 640 || s.rect.right < 0) KillSprite(s);
}

function HandleFlyKicker2(s) {
  offsetRect(s.rect, s.vx, s.vy);
  s.vy += 1;
  s.dir = s.vx < 0 ? 1 : 0;
  s.f56 += 1;
  if (s.f58 < s.f56) { s.frame += 1; s.f56 = 0; }
  if (s.dir === 0 && (s.frame < 0x24 || s.frame > 0x27)) s.frame = 0x24;
  if (s.dir === 1 && (s.frame < 0x28 || s.frame > 0x2b)) s.frame = 0x28;
  if (s.rect.bottom > 480 || s.rect.left > 640 || s.rect.right < 0) KillSprite(s);
}
