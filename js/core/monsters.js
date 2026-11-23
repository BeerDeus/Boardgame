// Paquets d'actions des monstres (façon Gloomhaven) : une carte tirée par TYPE de monstre à chaque
// phase des Ténèbres, appliquée à tous les monstres de ce type, en plus de la règle de base
// (avancer de 1 vers le héros le plus proche, attaquer au contact).
//   move : cases en plus · atk : bonus de chance d'attaque · skip : ne fait rien · double : attaque 2 fois
//   heal : PV regagnés · glas : glas en plus (boss) · reshuffle : on remélange après cette carte
export const DECKS = {
  default: [
    { name: 'Avance', move: 0 }, { name: 'Avance', move: 0 }, { name: 'Charge', move: 1, atk: 10 },
    { name: 'Hésitation', skip: true }, { name: 'Furie', atk: 15, reshuffle: true }, { name: 'Pas de côté', move: 1 },
  ],
  fox: [
    { name: 'Meute', move: 1 }, { name: 'Morsure', atk: 10 }, { name: 'Encerclement', move: 2, atk: 5 },
    { name: 'Rôde', move: 1 }, { name: 'Repli', skip: true, reshuffle: true }, { name: 'Curée', atk: 20 },
  ],
  skeleton: [
    { name: 'Marche funèbre', move: 0 }, { name: 'Os brisés', atk: -10 }, { name: 'Assaut', move: 1, atk: 10 },
    { name: 'Se relève', heal: 1 }, { name: 'Torpeur', skip: true, reshuffle: true }, { name: 'Marche funèbre', move: 0 },
  ],
  skelrogue: [
    { name: 'Ombre', move: 2 }, { name: 'Lame double', double: true }, { name: 'Embusqué', skip: true },
    { name: 'Saignée', atk: 15 }, { name: 'Course', move: 1, reshuffle: true },
  ],
  skelwarrior: [
    { name: 'Mur de boucliers', skip: true }, { name: 'Hache lourde', atk: 15 }, { name: 'Avance lente', move: 0 },
    { name: 'Tourbillon', double: true, reshuffle: true }, { name: 'Avance lente', move: 0 },
  ],
  sonneur: [
    { name: 'Glas funèbre', glas: 1 }, { name: 'Trait d\'ombre', atk: 15 }, { name: 'Drain', heal: 2 },
    { name: 'Double sort', double: true, reshuffle: true }, { name: 'Méditation', skip: true },
  ],
};
export function describeCard(c) {
  const p = [];
  if (c.skip) p.push('ne bouge pas, n\'attaque pas');
  if (c.move) p.push(`${c.move > 0 ? '+' : ''}${c.move} déplacement`);
  if (c.atk) p.push(`${c.atk > 0 ? '+' : ''}${c.atk} % attaque`);
  if (c.double) p.push('attaque 2 fois');
  if (c.heal) p.push(`+${c.heal} PV`);
  if (c.glas) p.push(`+${c.glas} glas`);
  if (!p.length) p.push('avance et attaque');
  return p.join(' · ');
}
/** Pioche (état sérialisable dans la sauvegarde) */
export function draw(state, kind) {
  const deck = DECKS[kind] || DECKS.default;
  state[kind] ||= { pile: [], discard: [] };
  const s = state[kind];
  if (!s.pile.length) { s.pile = deck.map((_, i) => i).sort(() => Math.random() - 0.5); s.discard = []; }
  const i = s.pile.pop(); s.discard.push(i);
  const card = deck[i];
  if (card.reshuffle) { s.pile = []; }
  return card;
}
