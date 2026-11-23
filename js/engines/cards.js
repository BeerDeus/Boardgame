// Proposition B — « Cartes d'exploration » : grandes tuiles rectangulaires imprimées (style Destinies),
// révélées comme des cartes, vue quasi zénithale, aimantation sur la carte la plus proche.
import * as THREE from 'three';
import { createStage } from '../three/stage.js';
import { Board3D } from '../three/board3d.js';
import { rectGrid } from '../core/grid.js';
import { TERRAINS } from '../core/terrains.js';
import { cardFaceTexture, tileBackTexture, loadTex, frameTexture, setMaxAniso, loadImage } from '../three/textures.js';
import { texUrl } from '../core/terrains.js';
import { buildProps } from '../three/props.js';
import { tween, ease, rng, hashStr } from '../core/tween.js';

export async function createEngine(container, { onProgress }) {
  const W = 2.1, H = 1.4;
  const grid = rectGrid({ cols: 5, rows: 4, w: W, h: H, gap: 0.12 });
  const stage = await createStage(container, { fov: 32, rig: { minDist: 3.2, maxDist: 16, pitchNear: 0.78, pitchFar: 1.38, bounds: grid.bounds } });
  setMaxAniso(stage.renderer.capabilities.getMaxAnisotropy());
  onProgress(0.15, 'Impression des cartes…');
  await Promise.all([...Object.values(TERRAINS).map(t => loadImage(texUrl(t.tex))), stage.setTimeOfDay('dusk', true), document.fonts?.load('600 30px Cinzel').catch(() => {})]);
  onProgress(0.5, 'Table…');
  const { scene } = stage;
  const wood = await loadTex('assets/textures/dark_wooden_planks.jpg', { repeat: 6 });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.75, color: 0x8a7060 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -0.02; table.receiveShadow = true; scene.add(table);
  // tapis de jeu en cuir
  const b = grid.bounds;
  const mat = new THREE.Mesh(new THREE.BoxGeometry(b.maxX - b.minX + 0.8, 0.02, b.maxZ - b.minZ + 0.8), new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.8 }));
  mat.position.y = -0.01; mat.receiveShadow = true; scene.add(mat);
  stage.fitShadow(b, 2); stage.createParticles(b, 120);
  stage.addTorch(new THREE.Vector3(b.maxX + 1.2, 0.5, b.minZ - 0.6), 0xffa050, 4).distance = 9;
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x2a2420, metalness: 0.6, roughness: 0.4 }));
  lantern.position.set(b.maxX + 1.2, 0.23, b.minZ - 0.6); lantern.castShadow = true; scene.add(lantern);

  const TH = 0.035;
  const cardGeo = new THREE.BoxGeometry(W, TH, H);
  const overlayGeo = new THREE.PlaneGeometry(W, H).rotateX(-Math.PI / 2);
  const edge = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.9 });
  const back = new THREE.MeshStandardMaterial({ map: tileBackTexture(W / H), roughness: 0.55 });
  const sampler = R => {
    for (let i = 0; i < 30; i++) {
      const x = (R() - 0.5) * (W - 0.2), z = (R() - 0.5) * (H - 0.2);
      if (Math.abs(x) < W * 0.3 && Math.abs(z) < H * 0.32) continue; // zone figurines
      if (z > H / 2 - 0.32 && Math.abs(x) < W * 0.38) continue;      // cartouche
      if (z < -H / 2 + 0.2 && Math.abs(x) < W * 0.25) continue;      // libellé
      return { x, z };
    }
    return null;
  };

  let board;
  board = new Board3D(stage, grid, {
    figScale: 1.25, focusDist: 5, homeDist: 12.5, cineDist: 3.3, poiScale: 1.6, overlayTex: frameTexture(W / H),
    createTile(cell, data) {
      const g = new THREE.Group();
      const face = new THREE.MeshStandardMaterial({ roughness: 0.8, color: 0x777777 });
      cardFaceTexture(data.terrain, data.name, data.label).then(t => { face.map = t; face.color.set(0xffffff); face.needsUpdate = true; });
      const mesh = new THREE.Mesh(cardGeo, [edge, edge, face, back, edge, edge]);
      mesh.position.y = TH / 2; mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
      const props = buildProps(data.terrain, rng(hashStr(data.key)), sampler, 1.15, 1.1);
      if (props) { props.position.y = TH; g.add(props); }
      const overlay = new THREE.Mesh(overlayGeo, board.reachMat); overlay.position.y = TH + 0.004; g.add(overlay);
      return {
        group: g, hit: mesh, overlay, topY: TH, poiPos: { x: W * 0.4, z: -H * 0.3 },
        async reveal(animate, state = true) {
          if (!animate) { mesh.rotation.x = state ? 0 : Math.PI; if (props) props.visible = state; return; }
          if (props) props.visible = false;
          // la carte se soulève, pivote sur elle-même et retombe avec un léger rebond
          await tween({ duration: 0.7, ease: ease.inOutCubic, update: k => {
            mesh.rotation.x = Math.PI * (1 - k); mesh.rotation.z = Math.sin(Math.PI * k) * 0.25;
            mesh.position.y = TH / 2 + Math.sin(Math.PI * k) * H * 0.7;
          } });
          stage.rig.shake(0.02);
          if (props) { props.visible = true; props.scale.set(1, 0.01, 1); await tween({ duration: 0.45, ease: ease.outBack, update: k => props.scale.set(1, Math.max(0.01, k), 1) }); }
        },
      };
    },
  });

  // Aimantation : quand on lâche près d'une carte en vue rapprochée, la caméra se centre dessus
  let snap = true;
  const doSnap = () => {
    const r = stage.rig; if (!snap || r.goal.dist > 8 || r.follow || board.saved) return;
    let best = null, bd = Infinity;
    for (const c of grid.cells) { const d = Math.hypot(c.x - r.goal.x - r.vel.x * 0.22, c.z - r.goal.z - r.vel.z * 0.22); if (d < bd) { bd = d; best = c; } }
    if (best) r.flyTo({ x: best.x, z: best.z }, 7);
  };
  stage.rig.onRelease = () => setTimeout(doSnap, 0);
  board.menu.push({ title: 'Cartes', items: [
    { type: 'toggle', label: 'Aimantation sur la carte', value: true, onChange: v => (snap = v) },
    { label: 'Vue carte suivante →', close: false, action: () => {
      const r = stage.rig; const row = grid.cells.filter(c => Math.abs(c.z - r.goal.z) < H / 2).sort((a, c) => a.x - c.x);
      const next = row.find(c => c.x > r.goal.x + 0.1) || row[0]; if (next) r.flyTo({ x: next.x, z: next.z, dist: 5 }, 6);
    } },
  ] });
  onProgress(0.75, 'Figurines…');
  await board.preload();
  return board;
}
