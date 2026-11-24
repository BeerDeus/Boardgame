// Description des propositions (utilisée par le hub et la page de jeu).
export const ENGINES = [
  {
    id: 'hex', letter: 'C', title: 'Diorama hexagonal', subtitle: '★ Format retenu · hexagones en relief', chosen: true,
    bg: 'assets/bg/painting3.jpg', tech: 'Three.js · post-process tilt-shift',
    pitch: 'Le plateau de jeu : tuiles hexagonales en relief qui émergent au fil de l\'exploration, figurines 3D animées, consignes de mise en place pour la table physique.',
    pros: ['Le plus « wow » visuellement', '6 voisins = déplacements naturels', 'Relief = lecture du terrain immédiate'],
    cons: ['Post-process coûteux sur vieux mobiles (désactivable)', 'Hex un peu plus dur à lire pour les néophytes'],
  },
];
