// Briques de formulaire de l'éditeur : champs typés, éditeur d'effets, éditeur de conditions.
// Les objets du niveau sont modifiés EN PLACE ; ctx.changed() sauvegarde, ctx.refresh() redessine le panneau.
import { EFFECTS, CONDS, WHO, QSTATE, EFFECT_GROUPS, DURATION, HCOND } from '../core/level.js';
import { STATS, DIFFICULTIES, SKILL_NAMES } from '../core/stats.js';
import { HEROES } from '../core/heroes.js';
import { TERRAINS } from '../core/terrains.js';
import { ICON_NAMES, icon } from '../core/icons.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
export const IMAGES = ['assets/bg/painting1.jpg', 'assets/bg/painting2.jpg', 'assets/bg/painting3.jpg', 'assets/bg/painting4.jpg'];

export function input(value, onInput, { type = 'text', placeholder = '', list = null, cls = '' } = {}) {
  const el = h('input', { type, value: value ?? '', placeholder, list, class: cls });
  el.addEventListener('input', () => onInput(type === 'number' ? (el.value === '' ? undefined : +el.value) : el.value));
  return el;
}
export function textarea(value, onInput, { rows = 3, placeholder = '' } = {}) {
  const el = h('textarea', { rows, placeholder }); el.value = value ?? '';
  el.addEventListener('input', () => onInput(el.value)); return el;
}
export function checkbox(value, onChange, label = '') {
  const el = h('input', { type: 'checkbox' }); el.checked = !!value;
  el.addEventListener('change', () => onChange(el.checked));
  return label ? h('label', { class: 'chk' }, el, label) : el;
}
/** options : [[valeur, libellé], …] */
export function select(value, options, onChange, { empty = null } = {}) {
  const el = h('select');
  if (empty != null) el.append(h('option', { value: '' }, empty));
  for (const [v, l] of options) { const o = h('option', { value: v }, l); if (String(v) === String(value ?? '')) o.selected = true; el.append(o); }
  if (value != null && value !== '' && !options.some(([v]) => String(v) === String(value))) { const o = h('option', { value, selected: true }, `⚠ ${value} (inconnu)`); el.append(o); }
  el.addEventListener('change', () => onChange(el.value === '' ? null : el.value));
  return el;
}
export const field = (label, el, hint = '') => h('label', { class: 'fld' }, h('span', {}, label), el, hint ? h('small', {}, hint) : null);
export const row = (...kids) => h('div', { class: 'row' }, ...kids);
export const btn = (label, onClick, cls = '') => h('button', { class: 'btn ' + cls, type: 'button', onclick: onClick }, label);
export const icoBtn = (txt, title, onClick, cls = '') => h('button', { class: 'ib ' + cls, type: 'button', title, onclick: e => { e.stopPropagation(); onClick(e); } }, txt);

/** Listes de choix tirées du niveau courant */
export function options(ctx, type) {
  const L = ctx.L;
  switch (type) {
    case 'item': return Object.entries(L.items || {}).map(([k, v]) => [k, `${v.name || k}`]);
    case 'quest': return Object.entries(L.quests || {}).map(([k, v]) => [k, v.title || k]);
    case 'place': return (L.places || []).map(p => [p.id, p.name || p.id]);
    case 'zone': return (L.zones || []).map(z => [z.id, z.label || z.id]);
    case 'cast': return (L.cast || []).map(c => [c.id, `${c.name || c.id}`]);
    case 'dialogue': return Object.keys(L.dialogues || {}).map(k => [k, k]);
    case 'stat': return Object.entries(STATS).map(([k, v]) => [k, v.name]);
    case 'diff': return Object.entries(DIFFICULTIES).map(([k, v]) => [k, `${v.label} (${v.mod > 0 ? '+' : ''}${v.mod})`]);
    case 'who': return Object.entries(WHO);
    case 'qstate': return Object.entries(QSTATE);
    case 'image': return IMAGES.map(u => [u, u.split('/').pop()]);
    case 'icon': return ICON_NAMES.map(n => [n, n]);
    case 'terrain': return Object.entries(TERRAINS).map(([k, v]) => [k, v.label]);
    case 'hero': return HEROES.map(x => [x.id, x.name]);
    case 'statc': return Object.entries(SKILL_NAMES);
    case 'duration': return Object.entries(DURATION);
    case 'hcond': return Object.entries(HCOND);
    default: return [];
  }
}

/** Champ qui édite obj[key] selon son type */
export function fieldFor(type, obj, key, ctx, label = '', def) {
  if (obj[key] === undefined && def !== undefined && !['effects', 'cond', 'conds'].includes(type)) obj[key] = Array.isArray(def) ? [...def] : def;
  const set = v => { obj[key] = v; ctx.changed(); };
  let el;
  switch (type) {
    case 'text': el = input(obj[key], set); break;
    case 'longtext': el = textarea(obj[key], set, { rows: 3 }); break;
    case 'number': el = input(obj[key], set, { type: 'number', cls: 'num' }); break;
    case 'bool': el = checkbox(obj[key], set); break;
    case 'flag': el = input(obj[key], set, { list: 'dl-flags', placeholder: 'nomDuDrapeau' }); break;
    case 'wave': el = input(obj[key], set, { list: 'dl-waves', placeholder: 'vague1' }); break;
    case 'effects': obj[key] ||= []; return h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, label), effectsEditor(obj[key], ctx));
    case 'cond': return h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, label), condEditor(obj, key, ctx));
    case 'conds': obj[key] ||= []; return h('div', { class: 'nested' }, condsList(obj[key], ctx));
    case 'options': obj[key] ||= []; return h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, label), optionsEditor(obj[key], ctx));
    case 'icon': el = iconSelect(obj[key], set); break;
    default: el = select(obj[key], options(ctx, type), set, { empty: '—' });
  }
  return field(label, el);
}
export function iconSelect(value, set) {
  const wrap = h('span', { class: 'icsel' });
  const prev = h('span', { class: 'icprev', html: value ? icon(value) : '' });
  wrap.append(prev, select(value, ICON_NAMES.map(n => [n, n]), v => { prev.innerHTML = v ? icon(v) : ''; set(v); }, { empty: '—' }));
  return wrap;
}

/** Liste d'effets (modifiée en place) */
export function effectsEditor(list, ctx) {
  const box = h('div', { class: 'fx' });
  const draw = () => {
    box.innerHTML = '';
    list.forEach((e, i) => {
      const def = EFFECTS[e.type] || { label: e.type, fields: [] };
      const head = h('div', { class: 'fx-head' },
        effectTypeSelect(e.type, v => { for (const k of Object.keys(e)) delete e[k]; e.type = v; initFields(e, EFFECTS[v]); ctx.changed(); draw(); }),
        h('span', { class: 'sp' }),
        icoBtn('↑', 'Monter', () => { if (i) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; ctx.changed(); draw(); } }),
        icoBtn('↓', 'Descendre', () => { if (i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; ctx.changed(); draw(); } }),
        icoBtn('✕', 'Supprimer', () => { list.splice(i, 1); ctx.changed(); draw(); }, 'del'));
      const simple = h('div', { class: 'fx-fields' }), nested = h('div');
      for (const [k, t, d, l] of def.fields) {
        if (['effects', 'cond'].includes(t)) nested.append(fieldFor(t, e, k, ctx, l, d)); else simple.append(fieldFor(t, e, k, ctx, l, d));
      }
      box.append(h('div', { class: 'fx-row ' + (e.type === 'test' ? 'is-test' : e.type === 'if' ? 'is-if' : '') }, head, simple.childNodes.length ? simple : null, nested.childNodes.length ? nested : null));
    });
    box.append(h('div', { class: 'fx-add' }, effectTypeSelect('', v => { if (!v) return; const e = { type: v }; initFields(e, EFFECTS[v]); list.push(e); ctx.changed(); draw(); }, '+ Ajouter un effet…')));
  };
  draw(); return box;
}
/** Menu des types d'effets, rangés par catégorie */
function effectTypeSelect(value, onChange, empty = null) {
  const el = h('select');
  if (empty) el.append(h('option', { value: '' }, empty));
  for (const [gk, gl] of Object.entries(EFFECT_GROUPS)) {
    const og = h('optgroup', { label: gl });
    for (const [k, v] of Object.entries(EFFECTS)) if (v.g === gk) { const o = h('option', { value: k }, v.label); if (k === value) o.selected = true; og.append(o); }
    el.append(og);
  }
  el.addEventListener('change', () => onChange(el.value || null)); return el;
}
/** Options d'une fenêtre de choix : libellé, condition, effets */
function optionsEditor(list, ctx) {
  const box = h('div', { class: 'opts' });
  const draw = () => {
    box.innerHTML = '';
    list.forEach((o, i) => box.append(h('div', { class: 'opt-ed' },
      h('div', { class: 'card-h' }, h('b', {}, `Option ${i + 1}`), h('span', { class: 'sp' }), icoBtn('✕', 'Supprimer', () => { list.splice(i, 1); ctx.changed(); draw(); }, 'del')),
      fieldFor('text', o, 'label', ctx, 'Libellé'), fieldFor('cond', o, 'cond', ctx, 'Proposée si'), fieldFor('text', o, 'need', ctx, 'Texte si verrouillée'), fieldFor('effects', o, 'effects', ctx, 'Effets'))));
    box.append(btn('+ Option', () => { list.push({ label: '', effects: [] }); ctx.changed(); draw(); }, 'small'));
  };
  draw(); return box;
}
function initFields(o, def) { for (const [k, t, d] of def?.fields || []) if (d !== undefined && d !== null && !['cond'].includes(t)) o[k] = Array.isArray(d) ? [] : d; }

/** Condition unique holder[key] (null = toujours vrai) */
export function condEditor(holder, key, ctx) {
  const box = h('div', { class: 'cond' });
  const draw = () => {
    box.innerHTML = '';
    const c = holder[key];
    box.append(select(c?.type || '', Object.entries(CONDS).map(([k, v]) => [k, v.label]), v => {
      if (!v) delete holder[key]; else { holder[key] = { type: v }; initFields(holder[key], CONDS[v]); }
      ctx.changed(); draw();
    }, { empty: '— toujours —' }));
    if (c?.type) for (const [k, t, d, l] of CONDS[c.type]?.fields || []) box.append(fieldFor(t, c, k, ctx, l, d));
  };
  draw(); return box;
}
function condsList(list, ctx) {
  const box = h('div', { class: 'conds' });
  const draw = () => {
    box.innerHTML = '';
    list.forEach((c, i) => { const holder = { c }; const ed = condEditor(holder, 'c', { ...ctx, changed: () => { if (holder.c) list[i] = holder.c; else list.splice(i, 1); ctx.changed(); } });
      box.append(h('div', { class: 'cond-row' }, ed, icoBtn('✕', 'Retirer', () => { list.splice(i, 1); ctx.changed(); draw(); }, 'del'))); });
    box.append(btn('+ condition', () => { list.push({ type: 'flag', flag: '' }); ctx.changed(); draw(); }, 'small'));
  };
  draw(); return box;
}

/** Liste générique (gauche) : items = [{id, label, sub, cls}] */
export function sideList(items, selected, onSelect, { onAdd, addLabel = '+ Ajouter', onDelete, groups } = {}) {
  const box = h('div', { class: 'side' });
  if (onAdd) box.append(btn(addLabel, onAdd, 'accent wide'));
  let lastGroup = null;
  for (const it of items) {
    if (groups && it.group !== lastGroup) { box.append(h('div', { class: 'side-g' }, it.group)); lastGroup = it.group; }
    box.append(h('div', { class: 'side-it ' + (it.id === selected ? 'on ' : '') + (it.cls || ''), onclick: () => onSelect(it.id) },
      h('b', {}, it.label), it.sub ? h('small', {}, it.sub) : null,
      onDelete ? icoBtn('✕', 'Supprimer', () => onDelete(it.id), 'del') : null));
  }
  return box;
}
export const slug = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'id';
export function uniqueId(base, taken) { let id = slug(base), n = 2; while (taken.has(id)) id = `${slug(base)}${n++}`; return id; }
