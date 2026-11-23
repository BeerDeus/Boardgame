// Paramètres graphiques / audio persistants + détection automatique de la puissance de l'appareil.
const KEY = 'grimoire.settings.v1';

export const PRESETS = {
  low:    { label: 'Bas',    res: 0.65, maxPR: 1,   dynRes: true,  shadows: 'off',   particles: 0,   postfx: false, aa: false, fpsCap: 30, ambientFps: 0,  idleAnim: false, lightFx: false, aniso: 1, props: 0.55, impostorRes: 96 },
  medium: { label: 'Moyen',  res: 0.85, maxPR: 1.5, dynRes: true,  shadows: 'low',   particles: 0.5, postfx: false, aa: true,  fpsCap: 60, ambientFps: 24, idleAnim: true,  lightFx: true,  aniso: 4, props: 0.8,  impostorRes: 128 },
  high:   { label: 'Élevé',  res: 1,    maxPR: 2,   dynRes: true,  shadows: 'high',  particles: 1,   postfx: true,  aa: true,  fpsCap: 60, ambientFps: 30, idleAnim: true,  lightFx: true,  aniso: 8, props: 1,    impostorRes: 160 },
  ultra:  { label: 'Ultra',  res: 1,    maxPR: 3,   dynRes: false, shadows: 'ultra', particles: 1.5, postfx: true,  aa: true,  fpsCap: 0,  ambientFps: 60, idleAnim: true,  lightFx: true,  aniso: 16, props: 1.25, impostorRes: 200 },
};
/** Paramètres qui exigent un rechargement (fixés à la création du contexte / de la géométrie) */
export const RELOAD_KEYS = ['aa', 'props', 'impostorRes'];

/** Heuristique de puissance : GPU (si exposé), mémoire, cœurs, mobile */
export function detectTier() {
  let score = 0;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  score += cores >= 8 ? 2 : cores >= 4 ? 1 : 0;
  score += mem >= 8 ? 2 : mem >= 4 ? 1 : 0;
  let gpu = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {}
  if (/swiftshader|llvmpipe|software/i.test(gpu)) return { tier: 'low', gpu, mobile };
  if (/RTX|GTX 1[06-9]|RX [5-7]\d{3}|Apple M\d|Radeon Pro/i.test(gpu)) score += 3;
  else if (/Apple GPU|Adreno \(TM\) [6-7]\d{2}|Mali-G7|Mali-G6[18]|Xclipse|Iris Xe/i.test(gpu)) score += 2;
  else if (/Adreno \(TM\) [3-5]\d{2}|Mali-[T4]|PowerVR|Mali-G5/i.test(gpu)) score -= 1;
  if (mobile) score -= 1;
  const tier = score >= 6 ? 'ultra' : score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
  return { tier, gpu, mobile };
}

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
const saved = load();
const detected = detectTier();
const subs = new Set();

export const settings = {
  preset: saved.preset || 'auto',
  custom: saved.custom || {},
  volume: saved.volume ?? 0.7, music: saved.music ?? true, haptics: saved.haptics ?? true, dice: saved.dice || 'physical', setup: saved.setup ?? true,
  finish: saved.finish || 'painted',
  detected,
  get tierName() { return this.preset === 'auto' ? detected.tier : this.preset; },
  /** paramètres effectifs = preset + surcharges manuelles */
  get gfx() { return { ...PRESETS[this.tierName], ...this.custom }; },
  set(patch) {
    const before = this.gfx;
    if ('preset' in patch) { this.preset = patch.preset; this.custom = {}; }
    for (const k of ['volume', 'music', 'haptics', 'finish', 'dice', 'setup']) if (k in patch) this[k] = patch[k];
    if (patch.gfx) Object.assign(this.custom, patch.gfx);
    try { localStorage.setItem(KEY, JSON.stringify({ preset: this.preset, custom: this.custom, volume: this.volume, music: this.music, haptics: this.haptics, finish: this.finish, dice: this.dice, setup: this.setup })); } catch {}
    const after = this.gfx;
    const needReload = RELOAD_KEYS.some(k => before[k] !== after[k]);
    subs.forEach(f => f(this, { needReload }));
    return needReload;
  },
  subscribe(f) { subs.add(f); return () => subs.delete(f); },
};
