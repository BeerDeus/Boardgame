// Vérification d'un niveau JSON (éditeur + tools/validate-level.mjs) : références croisées, carte, dialogues.
import { TERRAINS } from './terrains.js';
import { STATS, DIFFICULTIES, SKILL_NAMES } from './stats.js';
import { HEROES } from './heroes.js';
import { EFFECTS, CONDS } from './level.js';

export const KINDS = {
  npc: 'Aubergiste (civil)', smith: 'Forgeron (civil)', child: 'Enfant (civil)', hunter: 'Chasseur (civil)', ferryman: 'Encapuchonné',
  skeleton: 'Squelette', skelwarrior: 'Squelette guerrier', skelrogue: 'Squelette voleur', sonneur: 'Squelette mage (grand)',
  wolf: 'Loup', fox: 'Renard', horse: 'Cheval',
  knight: 'Chevalier (modèle héros)', mage: 'Mage (modèle héros)', barbarian: 'Barbare (modèle héros)', rogue: 'Voleuse (modèle héros)',
};
export const TEAMS = { npc: 'PNJ', enemy: 'Ennemi', boss: 'Boss', mount: 'Monture' };

/** Cases de la carte : Set de "col,row" */
export const cellsOf = hexMap => { const s = new Set(); (hexMap || []).forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== ' ' && ch !== '.') s.add(`${c},${r}`); })); return s; };
/** Voisins d'une case en lignes « odd-r » (rangées impaires décalées d'une demi-case vers la droite) */
export function neighborsOf(col, row) {
  const odd = row & 1;
  const d = odd ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]] : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
  return d.map(([dc, dr]) => [col + dc, row + dr]);
}

/** Parcourt tous les effets/conditions du niveau : visit(kind, obj, where) */
export function walk(L, visit) {
  const eff = (list, where) => { for (const e of list || []) { visit('effect', e, where); const def = EFFECTS[e.type];
    for (const [k, t] of def?.fields || []) { if (t === 'effects') eff(e[k], `${where} › ${def.label}`); if (t === 'cond') cnd(e[k], where);
      if (t === 'options') for (const o of e[k] || []) { cnd(o.cond, where); eff(o.effects, `${where} › ${o.label || 'option'}`); } } } };
  const cnd = (c, where) => { if (!c?.type) return; visit('cond', c, where); for (const x of c.conds || []) cnd(x, where); if (c.cond) cnd(c.cond, where); };
  const acts = (list, where) => { for (const a of list || []) { cnd(a.cond, `${where} › ${a.label || a.id}`); eff(a.effects, `${where} › ${a.label || a.id}`); } };
  for (const p of L.places || []) acts(p.activities, `Lieu « ${p.name || p.id} »`);
  for (const [k, it] of Object.entries(L.items || {})) { cnd(it.useCond, `Objet « ${it.name || k} »`); eff(it.useEffects, `Objet « ${it.name || k} »`); }
  for (const m of L.minors || []) acts(m.activities, `Rencontre « ${m.name || m.id} »`);
  for (const [id, d] of Object.entries(L.dialogues || {})) for (const [nid, n] of Object.entries(d.nodes || {})) {
    const w = `Dialogue ${id} › ${nid}`;
    eff(n.effects, w); for (const v of n.variants || []) cnd(v.cond, w); for (const b of n.branches || []) cnd(b.cond, w);
    for (const c of n.choices || []) { cnd(c.cond, w); eff(c.effects, w); eff(c.test?.successEffects, w); eff(c.test?.failEffects, w); }
    eff(n.test?.successEffects, w); eff(n.test?.failEffects, w);
  }
  for (const [k, rules] of Object.entries(L.talk || {})) for (const r of rules) cnd(r.cond, `Parler à ${k}`);
  for (const key of ['afterTalk', 'onReveal', 'onEnter', 'glasEvents', 'onDefeat']) for (const [k, list] of Object.entries(L[key] || {})) eff(list, `${key} › ${k}`);
}

export function checkLevel(L) {
  const errors = [], warnings = [];
  const E = (m, where = '') => errors.push(where ? `${where} : ${m}` : m), W = (m, where = '') => warnings.push(where ? `${where} : ${m}` : m);
  const cells = cellsOf(L.hexMap);
  const places = new Map(), cast = new Map(), items = new Set(Object.keys(L.items || {})), quests = new Set(Object.keys(L.quests || {}));
  const dialogues = L.dialogues || {}, zones = new Set((L.zones || []).map(z => z.id)), waves = new Set();
  if (!L.id) E('Le niveau n\'a pas d\'identifiant');
  if (!cells.size) E('La carte est vide');

  const usedCells = new Map();
  for (const p of L.places || []) {
    const w = `Lieu « ${p.name || p.id} »`;
    if (!p.id) E('identifiant manquant', w); else if (places.has(p.id)) E(`identifiant en double (${p.id})`, w);
    places.set(p.id, p);
    if (!TERRAINS[p.terrain]) E(`terrain inconnu « ${p.terrain} »`, w);
    if (!p.cell) E('pas de case sur la carte', w);
    else { const k = p.cell.join(','); if (!cells.has(k)) E(`la case ${k} n'existe pas sur la carte`, w); if (usedCells.has(k)) E(`même case que « ${usedCells.get(k)} »`, w); usedCells.set(k, p.name || p.id); }
    if (!p.desc) W('pas de description', w);
  }
  const starts = (L.places || []).filter(p => p.start);
  if (starts.length !== 1) E(starts.length ? 'Plusieurs lieux de départ' : 'Aucun lieu de départ (cochez « Départ » sur un lieu)');
  for (const c of L.cast || []) {
    const w = `Personnage « ${c.name || c.id} »`;
    if (!c.id) E('identifiant manquant', w); else if (cast.has(c.id)) E(`identifiant en double (${c.id})`, w);
    cast.set(c.id, c); if (c.spawnOn) waves.add(c.spawnOn);
    if (!KINDS[c.kind]) E(`modèle inconnu « ${c.kind} »`, w);
    if (!TEAMS[c.team]) E(`camp inconnu « ${c.team} »`, w);
    if (!places.has(c.place)) E(`lieu « ${c.place || '?'} » inconnu`, w);
    if (['enemy', 'boss'].includes(c.team) && !(c.hp > 0)) E('ennemi sans PV', w);
    if (c.team === 'npc' && !L.talk?.[c.id]?.length && !L.idleLine?.[c.id]) W('PNJ sans dialogue ni réplique', w);
  }
  for (const [id, q] of Object.entries(L.quests || {})) if (q.target && !places.has(q.target)) E(`cible « ${q.target} » inconnue`, `Quête « ${q.title || id} »`);
  for (const z of L.zones || []) if (z.beyond && !places.has(z.beyond)) E(`lieu « ${z.beyond} » inconnu`, `Zone ${z.id}`);
  for (const [k, t] of Object.entries(L.tiles || {})) { if (!cells.has(k)) continue; if (t.terrain && !TERRAINS[t.terrain]) E(`terrain inconnu « ${t.terrain} »`, `Case ${k}`); if (t.zone && !zones.has(t.zone)) E(`zone « ${t.zone} » non déclarée`, `Case ${k}`); }

  // dialogues
  const speakers = new Set(['hero', 'narrator', ...HEROES.map(h => h.id), ...cast.keys()]);
  for (const [id, d] of Object.entries(dialogues)) {
    const nodes = d.nodes || {}, w = `Dialogue « ${id} »`;
    if (!nodes[d.start]) E(`nœud de départ « ${d.start} » introuvable`, w);
    const reached = new Set(), stack = [d.start];
    const go = (to, where) => { if (to == null || to === '') return; if (!nodes[to]) E(`va vers « ${to} » qui n'existe pas`, where); else stack.push(to); };
    for (const [nid, n] of Object.entries(nodes)) {
      const wn = `${w} › ${nid}`;
      if (!speakers.has(n.s)) E(`personnage « ${n.s} » inconnu`, wn);
      if (!n.t && !n.variants?.length) W('texte vide', wn);
      if (n.test) { if (!STATS[n.test.stat]) E(`stat « ${n.test.stat} » inconnue`, wn); go(n.test.success, wn); go(n.test.fail, wn); go(n.next, wn); }
      else if (!n.choices?.length) go(n.next, wn);
      for (const b of n.branches || []) go(b.next, wn);
      for (const c of n.choices || []) { if (c.test) { if (!STATS[c.test.stat]) E(`stat « ${c.test.stat} » inconnue`, wn); if (!DIFFICULTIES[c.test.diff || 'normal']) E('difficulté inconnue', wn); go(c.test.success, wn); go(c.test.fail, wn); } go(c.next, wn); }
    }
    // nœuds jamais atteints
    while (stack.length) { const k = stack.pop(); if (reached.has(k) || !nodes[k]) continue; reached.add(k); const n = nodes[k];
      const tos = [n.next, n.test?.success, n.test?.fail, ...(n.branches || []).map(b => b.next), ...(n.choices || []).flatMap(c => [c.next, c.test?.success, c.test?.fail])];
      for (const t of tos) if (t && nodes[t]) stack.push(t); }
    for (const nid of Object.keys(nodes)) if (!reached.has(nid)) W(`le nœud « ${nid} » n'est jamais atteint`, w);
  }
  for (const [npc, rules] of Object.entries(L.talk || {})) {
    if (!cast.has(npc)) E(`personnage « ${npc} » inconnu`, 'Parler');
    for (const r of rules) if (r.dialogue && !dialogues[r.dialogue]) E(`dialogue « ${r.dialogue} » inconnu`, `Parler à ${npc}`);
  }

  // références dans les effets et conditions
  walk(L, (kind, o, where) => {
    const def = (kind === 'effect' ? EFFECTS : CONDS)[o.type];
    if (!def) { E(`${kind === 'effect' ? 'effet' : 'condition'} inconnu(e) « ${o.type} »`, where); return; }
    for (const [k, t] of def.fields) {
      const v = o[k];
      if (t === 'item' && !items.has(v)) E(`objet « ${v || '?'} » inconnu`, where);
      if (t === 'quest' && !quests.has(v)) E(`quête « ${v || '?'} » inconnue`, where);
      if (t === 'place' && !places.has(v)) E(`lieu « ${v || '?'} » inconnu`, where);
      if (t === 'zone' && !zones.has(v)) E(`zone « ${v || '?'} » inconnue`, where);
      if (t === 'cast' && !cast.has(v)) E(`personnage « ${v || '?'} » inconnu`, where);
      if (t === 'dialogue' && !dialogues[v]) E(`dialogue « ${v || '?'} » inconnu`, where);
      if (t === 'wave' && !waves.has(v)) E(`aucune figurine n'apparaît avec la vague « ${v || '?'} »`, where);
      if (t === 'stat' && !STATS[v]) E(`stat « ${v} » inconnue`, where);
      if (t === 'statc' && !SKILL_NAMES[v]) E(`stat « ${v} » inconnue`, where);
      if (t === 'hero' && !HEROES.some(h => h.id === v)) E(`héros « ${v || '?'} » inconnu`, where);
      if (t === 'flag' && !v) E('drapeau sans nom', where);
    }
  });
  for (const key of ['onReveal', 'onEnter']) for (const k of Object.keys(L[key] || {})) if (!places.has(k)) E(`lieu « ${k} » inconnu`, key);
  for (const k of Object.keys(L.onDefeat || {})) if (!cast.has(k)) E(`personnage « ${k} » inconnu`, 'onDefeat');
  if (!L.dialogues || !Object.values(L.places || []).some(() => true)) W('Niveau sans lieu');

  // connexité de la carte
  if (starts[0]?.cell && cells.has(starts[0].cell.join(','))) {
    const seen = new Set([starts[0].cell.join(',')]), q = [starts[0].cell];
    while (q.length) { const [c, r] = q.shift(); for (const [nc, nr] of neighborsOf(c, r)) { const k = `${nc},${nr}`; if (cells.has(k) && !seen.has(k)) { seen.add(k); q.push([nc, nr]); } } }
    const lost = [...cells].filter(k => !seen.has(k));
    if (lost.length) E(`${lost.length} case(s) inaccessibles depuis le départ : ${lost.slice(0, 6).join(' ; ')}`, 'Carte');
  }
  if (!(L.intro || []).length) W('Pas d\'introduction');
  if (!walkHas(L, 'victory')) W('Aucun effet « Victoire » : le niveau ne peut pas être gagné');
  return { errors, warnings };
}
function walkHas(L, type) { let f = false; walk(L, (k, o) => { if (k === 'effect' && o.type === type) f = true; }); return f; }
