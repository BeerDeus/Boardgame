// ============================================================================
//  MODÈLE DE NIVEAU — copier ce fichier, le renommer (ex. etape1.js), l'ajouter
//  dans js/core/campaign.js, puis vérifier : node tools/validate-story.mjs js/stories/etape1.js
//  Format complet : docs/SCENARIO.md
// ============================================================================
export const STORY = {
  id: 'etape1',
  title: 'Étape I — Titre',
  glasBase: { facile: 13, normal: 11, difficile: 9 },
  boost: { start: 2, max: 5, perRound: 1 },
  heroes: [/* reprendre ceux du prologue (js/stories/prologue.js) */],
  skillNames: { combat: 'Combat', force: 'Force', savoir: 'Savoir', discretion: 'Discrétion' },

  hexMap: [            // 'o' = tuile ; espace = vide. Lignes impaires décalées d'une demi-case.
    ' ooooo ',
    'ooooooo',
    ' ooooo ',
  ],
  places: [
    { id: 'depart', name: 'Le Carrefour', terrain: 'plains', cell: [3, 1], start: true,
      teaser: 'Un carrefour de chemins.', desc: 'Une borne usée indique trois directions.',
      activities: [{ id: 'borne', icon: 'rune', label: 'Lire la borne', once: true, desc: 'Un indice.', run: g => g.toast('« Au nord, la mine. »') }] },
    { id: 'mine', name: 'Mine abandonnée', terrain: 'rock', cell: [3, 0], teaser: 'Une galerie noire.', desc: 'Des rails rouillés s\'enfoncent dans la montagne.' },
  ],
  regions: [{ terrain: 'forest', at: [0.2, 0.2], r: 0.3 }],
  cast: [
    { id: 'vieux', name: 'Le Vieux', kind: 'npc', color: '#c9a45c', base: '#d4a84a', team: 'npc', place: 'depart', role: 'Ermite' },
    { id: 'gob1', name: 'Squelette', kind: 'skeleton', color: '#8a1c1c', base: '#6a1616', team: 'enemy', place: 'mine', hp: 2, atk: 40, def: 5 },
  ],
  items: { lanterne: { name: 'Lanterne', icon: 'glow', desc: 'Éclaire la mine.' } },
  quests: { mine: { title: 'Explorer la mine', hint: 'Au nord du carrefour.', target: 'mine' } },
  intro: [{ title: 'Étape I', image: 'assets/bg/painting1.jpg', text: 'Texte d\'introduction.' }],
  victoryText: { title: 'Victoire', image: 'assets/bg/painting4.jpg', text: '…' },
  defeatText: { title: 'Défaite', image: 'assets/bg/painting2.jpg', text: '…' },
  dialogues: {
    vieux: { start: 'a', nodes: {
      a: { s: 'vieux', t: 'Tu cherches la mine ?', choices: [
        { t: 'Oui.', next: 'b' },
        { t: 'Non, merci.', next: null },
      ] },
      b: { s: 'vieux', t: 'Prends ma lanterne.', next: null, do: g => { g.give('lanterne'); g.questStart('mine'); } },
    } },
  },
  talk: { vieux: g => (g.has('lanterne') ? null : 'vieux') },
  idleLine: { vieux: () => 'Le Vieux fume sa pipe.' },
  glasEvents: {},
  remember: g => ({ 'etape1.fini': true }),
};
