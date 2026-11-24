// Format de niveau déclaratif (JSON) — produit par l'éditeur (editor.html), lu par le jeu.
// fromData(json) → objet STORY compris par le moteur de règles (scenario.js).
// Les « effets » et « conditions » sont des petites briques {type, ...champs} décrites ci-dessous :
// la même description sert à l'interpréteur ET aux formulaires de l'éditeur.
import { HEROES } from './heroes.js';
import { SKILL_NAMES, STATS, DIFFICULTIES } from './stats.js';
import { statBadge } from './stat-icons.js';

export const LEVEL_FORMAT = 1;

/** Types de champs : text, longtext, number, bool, item, quest, place, zone, flag, cast, npc, dialogue, stat, diff, who, image, wave, effects, cond, conds, icon */
export const WHO = { active: 'Héros actif', here: 'Héros sur la case', all: 'Tous les héros' };

/** Groupes d'effets (menus de l'éditeur) */
export const EFFECT_GROUPS = { recit: 'Récit', logique: 'Dés et logique', heros: 'Héros', objets: 'Objets et quêtes', carte: 'Carte et figurines', partie: 'Partie' };
export const EFFECTS = {
  toast:      { g: 'recit', label: 'Message', fields: [['text', 'text', '', 'Texte ({héros} = nom du héros actif)']] },
  narrate:    { g: 'recit', label: 'Narration plein écran', fields: [['title', 'text', '', 'Titre'], ['text', 'longtext', '', 'Texte'], ['image', 'image', 'assets/bg/painting3.jpg', 'Image']] },
  dialogue:   { g: 'recit', label: 'Lancer un dialogue', fields: [['dialogue', 'dialogue', '', 'Dialogue'], ['npc', 'cast', '', 'Avec']] },
  night:      { g: 'recit', label: 'La nuit tombe', fields: [] },
  bell:       { g: 'recit', label: 'Son de cloche', fields: [] },
  test:       { g: 'logique', label: 'Test de stat (dés)', fields: [['stat', 'stat', 'force', 'Stat'], ['diff', 'diff', 'normal', 'Difficulté'], ['mod', 'number', 0, 'Modif. %'], ['label', 'text', '', 'Intitulé'], ['success', 'effects', [], 'Si réussite'], ['fail', 'effects', [], 'Si échec']] },
  if:         { g: 'logique', label: 'Si… alors… sinon', fields: [['cond', 'cond', null, 'Condition'], ['then', 'effects', [], 'Alors'], ['else', 'effects', [], 'Sinon']] },
  random:     { g: 'logique', label: 'Au hasard (… %)', fields: [['chance', 'number', 50, 'Chance %'], ['then', 'effects', [], 'Si le hasard sourit'], ['else', 'effects', [], 'Sinon']] },
  choose:     { g: 'logique', label: 'Choix des joueurs (fenêtre)', fields: [['title', 'text', 'Que faites-vous ?', 'Titre'], ['text', 'longtext', '', 'Texte'], ['options', 'options', [], 'Options']] },
  counter:    { g: 'logique', label: 'Compteur ±', fields: [['key', 'text', '', 'Compteur'], ['n', 'number', 1, 'Ajouter']] },
  set:        { g: 'logique', label: 'Poser un drapeau', fields: [['flag', 'flag', '', 'Drapeau'], ['value', 'bool', true, 'Valeur']] },
  boost:      { g: 'heros', label: 'Boosts ±', fields: [['n', 'number', 1, 'Nombre (négatif = perte)'], ['who', 'who', 'active', 'Qui']] },
  heal:       { g: 'heros', label: 'Soigner', fields: [['n', 'number', 2, 'PV'], ['who', 'who', 'active', 'Qui']] },
  damage:     { g: 'heros', label: 'Blesser (perte de PV)', fields: [['n', 'number', 1, 'PV perdus'], ['who', 'who', 'active', 'Qui'], ['lethal', 'bool', false, 'Peut faire tomber le héros']] },
  restHere:   { g: 'heros', label: 'Repos complet (PV max + 1 boost, case)', fields: [] },
  statBonus:  { g: 'heros', label: 'Bonus / malus de stat', fields: [['stat', 'statc', 'force', 'Stat'], ['n', 'number', 5, 'Points (%)'], ['who', 'who', 'active', 'Qui'], ['duration', 'duration', 'level', 'Durée']] },
  dmgBonus:   { g: 'heros', label: 'Bonus de dégâts (arme…)', fields: [['n', 'number', 1, 'Dégâts'], ['who', 'who', 'active', 'Qui'], ['duration', 'duration', 'level', 'Durée']] },
  status:     { g: 'heros', label: 'État (poison, étourdi, guérison)', fields: [['status', 'hcond', 'poison', 'État'], ['who', 'who', 'active', 'Qui']] },
  xp:         { g: 'heros', label: 'XP bonus (fin du niveau)', fields: [['n', 'number', 5, 'XP'], ['who', 'who', 'all', 'Qui']] },
  moveHero:   { g: 'heros', label: 'Déplacer des héros vers un lieu', fields: [['place', 'place', '', 'Lieu'], ['who', 'who', 'active', 'Qui']] },
  give:       { g: 'objets', label: 'Donner un objet', fields: [['item', 'item', '', 'Objet'], ['n', 'number', 1, 'Quantité']] },
  take:       { g: 'objets', label: 'Retirer un objet', fields: [['item', 'item', '', 'Objet']] },
  questStart: { g: 'objets', label: 'Démarrer une quête', fields: [['quest', 'quest', '', 'Quête']] },
  questDone:  { g: 'objets', label: 'Terminer une quête', fields: [['quest', 'quest', '', 'Quête']] },
  revealPlace:{ g: 'carte', label: 'Révéler un lieu', fields: [['place', 'place', '', 'Lieu']] },
  revealNearestPlace: { g: 'carte', label: 'Révéler le lieu inconnu le plus proche', fields: [] },
  unlockZone: { g: 'carte', label: 'Déverrouiller une zone', fields: [['zone', 'zone', '', 'Zone']] },
  spawn:      { g: 'carte', label: 'Faire apparaître une figurine', fields: [['cast', 'cast', '', 'Figurine']] },
  spawnWave:  { g: 'carte', label: 'Faire apparaître une vague', fields: [['wave', 'wave', '', 'Vague (étiquette)']] },
  despawn:    { g: 'carte', label: 'Retirer une figurine (départ, fuite)', fields: [['cast', 'cast', '', 'Figurine']] },
  glas:       { g: 'partie', label: 'Glas ±', fields: [['n', 'number', 1, 'Nombre (négatif = recul)']] },
  glasMax:    { g: 'partie', label: 'Limite de glas ± (plus ou moins de temps)', fields: [['n', 'number', 1, 'Glas']] },
  rep:        { g: 'partie', label: 'Réputation PNJ ±', fields: [['npc', 'cast', '', 'PNJ'], ['n', 'number', 1, 'Points']] },
  remember:   { g: 'partie', label: 'Mémoire de campagne', fields: [['key', 'text', '', 'Clé'], ['value', 'text', 'true', 'Valeur']] },
  victory:    { g: 'partie', label: 'Victoire', fields: [] },
  defeat:     { g: 'partie', label: 'Défaite', fields: [] },
};

export const CONDS = {
  flag:      { label: 'Drapeau posé', fields: [['flag', 'flag', '', 'Drapeau']] },
  notFlag:   { label: 'Drapeau non posé', fields: [['flag', 'flag', '', 'Drapeau']] },
  has:       { label: 'Possède l\'objet', fields: [['item', 'item', '', 'Objet']] },
  notHas:    { label: 'Ne possède pas l\'objet', fields: [['item', 'item', '', 'Objet']] },
  quest:     { label: 'État d\'une quête', fields: [['quest', 'quest', '', 'Quête'], ['state', 'qstate', 'active', 'État']] },
  heroIs:    { label: 'Le héros actif est…', fields: [['hero', 'hero', '', 'Héros']] },
  heroStat:  { label: 'Stat du héros actif ≥', fields: [['stat', 'statc', 'force', 'Stat'], ['n', 'number', 50, 'Au moins (%)']] },
  hpBelow:   { label: 'PV du héros actif ≤', fields: [['n', 'number', 3, 'PV']] },
  wounded:   { label: 'Le héros actif est blessé', fields: [] },
  partySize: { label: 'Nombre de héros ≥', fields: [['n', 'number', 2, 'Au moins']] },
  round:     { label: 'Manche ≥', fields: [['n', 'number', 3, 'Manche']] },
  glas:      { label: 'Glas ≥', fields: [['n', 'number', 5, 'Glas']] },
  night:     { label: 'C\'est la nuit', fields: [] },
  counter:   { label: 'Compteur ≥', fields: [['key', 'text', '', 'Compteur'], ['n', 'number', 1, 'Au moins']] },
  enemiesAt: { label: 'Ennemis présents au lieu', fields: [['place', 'place', '', 'Lieu']] },
  noEnemiesAt: { label: 'Plus d\'ennemis au lieu', fields: [['place', 'place', '', 'Lieu']] },
  alive:     { label: 'Figurine en vie', fields: [['cast', 'cast', '', 'Figurine']] },
  rep:       { label: 'Réputation PNJ ≥', fields: [['npc', 'cast', '', 'PNJ'], ['n', 'number', 1, 'Au moins']] },
  memory:    { label: 'Mémoire de campagne', fields: [['key', 'text', '', 'Clé']] },
  not:       { label: 'NON (inverse une condition)', fields: [['cond', 'cond', null, 'Condition']] },
  all:       { label: 'Toutes ces conditions', fields: [['conds', 'conds', [], 'Conditions']] },
  any:       { label: 'Au moins une condition', fields: [['conds', 'conds', [], 'Conditions']] },
};
export const DURATION = { level: 'Ce niveau seulement', campaign: 'Toute la campagne (permanent)' };
export const HCOND = { poison: 'Empoisonné (−1 PV par tour)', stun: 'Étourdi (pas d\'attaque au prochain tour)', cure: 'Guérir (retire poison et étourdissement)' };
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
    case 'heroIs': return g.activeId() === c.hero;
    case 'heroStat': return g.skillOf(g.activeId(), c.stat) >= (+c.n || 0);
    case 'hpBelow': return g.hpOf(g.activeId()) <= (+c.n || 0);
    case 'wounded': return g.hpOf(g.activeId()) < g.maxHpOf(g.activeId());
    case 'partySize': return g.partySize() >= (+c.n || 1);
    case 'round': return g.round() >= (+c.n || 1);
    case 'glas': return g.glasNow() >= (+c.n || 1);
    case 'night': return g.isNight();
    case 'counter': return (g.counterOf(c.key) || 0) >= (+c.n || 1);
    case 'not': return !evalCond(c.cond, g);
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
    case 'toast': return g.toast(g.fill(e.text), e.ms || 2800);
    case 'narrate': return g.narrate({ title: g.fill(e.title || ''), text: g.fill(e.text || ''), image: e.image || 'assets/bg/painting3.jpg' });
    case 'random': return runEffects(Math.random() * 100 < (+e.chance || 0) ? e.then : e.else, g, ctx);
    case 'choose': {
      const opts = (e.options || []).map(o => ({ label: g.fill(o.label || '…'), disabled: !evalCond(o.cond, g), need: o.need }));
      const i = await g.choose({ title: g.fill(e.title || ''), text: g.fill(e.text || ''), options: opts });
      return runEffects(e.options?.[i]?.effects, g, ctx);
    }
    case 'counter': return g.addCounter(e.key, +e.n || 0);
    case 'damage': return g.damage(+e.n || 1, e.who || 'active', !!e.lethal);
    case 'statBonus': return g.statBonus(e.stat || 'force', +e.n || 0, e.who || 'active', e.duration || 'level');
    case 'status': return g.setStatus(e.status || 'poison', e.who || 'active');
    case 'dmgBonus': return g.dmgBonus(+e.n || 1, e.who || 'active', e.duration || 'level');
    case 'xp': return g.addXp(+e.n || 0, e.who || 'all');
    case 'moveHero': return g.moveHeroesTo(e.place, e.who || 'active');
    case 'despawn': return g.despawn(e.cast);
    case 'glasMax': return g.addGlasMax(+e.n || 0);
    case 'defeat': return g.defeat();
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
const testBadge = t => statBadge(t.stat, 26); // emblème seul, à gauche du choix (le nom reste en info-bulle)
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
      const ch = { t: c.t || '', badge: c.test ? testBadge(c.test) : undefined, hint: c.hint || undefined, once: !!c.once, onceSuccess: !!c.onceSuccess, lastOk: () => cctx.last, need: c.need, cond: cond(c.cond) };
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
    cast: d.cast || [],
    items: mapObj(d.items, it => ({ ...it, use: it.useEffects?.length ? g => runEffects(it.useEffects, g) : undefined })),
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
