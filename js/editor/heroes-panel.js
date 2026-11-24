// Éditeur → héros : levels/heroes.json (fiches, talents prêts à l'emploi, avantages de niveau).
// Les modifications restent dans ce navigateur (et servent au bouton « Tester ▸ ») jusqu'à la publication.
import { h, input, textarea, checkbox, select, field, row, btn, icoBtn, sideList, slug } from './fields.js';
import { HEROES, HEROES_DATA, HEROES_URL, HEROES_DRAFT_KEY, HERO_MODELS, TALENTS, heroSheet } from '../core/heroes.js';
import { STATS, SKILL_NAMES, DIFFICULTIES } from '../core/stats.js';
import { figureSVG } from '../core/art.js';
import { statChip } from '../core/stat-icons.js';

let H = null, sel = null, PUB = null;
const clone = o => JSON.parse(JSON.stringify(o));
/** Version publiée (levels/heroes.json du jeu), pour comparer et « Recharger » */
const fetchPublished = async () => (PUB = await (await fetch(HEROES_URL, { cache: 'no-cache' })).json());
fetchPublished().catch(() => {});
function load() {
  try { H = JSON.parse(localStorage.getItem(HEROES_DRAFT_KEY)); } catch {}
  if (!H?.heroes) H = clone(HEROES_DATA);
  return H;
}
function save() {
  try { localStorage.setItem(HEROES_DRAFT_KEY, JSON.stringify(H)); } catch {}
  HEROES.splice(0, HEROES.length, ...H.heroes.map(heroSheet)); // listes de l'éditeur (conditions « le héros est… »)
}
export const heroesState = () => H || load();
export const heroesJSON = () => JSON.stringify(heroesState(), null, 1) + '\n';
export const heroesChanged = () => JSON.stringify(heroesState()) !== JSON.stringify(PUB || HEROES_DATA);
export const HEROES_PATH = 'levels/heroes.json';

/** Vérification des fiches de héros */
export function checkHeroes(d = heroesState()) {
  const errors = [], warnings = [], ids = new Set();
  if (!d.heroes?.length) errors.push('Aucun héros.');
  for (const x of d.heroes || []) {
    const w = x.name || x.id || '?';
    if (!x.id) errors.push(`${w} : identifiant manquant.`); else if (ids.has(x.id)) errors.push(`Identifiant en double : ${x.id}`); else ids.add(x.id);
    if (!x.name) errors.push(`${w} : nom manquant.`);
    if (!HERO_MODELS[x.kind]) errors.push(`${w} : modèle 3D inconnu « ${x.kind} ».`);
    if (!(+x.hp > 0)) errors.push(`${w} : PV invalides.`);
    if (!(+x.move > 0)) errors.push(`${w} : déplacement invalide.`);
    for (const k of Object.keys(SKILL_NAMES)) { const v = x.skills?.[k]; if (!(v >= 5 && v <= 95)) warnings.push(`${w} : ${SKILL_NAMES[k]} = ${v ?? '—'} (conseillé 5 à 95).`); }
    for (const t of x.talents || []) { if (!TALENTS[t.type]) errors.push(`${w} : talent inconnu « ${t.type} ».`); if (t.type === 'mount' && !t.cast) errors.push(`${w} : la monture doit désigner une figurine.`); }
    const pids = new Set(); for (const p of x.perks || []) { if (!p.id || pids.has(p.id)) errors.push(`${w} : avantage sans identifiant ou en double (${p.id || '?'}).`); pids.add(p.id); }
  }
  if ((d.heroes || []).length < 1) errors.push('Il faut au moins un héros.');
  return { errors, warnings };
}

// ------------------------------------------------------------------ avantages : effets éditables
const FX = { hp: 'PV max +', armor: 'Armure +', move: 'Déplacement +', range: 'Portée +', dmg: 'Dégâts +', boostStart: 'Boosts au départ +', boostMax: 'Boosts max +', skill: 'Stat +' };
const fxRows = fx => Object.entries(fx || {}).flatMap(([k, v]) => (k === 'skills' ? Object.entries(v).map(([s, n]) => ({ k: 'skill', s, n })) : [{ k, n: v }]));
const fxBuild = rows => { const o = {}; for (const r of rows) { if (r.k === 'skill') { o.skills ||= {}; o.skills[r.s || 'force'] = (o.skills[r.s || 'force'] || 0) + (+r.n || 0); } else o[r.k] = (o[r.k] || 0) + (+r.n || 0); } return o; };
const fxText = fx => fxRows(fx).map(r => `${r.n > 0 ? '+' : ''}${r.n} ${r.k === 'skill' ? SKILL_NAMES[r.s] || r.s : { hp: 'PV max', armor: 'armure', move: 'déplacement', range: 'portée', dmg: 'dégât', boostStart: 'boost au départ', boostMax: 'boost max' }[r.k] || r.k}`).join(', ');

export function panelHeroes(ctx) {
  load();
  const redraw = () => ctx.refresh();
  const changed = () => { save(); clearTimeout(changed.t); changed.t = setTimeout(() => { const pv = document.querySelector('.hero-prev'); if (pv) pv.replaceWith(preview(cur())); }, 250); };
  const cur = () => H.heroes.find(x => x.id === sel) || H.heroes[0];
  if (!cur()) sel = null; else sel = cur().id;
  const { errors, warnings } = checkHeroes();
  const side = sideList(H.heroes.map(x => ({ id: x.id, label: x.name || x.id, sub: `${x.role || ''} · ${HERO_MODELS[x.kind] || x.kind}` })), sel, id => { sel = id; redraw(); }, {
    addLabel: '+ Nouveau héros',
    onAdd: () => { const ids = new Set(H.heroes.map(x => x.id)); let id = 'heros', i = 1; while (ids.has(id)) id = `heros${++i}`;
      H.heroes.push({ id, name: 'Nouveau héros', role: 'Aventurier', kind: 'hooded', color: '#c9a45c', hp: 8, armor: 10, move: 2, range: 1, dmg: 1, combatName: 'Combat',
        skills: { combat: 50, force: 40, agilite: 40, intelligence: 40, volonte: 40 }, talents: [{ type: 'regen', name: 'Coriace', n: 1 }], perks: [{ id: 'robuste', name: 'Robuste', desc: '+2 PV max', fx: { hp: 2 } }] });
      sel = id; save(); redraw(); },
    onDelete: id => { if (H.heroes.length <= 1) return alert('Il faut au moins un héros.'); if (confirm('Supprimer ce héros ? (sa progression de campagne est conservée mais inutilisée)')) { H.heroes = H.heroes.filter(x => x.id !== id); sel = null; save(); redraw(); } },
  });
  const x = cur();
  const form = h('div', { class: 'form' });
  form.append(h('h2', {}, 'Héros de la campagne'),
    h('p', { class: 'muted' }, 'Fichier levels/heroes.json, commun à toutes les étapes. Les modifications restent dans ce navigateur (et servent à « Tester ▸ ») jusqu\'à « ⇪ Publier ». La progression (XP, niveaux, avantages choisis) est liée à l\'identifiant du héros.'),
    row(btn('↻ Recharger depuis le jeu', async () => { if (!confirm('Abandonner les modifications des héros faites dans l\'éditeur ?')) return; H = clone(await fetchPublished()); save(); sel = null; redraw(); }, 'small'),
      btn('Exporter heroes.json', () => h('a', { href: URL.createObjectURL(new Blob([heroesJSON()], { type: 'application/json' })), download: 'heroes.json' }).click(), 'small'),
      heroesChanged() ? h('span', { class: 'warn' }, '● modifié (non publié)') : h('span', { class: 'ok' }, '✓ identique au jeu')),
    errors.length ? h('div', { class: 'errs' }, ...errors.map(e => h('div', { class: 'err' }, '✗ ' + e))) : '',
    warnings.length ? h('div', { class: 'warns' }, ...warnings.map(e => h('div', { class: 'warn' }, '⚠ ' + e))) : '');
  if (x) {
    const num = (k, label, o = x) => field(label, input(o[k], v => { o[k] = v; changed(); }, { type: 'number', cls: 'num' }));
    form.append(h('div', { class: 'hero-ed' }, h('div', {},
      h('h3', {}, 'Identité'),
      row(field('Identifiant', (() => { const el = input(x.id, () => {}); el.addEventListener('change', () => { const v = slug(el.value); if (!v || H.heroes.some(o => o !== x && o.id === v)) { el.value = x.id; return; } x.id = v; sel = v; save(); redraw(); }); return el; })(), 'Sert aux conditions « le héros est… » et à la progression.'),
        field('Nom', input(x.name, v => { x.name = v; changed(); })), field('Rôle', input(x.role, v => { x.role = v; changed(); }))),
      row(field('Modèle 3D (KayKit)', select(x.kind, Object.entries(HERO_MODELS), v => { x.kind = v; changed(); redraw(); })),
        field('Couleur', input(x.color, v => { x.color = v; changed(); }, { type: 'color' })), field('Nom de l\'attaque', input(x.combatName, v => { x.combatName = v; changed(); }, { placeholder: 'Combat' }))),
      h('h3', {}, 'Caractéristiques'),
      row(num('hp', 'PV'), num('armor', 'Armure %'), num('move', 'Déplacement'), num('range', 'Portée'), num('dmg', 'Dégâts')),
      row(...Object.keys(SKILL_NAMES).map(k => field(SKILL_NAMES[k] + ' %', input(x.skills[k], v => { x.skills[k] = v; changed(); }, { type: 'number', cls: 'num' })))),
      h('h3', {}, 'Talents'), talentsEditor(x, changed, redraw),
      field('Texte du talent (facultatif)', textarea(x.talentText, v => { x.talentText = v || undefined; changed(); }, { rows: 2, placeholder: heroSheet({ ...x, talentText: undefined }).talent || 'Généré à partir des talents' }), 'Vide = texte généré automatiquement.'),
      h('h3', {}, 'Avantages de niveau'), h('p', { class: 'muted' }, 'À chaque niveau gagné, le joueur choisit +5 % à une stat ou un de ces avantages (définitif pour la campagne).'),
      perksEditor(x, changed, redraw)), preview(x)));
  }
  return h('div', { class: 'split' }, side, form);
}

function preview(x) {
  const s = heroSheet(x);
  return h('div', { class: 'hero-prev', html: `<div class="hp-port" style="--c:${s.color}">${figureSVG(s.kind, s.color, { portrait: true })}</div>
    <b style="color:${s.color}">${s.name}</b><small>${s.role || ''}</small>
    <div class="hp-line">❤ ${s.hp} PV · 🛡 ${s.armor} % · 👣 ${s.move} · 🎯 ${s.range} · ⚔ ${s.dmg}</div>
    <div class="hp-chips">${['combat', ...Object.keys(STATS)].map(k => statChip(k, s.skills[k] ?? '—', 16)).join('')}</div>
    <p class="hp-talent">${s.talent || '<i>Aucun talent</i>'}</p>` });
}

function paramField(t, [k, type, , label], changed) {
  const set = v => { t[k] = v; changed(); };
  if (type === 'number') return field(label, input(t[k], set, { type: 'number', cls: 'num' }));
  if (type === 'bool') return field(label, checkbox(t[k] !== false, set));
  if (type === 'stat') return field(label, select(t[k], Object.entries(STATS).map(([s, v]) => [s, v.name]), set));
  if (type === 'diff') return field(label, select(t[k], Object.entries(DIFFICULTIES).map(([d, v]) => [d, `${v.label} (${v.mod > 0 ? '+' : ''}${v.mod})`]), set));
  return field(label, input(t[k], set));
}
function talentsEditor(x, changed, redraw) {
  x.talents ||= [];
  const box = h('div', { class: 'talents' });
  x.talents.forEach((t, i) => {
    const def = TALENTS[t.type] || { label: t.type, params: [] };
    for (const [k, , d] of def.params) if (t[k] === undefined) t[k] = d;
    box.append(h('div', { class: 'card' }, h('div', { class: 'card-h' },
      select(t.type, Object.entries(TALENTS).map(([k, v]) => [k, v.label]), v => { for (const k of Object.keys(t)) if (k !== 'name') delete t[k]; t.type = v; changed(); redraw(); }),
      h('span', { class: 'sp' }), icoBtn('✕', 'Retirer', () => { x.talents.splice(i, 1); changed(); redraw(); }, 'del')),
      row(field('Nom affiché', input(t.name, v => { t.name = v || undefined; changed(); }, { placeholder: 'ex. Lueur' })), ...def.params.map(p => paramField(t, p, changed)))));
  });
  box.append(btn('+ Talent', () => { x.talents.push({ type: 'dmg', n: 1 }); changed(); redraw(); }, 'small'),
    h('p', { class: 'muted' }, 'Talents prêts : ' + Object.values(TALENTS).map(v => v.label).join(', ') + '. Une monture doit exister comme figurine (équipe « monture ») dans le niveau.'));
  return box;
}
function perksEditor(x, changed, redraw) {
  x.perks ||= [];
  const box = h('div', { class: 'perks' });
  x.perks.forEach((p, i) => {
    const rows = fxRows(p.fx);
    const commit = () => { const auto = !p.desc || p.desc === fxText(p.fx); p.fx = fxBuild(rows); if (auto) p.desc = fxText(p.fx); changed(); };
    box.append(h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('b', {}, p.name || p.id), h('small', { class: 'muted' }, ` ${fxText(p.fx)}`), h('span', { class: 'sp' }), icoBtn('✕', 'Supprimer', () => { x.perks.splice(i, 1); changed(); redraw(); }, 'del')),
      row(field('Identifiant', input(p.id, v => { p.id = slug(v); changed(); })), field('Nom', input(p.name, v => { p.name = v; changed(); })), field('Description', input(p.desc, v => { p.desc = v; changed(); }))),
      ...rows.map((r, j) => row(field('Effet', select(r.k, Object.entries(FX), v => { r.k = v; commit(); redraw(); })),
        r.k === 'skill' ? field('Stat', select(r.s || 'force', Object.entries(SKILL_NAMES), v => { r.s = v; commit(); })) : '',
        field('Valeur', input(r.n, v => { r.n = v; commit(); }, { type: 'number', cls: 'num' })),
        icoBtn('✕', 'Retirer l\'effet', () => { rows.splice(j, 1); commit(); redraw(); }, 'del'))),
      btn('+ Effet', () => { rows.push({ k: 'hp', n: 1 }); commit(); redraw(); }, 'small')));
  });
  box.append(btn('+ Avantage', () => { const ids = new Set(x.perks.map(p => p.id)); let id = 'avantage', n = 1; while (ids.has(id)) id = `avantage${++n}`; x.perks.push({ id, name: 'Nouvel avantage', desc: '+1 PV max', fx: { hp: 1 } }); changed(); redraw(); }, 'small'));
  return box;
}
export { HEROES_URL };
