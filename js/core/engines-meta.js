// Description des propositions (utilisée par le hub et la page de jeu).
export const ENGINES = [
  {
    id: 'hex', letter: 'C', title: 'Diorama hexagonal', subtitle: '★ Format retenu · hexagones en relief', chosen: true,
    bg: 'assets/bg/painting3.jpg', tech: 'Three.js · post-process tilt-shift',
    pitch: 'Le plateau de jeu : tuiles hexagonales en relief qui émergent au fil de l\'exploration, figurines 3D animées, consignes de mise en place pour la table physique.',
    pros: ['Le plus « wow » visuellement', '6 voisins = déplacements naturels', 'Relief = lecture du terrain immédiate'],
    cons: ['Post-process coûteux sur vieux mobiles (désactivable)', 'Hex un peu plus dur à lire pour les néophytes'],
  },
  {
    id: 'tabletop', letter: 'A', title: 'Table de jeu', subtitle: 'Tuiles carrées · 3D réaliste',
    bg: 'assets/bg/painting1.jpg', tech: 'Three.js · WebGL · ombres dynamiques',
    pitch: 'Le plateau posé sur une vraie table en bois, éclairé à la bougie. Tuiles épaisses en carton qui se retournent, figurines peintes sur socle.',
    pros: ['Très « jeu de société physique »', 'Lecture claire, grille carrée simple', 'Ambiance forte (bougie, dés, HDRI)'],
    cons: ['Le plus gourmand des 4 (ombres)', 'Grille carrée = moins organique'],
  },
  {
    id: 'cards', letter: 'B', title: 'Cartes d\'exploration', subtitle: 'Tuiles rectangulaires · style Destinies',
    bg: 'assets/bg/painting2.jpg', tech: 'Three.js · cartes imprimées générées',
    pitch: 'Grandes tuiles rectangulaires imprimées (nom, cartouche) révélées comme des cartes. Vue quasi zénithale, aimantation sur la carte la plus proche.',
    pros: ['Proche de la boucle Destinies (exploration de lieux)', 'Beaucoup de place pour les PNJ/POI par tuile', 'Lisible sur petit écran'],
    cons: ['Moins de liberté de caméra', 'Moins de cases → déplacements plus abstraits'],
  },
  {
    id: 'paper', letter: 'D', title: 'Carte illustrée', subtitle: 'DOM/CSS 3D · figurines pré-rendues',
    bg: 'assets/bg/painting4.jpg', tech: 'CSS 3D · impostors 3D 8 angles',
    pitch: 'Une carte illustrée façon livre-jeu. Les vraies figurines 3D sont pré-rendues sous 8 angles au chargement : rendu 3D, coût d\'une page web.',
    pros: ['Le plus léger / meilleure autonomie', 'Mêmes figurines 3D que A/B/C', 'Tourne sur les plus vieux téléphones'],
    cons: ['Pas d\'ombres ni de lumière dynamique', 'Angles de vue limités (8 directions)'],
  },
];
