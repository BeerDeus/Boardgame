// Textures : chargement + génération procédurale (dos de tuile, icônes, sprites).
import * as THREE from 'three';
import { TERRAINS, texUrl } from '../core/terrains.js';

const loader = new THREE.TextureLoader();
const cache = new Map();
export let maxAniso = 4;
export const setMaxAniso = v => (maxAniso = Math.min(8, v));

export function loadTex(url, { repeat = 1, srgb = true } = {}) {
  const k = url + '|' + repeat;
  if (cache.has(k)) return cache.get(k);
  const p = loader.loadAsync(url).then(t => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = maxAniso;
    return t;
  });
  cache.set(k, p); return p;
}
export const terrainTex = (terrain, repeat = 1) => loadTex(texUrl(TERRAINS[terrain].tex), { repeat });
export const loadImage = url => { const k = 'img|' + url; if (!cache.has(k)) cache.set(k, new THREE.ImageLoader().loadAsync(url)); return cache.get(k); };

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function toTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; }

/** Dos de tuile : cuir sombre, bordure dorée, sceau */
const backCache = new Map();
export function tileBackTexture(aspect = 1, hex = false) {
  const key = aspect.toFixed(2) + hex; if (backCache.has(key)) return backCache.get(key);
  const S = 512, W = Math.round(S * aspect), [c, g] = canvas(W, S);
  const grd = g.createRadialGradient(W / 2, S / 2, 40, W / 2, S / 2, W * 0.75);
  grd.addColorStop(0, '#3a2a22'); grd.addColorStop(1, '#120c0a'); g.fillStyle = grd; g.fillRect(0, 0, W, S);
  for (let i = 0; i < 2500 * aspect; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,220,180' : '0,0,0'},${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * S, 2, 2); }
  if (!hex) { g.strokeStyle = '#b8914a'; g.lineWidth = 10; g.strokeRect(22, 22, W - 44, S - 44); g.lineWidth = 3; g.strokeRect(40, 40, W - 80, S - 80); }
  g.translate(W / 2, S / 2); g.strokeStyle = '#c9a45c'; g.lineWidth = 6;
  g.beginPath(); g.arc(0, 0, 110, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 90, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, -90); g.lineTo(10, -128); g.lineTo(-10, -128); g.closePath(); g.fillStyle = '#c9a45c'; g.fill(); }
  // œil symétrique (pas de sens de lecture -> indépendant du retournement)
  g.beginPath(); g.moveTo(-62, 0); g.quadraticCurveTo(0, -58, 62, 0); g.quadraticCurveTo(0, 58, -62, 0); g.closePath();
  g.fillStyle = '#2a1c14'; g.fill(); g.lineWidth = 5; g.stroke();
  g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.fillStyle = '#c9a45c'; g.fill();
  g.beginPath(); g.ellipse(0, 0, 6, 16, 0, 0, Math.PI * 2); g.fillStyle = '#120c0a'; g.fill();
  const t = toTex(c); backCache.set(key, t); return t;
}

const iconCache = new Map();
export function iconTexture(char, bg = '#1d1612', fg = '#e8c165') {
  const k = char + bg + fg; if (iconCache.has(k)) return iconCache.get(k);
  const S = 128, [c, g] = canvas(S, S);
  g.fillStyle = bg; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = fg; g.lineWidth = 6; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 10, 0, Math.PI * 2); g.stroke();
  g.fillStyle = fg; g.font = 'bold 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(char, S / 2, S / 2 + 4);
  const t = toTex(c); iconCache.set(k, t); return t;
}

const radCache = new Map();
export function radialTexture(inner = '#fff', outer = '#fff') {
  const k = inner + outer; if (radCache.has(k)) return radCache.get(k);
  const S = 64, [c, g] = canvas(S, S);
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, inner); grd.addColorStop(0.35, outer); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  const t = toTex(c); radCache.set(k, t); return t;
}

/** Anneau lumineux (sélection / surbrillance) */
let ringTex = null;
export function ringTexture() {
  if (ringTex) return ringTex;
  const S = 256, [c, g] = canvas(S, S);
  const grd = g.createRadialGradient(S / 2, S / 2, S * 0.28, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.55, 'rgba(255,255,255,1)'); grd.addColorStop(0.7, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return (ringTex = toTex(c));
}

/** Contour lumineux pour surbrillance de tuile (rectangle à bords doux) */
const frameCache = new Map();
export function frameTexture(aspect = 1) {
  const k = aspect.toFixed(2); if (frameCache.has(k)) return frameCache.get(k);
  const H = 256, W = Math.round(256 * aspect), [c, g] = canvas(W, H);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(255,255,255,${(1 - i / 14) * 0.5})`; g.lineWidth = 2; g.strokeRect(i * 2 + 4, i * 2 + 4, W - i * 4 - 8, H - i * 4 - 8); }
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(4, 4, W - 8, H - 8);
  const t = toTex(c); frameCache.set(k, t); return t;
}

/** Face de carte imprimée : terrain + vignettage + cartouche avec le nom */
export async function cardFaceTexture(terrain, name, label, w = 768, h = 512) {
  const img = await loadImage(texUrl(TERRAINS[terrain].tex));
  const [c, g] = canvas(w, h);
  const s = Math.max(w, h) / img.width; g.drawImage(img, 0, 0, img.width * s, img.height * s);
  const v = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.65);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,6,4,0.75)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#1a120c'; g.lineWidth = 18; g.strokeRect(0, 0, w, h);
  g.strokeStyle = '#c9a45c'; g.lineWidth = 4; g.strokeRect(16, 16, w - 32, h - 32);
  const bw = Math.min(w * 0.62, 40 + name.length * 22), bx = (w - bw) / 2, by = h - 74;
  g.fillStyle = 'rgba(20,14,10,0.85)'; g.beginPath(); g.moveTo(bx - 18, by + 26); g.lineTo(bx, by); g.lineTo(bx + bw, by); g.lineTo(bx + bw + 18, by + 26); g.lineTo(bx + bw, by + 52); g.lineTo(bx, by + 52); g.closePath(); g.fill();
  g.strokeStyle = '#c9a45c'; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = '#ecd9a6'; g.font = '600 30px "Cinzel", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, by + 27);
  g.fillStyle = 'rgba(236,217,166,0.75)'; g.font = 'italic 20px Georgia, serif'; g.fillText(label, w / 2, 44);
  return toTex(c);
}
