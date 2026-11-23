# Grimoire — moteur d'affichage de plateau (prototypes)

App compagnon narrative (inspiration *Destinies*) : **4 moteurs d'affichage**, **1 scénario complet identique** sur chacun.
Site 100 % statique, **PWA installable et jouable hors-ligne**, prêt pour Capacitor.

## Lancer / déployer

- **Hostinger** : déploiement Git de cette branche à la racine (`index.html` = hub).
- **Local** : `python3 -m http.server 8000` → http://localhost:8000
- **Mises à jour automatiques** : le code (HTML/JS/CSS) est toujours récupéré en réseau d'abord ; une nouvelle version est détectée à l'ouverture (et toutes les 15 min), activée et la page se recharge seule (« ✓ Nouvelle version installée »). Pas besoin de réinstaller la PWA ni de vider le cache. Hors-ligne, la dernière version en cache est utilisée.
- Recommandé avant un déploiement (facultatif) : `python3 tools/build-sw.py` — met à jour la liste des fichiers disponibles hors-ligne et purge les anciens caches.
- **Capacitor (plus tard)** : `webDir` = racine du dépôt, rien à builder.

## Le scénario — Chapitre I « Le Glas de Saint-Ombre » (coopératif, 1 à 4 héros)

**But commun : faire taire la cloche maudite avant le 12ᵉ glas** (14 en facile, 10 en difficile).
Chaque fin de manche, la cloche sonne (+1 glas, +2 tant que le Sonneur vit). Au 5ᵉ glas le cimetière se vide, au 8ᵉ le charnier.

Le **Rite de silence** exige 3 éléments, à trouver en parallèle (il faut se répartir) :
1. **Psautier noir** — sacristie de la Chapelle Sainte-Brume, gardée par 2 pillards squelettes.
2. **Huile de veille** — Maud la prépare avec l'**Herbe-de-lune**… que cueillait son petit-fils Tobie, encerclé par des renards à la Clairière des Pendus.
3. **Clé du clocher** — le Passeur du marais : payer (pièce de la Souche creuse), convaincre (Tobie sauvé), intimider (Force) ou voler (Discrétion — en cas d'échec : +1 glas).

Puis : Abbaye (2 gardes morts) → portail → **Clocher** → le Sonneur (boss) → **3 réussites de Savoir** au Rite (−15 % tant que le Sonneur vit).
Lieux optionnels : Cimetière (indice), Charnier (soins ou réveil des morts), Cairn runique (−2 glas), Chapelle (prière : −1 glas + eau bénite), Auberge (soins).

### Héros
| Héros | Rôle | PV | Combat | Force | Savoir | Discrétion | Talent |
|---|---|---|---|---|---|---|---|
| Aldric | Chevalier | 10 | 65 | 55 | 35 | 30 | monte le destrier (déplacement 5) |
| Ysolde | Mage | 7 | 70 (magie, portée 2) | 25 | 75 | 40 | Lueur : révèle les tuiles voisines |
| Brann | Barbare | 12 | 60 (2 dégâts) | 80 | 25 | 25 | brute |
| Sélène | Voleuse | 8 | 55 | 35 | 45 | 80 | déplacement 4 |

### Tour de jeu
- **Manche** = chaque héros joue à son tour (bandeau animé « Au tour de… »), puis **Phase des ténèbres** (ennemis, glas, événements).
- **Tour d'un héros = 1 déplacement + 1 action**, dans l'ordre voulu :
  - Déplacement : jusqu'à 3 cases connues ; entrer dans une case inconnue la révèle et arrête le mouvement.
  - Action (une seule) : **interagir avec le lieu** (on fait alors *tout* ce qui y est disponible), **parler à un PNJ** (confirmation demandée), **combattre** (placeholder D100, confirmation demandée) ou talent (Lueur).
  - Actions libres : utiliser des herbes de soin, monter/descendre de cheval.
- Héros tombé : revient à Grisval à la manche suivante, +1 glas. Défaite si tous tombent en même temps.
- Dés **D100 physiques** saisis à l'écran (dizaines + unités), réussite si ≤ compétence.

### Durée de partie (estimations)
| | Durée |
|---|---|
| Ancienne intro (v2, non coop) | ~20-30 min |
| **Chapitre I coop — 2 héros** | **~40-55 min** (≈ 9-11 manches) |
| 3 héros | ~55-75 min |
| 4 héros | ~70-90 min |

Base de calcul : ~1,5-2 min par tour de héros (déplacement, lecture, jet de dés) + ~10 min de narration/dialogues.

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
