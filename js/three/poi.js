// Marqueur 3D de point d'intérêt, construit à partir du dessin SVG (js/core/poi-art.js) :
// socle de pierre hexagonal, pied en bronze tourné (même profil que le plan), médaillon riveté
// flottant qui pivote lentement, halo chaud et lueur au sol.
import * as THREE from 'three';
import { POI_PROFILE, POI_DIM, poiFaceSVG } from '../core/poi-art.js';
import { radialTexture, maxAniso } from './textures.js';

const faceCache = new Map();
function faceTexture(icon) {
  if (faceCache.has(icon)) return faceCache.get(icon);
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  const img = new Image();
  img.onload = () => { c.getContext('2d').drawImage(img, 0, 0, 512, 512); t.needsUpdate = true; };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(poiFaceSVG(icon));
  faceCache.set(icon, t); return t;
}

/** Disque du médaillon debout (faces vers ±Z), UV des deux faces recalculées pour que l'image se lise de face comme de dos. */
function discGeometry(d) {
  const geo = new THREE.CylinderGeometry(d.medalR, d.medalR, d.medalT, 48, 1).rotateX(Math.PI / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv, idx = geo.index;
  for (const [gi, sign] of [[1, 1], [2, -1]]) {
    const gr = geo.groups[gi];
    for (let i = gr.start; i < gr.start + gr.count; i++) { const v = idx.getX(i); uv.setXY(v, sign * pos.getX(v) / (2 * d.medalR) + 0.5, pos.getY(v) / (2 * d.medalR) + 0.5); }
  }
  uv.needsUpdate = true; return geo;
}

let shared = null;
function sharedParts() {
  if (shared) return shared;
  const d = POI_DIM;
  const bronze = new THREE.MeshStandardMaterial({ color: 0xc8954a, metalness: 0.85, roughness: 0.32 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x5d564f, roughness: 0.9, flatShading: true });
  const stoneTop = new THREE.MeshStandardMaterial({ color: 0x7a7067, roughness: 0.85, flatShading: true });
  shared = {
    bronze, stone, stoneTop,
    plinth: new THREE.CylinderGeometry(d.plinthR * 0.9, d.plinthR, d.plinthH, 6, 1),
    plinthCap: new THREE.CylinderGeometry(d.plinthR * 0.78, d.plinthR * 0.9, d.plinthH * 0.35, 6, 1),
    stem: new THREE.LatheGeometry(POI_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 28),
    disc: discGeometry(d),
    rim: new THREE.TorusGeometry(d.medalR, d.medalT * 0.42, 10, 48),
    halo: new THREE.SpriteMaterial({ map: radialTexture('rgba(255,210,122,0.9)', 'rgba(255,170,60,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }),
    pool: new THREE.MeshBasicMaterial({ map: radialTexture('rgba(255,200,110,0.8)', 'rgba(255,170,60,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }),
  };
  return shared;
}

/** Plaque de nom sous le marqueur (sprite face caméra, toujours lisible) */
function nameLabel(text) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); c.width = 640; c.height = 120;
  g.font = '600 50px Cinzel, Georgia, serif';
  const w = Math.min(620, g.measureText(text).width + 70), x = (640 - w) / 2;
  const grd = g.createLinearGradient(0, 16, 0, 104); grd.addColorStop(0, 'rgba(46,24,12,0.94)'); grd.addColorStop(1, 'rgba(16,9,5,0.94)');
  g.fillStyle = grd; g.beginPath(); g.roundRect(x, 16, w, 88, 14); g.fill();
  g.strokeStyle = '#e2b45c'; g.lineWidth = 5; g.stroke();
  g.strokeStyle = 'rgba(226,180,92,0.45)'; g.lineWidth = 2; g.beginPath(); g.roundRect(x + 9, 25, w - 18, 70, 9); g.stroke();
  for (const px of [x + 18, x + w - 18]) { g.fillStyle = '#e2b45c'; g.beginPath(); g.moveTo(px, 52); g.lineTo(px + 6, 60); g.lineTo(px, 68); g.lineTo(px - 6, 60); g.fill(); }
  g.fillStyle = '#f6e2b0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 6;
  g.fillText(text, 320, 62, w - 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true }));
  sp.center.set(0.5, 1.0); sp.scale.set(0.34, 0.064, 1); sp.renderOrder = 11;
  return sp;
}

/** Marqueur complet (nom affiché dessous si fourni). userData.spin = médaillon (animé par update), userData.glow = halo. */
export function makePoiMarker(icon = 'place', scale = 1, name = '') {
  const p = sharedParts(), d = POI_DIM, g = new THREE.Group();
  const plinth = new THREE.Mesh(p.plinth, p.stone); plinth.position.y = d.plinthH / 2; plinth.rotation.y = Math.PI / 6;
  const cap = new THREE.Mesh(p.plinthCap, p.stoneTop); cap.position.y = d.plinthH + d.plinthH * 0.175; cap.rotation.y = Math.PI / 6;
  const stem = new THREE.Mesh(p.stem, p.bronze); stem.position.y = d.plinthH * 1.35;
  for (const m of [plinth, cap, stem]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
  const pool = new THREE.Mesh(new THREE.CircleGeometry(d.plinthR * 1.6, 32).rotateX(-Math.PI / 2), p.pool.clone()); pool.position.y = 0.003; pool.renderOrder = 3; g.add(pool);

  const medal = new THREE.Group(); medal.position.y = d.medalY;
  const ft = faceTexture(icon), face = new THREE.MeshStandardMaterial({ map: ft, emissiveMap: ft, emissive: 0xffffff, emissiveIntensity: 0.38, metalness: 0.15, roughness: 0.4 });
  const disc = new THREE.Mesh(p.disc, [p.bronze, face, face]); disc.castShadow = true; medal.add(disc);
  const rim = new THREE.Mesh(p.rim, p.bronze); medal.add(rim);
  const halo = new THREE.Sprite(p.halo.clone()); halo.scale.setScalar(d.medalR * 4.2); halo.position.z = -0.004; halo.renderOrder = 4; medal.add(halo);
  g.add(medal);
  if (name) { const lab = nameLabel(name); lab.position.y = 0.004; g.add(lab); g.userData.label = lab; }
  g.scale.setScalar(scale);
  g.userData.spin = medal; g.userData.glow = halo; g.userData.pool = pool;
  return g;
}

/** Animation par image : rotation lente + flottement + pulsation du halo */
export function animatePoi(m, dt, t) {
  const s = m.userData.spin; if (!s) { m.rotation.y += dt * 0.8; return; }
  s.rotation.y += dt * 0.9;
  s.position.y = POI_DIM.medalY + Math.sin(t * 2 + m.id) * 0.008;
  const k = 0.5 + Math.sin(t * 3 + m.id) * 0.12;
  m.userData.glow.material.opacity = k; m.userData.pool.material.opacity = k * 0.8;
}
