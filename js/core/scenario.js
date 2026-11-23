// Moteur de jeu (logique) : exécute STORY sur n'importe quel moteur d'affichage.
// Quêtes, horloge, combat aux dés, inventaire, monture, IA ennemie, sauvegarde auto.
import { STORY } from './story.js';
import { buildMap } from './mapgen.js';
import { bfs } from './grid.js';
import { TERRAINS } from './terrains.js';
import { sfx } from './sfx.js';
import { settings, PRESETS } from './settings.js';

const SAVE_V = 3;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtTime = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}h${String(m % 60).padStart(2, '0')}`;

export async function runScenario({ engine, ui, dialogue, engineId }) {
  const st = STORY, grid = engine.grid;
  const seed = +(new URLSearchParams(location.search).get('seed') || 1);
  const saveKey = `grimoire.save.${st.id}.${engineId}.${seed}`;
  const map = buildMap(grid, st, seed);
  const tileOf = k => map.tiles.get(k);
  const placeOf = k => tileOf(k)?.place;
  const def = id => st.heroes.find(h => h.id === id) || st.cast.find(c => c.id === id);
  const figData = id => { const d = def(id); return { id, name: d.name, kind: d.kind, color: d.color, team: d.team }; };

  // ------------------------------------------------------------------ état
  const fresh = () => {
    const S = { v: SAVE_V, time: st.startTime, revealed: [map.start, ...grid.neighbors(map.start)], figs: {}, flags: {}, inv: {}, quests: {}, seen: {},
      poiUsed: [], mounted: false, cd: 0, tod: 'dusk', ended: false, stats: { steps: 0, kills: 0, dice: 0, ko: 0, t0: Date.now() } };
    for (const h of st.heroes) S.figs[h.id] = { tile: map.start, hp: h.hp, alive: true };
    for (const c of st.cast) if (!c.hidden && !c.spawnOn) S.figs[c.id] = { tile: map.placeKey[c.place], hp: c.hp || 1, alive: true };
    return S;
  };
  let S = null;
  try { const raw = JSON.parse(localStorage.getItem(saveKey)); if (raw?.v === SAVE_V && !raw.ended) S = raw; } catch {}
  const resumed = !!S; S ||= fresh();
  const revealed = new Set(S.revealed);
  const save = () => { S.revealed = [...revealed]; try { localStorage.setItem(saveKey, JSON.stringify(S)); } catch {} };
  const R = { reach: new Map(), explore: new Set(), busy: false, selected: null, marks: new Set() };

  // ------------------------------------------------------------------ construction
  for (const t of map.tiles.values())
    engine.addTile({ ...t, label: TERRAINS[t.terrain].label, revealed: revealed.has(t.key), poi: t.poi && !S.poiUsed.includes(t.poi.id) ? t.poi : null });
  for (const [id, f] of Object.entries(S.figs)) if (f.alive) await engine.addFigure(figData(id), f.tile, { spawn: false });
  if (S.tod === 'night') engine.setTimeOfDay('night');
  engine.applySettings?.(settings.gfx);
  engine.setFinish?.(settings.finish);

  const heroes = () => st.heroes.filter(h => S.figs[h.id]?.alive);
  const enemies = () => Object.entries(S.figs).filter(([id, f]) => f.alive && ['enemy', 'boss'].includes(def(id).team)).map(([id, f]) => ({ id, ...f }));
  const moveOf = id => def(id).move + (id === 'aldric' && S.mounted ? 2 : 0);

  // ------------------------------------------------------------------ HUD
  function refreshHUD() {
    ui.setParty(st.heroes.map(h => ({ ...h, hp: S.figs[h.id].hp, max: h.hp, ko: !S.figs[h.id].alive, mounted: h.id === 'aldric' && S.mounted })), id => { if (S.figs[id].alive) { select(id); engine.focusFigure(id); } });
    ui.setActive(R.selected);
    ui.setClock(fmtTime(S.time), S.tod === 'night');
    ui.setInventory(Object.entries(S.inv).filter(([, n]) => n > 0).map(([k, n]) => ({ id: k, n, ...st.items[k] })), useItem);
    ui.setJournal(Object.entries(S.quests).map(([id, s]) => ({ id, ...st.quests[id], done: s === 'done' })));
    refreshMarks(); refreshActions();
  }
  function refreshMarks() {
    const want = new Set(Object.entries(S.quests).filter(([, s]) => s === 'active').map(([id]) => map.placeKey[st.quests[id].target]).filter(Boolean));
    for (const k of R.marks) if (!want.has(k)) engine.mark?.(k, false);
    for (const k of want) if (!R.marks.has(k)) engine.mark?.(k, true);
    R.marks = want;
  }
  function refreshActions() {
    const id = R.selected, f = id && S.figs[id];
    if (!f || S.ended) { ui.setActions([]); return; }
    const t = tileOf(f.tile), acts = [];
    if (t.poi && !S.poiUsed.includes(t.poi.id) && t.poi.id !== 'inn') acts.push({ icon: t.poi.icon, label: 'Fouiller', action: () => act(() => doPoi(f.tile, id)) });
    if (t.place === 'grisval') acts.push({ icon: '⌂', label: 'Se reposer', action: () => act(() => rest()) });
    if (id === 'ysolde') acts.push({ icon: '✺', label: S.cd > 0 ? `Lueur (${S.cd})` : 'Lueur', disabled: S.cd > 0, action: () => act(() => glow(id)) });
    if (id === 'aldric' && S.figs.destrier?.tile === f.tile) acts.push({ icon: '♞', label: S.mounted ? 'Pied à terre' : 'Monter en selle', action: () => act(() => toggleMount()) });
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
    gotKey() { g.give('cle'); g.set('gotKey'); g.questDone('cle'); g.questStart('portail'); },
    toast: (m, ms) => ui.toast(m, ms),
    narrate: o => dialogue.narrate(o),
    bell() { sfx.bell(); engine.shake?.(0.03); },
    night() { if (S.tod === 'night') return; S.tod = 'night'; engine.setTimeOfDay('night'); refreshHUD(); },
    enemiesAt: place => enemies().some(e => e.tile === map.placeKey[place]),
    async roll(label, chance) { S.stats.dice++; const r = await ui.rollD100({ label, chance }); return r.ok; },
    revealPlace: id => reveal(map.placeKey[id]),
    spawn,
    async sendHome(id) {
      const f = S.figs[id], home = map.start;
      const p = bfs(grid, f.tile, k => revealed.has(k)).pathTo(home);
      if (p && p.length > 1) { await engine.moveFigure(id, p, { follow: false }); f.tile = home; }
      else { await engine.removeFigure(id, { animate: true }); f.tile = home; await engine.addFigure(figData(id), home, { spawn: true }); }
      g.set('tobieHome');
    },
    rest, dialogue: (id, npc) => talkScript(id, npc),
    async end() { S.ended = true; save(); await sleep(600); await dialogue.narrate(st.ending); showEnd(); },
  };

  // ------------------------------------------------------------------ temps
  function advance(min) {
    const h0 = Math.floor(S.time / 60); S.time += min; const h1 = Math.floor(S.time / 60);
    if (h1 > h0 && !S.ended && !S.quests.cloche?.startsWith?.('done')) { g.bell(); ui.toast(`La cloche de Saint-Ombre sonne ${((h1 - 1) % 12) + 1} coups…`, 2400); }
    if (S.time >= st.nightAt) g.night();
    S.cd = Math.max(0, S.cd - Math.round(min / st.minutesPerStep));
  }

  // ------------------------------------------------------------------ sélection / portée
  function computeReach() {
    R.reach.clear(); R.explore.clear();
    const f = S.figs[R.selected]; if (!f?.alive) return;
    const mv = moveOf(R.selected);
    const { dist } = bfs(grid, f.tile, k => revealed.has(k), mv);
    for (const [k, d] of dist) {
      if (d > 0) R.reach.set(k, d);
      if (d < mv) for (const n of grid.neighbors(k)) if (!revealed.has(n)) R.explore.add(n);
    }
  }
  function select(id) {
    R.selected = id; engine.setSelected(id); computeReach();
    engine.highlight([...R.reach.keys()], [...R.explore]); refreshHUD();
  }
  const pathFor = (from, to, max = 8) => bfs(grid, from, k => revealed.has(k) || k === to, max).pathTo(to);

  // ------------------------------------------------------------------ actions
  async function moveHero(id, path) {
    if (!path || path.length < 2) return;
    engine.highlight([], []);
    const f = S.figs[id], last = path[path.length - 1];
    const ride = id === 'aldric' && S.mounted && S.figs.destrier;
    await Promise.all([engine.moveFigure(id, path, { follow: true }), ride ? engine.moveFigure('destrier', path, { follow: false }) : null]);
    f.tile = last; if (ride) S.figs.destrier.tile = last;
    S.stats.steps += path.length - 1; advance((path.length - 1) * st.minutesPerStep);
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
    if (!revealed.has(key)) await reveal(key);
    await engine.addFigure(figData(id), key, { spawn: true });
  }
  async function explore(key) {
    const id = R.selected, f = S.figs[id];
    const adj = grid.neighbors(key).filter(n => n === f.tile || R.reach.has(n)).sort((a, b) => (R.reach.get(a) || 0) - (R.reach.get(b) || 0));
    if (!adj.length) return;
    if (adj[0] !== f.tile) await moveHero(id, pathFor(f.tile, adj[0]));
    const t = tileOf(key);
    ui.toast(`<b>${t.name}</b> · ${TERRAINS[t.terrain].label}`);
    await reveal(key); advance(st.minutesPerStep);
    if (!enemies().some(e => e.tile === key)) await moveHero(id, [f.tile, key]);
    else ui.toast('⚔ Embuscade !', 2000);
  }
  async function doPoi(key, heroId) {
    const t = tileOf(key); if (!t.poi || S.poiUsed.includes(t.poi.id)) return;
    const used = await st.poi[t.poi.id]?.(g, heroId);
    if (used === true) { S.poiUsed.push(t.poi.id); engine.setPoi?.(key, null); }
  }
  async function rest() {
    for (const h of st.heroes) if (S.figs[h.id].alive) S.figs[h.id].hp = h.hp;
    advance(120); ui.toast('Vous dormez deux heures à l\'Auberge du Pendu. PV restaurés.', 2600); sfx.success();
  }
  async function glow(id) {
    if (S.cd > 0) return;
    const f = S.figs[id], hidden = grid.neighbors(f.tile).filter(k => !revealed.has(k));
    sfx.magic(); engine.focusFigure(id, { soft: true });
    if (!hidden.length) ui.toast('La lueur ne révèle rien de nouveau.');
    await Promise.all(hidden.map((k, i) => sleep(i * 120).then(() => reveal(k, { focus: false }))));
    S.cd = 6; advance(20);
  }
  async function toggleMount() {
    S.mounted = !S.mounted;
    ui.toast(S.mounted ? 'Aldric monte en selle : <b>déplacement 5</b>.' : 'Aldric met pied à terre.');
    await engine.bump('destrier', null);
  }
  function useItem(item) {
    if (item !== 'herbes') { ui.toast(`${st.items[item].icon} <b>${st.items[item].name}</b> — ${st.items[item].desc}`, 3000); return; }
    const id = R.selected || heroes()[0]?.id, f = S.figs[id], h = def(id);
    if (!f || f.hp >= h.hp) { ui.toast('Personne n\'a besoin de soins.'); return; }
    g.take('herbes'); f.hp = Math.min(h.hp, f.hp + 3); ui.floatText(engine.screenPos(id), '+3', '#8fe07a'); sfx.magic(); refreshHUD(); save();
  }

  // ------------------------------------------------------------------ combat
  const distTo = (from, to, max) => bfs(grid, from, k => revealed.has(k), max).dist.get(to);
  async function attack(heroId, enemyId) {
    const h = def(heroId), e = def(enemyId), hf = S.figs[heroId], ef = S.figs[enemyId];
    const d = distTo(hf.tile, ef.tile, h.range);
    if (d == null) { ui.toast(`Hors de portée (portée ${h.range}).`); engine.focusFigure(enemyId, { soft: true }); return false; }
    S.stats.dice++;
    const edef = Math.max(0, e.def - (enemyId === 'anselme' && g.flag('anselmeWeak') ? 15 : 0));
    const chance = Math.max(5, Math.min(95, h.skill - edef));
    const { ok, crit } = await ui.rollD100({ chance, label: `${h.name} → ${e.name}`, detail: `${h.skillName} ${h.skill} % − défense ${edef} %`, color: h.color });
    if (h.range > 1 && d > 0) { sfx.magic(); await engine.bump(heroId, null); } else await engine.bump(heroId, enemyId);
    if (!ok) { ui.floatText(engine.screenPos(enemyId), 'Raté', '#cfc6b0'); return true; }
    let dmg = crit ? 2 : 1; if (e.undead && g.has('eau')) dmg++;
    sfx.hit(); ef.hp -= dmg; ui.floatText(engine.screenPos(enemyId), `-${dmg}${crit ? ' !' : ''}`, '#ff6a4a');
    if (ef.hp <= 0) await kill(enemyId);
    return true;
  }
  async function kill(id) {
    S.figs[id].alive = false; S.stats.kills++;
    await engine.removeFigure(id, { animate: true });
    await st.onDefeat[id]?.(g); save();
  }
  async function enemyPhase() {
    for (const en of enemies()) {
      if (S.ended) return;
      const ef = S.figs[en.id], ed = def(en.id); if (!ef.alive) continue;
      const { dist, pathTo } = bfs(grid, ef.tile, k => revealed.has(k), 3);
      let best = null;
      for (const h of heroes()) { const d = dist.get(S.figs[h.id].tile); if (d != null && (!best || d < best.d)) best = { id: h.id, d }; }
      if (!best || best.d > 2) continue;
      if (best.d > 0 && !ed.static) {
        const next = pathTo(S.figs[best.id].tile)[1];
        await engine.moveFigure(en.id, [ef.tile, next], { follow: false }); ef.tile = next; best.d--;
      }
      if (best.d === 0) await enemyAttack(en.id, best.id);
    }
  }
  async function enemyAttack(eid, hid) {
    const e = def(eid), h = def(hid), hf = S.figs[hid];
    S.stats.dice++;
    const chance = Math.max(5, Math.min(95, e.atk - h.armor));
    const { ok } = await ui.rollD100({ chance, label: `${e.name} attaque ${h.name}`, detail: `Attaque ${e.atk} % − armure ${h.armor} % · lancez pour l'ennemi`, color: '#8a1c1c', enemy: true });
    await engine.bump(eid, hid);
    if (!ok) { ui.floatText(engine.screenPos(hid), 'Paré', '#cfc6b0'); return; }
    sfx.hit(); hf.hp -= 1; ui.floatText(engine.screenPos(hid), '-1', '#ff6a4a'); refreshHUD();
    if (hf.hp <= 0) {
      hf.alive = false; S.stats.ko++;
      if (hid === 'aldric') S.mounted = false;
      if (R.selected === hid) select(null);
      await engine.removeFigure(hid, { animate: true });
      ui.toast(`${h.name} s'effondre… Maud le ramène à Grisval (+2 h).`, 3000);
      await sleep(900);
      Object.assign(hf, { alive: true, hp: h.hp, tile: map.start }); advance(120);
      await engine.addFigure(figData(hid), map.start, { spawn: true });
    }
  }

  // ------------------------------------------------------------------ dialogues
  async function talkScript(dlgId, npcId) {
    const heroId = R.selected || heroes()[0].id, hero = def(heroId);
    engine.highlight([], []); ui.vignette(true);
    const script = st.dialogues[dlgId];
    await dialogue.play(script, {
      g, dlgId,
      speaker: s => { const d = s === 'hero' ? hero : def(s); return { name: d.name, kind: d.kind, color: d.color }; },
      onSpeaker: s => engine.cinematic({ ids: [heroId, npcId], focus: s === 'hero' ? heroId : npcId }),
      isSeen: k => !!S.seen[k], markSeen: k => { S.seen[k] = 1; },
    });
    engine.endCinematic(); ui.vignette(false);
    await st.afterTalk[dlgId]?.(g);
    save();
  }
  async function talk(npcId) {
    if (!R.selected) select(heroes()[0].id);
    const hf = S.figs[R.selected], nf = S.figs[npcId];
    if (hf.tile !== nf.tile) {
      const p = pathFor(hf.tile, nf.tile);
      if (!p || p.length - 1 > moveOf(R.selected)) { ui.toast(`${def(npcId).name} est trop loin.`); engine.focusFigure(npcId, { soft: true }); return; }
      await moveHero(R.selected, p);
    }
    const id = st.talk[npcId]?.(g);
    if (!id) { ui.toast(st.idleLine[npcId]?.(g) || `${def(npcId).name} n'a rien à dire.`); return; }
    await talkScript(id, npcId);
  }

  // ------------------------------------------------------------------ entrées
  async function act(fn, enemyTurn = true) {
    if (R.busy || dialogue.open || S.ended) return;
    R.busy = true; ui.setBusy(true);
    try { const r = await fn(); if (enemyTurn && r !== false) await enemyPhase(); }
    catch (e) { console.error(e); }
    finally {
      R.busy = false; ui.setBusy(false); save();
      if (R.selected && S.figs[R.selected]?.alive) select(R.selected); else refreshHUD();
    }
  }
  engine.onTap = hit => {
    if (R.busy || dialogue.open || S.ended) return;
    if (hit.type === 'figure') {
      const id = hit.id, tm = def(id)?.team; if (!S.figs[id]?.alive) return;
      if (tm === 'hero') { sfx.ui(); if (R.selected === id) select(null); else { select(id); engine.focusFigure(id, { soft: true }); } return; }
      if (tm === 'npc') return act(() => talk(id), false);
      if (tm === 'enemy' || tm === 'boss') { if (!R.selected) { ui.toast('Sélectionnez un héros.'); return; } return act(() => attack(R.selected, id)); }
      if (tm === 'mount') {
        if (R.selected === 'aldric' && S.figs.aldric.tile === S.figs.destrier.tile) return act(() => toggleMount(), false);
        ui.toast('Le destrier attend son cavalier (Aldric).'); return;
      }
    }
    if (hit.type === 'poi' || hit.type === 'tile') {
      const k = hit.key, t = tileOf(k);
      if (hit.type === 'poi' && revealed.has(k)) {
        const here = heroes().find(h => S.figs[h.id].tile === k);
        if (here) return act(() => doPoi(k, here.id));
        if (R.selected && R.reach.has(k)) return act(async () => { await moveHero(R.selected, pathFor(S.figs[R.selected].tile, k)); await doPoi(k, R.selected); });
        ui.toast(`${t.poi?.icon || ''} ${t.poi?.label || ''} — approchez-vous.`); return;
      }
      if (R.selected && R.reach.has(k)) return act(() => moveHero(R.selected, pathFor(S.figs[R.selected].tile, k)));
      if (R.selected && R.explore.has(k)) return act(() => explore(k));
      engine.focusTile(k);
      ui.toast(revealed.has(k) ? `<b>${t.name}</b> · ${TERRAINS[t.terrain].label}` : 'Région inexplorée');
    }
  };
  engine.onLongPress = k => {
    const t = tileOf(k); if (!t) return;
    const who = Object.entries(S.figs).filter(([, f]) => f.alive && f.tile === k).map(([id]) => def(id).name).join(', ');
    ui.toast(revealed.has(k) ? `<b>${t.name}</b> (${TERRAINS[t.terrain].label})${t.poi && !S.poiUsed.includes(t.poi.id) ? ' · ' + t.poi.icon + ' ' + t.poi.label : ''}${who ? '<br>' + who : ''}` : 'Région inexplorée', 3200);
  };
  engine.onFps = n => ui.setFps(n);
  ui.onKey = {
    select: i => { const h = heroes()[i]; if (h) { select(h.id); engine.focusFigure(h.id); } },
    focus: () => engine.focusFigure(R.selected || heroes()[0].id),
    deselect: () => select(null),
  };

  // ------------------------------------------------------------------ fin
  function showEnd() {
    const s = S.stats, mins = S.time - st.startTime;
    ui.endScreen({
      title: 'Fin du chapitre I', subtitle: st.title,
      stats: [['Temps de jeu (récit)', `${Math.floor(mins / 60)} h ${mins % 60} min`], ['Tuiles explorées', `${revealed.size} / ${grid.cells.length}`], ['Ennemis vaincus', s.kills], ['Dés lancés', s.dice], ['Chutes', s.ko], ['Temps réel', `${Math.round((Date.now() - s.t0) / 60000)} min`]],
      onReplay: () => { localStorage.removeItem(saveKey); location.reload(); },
    });
  }

  // ------------------------------------------------------------------ menu
  function buildMenu() {
    const gx = settings.gfx, det = settings.detected;
    const setG = patch => { if (settings.set({ gfx: patch })) ui.reloadPrompt(); };
    ui.buildMenu([
      { title: 'Partie', items: [
        { label: 'Journal & inventaire', action: () => ui.openJournal() },
        { label: 'Relire l\'introduction', action: async () => { for (const p of st.intro) await dialogue.narrate(p); } },
        { label: 'Nouvelle partie', action: () => { if (confirm('Effacer la progression de ce moteur ?')) { localStorage.removeItem(saveKey); location.reload(); } } },
        { label: 'Carte procédurale (nouvelle graine)', action: () => { const u = new URL(location.href); u.searchParams.set('seed', String(2 + Math.floor(Math.random() * 9999))); location.href = u; } },
        ...(seed !== 1 ? [{ label: 'Revenir à la carte du scénario', action: () => { const u = new URL(location.href); u.searchParams.delete('seed'); location.href = u; } }] : []),
      ] },
      { title: 'Caméra', items: [
        { label: 'Recentrer la vue', action: () => engine.resetCamera() },
        { label: 'Centrer sur le héros', action: () => engine.focusFigure(R.selected || 'aldric') },
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
      { title: 'Dés (D100)', items: [
        { type: 'seg', label: 'Lancer', value: settings.dice, options: [{ label: 'Physiques', value: 'physical' }, { label: 'Virtuels', value: 'virtual' }], onChange: v => settings.set({ dice: v }) },
      ] },
      { title: 'Audio', items: [
        { type: 'seg', label: 'Volume', value: settings.volume, options: [{ label: '0', value: 0 }, { label: '30', value: 0.3 }, { label: '70', value: 0.7 }, { label: '100', value: 1 }], onChange: v => settings.set({ volume: v }) },
        { type: 'toggle', label: 'Vent d\'ambiance', value: settings.music, onChange: v => settings.set({ music: v }) },
        { type: 'toggle', label: 'Vibrations', value: settings.haptics, onChange: v => settings.set({ haptics: v }) },
      ] },
      { title: 'Ambiance (test)', items: [
        { type: 'seg', label: 'Moment', value: S.tod, options: [{ label: 'Crépuscule', value: 'dusk' }, { label: 'Nuit', value: 'night' }], onChange: v => { S.tod = v; engine.setTimeOfDay(v); refreshHUD(); } },
      ] },
      ...(engine.menu || []),
      { title: 'Debug (tests)', items: [
        { label: 'Révéler toute la carte', action: () => act(async () => { const c = grid.get(map.start); const ks = grid.cells.filter(x => !revealed.has(x.key)).sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z)).map(x => x.key); engine.resetCamera(); await Promise.all(ks.map((k, i) => sleep(i * 50).then(() => reveal(k, { focus: false })))); }, false) },
        { label: 'Téléporter le groupe à…', action: () => ui.toast('Touchez un lieu dans la liste ci-dessous.') , close: false },
        ...['marais', 'clairiere', 'abbaye', 'grisval'].map(pl => ({ label: `  → ${st.places.find(p => p.id === pl).name}`, action: () => act(() => teleport(pl), false) })),
        { label: 'Donner tous les objets', action: () => { for (const k of Object.keys(st.items)) if (!g.has(k)) g.give(k); g.set('gotKey'); save(); } },
      ] },
    ]);
  }
  async function teleport(pl) {
    const k = map.placeKey[pl];
    if (!revealed.has(k)) await reveal(k);
    for (const h of heroes()) { const f = S.figs[h.id]; if (f.tile !== k) { await engine.moveFigure(h.id, [f.tile, k], { follow: h.id === heroes()[0].id }); f.tile = k; } }
    if (S.mounted) { await engine.moveFigure('destrier', [S.figs.destrier.tile, k], { follow: false }); S.figs.destrier.tile = k; }
    const p = placeOf(k); if (p && st.onEnter[p]) await st.onEnter[p](g, heroes()[0].id);
  }
  window.__game = { S, g, map, act, talk, attack, reveal, select, teleport, doPoi, def };
  settings.subscribe(() => engine.applySettings?.(settings.gfx));
  buildMenu();

  // ------------------------------------------------------------------ démarrage
  refreshHUD();
  engine.resetCamera(true);
  if (!resumed) {
    setTimeout(async () => {
      for (const p of st.intro) await dialogue.narrate(p);
      await st.onStart(g); save();
      ui.toast('Touchez <b>Maud</b> pour lui parler.', 3500);
      engine.focusFigure('maud');
    }, 500);
  } else setTimeout(() => ui.toast(`Partie reprise · ${fmtTime(S.time)}`, 2200), 500);
}
