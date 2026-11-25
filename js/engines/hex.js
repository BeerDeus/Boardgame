// Proposition C — « Diorama hexagonal » : île de colonnes hexagonales à hauteurs variables sur l'eau,
// brouillard de guerre volumétrique (sprites), émergence des tuiles, post-process tilt-shift (effet maquette).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';
import { createStage } from '../three/stage.js';
import { Board3D } from '../three/board3d.js';
import { hexGrid } from '../core/grid.js';
import { TERRAINS } from '../core/terrains.js';
import { terrainTex, tileBackTexture, loadTex, radialTexture, setMaxAniso } from '../three/textures.js';
import { buildProps, hexSampler } from '../three/props.js';
import { tween, ease, rng, hashStr } from '../core/tween.js';
import { settings } from '../core/settings.js';

const HEIGHT = { crypt: 0.2, snow: 0.6, rock: 0.52, forest: 0.34, ruins: 0.4, village: 0.3, plains: 0.26, burned: 0.24, swamp: 0.16 };
const WATER = 0.04, FOGY = 0.1;

function hexFrameTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const pts = k => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 3; return [S / 2 + Math.cos(a) * k, S / 2 + Math.sin(a) * k]; });
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); pts(S / 2 - 4).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
  for (let i = 0; i < 12; i++) { g.strokeStyle = `rgba(255,255,255,${(1 - i / 12) * 0.6})`; g.lineWidth = 3; g.beginPath(); pts(S / 2 - 4 - i * 2.5).forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function createEngine(container, { onProgress, story }) {
  const R = 0.62;
  const grid = story?.hexMap ? hexGrid({ mask: story.hexMap, size: R, gap: 0.035 }) : hexGrid({ radius: 3, size: R, gap: 0.035 });
  const span = Math.max(grid.bounds.maxX - grid.bounds.minX, grid.bounds.maxZ - grid.bounds.minZ);
  const stage = await createStage(container, { fov: 35, rig: { minDist: 2.4, maxDist: Math.max(11, span * 1.05), pitchNear: 0.5, pitchFar: 1.1, bounds: grid.bounds } });
  onProgress(0.15, 'Textures…');
  await Promise.all([...Object.keys(TERRAINS).map(t => terrainTex(t)), stage.setTimeOfDay('dusk', true)]);
  onProgress(0.45, 'Île…');
  const { scene, renderer, camera } = stage;

  // Eau
  const water = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0d1c24, roughness: 0.12, metalness: 0.7, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2; water.position.y = WATER; water.receiveShadow = true; scene.add(water);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x05080a }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.6; scene.add(sea);
  stage.updates.add((dt, t) => { water.material.opacity = 0.88 + Math.sin(t * 0.8) * 0.04; });
  stage.fitShadow(grid.bounds, 1.5); stage.createParticles(grid.bounds, 160);

  const sideTex = (await loadTex('assets/textures/dark_rock.jpg', { repeat: 1 })).clone(); sideTex.repeat.set(2, 1); sideTex.needsUpdate = true;
  const side = new THREE.MeshStandardMaterial({ map: sideTex, color: 0x6a5a4c, roughness: 0.95 });
  const fogTop = new THREE.MeshStandardMaterial({ map: tileBackTexture(1, true), color: 0x8a8a96, roughness: 0.7 });
  const mats = {};
  const matFor = t => { if (!mats[t]) { mats[t] = new THREE.MeshStandardMaterial({ roughness: 0.95 }); terrainTex(t).then(x => { mats[t].map = x; mats[t].needsUpdate = true; const gm = greys.get(mats[t]); if (gm) { gm.map = x; gm.needsUpdate = true; } }); } return mats[t]; };
  const overlayGeo = new THREE.CircleGeometry(R * 0.97, 6).rotateX(-Math.PI / 2).rotateY(Math.PI / 6);
  const fogTex = radialTexture('rgba(190,195,210,0.9)', 'rgba(140,145,160,0.45)');
  // Case visible mais jamais visitée : en noir et blanc (même matériau, couleurs désaturées dans le shader) ;
  // les cases visitées sont en pleines couleurs.
  const greys = new Map();
  const greyOf = m => {
    if (!greys.has(m)) {
      const gm = m.clone();
      gm.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', 'gl_FragColor.rgb = vec3(dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114))) * 1.04;\n#include <dithering_fragment>'); };
      gm.customProgramCacheKey = () => 'grey'; greys.set(m, gm);
    }
    return greys.get(m);
  };

  // Tuiles peintes : une grande illustration (plan de référence) plaquée sur le dessus des tuiles.
  // Même calcul que le plan : grille sans espacement, centrée, ajustée à l'image avec une marge.
  const artOn = () => { try { return localStorage.getItem('grimoire.tileArt') !== '0'; } catch { return true; } };
  let art = null;
  if (story?.tileArt && story.hexMap && artOn()) {
    try {
      const a = story.tileArt, g0 = hexGrid({ mask: story.hexMap, size: R, gap: 0 }), hw = Math.sqrt(3) / 2 * R;
      const xs = g0.cells.map(c => c.x), zs = g0.cells.map(c => c.z);
      const minX = Math.min(...xs) - hw, maxX = Math.max(...xs) + hw, minZ = Math.min(...zs) - R, maxZ = Math.max(...zs) + R;
      const s = Math.min((a.width - 2 * a.margin) / (maxX - minX), (a.height - 2 * a.margin) / (maxZ - minZ));
      const ox = (a.width - (maxX - minX) * s) / 2 - minX * s, oz = (a.height - (maxZ - minZ) * s) / 2 - minZ * s;
      const tex = (await loadTex(a.url)).clone(); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.repeat.set(1, 1); tex.needsUpdate = true;
      art = {
        mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }),
        has: k => g0.has(k),
        uv: (k, lx, lz) => { const c = g0.get(k); return [((c.x + lx) * s + ox) / a.width, 1 - ((c.z + lz) * s + oz) / a.height]; },
      };
    } catch (e) { console.warn('Illustration des tuiles indisponible', e); art = null; }
  }

  let board;
  board = new Board3D(stage, grid, {
    figScale: 0.95, poiScale: 1.3, focusDist: 4, postfx: true, homeDist: Math.max(8.5, span * 0.85), cineDist: 2.6, overlayTex: hexFrameTexture(),
    createTile(cell, data) {
      const h = (HEIGHT[data.terrain] || 0.3) + rng(hashStr(data.key))() * 0.05;
      const g = new THREE.Group();
      const col = new THREE.Group(); g.add(col);
      const depth = h + 0.7;
      const painted = !!art?.has(data.key);
      const geo = new THREE.CylinderGeometry(R, R * 1.02, depth, 6, 1);
      if (painted) { // UV du dessus = position de la case dans l'illustration
        const cap = geo.groups[1], idx = geo.index, pos = geo.attributes.position, uv = geo.attributes.uv;
        for (let i = cap.start; i < cap.start + cap.count; i++) { const v = idx.getX(i); uv.setXY(v, ...art.uv(data.key, pos.getX(v), pos.getZ(v))); }
        uv.needsUpdate = true;
      }
      const topCol = painted ? art.mat : matFor(data.terrain), topGrey = greyOf(topCol);
      let seen = false, up = false; // case visitée · tuile posée
      const topNow = () => (seen ? topCol : topGrey);
      const mesh = new THREE.Mesh(geo, [side, topNow(), side]);
      mesh.position.y = h - depth / 2; mesh.castShadow = true; mesh.receiveShadow = true; col.add(mesh);
      const props = painted ? null : buildProps(data.terrain, rng(hashStr(data.key)), hexSampler(R, R * 0.42), 0.95, settings.gfx.props);
      if (props) { props.position.y = h; col.add(props); }
      const overlay = new THREE.Mesh(overlayGeo, board.reachMat); overlay.position.y = h + 0.004; col.add(overlay);
      const fog = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.55, color: 0x9aa0b0 }));
      fog.scale.set(R * 3.2, R * 1.6, 1); fog.position.y = FOGY + 0.25; g.add(fog);
      let torchLit = false; // la torche du village ne s'allume qu'une fois la tuile posée (sinon flamme dans le vide)
      const lightTorch = () => { if (torchLit || data.terrain !== 'village') return; torchLit = true; stage.addTorch(new THREE.Vector3(cell.x - R * 0.5, h + 0.35, cell.z + R * 0.3), 0xff8a3a, 1.6); };
      const hidden = FOGY - h; // le sommet affleure juste au-dessus de l'eau
      const tile = {
        group: g, top: col, hit: mesh, overlay, topY: h, poiPos: { x: R * 0.5, z: -R * 0.32 },
        setExplored(v) { seen = v; if (up) mesh.material = [side, topNow(), side]; },
        async reveal(animate, state = true, { onLand } = {}) {
          if (!animate) {
            col.position.y = state ? 0 : hidden; col.rotation.set(0, 0, 0); fog.visible = !state; up = state; mesh.material = [side, state ? topNow() : fogTop, side];
            if (props) props.visible = state; if (state) queueMicrotask(lightTorch); return;
          }
          up = true; mesh.material = [side, topNow(), side]; fog.visible = false;
          if (props) { props.visible = true; props.scale.set(1, 0.01, 1); }
          // chute depuis le ciel (gravité), en tournoyant légèrement, puis impact, rebond et écrasement
          const r = rng(hashStr(data.key + ':drop')), H0 = 5 + r() * 1.5, spin = (r() - 0.5) * 1.4, tx = (r() - 0.5) * 0.35, tz = (r() - 0.5) * 0.35;
          col.position.y = H0; col.rotation.set(tx, spin, tz);
          await tween({ duration: 0.62, ease: ease.inQuad, update: k => { const s = 1 - k; col.position.y = H0 * s; col.rotation.set(tx * s, spin * s * s, tz * s); } });
          col.position.y = 0; col.rotation.set(0, 0, 0);
          onLand?.(); lightTorch();
          await tween({ duration: 0.34, ease: ease.linear, update: k => {
            col.position.y = Math.sin(Math.PI * k) * 0.08 * (1 - k);
            const sq = Math.sin(Math.PI * Math.min(1, k * 2)) * 0.06 * (1 - k); col.scale.set(1 + sq, 1 - sq * 1.5, 1 + sq);
          } });
          col.position.y = 0; col.scale.set(1, 1, 1);
          if (props) await tween({ duration: 0.35, ease: ease.outBack, update: k => props.scale.set(1, Math.max(0.01, k), 1) });
        },
      };
      return tile;
    },
  });

  // Post-process tilt-shift
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: settings.gfx.aa ? 4 : 0 }));
  composer.addPass(new RenderPass(scene, camera));
  const hT = new ShaderPass(HorizontalTiltShiftShader), vT = new ShaderPass(VerticalTiltShiftShader);
  composer.addPass(hT); composer.addPass(vT); composer.addPass(new OutputPass());
  // Effet maquette : désactivé par défaut (gênant sur téléphone). « Bords » = flou très léger, seulement tout en haut/en bas.
  const BLUR_KEY = 'grimoire.tilt';
  let blur = (() => { try { const v = localStorage.getItem(BLUR_KEY); return v == null ? 0 : +v; } catch { return 0; } })();
  stage.onResize = (w, hh) => {
    // l'intensité croît avec la distance à la ligne nette (r) : avec un flou faible, seules les extrémités sont touchées
    hT.uniforms.h.value = blur / w; vT.uniforms.v.value = blur / hh; hT.uniforms.r.value = vT.uniforms.r.value = 0.5;
  };
  stage.onResize(container.clientWidth, container.clientHeight);
  const setTilt = v => { v = v && blur > 0; stage.composer = v ? composer : null; if (v) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(container.clientWidth, container.clientHeight); } };
  setTilt(settings.gfx.postfx);
  stage.onSettings = gfx => setTilt(gfx.postfx);

  board.menu.push({ title: 'Diorama', items: [
    { type: 'seg', label: 'Flou maquette', value: blur, options: [{ label: 'Aucun', value: 0 }, { label: 'Bords', value: 0.6 }, { label: 'Moyen', value: 1.6 }, { label: 'Fort', value: 3 }], onChange: v => { blur = v; try { localStorage.setItem(BLUR_KEY, String(v)); } catch {} stage.onResize(container.clientWidth, container.clientHeight); setTilt(settings.gfx.postfx); stage.invalidate?.(4); } },
    ...(story?.tileArt ? [{ type: 'toggle', label: 'Tuiles peintes (illustration) — recharge', value: !!art, onChange: v => { try { localStorage.setItem('grimoire.tileArt', v ? '1' : '0'); } catch {} location.reload(); } }] : []),
    { type: 'toggle', label: 'Rotation par crans de 60°', value: false, onChange: v => (stage.rig.o.snapYaw = v ? Math.PI / 3 : 0) },
  ] });
  onProgress(0.75, 'Figurines…');
  await board.preload();
  return board;
}
