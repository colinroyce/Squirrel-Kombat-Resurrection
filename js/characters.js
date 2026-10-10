/* The roster: eight kombatant squirrels plus a secret boss. */
(function (root) {
  'use strict';
  const SK = root.SK;
  const shade = (c, a) => SK.gfx.shade(c, a);

  function skin(o) {
    const s = Object.assign({
      fur: '#b0602f', belly: '#f3d8b2', outline: '#24130a', eye: '#111', acc: [], accColor: '#c00',
      mask: null, tailFat: 1, tailLen: 1,
    }, o);
    s.dark = s.dark || shade(s.fur, -0.28);
    s.tail = s.tail || s.fur;
    s.tailHi = s.tailHi || shade(s.tail, 0.35);
    return s;
  }

  // Combo inputs are shared across the roster (P P P, P P K, K K K, K K P),
  // special inputs are shared too (B F+P, D F+P, F F+K, D B+K).
  const ROSTER = [
    {
      id: 'nutso', name: 'NUTSO', title: 'Shaolin Squirrel',
      bio: 'A red squirrel monk who left the temple to defend the Great Oak from rival nut gangs.',
      stats: { hp: 1000, speed: 4.2, jump: 17, power: 1.0, weight: 1.0, scale: 1.0, airJumps: 1 },
      skin: skin({ fur: '#c0582a', belly: '#f5d9b0', tail: '#c8622e', tailHi: '#f0a468', acc: ['headband'], accColor: '#e01c1c' }),
      color: '#e8452a',
      combos: ['Shaolin Flurry', 'Tail Whip', 'Dragon Nut Kick', 'Bonk'],
      specials: [
        { name: 'Flaming Acorn', type: 'projectile', proj: { kind: 'fireAcorn', speed: 9, dmg: 80, stun: 22 } },
        { name: 'Nut Cracker', type: 'rising', dmg: 110, vy: -15, vx: 3 },
        { name: 'Flying Squirrel Kick', type: 'dash', air: true, speed: 12, vy: -3, dur: 22, dmg: 90, knockdown: true, pose: 'kick', trail: '#ffb040' },
        { name: 'Bicycle Tail', type: 'dash', speed: 5.5, dur: 42, dmg: 22, hitEvery: 7, pose: 'bike', hitbox: [0, -80, 52, 70], kb: [2, -1], finalKb: [9, -6] },
      ],
      nutality: { name: 'ACORN FROM ABOVE', type: 'squash' },
    },
    {
      id: 'frostbite', name: 'FROSTBITE', title: 'Lin Kuei Gray',
      bio: 'A gray squirrel ninja who stores his nuts frozen solid. Cold-blooded, warm-tailed.',
      stats: { hp: 1000, speed: 4.0, jump: 17, power: 1.0, weight: 1.0, scale: 1.0, airJumps: 1 },
      skin: skin({ fur: '#8d949c', belly: '#e6ebef', tail: '#9aa2aa', tailHi: '#e3eaf0', mask: '#2f6fd8', eye: '#123', glowEye: null }),
      color: '#4aa0ff',
      combos: ['Icicle Claws', 'Cold Shoulder', 'Snow Flip', 'Brain Freeze'],
      specials: [
        { name: 'Ice Nut', type: 'projectile', proj: { kind: 'ice', speed: 7.5, dmg: 30, effect: 'freeze', stun: 10 } },
        { name: 'Glacier Slide', type: 'dash', speed: 13, dur: 20, dmg: 80, low: true, knockdown: true, pose: 'slide', hitbox: [0, -26, 60, 26], trail: '#bfe8ff' },
        { name: 'Ice Statue', type: 'counter', window: 34, dmg: 40, effect: 'freeze' },
        { name: 'Avalanche Stomp', type: 'groundPound', wave: 'ice', dmg: 70 },
      ],
      nutality: { name: 'DEEP FREEZE', type: 'shatter' },
    },
    {
      id: 'scurrion', name: 'SCURRION', title: 'Hellfire Hunter',
      bio: 'Back from the Netherwoods to avenge his stolen stash. He WILL get you over here.',
      stats: { hp: 1000, speed: 4.2, jump: 17, power: 1.02, weight: 1.0, scale: 1.0, airJumps: 1 },
      skin: skin({ fur: '#b9894f', belly: '#f2dfb8', tail: '#c4955a', tailHi: '#f0cc90', mask: '#f2c012', eye: '#111' }),
      color: '#f2c012',
      combos: ['Hell Claws', 'Scorched Tail', 'Inferno Flip', 'Skull Bash'],
      specials: [
        { name: 'Tail Spear', type: 'spear', proj: { kind: 'spear', speed: 13, dmg: 50, effect: 'pull', stun: 10 } },
        { name: 'Teleport Claw', type: 'teleport', where: 'behind', attack: true, dmg: 80 },
        { name: 'Leg Takedown', type: 'dash', speed: 11, dur: 18, dmg: 70, low: true, knockdown: true, pose: 'slide', hitbox: [0, -24, 56, 24] },
        { name: 'Hellfire Breath', type: 'breath', effect: 'burn', dmg: 13, dur: 38, color: 'fire' },
      ],
      nutality: { name: 'TOASTY!', type: 'toasty' },
    },
    {
      id: 'thundertail', name: 'THUNDERTAIL', title: 'God of Thunder Nuts',
      bio: 'An ancient white squirrel spirit who guards the storm-struck oak. Speaks only in static.',
      stats: { hp: 1000, speed: 4.0, jump: 17.5, power: 1.0, weight: 1.0, scale: 1.0, airJumps: 1 },
      skin: skin({ fur: '#e9e6df', belly: '#ffffff', tail: '#efece4', tailHi: '#ffffff', outline: '#2a2622', acc: ['hat'], accColor: '#e2c27a', eye: '#3aa8ff' }),
      color: '#9ad8ff',
      combos: ['Static Slap', 'Storm Tail', 'Thunder Flip', 'Bolt Bonk'],
      specials: [
        { name: 'Lightning Nut', type: 'projectile', proj: { kind: 'bolt', speed: 12, dmg: 75, effect: 'shock', stun: 26 } },
        { name: 'Thunder Teleport', type: 'teleport', where: 'behind', attack: false },
        { name: 'Squirrel Torpedo', type: 'dash', air: true, speed: 14, dur: 26, dmg: 28, hitEvery: 6, pose: 'torpedo', stopOnHit: false, finalKb: [10, -5], hitbox: [-10, -60, 70, 36], trail: '#cfefff', sfx: 'zap' },
        { name: 'Static Grab', type: 'grab', holdHits: 4, holdDmg: 18, finalDmg: 40, effect: 'shock', range: 46 },
      ],
      nutality: { name: 'OVERCHARGE', type: 'overcharge' },
    },
    {
      id: 'bruiser', name: 'BRUISER', title: 'Special Forces Fox Squirrel',
      bio: 'A fox squirrel with titanium arm implants. Cracks walnuts, coconuts, and skulls.',
      stats: { hp: 1150, speed: 3.4, jump: 15.5, power: 1.18, weight: 0.75, scale: 1.15, airJumps: 1 },
      skin: skin({ fur: '#7a4a28', belly: '#d1a77d', tail: '#87542e', tailHi: '#c4935e', metalArms: true, bulk: 1.25, acc: ['belt'], accColor: '#2d2d2d' }),
      color: '#c8a070',
      combos: ['Metal Mash', 'Tail Hammer', 'Heavy Flip', 'Steel Skull'],
      specials: [
        { name: 'Acorn Missile', type: 'projectile', proj: { kind: 'missile', speed: 6.5, dmg: 100, stun: 26, knockdown: true } },
        { name: 'Ground Pound', type: 'groundPound', wave: 'shock', dmg: 80 },
        { name: 'Gotcha Grab', type: 'grab', dashSpeed: 8, dashDur: 16, holdHits: 4, holdDmg: 20, finalDmg: 40, range: 44 },
        { name: 'Back Breaker', type: 'grab', holdHits: 0, finalDmg: 130, range: 48, air: true, slam: true },
      ],
      nutality: { name: 'PANCAKE SLAM', type: 'pancake' },
    },
    {
      id: 'glider', name: 'GLIDER', title: 'Flying Squirrel Princess',
      bio: 'A 10,000-year-old flying squirrel royal. Her steel fans are sharper than her wit.',
      stats: { hp: 920, speed: 4.6, jump: 18, power: 0.93, weight: 1.15, scale: 0.98, airJumps: 2 },
      skin: skin({ fur: '#9c8572', belly: '#f3ece2', tail: '#a48c78', tailHi: '#e6d6c4', membrane: '#c9b5a2', mask: '#8a2fc0', bigEyes: true, tailFat: 0.85, tailLen: 1.05 }),
      color: '#b060ff',
      combos: ['Fan Flurry', 'Silk Tail', 'Sky Flip', 'Swoop Bonk'],
      specials: [
        { name: 'Fan Toss', type: 'projectile', proj: { kind: 'fan', speed: 10, dmg: 60, stun: 20, wobble: true } },
        { name: 'Fan Lift', type: 'projectile', proj: { kind: 'gust', speed: 7, dmg: 25, launch: true, kb: [1, -17], stun: 20 } },
        { name: 'Glide Kick', type: 'glide', speed: 9, dur: 44, dmg: 80 },
        { name: 'Whirlwind', type: 'spin', dur: 46, dmg: 14, hitEvery: 6, move: 2.4 },
      ],
      nutality: { name: 'GONE WITH THE WIND', type: 'tornado' },
    },
    {
      id: 'chip', name: 'CHIP', title: 'Reptilian Chipmunk',
      bio: 'Not technically a squirrel, which is exactly what he wants you to think.',
      stats: { hp: 880, speed: 5.0, jump: 18, power: 0.9, weight: 1.25, scale: 0.88, airJumps: 1 },
      skin: skin({ fur: '#b87a3e', belly: '#f0dcc0', tail: '#a86e38', tailHi: '#d9a16a', stripes: true, mask: '#3aa040', tailFat: 0.72 }),
      color: '#4cd04c',
      combos: ['Chipper Chops', 'Stripe Whip', 'Cheek Flip', 'Nut Noggin'],
      specials: [
        { name: 'Acid Spit', type: 'projectile', proj: { kind: 'acid', speed: 8, vy: -3, gravity: 0.22, dmg: 50, effect: 'acid', stun: 20 } },
        { name: 'Rolling Ball', type: 'dash', speed: 13, dur: 26, dmg: 70, knockdown: true, pose: 'ball', hitbox: [-24, -50, 50, 50] },
        { name: 'Invisibility', type: 'invisible', dur: 360 },
        { name: 'Nut Spray', type: 'multiProj', count: 5, proj: { kind: 'pellet', speed: 10, dmg: 16, stun: 10 } },
      ],
      nutality: { name: 'CHEEK STUFFER', type: 'chomp' },
    },
    {
      id: 'rocco', name: 'ROCCO', title: 'Black Squirrel Mercenary',
      bio: 'A cybernetic black squirrel smuggler. Will sell your nuts back to you at a markup.',
      stats: { hp: 1000, speed: 4.1, jump: 17, power: 1.02, weight: 1.0, scale: 1.0, airJumps: 1 },
      skin: skin({ fur: '#2f2d35', belly: '#625b68', tail: '#3a3742', tailHi: '#6c6676', outline: '#0b0b0e', acc: ['cybereye', 'goldtooth'], eye: '#111' }),
      color: '#ff3a3a',
      combos: ['Shiv Flurry', 'Scrap Tail', 'Cyber Flip', 'Chrome Dome'],
      specials: [
        { name: 'Knife Toss', type: 'projectile', proj: { kind: 'knife', speed: 14, dmg: 65, stun: 20 } },
        { name: 'Eye Laser', type: 'beam', dmg: 70, range: 620 },
        { name: 'Cannonball', type: 'dash', air: true, speed: 12, vy: -7, dur: 30, dmg: 85, knockdown: true, pose: 'ball', hitbox: [-24, -54, 50, 50], gravity: true },
        { name: 'Nut Bomb', type: 'trap', fuse: 75, dmg: 120 },
      ],
      nutality: { name: 'PIXELATED', type: 'disintegrate' },
    },
    {
      id: 'mailman', name: 'THE MAILMAN', title: 'Secret Boss',
      bio: 'Neither rain, nor snow, nor gloom of night, nor killer squirrels shall stay this courier from his rounds.',
      secret: true,
      stats: { hp: 1600, speed: 3.2, jump: 14.5, power: 1.3, weight: 0.5, scale: 1.75, airJumps: 0, armor: true },
      skin: skin({ human: true, fur: '#f0c39a', skinTone: '#f0c39a', shirt: '#9cc3e6', pants: '#2c3f66', shoes: '#111', outline: '#1a1410', belly: '#f0c39a' }),
      color: '#4f86d6',
      combos: ['Special Delivery', 'Bag Whack', 'Boot Stomp', 'Priority Mail'],
      specials: [
        { name: 'Package Toss', type: 'projectile', proj: { kind: 'package', speed: 7, vy: -7, gravity: 0.35, dmg: 110, stun: 26, knockdown: true } },
        { name: 'Mailbag Swing', type: 'spin', dur: 36, dmg: 22, hitEvery: 9, move: 1.5 },
        { name: "Sic 'Em", type: 'summon', proj: { kind: 'dog', speed: 9, dmg: 90, knockdown: true, low: true, stun: 30 } },
        { name: 'Return To Sender', type: 'counter', window: 40, dmg: 120 },
      ],
      nutality: { name: 'RETURN TO SENDER', type: 'mail' },
    },
  ];

  ROSTER.forEach((c, i) => { c.index = i; });
  const BY_ID = {};
  ROSTER.forEach((c) => { BY_ID[c.id] = c; });

  SK.ROSTER = ROSTER;
  SK.CHARS = BY_ID;
  SK.SPECIAL_INPUTS = ['B F + P', 'D F + P', 'F F + K', 'D B + K'];
  SK.SPECIAL_SEQS = [['B', 'F', 'p'], ['D', 'F', 'p'], ['F', 'F', 'k'], ['D', 'B', 'k']];
  SK.COMBO_INPUTS = ['P P P', 'P P K', 'K K K', 'K K P'];
  SK.NUTALITY_SEQ = ['F', 'B', 'F', 'k'];
  SK.NUTALITY_INPUT = 'F B F + K (close)';
  // Alternate colours for mirror matches (the second copy of a squirrel).
  const ALT_ACCENTS = ['#e8e8e8', '#d02090', '#20b0b0', '#e06a10'];
  SK.altSkin = function (s, n) {
    const k = Object.assign({}, s);
    const acc = ALT_ACCENTS[(n || 0) % ALT_ACCENTS.length];
    if (s.human) {
      k.shirt = '#e8c870'; k.pants = '#5a3a20';
      return k;
    }
    const d = (c, a) => shade(c, a);
    k.fur = d(s.fur, -0.3); k.dark = d(s.dark, -0.3); k.tail = d(s.tail, -0.3); k.tailHi = d(s.tailHi, -0.25);
    k.belly = d(s.belly, -0.15);
    if (s.membrane) k.membrane = d(s.membrane, -0.25);
    if (s.mask) k.mask = acc;
    k.accColor = s.acc.includes('hat') ? '#8a6a3a' : acc;
    return k;
  };

  SK.playableRoster = function () {
    return ROSTER.filter((c) => !c.secret || SK.settings.unlockedMailman);
  };
})(typeof window !== 'undefined' ? window : globalThis);
