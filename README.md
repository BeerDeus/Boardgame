# Grimoire — moteur d'affichage de plateau (prototypes)

App compagnon narrative (inspiration *Destinies*) : **4 moteurs d'affichage**, **1 scénario complet identique** sur chacun.
Site 100 % statique, **PWA installable et jouable hors-ligne**, prêt pour Capacitor.

## Lancer / déployer

- **Hostinger** : déploiement Git de cette branche à la racine (`index.html` = hub).
- **Local** : `python3 -m http.server 8000` → http://localhost:8000
- **Version** affichée dans le hub et le menu ; bouton **« Forcer la mise à jour »** (vide le cache et recharge) si un appareil reste bloqué sur une ancienne version.
- **Mises à jour automatiques** : le code (HTML/JS/CSS) est toujours récupéré en réseau d'abord ; une nouvelle version est détectée à l'ouverture (et toutes les 15 min), activée et la page se recharge seule (« ✓ Nouvelle version installée »). Pas besoin de réinstaller la PWA ni de vider le cache. Hors-ligne, la dernière version en cache est utilisée.
- Recommandé avant un déploiement (facultatif) : `python3 tools/build-sw.py` — met à jour la liste des fichiers disponibles hors-ligne et purge les anciens caches.
- **Capacitor (plus tard)** : `webDir` = racine du dépôt, rien à builder.

## Principe : une application « MJ » pour un jeu de plateau physique

Les joueurs ont les **vraies tuiles** (une grande illustration découpée), les **vraies figurines** et les **vrais dés**.
L'app arbitre et raconte : elle dit quoi poser, gère PNJ, monstres, règles et campagne. Le plateau à l'écran reflète la table.

- **Consignes de mise en place** (façon Destinies), regroupées : « Placez les tuiles F-03, P-06 » (emplacement surligné à l'écran, jeton d'intérêt sur les lieux) → OK → « Placez les figurines : Gaspard, Loup n°1, Loup n°2 » → OK. Désactivables (menu → Table physique).
- **Tuiles numérotées** : lettre du terrain + numéro (V village, F forêt, P plaine, R rochers, M marais, U ruines, C calciné, N neige, X crypte).
- **Monstres numérotés** (Loup 1, Loup 2…) : l'app suit les PV de chacun.
- **Dés physiques D100** saisis à l'écran (dizaines + unités, 00+0 = 100). Option « virtuels ».

## Règles (v4)

- **Manche** : chaque héros joue, puis les **Ténèbres** (en fin de manche, ou à une position tirée au sort avec l'option *ordre aléatoire* façon Aeon's End).
- **Tour d'un héros = 1 déplacement + 1 action + 1 attaque**, dans l'ordre voulu.
  - Déplacement : 2 cases (Sélène 3, Aldric à cheval 4), sur les cases visibles. Chaque pas révèle les cases voisines.
  - **Embuscade** : traverser une case occupée par un monstre (sans s'y arrêter) = il frappe au passage (+10 %), puis on continue. Sélène peut esquiver (Discrétion).
  - Action : interagir avec le lieu (toutes ses activités), parler à un PNJ (confirmation), talent.
  - Attaque : séparée de l'action (combat provisoire = 1 jet D100, à remplacer par votre système).
- **Brouillard total** : seules les tuiles voisines des cases explorées apparaissent, et on n'en voit que **l'illustration et une courte description**. Leur **contenu** (lieu, jeton, PNJ, monstres) n'apparaît qu'en **entrant** dans la case (ou si un PNJ vous y envoie). Une **zone entière** peut rester invisible tant qu'un PNJ ne l'a pas débloquée (le pont).
- **Chaque déplacement demande confirmation**, avec la description de la destination (et l'alerte d'embuscade si le chemin traverse un ennemi connu).
- **Boosts ✦** : par héros, 5 max, +10 % chacun, **dépensés avant le jet**. +1 par manche ; gagnés/perdus par certaines actions (puits, pièges, prière, mauvaise réponse…).
- **Monstres (façon Gloomhaven)** : un **paquet de cartes par type** (`js/core/monsters.js`). À chaque phase des Ténèbres, une carte par type est tirée et affichée ; les types agissent par **initiative**. Une carte = déplacement + attaque (dégâts 1-2, bonus, portée 0/1/2, zone) + parfois bouclier, soin, glas, **poison** (−1 PV par tour jusqu'à un soin) ou **étourdissement** (perd l'attaque suivante). Certaines cartes ne servent à rien selon la situation (« Coup de taille » : ne bouge pas, frappe fort → rien si le héros n'est pas sur la case). Équilibrage : jamais de mort en un coup.
- **Difficulté** : limite de glas = base (facile 13 / normal 11 / difficile 9) + bonus selon le nombre de héros (solo +3, duo +2, trio +1). PV des monstres +1 à 3-4 héros, −1 en solo ; certains monstres n'apparaissent qu'à partir de 2 ou 3 héros (façon Gloomhaven). Les compétences de base sont plus basses pour compenser la générosité des boosts.
- **Questions des PNJ** : choix multiples avec pièges ; les réponses sont dans les dialogues précédents → **prenez des notes sur papier**.

## Tutoriel
Le prologue affiche des **conseils contextuels** une seule fois chacun (mise en place, tour, exploration, PNJ, lieu, combat, dés et boosts, Ténèbres, fin du tour). Menu → Table physique → « Conseils du tutoriel » / « Revoir les conseils ».

## Carte hexagonale (format retenu)
Le moteur **C (hexagonal)** est le format choisi (les autres moteurs sont conservés mais abandonnés). La carte est une **forme libre** décrite dans le scénario (`hexMap`). Prologue : **14 tuiles** serrées autour du hameau (forêt au nord, branche vers l'est jusqu'au pont et à la Tour, bloc au sud), toutes avec du contenu ; les PNJ indiquent les directions (nord, sud-ouest, est…). Les lieux visent des cases précises (`cell: [colonne, ligne]`).

## Écrire un niveau
Voir **`docs/SCENARIO.md`** : modèle `js/stories/_modele.js`, validateur `node tools/validate-story.mjs js/stories/<niveau>.js` (vérifie lieux, cases, PNJ, modèles 3D, dialogues, quêtes, objets…).

## Campagne

Prologue (tutoriel) + 5 étapes (à venir). Entre les étapes :
- **XP** gagnée uniquement en fin d'étape : commune (victoire 30, +5 par quête) + perso (+4 par ennemi vaincu, +2 par critique). Défaite : la moitié, et on rejoue l'étape.
- **Niveaux** (50, 120, 210, 320, 450 XP) : 1 point = +5 % à une compétence **ou** un avantage de classe (Rempart, Érudition, Brise-os, Assassin…).
- **Mémoire de campagne** : choix et infos retenus pour les étapes suivantes (`g.memory('prologue.gardienAmi')`).
- **Réputation cachée** auprès des PNJ (`g.rep('gaspard', +1)`), qui modifiera les dialogues futurs.
- **Objets conservés** (marqués `keep`) d'une étape à l'autre.

## Prologue — « Le Pont de Brume » (tutoriel)
Rallumer le fanal de la Tour du Guet avant le dernier glas. Couvre : dialogue à choix, quête révélant un lieu (Gaspard → tanière), activités de lieu, piège (boost ±), prière, embuscade au gué, gardien du pont avec question piège (le nom entendu chez Berthe), zone verrouillée, boss, victoire + XP.

## Les 4 moteurs

| | Moteur | Tuiles | Figurines |
|---|---|---|---|
| A | Table de jeu | carrées 8×5, se retournent | 3D animées temps réel, ombres |
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
- Figurines : socle à la couleur du personnage + **nom gravé sur le socle** ; portraits de l'interface rendus depuis les modèles 3D

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
Personnages & squelettes **KayKit** de Kay Lousberg (CC0, kaylousberg.com) · Poly Haven (CC0) · peintures domaine public (Wikimedia) · Fox.glb (Khronos, CC0/CC-BY 4.0) · Horse.glb (three.js, MIT) · polices Cinzel & EB Garamond (OFL) · three.js r187 (MIT).
