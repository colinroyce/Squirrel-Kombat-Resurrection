// Preferences and the selection state shared between screens.

import { SetWantsMusic, SetWantsSound, StopMusic, PlayMusic } from './sound.js';

// Key slots: P1 left, jump, right, punch, kick, uppercut, spin; then the same for P2.
// Each entry is [character shown on the Keys screen, Mac virtual key code] (DefaultKeys).
export const DEFAULT_KEYS = [
  ['A', 0x00], ['W', 0x0d], ['D', 0x02], ['S', 0x01], ['E', 0x0e], [' ', 0x31], ['Q', 0x0c],
  ['4', 0x56], ['8', 0x5b], ['6', 0x58], ['5', 0x57], ['9', 0x5c], ['0', 0x52], ['7', 0x59],
];

// DefaultPrefs: sound on, music on, difficulty medium, yellow blood, 60-second rounds.
export const prefs = { sound: 1, music: 1, diff: 1, blood: 2, time: 1, keys: DEFAULT_KEYS.map((k) => k.slice()) };

const STORE = 'squirrel-kombat-prefs';

// GetPreferences (the original keeps a preferences file; here it is browser storage).
export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (p) Object.assign(prefs, p);
  } catch (e) { /* no storage: defaults */ }
  SetWantsSound(prefs.sound);
  SetWantsMusic(prefs.music);
}

export function savePrefs() {
  try { localStorage.setItem(STORE, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
}

export const GetKey = (slot) => prefs.keys[slot][1];
export const GetSoundPref = () => prefs.sound;
export const GetMusicPref = () => prefs.music;
export const GetBloodPref = () => prefs.blood;
export const GetDiffPref = () => prefs.diff;
export const GetTimePref = () => prefs.time;

export function SetSoundPref(v) { prefs.sound = v; SetWantsSound(v); savePrefs(); }
export function SetMusicPref(v) {
  prefs.music = v;
  SetWantsMusic(v);
  if (v === 0) StopMusic(); else PlayMusic(0);
  savePrefs();
}
export function SetBloodPref(v) { prefs.blood = v; savePrefs(); }
export function SetDiffPref(v) { prefs.diff = v; savePrefs(); }
export function SetTimePref(v) { prefs.time = v; savePrefs(); }

// The registered version is the target (all fighters and scenes).
export const GetRegistered = () => 1;

export const sel = {
  numPlayers: 1, // GetNumPlayers
  playMode: 2, // 0 one-on-one, 1 practice, 2 tournament, 3 two-on-two
  chosen: [0, 0, 0, 0],
  numChars: 11, // 12 once Military Muskrat is unlocked
  superBlood: 0,
  scene: 0,
};

export const GetNumPlayers = () => sel.numPlayers;
export const SetNumPlayers = (n) => { sel.numPlayers = n; };
export const GetPlayMode = () => sel.playMode;
export const SetPlayMode = (m) => { sel.playMode = m; };
export const GetChosenChar = (i) => sel.chosen[i];
export const SetChosenChar = (i, c) => { sel.chosen[i] = c; };
export const GetSuperBlood = () => sel.superBlood;
export const GetScene = () => sel.scene;

// Fighters and scenes built so far; the rest of the game is shown but inactive.
export const STAGED_CHARS = [0, 1];
export const STAGED_SCENES = [0, 1, 2, 3, 4];
