# Grimoire — moteur d'affichage de plateau (prototypes)

App compagnon narrative (inspiration *Destinies*) : **4 moteurs d'affichage**, **1 scénario complet identique** sur chacun.
Site 100 % statique, **PWA installable et jouable hors-ligne**, prêt pour Capacitor.

## Lancer / déployer

- **Hostinger** : déploiement Git de cette branche à la racine (`index.html` = hub).
- **Local** : `python3 -m http.server 8000` → http://localhost:8000
- **Avant chaque déploiement** : `python3 tools/build-sw.py` (met à jour le cache hors-ligne + version).
- **Capacitor (plus tard)** : `webDir` = racine du dépôt, rien à builder.

## Le scénario — Chapitre I « La Cloche de Saint-Ombre »

Depuis trois nuits, la cloche d'une abbaye sonne toute seule à chaque heure. Aldric (chevalier) et Ysolde (mage) arrivent à Grisval.

1. Parler à **Maud** l'herboriste → 2 quêtes : retrouver son petit-fils **Tobie** / obtenir la **clé** de l'abbaye.
2. **Clairière des Pendus** : embuscade de renards cendreux → sauver Tobie (il rentre seul au village) → Maud offre des **herbes de soin**.
3. **Marais** : le **Passeur** détient la clé — 3 façons de l'obtenir (pièce d'argent trouvée dans une souche, avoir sauvé Tobie, ou intimidation au dé).
4. **Abbaye** : la nuit tombe, goules du cloître → portail → **crypte** → **Frère Anselme** (boss). L'**eau bénite** (chapelle) ouvre une option de dialogue qui l'affaiblit.
5. Fin narrative + écran de statistiques.

Lieux annexes : chapelle (eau bénite), charnier (piège), cairn runique (lore), auberge (repos 2 h).

### Mécaniques
- Horloge (18h00 → nuit à 21h, chaque case = 10 min ; la cloche sonne à chaque heure)
- Déplacement 3 (5 à cheval : Aldric peut **monter le destrier**), exploration par révélation de tuiles
- **Dés physiques D100** : le joueur lance 2 d10 (dizaines 00-90 + unités 0-9) et saisit le résultat à l'écran (boutons ou clavier) ; **00 + 0 = 100** → résultat de 1 à 100. Option « dés virtuels » dans le menu.
  - Réussite si résultat ≤ chance (compétence du héros − défense de l'ennemi, bornée 5-95 %), critique ≤ chance/5 (dégâts ×2), maladresse ≥ 96
  - Les jets des ennemis sont aussi lancés par les joueurs (attaque ennemie − armure du héros)
- Riposte ennemie, IA qui se rapproche, KO → retour au village
- Ysolde : **Lueur** (révèle les tuiles voisines, recharge), portée d'attaque 2
- Inventaire (objets utilisables), journal d'objectifs, **marqueurs de quête** sur la carte
- Dialogues à choix **conditionnels** (🔒 requiert…), **uniques**, effets, jets de dés en dialogue
- **Sauvegarde automatique** (par moteur), reprise au rechargement
- **Carte procédurale** : les lieux sont ancrés en coordonnées normalisées et projetés sur n'importe quelle grille (carrée, rect, hex) ; le reste est généré. Menu → « Carte procédurale » = même histoire, carte différente.

## Les 4 moteurs

| | Moteur | Tuiles | Figurines |
|---|---|---|---|
| A | Table de jeu | carrées 8×5, se retournent | 3D temps réel, ombres |
| B | Cartes d'exploration | rectangles imprimés 6×4 | 3D temps réel |
| C | Diorama hexagonal | hex en relief, brouillard | 3D temps réel + tilt-shift |
| D | Carte & standees | DOM / CSS 3D | **3D pré-rendues** (impostors 8 angles) ou standees |

## Graphismes & optimisation

Menu ☰ → *Graphismes* : **Auto** (détection GPU/RAM/cœurs) ou Bas / Moyen / Élevé / Ultra, puis réglage fin.

- **Rendu à la demande** : aucune image calculée quand rien ne bouge ; l'ambiance (particules, flammes) tourne à FPS réduit au repos (réglable, ou figée)
- **Limite FPS** 30 / 60 / ∞ · **résolution dynamique** (baisse auto si le GPU décroche)
- **Ombres recalculées seulement quand quelque chose bouge** (pas lors des mouvements caméra) ; qualité off → 4096
- Figurines **fusionnées** (2 draw calls / figurine), décors fusionnés (1 draw call / tuile)
- GPU en pause pendant les narrations plein écran et quand l'onglet est masqué
- Moteur D : WebGL utilisé une fois pour pré-rendre les figurines, puis libéré
- Finition figurines : **peintes / grises (non peintes) / bronze** — utile pour coller aux figurines physiques

## Contrôles

- Tactile : 1 doigt pan + inertie · 2 doigts zoom/rotation · double-tap zoom · appui long infos
- Souris : gauche pan · droit orbite · molette zoom
- Clavier : ZQSD/WASD/flèches · E/R rotation · +/- zoom · 1-2 héros · Espace centrer · J journal · M menu · Entrée/1-4 dialogues · F plein écran

## Architecture

```
js/core/      indépendant du rendu
  story.js     LE scénario (données + petits scripts) ← à éditer pour écrire du contenu
  scenario.js  moteur de jeu (quêtes, horloge, combat, IA, inventaire, sauvegarde)
  mapgen.js    projection des lieux sur la grille + génération procédurale
  grid.js      grilles carrée / rect / hex, même API + BFS
  dialogue.js  dialogues conditionnels + narration plein écran
  ui.js        HUD (journal, inventaire, actions, dés 3D CSS, PV, clavier…)
  settings.js  presets graphiques + détection auto
  sfx.js       sons synthétisés (cloche, dés, coups, vent) — aucun fichier audio
js/three/     base 3D (stage, caméra, plateau, figurines, décors, impostors)
js/engines/   tabletop · cards · hex · paper
sw.js · manifest.webmanifest · tools/build-sw.py   PWA
```

API moteur commune : `addTile, revealTile, addFigure, moveFigure, removeFigure, bump, setSelected, highlight, mark, setPoi, focusTile, focusFigure, resetCamera, cinematic, endCinematic, screenPos, nudge, setTimeOfDay, setFinish, applySettings` + `onTap / onLongPress`.

Menu **Debug** : révéler la carte, téléporter le groupe, donner les objets.

## Assets (placeholders)
Poly Haven (CC0) · peintures domaine public (Wikimedia) · Fox.glb (Khronos, CC0/CC-BY 4.0) · Horse.glb (three.js, MIT) · polices Cinzel & EB Garamond (OFL) · three.js r187 (MIT).
