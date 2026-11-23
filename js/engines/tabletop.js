// Proposition A — « Table de jeu » : tuiles carrées épaisses (carton) sur une vraie table en bois,
// figurines peintes, bougie, dés. Révélation = la tuile se retourne.
import * as THREE from 'three';
import { createStage } from '../three/stage.js';
import { Board3D } from '../three/board3d.js';
import { squareGrid } from '../core/grid.js';
import { TERRAINS } from '../core/terrains.js';
import { terrainTex, tileBackTexture, loadTex, frameTexture, setMaxAniso } from '../three/textures.js';
import { buildProps, rectSampler } from '../three/props.js';
import { tween, ease, rng, hashStr } from '../core/tween.js';

export async function createEngine(container, { onProgress }) {
  const grid = squareGrid({ cols: 7, rows: 5, size: 1, gap: 0.05 });
  const stage = await createStage(container, { fov: 40, rig: { minDist: 2.4, maxDist: 11, pitchNear: 0.5, pitchFar: 1.2, bounds: grid.bounds } });
  setMaxAniso(stage.renderer.capabilities.getMaxAnisotropy());
  onProgress(0.15, 'Textures…');
  await Promise.all([...Object.keys(TERRAINS).map(t => terrainTex(t)), stage.setTimeOfDay('dusk', true)]);
  onProgress(0.5, 'Table…');

  const { scene } = stage;
  // Table + plateau feutré
  const wood = await loadTex('assets/textures/dark_wooden_planks.jpg', { repeat: 5 });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7, color: 0x9a8070 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -0.06; table.receiveShadow = true; scene.add(table);
  const b = grid.bounds, bw = b.maxX - b.minX + 0.5, bd = b.maxZ - b.minZ + 0.5;
  const mat = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.06, bd), [0, 0, 0, 0, 0, 0].map((_, i) => new THREE.MeshStandardMaterial({ color: i === 2 ? 0x1c2420 : 0x3b2a1c, roughness: 0.95 })));
  mat.position.y = -0.03; mat.receiveShadow = true; scene.add(mat);
  // Bougie
  const candle = new THREE.Group(); candle.position.set(b.maxX + 1.1, -0.06, b.minZ + 0.2);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.42, 16), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.6 }));
  wax.position.y = 0.21; wax.castShadow = true; candle.add(wax);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0x8a6d3b, metalness: 0.7, roughness: 0.35 }));
  dish.position.y = 0.015; candle.add(dish); scene.add(candle);
  stage.addTorch(new THREE.Vector3(b.maxX + 1.1, 0.46, b.minZ + 0.2), 0xffa050, 3.5).distance = 7;
  // Dés
  const d20 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({ color: 0x7a1414, roughness: 0.3, metalness: 0.1, flatShading: true }));
  d20.position.set(b.minX - 0.8, 0.06, b.maxZ - 0.3); d20.castShadow = true; scene.add(d20);
  const d6 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.4 }));
  d6.position.set(b.minX - 0.5, 0.02, b.maxZ + 0.1); d6.rotation.y = 0.6; d6.castShadow = true; scene.add(d6);
  stage.fitShadow(b, 2.5); stage.sun.target.position.set(0, 0, 0);
  stage.createParticles(b, 140);

  const S = grid.w * 0.98, TH = 0.1;
  const tileGeo = new THREE.BoxGeometry(S, TH, S);
  const overlayGeo = new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2);
  const side = new THREE.MeshStandardMaterial({ color: 0x2a211b, roughness: 0.9 });
  const back = new THREE.MeshStandardMaterial({ map: tileBackTexture(), roughness: 0.6, metalness: 0.1 });
  const mats = {};
  const matFor = t => (mats[t] ||= new THREE.MeshStandardMaterial({ roughness: 0.95 }), terrainTex(t).then(x => { mats[t].map = x; mats[t].needsUpdate = true; }), mats[t]);

  let board;
  board = new Board3D(stage, grid, {
    figScale: 1, focusDist: 4.2, homeDist: 8.5, cineDist: 2.6, overlayTex: frameTexture(1),
    createTile(cell, data) {
      const g = new THREE.Group();
      const mesh = new THREE.Mesh(tileGeo, [side, side, matFor(data.terrain), back, side, side]);
      mesh.position.y = TH / 2; mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
      const props = buildProps(data.terrain, rng(hashStr(data.key)), rectSampler(S, S, 0.6, 0.6), 1);
      if (props) { props.position.y = TH; g.add(props); }
      const overlay = new THREE.Mesh(overlayGeo, board.reachMat); overlay.position.y = TH + 0.004; g.add(overlay);
      if (data.terrain === 'village') {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.35, 6), new THREE.MeshStandardMaterial({ color: 0x3b2a1c }));
        post.position.set(-S * 0.38, TH + 0.175, S * 0.38); post.castShadow = true; g.add(post);
        queueMicrotask(() => stage.addTorch(new THREE.Vector3(cell.x - S * 0.38, TH + 0.38, cell.z + S * 0.38), 0xff8a3a, 1.6));
      }
      return {
        group: g, hit: mesh, overlay, topY: TH, poiPos: { x: S * 0.38, z: -S * 0.38 },
        async reveal(animate, state = true) {
          if (!animate) { mesh.rotation.z = state ? 0 : Math.PI; if (props) props.visible = state; return; }
          if (props) props.visible = false;
          await tween({ duration: 0.6, ease: ease.inOutCubic, update: k => { mesh.rotation.z = Math.PI * (1 - k); mesh.position.y = TH / 2 + Math.sin(Math.PI * k) * S * 0.55; } });
          if (props) { props.visible = true; props.scale.set(1, 0.01, 1); await tween({ duration: 0.4, ease: ease.outBack, update: k => props.scale.set(1, Math.max(0.01, k), 1) }); }
        },
      };
    },
  });
  onProgress(0.75, 'Figurines…');
  await board.preload();
  return board;
}
