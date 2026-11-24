// Figurines "bateau" : minis procédurales peintes sur socle + 2 créatures GLB animées (Fox, Horse).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tween } from '../core/tween.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.05, flatShading: true, ...o });
const SKIN = 0xd9b38c, STEEL = 0xa9afb9, WOOD = 0x6b4a2b, DARK = 0x1d1916;

function mesh(geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; return o;
}
const lathe = (pts, seg = 10) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

function base(team) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.05, 32), mat(team.clone().multiplyScalar(0.35), { roughness: 0.45 }), 0, 0.025));
  g.add(mesh(new THREE.CylinderGeometry(0.163, 0.163, 0.008, 32), mat(team, { roughness: 0.4 }), 0, 0.052));
  g.add(mesh(new THREE.TorusGeometry(0.168, 0.01, 6, 40), mat(0xc9a45c, { metalness: 0.7, roughness: 0.3 }), 0, 0.054, 0, Math.PI / 2));
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

// ---------- GLB : personnages KayKit (CC0, Kay Lousberg) + créatures ----------
const gltfCache = {};
const KK = 'assets/models/kaykit/';
const KAY = { idle: 'Idle', move: 'Walking_A', attack: '1H_Melee_Attack_Chop', hit: 'Hit_A', death: 'Death_A', talk: 'Interact', cheer: 'Cheer', sit: 'Sit_Floor_Idle', spawn: 'Spawn_Ground_Skeletons', cast: 'Spellcast_Shoot' };
const HEROW = ['1H_Crossbow', '2H_Crossbow', 'Throwable'];
export const GLB = {
  knight:    { url: KK + 'Knight.glb', height: 0.62, anims: KAY, hide: ['1H_Sword_Offhand', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '2H_Sword'] },
  mage:      { url: KK + 'Mage.glb', height: 0.62, anims: { ...KAY, attack: 'Spellcast_Shoot' }, hide: ['Spellbook', 'Spellbook_open', '1H_Wand'] },
  barbarian: { url: KK + 'Barbarian.glb', height: 0.64, anims: { ...KAY, attack: '2H_Melee_Attack_Chop' }, hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', 'Mug'] },
  rogue:     { url: KK + 'Rogue.glb', height: 0.6, anims: { ...KAY, attack: 'Dualwield_Melee_Attack_Stab' }, hide: HEROW },
  npc:       { url: KK + 'Mage.glb', height: 0.56, anims: KAY, tint: 0xc9a27a, hide: ['Spellbook', 'Spellbook_open', '1H_Wand'] },
  child:     { url: KK + 'Rogue.glb', height: 0.42, anims: KAY, tint: 0xf2d6a8, hide: [...HEROW, 'Knife', 'Knife_Offhand', 'Rogue_Cape'] },
  smith:     { url: KK + 'Knight.glb', height: 0.6, anims: KAY, tint: 0xd9b48a, hide: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '2H_Sword', 'Knight_Helmet', 'Knight_Cape'] },
  hunter:    { url: KK + 'Barbarian.glb', height: 0.6, anims: KAY, tint: 0xb8a882, hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '2H_Axe', 'Mug'] },
  ferryman:  { url: KK + 'Rogue_Hooded.glb', height: 0.63, anims: KAY, tint: 0x8796a4, hide: [...HEROW, 'Knife', 'Knife_Offhand'] },
  skeleton:  { url: KK + 'Skeleton_Minion.glb', height: 0.58, anims: KAY, weapons: { r: 'Skeleton_Blade' } },
  skelwarrior: { url: KK + 'Skeleton_Warrior.glb', height: 0.62, anims: KAY, weapons: { r: 'Skeleton_Axe', l: 'Skeleton_Shield_Small_A' } },
  skelrogue: { url: KK + 'Skeleton_Rogue.glb', height: 0.6, anims: { ...KAY, attack: 'Dualwield_Melee_Attack_Stab' }, weapons: { r: 'Skeleton_Blade', l: 'Skeleton_Blade' } },
  sonneur:   { url: KK + 'Skeleton_Mage.glb', height: 0.86, anims: { ...KAY, attack: 'Spellcast_Shoot' }, tint: 0xffb3a0, weapons: { r: 'Skeleton_Staff' } },
  fox:   { url: 'assets/models/Fox.glb', height: 0.32, anims: { idle: 'Survey', move: 'Run', attack: 'Run' } },
  wolf:  { url: 'assets/models/Fox.glb', height: 0.32, anims: { idle: 'Survey', move: 'Run', attack: 'Run' }, tint: 0x8a8580 },
  horse: { url: 'assets/models/Horse.glb', height: 0.6, anims: { move: 'horse_A_' } },
};
const load = url => (gltfCache[url] ||= new GLTFLoader().loadAsync(url));
export function preloadGLB(kinds) {
  const urls = new Set();
  for (const [k, d] of Object.entries(GLB)) if (!kinds || kinds.includes(k)) { urls.add(d.url); for (const w of Object.values(d.weapons || {})) urls.add(KK + w + '.glb'); }
  return Promise.all([...urls].map(u => load(u).catch(() => null)));
}

async function buildGLB(kind) {
  const def = GLB[kind], gltf = await load(def.url);
  const obj = SkeletonUtils.clone(gltf.scene);
  // masquer les accessoires inutiles (boucliers/armes alternatives…)
  const drop = []; obj.traverse(o => { if (def.hide?.includes(o.name)) drop.push(o); }); drop.forEach(o => o.removeFromParent());
  // armes attachées aux os des mains
  for (const [side, w] of Object.entries(def.weapons || {})) {
    const slot = obj.getObjectByName(`handslot.${side}`); const wg = await load(KK + w + '.glb').catch(() => null);
    if (slot && wg) slot.add(wg.scene.clone());
  }
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
  const s = def.height / size.y; obj.scale.setScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj); obj.position.y -= box2.min.y - 0.05;
  const c = box2.getCenter(new THREE.Vector3()); obj.position.x -= c.x; obj.position.z -= c.z;
  const wrap = new THREE.Group(); wrap.add(obj);
  obj.traverse(m => {
    if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.material = m.material.clone(); if (def.tint) m.material.color?.multiply(new THREE.Color(def.tint)); m.frustumCulled = false; }
  });
  const mixer = new THREE.AnimationMixer(obj), actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  return { obj: wrap, mixer, actions, def, busy: 0, current: null };
}

/** Joue une animation par rôle (idle, move, attack, hit, death, talk, cheer, sit, spawn, cast). Promise résolue à la fin (one-shot). */
export function playAnim(fig, key, { loop = false, fade = 0.18 } = {}) {
  const a = fig.userData.anim; if (!a) return Promise.resolve(false);
  const name = a.def.anims?.[key], act = name && a.actions[name];
  if (!act) return Promise.resolve(false);
  const prev = a.current;
  act.reset(); act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1); act.clampWhenFinished = !loop;
  act.enabled = true; act.setEffectiveWeight(1); act.fadeIn(prev ? fade : 0).play();
  if (prev && prev !== act) prev.fadeOut(fade);
  a.current = act; if (loop) a.idleKey = key;
  if (loop) { a.mixer.update(0.001); return Promise.resolve(true); }
  a.busy++;
  const dur = act.getClip().duration;
  tween({ duration: dur + 0.1 }); // garde le rendu actif pendant l'anim (rendu à la demande)
  return new Promise(res => {
    let done = false;
    const end = () => { if (done) return; done = true; a.mixer.removeEventListener('finished', f); clearTimeout(guard); a.busy--; res(true); };
    const f = e => { if (e.action === act) end(); };
    a.mixer.addEventListener('finished', f);
    const guard = setTimeout(end, (dur + 1.5) * 1000); // jamais bloquer la partie sur une animation
  });
}
export const hasAnim = (fig, key) => !!fig.userData.anim?.actions[fig.userData.anim.def.anims?.[key]];

// ---------- Socle : couleur propre au personnage + bandeau avec le nom ----------
function nameBand(name, color, r) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const g = c.getContext('2d');
  const col = new THREE.Color(color);
  g.fillStyle = '#14100d'; g.fillRect(0, 0, 1024, 64);
  g.fillStyle = `#${col.getHexString()}`; g.fillRect(0, 0, 1024, 5); g.fillRect(0, 59, 1024, 5);
  g.fillStyle = '#f2e2b8'; g.font = '600 36px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = name.toUpperCase();
  for (const x of [256, 768]) g.fillText(label, x, 34);
  g.fillStyle = `#${col.getHexString()}`; for (const x of [0, 512, 1024]) { g.beginPath(); g.arc(x, 32, 7, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = THREE.RepeatWrapping;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.046, 48, 1, true), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
  m.position.y = 0.026; m.rotation.y = Math.PI; return m;
}

/** Crée une figurine complète : socle coloré + nom + corps + hitbox invisible généreuse (tap mobile) */
export async function makeFigure(data) {
  const root = new THREE.Group(), team = new THREE.Color(data.base || data.color);
  const inner = new THREE.Group(); root.add(inner);
  const big = data.kind === 'sonneur' ? 1.35 : 1;
  const b = base(team); b.scale.set(1.12 * big, 1, 1.12 * big); inner.add(b);
  let anim = null;
  if (GLB[data.kind]) {
    anim = await buildGLB(data.kind); inner.add(anim.obj);
    const k = data.idle || 'idle';
    const act = anim.actions[anim.def.anims?.[k]];
    if (act) { act.play(); anim.current = act; anim.idleKey = k; anim.mixer.update(0.01); }
  } else { const body = (BUILD[data.kind] || BUILD.npc)(team); body.position.y = 0.05; inner.add(body); inner.userData.orb = body.userData.orb; }
  mergeFigure(anim ? b : inner);
  if (data.name) inner.add(nameBand(data.name, team, 0.181 * 1.12 * big));
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * big, 0.24 * big, 0.95 * big, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.45 * big; hit.userData.figureId = data.id; root.add(hit);
  const mats = []; inner.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.material = m.material.clone(); mats.push(m.material); } });
  if (inner.userData.orb) inner.traverse(m => { if (m.isMesh && m.material.emissiveIntensity > 2) inner.userData.orb = m; });
  root.userData = { id: data.id, inner, hit, anim, mats, height: (GLB[data.kind]?.height || 0.7) + 0.05 };
  return root;
}

export function flash(fig, color = 0xff2a1a, dur = 0.35) {
  const mats = fig.userData.mats; const saved = mats.map(m => [m.emissive?.getHex(), m.emissiveIntensity]);
  mats.forEach(m => { if (m.emissive) { m.emissive.setHex(color); m.emissiveIntensity = 1.2; } });
  setTimeout(() => mats.forEach((m, i) => { if (m.emissive) { m.emissive.setHex(saved[i][0]); m.emissiveIntensity = saved[i][1]; } }), dur * 1000);
}
