// In-fight HUD: life bars, round number and wins, timer, radar, scores, tutorial and hint box.

import { Rand, TickCount, copyRect, idiv, insetRect, offsetRect, setRect } from './mac.js';
import { bctx, copyBits, drawString, fillRect, foreColor, mapRGB16, pictCanvas, stringWidth } from './gfx.js';
import { GetSpriteAction2, GetSpriteRect, SetSpriteAction2, SetSpriteInfo } from './sprites.js';
import { GetNumPlayers, GetPlayMode, GetTimePref } from './state.js';
import { PlaySound } from './sound.js';
import { assets } from './assets.js';

const versusLayout = () => GetNumPlayers() === 1 || (GetNumPlayers() === 2 && GetPlayMode() === 0);

// ---- life ----------------------------------------------------------------------------------

export const hud = {
  life: [200, 200, 200, 200],
  lifeRects: [0, 1, 2, 3].map(() => ({ top: 0, left: 0, bottom: 0, right: 0 })),
  outlines: [0, 1, 2, 3].map(() => ({ top: 0, left: 0, bottom: 0, right: 0 })),
  drawLifeBars: 0,
  flash: 0,
  lowTick: 0,
  roundNum: 0,
  wins: [0, 0],
  winRects: [setRect({}, 202, 22, 210, 30), setRect({}, 191, 22, 199, 30), setRect({}, 622, 22, 630, 30), setRect({}, 611, 22, 619, 30)],
  timeRect: { top: 0, left: 0, bottom: 0, right: 0 },
  destTime: 0,
  roundTime: 0,
  drawTime: 0,
  radar: setRect({}, 288, 75, 352, 123),
  score: [0, 0, 0, 0],
  shown: [0, 0, 0, 0],
  scoreRects: [0, 1, 2, 3].map(() => ({ top: 0, left: 0, bottom: 0, right: 0 })),
  stray: 0, // the original's score[202] write lands in an unrelated global
  hintRect: setRect({}, -20, -20, -20, -20),
  hintOn: 0,
  hintIndex: 0,
  hintX: 445,
  hintTick: 0,
  tutorialRect: setRect({}, -20, -20, -20, -20),
  tutorialText: '',
};

const LIFE_BRIGHT = () => mapRGB16(0xffff, 0x08c2, 0x06a2);
const LIFE_DARK = () => mapRGB16(0x8000, 0, 0);

export function InitLife() {
  for (let i = 0; i < 4; i++) hud.life[i] = 200;
  const r = hud.lifeRects;
  if (versusLayout()) {
    setRect(r[0], 10, 10, 210, 17); setRect(r[1], 430, 10, 630, 17);
    setRect(r[2], 10, 27, 210, 34); setRect(r[3], 430, 27, 630, 34);
  } else {
    setRect(r[0], 10, 10, 210, 17); setRect(r[2], 430, 10, 630, 17);
    setRect(r[1], 10, 38, 210, 45); setRect(r[3], 430, 38, 630, 45);
  }
  for (let i = 0; i < 4; i++) {
    hud.outlines[i] = copyRect(r[i]);
    insetRect(hud.outlines[i], -2, -2);
  }
  hud.drawLifeBars = 1;
}

export function DontDrawLifeBars() {
  hud.drawLifeBars = 0;
}

export const GetDrawLifeBars = () => hud.drawLifeBars;
export const GetLife = (n) => hud.life[n];

export function DrawLifeBars() {
  if (!hud.drawLifeBars) return;
  hud.lifeRects[0].top = 10;
  const life = hud.life;
  let n;
  if (versusLayout()) {
    const low = (GetNumPlayers() === 1 && life[0] < 51) || (GetNumPlayers() === 2 && (life[0] < 50 || life[1] < 50));
    if (low && TickCount() - hud.lowTick > 30) {
      PlaySound(20);
      hud.lowTick = TickCount();
    }
    n = 2;
  } else {
    if ((life[0] < 50 || life[1] < 50) && TickCount() - hud.lowTick > 30) {
      PlaySound(20);
      hud.lowTick = TickCount();
    }
    n = 4;
  }
  const black = foreColor(0x21);
  for (let i = 0; i < n; i++) {
    fillRect(bctx, hud.outlines[i], black);
    let c = black;
    if (life[i] >= 51 || hud.flash) c = LIFE_DARK();
    fillRect(bctx, hud.lifeRects[i], c);
    c = life[i] < 51 && !hud.flash ? black : LIFE_BRIGHT();
    const r = hud.lifeRects[i];
    fillRect(bctx, { top: r.top, left: r.left, bottom: r.bottom, right: r.left + life[i] }, c);
  }
  hud.flash = hud.flash === 0 ? 1 : 0;
}

// DoDamage(victim, damage, attacker): no damage in practice mode; points double on a victim
// already reeling (action2 5).
export function DoDamage(victim, dmg, attacker) {
  PlaySound(Rand(5) + 3);
  if (GetPlayMode() !== 1) {
    hud.life[victim] -= dmg;
    if (hud.life[victim] < 1) {
      if (GetSpriteAction2(victim) !== 0x11) {
        SetSpriteAction2(victim, 0x11);
        SetSpriteInfo(victim, 9, 0);
      }
      hud.life[victim] = 0;
    }
    if (hud.life[victim] > 199) hud.life[victim] = 200;
  }
  if (GetSpriteAction2(victim) !== 0x11 && dmg > 0) {
    ChangeScore(attacker, dmg);
    if (GetSpriteAction2(victim) === 5) ChangeScore(attacker, dmg);
  }
}

// ---- scores ---------------------------------------------------------------------------------

export function ChangeScore(n, d) {
  if (n === -1) return;
  if (n >= 0 && n < 4) hud.score[n] += d;
  else hud.stray += d; // e.g. Speedy's scorch fire passes its sprite type (202) as the attacker
}

// ClearOpponentScores: the CPU side's score starts again for each Tournament fight.
export function ClearOpponentScores() {
  if (GetNumPlayers() === 1) {
    hud.score[1] = 0;
    hud.shown[1] = 0;
  } else {
    hud.score[2] = 0; hud.shown[2] = 0;
    hud.score[3] = 0; hud.shown[3] = 0;
  }
}

export const GetScore = (n) => hud.score[n];
export function FullLife(n) { hud.life[n] = 200; }

export function AddPointsForLife() {
  for (let i = 0; i < GetNumPlayers(); i++) ChangeScore(i, hud.life[i]);
}

export function InitScores() {
  for (let i = 0; i < 4; i++) { hud.score[i] = 0; hud.shown[i] = 0; }
  const r = hud.scoreRects;
  if (versusLayout()) {
    setRect(r[0], 15, 22, 105, 33); setRect(r[1], 435, 22, 525, 33);
  } else {
    setRect(r[0], 15, 22, 105, 33); setRect(r[2], 435, 22, 525, 33);
    setRect(r[1], 15, 50, 105, 61); setRect(r[3], 435, 50, 525, 61);
  }
}

export function DrawScores() {
  const n = versusLayout() ? 2 : 4;
  if (!hud.drawLifeBars) return;
  for (let i = 0; i < n; i++) {
    if (hud.shown[i] < hud.score[i]) hud.shown[i]++;
    if (hud.score[i] < hud.shown[i]) hud.shown[i]--;
    const r = hud.scoreRects[i];
    insetRect(r, -1, -1);
    fillRect(bctx, r, foreColor(0xcd));
    insetRect(r, 1, 1);
    fillRect(bctx, r, foreColor(0x21));
    const s = String(hud.shown[i]);
    drawString(bctx, r.right - 2 - stringWidth(s, 9), r.top + 9, s, 9, foreColor(0xcd));
  }
}

// ---- rounds ---------------------------------------------------------------------------------

export function InitRoundData() {
  hud.roundNum = 0;
  hud.wins[0] = 0;
  hud.wins[1] = 0;
}

export const GetRoundNum = () => hud.roundNum;
export function IncreaseRoundNum() { hud.roundNum++; }

// AddWin(deadNum): the win goes to the other side.
export function AddWin(num) {
  let side;
  if (GetNumPlayers() === 1) side = num === 1 ? 0 : 1;
  else if (GetPlayMode() === 0) side = num === 1 ? 0 : 1;
  else side = num === 2 || num === 3 ? 0 : 1;
  hud.wins[side]++;
}

export function CheckWin() {
  return hud.wins[0] < 2 && hud.wins[1] < 2 ? 0 : 1;
}

export function DrawRoundStuff() {
  if (!hud.drawLifeBars) return;
  const digits = pictCanvas(152, 96, 32, false);
  copyBits(bctx, digits, { left: hud.roundNum * 32, top: 0, right: hud.roundNum * 32 + 32, bottom: 32 },
    setRect({}, 304, 8, 336, 40));
  const team = GetNumPlayers() === 2 && GetPlayMode() !== 0;
  if (team) for (const r of hud.winRects) offsetRect(r, 0, 28);
  const acorn = pictCanvas(153, 8, 8, true);
  const src = { left: 0, top: 0, right: 8, bottom: 8 };
  if (hud.wins[0] > 0) copyBits(bctx, acorn, src, hud.winRects[0]);
  if (hud.wins[0] > 1) copyBits(bctx, acorn, src, hud.winRects[1]);
  if (hud.wins[1] > 0) copyBits(bctx, acorn, src, hud.winRects[2]);
  if (hud.wins[1] > 1) copyBits(bctx, acorn, src, hud.winRects[3]);
  if (team) for (const r of hud.winRects) offsetRect(r, 0, -28);
}

// ---- timer ----------------------------------------------------------------------------------

export function SetRoundTime(pref) {
  if (pref === 0) hud.roundTime = 1800;
  if (pref === 1) hud.roundTime = 3600;
  if (pref === 2) hud.roundTime = 5400;
  if (pref === 3) hud.roundTime = -666;
}

export function InitTime() {
  setRect(hud.timeRect, 300, 50, 340, 65);
  SetRoundTime(GetTimePref());
  hud.destTime = hud.roundTime + TickCount();
  hud.drawTime = 1;
}

export function SetDrawTime(v) { hud.drawTime = v; }
export function AddToDestTime(t) { hud.destTime += t; }

export function DrawTime() {
  if (!hud.drawLifeBars || !hud.drawTime) return;
  let text;
  if (hud.roundTime === -666) {
    text = '- --';
  } else {
    const left = hud.destTime - TickCount();
    if (left < 1) {
      if (GetPlayMode() !== 1) {
        if (versusLayout()) {
          if (hud.life[0] < hud.life[1]) SetSpriteAction2(0, 0x11);
          else if (hud.life[1] < hud.life[0]) SetSpriteAction2(1, 0x11);
        } else if (hud.life[0] + hud.life[1] < hud.life[2] + hud.life[3]) {
          SetSpriteAction2(0, 0x11);
          SetSpriteAction2(1, 0x11);
        } else if (hud.life[2] + hud.life[3] < hud.life[0] + hud.life[1]) {
          SetSpriteAction2(2, 0x11);
          SetSpriteAction2(3, 0x11);
        }
      }
      text = '0:00';
    } else {
      const secs = idiv(left, 60);
      text = idiv(secs, 60) + ':' + (secs % 60 < 10 ? '0' : '') + (secs - idiv(secs, 60) * 60);
    }
  }
  const r = hud.timeRect;
  insetRect(r, -2, -2);
  fillRect(bctx, r, foreColor(0xcd));
  insetRect(r, 2, 2);
  fillRect(bctx, r, foreColor(0x21));
  drawString(bctx, r.left + 8, r.top + 12, text, 10, foreColor(0xcd));
}

// ---- radar ----------------------------------------------------------------------------------

export function InitRadar() {
  setRect(hud.radar, 288, 75, 352, 123);
}

function radarDot(n, color) {
  const a = GetSpriteRect(n);
  const h = idiv(a.left + 16, 16), v = idiv(a.top + 16, 16);
  if (GetSpriteAction2(n) !== 0x11) fillRect(bctx, setRect({}, h + 287, v + 74, h + 289, v + 76), foreColor(color));
}

export function DrawRadar() {
  if (!hud.drawLifeBars) return;
  const r = hud.radar;
  insetRect(r, -1, -1);
  fillRect(bctx, r, foreColor(0xcd));
  insetRect(r, 1, 1);
  fillRect(bctx, r, foreColor(0x21));
  radarDot(0, 0xcd);
  radarDot(1, 0x45);
  if ((GetNumPlayers() !== 2 || GetPlayMode() !== 0) && GetNumPlayers() !== 1) {
    radarDot(2, 0x199);
    radarDot(3, 0x155);
  }
}

// ---- tutorial (practice mode) and the hint ticker -----------------------------------------------

export function BlankOutTutorial() {
  setRect(hud.tutorialRect, -20, -20, -20, -20);
}

export function DrawTutorial() {
  if (!hud.drawLifeBars || GetPlayMode() !== 1) return;
  const r = hud.tutorialRect;
  insetRect(r, -1, -1);
  fillRect(bctx, r, foreColor(0xcd));
  insetRect(r, 1, 1);
  fillRect(bctx, r, foreColor(0x21));
  drawString(bctx, r.left + 5, r.top + 11, hud.tutorialText, 10, foreColor(0xcd));
}

const hintString = (i) => assets.text['STR#']['130'][i];

export function StartHint() {
  setRect(hud.hintRect, 115, 460, 445, 476);
  hud.hintTick = TickCount();
  hud.hintIndex = 0;
  hud.hintX = 445;
  hud.hintOn = 1;
}

export function QuitHint() {
  setRect(hud.hintRect, -20, -20, -20, -20);
  hud.hintOn = 0;
}

export function SuperBloodHint(on) {
  hud.hintIndex = on ? 15 : 16;
  hud.hintX = 445;
  hud.hintTick = TickCount();
}

export function DrawHint() {
  if (!hud.hintOn) return;
  const r = hud.hintRect;
  insetRect(r, -1, -1);
  fillRect(bctx, r, foreColor(0xcd));
  insetRect(r, 1, 1);
  fillRect(bctx, r, foreColor(0x21));
  const bold = hud.hintIndex === 16 || hud.hintIndex === 15;
  const s = hintString(hud.hintIndex);
  bctx.save();
  bctx.beginPath();
  bctx.rect(r.left, r.top, r.right - r.left, r.bottom - r.top);
  bctx.clip();
  drawString(bctx, hud.hintX, r.top + 11, s, 10, foreColor(0xcd), bold);
  bctx.restore();
  hud.hintX -= 2;
  if (hud.hintX + stringWidth(s, 10, bold) < r.left) {
    hud.hintIndex++;
    if (hud.hintIndex > 14) hud.hintIndex = 0;
    hud.hintX = 445;
    hud.hintTick = TickCount();
  }
}
