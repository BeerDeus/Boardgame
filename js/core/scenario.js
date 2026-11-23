// Moteur de jeu coopératif au tour par tour.
// Manche = chaque héros joue (1 déplacement + 1 action), puis Phase des ténèbres (ennemis, glas).
// Exécute STORY sur n'importe quel moteur d'affichage.
import { STORY } from './story.js';
import { buildMap } from './mapgen.js';
import { bfs } from './grid.js';
import { TERRAINS } from './terrains.js';
import { sfx } from './sfx.js';
import { settings, PRESETS } from './settings.js';

const SAVE_V = 5;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function runScenario({ engine, ui, dialogue, engineId, ready }) {
  const st = STORY, grid = engine.grid;
  const seed = +(new URLSearchParams(location.search).get('seed') || 1);
  const saveKey = `grimoire.save.${st.id}.${engineId}.${seed}`;
  const map = buildMap(grid, st, seed);
  const tileOf = k => map.tiles.get(k);
  const placeOf = k => tileOf(k)?.place;
  const placeDef = id => st.places.find(p => p.id === id);
  const def = id => st.heroes.find(h => h.id === id) || st.cast.find(c => c.id === id);
  const figData = id => { const d = def(id); return { id, name: d.name, kind: d.kind, color: d.color, base: d.base || d.color, team: d.team || 'hero', idle: d.idle }; };

  // ------------------------------------------------------------------ état / sauvegarde
  let S = null;
  try { const raw = JSON.parse(localStorage.getItem(saveKey)); if (raw?.v === SAVE_V && !raw.ended) S = raw; } catch {}
  const resumed = !!S;
  const initRevealed = new Set(S ? S.revealed : [map.start, ...grid.neighbors(map.start)]);
  const poiFor = t => { if (!t.poi || !t.place) return null; const acts = placeDef(t.place).activities || []; return acts.some(a => !(a.once && (S?.done || []).includes(a.id))) ? t.poi : null; };
  for (const t of map.tiles.values()) engine.addTile({ ...t, label: TERRAINS[t.terrain].label, revealed: initRevealed.has(t.key), poi: poiFor(t) });
  engine.resetCamera(true);
  ready?.();
  if (!S) {
    const pick = await ui.partySelect({ heroes: st.heroes, difficulties: st.glasMax });
    S = { v: SAVE_V, party: pick.party, difficulty: pick.difficulty, glasMax: st.glasMax[pick.difficulty], glas: 0, round: 0, turn: 0, used: { move: false, action: false },
      revealed: [map.start, ...grid.neighbors(map.start)], figs: {}, flags: {}, inv: {}, quests: {}, seen: {}, done: [], counters: {}, mounted: false, tod: 'dusk',
      ended: false, ko: [], stats: { kills: 0, dice: 0, ko: 0, turns: 0, t0: Date.now() } };
    for (const id of S.party) S.figs[id] = { tile: map.start, hp: def(id).hp, alive: true };
    for (const c of st.cast) if (!c.hidden && !c.spawnOn) S.figs[c.id] = { tile: map.placeKey[c.place], hp: c.hp || 1, alive: true };
  }
  const revealed = new Set(S.revealed);
  const save = () => { S.revealed = [...revealed]; try { localStorage.setItem(saveKey, JSON.stringify(S)); } catch {} };
  const R = { reach: new Map(), explore: new Set(), busy: false, marks: new Set() };

  // ------------------------------------------------------------------ figurines
  for (const [id, f] of Object.entries(S.figs)) if (f.alive) await engine.addFigure(figData(id), f.tile, { spawn: false });
  if (S.tod === 'night') engine.setTimeOfDay('night');
  engine.applySettings?.(settings.gfx); engine.setFinish?.(settings.finish);

  const party = () => S.party.map(def);
  const heroes = () => party().filter(h => S.figs[h.id]?.alive);
  const active = () => S.party[S.turn];
  const activeDef = () => def(active());
  const enemies = () => Object.entries(S.figs).filter(([id, f]) => f.alive && ['enemy', 'boss'].includes(def(id).team)).map(([id, f]) => ({ id, ...f }));
  const enemiesOn = k => enemies().some(e => e.tile === k);
  const moveOf = id => def(id).move + (id === 'aldric' && S.mounted ? 2 : 0);

  // ------------------------------------------------------------------ HUD
  function refreshHUD() {
    const a = active();
    ui.setParty(party().map(h => ({ ...h, hp: S.figs[h.id].hp, max: h.hp, ko: !S.figs[h.id].alive, mounted: h.id === 'aldric' && S.mounted, turn: h.id === a })), id => { engine.focusFigure(id); if (id !== a) ui.toast(`${def(id).name} attend son tour.`); });
    ui.setActive(a);
    ui.setTurnHUD({ round: S.round, hero: activeDef(), used: S.used, glas: S.glas, glasMax: S.glasMax, night: S.tod === 'night' });
    ui.setInventory(Object.entries(S.inv).filter(([, n]) => n > 0).map(([k, n]) => ({ id: k, n, ...st.items[k] })), useItem);
    ui.setJournal(Object.entries(S.quests).map(([id, s]) => ({ id, ...st.quests[id], done: s === 'done' })), `Faire taire la cloche avant le ${S.glasMax}ᵉ glas`);
    refreshMarks(); refreshActions();
  }
  function refreshMarks() {
    const want = new Set(Object.entries(S.quests).filter(([, s]) => s === 'active').map(([id]) => map.placeKey[st.quests[id].target]).filter(Boolean));
    for (const k of R.marks) if (!want.has(k)) engine.mark?.(k, false);
    for (const k of want) if (!R.marks.has(k)) engine.mark?.(k, true);
    R.marks = want;
  }
  function placeActivities(key) {
    const pd = placeDef(placeOf(key)); if (!pd?.activities) return [];
    return pd.activities.filter(a => !(a.once && S.done.includes(a.id))).map(a => {
      let disabled = null;
      if (a.cond && !a.cond(g)) disabled = `Requiert : ${a.need || '?'}`;
      else if (a.blockedByEnemies && enemiesOn(key)) disabled = 'Des ennemis bloquent l\'accès';
      return { ...a, disabled };
    });
  }
  function refreshActions() {
    const id = active(), f = S.figs[id];
    if (!f?.alive || S.ended) { ui.setActions([]); return; }
    const acts = [], acts2 = placeActivities(f.tile);
    if (acts2.length) acts.push({ icon: '⌘', label: 'Lieu', disabled: S.used.action, action: () => act(() => interactPlace()) });
    if (id === 'ysolde') acts.push({ icon: '✺', label: 'Lueur', disabled: S.used.action, action: () => act(() => glow(id)) });
    if (id === 'aldric' && S.figs.destrier?.tile === f.tile) acts.push({ icon: '♞', label: S.mounted ? 'Pied à terre' : 'En selle', action: () => act(() => toggleMount()) });
    acts.push({ icon: '⏭', label: 'Fin du tour', primary: true, pulse: S.used.move && S.used.action, action: () => act(() => endTurn()) });
    ui.setActions(acts);
  }

  // ------------------------------------------------------------------ API exposée au scénario
  const g = {
    flag: k => !!S.flags[k], set: (k, v = true) => { S.flags[k] = v; },
    has: k => (S.inv[k] || 0) > 0,
    give(k, n = 1) { S.inv[k] = (S.inv[k] || 0) + n; ui.toast(`Obtenu : <b>${st.items[k].icon} ${st.items[k].name}</b>${n > 1 ? ' ×' + n : ''}`, 2600); sfx.success(); refreshHUD(); },
    take(k) { S.inv[k] = Math.max(0, (S.inv[k] || 0) - 1); refreshHUD(); },
    questActive: id => S.quests[id] === 'active',
    questStart(id) { if (S.quests[id]) return; S.quests[id] = 'active'; ui.toast(`Nouvel objectif : <b>${st.quests[id].title}</b>`, 2800); sfx.ui(); refreshHUD(); },
    questDone(id) { if (S.quests[id] === 'done') return; S.quests[id] = 'done'; ui.toast(`✓ <b>${st.quests[id].title}</b>`, 2400); sfx.success(); refreshHUD(); },
    gotKey: () => st.gotKey(g),
    toast: (m, ms) => ui.toast(m, ms),
    narrate: o => dialogue.narrate(o),
    bell() { sfx.bell(); engine.shake?.(0.03); },
    night() { if (S.tod === 'night') return; S.tod = 'night'; engine.setTimeOfDay('night'); refreshHUD(); },
    enemiesAt: place => enemiesOn(map.placeKey[place]),
    alive: id => !!S.figs[id]?.alive,
    inc: k => (S.counters[k] = (S.counters[k] || 0) + 1),
    async test(skill, label, mod = 0) {
      const h = activeDef(), base = h.skills[skill] ?? 30, chance = Math.max(5, Math.min(95, base + mod));
      S.stats.dice++;
      const r = await ui.rollD100({ chance, label: `${h.name} — ${label}`, detail: `${st.skillNames[skill]} ${base} %${mod ? ` ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}` : ''}`, color: h.color });
      return r.ok;
    },
    glas(n) {
      S.glas = Math.min(S.glasMax, Math.max(0, S.glas + n)); ui.setGlas?.(S.glas, S.glasMax, n);
      if (n > 0) g.bell();
      refreshHUD();
    },
    revealPlace: id => reveal(map.placeKey[id]),
    spawn,
    async spawnWave(tag) { for (const c of st.cast) if (c.spawnOn === tag) await spawn(c.id); },
    async sendHome(id) {
      const f = S.figs[id], home = map.start;
      const p = bfs(grid, f.tile, k => revealed.has(k)).pathTo(home);
      if (p && p.length > 1) { engine.animate?.(id, 'idle', { loop: true }); await engine.moveFigure(id, p, { follow: false }); f.tile = home; }
      else { await engine.removeFigure(id, { animate: false }); f.tile = home; await engine.addFigure(figData(id), home, { spawn: true }); engine.animate?.(id, 'idle', { loop: true }); }
      g.set('tobieHome');
    },
    async restHere() {
      const k = S.figs[active()].tile;
      for (const h of heroes()) if (S.figs[h.id].tile === k) { S.figs[h.id].hp = h.hp; ui.floatText(engine.screenPos(h.id), 'PV max', '#8fe07a'); }
      sfx.success(); refreshHUD();
    },
    dialogue: (id, npc) => talkScript(id, npc),
    async victory() { await finish(true); },
  };

  // ------------------------------------------------------------------ déroulement des manches
  async function startRound() {
    S.round++; S.stats.turns++;
    // les héros tombés reviennent à Grisval
    for (const id of S.ko) { const f = S.figs[id]; Object.assign(f, { alive: true, hp: def(id).hp, tile: map.start }); await engine.addFigure(figData(id), map.start, { spawn: true }); ui.toast(`${def(id).name} revient à Grisval, soigné par Maud.`); }
    S.ko = [];
    await ui.turnBanner({ title: `Manche ${S.round}`, subtitle: `Glas ${S.glas} / ${S.glasMax}`, color: '#c9a45c' });
    await startTurn(0);
  }
  async function startTurn(i) {
    while (i < S.party.length && !S.figs[S.party[i]]?.alive) i++;
    if (i >= S.party.length) return worldPhase();
    S.turn = i; S.used = { move: false, action: false }; save();
    const h = activeDef();
    engine.setRingColor?.(parseInt(h.color.slice(1), 16));
    select(h.id); engine.focusFigure(h.id);
    await ui.turnBanner({ title: `Au tour de ${h.name}`, subtitle: `${h.role} · 1 déplacement + 1 action`, color: h.color, kind: h.kind });
    refreshHUD();
  }
  async function endTurn() {
    engine.highlight([], []);
    await startTurn(S.turn + 1);
    return false;
  }
  async function worldPhase() {
    engine.setSelected(null); engine.highlight([], []);
    await ui.turnBanner({ title: 'Phase des ténèbres', subtitle: 'La cloche sonne…', color: '#8a1c1c', dark: true });
    // ennemis
    for (const en of enemies()) { if (S.ended) return; await enemyAct(en.id); }
    if (S.ended) return;
    // le glas
    const before = S.glas, extra = S.figs.sonneur?.alive ? 1 : 0;
    g.glas(1 + extra);
    ui.toast(extra ? 'Le Sonneur frappe la cloche : <b>+2 glas</b>' : `La cloche sonne : <b>glas ${S.glas}/${S.glasMax}</b>`, 2600);
    await sleep(900);
    for (let n = before + 1; n <= S.glas; n++) if (st.glasEvents[n]) await st.glasEvents[n](g);
    if (S.glasMax - S.glas === 2) ui.toast('⚠ Plus que <b>2 glas</b> avant la fin !', 3200);
    if (S.glas >= S.glasMax) return finish(false);
    save();
    await startRound();
  }

  // ------------------------------------------------------------------ sélection / portée
  function computeReach() {
    R.reach.clear(); R.explore.clear();
    const id = active(), f = S.figs[id]; if (!f?.alive || S.used.move) return;
    const mv = moveOf(id);
    const { dist } = bfs(grid, f.tile, k => revealed.has(k), mv);
    for (const [k, d] of dist) {
      if (d > 0) R.reach.set(k, d);
      if (d < mv) for (const n of grid.neighbors(k)) if (!revealed.has(n)) R.explore.add(n);
    }
  }
  function select(id) { engine.setSelected(id); computeReach(); engine.highlight([...R.reach.keys()], [...R.explore]); }
  const pathFor = (from, to, max = 9) => bfs(grid, from, k => revealed.has(k) || k === to, max).pathTo(to);

  // ------------------------------------------------------------------ actions
  async function moveHero(id, path) {
    if (!path || path.length < 2) return;
    engine.highlight([], []);
    const f = S.figs[id], last = path[path.length - 1];
    const ride = id === 'aldric' && S.mounted && S.figs.destrier;
    await Promise.all([engine.moveFigure(id, path, { follow: true }), ride ? engine.moveFigure('destrier', path, { follow: false }) : null]);
    f.tile = last; if (ride) S.figs.destrier.tile = last;
    const pl = placeOf(last); if (pl && st.onEnter[pl]) await st.onEnter[pl](g, id);
  }
  async function reveal(key, { focus = true } = {}) {
    if (revealed.has(key)) return;
    revealed.add(key); sfx.reveal();
    await engine.revealTile(key, { focus });
    const pl = placeOf(key);
    if (pl) for (const c of st.cast) if (c.place === pl && c.hidden && !S.figs[c.id]) await spawn(c.id);
    if (pl && st.onReveal[pl]) await st.onReveal[pl](g);
    save();
  }
  async function spawn(id) {
    const c = def(id), key = map.placeKey[c.place]; if (S.figs[id]) return;
    S.figs[id] = { tile: key, hp: c.hp || 1, alive: true };
    if (!revealed.has(key)) await reveal(key, { focus: false });
    await engine.addFigure(figData(id), key, { spawn: true });
  }
  async function explore(key) {
    const id = active(), f = S.figs[id];
    const adj = grid.neighbors(key).filter(n => n === f.tile || R.reach.has(n)).sort((a, b) => (R.reach.get(a) || 0) - (R.reach.get(b) || 0));
    if (!adj.length) return;
    if (adj[0] !== f.tile) await moveHero(id, pathFor(f.tile, adj[0]));
    const t = tileOf(key);
    ui.toast(`<b>${t.name}</b> · ${TERRAINS[t.terrain].label}`);
    await reveal(key);
    if (!enemiesOn(key)) await moveHero(id, [f.tile, key]); else ui.toast('⚔ Embuscade ! Vous restez à la lisière.', 2200);
    const pd = placeDef(placeOf(key));
    if (pd?.desc && f.tile === key) ui.toast(pd.desc, 4200);
  }
  async function interactPlace() {
    if (S.used.action) { ui.toast('Action déjà utilisée ce tour.'); return; }
    const k = S.figs[active()].tile, pd = placeDef(placeOf(k));
    const n = await ui.locationPanel({
      title: pd.name, desc: pd.desc, hero: activeDef(),
      list: () => placeActivities(k),
      run: async a => { await a.run(g); if (a.once) { S.done.push(a.id); if (!poiFor(tileOf(k))) engine.setPoi?.(k, null); } save(); },
    });
    if (n > 0) S.used.action = true;
  }
  async function glow(id) {
    const f = S.figs[id], hidden = grid.neighbors(f.tile).filter(k => !revealed.has(k));
    if (!hidden.length) { ui.toast('La lueur ne révèle rien de nouveau.'); return; }
    sfx.magic(); engine.animate?.(id, 'cast');
    await Promise.all(hidden.map((k, i) => sleep(i * 120).then(() => reveal(k, { focus: false }))));
    S.used.action = true;
  }
  async function toggleMount() {
    S.mounted = !S.mounted;
    ui.toast(S.mounted ? 'Aldric monte en selle : <b>déplacement 5</b>.' : 'Aldric met pied à terre.');
    await engine.bump('destrier', null);
  }
  function useItem(item) {
    const it = st.items[item];
    if (item !== 'herbes') { ui.toast(`${it.icon} <b>${it.name}</b> — ${it.desc}`, 3200); return; }
    const id = active(), f = S.figs[id], h = def(id);
    if (!f?.alive || f.hp >= h.hp) { ui.toast(`${h.name} n'a pas besoin de soins.`); return; }
    g.take('herbes'); f.hp = Math.min(h.hp, f.hp + 3); ui.floatText(engine.screenPos(id), '+3', '#8fe07a'); sfx.magic(); refreshHUD(); save();
  }

  // ------------------------------------------------------------------ combat (placeholder D100)
  const distTo = (from, to, max) => bfs(grid, from, k => revealed.has(k), max).dist.get(to);
  async function attack(heroId, enemyId) {
    const h = def(heroId), e = def(enemyId), ef = S.figs[enemyId];
    S.stats.dice++;
    const chance = Math.max(5, Math.min(95, h.skills.combat - e.def));
    const { ok, crit } = await ui.rollD100({ chance, label: `${h.name} → ${e.name}`, detail: `${h.combatName} ${h.skills.combat} % − défense ${e.def} %`, color: h.color });
    if (h.range > 1) { sfx.magic(); engine.animate?.(heroId, 'cast'); await sleep(500); } else await engine.bump(heroId, enemyId);
    S.used.action = true;
    if (!ok) { ui.floatText(engine.screenPos(enemyId), 'Raté', '#cfc6b0'); return; }
    let dmg = h.dmg * (crit ? 2 : 1); if (e.undead && g.has('eau')) dmg++;
    sfx.hit(); ef.hp -= dmg; ui.floatText(engine.screenPos(enemyId), `-${dmg}${crit ? ' !' : ''}`, '#ff6a4a');
    if (ef.hp <= 0) { ef.alive = false; S.stats.kills++; await engine.removeFigure(enemyId, { animate: true }); await st.onDefeat[enemyId]?.(g); }
  }
  async function enemyAct(eid) {
    const ef = S.figs[eid], ed = def(eid); if (!ef.alive) return;
    const { dist, pathTo } = bfs(grid, ef.tile, k => revealed.has(k), 3);
    let best = null;
    for (const h of heroes()) { const d = dist.get(S.figs[h.id].tile); if (d != null && (!best || d < best.d)) best = { id: h.id, d }; }
    if (!best || best.d > 2) return;
    if (best.d > 0 && !ed.static) {
      const next = pathTo(S.figs[best.id].tile)[1];
      await engine.moveFigure(eid, [ef.tile, next], { follow: false }); ef.tile = next; best.d--;
    }
    if (best.d !== 0) return;
    const h = def(best.id), hf = S.figs[best.id];
    engine.focusFigure(best.id, { soft: true });
    S.stats.dice++;
    const chance = Math.max(5, Math.min(95, ed.atk - h.armor));
    const { ok } = await ui.rollD100({ chance, label: `${ed.name} attaque ${h.name}`, detail: `Attaque ${ed.atk} % − armure ${h.armor} % · lancez pour l'ennemi`, color: '#8a1c1c', enemy: true });
    await engine.bump(eid, best.id);
    if (!ok) { ui.floatText(engine.screenPos(best.id), 'Paré', '#cfc6b0'); return; }
    sfx.hit(); hf.hp -= 1; ui.floatText(engine.screenPos(best.id), '-1', '#ff6a4a'); refreshHUD();
    if (hf.hp <= 0) {
      hf.alive = false; S.stats.ko++; S.ko.push(best.id);
      if (best.id === 'aldric') S.mounted = false;
      await engine.removeFigure(best.id, { animate: true });
      ui.toast(`${h.name} tombe ! Il reviendra à Grisval à la prochaine manche. <b>+1 glas</b>`, 3200);
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
    await st.afterTalk[dlgId]?.(g);
  }
  async function talk(npcId) {
    const hid = active(), hf = S.figs[hid], nf = S.figs[npcId], n = def(npcId);
    const id = st.talk[npcId]?.(g);
    if (!id) { ui.toast(st.idleLine[npcId]?.(g) || `${n.name} n'a rien à dire.`); return; }
    const same = hf.tile === nf.tile;
    const p = same ? null : pathFor(hf.tile, nf.tile);
    const canGo = !same && !S.used.move && p && p.length - 1 <= moveOf(hid);
    if (S.used.action) { ui.toast('Action déjà utilisée ce tour.'); return; }
    if (!same && !canGo) { ui.toast(`${n.name} est trop loin (${S.used.move ? 'déplacement déjà utilisé' : 'hors de portée'}).`); engine.focusFigure(npcId, { soft: true }); return; }
    const ok = await ui.confirm({ title: `Parler à ${n.name} ?`, text: `${n.role || ''}${same ? '' : '<br><b>Se déplacer jusqu\'à lui/elle</b> (utilise le déplacement)'}<br><small>Utilise l'action du tour.</small>`, portrait: { kind: n.kind, color: n.color }, ok: 'Parler', cancel: 'Annuler' });
    if (!ok) return;
    if (!same) { await moveHero(hid, p); S.used.move = true; }
    S.used.action = true;
    await talkScript(id, npcId);
  }

  // ------------------------------------------------------------------ entrées
  async function act(fn) {
    if (R.busy || dialogue.open || S.ended) return;
    R.busy = true; ui.setBusy(true);
    let changedTurn = false;
    try { const r = await fn(); changedTurn = r === false; }
    catch (e) { console.error(e); }
    finally {
      R.busy = false; ui.setBusy(false); save();
      if (!S.ended && !changedTurn && S.figs[active()]?.alive) select(active());
      refreshHUD();
    }
  }
  engine.onTap = hit => {
    if (R.busy || dialogue.open || S.ended) return;
    const a = active(), af = S.figs[a];
    if (hit.type === 'figure') {
      const id = hit.id, tm = def(id)?.team; if (!S.figs[id]?.alive) return;
      if (tm === 'hero') { engine.focusFigure(id, { soft: true }); if (id !== a) ui.toast(`C'est au tour de <b>${def(a).name}</b>.`); return; }
      if (tm === 'npc') return act(() => talk(id));
      if (tm === 'enemy' || tm === 'boss') {
        if (S.used.action) { ui.toast('Action déjà utilisée ce tour.'); return; }
        const h = def(a), d = distTo(af.tile, S.figs[id].tile, h.range);
        if (d == null) { ui.toast(`Hors de portée (portée ${h.range}).`); engine.focusFigure(id, { soft: true }); return; }
        return act(async () => {
          const e = def(id), chance = Math.max(5, Math.min(95, h.skills.combat - e.def));
          const ok = await ui.confirm({ title: `Attaquer ${e.name} ?`, text: `PV ${S.figs[id].hp} · Chance de toucher <b>${chance} %</b><br><small>Utilise l'action du tour.</small>`, portrait: { kind: e.kind, color: e.color }, ok: 'Attaquer', cancel: 'Annuler', danger: true });
          if (ok) await attack(a, id);
        });
      }
      if (tm === 'mount') {
        if (a === 'aldric' && af.tile === S.figs.destrier.tile) return act(() => toggleMount());
        ui.toast('Le destrier n\'obéit qu\'à Aldric.'); return;
      }
    }
    if (hit.type === 'poi' || hit.type === 'tile') {
      const k = hit.key, t = tileOf(k);
      if (k === af.tile && placeActivities(k).length) return act(() => interactPlace());
      if (hit.type === 'poi' && revealed.has(k) && k !== af.tile) { ui.toast(`${t.poi?.icon || ''} ${t.poi?.label || ''} — rendez-vous sur place pour interagir.`); }
      if (R.reach.has(k)) return act(async () => { await moveHero(a, pathFor(af.tile, k)); S.used.move = true; });
      if (R.explore.has(k)) return act(async () => { await explore(k); S.used.move = true; });
      if (S.used.move && k !== af.tile) ui.toast('Déplacement déjà utilisé ce tour.');
      engine.focusTile(k);
      if (!(S.used.move && k !== af.tile)) ui.toast(revealed.has(k) ? `<b>${t.name}</b> · ${TERRAINS[t.terrain].label}` : 'Région inexplorée');
    }
  };
  engine.onLongPress = k => {
    const t = tileOf(k); if (!t) return;
    const who = Object.entries(S.figs).filter(([, f]) => f.alive && f.tile === k).map(([id]) => def(id).name).join(', ');
    ui.toast(revealed.has(k) ? `<b>${t.name}</b> (${TERRAINS[t.terrain].label})${who ? '<br>' + who : ''}` : 'Région inexplorée', 3200);
  };
  engine.onFps = n => ui.setFps(n);
  ui.onKey = { select: i => { const h = party()[i]; if (h) engine.focusFigure(h.id); }, focus: () => engine.focusFigure(active()), deselect: () => {}, endTurn: () => act(() => endTurn()) };

  // ------------------------------------------------------------------ fin de partie
  async function finish(win) {
    if (S.ended) return; S.ended = true; save();
    await sleep(700);
    if (win) { sfx.bell(); for (const h of heroes()) engine.animate?.(h.id, 'cheer'); await sleep(1200); }
    await dialogue.narrate(win ? st.victoryText : st.defeatText);
    const s = S.stats, mins = Math.round((Date.now() - s.t0) / 60000);
    ui.endScreen({
      title: win ? 'Victoire !' : 'Défaite', subtitle: `${st.title} — ${S.party.map(id => def(id).name).join(', ')}`,
      stats: [['Manches jouées', S.round], ['Glas', `${S.glas} / ${S.glasMax}`], ['Tuiles explorées', `${revealed.size} / ${grid.cells.length}`], ['Ennemis vaincus', s.kills], ['Jets de dés', s.dice], ['Chutes', s.ko], ['Durée réelle', `${mins} min`]],
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
        { label: 'Relire l\'introduction', action: async () => { for (const p of st.intro) await dialogue.narrate(p); } },
        { label: 'Nouvelle partie (choix des héros)', action: () => { if (confirm('Effacer la progression de ce moteur ?')) { localStorage.removeItem(saveKey); location.reload(); } } },
        { label: 'Carte procédurale (nouvelle graine)', action: () => { const u = new URL(location.href); u.searchParams.set('seed', String(2 + Math.floor(Math.random() * 9999))); location.href = u; } },
        ...(seed !== 1 ? [{ label: 'Revenir à la carte du scénario', action: () => { const u = new URL(location.href); u.searchParams.delete('seed'); location.href = u; } }] : []),
      ] },
      { title: 'Caméra', items: [
        { label: 'Recentrer la vue', action: () => engine.resetCamera() },
        { label: 'Centrer sur le héros actif', action: () => engine.focusFigure(active()) },
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
      ] },
      { title: 'Audio', items: [
        { type: 'seg', label: 'Volume', value: settings.volume, options: [{ label: '0', value: 0 }, { label: '30', value: 0.3 }, { label: '70', value: 0.7 }, { label: '100', value: 1 }], onChange: v => settings.set({ volume: v }) },
        { type: 'toggle', label: 'Vent d\'ambiance', value: settings.music, onChange: v => settings.set({ music: v }) },
        { type: 'toggle', label: 'Vibrations', value: settings.haptics, onChange: v => settings.set({ haptics: v }) },
      ] },
      ...(engine.menu || []),
      { title: 'Debug (tests)', items: [
        { label: 'Révéler toute la carte', action: () => act(async () => { const ks = grid.cells.filter(x => !revealed.has(x.key)).map(x => x.key); engine.resetCamera(); await Promise.all(ks.map((k, i) => sleep(i * 50).then(() => reveal(k, { focus: false })))); }) },
        { label: 'Rendre déplacement + action', action: () => { S.used = { move: false, action: false }; select(active()); refreshHUD(); } },
        ...['clairiere', 'marais', 'chapelle', 'abbaye', 'grisval'].map(pl => ({ label: `→ Téléporter le héros actif : ${placeDef(pl).name}`, action: () => act(() => teleport(pl)) })),
        { label: 'Donner tous les objets', action: () => { for (const k of ['piece', 'herbe_lune', 'huile', 'psautier', 'eau', 'cle']) if (!g.has(k)) g.give(k); g.set('gotKey'); save(); } },
      ] },
    ]);
  }
  async function teleport(pl) {
    const k = map.placeKey[pl], id = active(), f = S.figs[id];
    if (!revealed.has(k)) await reveal(k);
    if (f.tile !== k) { await engine.moveFigure(id, [f.tile, k], { follow: true }); f.tile = k; }
    if (id === 'aldric' && S.mounted) { await engine.moveFigure('destrier', [S.figs.destrier.tile, k], { follow: false }); S.figs.destrier.tile = k; }
    const p = placeOf(k); if (p && st.onEnter[p]) await st.onEnter[p](g, id);
  }
  settings.subscribe(() => engine.applySettings?.(settings.gfx));
  buildMenu();
  window.__game = { S, R, dialogue, g, map, act, talk, attack, reveal, teleport, interactPlace, endTurn, def, active, enemyAct, talkScript };

  // ------------------------------------------------------------------ démarrage
  engine.resetCamera(true);
  refreshHUD();
  if (!resumed) {
    for (const p of st.intro) await dialogue.narrate(p);
    g.questStart('aide');
    await startRound();
  } else {
    ui.toast(`Partie reprise · Manche ${S.round}`, 2200);
    const h = activeDef(); engine.setRingColor?.(parseInt(h.color.slice(1), 16)); select(h.id); engine.focusFigure(h.id); refreshHUD();
  }
}
