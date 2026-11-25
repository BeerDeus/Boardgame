import { statKey } from './stats.js';
import { fromData } from './level.js';
// Campagne : un prologue (tutoriel) + 5 étapes. La mémoire de campagne (choix, PNJ aidés, infos)
// est conservée entre les étapes et lisible par les scénarios suivants (g.memory('clé')).
const KEY = 'grimoire.campaign.v1';

/** Définition de la campagne : levels/campaign.json (Actes → étapes), modifiable dans l'éditeur. */
export const CAMPAIGN_URL = 'levels/campaign.json';
let defP = null;
export function loadCampaignDef(url = CAMPAIGN_URL) {
  if (!defP) defP = fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('campaign.json introuvable'); return r.json(); }).then(normalizeCampaign);
  return defP;
}
/** Complète la définition : étapes à plat, fonction de chargement de chaque niveau */
export function normalizeCampaign(d) {
  const def = { title: d.title || 'Campagne', subtitle: d.subtitle || '', acts: (d.acts || []).map(a => ({ ...a, steps: (a.steps || []).map(s => ({ ...s, act: a.id })) })) };
  def.steps = def.acts.flatMap(a => a.steps);
  for (const s of def.steps) { s.soon = s.soon || !s.level || (!!s.status && s.status !== 'live'); /* seules les étapes « Live » sont jouables */ if (s.level) { s.url = s.level; s.load = () => loadLevel(s.level); } }
  return def;
}
/**
 * État de chaque acte et étape pour une progression donnée :
 * étape débloquée si ses prérequis (« requires », sinon l'étape précédente de l'acte) sont finis ;
 * acte débloqué si ses prérequis (sinon toutes les étapes jouables de l'acte précédent) sont finis.
 */
export function campaignStatus(def, completed = []) {
  const done = new Set(completed), steps = {}, acts = {};
  def.acts.forEach((a, ai) => {
    const prevAct = def.acts[ai - 1];
    const actReq = a.requires || (prevAct ? prevAct.steps.filter(s => !s.soon).map(s => s.id) : []);
    const actOpen = !a.soon && a.steps.some(s => !s.soon) && actReq.every(id => done.has(id)) && !(prevAct && !prevAct.steps.some(s => !s.soon) && !a.requires);
    a.steps.forEach((s, si) => {
      const req = s.requires || (si > 0 ? [a.steps[si - 1].id] : []);
      steps[s.id] = { done: done.has(s.id), unlocked: actOpen && !s.soon && req.every(id => done.has(id)), soon: !!s.soon };
    });
    const playable = a.steps.filter(s => !s.soon);
    acts[a.id] = { unlocked: actOpen, done: playable.length > 0 && playable.every(s => done.has(s.id)), count: playable.filter(s => done.has(s.id)).length, total: playable.length };
  });
  return { steps, acts };
}
/** Fichiers de niveaux de la campagne (planche des cartes…) */
export async function campaignLevels() { return (await loadCampaignDef()).steps.filter(s => s.url).map(s => s.url); }
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
/** Fin d'étape : mémoire, XP (victoire seulement, une fois par héros et par étape), objets conservés */
export function completeStep(id, { win, memory = {}, xp = {}, stash = {} }) {
  const c = loadCampaign();
  const gains = {};
  for (const [hid, n] of Object.entries(xp)) {
    const p = heroProgress(c, hid), before = levelOf(p.xp), already = p.won.includes(id);
    const got = win && !already ? n : 0;
    if (win && !already) p.won.push(id);
    p.xp += got; gains[hid] = { xp: got, total: p.xp, level: levelOf(p.xp), up: levelOf(p.xp) - before, why: !win ? 'defeat' : already ? 'already' : null };
  }
  if (win) {
    if (!c.completed.includes(id)) c.completed.push(id);
    for (const [k, v] of Object.entries(memory)) c.memory[k] = typeof v === 'number' && k.startsWith('rep.') ? (c.memory[k] || 0) + v : v;
    c.stash ||= {}; for (const [k, n] of Object.entries(stash)) c.stash[k] = (c.stash[k] || 0) + n;
  }
  saveCampaign(c); return gains;
}
/** Efface toute la progression de campagne (étapes, XP, niveaux, avantages, mémoire, réputation,
 *  objets conservés) et les parties en cours. */
export function resetCampaign() {
  try { for (const k of Object.keys(localStorage)) if (k === KEY || k.startsWith('grimoire.save.')) localStorage.removeItem(k); } catch {}
}

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
/** Avantages proposés à un héros : ceux de sa fiche (levels/heroes.json), sinon ceux de sa classe */
export const perksOf = hero => (hero.perks?.length ? hero.perks : PERKS[hero.kind] || []);
export function heroProgress(c, id) { c.heroes ||= {}; const p = (c.heroes[id] ||= { xp: 0, spent: 0, perks: [], skills: {} }); p.won ||= []; return p; }
/** Le héros a déjà gagné cette étape : la rejouer ne rapporte plus d'XP */
export const heroWon = (c, hid, stepId) => !!c.heroes?.[hid]?.won?.includes(stepId);
export const pointsAvailable = p => levelOf(p.xp) - 1 - p.spent;

/** Applique la progression de campagne à une fiche de héros (copie) */
export function applyProgress(hero, p) {
  const h = { ...hero, skills: { ...hero.skills }, boostStart: hero.talentBoostStart || 0, boostMax: hero.talentBoostMax || 0, level: p ? levelOf(p.xp) : 1 };
  if (!p) return h;
  for (const [k0, v] of Object.entries(p.skills || {})) { const k = statKey(k0); h.skills[k] = (h.skills[k] || 0) + v; }
  if (p.dmg) h.dmg = (h.dmg || 1) + p.dmg;
  for (const pid of p.perks || []) {
    const perk = perksOf(hero).find(x => x.id === pid); if (!perk) continue;
    for (const [k, v] of Object.entries(perk.fx)) if (k === 'skills') for (const [s, n] of Object.entries(v)) h.skills[s] = (h.skills[s] || 0) + n; else h[k] = (h[k] || 0) + v;
  }
  return h;
}
