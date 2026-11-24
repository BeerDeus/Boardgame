#!/usr/bin/env node
// Validateur de scénario : node tools/validate-story.mjs js/stories/prologue.js
// Vérifie les références croisées (lieux, PNJ, dialogues, quêtes, objets, carte hex…).
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.argv[2] || 'js/stories/prologue.js');
const src = readFileSync(file, 'utf8');
const { STORY: st } = await import(pathToFileURL(file));
const { TERRAINS } = await import(pathToFileURL(resolve('js/core/terrains.js')));
const { DECKS } = await import(pathToFileURL(resolve('js/core/monsters.js')));
const figSrc = readFileSync(resolve('js/three/figures.js'), 'utf8');
const KINDS = new Set([...figSrc.matchAll(/^\s{2}(\w+):\s+\{ url:/gm)].map(m => m[1]));
const errors = [], warns = [];
const E = m => errors.push(m), W = m => warns.push(m);
const ids = (arr, what) => { const s = new Set(); for (const x of arr || []) { if (!x.id) E(`${what} sans id`); else if (s.has(x.id)) E(`${what} en double : ${x.id}`); s.add(x.id); } return s; };

const places = ids(st.places, 'Lieu'), cast = ids(st.cast, 'Figurine'), heroes = ids(st.heroes, 'Héros');
const items = new Set(Object.keys(st.items || {})), quests = new Set(Object.keys(st.quests || {})), dlgs = new Set(Object.keys(st.dialogues || {}));
if (!st.places?.some(p => p.start)) E('Aucun lieu de départ (start: true)');

// carte hex
const mask = st.hexMap; const hexCells = new Set();
if (mask) mask.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== ' ' && ch !== '.') hexCells.add(`${c},${r}`); }));

const seenPlaces = new Set();
for (const p of st.places || []) {
  if (!TERRAINS[p.terrain]) E(`Lieu ${p.id} : terrain inconnu « ${p.terrain} »`);
  if (!p.at && !p.cell && !p.near) E(`Lieu ${p.id} : il faut at, cell ou near`);
  if (p.near && !seenPlaces.has(p.near)) E(`Lieu ${p.id} : near « ${p.near} » doit être défini AVANT`);
  if (p.cell && mask && !hexCells.has(p.cell.join(','))) E(`Lieu ${p.id} : la case [${p.cell}] n'existe pas dans hexMap`);
  if (mask && !p.cell && !p.near) W(`Lieu ${p.id} : pas de case précise (cell) pour la carte hex`);
  if (!p.desc) W(`Lieu ${p.id} : pas de description (desc)`);
  if (!p.teaser) W(`Lieu ${p.id} : pas d'aperçu (teaser) — le texte du terrain sera utilisé`);
  const acts = ids(p.activities, `Activité de ${p.id}`);
  for (const a of p.activities || []) { if (typeof a.run !== 'function') E(`Activité ${p.id}/${a.id} : run manquant`); if (a.cond && !a.need) W(`Activité ${p.id}/${a.id} : cond sans need (texte affiché)`); }
  seenPlaces.add(p.id);
}
for (const z of st.zones || []) if (!places.has(z.beyond)) E(`Zone ${z.id} : beyond « ${z.beyond} » inconnu`);
for (const c of st.cast || []) {
  if (!places.has(c.place)) E(`Figurine ${c.id} : lieu « ${c.place} » inconnu`);
  if (!KINDS.has(c.kind)) E(`Figurine ${c.id} : modèle « ${c.kind} » inconnu (disponibles : ${[...KINDS].join(', ')})`);
  if (!['npc', 'enemy', 'boss', 'mount'].includes(c.team)) E(`Figurine ${c.id} : team invalide « ${c.team} »`);
  if (['enemy', 'boss'].includes(c.team)) {
    for (const k of ['hp', 'atk', 'def']) if (typeof c[k] !== 'number') E(`Monstre ${c.id} : ${k} manquant`);
    if (!DECKS[c.kind]) W(`Monstre ${c.id} : pas de paquet de cartes pour « ${c.kind} » (paquet par défaut)`);
  }
  if (c.team === 'npc' && !st.talk?.[c.id]) W(`PNJ ${c.id} : aucune entrée dans talk (il n'aura rien à dire)`);
}
for (const h of st.heroes || []) if (!KINDS.has(h.kind)) E(`Héros ${h.id} : modèle « ${h.kind} » inconnu`);
for (const [id, q] of Object.entries(st.quests || {})) if (q.target && !places.has(q.target)) E(`Quête ${id} : cible « ${q.target} » inconnue`);
for (const m of st.minors || []) { if (!m.activities?.length) W(`Rencontre ${m.id} : aucune activité`); for (const t of m.terrains || []) if (!TERRAINS[t]) E(`Rencontre ${m.id} : terrain « ${t} » inconnu`); }

// dialogues
for (const [did, d] of Object.entries(st.dialogues || {})) {
  if (!d.nodes?.[d.start]) E(`Dialogue ${did} : nœud de départ « ${d.start} » introuvable`);
  const reach = new Set();
  for (const [nid, n] of Object.entries(d.nodes || {})) {
    if (n.s !== 'hero' && !cast.has(n.s)) E(`Dialogue ${did}/${nid} : interlocuteur « ${n.s} » inconnu`);
    const nexts = [n.next, ...(n.choices || []).map(c => c.next)];
    for (const x of nexts) { if (typeof x === 'string') { reach.add(x); if (!d.nodes[x]) E(`Dialogue ${did}/${nid} : suite « ${x} » introuvable`); } }
    for (const c of n.choices || []) if (c.cond && !c.need) W(`Dialogue ${did}/${nid} : choix conditionnel sans need`);
  }
  for (const nid of Object.keys(d.nodes || {})) if (nid !== d.start && !reach.has(nid) && !src.includes(`'${nid}'`)) W(`Dialogue ${did} : nœud « ${nid} » jamais atteint`);
}
// talk → dialogues (exécution avec un g factice)
const fakeG = new Proxy({}, { get: () => () => false });
for (const [npc, fn] of Object.entries(st.talk || {})) {
  if (!cast.has(npc)) E(`talk : PNJ « ${npc} » inconnu`);
  try { const r = fn(fakeG); if (r && !dlgs.has(r)) E(`talk.${npc} → dialogue « ${r} » inconnu`); } catch (e) { W(`talk.${npc} : non évaluable (${e.message})`); }
}
for (const k of Object.keys(st.onReveal || {}).concat(Object.keys(st.onEnter || {}))) if (!places.has(k)) E(`onReveal/onEnter : lieu « ${k} » inconnu`);
// objets / quêtes / vagues utilisés dans le code
for (const [, k] of src.matchAll(/\bg\.(?:give|take|has)\('(\w+)'/g)) if (!items.has(k)) E(`Objet « ${k} » utilisé mais absent de items`);
for (const [, k] of src.matchAll(/\bg\.quest(?:Start|Done|Active)\('(\w+)'/g)) if (!quests.has(k)) E(`Quête « ${k} » utilisée mais absente de quests`);
for (const [, k] of src.matchAll(/\bg\.(?:revealPlace)\('(\w+)'/g)) if (!places.has(k)) E(`revealPlace : lieu « ${k} » inconnu`);
for (const [, k] of src.matchAll(/\bg\.spawnWave\('(\w+)'/g)) if (!st.cast.some(c => c.spawnOn === k)) W(`spawnWave('${k}') : aucune figurine avec spawnOn: '${k}'`);
for (const [, k] of src.matchAll(/\bg\.dialogue\('(\w+)'/g)) if (!dlgs.has(k)) E(`g.dialogue : « ${k} » inconnu`);

console.log(`\n${st.title}\n  ${st.places.length} lieux · ${st.cast.length} figurines · ${dlgs.size} dialogues · ${quests.size} quêtes · ${mask ? hexCells.size + ' cases hex' : 'pas de carte hex'}`);
for (const w of warns) console.log('  ⚠', w);
for (const e of errors) console.log('  ✗', e);
console.log(errors.length ? `\n${errors.length} erreur(s).` : '\n✓ Aucune erreur.');
process.exit(errors.length ? 1 : 0);
