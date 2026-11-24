// Héros de la campagne (communs à toutes les étapes). Stats en % : test réussi si D100 ≤ stat ± difficulté.
export const HEROES = [
  { id: 'aldric', name: 'Aldric', kind: 'knight', color: '#3f74d8', role: 'Chevalier', hp: 10, armor: 20, move: 2, range: 1, dmg: 1,
    skills: { combat: 55, force: 50, agilite: 30, intelligence: 30, volonte: 50 }, combatName: 'Combat', talent: 'Cavalier : sur le destrier, déplacement 4.' },
  { id: 'ysolde', name: 'Ysolde', kind: 'mage', color: '#9b5de5', role: 'Mage', hp: 7, armor: 5, move: 2, range: 2, dmg: 1,
    skills: { combat: 55, force: 20, agilite: 35, intelligence: 60, volonte: 45 }, combatName: 'Magie', talent: 'Lueur (action) : soigne 2 PV aux héros de sa case. Attaque à 2 cases.' },
  { id: 'brann', name: 'Brann', kind: 'barbarian', color: '#d64545', role: 'Barbare', hp: 12, armor: 10, move: 2, range: 1, dmg: 2,
    skills: { combat: 50, force: 65, agilite: 30, intelligence: 20, volonte: 35 }, combatName: 'Combat', talent: 'Brute : 2 dégâts par coup.' },
  { id: 'selene', name: 'Sélène', kind: 'rogue', color: '#33a36b', role: 'Voleuse', hp: 8, armor: 10, move: 3, range: 1, dmg: 1,
    skills: { combat: 45, force: 30, agilite: 65, intelligence: 40, volonte: 30 }, combatName: 'Combat', talent: 'Agile : déplacement 3, esquive les embuscades sur un jet d\'Agilité.' },
];
