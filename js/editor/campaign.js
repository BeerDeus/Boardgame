// Éditeur → campagne : Actes et étapes (ordre, déblocage, titres, illustrations) = levels/campaign.json,
// lu par l'accueil et par le jeu. Publication sur GitHub (niveau + campagne) depuis l'éditeur.
import { h, input, textarea, checkbox, select, field, row, btn, icoBtn, IMAGES, slug } from './fields.js';
import { CAMPAIGN_URL } from '../core/campaign.js';
import { ghConfig, ghSave, ghForget, ghCheck, ghPut, GH_DEFAULT } from './github.js';

const STORE = 'grimoire.editor.campaign';
let C = null;
const listeners = new Set();
export const onCampaignChange = f => listeners.add(f);
function saveC() { try { localStorage.setItem(STORE, JSON.stringify(C)); } catch {} listeners.forEach(f => f()); }

export async function loadEditorCampaign(force = false) {
  if (!force) { try { C = JSON.parse(localStorage.getItem(STORE)); } catch {} }
  if (!C || force) { C = await (await fetch(CAMPAIGN_URL, { cache: 'no-cache' })).json(); saveC(); }
  C.acts ||= [];
  return C;
}
export const campaign = () => C;
export const campaignJSON = () => JSON.stringify(C, null, 1) + '\n';
/** Fichiers de niveaux référencés par la campagne */
export const campaignLevelFiles = () => (C?.acts || []).flatMap(a => (a.steps || []).filter(s => s.level).map(s => ({ act: a, step: s, file: s.level })));

/** Vérification de la campagne */
export function checkCampaign(c = C) {
  const errors = [], warnings = [], ids = new Set(), aids = new Set();
  if (!c?.acts?.length) errors.push('La campagne n\'a aucun acte.');
  for (const a of c?.acts || []) {
    if (!a.id) errors.push('Un acte n\'a pas d\'identifiant.'); else if (aids.has(a.id)) errors.push(`Identifiant d'acte en double : ${a.id}`); else aids.add(a.id);
    for (const s of a.steps || []) {
      if (!s.id) errors.push(`${a.num || a.id} : une étape n'a pas d'identifiant.`); else if (ids.has(s.id)) errors.push(`Identifiant d'étape en double : ${s.id}`); else ids.add(s.id);
      if (!s.soon && !s.level) warnings.push(`${a.num || a.id} › ${s.num || s.id} : pas de fichier de niveau (affichée « À venir »).`);
      if (s.level && !/^levels\/[\w.-]+\.json$/.test(s.level)) errors.push(`${s.num || s.id} : fichier « ${s.level} » invalide (attendu : levels/<id>.json).`);
    }
  }
  const all = new Set([...ids]);
  for (const a of c?.acts || []) {
    for (const r of a.requires || []) if (!all.has(r)) errors.push(`${a.num || a.id} : prérequis inconnu « ${r} ».`);
    for (const s of a.steps || []) for (const r of s.requires || []) if (!all.has(r)) errors.push(`${s.num || s.id} : prérequis inconnu « ${r} ».`);
  }
  return { errors, warnings };
}

const imgInput = (obj, key, changed) => {
  const el = input(obj[key], v => { obj[key] = v || undefined; changed(); prev.style.backgroundImage = v ? `url('${v}')` : ''; }, { list: 'dl-images', placeholder: 'assets/bg/painting1.jpg' });
  const prev = h('span', { class: 'imgprev' }); if (obj[key]) prev.style.backgroundImage = `url('${obj[key]}')`;
  return h('span', { class: 'imgfld' }, prev, el);
};
/** « Débloqué après » : prérequis unique (ou défaut / toujours) */
function requiresSelect(obj, allSteps, defLabel, changed) {
  const cur = obj.requires === undefined ? '' : obj.requires.length ? obj.requires[0] : '__always';
  return select(cur, [['__always', 'Toujours (dès l\'ouverture)'], ...allSteps.filter(s => s.id !== obj.id).map(s => [s.id, `après ${s.num || ''} ${s.title || s.id}`])], v => {
    if (!v) delete obj.requires; else if (v === '__always') obj.requires = []; else obj.requires = [v];
    changed();
  }, { empty: defLabel });
}

/** Panneau « Campagne » de l'éditeur */
export function panelCampaign(ctx) {
  const changed = () => { saveC(); };
  const redraw = () => ctx.refresh();
  const p = h('div', { class: 'panel campaign' });
  if (!C) { p.append(h('p', { class: 'muted' }, 'Chargement de la campagne…')); loadEditorCampaign().then(redraw).catch(e => { p.innerHTML = `<p class="err">campaign.json illisible : ${e.message}</p>`; }); return p; }
  const allSteps = C.acts.flatMap(a => a.steps || []);
  const levelFile = `levels/${ctx.L.id}.json`;
  const inCampaign = allSteps.some(s => s.level === levelFile);
  const { errors, warnings } = checkCampaign();
  p.append(h('h2', {}, 'Campagne'),
    h('p', { class: 'muted' }, 'Actes et étapes affichés sur l\'accueil (fichier levels/campaign.json). Une étape est débloquée quand ses prérequis sont gagnés (par défaut : l\'étape précédente de l\'acte) ; un acte, quand toutes les étapes jouables de l\'acte précédent sont gagnées.'),
    row(btn('↻ Recharger depuis le jeu', async () => { if (!confirm('Abandonner les modifications de campagne faites dans l\'éditeur ?')) return; await loadEditorCampaign(true); redraw(); }, 'small'),
      btn('Exporter campaign.json', () => { h('a', { href: URL.createObjectURL(new Blob([campaignJSON()], { type: 'application/json' })), download: 'campaign.json' }).click(); }, 'small'),
      btn('⇪ Publier sur GitHub…', () => publishDialog(ctx), 'small accent')),
    row(field('Titre de la campagne', input(C.title, v => { C.title = v; changed(); })), field('Sous-titre', input(C.subtitle, v => { C.subtitle = v; changed(); }))),
    errors.length ? h('div', { class: 'errs' }, ...errors.map(e => h('div', { class: 'err' }, '✗ ' + e))) : '',
    warnings.length ? h('div', { class: 'warns' }, ...warnings.map(e => h('div', { class: 'warn' }, '⚠ ' + e))) : '',
    inCampaign ? h('p', { class: 'ok' }, `✓ Le niveau en cours (${levelFile}) est dans la campagne.`) : h('p', { class: 'warn' }, `⚠ Le niveau en cours (${levelFile}) n'est dans aucune étape : ajoutez-le ci-dessous (« + Étape : niveau en cours »).`));

  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; changed(); redraw(); };
  C.acts.forEach((a, ai) => {
    a.steps ||= [];
    const card = h('div', { class: 'card act-card' },
      h('div', { class: 'card-h' }, h('b', {}, `${a.num || 'Acte'} — ${a.title || a.id}`), h('span', { class: 'sp' }),
        icoBtn('↑', 'Monter', () => move(C.acts, ai, -1)), icoBtn('↓', 'Descendre', () => move(C.acts, ai, 1)),
        icoBtn('✕', 'Supprimer l\'acte', () => { if (confirm(`Supprimer ${a.num || a.id} et ses étapes ?`)) { C.acts.splice(ai, 1); changed(); redraw(); } }, 'del')),
      row(field('Identifiant', input(a.id, v => { a.id = slug(v); changed(); })), field('Numéro', input(a.num, v => { a.num = v; changed(); }, { placeholder: 'Acte I' })), field('Titre', input(a.title, v => { a.title = v; changed(); }))),
      field('Description', textarea(a.desc, v => { a.desc = v; changed(); }, { rows: 2 })),
      row(field('Illustration', imgInput(a, 'image', changed)), field('Débloqué après', requiresSelect(a, allSteps, '(acte précédent terminé)', changed)), field('Verrouillé', checkbox(a.soon, v => { if (v) a.soon = true; else delete a.soon; changed(); }, '« À venir »'))));
    const steps = h('div', { class: 'steps-ed' });
    a.steps.forEach((s, si) => steps.append(h('div', { class: 'step-ed' + (s.level === levelFile ? ' current' : '') },
      h('div', { class: 'card-h' }, h('b', {}, `${s.num || '?'} · ${s.title || s.id}`), s.level ? h('small', { class: 'muted' }, ` ${s.level}`) : h('small', { class: 'muted' }, ' (à venir)'), h('span', { class: 'sp' }),
        icoBtn('↑', 'Monter', () => move(a.steps, si, -1)), icoBtn('↓', 'Descendre', () => move(a.steps, si, 1)),
        icoBtn('✕', 'Supprimer l\'étape', () => { a.steps.splice(si, 1); changed(); redraw(); }, 'del')),
      row(field('Identifiant', input(s.id, v => { s.id = slug(v); changed(); })), field('Numéro', input(s.num, v => { s.num = v; changed(); }, { placeholder: 'Étape I' })),
        field('Titre', input(s.title, v => { s.title = v; changed(); })), field('Étiquette', input(s.tag, v => { s.tag = v || undefined; changed(); }, { placeholder: 'Tutoriel' }))),
      row(field('Fichier du niveau', input(s.level, v => { s.level = v || undefined; if (v) delete s.soon; changed(); }, { list: 'dl-levels', placeholder: 'levels/etape1.json' })),
        field('Illustration', imgInput(s, 'image', changed)), field('Débloquée après', requiresSelect(s, allSteps, '(étape précédente)', changed)),
        field('À venir', checkbox(s.soon, v => { if (v) s.soon = true; else delete s.soon; changed(); }))),
      field('Résumé (sous l\'étape)', input(s.desc, v => { s.desc = v || undefined; changed(); })))));
    card.append(steps, row(
      btn('+ Étape', () => { const id = uniq('etape', allSteps); a.steps.push({ id, num: `Étape ${a.steps.length}`, title: 'Nouvelle étape', soon: true }); changed(); redraw(); }, 'small'),
      inCampaign ? null : btn(`+ Étape : niveau en cours (${ctx.L.title || ctx.L.id})`, () => { const id = allSteps.some(x => x.id === ctx.L.id) ? uniq(ctx.L.id, allSteps) : ctx.L.id; a.steps.push({ id, num: `Étape ${a.steps.length}`, title: ctx.L.title || id, level: levelFile }); changed(); redraw(); }, 'small accent')));
    p.append(card);
  });
  p.append(btn('+ Acte', () => { const n = C.acts.length + 1; C.acts.push({ id: uniq('acte', C.acts), num: `Acte ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n - 1] || n}`, title: 'Nouvel acte', desc: '', image: IMAGES[0], steps: [] }); changed(); redraw(); }, 'small'));
  p.append(h('datalist', { id: 'dl-images' }, ...IMAGES.map(u => h('option', { value: u }))),
    h('datalist', { id: 'dl-levels' }, ...[...new Set([levelFile, ...allSteps.map(s => s.level).filter(Boolean)])].map(u => h('option', { value: u }))));
  return p;
}
const uniq = (base, list) => { let i = 1, id = base; const ids = new Set(list.map(x => x.id)); while (ids.has(id)) id = `${base}${++i}`; return id; };

// ------------------------------------------------------------------ publication GitHub
const modalEl = () => document.getElementById('modal') || document.body.appendChild(h('div', { id: 'modal', class: 'modal' }));
function closeModal() { modalEl().classList.remove('open'); modalEl().innerHTML = ''; }
const TOKEN_HELP = `<ol class="gh-help">
  <li>Sur github.com : photo de profil → <b>Settings</b> → <b>Developer settings</b> → <b>Personal access tokens</b> → <b>Fine-grained tokens</b> → <b>Generate new token</b>.</li>
  <li>Nom : « Grimoire éditeur » ; expiration : 90 jours par exemple.</li>
  <li><b>Resource owner</b> : le propriétaire du dépôt (${GH_DEFAULT.repo.split('/')[0]}).</li>
  <li><b>Repository access</b> : <i>Only select repositories</i> → <b>${GH_DEFAULT.repo}</b> uniquement.</li>
  <li><b>Permissions</b> → Repository permissions → <b>Contents : Read and write</b> (rien d'autre ; « Metadata : Read » s'ajoute tout seul).</li>
  <li><b>Generate token</b>, copiez le jeton (<code>github_pat_…</code>) et collez-le ci-dessous.</li></ol>
  <p class="muted">Le jeton reste <b>uniquement dans ce navigateur</b> (stockage local de cet appareil) ; il n'est jamais commité ni envoyé ailleurs qu'à api.github.com. « Oublier le jeton » l'efface.</p>`;

/**
 * Fenêtre de publication : envoie levels/<id>.json (le niveau en cours) et levels/campaign.json
 * sur la branche de déploiement. Refusée si le niveau ou la campagne ont des erreurs.
 */
export async function publishDialog(ctx) {
  if (!C) await loadEditorCampaign();
  const m = modalEl(), cfg = ghConfig();
  const lvl = ctx.check(), camp = checkCampaign();
  const levelFile = `levels/${ctx.L.id}.json`, inCampaign = campaignLevelFiles().some(x => x.file === levelFile);
  const blocked = lvl.errors.length || camp.errors.length;
  let tokOpen = !cfg.token;
  const render = (status = '') => {
    m.innerHTML = '';
    const tok = input(cfg.token, v => { cfg.token = v.trim(); }, { type: 'password', placeholder: 'github_pat_…' });
    const msg = input(`Éditeur : ${ctx.L.title || ctx.L.id}`, () => {});
    const withLevel = checkbox(true, () => {}), withCamp = checkbox(true, () => {});
    const card = h('div', { class: 'modal-card' },
      h('h2', {}, 'Publier sur GitHub'),
      h('p', {}, `Dépôt `, h('b', {}, cfg.repo), ` · branche `, h('b', {}, cfg.branch), h('br'), h('small', { class: 'muted' }, 'Hostinger déploie automatiquement cette branche : le jeu en ligne est à jour quelques instants après.')),
      blocked ? h('div', { class: 'errs' }, h('h3', {}, 'Publication impossible : corrigez d\'abord les erreurs'),
        ...lvl.errors.map(e => h('div', { class: 'err' }, '✗ Niveau : ' + e)), ...camp.errors.map(e => h('div', { class: 'err' }, '✗ Campagne : ' + e))) : null,
      !inCampaign && !blocked ? h('p', { class: 'warn' }, `⚠ ${levelFile} n'est dans aucune étape de la campagne : il sera publié mais pas jouable depuis l'accueil (onglet Campagne → « + Étape : niveau en cours »).`) : null,
      h('div', { class: 'gh-files' }, h('label', { class: 'chk' }, withLevel, ` ${levelFile}`, lvl.warnings.length ? h('small', { class: 'muted' }, ` (${lvl.warnings.length} avertissement(s))`) : null), h('label', { class: 'chk' }, withCamp, ` ${CAMPAIGN_URL}`)),
      field('Message du commit', msg),
      h('details', { open: tokOpen || undefined, ontoggle: e => { tokOpen = e.target.open; } }, h('summary', {}, cfg.token ? 'Jeton GitHub enregistré sur cet appareil' : 'Jeton GitHub (à créer une fois)'), h('div', { html: TOKEN_HELP }),
        field('Jeton', tok), row(btn('Enregistrer le jeton', async () => { ghSave({ token: cfg.token }); try { await ghCheck(cfg); render('✓ Jeton valide : écriture autorisée sur le dépôt.'); } catch (e) { render('✗ ' + e.message); } }, 'small'),
          btn('Oublier le jeton', () => { ghForget(); cfg.token = ''; render('Jeton effacé de cet appareil.'); }, 'small ghost'))),
      status ? h('p', { class: 'gh-status', html: status }) : null,
      h('div', { class: 'modal-btns' }, btn('Fermer', closeModal, 'ghost'),
        h('button', { class: 'btn accent', type: 'button', disabled: blocked || undefined, onclick: async e => {
          if (!cfg.token) { render('✗ Saisissez d\'abord un jeton.'); return; }
          ghSave({ token: cfg.token });
          e.target.disabled = true;
          const files = [];
          if (withLevel.checked) files.push([levelFile, JSON.stringify(ctx.L, null, 1) + '\n']);
          if (withCamp.checked) files.push([CAMPAIGN_URL, campaignJSON()]);
          if (!files.length) { render('Rien à publier.'); return; }
          const out = [];
          try {
            for (const [path, text] of files) {
              render(`${out.join('<br>')}${out.length ? '<br>' : ''}Envoi de ${path}…`);
              const r = await ghPut(path, text, msg.value || 'Mise à jour depuis l\'éditeur', cfg);
              out.push(r.unchanged ? `= ${path} : inchangé` : `✓ ${path}${r.url ? ` — <a href="${r.url}" target="_blank" rel="noopener">commit</a>` : ''}`);
            }
            render(out.join('<br>') + '<br><b>Publié.</b> Le site se met à jour au prochain déploiement.');
          } catch (err) { render(`${out.join('<br>')}${out.length ? '<br>' : ''}✗ ${err.message}`); }
        } }, '⇪ Publier')));
    m.append(card); m.classList.add('open');
  };
  m.onclick = e => { if (e.target === m) closeModal(); };
  render();
}
