// Tournament mode: the opponent ladder (InitTournament / OpenTournamentScreen), the place
// counter, and the win screen with its scrolling story (DoWinScreen / ScrollText).

import { Rand, TickCount, offsetRect, setRect, untilTick } from '../mac.js';
import { bctx, fillBackWithPict, mapRGB16, drawString } from '../gfx.js';
import { Button, FlushEvents, GetNextEvent } from '../input.js';
import { HandleSingleCamera, KillCamera2, OffCamera, SetCameraUp, SetRenderOptions } from '../camera.js';
import {
  BufferToScreen, DrawSprites, GetSpritePicID, HandleSprites, KillAllSprites, MoveSprite, NewSpriteFromCICN,
  SetSpriteFrame,
} from '../sprites.js';
import { renderBackground } from '../render.js';
import { ClearOpponentScores, DontDrawLifeBars, InitRoundData } from '../hud.js';
import { FadeBack } from '../fade.js';
import { T } from '../templates.js';
import { DoNothing, nextFrame } from '../common.js';
import { GetChosenChar, GetNumPlayers, SetChosenChar } from '../state.js';
import { assets } from '../assets.js';

// 12 ladder places; opp[i] is the fighter met at place i.
const tour = { place: 0, numOpp: 0, opp: new Array(12).fill(-1), ladder: [], p1: [] };

export const GetPlace = () => tour.place;
export function IncreasePlace() { tour.place += 1; }
export const CheckPlace = () => tour.place > 0xb;

function Assigned(v, i) {
  for (let k = 0; k < 12; k++) if (k !== i && v === tour.opp[k]) return 1;
  return 0;
}

// Shuffles the 11 fighters 0..10 (your own included, so one fight is a mirror match) onto places
// 0..10, then sets up the ladder rects (from (368, 704), 48 px apart going up) and, for your icon,
// the same rects moved 48 px left and down.
export function InitTournament() {
  tour.place = 0;
  tour.opp.fill(-1);
  for (let i = 0; i < 0xb; i++) {
    let v;
    do { v = Rand(0xb); } while (Assigned(v, i));
    tour.opp[i] = v;
  }
  tour.numOpp = 0xb;
  // Not in the original: the original never fills the 12th place, so after your 11th win it
  // starts a fight with no opponent and the Tournament can't be won. Military Muskrat is put
  // there as the final opponent instead (Colin's choice); beating him wins the Tournament.
  tour.opp[0xb] = 0xb;
  const r = setRect({}, 0x170, 0x2c0, 400, 0x2e0);
  for (let i = 0; i < 12; i++) {
    tour.ladder[i] = { ...r };
    offsetRect(r, 0, -0x30);
  }
  for (let i = 0; i < 12; i++) {
    tour.p1[i] = { ...tour.ladder[i] };
    offsetRect(tour.p1[i], -0x30, 0x30);
  }
}

function CreateTournamentChar(t, r, frame) {
  const n = NewSpriteFromCICN(t, r, DoNothing);
  SetSpriteFrame(n, frame);
  return n;
}

// Your icon below and left of the current place; beaten opponents shown dead (cicn 1151).
function CreateTournamentSprites() {
  const me = CreateTournamentChar(T.previewP1, tour.p1[tour.place], GetChosenChar(0));
  if (GetNumPlayers() === 2) {
    const r = { ...tour.p1[tour.place] };
    offsetRect(r, 5, 5);
    CreateTournamentChar(T.previewP1, r, GetChosenChar(1));
    MoveSprite(me, -5, -5);
  }
  for (let i = 0; i < 12; i++) {
    const t = i < tour.place ? T.deadChar2 : T.previewP2;
    const n = CreateTournamentChar(t, tour.ladder[i], tour.opp[i]);
    if (GetNumPlayers() === 2) {
      const r = { ...tour.ladder[i] };
      offsetRect(r, 5, 5);
      CreateTournamentChar(t, r, tour.opp[i]);
      MoveSprite(n, -5, -5);
    }
  }
}

// Shows the ladder (PICT 5000, scrolled to your icon), slides your icon up beside your next
// opponent, waits 1.5 s (or a key / click), and sets that opponent for the next fight.
export async function OpenTournamentScreen() {
  SetRenderOptions(1, 0);
  fillBackWithPict(5000, 1024, 768);
  KillAllSprites();
  CreateTournamentSprites();
  SetCameraUp(0, GetSpritePicID(0), 0x20);
  KillCamera2();
  DontDrawLifeBars();
  InitRoundData();
  await HandleSprites();
  HandleSingleCamera();
  DrawSprites();
  ClearOpponentScores();
  await FadeBack(0);
  for (let i = 0; i < 12; i++) {
    const start = TickCount();
    await HandleSprites();
    HandleSingleCamera();
    MoveSprite(0, 0, -4);
    if (GetNumPlayers() === 2) MoveSprite(1, 0, -4);
    DrawSprites();
    await nextFrame(start);
  }
  await WaitInputOrTime(0x5a);
  if (GetNumPlayers() === 1) {
    SetChosenChar(1, tour.opp[tour.place]);
  } else {
    SetChosenChar(2, tour.opp[tour.place]);
    SetChosenChar(3, tour.opp[tour.place]);
  }
}

// WaitInputOrTime: until a key or click, or `ticks` have passed.
async function WaitInputOrTime(ticks) {
  FlushEvents();
  const start = TickCount();
  for (;;) {
    const e = GetNextEvent();
    if ((e && (e.what === 3 || e.what === 1)) || TickCount() - start > ticks) break;
    await untilTick(TickCount() + 1);
  }
  FlushEvents();
}

// ---- win screen -------------------------------------------------------------------------------

export async function DoWinScreen() {
  SetRenderOptions(0, 0);
  fillBackWithPict(10000, 640, 480);
  OffCamera(-9000, -9000);
  DontDrawLifeBars();
  KillAllSprites();
  DrawSprites();
  await FadeBack(1);
  await ScrollText(0x80, 0xd, setRect({}, 0xf0, 0, 0x280, 0x1e0), 10, 0x1e, 1, 1, 8);
}

// ScrollText(STR# id, count, rect, size, _, font, step, leading): the strings scroll up from
// below the rect's bottom, 1 px every 3 ticks, fading through greys near the top and bottom,
// until they have all gone past the top or the mouse button is pressed. (The 6th argument, 30,
// is passed but not used.) It is drawn in Geneva 10, which this build doesn't have yet (see
// decision 7 in CLAUDE.md), so the text is blank until that font is found.
const GREY = { a: 0x84ec, b: 0x8000, c: 0xab54, d: 0xd400, e: 0xdd6b, f: 0xeaff, g: 0xf2d7, h: 0xffff };
function scrollColor(v) {
  let c = GREY.h;
  if (v >= 0x1d6) c = GREY.a;
  else if (v >= 0x1cc) c = GREY.b;
  else if (v >= 0x1c2) c = GREY.c;
  else if (v >= 0x1b8) c = GREY.d;
  else if (v >= 0x1ae) c = GREY.e;
  else if (v >= 0x1a4) c = GREY.f;
  else if (v >= 0x19a) c = GREY.g;
  if (v < 0xb) c = GREY.a;
  else if (v < 0x15) c = GREY.b;
  else if (v < 0x1f) c = GREY.c;
  else if (v < 0x29) c = GREY.d;
  else if (v < 0x33) c = GREY.e;
  else if (v < 0x3d) c = GREY.f;
  else if (v < 0x47) c = GREY.g;
  else if (v < 0x51) c = GREY.h;
  return mapRGB16(c, c, c);
}

export async function ScrollText(id, count, r, size, unused, font, step, leading) {
  const strs = (assets.text['STR#'][String(id)] || []).slice(0, count);
  let penV = r.bottom + size + leading;
  let going = true;
  while (!Button() && going) {
    const start = TickCount();
    renderBackground();
    let v = penV;
    for (let i = 0; i < count; i++) {
      drawString(bctx, r.left + 4, v + 1, strs[i] || '', size, scrollColor(v));
      v += size + leading;
    }
    if (penV < (r.top - 3) - (count - 1) * (size + leading)) going = false;
    penV -= step;
    BufferToScreen();
    await untilTick(start + 3);
  }
}
