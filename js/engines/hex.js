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

const HEIGHT = { snow: 0.6, rock: 0.52, forest: 0.34, ruins: 0.4, village: 0.3, plains: 0.26, burned: 0.24, swamp: 0.16 };
const WATER = 0.04, FOGY = 0.1;

function hexFrameTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const pts = k => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 3; return [S / 2 + Math.cos(a) * k, S / 2 + Math.sin(a) * k]; });
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); pts(S / 2 - 4).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
  for (let i = 0; i < 12; i++) { g.strokeStyle = `rgba(255,255,255,${(1 - i / 12) * 0.6})`; g.lineWidth = 3; g.beginPath(); pts(S / 2 - 4 - i * 2.5).forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function createEngine(container, { onProgress }) {
  const R = 0.62;
  const grid = hexGrid({ radius: 3, size: R, gap: 0.035 });
  const stage = await createStage(container, { fov: 35, rig: { minDist: 2.4, maxDist: 11, pitchNear: 0.5, pitchFar: 1.1, bounds: grid.bounds } });
  setMaxAniso(stage.renderer.capabilities.getMaxAnisotropy());
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
  const matFor = t => { if (!mats[t]) { mats[t] = new THREE.MeshStandardMaterial({ roughness: 0.95 }); terrainTex(t).then(x => { mats[t].map = x; mats[t].needsUpdate = true; }); } return mats[t]; };
  const overlayGeo = new THREE.CircleGeometry(R * 0.97, 6).rotateX(-Math.PI / 2).rotateY(Math.PI / 6);
  const fogTex = radialTexture('rgba(190,195,210,0.9)', 'rgba(140,145,160,0.45)');

  let board;
  board = new Board3D(stage, grid, {
    figScale: 0.95, focusDist: 4, homeDist: 8.5, cineDist: 2.6, overlayTex: hexFrameTexture(),
    createTile(cell, data) {
      const h = (HEIGHT[data.terrain] || 0.3) + rng(hashStr(data.key))() * 0.05;
      const g = new THREE.Group();
      const col = new THREE.Group(); g.add(col);
      const depth = h + 0.7;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.02, depth, 6, 1), [side, matFor(data.terrain), side]);
      mesh.position.y = h - depth / 2; mesh.castShadow = true; mesh.receiveShadow = true; col.add(mesh);
      const props = buildProps(data.terrain, rng(hashStr(data.key)), hexSampler(R, R * 0.42), 0.95);
      if (props) { props.position.y = h; col.add(props); }
      const overlay = new THREE.Mesh(overlayGeo, board.reachMat); overlay.position.y = h + 0.004; col.add(overlay);
      const fog = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.55, color: 0x9aa0b0 }));
      fog.scale.set(R * 3.2, R * 1.6, 1); fog.position.y = FOGY + 0.25; g.add(fog);
      if (data.terrain === 'village') queueMicrotask(() => stage.addTorch(new THREE.Vector3(cell.x - R * 0.5, h + 0.35, cell.z + R * 0.3), 0xff8a3a, 1.6));
      const hidden = FOGY - h; // le sommet affleure juste au-dessus de l'eau
      const tile = {
        group: g, hit: mesh, overlay, topY: h, poiPos: { x: R * 0.45, z: -R * 0.3 },
        async reveal(animate, state = true) {
          if (!animate) {
            col.position.y = state ? 0 : hidden; fog.visible = !state; mesh.material = [side, state ? matFor(data.terrain) : fogTop, side];
            if (props) props.visible = state; return;
          }
          mesh.material = [side, matFor(data.terrain), side];
          if (props) { props.visible = true; props.scale.set(1, 0.01, 1); }
          tween({ duration: 0.9, update: k => { fog.material.opacity = 0.55 * (1 - k); fog.scale.set(R * (3.2 + k * 2), R * (1.6 + k), 1); } }).then(() => (fog.visible = false));
          await tween({ duration: 0.75, ease: ease.outBack, update: k => (col.position.y = hidden * (1 - k)) });
          if (props) await tween({ duration: 0.35, ease: ease.outBack, update: k => props.scale.set(1, Math.max(0.01, k), 1) });
        },
      };
      return tile;
    },
  });

  // Post-process tilt-shift
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const hT = new ShaderPass(HorizontalTiltShiftShader), vT = new ShaderPass(VerticalTiltShiftShader);
  composer.addPass(hT); composer.addPass(vT); composer.addPass(new OutputPass());
  let blur = 2.2;
  stage.onResize = (w, hh) => { hT.uniforms.h.value = blur / w; vT.uniforms.v.value = blur / hh; hT.uniforms.r.value = vT.uniforms.r.value = 0.55; };
  stage.onResize(container.clientWidth, container.clientHeight);
  const setTilt = v => { stage.composer = v ? composer : null; if (v) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(container.clientWidth, container.clientHeight); } };
  setTilt(true);

  board.menu.push({ title: 'Diorama', items: [
    { type: 'toggle', label: 'Effet maquette (tilt-shift)', value: true, onChange: setTilt },
    { type: 'seg', label: 'Flou', value: 2.2, options: [{ label: 'Léger', value: 1.2 }, { label: 'Moyen', value: 2.2 }, { label: 'Fort', value: 3.5 }], onChange: v => { blur = v; stage.onResize(container.clientWidth, container.clientHeight); } },
    { type: 'toggle', label: 'Rotation par crans de 60°', value: false, onChange: v => (stage.rig.o.snapYaw = v ? Math.PI / 3 : 0) },
  ] });
  onProgress(0.75, 'Figurines…');
  await board.preload();
  return board;
}
