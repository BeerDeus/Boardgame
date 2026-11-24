// Panneau « Carte » : grille hexagonale (pointe en haut, lignes « odd-r ») qu'on peint à la souris / au doigt.
import { TERRAINS } from '../core/terrains.js';
import { cellsOf } from '../core/level-check.js';
import { h, select, field, btn, input, options } from './fields.js';

const S = 34, W = Math.sqrt(3) * S; // rayon et largeur d'un hexagone (px)
const CODE = { village: 'V', forest: 'F', plains: 'P', rock: 'R', swamp: 'M', ruins: 'U', burned: 'C', snow: 'N', crypt: 'X' };
const center = (c, r) => [W * (c + 0.5 * (r & 1)) + W / 2 + 6, S * 1.5 * r + S + 6];
const hexPts = (x, y) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + i * Math.PI / 3; return `${(x + Math.cos(a) * S).toFixed(1)},${(y + Math.sin(a) * S).toFixed(1)}`; }).join(' ');

export function mapPanel(ctx) {
  const L = ctx.L, st = ctx.mapState ||= { tool: 'cell', terrain: 'plains', zone: '', place: L.places?.[0]?.id || '' };
  const cells = cellsOf(L.hexMap);
  const rows = Math.max(L.hexMap?.length || 0, 1), cols = Math.max(...(L.hexMap || ['']).map(r => r.length), 1);
  const dims = ctx.mapDims ||= { cols: Math.max(cols + 2, 8), rows: Math.max(rows + 2, 6) };
  dims.cols = Math.max(dims.cols, cols); dims.rows = Math.max(dims.rows, rows);
  const placeAt = new Map((L.places || []).filter(p => p.cell).map(p => [p.cell.join(','), p]));
  L.tiles ||= {};

  const write = () => { // cellules → hexMap (on retire les lignes/colonnes vides en fin)
    let maxR = -1, maxC = -1; for (const k of cells) { const [c, r] = k.split(',').map(Number); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
    L.hexMap = Array.from({ length: maxR + 1 }, (_, r) => Array.from({ length: maxC + 1 }, (_, c) => (cells.has(`${c},${r}`) ? 'o' : ' ')).join('').replace(/\s+$/, ''));
    ctx.changed();
  };
  const terrainOf = k => placeAt.get(k)?.terrain || L.tiles[k]?.terrain || null;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const wpx = W * (dims.cols + 0.5) + 12, hpx = S * 1.5 * (dims.rows - 1) + S * 2 + 12;
  svg.setAttribute('viewBox', `0 0 ${wpx} ${hpx}`); svg.setAttribute('class', 'hexmap'); svg.style.maxWidth = `${wpx}px`;
  const draw = () => {
    // codes des tuiles physiques dans l'ordre du jeu (ligne par ligne)
    const codes = {}, cnt = {};
    for (let r = 0; r < dims.rows; r++) for (let c = 0; c < dims.cols; c++) { const k = `${c},${r}`; if (!cells.has(k)) continue; const t = terrainOf(k); if (!t) continue; const Lt = CODE[t] || 'T'; cnt[Lt] = (cnt[Lt] || 0) + 1; codes[k] = `${Lt}-${String(cnt[Lt]).padStart(2, '0')}`; }
    let out = '';
    for (let r = 0; r < dims.rows; r++) for (let c = 0; c < dims.cols; c++) {
      const k = `${c},${r}`, [x, y] = center(c, r), on = cells.has(k), t = terrainOf(k), p = placeAt.get(k), z = L.tiles[k]?.zone;
      out += `<g data-k="${k}" class="hx ${on ? 'on' : 'off'}${p ? ' place' : ''}${p?.start ? ' start' : ''}">`;
      out += `<polygon points="${hexPts(x, y)}" fill="${on ? (t ? TERRAINS[t].tint : '#6b6457') : 'transparent'}"/>`;
      if (on && z) out += `<polygon points="${hexPts(x, y)}" class="zone"/><text x="${x}" y="${y - S * 0.55}" class="zt">${z}</text>`;
      if (on) out += `<text x="${x}" y="${y + (p ? -4 : 4)}" class="code">${codes[k] || (t ? '' : 'auto')}</text>`;
      if (p) out += `<text x="${x}" y="${y + 12}" class="pn">${(p.start ? '★ ' : '') + (p.name || p.id).slice(0, 14)}</text>`;
      out += `<text x="${x}" y="${y + S * 0.72}" class="cr">${k}</text></g>`;
    }
    svg.innerHTML = out;
  };
  const apply = k => {
    const [c, r] = k.split(',').map(Number);
    if (st.tool === 'cell') {
      if (cells.has(k)) { if (placeAt.has(k) && !confirm(`La case ${k} porte le lieu « ${placeAt.get(k).name} ». La retirer quand même ?`)) return; cells.delete(k); delete L.tiles[k]; }
      else { cells.add(k); if (!L.tiles[k]?.terrain) L.tiles[k] = { ...(L.tiles[k] || {}), terrain: st.terrain }; }
      write();
    } else if (st.tool === 'terrain') {
      if (!cells.has(k)) { cells.add(k); write(); }
      if (placeAt.has(k)) placeAt.get(k).terrain = st.terrain; else L.tiles[k] = { ...(L.tiles[k] || {}), terrain: st.terrain };
      ctx.changed();
    } else if (st.tool === 'zone') {
      if (!cells.has(k)) return;
      if (st.zone) L.tiles[k] = { ...(L.tiles[k] || {}), zone: st.zone }; else if (L.tiles[k]) delete L.tiles[k].zone;
      ctx.changed();
    } else if (st.tool === 'place') {
      const p = (L.places || []).find(x => x.id === st.place); if (!p || !cells.has(k)) return;
      if (placeAt.has(k) && placeAt.get(k) !== p) { alert(`Case déjà occupée par « ${placeAt.get(k).name} ».`); return; }
      if (p.cell) placeAt.delete(p.cell.join(','));
      p.cell = [c, r]; placeAt.set(k, p); ctx.changed();
    }
    draw();
  };
  let painting = false, last = null;
  svg.addEventListener('pointerdown', e => { const g = e.target.closest('[data-k]'); if (!g) return; painting = st.tool !== 'cell' && st.tool !== 'place'; last = g.dataset.k; apply(last); e.preventDefault(); });
  svg.addEventListener('pointermove', e => { if (!painting) return; const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-k]'); if (el && el.dataset.k !== last) { last = el.dataset.k; apply(last); } });
  addEventListener('pointerup', () => { painting = false; });
  draw();

  const toolRow = h('div', { class: 'tools' },
    ...[['cell', 'Ajouter / retirer des cases'], ['terrain', 'Peindre le terrain'], ['zone', 'Peindre une zone verrouillée'], ['place', 'Placer un lieu']].map(([k, l]) =>
      h('button', { class: 'btn tool ' + (st.tool === k ? 'on' : ''), type: 'button', onclick: () => { st.tool = k; ctx.refresh(); } }, l)));
  const opts = h('div', { class: 'row' });
  if (st.tool === 'cell' || st.tool === 'terrain') opts.append(field('Terrain', select(st.terrain, options(ctx, 'terrain'), v => { st.terrain = v || 'plains'; })));
  if (st.tool === 'zone') opts.append(field('Zone', select(st.zone, options(ctx, 'zone'), v => { st.zone = v || ''; }, { empty: '(aucune : effacer)' }), 'Créez les zones dans « Événements ».'));
  if (st.tool === 'place') opts.append(field('Lieu à placer', select(st.place, options(ctx, 'place'), v => { st.place = v; })));
  const size = h('div', { class: 'row' },
    field('Colonnes', input(dims.cols, v => { dims.cols = Math.max(2, Math.min(30, v || 2)); ctx.refresh(); }, { type: 'number', cls: 'num' })),
    field('Lignes', input(dims.rows, v => { dims.rows = Math.max(2, Math.min(30, v || 2)); ctx.refresh(); }, { type: 'number', cls: 'num' })),
    btn('Tout effacer', () => { if (confirm('Retirer toutes les cases ?')) { cells.clear(); L.tiles = {}; write(); ctx.refresh(); } }, 'ghost'));
  const legend = h('div', { class: 'legend' }, ...Object.entries(TERRAINS).map(([k, v]) => h('span', {}, h('i', { style: `background:${v.tint}` }), `${CODE[k]} ${v.label}`)));
  return h('div', { class: 'panel map-panel' },
    h('h2', {}, 'Carte'),
    h('p', { class: 'muted' }, 'Pointe en haut ; les lignes impaires sont décalées d\'une demi-case. Les numéros (F-01…) sont ceux des tuiles physiques, attribués ligne par ligne. Glissez pour peindre.'),
    toolRow, opts, h('div', { class: 'map-wrap' }, svg), legend, size);
}
