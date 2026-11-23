// ============================================================================
//  Chapitre I — « La Cloche de Saint-Ombre »
//  Scénario 100 % données + petits scripts. Indépendant du moteur d'affichage
//  et de la forme des tuiles : les lieux sont ancrés en coordonnées normalisées
//  [0..1] et projetés sur la grille du moteur (carrée, rect, hex…).
// ============================================================================

export const STORY = {
  id: 'ch1',
  title: 'La Cloche de Saint-Ombre',
  startTime: 18 * 60, nightAt: 21 * 60, minutesPerStep: 10,

  heroes: [
    { id: 'aldric', name: 'Aldric', kind: 'knight', color: '#3566b0', team: 'hero', hp: 8, skill: 65, armor: 15, move: 3, role: 'Chevalier', range: 1, skillName: 'Combat' },
    { id: 'ysolde', name: 'Ysolde', kind: 'mage', color: '#7140a8', team: 'hero', hp: 6, skill: 70, armor: 5, move: 3, role: 'Mage', range: 2, skillName: 'Magie' },
  ],

  // Lieux uniques (ancrés). `near` = placé sur une case voisine d'un autre lieu, le plus loin possible de `away`.
  places: [
    { id: 'grisval', name: 'Grisval', terrain: 'village', at: [0.28, 0.55], start: true, poi: { id: 'inn', icon: '⌂', label: 'Auberge du Pendu' } },
    { id: 'clairiere', name: 'Clairière des Pendus', terrain: 'forest', at: [0.1, 0.08] },
    { id: 'souche', name: 'Vieille Souche', terrain: 'forest', at: [0.4, 0.12], poi: { id: 'stump', icon: '✦', label: 'Souche creuse' } },
    { id: 'marais', name: 'Marais de Brume', terrain: 'swamp', at: [0.22, 0.98] },
    { id: 'chapelle', name: 'Chapelle Sainte-Brume', terrain: 'ruins', at: [0.6, 0.92], poi: { id: 'altar', icon: '✝', label: 'Autel profané' } },
    { id: 'charnier', name: 'Champs Calcinés', terrain: 'burned', at: [0.58, 0.48], poi: { id: 'pit', icon: '☠', label: 'Charnier' } },
    { id: 'cairn', name: 'Col des Âmes', terrain: 'snow', at: [0.78, 0.02], poi: { id: 'cairn', icon: 'ᚱ', label: 'Cairn runique' } },
    { id: 'abbaye', name: 'Abbaye de Saint-Ombre', terrain: 'ruins', at: [0.88, 0.42], poi: { id: 'gate', icon: '⚿', label: 'Portail scellé' } },
    { id: 'crypte', name: 'Crypte du Sonneur', terrain: 'crypt', near: 'abbaye', away: 'grisval' },
  ],
  // Zones d'influence pour remplir le reste de la carte (procédural)
  regions: [
    { terrain: 'forest', at: [0.22, 0.12], r: 0.34 }, { terrain: 'swamp', at: [0.2, 0.92], r: 0.24 },
    { terrain: 'rock', at: [0.84, 0.16], r: 0.26 }, { terrain: 'snow', at: [0.98, 0.0], r: 0.14 },
    { terrain: 'burned', at: [0.62, 0.55], r: 0.16 }, { terrain: 'plains', at: [0.45, 0.65], r: 0.32 }, { terrain: 'rock', at: [0.95, 0.85], r: 0.18 },
  ],

  // Figurines non-héros. hidden = apparaît à la révélation du lieu ; spawnOn = apparaît sur un déclencheur.
  cast: [
    { id: 'maud', name: 'Maud l\'herboriste', kind: 'npc', color: '#8a6a44', team: 'npc', place: 'grisval' },
    { id: 'destrier', name: 'Destrier', kind: 'horse', color: '#5a3d2a', team: 'mount', place: 'grisval' },
    { id: 'tobie', name: 'Tobie', kind: 'child', color: '#9a7a3a', team: 'npc', place: 'clairiere', hidden: true },
    { id: 'renard1', name: 'Renard cendreux', kind: 'fox', color: '#7a6a5a', team: 'enemy', place: 'clairiere', hidden: true, hp: 2, atk: 35, def: 10 },
    { id: 'renard2', name: 'Renard cendreux', kind: 'fox', color: '#7a6a5a', team: 'enemy', place: 'clairiere', hidden: true, hp: 2, atk: 35, def: 10 },
    { id: 'passeur', name: 'Le Passeur', kind: 'ferryman', color: '#3d5050', team: 'npc', place: 'marais', hidden: true },
    { id: 'goule1', name: 'Goule du cloître', kind: 'ghoul', color: '#7d8b6a', team: 'enemy', place: 'abbaye', hidden: true, hp: 3, atk: 45, def: 10, undead: true },
    { id: 'goule2', name: 'Goule du cloître', kind: 'ghoul', color: '#6f7d5c', team: 'enemy', place: 'abbaye', hidden: true, hp: 3, atk: 45, def: 10, undead: true },
    { id: 'goule3', name: 'Goule du charnier', kind: 'ghoul', color: '#5c6a4e', team: 'enemy', place: 'charnier', spawnOn: 'pit', hp: 2, atk: 40, def: 5, undead: true },
    { id: 'anselme', name: 'Frère Anselme', kind: 'monk', color: '#3a2a22', team: 'boss', place: 'crypte', hidden: true, hp: 6, atk: 55, def: 20, undead: true, static: true },
  ],

  items: {
    herbes: { name: 'Herbes de veille', icon: '❦', desc: 'Toucher : soigne 3 PV au héros sélectionné.', usable: true },
    piece: { name: 'Pièce d\'argent ancienne', icon: '◉', desc: 'Frappée du sceau de l\'abbé.' },
    eau: { name: 'Eau bénite', icon: '⚱', desc: '+1 dégât contre les morts-vivants.' },
    cle: { name: 'Clé de la crypte', icon: '⚿', desc: 'Ouvre le portail de Saint-Ombre.' },
  },

  quests: {
    aide: { title: 'Trouver de l\'aide à Grisval', hint: 'Parlez à Maud, au village.', target: 'grisval' },
    tobie: { title: 'Retrouver Tobie', hint: 'Il coupait du bois à la Clairière des Pendus, au nord-ouest.', target: 'clairiere' },
    tobie2: { title: 'Ramener Tobie à Maud', hint: 'Parlez à Maud à Grisval.', target: 'grisval' },
    cle: { title: 'Obtenir la clé de l\'abbaye', hint: 'Le Passeur vit dans le Marais de Brume, au sud.', target: 'marais' },
    portail: { title: 'Ouvrir le portail de Saint-Ombre', hint: 'L\'abbaye est à l\'est. Méfiez-vous du cloître.', target: 'abbaye' },
    cloche: { title: 'Faire taire la cloche', hint: 'Descendez dans la crypte.', target: 'crypte' },
  },

  intro: [
    { title: 'Chapitre I — La Cloche de Saint-Ombre', image: 'assets/bg/painting1.jpg',
      text: 'Depuis trois nuits, la cloche de l\'abbaye de Saint-Ombre sonne sans sonneur. À chaque heure. Les moines ne sont plus redescendus depuis la Toussaint, et personne à Grisval n\'ose monter là-haut.' },
    { title: 'Grisval, au crépuscule', image: 'assets/bg/painting3.jpg',
      text: 'Aldric, chevalier sans seigneur, et Ysolde, mage errante, entrent au village alors que la brume monte du marais. Les volets sont clos. Seule brûle encore la lanterne de la vieille Maud.' },
  ],
  ending: { title: 'Le silence', image: 'assets/bg/painting4.jpg',
    text: 'Le dernier tintement meurt sous les voûtes. Frère Anselme s\'effondre, enfin libre, et la Cloche d\'Avant se fend d\'un trait noir. Au-dessus du marais, pour la première fois depuis des nuits, Grisval entend le vent — et rien d\'autre.' },

  // ---------------------------------------------------------------- dialogues
  dialogues: {
    maud_intro: { start: 'a', nodes: {
      a: { s: 'maud', t: 'Encore des voyageurs… Entrez, et fermez la porte : la brume entre avec vous.', next: 'b' },
      b: { s: 'hero', t: 'On nous a parlé d\'une cloche qui sonne seule, là-haut. Que se passe-t-il à Saint-Ombre ?', next: 'c' },
      c: { s: 'maud', t: 'Depuis la Toussaint, plus un moine n\'est descendu. Et depuis trois nuits, la cloche sonne les heures. Sans sonneur.', next: 'd' },
      d: { s: 'maud', t: 'Mais j\'ai plus pressant que vos histoires de cloche : mon petit-fils, Tobie, est parti couper du bois ce matin. Il n\'est jamais rentré.', next: 'menu' },
      menu: { s: 'maud', t: 'Alors ? Vous m\'aiderez ?', choices: [
        { t: 'Nous retrouverons Tobie.', once: true, next: 'tobie' },
        { t: 'Comment entrer dans l\'abbaye ?', once: true, next: 'abbaye' },
        { t: 'Que savez-vous des moines ?', once: true, next: 'moines' },
        { t: 'Nous partons.', next: null },
      ] },
      tobie: { s: 'maud', t: 'Il coupe toujours près de la Clairière des Pendus, au nord-ouest. Les renards y sont étranges, ces temps-ci… Que la Dame Grise vous garde.', next: 'menu', do: g => g.questStart('tobie') },
      abbaye: { s: 'maud', t: 'Le portail est scellé depuis l\'automne. Seul le Passeur, dans le marais au sud, en garde la clé… et il ne fait jamais rien pour rien.', next: 'menu', do: g => g.questStart('cle') },
      moines: { s: 'maud', t: 'Frère Anselme sonnait les heures depuis quarante ans. Un homme doux. On raconte qu\'ils ont trouvé quelque chose sous la crypte… quelque chose qui sonnait, aussi.', next: 'menu' },
    } },
    maud_idle: { start: 'a', nodes: {
      a: { s: 'maud', t: g => g.flag('tobieHome') ? 'Tobie dort enfin. Allez, et faites taire cette maudite cloche.' : 'Tobie… Ramenez-le-moi, je vous en prie.', choices: [
        { t: 'Nous avons ramené Tobie.', cond: g => g.flag('tobieSaved') && !g.flag('tobieRewarded'), need: 'Retrouvez Tobie', next: 'merci' },
        { t: 'À bientôt, Maud.', next: null },
      ] },
      merci: { s: 'maud', t: 'Mon petit… Merci. Prenez ces herbes de veille : elles referment les plaies et chassent la fièvre des morts.', next: null, do: g => { g.give('herbes', 2); g.set('tobieRewarded'); g.questDone('tobie2'); } },
    } },
    tobie: { start: 'a', nodes: {
      a: { s: 'tobie', t: 'Les renards… ils avaient des yeux comme des braises ! Merci, messire !', next: 'b' },
      b: { s: 'tobie', t: 'L\'autre nuit, j\'ai vu les moines à l\'orée du bois. Ils marchaient sans lanterne… Le Passeur leur a pris une grosse clé, je l\'ai vu !', next: 'c' },
      c: { s: 'hero', t: 'Rentre vite chez ta grand-mère. Et ne quitte plus le village.', next: null, do: async g => { g.set('tobieSaved'); g.questDone('tobie'); g.questStart('tobie2'); await g.sendHome('tobie'); } },
    } },
    passeur: { start: 'a', nodes: {
      a: { s: 'passeur', t: 'Hé hé… Des marcheurs. La brume ne mène nulle part, sauf chez moi.', next: 'b' },
      b: { s: 'hero', t: 'On dit que tu détiens la clé du portail de Saint-Ombre.', next: 'menu' },
      menu: { s: 'passeur', t: 'Peut-être. Les moines me l\'ont confiée… avant de changer. Elle a un prix.', choices: [
        { t: 'Offrir la pièce d\'argent ancienne.', cond: g => g.has('piece'), need: 'Pièce d\'argent', next: 'piece' },
        { t: 'Tobie est sain et sauf grâce à nous.', cond: g => g.flag('tobieSaved'), need: 'Sauver Tobie', next: 'tobie' },
        { t: '(Intimider) Donne-la, ou je te la prends.', once: true, next: g => 'menace' },
        { t: 'Nous reviendrons.', next: null },
      ] },
      piece: { s: 'passeur', t: 'Oh… une pièce de l\'Abbé lui-même. Voilà qui me convient. Prends ta clé, et ne reviens pas.', next: null, do: g => { g.take('piece'); g.gotKey(); } },
      tobie: { s: 'passeur', t: 'Le gamin de Maud ? Il m\'apporte mon pain chaque semaine… Tiens. Et ne la perds pas.', next: null, do: g => g.gotKey() },
      menace: { s: 'passeur', t: 'Hé hé… Voyons ce que vaut ta lame.', do: async g => g.set('intimidate', await g.roll('Intimidation', 50)), next: g => (g.flag('intimidate') ? 'ok' : 'ko') },
      ok: { s: 'passeur', t: 'D\'accord, d\'accord ! Range ça… La voilà, ta clé maudite.', next: null, do: g => g.gotKey() },
      ko: { s: 'passeur', t: 'Hé hé hé… Tu ne me fais pas peur. Reviens avec de quoi payer.', next: 'menu' },
    } },
    anselme: { start: 'a', nodes: {
      a: { s: 'anselme', t: 'Vous entendez ? Elle sonne… Elle sonne pour vous.', next: 'b', do: g => g.bell() },
      b: { s: 'hero', t: 'Frère Anselme ! Qu\'est-il arrivé aux moines ?', next: 'c' },
      c: { s: 'anselme', t: 'Nous l\'avons trouvée sous l\'autel. La Cloche d\'Avant. Elle nous a appris le chant… le chant qui ne finit jamais.', choices: [
        { t: '(Eau bénite) Anselme, souvenez-vous de qui vous étiez !', cond: g => g.has('eau'), need: 'Eau bénite', next: 'eau' },
        { t: 'Nous allons la faire taire.', next: 'combat' },
      ] },
      eau: { s: 'anselme', t: 'Je… je me souviens… les matines, le pain chaud… NON ! Taisez-vous !', next: null, do: g => { g.set('anselmeWeak'); g.toast('Anselme vacille : ses défenses tombent (−15 %).'); } },
      combat: { s: 'anselme', t: 'Alors rejoignez le chœur !', next: null },
    } },
  },

  // ---------------------------------------------------------------- déclencheurs
  onStart: async g => { g.questStart('aide'); },
  talk: {
    maud: g => (g.flag('metMaud') ? 'maud_idle' : 'maud_intro'),
    tobie: g => (g.flag('tobieSaved') ? null : g.enemiesAt('clairiere') ? null : 'tobie'),
    passeur: g => (g.has('cle') || g.flag('gotKey') ? null : 'passeur'),
    anselme: () => null,
  },
  afterTalk: {
    maud_intro: async g => {
      g.set('metMaud'); g.questDone('aide');
      if (!g.questActive('tobie')) g.questStart('tobie');
      if (!g.questActive('cle')) g.questStart('cle');
    },
  },
  idleLine: {
    tobie: g => (g.flag('tobieSaved') ? 'Tobie : « Merci encore, messire ! »' : 'Tobie se cache derrière une souche, terrorisé.'),
    passeur: () => 'Le Passeur : « Je n\'ai plus rien pour toi. »',
  },
  onReveal: {
    clairiere: async g => g.toast('Des renards aux yeux de braise encerclent un garçon !', 3000),
    marais: async g => g.toast('Une barque. Une lanterne. Quelqu\'un attend.', 2600),
    abbaye: async g => { g.night(); g.bell(); g.toast('La nuit tombe d\'un coup. Des goules gardent le cloître !', 3200); },
    crypte: async g => { g.bell(); },
  },
  onEnter: {
    crypte: async g => { if (!g.flag('anselmeTalk')) { g.set('anselmeTalk'); await g.dialogue('anselme', 'anselme'); } },
  },
  poi: {
    inn: async g => g.rest(),
    stump: async g => { await g.narrate({ title: 'Souche creuse', text: 'Au creux de la souche, une bourse pourrie. Dedans, une pièce d\'argent frappée du sceau de l\'abbé de Saint-Ombre.', image: 'assets/bg/painting1.jpg' }); g.give('piece'); return true; },
    altar: async g => { await g.narrate({ title: 'Autel profané', text: 'Les cierges ont été brisés, l\'autel souillé. Mais sous la pierre descellée, une fiole intacte : de l\'eau bénite, encore fraîche.', image: 'assets/bg/painting4.jpg' }); g.give('eau'); return true; },
    pit: async g => { g.toast('La terre du charnier remue…', 2200); await g.spawn('goule3'); return true; },
    cairn: async g => { await g.narrate({ title: 'Cairn runique', text: '« Ici dort ce qui sonne sous la terre. Que nul ne l\'éveille, que nul ne lui réponde. » — gravé par les premiers frères de Saint-Ombre.', image: 'assets/bg/painting3.jpg' }); g.set('lore'); return true; },
    gate: async g => {
      if (!g.has('cle')) { g.toast('Le portail est scellé. Il vous faut la clé.'); return false; }
      if (g.enemiesAt('abbaye')) { g.toast('Les goules vous empêchent d\'approcher du portail !'); return false; }
      await g.narrate({ title: 'Le portail', text: 'La clé tourne dans un grincement de tombeau. Derrière, un escalier s\'enfonce dans le noir… et la cloche, en dessous, se met à sonner.', image: 'assets/bg/painting4.jpg' });
      g.questDone('portail'); g.questStart('cloche'); await g.revealPlace('crypte'); return true;
    },
  },
  onDefeat: {
    renard1: async g => { if (!g.enemiesAt('clairiere')) g.toast('Les renards sont vaincus. Tobie est sauf !'); },
    renard2: async g => { if (!g.enemiesAt('clairiere')) g.toast('Les renards sont vaincus. Tobie est sauf !'); },
    anselme: async g => { g.bell(); g.questDone('cloche'); await g.end(); },
  },
};
