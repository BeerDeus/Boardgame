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
import { draw as drawMonster, describeCard, cardLines } from './monsters.js';
import { SKILL_NAMES, DIFFICULTIES, statKey, testChance } from './stats.js';
import { evalCond } from './level.js';

const SAVE_V = 7;
const TERRAIN_CODE = { village: 'V', forest: 'F', plains: 'P', rock: 'R', swamp: 'M', ruins: 'U', burned: 'C', snow: 'N', crypt: 'X' };
const PARTY_BONUS = { 1: 3, 2: 2, 3: 1, 4: 0 }; // glas supplémentaires selon la taille du groupe
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DROP_GAP = 420; // ms entre deux tuiles qui tombent (une par une)
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export async function runScenario({ engine, ui, dialogue, engineId, ready, draft = null }) {
  // mode test (éditeur) : une seule étape, sauvegarde séparée, aucune progression de campagne
  const STEPS = draft ? [draft] : CAMPAIGN.steps;
  const grid = engine.grid;
  const seed = +(new URLSearchParams(location.search).get('seed') || 1);
  const saveKey = draft ? `grimoire.save.draft.v${SAVE_V}` : `grimoire.save.v${SAVE_V}.${engineId}.${seed}`;
  const campaign = loadCampaign();

  // ------------------------------------------------------------------ partie sauvegardée ou nouvelle
  let S = null, resetup = false;
  try { const raw = JSON.parse(localStorage.getItem(saveKey)); if (raw?.v === SAVE_V && !raw.ended) S = raw; } catch {}
  if (S) { // une partie existe : on demande au lieu de reprendre en silence
    ready?.();
    const step0 = STEPS.find(x => x.id === S.step);
    const choice = await ui.resumePrompt({ title: `${step0?.num || ''} — ${step0?.title || ''}`, round: S.round, glas: S.glas, glasMax: S.glasMax, party: S.party, when: S.savedAt });
    if (choice === 'new') { localStorage.removeItem(saveKey); S = null; }
    else resetup = choice === 'setup';
  }
  const resumed = !!S;
  let st;
  if (!S) {
    ready?.();
    const def0 = (await STEPS[0].load()).STORY;
    // montées de niveau en attente (entre deux étapes)
    for (const h of def0.heroes) {
      const p = heroProgress(campaign, h.id);
      while (pointsAvailable(p) > 0) {
        const cur = applyProgress(h, p);
        const pick = await ui.levelUp({ hero: cur, skills: Object.keys(SKILL_NAMES).map(k => ({ id: k, name: SKILL_NAMES[k], value: cur.skills[k] ?? 30 })), perks: (PERKS[h.kind] || []).filter(x => !p.perks.includes(x.id)) });
        if (pick.skill) p.skills[pick.skill] = (p.skills[pick.skill] || 0) + 5; else p.perks.push(pick.perk);
        p.spent++; saveCampaign(campaign);
      }
    }
    const pick = await ui.partySelect({ tips: settings.tips,  steps: STEPS, completed: campaign.completed, heroes: def0.heroes, glasBase: def0.glasBase, partyBonus: PARTY_BONUS, progress: Object.fromEntries(def0.heroes.map(h => { const p = heroProgress(campaign, h.id); return [h.id, { level: levelOf(p.xp), won: draft ? [] : [...p.won] }]; })) });
    dialogue.cover?.(); // écran noir jusqu'à l'introduction (pas de plateau entre-temps)
    st = (await STEPS.find(s => s.id === pick.step).load()).STORY;
    if (pick.tips != null) settings.set({ tips: pick.tips });
    const n = pick.party.length;
    S = { v: SAVE_V, step: pick.step, party: pick.party, difficulty: pick.difficulty, turnMode: pick.turnMode,
      glasMax: st.glasBase[pick.difficulty] + PARTY_BONUS[n], glas: 0, round: 0, order: [], turn: 0,
      used: { move: false, action: false, attack: false }, revealed: [], figs: {}, boost: {}, flags: {}, inv: {}, quests: {}, seen: {}, done: [],
      counters: {}, unlocked: [], mounted: false, tod: 'dusk', ended: false, ko: [], memoryOut: {}, stats: { kills: 0, dice: 0, ko: 0, boosts: 0, t0: Date.now() }, hstats: {} };
  } else st = (await STEPS.find(s => s.id === S.step).load()).STORY;
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
    const t = tileOf(k); if (!t || t.void) return true;
    if (t.zone && !S.unlocked.includes(t.zone)) return true;
    const pd = t.place && placeDef(t.place);
    return !!(pd?.hiddenUntil && !S.flags[pd.hiddenUntil]);
  };
  if (!resumed) {
    S.revealed = [map.start, ...grid.neighbors(map.start).filter(k => !locked(k))];
    for (const id of S.party) { S.figs[id] = { tile: map.start, hp: def(id).hp, alive: true }; S.boost[id] = Math.min(boostMaxOf(id), st.boost.start + (def(id).boostStart || 0)); }
    for (const [k, n] of Object.entries(campaign.stash || {})) if (n > 0) S.inv[k] = n; // objets conservés de la campagne
    for (const c of st.cast) if (!c.spawnOn && inParty(c) && map.placeKey[c.place] === map.start) S.figs[c.id] = { tile: map.start, hp: scaledHp(c), alive: true };
    S.explored = [map.start];
  }
  S.hstats ||= {}; S.decks ||= {}; S.cond ||= {}; S.explored ||= [...S.revealed];
  const explored = new Set(S.explored);
  const revealed = new Set(S.revealed);
  const save = () => { S.revealed = [...revealed]; S.explored = [...explored]; S.savedAt = Date.now(); try { localStorage.setItem(saveKey, JSON.stringify(S)); } catch {} };
  const R = { reach: new Map(), busy: false, marks: new Set(), setupTiles: [], setupFigs: [], setupTokens: [] };

  // ------------------------------------------------------------------ plateau
  const poiFor = t => { if (!t.poi || !t.place) return null; const acts = placeDef(t.place).activities || []; return acts.some(a => !(a.once && S.done.includes(a.id))) ? t.poi : null; };
  // nouvelle partie : plateau vide, les premières tuiles tomberont du ciel après l'introduction
  for (const t of map.tiles.values()) engine.addTile({ ...t, label: TERRAINS[t.terrain].label, revealed: resumed && revealed.has(t.key), poi: poiFor(t) });
  engine.resetCamera(true);
  if (resumed) {
    ready?.();
    for (const [id, f] of Object.entries(S.figs)) if (f.alive) await engine.addFigure(figData(id), f.tile, { spawn: false });
  }
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
    ui.setParty(party().map(h => ({ ...h, hp: S.figs[h.id].hp, max: h.hp, ko: !S.figs[h.id].alive, mounted: h.id === 'aldric' && S.mounted, turn: h.id === a, boost: S.boost[h.id], boostMax: boostMaxOf(h.id), poison: S.cond[h.id]?.poison, stun: S.cond[h.id]?.stun })), id => { engine.focusFigure(id); if (id !== a) ui.toast(`${def(id).name} attend son tour.`); });
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
    if (R.undo?.id === id) acts.push({ icon: 'back', label: 'Annuler le déplacement', action: () => act(() => undoMove(), { keepUndo: true }) });
    acts.push({ icon: 'end', label: 'Fin du tour', primary: true, pulse: S.used.move && S.used.action && S.used.attack, action: () => act(() => endTurn()) });
    ui.setActions(acts);
  }

  // ------------------------------------------------------------------ API exposée aux scénarios
  /** Héros visés par un effet : active | here | all | id */
  const whoIds = who => { const a = active(); return who === 'all' ? heroes().map(h => h.id) : who === 'here' ? heroes().filter(h => S.figs[h.id].tile === S.figs[a].tile).map(h => h.id) : [who === 'active' || !who ? a : who].filter(id => S.figs[id]?.alive); };
  /** Valeur effective d'une stat (fiche + bonus du niveau) */
  const skillOf = (id, k) => { k = statKey(k); return (def(id)?.skills?.[k] ?? 30) + (S.statMods?.[id]?.[k] || 0); };
  /** Un héros tombe (combat, piège mortel…) */
  async function knockOut(hid, why = '') {
    const hf = S.figs[hid], h = def(hid); if (!hf?.alive) return;
    hf.alive = false; S.stats.ko++; S.ko.push(hid); S.cond[hid] = {};
    if (hid === 'aldric') S.mounted = false;
    await engine.removeFigure(hid, { animate: true });
    ui.toast(`${h.name} tombe${why} ! Retour au hameau à la prochaine manche. <b>+1 glas</b>`, 3200);
    g.glas(1);
    if (!heroes().length) await finish(false);
  }
  const g = {
    flag: k => !!S.flags[k], set: (k, v = true) => { S.flags[k] = v; },
    // --- lecture de l'état (conditions de l'éditeur)
    activeId: () => active(), skillOf, hpOf: id => S.figs[id]?.hp ?? 0, maxHpOf: id => def(id)?.hp ?? 0, partySize: () => S.party.length, round: () => S.round, glasNow: () => S.glas,
    isNight: () => S.tod === 'night', counterOf: k => S.counters[k] || 0,
    /** {héros} → nom du héros actif */
    fill: t => String(t ?? '').replace(/\{h[ée]ros\}|\{hero\}/gi, activeDef()?.name || 'vous'),
    // --- effets supplémentaires (éditeur)
    addCounter(k, n) { S.counters[k] = (S.counters[k] || 0) + n; },
    async damage(n, who, lethal) {
      for (const id of whoIds(who)) {
        const f = S.figs[id]; f.hp -= n; sfx.hit(); ui.floatText(engine.screenPos(id), `-${n} PV`, '#ff6a4a');
        if (f.hp <= 0) { if (lethal) await knockOut(id); else f.hp = 1; }
      }
      refreshHUD();
    },
    statBonus(k, n, who, duration) {
      k = statKey(k);
      for (const id of whoIds(who)) {
        if (duration === 'campaign') { // permanent : enregistré dans la campagne (sauf en test depuis l'éditeur)
          def(id).skills[k] = (def(id).skills[k] ?? 30) + n;
          if (!draft) { const p = heroProgress(campaign, id); p.skills[k] = (p.skills[k] || 0) + n; saveCampaign(campaign); }
        } else { S.statMods ||= {}; S.statMods[id] ||= {}; S.statMods[id][k] = (S.statMods[id][k] || 0) + n; }
        ui.floatText(engine.screenPos(id), `${n > 0 ? '+' : ''}${n} ${SKILL_NAMES[k] || k}`, n > 0 ? '#9fd0ff' : '#ff7a6a');
      }
      if (n > 0) sfx.magic(); refreshHUD();
    },
    dmgBonus(n, who, duration) {
      for (const id of whoIds(who)) {
        if (duration === 'campaign') { def(id).dmg = (def(id).dmg || 1) + n; if (!draft) { const p = heroProgress(campaign, id); p.dmg = (p.dmg || 0) + n; saveCampaign(campaign); } }
        else { S.dmgMods ||= {}; S.dmgMods[id] = (S.dmgMods[id] || 0) + n; }
        ui.floatText(engine.screenPos(id), `${n > 0 ? '+' : ''}${n} dégât${Math.abs(n) > 1 ? 's' : ''}`, '#ffb070');
      }
      sfx.magic(); refreshHUD();
    },
    setStatus(kind, who) {
      for (const id of whoIds(who)) {
        const c = S.cond[id] ||= {};
        if (kind === 'cure') { c.poison = false; c.stun = false; ui.floatText(engine.screenPos(id), 'Guéri', '#8fe07a'); }
        else { c[kind] = true; ui.floatText(engine.screenPos(id), kind === 'poison' ? 'Empoisonné' : 'Étourdi', '#ff9a6a'); }
      }
      refreshHUD();
    },
    addXp(n, who) { S.bonusXp ||= {}; for (const id of who === 'all' ? S.party : whoIds(who)) { S.bonusXp[id] = (S.bonusXp[id] || 0) + n; ui.floatText(engine.screenPos(id), `+${n} XP`, '#ffd36a'); } },
    async moveHeroesTo(place, who) {
      const k = map.placeKey[place]; if (!k) return;
      if (!revealed.has(k)) await reveal(k);
      for (const id of whoIds(who)) { const f = S.figs[id]; if (f.tile === k) continue; await engine.moveFigure(id, [f.tile, k], { follow: true }); f.tile = k; }
      await exploreTile(k); await revealAround(k); await flushSetup();
    },
    async despawn(id) { const f = S.figs[id]; if (!f?.alive) return; f.alive = false; await engine.removeFigure(id, { animate: true }); refreshHUD(); },
    addGlasMax(n) { S.glasMax = Math.max(S.glas + 1, S.glasMax + n); ui.toast(`Limite de glas : <b>${S.glasMax}</b>`, 2400); refreshHUD(); },
    async defeat() { await finish(false); },
    choose: o => ui.choose(o),
    has: k => (S.inv[k] || 0) > 0,
    give(k, n = 1) { S.inv[k] = (S.inv[k] || 0) + n; ui.toast(`Obtenu : <b>${st.items[k].name}</b>${n > 1 ? ' ×' + n : ''}`, 2600); sfx.success(); refreshHUD(); },
    take(k) { S.inv[k] = Math.max(0, (S.inv[k] || 0) - 1); refreshHUD(); },
    questActive: id => S.quests[id] === 'active',
    questDoneQ: id => S.quests[id] === 'done',
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
    /** Test de stat : D100 ≤ stat + difficulté (+ modificateur). diff : facile | normal | difficile | heroique */
    async test(skill, label, mod = 0, diff = 'normal') {
      await tip('dice');
      skill = statKey(skill);
      const h = activeDef(), base = skillOf(h.id, skill), chance = testChance(base, diff, mod), dm = DIFFICULTIES[diff]?.mod ?? 0;
      S.stats.dice++;
      const parts = [`${SKILL_NAMES[skill] || skill} ${base} %`];
      if (dm) parts.push(`${DIFFICULTIES[diff].label} ${dm > 0 ? '+' : '−'}${Math.abs(dm)}`);
      if (mod) parts.push(`${mod > 0 ? '+' : '−'}${Math.abs(mod)}`);
      const r = await ui.rollD100({ chance, label: `${h.name} — ${label}`, detail: parts.join(' · '), color: h.color, boosts: S.boost[h.id] || 0, stat: skill });
      spendBoost(h.id, r.spent);
      return r.ok;
    },
    glas(n) {
      S.glas = Math.min(S.glasMax, Math.max(0, S.glas + n)); ui.setGlas?.(S.glas, S.glasMax, n);
      if (n > 0) g.bell();
      refreshHUD();
    },
    revealPlace: async id => { await reveal(map.placeKey[id]); await exploreTile(map.placeKey[id]); await flushSetup(); },
    async unlockZone(id) {
      if (S.unlocked.includes(id)) return; S.unlocked.push(id);
      const ks = new Set(); for (const k of revealed) for (const n of grid.neighbors(k)) if (!revealed.has(n) && tileOf(n).zone === id && !locked(n)) ks.add(n);
      await Promise.all([...ks].map((k, i) => sleep(i * DROP_GAP).then(() => reveal(k, { focus: i === 0 }))));
      await flushSetup();
    },
    async spawn(id) { await spawn(id); await flushSetup(); },
    async spawnWave(tag) { for (const c of st.cast) if (c.spawnOn === tag && inParty(c)) await spawn(c.id); await flushSetup(); },
    /** Soins : who = 'active' | 'here' | 'all' */
    heal(n, who = 'active') {
      const a = active(), ids = who === 'all' ? heroes().map(h => h.id) : who === 'here' ? heroes().filter(h => S.figs[h.id].tile === S.figs[a].tile).map(h => h.id) : [a];
      for (const id of ids) { const f = S.figs[id], mx = def(id).hp, b = f.hp; f.hp = Math.min(mx, f.hp + n); if (f.hp > b) ui.floatText(engine.screenPos(id), `+${f.hp - b} PV`, '#8fe07a'); if (S.cond[id]?.poison) { S.cond[id].poison = false; ui.toast(`${def(id).name} n'est plus empoisonné.`); } }
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
  // ------------------------------------------------------------------ conseils du tutoriel (une fois chacun)
  const TIPS = {
    setup: ['map', 'Mettre en place la table', 'L\'app joue le maître du jeu : à chaque découverte, elle vous dit quelles <b>tuiles</b> poser (avec un plan), puis quels <b>jetons</b> et quelles <b>figurines</b> placer. Faites-le sur la table, puis touchez « C\'est fait ».'],
    turn: ['move', 'Votre tour', 'Chaque héros a <b>1 déplacement</b> (cases dorées, 2 cases), <b>1 action</b> (lieu, PNJ ou talent) et <b>1 attaque</b>, dans l\'ordre que vous voulez. Touchez une case dorée pour bouger : l\'app demande confirmation. Bougez votre vraie figurine en même temps.'],
    explore: ['eye', 'Explorer', 'Une nouvelle tuile ne montre que son illustration. Ce qu\'elle contient (lieu, personnages, monstres) n\'apparaît que lorsqu\'un héros y entre.'],
    npc: ['person', 'Parler', 'Touchez un PNJ (socle doré) pour lui parler : cela utilise l\'action du tour. Écoutez bien… et <b>prenez des notes sur papier</b> : certains PNJ vous interrogeront plus tard.'],
    place: ['place', 'Interagir avec un lieu', 'Le bouton <b>Lieu</b> (ou toucher la case du héros) ouvre tout ce qu\'on peut faire ici. Vous pouvez tout faire en une seule action.'],
    enemy: ['attack', 'Combat', 'Un monstre ! Touchez-le pour l\'attaquer (l\'attaque du tour, séparée de l\'action). Portée : même case ou case voisine (2 pour Ysolde). Traverser sa case sans s\'arrêter provoque une <b>embuscade</b>.'],
    dice: ['dice', 'Les dés', 'Lancez <b>deux d10</b> : celui des dizaines et celui des unités (00 + 0 = 100). Saisissez le résultat : réussite s\'il est <b>inférieur ou égal</b> à la chance affichée. Avant de lancer, dépensez des <b>boosts</b> ✦ : +10 % chacun. Vous en regagnez 1 par manche.'],
    dark: ['skull', 'Les Ténèbres', 'Après les héros, chaque type de monstre tire une <b>carte d\'action</b> (initiative, déplacement, attaque…). Certaines cartes peuvent ne rien faire si vous êtes loin ! Puis la cloche sonne : <b>+1 glas</b>. Au dernier glas, c\'est perdu.'],
    end: ['end', 'Fin du tour', 'Déplacement, action et attaque utilisés : touchez <b>Fin du tour</b> pour passer au héros suivant.'],
  };
  async function tip(id) {
    if (!settings.tips || !st.tutorial) return;
    S.tipsSeen ||= [];
    if (S.tipsSeen.includes(id)) return;
    S.tipsSeen.push(id); save();
    const [ic3, title, text] = TIPS[id];
    if (await ui.tip({ title, text, icon: ic3 })) settings.set({ tips: false });
  }
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
    const c = S.cond[id] ||= {};
    if (c.poison) { const f = S.figs[id]; if (f.hp > 1) { f.hp--; ui.floatText(engine.screenPos(id), '-1 poison', '#9be07a'); } ui.toast(`${h.name} souffre du poison (−1 PV). Un soin le guérit.`, 2600); }
    if (c.stun) { c.stun = false; S.used.attack = true; ui.toast(`${h.name} est étourdi : pas d'attaque ce tour.`, 2600); }
    refreshHUD();
    await tip('turn');
    if (Object.keys(S.figs).some(i => def(i).team === 'npc' && S.figs[i].alive && i !== 'destrier')) await tip('npc');
  }
  async function endTurn() { R.undo = null; engine.highlight([], []); S.turn++; await nextTurn(); return false; }
  async function darkPhase() {
    engine.setSelected(null); engine.highlight([], []); refreshHUD();
    await tip('dark');
    await ui.turnBanner({ title: 'Les Ténèbres', subtitle: 'Les ennemis agissent · la cloche sonne', color: '#8a1c1c', dark: true });
    S.decks ||= {};
    const kinds = [...new Set(enemies().map(e => def(e.id).kind))];
    const plays = kinds.map(kind => { const group = enemies().filter(e => def(e.id).kind === kind); const d0 = def(group[0].id); return { kind, group, d0, card: drawMonster(S.decks, kind) }; }).sort((a, b) => a.card.init - b.card.init);
    if (plays.length) await ui.monsterCards(plays.map(p => ({ kind: p.d0.kind, color: p.d0.color, title: `${p.d0.name}${p.group.length > 1 ? ` ×${p.group.length}` : ''}`, card: p.card, lines: cardLines(p.card) })));
    for (const p of plays) {
      engine.focusFigure(p.group[0].id, { soft: true });
      await ui.monsterCard({ title: `${p.d0.name} · initiative ${p.card.init}`, card: p.card.name, desc: describeCard(p.card) });
      for (const en of p.group) { if (S.ended) return; if (S.figs[en.id]?.alive) await enemyAct(en.id, p.card); }
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
    await Promise.all(ks.map((n, i) => sleep(i * DROP_GAP).then(() => reveal(n, { focus: false }))));
  }
  async function reveal(key, { focus = true } = {}) {
    if (revealed.has(key)) return;
    revealed.add(key); sfx.reveal();
    R.setupTiles.push(key);
    await engine.revealTile(key, { focus });
    save();
  }
  /** Entrer dans une case pour la 1re fois : son contenu (lieu, PNJ, monstres, jeton) apparaît */
  async function exploreTile(key) {
    if (explored.has(key)) return false;
    if (!revealed.has(key)) await reveal(key, { focus: false });
    explored.add(key);
    const t = tileOf(key), pl = t.place, site = siteOf(key);
    if (poiFor(t)) { engine.setPoi?.(key, true); R.setupTokens.push(key); }
    if (pl) for (const c of st.cast) if (c.place === pl && !c.spawnOn && !S.figs[c.id] && inParty(c)) await spawn(c.id);
    if (site?.desc) ui.toast(`<b>${site.name}</b> — ${site.desc}${placeActivities(key).length ? '<br><small>Touchez la case ou « Lieu » pour interagir.</small>' : ''}`, 4500);
    if (pl && st.onReveal?.[pl]) await st.onReveal[pl](g);
    save(); return true;
  }
  const teaserOf = k => { const t = tileOf(k), pd = t.place && placeDef(t.place); return pd?.teaser || TERRAINS[t.terrain].teaser || ''; };
  async function spawn(id) {
    const c = def(id), key = map.placeKey[c.place]; if (S.figs[id] || !inParty(c)) return;
    S.figs[id] = { tile: key, hp: scaledHp(c), alive: true };
    if (!revealed.has(key)) await reveal(key, { focus: false });
    R.setupFigs.push(id);
    await engine.addFigure(figData(id), key, { spawn: true });
  }
  /** Consignes de mise en place pour la table physique, regroupées par moment */
  async function flushSetup() {
    const tiles = R.setupTiles.splice(0), figs = R.setupFigs.splice(0), tokens = R.setupTokens.splice(0);
    if (!settings.setup || S.ended) return;
    if (tiles.length || figs.length) await tip('setup');
    if (tiles.length && S.round >= 1) await tip('explore');
    if (tiles.length) {
      engine.highlight([], tiles); engine.focusTile(tiles[0]);
      const heroTiles = new Set(heroes().map(h => S.figs[h.id].tile)), isNew = new Set(tiles);
      const mapView = { type: grid.type, cells: [...revealed].map(k => { const c = grid.get(k), t = tileOf(k), pd = t.place && placeDef(t.place);
        return { x: c.x, z: c.z, w: grid.w, h: grid.h, code: t.code, color: TERRAINS[t.terrain].tint, isNew: isNew.has(k), hero: heroTiles.has(k), place: pd && explored.has(k) ? pd.name.split(' ').slice(-1)[0] : '' }; }) };
      engine.showCodes?.(tiles, true);
      await ui.setupPrompt({ title: tiles.length > 1 ? `Placez ${tiles.length} tuiles` : 'Placez la tuile', mapView, note: 'Posez chaque tuile en surbrillance contre les tuiles déjà sur la table, comme sur le plan (et sur le plateau à l\'écran).',
        items: tiles.map(k => { const t = tileOf(k); return { icon: 'map', code: t.code, title: TERRAINS[t.terrain].label, sub: teaserOf(k) }; }) });
      engine.showCodes?.(tiles, false);
    }
    if (tokens.length || figs.length) {
      const items = [
        ...tokens.map(k => { const t = tileOf(k), pd = siteOf(k); return { icon: pd.poi?.icon || pd.icon || 'place', title: `Jeton d'intérêt : ${pd.name}`, sub: `Posez-le sur ${t.code}`, code: t.code }; }),
        ...figs.map(id => { const d = def(id); return { portrait: { kind: d.kind, color: d.color }, title: dispName(id), sub: `${d.team === 'npc' ? 'PNJ' : d.team === 'boss' ? 'Boss' : d.team === 'enemy' ? `Monstre · ${S.figs[id]?.hp} PV` : d.role || ''} — sur ${tileOf(S.figs[id].tile).code}`, code: d.team === 'enemy' ? `n°${figNo[id] || 1}` : '' }; }),
      ];
      engine.focusFigure(figs[0] || '', { soft: true }); if (!figs.length && tokens[0]) engine.focusTile(tokens[0]);
      await ui.setupPrompt({ title: figs.length ? 'Placez les figurines' : 'Placez le jeton', items });
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
      await exploreTile(path[i]);
      await revealAround(path[i]); await flushSetup();
      if (i < last && enemiesOn(path[i]).length) { await ambush(id, path[i]); if (!f.alive) return; }
    }
    const pd = siteOf(f.tile);
    if (pd && !pd.minor && st.onEnter?.[pd.id]) await st.onEnter[pd.id](g, id);
  }
  // ------------------------------------------------------------------ annuler un déplacement
  // Seulement si rien n'a changé à part la position : chemin déjà exploré, aucune tuile révélée,
  // aucune embuscade, aucun jet de dés, aucun effet de lieu (drapeaux, objets, quêtes…).
  const stateSig = () => JSON.stringify({ ...S, figs: undefined, used: undefined, savedAt: undefined, revealed: undefined, explored: undefined, tipsSeen: undefined }) + revealed.size + '/' + explored.size;
  function undoSnapshot(id, path) {
    const ride = id === 'aldric' && S.mounted && S.figs.destrier?.alive;
    return { id, path: [...path], ride, turn: S.turn, round: S.round, known: path.slice(1).every(k => explored.has(k)), safe: !path.slice(1, -1).some(k => enemiesOn(k).length), sig: stateSig(),
      figs: JSON.stringify(Object.entries(S.figs).filter(([fid]) => fid !== id && !(ride && fid === 'destrier'))) };
  }
  function undoAllowed(b) {
    const f = S.figs[b.id];
    return b.known && b.safe && f?.alive && f.tile === b.path.at(-1) && S.turn === b.turn && S.round === b.round && !S.ended && stateSig() === b.sig
      && JSON.stringify(Object.entries(S.figs).filter(([fid]) => fid !== b.id && !(b.ride && fid === 'destrier'))) === b.figs;
  }
  async function undoMove() {
    const u = R.undo; R.undo = null;
    if (!u || active() !== u.id || !undoAllowed(u)) { ui.toast('Ce déplacement ne peut plus être annulé.'); return; }
    const back = [...u.path].reverse(), f = S.figs[u.id];
    engine.highlight([], []);
    await Promise.all([engine.moveFigure(u.id, back, { follow: true }), u.ride ? engine.moveFigure('destrier', back, { follow: false }) : null]);
    f.tile = u.path[0]; if (u.ride) S.figs.destrier.tile = u.path[0];
    S.used.move = false;
    ui.toast(`Déplacement annulé : remettez ${def(u.id).name} sur <b>${tileOf(u.path[0]).code}</b>.`, 3200);
  }
  async function ambush(heroId, k) {
    const foes = enemiesOn(k).map(e => def(e.id)).sort((a, b) => b.atk - a.atk), e = foes[0];
    ui.toast(`<b>Embuscade !</b> ${e.name} frappe au passage.`, 2200);
    if (heroId === 'selene') {
      if (await g.test('agilite', 'Esquiver l\'embuscade')) { ui.floatText(engine.screenPos(heroId), 'Esquive', '#8fe07a'); return; }
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
    if (it.use) { // effets définis dans l'éditeur
      if (it.useCond && !evalCond(it.useCond, g)) { ui.toast(`<b>${it.name}</b> — ${it.useNeed || 'pas maintenant.'}`); return; }
      return act(async () => { await it.use(g); if (it.consume !== false) g.take(item); save(); });
    }
    if (item !== 'herbes') { ui.toast(`<b>${it.name}</b> — ${it.desc}`, 3200); return; }
    const id = active(), f = S.figs[id], h = def(id);
    if (!f?.alive || f.hp >= h.hp) { ui.toast(`${h.name} n'a pas besoin de soins.`); return; }
    g.take('herbes'); f.hp = Math.min(h.hp, f.hp + 3); ui.floatText(engine.screenPos(id), '+3', '#8fe07a'); sfx.magic(); refreshHUD(); save();
  }

  // ------------------------------------------------------------------ combat (provisoire : un jet D100)
  const distTo = (from, to, max) => bfs(grid, from, k => revealed.has(k), max).dist.get(to);
  async function attack(heroId, enemyId) {
    await tip('dice');
    const h = def(heroId), e = def(enemyId), ef = S.figs[enemyId];
    S.stats.dice++;
    const chance = Math.max(5, Math.min(95, skillOf(heroId, 'combat') - e.def));
    const r = await ui.rollD100({ chance, label: `${h.name} attaque ${dispName(enemyId)}`, detail: `${h.combatName} ${skillOf(heroId, 'combat')} % − défense ${e.def} %`, color: h.color, boosts: S.boost[heroId] || 0, stat: 'combat' });
    spendBoost(heroId, r.spent);
    if (h.range > 1 && S.figs[heroId].tile !== ef.tile) { sfx.magic(); engine.animate?.(heroId, 'cast'); await sleep(500); } else await engine.bump(heroId, enemyId);
    S.used.attack = true;
    if (!r.ok) { ui.floatText(engine.screenPos(enemyId), 'Raté', '#cfc6b0'); return; }
    // dégâts = base + 1 par tranche de 20 sous la chance (marge de réussite), ×2 sur critique
    const bonus = Math.max(0, Math.floor((r.chance - r.roll) / 20));
    let dmg = (h.dmg + (S.dmgMods?.[heroId] || 0) + bonus) * (r.crit ? 2 : 1); if (e.undead && g.has('eau')) dmg++;
    if (ef.shield) { const blocked = Math.min(ef.shield, dmg); dmg -= blocked; ui.floatText(engine.screenPos(enemyId), `Bouclier −${blocked}`, '#9ccbff'); await sleep(300); }
    if (dmg <= 0) return;
    sfx.hit(); ef.hp -= dmg; ui.floatText(engine.screenPos(enemyId), `-${dmg}${r.crit ? ' !' : ''}`, '#ff6a4a');
    if (r.crit) hstat(heroId, 'crits');
    if (ef.hp <= 0) { ef.alive = false; S.stats.kills++; hstat(heroId, 'kills'); await engine.removeFigure(enemyId, { animate: true }); await st.onDefeat?.[enemyId]?.(g); }
  }
  async function enemyAct(eid, card = {}) {
    const ef = S.figs[eid], ed = def(eid); if (!ef.alive) return;
    ef.shield = card.shield || 0;
    if (card.shield) ui.floatText(engine.screenPos(eid), `Bouclier ${card.shield}`, '#9ccbff');
    if (card.heal) { const mx = scaledHp(ed); if (ef.hp < mx) { ef.hp = Math.min(mx, ef.hp + card.heal); ui.floatText(engine.screenPos(eid), `+${card.heal}`, '#8fe07a'); } }
    if (card.glas) g.glas(card.glas);
    const steps = ed.static ? 0 : card.move || 0, range = card.atk ? (card.atk.range ?? 0) : 0;
    const { dist, pathTo } = bfs(grid, ef.tile, k => revealed.has(k), 4 + steps);
    // IA : parmi les héros atteignables ce tour (déplacement + portée), viser le plus blessé (achever),
    // sinon le plus proche. Une carte peut forcer « target: 'nearest' ».
    const cands = heroes().map(h => ({ id: h.id, d: dist.get(S.figs[h.id].tile), hp: S.figs[h.id].hp })).filter(x => x.d != null);
    const nearest = cands.slice().sort((a, b) => a.d - b.d || a.hp - b.hp)[0];
    const inReach = cands.filter(x => x.d <= steps + range).sort((a, b) => a.hp - b.hp || a.d - b.d);
    let best = card.target === 'nearest' ? nearest : inReach[0] || nearest;
    if (!best || best.d > 3 + steps) return; // trop loin : ne réagit pas
    best = { ...best };
    if (steps && best.d > range) {
      const p = pathTo(S.figs[best.id].tile);
      let n = Math.min(steps, best.d - range);
      // garde (cast.guard = N) : ne s'éloigne pas à plus de N cases de son lieu
      if (ed.guard != null && map.placeKey[ed.place]) {
        const home = bfs(grid, map.placeKey[ed.place], () => true, 12).dist;
        while (n > 0 && (home.get(p[n]) ?? 99) > ed.guard) n--;
      }
      if (n > 0) { await engine.moveFigure(eid, p.slice(0, n + 1), { follow: false }); ef.tile = p[n]; best.d -= n; }
    }
    if (!card.atk || best.d > range) { if (card.atk) ui.floatText(engine.screenPos(eid), 'Hors de portée', '#cfc6b0'); return; }
    const targets = card.atk.aoe ? heroes().filter(h => S.figs[h.id].tile === ef.tile).map(h => h.id) : [best.id];
    for (const hid of targets) {
      for (let n = card.double ? 2 : 1; n > 0; n--) { if (!S.figs[hid]?.alive || !ef.alive || S.ended) break; await enemyStrike(eid, hid, false, card.atk); }
    }
  }
  async function enemyStrike(eid, hid, ambushHit = false, atk = { dmg: 1 }) {
    const ed = def(eid), h = def(hid), hf = S.figs[hid], bonus = atk.bonus || 0, dmg = atk.dmg || 1;
    engine.focusFigure(hid, { soft: true });
    S.stats.dice++;
    const chance = Math.max(5, Math.min(95, ed.atk - h.armor + (ambushHit ? 10 : 0) + bonus));
    const { ok } = await ui.rollD100({ chance, label: `${dispName(eid)} attaque ${h.name}${ambushHit ? ' (embuscade)' : ''} — ${dmg} dégât${dmg > 1 ? 's' : ''}`, detail: `Attaque ${ed.atk} % − armure ${h.armor} %${bonus ? ` ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)} carte` : ''}${ambushHit ? ' + 10 embuscade' : ''} · lancez pour l'ennemi`, color: '#8a1c1c', enemy: true });
    await engine.bump(eid, hid);
    if (!ok) { ui.floatText(engine.screenPos(hid), 'Paré', '#cfc6b0'); return; }
    sfx.hit(); hf.hp -= dmg; ui.floatText(engine.screenPos(hid), `-${dmg}`, '#ff6a4a');
    const c = S.cond[hid] ||= {};
    if (atk.poison && hf.hp > 0 && !c.poison) { c.poison = true; ui.toast(`${h.name} est <b>empoisonné</b> (−1 PV par tour, jusqu'à un soin).`, 2800); }
    if (atk.stun && hf.hp > 0) { c.stun = true; ui.toast(`${h.name} est <b>étourdi</b> : pas d'attaque à son prochain tour.`, 2800); }
    refreshHUD();
    if (hf.hp <= 0) await knockOut(hid);
  }

  // ------------------------------------------------------------------ dialogues
  async function talkScript(dlgId, npcId) {
    const heroId = active(), hero = def(heroId);
    engine.highlight([], []); ui.vignette(true);
    engine.animate?.(heroId, 'talk');
    await dialogue.play(st.dialogues[dlgId], {
      g, dlgId, sceneTitle: siteOf(S.figs[npcId]?.tile)?.name || def(npcId)?.name,
      speaker: s => { const d = s === 'hero' ? hero : def(s) || hero; return { name: d.name, kind: d.kind, color: d.color }; },
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
  async function act(fn, { keepUndo = false } = {}) {
    if (R.busy || dialogue.open || S.ended) return;
    R.busy = true; ui.setBusy(true);
    if (!keepUndo) R.undo = null; // le héros fait autre chose : le déplacement n'est plus annulable
    let changedTurn = false;
    try {
      changedTurn = (await fn()) === false; await flushSetup();
      if (!changedTurn && !S.ended) {
        if (enemies().length) await tip('enemy');
        const af = S.figs[active()];
        if (af?.alive && placeActivities(af.tile).length && !S.used.action) await tip('place');
        if (S.used.move && S.used.action && S.used.attack) await tip('end');
      }
    }
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
          const e = def(id), chance = Math.max(5, Math.min(95, skillOf(a, 'combat') - e.def));
          const ok = await ui.confirm({ title: `Attaquer ${e.name} ?`, text: `PV ${S.figs[id].hp} · chance de toucher <b>${chance} %</b> (+10 par boost)<br>Dégâts <b>${h.dmg + (S.dmgMods?.[a] || 0)}</b>, <b>+1</b> par tranche de 20 sous la chance, <b>×2</b> sur critique<br><small>Utilise l'attaque du tour.</small>`, portrait: { kind: e.kind, color: e.color }, ok: 'Attaquer', cancel: 'Annuler', danger: true });
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
        const known = explored.has(k), site = known ? siteOf(k) : null;
        const title = site ? site.name : `${TERRAINS[t.terrain].label} (${t.code})`;
        const text = `<i>${site?.desc || teaserOf(k)}</i><br>${p.length - 1} case(s)${known ? '' : ' · <b>inexploré</b>'}${danger ? `<br><b>⚠ Embuscade</b> : le chemin traverse ${danger} case(s) ennemie(s).` : ''}<br><small>Utilise le déplacement du tour.</small>`;
        return act(async () => {
          if (!(await ui.confirm({ title: `Aller : ${title} ?`, text, ok: 'Y aller', cancel: 'Annuler', danger: !!danger }))) return;
          const before = undoSnapshot(a, p);
          await moveHero(a, p); S.used.move = true;
          R.undo = undoAllowed(before) ? before : null;
        });
      }
      if (S.used.move && k !== af.tile) ui.toast('Déplacement déjà utilisé ce tour.');
      else ui.toast(explored.has(k) ? `<b>${siteOf(k)?.name || TERRAINS[t.terrain].label}</b> · ${t.code}` : `${TERRAINS[t.terrain].label} (${t.code}) — <i>${teaserOf(k)}</i>`, 3200);
      engine.focusTile(k);
    }
  };
  engine.onLongPress = k => {
    const t = tileOf(k); if (!t || !revealed.has(k)) return;
    const who = Object.entries(S.figs).filter(([, f]) => f.alive && f.tile === k).map(([id]) => def(id).name).join(', ');
    ui.toast(explored.has(k) ? `<b>${siteOf(k)?.name || TERRAINS[t.terrain].label}</b> (${t.code})${who ? '<br>' + who : ''}` : `${TERRAINS[t.terrain].label} (${t.code}) — <i>${teaserOf(k)}</i>`, 3200);
  };
  engine.onFps = n => ui.setFps(n);
  ui.onKey = { select: i => { const h = party()[i]; if (h) engine.focusFigure(h.id); }, focus: () => engine.focusFigure(active()), deselect: () => {}, endTurn: () => act(() => endTurn()) };

  // ------------------------------------------------------------------ fin
  async function finish(win) {
    if (S.ended) return; S.ended = true; save();
    // XP de fin d'étape (victoire seulement) : commune (victoire + quêtes) + bonus perso (ennemis, critiques).
    // Défaite : aucune XP. Étape déjà gagnée par ce héros : aucune XP non plus.
    const quests = Object.values(S.quests).filter(q => q === 'done').length;
    const common = (win ? 30 : 10) + 5 * quests;
    const xp = Object.fromEntries(S.party.map(id => [id, common + 4 * (S.hstats[id]?.kills || 0) + 2 * (S.hstats[id]?.crits || 0) + (S.bonusXp?.[id] || 0)]));
    const stash = Object.fromEntries(Object.entries(S.inv).filter(([k, n]) => n > 0 && st.items[k]?.keep));
    const gains = draft ? Object.fromEntries(S.party.map(id => [id, { xp: win ? xp[id] : 0, level: levelOf(heroProgress(campaign, id).xp), up: 0, why: win ? 'test' : 'defeat' }])) // test : rien n'est enregistré
      : completeStep(S.step, { win, memory: { ...(st.remember?.(g) || {}), ...S.memoryOut }, xp, stash });
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
      { title: 'Application', items: [
        { label: 'Forcer la mise à jour', action: async () => { ui.toast('Mise à jour de tous les fichiers…', 4000); const { hardRefresh } = await import('./pwa.js'); await hardRefresh(); } },
      ] },
      { title: 'Caméra', items: [
        { label: 'Recentrer la vue', action: () => engine.resetCamera() },
        { label: 'Centrer sur le héros actif', action: () => engine.focusFigure(active()) },
      ] },
      { title: 'Table physique', items: [
        { type: 'toggle', label: 'Consignes de mise en place', value: settings.setup, onChange: v => settings.set({ setup: v }) },
        { type: 'toggle', label: 'Conseils du tutoriel', value: settings.tips, onChange: v => settings.set({ tips: v }) },
        { label: 'Revoir les conseils', action: () => { S.tipsSeen = []; save(); settings.set({ tips: true }); ui.toast('Les conseils réapparaîtront.'); } },
        { label: 'Refaire la mise en place de la table', action: () => act(() => fullSetup()) },
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
    await exploreTile(k);
    await revealAround(k);
    const p = placeOf(k); if (p && st.onEnter?.[p]) await st.onEnter[p](g, id);
  }
  settings.subscribe(() => engine.applySettings?.(settings.gfx));
  buildMenu();
  window.__game = { S, R, dialogue, g, map, exploreTile, explored, act, talk, attack, reveal, teleport, interactPlace, endTurn, def, active, moveHero, pathFor };

  // ------------------------------------------------------------------ démarrage
  refreshHUD();
  if (!resumed) {
    for (const p of st.intro || []) await dialogue.narrate(p);
    dialogue.uncover?.(); await sleep(500); // fin du fondu de la narration
    // les premières tuiles tombent du ciel une par une (case de départ d'abord), puis les figurines apparaissent
    const first = [map.start, ...[...revealed].filter(k => k !== map.start)];
    await Promise.all(first.map((k, i) => sleep(i * DROP_GAP).then(() => { sfx.reveal(); return engine.revealTile(k, { focus: false }); })));
    for (const [id, f] of Object.entries(S.figs)) if (f.alive) await engine.addFigure(figData(id), f.tile, { spawn: true });
    R.setupTiles.push(...first); R.setupFigs.push(...Object.keys(S.figs));
    if (poiFor(tileOf(map.start))) R.setupTokens.push(map.start);
    await flushSetup();
    g.questStart(Object.keys(st.quests)[0]);
    await startRound();
  } else {
    ui.toast(`Partie reprise · Manche ${S.round}`, 2200);
    const h = activeDef(); engine.setRingColor?.(parseInt(h.color.slice(1), 16)); select(h.id); engine.focusFigure(h.id); refreshHUD();
    if (resetup) await fullSetup();
  }
  /** Remettre toute la table en place (reprise de partie, table rangée…) */
  async function fullSetup() {
    R.setupTiles.push(...revealed);
    R.setupTokens.push(...[...explored].filter(k => poiFor(tileOf(k))));
    R.setupFigs.push(...Object.keys(S.figs).filter(id => S.figs[id].alive));
    const was = settings.setup; settings.setup = true; await flushSetup(); settings.setup = was;
  }
}
