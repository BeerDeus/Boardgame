// Guide pas à pas de l'éditeur : créer une petite étape complète (« La bague de Margot »).
// Chaque étape se coche toute seule quand le niveau en cours la remplit (vérifications sur le JSON).
import { h, btn } from './fields.js';
import { cellsOf, walk } from '../core/level-check.js';
import { emptyLevel } from '../core/level.js';

const KEY = 'grimoire.editor.guide';
const state = (() => { try { return { open: true, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { open: true }; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
export const markTested = () => { state.tested = true; persist(); };

// ------------------------------------------------------------------ lecture du niveau
const npcs = L => (L.cast || []).filter(c => c.team === 'npc' && (L.places || []).some(p => p.id === c.place && p.cell));
const dlgOf = (L, id) => (L.talk?.[id] || []).map(r => L.dialogues?.[r.dialogue]).filter(Boolean);
/** Effets et conditions d'un dialogue (répliques, choix, tests, imbrications) */
function scan(d) {
  const fx = [], conds = [];
  const eff = list => { for (const e of list || []) { fx.push(e); eff(e.then); eff(e.else); eff(e.success); eff(e.fail); if (e.cond) cnd(e.cond); for (const o of e.options || []) eff(o.effects); } };
  const cnd = c => { if (!c?.type) return; conds.push(c); (c.conds || []).forEach(cnd); if (c.cond) cnd(c.cond); };
  const tst = t => { if (!t) return; fx.push({ type: 'test' }); eff(t.successEffects); eff(t.failEffects); };
  for (const n of Object.values(d.nodes || {})) {
    eff(n.effects); tst(n.test); (n.variants || []).forEach(v => cnd(v.cond)); (n.branches || []).forEach(b => cnd(b.cond));
    for (const c of n.choices || []) { eff(c.effects); tst(c.test); cnd(c.cond); }
  }
  return { fx, conds };
}
const npcScans = L => npcs(L).map(c => ({ c, s: dlgOf(L, c.id).map(scan).reduce((a, b) => ({ fx: [...a.fx, ...b.fx], conds: [...a.conds, ...b.conds] }), { fx: [], conds: [] }) }));
const terrains = L => new Set([...Object.values(L.tiles || {}).map(t => t.terrain), ...(L.places || []).filter(p => p.cell).map(p => p.terrain)].filter(Boolean));

// ------------------------------------------------------------------ étapes
const STEPS = [
  { id: 'nom', title: 'Nommer l\'étape', tab: 'general', spot: '#main .row',
    text: `Onglet <b>Général</b> : donnez un <b>identifiant</b> (le nom du fichier, ex. <code>bague</code>) et un <b>titre</b> (ex. « La bague de Margot »).<br><small>Vous pourrez écrire plus tard l'introduction (pages de narration) et les textes de fin.</small>`,
    done: L => L.id && L.id !== 'nouveau' && L.title && L.title !== 'Nouveau niveau' },
  { id: 'cases', title: 'Dessiner la carte (7 cases)', tab: 'map', spot: '.tools',
    text: `Onglet <b>Carte</b>, outil « <b>Ajouter / retirer des cases</b> » : cliquez au moins <b>7 cases</b> qui se touchent. Chaque case = une tuile hexagonale physique.<br><small>Les codes (P-01, F-02…) sont ceux imprimés au dos des tuiles.</small>`,
    done: L => cellsOf(L.hexMap).size >= 7 },
  { id: 'terrain', title: 'Peindre deux terrains', tab: 'map', spot: '.tools',
    text: `Outil « <b>Peindre le terrain</b> » : choisissez un terrain (Village, Forêt…) et glissez sur les cases. Il en faut au moins <b>deux différents</b>, par exemple un village et une forêt.`,
    done: L => terrains(L).size >= 2 },
  { id: 'depart', title: 'Le lieu de départ', tab: 'places', spot: '.side',
    text: `Onglet <b>Lieux</b> : le lieu marqué ★ est celui où les héros commencent. Renommez-le (ex. « <b>Auberge de Margot</b> »), donnez-lui une description, et choisissez sa <b>case</b> (ou onglet Carte → « Placer un lieu »).`,
    done: L => { const cells = cellsOf(L.hexMap), p = (L.places || []).find(x => x.start); return !!p && p.name && p.name !== 'Point de départ' && p.cell && cells.has(p.cell.join(',')); } },
  { id: 'lieu2', title: 'Un deuxième lieu', tab: 'places', spot: '.side .btn.accent',
    text: `« <b>+ Lieu</b> » : créez « <b>Forge de Tobin</b> » et posez-le sur une case à 2 ou 3 cases du départ. Les héros devront s'y rendre : la carte se dévoile au fur et à mesure.`,
    done: L => { const cells = cellsOf(L.hexMap); return (L.places || []).filter(p => p.cell && cells.has(p.cell.join(','))).length >= 2; } },
  { id: 'pnj1', title: 'Premier personnage : Margot', tab: 'cast', spot: '.side .btn.accent',
    text: `Onglet <b>Personnages</b> → « <b>+ Personnage</b> » : nom « <b>Margot</b> », rôle « Aubergiste », camp <b>PNJ</b>, modèle « Aubergiste (civil) », lieu : l'auberge.<br><small>Un PNJ apparaît quand un héros entre dans son lieu ; on lui parle en le touchant.</small>`,
    done: L => npcs(L).length >= 1 },
  { id: 'pnj2', title: 'Deuxième personnage : Tobin', tab: 'cast', spot: '.side .btn.accent',
    text: `Encore « <b>+ Personnage</b> » : « <b>Tobin</b> », Forgeron, camp PNJ, modèle « Forgeron (civil) », lieu : la forge.`,
    done: L => new Set(npcs(L).map(c => c.place)).size >= 2 },
  { id: 'dlg', title: 'Le premier dialogue', tab: 'cast',
    text: `Sélectionnez Margot puis « <b>Créer un dialogue pour ce personnage</b> ». Dans l'onglet <b>Dialogues</b> :<ol>
      <li>Première réplique : « J'ai perdu ma bague… Tobin l'aurait trouvée dans ses cendres. »</li>
      <li>Ajoutez un <b>choix</b> du héros : « Nous allons la chercher. », puis « ＋ Répondre » pour la réponse de Margot.</li></ol>
      <small>« ▶ Essayer ce dialogue » le joue tout de suite. Écrivez **ainsi** pour du gras.</small>`,
    done: L => npcs(L).some(c => dlgOf(L, c.id).some(d => Object.keys(d.nodes || {}).length >= 2 && Object.values(d.nodes).some(n => n.choices?.length))) },
  { id: 'objets', title: 'Deux objets', tab: 'quests',
    text: `Onglet <b>Quêtes & objets</b> → « <b>+ Objet</b> » deux fois : « <b>Miche de pain</b> » et « <b>Bague de Margot</b> ». Choisissez une icône, une illustration de carte et un texte.<br><small>Chaque objet est une vraie carte à imprimer (planche « Cartes d'objets »).</small>`,
    done: L => Object.keys(L.items || {}).length >= 2 },
  { id: 'donner', title: 'Margot confie un objet', tab: 'dialogues',
    text: `Dans le dialogue de Margot, sur le choix « Nous allons la chercher », ajoutez l'effet « <b>Donner un objet</b> » → <b>Miche de pain</b>. Margot peut dire : « Tobin ne fait rien le ventre vide. Portez-lui ça. »<br><small>En jeu, la fenêtre « Prenez la carte » apparaît.</small>`,
    done: L => npcScans(L).some(({ s }) => s.fx.some(e => e.type === 'give')) },
  { id: 'echange', title: 'L\'échange chez Tobin', tab: 'cast',
    text: `Créez un dialogue pour <b>Tobin</b>. Ajoutez un choix « Voici du pain de Margot. » avec la condition « <b>Possède l'objet</b> : Miche de pain » (sans le pain, le choix apparaît verrouillé). Effets : « <b>Retirer un objet</b> : Miche de pain » puis « <b>Donner un objet</b> : Bague de Margot ».<br><small>C'est l'interaction entre les deux personnages : l'un donne, l'autre attend l'objet.</small>`,
    done: L => npcScans(L).some(({ s }) => s.conds.some(c => c.type === 'has') && s.fx.some(e => e.type === 'take') && s.fx.some(e => e.type === 'give')) },
  { id: 'fin', title: 'Rapporter la bague : victoire', tab: 'dialogues',
    text: `Retour au dialogue de Margot : ajoutez un choix « Voici votre bague ! », condition « Possède l'objet : Bague de Margot », effets « Retirer un objet » puis « <b>Victoire</b> ».<br><small>Astuce : une <b>variante</b> de la première réplique (condition « possède la bague ») permet à Margot de s'écrier en vous voyant arriver.</small>`,
    done: L => { let v = false; walk(L, (k, o) => { if (k === 'effect' && o.type === 'victory') v = true; }); return v || npcScans(L).some(({ s }) => s.fx.some(e => e.type === 'victory')); } },
  { id: 'des', title: 'Bonus : un jet de dés', tab: 'dialogues', optional: true,
    text: `Sur un choix, « 🎲 <b>Ajouter un test</b> » : par exemple « Marchander avec Tobin » en <b>Volonté</b>. Réussite : il donne aussi des herbes ; échec : il soupire. Les joueurs voient l'emblème de la stat, et devinent la difficulté au ton de la phrase.`,
    done: L => npcScans(L).some(({ s }) => s.fx.some(e => e.type === 'test')) },
  { id: 'verifier', title: 'Vérifier', tab: 'check',
    text: `Onglet <b>Vérifier</b> : corrigez les erreurs (✗). Les avertissements (⚠) sont des conseils.`,
    done: (L, ctx) => !ctx.check().errors.length && STEPS.filter(x => !x.optional && !['verifier', 'tester'].includes(x.id)).every(x => { try { return x.done(L, ctx); } catch { return false; } }) },
  { id: 'tester', title: 'Tester ▸', tab: null, spot: '#test',
    text: `« <b>Tester ▸</b> » ouvre votre étape dans le jeu, dans un onglet séparé (la campagne n'est pas touchée). Jouez-la jusqu'à la victoire !<br><small>Ensuite : onglet <b>Campagne</b> → « + Étape : niveau en cours », puis « ⇪ Publier ».</small>`,
    done: () => !!state.tested },
];

// ------------------------------------------------------------------ panneau
let panel = null, api = null, lastCur = null;
export function initGuide(a) {
  api = a;
  panel = h('aside', { class: 'guide' }); document.body.append(panel);
  if (state.open) document.body.classList.add('with-guide');
  update();
}
export function toggleGuide(v = !state.open) { state.open = v; persist(); document.body.classList.toggle('with-guide', v); update(); }

function flash(sel) {
  const el = sel && document.querySelector(sel); if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('guide-flash'); void el.offsetWidth; el.classList.add('guide-flash');
  setTimeout(() => el.classList.remove('guide-flash'), 2600);
}
export function update() {
  if (!panel || !api) return;
  if (!state.open) { panel.innerHTML = ''; panel.hidden = true; return; }
  panel.hidden = false;
  const L = api.L, done = STEPS.map(s => { try { return !!s.done(L, api); } catch { return false; } });
  const cur = STEPS.findIndex((s, i) => !done[i] && !s.optional) >= 0 ? STEPS.findIndex((s, i) => !done[i] && !s.optional) : -1;
  const need = STEPS.filter(s => !s.optional), nDone = STEPS.filter((s, i) => !s.optional && done[i]).length;
  if (lastCur !== null && cur !== lastCur) { state.show = null; persist(); } // étape suivante : on l'ouvre
  lastCur = cur;
  const open = state.show || STEPS[cur]?.id;
  panel.innerHTML = '';
  panel.append(
    h('div', { class: 'g-head' }, h('b', {}, '🧭 Guide : votre première étape'), h('button', { class: 'ib', type: 'button', title: 'Fermer le guide', onclick: () => toggleGuide(false) }, '✕')),
    h('p', { class: 'g-intro' }, 'Créez « La bague de Margot » : une carte, deux personnages, un dialogue, un échange d\'objets, une victoire. Chaque étape se coche toute seule.'),
    h('div', { class: 'g-bar' }, h('i', { style: `width:${Math.round(nDone / need.length * 100)}%` }), h('span', {}, `${nDone} / ${need.length}`)),
    row2(btn('Commencer un niveau d\'essai', () => {
      if (!confirm('Remplacer le niveau ouvert dans l\'éditeur par un niveau vide ? (exportez-le d\'abord si besoin)')) return;
      state.tested = false; state.show = null; persist();
      const e = emptyLevel();
      api.setLevel({ ...e, id: 'nouveau', title: 'Nouveau niveau', hexMap: ['', '   o'], places: e.places.map(p => ({ ...p, cell: [3, 1] })), intro: [{ title: 'La bague de Margot', image: 'assets/bg/painting1.jpg', text: 'Au hameau, Margot l\'aubergiste a perdu sa bague…' }] });
    }, 'small'), cur < 0 ? h('span', { class: 'ok' }, '✓ Bravo, étape terminée !') : ''));
  STEPS.forEach((s, i) => {
    const isOpen = s.id === open, st = done[i] ? 'done' : i === cur ? 'cur' : s.optional ? 'opt' : '';
    const card = h('div', { class: `g-step ${st} ${isOpen ? 'open' : ''}` },
      h('div', { class: 'g-t', onclick: () => { state.show = isOpen ? '' : s.id; persist(); update(); } },
        h('em', {}, done[i] ? '✓' : String(i + 1)), h('span', {}, s.title + (s.optional ? ' (facultatif)' : ''))));
    if (isOpen) card.append(h('div', { class: 'g-body', html: s.text }),
      (s.tab || s.spot) ? btn(s.tab ? 'Montre-moi ▸' : 'Où ? ▸', () => { if (s.tab) api.goTab(s.tab); setTimeout(() => flash(s.spot || '#main h2'), 80); }, 'small') : '');
    panel.append(card);
  });
}
const row2 = (...k) => h('div', { class: 'g-row' }, ...k);
