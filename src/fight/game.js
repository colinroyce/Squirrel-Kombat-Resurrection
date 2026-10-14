// The fight: CreatePlayers, the round banner, Run (the main loop), keyboard handling with the
// special-move recorder, pause, and what happens when a fighter dies.

import { Rand, TickCount, setRect, untilTick } from '../mac.js';
import { CheckKey } from '../input.js';
import { DoHandleCamera, GetVisRect, HandleCameras, SetCameraUp, SetCameraUp2, SetRenderOptions } from '../camera.js';
import {
  DrawSprites, GetSpriteAction1, GetSpriteAction2, GetSpriteDirection, GetSpriteInUse, GetSpriteInfo,
  GetSpritePicID, GetSpriteRect, HandleSprites, KillAllSprites, KillSprite, NewSpriteFromCICN,
  NewSpriteFromPICT, SetSpriteAction1, SetSpriteAction2, SetSpriteDirection, SetSpriteFrame, SetSpriteInfo,
  SetSpritePath,
} from '../sprites.js';
import { HandleSparks } from '../sparks.js';
import { HandleQuakes } from '../quakes.js';
import { PlaySound } from '../sound.js';
import {
  AddPointsForLife, AddToDestTime, AddWin, CheckWin, DontDrawLifeBars, GetRoundNum, IncreaseRoundNum,
  InitLife, InitRoundData, InitTime, SetDrawTime,
} from '../hud.js';
import { Fade, FadeBack } from '../fade.js';
import { CHARS, T } from '../templates.js';
import { KeepSpriteOnScreen, OnScreen, nextFrame, uncappedFrame } from '../common.js';
import { ChooseRandomScene, GetChosenChar, GetKey, GetNumPlayers, GetPlayMode, GetRegistered, GetScene, UnlockMuskrat } from '../state.js';
import { CheckPlace, DoWinScreen, GetPlace, IncreasePlace, OpenTournamentScreen } from '../screens/tournament.js';
import { AskHighScore } from '../screens/scores.js';
import { OnSurface, PartnerOfMe } from './player.js';
import { HandleEd, HandleSpeedy, NewFireBall, NewPurpleBeam, NewSpin3Ball } from './chars.js';
import { HandleIce, NewIceBlast, NewIceBlast2, NewIceColumn, NewIceFist } from './ice.js';
import { HandleMuskrat, NewGrenades, NewProxMine, NewTracker } from './muskrat.js';
import { HandleInvisible, NewInvBoxGlove, NewInvFireBall, NewInvIceBall } from './invisible.js';
import { HandleMech, MechSpecial } from './mech.js';
import { HandleNinja, NinjaSpecial } from './ninja.js';
import { HandleKathy, KathySpecial } from './kathy.js';
import { GeorgeSpecial, HandleOldSquirrel } from './george.js';
import { HandlePhil, PhilSpecial } from './philbert.js';
import { HandleSuper, SuperSpecial } from './super.js';
import { HandleCorpse, NewBats, NewBodyParts, NewBubble, NewDarkBeam } from './corpse.js';
import { ForestRun, InitScene, NewSceneSprites } from './forest.js';
import { TundraRun } from './tundra.js';
import { CityRun } from './city.js';
import { HandleDummy, HandleTutorial, StartTutorial } from './practice.js';
import { PauseGuide } from '../screens/pauseguide.js';
import { ClearComboFeed, ComboHit, ComboKey } from '../combofeed.js';

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

// Indexed by character; fighters not built yet are left empty.
const PROCS = [HandleEd, HandleSpeedy, HandleIce, HandleInvisible];
PROCS[4] = HandleNinja;
PROCS[5] = HandleMech;
PROCS[6] = HandleKathy;
PROCS[7] = HandleOldSquirrel;
PROCS[8] = HandlePhil;
PROCS[9] = HandleSuper;
PROCS[10] = HandleCorpse;
PROCS[0xb] = HandleMuskrat;

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
    if (GetPlayMode() === 1) {
      NewSpriteFromCICN(T.dummy, r1, HandleDummy); // practice: the training dummy
    } else {
      const c1 = GetChosenChar(1);
      NewSpriteFromCICN(CHARS[c1], r1, PROCS[c1]);
    }
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
  else StartTutorial();
}

// ---- Run --------------------------------------------------------------------------------------

function MyRun() {
  if (GetPlayMode() === 1) HandleTutorial();
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
    HandleQuakes();
    HandleSparks();
    DrawSprites();
    await nextFrame(start);
  }
}

// ---- special-move key recorder ------------------------------------------------------------------

// One 5-key ring per player (RecordKey1 / RecordKey2 and their globals).
const recs = [0, 1].map(() => ({ ring: [-1, -1, -1, -1, -1], idx: 0, last: -1 }));
const rec = recs[0];

export function ClearPattern1() {
  recs[0].ring.fill(-1);
  recs[0].idx = 0;
}

function ClearPattern2() {
  recs[1].ring.fill(-1);
  recs[1].idx = 0;
}

export function InitKeyRecorder() {
  ClearPattern1();
  recs[0].last = -1;
  ClearPattern2();
  recs[1].last = -1;
  ClearComboFeed(); // Not in the original: each round starts with an empty combo display
}

function recordKey(r, k) {
  if (k !== r.last) {
    r.ring[r.idx] = k;
    r.idx += 1;
    r.last = k;
    if (r.idx > 4) r.idx = 0;
    return true;
  }
  return false;
}
// Each recorded key is also shown on the combo display (an addition, src/combofeed.js).
const RecordKey1 = (k) => { if (recordKey(recs[0], k)) ComboKey(0, k); };
const RecordKey2 = (k) => { if (recordKey(recs[1], k)) ComboKey(1, k); };

// Does the pattern appear in the ring, starting at any of its 5 positions (wrapping)?
function checkPattern(r, pat) {
  for (let start = 0; start < 5; start++) {
    let ok = true;
    for (let i = 0; i < pat.length; i++) {
      if (r.ring[(start + i) % 5] !== pat[i]) { ok = false; break; }
    }
    if (ok) { r.matched = pat; return 1; }
  }
  return 0;
}
const CheckPattern1 = (...pat) => checkPattern(recs[0], pat);
const CheckPattern2 = (...pat) => checkPattern(recs[1], pat);

// CheckMoves1 (player 1, slot 0) and CheckMoves2 (player 2, slot 1) are the same apart from the
// quirks marked below, so both run this with their slot.
function CheckMoves(n) {
  const CheckPattern = n === 0 ? CheckPattern1 : CheckPattern2;
  // A recognised move clears the pattern; the combo display (an addition) shows its name then.
  const ClearPattern = () => {
    ComboHit(n, recs[n].matched);
    if (n === 0) ClearPattern1(); else ClearPattern2();
  };
  const r = GetSpriteRect(n);
  const a2 = () => GetSpriteAction2(n);
  const ch = GetChosenChar(n);
  if (ch === 0) {
    // Original quirk: player 1 clears info 7 on Teleport, player 2 on Tri Ball instead.
    if (CheckPattern(3, 4, 3, 5)) {
      ClearPattern();
      if (a2() !== 5) { SetSpriteAction2(n, 0xd); SetSpriteInfo(n, 5, 0); if (n === 0) SetSpriteInfo(n, 7, 0); }
    } else if (CheckPattern(0, 0, 2, 5) || CheckPattern(2, 2, 0, 5)) {
      ClearPattern();
      if (a2() !== 5) { SetSpriteAction2(n, 0xe); SetSpriteInfo(n, 5, 0); if (n === 1) SetSpriteInfo(n, 7, 0); }
    } else if (CheckPattern(0, 3, 2, 4, 2) || CheckPattern(2, 3, 0, 4, 0)) {
      ClearPattern();
      if (a2() !== 5) { SetSpriteAction2(n, 0xf); NewPurpleBeam(r, GetSpriteInfo(n, 1), n, n); }
    } else if (CheckPattern(2, 2, 3, 3) || CheckPattern(0, 0, 3, 3)) {
      ClearPattern();
      if (a2() !== 5) { SetSpriteAction2(n, 0x10); NewSpin3Ball(r, GetSpriteInfo(n, 1), n, n); }
    }
  } else if (ch === 1) {
    const free = () => a2() !== 5 && a2() !== 0xd && a2() !== 0xe && a2() !== 0xf;
    if (CheckPattern(0, 2, 3) || CheckPattern(2, 0, 3)) {
      ClearPattern();
      if (free()) { SetSpriteAction2(n, 0xd); SetSpriteInfo(n, 5, 0); }
    } else if (CheckPattern(0, 0, 2, 4) || CheckPattern(2, 2, 0, 4)) {
      ClearPattern();
      if (free()) { SetSpriteAction2(n, 0xe); SetSpriteInfo(n, 5, 0); }
    } else if (CheckPattern(0, 5, 0, 2, 4) || CheckPattern(2, 5, 2, 0, 4)) {
      ClearPattern();
      if (free()) { SetSpriteAction2(n, 0xf); SetSpriteInfo(n, 5, 0); }
    } else if (CheckPattern(0, 0, 2, 2, 6) || CheckPattern(2, 2, 0, 0, 6)) {
      ClearPattern();
      // Original quirk: for player 2 only "not already hurt" (5) is checked.
      if (n === 0 ? free() : a2() !== 5) NewFireBall(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    }
  } else if (ch === 2) {
    if (CheckPattern(2, 2, 3, 5) || CheckPattern(0, 0, 3, 5)) {
      ClearPattern();
      if (a2() !== 5) NewIceBlast(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n), n);
    } else if (CheckPattern(0, 0, 2, 4) || CheckPattern(2, 2, 0, 4)) {
      ClearPattern();
      if (a2() !== 5) NewIceFist(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n), n);
    } else if (CheckPattern(3, 4, 5)) {
      ClearPattern();
      if (OnSurface(r, n) && a2() !== 5) {
        NewIceColumn(r, n, 0);
        SetSpriteAction2(n, 0xf);
        SetSpriteInfo(n, 5, 0);
      }
    } else if (CheckPattern(3, 6, 1)) {
      ClearPattern();
      if (a2() !== 5) NewIceBlast2(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n), n);
    }
  } else if (ch === 3) {
    if (CheckPattern(0, 1, 0, 2, 3) || CheckPattern(2, 1, 2, 0, 3)) {
      ClearPattern();
      if (a2() !== 5) { SetSpriteAction2(n, 0xd); SetSpriteInfo(n, 5, 0xb); }
    } else if (CheckPattern(0, 0, 2, 2, 5) || CheckPattern(2, 2, 0, 0, 5)) {
      ClearPattern();
      if (a2() !== 5) NewInvBoxGlove(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    } else if (CheckPattern(0, 0, 2, 2, 3) || CheckPattern(2, 2, 0, 0, 3)) {
      ClearPattern();
      if (a2() !== 5) NewInvFireBall(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    } else if (CheckPattern(0, 0, 2, 2, 4) || CheckPattern(2, 2, 0, 0, 4)) {
      ClearPattern();
      // Original quirk: both players test sprite 1's state (player 2's own, not player 1's).
      if (GetSpriteAction2(1) !== 5) NewInvIceBall(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n), n);
    }
  } else if (ch === 4) {
    if (CheckPattern(0, 0, 0, 2, 5) || CheckPattern(2, 2, 2, 0, 5)) { ClearPattern(); NinjaSpecial(n, 0); }
    else if (CheckPattern(0, 3, 4, 4, 3) || CheckPattern(2, 3, 4, 4, 3)) { ClearPattern(); NinjaSpecial(n, 1); }
    else if (CheckPattern(0, 0, 0, 4, 0) || CheckPattern(2, 2, 2, 4, 2)) { ClearPattern(); NinjaSpecial(n, 2); }
    else if (CheckPattern(3, 3, 4, 0, 0) || CheckPattern(3, 3, 4, 2, 2)) { ClearPattern(); NinjaSpecial(n, 3, 1 - n); }
  } else if (ch === 5) {
    if (CheckPattern(0, 0, 2, 2, 5) || CheckPattern(2, 2, 0, 0, 5)) { ClearPattern(); MechSpecial(n, 0); }
    else if (CheckPattern(0, 0, 0, 2, 6) || CheckPattern(2, 2, 2, 0, 6)) { ClearPattern(); MechSpecial(n, 1); }
    else if (CheckPattern(0, 0, 3, 1) || CheckPattern(2, 2, 3, 1)) { ClearPattern(); MechSpecial(n, 2); }
    else if (CheckPattern(0, 2, 2, 4) || CheckPattern(2, 0, 0, 4)) { ClearPattern(); MechSpecial(n, 3); }
  } else if (ch === 6) {
    if (CheckPattern(0, 4, 4, 2) || CheckPattern(2, 4, 4, 0)) { ClearPattern(); KathySpecial(n, 0); }
    else if (CheckPattern(2, 2, 3, 2, 4) || CheckPattern(0, 0, 3, 0, 4)) { ClearPattern(); KathySpecial(n, 1); }
    else if (CheckPattern(2, 2, 5, 3, 4) || CheckPattern(0, 0, 5, 3, 4)) { ClearPattern(); KathySpecial(n, 2); }
    else if (CheckPattern(2, 2, 6, 4) || CheckPattern(0, 0, 6, 4)) { ClearPattern(); KathySpecial(n, 3); }
  } else if (ch === 7) {
    if (CheckPattern(0, 2, 3, 4, 5) || CheckPattern(2, 0, 3, 4, 5)) { ClearPattern(); GeorgeSpecial(n, 0); }
    else if (CheckPattern(6, 5, 3, 4, 2) || CheckPattern(6, 5, 3, 4, 0)) { ClearPattern(); GeorgeSpecial(n, 1); }
    else if (CheckPattern(0, 2, 4, 3) || CheckPattern(2, 0, 4, 3)) { ClearPattern(); GeorgeSpecial(n, 2); }
    else if (CheckPattern(2, 2, 3, 2, 0) || CheckPattern(0, 0, 3, 0, 2)) { ClearPattern(); GeorgeSpecial(n, 3); }
  } else if (ch === 8) {
    if (CheckPattern(0, 0, 2, 5) || CheckPattern(2, 2, 0, 5)) { ClearPattern(); PhilSpecial(n, 0); }
    else if (CheckPattern(3, 3, 2, 2, 5) || CheckPattern(3, 3, 0, 0, 5)) { ClearPattern(); PhilSpecial(n, 1); }
    else if (CheckPattern(3, 4, 2, 2) || CheckPattern(3, 4, 0, 0)) { ClearPattern(); PhilSpecial(n, 2); }
    else if (CheckPattern(3, 2, 2, 0, 3) || CheckPattern(3, 0, 0, 2, 3)) { ClearPattern(); PhilSpecial(n, 3); }
  } else if (ch === 9) {
    if (CheckPattern(3, 0, 2, 4, 1) || CheckPattern(3, 2, 0, 4, 1)) { ClearPattern(); SuperSpecial(n, 0); }
    else if (CheckPattern(2, 3, 3, 3, 5) || CheckPattern(0, 3, 3, 3, 5)) { ClearPattern(); SuperSpecial(n, 1); }
    else if (CheckPattern(0, 0, 0, 4) || CheckPattern(2, 2, 2, 4)) { ClearPattern(); SuperSpecial(n, 2); }
    else if (CheckPattern(0, 4, 2, 4, 5) || CheckPattern(2, 4, 0, 4, 5)) { ClearPattern(); SuperSpecial(n, 3); }
  } else if (ch === 10) {
    if (CheckPattern(0, 0, 2, 2, 3) || CheckPattern(2, 2, 0, 0, 3)) {
      ClearPattern();
      if (a2() !== 5) NewBubble(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    } else if (CheckPattern(5, 0, 2, 3, 1) || CheckPattern(5, 2, 0, 3, 1)) {
      ClearPattern();
      if (a2() !== 5) { NewBodyParts(r, n); SetSpriteAction2(n, 0xe); }
    } else if (CheckPattern(0, 0, 2, 4) || CheckPattern(2, 2, 0, 4)) {
      ClearPattern();
      if (a2() !== 5) NewDarkBeam(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    } else if (CheckPattern(0, 3, 6, 2, 4) || CheckPattern(2, 3, 6, 0, 4)) {
      ClearPattern();
      if (a2() !== 5) NewBats(GetSpriteInfo(n, 1), n);
    }
  } else if (ch === 0xb) {
    if (CheckPattern(3, 0, 4, 2) || CheckPattern(3, 2, 4, 0)) {
      ClearPattern();
      if (a2() !== 5) NewProxMine(r, GetSpriteInfo(n, 1), n);
    } else if (CheckPattern(2, 2, 5, 6) || CheckPattern(0, 0, 5, 6)) {
      ClearPattern();
      if (a2() !== 5) NewGrenades(r, GetSpriteInfo(n, 1), n, GetSpriteDirection(n));
    } else if (CheckPattern(0, 0, 3, 4, 2) || CheckPattern(2, 2, 3, 4, 0)) {
      ClearPattern();
      if (a2() !== 5) SetSpriteAction2(n, 0xf);
    } else if (CheckPattern(6, 0, 0, 1, 2) || CheckPattern(6, 2, 2, 1, 0)) {
      ClearPattern();
      if (a2() !== 5) NewTracker(r, GetSpriteInfo(n, 1), n);
    }
  }
}

const CheckMoves1 = () => CheckMoves(0);
const CheckMoves2 = () => CheckMoves(1);

// ---- keyboard ---------------------------------------------------------------------------------

async function CheckKeyDown() {
  const r0 = GetSpriteRect(0);
  // Cmd-Q quits the original application; there is nothing to quit to in a browser.
  // The original quits the fight on Esc and pauses on P or F15. Not in the original (Colin's
  // request): Esc pauses, P doesn't (it's player 2's jump), and quitting is the QUIT button on the
  // pause guide.
  if (CheckKey(0x35) || CheckKey(0x71)) {
    // The original draws PICT 9000 at (240, 218) and waits (WaitPause). Not in the original:
    // the pause shows the move guide instead (src/screens/pauseguide.js).
    const t = TickCount();
    if (await PauseGuide() === 'quit') {
      Quit();
      SetGoToSelection(1);
      return;
    }
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
  // Player 2 (two humans): the same as player 1 for slot 1 with keys 7–13, except the quirks marked.
  const b2 = () => GetSpriteAction2(1);
  const ch2 = GetChosenChar(1);
  if (GetNumPlayers() === 2 && b2() !== 0x11 && (ch2 !== 4 || b2() !== 0xd) && GetSpriteAction1(1) !== 0x12) {
    const r1 = GetSpriteRect(1);
    let pressed = 0;
    if (CheckKey(GetKey(8))) { // jump
      const a = b2();
      if (a !== 3 && a !== 5 && a !== 9 && a !== 0xb && a !== 0xc && (OnSurface(r1, 1) || b2() === 0x13)) {
        if (b2() === 7) {
          SetSpriteAction2(1, 9);
          PlaySound(Rand(7) + 8);
          SetSpriteInfo(1, 3, 0);
          SetSpriteInfo(1, 4, 0);
          SetSpritePath(1, 0, 0);
        } else if (b2() === 2) {
          PlaySound(2);
          SetSpriteAction2(1, 3);
          SetSpritePath(1, 0, -0x11);
        } else if (b2() === 0xe && ch2 === 9) {
          SetSpriteAction2(1, 2);
        } else if (b2() === 0x13) {
          SetSpriteAction1(1, 0x15);
        }
      }
      pressed = 1;
      RecordKey2(1);
    }
    if (CheckKey(GetKey(7)) && GetSpriteAction1(1) !== 0x12) { // left
      if (GetSpriteDirection(1) === 1) SetSpriteAction1(1, 1);
      else SetSpriteDirection(1, 1);
      pressed = 1;
      RecordKey2(0);
    }
    if (CheckKey(GetKey(9)) && GetSpriteAction1(1) !== 0x12) { // right (player 2 checks its own slot)
      if (GetSpriteDirection(1) === 0) SetSpriteAction1(1, 1);
      else SetSpriteDirection(1, 0);
      SetSpriteAction1(1, 1);
      pressed = 1;
      RecordKey2(2);
    }
    if (CheckKey(GetKey(10))) { // punch
      if (b2() === 2) SetSpriteAction2(1, 4);
      else if (b2() === 7) SetSpriteAction2(1, 10);
      else if (b2() === 0xe && ch2 === 9) SetSpriteAction2(1, 2);
      else if (b2() === 0x13) SetSpriteAction1(1, 0x14);
      pressed = 1;
      RecordKey2(3);
    }
    // Original quirk: while flying (0x13), player 2's kick, uppercut and spin kick set action 1 to 2
    // where player 1's set action 2.
    if (CheckKey(GetKey(11))) { // kick
      if (b2() === 2) SetSpriteAction2(1, 6);
      else if (b2() === 3) { SetSpriteAction2(1, 0xb); PlaySound(Rand(7) + 8); }
      else if (b2() === 0xe && ch2 === 9) SetSpriteAction2(1, 2);
      else if (b2() === 0x13) SetSpriteAction1(1, 2);
      pressed = 1;
      RecordKey2(4);
    }
    if (CheckKey(GetKey(12))) { // uppercut
      if (b2() === 2) SetSpriteAction2(1, 7);
      else if (b2() === 0xe && ch2 === 9) SetSpriteAction2(1, 2);
      else if (b2() === 0x13) SetSpriteAction1(1, 2);
      pressed = 1;
      RecordKey2(5);
    }
    if (CheckKey(GetKey(13))) { // spin kick
      if (b2() === 2) SetSpriteAction2(1, 8);
      else if (b2() === 3) { SetSpriteAction2(1, 0xc); PlaySound(Rand(7) + 8); }
      else if (b2() === 0xe && ch2 === 9) SetSpriteAction2(1, 2);
      else if (b2() === 0x13) SetSpriteAction1(1, 2);
      pressed = 1;
      RecordKey2(6);
    }
    if (!pressed) recs[1].last = -1;
    CheckMoves2();
  }
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
    } else if (GetPlayMode() === 2) {
      if (GetRegistered() === 0 && GetPlace() > 4) {
        DontDrawLifeBars();
        await AskHighScore(0);
        if (GetNumPlayers() === 2) await AskHighScore(1);
        Quit();
        SetGoToSelection(1);
      } else if ((GetNumPlayers() === 1 && s.num === 0) || (GetNumPlayers() === 2 && (s.num === 1 || s.num === 0))) {
        // A human lost: the Tournament is over.
        DontDrawLifeBars();
        await AskHighScore(0);
        if (GetNumPlayers() === 2) await AskHighScore(1);
        Quit();
        SetGoToSelection(1);
      } else {
        IncreasePlace();
        if (!CheckPlace()) { // the next opponent
          await Fade(0);
          await OpenTournamentScreen();
          await Fade(0);
          SetDrawTime(0);
          IncreaseRoundNum();
          SetRenderOptions(1, 1);
          ChooseRandomScene();
          InitScene();
          KillAllSprites();
          CreatePlayers();
          NewSceneSprites();
          SetCameraUp(0, GetSpritePicID(0), 32);
          if (GetNumPlayers() === 2) SetCameraUp2(1, GetSpritePicID(1), 32);
          if (GetNumPlayers() === 1) SetRenderOptions(1, 0);
          DoHandleCamera();
          HandleCameras();
          InitLife();
          InitRoundData();
          DrawSprites();
          InitKeyRecorder();
          await DoRoundAnimation();
          await Run();
        } else { // won the Tournament
          UnlockMuskrat(); // Not in the original (see UnlockMuskrat in state.js)
          await Fade(1);
          await DoWinScreen();
          await AskHighScore(0);
          if (GetNumPlayers() === 2) await AskHighScore(1);
          Quit();
          SetGoToSelection(1);
        }
      }
    }
  }
}
