// Grilles abstraites : carrée, rectangulaire (cartes), hexagonale.
// Toutes exposent la même API -> le scénario/jeu est indépendant de la forme des tuiles.
function finalize(g) {
  g.map = new Map(g.cells.map(c => [c.key, c]));
  g.has = k => g.map.has(k);
  g.get = k => g.map.get(k);
  const xs = g.cells.map(c => c.x), zs = g.cells.map(c => c.z);
  g.bounds = { minX: Math.min(...xs) - g.w / 2, maxX: Math.max(...xs) + g.w / 2, minZ: Math.min(...zs) - g.h / 2, maxZ: Math.max(...zs) + g.h / 2 };
  g.center = g.cells.reduce((best, c) => (c.x * c.x + c.z * c.z < best.x * best.x + best.z * best.z ? c : best), g.cells[0]);
  return g;
}
const K = (q, r) => `${q},${r}`;

/** Emplacements des figurines sur une tuile (jusqu'à 6) */
function slotsFor(n, sx, sz) {
  if (n > 6) { // au-delà : couronne extérieure + centre
    const out = [{ x: 0, z: 0 }];
    for (let i = 0; i < n - 1; i++) { const a = (i / (n - 1)) * Math.PI * 2; out.push({ x: Math.cos(a) * 1.35 * sx, z: Math.sin(a) * 1.35 * sz }); }
    return out;
  }
  const L = {
    1: [[0, 0]], 2: [[-1, 0], [1, 0]], 3: [[-1, 0.7], [1, 0.7], [0, -0.9]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]],
    6: [[-1.2, -0.9], [0, -1.1], [1.2, -0.9], [-1.2, 0.9], [0, 1.1], [1.2, 0.9]],
  }[Math.min(6, Math.max(1, n))];
  return L.map(([x, z]) => ({ x: x * sx, z: z * sz }));
}

export function squareGrid({ cols = 7, rows = 5, size = 1, gap = 0.05 } = {}) {
  const step = size + gap, cells = [];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++)
    cells.push({ q, r, key: K(q, r), x: (q - (cols - 1) / 2) * step, z: (r - (rows - 1) / 2) * step });
  const g = { type: 'square', cols, rows, w: size, h: size, step, cells };
  g.neighbors = k => { const c = g.get(k); return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => K(c.q + a, c.r + b)).filter(g.has); };
  g.slots = n => slotsFor(n, size * 0.21, size * 0.21);
  return finalize(g);
}

export function rectGrid({ cols = 5, rows = 4, w = 2.1, h = 1.4, gap = 0.1 } = {}) {
  const cells = [];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++)
    cells.push({ q, r, key: K(q, r), x: (q - (cols - 1) / 2) * (w + gap), z: (r - (rows - 1) / 2) * (h + gap) });
  const g = { type: 'rect', cols, rows, w, h, cells };
  g.neighbors = k => { const c = g.get(k); return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => K(c.q + a, c.r + b)).filter(g.has); };
  g.slots = n => slotsFor(n, w * 0.17, h * 0.2);
  return finalize(g);
}

/** Hex "pointy-top", coordonnées axiales, carte en forme d'hexagone de rayon R */
export function hexGrid({ radius = 3, size = 0.62, gap = 0.03 } = {}) {
  const cells = [], s = size + gap;
  for (let q = -radius; q <= radius; q++)
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++)
      cells.push({ q, r, key: K(q, r), x: s * Math.sqrt(3) * (q + r / 2), z: s * 1.5 * r });
  const g = { type: 'hex', radius, size, w: Math.sqrt(3) * size, h: 2 * size, cells };
  const D = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  g.neighbors = k => { const c = g.get(k); return D.map(([a, b]) => K(c.q + a, c.r + b)).filter(g.has); };
  g.slots = n => slotsFor(n, size * 0.36, size * 0.36);
  return finalize(g);
}

/** BFS : distances depuis start à travers les cases autorisées */
export function bfs(grid, start, passable, maxSteps = Infinity) {
  const dist = new Map([[start, 0]]), prev = new Map(), q = [start];
  while (q.length) {
    const k = q.shift(), d = dist.get(k);
    if (d >= maxSteps) continue;
    for (const n of grid.neighbors(k)) {
      if (dist.has(n) || !passable(n)) continue;
      dist.set(n, d + 1); prev.set(n, k); q.push(n);
    }
  }
  const pathTo = k => { if (!dist.has(k)) return null; const p = [k]; while (prev.has(p[0])) p.unshift(prev.get(p[0])); return p; };
  return { dist, pathTo };
}
