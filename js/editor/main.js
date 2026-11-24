// Éditeur de niveaux Grimoire : produit un fichier niveau JSON (levels/<id>.json) lu par le jeu.
import { emptyLevel, LEVEL_FORMAT } from '../core/level.js';
import { checkLevel, walk, KINDS, TEAMS } from '../core/level-check.js';
import { STATS, DIFFICULTIES } from '../core/stats.js';
import { HEROES } from '../core/heroes.js';
import { DRAFT_KEY } from '../core/campaign.js';
import { h, input, textarea, checkbox, select, field, row, btn, icoBtn, fieldFor, effectsEditor, condEditor, sideList, options, iconSelect, uniqueId, slug, IMAGES } from './fields.js';
import { mapPanel } from './map.js';

const STORE = 'grimoire.editor.level';
const $ = s => document.querySelector(s);
let L = load() || emptyLevel();
const ui = { tab: 'general', sel: {} };
const ctx = { get L() { return L; }, changed, refresh: render };

// ------------------------------------------------------------------ sauvegarde auto + annuler
let undo = [], lastSnap = JSON.stringify(L), snapT = null, checkT = null;
function load() { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } }
function changed() {
  try { localStorage.setItem(STORE, JSON.stringify(L)); } catch {}
  $('#saved').textContent = 'Enregistré (navigateur)';
  clearTimeout(snapT); snapT = setTimeout(() => { const s = JSON.stringify(L); if (s !== lastSnap) { undo.push(lastSnap); if (undo.length > 80) undo.shift(); lastSnap = s; } }, 500);
  clearTimeout(checkT); checkT = setTimeout(updateBadge, 400);
  refreshLists();
}
function doUndo() { const s = undo.pop(); if (!s) return; L = JSON.parse(s); lastSnap = s; try { localStorage.setItem(STORE, s); } catch {} render(); }
function setLevel(d) { undo.push(JSON.stringify(L)); L = normalize(d); lastSnap = JSON.stringify(L); ui.sel = {}; changed(); render(); }
function normalize(d) { const e = emptyLevel(); for (const k of Object.keys(e)) if (d[k] === undefined) d[k] = e[k]; d.format = LEVEL_FORMAT; return d; }
L = normalize(L);

// listes de suggestions (drapeaux, vagues)
function refreshLists() {
  const flags = new Set(), waves = new Set();
  walk(L, (k, o) => { if (o.flag) flags.add(o.flag); });
  for (const p of L.places || []) if (p.hiddenUntil) flags.add(p.hiddenUntil);
  for (const c of L.cast || []) if (c.spawnOn) waves.add(c.spawnOn);
  $('#dl-flags').innerHTML = [...flags].map(f => `<option value="${f}">`).join('');
  $('#dl-waves').innerHTML = [...waves].map(f => `<option value="${f}">`).join('');
}
function updateBadge() {
  const { errors, warnings } = checkLevel(L);
  const b = $('#badge'); b.textContent = errors.length ? `✗ ${errors.length}` : warnings.length ? `⚠ ${warnings.length}` : '✓';
  b.className = 'badge ' + (errors.length ? 'ko' : warnings.length ? 'warn' : 'ok');
  b.title = errors.length ? `${errors.length} erreur(s) — voir « Vérifier »` : 'Niveau valide';
}
/** Renomme un identifiant partout (clés de référence + dictionnaires) */
function rename(kind, oldId, newId) {
  if (!newId || oldId === newId) return;
  const keys = { place: ['place', 'target', 'beyond'], cast: ['cast', 'npc', 's'], item: ['item'], quest: ['quest'], dialogue: ['dialogue'] }[kind];
  const deep = o => { if (Array.isArray(o)) return o.forEach(deep); if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (keys.includes(k) && v === oldId) o[k] = newId; else deep(v); } };
  deep(L);
  const rk = (obj) => { if (obj && oldId in obj) { obj[newId] = obj[oldId]; delete obj[oldId]; } };
  if (kind === 'place') { rk(L.onReveal); rk(L.onEnter); }
  if (kind === 'cast') { rk(L.talk); rk(L.idleLine); rk(L.onDefeat); }
  if (kind === 'item') rk(L.items);
  if (kind === 'quest') rk(L.quests);
  if (kind === 'dialogue') { rk(L.dialogues); rk(L.afterTalk); }
}
const idField = (kind, cur, apply, taken) => {
  const el = input(cur, () => {}); el.addEventListener('change', () => {
    const v = slug(el.value); if (!v || v === cur) { el.value = cur; return; }
    if (taken.has(v)) { alert(`L'identifiant « ${v} » existe déjà.`); el.value = cur; return; }
    rename(kind, cur, v); apply(v); changed(); render();
  });
  return field('Identifiant', el, 'Utilisé par les références ; renommé partout automatiquement.');
};

// ------------------------------------------------------------------ panneaux
const TABS = [['general', 'Général'], ['map', 'Carte'], ['places', 'Lieux'], ['cast', 'Personnages'], ['dialogues', 'Dialogues'], ['quests', 'Quêtes & objets'], ['events', 'Événements'], ['check', 'Vérifier'], ['help', 'Aide']];

function panelGeneral() {
  const p = h('div', { class: 'panel' }, h('h2', {}, 'Général'));
  p.append(row(
    field('Identifiant du niveau', input(L.id, v => { L.id = slug(v); changed(); }), 'Nom du fichier : levels/<id>.json'),
    field('Titre', input(L.title, v => { L.title = v; changed(); })),
    field('Tutoriel', checkbox(L.tutorial, v => { L.tutorial = v; changed(); }, 'Afficher les conseils'))));
  p.append(h('h3', {}, 'Glas (limite avant défaite)'), h('p', { class: 'muted' }, 'Limite = base selon la difficulté + bonus selon le nombre de héros (solo +3, duo +2, trio +1).'),
    row(...['facile', 'normal', 'difficile'].map(k => field(k[0].toUpperCase() + k.slice(1), input(L.glasBase[k], v => { L.glasBase[k] = v; changed(); }, { type: 'number', cls: 'num' })))));
  p.append(h('h3', {}, 'Boosts ✦'), row(
    field('Au départ', input(L.boost.start, v => { L.boost.start = v; changed(); }, { type: 'number', cls: 'num' })),
    field('Maximum', input(L.boost.max, v => { L.boost.max = v; changed(); }, { type: 'number', cls: 'num' })),
    field('Gagnés par manche', input(L.boost.perRound, v => { L.boost.perRound = v; changed(); }, { type: 'number', cls: 'num' }))));
  p.append(h('h3', {}, 'Introduction (pages de narration)'));
  const pages = h('div');
  L.intro.forEach((pg, i) => pages.append(narrBlock(pg, `Page ${i + 1}`, () => { L.intro.splice(i, 1); changed(); render(); })));
  p.append(pages, btn('+ Page d\'introduction', () => { L.intro.push({ title: '', image: IMAGES[0], text: '' }); changed(); render(); }, 'small'));
  L.victoryText ||= { title: 'Victoire', image: IMAGES[3], text: '' }; L.defeatText ||= { title: 'Défaite', image: IMAGES[1], text: '' };
  p.append(h('h3', {}, 'Fin'), narrBlock(L.victoryText, 'Texte de victoire'), narrBlock(L.defeatText, 'Texte de défaite'));
  p.append(h('h3', {}, 'Illustration des tuiles (facultatif)'), row(
    field('Image', input(L.tileArt?.url, v => { if (v) L.tileArt = { width: 1536, height: 1024, margin: 20, ...L.tileArt, url: v }; else delete L.tileArt; changed(); }, { placeholder: 'assets/maps/mon-niveau.jpg' }), 'Grande peinture plaquée sur les tuiles (1536×1024, plan de référence).')));
  return p;
}
function narrBlock(o, label, onDel) {
  return h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('b', {}, label), onDel ? icoBtn('✕', 'Supprimer', onDel, 'del') : null),
    row(fieldFor('text', o, 'title', ctx, 'Titre'), fieldFor('image', o, 'image', ctx, 'Image')), fieldFor('longtext', o, 'text', ctx, 'Texte'));
}

// --- lieux
function activitiesEditor(list) {
  const box = h('div', { class: 'acts' });
  list.forEach((a, i) => box.append(h('details', { class: 'card', open: list.length < 3 || undefined },
    h('summary', {}, h('b', {}, a.label || a.id), h('small', {}, ` · ${a.effects?.length || 0} effet(s)${a.once ? ' · une fois' : ''}`), icoBtn('✕', 'Supprimer', () => { list.splice(i, 1); changed(); render(); }, 'del')),
    row(fieldFor('text', a, 'label', ctx, 'Intitulé'), h('label', { class: 'fld' }, h('span', {}, 'Icône'), iconSelect(a.icon, v => { a.icon = v; changed(); }))),
    fieldFor('text', a, 'desc', ctx, 'Description (sous le bouton)'),
    row(fieldFor('bool', a, 'once', ctx, 'Une seule fois'), fieldFor('bool', a, 'blockedByEnemies', ctx, 'Bloqué si ennemis'), fieldFor('text', a, 'need', ctx, 'Texte si condition non remplie')),
    fieldFor('cond', a, 'cond', ctx, 'Disponible si'),
    fieldFor('effects', a, 'effects', ctx, 'Effets'))));
  box.append(btn('+ Activité', () => { list.push({ id: uniqueId('activite', new Set(list.map(x => x.id))), label: 'Nouvelle activité', icon: 'eye', once: true, effects: [] }); changed(); render(); }, 'small'));
  return box;
}
function panelPlaces() {
  const sel = ui.sel.place && L.places.find(p => p.id === ui.sel.place) ? ui.sel.place : L.places[0]?.id;
  const items = [...L.places.map(p => ({ id: p.id, label: (p.start ? '★ ' : '') + (p.name || p.id), sub: p.cell ? `case ${p.cell.join(',')}` : '⚠ pas de case', group: 'Lieux' })),
    ...(L.minors || []).map(m => ({ id: 'minor:' + m.id, label: m.name || m.id, sub: 'rencontre mineure', group: 'Rencontres mineures (cases libres)' }))];
  const side = sideList(items, ui.sel.minor ? 'minor:' + ui.sel.minor : sel, id => { if (id.startsWith('minor:')) { ui.sel.minor = id.slice(6); } else { ui.sel.minor = null; ui.sel.place = id; } render(); }, {
    groups: true, addLabel: '+ Lieu', onAdd: () => { const id = uniqueId('lieu', new Set(L.places.map(p => p.id))); L.places.push({ id, name: 'Nouveau lieu', terrain: 'plains', teaser: '', desc: '', activities: [] }); ui.sel = { place: id }; changed(); render(); },
    onDelete: id => { if (id.startsWith('minor:')) { L.minors = L.minors.filter(m => m.id !== id.slice(6)); } else if (confirm('Supprimer ce lieu ?')) L.places = L.places.filter(p => p.id !== id); changed(); render(); } });
  side.append(btn('+ Rencontre mineure', () => { L.minors ||= []; const id = uniqueId('rencontre', new Set(L.minors.map(m => m.id))); L.minors.push({ id, name: 'Rencontre', icon: 'eye', terrains: [], desc: '', activities: [] }); ui.sel = { minor: id }; changed(); render(); }, 'small wide'));
  let form;
  if (ui.sel.minor) {
    const m = L.minors.find(x => x.id === ui.sel.minor);
    form = h('div', { class: 'form' }, h('h2', {}, m.name || m.id), h('p', { class: 'muted' }, 'Petites rencontres posées au hasard sur les cases sans lieu (au moins autour du départ). Probabilité ailleurs : voir « Événements ».'),
      row(fieldFor('text', m, 'id', ctx, 'Identifiant'), fieldFor('text', m, 'name', ctx, 'Nom'), h('label', { class: 'fld' }, h('span', {}, 'Icône'), iconSelect(m.icon, v => { m.icon = v; changed(); }))),
      fieldFor('text', m, 'desc', ctx, 'Description'),
      field('Terrains possibles', h('div', { class: 'chips' }, ...options(ctx, 'terrain').map(([k, l]) => checkbox((m.terrains || []).includes(k), v => { m.terrains = (m.terrains || []).filter(x => x !== k); if (v) m.terrains.push(k); changed(); }, l)))),
      h('h3', {}, 'Activités'), activitiesEditor(m.activities ||= []));
  } else if (sel) {
    const p = L.places.find(x => x.id === sel);
    L.onReveal ||= {}; L.onEnter ||= {};
    form = h('div', { class: 'form' }, h('h2', {}, p.name || p.id),
      row(idField('place', p.id, v => { p.id = v; ui.sel.place = v; }, new Set(L.places.map(x => x.id))), fieldFor('text', p, 'name', ctx, 'Nom')),
      row(fieldFor('terrain', p, 'terrain', ctx, 'Terrain'),
        field('Case', select(p.cell?.join(','), [...new Set((L.hexMap || []).flatMap((r, ri) => [...r].map((ch, ci) => (ch !== ' ' ? `${ci},${ri}` : null)).filter(Boolean)))].map(k => [k, k]), v => { p.cell = v ? v.split(',').map(Number) : undefined; changed(); }, { empty: '—' }), 'Ou « Placer un lieu » dans l\'onglet Carte.'),
        field('Départ', checkbox(p.start, v => { for (const x of L.places) delete x.start; if (v) p.start = true; changed(); render(); }, 'Case de départ des héros'))),
      fieldFor('text', p, 'teaser', ctx, 'Aperçu (visible quand la tuile apparaît, avant d\'y entrer)'),
      fieldFor('longtext', p, 'desc', ctx, 'Description (en entrant)'),
      row(field('Jeton d\'intérêt', checkbox(!!p.poi, v => { if (v) p.poi = { icon: 'place', label: p.name }; else delete p.poi; changed(); render(); }, 'Marqueur 3D sur la case')),
        p.poi ? h('label', { class: 'fld' }, h('span', {}, 'Icône du jeton'), iconSelect(p.poi.icon, v => { p.poi.icon = v; changed(); })) : null,
        fieldFor('flag', p, 'hiddenUntil', ctx, 'Caché tant que ce drapeau n\'est pas posé')),
      h('h3', {}, 'Activités (bouton « Lieu »)'), activitiesEditor(p.activities ||= []),
      h('h3', {}, 'Événements'),
      h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, 'Quand la tuile est découverte'), effectsEditor(L.onReveal[p.id] ||= [], ctx)),
      h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, 'Quand un héros y entre'), effectsEditor(L.onEnter[p.id] ||= [], ctx)));
  } else form = h('div', { class: 'form' }, h('p', { class: 'muted' }, 'Aucun lieu.'));
  return h('div', { class: 'split' }, side, form);
}

// --- personnages
function panelCast() {
  const sel = L.cast.find(c => c.id === ui.sel.cast) ? ui.sel.cast : L.cast[0]?.id;
  const order = { npc: 0, mount: 1, enemy: 2, boss: 3 };
  const items = L.cast.slice().sort((a, b) => (order[a.team] ?? 9) - (order[b.team] ?? 9)).map(c => ({ id: c.id, label: c.name || c.id, sub: `${KINDS[c.kind] || c.kind} · ${L.places.find(p => p.id === c.place)?.name || '⚠ sans lieu'}${c.spawnOn ? ` · vague ${c.spawnOn}` : ''}`, group: TEAMS[c.team] || c.team }));
  const side = sideList(items, sel, id => { ui.sel.cast = id; render(); }, { groups: true, addLabel: '+ Personnage',
    onAdd: () => { const id = uniqueId('perso', new Set(L.cast.map(c => c.id))); L.cast.push({ id, name: 'Nouveau', kind: 'npc', team: 'npc', color: '#c9a45c', base: '#d4a84a', place: L.places[0]?.id, role: '' }); ui.sel.cast = id; changed(); render(); },
    onDelete: id => { if (confirm('Supprimer ce personnage ?')) { L.cast = L.cast.filter(c => c.id !== id); changed(); render(); } } });
  if (!sel) return h('div', { class: 'split' }, side, h('div', { class: 'form' }, h('p', { class: 'muted' }, 'Aucun personnage.')));
  const c = L.cast.find(x => x.id === sel), foe = ['enemy', 'boss'].includes(c.team);
  const form = h('div', { class: 'form' }, h('h2', {}, c.name || c.id),
    row(idField('cast', c.id, v => { c.id = v; ui.sel.cast = v; }, new Set(L.cast.map(x => x.id))), fieldFor('text', c, 'name', ctx, 'Nom'), fieldFor('text', c, 'role', ctx, 'Rôle')),
    row(field('Camp', select(c.team, Object.entries(TEAMS), v => { c.team = v; if (['enemy', 'boss'].includes(v)) { c.hp ??= 2; c.atk ??= 40; c.def ??= 5; c.color = '#8a1c1c'; c.base = '#6a1616'; } changed(); render(); })),
      field('Modèle 3D', select(c.kind, Object.entries(KINDS), v => { c.kind = v; changed(); })),
      fieldFor('place', c, 'place', ctx, 'Lieu'), field('Couleur du socle', input(c.base || c.color, v => { c.base = v; changed(); }, { type: 'color' }))),
    row(fieldFor('wave', c, 'spawnOn', ctx, 'Apparaît avec la vague (sinon en entrant dans le lieu)'), fieldFor('number', c, 'minParty', ctx, 'Seulement à partir de N héros'),
      field('Pose', select(c.idle || 'idle', [['idle', 'Debout'], ['sit', 'Assis']], v => { if (v === 'idle') delete c.idle; else c.idle = v; changed(); }))));
  if (foe) {
    L.onDefeat ||= {};
    form.append(h('h3', {}, 'Combat'),
      row(fieldFor('number', c, 'hp', ctx, 'PV'), fieldFor('number', c, 'atk', ctx, 'Attaque %'), fieldFor('number', c, 'def', ctx, 'Défense %'), fieldFor('number', c, 'guard', ctx, 'Garde : reste à ≤ N cases de son lieu')),
      row(fieldFor('bool', c, 'undead', ctx, 'Mort-vivant'), fieldFor('bool', c, 'static', ctx, 'Immobile')),
      h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, 'Quand il est vaincu'), effectsEditor(L.onDefeat[c.id] ||= [], ctx)));
  } else {
    L.talk ||= {}; L.idleLine ||= {};
    const rules = L.talk[c.id] ||= [];
    const rbox = h('div', { class: 'rules' });
    rules.forEach((r, i) => rbox.append(h('div', { class: 'card rule' },
      h('div', { class: 'card-h' }, h('b', {}, `Règle ${i + 1}`), icoBtn('↑', 'Monter', () => { if (i) { [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]]; changed(); render(); } }), icoBtn('✕', 'Supprimer', () => { rules.splice(i, 1); changed(); render(); }, 'del')),
      row(field('Dialogue', select(r.dialogue, options(ctx, 'dialogue'), v => { r.dialogue = v || ''; changed(); }, { empty: '(rien à dire → réplique)' })), condEditorField(r, 'cond', 'Si')))));
    form.append(h('h3', {}, 'Quand on lui parle'), h('p', { class: 'muted' }, 'La première règle dont la condition est vraie choisit le dialogue. « Rien à dire » affiche la réplique ci-dessous.'), rbox,
      btn('+ Règle', () => { rules.push({ dialogue: Object.keys(L.dialogues)[0] || '' }); changed(); render(); }, 'small'),
      field('Réplique quand il n\'a rien à dire', input(L.idleLine[c.id], v => { if (v) L.idleLine[c.id] = v; else delete L.idleLine[c.id]; changed(); })),
      btn('Créer un dialogue pour ce personnage', () => { const id = uniqueId(c.id, new Set(Object.keys(L.dialogues))); L.dialogues[id] = { start: 'a', nodes: { a: { s: c.id, t: 'Bonjour, voyageurs.', next: null } } }; rules.push({ dialogue: id }); ui.tab = 'dialogues'; ui.sel.dialogue = id; changed(); render(); }, 'ghost'));
  }
  return h('div', { class: 'split' }, side, form);
}
const condEditorField = (o, k, label) => h('label', { class: 'fld' }, h('span', {}, label), condEditor(o, k, ctx));

// --- dialogues
function panelDialogues() {
  const ids = Object.keys(L.dialogues);
  const sel = ids.includes(ui.sel.dialogue) ? ui.sel.dialogue : ids[0];
  const side = sideList(ids.map(id => ({ id, label: id, sub: `${Object.keys(L.dialogues[id].nodes || {}).length} nœud(s)` })), sel, id => { ui.sel.dialogue = id; render(); }, {
    addLabel: '+ Dialogue', onAdd: () => { const id = uniqueId(prompt('Identifiant du dialogue ?', 'dialogue') || 'dialogue', new Set(ids)); L.dialogues[id] = { start: 'a', nodes: { a: { s: L.cast.find(c => c.team === 'npc')?.id || 'hero', t: '', next: null } } }; ui.sel.dialogue = id; changed(); render(); },
    onDelete: id => { if (confirm(`Supprimer le dialogue « ${id} » ?`)) { delete L.dialogues[id]; changed(); render(); } } });
  if (!sel) return h('div', { class: 'split' }, side, h('div', { class: 'form' }, h('p', { class: 'muted' }, 'Aucun dialogue. Créez-en un, puis reliez-le à un PNJ dans « Personnages ».')));
  const d = L.dialogues[sel], nodes = d.nodes ||= {}, nodeIds = Object.keys(nodes);
  const who = [['hero', 'Héros actif'], ...HEROES.map(x => [x.id, `${x.name} (héros)`]), ...L.cast.map(c => [c.id, c.name || c.id])];
  const nextSel = (o, k, label = 'Puis') => field(label, select(o[k] ?? '', nodeIds.map(n => [n, n]), v => { o[k] = v || null; changed(); }, { empty: '(fin du dialogue)' }));
  const testFields = t => [row(field('Stat', select(t.stat, Object.entries(STATS).map(([k, v]) => [k, v.name]), v => { t.stat = v; changed(); })),
      field('Difficulté', select(t.diff || 'normal', Object.entries(DIFFICULTIES).map(([k, v]) => [k, `${v.label} (${v.mod > 0 ? '+' : ''}${v.mod})`]), v => { t.diff = v; changed(); })),
      fieldFor('number', t, 'mod', ctx, 'Modif. %'), fieldFor('text', t, 'label', ctx, 'Intitulé du jet')),
    row(nextSel(t, 'success', 'Si réussite →'), nextSel(t, 'fail', 'Si échec →'))];
  const users = Object.entries(L.talk || {}).filter(([, rs]) => rs.some(r => r.dialogue === sel)).map(([k]) => L.cast.find(c => c.id === k)?.name || k);
  L.afterTalk ||= {};
  const form = h('div', { class: 'form' }, h('h2', {}, `Dialogue « ${sel} »`),
    h('p', { class: 'muted' }, users.length ? `Lancé en parlant à : ${users.join(', ')}.` : '⚠ Aucun PNJ ne lance ce dialogue (onglet Personnages → « Quand on lui parle ») — il peut aussi être lancé par un effet.'),
    row(idField('dialogue', sel, v => { ui.sel.dialogue = v; }, new Set(ids)), field('Nœud de départ', select(d.start, nodeIds.map(n => [n, n]), v => { d.start = v; changed(); }))),
    h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, 'Après le dialogue'), effectsEditor(L.afterTalk[sel] ||= [], ctx)));
  for (const nid of nodeIds) {
    const n = nodes[nid], mode = n.test ? 'test' : n.choices?.length ? 'choices' : 'next';
    const card = h('div', { class: 'card node ' + (nid === d.start ? 'start' : '') });
    const renameNode = input(nid, () => {}); renameNode.addEventListener('change', () => {
      const v = slug(renameNode.value); if (!v || v === nid || nodes[v]) { renameNode.value = nid; return; }
      nodes[v] = n; delete nodes[nid]; if (d.start === nid) d.start = v;
      for (const x of Object.values(nodes)) { if (x.next === nid) x.next = v; for (const c of [...(x.choices || []), ...(x.branches || []), x.test, ...(x.choices || []).map(c => c.test)]) { if (!c) continue; for (const k of ['next', 'success', 'fail']) if (c[k] === nid) c[k] = v; } }
      changed(); render();
    });
    card.append(h('div', { class: 'card-h' }, h('span', { class: 'node-id' }, renameNode), nid === d.start ? h('em', {}, 'départ') : null, h('span', { class: 'sp' }),
      icoBtn('✕', 'Supprimer le nœud', () => { if (confirm(`Supprimer le nœud « ${nid} » ?`)) { delete nodes[nid]; changed(); render(); } }, 'del')),
      row(field('Qui parle', select(n.s, who, v => { n.s = v; changed(); }))), fieldFor('longtext', n, 't', ctx, 'Texte'),
      field('Suite', select(mode, [['next', 'Continuer vers un nœud / fin'], ['choices', 'Choix des joueurs'], ['test', 'Test de stat automatique']], v => {
        if (v === 'choices') { delete n.test; n.choices = n.choices?.length ? n.choices : [{ t: '', next: null }]; }
        else if (v === 'test') { delete n.choices; n.test = { stat: 'force', diff: 'normal', mod: 0, label: '', success: null, fail: null }; }
        else { delete n.choices; delete n.test; }
        changed(); render();
      })));
    if (mode === 'next') card.append(nextSel(n, 'next'));
    if (mode === 'test') card.append(h('div', { class: 'nested is-test' }, h('div', { class: 'nested-l' }, 'Test de stat (après le texte, par le héros actif)'), ...testFields(n.test)));
    if (mode === 'choices') {
      const cb = h('div', { class: 'choices' });
      n.choices.forEach((c, i) => {
        const cc = h('div', { class: 'choice-ed' },
          h('div', { class: 'card-h' }, h('b', {}, `Choix ${i + 1}`), h('span', { class: 'sp' }),
            icoBtn('↑', 'Monter', () => { if (i) { [n.choices[i - 1], n.choices[i]] = [n.choices[i], n.choices[i - 1]]; changed(); render(); } }),
            icoBtn('✕', 'Supprimer', () => { n.choices.splice(i, 1); changed(); render(); }, 'del')),
          fieldFor('text', c, 't', ctx, 'Texte du choix'),
          row(fieldFor('bool', c, 'once', ctx, 'Une seule fois'), field('Test de stat', checkbox(!!c.test, v => { if (v) c.test = { stat: 'force', diff: 'normal', mod: 0, label: '', success: null, fail: null }; else delete c.test; changed(); render(); }, 'Lancer les dés'))),
          c.test ? h('div', { class: 'nested is-test' }, ...testFields(c.test)) : nextSel(c, 'next'),
          h('details', {}, h('summary', {}, 'Condition et effets'), row(condEditorField(c, 'cond', 'Proposé si'), fieldFor('text', c, 'need', ctx, 'Texte si verrouillé')), fieldFor('effects', c, 'effects', ctx, 'Effets quand choisi')));
        cb.append(cc);
      });
      cb.append(btn('+ Choix', () => { n.choices.push({ t: '', next: null }); changed(); render(); }, 'small'));
      card.append(cb);
    }
    card.append(h('details', {}, h('summary', {}, `Effets et variantes (${(n.effects?.length || 0) + (n.variants?.length || 0) + (n.branches?.length || 0)})`),
      fieldFor('effects', n, 'effects', ctx, 'Effets au passage de ce nœud'),
      variantsEditor(n, nodeIds)));
    form.append(card);
  }
  form.append(btn('+ Nœud', () => { const id = uniqueId('n', new Set(nodeIds)); nodes[id] = { s: nodes[nodeIds[nodeIds.length - 1]]?.s || 'hero', t: '', next: null }; changed(); render(); }, 'accent'));
  return h('div', { class: 'split' }, side, form);
}
function variantsEditor(n, nodeIds) {
  const box = h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, 'Texte différent si… (variantes)'));
  (n.variants ||= []).forEach((v, i) => box.append(h('div', { class: 'card' }, condEditorField(v, 'cond', 'Si'), fieldFor('longtext', v, 't', ctx, 'Texte'), icoBtn('✕', 'Supprimer', () => { n.variants.splice(i, 1); changed(); render(); }, 'del'))));
  box.append(btn('+ Variante de texte', () => { n.variants.push({ cond: { type: 'flag', flag: '' }, t: '' }); changed(); render(); }, 'small'));
  const box2 = h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, 'Suite différente si… (embranchements)'));
  (n.branches ||= []).forEach((b, i) => box2.append(h('div', { class: 'card' }, row(condEditorField(b, 'cond', 'Si'), field('Aller à', select(b.next, nodeIds.map(x => [x, x]), v => { b.next = v; changed(); }, { empty: '(fin)' }))), icoBtn('✕', 'Supprimer', () => { n.branches.splice(i, 1); changed(); render(); }, 'del'))));
  box2.append(btn('+ Embranchement', () => { n.branches.push({ cond: { type: 'flag', flag: '' }, next: null }); changed(); render(); }, 'small'));
  return h('div', {}, box, box2);
}

// --- quêtes et objets
function panelQuests() {
  const qs = h('div', { class: 'grid2' });
  for (const [id, q] of Object.entries(L.quests)) qs.append(h('div', { class: 'card' },
    h('div', { class: 'card-h' }, h('b', {}, q.title || id), icoBtn('✕', 'Supprimer', () => { delete L.quests[id]; changed(); render(); }, 'del')),
    idField('quest', id, () => {}, new Set(Object.keys(L.quests))), fieldFor('text', q, 'title', ctx, 'Titre'), fieldFor('text', q, 'hint', ctx, 'Indice'), fieldFor('place', q, 'target', ctx, 'Lieu visé (marqueur)')));
  const its = h('div', { class: 'grid2' });
  for (const [id, it] of Object.entries(L.items)) its.append(h('div', { class: 'card' },
    h('div', { class: 'card-h' }, h('b', {}, it.name || id), icoBtn('✕', 'Supprimer', () => { delete L.items[id]; changed(); render(); }, 'del')),
    idField('item', id, () => {}, new Set(Object.keys(L.items))),
    row(fieldFor('text', it, 'name', ctx, 'Nom'), h('label', { class: 'fld' }, h('span', {}, 'Icône'), iconSelect(it.icon, v => { it.icon = v; changed(); }))),
    fieldFor('text', it, 'desc', ctx, 'Description'), row(fieldFor('bool', it, 'keep', ctx, 'Conservé dans la campagne'), fieldFor('bool', it, 'usable', ctx, 'Utilisable (soin 3 PV)'))));
  return h('div', { class: 'panel' }, h('h2', {}, 'Quêtes'), h('p', { class: 'muted' }, 'Démarrées / terminées par des effets. La première quête démarre automatiquement au début du niveau.'), qs,
    btn('+ Quête', () => { const id = uniqueId('quete', new Set(Object.keys(L.quests))); L.quests[id] = { title: 'Nouvelle quête', hint: '' }; changed(); render(); }, 'small'),
    h('h2', {}, 'Objets'), its,
    btn('+ Objet', () => { const id = uniqueId('objet', new Set(Object.keys(L.items))); L.items[id] = { name: 'Nouvel objet', icon: 'coin', desc: '' }; changed(); render(); }, 'small'));
}

// --- événements
function panelEvents() {
  L.glasEvents ||= {}; L.zones ||= []; L.remember ||= [];
  const ge = h('div');
  for (const n of Object.keys(L.glasEvents).sort((a, b) => a - b)) ge.append(h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, `Au glas n° ${n}`, icoBtn('✕', 'Supprimer', () => { delete L.glasEvents[n]; changed(); render(); }, 'del')), effectsEditor(L.glasEvents[n], ctx)));
  const zs = h('div');
  L.zones.forEach((z, i) => zs.append(h('div', { class: 'card' }, row(fieldFor('text', z, 'id', ctx, 'Identifiant'), fieldFor('text', z, 'label', ctx, 'Nom'),
    field('Ou : toutes les cases à l\'est de', select(z.beyond, options(ctx, 'place'), v => { if (v) z.beyond = v; else delete z.beyond; changed(); }, { empty: '(cases peintes sur la carte)' })),
    icoBtn('✕', 'Supprimer', () => { L.zones.splice(i, 1); changed(); render(); }, 'del')))));
  const rm = h('div');
  L.remember.forEach((r, i) => rm.append(h('div', { class: 'card' }, row(fieldFor('text', r, 'key', ctx, 'Clé (ex. etape1.marchandSauve)'), fieldFor('flag', r, 'flag', ctx, 'Valeur = ce drapeau'), fieldFor('text', r, 'value', ctx, 'ou valeur fixe'), icoBtn('✕', 'Supprimer', () => { L.remember.splice(i, 1); changed(); render(); }, 'del')))));
  return h('div', { class: 'panel' },
    h('h2', {}, 'Événements de glas'), h('p', { class: 'muted' }, 'Déclenchés quand la cloche atteint ce nombre de glas (fin de chaque manche).'), ge,
    row(btn('+ Événement de glas', () => { const n = prompt('Au glas numéro ?', '3'); if (n && +n > 0) { L.glasEvents[+n] ||= []; changed(); render(); } }, 'small')),
    h('h2', {}, 'Zones verrouillées'), h('p', { class: 'muted' }, 'Peignez les cases d\'une zone dans l\'onglet Carte. Elles restent invisibles jusqu\'à l\'effet « Déverrouiller une zone ».'), zs,
    btn('+ Zone', () => { L.zones.push({ id: uniqueId('zone', new Set(L.zones.map(z => z.id))), label: '' }); changed(); render(); }, 'small'),
    h('h2', {}, 'Mémoire de campagne (fin du niveau)'), h('p', { class: 'muted' }, 'Ce que les niveaux suivants pourront lire (condition « Mémoire de campagne »).'), rm,
    btn('+ Souvenir', () => { L.remember.push({ key: `${L.id}.`, flag: '' }); changed(); render(); }, 'small'),
    h('h2', {}, 'Rencontres mineures'), field('Probabilité sur les cases libres éloignées (0 à 1)', input(L.minorChance ?? 0, v => { L.minorChance = v; changed(); }, { type: 'number', cls: 'num' })));
}

// --- vérification / aide
function panelCheck() {
  const { errors, warnings } = checkLevel(L);
  return h('div', { class: 'panel' }, h('h2', {}, 'Vérification'),
    errors.length || warnings.length ? null : h('p', { class: 'ok big' }, '✓ Aucun problème détecté.'),
    errors.length ? h('div', { class: 'errs' }, h('h3', {}, `${errors.length} erreur(s) — à corriger`), ...errors.map(e => h('div', { class: 'err' }, '✗ ' + e))) : null,
    warnings.length ? h('div', { class: 'warns' }, h('h3', {}, `${warnings.length} avertissement(s)`), ...warnings.map(e => h('div', { class: 'warn' }, '⚠ ' + e))) : null);
}
function panelHelp() {
  return h('div', { class: 'panel help', html: `<h2>Aide</h2>
  <ol><li><b>Carte</b> : ajoutez des cases, peignez les terrains, placez les lieux (un lieu = une case).</li>
  <li><b>Lieux</b> : texte d'aperçu, description, jeton, <b>activités</b> (bouton « Lieu » en jeu) faites d'<b>effets</b>.</li>
  <li><b>Personnages</b> : PNJ (avec « Quand on lui parle »), ennemis (PV, attaque, défense), apparition en entrant dans le lieu ou par <b>vague</b>.</li>
  <li><b>Dialogues</b> : nœuds de texte reliés entre eux ; un nœud se termine par une suite simple, des <b>choix</b>, ou un <b>test de stat</b> qui mène à deux nœuds (réussite / échec). Un choix peut aussi lancer les dés.</li>
  <li><b>Tester ▸</b> ouvre le niveau dans le jeu (onglet séparé, sans toucher à la campagne).</li>
  <li><b>Exporter</b> télécharge <code>&lt;id&gt;.json</code> : à placer dans <code>levels/</code> puis à ajouter à la campagne (<code>js/core/campaign.js</code>).</li></ol>
  <h3>Tests de stat</h3><p>Réussite si D100 ≤ stat du héros actif + difficulté (Facile +20, Normal 0, Difficile −20, Héroïque −40) + modificateur. Les boosts ✦ ajoutent +10 chacun. Stats : ${Object.values(STATS).map(s => `<b>${s.name}</b> (${s.desc})`).join(', ')}.</p>
  <h3>Drapeaux</h3><p>Mémoire du niveau : « Poser un drapeau » puis condition « Drapeau posé ». Leur nom est libre (ex. <code>pontOuvert</code>).</p>
  <p class="muted">Le travail est enregistré automatiquement dans ce navigateur. Exportez régulièrement pour garder une copie.</p>` });
}

// ------------------------------------------------------------------ rendu
function render() {
  const nav = $('#nav'); nav.innerHTML = '';
  for (const [k, l] of TABS) nav.append(h('button', { class: 'tab ' + (ui.tab === k ? 'on' : ''), type: 'button', onclick: () => { ui.tab = k; render(); } }, l));
  const main = $('#main'), sc = main.scrollTop;
  main.innerHTML = '';
  const P = { general: panelGeneral, map: () => mapPanel(ctx), places: panelPlaces, cast: panelCast, dialogues: panelDialogues, quests: panelQuests, events: panelEvents, check: panelCheck, help: panelHelp }[ui.tab];
  main.append(P()); main.scrollTop = sc;
  $('#title').textContent = L.title || L.id; refreshLists(); updateBadge();
}

// ------------------------------------------------------------------ barre d'outils
$('#new').onclick = () => { if (confirm('Commencer un nouveau niveau ? (exportez d\'abord celui-ci si besoin)')) setLevel(emptyLevel()); };
$('#example').onclick = async () => { if (!confirm('Ouvrir le Prologue comme exemple ? (remplace le niveau en cours dans l\'éditeur)')) return; setLevel(await (await fetch('levels/prologue.json', { cache: 'no-cache' })).json()); };
$('#open').onclick = () => $('#file').click();
$('#file').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { setLevel(JSON.parse(await f.text())); } catch (err) { alert('Fichier illisible : ' + err.message); } e.target.value = ''; };
$('#export').onclick = () => {
  const { errors } = checkLevel(L);
  if (errors.length && !confirm(`${errors.length} erreur(s) détectée(s). Exporter quand même ?`)) return;
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(L, null, 1)], { type: 'application/json' })), download: `${L.id || 'niveau'}.json` }); a.click();
};
$('#undo').onclick = doUndo;
$('#test').onclick = () => {
  const { errors } = checkLevel(L);
  if (errors.length) { ui.tab = 'check'; render(); if (!confirm(`${errors.length} erreur(s) : le niveau risque de ne pas fonctionner. Tester quand même ?`)) return; }
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(L)); localStorage.removeItem('grimoire.save.draft.v7'); } catch {}
  window.open('play.html?e=hex&level=draft', 'grimoire-test');
};
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.target.closest('input, textarea')) { e.preventDefault(); doUndo(); } });
render();
