// Mini moteur de tweens partagé (aucune dépendance).
export const ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
};

const active = new Set();

/** tween({duration, ease, delay, update(e, t)}) -> Promise */
export function tween({ duration = 0.4, ease: e = ease.outCubic, delay = 0, update = () => {}, tag = null }) {
  return new Promise(resolve => {
    active.add({ t: -delay, duration: Math.max(0.0001, duration), e, update, resolve, tag });
  });
}

export const wait = s => tween({ duration: s });

export function cancelTweens(tag) {
  for (const tw of active) if (tw.tag === tag) { active.delete(tw); tw.resolve(); }
}

export function updateTweens(dt) {
  for (const tw of active) {
    tw.t += dt;
    if (tw.t < 0) continue;
    const k = Math.min(1, tw.t / tw.duration);
    tw.update(tw.e(k), k);
    if (k >= 1) { active.delete(tw); tw.resolve(); }
  }
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** Amortissement indépendant du framerate */
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export function dampAngle(a, b, k, dt) {
  let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * (1 - Math.exp(-k * dt));
}
export function nearestAngle(from, to) {
  const d = ((to - from + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return from + d;
}

/** PRNG déterministe */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
export function hashStr(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
