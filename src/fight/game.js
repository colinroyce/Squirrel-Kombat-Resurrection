// The fight: CreatePlayers, the round banner, Run (the main loop), keyboard handling with the
// special-move recorder, pause, and what happens when a fighter dies.

import { Rand, TickCount, setRect, untilTick } from '../mac.js';
import { drawPicture, sctx } from '../gfx.js';
import { CheckKey, FlushEvents, GetNextEvent } from '../input.js';
import { DoHandleCamera, GetVisRect, HandleCameras, SetCameraUp, SetCameraUp2, SetRenderOptions } from '../camera.js';
import {
  DrawSprites, GetSpriteAction1, GetSpriteAction2, GetSpriteDirection, GetSpriteInUse, GetSpriteInfo,
  GetSpritePicID, GetSpriteRect, HandleSprites, KillAllSprites, KillSprite, NewSpriteFromCICN,
  NewSpriteFromPICT, SetSpriteAction1, SetSpriteAction2, SetSpriteDirection, SetSpriteFrame, SetSpriteInfo,
  SetSpritePath,
} from '../sprites.js';
import { HandleSparks } from '../sparks.js';
import { PlaySound } from '../sound.js';
import {
  AddPointsForLife, AddToDestTime, AddWin, CheckWin, DontDrawLifeBars, GetRoundNum, IncreaseRoundNum,
  InitLife, InitTime, SetDrawTime,
} from '../hud.js';
import { Fade, FadeBack } from '../fade.js';
import { CHARS, T } from '../templates.js';
import { KeepSpriteOnScreen, OnScreen, nextFrame, uncappedFrame } from '../common.js';
import { GetChosenChar, GetKey, GetNumPlayers, GetPlayMode, GetScene } from '../state.js';
import { OnSurface, PartnerOfMe } from './player.js';
import { HandleEd, HandleSpeedy, NewFireBall, NewPurpleBeam, NewSpin3Ball } from './chars.js';
import { ForestRun, NewSceneSprites } from './forest.js';
import { TundraRun } from './tundra.js';
import { CityRun } from './city.js';

export const fight = { quit: 0, goToSelection: 0 };
export const percents = { p0: 0, p1: 0, p2: 0, p4: 0 };

export function SetPercents(a, b, c, d) {
  percents.p0 = a;
  percents.p1 = a + b;
  percents.p2 = a + b + c;
  percents.p4 = d;
}

export function Quit() { fight.quit = 1; }
export function SetGoToSelection(v) { fight.goToSelection = v; }

const PROCS = [HandleEd, HandleSpeedy];

// ---- players -------------------------------------------------------------------------------

export function CreatePlayers() {
  const r0 = setRect({}, 410, 736, 442, 768);
  const r1 = setRect({}, 582, 736, 614, 768);
  const c0 = GetChosenChar(0);
  NewSpriteFromCICN(CHARS[c0], r0, PROCS[c0]);
  SetSpriteInfo(0, 1, 1);
  SetSpriteFrame(0, 0);
  SetSpriteDirection(0, 0);
  if (GetNumPlayers() === 1 || (GetNumPlayers() === 2 && GetPlayMode() === 0)) {
    // practice mode's dummy (type 500) is not part of this build yet
    const c1 = GetChosenChar(1);
    NewSpriteFromCICN(CHARS[c1], r1, PROCS[c1]);
    SetSpriteInfo(1, 1, 0);
    SetSpriteFrame(1, 5);
    SetSpriteDirection(1, 1);
  }
}

// ---- the round banner ---------------------------------------------------------------------

function HandleRound(s) {
  if (s.rect.left + 0x58 < s.info[0]) {
    s.rect.left += 32; s.rect.right += 32;
  } else if (s.info[0] < s.rect.left + 0x58 && s.info[1] < 0x28) {
    s.info[1] += 1;
  } else {
    s.rect.left += 32; s.rect.right += 32;
    if (!OnScreen(s, 1)) KillSprite(s);
  }
}

export async function DoRoundAnimation() {
  T.roundBanner.frame = GetRoundNum();
  const v = GetVisRect();
  T.roundBanner.info[0] = v.left + 0x141;
  const n = NewSpriteFromPICT(T.roundBanner, setRect({}, v.left - 0xaf, v.bottom - 0x10a, v.left + 1, v.bottom - 0xd6), HandleRound);
  await HandleSprites();
  await FadeBack(0);
  while (GetSpriteInUse(n)) {
    DrawSprites();
    await HandleSprites();
    await uncappedFrame();
  }
  if (GetPlayMode() !== 1) InitTime();
}

// ---- Run --------------------------------------------------------------------------------------

function MyRun() {
  if (GetScene() === 0) ForestRun();
  if (GetScene() === 2) TundraRun();
  if (GetScene() === 4) CityRun();
}

export async function Run() {
  fight.quit = 0;
  while (fight.quit === 0) {
    const start = TickCount();
    await CheckKeyDown();
    MyRun();
    HandleCameras();
    await HandleSprites();
    HandleSparks();
    DrawSprites();
    await nextFrame(start);
  }
}

// ---- special-move key recorder ------------------------------------------------------------------

const rec = { ring: [-1, -1, -1, -1, -1], idx: 0, last: -1 };

function ClearPattern1() {
  rec.ring.fill(-1);
  rec.idx = 0;
}

export function InitKeyRecorder() {
  ClearPattern1();
  rec.last = -1;
}

function RecordKey1(k) {
  if (k !== rec.last) {
    rec.ring[rec.idx] = k;
    rec.idx += 1;
    rec.last = k;
    if (rec.idx > 4) rec.idx = 0;
  }
}

// Does the pattern appear in the ring, starting at any of its 5 positions (wrapping)?
function CheckPattern1(...pat) {
  for (let start = 0; start < 5; start++) {
    let ok = true;
    for (let i = 0; i < pat.length; i++) {
      if (rec.ring[(start + i) % 5] !== pat[i]) { ok = false; break; }
    }
    if (ok) return 1;
  }
  return 0;
}

function CheckMoves1() {
  const r = GetSpriteRect(0);
  const a2 = () => GetSpriteAction2(0);
  const ch = GetChosenChar(0);
  if (ch === 0) {
    if (CheckPattern1(3, 4, 3, 5)) {
      ClearPattern1();
      if (a2() !== 5) { SetSpriteAction2(0, 0xd); SetSpriteInfo(0, 5, 0); SetSpriteInfo(0, 7, 0); }
    } else if (CheckPattern1(0, 0, 2, 5) || CheckPattern1(2, 2, 0, 5)) {
      ClearPattern1();
      if (a2() !== 5) { SetSpriteAction2(0, 0xe); SetSpriteInfo(0, 5, 0); }
    } else if (CheckPattern1(0, 3, 2, 4, 2) || CheckPattern1(2, 3, 0, 4, 0)) {
      ClearPattern1();
      if (a2() !== 5) { SetSpriteAction2(0, 0xf); NewPurpleBeam(r, GetSpriteInfo(0, 1), 0, 0); }
    } else if (CheckPattern1(2, 2, 3, 3) || CheckPattern1(0, 0, 3, 3)) {
      ClearPattern1();
      if (a2() !== 5) { SetSpriteAction2(0, 0x10); NewSpin3Ball(r, GetSpriteInfo(0, 1), 0, 0); }
    }
  } else if (ch === 1) {
    const free = () => a2() !== 5 && a2() !== 0xd && a2() !== 0xe && a2() !== 0xf;
    if (CheckPattern1(0, 2, 3) || CheckPattern1(2, 0, 3)) {
      ClearPattern1();
      if (free()) { SetSpriteAction2(0, 0xd); SetSpriteInfo(0, 5, 0); }
    } else if (CheckPattern1(0, 0, 2, 4) || CheckPattern1(2, 2, 0, 4)) {
      ClearPattern1();
      if (free()) { SetSpriteAction2(0, 0xe); SetSpriteInfo(0, 5, 0); }
    } else if (CheckPattern1(0, 5, 0, 2, 4) || CheckPattern1(2, 5, 2, 0, 4)) {
      ClearPattern1();
      if (free()) { SetSpriteAction2(0, 0xf); SetSpriteInfo(0, 5, 0); }
    } else if (CheckPattern1(0, 0, 2, 2, 6) || CheckPattern1(2, 2, 0, 0, 6)) {
      ClearPattern1();
      if (free()) NewFireBall(r, GetSpriteInfo(0, 1), 0, GetSpriteDirection(0));
    }
  }
}

// ---- keyboard ---------------------------------------------------------------------------------

async function WaitPause() {
  FlushEvents();
  for (;;) {
    const e = GetNextEvent();
    if (e && ((e.what === 3 && (CheckKey(0x71) || CheckKey(0x23))) || e.what === 1)) break;
    await untilTick(TickCount() + 1);
  }
  FlushEvents();
  while (CheckKey(0x71) || CheckKey(0x23)) await untilTick(TickCount() + 1);
}

async function CheckKeyDown() {
  const r0 = GetSpriteRect(0);
  // Cmd-Q quits the original application; there is nothing to quit to in a browser.
  if (CheckKey(0x35)) { Quit(); SetGoToSelection(1); }
  if (CheckKey(0x71) || CheckKey(0x23)) {
    drawPicture(sctx, 9000, setRect({}, 0xf0, 0xda, 400, 0x107));
    const t = TickCount();
    await WaitPause();
    AddToDestTime(TickCount() - t);
  }
  const a2 = () => GetSpriteAction2(0);
  const ch = GetChosenChar(0);
  if (a2() !== 0x11 && (ch !== 4 || a2() !== 0xd) && GetSpriteAction1(0) !== 0x12) {
    let pressed = 0;
    if (CheckKey(GetKey(1))) { // jump
      const a = a2();
      if (a !== 3 && a !== 5 && a !== 9 && a !== 0xb && a !== 0xc && (OnSurface(r0, 0) || a2() === 0x13)) {
        if (a2() === 7) {
          PlaySound(Rand(7) + 8);
          SetSpriteAction2(0, 9);
          SetSpriteInfo(0, 3, 0);
          SetSpriteInfo(0, 4, 0);
          SetSpritePath(0, 0, 0);
        } else if (a2() === 2) {
          PlaySound(2);
          SetSpriteAction2(0, 3);
          SetSpritePath(0, 0, -0x11);
        } else if (a2() === 0xe && ch === 9) {
          SetSpriteAction2(0, 2);
        } else if (a2() === 0x13) {
          SetSpriteAction1(0, 0x15);
        }
      }
      pressed = 1;
      RecordKey1(1);
    }
    if (CheckKey(GetKey(0)) && GetSpriteAction1(0) !== 0x12) { // left: walk, or turn first
      if (GetSpriteDirection(0) === 1) SetSpriteAction1(0, 1);
      else SetSpriteDirection(0, 1);
      pressed = 1;
      RecordKey1(0);
    }
    if (CheckKey(GetKey(2)) && GetSpriteAction1(10) !== 0x12) { // right (the original checks slot 10)
      if (GetSpriteDirection(0) === 0) SetSpriteAction1(0, 1);
      else SetSpriteDirection(0, 0);
      SetSpriteAction1(0, 1);
      pressed = 1;
      RecordKey1(2);
    }
    if (CheckKey(GetKey(3))) { // punch; during an uppercut: throw
      if (a2() === 2) SetSpriteAction2(0, 4);
      else if (a2() === 7) SetSpriteAction2(0, 10);
      else if (a2() === 0x13) SetSpriteAction1(0, 0x14);
      else if (a2() === 0xe && ch === 9) SetSpriteAction2(0, 2);
      pressed = 1;
      RecordKey1(3);
    }
    if (CheckKey(GetKey(4))) { // kick; in the air: flying side kick
      if (a2() === 2) SetSpriteAction2(0, 6);
      else if (a2() === 3) { SetSpriteAction2(0, 0xb); PlaySound(Rand(7) + 8); }
      else if (a2() === 0x13) SetSpriteAction2(0, 2);
      else if (a2() === 0xe && ch === 9) SetSpriteAction2(0, 2);
      pressed = 1;
      RecordKey1(4);
    }
    if (CheckKey(GetKey(5))) { // uppercut
      if (a2() === 2) SetSpriteAction2(0, 7);
      else if (a2() === 0x13) SetSpriteAction2(0, 2);
      else if (a2() === 0xe && ch === 9) SetSpriteAction2(0, 2);
      pressed = 1;
      RecordKey1(5);
    }
    if (CheckKey(GetKey(6))) { // spin kick; in the air: jump spin kick
      if (a2() === 2) SetSpriteAction2(0, 8);
      else if (a2() === 3) { SetSpriteAction2(0, 0xc); PlaySound(Rand(7) + 8); }
      else if (a2() === 0x13) SetSpriteAction2(0, 2);
      else if (a2() === 0xe && ch === 9) SetSpriteAction2(0, 2);
      pressed = 1;
      RecordKey1(6);
    }
    if (!pressed) rec.last = -1;
    CheckMoves1();
  }
  // Player 2's keys (two humans) are not part of this build yet.
}

// ---- a fighter dies -------------------------------------------------------------------------------

export async function HandleDeadPlayer(s) {
  s.info[6] += 1;
  s.doDraw = 1;
  s.f60 = 0;
  s.info[7] -= 1;
  if (s.info[7] < 1 || s.action2 === 5) s.action1 = 2;
  s.rect.left += s.vx; s.rect.right += s.vx; s.rect.top += s.vy; s.rect.bottom += s.vy;
  s.vy += 1;
  if (s.rect.right > 0x400 || s.rect.left < 0) s.vx = Math.trunc(s.vx * -0.75);
  KeepSpriteOnScreen(s);
  if (OnSurface(s.rect, s.num)) {
    s.vy = Math.trunc(s.vy * -0.5);
    s.info[2] = 1;
    if (Math.abs(s.vy) < 2) { s.vx = 0; s.vy = 0; }
  }
  s.frame = s.dir === 0 ? 0x3a : 0x3b;
  const versus = GetNumPlayers() === 1 || (GetNumPlayers() === 2 && GetPlayMode() === 0);
  if (!versus) {
    if (!(GetNumPlayers() === 2 && GetPlayMode() !== 0 && GetSpriteAction2(PartnerOfMe(s.num)) === 0x11)) s.info[6] = -1;
  }
  if (s.info[6] < 0x65) return;
  if (!versus) {
    if (GetNumPlayers() !== 2 || GetPlayMode() === 0 || GetSpriteAction2(PartnerOfMe(s.num)) !== 0x11) return;
  }
  AddWin(s.num);
  if (CheckWin() === 0) {
    await Fade(0);
    SetDrawTime(0);
    IncreaseRoundNum();
    SetRenderOptions(1, 1);
    KillAllSprites();
    CreatePlayers();
    SetCameraUp(0, GetSpritePicID(0), 32);
    if (GetNumPlayers() === 2) SetCameraUp2(1, GetSpritePicID(1), 32);
    if (GetNumPlayers() === 1) SetRenderOptions(1, 0);
    AddPointsForLife();
    DoHandleCamera();
    HandleCameras();
    InitLife();
    NewSceneSprites();
    DrawSprites();
    InitKeyRecorder();
    await DoRoundAnimation();
    await Run();
  } else {
    AddPointsForLife();
    if (GetPlayMode() === 0 || GetPlayMode() === 3) {
      DontDrawLifeBars();
      Quit();
      SetGoToSelection(1);
    }
    // Tournament endings (ladder, win screen, high scores) are not part of this build yet.
  }
}
