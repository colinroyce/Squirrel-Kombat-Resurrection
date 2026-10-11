// Character selection (OpenSelection / RunSelection) and the start of a fight.

import { Rand, TickCount, insetRect, offsetRect, ptInRect, setRect } from '../mac.js';
import { fillBackWithPict } from '../gfx.js';
import { Button, CheckKey, GetMouse } from '../input.js';
import {
  DoHandleCamera, DontHandleCamera, GetSplit, HandleCamera, HandleCameraSplit, HandleCameras, OffCamera,
  SetCameraUp, SetCameraUp2, SetRenderOptions,
} from '../camera.js';
import {
  DrawSprites, GetSpritePicID, HandleSprites, KillAllSprites, KillSpriteByNumber, NewSpriteFromCICN,
  NewSpriteFromCICNSpecial, NewSpriteFromPICT, SetSpriteAction1, SetSpriteFrame, SetSpriteRect,
} from '../sprites.js';
import { HandleSparks, MakeSparks } from '../sparks.js';
import { PlaySound } from '../sound.js';
import { BlankOutTutorial, DontDrawLifeBars, InitLife, InitRoundData, InitScores, SetDrawTime } from '../hud.js';
import { Fade, FadeBack } from '../fade.js';
import { T } from '../templates.js';
import { DoNothing, KillSpriteControls, NewCursorSprite, nextFrame } from '../common.js';
import { ChooseRandomScene, GetDiffPref, GetKey, GetNumPlayers, GetPlayMode, STAGED_CHARS, SetPlayMode, sel } from '../state.js';
import { OpenSceneSelector } from './scene.js';
import { InitTournament, OpenTournamentScreen } from './tournament.js';
import { DoTitle } from './title.js';
import { CreatePlayers, DoRoundAnimation, InitKeyRecorder, Run, SetPercents, fight } from '../fight/game.js';
import { InitScene } from '../fight/forest.js';

const S = { done: 0, result: 0, lastChange: 0, hovered: -1, charRects: [] };

export function InitSelectionData() {
  sel.chosen = [0, 0, 0, 0];
  sel.playMode = 2;
  sel.numPlayers = 1;
  const r = setRect({}, 163, 194, 195, 226);
  for (let i = 0; i < 5; i++) { S.charRects[i] = { ...r }; offsetRect(r, 70, 0); }
  setRect(r, 114, 286, 146, 318);
  for (let i = 5; i < 11; i++) { S.charRects[i] = { ...r }; offsetRect(r, 70, 0); }
  S.charRects[11] = setRect({}, 272, 378, 304, 410);
}

// CheckChars: whether a fighter can be picked (the original limits the shareware build the same way).
function CheckChars(c) {
  return STAGED_CHARS.includes(c);
}

function ChooseChar(p, c) {
  sel.chosen[p] = c;
  const r = { ...S.charRects[c] };
  insetRect(r, -2, -2);
  r.top -= 4;
  SetSpriteRect(p + 7, r);
  SetSpriteFrame(p + 9, c);
}

// Play modes built so far.
const modeBuilt = (m) => m === 0 || m === 1 || m === 2;

export async function OpenSelection() {
  await Fade(0);
  DontDrawLifeBars();
  SetRenderOptions(0, 0);
  OffCamera(-5000, -5000);
  fillBackWithPict(4000, 640, 480);
  KillAllSprites();
  DontHandleCamera();
  NewSelectionScreenSprites();
  ChooseChar(0, sel.chosen[0]);
  ChooseChar(1, sel.chosen[1]);
  DrawSprites();
  S.done = 0;
  if (sel.numChars === 12) CreateSecretSelector(S.charRects[11]);
  await FadeBack(0);
  PlaySound(15);
  if (!CheckChars(sel.chosen[0])) ChooseChar(0, 0);
  if (!CheckChars(sel.chosen[1])) ChooseChar(1, 0);
  await RunSelection();
  if (S.result === 1) {
    await KillSpriteControls();
    if (GetPlayMode() === 2) {
      await Fade(0);
      InitTournament();
      await OpenTournamentScreen();
      ChooseRandomScene();
    } else {
      await OpenSceneSelector();
    }
    await Fade(0);
    SetDrawTime(0);
    BlankOutTutorial();
    SetRenderOptions(1, 1);
    KillAllSprites();
    if (GetNumPlayers() === 1 && GetPlayMode() === 0) {
      // SetCharRand(1): Rand(numChars), limited to the fighters built so far
      const pool = STAGED_CHARS.filter((c) => c < sel.numChars);
      sel.chosen[1] = pool[Rand(pool.length)];
    }
    CreatePlayers();
    SetCameraUp(0, GetSpritePicID(0), 32);
    if (GetNumPlayers() === 2) SetCameraUp2(1, GetSpritePicID(1), 32);
    if (GetNumPlayers() === 1) SetRenderOptions(1, 0);
    DoHandleCamera();
    HandleCameras();
    InitLife();
    InitRoundData();
    const d = GetDiffPref();
    if (d === 0) SetPercents(25, 25, 50, 75);
    if (d === 1) SetPercents(30, 25, 45, 50);
    if (d === 2) SetPercents(50, 20, 30, 30);
    InitScene();
    InitScores();
    DrawSprites();
    InitKeyRecorder();
    await DoRoundAnimation();
    await Run();
    if (fight.goToSelection !== 0x29a) {
      if (fight.goToSelection === 0) {
        await Fade(0);
        await DoTitle(1);
      } else {
        await OpenSelection();
      }
    }
  } else if (S.result !== 0x29a) {
    await KillSpriteControls();
    await Fade(0);
    await DoTitle(1);
  }
}

async function RunSelection() {
  while (S.done === 0) {
    const start = TickCount();
    CheckSelectionKeyDown();
    if (GetSplit() === 0) HandleCamera(); else HandleCameraSplit();
    await HandleSprites();
    HandleSparks();
    DrawSprites();
    await nextFrame(start);
  }
}

function setMessage(m) {
  if (m === 1 && !modeBuilt(GetPlayMode())) return; // two-on-two: not built yet
  S.done = 1;
  S.result = m;
}

function cycle(p, step) {
  do {
    sel.chosen[p] += step;
    if (sel.chosen[p] < 0) sel.chosen[p] = sel.numChars - 1;
    if (sel.chosen[p] >= sel.numChars) sel.chosen[p] = 0;
  } while (!CheckChars(sel.chosen[p]));
  ChooseChar(p, sel.chosen[p]);
  S.lastChange = TickCount();
  PlaySound(0x12);
}

function CheckSelectionKeyDown() {
  if (Button() && GetNumPlayers() === 1) {
    const m = GetMouse();
    for (let i = 0; i < sel.numChars; i++) {
      if (S.hovered === i) continue;
      const r = S.charRects[i];
      const below = { ...r };
      offsetRect(below, 0, 30);
      if ((ptInRect(m.h, m.v, r) || ptInRect(m.h, m.v, below)) && CheckChars(i)) {
        ChooseChar(0, i);
        PlaySound(0x12);
        S.hovered = i;
      }
    }
  }
  if (TickCount() - S.lastChange > 10) {
    if (CheckKey(0x24) || CheckKey(0x4c)) {
      if (modeBuilt(GetPlayMode())) { setMessage(1); SetSpriteFrame(0, 2); DrawSprites(); }
    }
    if (CheckKey(0x35)) { setMessage(0); SetSpriteFrame(1, 2); DrawSprites(); }
    if (CheckKey(GetKey(0))) cycle(0, -1);
    if (CheckKey(GetKey(2))) cycle(0, 1);
    if (GetNumPlayers() === 2) {
      if (CheckKey(GetKey(7))) cycle(1, -1);
      if (CheckKey(GetKey(9))) cycle(1, 1);
    }
    // The original's secret-character key code (left, jump, right, punch, uppercut, spin as the
    // first six keys) is left out on purpose: Military Muskrat is unlocked by winning the
    // Tournament instead (an addition, see CreateSecretSelector).
  }
}

// CreateSecretSelector: Military Muskrat's portrait (preview template, frame 11) in the 12th
// spot, in slot 50, with a burst of sparks. The sparks use colour 2 and are made while the
// camera is off (OffCamera −5000), so MakeSparks drops them as off screen, as in the original.
// Not in the original: the original shows this after the secret key code; here it shows once
// Military Muskrat is unlocked by winning the Tournament (not built yet), or with ?debug.
function CreateSecretSelector(r) {
  for (const d of [3, 2, 0, 1]) MakeSparks(r.left + 0x10, r.top + 0x10, d, 10, 0x14, 7, 2, 0, 2, 2);
  T.previewP1.frame = 0xb;
  NewSpriteFromCICNSpecial(T.previewP1, r, DoNothing, 0x32);
  T.previewP1.frame = 0;
}

function NewSelectionScreenSprites() {
  NewSpriteFromPICT(T.ok, setRect({}, 508, 479, 608, 511), HandleSelectionOk);
  NewSpriteFromPICT(T.cancel, setRect({}, 32, 479, 132, 511), HandleSelectionCancel);
  const one = NewSpriteFromCICN(T.onePlayer, setRect({}, 32, -49, 82, 1), HandleOnePlayer);
  SetSpriteAction1(one, GetNumPlayers());
  SetSpriteFrame(one, GetNumPlayers() === 1 ? 1 : 0);
  const mr = setRect({}, 508, -31, 608, 1);
  NewSpriteFromPICT(T.modeOneOnOne, mr, HandlePlayModeButton);
  NewSpriteFromPICT(T.modePractice, mr, HandlePlayModeButton);
  NewSpriteFromPICT(T.modeTournament, mr, HandlePlayModeButton);
  if (GetNumPlayers() === 2) NewSpriteFromPICT(T.modeTwoOnTwo, mr, HandlePlayModeButton);
  else NewSpriteFromPICT(T.ok, mr, HandleSelectionOk); // placeholder slot, removed below
  SetSpriteAction1(GetPlayMode() + 3, 2);
  SetSpriteFrame(GetPlayMode() + 3, 1);
  NewSpriteFromCICN(T.frameP1, setRect({}, 0, 0, 36, 40), HandleCharSelection);
  ChooseChar(0, sel.chosen[0]);
  if (GetNumPlayers() === 2) NewSpriteFromCICN(T.frameP2, setRect({}, 0, 0, 36, 40), HandleCharSelection);
  else NewSpriteFromPICT(T.ok, mr, HandleSelectionOk); // placeholder slot, removed below
  NewSpriteFromCICN(T.previewP1, setRect({}, 272, 16, 304, 48), HandleSelectedChar1);
  if (GetNumPlayers() === 2) {
    NewSpriteFromCICN(T.previewP2, setRect({}, 336, 16, 368, 48), HandleSelectedChar2);
    ChooseChar(1, sel.chosen[1]);
  } else {
    KillSpriteByNumber(6);
    KillSpriteByNumber(8);
  }
  NewCursorSprite();
  const two = NewSpriteFromCICNSpecial(T.twoPlayers, setRect({}, 90, -49, 140, 1), HandleTwoPlayers, 198);
  SetSpriteAction1(two, GetNumPlayers());
  SetSpriteFrame(two, GetNumPlayers() === 1 ? 0 : 1);
}

function okCancel(m) {
  return (s) => {
    if (s.rect.top < 417) {
      s.frame = 0;
      const p = GetMouse();
      if (ptInRect(p.h, p.v, s.rect)) {
        s.frame = 1;
        if (Button() && (m !== 1 || modeBuilt(GetPlayMode()))) {
          PlaySound(0x10);
          s.frame = 2;
          setMessage(m);
        }
      }
    } else {
      offsetRect(s.rect, 0, -8);
    }
  };
}

const HandleSelectionOk = okCancel(1);
const HandleSelectionCancel = okCancel(0);

function HandleCharSelection() {}

// The 1P / 2P icons drop in; switching to two players is not part of this build yet.
function HandleOnePlayer(s) {
  if (s.rect.bottom < 66) offsetRect(s.rect, 0, 8);
  else s.frame = GetNumPlayers() === 1 ? 1 : 0;
}

function HandleTwoPlayers(s) {
  if (s.rect.bottom < 66) offsetRect(s.rect, 0, 8);
  else s.frame = GetNumPlayers() === 2 ? 1 : 0;
}

function HandlePlayModeButton(s) {
  if (s.rect.top < s.info[5] && s.action1 !== 3) {
    offsetRect(s.rect, 0, s.f42);
  } else if (s.action1 === 1) {
    s.frame = 0;
    const m = GetMouse();
    if (ptInRect(m.h, m.v, s.rect) && Button() && modeBuilt(s.num - 3)) {
      s.action1 = 2;
      s.info[1] = 5;
      SetSpriteAction1(GetPlayMode() + 3, 1);
      SetPlayMode(s.num - 3);
      PlaySound(0x10);
    }
  } else if (s.action1 === 2) {
    s.info[1] -= 1;
    s.frame = s.info[1] < 1 ? 1 : 2;
  } else if (s.action1 === 3) {
    offsetRect(s.rect, 0, -s.f42);
    if (s.rect.top < 112) {
      s.inUse = 0;
      if (GetPlayMode() === 3) {
        SetSpriteAction1(3, 2);
        SetPlayMode(0);
      }
    }
  }
}

function HandleSelectedChar1(s) {
  offsetRect(s.rect, s.vx, s.vy);
  if (s.rect.right > 320 || s.rect.left < s.info[0]) s.vx = -s.vx;
}

function HandleSelectedChar2(s) {
  offsetRect(s.rect, s.vx, s.vy);
  if (s.rect.left < 320 || s.info[0] < s.rect.left) s.vx = -s.vx;
}
