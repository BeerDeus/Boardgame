// Sons 100 % synthétisés (WebAudio) : aucun fichier audio à charger.
import { settings } from './settings.js';

let ctx = null, master = null, wet = null, ambient = null;
function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = settings.volume; master.connect(ctx.destination);
  // réverbération simple (convolution sur bruit décroissant)
  const len = ctx.sampleRate * 2.4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  const conv = ctx.createConvolver(); conv.buffer = ir; wet = ctx.createGain(); wet.gain.value = 0.35; wet.connect(conv); conv.connect(master);
  return ctx;
}
settings.subscribe(s => { if (master) master.gain.value = s.volume; if (ambient) ambient.gain.gain.value = s.music ? 0.05 : 0; });

export function unlockAudio() {
  const c = init(); if (!c) return;
  if (c.state === 'suspended') c.resume();
  if (!ambient) startAmbient();
}
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, unlockAudio, { once: false, passive: true }));
document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : ctx.resume(); });

let noiseBuf = null;
function noise() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function out(node, reverb = 0) { node.connect(master); if (reverb && wet) { const s = ctx.createGain(); s.gain.value = reverb; node.connect(s); s.connect(wet); } }

function startAmbient() {
  // vent : bruit filtré dont la fréquence ondule
  const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.8;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency);
  const g = ctx.createGain(); g.gain.value = settings.music ? 0.05 : 0;
  src.connect(f); f.connect(g); g.connect(master); src.start(); lfo.start();
  ambient = { gain: g };
}

export const sfx = {
  bell(vol = 0.5) {
    if (!init()) return; const t = ctx.currentTime;
    for (const [r, a, d] of [[0.5, 1, 6], [1, 0.7, 4.5], [1.19, 0.5, 3.5], [1.56, 0.35, 2.5], [2, 0.3, 2], [2.51, 0.2, 1.6], [2.66, 0.15, 1.2], [3.01, 0.1, 1]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 196 * r; o.type = 'sine';
      env(g, t, 0.005, a * vol * 0.25, d); o.connect(g); out(g, 0.8); o.start(t); o.stop(t + d + 0.1);
    }
  },
  hit() {
    if (!init()) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.2);
    env(g, t, 0.005, 0.6, 0.25); o.connect(g); out(g, 0.2); o.start(t); o.stop(t + 0.35);
    const n = ctx.createBufferSource(), ng = ctx.createGain(), f = ctx.createBiquadFilter(); n.buffer = noise(); f.type = 'highpass'; f.frequency.value = 1500;
    env(ng, t, 0.002, 0.3, 0.08); n.connect(f); f.connect(ng); out(ng); n.start(t); n.stop(t + 0.15);
    if (settings.haptics) navigator.vibrate?.(35);
  },
  dice() {
    if (!init()) return; const t0 = ctx.currentTime;
    for (let i = 0; i < 7; i++) {
      const t = t0 + i * 0.07 + Math.random() * 0.03, n = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      n.buffer = noise(); f.type = 'bandpass'; f.frequency.value = 2500 + Math.random() * 2000; f.Q.value = 4;
      env(g, t, 0.001, 0.4 * (1 - i / 9), 0.04); n.connect(f); f.connect(g); out(g); n.start(t); n.stop(t + 0.06);
    }
  },
  step() {
    if (!init()) return; const t = ctx.currentTime, n = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    n.buffer = noise(); f.type = 'lowpass'; f.frequency.value = 600; env(g, t, 0.003, 0.18, 0.07); n.connect(f); f.connect(g); out(g); n.start(t); n.stop(t + 0.1);
  },
  reveal() {
    if (!init()) return; const t = ctx.currentTime, n = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    n.buffer = noise(); f.type = 'bandpass'; f.Q.value = 1.5; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.5);
    env(g, t, 0.15, 0.25, 0.45); n.connect(f); f.connect(g); out(g, 0.5); n.start(t); n.stop(t + 0.8);
  },
  magic() {
    if (!init()) return; const t = ctx.currentTime;
    for (const m of [1, 1.5, 2]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(440 * m, t); o.frequency.exponentialRampToValueAtTime(880 * m, t + 0.6); env(g, t, 0.05, 0.08, 0.7); o.connect(g); out(g, 0.9); o.start(t); o.stop(t + 0.9); }
  },
  ui() {
    if (!init()) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; o.type = 'sine'; env(g, t, 0.002, 0.06, 0.05); o.connect(g); out(g); o.start(t); o.stop(t + 0.08);
  },
  success() {
    if (!init()) return; const t = ctx.currentTime;
    [523, 659, 784].forEach((fq, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = fq; env(g, t + i * 0.12, 0.01, 0.12, 0.6); o.connect(g); out(g, 0.6); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.8); });
  },
};
