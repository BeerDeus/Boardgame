// Proposition D — « Carte & standees » : 100 % DOM + CSS 3D (aucun WebGL).
// Carte illustrée façon livre-jeu, personnages en standees de carton toujours face caméra.
import { squareGrid } from '../core/grid.js';
import { TERRAINS, texUrl } from '../core/terrains.js';
import { Gestures } from '../core/gestures.js';
import { figureSVG, tileIconsSVG } from '../core/art.js';
import { tween, ease, updateTweens, damp, dampAngle, nearestAngle, clamp, lerp, rng, hashStr, cancelTweens } from '../core/tween.js';

const TS = 150; // taille d'une tuile en px
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export async function createEngine(container, { onProgress }) {
  await new Promise(res => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/paper.css'; l.onload = l.onerror = res; document.head.append(l); });
  const grid = squareGrid({ cols: 7, rows: 5, size: 1, gap: 0.04 });
  onProgress(0.3, 'Illustrations…');
  await Promise.all(Object.values(TERRAINS).map(t => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = texUrl(t.tex); })));

  const root = h('div', 'paper-root');
  root.innerHTML = `<div class="paper-bg"></div><div class="paper-cam"><div class="paper-board"></div></div><canvas class="paper-fx"></canvas><div class="paper-tint"></div>`;
  container.append(root);
  const cam = root.querySelector('.paper-cam'), boardEl = root.querySelector('.paper-board'), fx = root.querySelector('.paper-fx'), tint = root.querySelector('.paper-tint');
  const b = grid.bounds;
  const matEl = h('div', 'paper-mat'); boardEl.append(matEl);
  Object.assign(matEl.style, { left: `${b.minX * TS - 34}px`, top: `${b.minZ * TS - 34}px`, width: `${(b.maxX - b.minX) * TS + 68}px`, height: `${(b.maxZ - b.minZ) * TS + 68}px` });
  // grain papier (texture de bruit générée une fois)
  { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const d = g.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = 110 + Math.random() * 120; d.data[i] = v; d.data[i + 1] = v * 0.92; d.data[i + 2] = v * 0.8; d.data[i + 3] = 40; }
    g.putImageData(d, 0, 0); root.style.setProperty('--grain', `url(${c.toDataURL()})`); }
  const P = (x, z) => ({ x: x * TS, y: z * TS });

  // ---------- caméra 2.5D ----------
  const C = { x: 0, y: 0, zoom: 0.8, yaw: 0, tilt: 0.6, shift: 0 }, G = { ...C };
  const lim = { minZoom: 0.45, maxZoom: 2.4 };
  let vel = { x: 0, y: 0 }, dragging = false, k = 10, follow = null, tiltOverride = null, shake = 0;
  const autoTilt = z => lerp(0.35, 1.0, clamp((z - lim.minZoom) / (lim.maxZoom - lim.minZoom), 0, 1)); // rad
  const clampG = () => { for (const o of [G, C]) { o.x = clamp(o.x, b.minX * TS, b.maxX * TS); o.y = clamp(o.y, b.minZ * TS, b.maxZ * TS); } };
  const screenToBoard = (dx, dy) => {
    const s = 1 / C.zoom, cy = dy / Math.max(0.35, Math.cos(C.tilt)), c = Math.cos(-C.yaw), si = Math.sin(-C.yaw);
    return { x: (dx * c - cy * si) * s, y: (dx * si + cy * c) * s };
  };
  const gest = new Gestures(root, {
    onPanStart: () => { dragging = true; vel = { x: 0, y: 0 }; follow = null; k = 12; },
    onPan: (dx, dy) => { const d = screenToBoard(dx, dy); G.x -= d.x; G.y -= d.y; C.x -= d.x; C.y -= d.y; clampG(); },
    onPanEnd: (vx, vy) => { dragging = false; const d = screenToBoard(vx, vy); vel = { x: -d.x, y: -d.y }; },
    onPinch: p => { follow = null; G.zoom = clamp(G.zoom * p.scale, lim.minZoom, lim.maxZoom); G.yaw += p.rotate; const d = screenToBoard(p.dx, p.dy); G.x -= d.x; G.y -= d.y; C.x -= d.x; C.y -= d.y; },
    onWheel: d => { G.zoom = clamp(G.zoom * Math.exp(-d * 0.0012), lim.minZoom, lim.maxZoom); },
    onOrbit: (dx, dy) => { G.yaw += dx * 0.006; bias = clamp(bias - dy * 0.003, -0.4, 0.4); },
    onTap: (x, y) => engine.onTap?.(pick(x, y)),
    onLongPress: (x, y) => { const p = pick(x, y); if (p.key) engine.onLongPress?.(p.key); },
    onDoubleTap: (x, y) => { const p = pick(x, y); if (p.key) { const c = grid.get(p.key); flyTo({ x: c.x * TS, y: c.z * TS, zoom: G.zoom * 1.6 }); } },
  });
  let bias = 0;
  function flyTo(o, kk = 5) { Object.assign(G, Object.fromEntries(Object.entries(o).filter(([, v]) => v != null))); if (o.yaw != null) G.yaw = nearestAngle(C.yaw, o.yaw); G.zoom = clamp(G.zoom, lim.minZoom, 3.2); vel = { x: 0, y: 0 }; follow = null; k = kk; clampG(); }

  function pick(x, y) {
    const el = document.elementFromPoint(x, y);
    const f = el?.closest('[data-fig]'); if (f) return { type: 'figure', id: f.dataset.fig, key: figs.get(f.dataset.fig)?.key };
    const poi = el?.closest('[data-poi]'); if (poi) return { type: 'poi', key: poi.dataset.poi };
    const t = el?.closest('[data-tile]'); if (t) return { type: 'tile', key: t.dataset.tile };
    return { type: 'none' };
  }

  // ---------- tuiles ----------
  const tiles = new Map(), figs = new Map(), occ = new Map();
  function addTile(data) {
    const c = grid.get(data.key), p = P(c.x, c.z), R = rng(hashStr(data.key));
    const el = h('div', 'ptile' + (data.revealed ? '' : ' hidden'));
    el.dataset.tile = data.key;
    el.style.transform = `translate3d(${p.x - TS / 2}px, ${p.y - TS / 2}px, 0)`;
    el.style.width = el.style.height = `${TS}px`;
    el.innerHTML = `<div class="pin"><div class="pface front" style="background-image:url('${texUrl(TERRAINS[data.terrain].tex)}')">${tileIconsSVG(data.terrain, R)}<div class="pname">${data.name}</div></div><div class="pface back"></div></div><div class="pov"></div>`;
    if (data.poi) { const t = h('div', 'ppoi', data.poi.icon); t.dataset.poi = data.key; el.append(t); }
    boardEl.append(el); tiles.set(data.key, { el, data, c, revealed: !!data.revealed });
  }
  async function revealTile(key, { focus = true } = {}) {
    const t = tiles.get(key); if (!t || t.revealed) return; t.revealed = true;
    if (focus) flyTo({ x: t.c.x * TS, y: t.c.z * TS, zoom: Math.max(G.zoom, 1.0) });
    t.el.classList.add('flipping'); t.el.classList.remove('hidden');
    await new Promise(r => setTimeout(r, 700)); t.el.classList.remove('flipping');
  }
  function highlight(reach, explore) {
    const R = new Set(reach), E = new Set(explore);
    for (const [k2, t] of tiles) { t.el.classList.toggle('reach', R.has(k2)); t.el.classList.toggle('explore', E.has(k2)); }
  }

  // ---------- figurines (standees) ----------
  const slotPos = (key, i, n) => { const c = grid.get(key), s = grid.slots(n)[i]; return P(c.x + s.x * 1.15, c.z + s.z * 1.15); };
  const place = f => { f.el.style.transform = `translate3d(${f.x}px, ${f.y}px, 0)`; f.st.style.setProperty('--hop', `${f.hop}px`); };
  function arrange(key, skip) {
    const ids = occ.get(key) || [];
    ids.forEach((id, i) => { if (id === skip) return; const f = figs.get(id), to = slotPos(key, i, ids.length), fr = { x: f.x, y: f.y }; cancelTweens(id); tween({ tag: id, duration: 0.35, update: kk => { f.x = lerp(fr.x, to.x, kk); f.y = lerp(fr.y, to.y, kk); place(f); } }); });
  }
  const occPush = (key, id) => { if (!occ.has(key)) occ.set(key, []); occ.get(key).push(id); };
  const occRm = (key, id) => { const a = occ.get(key); if (a && a.indexOf(id) >= 0) a.splice(a.indexOf(id), 1); };
  async function addFigure(data, key, { spawn = false } = {}) {
    const el = h('div', 'pfig'); el.dataset.fig = data.id;
    el.innerHTML = `<div class="pshadow"></div><div class="pring"></div><div class="pstand"><div class="pin2"><div class="pcard" style="--c:${data.color}">${figureSVG(data.kind, data.color)}</div><div class="pbase" style="--c:${data.color}"></div></div></div>`;
    boardEl.append(el);
    const f = { id: data.id, el, st: el.querySelector('.pstand'), key, x: 0, y: 0, hop: 0, data };
    figs.set(data.id, f); occPush(key, data.id);
    const ids = occ.get(key); Object.assign(f, slotPos(key, ids.length - 1, ids.length)); place(f); arrange(key, data.id);
    if (spawn) { el.classList.add('spawn'); await new Promise(r => setTimeout(r, 600)); el.classList.remove('spawn'); }
  }
  async function removeFigure(id) {
    const f = figs.get(id); if (!f) return; occRm(f.key, id); figs.delete(id);
    f.el.classList.add('dead'); await new Promise(r => setTimeout(r, 700)); f.el.remove(); arrange(f.key);
  }
  async function hop(f, to) {
    const fr = { x: f.x, y: f.y }, d = Math.hypot(to.x - fr.x, to.y - fr.y);
    if (to.x !== fr.x) f.st.classList.toggle('flip', to.x < fr.x);
    await tween({ duration: 0.26 + d / TS * 0.08, ease: ease.inOutSine, update: kk => { f.x = lerp(fr.x, to.x, kk); f.y = lerp(fr.y, to.y, kk); f.hop = Math.sin(Math.PI * kk) * 28; place(f); } });
    f.st.classList.remove('land'); void f.st.offsetWidth; f.st.classList.add('land');
  }
  async function moveFigure(id, path, { follow: fl = true } = {}) {
    const f = figs.get(id); if (!f || path.length < 2) return; cancelTweens(id);
    const last = path[path.length - 1];
    occRm(path[0], id); arrange(path[0]); occPush(last, id); arrange(last, id); f.key = last;
    if (fl) { follow = f; k = 5; }
    for (let i = 1; i < path.length; i++) {
      const c = grid.get(path[i]);
      await hop(f, i === path.length - 1 ? slotPos(last, occ.get(last).indexOf(id), occ.get(last).length) : P(c.x, c.z));
    }
    if (follow === f) follow = null;
  }
  async function bump(id, targetId) {
    const f = figs.get(id); if (!f) return; const t = targetId && figs.get(targetId);
    if (!t) { await tween({ duration: 0.3, update: kk => { f.hop = Math.sin(Math.PI * kk) * 18; place(f); } }); return; }
    const fr = { x: f.x, y: f.y }, to = { x: lerp(f.x, t.x, 0.6), y: lerp(f.y, t.y, 0.6) };
    await tween({ duration: 0.14, ease: ease.inQuad, update: kk => { f.x = lerp(fr.x, to.x, kk); f.y = lerp(fr.y, to.y, kk); place(f); } });
    t.el.classList.remove('hit'); void t.el.offsetWidth; t.el.classList.add('hit'); shake = 8;
    await tween({ duration: 0.25, update: kk => { f.x = lerp(to.x, fr.x, kk); f.y = lerp(to.y, fr.y, kk); place(f); } });
  }
  let selected = null;
  function setSelected(id) { selected && figs.get(selected)?.el.classList.remove('sel'); selected = id; id && figs.get(id)?.el.classList.add('sel'); }

  // ---------- cinématique ----------
  let saved = null;
  function cinematic({ ids, focus }) {
    if (!saved) saved = { ...G, bias };
    const F = figs.get(focus); if (!F) return;
    for (const [id, f] of figs) f.el.classList.toggle('faded', !ids.includes(id));
    for (const [id, f] of figs) if (ids.includes(id) && id !== focus) f.st.classList.toggle('flip', f.x > F.x);
    if (F) F.st.classList.toggle('flip', ids.map(i => figs.get(i)).some(o => o && o !== F && o.x < F.x));
    tiltOverride = 1.12; C.shiftGoal = 0.07;
    flyTo({ x: F.x, y: F.y, zoom: 2.0 }, 3.5);
  }
  function endCinematic() {
    for (const f of figs.values()) f.el.classList.remove('faded');
    tiltOverride = null; C.shiftGoal = 0;
    if (saved) { bias = saved.bias; flyTo({ x: saved.x, y: saved.y, zoom: saved.zoom }, 3.5); saved = null; }
  }

  // ---------- particules 2D ----------
  const ctx = fx.getContext('2d'); let partsOn = true; const parts = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.8, v: 0.02 + Math.random() * 0.05, p: Math.random() * 6 }));
  let partColor = '255,160,64';
  function resizeFx() { const r = Math.min(devicePixelRatio, 2); fx.width = root.clientWidth * r; fx.height = root.clientHeight * r; ctx.setTransform(r, 0, 0, r, 0, 0); }
  new ResizeObserver(resizeFx).observe(root); resizeFx();

  // ---------- boucle ----------
  let last = performance.now(), frames = 0, acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    updateTweens(dt);
    if (!dragging && (vel.x || vel.y)) { G.x += vel.x * dt; G.y += vel.y * dt; C.x += vel.x * dt; C.y += vel.y * dt; const f = Math.exp(-4.5 * dt); vel.x *= f; vel.y *= f; if (Math.hypot(vel.x, vel.y) < 2) vel = { x: 0, y: 0 }; }
    if (follow) { G.x = follow.x; G.y = follow.y; }
    clampG();
    C.x = damp(C.x, G.x, k, dt); C.y = damp(C.y, G.y, k, dt); C.zoom = damp(C.zoom, G.zoom, k, dt); C.yaw = dampAngle(C.yaw, G.yaw, k, dt);
    C.tilt = damp(C.tilt, tiltOverride ?? clamp(autoTilt(C.zoom) + bias, 0.1, 1.25), k * 0.8, dt);
    C.shift = damp(C.shift, C.shiftGoal || 0, 4, dt);
    k = damp(k, 10, 0.8, dt);
    const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0; shake *= Math.exp(-10 * dt); if (shake < 0.3) shake = 0;
    const H = root.clientHeight;
    cam.style.transform = `translate3d(${sx}px, ${sy - C.shift * H}px, 0) rotateX(${C.tilt}rad) rotateZ(${C.yaw}rad) scale(${C.zoom}) translate3d(${-C.x}px, ${-C.y}px, 0)`;
    cam.style.setProperty('--yaw', `${-C.yaw}rad`); cam.style.setProperty('--tilt', `${-C.tilt}rad`);
    // particules
    const W = root.clientWidth; ctx.clearRect(0, 0, W, H);
    if (partsOn) {
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.y -= p.v * dt; p.x += Math.sin(now / 1000 + p.p) * 0.002 * dt * 10; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const a = 0.35 + Math.sin(now / 300 + p.p) * 0.25;
        ctx.fillStyle = `rgba(${partColor},${a})`; ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    frames++; acc += dt; if (acc > 0.5) { engine.onFps?.(Math.round(frames / acc)); frames = 0; acc = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const engine = {
    grid, supports: { shadows: false, resolution: false },
    addTile, revealTile, highlight, addFigure, removeFigure, moveFigure, bump, setSelected, cinematic, endCinematic,
    focusTile(key) { const c = grid.get(key); flyTo({ x: c.x * TS, y: c.z * TS, zoom: Math.max(G.zoom, 1.1) }); },
    focusFigure(id, { soft = false } = {}) { const f = figs.get(id); if (f) flyTo({ x: f.x, y: f.y, zoom: soft ? null : 1.5 }); },
    resetCamera(instant) { bias = 0; flyTo({ x: 0, y: 0, zoom: Math.min(root.clientWidth / ((b.maxX - b.minX) * TS + 80), root.clientHeight / ((b.maxZ - b.minZ) * TS + 80)) * 1.15, yaw: 0 }, 4); if (instant) Object.assign(C, G); },
    setTimeOfDay(v) { root.classList.toggle('night', v === 'night'); partColor = v === 'night' ? '190,255,120' : '255,160,64'; },
    setParticles(v) { partsOn = v; },
    setShadows() {}, setResolution() {},
    menu: [{ title: 'Papier', items: [
      { type: 'toggle', label: 'Standees face caméra', value: true, onChange: v => root.classList.toggle('upright', !v) },
      { type: 'toggle', label: 'Grain papier', value: true, onChange: v => root.classList.toggle('nograin', !v) },
    ] }],
  };
  onProgress(0.8, 'Standees…');
  return engine;
}
