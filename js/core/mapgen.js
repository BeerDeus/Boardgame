// Projection d'un scénario (lieux ancrés + zones) sur n'importe quelle grille.
// Déterministe pour une graine donnée ; les cases non-ancrées sont procédurales,
// ce qui permet aussi une génération « au fil de l'exploration ».
import { TERRAINS } from './terrains.js';
import { rng, hashStr } from './tween.js';
import { bfs } from './grid.js';

export function buildMap(grid, story, seed = 1) {
  const R = rng(seed * 7919 + 13);
  const xs = grid.cells.map(c => c.x), zs = grid.cells.map(c => c.z);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const uv = c => [(c.x - x0) / (x1 - x0 || 1), (c.z - z0) / (z1 - z0 || 1)];
  const jitter = seed === 1 ? 0 : 0.1; // graine ≠ 1 : carte « aléatoire » mais même histoire
  const J = a => Math.min(1, Math.max(0, a + (R() - 0.5) * 2 * jitter));

  const tiles = new Map(), placeKey = {}, used = new Set();
  const nearest = ([u, v]) => grid.cells.filter(c => !used.has(c.key)).reduce((best, c) => { const [a, b] = uv(c); const d = (a - u) ** 2 + (b - v) ** 2; return d < best.d ? { c, d } : best; }, { c: null, d: Infinity }).c;

  for (const p of story.places) {
    let cell;
    if (p.cell && grid.offsetKey && grid.has(grid.offsetKey(...p.cell))) cell = grid.get(grid.offsetKey(...p.cell)); // case précise de la carte
    else if (p.near) {
      const base = grid.get(placeKey[p.near]), away = grid.get(placeKey[p.away] || placeKey[p.near]);
      const opts = grid.neighbors(base.key).filter(k => !used.has(k)).map(k => grid.get(k));
      cell = opts.sort((a, b) => Math.hypot(b.x - away.x, b.z - away.z) - Math.hypot(a.x - away.x, a.z - away.z))[0];
    } else cell = nearest([J(p.at[0]), J(p.at[1])]);
    used.add(cell.key); placeKey[p.id] = cell.key;
    tiles.set(cell.key, { key: cell.key, terrain: p.terrain, name: p.name, place: p.id, poi: p.poi ? { ...p.poi } : null });
  }
  const ph = [R() * 9, R() * 9];
  const regions = story.regions.map(r => ({ ...r, at: [J(r.at[0]), J(r.at[1])] }));
  for (const c of grid.cells) {
    if (tiles.has(c.key)) continue;
    const [u, v] = uv(c), n = Math.sin(u * 9 + ph[0]) * Math.cos(v * 7 + ph[1]) * 0.18;
    let best = null, bs = 0.12;
    for (const r of regions) { const s = 1 - Math.hypot(u - r.at[0], v - r.at[1]) / r.r + n; if (s > bs) { bs = s; best = r.terrain; } }
    const t = best || (n > 0.08 ? 'rock' : 'plains');
    const names = TERRAINS[t].names, Rk = rng(hashStr(c.key) + seed);
    tiles.set(c.key, { key: c.key, terrain: t, name: names[Math.floor(Rk() * names.length)], place: null, poi: null });
  }
  // zones verrouillées : toutes les cases situées au-delà d'un lieu (ex. de l'autre côté du pont)
  for (const z of story.zones || []) {
    const bc = grid.get(placeKey[z.beyond]); if (!bc) continue;
    const [bu] = uv(bc);
    for (const c of grid.cells) if (uv(c)[0] > bu + 1e-6) tiles.get(c.key).zone = z.id;
  }
  const start = placeKey[story.places.find(p => p.start).id];
  // rencontres mineures sur les cases de terrain (toujours au moins sur les voisines du départ)
  if (story.minors?.length) {
    const near0 = new Set(grid.neighbors(start));
    for (const c of grid.cells) {
      const t = tiles.get(c.key); if (t.place) continue;
      const Rm = rng(hashStr('m' + c.key) + seed);
      if (!near0.has(c.key) && Rm() > (story.minorChance ?? 0.3)) continue;
      const fit = story.minors.filter(m => !m.terrains || m.terrains.includes(t.terrain));
      const m = (fit.length ? fit : story.minors)[Math.floor(Rm() * (fit.length || story.minors.length))];
      t.minor = m.id; t.poi = { icon: m.icon, label: m.name };
    }
  }
  // sanity : tout est atteignable (aucune case infranchissable pour l'instant)
  const reach = bfs(grid, start, () => true).dist;
  if (reach.size !== grid.cells.length) console.warn('Carte non connexe');
  return { tiles, placeKey, start };
}
