// Dialogues en « arbre en retrait » : réplique → choix → réponse → choix… comme un script.
// Chaque réplique n'est dessinée qu'une fois ; les autres renvois s'affichent en lien « ↪ ».
// Lisibilité : en-tête coloré par personnage, **gras** au lieu de balises, effets résumés en clair,
// répliques repliables, aperçu jouable (▶ Essayer).
import { STATS, DIFFICULTIES } from '../core/stats.js';
import { statBadge } from '../core/stat-icons.js';
import { EFFECTS, CONDS, WHO } from '../core/level.js';
import { h, select, field, row, btn, icoBtn, fieldFor, effectsEditor, condEditor, uniqueId } from './fields.js';

const strip = s => String(s || '').replace(/<[^>]+>/g, '');
/** Texte stocké (HTML léger) ↔ texte affiché dans l'éditeur (**gras**, _italique_) */
export const toMd = s => String(s ?? '').replace(/<b>(.*?)<\/b>/gi, '**$1**').replace(/<i>(.*?)<\/i>/gi, '_$1_').replace(/<br\s*\/?>/gi, '\n');
export const toHtml = s => String(s ?? '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(«])_(.+?)_(?=[\s.,;:!?)»]|$)/g, '$1<i>$2</i>').replace(/\n/g, '<br>');

/** Zone de texte qui s'agrandit avec son contenu, en **gras** lisible */
function mdArea(obj, key, changed, placeholder = '', rows = 1) {
  const el = h('textarea', { rows, placeholder, class: 'md' }); el.value = toMd(obj[key]);
  const fit = () => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px`; };
  el.addEventListener('input', () => { obj[key] = toHtml(el.value); fit(); changed(); });
  requestAnimationFrame(fit); return el;
}

/** Résumé lisible d'une liste d'effets (puces) */
export function effectChips(list, ctx) {
  const L = ctx.L, nm = (o, k) => (o?.[k]?.name || o?.[k]?.title || k);
  const castName = id => L.cast?.find(c => c.id === id)?.name || id;
  const placeName = id => L.places?.find(p => p.id === id)?.name || id;
  const sign = n => (n > 0 ? `+${n}` : `${n}`);
  const d = e => {
    switch (e.type) {
      case 'toast': return `💬 « ${strip(e.text).slice(0, 34)}${strip(e.text).length > 34 ? '…' : ''} »`;
      case 'boost': return `✦ ${sign(+e.n)} boost (${WHO[e.who] || e.who})`;
      case 'heal': return `❤ +${e.n} PV (${WHO[e.who] || e.who})`;
      case 'damage': return `🩸 −${e.n} PV (${WHO[e.who] || e.who})`;
      case 'glas': return `🔔 ${sign(+e.n)} glas`;
      case 'set': return `⚑ ${e.value === false ? 'retire' : ''} ${e.flag}`;
      case 'give': return `🎒 ${nm(L.items, e.item)}${e.n > 1 ? ' ×' + e.n : ''}`;
      case 'take': return `🎒 − ${nm(L.items, e.item)}`;
      case 'questStart': return `📜 Quête : ${nm(L.quests, e.quest)}`;
      case 'questDone': return `✓ Quête finie : ${nm(L.quests, e.quest)}`;
      case 'revealPlace': return `👁 Révèle ${placeName(e.place)}`;
      case 'unlockZone': return `🔓 Zone ${e.zone}`;
      case 'statBonus': return `${STATS[e.stat]?.name || 'Combat'} ${sign(+e.n)} %${e.duration === 'campaign' ? ' (permanent)' : ''}`;
      case 'dmgBonus': return `⚔ ${sign(+e.n)} dégât${e.duration === 'campaign' ? ' (permanent)' : ''}`;
      case 'rep': return `☺ ${castName(e.npc)} ${sign(+e.n)}`;
      case 'spawn': return `➕ ${castName(e.cast)}`;
      case 'spawnWave': return `➕ Vague ${e.wave}`;
      case 'dialogue': return `🗨 Dialogue ${e.dialogue}`;
      case 'test': return `🎲 ${STATS[e.stat]?.name || e.stat}`;
      case 'if': return '❓ Si…';
      default: return EFFECTS[e.type]?.label || e.type;
    }
  };
  return (list || []).length ? h('span', { class: 'chips-fx' }, ...list.map(e => h('span', { class: 'fx-chip' }, d(e)))) : null;
}
const condText = (c, ctx) => {
  if (!c?.type) return '';
  const L = ctx.L;
  switch (c.type) {
    case 'flag': return `si ⚑ ${c.flag}`; case 'notFlag': return `si pas ⚑ ${c.flag}`;
    case 'has': return `si on a ${L.items?.[c.item]?.name || c.item}`; case 'heroIs': return `si le héros est ${c.hero}`;
    default: return `si ${CONDS[c.type]?.label?.toLowerCase() || c.type}`;
  }
};

export function dialogueTree(d, { ctx, who, changed, render, collapsed, dlgId }) {
  const nodes = d.nodes ||= {};
  if (!nodes[d.start]) d.start = Object.keys(nodes)[0];
  const whoName = Object.fromEntries(who);
  const colorOf = s => (s === 'narrator' ? '#8a7a5a' : s === 'hero' || /\(héros\)/.test(whoName[s] || '') ? '#3f8fe0' : ctx.L.cast?.find(c => c.id === s)?.color || '#c9a45c');
  const mainNpc = Object.values(nodes).map(n => n.s).find(s => s && !['hero', 'narrator'].includes(s) && whoName[s] && !whoName[s].includes('(héros)')) || 'hero';
  const shown = new Set();
  const label = nid => { const n = nodes[nid]; return n ? `${whoName[n.s] || n.s} : « ${strip(n.t).slice(0, 42)}${strip(n.t).length > 42 ? '…' : ''} »` : nid; };
  const newNode = (s, t = '') => { const id = uniqueId('r', new Set(Object.keys(nodes))); nodes[id] = { s, t, next: null }; return id; };
  const go = () => { changed(); render(); };
  const key = nid => `${dlgId}:${nid}`;

  const targetSelect = (holder, k, speaker, emptyLabel = '— fin du dialogue —') => {
    const opts = [['__new', '＋ Nouvelle réplique…'], ...Object.keys(nodes).map(x => [x, label(x)])];
    return select(holder[k] ?? '', opts, v => { holder[k] = v === '__new' ? newNode(speaker) : (v || null); go(); }, { empty: emptyLabel });
  };
  const jump = target => { const el = document.getElementById('tn-' + target); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.classList.add('flash'); setTimeout(() => el?.classList.remove('flash'), 1200); };
  const branch = (holder, k, title, cls, speaker, emptyLabel) => {
    const target = holder[k], wrap = h('div', { class: 'tb ' + cls });
    wrap.append(h('div', { class: 'tb-h' }, h('span', { class: 'tb-t' }, title), targetSelect(holder, k, speaker, emptyLabel)));
    if (target && nodes[target]) {
      if (!shown.has(target)) wrap.append(h('div', { class: 'tree-children' }, nodeBlock(target)));
      else wrap.append(h('div', { class: 'tree-link', onclick: () => jump(target) }, '↪ revient à ', h('span', {}, label(target))));
    } else if (!target) wrap.append(btn('＋ Répondre', () => { holder[k] = newNode(speaker); go(); }, 'small reply'));
    return wrap;
  };
  const testSummary = t => h('span', { class: 'test-sum' }, h('span', { html: statBadge(t.stat, 20) }), ` ${STATS[t.stat]?.name || t.stat} · ${DIFFICULTIES[t.diff || 'normal']?.label}${+t.mod ? ` ${t.mod > 0 ? '+' : ''}${t.mod}` : ''}`);
  const testBox = (t, holder) => h('div', { class: 'tree-test' },
    row(field('Stat testée', select(t.stat, Object.entries(STATS).map(([k, v]) => [k, v.name]), v => { t.stat = v; go(); })),
      field('Difficulté', select(t.diff || 'normal', Object.entries(DIFFICULTIES).map(([k, v]) => [k, `${v.label} (${v.mod > 0 ? '+' : ''}${v.mod})`]), v => { t.diff = v; go(); })),
      fieldFor('number', t, 'mod', ctx, 'Modif. %'), fieldFor('text', t, 'label', ctx, 'Intitulé du jet')),
    h('div', { class: 'tb-ok' }, h('details', {}, h('summary', {}, '✓ Réussite — effets ', effectChips(t.successEffects, ctx) || h('i', {}, 'aucun')), effectsEditor(t.successEffects ||= [], ctx)),
      branch(t, 'success', '✓ Si réussite →', 'ok', mainNpc, '(suite commune)')),
    h('div', { class: 'tb-ko' }, h('details', {}, h('summary', {}, '✗ Échec — effets ', effectChips(t.failEffects, ctx) || h('i', {}, 'aucun')), effectsEditor(t.failEffects ||= [], ctx)),
      branch(t, 'fail', '✗ Si échec →', 'ko', mainNpc, '(suite commune)')),
    (!t.success || !t.fail) ? branch(holder, 'next', 'Puis, dans les deux cas →', 'common', mainNpc) : null);

  function choiceBlock(n, c, i) {
    const onceVal = c.onceSuccess ? 'success' : c.once ? 'once' : '';
    const meta = [condText(c.cond, ctx), c.need ? `verrouillé : « ${c.need} »` : ''].filter(Boolean).join(' · ');
    return h('div', { class: 'tree-choice' + (c.test ? ' has-test' : '') },
      h('div', { class: 'tc-h' },
        h('span', { class: 'tc-n' }, `${i + 1}`),
        c.test ? h('span', { class: 'tc-badge', html: statBadge(c.test.stat, 24) }) : h('span', { class: 'tc-hero' }, 'Le héros :'),
        h('span', { class: 'tc-txt' }, mdArea(c, 't', changed, 'Ce que dit le héros…')),
        h('div', { class: 'tc-tools' },
          h('button', { class: 'btn small tc-dice ' + (c.test ? 'on' : ''), type: 'button', title: 'Faire lancer les dés sur une stat', onclick: () => { if (c.test) delete c.test; else c.test = { stat: 'volonte', diff: 'normal', mod: 0, label: '', success: null, fail: null, successEffects: [], failEffects: [] }; go(); } }, c.test ? '🎲 Test' : '🎲 Ajouter un test'),
          select(onceVal, [['', 'Toujours proposé'], ['once', 'Une seule fois'], ['success', 'Jusqu\'à réussite']], v => { delete c.once; delete c.onceSuccess; if (v === 'once') c.once = true; if (v === 'success') c.onceSuccess = true; changed(); }),
          icoBtn('↑', 'Monter', () => { if (i) { [n.choices[i - 1], n.choices[i]] = [n.choices[i], n.choices[i - 1]]; go(); } }),
          icoBtn('✕', 'Supprimer le choix', () => { n.choices.splice(i, 1); go(); }, 'del'))),
      (meta || c.effects?.length || c.test) ? h('div', { class: 'tc-meta' }, c.test ? testSummary(c.test) : null, meta ? h('span', { class: 'cond-chip' }, meta) : null, effectChips(c.effects, ctx)) : null,
      h('details', { class: 'tc-more' }, h('summary', {}, 'Condition, indice, effets du choix'),
        row(h('label', { class: 'fld' }, h('span', {}, 'Proposé seulement si'), condEditor(c, 'cond', ctx)), fieldFor('text', c, 'need', ctx, 'Texte si verrouillé'), fieldFor('text', c, 'hint', ctx, 'Indice (petit texte)')),
        fieldFor('effects', c, 'effects', ctx, 'Effets dès qu\'on le choisit')),
      c.test ? testBox(c.test, c) : branch(c, 'next', '→ Réponse', 'reply', mainNpc));
  }

  function nodeBlock(nid) {
    shown.add(nid);
    const n = nodes[nid], mode = n.test ? 'test' : n.choices?.length ? 'choices' : 'next';
    const kind = n.s === 'narrator' ? 'narr' : n.s === 'hero' || /\(héros\)/.test(whoName[n.s] || '') ? 'hero' : 'npc';
    const col = colorOf(n.s), isCol = collapsed.has(key(nid));
    const el = h('div', { class: `tree-node k-${kind}${nid === d.start ? ' start' : ''}${isCol ? ' collapsed' : ''}`, id: 'tn-' + nid, style: `--spk:${col}` });
    const name = whoName[n.s] || n.s;
    el.append(h('div', { class: 'tn-h' },
      h('button', { class: 'tn-fold', type: 'button', title: isCol ? 'Déplier' : 'Replier', onclick: () => { isCol ? collapsed.delete(key(nid)) : collapsed.add(key(nid)); render(); } }, isCol ? '▸' : '▾'),
      h('span', { class: 'tn-av' }, kind === 'narr' ? '📜' : name.replace(/^(Le |La )/, '')[0]),
      h('b', { class: 'tn-name' }, kind === 'narr' ? 'Narrateur' : name.replace(' (héros)', '')),
      nid === d.start ? h('em', { class: 'tn-start' }, 'début du dialogue') : null,
      h('span', { class: 'sp' }),
      h('label', { class: 'tn-who', title: 'Changer qui parle' }, '👤', select(n.s, who, v => { n.s = v; go(); })),
      nid !== d.start ? icoBtn('⚑', 'Commencer le dialogue ici', () => { d.start = nid; go(); }) : null,
      icoBtn('✕', 'Supprimer cette réplique', () => {
        const refs = Object.values(nodes).filter(x => [x.next, x.test?.success, x.test?.fail, ...(x.choices || []).flatMap(c => [c.next, c.test?.success, c.test?.fail]), ...(x.branches || []).map(b => b.next)].includes(nid)).length;
        if (!confirm(refs ? `Cette réplique est utilisée par ${refs} lien(s). La supprimer ?` : 'Supprimer cette réplique ?')) return;
        delete nodes[nid];
        for (const x of Object.values(nodes)) { if (x.next === nid) x.next = null; for (const o of [x.test, ...(x.choices || []), ...(x.choices || []).map(c => c.test), ...(x.branches || [])]) { if (!o) continue; for (const k of ['next', 'success', 'fail']) if (o[k] === nid) o[k] = null; } }
        if (d.start === nid) d.start = Object.keys(nodes)[0];
        go();
      }, 'del')));
    if (isCol) { // replié : une ligne de texte + résumé
      el.append(h('div', { class: 'tn-preview', onclick: () => { collapsed.delete(key(nid)); render(); } }, strip(n.t).slice(0, 120) || '…',
        h('small', {}, mode === 'choices' ? ` — ${n.choices.length} choix` : mode === 'test' ? ' — test de dés' : '')));
      return el;
    }
    el.append(mdArea(n, 't', changed, kind === 'narr' ? 'Ce que raconte le narrateur…' : 'Ce que dit le personnage…  (**gras**, {héros} = nom du héros actif)', 2));
    const extras = (n.variants?.length || 0) + (n.branches?.length || 0);
    el.append(h('div', { class: 'tn-meta' }, effectChips(n.effects, ctx), extras ? h('span', { class: 'cond-chip' }, `${extras} variante(s)/embranchement(s)`) : null),
      h('details', { class: 'tn-more' }, h('summary', {}, 'Effets et variantes de cette réplique'),
        fieldFor('effects', n, 'effects', ctx, 'Effets quand cette réplique s\'affiche'), variants(n)),
      h('div', { class: 'tn-mode' }, h('span', { class: 'tn-mode-l' }, 'Ensuite :'), ...[['next', 'Suite simple'], ['choices', 'Le héros choisit'], ['test', 'Jet de dés']].map(([k, l]) =>
        h('button', { class: 'btn small ' + (mode === k ? 'on' : ''), type: 'button', onclick: () => {
          if (k === 'choices') { delete n.test; n.choices = n.choices?.length ? n.choices : [{ t: '', next: null }]; }
          else if (k === 'test') { delete n.choices; n.test = { stat: 'volonte', diff: 'normal', mod: 0, label: '', success: null, fail: null, successEffects: [], failEffects: [] }; }
          else { delete n.choices; delete n.test; }
          go();
        } }, l))));
    if (mode === 'next') el.append(branch(n, 'next', '→ Ensuite', 'reply', n.s === mainNpc ? 'hero' : mainNpc));
    if (mode === 'test') el.append(testBox(n.test, n));
    if (mode === 'choices') {
      const box = h('div', { class: 'tree-choices' });
      n.choices.forEach((c, i) => box.append(choiceBlock(n, c, i)));
      box.append(btn('＋ Ajouter un choix', () => { n.choices.push({ t: '', next: null }); go(); }, 'small'));
      el.append(box);
    }
    return el;
  }
  function variants(n) {
    const keys = Object.keys(nodes);
    const box = h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, 'Texte différent si…'));
    (n.variants ||= []).forEach((v, i) => box.append(h('div', { class: 'card' }, h('label', { class: 'fld' }, h('span', {}, 'Si'), condEditor(v, 'cond', ctx)), mdArea(v, 't', changed, 'Texte de remplacement', 2), icoBtn('✕', 'Supprimer', () => { n.variants.splice(i, 1); go(); }, 'del'))));
    box.append(btn('+ Variante de texte', () => { n.variants.push({ cond: { type: 'heroIs', hero: 'aldric' }, t: '' }); go(); }, 'small'));
    const box2 = h('div', { class: 'nested' }, h('div', { class: 'nested-l' }, 'Suite différente si…'));
    (n.branches ||= []).forEach((b, i) => box2.append(h('div', { class: 'card' }, row(h('label', { class: 'fld' }, h('span', {}, 'Si'), condEditor(b, 'cond', ctx)), field('Aller à', select(b.next, keys.map(x => [x, label(x)]), v => { b.next = v; changed(); }, { empty: '(fin)' }))), icoBtn('✕', 'Supprimer', () => { n.branches.splice(i, 1); go(); }, 'del'))));
    box2.append(btn('+ Embranchement', () => { n.branches.push({ cond: { type: 'flag', flag: '' }, next: null }); go(); }, 'small'));
    return h('div', {}, box, box2);
  }

  const out = h('div', { class: 'tree' });
  if (d.start && nodes[d.start]) out.append(nodeBlock(d.start));
  else out.append(btn('＋ Première réplique', () => { d.start = newNode(mainNpc); go(); }, 'accent'));
  const orphans = Object.keys(nodes).filter(k => !shown.has(k));
  if (orphans.length) {
    out.append(h('h3', {}, 'Répliques non reliées'), h('p', { class: 'muted' }, 'Aucune autre réplique n\'y mène : reliez-les (menu « → ») ou supprimez-les.'));
    for (const k of orphans) if (!shown.has(k)) out.append(nodeBlock(k));
  }
  return out;
}

/** Aperçu jouable du dialogue dans l'éditeur (les tests se résolvent par « Réussite » / « Échec ») */
export function previewDialogue(d, { ctx, who }) {
  const whoName = Object.fromEntries(who), nodes = d.nodes || {};
  const ov = h('div', { class: 'pv-ov', onclick: e => { if (e.target === ov) ov.remove(); } });
  const box = h('div', { class: 'pv' }); ov.append(box); document.body.append(ov);
  const log = h('div', { class: 'pv-log' }), act = h('div', { class: 'pv-act' });
  box.append(h('div', { class: 'pv-h' }, h('b', {}, 'Aperçu du dialogue'), h('small', {}, ' les effets sont seulement affichés, les conditions considérées vraies'), h('span', { class: 'sp' }), btn('Fermer', () => ov.remove(), 'small')), log, act);
  const say = (s, t, cls = '') => { log.append(h('div', { class: 'pv-line ' + cls }, h('b', {}, s === 'narrator' ? '' : `${(whoName[s] || s).replace(' (héros)', '')} : `), h('span', { html: t }))); log.scrollTop = log.scrollHeight; };
  const fx = list => { if (list?.length) log.append(h('div', { class: 'pv-fx' }, effectChips(list, ctx))); };
  const goTo = id => {
    act.innerHTML = '';
    const n = nodes[id];
    if (!n) { log.append(h('div', { class: 'pv-end' }, '— fin du dialogue —')); act.append(btn('Recommencer', () => { log.innerHTML = ''; start(); }, 'small')); return; }
    say(n.s, n.t || '…', n.s === 'narrator' ? 'narr' : ''); fx(n.effects);
    const testButtons = (t, holder) => {
      act.append(h('div', { class: 'pv-test' }, h('span', { html: statBadge(t.stat, 22) }), ` Jet de ${STATS[t.stat]?.name} (${DIFFICULTIES[t.diff || 'normal']?.label})`),
        btn('✓ Réussite', () => { log.append(h('div', { class: 'pv-ok' }, '✓ réussite')); fx(t.successEffects); goTo(t.success || holder.next); }, 'small ok'),
        btn('✗ Échec', () => { log.append(h('div', { class: 'pv-ko' }, '✗ échec')); fx(t.failEffects); goTo(t.fail || holder.next); }, 'small ko'));
    };
    if (n.choices?.length) n.choices.forEach((c, i) => act.append(h('button', { class: 'pv-choice', type: 'button', onclick: () => {
      act.innerHTML = ''; say('hero', c.t || '…', 'hero'); fx(c.effects);
      if (c.test) testButtons(c.test, c); else goTo(c.next);
    } }, h('i', {}, `${i + 1}`), c.test ? h('span', { html: statBadge(c.test.stat, 20) }) : null, h('span', { html: c.t || '…' }), c.cond?.type ? h('small', {}, ` (${condText(c.cond, ctx)})`) : null)));
    else if (n.test) testButtons(n.test, n);
    else act.append(btn('Continuer ▸', () => goTo(n.next), 'small accent'));
  };
  const start = () => { if (d.scene) say('narrator', d.scene, 'narr'); goTo(d.start); };
  start();
}
