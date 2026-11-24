import { statKey } from './stats.js';
import { fromData } from './level.js';
// Campagne : un prologue (tutoriel) + 5 étapes. La mémoire de campagne (choix, PNJ aidés, infos)
// est conservée entre les étapes et lisible par les scénarios suivants (g.memory('clé')).
const KEY = 'grimoire.campaign.v1';

export const CAMPAIGN = {
  title: 'Les Chroniques de Brumeval',
  steps: [
    { id: 'prologue', num: 'Prologue', title: 'Le Pont de Brume', tag: 'Tutoriel', load: () => loadLevel('levels/prologue.json') },
    { id: 'e1', num: 'Étape I', title: 'À venir', soon: true },
    { id: 'e2', num: 'Étape II', title: 'À venir', soon: true },
    { id: 'e3', num: 'Étape III', title: 'À venir', soon: true },
    { id: 'e4', num: 'Étape IV', title: 'À venir', soon: true },
    { id: 'e5', num: 'Étape V', title: 'À venir', soon: true },
  ],
};

/** Charge un niveau JSON (format de l'éditeur) → { STORY } */
const levelCache = new Map();
export function loadLevel(url) {
  if (!levelCache.has(url)) levelCache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(`Niveau introuvable : ${url}`); return r.json(); }).then(d => ({ STORY: fromData(d) })));
  return levelCache.get(url);
}
/** Niveau en cours d'édition (éditeur → bouton « Tester ») */
export const DRAFT_KEY = 'grimoire.editor.draft';
export function draftStep() {
  let d = null; try { d = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch {}
  if (!d) return null;
  return { id: 'draft', num: 'Test', title: d.title || 'Niveau en test', tag: 'Éditeur', draft: true, load: async () => ({ STORY: fromData(d) }) };
}

export function loadCampaign() {
  try { return { completed: [], memory: {}, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { completed: [], memory: {} }; }
}
export function saveCampaign(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {} }
/** Fin d'étape : mémoire, XP (victoire complète, défaite = moitié), objets conservés */
export function completeStep(id, { win, memory = {}, xp = {}, stash = {} }) {
  const c = loadCampaign();
  const gains = {};
  for (const [hid, n] of Object.entries(xp)) {
    const p = heroProgress(c, hid), before = levelOf(p.xp), got = win ? n : Math.floor(n / 2);
    p.xp += got; gains[hid] = { xp: got, total: p.xp, level: levelOf(p.xp), up: levelOf(p.xp) - before };
  }
  if (win) {
    if (!c.completed.includes(id)) c.completed.push(id);
    for (const [k, v] of Object.entries(memory)) c.memory[k] = typeof v === 'number' && k.startsWith('rep.') ? (c.memory[k] || 0) + v : v;
    c.stash ||= {}; for (const [k, n] of Object.entries(stash)) c.stash[k] = (c.stash[k] || 0) + n;
  }
  saveCampaign(c); return gains;
}
export function resetCampaign() { try { localStorage.removeItem(KEY); } catch {} }

// ---------------------------------------------------------------- progression des héros
export const LEVELS = [0, 50, 120, 210, 320, 450]; // XP cumulée pour atteindre niv. 1..6
export const levelOf = xp => LEVELS.filter(x => xp >= x).length;

/** Avantages (perks) par classe — effets appliqués au début de chaque étape */
export const PERKS = {
  knight: [
    { id: 'rempart', name: 'Rempart', desc: '+10 armure', fx: { armor: 10 } },
    { id: 'endurci', name: 'Endurci', desc: '+2 PV max', fx: { hp: 2 } },
    { id: 'cavalier', name: 'Cavalier émérite', desc: '+1 déplacement', fx: { move: 1 } },
    { id: 'meneur', name: 'Meneur', desc: '+1 boost au départ', fx: { boostStart: 1 } },
    { id: 'foi', name: 'Foi inébranlable', desc: '+10 Volonté', fx: { skills: { volonte: 10 } } },
  ],
  mage: [
    { id: 'concentration', name: 'Concentration', desc: '+1 boost max et au départ', fx: { boostMax: 1, boostStart: 1 } },
    { id: 'portee', name: 'Longue portée', desc: '+1 portée d\'attaque', fx: { range: 1 } },
    { id: 'erudition', name: 'Érudition', desc: '+10 Intelligence', fx: { skills: { intelligence: 10 } } },
    { id: 'bouclier', name: 'Bouclier arcanique', desc: '+10 armure', fx: { armor: 10 } },
  ],
  barbarian: [
    { id: 'peau', name: 'Peau épaisse', desc: '+3 PV max', fx: { hp: 3 } },
    { id: 'briseos', name: 'Brise-os', desc: '+10 Combat', fx: { skills: { combat: 10 } } },
    { id: 'endurant', name: 'Infatigable', desc: '+1 déplacement', fx: { move: 1 } },
    { id: 'colosse', name: 'Colosse', desc: '+10 Force', fx: { skills: { force: 10 } } },
  ],
  rogue: [
    { id: 'pasleger', name: 'Pas léger', desc: '+10 Agilité', fx: { skills: { agilite: 10 } } },
    { id: 'assassin', name: 'Assassin', desc: '+1 dégât', fx: { dmg: 1 } },
    { id: 'fouineuse', name: 'Fouineuse', desc: '+1 boost au départ', fx: { boostStart: 1 } },
    { id: 'esquive', name: 'Esquive', desc: '+10 armure', fx: { armor: 10 } },
  ],
};
export function heroProgress(c, id) { c.heroes ||= {}; return (c.heroes[id] ||= { xp: 0, spent: 0, perks: [], skills: {} }); }
export const pointsAvailable = p => levelOf(p.xp) - 1 - p.spent;

/** Applique la progression de campagne à une fiche de héros (copie) */
export function applyProgress(hero, p) {
  const h = { ...hero, skills: { ...hero.skills }, boostStart: 0, boostMax: 0, level: p ? levelOf(p.xp) : 1 };
  if (!p) return h;
  for (const [k0, v] of Object.entries(p.skills || {})) { const k = statKey(k0); h.skills[k] = (h.skills[k] || 0) + v; }
  for (const pid of p.perks || []) {
    const perk = (PERKS[hero.kind] || []).find(x => x.id === pid); if (!perk) continue;
    for (const [k, v] of Object.entries(perk.fx)) if (k === 'skills') for (const [s, n] of Object.entries(v)) h.skills[s] = (h.skills[s] || 0) + n; else h[k] = (h[k] || 0) + v;
  }
  return h;
}
