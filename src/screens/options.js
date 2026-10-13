// Options screen: OpenOptions, RunOptions and the option / sub-option buttons.

import { TickCount, offsetRect, ptInRect, setRect, untilTick } from '../mac.js';
import { fillBackWithPict } from '../gfx.js';
import { Button, CheckKey, GetMouse } from '../input.js';
import { GetSplit, HandleCamera, HandleCameraSplit } from '../camera.js';
import { DrawSprites, HandleSprites, KillAllSprites, KillSprite, KillSpriteByNumber, NewSpriteFromPICT, SetSpriteAction1, SetSpriteFrame, SetSpriteInfo } from '../sprites.js';
import { HandleSparks } from '../sparks.js';
import { PlaySound } from '../sound.js';
import { StartHint } from '../hud.js';
import { Fade, FadeBack } from '../fade.js';
import { T } from '../templates.js';
import { KillSpriteControls, NewCursorSprite, nextFrame } from '../common.js';
import {
  GetBloodPref, GetDiffPref, GetMusicPref, GetSoundPref, GetTimePref,
  SetBloodPref, SetDiffPref, SetMusicPref, SetSoundPref, SetTimePref,
} from '../state.js';
import { NewTitleScreenSprites } from './title.js';
import { OpenKeyScreen } from './keys.js';
import { OpenCheatScreen } from './cheats.js';

const opt = { exit: 0, selectedButton: -1, subs: [-1, -1, -1, -1], selectedSub: 0 };

export async function OpenOptions() {
  await Fade(0);
  KillAllSprites();
  fillBackWithPict(3000, 640, 480);
  NewOptionsScreenSprites();
  DrawSprites();
  opt.exit = 0;
  await FadeBack(0);
  PlaySound(15);
  await RunOptions();
  await KillSpriteControls();
  await Fade(0);
  NewTitleScreenSprites();
  fillBackWithPict(7000, 640, 480);
  StartHint();
  DrawSprites();
  await FadeBack(0);
}

async function RunOptions() {
  while (opt.exit === 0) {
    const start = TickCount();
    await CheckOptionsKeyDown();
    if (GetSplit() === 0) HandleCamera(); else HandleCameraSplit();
    await HandleSprites();
    HandleSparks();
    DrawSprites();
    await nextFrame(start);
  }
}

async function CheckOptionsKeyDown() {
  if (CheckKey(0x24) || CheckKey(0x4c)) {
    opt.exit = 1;
    SetSpriteFrame(20, 2);
    DrawSprites();
    await untilTick(TickCount() + 5);
  }
}

export function NewOptionsScreenSprites() {
  // Slots 0-19 are reserved while the screen is built (and freed at the end), so the OK button
  // is slot 20 and the option buttons follow it.
  for (let i = 0; i < 20; i++) NewSpriteFromPICT(T.ok, setRect({}, 0, 0, 0, 0), HandleOptionsOk);
  NewSpriteFromPICT(T.ok, setRect({}, 508, 479, 608, 511), HandleOptionsOk);
  const r = setRect({}, 270, -31, 370, 1);
  NewSpriteFromPICT(T.sound, r, HandleSound);
  NewSpriteFromPICT(T.music, r, HandleMusic);
  NewSpriteFromPICT(T.blood, r, HandleBlood);
  NewSpriteFromPICT(T.diff, r, HandleDiff);
  NewSpriteFromPICT(T.time, r, HandleTime);
  NewSpriteFromPICT(T.keys, r, HandleKey);
  NewSpriteFromPICT(T.cheats, r, HandleCheats); // Not in the original (see src/screens/cheats.js)
  for (let i = 0; i < 4; i++) opt.subs[i] = -1;
  opt.selectedButton = -1;
  NewCursorSprite();
  for (let i = 0; i < 20; i++) KillSpriteByNumber(i);
}

function HandleOptionsOk(s) {
  if (s.rect.top < 417) {
    s.frame = 0;
    const m = GetMouse();
    if (ptInRect(m.h, m.v, s.rect)) {
      s.frame = 1;
      if (Button()) {
        s.frame = 2;
        opt.exit = 1;
      }
    }
  } else {
    offsetRect(s.rect, 0, -8);
  }
}

function KillSubButtons() {
  if (opt.selectedButton === -1) return;
  for (let i = 0; i < 4; i++) if (opt.subs[i] !== -1) SetSpriteAction1(opt.subs[i], 3);
  SetSpriteAction1(opt.selectedButton, 0);
  opt.selectedButton = -1;
}

async function waitButtonUp() {
  while (Button()) await untilTick(TickCount() + 1);
}

// The six option buttons drop in, highlight on hover and open their sub-buttons on click.
function optionButton(spawnSubs) {
  return async (s) => {
    if (s.rect.top < s.info[5]) {
      offsetRect(s.rect, 0, s.f42);
      return;
    }
    const m = GetMouse();
    const inside = ptInRect(m.h, m.v, s.rect);
    if (s.action1 === 0) {
      s.frame = 0;
      if (inside) { s.action1 = 1; PlaySound(0x12); }
    } else if (s.action1 === 1) {
      s.frame = 1;
      if (!inside) s.action1 = 0;
      else if (Button()) {
        KillSubButtons();
        s.action1 = 2;
        PlaySound(0x10);
        spawnSubs({ ...s.rect }, s.num);
        await waitButtonUp();
      }
    } else if (s.action1 === 2) {
      s.frame = 2;
      if (inside && Button()) {
        KillSubButtons();
        s.action1 = 1;
        PlaySound(0x13);
        await waitButtonUp();
      }
    }
  };
}

// A sub-button slides out by (dx, dy) per frame for 10 frames; clicking it selects its value.
function subButton(dx, dy, setPref) {
  return (s) => {
    if (s.action1 === 0) {
      s.info[9] += 1;
      if (s.info[9] > 9) s.action1 = 1;
      offsetRect(s.rect, dx, dy);
    } else if (s.action1 === 1) {
      if (s.info[5] !== 0) { s.action1 = 2; s.info[1] = -1; }
      s.frame = 0;
      const m = GetMouse();
      if (ptInRect(m.h, m.v, s.rect) && Button()) {
        s.action1 = 2;
        s.info[1] = 5;
        SetSpriteAction1(opt.selectedSub, 1);
        setPref();
        opt.selectedSub = s.num;
        PlaySound(0x10);
      }
    }
    if (s.action1 === 2) {
      s.info[5] = 0;
      s.info[1] -= 1;
      s.frame = s.info[1] < 1 ? 1 : 2;
    }
    if (s.action1 === 3) {
      s.info[9] -= 1;
      offsetRect(s.rect, -dx, -dy);
      if (s.info[9] < 0) KillSprite(s);
    }
  };
}

function spawnSubs(rect, num, list) {
  offsetRect(rect, 3, 0);
  opt.selectedButton = num;
  for (let i = 0; i < 4; i++) opt.subs[i] = -1;
  list.forEach(([t, proc, selected], i) => {
    const n = NewSpriteFromPICT(t, rect, proc);
    if (selected) {
      SetSpriteInfo(n, 5, 1);
      SetSpriteFrame(n, 1);
      opt.selectedSub = n;
    }
    opt.subs[i] = n;
  });
}

const HandleSoundOn = subButton(10, 0, () => SetSoundPref(1));
const HandleSoundOff = subButton(20, 0, () => SetSoundPref(0));
const HandleMusicOn = subButton(10, 0, () => SetMusicPref(1));
const HandleMusicOff = subButton(20, 0, () => SetMusicPref(0));
const HandleBloodOn = subButton(10, -3, () => SetBloodPref(0));
const HandleBloodOff = subButton(10, 3, () => SetBloodPref(1));
const HandleBloodYellow = subButton(10, 0, () => SetBloodPref(2));
const HandleDiffEasy = subButton(10, -3, () => SetDiffPref(0));
const HandleDiffMedium = subButton(10, 0, () => SetDiffPref(1));
const HandleDiffHard = subButton(10, 3, () => SetDiffPref(2));
const HandleTime30 = subButton(10, -3, () => SetTimePref(0));
const HandleTime100 = subButton(10, 0, () => SetTimePref(1));
const HandleTime130 = subButton(10, 3, () => SetTimePref(2));
const HandleTimeUnlimited = subButton(10, 6, () => SetTimePref(3));

const HandleSound = optionButton((r, n) => spawnSubs(r, n, [
  [T.subOn, HandleSoundOn, GetSoundPref() !== 0], [T.subOff, HandleSoundOff, GetSoundPref() === 0]]));
const HandleMusic = optionButton((r, n) => spawnSubs(r, n, [
  [T.subOn, HandleMusicOn, GetMusicPref() !== 0], [T.subOff, HandleMusicOff, GetMusicPref() === 0]]));
const HandleBlood = optionButton((r, n) => spawnSubs(r, n, [
  [T.subOn, HandleBloodOn, GetBloodPref() === 0], [T.subOff, HandleBloodOff, GetBloodPref() === 1],
  [T.subYellow, HandleBloodYellow, GetBloodPref() === 2]]));
const HandleDiff = optionButton((r, n) => spawnSubs(r, n, [
  [T.subEasy, HandleDiffEasy, GetDiffPref() === 0], [T.subMedium, HandleDiffMedium, GetDiffPref() === 1],
  [T.subHard, HandleDiffHard, GetDiffPref() === 2]]));
const HandleTime = optionButton((r, n) => spawnSubs(r, n, [
  [T.sub30, HandleTime30, GetTimePref() === 0], [T.sub100, HandleTime100, GetTimePref() === 1],
  [T.sub130, HandleTime130, GetTimePref() === 2], [T.subUnlimited, HandleTimeUnlimited, GetTimePref() === 3]]));

// KEYS (and CHEATS, an addition that works the same way) open their own screen.
function screenButton(open) {
  return async (s) => {
    if (s.rect.top < s.info[5]) {
      offsetRect(s.rect, 0, s.f42);
      return;
    }
    s.frame = 0;
    const m = GetMouse();
    if (ptInRect(m.h, m.v, s.rect)) {
      s.frame = 1;
      if (Button()) {
        PlaySound(0x10);
        KillSubButtons();
        s.frame = 2;
        DrawSprites();
        await open();
      }
    }
  };
}

const HandleKey = screenButton(() => OpenKeyScreen());
const HandleCheats = screenButton(() => OpenCheatScreen());
