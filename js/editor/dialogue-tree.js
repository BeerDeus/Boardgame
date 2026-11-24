// Dialogues en « arbre en retrait » : réplique → choix → réponse → choix… comme un script.
// Chaque réplique n'est dessinée qu'une fois ; les autres renvois s'affichent en lien « ↪ Retour à … ».
import { STATS, DIFFICULTIES } from '../core/stats.js';
import { statBadge } from '../core/stat-icons.js';
import { h, input, textarea, select, field, row, btn, icoBtn, fieldFor, effectsEditor, condEditor, uniqueId } from './fields.js';

const strip = s => String(s || '').replace(/<[^>]+>/g, '');

export function dialogueTree(d, { ctx, who, changed, render }) {
  const nodes = d.nodes ||= {};
  if (!nodes[d.start]) d.start = Object.keys(nodes)[0];
  const whoName = Object.fromEntries(who);
  const mainNpc = Object.values(nodes).map(n => n.s).find(s => s && !['hero', 'narrator'].includes(s) && whoName[s] && !whoName[s].includes('(héros)')) || 'hero';
  const shown = new Set();
  const label = nid => { const n = nodes[nid]; return n ? `${whoName[n.s] || n.s} : « ${strip(n.t).slice(0, 42)}${strip(n.t).length > 42 ? '…' : ''} »` : nid; };
  const newNode = (s, t = '') => { const id = uniqueId('r', new Set(Object.keys(nodes))); nodes[id] = { s, t, next: null }; return id; };
  const go = () => { changed(); render(); };

  /** Liste de destinations : fin, nouvelle réplique, ou réplique existante */
  const targetSelect = (holder, key, speaker, emptyLabel = '— fin du dialogue —') => {
    const opts = [['__new', '＋ Nouvelle réplique…'], ...Object.keys(nodes).map(k => [k, label(k)])];
    return select(holder[key] ?? '', opts, v => { holder[key] = v === '__new' ? newNode(speaker) : (v || null); go(); }, { empty: emptyLabel });
  };
  /** Une branche : sélecteur de destination + la suite dessinée en retrait (ou un lien si déjà dessinée) */
  const branch = (holder, key, title, cls, speaker, emptyLabel) => {
    const target = holder[key], wrap = h('div', { class: 'tb ' + cls });
    wrap.append(h('div', { class: 'tb-h' }, h('span', { class: 'tb-t' }, title), targetSelect(holder, key, speaker, emptyLabel)));
    if (target && nodes[target]) {
      if (!shown.has(target)) wrap.append(h('div', { class: 'tree-children' }, nodeBlock(target)));
      else wrap.append(h('div', { class: 'tree-link', onclick: () => { const el = document.getElementById('tn-' + target); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.classList.add('flash'); setTimeout(() => el?.classList.remove('flash'), 1200); } }, '↪ ', h('span', {}, label(target))));
    } else if (!target) wrap.append(btn('＋ Répondre', () => { holder[key] = newNode(speaker); go(); }, 'small reply'));
    return wrap;
  };
  const testBox = (t, holder) => h('div', { class: 'tree-test' },
    row(h('label', { class: 'fld' }, h('span', { html: `Test ${statBadge(t.stat, 18)}` }), select(t.stat, Object.entries(STATS).map(([k, v]) => [k, v.name]), v => { t.stat = v; go(); })),
      field('Difficulté', select(t.diff || 'normal', Object.entries(DIFFICULTIES).map(([k, v]) => [k, `${v.label} (${v.mod > 0 ? '+' : ''}${v.mod})`]), v => { t.diff = v; changed(); })),
      fieldFor('number', t, 'mod', ctx, 'Modif. %'), fieldFor('text', t, 'label', ctx, 'Intitulé du jet')),
    h('div', { class: 'tb-ok' }, h('details', { open: t.successEffects?.length ? true : undefined }, h('summary', {}, `✓ Réussite : effets (${t.successEffects?.length || 0})`), effectsEditor(t.successEffects ||= [], ctx)),
      branch(t, 'success', '✓ Si réussite →', 'ok', mainNpc, '(suite commune)')),
    h('div', { class: 'tb-ko' }, h('details', { open: t.failEffects?.length ? true : undefined }, h('summary', {}, `✗ Échec : effets (${t.failEffects?.length || 0})`), effectsEditor(t.failEffects ||= [], ctx)),
      branch(t, 'fail', '✗ Si échec →', 'ko', mainNpc, '(suite commune)')),
    (!t.success || !t.fail) ? branch(holder, 'next', 'Suite commune →', 'common', mainNpc) : null);

  function choiceBlock(n, c, i) {
    const onceVal = c.onceSuccess ? 'success' : c.once ? 'once' : '';
    const el = h('div', { class: 'tree-choice' + (c.test ? ' has-test' : '') },
      h('div', { class: 'tc-h' },
        h('span', { class: 'tc-n' }, `${i + 1}`),
        c.test ? h('span', { class: 'tc-badge', html: statBadge(c.test.stat, 22) }) : null,
        h('span', { class: 'tc-txt' }, input(c.t, v => { c.t = v; changed(); }, { placeholder: 'Ce que dit le héros…' })),
        h('button', { class: 'btn small tc-dice ' + (c.test ? 'on' : ''), type: 'button', title: 'Lancer les dés sur une stat', onclick: () => { if (c.test) delete c.test; else c.test = { stat: 'volonte', diff: 'normal', mod: 0, label: '', success: null, fail: null, successEffects: [], failEffects: [] }; go(); } }, c.test ? '🎲 Test ✓' : '🎲 Test'),
        select(onceVal, [['', 'Toujours proposé'], ['once', 'Une seule fois'], ['success', 'Jusqu\'à réussite']], v => { delete c.once; delete c.onceSuccess; if (v === 'once') c.once = true; if (v === 'success') c.onceSuccess = true; changed(); }),
        icoBtn('↑', 'Monter', () => { if (i) { [n.choices[i - 1], n.choices[i]] = [n.choices[i], n.choices[i - 1]]; go(); } }),
        icoBtn('✕', 'Supprimer le choix', () => { n.choices.splice(i, 1); go(); }, 'del')),
      h('details', { class: 'tc-more' }, h('summary', {}, `Condition, indice, effets${c.cond?.type || c.effects?.length ? ' •' : ''}`),
        row(h('label', { class: 'fld' }, h('span', {}, 'Proposé si'), condEditor(c, 'cond', ctx)), fieldFor('text', c, 'need', ctx, 'Texte si verrouillé'), fieldFor('text', c, 'hint', ctx, 'Indice (petit texte)')),
        fieldFor('effects', c, 'effects', ctx, 'Effets quand choisi (avant le test)')),
      c.test ? testBox(c.test, c) : branch(c, 'next', '→ Réponse', 'reply', mainNpc));
    return el;
  }

  function nodeBlock(nid) {
    shown.add(nid);
    const n = nodes[nid], mode = n.test ? 'test' : n.choices?.length ? 'choices' : 'next';
    const kind = n.s === 'narrator' ? 'narr' : n.s === 'hero' || who.some(([k, l]) => k === n.s && l.includes('(héros)')) ? 'hero' : 'npc';
    const el = h('div', { class: `tree-node k-${kind}${nid === d.start ? ' start' : ''}`, id: 'tn-' + nid });
    const refs = Object.entries(nodes).filter(([, x]) => [x.next, x.test?.success, x.test?.fail, ...(x.choices || []).flatMap(c => [c.next, c.test?.success, c.test?.fail]), ...(x.branches || []).map(b => b.next)].includes(nid)).length;
    el.append(h('div', { class: 'tn-h' },
      select(n.s, who, v => { n.s = v; go(); }),
      nid === d.start ? h('em', { class: 'tn-start' }, 'début') : null,
      h('span', { class: 'sp' }),
      h('small', { class: 'tn-id', title: 'Identifiant interne' }, nid),
      nid !== d.start ? icoBtn('⚑', 'Commencer le dialogue ici', () => { d.start = nid; go(); }) : null,
      icoBtn('✕', 'Supprimer cette réplique', () => {
        if (!confirm(refs ? `Cette réplique est utilisée par ${refs} lien(s). La supprimer ?` : 'Supprimer cette réplique ?')) return;
        delete nodes[nid];
        for (const x of Object.values(nodes)) { if (x.next === nid) x.next = null; for (const o of [x.test, ...(x.choices || []), ...(x.choices || []).map(c => c.test), ...(x.branches || [])]) { if (!o) continue; for (const k of ['next', 'success', 'fail']) if (o[k] === nid) o[k] = null; } }
        if (d.start === nid) d.start = Object.keys(nodes)[0];
        go();
      }, 'del')),
      textarea(n.t, v => { n.t = v; changed(); }, { rows: 2, placeholder: kind === 'narr' ? 'Ce que raconte le narrateur…' : 'Ce que dit le personnage… ({héros} = nom du héros actif)' }),
      h('details', { class: 'tn-more' }, h('summary', {}, `Effets et variantes${n.effects?.length || n.variants?.length || n.branches?.length ? ' •' : ''}`),
        fieldFor('effects', n, 'effects', ctx, 'Effets quand cette réplique s\'affiche'), variants(n)),
      h('div', { class: 'tn-mode' }, ...[['next', 'Suite simple'], ['choices', 'Choix du héros'], ['test', 'Test auto']].map(([k, l]) =>
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
    (n.variants ||= []).forEach((v, i) => box.append(h('div', { class: 'card' }, h('label', { class: 'fld' }, h('span', {}, 'Si'), condEditor(v, 'cond', ctx)), fieldFor('longtext', v, 't', ctx, 'Texte'), icoBtn('✕', 'Supprimer', () => { n.variants.splice(i, 1); go(); }, 'del'))));
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
