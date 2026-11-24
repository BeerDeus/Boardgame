// Format de niveau déclaratif (JSON) — produit par l'éditeur (editor.html), lu par le jeu.
// fromData(json) → objet STORY compris par le moteur de règles (scenario.js).
// Les « effets » et « conditions » sont des petites briques {type, ...champs} décrites ci-dessous :
// la même description sert à l'interpréteur ET aux formulaires de l'éditeur.
import { HEROES } from './heroes.js';
import { SKILL_NAMES, STATS, DIFFICULTIES } from './stats.js';

export const LEVEL_FORMAT = 1;

/** Types de champs : text, longtext, number, bool, item, quest, place, zone, flag, cast, npc, dialogue, stat, diff, who, image, wave, effects, cond, conds, icon */
export const WHO = { active: 'Héros actif', here: 'Héros sur la case', all: 'Tous les héros' };

export const EFFECTS = {
  toast:      { label: 'Message', fields: [['text', 'text', '', 'Texte']] },
  narrate:    { label: 'Narration plein écran', fields: [['title', 'text', '', 'Titre'], ['text', 'longtext', '', 'Texte'], ['image', 'image', 'assets/bg/painting3.jpg', 'Image']] },
  test:       { label: 'Test de stat (dés)', fields: [['stat', 'stat', 'force', 'Stat'], ['diff', 'diff', 'normal', 'Difficulté'], ['mod', 'number', 0, 'Modif. %'], ['label', 'text', '', 'Intitulé'], ['success', 'effects', [], 'Si réussite'], ['fail', 'effects', [], 'Si échec']] },
  if:         { label: 'Si… alors… sinon', fields: [['cond', 'cond', null, 'Condition'], ['then', 'effects', [], 'Alors'], ['else', 'effects', [], 'Sinon']] },
  give:       { label: 'Donner un objet', fields: [['item', 'item', '', 'Objet'], ['n', 'number', 1, 'Quantité']] },
  take:       { label: 'Retirer un objet', fields: [['item', 'item', '', 'Objet']] },
  boost:      { label: 'Boosts ±', fields: [['n', 'number', 1, 'Nombre (négatif = perte)'], ['who', 'who', 'active', 'Qui']] },
  heal:       { label: 'Soigner', fields: [['n', 'number', 2, 'PV'], ['who', 'who', 'active', 'Qui']] },
  restHere:   { label: 'Repos complet (PV max + 1 boost, case)', fields: [] },
  glas:       { label: 'Glas ±', fields: [['n', 'number', 1, 'Nombre (négatif = recul)']] },
  set:        { label: 'Poser un drapeau', fields: [['flag', 'flag', '', 'Drapeau'], ['value', 'bool', true, 'Valeur']] },
  questStart: { label: 'Démarrer une quête', fields: [['quest', 'quest', '', 'Quête']] },
  questDone:  { label: 'Terminer une quête', fields: [['quest', 'quest', '', 'Quête']] },
  revealPlace:{ label: 'Révéler un lieu', fields: [['place', 'place', '', 'Lieu']] },
  revealNearestPlace: { label: 'Révéler le lieu inconnu le plus proche', fields: [] },
  unlockZone: { label: 'Déverrouiller une zone', fields: [['zone', 'zone', '', 'Zone']] },
  spawn:      { label: 'Faire apparaître une figurine', fields: [['cast', 'cast', '', 'Figurine']] },
  spawnWave:  { label: 'Faire apparaître une vague', fields: [['wave', 'wave', '', 'Vague (étiquette)']] },
  dialogue:   { label: 'Lancer un dialogue', fields: [['dialogue', 'dialogue', '', 'Dialogue'], ['npc', 'cast', '', 'Avec']] },
  night:      { label: 'La nuit tombe', fields: [] },
  bell:       { label: 'Son de cloche', fields: [] },
  rep:        { label: 'Réputation PNJ ±', fields: [['npc', 'cast', '', 'PNJ'], ['n', 'number', 1, 'Points']] },
  remember:   { label: 'Mémoire de campagne', fields: [['key', 'text', '', 'Clé'], ['value', 'text', 'true', 'Valeur']] },
  victory:    { label: 'Victoire', fields: [] },
};

export const CONDS = {
  flag:      { label: 'Drapeau posé', fields: [['flag', 'flag', '', 'Drapeau']] },
  notFlag:   { label: 'Drapeau non posé', fields: [['flag', 'flag', '', 'Drapeau']] },
  has:       { label: 'Possède l\'objet', fields: [['item', 'item', '', 'Objet']] },
  notHas:    { label: 'Ne possède pas l\'objet', fields: [['item', 'item', '', 'Objet']] },
  quest:     { label: 'État d\'une quête', fields: [['quest', 'quest', '', 'Quête'], ['state', 'qstate', 'active', 'État']] },
  enemiesAt: { label: 'Ennemis présents au lieu', fields: [['place', 'place', '', 'Lieu']] },
  noEnemiesAt: { label: 'Plus d\'ennemis au lieu', fields: [['place', 'place', '', 'Lieu']] },
  alive:     { label: 'Figurine en vie', fields: [['cast', 'cast', '', 'Figurine']] },
  rep:       { label: 'Réputation PNJ ≥', fields: [['npc', 'cast', '', 'PNJ'], ['n', 'number', 1, 'Au moins']] },
  memory:    { label: 'Mémoire de campagne', fields: [['key', 'text', '', 'Clé']] },
  all:       { label: 'Toutes ces conditions', fields: [['conds', 'conds', [], 'Conditions']] },
  any:       { label: 'Au moins une condition', fields: [['conds', 'conds', [], 'Conditions']] },
};
export const QSTATE = { active: 'En cours', done: 'Terminée', none: 'Pas commencée' };

// ------------------------------------------------------------------ interpréteur
export function evalCond(c, g) {
  if (!c || !c.type) return true;
  switch (c.type) {
    case 'flag': return g.flag(c.flag);
    case 'notFlag': return !g.flag(c.flag);
    case 'has': return g.has(c.item);
    case 'notHas': return !g.has(c.item);
    case 'quest': return c.state === 'done' ? g.questDoneQ?.(c.quest) : c.state === 'none' ? !g.questActive(c.quest) && !g.questDoneQ?.(c.quest) : g.questActive(c.quest);
    case 'enemiesAt': return g.enemiesAt(c.place);
    case 'noEnemiesAt': return !g.enemiesAt(c.place);
    case 'alive': return g.alive(c.cast);
    case 'rep': return g.repOf(c.npc) >= (c.n ?? 1);
    case 'memory': return !!g.memory(c.key);
    case 'all': return (c.conds || []).every(x => evalCond(x, g));
    case 'any': return (c.conds || []).some(x => evalCond(x, g));
    default: console.warn('Condition inconnue', c); return true;
  }
}
const parseVal = v => (v === 'true' ? true : v === 'false' ? false : v);

export async function runEffects(list, g, ctx = {}) {
  for (const e of list || []) await runEffect(e, g, ctx);
}
async function runEffect(e, g, ctx) {
  switch (e.type) {
    case 'toast': return g.toast(e.text, e.ms || 2800);
    case 'narrate': return g.narrate({ title: e.title || '', text: e.text || '', image: e.image || 'assets/bg/painting3.jpg' });
    case 'test': { const ok = await g.test(e.stat || 'force', e.label || STATS[e.stat]?.name || 'Test', +e.mod || 0, e.diff || 'normal'); ctx.last = ok; return runEffects(ok ? e.success : e.fail, g, ctx); }
    case 'if': return runEffects(evalCond(e.cond, g) ? e.then : e.else, g, ctx);
    case 'give': return g.give(e.item, +e.n || 1);
    case 'take': return g.take(e.item);
    case 'boost': return g.boost(+e.n || 0, e.who || 'active');
    case 'heal': return g.heal(+e.n || 1, e.who || 'active');
    case 'restHere': return g.restHere();
    case 'glas': return g.glas(+e.n || 0);
    case 'set': return g.set(e.flag, e.value ?? true);
    case 'questStart': return g.questStart(e.quest);
    case 'questDone': return g.questDone(e.quest);
    case 'revealPlace': return g.revealPlace(e.place);
    case 'revealNearestPlace': return g.revealNearestPlace();
    case 'unlockZone': return g.unlockZone(e.zone);
    case 'spawn': return g.spawn(e.cast);
    case 'spawnWave': return g.spawnWave(e.wave);
    case 'dialogue': return g.dialogue(e.dialogue, e.npc);
    case 'night': return g.night();
    case 'bell': return g.bell();
    case 'rep': return g.rep(e.npc, +e.n || 0);
    case 'remember': return g.remember(e.key, parseVal(e.value ?? true));
    case 'victory': return g.victory();
    default: console.warn('Effet inconnu', e);
  }
}
const fx = list => (list?.length ? g => runEffects(list, g) : undefined);
const cond = c => (c?.type ? g => evalCond(c, g) : undefined);

function activity(a) {
  return { id: a.id, icon: a.icon || 'place', label: a.label || a.id, desc: a.desc || '', once: !!a.once, blockedByEnemies: !!a.blockedByEnemies,
    need: a.need, cond: cond(a.cond), run: g => runEffects(a.effects, g) };
}
/** Étiquette d'un choix à dés : seulement la stat testée (« 🎲 Force ») — la difficulté se devine à la formulation */
const testTag = t => `<small class="dlg-test">🎲 ${STATS[t.stat]?.name || t.stat}</small> `;
/** Lance le test puis applique les effets de réussite / d'échec ; renvoie le résultat */
async function rollTest(t, g, ctx) {
  const ok = await g.test(t.stat, t.label || STATS[t.stat]?.name, +t.mod || 0, t.diff || 'normal');
  ctx.last = ok; await runEffects(ok ? t.successEffects : t.failEffects, g, ctx); return ok;
}

function dialogue(d) {
  const nodes = {};
  for (const [id, n] of Object.entries(d.nodes || {})) {
    const ctx = {}; // résultat du dernier test de ce nœud
    const node = { s: n.s || 'hero' };
    node.t = n.variants?.length ? g => (n.variants.find(v => evalCond(v.cond, g))?.t ?? n.t ?? '') : (n.t ?? '');
    const after = n.test ? () => (ctx.last ? n.test.success : n.test.fail) || n.next || null : null;
    node.next = after || (n.branches?.length ? g => (n.branches.find(b => evalCond(b.cond, g))?.next ?? n.next ?? null) : (n.next ?? null));
    if (n.effects?.length || n.test) node.do = async g => {
      await runEffects(n.effects, g, ctx);
      if (n.test) await rollTest(n.test, g, ctx);
    };
    if (n.choices?.length) node.choices = n.choices.map(c => {
      const cctx = {};
      const ch = { t: (c.test ? testTag(c.test) : '') + (c.t || ''), hint: c.hint || undefined, once: !!c.once, need: c.need, cond: cond(c.cond) };
      ch.next = c.test ? () => (cctx.last ? c.test.success : c.test.fail) || c.next || null : (c.next ?? null);
      if (c.effects?.length || c.test) ch.do = async g => {
        await runEffects(c.effects, g, cctx);
        if (c.test) await rollTest(c.test, g, cctx);
      };
      return ch;
    });
    nodes[id] = node;
  }
  let start = d.start || Object.keys(d.nodes || {})[0];
  // texte d'ambiance : affiché par le narrateur avant la première réplique
  if (d.scene?.trim()) { nodes.__scene = { s: 'narrator', t: d.scene, next: start }; start = '__scene'; }
  return { start, nodes };
}
const mapObj = (o, f) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, f(v, k)]));

/** JSON du niveau → STORY pour le moteur */
export function fromData(d) {
  const st = {
    id: d.id, title: d.title || d.id, tutorial: !!d.tutorial, level: d,
    glasBase: d.glasBase || { facile: 11, normal: 9, difficile: 7 },
    boost: d.boost || { start: 2, max: 5, perRound: 1 },
    heroes: d.heroes || HEROES, skillNames: SKILL_NAMES,
    hexMap: d.hexMap, tileArt: d.tileArt, tiles: d.tiles || {},
    zones: d.zones || [], regions: d.regions || [],
    places: (d.places || []).map(p => ({ ...p, activities: (p.activities || []).map(activity) })),
    cast: d.cast || [], items: d.items || {},
    minors: (d.minors || []).map(m => ({ ...m, activities: (m.activities || []).map(activity) })), minorChance: d.minorChance ?? 0,
    quests: d.quests || {}, intro: d.intro || [], victoryText: d.victoryText, defeatText: d.defeatText,
    dialogues: mapObj(d.dialogues, dialogue),
    talk: mapObj(d.talk, rules => g => { for (const r of rules) if (evalCond(r.cond, g)) return r.dialogue || null; return null; }),
    idleLine: mapObj(d.idleLine, t => () => t),
    afterTalk: mapObj(d.afterTalk, fx), onReveal: mapObj(d.onReveal, fx), onEnter: mapObj(d.onEnter, fx),
    glasEvents: mapObj(d.glasEvents, fx), onDefeat: mapObj(d.onDefeat, fx),
    remember: d.remember?.length ? g => Object.fromEntries(d.remember.map(r => [r.key, r.flag ? g.flag(r.flag) : parseVal(r.value)])) : undefined,
    bossExtraGlas: d.bossExtraGlas,
  };
  return st;
}

/** Niveau vide (point de départ de l'éditeur) */
export function emptyLevel() {
  return {
    format: LEVEL_FORMAT, id: 'nouveau', title: 'Nouveau niveau', tutorial: false,
    glasBase: { facile: 11, normal: 9, difficile: 7 }, boost: { start: 2, max: 5, perRound: 1 },
    hexMap: ['  ooo  ', ' oooo  ', '  ooo  '], tiles: {}, zones: [],
    places: [{ id: 'depart', name: 'Point de départ', terrain: 'village', cell: [3, 1], start: true, teaser: '', desc: '', activities: [] }],
    cast: [], items: {}, quests: {}, minors: [], minorChance: 0,
    intro: [{ title: 'Nouveau niveau', image: 'assets/bg/painting1.jpg', text: 'Il était une fois…' }],
    victoryText: { title: 'Victoire', image: 'assets/bg/painting4.jpg', text: '' },
    defeatText: { title: 'Défaite', image: 'assets/bg/painting2.jpg', text: '' },
    dialogues: {}, talk: {}, idleLine: {}, afterTalk: {}, onReveal: {}, onEnter: {}, glasEvents: {}, onDefeat: {}, remember: [],
  };
}
