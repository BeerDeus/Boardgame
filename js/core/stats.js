// Statistiques des personnages et tests de dés (D100 ≤ stat ± difficulté).
// Combat reste une compétence à part (attaques) ; les 4 stats servent aux tests (lieux, dialogues…).
export const STATS = {
  force:        { name: 'Force',        short: 'FOR', desc: 'Soulever, enfoncer, retenir, intimider par la carrure.' },
  agilite:      { name: 'Agilité',      short: 'AGI', desc: 'Esquiver, crocheter, se faufiler, passer inaperçu.' },
  intelligence: { name: 'Intelligence', short: 'INT', desc: 'Savoir, énigmes, pister, déchiffrer, soigner.' },
  volonte:      { name: 'Volonté',      short: 'VOL', desc: 'Résister à la peur, prier, persuader, tenir bon.' },
};
export const SKILL_NAMES = { combat: 'Combat', ...Object.fromEntries(Object.entries(STATS).map(([k, v]) => [k, v.name])) };
/** Difficulté d'un test : modificateur ajouté à la stat (en %) */
export const DIFFICULTIES = {
  facile:    { label: 'Facile', mod: 20 },
  normal:    { label: 'Normal', mod: 0 },
  difficile: { label: 'Difficile', mod: -20 },
  heroique:  { label: 'Héroïque', mod: -40 },
};
/** Anciennes compétences → nouvelles stats (sauvegardes et niveaux écrits avant la v2) */
export const LEGACY = { savoir: 'intelligence', discretion: 'agilite' };
export const statKey = k => LEGACY[k] || k;
/** Chance finale d'un test, bornée à 5..95 % */
export const testChance = (base, diff = 'normal', mod = 0) => Math.max(5, Math.min(95, base + (DIFFICULTIES[diff]?.mod ?? 0) + mod));
