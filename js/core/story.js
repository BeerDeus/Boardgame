// ============================================================================
//  Chapitre I — « Le Glas de Saint-Ombre »  (coopératif, 1 à 4 héros)
//
//  But commun : faire taire la cloche maudite AVANT le 12ᵉ glas.
//  Chaque fin de manche, la cloche sonne (+1 glas). Les morts se lèvent.
//  Le Rite de silence exige 3 éléments, trouvés en parallèle par le groupe :
//    • le Psautier noir   (Chapelle Sainte-Brume, gardée par des pillards)
//    • l'Huile de veille  (Maud la prépare avec l'Herbe-de-lune… cueillie par Tobie, disparu)
//    • la Clé du clocher  (le Passeur du marais : payer, convaincre, intimider ou voler)
//  puis l'accomplir au clocher, sous les coups du Sonneur.
//
//  Données + petits scripts. Indépendant du moteur et de la forme des tuiles.
// ============================================================================

export const STORY = {
  id: 'ch1b',
  title: 'Le Glas de Saint-Ombre',
  glasMax: { facile: 14, normal: 12, difficile: 10 },

  // ---------------------------------------------------------------- héros
  heroes: [
    { id: 'aldric', name: 'Aldric', kind: 'knight', color: '#3f74d8', role: 'Chevalier', hp: 10, armor: 20, move: 3, range: 1, dmg: 1,
      skills: { combat: 65, force: 55, savoir: 35, discretion: 30 }, combatName: 'Combat',
      talent: 'Cavalier : peut monter le destrier (déplacement 5).' },
    { id: 'ysolde', name: 'Ysolde', kind: 'mage', color: '#9b5de5', role: 'Mage', hp: 7, armor: 5, move: 3, range: 2, dmg: 1,
      skills: { combat: 70, force: 25, savoir: 75, discretion: 40 }, combatName: 'Magie',
      talent: 'Lueur (action) : révèle les tuiles voisines. Attaque à 2 cases.' },
    { id: 'brann', name: 'Brann', kind: 'barbarian', color: '#d64545', role: 'Barbare', hp: 12, armor: 10, move: 3, range: 1, dmg: 2,
      skills: { combat: 60, force: 80, savoir: 25, discretion: 25 }, combatName: 'Combat',
      talent: 'Brute : inflige 2 dégâts par coup.' },
    { id: 'selene', name: 'Sélène', kind: 'rogue', color: '#33a36b', role: 'Voleuse', hp: 8, armor: 10, move: 4, range: 1, dmg: 1,
      skills: { combat: 55, force: 35, savoir: 45, discretion: 80 }, combatName: 'Combat',
      talent: 'Agile : déplacement 4. Experte en fouille et en vol.' },
  ],
  skillNames: { combat: 'Combat', force: 'Force', savoir: 'Savoir', discretion: 'Discrétion' },

  // ---------------------------------------------------------------- lieux (ancrés en coordonnées normalisées)
  places: [
    { id: 'grisval', name: 'Grisval', terrain: 'village', at: [0.28, 0.55], start: true, poi: { icon: '⌂', label: 'Auberge du Pendu' },
      desc: 'Un hameau aux volets clos. L\'Auberge du Pendu tient encore debout, et la lanterne de Maud brûle à sa fenêtre.',
      activities: [
        { id: 'rest', icon: '⌂', label: 'Dormir à l\'auberge', desc: 'Les héros présents récupèrent tous leurs PV.', run: g => g.restHere() },
      ] },
    { id: 'cimetiere', name: 'Cimetière de Grisval', terrain: 'crypt', at: [0.45, 0.78],
      desc: 'Les tombes sont fraîchement retournées. De l\'intérieur.',
      activities: [
        { id: 'graves', icon: '✝', label: 'Examiner les tombes', once: true, desc: 'Comprendre ce qui se passe ici.', run: async g => { await g.narrate({ title: 'Les tombes', text: 'Chaque fois que la cloche sonne, la terre frémit. Au cinquième glas, ceux qui dorment ici se lèveront — vous en êtes certains.', image: 'assets/bg/painting1.jpg' }); g.set('knowWave'); } },
      ] },
    { id: 'clairiere', name: 'Clairière des Pendus', terrain: 'forest', at: [0.08, 0.1],
      desc: 'Des cordes pourries pendent encore aux branches. Au sol, un panier renversé plein d\'herbes argentées.' },
    { id: 'souche', name: 'Vieille Souche', terrain: 'forest', at: [0.4, 0.1], poi: { icon: '✦', label: 'Souche creuse' },
      desc: 'Un chêne foudroyé dont le tronc creux servait jadis de cachette aux contrebandiers.',
      activities: [
        { id: 'stump', icon: '✦', label: 'Fouiller la souche', once: true, desc: 'Discrétion : trouver aussi la cache secrète.', run: async g => {
          g.give('piece');
          if (await g.test('discretion', 'Fouiller la cache')) g.give('herbes', 1);
        } },
      ] },
    { id: 'marais', name: 'Marais de Brume', terrain: 'swamp', at: [0.2, 0.98],
      desc: 'L\'eau noire clapote contre une barque amarrée. Une lanterne verte oscille à sa proue.' },
    { id: 'chapelle', name: 'Chapelle Sainte-Brume', terrain: 'ruins', at: [0.62, 0.92], poi: { icon: '✝', label: 'Sacristie' },
      desc: 'La chapelle a été pillée. Les pillards n\'étaient pas vivants.',
      activities: [
        { id: 'sacristy', icon: '📜', label: 'Fouiller la sacristie', once: true, blockedByEnemies: true, desc: 'Le Psautier noir devrait être caché ici.', run: async g => {
          await g.narrate({ title: 'La sacristie', text: 'Sous une dalle descellée, enveloppé de cuir noir : le Psautier de Saint-Ombre. Ses pages décrivent le Rite de silence, qui seul peut briser la Cloche d\'Avant.', image: 'assets/bg/painting4.jpg' });
          g.give('psautier'); g.questDone('psautier');
        } },
        { id: 'pray', icon: '🕯', label: 'Prier à l\'autel', once: true, blockedByEnemies: true, desc: 'Savoir : obtenir l\'eau bénite et repousser le glas.', run: async g => {
          g.give('eau');
          if (await g.test('savoir', 'Prière')) { g.glas(-1); g.toast('La prière apaise la cloche : <b>−1 glas</b>.'); }
        } },
      ] },
    { id: 'charnier', name: 'Champs Calcinés', terrain: 'burned', at: [0.58, 0.45], poi: { icon: '☠', label: 'Charnier' },
      desc: 'Une fosse commune noircie par le feu. Quelque chose y brille.',
      activities: [
        { id: 'pit', icon: '☠', label: 'Fouiller le charnier', once: true, desc: 'Discrétion : sans réveiller les morts…', run: async g => {
          if (await g.test('discretion', 'Fouiller sans bruit')) { g.give('herbes', 2); }
          else { g.toast('Les os s\'entrechoquent… <b>ils se lèvent !</b>', 2600); await g.spawn('squelette5'); }
        } },
      ] },
    { id: 'cairn', name: 'Col des Âmes', terrain: 'snow', at: [0.78, 0.02], poi: { icon: 'ᚱ', label: 'Cairn runique' },
      desc: 'Un cairn couvert de runes, battu par un vent glacé.',
      activities: [
        { id: 'runes', icon: 'ᚱ', label: 'Déchiffrer les runes', once: true, desc: 'Savoir : retrouver l\'ancienne bénédiction.', run: async g => {
          const ok = await g.test('savoir', 'Déchiffrer');
          await g.narrate({ title: 'Cairn runique', text: '« Ici dort ce qui sonne sous la terre. Que nul ne l\'éveille, que nul ne lui réponde. »' + (ok ? ' Vous murmurez la bénédiction gravée en dessous : la cloche, au loin, hésite.' : ''), image: 'assets/bg/painting3.jpg' });
          if (ok) { g.glas(-2); g.toast('Bénédiction : <b>−2 glas</b>.'); }
        } },
      ] },
    { id: 'abbaye', name: 'Abbaye de Saint-Ombre', terrain: 'ruins', at: [0.88, 0.42], poi: { icon: '⚿', label: 'Portail du clocher' },
      desc: 'Le cloître est envahi de ronces. Le portail du clocher est fermé par une lourde serrure de fer.',
      activities: [
        { id: 'gate', icon: '⚿', label: 'Ouvrir le portail du clocher', once: true, blockedByEnemies: true, need: 'Clé du clocher', cond: g => g.has('cle'), desc: 'Il faut la clé du Passeur.', run: async g => {
          await g.narrate({ title: 'Le portail', text: 'La clé tourne dans un grincement de tombeau. L\'escalier du clocher s\'enfonce dans le noir… et là-haut, quelque chose sonne.', image: 'assets/bg/painting4.jpg' });
          g.questDone('cle2'); g.questStart('rite'); await g.revealPlace('clocher');
        } },
      ] },
    { id: 'clocher', name: 'Clocher maudit', terrain: 'crypt', near: 'abbaye', away: 'grisval',
      desc: 'La Cloche d\'Avant pend au-dessus du vide, noire et fendue, vibrant sans qu\'on la touche.',
      activities: [
        { id: 'rite', icon: '✠', label: 'Accomplir le Rite de silence', desc: 'Savoir (−15 si le Sonneur vit). 3 réussites nécessaires.', need: 'Psautier noir + Huile de veille',
          cond: g => g.has('psautier') && g.has('huile'), run: async g => {
            const ok = await g.test('savoir', 'Rite de silence', g.alive('sonneur') ? -15 : 0);
            if (ok) { const n = g.inc('rite'); g.toast(`Le rite progresse : <b>${n}/3</b>`, 2400); if (n >= 3) await g.victory(); }
            else g.toast('Les mots se dérobent… la cloche résiste.');
          } },
      ] },
  ],
  regions: [
    { terrain: 'forest', at: [0.22, 0.12], r: 0.34 }, { terrain: 'swamp', at: [0.2, 0.92], r: 0.24 },
    { terrain: 'rock', at: [0.84, 0.16], r: 0.26 }, { terrain: 'snow', at: [0.98, 0.0], r: 0.14 },
    { terrain: 'burned', at: [0.62, 0.55], r: 0.16 }, { terrain: 'plains', at: [0.45, 0.65], r: 0.32 }, { terrain: 'rock', at: [0.95, 0.85], r: 0.18 },
  ],

  // ---------------------------------------------------------------- figurines non-héros
  // base = couleur du socle (or : PNJ amicaux, rouge sombre : ennemis)
  cast: [
    { id: 'maud', name: 'Maud', kind: 'npc', color: '#c9a45c', base: '#d4a84a', team: 'npc', place: 'grisval', role: 'Herboriste de Grisval' },
    { id: 'destrier', name: 'Destrier', kind: 'horse', color: '#5a3d2a', base: '#8a6a44', team: 'mount', place: 'grisval', role: 'Cheval de guerre (Aldric)' },
    { id: 'tobie', name: 'Tobie', kind: 'child', color: '#c9a45c', base: '#d4a84a', team: 'npc', place: 'clairiere', hidden: true, idle: 'sit', role: 'Petit-fils de Maud' },
    { id: 'passeur', name: 'Le Passeur', kind: 'ferryman', color: '#5f7f8f', base: '#d4a84a', team: 'npc', place: 'marais', hidden: true, role: 'Gardien de la barque' },
    { id: 'renard1', name: 'Renard', kind: 'fox', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'clairiere', hidden: true, hp: 2, atk: 35, def: 5 },
    { id: 'renard2', name: 'Renard', kind: 'fox', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'clairiere', hidden: true, hp: 2, atk: 35, def: 5 },
    { id: 'pillard1', name: 'Pillard', kind: 'skelrogue', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'chapelle', hidden: true, hp: 2, atk: 45, def: 10, undead: true },
    { id: 'pillard2', name: 'Pillard', kind: 'skelrogue', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'chapelle', hidden: true, hp: 2, atk: 45, def: 10, undead: true },
    { id: 'garde1', name: 'Garde mort', kind: 'skelwarrior', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'abbaye', hidden: true, hp: 3, atk: 50, def: 15, undead: true },
    { id: 'garde2', name: 'Garde mort', kind: 'skelwarrior', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'abbaye', hidden: true, hp: 3, atk: 50, def: 15, undead: true },
    { id: 'sonneur', name: 'Le Sonneur', kind: 'sonneur', color: '#b01e1e', base: '#3a0808', team: 'boss', place: 'clocher', hidden: true, hp: 8, atk: 55, def: 15, undead: true, static: true },
    { id: 'squelette1', name: 'Squelette', kind: 'skeleton', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'cimetiere', spawnOn: 'wave1', hp: 2, atk: 40, def: 5, undead: true },
    { id: 'squelette2', name: 'Squelette', kind: 'skeleton', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'cimetiere', spawnOn: 'wave1', hp: 2, atk: 40, def: 5, undead: true },
    { id: 'squelette3', name: 'Squelette', kind: 'skeleton', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'charnier', spawnOn: 'wave2', hp: 2, atk: 40, def: 5, undead: true },
    { id: 'squelette4', name: 'Squelette', kind: 'skeleton', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'charnier', spawnOn: 'wave2', hp: 2, atk: 40, def: 5, undead: true },
    { id: 'squelette5', name: 'Squelette', kind: 'skeleton', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'charnier', spawnOn: 'pit', hp: 2, atk: 40, def: 5, undead: true },
  ],

  items: {
    herbes: { name: 'Herbes de soin', icon: '❦', desc: 'Toucher : soigne 3 PV au héros actif (action libre).', usable: true },
    piece: { name: 'Pièce d\'argent ancienne', icon: '◉', desc: 'Frappée du sceau de l\'abbé. Le Passeur l\'apprécierait.' },
    herbe_lune: { name: 'Herbe-de-lune', icon: '☾', desc: 'Maud en a besoin pour l\'Huile de veille.' },
    huile: { name: 'Huile de veille', icon: '⚱', desc: 'Élément du Rite de silence.' },
    psautier: { name: 'Psautier noir', icon: '📜', desc: 'Élément du Rite de silence.' },
    eau: { name: 'Eau bénite', icon: '💧', desc: '+1 dégât contre les morts-vivants (passif).' },
    cle: { name: 'Clé du clocher', icon: '⚿', desc: 'Ouvre le portail de l\'abbaye.' },
  },

  quests: {
    aide: { title: 'Parler à Maud', hint: 'Elle vous attend à Grisval.', target: 'grisval' },
    tobie: { title: 'Retrouver Tobie', hint: 'Il cueillait de l\'Herbe-de-lune à la Clairière des Pendus (nord-ouest).', target: 'clairiere' },
    huile: { title: 'Faire préparer l\'Huile de veille', hint: 'Apportez l\'Herbe-de-lune à Maud, à Grisval.', target: 'grisval' },
    psautier: { title: 'Trouver le Psautier noir', hint: 'Dans la sacristie de la Chapelle Sainte-Brume (sud-est).', target: 'chapelle' },
    cle: { title: 'Obtenir la clé du clocher', hint: 'Le Passeur vit dans le Marais de Brume (sud).', target: 'marais' },
    cle2: { title: 'Ouvrir le portail du clocher', hint: 'Abbaye de Saint-Ombre, à l\'est.', target: 'abbaye' },
    rite: { title: 'Accomplir le Rite de silence', hint: 'Au clocher, avec le Psautier et l\'Huile : 3 réussites de Savoir.', target: 'clocher' },
  },

  intro: [
    { title: 'Chapitre I — Le Glas de Saint-Ombre', image: 'assets/bg/painting1.jpg',
      text: 'Depuis la Toussaint, la cloche de l\'abbaye de Saint-Ombre sonne seule. À chaque glas, la terre des cimetières frémit. Les anciens disent qu\'au douzième, les morts de toute la vallée se lèveront.' },
    { title: 'Votre compagnie', image: 'assets/bg/painting3.jpg',
      text: 'Vous arrivez à Grisval au crépuscule. Vous avez jusqu\'au douzième glas pour faire taire la cloche. Chaque héros, à son tour, peut se déplacer puis agir : interagir avec un lieu, parler à quelqu\'un ou combattre. Coordonnez-vous : vous n\'aurez pas le temps de tout faire ensemble.' },
  ],
  victoryText: { title: 'Le silence', image: 'assets/bg/painting4.jpg',
    text: 'Le dernier verset s\'achève. L\'huile s\'enflamme sur le bronze noir, et la Cloche d\'Avant se fend de part en part. Le Sonneur s\'effondre en poussière. Dans la vallée, les morts se recouchent. Pour la première fois depuis des semaines, Grisval entend le vent — et rien d\'autre.' },
  defeatText: { title: 'Le douzième glas', image: 'assets/bg/painting2.jpg',
    text: 'Le douzième coup roule sur la vallée comme un tonnerre. Partout, la terre s\'ouvre. Vous avez échoué… mais la Cloche d\'Avant attendra d\'autres héros.' },

  // ---------------------------------------------------------------- dialogues
  dialogues: {
    maud_intro: { start: 'a', nodes: {
      a: { s: 'maud', t: 'Enfin, des lames ! Entrez vite, la brume entre avec vous… Vous l\'entendez ? Encore un glas.', next: 'b' },
      b: { s: 'hero', t: 'Nous sommes venus faire taire cette cloche. Que savez-vous ?', next: 'c' },
      c: { s: 'maud', t: 'Les moines ont réveillé la Cloche d\'Avant, sous l\'abbaye. Seul le Rite de silence peut la briser. Il faut trois choses.', next: 'menu' },
      menu: { s: 'maud', t: 'Que voulez-vous savoir ?', choices: [
        { t: 'Le rite lui-même ?', once: true, next: 'rite' },
        { t: 'L\'Huile de veille ?', once: true, next: 'huile' },
        { t: 'Comment entrer au clocher ?', once: true, next: 'cle' },
        { t: 'Nous nous mettons en route.', next: 'fin' },
      ] },
      rite: { s: 'maud', t: 'Le Psautier noir le décrit. Frère Odon l\'avait caché dans la sacristie de la Chapelle Sainte-Brume, au sud-est. Mais des pillards y rôdent… des pillards morts.', next: 'menu', do: g => g.questStart('psautier') },
      huile: { s: 'maud', t: 'Je sais la préparer, mais il me faut de l\'Herbe-de-lune. Mon petit Tobie est parti en cueillir ce matin, à la Clairière des Pendus. Il n\'est pas revenu…', next: 'menu', do: g => { g.questStart('tobie'); g.questStart('huile'); } },
      cle: { s: 'maud', t: 'Le portail du clocher est verrouillé. Le Passeur du marais, au sud, a la clé. Il ne la donnera pas pour rien.', next: 'menu', do: g => g.questStart('cle') },
      fin: { s: 'maud', t: 'Séparez-vous s\'il le faut. Chaque glas compte. Que la Dame Grise vous garde.', next: null },
    } },
    maud_idle: { start: 'a', nodes: {
      a: { s: 'maud', t: g => g.has('huile') ? 'L\'huile est prête. Allez, avant qu\'il ne soit trop tard !' : 'Avez-vous trouvé de l\'Herbe-de-lune ?', choices: [
        { t: 'Voici l\'Herbe-de-lune.', cond: g => g.has('herbe_lune'), need: 'Herbe-de-lune', next: 'huile' },
        { t: 'Pas encore. Nous repartons.', next: null },
      ] },
      huile: { s: 'maud', t: g => (g.flag('tobieHome') ? 'Et vous m\'avez ramené Tobie… Merci. ' : '') + 'Donnez… Voilà : l\'Huile de veille. Et prenez ces herbes, vous en aurez besoin.', next: null,
        do: g => { g.take('herbe_lune'); g.give('huile'); g.give('herbes', 2); g.questDone('huile'); } },
    } },
    tobie: { start: 'a', nodes: {
      a: { s: 'tobie', t: 'Vous… vous les avez chassés ? Les renards avaient des yeux comme des braises !', next: 'b' },
      b: { s: 'hero', t: 'Ta grand-mère t\'attend. Tu as cueilli l\'Herbe-de-lune ?', next: 'c' },
      c: { s: 'tobie', t: 'Oui, tout un panier ! Tenez, apportez-la-lui. Moi je rentre en courant. Et… le Passeur, il m\'aime bien. Dites-lui que vous m\'avez sauvé !', next: null,
        do: async g => { g.give('herbe_lune'); g.set('tobieSaved'); g.questDone('tobie'); await g.sendHome('tobie'); } },
    } },
    passeur: { start: 'a', nodes: {
      a: { s: 'passeur', t: 'Hé hé… Des marcheurs. La brume ne mène nulle part, sauf chez moi.', next: 'b' },
      b: { s: 'hero', t: 'Il nous faut la clé du clocher de Saint-Ombre.', next: 'menu' },
      menu: { s: 'passeur', t: 'Les moines me l\'ont confiée… avant de changer. Qu\'avez-vous à m\'offrir ?', choices: [
        { t: 'Offrir la pièce d\'argent ancienne.', cond: g => g.has('piece'), need: 'Pièce d\'argent', next: 'piece' },
        { t: 'Tobie est sain et sauf grâce à nous.', cond: g => g.flag('tobieSaved'), need: 'Sauver Tobie', next: 'tobie' },
        { t: '(Force) Donne-la, ou je te la prends.', once: true, next: 'force' },
        { t: '(Discrétion) Détourner son attention et la voler.', once: true, next: 'vol' },
        { t: 'Nous reviendrons.', next: null },
      ] },
      piece: { s: 'passeur', t: 'Oh… une pièce de l\'abbé lui-même. Marché conclu.', next: null, do: g => { g.take('piece'); g.gotKey(); } },
      tobie: { s: 'passeur', t: 'Le gamin de Maud ? Il m\'apporte mon pain chaque semaine… Tiens. Et ne la perds pas.', next: null, do: g => g.gotKey() },
      force: { s: 'passeur', t: 'Hé hé… Voyons ce que valent tes bras.', do: async g => g.set('pForce', await g.test('force', 'Intimider')), next: g => (g.flag('pForce') ? 'forceOk' : 'forceKo') },
      forceOk: { s: 'passeur', t: 'D\'accord, d\'accord ! Range ça… La voilà, ta clé maudite.', next: null, do: g => g.gotKey() },
      forceKo: { s: 'passeur', t: 'Hé hé hé… Tu ne me fais pas peur.', next: 'menu' },
      vol: { s: 'hero', t: 'Regarde, là-bas, sur l\'eau !', do: async g => g.set('pVol', await g.test('discretion', 'Voler la clé')), next: g => (g.flag('pVol') ? 'volOk' : 'volKo') },
      volOk: { s: 'passeur', t: '… Hein ? Je ne vois rien. Bah. Partez, maintenant.', next: null, do: g => { g.toast('La clé a changé de poche sans un bruit.'); g.gotKey(); } },
      volKo: { s: 'passeur', t: 'Voleur ! La cloche t\'a entendu, hé hé…', next: 'menu', do: g => { g.glas(1); g.toast('Le Passeur fait sonner sa clochette : <b>+1 glas</b>.'); } },
    } },
    sonneur: { start: 'a', nodes: {
      a: { s: 'sonneur', t: 'Encore des fidèles… Approchez. Écoutez-la chanter.', next: 'b' },
      b: { s: 'hero', t: 'Frère Odon ? Est-ce… vous ?', next: 'c' },
      c: { s: 'sonneur', t: 'Odon a sonné la première heure. Je sonnerai la dernière. Au douzième glas, la vallée entière chantera avec nous !', next: null },
    } },
  },

  // ---------------------------------------------------------------- déclencheurs
  talk: {
    maud: g => (g.flag('metMaud') ? 'maud_idle' : 'maud_intro'),
    tobie: g => (g.flag('tobieSaved') ? null : g.enemiesAt('clairiere') ? null : 'tobie'),
    passeur: g => (g.flag('gotKey') ? null : 'passeur'),
  },
  afterTalk: {
    maud_intro: async g => { g.set('metMaud'); g.questDone('aide'); for (const q of ['tobie', 'huile', 'psautier', 'cle']) g.questStart(q); },
  },
  idleLine: {
    tobie: g => (g.flag('tobieSaved') ? 'Tobie : « Merci encore ! »' : 'Tobie est terrorisé : chassez d\'abord les renards.'),
    passeur: () => 'Le Passeur : « Je n\'ai plus rien pour toi, hé hé. »',
  },
  onReveal: {
    clairiere: async g => g.toast('Des renards aux yeux de braise encerclent un garçon !', 3000),
    marais: async g => g.toast('Une barque. Une lanterne verte. Quelqu\'un attend.', 2600),
    chapelle: async g => g.toast('Des pillards squelettes fouillent les ruines !', 2600),
    abbaye: async g => { g.night(); g.toast('Des gardes morts veillent sur le cloître.', 3000); },
    clocher: async g => { g.bell(); g.toast('Le Sonneur vous attend sous la cloche.', 2600); },
  },
  onEnter: {
    clocher: async (g, heroId) => { if (!g.flag('sonneurTalk')) { g.set('sonneurTalk'); await g.dialogue('sonneur', 'sonneur'); } },
  },
  /** seuils du glas (appelés en fin de manche) */
  glasEvents: {
    3: async g => { g.night(); g.toast('La nuit tombe sur la vallée.', 2600); },
    5: async g => { g.toast('Cinquième glas : <b>les morts du cimetière se lèvent !</b>', 3200); await g.spawnWave('wave1'); },
    8: async g => { g.toast('Huitième glas : <b>le charnier se vide !</b>', 3200); await g.spawnWave('wave2'); },
  },
  onDefeat: {
    renard1: async g => { if (!g.enemiesAt('clairiere')) g.toast('Les renards sont vaincus. Parlez à Tobie !'); },
    renard2: async g => { if (!g.enemiesAt('clairiere')) g.toast('Les renards sont vaincus. Parlez à Tobie !'); },
    sonneur: async g => { g.toast('Le Sonneur est détruit : la cloche ne sonne plus deux fois.', 3000); },
  },
  gotKey: g => { g.give('cle'); g.set('gotKey'); g.questDone('cle'); g.questStart('cle2'); },
};
