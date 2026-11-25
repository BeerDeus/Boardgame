// Panneau « Étapes » de l'éditeur (à gauche, ouvert par une flèche) : toutes les étapes de la campagne
// (Prologue compris), statut de chacune, structure du niveau ouvert, et niveaux hors campagne.
// Chaque niveau a sa propre copie de travail (navigateur) : passer d'une étape à l'autre ne perd rien.
import { h, btn, icoBtn } from './fields.js';
import { loadEditorCampaign, campaign, campaignChanged, STATUSES, stepStatus, setStepStatus } from './campaign.js';
import { emptyLevel } from '../core/level.js';

const OPEN_KEY = 'grimoire.editor.drawer';
let api = null, el = null, tab = null, open = false;

/**
 * api = { L(), openLevel(id, file), newLevelFor(step), work(), isModified(id), revert(id), forget(id), goTab(tab, sel), newLevel() }
 */
export function initLevelsDrawer(a) {
  api = a;
  el = h('aside', { class: 'ldrawer' });
  tab = h('button', { class: 'ldrawer-tab', type: 'button', title: 'Étapes de la campagne', onclick: () => toggleDrawer() });
  document.body.append(el, tab);
  try { open = localStorage.getItem(OPEN_KEY) === '1'; } catch {}
  loadEditorCampaign().catch(() => {}).then(() => refreshDrawer());
  setOpen(open);
}
function setOpen(v) {
  open = v; document.body.classList.toggle('ldrawer-open', v);
  tab.innerHTML = `<span>${v ? '◂' : '▸'}</span><b>Étapes</b>`;
  try { localStorage.setItem(OPEN_KEY, v ? '1' : '0'); } catch {}
  if (v) refreshDrawer();
}
export const toggleDrawer = v => setOpen(v ?? !open);

/** Résumé de la structure du niveau ouvert : compteurs cliquables + lieux et leurs personnages */
function structure(L) {
  const npc = (L.cast || []).filter(c => c.team === 'npc'), foes = (L.cast || []).filter(c => ['enemy', 'boss'].includes(c.team));
  const cells = (L.hexMap || []).reduce((n, r) => n + [...r].filter(ch => ch !== ' ' && ch !== '.').length, 0);
  const chip = (ic, label, n, t) => h('button', { class: 'ls-chip', type: 'button', title: `Ouvrir l'onglet ${label}`, onclick: () => api.goTab(t) }, `${ic} ${n} `, h('small', {}, label));
  const byPlace = {}; for (const c of L.cast || []) (byPlace[c.place] ||= []).push(c);
  return h('div', { class: 'ls-struct' },
    h('div', { class: 'ls-chips' },
      chip('🗺', 'cases', cells, 'map'), chip('📍', 'lieux', (L.places || []).length, 'places'), chip('👤', 'PNJ', npc.length, 'cast'), chip('⚔', 'monstres', foes.length, 'cast'),
      chip('💬', 'dialogues', Object.keys(L.dialogues || {}).length, 'dialogues'), chip('🎯', 'quêtes', Object.keys(L.quests || {}).length, 'quests'), chip('🎴', 'objets', Object.keys(L.items || {}).length, 'quests')),
    h('div', { class: 'ls-places' }, ...(L.places || []).map(p => h('button', { class: 'ls-place', type: 'button', onclick: () => api.goTab('places', { place: p.id }) },
      h('b', {}, `${p.start ? '★ ' : ''}${p.name || p.id}`),
      (p.activities || []).length ? h('small', { class: 'ls-act' }, ` · ${p.activities.length} activité${p.activities.length > 1 ? 's' : ''}`) : null,
      ...(byPlace[p.id] || []).map(c => h('span', { class: 'ls-who ' + (c.team === 'npc' ? 'npc' : 'foe'), title: c.role || '', onclick: e => { e.stopPropagation(); api.goTab('cast', { cast: c.id }); } }, c.name || c.id))))));
}

// ------------------------------------------------------------------ statuts et dossiers
const STATUS_HELP = { idea: 'pas encore de niveau, ou à peine esquissé', wip: 'en construction', test: 'prêt à être essayé', live: 'jouable depuis l\'accueil' };
const levelId = s => s.level?.match(/^levels\/([\w.-]+)\.json$/)?.[1];
const FOLD_KEY = 'grimoire.editor.drawer.folds';
let folds = (() => { try { return new Set(JSON.parse(localStorage.getItem(FOLD_KEY)) || []); } catch { return new Set(); } })();
const toggleFold = k => { folds.has(k) ? folds.delete(k) : folds.add(k); try { localStorage.setItem(FOLD_KEY, JSON.stringify([...folds])); } catch {} refreshDrawer(); };
const saved = () => { campaignChanged(); refreshDrawer(); };

// ------------------------------------------------------------------ déplacements
let drag = null; // { kind: 'step', act, step } | { kind: 'draft', id }
function removeStep(s) { for (const a of campaign().acts) { const i = (a.steps || []).indexOf(s); if (i >= 0) { a.steps.splice(i, 1); return; } } }
/** Place une étape dans un acte, avant une autre étape (ou après la dernière de ce statut), avec ce statut */
function placeStep(s, act, st, before = null) {
  if (st === 'live' && !s.level) { alert('Une étape « Live » doit avoir un niveau : créez-le d\'abord.'); return false; }
  act.steps ||= [];
  const i0 = before === s ? act.steps.indexOf(s) : -1; // changement de statut sur place : même position
  removeStep(s);
  let i = i0 >= 0 ? i0 : before ? act.steps.indexOf(before) : -1;
  if (i < 0) { const same = act.steps.map((x, k) => (stepStatus(x) === st ? k : -1)).filter(k => k >= 0); i = same.length ? same.at(-1) + 1 : act.steps.length; }
  act.steps.splice(i, 0, s); setStepStatus(s, st);
  if (st === 'live' && api.isModified(levelId(s))) alert(`« ${s.num || s.id} » est Live mais son niveau a des modifications non publiées : pensez à « ⇪ Publier ».`);
  return true;
}
/** Brouillon hors campagne → étape (ou rattaché à une étape « Idée » sans niveau) */
function draftToStep(id, act, st, target = null) {
  const lv = id === api.L().id ? api.L() : api.work()[id]?.level;
  if (target && !target.level) { target.level = `levels/${id}.json`; if (!target.title || target.title === 'À venir') target.title = lv?.title || id; placeStep(target, act, st === 'idea' ? 'wip' : st, target); return; }
  const ids = new Set(campaign().acts.flatMap(a => (a.steps || []).map(x => x.id)));
  let sid = id, n = 2; while (ids.has(sid)) sid = `${id}${n++}`;
  placeStep({ id: sid, num: 'Étape ?', title: lv?.title || id, level: `levels/${id}.json` }, act, st, target);
}
function onDrop(act, st, target) {
  const d = drag; drag = null; if (!d) return;
  if (d.kind === 'step') { if (d.step === target) return; placeStep(d.step, act, st, target); }
  else draftToStep(d.id, act, st, target);
  saved();
}
const dropZone = (node, act, st, target = null) => {
  node.addEventListener('dragover', e => { if (!drag) return; e.preventDefault(); node.classList.add('drop'); });
  node.addEventListener('dragleave', () => node.classList.remove('drop'));
  node.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); node.classList.remove('drop'); onDrop(act, st, target); });
};

// ------------------------------------------------------------------ menu « ⋯ »
function menu(anchor, items) {
  document.querySelector('.ld-menu')?.remove();
  const m = h('div', { class: 'ld-menu' }, ...items.map(it => (it === '-' ? h('hr') : it.head ? h('small', {}, it.head)
    : h('button', { type: 'button', class: it.on ? 'on' : '', disabled: it.disabled || undefined, onclick: () => { m.remove(); it.run(); } }, it.label))));
  document.body.append(m);
  const r = anchor.getBoundingClientRect(); m.style.left = `${Math.min(r.left, innerWidth - 230)}px`; m.style.top = `${Math.min(r.bottom + 2, innerHeight - m.offsetHeight - 8)}px`;
  setTimeout(() => document.addEventListener('pointerdown', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off); } }), 0);
}
function stepMenu(btnEl, a, s) {
  const C = campaign(), st = stepStatus(s), i = a.steps.indexOf(s);
  menu(btnEl, [
    { head: 'Statut' }, ...STATUSES.map(([k, l]) => ({ label: `${k === st ? '● ' : ''}${l}`, on: k === st, disabled: k === 'live' && !s.level, run: () => { if (placeStep(s, a, k, s)) saved(); } })),
    '-', { label: '↑ Monter', disabled: i <= 0, run: () => { a.steps.splice(i, 1); a.steps.splice(i - 1, 0, s); saved(); } },
    { label: '↓ Descendre', disabled: i >= a.steps.length - 1, run: () => { a.steps.splice(i, 1); a.steps.splice(i + 1, 0, s); saved(); } },
    ...C.acts.filter(x => x !== a).map(x => ({ label: `→ ${x.num || x.id} : ${x.title || ''}`, run: () => { placeStep(s, x, st); saved(); } })),
    '-', { label: '✎ Renommer…', run: () => { const n = prompt('Numéro (ex. Étape II)', s.num || ''); if (n == null) return; const t = prompt('Titre', s.title || ''); if (t == null) return; s.num = n; s.title = t; saved(); } },
    s.level ? { label: '⤓ Retirer de la campagne (le niveau reste en brouillon)', run: () => { if (!confirm(`Retirer « ${s.num || s.id} » de la campagne ? Le niveau reste dans « Hors campagne ».`)) return; removeStep(s); saved(); } }
      : { label: '✕ Supprimer cette étape', run: () => { if (confirm(`Supprimer l'étape « ${s.num || s.id} » ?`)) { removeStep(s); saved(); } } },
  ]);
}
function draftMenu(btnEl, id, title) {
  const C = campaign();
  menu(btnEl, [
    { head: 'Ajouter à la campagne' }, ...C.acts.map(x => ({ label: `→ ${x.num || x.id} (En cours)`, run: () => { draftToStep(id, x, 'wip'); saved(); } })),
    '-', { label: '✕ Supprimer ce brouillon de ce navigateur', disabled: id === api.L().id, run: () => { if (confirm(`Supprimer le brouillon « ${title} » de ce navigateur ?`)) { api.forget(id); refreshDrawer(); } } },
  ]);
}

// ------------------------------------------------------------------ rendu
export function refreshDrawer() {
  if (!el || !open || drag) return;
  const L = api.L(), C = campaign(), cur = `levels/${L.id}.json`, work = api.work();
  el.innerHTML = '';
  el.append(h('div', { class: 'ld-head' }, h('b', {}, 'Étapes de la campagne'), icoBtn('◂', 'Fermer', () => toggleDrawer(false))),
    h('p', { class: 'muted ld-help' }, 'Cliquez une étape pour l\'éditer ; glissez-la vers un autre dossier ou un autre acte, ou utilisez « ⋯ ». Seules les étapes « Live » sont jouables depuis l\'accueil. Les modifications restent dans ce navigateur jusqu\'à « ⇪ Publier ».'));
  if (!C) { el.append(h('p', { class: 'muted' }, 'Chargement de la campagne…')); return; }
  const inCamp = new Set();
  for (const a of C.acts || []) {
    a.steps ||= [];
    const box = h('div', { class: 'ld-act' }, h('div', { class: 'ld-act-h' }, h('small', {}, a.num || a.id), h('b', {}, a.title || '')));
    for (const [st, label] of STATUSES) {
      const list = a.steps.filter(x => stepStatus(x) === st), fk = `${a.id}:${st}`, folded = folds.has(fk);
      const head = h('button', { class: `ld-fold st-${st}`, type: 'button', title: STATUS_HELP[st], onclick: () => toggleFold(fk) }, h('span', {}, folded ? '▸' : '▾'), h('b', {}, label), h('em', {}, String(list.length)));
      const body = h('div', { class: 'ld-fold-b' + (list.length ? '' : ' empty') });
      dropZone(head, a, st); dropZone(body, a, st);
      if (!folded) for (const s of list) {
        const id = levelId(s); if (id) inCamp.add(id);
        const isCur = s.level && s.level === cur, mod = id && api.isModified(id), fresh = mod && work[id]?.src === null;
        const row = h('div', { class: 'ld-step ' + (isCur ? 'on' : '') + (!s.level ? ' soon' : ''), draggable: 'true' },
          h('span', { class: 'ld-grip', title: 'Glisser pour déplacer' }, '⋮⋮'),
          h('button', { class: 'ld-step-b', type: 'button', onclick: () => (s.level ? (isCur ? null : api.openLevel(id, s.level)) : createFor(s)) },
            h('small', {}, s.num || s.id), h('b', {}, s.title || ''), s.tag ? h('span', { class: 'ld-tag' }, s.tag) : null,
            !s.level ? h('em', { class: 'ld-st soon' }, 'pas de niveau') : isCur ? h('em', { class: 'ld-st cur' }, 'ouvert') : null,
            mod ? h('em', { class: 'ld-st mod', title: fresh ? 'Nouveau niveau, pas encore publié' : 'Modifié dans l\'éditeur, pas encore publié' }, fresh ? 'non publié' : 'modifié') : null),
          mod && !fresh ? icoBtn('↺', 'Revenir à la version du jeu (abandonne les modifications locales)', () => api.revert(id, s.level)) : null,
          icoBtn('⋯', 'Statut, déplacer, renommer…', e => stepMenu(e.currentTarget, a, s)));
        row.addEventListener('dragstart', e => { drag = { kind: 'step', act: a, step: s }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); row.classList.add('dragging'); });
        row.addEventListener('dragend', () => { row.classList.remove('dragging'); if (drag) { drag = null; refreshDrawer(); } });
        dropZone(row, a, st, s);
        body.append(row);
        if (isCur) body.append(structure(L));
      } else for (const s of list) { const id = levelId(s); if (id) inCamp.add(id); }
      box.append(head, folded ? null : body);
    }
    el.append(box);
  }
  // niveaux hors campagne (copies de travail : guide, brouillons…)
  const others = Object.keys(work).filter(id => !inCamp.has(id));
  if (!inCamp.has(L.id) && !others.includes(L.id)) others.unshift(L.id);
  el.append(h('div', { class: 'ld-act' }, h('div', { class: 'ld-act-h' }, h('small', {}, 'Hors campagne'), h('b', {}, 'Brouillons de ce navigateur')),
    h('p', { class: 'muted ld-empty' }, 'Glissez un brouillon dans un dossier d\'acte pour en faire une étape (ou sur une étape « Idée » sans niveau pour l\'y rattacher).'),
    ...others.map(id => { const isCur = id === L.id, lv = isCur ? L : work[id]?.level;
      const row = h('div', { class: 'ld-step ' + (isCur ? 'on' : ''), draggable: 'true' },
        h('span', { class: 'ld-grip', title: 'Glisser vers un acte' }, '⋮⋮'),
        h('button', { class: 'ld-step-b', type: 'button', onclick: () => (isCur ? null : api.openLevel(id, null)) }, h('small', {}, id), h('b', {}, lv?.title || id), isCur ? h('em', { class: 'ld-st cur' }, 'ouvert') : null),
        icoBtn('⋯', 'Ajouter à la campagne, supprimer…', e => draftMenu(e.currentTarget, id, lv?.title || id)));
      row.addEventListener('dragstart', e => { drag = { kind: 'draft', id }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); row.classList.add('dragging'); });
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); if (drag) { drag = null; refreshDrawer(); } });
      return [row, isCur ? structure(L) : null]; }).flat(),
    !others.length ? h('p', { class: 'muted ld-empty' }, 'Aucun.') : null,
    btn('+ Nouveau niveau', () => api.newLevel(), 'small wide')));
}

/** Étape sans niveau : créer son niveau (identifiant = celui de l'étape), relié à la campagne, statut « En cours » */
function createFor(s) {
  if (!confirm(`Créer le niveau de « ${s.num || s.id} » ?\nIl sera relié à cette étape (levels/${s.id}.json), en statut « En cours » (non jouable tant qu'il n'est pas Live).`)) return;
  const L = emptyLevel();
  L.id = s.id; L.title = s.title && s.title !== 'À venir' ? s.title : (s.num || s.id);
  L.intro[0].title = L.title;
  s.level = `levels/${s.id}.json`; if (s.title === 'À venir') s.title = L.title;
  if (stepStatus(s) === 'idea' || !s.status) setStepStatus(s, 'wip');
  campaignChanged();
  api.newLevelFor(L);
}
