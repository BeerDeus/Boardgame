// Plateau 3D générique : tuiles (via fabrique fournie par le moteur), figurines, déplacements,
// surbrillances, POI, caméra cinématique. Implémente l'API moteur commune.
import * as THREE from 'three';
import { tween, ease, cancelTweens, nearestAngle, wait } from '../core/tween.js';
import { makeFigure, flash, preloadGLB, applyFinish, playAnim, hasAnim } from './figures.js';
import { settings } from '../core/settings.js';
import { sfx } from '../core/sfx.js';
import { iconTexture, ringTexture, radialTexture } from './textures.js';
import { makePoiMarker, animatePoi } from './poi.js';

const V = () => new THREE.Vector3();

// Plaque de nom, différente selon le camp : héros (sombre, bordure couleur du héros + écusson étoilé),
// PNJ (parchemin clair + pastille « PNJ »), monture, ennemis (rouge sombre + crâne).
const LABEL = {
  hero:  { bg: 'rgba(14,10,8,0.92)', fg: '#fff1cc', lw: 10 },
  npc:   { bg: 'rgba(238,224,192,0.96)', fg: '#24130a', border: '#8a6a3a', lw: 5, tag: 'PNJ' },
  mount: { bg: 'rgba(238,224,192,0.96)', fg: '#24130a', border: '#8a6a3a', lw: 5, tag: 'MONTURE' },
  enemy: { bg: 'rgba(48,8,6,0.94)', fg: '#ffd9cf', border: '#d0402e', lw: 7 },
};
function makeLabel(text, color, team = 'hero') {
  const st = LABEL[team === 'boss' ? 'enemy' : team] || LABEL.hero;
  const c = document.createElement('canvas'), g = c.getContext('2d'); c.width = 640; c.height = 112;
  g.font = '600 52px Cinzel, Georgia, serif'; const tw = g.measureText(text).width;
  g.font = '700 30px Georgia, serif'; const tagW = st.tag ? g.measureText(st.tag).width + 26 : 0;
  const badge = team === 'hero' || team === 'enemy' || team === 'boss' ? 64 : 0;
  const w = Math.min(624, tw + 56 + (tagW ? tagW + 12 : 0) + badge), x = (640 - w) / 2;
  g.fillStyle = st.bg; g.beginPath(); g.roundRect(x, 14, w, 84, 20); g.fill();
  g.strokeStyle = st.border || color; g.lineWidth = st.lw; g.stroke();
  let cx = x + 28;
  if (team === 'hero') { // écusson rond à la couleur du héros, étoile dorée
    g.fillStyle = color; g.beginPath(); g.arc(cx + 22, 56, 24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffe29a'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#ffe9b0'; g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 16, an = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(cx + 22 + Math.cos(an) * r, 56 + Math.sin(an) * r); }
    g.fill(); cx += badge;
  } else if (badge) { // crâne
    g.fillStyle = '#d0402e'; g.beginPath(); g.arc(cx + 22, 56, 24, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffe0d6'; g.beginPath(); g.arc(cx + 22, 52, 13, 0, Math.PI * 2); g.fill(); g.fillRect(cx + 15, 58, 14, 10);
    g.fillStyle = '#d0402e'; g.beginPath(); g.arc(cx + 17, 52, 4, 0, Math.PI * 2); g.arc(cx + 27, 52, 4, 0, Math.PI * 2); g.fill();
    cx += badge;
  }
  if (st.tag) {
    g.fillStyle = '#6b4a22'; g.beginPath(); g.roundRect(cx - 6, 34, tagW, 44, 10); g.fill();
    g.fillStyle = '#fff3d6'; g.font = '700 30px Georgia, serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(st.tag, cx + 7, 57);
    cx += tagW + 6;
  }
  g.font = '600 52px Cinzel, Georgia, serif'; g.fillStyle = st.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, (cx + x + w - 22) / 2, 58, x + w - 22 - cx);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  sp.center.set(0.5, 1.15); sp.scale.set(0.525, 0.092, 1); sp.position.y = 0.02; sp.renderOrder = 10;
  return sp;
}
/** Plaque de groupe « ×N » (figurines trop serrées sur une case quand on dézoome) : pastilles colorées par figurine */
const TEAM_DOT = { npc: '#e8d8b0', mount: '#e8d8b0', enemy: '#d0402e', boss: '#ff5a3a' };
function makeGroupLabel(list) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); c.width = 640; c.height = 112;
  const n = list.length, dots = Math.min(n, 6), w = 150 + dots * 46, x = (640 - w) / 2;
  const foes = list.some(d => d.team === 'enemy' || d.team === 'boss');
  g.fillStyle = foes ? 'rgba(48,8,6,0.94)' : 'rgba(14,10,8,0.92)'; g.beginPath(); g.roundRect(x, 14, w, 84, 20); g.fill();
  g.strokeStyle = foes ? '#d0402e' : '#c9a45c'; g.lineWidth = 7; g.stroke();
  list.slice(0, dots).forEach((d, i) => { g.fillStyle = TEAM_DOT[d.team] || d.base || d.color || '#fff'; g.beginPath(); g.arc(x + 42 + i * 46, 56, 18, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#120c08'; g.lineWidth = 4; g.stroke(); });
  g.font = '700 72px Cinzel, Georgia, serif'; g.fillStyle = foes ? '#ffd9cf' : '#fff1cc'; g.textAlign = 'right'; g.textBaseline = 'middle';
  g.fillText(`×${n}`, x + w - 22, 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  sp.center.set(0.5, 0); sp.renderOrder = 11; return sp;
}
/** Bulle « … » flottant au-dessus des PNJ : on les reconnaît d'un coup d'œil (on peut leur parler). */
let bubbleTex = null;
function makeBubble() {
  if (!bubbleTex) {
    const c = document.createElement('canvas'), g = c.getContext('2d'); c.width = 160; c.height = 140;
    g.fillStyle = '#f3e6c4'; g.strokeStyle = '#8a6a3a'; g.lineWidth = 7;
    g.beginPath(); g.roundRect(10, 10, 140, 92, 34); g.moveTo(62, 100); g.lineTo(80, 130); g.lineTo(96, 100); g.fill(); g.stroke();
    g.fillStyle = '#f3e6c4'; g.fillRect(64, 92, 30, 12);
    g.fillStyle = '#5a3a1a'; for (const x of [52, 80, 108]) { g.beginPath(); g.arc(x, 56, 9, 0, Math.PI * 2); g.fill(); }
    bubbleTex = new THREE.CanvasTexture(c); bubbleTex.colorSpace = THREE.SRGBColorSpace;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, depthTest: false, transparent: true }));
  sp.center.set(0.5, 0); sp.scale.set(0.16, 0.14, 1); sp.renderOrder = 10;
  return sp;
}

export class Board3D {
  constructor(stage, grid, o) {
    this.s = stage; this.grid = grid;
    this.o = Object.assign({ figScale: 1, focusDist: 5, homeDist: 9, homeYaw: 0, cineDist: 2.2, cinePitch: 0.24, cineAngle: 1.05, poiScale: 1 }, o);
    this.tiles = new Map(); this.figs = new Map(); this.occ = new Map(); this.dying = new Set(); this.pinnedCodes = new Set();
    this.root = new THREE.Group(); stage.scene.add(this.root);
    this.supports = { shadows: true };
    this.menu = [];
    this.o.baseFigScale = this.o.figScale; this.finish = settings.finish; this.marks = new Map();
    this.groups = new Map(); this.groupsDirty = true; this.lastWpp = 0; // lisibilité au dézoom
    this.supports.postfx = !!o.postfx; this.supports.aa = true;
    this.reachMat = new THREE.MeshBasicMaterial({ color: 0xf0c060, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, map: o.overlayTex || null });
    this.exploreMat = new THREE.MeshBasicMaterial({ color: 0x6fb3ff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, map: o.overlayTex || null });
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: ringTexture(), color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.012; this.ring.visible = false; this.ring.renderOrder = 2;
    this.dustTex = radialTexture('rgba(200,190,170,0.9)', 'rgba(150,140,120,0.5)');
    stage.onTap = (x, y) => this.tap(x, y);
    stage.onLongPress = (x, y) => { const h = this.pickAt(x, y); if (h?.key) this.onLongPress?.(h.key); };
    stage.onFps = n => this.onFps?.(n);
    stage.updates.add((dt, t) => this.update(dt, t));
  }
  async preload() { await preloadGLB(); }

  // ---------- tuiles ----------
  addTile(data) {
    const cell = this.grid.get(data.key);
    const t = this.o.createTile(cell, data, this);
    Object.assign(t, { data, cell, revealed: !!data.revealed });
    t.group.position.set(cell.x, 0, cell.z);
    t.hit.userData.tileKey = data.key;
    t.overlay.visible = false; t.overlay.renderOrder = 1;
    this.root.add(t.group); this.tiles.set(data.key, t);
    if (data.poi) {
      const tok = makePoiMarker(data.poi.icon, this.o.poiScale, data.poi.name || data.name || data.poi.label || ''); tok.userData.s = this.o.poiScale;
      tok.position.set(cell.x + t.poiPos.x, t.topY, cell.z + t.poiPos.z);
      tok.userData.poiKey = data.key; t.poiHidden = !!data.poiHidden; tok.visible = t.revealed && !t.poiHidden; t.poi = tok; this.root.add(tok);
    }
    t.reveal(false, t.revealed);
    t.group.visible = t.revealed; // brouillard total : tuile invisible tant qu'elle n'est pas découverte
    return t;
  }
  /** Découverte d'une tuile : elle tombe du ciel et se pose, son numéro (code de la tuile physique) bien visible. */
  async revealTile(key, { focus = true } = {}) {
    const t = this.tiles.get(key); if (!t || t.revealed) return;
    t.revealed = true;
    if (focus) this.s.rig.flyTo({ x: t.cell.x, z: t.cell.z, dist: Math.min(this.s.rig.goal.dist, this.o.focusDist * 1.3) }, 5);
    t.group.visible = true; this.s.invalidate(4);
    let landed = false;
    const onLand = () => {
      if (landed) return; landed = true;
      const p = new THREE.Vector3(t.cell.x, t.topY, t.cell.z);
      this.dust(p, 14, this.grid.w * 0.62); this.dust(p, 6, this.grid.w * 0.25, 0x8a7a66);
      this.s.rig.shake(0.018); sfx.land();
      this.showCode(key, true, { pop: true });
      setTimeout(() => { if (!this.pinnedCodes.has(key)) this.showCode(key, false); }, 2600);
    };
    await t.reveal(true, true, { onLand });
    onLand();
    if (t.poi && !t.poiHidden) this.popPoi(t);
  }
  // ---------- numéro de tuile (sprite face caméra, au centre de la tuile) ----------
  codeLabel(t) {
    if (t.codeSp || !t.data.code) return t.codeSp;
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = 'rgba(14,10,8,0.86)'; g.beginPath(); g.roundRect(10, 14, 236, 100, 22); g.fill();
    g.strokeStyle = '#ecd9a6'; g.lineWidth = 6; g.stroke();
    g.font = '700 62px Cinzel, Georgia, serif'; g.fillStyle = '#ffe9b0'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(255,200,90,0.7)'; g.shadowBlur = 10; g.fillText(t.data.code, 128, 68);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
    sp.userData.w = this.grid.w * 0.62; sp.scale.set(sp.userData.w, sp.userData.w / 2, 1);
    sp.position.set(0, t.topY + 0.2, 0); sp.renderOrder = 12; sp.visible = false;
    (t.top || t.group).add(sp); t.codeSp = sp; return sp;
  }
  showCode(key, on, { pop = false } = {}) {
    const t = this.tiles.get(key), sp = t && t.revealed && this.codeLabel(t); if (!sp) return;
    const tag = 'code:' + key, m = sp.material, o0 = m.opacity, w = sp.userData.w;
    cancelTweens(tag);
    if (on) {
      sp.visible = true;
      tween({ tag, duration: pop ? 0.5 : 0.25, ease: pop ? ease.outBack : ease.outCubic, update: (e, k) => {
        m.opacity = o0 + (1 - o0) * Math.min(1, k * 2.5);
        const s = pop ? 1.8 - 0.8 * e : 1; sp.scale.set(w * s, w * s / 2, 1);
      } });
    } else {
      tween({ tag, duration: 0.45, update: e => { m.opacity = o0 * (1 - e); } }).then(() => { if (m.opacity < 0.02) sp.visible = false; });
    }
    this.s.invalidate?.(4);
  }
  /** Numéros affichés en continu (pendant la consigne de mise en place), puis masqués */
  showCodes(keys, on) { for (const k of keys) { if (on) this.pinnedCodes.add(k); else this.pinnedCodes.delete(k); this.showCode(k, on); } }
  popPoi(t) { const p = t.poi, s = p.userData.s || 1; p.visible = true; p.scale.setScalar(0.01); tween({ duration: 0.55, ease: ease.outBack, update: k => p.scale.setScalar(Math.max(0.01, k * s)) }); }
  highlight(reach, explore) {
    const R = new Set(reach), E = new Set(explore);
    for (const [k, t] of this.tiles) {
      const m = R.has(k) ? this.reachMat : E.has(k) ? this.exploreMat : null;
      t.overlay.visible = !!m; if (m) t.overlay.material = m;
    }
  }

  // ---------- figurines ----------
  /** Emplacement d'une figurine sur sa case ; si la case porte un point d'intérêt, le groupe est décalé à l'opposé du marqueur. */
  slotPos(key, i, n) {
    const t = this.tiles.get(key), s = this.grid.slots(n)[i];
    let ox = 0, oz = 0, k = 1;
    if (t.poi && t.poiPos) { ox = -t.poiPos.x * 0.42; oz = -t.poiPos.z * 0.42; k = 0.82; }
    return new THREE.Vector3(t.cell.x + s.x * k + ox, t.topY, t.cell.z + s.z * k + oz);
  }
  arrange(key, skip) {
    const ids = this.occ.get(key) || [];
    ids.forEach((id, i) => {
      if (id === skip) return;
      const f = this.figs.get(id); const from = f.position.clone(), to = this.slotPos(key, i, ids.length);
      if (from.distanceTo(to) < 0.001) return;
      cancelTweens(id);
      tween({ tag: id, duration: 0.35, ease: ease.outCubic, update: k => f.position.lerpVectors(from, to, k) });
    });
  }
  occPush(key, id) { if (!this.occ.has(key)) this.occ.set(key, []); this.occ.get(key).push(id); this.groupsDirty = true; }
  occRemove(key, id) { const a = this.occ.get(key); if (a) { const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); } this.groupsDirty = true; }
  /**
   * Lisibilité en vue d'ensemble : les plaques de nom grossissent quand on dézoome (taille minimale à l'écran),
   * et quand les figurines d'une case sont trop serrées, leurs plaques sont remplacées par une seule « ×N ».
   */
  updateLegibility() {
    const wpp = this.s.rig.worldPerPx();
    if (!this.groupsDirty && Math.abs(wpp - this.lastWpp) / (this.lastWpp || 1) < 0.02) return;
    this.lastWpp = wpp; this.groupsDirty = false;
    const fs = this.o.figScale, minPx = Math.min(36, Math.max(26, this.s.renderer.domElement.clientHeight * 0.05));
    const k = Math.max(1, Math.min(7, (minPx * wpp) / (0.092 * fs))); // facteur d'agrandissement des plaques
    const plateW = 0.525 * fs * k * 0.62; // largeur utile d'une plaque (monde)
    const spacing = this.grid.w * 0.21 * 1.4; // écart entre deux emplacements de figurines sur une case
    const tight = plateW > spacing * 1.15;
    const show = this.labels !== false;
    const want = new Set();
    for (const [key, ids0] of this.occ) {
      const ids = ids0.filter(id => this.figs.has(id) && !this.figs.get(id).userData.hidden);
      const grouped = tight && ids.length >= 2;
      for (const id of ids) { const f = this.figs.get(id), lab = f.userData.label; if (!lab) continue; lab.scale.set(0.525 * k, 0.092 * k, 1); lab.visible = show && !grouped; }
      if (!grouped) continue;
      want.add(key);
      const sig = ids.join('|'); let gl = this.groups.get(key);
      if (gl && gl.userData.sig !== sig) { this.root.remove(gl); gl.material.map.dispose(); gl.material.dispose(); gl = null; }
      if (!gl) { gl = makeGroupLabel(ids.map(id => this.figs.get(id).userData.data)); gl.userData.sig = sig; this.root.add(gl); this.groups.set(key, gl); }
      const t = this.tiles.get(key); gl.position.set(t.cell.x, t.topY + 0.02, t.cell.z + this.grid.h * 0.32);
      gl.scale.set(0.525 * fs * k, 0.092 * fs * k, 1); gl.visible = show;
    }
    for (const [key, gl] of this.groups) if (!want.has(key)) { this.root.remove(gl); gl.material.map.dispose(); gl.material.dispose(); this.groups.delete(key); }
  }

  async addFigure(data, key, { spawn = false } = {}) {
    const f = await makeFigure(data);
    f.scale.setScalar(this.o.figScale); f.userData.key = key; f.userData.data = data;
    if (this.finish !== 'painted') applyFinish(f, this.finish);
    this.figs.set(data.id, f); this.root.add(f);
    this.occPush(key, data.id);
    const ids = this.occ.get(key);
    f.position.copy(this.slotPos(key, ids.length - 1, ids.length));
    f.rotation.y = (Math.random() - 0.5) * 0.6;
    this.arrange(key, data.id);
    f.userData.restIdle = data.idle || 'idle';
    // étiquette de nom toujours lisible (sprite face caméra, sous le socle à l'écran)
    const lab = makeLabel(data.name, data.base || data.color, data.team); lab.visible = this.labels !== false; f.add(lab); f.userData.label = lab;
    if (data.team === 'npc') { // bulle de dialogue au-dessus de la tête
      const bub = makeBubble(); bub.position.y = (f.userData.height || 0.7) + 0.06; bub.userData.base = bub.position.y; f.add(bub); f.userData.bubble = bub;
    } else if (data.team === 'hero') { // halo au sol à la couleur du héros
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(data.base || data.color), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      ring.position.y = 0.006; ring.renderOrder = 2; f.add(ring); f.userData.heroRing = ring;
    }
    if (spawn) {
      const y0 = f.position.y; f.scale.setScalar(0.01);
      this.dust(f.position.clone(), 10, 0.5, 0x2a2420);
      const rise = hasAnim(f, 'spawn') ? playAnim(f, 'spawn') : null;
      await tween({ duration: 0.6, ease: ease.outBack, update: k => { f.scale.setScalar(Math.max(0.01, k * this.o.figScale)); f.position.y = y0 + (1 - k) * -0.2; } });
      if (rise) { await rise; playAnim(f, f.userData.restIdle, { loop: true }); }
    }
  }
  /** animation ponctuelle (talk, cheer, cast…) ou nouvelle pose de repos (loop) */
  async animate(id, key, { loop = false } = {}) {
    const f = this.figs.get(id); if (!f) return;
    if (loop) { f.userData.restIdle = key; return playAnim(f, key, { loop: true }); }
    await playAnim(f, key); playAnim(f, f.userData.restIdle, { loop: true });
  }
  async removeFigure(id, { animate = true } = {}) {
    const f = this.figs.get(id); if (!f) return;
    const key = f.userData.key; this.occRemove(key, id); this.figs.delete(id);
    if (this.ring.parent === f) this.setSelected(null);
    this.dying.add(f); // son animation de mort doit continuer à être mise à jour
    if (animate && hasAnim(f, 'death')) {
      await playAnim(f, 'death');
      await tween({ duration: 0.5, update: k => { f.position.y -= 0.004; f.scale.setScalar(Math.max(0.01, (1 - k) * this.o.figScale)); } });
    } else if (animate) {
      const inner = f.userData.inner;
      await tween({ duration: 0.45, ease: ease.inQuad, update: k => { inner.rotation.x = -k * Math.PI / 2; inner.position.y = k * 0.02; } });
      await tween({ duration: 0.35, update: k => f.scale.setScalar(Math.max(0.01, (1 - k) * this.o.figScale)) });
    }
    this.dying.delete(f); this.root.remove(f); this.arrange(key);
  }
  async hop(f, to, h = 0.22) {
    const walker = hasAnim(f, 'move'); if (walker) h = 0.05;
    const from = f.position.clone(), dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
    const yaw0 = f.rotation.y, yaw1 = d > 0.01 ? nearestAngle(yaw0, Math.atan2(dx, dz)) : yaw0;
    const inner = f.userData.inner;
    await tween({ duration: 0.24 + d * 0.06, ease: ease.inOutSine, update: k => {
      f.position.lerpVectors(from, to, k); f.position.y += Math.sin(Math.PI * k) * h * this.o.figScale;
      f.rotation.y = yaw0 + (yaw1 - yaw0) * Math.min(1, k * 3);
      if (!walker) inner.rotation.x = Math.sin(Math.PI * k) * 0.12;
    } });
    tween({ duration: 0.16, ease: ease.outQuad, update: k => inner.scale.set(1 + Math.sin(Math.PI * k) * 0.08, 1 - Math.sin(Math.PI * k) * 0.12, 1 + Math.sin(Math.PI * k) * 0.08) });
    this.dust(to.clone(), 4, 0.18);
  }
  async moveFigure(id, path, { follow = true } = {}) {
    const f = this.figs.get(id); if (!f || path.length < 2) return;
    cancelTweens(id);
    const last = path[path.length - 1];
    this.occRemove(path[0], id); this.arrange(path[0]);
    this.occPush(last, id); this.arrange(last, id); f.userData.key = last;
    if (follow) { this.s.rig.follow = f; this.s.rig.k = 5; }
    (this.moving ||= new Set()).add(id);
    const walker = hasAnim(f, 'move'); if (walker) playAnim(f, 'move', { loop: true });
    for (let i = 1; i < path.length; i++) {
      const t = this.tiles.get(path[i]);
      const to = i === path.length - 1 ? this.slotPos(last, this.occ.get(last).indexOf(id), this.occ.get(last).length) : new THREE.Vector3(t.cell.x, t.topY, t.cell.z);
      await this.hop(f, to);
    }
    if (walker) playAnim(f, hasAnim(f, f.userData.restIdle) ? f.userData.restIdle : 'idle', { loop: true });
    if (this.s.rig.follow === f) this.s.rig.follow = null;
    this.moving.delete(id); this.s.invalidate();
  }
  async bump(id, targetId) {
    const f = this.figs.get(id); if (!f) return;
    const tg = targetId && this.figs.get(targetId);
    if (!tg) {
      if (hasAnim(f, 'cheer')) { await this.animate(id, 'cheer'); return; }
      const y = f.position.y; await tween({ duration: 0.3, update: k => (f.position.y = y + Math.sin(Math.PI * k) * 0.15) }); return;
    }
    const from = f.position.clone(), dir = tg.position.clone().sub(from); dir.y = 0;
    f.rotation.y = nearestAngle(f.rotation.y, Math.atan2(dir.x, dir.z));
    tg.rotation.y = nearestAngle(tg.rotation.y, Math.atan2(-dir.x, -dir.z));
    const reach = from.clone().addScaledVector(dir, Math.min(0.75, 0.25 / Math.max(0.01, dir.length()) * 2));
    const atk = hasAnim(f, 'attack') ? this.animate(id, 'attack') : null;
    if (atk) await new Promise(r => setTimeout(r, 380));
    await tween({ duration: 0.14, ease: ease.inQuad, update: k => f.position.lerpVectors(from, reach, k) });
    flash(tg); this.s.rig.shake(0.05); this.dust(tg.position.clone(), 6, 0.25, 0x5a1a12);
    if (hasAnim(tg, 'hit')) this.animate(targetId, 'hit');
    const tp = tg.position.clone(), kb = tp.clone().addScaledVector(dir.normalize(), 0.06);
    tween({ duration: 0.25, update: k => tg.position.lerpVectors(kb, tp, k) });
    await tween({ duration: 0.25, ease: ease.outCubic, update: k => f.position.lerpVectors(reach, from, k) });
  }
  setLabels(v) { this.labels = v; for (const f of this.figs.values()) for (const k of ['label', 'bubble']) if (f.userData[k]) f.userData[k].visible = v; this.groupsDirty = true; this.s.invalidate(); }
  setRingColor(hex) { this.ring.material.color.setHex(hex); }
  setSelected(id) {
    const f = id && this.figs.get(id);
    if (!f) { this.ring.visible = false; this.ring.removeFromParent(); return; }
    f.add(this.ring); this.ring.visible = true;
  }

  // ---------- caméra ----------
  focusTile(key) { const t = this.tiles.get(key); if (t) this.s.rig.flyTo({ x: t.cell.x, z: t.cell.z, dist: Math.min(this.s.rig.goal.dist, this.o.focusDist * 1.4) }); }
  focusFigure(id, { soft = false } = {}) { const f = this.figs.get(id); if (f) this.s.rig.flyTo({ x: f.position.x, z: f.position.z, dist: soft ? undefined : this.o.focusDist }); }
  resetCamera(instant = false) { this.s.rig.pitchBias = 0; this.s.rig.flyTo({ x: 0, y: 0, z: 0, dist: this.o.homeDist, yaw: this.o.homeYaw }, 4); if (instant) this.s.rig.jump(); }
  cinematic({ ids, focus }) {
    const rig = this.s.rig;
    if (!this.saved) this.saved = { ...rig.goal, bias: rig.pitchBias };
    const fs = ids.map(i => this.figs.get(i)).filter(Boolean); const F = this.figs.get(focus); if (!F) return;
    const other = fs.find(f => f !== F) || F;
    const a = F.position, b = other.position, d = b.clone().sub(a); d.y = 0;
    // les figurines se font face
    if (d.length() > 0.01) {
      for (const [x, y] of [[F, other], [other, F]]) { const v = y.position.clone().sub(x.position); const target = nearestAngle(x.rotation.y, Math.atan2(v.x, v.z)); const r0 = x.rotation.y; tween({ duration: 0.4, update: k => (x.rotation.y = r0 + (target - r0) * k) }); }
    }
    // caméra : par-dessus l'épaule de l'interlocuteur, cadrée sur celui qui parle
    let yaw = d.length() > 0.01 ? Math.atan2(d.x, d.z) + this.o.cineAngle : rig.cur.yaw;
    const mid = a.clone().lerp(b, 0.35);
    // les autres figurines s'estompent pour ne pas masquer la scène
    for (const [id, f] of this.figs) this.fade(f, ids.includes(id) ? 1 : 0.15);
    rig.pitchOverride = this.o.cinePitch; rig.viewShift = 0.12;
    rig.flyTo({ x: mid.x, y: a.y + 0.35 * this.o.figScale, z: mid.z, dist: this.o.cineDist, yaw }, 3.2);
  }
  endCinematic() {
    const rig = this.s.rig; rig.pitchOverride = null; rig.viewShift = 0;
    for (const f of this.figs.values()) this.fade(f, 1);
    if (this.saved) { rig.pitchBias = this.saved.bias; rig.flyTo({ ...this.saved, y: 0 }, 3.2); this.saved = null; }
  }

  fade(f, target) {
    const mats = f.userData.mats, from = mats[0]?.opacity ?? 1;
    if (Math.abs(from - target) < 0.01) return;
    mats.forEach(m => { if (!m.transparent) { m.transparent = true; m.needsUpdate = true; } });
    tween({ duration: 0.4, update: k => mats.forEach(m => { m.opacity = from + (target - from) * k; m.depthWrite = m.opacity > 0.9; }) })
      .then(() => { if (target >= 1) mats.forEach(m => { m.transparent = false; m.depthWrite = true; m.needsUpdate = true; }); });
  }
  setFigScale(s) {
    s *= this.o.baseFigScale; this.o.figScale = s; this.groupsDirty = true;
    for (const f of this.figs.values()) { const s0 = f.scale.x; tween({ duration: 0.3, ease: ease.outBack, update: k => f.scale.setScalar(s0 + (s - s0) * k) }); }
  }

  // ---------- marqueurs de quête / POI dynamiques ----------
  mark(key, on) {
    const t = this.tiles.get(key); if (!t) return;
    if (!on) { const m = this.marks.get(key); if (m) { this.root.remove(m); this.marks.delete(key); this.s.invalidate(); } return; }
    if (this.marks.has(key)) return;
    const g = new THREE.Group();
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    gem.scale.y = 1.7; g.add(gem);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.6, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.35, depthWrite: false }));
    beam.position.y = -0.38; g.add(beam);
    g.position.set(t.cell.x, Math.max(t.topY, 0.1) + 0.85 * this.o.baseFigScale, t.cell.z); g.userData.base = g.position.y;
    this.root.add(g); this.marks.set(key, g); this.s.invalidate();
  }
  /** poi : true = dévoiler le jeton, null/false = le retirer */
  setPoi(key, poi) {
    const t = this.tiles.get(key); if (!t?.poi) return;
    if (poi) { if (t.poiHidden) { t.poiHidden = false; if (t.revealed) this.popPoi(t); } return; }
    const tok = t.poi; t.poi = null;
    const s = tok.userData.s || 1; tween({ duration: 0.35, ease: ease.inQuad, update: k => tok.scale.setScalar(Math.max(0.01, (1 - k) * s)) }).then(() => { this.root.remove(tok); this.arrange(key); });
  }
  screenPos(id) { const f = this.figs.get(id); if (!f) return null; return this.s.toScreen(f.position.clone().add(new THREE.Vector3(0, (f.userData.height || 0.75) * this.o.figScale, 0))); }
  setFinish(fin) { this.finish = fin; for (const f of this.figs.values()) applyFinish(f, fin); this.s.invalidate(); }
  nudge({ dx = 0, dy = 0, zoom = 0, rot = 0 }) { const r = this.s.rig; r.follow = null; if (dx || dy) r.pan(dx, dy); if (zoom) r.wheel(zoom); if (rot) r.goal.yaw += rot; }
  shake(a) { this.s.rig.shake(a); }
  applySettings(gfx) { this.s.apply(gfx); }

  // ---------- ambiance / perf ----------
  setTimeOfDay(v) { return this.s.setTimeOfDay(v); }
  setParticles(v) { this.s.setParticles(v); }
  setShadows(v) { this.s.setShadows(v); }
  setResolution(v) { this.s.setResolution(v); }

  // ---------- picking ----------
  pickAt(x, y) {
    const objs = [];
    for (const f of this.figs.values()) objs.push(f.userData.hit);
    for (const t of this.tiles.values()) { if (!t.revealed) continue; if (t.poi?.visible) objs.push(t.poi); objs.push(t.hit); }
    const h = this.s.pick(x, y, objs); if (!h) return null;
    let o = h.object; while (o && !o.userData.figureId && !o.userData.poiKey && !o.userData.tileKey) o = o.parent;
    if (!o) return null;
    if (o.userData.figureId) return { type: 'figure', id: o.userData.figureId, key: this.figs.get(o.userData.figureId)?.userData.key };
    if (o.userData.poiKey) return { type: 'poi', key: o.userData.poiKey };
    return { type: 'tile', key: o.userData.tileKey };
  }
  tap(x, y) { const h = this.pickAt(x, y) || { type: 'none' }; this.onTap?.(h); }

  // ---------- effets ----------
  dust(pos, n = 6, spread = 0.3, color = 0xbfb3a0) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dustTex, color, transparent: true, depthWrite: false, opacity: 0.55 }));
      const a = (i / n) * Math.PI * 2 + Math.random(), p0 = pos.clone().add(new THREE.Vector3(0, 0.04, 0));
      const p1 = p0.clone().add(new THREE.Vector3(Math.cos(a) * spread, 0.05 + Math.random() * 0.1, Math.sin(a) * spread));
      this.root.add(s);
      tween({ duration: 0.55 + Math.random() * 0.3, ease: ease.outCubic, update: k => { s.position.lerpVectors(p0, p1, k); s.scale.setScalar(0.08 + k * 0.25 * (spread + 0.3)); s.material.opacity = 0.55 * (1 - k); } })
        .then(() => { this.root.remove(s); s.material.dispose(); });
    }
  }
  update(dt, t) {
    this.updateLegibility();
    const p = 0.62 + Math.sin(t * 3.2) * 0.18; this.reachMat.opacity = p; this.exploreMat.opacity = p;
    if (this.ring.visible) { const s = 1 + Math.sin(t * 4) * 0.06; this.ring.scale.set(s, s, s); this.ring.rotation.z += dt * 0.6; }
    for (const f of this.dying) f.userData.anim?.mixer.update(dt);
    for (const f of this.figs.values()) {
      const an = f.userData.anim;
      if (an && (this.s.gfx.idleAnim || an.busy > 0 || this.moving?.has(f.userData.id))) an.mixer.update(dt);
      const bub = f.userData.bubble; if (bub) bub.position.y = bub.userData.base + Math.sin(t * 2.4 + f.id) * 0.02;
      const hr = f.userData.heroRing; if (hr) hr.material.opacity = 0.42 + Math.sin(t * 2 + f.id) * 0.13;
      const orb = f.userData.inner.userData.orb; if (orb) orb.material.emissiveIntensity = 2 + Math.sin(t * 5) * 0.6;
    }
    for (const tl of this.tiles.values()) if (tl.poi?.visible) animatePoi(tl.poi, dt, t);
    for (const m of this.marks.values()) { m.position.y = m.userData.base + Math.sin(t * 2.4) * 0.05; m.rotation.y += dt * 1.5; }
  }
}
