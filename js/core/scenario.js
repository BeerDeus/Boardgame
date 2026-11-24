// Moteur de règles (application « MJ ») — coopératif, au tour par tour.
// Manche : chaque héros joue (1 déplacement + 1 action + 1 attaque) ; les Ténèbres jouent
// à la fin (ordre fixe) ou à une position aléatoire (deck d'ordre façon Aeon's End).
// Les joueurs bougent leurs vraies figurines et lancent leurs vrais dés : l'app arbitre et raconte.
import { buildMap } from './mapgen.js';
import { bfs } from './grid.js';
import { TERRAINS } from './terrains.js';
import { sfx } from './sfx.js';
import { settings, PRESETS } from './settings.js';
import { CAMPAIGN, loadCampaign, completeStep, heroProgress, pointsAvailable, applyProgress, PERKS, saveCampaign, levelOf } from './campaign.js';
import { draw as drawMonster, describeCard } from './monsters.js';

const SAVE_V = 6;
const TERRAIN_CODE = { village: 'V', forest: 'F', plains: 'P', rock: 'R', swamp: 'M', ruins: 'U', burned: 'C', snow: 'N', crypt: 'X' };
const PARTY_BONUS = { 1: 3, 2: 2, 3: 1, 4: 0 }; // glas supplémentaires selon la taille du groupe
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export async function runScenario({ engine, ui, dialogue, engineId, ready }) {
  const grid = engine.grid;
  const seed = +(new URLSearchParams(location.search).get('seed') || 1);
  const saveKey = `grimoire.save.v${SAVE_V}.${engineId}.${seed}`;
  const campaign = loadCampaign();

  // ------------------------------------------------------------------ partie sauvegardée ou nouvelle
  let S = null;
  try { const raw = JSON.parse(localStorage.getItem(saveKey)); if (raw?.v === SAVE_V && !raw.ended) S = raw; } catch {}
  const resumed = !!S;
  let st;
  if (!S) {
    ready?.();
    const def0 = (await CAMPAIGN.steps[0].load()).STORY;
    // montées de niveau en attente (entre deux étapes)
    for (const h of def0.heroes) {
      const p = heroProgress(campaign, h.id);
      while (pointsAvailable(p) > 0) {
        const cur = applyProgress(h, p);
        const pick = await ui.levelUp({ hero: cur, skills: Object.keys(def0.skillNames).map(k => ({ id: k, name: def0.skillNames[k], value: cur.skills[k] })), perks: (PERKS[h.kind] || []).filter(x => !p.perks.includes(x.id)) });
        if (pick.skill) p.skills[pick.skill] = (p.skills[pick.skill] || 0) + 5; else p.perks.push(pick.perk);
        p.spent++; saveCampaign(campaign);
      }
    }
    const pick = await ui.partySelect({ steps: CAMPAIGN.steps, completed: campaign.completed, heroes: def0.heroes, glasBase: def0.glasBase, partyBonus: PARTY_BONUS, progress: Object.fromEntries(def0.heroes.map(h => [h.id, { level: levelOf(heroProgress(campaign, h.id).xp) }])) });
    st = (await CAMPAIGN.steps.find(s => s.id === pick.step).load()).STORY;
    const n = pick.party.length;
    S = { v: SAVE_V, step: pick.step, party: pick.party, difficulty: pick.difficulty, turnMode: pick.turnMode,
      glasMax: st.glasBase[pick.difficulty] + PARTY_BONUS[n], glas: 0, round: 0, order: [], turn: 0,
      used: { move: false, action: false, attack: false }, revealed: [], figs: {}, boost: {}, flags: {}, inv: {}, quests: {}, seen: {}, done: [],
      counters: {}, unlocked: [], mounted: false, tod: 'dusk', ended: false, ko: [], memoryOut: {}, stats: { kills: 0, dice: 0, ko: 0, boosts: 0, t0: Date.now() }, hstats: {} };
  } else st = (await CAMPAIGN.steps.find(s => s.id === S.step).load()).STORY;
  // fiches de héros = base du scénario + progression de campagne (niveaux, avantages)
  st = { ...st, heroes: st.heroes.map(h => applyProgress(h, campaign.heroes?.[h.id])) };

  const map = buildMap(grid, st, seed);
  const tileOf = k => map.tiles.get(k);
  const placeOf = k => tileOf(k)?.place;
  const placeDef = id => st.places.find(p => p.id === id);
  /** Site d'une case : lieu du scénario, ou rencontre mineure (activités propres à la case) */
  const siteOf = k => {
    const t = tileOf(k); if (!t) return null;
    if (t.place) return placeDef(t.place);
    if (t.minor) { const m = st.minors.find(x => x.id === t.minor); return m && { ...m, minor: true, activities: m.activities.map(a => ({ ...a, id: `${a.id}@${k}` })) }; }
    return null;
  };
  const def = id => st.heroes.find(h => h.id === id) || st.cast.find(c => c.id === id);
  const nParty = S.party.length;
  const scaledHp = c => Math.max(1, (c.hp || 1) + (nParty >= 3 ? 1 : 0) - (nParty === 1 ? 1 : 0));
  const inParty = c => !c.minParty || nParty >= c.minParty;
  // numéros des tuiles physiques (lettre du terrain + numéro) et des figurines de monstres
  { const cnt = {}; for (const c of grid.cells) { const t = map.tiles.get(c.key), L = TERRAIN_CODE[t.terrain] || 'T'; cnt[L] = (cnt[L] || 0) + 1; t.code = `${L}-${String(cnt[L]).padStart(2, '0')}`; } }
  const figNo = {}; { const cnt = {}; for (const c of st.cast) if (['enemy', 'boss'].includes(c.team) && c.team !== 'boss') { cnt[c.name] = (cnt[c.name] || 0) + 1; figNo[c.id] = cnt[c.name]; } }
  const dispName = id => { const d = def(id); return figNo[id] ? `${d.name} ${figNo[id]}` : d.name; };
  const figData = id => { const d = def(id); return { id, name: dispName(id), kind: d.kind, color: d.color, base: d.base || d.color, team: d.team || 'hero', idle: d.idle }; };

  // ------------------------------------------------------------------ visibilité (brouillard total)
  const locked = k => {
    const t = tileOf(k); if (!t) return true;
    if (t.zone && !S.unlocked.includes(t.zone)) return true;
    const pd = t.place && placeDef(t.place);
    return !!(pd?.hiddenUntil && !S.flags[pd.hiddenUntil]);
  };
  if (!resumed) {
    S.revealed = [map.start, ...grid.neighbors(map.start).filter(k => !locked(k))];
    for (const id of S.party) { S.figs[id] = { tile: map.start, hp: def(id).hp, alive: true }; S.boost[id] = Math.min(boostMaxOf(id), st.boost.start + (def(id).boostStart || 0)); }
    for (const [k, n] of Object.entries(campaign.stash || {})) if (n > 0) S.inv[k] = n; // objets conservés de la campagne
    for (const c of st.cast) if (!c.hidden && !c.spawnOn && inParty(c)) S.figs[c.id] = { tile: map.placeKey[c.place], hp: scaledHp(c), alive: true };
  }
  S.hstats ||= {}; S.decks ||= {};
  const revealed = new Set(S.revealed);
  const save = () => { S.revealed = [...revealed]; try { localStorage.setItem(saveKey, JSON.stringify(S)); } catch {} };
  const R = { reach: new Map(), busy: false, marks: new Set(), setupTiles: [], setupFigs: [] };

  // ------------------------------------------------------------------ plateau
  const poiFor = t => { if (!t.poi || !t.place) return null; const acts = placeDef(t.place).activities || []; return acts.some(a => !(a.once && S.done.includes(a.id))) ? t.poi : null; };
  for (const t of map.tiles.values()) engine.addTile({ ...t, label: TERRAINS[t.terrain].label, revealed: revealed.has(t.key), poi: poiFor(t) });
  engine.resetCamera(true);
  if (resumed) ready?.();
  for (const [id, f] of Object.entries(S.figs)) if (f.alive) await engine.addFigure(figData(id), f.tile, { spawn: false });
  if (S.tod === 'night') engine.setTimeOfDay('night');
  engine.applySettings?.(settings.gfx); engine.setFinish?.(settings.finish);

  const party = () => S.party.map(def);
  const heroes = () => party().filter(h => S.figs[h.id]?.alive);
  const active = () => S.order[S.turn];
  const activeDef = () => def(active()) || party()[0];
  const enemies = () => Object.entries(S.figs).filter(([id, f]) => f.alive && ['enemy', 'boss'].includes(def(id).team)).map(([id, f]) => ({ id, ...f }));
  const enemiesOn = k => enemies().filter(e => e.tile === k);
  const moveOf = id => def(id).move + (id === 'aldric' && S.mounted ? 2 : 0);
  function boostMaxOf(id) { return st.boost.max + (def(id)?.boostMax || 0); }
  const hstat = (id, k, n = 1) => { S.hstats[id] ||= {}; S.hstats[id][k] = (S.hstats[id][k] || 0) + n; };

  // ------------------------------------------------------------------ HUD
  function refreshHUD() {
    const a = active(), ad = activeDef();
    ui.setParty(party().map(h => ({ ...h, hp: S.figs[h.id].hp, max: h.hp, ko: !S.figs[h.id].alive, mounted: h.id === 'aldric' && S.mounted, turn: h.id === a, boost: S.boost[h.id], boostMax: boostMaxOf(h.id) })), id => { engine.focusFigure(id); if (id !== a) ui.toast(`${def(id).name} attend son tour.`); });
    ui.setActive(a);
    ui.setTurnHUD({ round: S.round, hero: ad, used: S.used, glas: S.glas, glasMax: S.glasMax, night: S.tod === 'night', boost: S.boost[ad.id] ?? 0, boostMax: boostMaxOf(ad.id),
      order: S.order.map((o, i) => (o === 'dark' ? { dark: true, done: i < S.turn } : { name: def(o).name, color: def(o).color, active: i === S.turn, done: i < S.turn })) });
    ui.setInventory(Object.entries(S.inv).filter(([, n]) => n > 0).map(([k, n]) => ({ id: k, n, ...st.items[k] })), useItem);
    ui.setJournal(Object.entries(S.quests).map(([id, s]) => ({ id, ...st.quests[id], done: s === 'done' })), `${st.title.split('—').pop().trim()} · glas ${S.glas}/${S.glasMax}`);
    refreshMarks(); refreshActions();
  }
  function refreshMarks() {
    const want = new Set(Object.entries(S.quests).filter(([, s]) => s === 'active').map(([id]) => map.placeKey[st.quests[id].target]).filter(k => k && revealed.has(k)));
    for (const k of R.marks) if (!want.has(k)) engine.mark?.(k, false);
    for (const k of want) if (!R.marks.has(k)) engine.mark?.(k, true);
    R.marks = want;
  }
  function placeActivities(key) {
    const pd = siteOf(key); if (!pd?.activities) return [];
    return pd.activities.filter(a => !(a.once && S.done.includes(a.id))).map(a => {
      let disabled = null;
      if (a.cond && !a.cond(g)) disabled = `Requiert : ${a.need || '?'}`;
      else if (a.blockedByEnemies && enemiesOn(key).length) disabled = 'Des ennemis bloquent l\'accès';
      return { ...a, disabled };
    });
  }
  function refreshActions() {
    const id = active(), f = S.figs[id];
    if (!f?.alive || S.ended) { ui.setActions([]); return; }
    const acts = [];
    if (placeActivities(f.tile).length) acts.push({ icon: 'place', label: 'Lieu', disabled: S.used.action, action: () => act(() => interactPlace()) });
    if (id === 'ysolde') acts.push({ icon: 'glow', label: 'Lueur', disabled: S.used.action, action: () => act(() => glow(id)) });
    if (id === 'aldric' && S.figs.destrier?.alive && S.figs.destrier.tile === f.tile) acts.push({ icon: 'horse', label: S.mounted ? 'Pied à terre' : 'En selle', action: () => act(() => toggleMount()) });
    acts.push({ icon: 'end', label: 'Fin du tour', primary: true, pulse: S.used.move && S.used.action && S.used.attack, action: () => act(() => endTurn()) });
    ui.setActions(acts);
  }

  // ------------------------------------------------------------------ API exposée aux scénarios
  const g = {
    flag: k => !!S.flags[k], set: (k, v = true) => { S.flags[k] = v; },
    has: k => (S.inv[k] || 0) > 0,
    give(k, n = 1) { S.inv[k] = (S.inv[k] || 0) + n; ui.toast(`Obtenu : <b>${st.items[k].name}</b>${n > 1 ? ' ×' + n : ''}`, 2600); sfx.success(); refreshHUD(); },
    take(k) { S.inv[k] = Math.max(0, (S.inv[k] || 0) - 1); refreshHUD(); },
    questActive: id => S.quests[id] === 'active',
    questStart(id) { if (S.quests[id]) return; S.quests[id] = 'active'; ui.toast(`Nouvel objectif : <b>${st.quests[id].title}</b>`, 2800); sfx.ui(); refreshHUD(); },
    questDone(id) { if (S.quests[id] === 'done') return; S.quests[id] = 'done'; ui.toast(`✓ <b>${st.quests[id].title}</b>`, 2400); sfx.success(); refreshHUD(); },
    toast: (m, ms) => ui.toast(m, ms),
    narrate: o => dialogue.narrate(o),
    bell() { sfx.bell(); engine.shake?.(0.03); },
    night() { if (S.tod === 'night') return; S.tod = 'night'; engine.setTimeOfDay('night'); refreshHUD(); },
    enemiesAt: place => enemiesOn(map.placeKey[place]).length > 0,
    alive: id => !!S.figs[id]?.alive,
    inc: k => (S.counters[k] = (S.counters[k] || 0) + 1),
    /** Boosts : n>0 gain, n<0 perte. who = 'active' | 'all' | 'here' | id */
    boost(n, who = 'active') {
      const a = active(), ids = who === 'all' ? heroes().map(h => h.id) : who === 'here' ? heroes().filter(h => S.figs[h.id].tile === S.figs[a].tile).map(h => h.id) : [who === 'active' ? a : who];
      for (const id of ids) {
        const before = S.boost[id] ?? 0; S.boost[id] = Math.max(0, Math.min(boostMaxOf(id), before + n));
        if (S.boost[id] !== before) ui.floatText(engine.screenPos(id), `${n > 0 ? '+' : ''}${S.boost[id] - before} ✦`, n > 0 ? '#ffd36a' : '#ff7a6a');
      }
      if (n > 0) sfx.magic(); refreshHUD();
    },
    async test(skill, label, mod = 0) {
      const h = activeDef(), base = h.skills[skill] ?? 30, chance = Math.max(5, Math.min(95, base + mod));
      S.stats.dice++;
      const r = await ui.rollD100({ chance, label: `${h.name} — ${label}`, detail: `${st.skillNames[skill]} ${base} %${mod ? ` ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}` : ''}`, color: h.color, boosts: S.boost[h.id] || 0 });
      spendBoost(h.id, r.spent);
      return r.ok;
    },
    glas(n) {
      S.glas = Math.min(S.glasMax, Math.max(0, S.glas + n)); ui.setGlas?.(S.glas, S.glasMax, n);
      if (n > 0) g.bell();
      refreshHUD();
    },
    revealPlace: async id => { await reveal(map.placeKey[id]); await flushSetup(); },
    async unlockZone(id) {
      if (S.unlocked.includes(id)) return; S.unlocked.push(id);
      const ks = new Set(); for (const k of revealed) for (const n of grid.neighbors(k)) if (!revealed.has(n) && tileOf(n).zone === id && !locked(n)) ks.add(n);
      await Promise.all([...ks].map((k, i) => sleep(i * 140).then(() => reveal(k, { focus: i === 0 }))));
      await flushSetup();
    },
    async spawn(id) { await spawn(id); await flushSetup(); },
    async spawnWave(tag) { for (const c of st.cast) if (c.spawnOn === tag && inParty(c)) await spawn(c.id); await flushSetup(); },
    /** Soins : who = 'active' | 'here' | 'all' */
    heal(n, who = 'active') {
      const a = active(), ids = who === 'all' ? heroes().map(h => h.id) : who === 'here' ? heroes().filter(h => S.figs[h.id].tile === S.figs[a].tile).map(h => h.id) : [a];
      for (const id of ids) { const f = S.figs[id], mx = def(id).hp, b = f.hp; f.hp = Math.min(mx, f.hp + n); if (f.hp > b) ui.floatText(engine.screenPos(id), `+${f.hp - b} PV`, '#8fe07a'); }
      refreshHUD();
    },
    async revealNearestPlace() {
      const from = grid.get(S.figs[active()].tile);
      const cand = st.places.map(p => map.placeKey[p.id]).filter(k => k && !revealed.has(k) && !locked(k)).sort((a, b) => { const A = grid.get(a), B = grid.get(b); return Math.hypot(A.x - from.x, A.z - from.z) - Math.hypot(B.x - from.x, B.z - from.z); });
      if (!cand.length) { ui.toast('Les traces ne mènent nulle part de nouveau.'); return; }
      ui.toast(`Les traces mènent à <b>${tileOf(cand[0]).name}</b>.`); await reveal(cand[0]); await flushSetup();
    },
    async restHere() {
      const k = S.figs[active()].tile;
      for (const h of heroes()) if (S.figs[h.id].tile === k) { S.figs[h.id].hp = h.hp; ui.floatText(engine.screenPos(h.id), 'PV max', '#8fe07a'); }
      g.boost(1, 'here'); sfx.success(); refreshHUD();
    },
    dialogue: (id, npc) => talkScript(id, npc),
    remember: (k, v = true) => { S.memoryOut[k] = v; },
    /** Réputation (cachée aux joueurs) : g.rep('gaspard', +1) ; g.repOf('gaspard') */
    rep: (npc, d) => { S.memoryOut['rep.' + npc] = (S.memoryOut['rep.' + npc] || 0) + d; },
    repOf: npc => (campaign.memory['rep.' + npc] || 0) + (S.memoryOut['rep.' + npc] || 0),
    memory: k => campaign.memory[k],
    async victory() { await finish(true); },
  };
  for (const [name, fn] of Object.entries(st.helpers || {})) g[name] = (...a) => fn(g, ...a);
  function spendBoost(id, n) { if (!n) return; S.boost[id] = Math.max(0, (S.boost[id] || 0) - n); S.stats.boosts += n; refreshHUD(); }

  // ------------------------------------------------------------------ manches & tours
  async function startRound() {
    S.round++;
    for (const id of S.ko) { const f = S.figs[id]; Object.assign(f, { alive: true, hp: def(id).hp, tile: map.start }); await engine.addFigure(figData(id), map.start, { spawn: true }); ui.toast(`${def(id).name} revient au hameau.`); }
    S.ko = [];
    if (S.round > 1) for (const h of heroes()) S.boost[h.id] = Math.min(boostMaxOf(h.id), (S.boost[h.id] || 0) + st.boost.perRound);
    const ids = heroes().map(h => h.id);
    if (S.turnMode === 'deck') { S.order = shuffle([...ids, 'dark']); } else S.order = [...ids, 'dark'];
    S.turn = 0;
    await ui.turnBanner({ title: `Manche ${S.round}`, subtitle: `Glas ${S.glas} / ${S.glasMax}${S.round > 1 ? ` · +${st.boost.perRound} boost par héros` : ''}${S.turnMode === 'deck' ? ' · ordre tiré au sort' : ''}`, color: '#c9a45c' });
    await nextTurn();
  }
  async function nextTurn() {
    while (S.turn < S.order.length) {
      const o = S.order[S.turn];
      if (o === 'dark') { await darkPhase(); if (S.ended) return; S.turn++; continue; }
      if (S.figs[o]?.alive) return startHeroTurn(o);
      S.turn++;
    }
    return startRound();
  }
  async function startHeroTurn(id) {
    S.used = { move: false, action: false, attack: false }; save();
    const h = def(id);
    engine.setRingColor?.(parseInt(h.color.slice(1), 16));
    select(id); engine.focusFigure(id);
    await ui.turnBanner({ title: `Au tour de ${h.name}`, subtitle: `${h.role} · déplacement ${moveOf(id)} · action · attaque`, color: h.color, kind: h.kind });
    refreshHUD();
  }
  async function endTurn() { engine.highlight([], []); S.turn++; await nextTurn(); return false; }
  async function darkPhase() {
    engine.setSelected(null); engine.highlight([], []); refreshHUD();
    await ui.turnBanner({ title: 'Les Ténèbres', subtitle: 'Les ennemis agissent · la cloche sonne', color: '#8a1c1c', dark: true });
    S.decks ||= {};
    const kinds = [...new Set(enemies().map(e => def(e.id).kind))];
    for (const kind of kinds) {
      const group = enemies().filter(e => def(e.id).kind === kind); if (!group.length) continue;
      const card = drawMonster(S.decks, kind), d0 = def(group[0].id);
      engine.focusFigure(group[0].id, { soft: true });
      await ui.monsterCard({ title: `${d0.name}${group.length > 1 ? ` ×${group.length}` : ''}`, card: card.name, desc: describeCard(card) });
      for (const en of group) { if (S.ended) return; await enemyAct(en.id, card); }
    }
    if (S.ended) return;
    const before = S.glas, extra = st.bossExtraGlas && S.figs[st.bossExtraGlas]?.alive ? 1 : 0;
    g.glas(1 + extra);
    ui.toast(`La cloche sonne : <b>glas ${S.glas}/${S.glasMax}</b>`, 2400);
    await sleep(800);
    for (let n = before + 1; n <= S.glas; n++) if (st.glasEvents?.[n]) await st.glasEvents[n](g);
    if (S.glasMax - S.glas === 2) ui.toast('⚠ Plus que <b>2 glas</b> !', 3000);
    if (S.glas >= S.glasMax) return finish(false);
    save();
  }

  // ------------------------------------------------------------------ portée & déplacement
  function computeReach() {
    R.reach.clear();
    const id = active(), f = S.figs[id]; if (!f?.alive || S.used.move) return;
    const { dist } = bfs(grid, f.tile, k => revealed.has(k), moveOf(id));
    for (const [k, d] of dist) if (d > 0) R.reach.set(k, d);
  }
  function select(id) { engine.setSelected(id); computeReach(); engine.highlight([...R.reach.keys()], []); }
  const pathFor = (from, to, max = 12) => bfs(grid, from, k => revealed.has(k), max).pathTo(to);

  async function revealAround(k) {
    const ks = grid.neighbors(k).filter(n => !revealed.has(n) && !locked(n));
    await Promise.all(ks.map((n, i) => sleep(i * 110).then(() => reveal(n, { focus: false }))));
  }
  async function reveal(key, { focus = true } = {}) {
    if (revealed.has(key)) return;
    revealed.add(key); sfx.reveal();
    R.setupTiles.push(key);
    await engine.revealTile(key, { focus });
    const pl = placeOf(key);
    if (pl) for (const c of st.cast) if (c.place === pl && c.hidden && !S.figs[c.id] && inParty(c)) await spawn(c.id);
    if (pl && st.onReveal?.[pl]) await st.onReveal[pl](g);
    save();
  }
  async function spawn(id) {
    const c = def(id), key = map.placeKey[c.place]; if (S.figs[id] || !inParty(c)) return;
    S.figs[id] = { tile: key, hp: scaledHp(c), alive: true };
    if (!revealed.has(key)) await reveal(key, { focus: false });
    R.setupFigs.push(id);
    await engine.addFigure(figData(id), key, { spawn: true });
  }
  /** Consignes de mise en place pour la table physique, regroupées par moment */
  async function flushSetup() {
    const tiles = R.setupTiles.splice(0), figs = R.setupFigs.splice(0);
    if (!settings.setup || S.ended) return;
    if (tiles.length) {
      engine.highlight([], tiles); engine.focusTile(tiles[0]);
      const heroTiles = new Set(heroes().map(h => S.figs[h.id].tile)), isNew = new Set(tiles);
      const mapView = { type: grid.type, cells: [...revealed].map(k => { const c = grid.get(k), t = tileOf(k), pd = t.place && placeDef(t.place);
        return { x: c.x, z: c.z, w: grid.w, h: grid.h, code: t.code, color: TERRAINS[t.terrain].tint, isNew: isNew.has(k), hero: heroTiles.has(k), place: pd ? pd.name.split(' ').slice(-1)[0] : '' }; }) };
      await ui.setupPrompt({ title: tiles.length > 1 ? `Placez ${tiles.length} tuiles` : 'Placez la tuile', mapView, note: 'Posez chaque tuile en surbrillance contre les tuiles déjà sur la table, comme sur le plan (et sur le plateau à l\'écran).',
        items: tiles.map(k => { const t = tileOf(k), pd = siteOf(k); return { icon: pd ? (pd.poi?.icon || pd.icon || 'place') : 'map', code: t.code, title: pd ? pd.name : TERRAINS[t.terrain].label, sub: pd ? (pd.minor ? `${TERRAINS[t.terrain].label} — posez un jeton d'intérêt (rencontre)` : 'Lieu — posez aussi un jeton d\'intérêt dessus') : 'Tuile de terrain' }; }) });
    }
    if (figs.length) {
      engine.focusFigure(figs[0], { soft: true });
      await ui.setupPrompt({ title: 'Placez les figurines', items: figs.map(id => { const d = def(id); return { portrait: { kind: d.kind, color: d.color }, title: dispName(id), sub: `${d.team === 'npc' ? 'PNJ' : d.team === 'boss' ? 'Boss' : d.team === 'enemy' ? `Monstre · ${S.figs[id]?.hp} PV` : d.role || ''} — sur ${tileOf(S.figs[id].tile).code}`, code: d.team === 'enemy' ? `n°${figNo[id] || 1}` : '' }; }) });
    }
    if (tiles.length && active()) select(active());
  }
  /** Déplacement case par case : chaque pas révèle les cases voisines ; traverser une case ennemie = embuscade */
  async function moveHero(id, path) {
    if (!path || path.length < 2) return;
    engine.highlight([], []);
    const f = S.figs[id], last = path.length - 1;
    const ride = id === 'aldric' && S.mounted && S.figs.destrier?.alive;
    for (let i = 1; i <= last; i++) {
      await Promise.all([engine.moveFigure(id, [path[i - 1], path[i]], { follow: true }), ride ? engine.moveFigure('destrier', [path[i - 1], path[i]], { follow: false }) : null]);
      f.tile = path[i]; if (ride) S.figs.destrier.tile = path[i];
      sfx.step();
      await revealAround(path[i]); await flushSetup();
      if (i < last && enemiesOn(path[i]).length) { await ambush(id, path[i]); if (!f.alive) return; }
    }
    const pd = siteOf(f.tile), seenK = 'seen_' + (pd?.minor ? f.tile : pd?.id);
    if (pd?.desc && !S.flags[seenK]) { S.flags[seenK] = 1; ui.toast(`<b>${pd.name}</b> — ${pd.desc}${placeActivities(f.tile).length ? '<br><small>Touchez la case ou « Lieu » pour interagir.</small>' : ''}`, 4500); }
    if (pd && !pd.minor && st.onEnter?.[pd.id]) await st.onEnter[pd.id](g, id);
  }
  async function ambush(heroId, k) {
    const foes = enemiesOn(k).map(e => def(e.id)).sort((a, b) => b.atk - a.atk), e = foes[0];
    ui.toast(`<b>Embuscade !</b> ${e.name} frappe au passage.`, 2200);
    if (heroId === 'selene') {
      if (await g.test('discretion', 'Esquiver l\'embuscade')) { ui.floatText(engine.screenPos(heroId), 'Esquive', '#8fe07a'); return; }
    }
    await enemyStrike(enemiesOn(k).find(x => def(x.id) === e).id, heroId, true);
  }

  // ------------------------------------------------------------------ actions
  async function interactPlace() {
    if (S.used.action) { ui.toast('Action déjà utilisée ce tour.'); return; }
    const k = S.figs[active()].tile, pd = siteOf(k);
    const n = await ui.locationPanel({
      title: pd.name, desc: pd.desc, hero: activeDef(),
      list: () => placeActivities(k),
      run: async a => { await a.run(g); if (a.once) { S.done.push(a.id); if (!poiFor(tileOf(k))) engine.setPoi?.(k, null); } save(); },
    });
    if (n > 0) S.used.action = true;
  }
  async function glow(id) {
    const k = S.figs[id].tile, here = heroes().filter(h => S.figs[h.id].tile === k);
    sfx.magic(); engine.animate?.(id, 'cast');
    for (const h of here) { const f = S.figs[h.id]; const before = f.hp; f.hp = Math.min(h.hp, f.hp + 2); if (f.hp > before) ui.floatText(engine.screenPos(h.id), `+${f.hp - before}`, '#8fe07a'); }
    S.used.action = true; refreshHUD();
  }
  async function toggleMount() {
    S.mounted = !S.mounted;
    ui.toast(S.mounted ? `Aldric monte en selle : <b>déplacement ${moveOf('aldric')}</b>.` : 'Aldric met pied à terre.');
    await engine.bump('destrier', null);
  }
  function useItem(item) {
    const it = st.items[item];
    if (item !== 'herbes') { ui.toast(`<b>${it.name}</b> — ${it.desc}`, 3200); return; }
    const id = active(), f = S.figs[id], h = def(id);
    if (!f?.alive || f.hp >= h.hp) { ui.toast(`${h.name} n'a pas besoin de soins.`); return; }
    g.take('herbes'); f.hp = Math.min(h.hp, f.hp + 3); ui.floatText(engine.screenPos(id), '+3', '#8fe07a'); sfx.magic(); refreshHUD(); save();
  }

  // ------------------------------------------------------------------ combat (provisoire : un jet D100)
  const distTo = (from, to, max) => bfs(grid, from, k => revealed.has(k), max).dist.get(to);
  async function attack(heroId, enemyId) {
    const h = def(heroId), e = def(enemyId), ef = S.figs[enemyId];
    S.stats.dice++;
    const chance = Math.max(5, Math.min(95, h.skills.combat - e.def));
    const r = await ui.rollD100({ chance, label: `${h.name} attaque ${dispName(enemyId)}`, detail: `${h.combatName} ${h.skills.combat} % − défense ${e.def} %`, color: h.color, boosts: S.boost[heroId] || 0 });
    spendBoost(heroId, r.spent);
    if (h.range > 1 && S.figs[heroId].tile !== ef.tile) { sfx.magic(); engine.animate?.(heroId, 'cast'); await sleep(500); } else await engine.bump(heroId, enemyId);
    S.used.attack = true;
    if (!r.ok) { ui.floatText(engine.screenPos(enemyId), 'Raté', '#cfc6b0'); return; }
    let dmg = h.dmg * (r.crit ? 2 : 1); if (e.undead && g.has('eau')) dmg++;
    sfx.hit(); ef.hp -= dmg; ui.floatText(engine.screenPos(enemyId), `-${dmg}${r.crit ? ' !' : ''}`, '#ff6a4a');
    if (r.crit) hstat(heroId, 'crits');
    if (ef.hp <= 0) { ef.alive = false; S.stats.kills++; hstat(heroId, 'kills'); await engine.removeFigure(enemyId, { animate: true }); await st.onDefeat?.[enemyId]?.(g); }
  }
  async function enemyAct(eid, card = {}) {
    const ef = S.figs[eid], ed = def(eid); if (!ef.alive || card.skip) return;
    if (card.heal) { const mx = scaledHp(ed); if (ef.hp < mx) { ef.hp = Math.min(mx, ef.hp + card.heal); ui.floatText(engine.screenPos(eid), `+${card.heal}`, '#8fe07a'); } }
    if (card.glas) g.glas(card.glas);
    const steps = ed.static ? 0 : Math.max(0, 1 + (card.move || 0));
    const { dist, pathTo } = bfs(grid, ef.tile, k => revealed.has(k), 3 + steps);
    let best = null;
    for (const h of heroes()) { const d = dist.get(S.figs[h.id].tile); if (d != null && (!best || d < best.d)) best = { id: h.id, d }; }
    if (!best || best.d > 2 + steps) return;
    if (best.d > 0 && steps) {
      const p = pathTo(S.figs[best.id].tile), n = Math.min(steps, best.d), to = p[n];
      await engine.moveFigure(eid, p.slice(0, n + 1), { follow: false }); ef.tile = to; best.d -= n;
    }
    if (best.d === 0) { await enemyStrike(eid, best.id, false, card.atk || 0); if (card.double && S.figs[best.id]?.alive && ef.alive) await enemyStrike(eid, best.id, false, card.atk || 0); }
  }
  async function enemyStrike(eid, hid, ambushHit = false, bonus = 0) {
    const ed = def(eid), h = def(hid), hf = S.figs[hid];
    engine.focusFigure(hid, { soft: true });
    S.stats.dice++;
    const chance = Math.max(5, Math.min(95, ed.atk - h.armor + (ambushHit ? 10 : 0) + bonus));
    const { ok } = await ui.rollD100({ chance, label: `${dispName(eid)} attaque ${h.name}${ambushHit ? ' (embuscade)' : ''}`, detail: `Attaque ${ed.atk} % − armure ${h.armor} %${ambushHit ? ' + 10 embuscade' : ''} · lancez pour l'ennemi`, color: '#8a1c1c', enemy: true });
    await engine.bump(eid, hid);
    if (!ok) { ui.floatText(engine.screenPos(hid), 'Paré', '#cfc6b0'); return; }
    sfx.hit(); hf.hp -= 1; ui.floatText(engine.screenPos(hid), '-1', '#ff6a4a'); refreshHUD();
    if (hf.hp <= 0) {
      hf.alive = false; S.stats.ko++; S.ko.push(hid);
      if (hid === 'aldric') S.mounted = false;
      await engine.removeFigure(hid, { animate: true });
      ui.toast(`${h.name} tombe ! Retour au hameau à la prochaine manche. <b>+1 glas</b>`, 3200);
      g.glas(1);
      if (!heroes().length) await finish(false);
    }
  }

  // ------------------------------------------------------------------ dialogues
  async function talkScript(dlgId, npcId) {
    const heroId = active(), hero = def(heroId);
    engine.highlight([], []); ui.vignette(true);
    engine.animate?.(heroId, 'talk');
    await dialogue.play(st.dialogues[dlgId], {
      g, dlgId,
      speaker: s => { const d = s === 'hero' ? hero : def(s); return { name: d.name, kind: d.kind, color: d.color }; },
      onSpeaker: s => engine.cinematic({ ids: [heroId, npcId], focus: s === 'hero' ? heroId : npcId }),
      isSeen: k => !!S.seen[k], markSeen: k => { S.seen[k] = 1; },
    });
    engine.endCinematic(); ui.vignette(false);
    await st.afterTalk?.[dlgId]?.(g);
  }
  async function talk(npcId) {
    const hid = active(), hf = S.figs[hid], nf = S.figs[npcId], n = def(npcId);
    const id = st.talk[npcId]?.(g);
    if (!id) { ui.toast(st.idleLine?.[npcId]?.(g) || `${n.name} n'a rien à dire.`); return; }
    if (S.used.action) { ui.toast('Action déjà utilisée ce tour.'); return; }
    const same = hf.tile === nf.tile;
    const p = same ? null : pathFor(hf.tile, nf.tile, moveOf(hid));
    const canGo = !same && !S.used.move && p && p.length - 1 <= moveOf(hid);
    if (!same && !canGo) { ui.toast(`${n.name} est trop loin (${S.used.move ? 'déplacement déjà utilisé' : 'hors de portée'}).`); engine.focusFigure(npcId, { soft: true }); return; }
    const ok = await ui.confirm({ title: `Parler à ${n.name} ?`, text: `${n.role || ''}${same ? '' : '<br><b>Se déplacer jusqu\'à lui/elle</b> (utilise le déplacement)'}<br><small>Utilise l'action du tour.</small>`, portrait: { kind: n.kind, color: n.color }, ok: 'Parler', cancel: 'Annuler' });
    if (!ok) return;
    if (!same) { await moveHero(hid, p); S.used.move = true; if (!S.figs[hid].alive) return; }
    S.used.action = true;
    await talkScript(id, npcId);
  }

  // ------------------------------------------------------------------ entrées
  async function act(fn) {
    if (R.busy || dialogue.open || S.ended) return;
    R.busy = true; ui.setBusy(true);
    let changedTurn = false;
    try { changedTurn = (await fn()) === false; await flushSetup(); }
    catch (e) { console.error(e); }
    finally {
      R.busy = false; ui.setBusy(false); save();
      if (!S.ended && !changedTurn && S.figs[active()]?.alive) select(active());
      refreshHUD();
    }
  }
  engine.onTap = hit => {
    if (R.busy || dialogue.open || S.ended) return;
    const a = active(), af = S.figs[a]; if (!af) return;
    if (hit.type === 'figure') {
      const id = hit.id, tm = def(id)?.team; if (!S.figs[id]?.alive) return;
      if (tm === 'hero' || !tm) { engine.focusFigure(id, { soft: true }); if (id !== a) ui.toast(`C'est au tour de <b>${def(a).name}</b>.`); return; }
      if (tm === 'npc') return act(() => talk(id));
      if (tm === 'enemy' || tm === 'boss') {
        if (S.used.attack) { ui.toast('Attaque déjà utilisée ce tour.'); return; }
        const h = def(a), d = distTo(af.tile, S.figs[id].tile, h.range);
        if (d == null) { ui.toast(`Hors de portée (portée ${h.range === 1 ? 'même case ou voisine' : h.range + ' cases'}).`); engine.focusFigure(id, { soft: true }); return; }
        return act(async () => {
          const e = def(id), chance = Math.max(5, Math.min(95, h.skills.combat - e.def));
          const ok = await ui.confirm({ title: `Attaquer ${e.name} ?`, text: `PV ${S.figs[id].hp} · chance de toucher <b>${chance} %</b> (+10 par boost)<br><small>Utilise l'attaque du tour.</small>`, portrait: { kind: e.kind, color: e.color }, ok: 'Attaquer', cancel: 'Annuler', danger: true });
          if (ok) await attack(a, id);
        });
      }
      if (tm === 'mount') { if (a === 'aldric' && af.tile === S.figs.destrier.tile) return act(() => toggleMount()); ui.toast('Le destrier n\'obéit qu\'à Aldric.'); return; }
    }
    if (hit.type === 'poi' || hit.type === 'tile') {
      const k = hit.key, t = tileOf(k);
      if (k === af.tile && placeActivities(k).length) return act(() => interactPlace());
      if (R.reach.has(k)) {
        const p = pathFor(af.tile, k, moveOf(a));
        const danger = p.slice(1, -1).filter(x => enemiesOn(x).length).length;
        return act(async () => {
          if (danger && !(await ui.confirm({ title: 'Traverser une case ennemie ?', text: `Le chemin passe par ${danger} case(s) occupée(s) : <b>embuscade</b> à chaque fois.`, ok: 'Y aller', cancel: 'Annuler', danger: true }))) return;
          await moveHero(a, p); S.used.move = true;
        });
      }
      if (S.used.move && k !== af.tile) ui.toast('Déplacement déjà utilisé ce tour.');
      else ui.toast(`<b>${t.name}</b> · ${TERRAINS[t.terrain].label}`);
      engine.focusTile(k);
    }
  };
  engine.onLongPress = k => {
    const t = tileOf(k); if (!t || !revealed.has(k)) return;
    const who = Object.entries(S.figs).filter(([, f]) => f.alive && f.tile === k).map(([id]) => def(id).name).join(', ');
    ui.toast(`<b>${t.name}</b> (${TERRAINS[t.terrain].label})${who ? '<br>' + who : ''}`, 3200);
  };
  engine.onFps = n => ui.setFps(n);
  ui.onKey = { select: i => { const h = party()[i]; if (h) engine.focusFigure(h.id); }, focus: () => engine.focusFigure(active()), deselect: () => {}, endTurn: () => act(() => endTurn()) };

  // ------------------------------------------------------------------ fin
  async function finish(win) {
    if (S.ended) return; S.ended = true; save();
    // XP de fin d'étape : commune (victoire + quêtes) + bonus perso (ennemis, critiques). Défaite : moitié.
    const quests = Object.values(S.quests).filter(q => q === 'done').length;
    const common = (win ? 30 : 10) + 5 * quests;
    const xp = Object.fromEntries(S.party.map(id => [id, common + 4 * (S.hstats[id]?.kills || 0) + 2 * (S.hstats[id]?.crits || 0)]));
    const stash = Object.fromEntries(Object.entries(S.inv).filter(([k, n]) => n > 0 && st.items[k]?.keep));
    const gains = completeStep(S.step, { win, memory: { ...(st.remember?.(g) || {}), ...S.memoryOut }, xp, stash });
    await sleep(700);
    if (win) { sfx.bell(); for (const h of heroes()) engine.animate?.(h.id, 'cheer'); await sleep(1200); }
    await dialogue.narrate(win ? st.victoryText : st.defeatText);
    const s = S.stats, mins = Math.round((Date.now() - s.t0) / 60000);
    ui.endScreen({
      title: win ? 'Victoire !' : 'Défaite', subtitle: `${st.title} — ${S.party.map(id => def(id).name).join(', ')}`,
      xp: S.party.map(id => ({ name: def(id).name, color: def(id).color, ...gains[id] })),
      stats: [['Manches', S.round], ['Glas', `${S.glas} / ${S.glasMax}`], ['Tuiles découvertes', `${revealed.size} / ${grid.cells.length}`], ['Ennemis vaincus', s.kills], ['Jets de dés', s.dice], ['Boosts dépensés', s.boosts], ['Chutes', s.ko], ['Durée réelle', `${mins} min`]],
      onReplay: () => { localStorage.removeItem(saveKey); location.reload(); },
    });
  }

  // ------------------------------------------------------------------ menu
  function buildMenu() {
    const gx = settings.gfx, det = settings.detected;
    const setG = patch => { if (settings.set({ gfx: patch })) ui.reloadPrompt(); };
    ui.buildMenu([
      { title: 'Partie', items: [
        { label: 'Journal & besace', action: () => ui.openJournal() },
        { type: 'seg', label: 'Ordre des tours', value: S.turnMode, options: [{ label: 'Fixe', value: 'fixed' }, { label: 'Aléatoire', value: 'deck' }], onChange: v => { S.turnMode = v; save(); ui.toast(v === 'deck' ? 'Dès la prochaine manche : ordre tiré au sort, les Ténèbres peuvent frapper au milieu.' : 'Dès la prochaine manche : ordre fixe.', 3200); } },
        { label: 'Relire l\'introduction', action: async () => { for (const p of st.intro) await dialogue.narrate(p); } },
        { label: 'Nouvelle partie (choix des héros)', action: () => { if (confirm('Effacer la partie en cours sur ce moteur ?')) { localStorage.removeItem(saveKey); location.reload(); } } },
        { label: 'Carte procédurale (nouvelle graine)', action: () => { const u = new URL(location.href); u.searchParams.set('seed', String(2 + Math.floor(Math.random() * 9999))); location.href = u; } },
        ...(seed !== 1 ? [{ label: 'Revenir à la carte du scénario', action: () => { const u = new URL(location.href); u.searchParams.delete('seed'); location.href = u; } }] : []),
      ] },
      { title: 'Caméra', items: [
        { label: 'Recentrer la vue', action: () => engine.resetCamera() },
        { label: 'Centrer sur le héros actif', action: () => engine.focusFigure(active()) },
      ] },
      { title: 'Table physique', items: [
        { type: 'toggle', label: 'Consignes de mise en place', value: settings.setup, onChange: v => settings.set({ setup: v }) },
      ] },
      { title: 'Dés (D100)', items: [
        { type: 'seg', label: 'Lancer', value: settings.dice, options: [{ label: 'Physiques', value: 'physical' }, { label: 'Virtuels', value: 'virtual' }], onChange: v => settings.set({ dice: v }) },
      ] },
      { title: `Graphismes — détecté : ${PRESETS[det.tier].label}`, items: [
        { type: 'seg', label: 'Qualité', value: settings.preset, options: [{ label: 'Auto', value: 'auto' }, ...Object.entries(PRESETS).map(([k, p]) => ({ label: p.label, value: k }))], onChange: v => { if (settings.set({ preset: v })) ui.reloadPrompt(); buildMenu(); } },
        ...(engine.supports?.shadows ? [{ type: 'seg', label: 'Ombres', value: gx.shadows, options: [['off', 'Non'], ['low', 'Basses'], ['high', 'Hautes'], ['ultra', 'Ultra']].map(([value, label]) => ({ value, label })), onChange: v => setG({ shadows: v }) }] : []),
        ...(engine.supports?.resolution === false ? [] : [{ type: 'seg', label: 'Résolution', value: gx.res, options: [0.5, 0.65, 0.85, 1].map(v => ({ label: `${Math.round(v * 100)}%`, value: v })), onChange: v => setG({ res: v }) },
          { type: 'toggle', label: 'Résolution dynamique', value: gx.dynRes, onChange: v => setG({ dynRes: v }) }]),
        { type: 'seg', label: 'Limite FPS', value: gx.fpsCap, options: [{ label: '30', value: 30 }, { label: '60', value: 60 }, { label: '∞', value: 0 }], onChange: v => setG({ fpsCap: v }) },
        { type: 'seg', label: 'Ambiance au repos', value: gx.ambientFps, options: [{ label: 'Figée', value: 0 }, { label: '24', value: 24 }, { label: '30', value: 30 }, { label: '60', value: 60 }], onChange: v => setG({ ambientFps: v }) },
        { type: 'seg', label: 'Particules', value: gx.particles, options: [{ label: '0', value: 0 }, { label: '½', value: 0.5 }, { label: '1', value: 1 }, { label: '1½', value: 1.5 }], onChange: v => setG({ particles: v }) },
        ...(engine.supports?.postfx ? [{ type: 'toggle', label: 'Post-process', value: gx.postfx, onChange: v => setG({ postfx: v }) }] : []),
        { type: 'toggle', label: 'Animations & lumières vivantes', value: gx.lightFx, onChange: v => setG({ lightFx: v, idleAnim: v }) },
        ...(engine.supports?.aa !== false ? [{ type: 'toggle', label: 'Anticrénelage (recharge)', value: gx.aa, onChange: v => setG({ aa: v }) }] : []),
        { type: 'seg', label: 'Densité décors (recharge)', value: gx.props, options: [{ label: '½', value: 0.55 }, { label: '¾', value: 0.8 }, { label: '1', value: 1 }, { label: '1¼', value: 1.25 }], onChange: v => setG({ props: v }) },
        { type: 'toggle', label: 'Afficher FPS', value: false, onChange: v => ui.showFps(v) },
      ] },
      { title: 'Figurines', items: [
        { type: 'seg', label: 'Finition', value: settings.finish, options: [{ label: 'Peintes', value: 'painted' }, { label: 'Grises', value: 'grey' }, { label: 'Bronze', value: 'bronze' }], onChange: v => { settings.set({ finish: v }); engine.setFinish?.(v); } },
        ...(engine.setFigScale ? [{ type: 'seg', label: 'Taille', value: 1, options: [{ label: 'S', value: 0.8 }, { label: 'M', value: 1 }, { label: 'L', value: 1.25 }], onChange: v => engine.setFigScale(v) }] : []),
        ...(engine.setLabels ? [{ type: 'toggle', label: 'Noms au-dessus des figurines', value: true, onChange: v => engine.setLabels(v) }] : []),
      ] },
      { title: 'Audio', items: [
        { type: 'seg', label: 'Volume', value: settings.volume, options: [{ label: '0', value: 0 }, { label: '30', value: 0.3 }, { label: '70', value: 0.7 }, { label: '100', value: 1 }], onChange: v => settings.set({ volume: v }) },
        { type: 'toggle', label: 'Vent d\'ambiance', value: settings.music, onChange: v => settings.set({ music: v }) },
        { type: 'toggle', label: 'Vibrations', value: settings.haptics, onChange: v => settings.set({ haptics: v }) },
      ] },
      ...(engine.menu || []),
      { title: 'Debug (tests)', items: [
        { label: 'Révéler toute la carte (hors zones verrouillées)', action: () => act(async () => { const ks = grid.cells.filter(x => !revealed.has(x.key) && !tileOf(x.key).zone).map(x => x.key); await Promise.all(ks.map((k, i) => sleep(i * 40).then(() => reveal(k, { focus: false })))); }) },
        { label: 'Rendre déplacement + action + attaque', action: () => { S.used = { move: false, action: false, attack: false }; select(active()); refreshHUD(); } },
        { label: '+5 boosts au héros actif', action: () => g.boost(5) },
        ...st.places.filter(p => !p.near).map(p => ({ label: `→ Téléporter : ${p.name}`, action: () => act(() => teleport(p.id)) })),
      ] },
    ]);
  }
  async function teleport(pl) {
    const k = map.placeKey[pl], id = active(), f = S.figs[id];
    if (!revealed.has(k)) await reveal(k);
    if (f.tile !== k) { await engine.moveFigure(id, [f.tile, k], { follow: true }); f.tile = k; }
    await revealAround(k);
    const p = placeOf(k); if (p && st.onEnter?.[p]) await st.onEnter[p](g, id);
  }
  settings.subscribe(() => engine.applySettings?.(settings.gfx));
  buildMenu();
  window.__game = { S, R, dialogue, g, map, act, talk, attack, reveal, teleport, interactPlace, endTurn, def, active, moveHero, pathFor };

  // ------------------------------------------------------------------ démarrage
  refreshHUD();
  if (!resumed) {
    for (const p of st.intro) await dialogue.narrate(p);
    R.setupTiles.push(...revealed); R.setupFigs.push(...Object.keys(S.figs));
    await flushSetup();
    g.questStart(Object.keys(st.quests)[0]);
    await startRound();
  } else {
    ui.toast(`Partie reprise · Manche ${S.round}`, 2200);
    const h = activeDef(); engine.setRingColor?.(parseInt(h.color.slice(1), 16)); select(h.id); engine.focusFigure(h.id); refreshHUD();
  }
}
