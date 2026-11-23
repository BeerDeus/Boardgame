// Figurines "bateau" : minis procédurales peintes sur socle + 2 créatures GLB animées (Fox, Horse).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.05, flatShading: true, ...o });
const SKIN = 0xd9b38c, STEEL = 0xa9afb9, WOOD = 0x6b4a2b, DARK = 0x1d1916;

function mesh(geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; return o;
}
const lathe = (pts, seg = 10) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

function base(team) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.05, 28), mat(0x1a1715, { roughness: 0.4 }), 0, 0.025));
  g.add(mesh(new THREE.TorusGeometry(0.172, 0.012, 6, 32), mat(team, { metalness: 0.5, roughness: 0.35 }), 0, 0.05, 0, Math.PI / 2));
  return g;
}

const BUILD = {
  knight(c) {
    const g = new THREE.Group(), steel = mat(STEEL, { metalness: 0.65, roughness: 0.32 }), team = mat(c);
    g.add(mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.2, 7), steel, -0.045, 0.15), mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.2, 7), steel, 0.045, 0.15));
    g.add(mesh(lathe([[0, 0.24], [0.095, 0.25], [0.11, 0.33], [0.1, 0.44], [0.07, 0.5], [0, 0.51]]), steel));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.2, 0.02), team, 0, 0.35, 0.092));
    g.add(mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.11, 10), steel, 0, 0.57));
    g.add(mesh(new THREE.SphereGeometry(0.066, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel, 0, 0.625));
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.012, 0.02), mat(DARK), 0, 0.585, 0.062));
    g.add(mesh(new THREE.ConeGeometry(0.03, 0.14, 6), team, 0, 0.72, -0.02, -0.4));
    const shield = new THREE.Group(); shield.position.set(-0.13, 0.36, 0.04); shield.rotation.set(0, -0.5, 0);
    shield.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 3), team, 0, 0, 0, Math.PI / 2, 0, Math.PI));
    shield.add(mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(0xd6c48a, { metalness: 0.7, roughness: 0.3 }), 0, 0.01, 0.015));
    g.add(shield);
    const sword = new THREE.Group(); sword.position.set(0.13, 0.3, 0.05); sword.rotation.z = -0.12;
    sword.add(mesh(new THREE.BoxGeometry(0.024, 0.34, 0.008), mat(0xe2e6ec, { metalness: 0.85, roughness: 0.2 }), 0, 0.2));
    sword.add(mesh(new THREE.BoxGeometry(0.09, 0.018, 0.02), mat(0x8a6d3b, { metalness: 0.5 }), 0, 0.03));
    sword.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.07, 6), mat(WOOD), 0, -0.01));
    g.add(sword);
    return g;
  },
  mage(c) {
    const g = new THREE.Group(), robe = mat(c), dark = mat(new THREE.Color(c).multiplyScalar(0.55));
    g.add(mesh(lathe([[0, 0.05], [0.15, 0.05], [0.12, 0.16], [0.085, 0.38], [0.065, 0.48], [0, 0.5]]), robe));
    g.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), mat(SKIN), 0, 0.54));
    g.add(mesh(new THREE.ConeGeometry(0.04, 0.12, 6), mat(0xe9e6df), 0, 0.47, 0.04, Math.PI));
    g.add(mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.012, 14), dark, 0, 0.585));
    g.add(mesh(new THREE.ConeGeometry(0.065, 0.22, 10), dark, 0.01, 0.7, -0.01, -0.15, 0, -0.12));
    g.add(mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.66, 6), mat(WOOD), 0.12, 0.38, 0.03));
    const orb = mesh(new THREE.IcosahedronGeometry(0.032, 1), new THREE.MeshStandardMaterial({ color: 0x7ff3ff, emissive: 0x3fd8ff, emissiveIntensity: 2.2 }), 0.12, 0.73, 0.03);
    orb.castShadow = false; g.add(orb); g.userData.orb = orb;
    return g;
  },
  rogue(c) {
    const g = new THREE.Group(), cloak = mat(c);
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.2, 7), mat(0x2c2a26), -0.04, 0.15), mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.2, 7), mat(0x2c2a26), 0.04, 0.15));
    g.add(mesh(lathe([[0, 0.12], [0.12, 0.12], [0.1, 0.3], [0.08, 0.46], [0, 0.5]]), cloak));
    g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(0x141210), 0, 0.54, 0.005));
    g.add(mesh(new THREE.ConeGeometry(0.075, 0.16, 8), cloak, 0, 0.6, -0.01, -0.25));
    g.add(mesh(new THREE.BoxGeometry(0.015, 0.14, 0.006), mat(0xe2e6ec, { metalness: 0.8, roughness: 0.2 }), 0.11, 0.3, 0.05, 0.3, 0, -0.4));
    return g;
  },
  cleric(c) {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0.05], [0.14, 0.05], [0.11, 0.2], [0.08, 0.44], [0, 0.5]]), mat(0xe8e2d0)));
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.4, 0.02), mat(c), 0, 0.27, 0.085, -0.15));
    g.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), mat(SKIN), 0, 0.54));
    g.add(mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 24), new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffd060, emissiveIntensity: 1.5 }), 0, 0.6, -0.03, Math.PI / 2.4));
    g.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6), mat(WOOD), 0.12, 0.3, 0.03));
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), mat(STEEL, { metalness: 0.7, roughness: 0.3 }), 0.12, 0.5, 0.03));
    return g;
  },
  npc(c) {
    const g = new THREE.Group();
    const body = new THREE.Group(); body.rotation.x = 0.22; g.add(body);
    body.add(mesh(lathe([[0, 0.05], [0.13, 0.05], [0.11, 0.2], [0.085, 0.36], [0.05, 0.44], [0, 0.45]]), mat(c)));
    body.add(mesh(new THREE.ConeGeometry(0.1, 0.12, 8, 1, true), mat(new THREE.Color(c).multiplyScalar(0.7), { side: THREE.DoubleSide }), 0, 0.38));
    body.add(mesh(new THREE.SphereGeometry(0.052, 10, 8), mat(SKIN), 0, 0.48, 0.02));
    body.add(mesh(new THREE.SphereGeometry(0.056, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xcfcac0), 0, 0.49, 0.0));
    g.add(mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.5, 6), mat(WOOD), -0.12, 0.27, 0.06, 0.15, 0, 0.1));
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.06, 8), mat(0x8a6d3b), 0.11, 0.24, 0.07));
    return g;
  },
  child(c) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.13, 6), mat(0x4a3b2c), -0.03, 0.1), mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.13, 6), mat(0x4a3b2c), 0.03, 0.1));
    g.add(mesh(lathe([[0, 0.16], [0.075, 0.16], [0.07, 0.26], [0.05, 0.31], [0, 0.32]]), mat(c)));
    g.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(SKIN), 0, 0.36));
    g.add(mesh(new THREE.SphereGeometry(0.053, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7a4a22), 0, 0.37, -0.005));
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5), mat(WOOD), 0.08, 0.22, 0.03, 0, 0, -0.6));
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.035, 0.01), mat(STEEL, { metalness: 0.7, roughness: 0.3 }), 0.14, 0.3, 0.03, 0, 0, -0.6));
    return g;
  },
  ferryman(c) {
    const g = new THREE.Group(), robe = mat(c);
    g.add(mesh(lathe([[0, 0.05], [0.14, 0.05], [0.12, 0.2], [0.09, 0.4], [0.06, 0.48], [0, 0.5]]), robe));
    g.add(mesh(new THREE.ConeGeometry(0.08, 0.2, 8), mat(new THREE.Color(c).multiplyScalar(0.7)), 0, 0.57, -0.01, -0.2));
    g.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(0x0d0b0a), 0, 0.52, 0.025));
    g.add(mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.85, 6), mat(0x4a3324), 0.13, 0.45, 0.02, 0, 0, -0.05));
    g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 4), mat(DARK), -0.13, 0.4, 0.06));
    const lamp = mesh(new THREE.BoxGeometry(0.045, 0.06, 0.045), new THREE.MeshStandardMaterial({ color: 0xffcf6a, emissive: 0xffa030, emissiveIntensity: 2.5 }), -0.13, 0.33, 0.06);
    lamp.castShadow = false; g.add(lamp); g.userData.orb = lamp;
    return g;
  },
  monk(c) {
    const g = new THREE.Group(), robe = mat(c), skin = mat(0xa8b49a);
    g.add(mesh(lathe([[0, 0.05], [0.17, 0.05], [0.14, 0.2], [0.1, 0.44], [0.07, 0.52], [0, 0.54]]), robe));
    g.add(mesh(new THREE.ConeGeometry(0.1, 0.24, 8), mat(new THREE.Color(c).multiplyScalar(1.3)), 0, 0.62, -0.02, -0.25));
    g.add(mesh(new THREE.SphereGeometry(0.055, 8, 6), skin, 0, 0.56, 0.035));
    const eye = new THREE.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xff2010, emissiveIntensity: 3 });
    g.add(mesh(new THREE.SphereGeometry(0.011, 6, 4), eye, -0.022, 0.57, 0.085), mesh(new THREE.SphereGeometry(0.011, 6, 4), eye, 0.022, 0.57, 0.085));
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.012, 0.32, 5), skin, -0.16, 0.3, 0.06, 0.3, 0, 0.35), mesh(new THREE.CylinderGeometry(0.02, 0.012, 0.32, 5), skin, 0.16, 0.3, 0.06, 0.3, 0, -0.35));
    g.add(mesh(lathe([[0, 0.12], [0.04, 0.11], [0.055, 0.04], [0.06, 0]]), mat(0x8a6d3b, { metalness: 0.8, roughness: 0.3 }), 0.2, 0.12, 0.1));
    g.scale.setScalar(1.3);
    return g;
  },
  ghoul(c) {
    const g = new THREE.Group(), skin = mat(c), dk = mat(new THREE.Color(c).multiplyScalar(0.6));
    g.add(mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.2, 6), dk, -0.05, 0.14, 0, 0, 0, 0.15), mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.2, 6), dk, 0.05, 0.14, 0, 0, 0, -0.15));
    const torso = mesh(new THREE.DodecahedronGeometry(0.11, 0), skin, 0, 0.33, 0.02); torso.scale.set(1, 1.1, 0.8); torso.rotation.x = 0.5; g.add(torso);
    g.add(mesh(new THREE.DodecahedronGeometry(0.065, 0), skin, 0, 0.42, 0.11));
    const eye = new THREE.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xff2010, emissiveIntensity: 3 });
    g.add(mesh(new THREE.SphereGeometry(0.012, 6, 4), eye, -0.025, 0.43, 0.17), mesh(new THREE.SphereGeometry(0.012, 6, 4), eye, 0.025, 0.43, 0.17));
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.014, 0.3, 5), skin, -0.13, 0.23, 0.08, 0.4, 0, 0.25), mesh(new THREE.CylinderGeometry(0.02, 0.014, 0.3, 5), skin, 0.13, 0.23, 0.08, 0.4, 0, -0.25));
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.ConeGeometry(0.018, 0.07, 4), dk, (i - 1.5) * 0.04, 0.42 - i * 0.015, -0.06 + i * 0.01, -0.9));
    return g;
  },
};

// ---------- Fusion : 1 maillage mat + 1 métal par figurine (couleurs en attributs de sommets) ----------
const _m = new THREE.Matrix4();
function mergeFigure(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = { matte: [], metal: [] }, keep = [], drop = [];
  root.traverse(m => {
    if (!m.isMesh) return;
    const mt = m.material;
    if (mt.emissive && mt.emissive.getHex() !== 0) { keep.push(m); return; }
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(_m.multiplyMatrices(inv, m.matrixWorld));
    const n = g.attributes.position.count, col = new Float32Array(n * 3), c = mt.color;
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (mt.metalness > 0.4 ? buckets.metal : buckets.matte).push(g); drop.push(m);
  });
  for (const m of keep) root.attach(m);
  for (const m of drop) m.removeFromParent();
  const empty = []; root.traverse(o => { if (o !== root && o.isGroup && !o.children.length) empty.push(o); }); empty.forEach(o => o.removeFromParent());
  for (const [k, list] of Object.entries(buckets)) {
    if (!list.length) continue;
    const geo = mergeGeometries(list); list.forEach(x => x.dispose());
    const me = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: k === 'metal' ? 0.32 : 0.62, metalness: k === 'metal' ? 0.65 : 0.05 }));
    me.castShadow = me.receiveShadow = true; root.add(me);
  }
}

const FINISH = { grey: { color: 0x8f8b86, metalness: 0.08, roughness: 0.78 }, bronze: { color: 0xb08d57, metalness: 0.85, roughness: 0.34 } };
/** Finition des figurines : peintes / non peintes (grises) / bronze */
export function applyFinish(fig, finish) {
  for (const m of fig.userData.mats) {
    if (m.emissive && m.emissive.getHex() !== 0) continue;
    m.userData.orig ||= { color: m.color.getHex(), metalness: m.metalness, roughness: m.roughness, vertexColors: m.vertexColors, map: m.map };
    const o = m.userData.orig, f = FINISH[finish];
    if (!f) { m.color.setHex(o.color); m.metalness = o.metalness; m.roughness = o.roughness; m.vertexColors = o.vertexColors; m.map = o.map; }
    else { m.color.setHex(f.color); m.metalness = f.metalness; m.roughness = f.roughness; m.vertexColors = false; m.map = null; }
    m.needsUpdate = true;
  }
}

// ---------- GLB ----------
const gltfCache = {};
const GLB = { fox: { url: 'assets/models/Fox.glb', height: 0.32, idle: 'Survey', move: 'Run' }, wolf: { url: 'assets/models/Fox.glb', height: 0.32, idle: 'Survey', move: 'Run', tint: 0x8a8580 }, horse: { url: 'assets/models/Horse.glb', height: 0.6, idle: null, move: 'horse_A_' } };
export function preloadGLB() { return Promise.all([...new Set(Object.values(GLB).map(d => d.url))].map(u => (gltfCache[u] ||= new GLTFLoader().loadAsync(u)).catch(() => null))); }

async function buildGLB(kind) {
  const def = GLB[kind], gltf = await (gltfCache[def.url] ||= new GLTFLoader().loadAsync(def.url));
  const obj = SkeletonUtils.clone(gltf.scene);
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
  const s = def.height / size.y; obj.scale.setScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj); obj.position.y -= box2.min.y - 0.05;
  const c = box2.getCenter(new THREE.Vector3()); obj.position.x -= c.x; obj.position.z -= c.z;
  // orientation : la tête vers +Z
  const wrap = new THREE.Group(); wrap.add(obj);
  if (kind === 'wolf') wrap.rotation.y = 0; if (kind === 'horse') wrap.rotation.y = 0;
  obj.traverse(m => {
    if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.material = m.material.clone(); if (def.tint) m.material.color?.multiply(new THREE.Color(def.tint)); m.frustumCulled = false; }
  });
  const mixer = new THREE.AnimationMixer(obj), actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  return { obj: wrap, mixer, actions, def };
}

/** Crée une figurine complète : socle + corps + hitbox invisible généreuse (tap mobile) */
export async function makeFigure(data) {
  const root = new THREE.Group(), team = new THREE.Color(data.color);
  const inner = new THREE.Group(); root.add(inner);
  inner.add(base(team));
  let anim = null;
  if (GLB[data.kind]) { anim = await buildGLB(data.kind); inner.add(anim.obj); if (anim.def.idle && anim.actions[anim.def.idle]) anim.actions[anim.def.idle].play(); }
  else { const body = (BUILD[data.kind] || BUILD.npc)(team); body.position.y = 0.05; inner.add(body); inner.userData.orb = body.userData.orb; }
  if (!anim) mergeFigure(inner); else mergeFigure(inner.children[0]);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.45; hit.userData.figureId = data.id; root.add(hit);
  // matériaux propres à la figurine (flash de dégâts)
  const mats = []; inner.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.material = m.material.clone(); mats.push(m.material); } });
  if (inner.userData.orb) inner.traverse(m => { if (m.isMesh && m.material.emissiveIntensity > 2) inner.userData.orb = m; });
  root.userData = { id: data.id, inner, hit, anim, mats };
  return root;
}

export function flash(fig, color = 0xff2a1a, dur = 0.35) {
  const mats = fig.userData.mats; const saved = mats.map(m => [m.emissive?.getHex(), m.emissiveIntensity]);
  mats.forEach(m => { if (m.emissive) { m.emissive.setHex(color); m.emissiveIntensity = 1.2; } });
  setTimeout(() => mats.forEach((m, i) => { if (m.emissive) { m.emissive.setHex(saved[i][0]); m.emissiveIntensity = saved[i][1]; } }), dur * 1000);
}
