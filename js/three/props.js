// Décors procéduraux fusionnés par tuile (1 draw call par tuile grâce aux couleurs de sommets).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
function part(geo, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}, R = Math.random) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv'); if (g.attributes.uv1) g.deleteAttribute('uv1');
  tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz)), tmpS.set(sx, sy, sz)); g.applyMatrix4(tmpM);
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  const v = 0.9 + R() * 0.2;
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r * v; arr[i * 3 + 1] = c.g * v; arr[i * 3 + 2] = c.b * v; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

const P = {
  pine(x, z, s, R, snow = false) {
    const out = [part(new THREE.CylinderGeometry(0.02 * s, 0.03 * s, 0.14 * s, 5), 0x3b2a1c, { x, y: 0.07 * s, z }, R)];
    const col = snow ? 0x3c5a50 : [0x1f3a2a, 0x24402c, 0x2b3f26][Math.floor(R() * 3)];
    for (let i = 0; i < 3; i++) {
      const r = (0.16 - i * 0.04) * s, y = (0.18 + i * 0.13) * s;
      out.push(part(new THREE.ConeGeometry(r, 0.22 * s, 7), col, { x, y, z, ry: R() * 3 }, R));
      if (snow) out.push(part(new THREE.ConeGeometry(r * 0.55, 0.1 * s, 7), 0xf2f4f8, { x, y: y + 0.07 * s, z }, R));
    }
    return out;
  },
  dead(x, z, s, R, col = 0x3a2f27) {
    const out = [part(new THREE.CylinderGeometry(0.012 * s, 0.035 * s, 0.45 * s, 5), col, { x, y: 0.22 * s, z, rz: (R() - 0.5) * 0.2 }, R)];
    for (let i = 0; i < 3; i++) out.push(part(new THREE.CylinderGeometry(0.006 * s, 0.014 * s, 0.2 * s, 4), col, { x: x + Math.cos(i * 2.1) * 0.05 * s, y: (0.28 + i * 0.05) * s, z: z + Math.sin(i * 2.1) * 0.05 * s, rz: Math.cos(i * 2.1) * -0.9, rx: Math.sin(i * 2.1) * 0.9 }, R));
    return out;
  },
  rock(x, z, s, R, col = 0x6a6661) {
    return [part(new THREE.DodecahedronGeometry(0.07 * s, 0), col, { x, y: 0.03 * s, z, rx: R() * 3, ry: R() * 3, sx: 1 + R() * 0.6, sy: 0.6 + R() * 0.5, sz: 1 + R() * 0.4 }, R)];
  },
  bush(x, z, s, R) { return [part(new THREE.IcosahedronGeometry(0.07 * s, 0), 0x3f4f28, { x, y: 0.05 * s, z, sy: 0.75 }, R), part(new THREE.IcosahedronGeometry(0.05 * s, 0), 0x4a5a2e, { x: x + 0.05 * s, y: 0.04 * s, z: z + 0.02 * s }, R)]; },
  house(x, z, s, R) {
    const ry = R() * Math.PI;
    const out = [part(new THREE.BoxGeometry(0.22 * s, 0.15 * s, 0.17 * s), [0xb9a27c, 0xa38b68, 0x8f7b62][Math.floor(R() * 3)], { x, y: 0.075 * s, z, ry }, R)];
    out.push(part(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.25 * s, 3), [0x6e2a20, 0x4a3a30, 0x5a3324][Math.floor(R() * 3)], { x, y: 0.19 * s, z, rz: Math.PI / 2, ry, sx: 0.6 }, R));
    out.push(part(new THREE.BoxGeometry(0.03 * s, 0.1 * s, 0.03 * s), 0x4a4440, { x: x + Math.cos(ry) * 0.06 * s, y: 0.25 * s, z: z - Math.sin(ry) * 0.06 * s }, R));
    return out;
  },
  pillar(x, z, s, R) {
    const h = (0.18 + R() * 0.25) * s;
    return [part(new THREE.CylinderGeometry(0.04 * s, 0.045 * s, h, 8), 0xa49d90, { x, y: h / 2, z, rz: (R() - 0.5) * 0.15 }, R), part(new THREE.BoxGeometry(0.11 * s, 0.03 * s, 0.11 * s), 0x8a8478, { x, y: 0.015 * s, z }, R)];
  },
  tomb(x, z, s, R) { return [part(new THREE.BoxGeometry(0.07 * s, 0.11 * s, 0.025 * s), 0x8c877d, { x, y: 0.05 * s, z, ry: (R() - 0.5) * 0.6, rz: (R() - 0.5) * 0.25 }, R)]; },
  reed(x, z, s, R) { const o = []; for (let i = 0; i < 4; i++) o.push(part(new THREE.ConeGeometry(0.007 * s, 0.2 * s, 3), 0x5d6a30, { x: x + (R() - 0.5) * 0.06, y: 0.1 * s, z: z + (R() - 0.5) * 0.06, rx: (R() - 0.5) * 0.4, rz: (R() - 0.5) * 0.4 }, R)); return o; },
  mush(x, z, s, R) { return [part(new THREE.CylinderGeometry(0.008 * s, 0.01 * s, 0.05 * s, 5), 0xd9d0b8, { x, y: 0.025 * s, z }, R), part(new THREE.SphereGeometry(0.025 * s, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0x9b7fc7, { x, y: 0.05 * s, z }, R)]; },
  well(x, z, s, R) { return [part(new THREE.CylinderGeometry(0.06 * s, 0.065 * s, 0.07 * s, 10), 0x7f786c, { x, y: 0.035 * s, z }, R), part(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.1 * s, 4), 0x4a3324, { x, y: 0.15 * s, z, ry: Math.PI / 4 }, R)]; },
};

const RECIPE = {
  village: [['house', 3], ['well', 1], ['bush', 1]], forest: [['pine', 6], ['rock', 1], ['bush', 1]], plains: [['bush', 3], ['rock', 2]],
  rock: [['rock', 7], ['dead', 1]], swamp: [['dead', 2], ['reed', 5], ['mush', 3]], ruins: [['pillar', 4], ['tomb', 3], ['rock', 1]],
  burned: [['deadB', 4], ['rock', 2]], snow: [['snowpine', 6], ['rockS', 1]],
};

/** sampler(R) -> {x,z} | null ; scale = échelle des décors */
export function buildProps(terrain, R, sampler, scale = 1, density = 1) {
  const geos = [];
  for (const [name, n0] of RECIPE[terrain] || []) {
    const n = Math.max(1, Math.round(n0 * density));
    for (let i = 0; i < n; i++) {
      const p = sampler(R); if (!p) continue;
      const s = scale * (0.8 + R() * 0.45);
      if (name === 'snowpine') geos.push(...P.pine(p.x, p.z, s, R, true));
      else if (name === 'deadB') geos.push(...P.dead(p.x, p.z, s, R, 0x1a1512));
      else if (name === 'rockS') geos.push(...P.rock(p.x, p.z, s, R, 0xc8ccd2));
      else geos.push(...P[name](p.x, p.z, s, R));
    }
  }
  if (!geos.length) return null;
  const merged = mergeGeometries(geos, false); merged.computeVertexNormals();
  geos.forEach(g => g.dispose());
  const m = new THREE.Mesh(merged, propMaterial()); m.castShadow = true; m.receiveShadow = true;
  return m;
}
let pm = null;
export const propMaterial = () => (pm ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));

/** Échantillonneur générique : rejette la zone centrale réservée aux figurines */
export function rectSampler(w, h, freeW, freeH, margin = 0.06) {
  return R => {
    for (let i = 0; i < 25; i++) {
      const x = (R() - 0.5) * (w - margin * 2), z = (R() - 0.5) * (h - margin * 2);
      if (Math.abs(x) < freeW / 2 && Math.abs(z) < freeH / 2) continue;
      return { x, z };
    }
    return null;
  };
}
export function hexSampler(r, free) {
  return R => {
    for (let i = 0; i < 25; i++) {
      const a = R() * Math.PI * 2, d = free + R() * (r * 0.82 - free);
      return { x: Math.cos(a) * d, z: Math.sin(a) * d };
    }
    return null;
  };
}
