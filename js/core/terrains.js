// Types de terrain partagés par tous les moteurs (textures CC0 Poly Haven).
export const TERRAINS = {
  village: { tex: 'mossy_cobblestone', label: 'Village', tint: '#b8a98c', names: ['Hameau de Grisval', 'Bourg-Cendré', 'Village de Corbeval'] },
  forest:  { tex: 'leaves_forest_ground', label: 'Forêt', tint: '#5c6b3d', names: ['Bois des Pendus', 'Sylve Noire', 'Futaie des Murmures', 'Forêt de Morteaux'] },
  plains:  { tex: 'grass_path_2', label: 'Lande', tint: '#7d8a4e', names: ['Lande Grise', 'Chemin du Pèlerin', 'Prés Fanés', 'Plaine des Vents'] },
  rock:    { tex: 'dark_rock', label: 'Rochers', tint: '#5d5a57', names: ['Éboulis du Corbeau', 'Crocs de Pierre', 'Col Brisé'] },
  swamp:   { tex: 'brown_mud_leaves_01', label: 'Marais', tint: '#4f4a33', names: ['Marais de Brume', 'Tourbière aux Noyés', 'Fange Sombre'] },
  ruins:   { tex: 'monastery_stone_floor', label: 'Ruines', tint: '#8b8478', names: ['Abbaye Effondrée', 'Ruines de Saint-Ombre'] },
  burned:  { tex: 'burned_ground_01', label: 'Terres brûlées', tint: '#3b302a', names: ['Champs Calcinés', 'Cendres du Roi'] },
  snow:    { tex: 'snow_02', label: 'Neiges', tint: '#d9dde2', names: ['Pic Gelé', 'Col des Âmes'] },
};
export const texUrl = name => `assets/textures/${name}.jpg`;
