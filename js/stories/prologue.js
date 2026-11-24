// ============================================================================
//  PROLOGUE — « Le Pont de Brume »  (tutoriel hors campagne, coop 1-4 héros)
//  Histoire volontairement simple qui fait passer par toutes les mécaniques :
//  déplacement multi-cases, brouillard, révélation par un PNJ, embuscade,
//  attaque, boosts, tests de compétence, question piège d'un PNJ (à retenir !),
//  zone verrouillée derrière un pont, mémoire de campagne.
// ============================================================================
export const STORY = {
  id: 'prologue',
  title: 'Prologue — Le Pont de Brume',
  // limite de glas = base (difficulté) + bonus selon le nombre de héros (cf. scenario.js)
  glasBase: { facile: 13, normal: 11, difficile: 9 },
  boost: { start: 2, max: 5, perRound: 1 },

  heroes: [
    { id: 'aldric', name: 'Aldric', kind: 'knight', color: '#3f74d8', role: 'Chevalier', hp: 10, armor: 20, move: 2, range: 1, dmg: 1,
      skills: { combat: 55, force: 50, savoir: 30, discretion: 25 }, combatName: 'Combat', talent: 'Cavalier : sur le destrier, déplacement 4.' },
    { id: 'ysolde', name: 'Ysolde', kind: 'mage', color: '#9b5de5', role: 'Mage', hp: 7, armor: 5, move: 2, range: 2, dmg: 1,
      skills: { combat: 55, force: 20, savoir: 60, discretion: 35 }, combatName: 'Magie', talent: 'Lueur (action) : soigne 2 PV aux héros de sa case. Attaque à 2 cases.' },
    { id: 'brann', name: 'Brann', kind: 'barbarian', color: '#d64545', role: 'Barbare', hp: 12, armor: 10, move: 2, range: 1, dmg: 2,
      skills: { combat: 50, force: 65, savoir: 20, discretion: 20 }, combatName: 'Combat', talent: 'Brute : 2 dégâts par coup.' },
    { id: 'selene', name: 'Sélène', kind: 'rogue', color: '#33a36b', role: 'Voleuse', hp: 8, armor: 10, move: 3, range: 1, dmg: 1,
      skills: { combat: 45, force: 30, savoir: 40, discretion: 65 }, combatName: 'Combat', talent: 'Agile : déplacement 3, insensible aux embuscades sur un jet de Discrétion.' },
  ],
  skillNames: { combat: 'Combat', force: 'Force', savoir: 'Savoir', discretion: 'Discrétion' },

  // Zone verrouillée : tout ce qui est au-delà du pont reste invisible tant que le gardien n'a pas laissé passer.
  zones: [{ id: 'est', beyond: 'pont', until: 'pontOuvert' }],

  places: [
    { id: 'hameau', name: 'Hameau de Vieille-Ronce', terrain: 'village', at: [0.12, 0.5], start: true, poi: { icon: 'place', label: 'Auberge' },
      desc: 'Trois maisons, une auberge, un puits. Au loin, vers l\'est, on devine la Tour du Guet, éteinte.',
      activities: [
        { id: 'rest', icon: 'camp', label: 'Dormir à l\'auberge', desc: 'Héros présents : PV max et +1 boost.', run: g => g.restHere() },
        { id: 'well', icon: 'boost', label: 'Faire un vœu au puits', once: true, desc: '+1 boost à chaque héros présent.', run: g => { g.boost(1, 'here'); g.toast('Une pièce tinte au fond du puits…'); } },
        { id: 'oil', icon: 'flask', label: 'Prendre l\'huile de lampe', once: true, cond: g => g.flag('askedOil'), need: 'En parler à Berthe', desc: 'Il en faudra pour le fanal.', run: g => g.give('huile') },
      ] },
    { id: 'forge', name: 'Forge de Mathilde', terrain: 'village', near: 'hameau', poi: { icon: 'attack', label: 'Forge' },
      desc: 'L\'enclume résonne encore. Mathilde, la forgeronne, n\'a pas peur de la brume.',
      activities: [
        { id: 'aiguiser', icon: 'attack', label: 'Faire aiguiser les armes', once: true, desc: '+1 boost à chaque héros présent.', run: g => { g.boost(1, 'here'); g.toast('Les lames chantent sous la meule.'); } },
        { id: 'renfort', icon: 'shield', label: 'Aider à la forge', once: true, desc: 'Force : réussite = +2 PV et +1 boost au héros actif.', run: async g => { if (await g.test('force', 'Tenir l\'enclume')) { g.heal(2); g.boost(1); g.rep('mathilde', 1); } else g.toast('Le marteau vous échappe. Mathilde soupire.'); } },
      ] },
    { id: 'moulin', name: 'Moulin abandonné', terrain: 'plains', near: 'hameau', poi: { icon: 'eye', label: 'Moulin' },
      desc: 'Les ailes ne tournent plus. Quelque chose gratte derrière les sacs de farine.',
      activities: [{ id: 'fouilleMoulin', icon: 'eye', label: 'Fouiller le moulin', once: true, desc: 'Discrétion : sans réveiller ce qui gratte…', run: async g => {
        if (await g.test('discretion', 'Fouiller sans bruit')) { g.give('poupee'); g.give('herbes'); }
        else { g.toast('Des rats géants surgissent des sacs !', 2600); await g.spawnWave('rats'); g.give('poupee'); }
      } }] },
    { id: 'verger', name: 'Verger de la Combe', terrain: 'forest', near: 'hameau',
      desc: 'Des pommiers tordus. Une fillette pleure, assise contre un tronc.' },
    { id: 'camp', name: 'Camp du chasseur', terrain: 'forest', at: [0.3, 0.18],
      desc: 'Un feu qui fume encore, des peaux qui sèchent. Un homme taille des flèches.' },
    { id: 'taniere', name: 'Tanière des loups', terrain: 'forest', at: [0.05, 0.02], hiddenUntil: 'gaspardTold',
      desc: 'Des os rongés et une odeur de fauve.',
      activities: [{ id: 'loot', icon: 'herb', label: 'Fouiller la tanière', once: true, blockedByEnemies: true, desc: 'Le chasseur parlait d\'herbes rares.', run: g => { g.give('herbes', 2); g.boost(1); } }] },
    { id: 'cache', name: 'Cache du contrebandier', terrain: 'rock', at: [0.42, 0.3],
      desc: 'Un éboulis où l\'on devine une trappe. Piégée, peut-être.',
      activities: [{ id: 'trap', icon: 'lock', label: 'Forcer la trappe', once: true, desc: 'Discrétion : réussite +2 boosts, échec −1 boost.', run: async g => {
        if (await g.test('discretion', 'Désamorcer le piège')) { g.boost(2); g.toast('Une bourse et un talisman : <b>+2 boosts</b>.'); }
        else { g.boost(-1); g.toast('Une aiguille empoisonnée ! <b>−1 boost</b>.'); }
      } }] },
    { id: 'gue', name: 'Gué des Noyés', terrain: 'swamp', at: [0.36, 0.66],
      desc: 'L\'eau est froide et noire. Quelque chose s\'y tient debout.' },
    { id: 'chapelle', name: 'Chapelle de la Brume', terrain: 'ruins', at: [0.28, 0.95], poi: { icon: 'cross', label: 'Autel' },
      desc: 'Une petite chapelle de pierre. L\'autel est intact.',
      activities: [{ id: 'pray', icon: 'cross', label: 'Prier à l\'autel', once: true, desc: 'Savoir : réussite −1 glas, échec −1 boost.', run: async g => {
        if (await g.test('savoir', 'Prière')) { g.glas(-1); g.toast('La cloche lointaine se tait un instant : <b>−1 glas</b>.'); }
        else { g.boost(-1); g.toast('Votre esprit s\'égare : <b>−1 boost</b>.'); }
        g.give('eau');
      } }] },
    { id: 'pont', name: 'Pont de Brume', terrain: 'plains', at: [0.55, 0.5],
      desc: 'Un pont de pierre moussue. Sur l\'autre rive, rien que du brouillard. Un gardien encapuchonné barre le passage.' },
    { id: 'ruines', name: 'Ruines du Péage', terrain: 'ruins', at: [0.84, 0.15],
      desc: 'Un ancien péage effondré.',
      activities: [{ id: 'coffre', icon: 'key', label: 'Ouvrir le coffre du péage', once: true, desc: 'Force : réussite +1 boost pour tous.', run: async g => { if (await g.test('force', 'Briser le cadenas')) { g.boost(1, 'all'); g.toast('Des fioles de courage : <b>+1 boost pour tous</b>.'); } } }] },
    { id: 'tour', name: 'Tour du Guet', terrain: 'ruins', at: [0.92, 0.55], poi: { icon: 'flag', label: 'Fanal' },
      desc: 'Le fanal est éteint. Tant qu\'il ne brûle pas, la brume avance.',
      activities: [{ id: 'fanal', icon: 'glow', label: 'Rallumer le fanal', blockedByEnemies: true, cond: g => g.has('huile'), need: 'Huile de lampe',
        desc: 'Savoir : réussite = victoire.', run: async g => {
          if (await g.test('savoir', 'Rallumer le fanal')) await g.victory();
          else g.toast('La mèche est humide… réessayez au prochain tour.');
        } }] },
  ],
  regions: [
    { terrain: 'forest', at: [0.18, 0.12], r: 0.3 }, { terrain: 'swamp', at: [0.35, 0.8], r: 0.2 },
    { terrain: 'plains', at: [0.25, 0.5], r: 0.25 }, { terrain: 'rock', at: [0.8, 0.85], r: 0.25 },
    { terrain: 'burned', at: [0.75, 0.4], r: 0.2 }, { terrain: 'snow', at: [0.95, 0.0], r: 0.15 },
  ],

  // minParty : figurine présente seulement à partir de N héros (ajustement façon Gloomhaven)
  cast: [
    { id: 'berthe', name: 'Berthe', kind: 'npc', color: '#c9a45c', base: '#d4a84a', team: 'npc', place: 'hameau', role: 'Aubergiste du hameau' },
    { id: 'destrier', name: 'Destrier', kind: 'horse', color: '#5a3d2a', base: '#8a6a44', team: 'mount', place: 'hameau', role: 'Cheval de guerre (Aldric)' },
    { id: 'mathilde', name: 'Mathilde', kind: 'smith', color: '#b87a4a', base: '#d4a84a', team: 'npc', place: 'forge', role: 'Forgeronne du hameau' },
    { id: 'lise', name: 'Lise', kind: 'child', color: '#c9a45c', base: '#d4a84a', team: 'npc', place: 'verger', idle: 'sit', role: 'Fillette du hameau' },
    { id: 'rat1', name: 'Rat géant', kind: 'wolf', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'moulin', spawnOn: 'rats', hp: 1, atk: 30, def: 0 },
    { id: 'rat2', name: 'Rat géant', kind: 'wolf', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'moulin', spawnOn: 'rats', hp: 1, atk: 30, def: 0, minParty: 2 },
    { id: 'gaspard', name: 'Gaspard', kind: 'hunter', color: '#7a8a4a', base: '#d4a84a', team: 'npc', place: 'camp', hidden: true, role: 'Chasseur' },
    { id: 'gardien', name: 'Le Gardien', kind: 'ferryman', color: '#5f7f8f', base: '#d4a84a', team: 'npc', place: 'pont', hidden: true, role: 'Gardien du Pont de Brume' },
    { id: 'loup1', name: 'Loup', kind: 'fox', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'taniere', hidden: true, hp: 2, atk: 40, def: 5 },
    { id: 'loup2', name: 'Loup', kind: 'fox', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'taniere', hidden: true, hp: 2, atk: 40, def: 5 },
    { id: 'loup3', name: 'Loup', kind: 'fox', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'taniere', hidden: true, hp: 2, atk: 40, def: 5, minParty: 3 },
    { id: 'noye', name: 'Noyé', kind: 'skeleton', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'gue', hidden: true, hp: 2, atk: 45, def: 5, undead: true },
    { id: 'garde1', name: 'Garde du guet', kind: 'skelwarrior', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'tour', hidden: true, hp: 3, atk: 50, def: 10, undead: true },
    { id: 'garde2', name: 'Garde du guet', kind: 'skelwarrior', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'tour', hidden: true, hp: 3, atk: 50, def: 10, undead: true, minParty: 2 },
    { id: 'sentinelle', name: 'La Sentinelle', kind: 'sonneur', color: '#b01e1e', base: '#3a0808', team: 'boss', place: 'tour', hidden: true, hp: 5, atk: 55, def: 15, undead: true, static: true },
    { id: 'rodeur', name: 'Rôdeur des brumes', kind: 'skelrogue', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'gue', spawnOn: 'wave1', hp: 2, atk: 45, def: 10, undead: true },
    { id: 'rodeur2', name: 'Rôdeur des brumes', kind: 'skelrogue', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'cache', spawnOn: 'wave1', hp: 2, atk: 45, def: 10, undead: true, minParty: 3 },
  ],

  items: {
    herbes: { name: 'Herbes de soin', icon: 'herb', desc: 'Toucher : soigne 3 PV au héros actif (gratuit). Conservées entre les étapes.', usable: true, keep: true },
    huile: { name: 'Huile de lampe', icon: 'flask', desc: 'Pour rallumer le fanal de la Tour du Guet.' },
    eau: { name: 'Eau bénite', icon: 'drop', desc: '+1 dégât contre les morts-vivants.' },
    poupee: { name: 'Poupée de chiffon', icon: 'person', desc: 'Lise l\'a perdue près du moulin.' },
  },

  // Rencontres mineures posées sur les cases de terrain (jeton d'intérêt) — toujours autour du départ
  minorChance: 0.3,
  minors: [
    { id: 'baies', name: 'Buisson de baies', icon: 'herb', terrains: ['forest', 'plains'], desc: 'Des baies sauvages, mûres et sucrées.',
      activities: [{ id: 'cueillir', icon: 'herb', label: 'Cueillir des baies', once: true, desc: '+2 PV au héros actif.', run: g => g.heal(2) }] },
    { id: 'charrette', name: 'Charrette renversée', icon: 'eye', terrains: ['plains', 'rock', 'burned', 'village'], desc: 'Une charrette de marchand, renversée dans le fossé.',
      activities: [{ id: 'fouillerCh', icon: 'eye', label: 'Fouiller la charrette', once: true, desc: 'Discrétion : trouver quelque chose d\'utile.', run: async g => { if (await g.test('discretion', 'Fouiller la charrette')) g.give('herbes'); else g.toast('Rien que des débris et des toiles moisies.'); } }] },
    { id: 'autel', name: 'Autel de pierre', icon: 'cross', terrains: ['forest', 'rock', 'snow', 'ruins', 'swamp'], desc: 'Un vieil autel couvert de mousse.',
      activities: [{ id: 'recueil', icon: 'cross', label: 'Se recueillir', once: true, desc: '+1 boost au héros actif.', run: g => g.boost(1) }] },
    { id: 'cairnv', name: 'Cairn du voyageur', icon: 'rune', terrains: ['rock', 'snow', 'plains', 'burned'], desc: 'Un empilement de pierres gravées.',
      activities: [{ id: 'lire', icon: 'rune', label: 'Lire les inscriptions', once: true, desc: 'Un indice… à noter.', run: g => g.narrate({ title: 'Inscription', image: 'assets/bg/painting3.jpg', text: '« Au-delà du pont, la Sentinelle veille. Elle ne craint ni l\'acier ni le feu, mais l\'eau bénie la fait chanceler. » Gravé d\'une main tremblante.' }) }] },
    { id: 'source', name: 'Source claire', icon: 'drop', terrains: ['forest', 'swamp', 'plains', 'snow'], desc: 'Une source glacée jaillit entre les racines.',
      activities: [{ id: 'boire', icon: 'drop', label: 'Boire à la source', once: true, desc: 'Héros présents : +1 PV.', run: g => g.heal(1, 'here') }] },
    { id: 'traces', name: 'Traces fraîches', icon: 'eye', terrains: ['forest', 'swamp', 'plains'], desc: 'Des empreintes s\'enfoncent dans la boue.',
      activities: [{ id: 'pister', icon: 'eye', label: 'Suivre les traces', once: true, desc: 'Savoir : révèle le lieu le plus proche.', run: async g => { if (await g.test('savoir', 'Pister')) await g.revealNearestPlace(); else g.toast('Les traces se perdent dans la boue.'); } }] },
  ],

  quests: {
    berthe: { title: 'Parler à Berthe', hint: 'L\'aubergiste du hameau sait ce qui se passe.', target: 'hameau' },
    fanal: { title: 'Rallumer le fanal de la Tour du Guet', hint: 'Il faut de l\'huile, et passer le Pont de Brume (à l\'est).', target: 'pont' },
    poupee: { title: 'Retrouver la poupée de Lise', hint: 'Elle l\'a perdue près du vieux moulin.', target: 'moulin' },
    loups: { title: 'Aider Gaspard le chasseur', hint: 'Il campe dans la forêt au nord.', target: 'camp' },
    taniere: { title: 'Chasser les loups de la tanière', hint: 'Gaspard vous l\'a montrée sur sa carte.', target: 'taniere' },
    tour: { title: 'Atteindre la Tour du Guet', hint: 'Le gardien vous a laissés passer.', target: 'tour' },
  },

  intro: [
    { title: 'Prologue — Le Pont de Brume', image: 'assets/bg/painting1.jpg',
      text: 'Tutoriel. Chaque nuit, la brume du fleuve avance un peu plus sur Vieille-Ronce. Le fanal de la Tour du Guet, qui la tenait à distance, s\'est éteint. La cloche du hameau sonne l\'alarme à chaque heure : au dernier glas, la brume aura tout englouti.' },
    { title: 'Comment jouer', image: 'assets/bg/painting3.jpg',
      text: 'À son tour, chaque héros peut : se déplacer (2 cases, 3 pour Sélène), faire UNE action (interagir avec un lieu, parler à un PNJ, talent) et UNE attaque. Avant un jet, dépensez des boosts (+10 % chacun). Vous en regagnez 1 par manche. Seules les cases voisines sont visibles : explorez. Et prenez des notes… les PNJ posent parfois des questions.' },
  ],
  victoryText: { title: 'Le fanal brûle', image: 'assets/bg/painting4.jpg', text: 'La flamme jaillit, et la brume recule jusqu\'au fleuve en sifflant. Le Gardien du pont lève sa lanterne en signe de salut. Le prologue est terminé — retenez ce que vous avez appris ici, la suite de la campagne s\'en souviendra.' },
  defeatText: { title: 'La brume', image: 'assets/bg/painting2.jpg', text: 'Le dernier glas résonne. La brume avale le hameau, puis vous. Recommencez : le chemin vous est maintenant familier.' },

  dialogues: {
    berthe: { start: 'a', nodes: {
      a: { s: 'berthe', t: 'Des voyageurs ! Par la Dame, vous tombez bien. Vous entendez la cloche ? Chaque coup, la brume avance.', next: 'b' },
      b: { s: 'hero', t: 'Que faut-il faire ?', next: 'c' },
      c: { s: 'berthe', t: 'Rallumer le fanal de la Tour du Guet, de l\'autre côté du Pont de Brume. Mais le Gardien ne laisse passer que ceux qui connaissent l\'histoire du pont.', next: 'menu' },
      menu: { s: 'berthe', t: 'Demandez-moi ce que vous voulez, mais vite.', choices: [
        { t: 'Racontez-nous l\'histoire du pont.', once: true, next: 'histoire' },
        { t: 'Il faut de l\'huile pour le fanal ?', once: true, next: 'huile' },
        { t: 'Quelqu\'un d\'autre peut nous aider ?', once: true, next: 'gaspard' },
        { t: 'Et vos voisins ?', once: true, next: 'voisins' },
        { t: 'Nous y allons.', next: 'fin' },
      ] },
      histoire: { s: 'berthe', t: 'Le pont a été bâti par Aldegonde la Rousse, la première bourgmestre, l\'hiver où le fleuve a gelé jusqu\'au fond. On dit que son fantôme garde encore le passage… Retenez bien son nom.', next: 'menu', do: g => g.set('heardStory') },
      huile: { s: 'berthe', t: 'Prenez celle de l\'auberge, dans la réserve. Servez-vous en passant.', next: 'menu', do: g => g.set('askedOil') },
      gaspard: { s: 'berthe', t: 'Gaspard, le chasseur, campe au nord dans la forêt. Il connaît chaque sentier… mais les loups lui mènent la vie dure.', next: 'menu', do: g => { g.questStart('loups'); g.revealPlace('camp'); } },
      voisins: { s: 'berthe', t: 'Mathilde, à la forge, vous aiguisera vos lames. Et la petite Lise pleure au verger depuis ce matin… Le moulin, n\'y allez pas sans raison : ça gratte, là-dedans.', next: 'menu' },
      fin: { s: 'berthe', t: 'Que la Dame Grise vous garde. Et dépêchez-vous !', next: null },
    } },
    mathilde: { start: 'a', nodes: {
      a: { s: 'mathilde', t: 'Encore des épées à aiguiser ? Passez à l\'enclume, je m\'en occupe.', next: 'menu' },
      menu: { s: 'mathilde', t: 'Autre chose ?', choices: [
        { t: 'Que savez-vous de la Tour du Guet ?', once: true, next: 'tour' },
        { t: 'Et du pont ?', once: true, next: 'pont' },
        { t: 'Merci, Mathilde.', next: null },
      ] },
      tour: { s: 'mathilde', t: 'Mon père y montait la garde. Il disait que la Sentinelle avait été un soldat, avant. Les morts n\'aiment pas l\'eau bénite — la chapelle au sud en garde toujours.', next: 'menu' },
      pont: { s: 'mathilde', t: 'Le gardien ? Il ne parle qu\'à ceux qui connaissent la Rousse. C\'est comme ça qu\'on l\'appelait, la bâtisseuse : cheveux de braise, comme le feu de ma forge.', next: 'menu' },
    } },
    lise: { start: 'a', nodes: {
      a: { s: 'lise', t: g => g.has('poupee') ? 'Ma poupée ! Vous l\'avez retrouvée !' : 'J\'ai perdu Brindille… ma poupée. Je jouais près du vieux moulin, et puis il y a eu des bruits…', next: g => g.has('poupee') ? 'merci' : 'b' },
      b: { s: 'hero', t: 'Nous allons la chercher. Reste près du hameau.', next: null, do: g => g.questStart('poupee') },
      merci: { s: 'lise', t: 'Tenez, c\'est mon porte-bonheur. Grand-mère dit qu\'il chasse la brume !', next: null, do: g => { g.take('poupee'); g.questDone('poupee'); g.boost(1, 'all'); g.rep('lise', 1); g.set('poupeeRendue'); g.remember('prologue.liseAidee'); } },
    } },
    gaspard: { start: 'a', nodes: {
      a: { s: 'gaspard', t: g => g.flag('loupsMorts') ? 'Les loups sont morts ? Vous êtes de sacrés lascars ! Tenez, c\'est pour vous.' : 'Hé ! Doucement. Vous venez du hameau ? Les loups ont pris ma tanière, au nord-ouest.', next: g => g.flag('loupsMorts') ? 'merci' : 'b' },
      b: { s: 'gaspard', t: 'Je vous la montre sur ma carte. Si vous les chassez, je vous montrerai un raccourci.', next: null, do: async g => { g.set('gaspardTold'); g.questStart('taniere'); await g.revealPlace('taniere'); } },
      merci: { s: 'gaspard', t: 'Et le raccourci : le vieux péage, de l\'autre côté du pont. Le coffre n\'a jamais été ouvert…', next: null, do: g => { g.questDone('loups'); g.boost(1, 'all'); g.set('gaspardAmi'); g.rep('gaspard', 1); } },
    } },
    gardien: { start: 'a', nodes: {
      a: { s: 'gardien', t: 'Halte. Nul ne traverse le Pont de Brume sans connaître celle qui l\'a bâti.', next: 'q' },
      q: { s: 'gardien', t: 'Dis-moi son nom, voyageur.', choices: [
        { t: 'Bertrade la Blanche.', next: 'faux' },
        { t: 'Aldegonde la Rousse.', next: 'vrai' },
        { t: 'Odon le Bâtisseur.', next: 'faux' },
        { t: '(Force) Nous passerons de gré ou de force.', once: true, next: 'force' },
        { t: 'Je reviendrai.', next: null },
      ] },
      vrai: { s: 'gardien', t: 'Aldegonde… Oui. Cela faisait longtemps. Passe, et rallume ce fanal.', next: null, do: g => g.openBridge(true) },
      faux: { s: 'gardien', t: 'Faux. La brume se souviendra de ton mensonge.', next: null, do: g => { g.boost(-1); g.glas(1); g.toast('Mauvaise réponse : <b>−1 boost, +1 glas</b>. Revenez avec le bon nom.', 3200); } },
      force: { s: 'gardien', t: 'Essaie donc…', do: async g => g.set('forceOk', await g.test('force', 'Forcer le passage', -10)), next: g => g.flag('forceOk') ? 'forceOk' : 'faux' },
      forceOk: { s: 'gardien', t: 'Brute. Passe, mais la Tour ne t\'accueillera pas en ami.', next: null, do: g => g.openBridge(false) },
    } },
    sentinelle: { start: 'a', nodes: {
      a: { s: 'sentinelle', t: 'Le fanal dort. Que la brume règne. Qui ose ?', next: 'b' },
      b: { s: 'hero', t: 'Ceux qui vont le rallumer.', next: null },
    } },
  },

  talk: { berthe: g => 'berthe', mathilde: g => 'mathilde', lise: g => (g.flag('poupeeRendue') ? null : 'lise'), gaspard: g => 'gaspard', gardien: g => (g.flag('pontOuvert') ? null : 'gardien') },
  afterTalk: { berthe: async g => { g.questDone('berthe'); g.questStart('fanal'); } },
  idleLine: { gardien: () => 'Le Gardien s\'écarte en silence.', lise: () => 'Lise serre sa poupée et vous fait un grand sourire.' },
  onReveal: {
    pont: async g => g.toast('Une silhouette encapuchonnée garde le pont.', 2600),
    taniere: async g => g.toast('Des grognements montent de la tanière.', 2600),
    gue: async g => g.toast('Un noyé se dresse dans l\'eau noire ! Contournez… ou passez en force.', 3400),
    tour: async g => { g.night(); g.toast('La Sentinelle et ses gardes veillent sur le fanal.', 3000); },
  },
  onEnter: { tour: async g => { if (!g.flag('sentTalk')) { g.set('sentTalk'); await g.dialogue('sentinelle', 'sentinelle'); } } },
  glasEvents: {
    3: async g => { g.night(); g.toast('La nuit tombe. La brume s\'épaissit.', 2600); },
    5: async g => { g.toast('Cinquième glas : <b>des rôdeurs sortent de la brume !</b>', 3200); await g.spawnWave('wave1'); },
  },
  onDefeat: {
    loup1: async g => g.checkWolves(), loup2: async g => g.checkWolves(), loup3: async g => g.checkWolves(),
    sentinelle: async g => g.toast('La Sentinelle s\'effondre : le fanal est à vous.', 2800),
  },
  helpers: {
    openBridge: async (g, friend) => { g.set('pontOuvert'); g.set('gardienAmi', friend); g.remember('prologue.gardienAmi', friend); g.rep('gardien', friend ? 1 : -1); g.questDone('fanal'); g.questStart('tour'); await g.unlockZone('est'); },
    checkWolves: g => { if (!g.enemiesAt('taniere')) { g.set('loupsMorts'); g.questDone('taniere'); g.toast('Tanière libérée ! Retournez voir Gaspard.', 2600); } },
  },
  // ce que la campagne retient pour les étapes suivantes
  remember: g => ({ 'prologue.fini': true, 'prologue.gaspardAmi': g.flag('gaspardAmi'), 'prologue.nomFondatrice': 'Aldegonde la Rousse' }),
};
