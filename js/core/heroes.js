// Héros de la campagne (communs à toutes les étapes) : levels/heroes.json, modifiable dans l'éditeur.
// Stats en % : test réussi si D100 ≤ stat ± difficulté. Les talents sont des briques prêtes à l'emploi, réglables.

/** Modèles 3D KayKit jouables par un héros */
export const HERO_MODELS = { knight: 'Chevalier (Knight)', mage: 'Mage', barbarian: 'Barbare', rogue: 'Voleur (Rogue)', hooded: 'Voleur encapuchonné' };

/**
 * Talents prêts à l'emploi : params = [[clé, type, défaut, libellé]] ; describe(t) = texte affiché.
 * Le moteur lit la fiche calculée par heroSheet() : h.mount, h.healAura, h.dodge, h.regen, h.dmg, h.range, h.boostStart…
 */
export const TALENTS = {
  mount:    { label: 'Monture', params: [['cast', 'text', 'destrier', 'Figurine de la monture (identifiant dans le niveau)'], ['bonus', 'number', 2, 'Déplacement en selle +']],
              describe: t => `en selle, déplacement +${t.bonus}` },
  healAura: { label: 'Soin de zone (action)', params: [['heal', 'number', 2, 'PV soignés'], ['self', 'bool', true, 'Se soigne aussi']],
              describe: t => `action : soigne ${t.heal} PV aux héros de sa case` },
  dodge:    { label: 'Esquive d\'embuscade', params: [['stat', 'stat', 'agilite', 'Stat testée'], ['diff', 'diff', 'normal', 'Difficulté']],
              describe: t => `esquive les embuscades sur un jet` },
  dmg:      { label: 'Dégâts accrus', params: [['n', 'number', 1, 'Dégâts +']], describe: t => `+${t.n} dégât${t.n > 1 ? 's' : ''} par coup` },
  range:    { label: 'Portée', params: [['n', 'number', 1, 'Portée d\'attaque +']], describe: t => `attaque à ${1 + (+t.n || 0)} cases` },
  boost:    { label: 'Inspiration (boosts)', params: [['start', 'number', 1, 'Boosts au départ +'], ['max', 'number', 1, 'Boosts max +']], describe: t => `+${t.start} boost au départ, +${t.max} max` },
  regen:    { label: 'Récupération', params: [['n', 'number', 1, 'PV regagnés au début de son tour']], describe: t => `regagne ${t.n} PV au début de son tour` },
};

/** Fiche de jeu d'un héros : statistiques de base + effets de ses talents */
export function heroSheet(raw) {
  const h = { ...raw, skills: { ...raw.skills }, talents: (raw.talents || []).map(t => ({ ...t })) };
  h.dmg = +h.dmg || 1; h.range = +h.range || 1; h.move = +h.move || 2;
  const parts = [];
  for (const t of h.talents) {
    const def = TALENTS[t.type]; if (!def) continue;
    for (const [k, , d] of def.params) if (t[k] === undefined) t[k] = d;
    if (t.type === 'mount') h.mount = { cast: t.cast, bonus: +t.bonus || 0, name: t.name };
    if (t.type === 'healAura') h.healAura = { heal: +t.heal || 1, self: t.self !== false, name: t.name || 'Soin' };
    if (t.type === 'dodge') h.dodge = { stat: t.stat, diff: t.diff };
    if (t.type === 'regen') h.regen = (h.regen || 0) + (+t.n || 0);
    if (t.type === 'dmg') h.dmg += +t.n || 0;
    if (t.type === 'range') h.range += +t.n || 0;
    if (t.type === 'boost') { h.talentBoostStart = (h.talentBoostStart || 0) + (+t.start || 0); h.talentBoostMax = (h.talentBoostMax || 0) + (+t.max || 0); }
    parts.push(`${t.name ? t.name + ' : ' : ''}${def.describe(t)}`);
  }
  h.talent = raw.talentText || (parts.length ? parts.join(' · ') + '.' : '');
  return h;
}

export const HEROES_URL = new URL('../../levels/heroes.json', import.meta.url);
/** Héros en cours d'édition (éditeur) : utilisés seulement en mode test (« Tester ▸ ») */
export const HEROES_DRAFT_KEY = 'grimoire.editor.heroes';

async function loadRaw() {
  if (typeof window === 'undefined') { // Node (outils de vérification)
    const { readFileSync } = await import('node:fs');
    return JSON.parse(readFileSync(HEROES_URL, 'utf8'));
  }
  if (/[?&]level=draft\b/.test(location.search) || /editor\.html$/.test(location.pathname)) { try { const d = JSON.parse(localStorage.getItem(HEROES_DRAFT_KEY)); if (d?.heroes?.length) return d; } catch {} }
  const r = await fetch(HEROES_URL, { cache: 'no-cache' });
  if (!r.ok) throw new Error('levels/heroes.json introuvable');
  return r.json();
}
/** Fiches brutes (telles que dans le JSON) et fiches de jeu */
export const HEROES_DATA = await loadRaw();
export const HEROES = HEROES_DATA.heroes.map(heroSheet);
