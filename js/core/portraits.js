// Registre des portraits rendus depuis les modèles 3D (remplacent les SVG dès qu'ils sont prêts).
export const portraits = {};
export const setPortrait = (kind, url) => { portraits[kind] = url; };
