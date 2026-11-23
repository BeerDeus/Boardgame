# Grimoire — prototypes de moteur d'affichage de plateau

App compagnon narrative (inspiration *Destinies*, Lucky Duck Games) : **moteur d'affichage uniquement**, en paysage, univers médiéval / dark fantasy.
Site 100 % statique (aucun build) → déployable tel quel sur Hostinger.

## Lancer

- **Hostinger** : Git → déployer la branche à la racine du site (`index.html` = hub). Rien d'autre à configurer.
- **Local** : `python3 -m http.server 8000` puis http://localhost:8000 (les modules ES ne marchent pas en `file://`).

## Les 4 propositions

| | Moteur | Tuiles | Techno | Point fort |
|---|---|---|---|---|
| A | Table de jeu | carrées épaisses qui se retournent | Three.js + ombres | rendu « jeu physique » sur table, bougie, dés |
| B | Cartes d'exploration | grands rectangles imprimés (nom, cartouche) | Three.js | boucle Destinies, aimantation caméra sur la carte |
| C | Diorama hexagonal | hex en relief, brouillard qui se lève | Three.js + tilt-shift | le plus spectaculaire |
| D | Carte & standees | carte illustrée, standees carton face caméra | CSS 3D, zéro WebGL | le plus léger, démarre instantanément |

Même scénario de test partout (`js/core/scenario.js`) → comparaison équitable.

## Contrôles

- 1 doigt : pan avec inertie · 2 doigts : pinch zoom + rotation · double-tap : zoom · appui long : infos tuile
- Souris : gauche = pan, droit/Shift = orbite, molette = zoom
- **Le zoom pilote l'inclinaison** : de loin vue carte, de près vue figurine (un seul geste à apprendre).

## Menu de test (☰)

Caméra (recentrer, suivre), plateau (révéler tout, ajouter figurine, bouger un PNJ), narration (dialogue PNJ à choix, narration plein écran), ambiance (crépuscule/nuit, particules), perf (ombres, résolution, FPS), + options propres à chaque moteur (taille figurines, aimantation, tilt-shift, crans de 60°, standees debout…).

## Architecture

```
index.html / css/hub.css        hub de sélection
play.html?e=<id> / css/play.css runner commun
js/main.js                      charge moteur + UI + scénario
js/core/                        indépendant du rendu
  grid.js        grilles carrée / rect / hex, même API (neighbors, slots, bounds) + BFS
  gestures.js    gestes tactiles/souris unifiés
  scenario.js    logique démo (sélection, portée, exploration, dialogue, combat placeholder)
  dialogue.js    dialogues PNJ (frappe, choix, portrait) + narration plein écran
  ui.js          HUD, menu de test, toasts, portraits, FPS, aide
  art.js         illustrations SVG (portraits, standees, icônes de carte)
  tween.js       tweens / easing / damping
js/three/                       base 3D partagée par A, B, C
  stage.js       renderer, HDRI, jour/nuit, torches, particules, picking
  rig.js         caméra (pan collé au doigt, inertie, pinch, inclinaison auto, cadrage cinématique)
  board3d.js     tuiles, figurines, déplacements, surbrillances, POI, cinématique
  figures.js     figurines procédurales + GLB animés
  props.js       décors fusionnés (1 draw call / tuile)
js/engines/     tabletop.js · cards.js · hex.js · paper.js
```

### API moteur (identique pour les 4)

```js
engine.addTile({ key, terrain, revealed, name, label, poi })
engine.revealTile(key, { focus })            // Promise
engine.addFigure(fig, key, { spawn })        // fig = { id, kind, color, team, name }
engine.moveFigure(id, pathKeys, { follow })  // Promise
engine.removeFigure(id) · engine.bump(id, targetId)
engine.setSelected(id) · engine.highlight(reachKeys, exploreKeys)
engine.focusTile(key) · engine.focusFigure(id) · engine.resetCamera()
engine.cinematic({ ids, focus }) · engine.endCinematic()
engine.setTimeOfDay('dusk'|'night') · setParticles · setShadows · setResolution
engine.onTap = ({ type: 'tile'|'figure'|'poi'|'none', key, id }) => {}
```

Le jeu ne parle qu'à cette API → on peut changer de moteur sans toucher à la logique.

## Assets (placeholders)

- Textures terrain + HDRI : Poly Haven (CC0)
- Peintures (domaine public, Wikimedia) : Friedrich, John Martin, Böcklin, Doré
- `Fox.glb` (Khronos, CC0 / CC-BY 4.0) · `Horse.glb` (exemples three.js, MIT)
- three.js r187 vendorisé dans `vendor/` (pas de CDN)
- Figurines, décors, portraits : procéduraux (à remplacer par les vrais assets)
