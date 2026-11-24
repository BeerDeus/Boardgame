// Combat des monstres façon Gloomhaven : un paquet de cartes d'action PAR TYPE de monstre.
// À chaque phase des Ténèbres, une carte est tirée par type ; les types agissent dans l'ordre
// d'INITIATIVE (plus petit = plus tôt). Tous les monstres du type appliquent la même carte.
//
// Champs d'une carte :
//   init    initiative (10 = très rapide, 90 = très lent)
//   move    cases de déplacement vers le héros le plus proche (0 = ne bouge pas)
//   atk     { dmg: dégâts (1-2), bonus: ±% de chance, range: 0 = même case, 1 = case voisine, 2 = à 2 cases, aoe: tous les héros de la case }
//           absent = n'attaque pas.  Une carte forte mais sans mouvement peut donc ne servir à rien !
//   shield  réduit les dégâts reçus jusqu'à sa prochaine carte · heal PV regagnés · glas glas en plus
//   poison  la cible perd 1 PV au début de ses tours, jusqu'à être soignée · stun la cible perd son attaque au prochain tour
//   double  attaque deux fois · reshuffle on remélange le paquet après cette carte
// Équilibrage : 1 dégât en général, 2 sur les cartes lentes/conditionnelles — jamais de mort en un coup (héros 7-12 PV).
export const DECKS = {
  default: [
    { name: 'Avance', init: 50, move: 1, atk: { dmg: 1 } },
    { name: 'Charge', init: 30, move: 2, atk: { dmg: 1, bonus: 10 } },
    { name: 'Coup lourd', init: 70, move: 0, atk: { dmg: 2 } },
    { name: 'Hésitation', init: 85, move: 0, reshuffle: true },
    { name: 'Pas de côté', init: 40, move: 1 },
  ],
  fox: [ // loups
    { name: 'Meute', init: 15, move: 3, atk: { dmg: 1 } },
    { name: 'Morsure', init: 32, move: 2, atk: { dmg: 1, bonus: 10 } },
    { name: 'Encerclement', init: 25, move: 2, atk: { dmg: 1, poison: true } },
    { name: 'Rôde', init: 45, move: 1 },
    { name: 'Curée', init: 70, move: 0, atk: { dmg: 2 } },
    { name: 'Repli', init: 85, move: 0, heal: 1, reshuffle: true },
  ],
  wolf: [ // rats géants
    { name: 'Grouillement', init: 20, move: 2, atk: { dmg: 1 } },
    { name: 'Morsure infectée', init: 35, move: 1, atk: { dmg: 1, poison: true } },
    { name: 'Festin', init: 55, move: 0, atk: { dmg: 2 } },
    { name: 'Fuite', init: 80, move: 0, reshuffle: true },
  ],
  skeleton: [
    { name: 'Marche funèbre', init: 50, move: 1, atk: { dmg: 1 } },
    { name: 'Assaut', init: 30, move: 2, atk: { dmg: 1, bonus: 10 } },
    { name: 'Os brisés', init: 65, move: 1, atk: { dmg: 1, bonus: -10 } },
    { name: 'Coup de taille', init: 40, move: 0, atk: { dmg: 2 } },
    { name: 'Se relève', init: 75, move: 0, heal: 1 },
    { name: 'Torpeur', init: 90, move: 0, reshuffle: true },
  ],
  skelrogue: [
    { name: 'Ombre', init: 10, move: 3, atk: { dmg: 1 } },
    { name: 'Saignée', init: 35, move: 2, atk: { dmg: 1, poison: true } },
    { name: 'Lame double', init: 28, move: 1, atk: { dmg: 1 }, double: true },
    { name: 'Embusqué', init: 55, move: 0, shield: 1, atk: { dmg: 2 } },
    { name: 'Course', init: 20, move: 3, reshuffle: true },
  ],
  skelwarrior: [
    { name: 'Mur de boucliers', init: 70, move: 0, shield: 2 },
    { name: 'Hache lourde', init: 50, move: 1, atk: { dmg: 2, bonus: -10 } },
    { name: 'Avance lente', init: 60, move: 1, atk: { dmg: 1 } },
    { name: 'Tourbillon', init: 40, move: 0, atk: { dmg: 1, aoe: true } },
    { name: 'Coup sonnant', init: 55, move: 1, atk: { dmg: 1, stun: true }, reshuffle: true },
  ],
  sonneur: [ // boss immobile
    { name: 'Trait d\'ombre', init: 30, move: 0, atk: { dmg: 1, bonus: 15, range: 2 } },
    { name: 'Malédiction', init: 35, move: 0, atk: { dmg: 1, range: 2, stun: true } },
    { name: 'Double sort', init: 45, move: 0, atk: { dmg: 1, range: 2 }, double: true, reshuffle: true },
    { name: 'Drain', init: 60, move: 0, heal: 2, atk: { dmg: 1 } },
    { name: 'Glas funèbre', init: 80, move: 0, glas: 1 },
    { name: 'Méditation', init: 90, move: 0, shield: 2 },
  ],
};

/** Lignes d'effets lisibles pour l'affichage de la carte */
export function cardLines(c) {
  const L = [];
  if (c.move) L.push(['move', `Déplacement ${c.move}`]);
  if (c.atk) {
    const a = c.atk, r = a.range ?? 0;
    L.push(['attack', `Attaque ${a.dmg} dégât${a.dmg > 1 ? 's' : ''}${a.bonus ? ` (${a.bonus > 0 ? '+' : ''}${a.bonus} %)` : ''}${a.aoe ? ' — tous les héros de la case' : r === 0 ? ' — même case' : ` — portée ${r}`}`]);
    if (a.poison) L.push(['drop', 'Empoisonne la cible']);
    if (a.stun) L.push(['lock', 'Étourdit la cible (perd son attaque)']);
  }
  if (c.double) L.push(['attack', 'Attaque deux fois']);
  if (c.shield) L.push(['shield', `Bouclier ${c.shield}`]);
  if (c.heal) L.push(['heart', `Soin ${c.heal}`]);
  if (c.glas) L.push(['bell', `+${c.glas} glas`]);
  if (!L.length) L.push(['close', 'Ne fait rien']);
  return L;
}
export function describeCard(c) { return cardLines(c).map(l => l[1]).join(' · '); }

/** Pioche (état sérialisable dans la sauvegarde) */
export function draw(state, kind) {
  const deck = DECKS[kind] || DECKS.default;
  state[kind] ||= { pile: [] };
  const s = state[kind];
  if (!s.pile.length) s.pile = deck.map((_, i) => i).sort(() => Math.random() - 0.5);
  const card = deck[s.pile.pop()];
  if (card.reshuffle) s.pile = [];
  return card;
}
