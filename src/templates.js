// Sprite templates set up once by DefSprites: InitSprite(t, type, nframes, delay, w, h, speed)
// plus the field overrides that follow. New* functions copy a template and spawn it. Templates
// are mutable game state: several spawners tweak them (and some tweaks persist).

function init(type, nframes, delay, w, h, speed, extra = {}) {
  const t = {
    image: null, nframes, frame: 0, inUse: 0, f08: 1,
    rect: { top: 0, left: 0, bottom: 0, right: 0 },
    oldRect: { top: 0, left: 0, bottom: 0, right: 0 },
    frameW: w, frameH: h, type, proc: null, vy: 0, vx: 0,
    info: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    num: 0, action1: 2, action2: 2, f42: speed, f44: 0, doDraw: 1,
    dir: 0, world: 1, f54: 1, f56: 0, f58: delay, f5a: 0, f5c: 0, f5e: 0, f60: 0, f62: 0,
  };
  for (const [k, v] of Object.entries(extra)) {
    if (k.startsWith('info')) t.info[Number(k.slice(4))] = v;
    else t[k] = v;
  }
  return t;
}

// Fighters, in character order (Ed .. Military Muskrat); f5e = character index.
export const CHAR_NAMES = ['ED', 'SPEEDY', 'ICE', 'INVISIBLE', 'NINJA', 'MECH', 'KATHY', 'GEORGE',
  'PHILBERT', 'SUPER SQUIRREL', 'CORPSE', 'MILITARY MUSKRAT'];
export const CHARS = [
  init(128, 66, 2, 32, 32, 5, { f5e: 0 }),
  init(202, 62, 2, 32, 32, 8, { f5e: 1 }),
  init(270, 60, 2, 32, 32, 5, { f5e: 2 }),
  init(339, 60, 2, 32, 32, 5, { f5e: 3 }),
  init(405, 68, 2, 32, 32, 5, { f5e: 4 }),
  init(504, 62, 2, 32, 32, 5, { f5e: 5 }),
  init(595, 62, 2, 32, 32, 5, { f5e: 6 }),
  init(667, 70, 2, 32, 32, 4, { f5e: 7 }),
  init(757, 74, 2, 32, 32, 3, { f5e: 8 }),
  init(847, 64, 2, 32, 32, 5, { f5e: 9 }),
  init(915, 60, 2, 32, 32, 5, { f5e: 10 }),
  init(1008, 60, 2, 32, 32, 5, { f5e: 11 }),
];

export const T = {
  // title screen
  start: init(1109, 3, 4, 64, 32, 5, { action1: 0, vy: -7 }),
  options: init(1112, 3, 4, 64, 32, 5, { action1: 0, vy: -7 }),
  scores: init(1136, 3, 4, 64, 32, 5, { action1: 0, vy: -7 }),
  quit: init(1115, 3, 4, 64, 32, 5, { action1: 0, vy: -7 }),
  projRight: init(1118, 1, 4, 64, 8, 25, { dir: 0 }),
  projLeft: init(1119, 1, 4, 64, 8, 25, { dir: 1 }),
  cursor: init(7000, 6, 3, 32, 32, 8),
  letters: Array.from({ length: 15 }, (_, i) => init(1120 + i, 1, 4, 32, 32, 10, { info0: 112 + 32 * i, info1: 150 })),
  // Not in the original: a second line, RESURREKTION, centred under the title. Its letters are
  // brightened copies (id + 40000, made in assets.js) of the title's own (cicn 1120 + i spells
  // SQUIRREL KOMBAT) and of an added N (30000), so the new line stands out.
  subtitle: [1124, 1126, 1120, 1122, 1124, 1125, 1126, 1129, 1134, 1123, 1130, 30000]
    .map((id, i) => init(id + 40000, 1, 4, 32, 32, 10, { info0: 160 + 32 * i, info1: 182 })),
  // buttons (PICT strips of 3 states)
  ok: init(129, 3, 2, 100, 32, 5),
  keyOk: init(155, 3, 2, 100, 32, 5),
  cancel: init(146, 3, 2, 100, 32, 5),
  // options
  sound: init(130, 3, 2, 100, 32, 4, { info5: 16, action1: 0 }),
  music: init(133, 3, 2, 100, 32, 8, { info5: 64, action1: 0 }),
  blood: init(134, 3, 2, 100, 32, 12, { info5: 112, action1: 0 }),
  diff: init(136, 3, 2, 100, 32, 16, { info5: 160, action1: 0 }),
  time: init(140, 3, 2, 100, 32, 20, { info5: 208, action1: 0 }),
  keys: init(145, 3, 2, 100, 32, 24, { info5: 256, action1: 0 }),
  subOn: init(131, 3, 2, 100, 32, 5, { action1: 0 }),
  subOff: init(132, 3, 2, 100, 32, 5, { action1: 0 }),
  subYellow: init(135, 3, 2, 100, 32, 5, { action1: 0 }),
  subEasy: init(137, 3, 2, 100, 32, 5, { action1: 0 }),
  subMedium: init(138, 3, 2, 100, 32, 5, { action1: 0 }),
  subHard: init(139, 3, 2, 100, 32, 5, { action1: 0 }),
  sub30: init(141, 3, 2, 100, 32, 5, { action1: 0 }),
  sub100: init(142, 3, 2, 100, 32, 5, { action1: 0 }),
  sub130: init(143, 3, 2, 100, 32, 5, { action1: 0 }),
  subUnlimited: init(144, 3, 2, 100, 32, 5, { action1: 0 }),
  // character selection
  frameP1: init(2000, 1, 2, 36, 40, 5),
  frameP2: init(2001, 1, 2, 36, 40, 5),
  onePlayer: init(2002, 2, 2, 50, 50, 4, { info5: 16 }),
  twoPlayers: init(2004, 2, 2, 50, 50, 4, { info5: 16 }),
  modeOneOnOne: init(147, 3, 2, 100, 32, 4, { info5: 16, action1: 1 }),
  modePractice: init(148, 3, 2, 100, 32, 8, { info5: 64, action1: 1 }),
  modeTournament: init(149, 3, 2, 100, 32, 12, { info5: 112, action1: 1 }),
  modeTwoOnTwo: init(150, 3, 2, 100, 32, 16, { info5: 160, action1: 1 }),
  previewP1: init(5000, 12, 0, 32, 32, 5, { info0: 272, vx: 1 }),
  previewP2: init(6000, 12, 0, 32, 32, 5, { info0: 336, vx: -1 }),
  deadChar1: init(1139, 12, 0, 32, 32, 5, { info0: 272, vx: 1 }),
  deadChar2: init(1151, 12, 0, 32, 32, 5, { info0: 336, vx: -1 }),
  // fight
  roundBanner: init(151, 3, 2, 176, 52, 4),
  dummy: init(500, 4, 2, 32, 32, 4),
  nut: init(194, 2, 2, 8, 8, 14),
  purpleBeam: init(196, 1, 2, 32, 32, 14, { action2: 0 }),
  purpleBall: init(197, 1, 2, 8, 8, 14),
  spinBall: init(198, 4, 0, 32, 32, 9, { action2: 0 }),
  fire: init(264, 4, 1, 32, 16, 8),
  fireBall: init(268, 2, 1, 32, 32, 16),
  iceBlast: init(330, 2, 2, 32, 32, 14),
  iceCube: init(332, 1, 2, 32, 32, 12),
  iceArm: init(333, 1, 2, 32, 32, 32),
  iceFist: init(334, 2, 2, 32, 32, 32),
  iceColumn: init(336, 1, 2, 32, 32, 32, { action2: 0 }),
  iceBlast2: init(337, 2, 2, 32, 32, 14),
  // scenes
  deathAcorn: init(591, 1, 2, 20, 29, 18, { action2: 0 }),
  eye: init(1076, 6, 4, 24, 16, 0, { action1: 0 }),
  leaf: init(1082, 4, 7, 16, 16, 3),
  nest: init(1086, 1, 7, 28, 16, 3, { action1: 0, info2: -1 }),
  bird: init(1087, 6, 1, 24, 14, 9, { info4: 200 }),
  log: init(1093, 1, 7, 64, 18, 2, { action1: 0 }),
  butterfly: init(1094, 8, 5, 16, 16, 4),
  snow: init(154, 1, 7, 6, 6, 3),
  snowBall: init(1103, 4, 4, 32, 32, 9),
  wallThing: init(1107, 1, 4, 32, 24, 9),
};
