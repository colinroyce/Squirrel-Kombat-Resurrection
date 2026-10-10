// Sound Manager stand-in: 15 effect channels plus one music channel.

import { assets } from './assets.js';

let ctx = null;
const buffers = new Map(); // snd id -> AudioBuffer
const channels = new Array(15).fill(null); // active AudioBufferSourceNode per channel
let musicSource = null;
let currentMusic = 0x29a;
let wantsSound = 1;
let wantsMusic = 1;

export function audioContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export async function loadSounds(base) {
  const ac = audioContext();
  const jobs = Object.entries(assets.manifest.snd).map(async ([id, info]) => {
    const data = await (await fetch(base + info.file)).arrayBuffer();
    buffers.set(Number(id), await ac.decodeAudioData(data));
  });
  await Promise.all(jobs);
}

export function SetWantsSound(v) { wantsSound = v; }
export function SetWantsMusic(v) { wantsMusic = v; }

// PlaySound(i): snd 128 + i on the first idle channel; dropped when all 15 are busy.
export function PlaySound(i) {
  if (!wantsSound || !ctx) return 0x29a;
  const buf = buffers.get(128 + i);
  if (!buf) return 0x29a;
  const ch = channels.findIndex((c) => c === null);
  if (ch < 0) return 0x29a;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.onended = () => { if (channels[ch] === src) channels[ch] = null; };
  channels[ch] = src;
  src.start();
  return ch;
}

export function StopMusic() {
  if (musicSource) {
    musicSource.onended = null;
    try { musicSource.stop(); } catch (e) { /* already stopped */ }
  }
  musicSource = null;
  currentMusic = 0x29a;
}

// PlayMusic(n): snd 1000 + n, looped (the original re-queues it from a callBackCmd).
export function PlayMusic(n) {
  if (!wantsMusic || !ctx || n === currentMusic) return;
  StopMusic();
  const buf = buffers.get(1000 + n);
  if (!buf) return;
  currentMusic = n;
  musicSource = ctx.createBufferSource();
  musicSource.buffer = buf;
  musicSource.loop = true;
  musicSource.connect(ctx.destination);
  musicSource.start();
}
