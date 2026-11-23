// Scénario de démonstration commun à tous les moteurs.
// Le moteur n'expose qu'une API d'affichage ; toute la logique "jeu" vit ici.
import { bfs } from './grid.js';
import { TERRAINS } from './terrains.js';
import { rng } from './tween.js';
import { KIND_LABEL } from './art.js';

const MOVE = 3;
const CAST = [
  { id: 'aldric', name: 'Aldric', kind: 'knight', color: '#3566b0', team: 'hero' },
  { id: 'ysolde', name: 'Ysolde', kind: 'mage', color: '#7140a8', team: 'hero' },
  { id: 'maud', name: 'Maud', kind: 'npc', color: '#7a5a3a', team: 'npc' },
  { id: 'destrier', name: 'Destrier', kind: 'horse', color: '#5a3d2a', team: 'neutral' },
];
const EXTRA = [
  { kind: 'rogue', color: '#2f6b46', team: 'hero', names: ['Sélène', 'Brune', 'Isaure'] },
  { kind: 'cleric', color: '#b08a2e', team: 'hero', names: ['Frère Odon', 'Bertrand'] },
  { kind: 'ghoul', color: '#7d8b6a', team: 'enemy', names: ['Goule'] },
  { kind: 'wolf', color: '#6d6a66', team: 'enemy', names: ['Renard'] },
];

function genMap(grid, seed = 7) {
  const R = rng(seed), ph = [R() * 6, R() * 6, R() * 6, R() * 6];
  const b = grid.bounds, span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
  const tiles = new Map();
  for (const c of grid.cells) {
    const x = (c.x / span) * 3, z = (c.z / span) * 3;
    const a = Math.sin(x * 0.9 + ph[0]) * Math.cos(z * 1.1 + ph[1]) + 0.5 * Math.sin(x * 2.1 + z * 1.7 + ph[2]);
    const n = Math.cos(x * 1.3 - ph[3]) * Math.sin(z * 0.8 + ph[0]);
    let t = a > 0.75 ? 'rock' : a < -0.7 ? 'swamp' : n > 0.25 ? 'forest' : n < -0.55 ? 'burned' : 'plains';
    tiles.set(c.key, { key: c.key, terrain: t, revealed: false, poi: null });
  }
  const byDist = (fx, fz) => [...grid.cells].sort((p, q) => Math.hypot(p.x - fx, p.z - fz) - Math.hypot(q.x - fx, q.z - fz));
  tiles.get(grid.center.key).terrain = 'village';
  const ruins = byDist(b.maxX, b.minZ)[0].key; tiles.get(ruins).terrain = 'ruins';
  byDist(b.minX, b.minZ).slice(0, 2).forEach(c => (tiles.get(c.key).terrain = 'snow'));
  // garantir une forêt adjacente au village (pour le loup) et pas de ruines voisines
  const near = grid.neighbors(grid.center.key);
  let forest = [...tiles.values()].find(t => t.terrain === 'forest' && !near.includes(t.key) && t.key !== ruins);
  if (!forest) { forest = tiles.get(byDist(b.minX, b.maxZ)[0].key); forest.terrain = 'forest'; }
  for (const t of tiles.values()) {
    const names = TERRAINS[t.terrain].names; t.name = names[Math.floor(R() * names.length)];
    if (t.terrain !== 'village' && R() < 0.22) t.poi = [{ icon: '✦', label: 'Herbes rares' }, { icon: '?', label: 'Traces étranges' }, { icon: '⚑', label: 'Campement abandonné' }, { icon: '✝', label: 'Sanctuaire oublié' }][Math.floor(R() * 4)];
  }
  tiles.get(ruins).poi = { icon: '☠', label: 'Crypte scellée' };
  return { tiles, ruins, forest: forest.key, village: grid.center.key, near };
}

export async function runScenario({ engine, ui, dialogue }) {
  const grid = engine.grid;
  const map = genMap(grid);
  const S = { selected: null, busy: false, follow: true, reach: new Map(), explore: new Set(), figs: new Map(), pending: new Map(), hp: new Map(), spawnCount: 0 };

  map.tiles.get(map.village).revealed = true;
  map.near.forEach(k => (map.tiles.get(map.village).revealed = true, map.tiles.get(k).revealed = true));
  for (const t of map.tiles.values()) engine.addTile({ ...t, label: TERRAINS[t.terrain].label });

  const place = (fig, key) => { S.figs.set(fig.id, { ...fig, tile: key }); return engine.addFigure(fig, key, { spawn: false }); };
  await place(CAST[0], map.village); await place(CAST[1], map.village); await place(CAST[2], map.village);
  await place(CAST[3], map.near[0]);
  S.pending.set(map.forest, [{ id: 'loup', name: 'Renard des cendres', kind: 'wolf', color: '#6d6a66', team: 'enemy' }]);
  S.pending.set(map.ruins, [{ id: 'goule1', name: 'Goule', kind: 'ghoul', color: '#7d8b6a', team: 'enemy' }, { id: 'goule2', name: 'Goule', kind: 'ghoul', color: '#6f7d5c', team: 'enemy' }]);

  const heroes = () => [...S.figs.values()].filter(f => f.team === 'hero');
  const refreshParty = () => { ui.setParty(heroes(), id => { select(id); engine.focusFigure(id); }); ui.setActive(S.selected); };
  refreshParty();

  // ----- Sélection & portée -----
  function computeReach() {
    S.reach.clear(); S.explore.clear();
    const f = S.figs.get(S.selected); if (!f) return;
    const { dist } = bfs(grid, f.tile, k => map.tiles.get(k).revealed, MOVE);
    for (const [k, d] of dist) {
      if (d > 0) S.reach.set(k, d);
      if (d < MOVE) for (const n of grid.neighbors(k)) if (!map.tiles.get(n).revealed) S.explore.add(n);
    }
  }
  function refreshHighlights() { computeReach(); engine.highlight([...S.reach.keys()], [...S.explore]); }
  function select(id) {
    S.selected = id; engine.setSelected(id); ui.setActive(id);
    if (id) refreshHighlights(); else engine.highlight([], []);
  }

  const pathFor = (from, to) => bfs(grid, from, k => map.tiles.get(k).revealed || k === to, MOVE + 1).pathTo(to);

  async function moveHero(id, path) {
    const f = S.figs.get(id);
    engine.highlight([], []);
    await engine.moveFigure(id, path, { follow: S.follow });
    f.tile = path[path.length - 1];
  }

  async function reveal(key, { focus = true } = {}) {
    const t = map.tiles.get(key); if (t.revealed) return;
    t.revealed = true;
    await engine.revealTile(key, { focus });
    const list = S.pending.get(key);
    if (list) {
      S.pending.delete(key);
      for (const f of list) { S.figs.set(f.id, { ...f, tile: key }); S.hp.set(f.id, 2); await engine.addFigure(f, key, { spawn: true }); }
      return list;
    }
    return null;
  }

  async function explore(key) {
    const hero = S.figs.get(S.selected);
    const adj = grid.neighbors(key).filter(n => n === hero.tile || S.reach.has(n));
    adj.sort((a, b) => (S.reach.get(a) || 0) - (S.reach.get(b) || 0));
    const from = adj[0]; if (!from) return;
    if (from !== hero.tile) await moveHero(hero.id, pathFor(hero.tile, from));
    const t = map.tiles.get(key);
    ui.toast(`<b>${t.name}</b> · ${TERRAINS[t.terrain].label}`);
    const spawned = await reveal(key);
    if (spawned?.some(f => f.team === 'enemy')) ui.toast('⚔ Embuscade ! Des ennemis surgissent.', 2600);
    else await moveHero(hero.id, [from, key]);
  }

  async function talk(npcId, force = false) {
    if (!S.selected) select(heroes()[0].id);
    const hero = S.figs.get(S.selected), npc = S.figs.get(npcId);
    if (!force && hero.tile !== npc.tile) {
      const p = pathFor(hero.tile, npc.tile);
      if (!p || p.length - 1 > MOVE) { ui.toast(`${npc.name} est trop loin.`); engine.focusFigure(npcId); return; }
      await moveHero(hero.id, p);
    }
    engine.highlight([], []); ui.vignette(true);
    const queued = [];
    await dialogue.play(maudScript(hero), {
      onSpeaker: s => engine.cinematic({ ids: [hero.id, npcId], focus: s === 'hero' ? hero.id : npcId }),
      onEvent: e => queued.push(e),
    });
    engine.endCinematic(); ui.vignette(false);
    for (const e of queued) if (e === 'revealRuins' && !map.tiles.get(map.ruins).revealed) {
      await new Promise(r => setTimeout(r, 350));
      ui.toast('Nouvelle tuile révélée : <b>' + map.tiles.get(map.ruins).name + '</b>', 2800);
      await reveal(map.ruins);
    }
  }

  async function attack(enemyId) {
    if (!S.selected) { ui.toast('Sélectionnez un héros d\'abord.'); return; }
    const hero = S.figs.get(S.selected), en = S.figs.get(enemyId);
    if (hero.tile !== en.tile && !grid.neighbors(hero.tile).includes(en.tile)) { ui.toast('Approchez-vous pour combattre.'); engine.focusFigure(enemyId); return; }
    await engine.bump(hero.id, enemyId);
    const hp = (S.hp.get(enemyId) ?? 2) - 1; S.hp.set(enemyId, hp);
    if (hp <= 0) { ui.toast(`☠ ${en.name} est vaincu.`); S.figs.delete(enemyId); await engine.removeFigure(enemyId, { animate: true }); }
    else ui.toast(`⚔ Touché ! (${en.name} : ${hp} PV) — combat placeholder`);
  }

  engine.onTap = async hit => {
    if (S.busy || dialogue.open) return;
    S.busy = true;
    try {
      if (hit.type === 'figure') {
        const f = S.figs.get(hit.id); if (!f) return;
        if (f.team === 'hero') { if (S.selected === f.id) { select(null); } else { select(f.id); engine.focusFigure(f.id, { soft: true }); } }
        else if (f.team === 'npc') await talk(f.id);
        else if (f.team === 'enemy') await attack(f.id);
        else { ui.toast(`${f.name} piaffe d'impatience.`); await engine.bump(f.id, null); }
      } else if (hit.type === 'tile' || hit.type === 'poi') {
        const t = map.tiles.get(hit.key);
        if (hit.type === 'poi' && t.poi && t.revealed && !S.reach.has(hit.key)) { ui.toast(`${t.poi.icon} ${t.poi.label}`); return; }
        const hero = S.figs.get(S.selected);
        if (hero && S.reach.has(hit.key)) await moveHero(hero.id, pathFor(hero.tile, hit.key));
        else if (hero && S.explore.has(hit.key)) await explore(hit.key);
        else { engine.focusTile(hit.key); ui.toast(t.revealed ? `<b>${t.name}</b> · ${TERRAINS[t.terrain].label}` : 'Région inexplorée'); }
      }
    } finally {
      S.busy = false;
      if (S.selected && S.figs.has(S.selected)) refreshHighlights();
    }
  };
  engine.onLongPress = key => {
    const t = map.tiles.get(key); if (!t) return;
    const who = [...S.figs.values()].filter(f => f.tile === key).map(f => f.name).join(', ');
    ui.toast(t.revealed ? `<b>${t.name}</b> (${TERRAINS[t.terrain].label})${t.poi ? ' · ' + t.poi.icon + ' ' + t.poi.label : ''}${who ? '<br>Présents : ' + who : ''}` : 'Région inexplorée', 3200);
  };
  engine.onFps = n => ui.setFps(n);

  // ----- Menu de test -----
  const revealAll = async () => {
    const c = grid.get(map.village);
    const hidden = [...map.tiles.values()].filter(t => !t.revealed).sort((a, b) => {
      const A = grid.get(a.key), B = grid.get(b.key);
      return Math.hypot(A.x - c.x, A.z - c.z) - Math.hypot(B.x - c.x, B.z - c.z);
    });
    engine.resetCamera();
    await Promise.all(hidden.map((t, i) => new Promise(r => setTimeout(() => reveal(t.key, { focus: false }).then(r), i * 70))));
    if (S.selected) refreshHighlights();
  };
  const spawnRandom = async () => {
    const R = Math.random, e = EXTRA[Math.floor(R() * EXTRA.length)];
    const tiles = [...map.tiles.values()].filter(t => t.revealed);
    const t = tiles[Math.floor(R() * tiles.length)];
    const id = `x${++S.spawnCount}`;
    const fig = { id, kind: e.kind, color: e.color, team: e.team, name: e.names[Math.floor(R() * e.names.length)] };
    S.figs.set(id, { ...fig, tile: t.key }); S.hp.set(id, 2);
    engine.focusTile(t.key);
    await engine.addFigure(fig, t.key, { spawn: true });
    ui.toast(`${KIND_LABEL[fig.kind]} ajouté(e) : ${fig.name}`);
    if (fig.team === 'hero') refreshParty();
  };
  const wander = async () => {
    const movers = [...S.figs.values()].filter(f => f.team === 'enemy' || f.team === 'neutral');
    if (!movers.length) { ui.toast('Aucun PNJ mobile révélé.'); return; }
    const f = movers[Math.floor(Math.random() * movers.length)];
    const opts = grid.neighbors(f.tile).filter(k => map.tiles.get(k).revealed);
    if (!opts.length) return;
    const to = opts[Math.floor(Math.random() * opts.length)];
    await engine.moveFigure(f.id, [f.tile, to], { follow: true }); f.tile = to;
    if (S.selected) refreshHighlights();
  };
  const narration = () => dialogue.narrate({
    title: 'Chapitre I — La Brume de Grisval',
    text: 'Depuis trois nuits, la cloche de l\'abbaye sonne sans sonneur. Les villageois barricadent leurs portes et murmurent le nom de Saint-Ombre. Vous arrivez au crépuscule, la boue jusqu\'aux chevilles, avec pour seule lumière la lanterne d\'Ysolde.',
    image: 'assets/bg/painting1.jpg',
  });

  const sections = [
    { title: 'Caméra', items: [
      { label: 'Recentrer la vue', action: () => engine.resetCamera() },
      { label: 'Centrer sur le héros', action: () => engine.focusFigure(S.selected || 'aldric') },
      { type: 'toggle', label: 'Suivre les déplacements', value: S.follow, onChange: v => (S.follow = v) },
    ] },
    { title: 'Plateau', items: [
      { label: 'Révéler toutes les tuiles', action: revealAll },
      { label: 'Ajouter une figurine', action: spawnRandom },
      { label: 'Faire bouger un PNJ', action: wander },
      { label: 'Réinitialiser', action: () => location.reload() },
    ] },
    { title: 'Narration', items: [
      { label: 'Dialogue PNJ (Maud)', primary: true, action: () => talk('maud', true) },
      { label: 'Narration plein écran', action: narration },
    ] },
    { title: 'Ambiance', items: [
      { type: 'seg', label: 'Moment', value: 'dusk', options: [{ label: 'Crépuscule', value: 'dusk' }, { label: 'Nuit', value: 'night' }], onChange: v => engine.setTimeOfDay(v) },
      { type: 'toggle', label: 'Particules', value: true, onChange: v => engine.setParticles(v) },
    ] },
    { title: 'Performance', items: [
      ...(engine.supports?.shadows ? [{ type: 'toggle', label: 'Ombres', value: true, onChange: v => engine.setShadows(v) }] : []),
      ...(engine.supports?.resolution === false ? [] : [{ type: 'seg', label: 'Résolution', value: 1, options: [{ label: '50%', value: 0.5 }, { label: '75%', value: 0.75 }, { label: '100%', value: 1 }], onChange: v => engine.setResolution(v) }]),
      { type: 'toggle', label: 'Afficher FPS', value: false, onChange: v => ui.showFps(v) },
    ] },
    ...(engine.menu || []),
  ];
  ui.buildMenu(sections);

  engine.resetCamera(true);
  if (!sessionStorage.getItem('introSeen')) {
    sessionStorage.setItem('introSeen', '1');
    setTimeout(async () => { await narration(); ui.toast('Touchez <b>Aldric</b> (en bas à gauche ou sur le plateau) pour le sélectionner.', 3500); }, 700);
  } else setTimeout(() => ui.toast('Touchez un héros pour le sélectionner.', 2500), 600);
}

function maudScript(hero) {
  return {
    start: 'm1',
    speakers: { maud: { name: 'Maud l\'herboriste', kind: 'npc', color: '#c9a45c' }, hero: { name: hero.name, kind: hero.kind, color: hero.color } },
    nodes: {
      m1: { speaker: 'maud', text: 'Ah… des voyageurs. Rares sont ceux qui traversent Grisval depuis que la brume est revenue.', next: 'h1' },
      h1: { speaker: 'hero', text: 'Nous cherchons l\'abbaye de Saint-Ombre. On dit qu\'une relique y dort encore.', next: 'm2' },
      m2: { speaker: 'maud', text: 'La relique… ou ce qui la garde. Les moines ne sont jamais vraiment partis, vous savez.', choices: [
        { text: 'Indiquez-nous le chemin.', next: 'm3', event: 'revealRuins' },
        { text: 'Que savez-vous des moines ?', next: 'm4' },
        { text: 'Nous partons. Merci, vieille femme.', next: 'm5' },
      ] },
      m3: { speaker: 'maud', text: 'Suivez la lisière vers le levant. Quand les corbeaux se taisent… vous y êtes.', next: null },
      m4: { speaker: 'maud', text: 'Ils prient encore, chaque nuit. Mais leurs voix n\'ont plus rien d\'humain.', next: 'h2' },
      h2: { speaker: 'hero', text: 'Raison de plus pour y aller avant la prochaine nuit.', next: 'm3', event: 'revealRuins' },
      m5: { speaker: 'maud', text: 'Que la Dame Grise veille sur vos pas.', next: null },
    },
  };
}
