// Description des propositions (utilisée par le hub et la page de jeu).
export const ENGINES = [
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
    id: 'hex', letter: 'C', title: 'Diorama hexagonal', subtitle: 'Hexagones en relief · tilt-shift',
    bg: 'assets/bg/painting3.jpg', tech: 'Three.js · post-process tilt-shift',
    pitch: 'Une île de tuiles hexagonales à hauteurs variables flottant sur l\'eau. Le brouillard se lève quand une tuile émerge. Effet maquette (tilt-shift).',
    pros: ['Le plus « wow » visuellement', '6 voisins = déplacements naturels', 'Relief = lecture du terrain immédiate'],
    cons: ['Post-process coûteux sur vieux mobiles (désactivable)', 'Hex un peu plus dur à lire pour les néophytes'],
  },
  {
    id: 'paper', letter: 'D', title: 'Carte & standees', subtitle: 'Pop-up papier · DOM/CSS 3D',
    bg: 'assets/bg/painting4.jpg', tech: 'CSS 3D transforms · zéro WebGL',
    pitch: 'Une carte illustrée façon livre-jeu, des personnages en standees de carton qui restent face à la caméra. Ultra léger, fonctionne partout.',
    pros: ['Le plus léger / meilleure autonomie', 'Pipeline d\'art 2D simple (illustrations)', 'Démarrage instantané'],
    cons: ['Pas de vraie 3D (pas d\'ombres réelles)', 'Moins spectaculaire'],
  },
];
