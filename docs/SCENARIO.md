# Écrire un niveau (étape de campagne)

Un niveau = **un fichier** `js/stories/<id>.js` qui exporte `STORY`. Le moteur de règles (`js/core/scenario.js`) et l'affichage (4 moteurs) sont génériques.

1. Copier `js/stories/_modele.js` → `js/stories/etape1.js`
2. L'ajouter dans `js/core/campaign.js` : `{ id: 'etape1', num: 'Étape I', title: '…', load: () => import('../stories/etape1.js') }`
3. Vérifier : `node tools/validate-story.mjs js/stories/etape1.js` (références croisées, cases, dialogues, objets…)
4. Mettre à jour le cache hors-ligne : `python3 tools/build-sw.py`

## Carte (`hexMap`)
Lignes de texte, une par rangée d'hexagones (« odd-r » : rangées impaires décalées d'une demi-case vers la droite). `o` = tuile, espace = rien (rivière, vide…). Forme libre. Les lieux visent une case avec `cell: [colonne, ligne]`. Les codes physiques des tuiles (F-03…) sont générés automatiquement (lettre du terrain + numéro).
Les autres moteurs (carré, rect, papier) utilisent `at: [u, v]` (coordonnées 0..1) comme repli.

## Lieux (`places`)
| Champ | Rôle |
|---|---|
| `id`, `name`, `terrain` | terrain : village, forest, plains, rock, swamp, ruins, burned, snow, crypt |
| `cell` / `at` / `near` | case précise / position normalisée / à côté d'un autre lieu |
| `start: true` | case de départ |
| `teaser` | aperçu visible quand la tuile apparaît (son contenu reste caché) |
| `desc` | description affichée en entrant |
| `poi: { icon, label }` | jeton d'intérêt |
| `hiddenUntil: 'flag'` | invisible tant que le flag n'est pas posé (ex. révélé par un PNJ) |
| `activities` | `{ id, icon, label, desc, once, cond, need, blockedByEnemies, run: async g => … }` |

`zones: [{ id, beyond: 'pont', until: 'flag' }]` : toutes les cases au-delà d'un lieu restent invisibles jusqu'à `g.unlockZone(id)`.

`minors` + `minorChance` : petites rencontres aléatoires posées sur les cases de terrain.

## Figurines (`cast`)
`{ id, name, kind, color, base, team: 'npc'|'enemy'|'boss'|'mount', place, role }` ; monstres : `hp, atk, def` (+ `undead`, `static`, `minParty`, `spawnOn: 'vague'`).
Elles apparaissent quand un héros entre dans la case (ou `g.revealPlace`). Modèles disponibles : voir `GLB` dans `js/three/figures.js`. Comportement des monstres : paquets de cartes par `kind` dans `js/core/monsters.js`.

## Dialogues
```js
monDialogue: { start: 'a', nodes: {
  a: { s: 'pnj', t: 'Texte (ou g => texte)', next: 'b' },
  b: { s: 'hero', t: '…', choices: [
    { t: 'Choix', next: 'c', cond: g => g.has('cle'), need: 'Clé', once: true, do: g => … },
  ] },
} }
```
`talk: { pnj: g => 'idDialogue' | null }`, `afterTalk`, `idleLine`.
Questions « piège » : des `choices` dont une seule est juste (les joueurs doivent avoir noté l'info).

## API `g` (dans `run`, `do`, déclencheurs)
`flag/set`, `has/give/take`, `questStart/questDone`, `test(compétence, label, mod)` (jet D100 avec boosts), `boost(n, 'active'|'here'|'all')`, `heal(n, …)`, `glas(n)`, `revealPlace(id)`, `unlockZone(id)`, `spawn(id)`, `spawnWave(tag)`, `dialogue(id, pnj)`, `narrate({title,text,image})`, `toast`, `night()`, `enemiesAt(lieu)`, `alive(id)`, `inc(compteur)`, `victory()`,
campagne : `remember(clé, val)`, `memory(clé)`, `rep(pnj, ±n)`, `repOf(pnj)`.

## Déclencheurs
`onReveal[lieu]` (1re entrée dans la case), `onEnter[lieu]` (chaque arrivée), `glasEvents[n]`, `onDefeat[idMonstre]`, `helpers` (fonctions réutilisables `g.monHelper()`), `remember(g)` (mémoire de fin d'étape).
