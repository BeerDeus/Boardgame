# Tour du moteur — Grimoire

État au 24/11/2026 (mis à jour après l'éditeur de niveaux). Site 100 % statique (HTML/JS modules, sans build), PWA hors-ligne, déployé par Git sur Hostinger.

## 1. Architecture

```
index.html ─ hub (choix du moteur)          play.html ─ jeu
                                               └─ js/main.js : charge le moteur + le scénario
js/core/      règles et interface (indépendants du rendu)
  scenario.js   moteur de règles « MJ » : manches, tours, déplacement, exploration, combat, Ténèbres, fin, menu
  level.js      format de niveau JSON : effets, conditions, dialogues → STORY (lu par scenario.js)
  level-check.js vérification d'un niveau (éditeur + tools/validate-level.mjs)
  stats.js / heroes.js   stats Force/Agilité/Intelligence/Volonté, difficultés ; héros de la campagne
  ui.js         HUD, modales (compagnie, consignes, dés D100, lieux, conseils), bandeaux, menu
  dialogue.js   dialogues PNJ à choix + narrations plein écran (enchaînées en fondu)
  mapgen.js     projection du scénario (lieux, zones, régions) sur la grille
  grid.js       grilles carrée/hex, voisins, BFS
  campaign.js   campagne : étapes, XP, niveaux, avantages, mémoire, réputation, objets conservés
  monsters.js   paquets de cartes d'action par type de monstre (façon Gloomhaven)
  settings.js   préréglages graphiques (auto-détection), options persistées
  sfx.js        sons synthétisés (WebAudio), vent d'ambiance
  poi-art.js    médaillon de point d'intérêt (SVG) + profil du marqueur 3D
  pwa.js        service worker, mise à jour forcée
js/three/     rendu 3D commun
  stage.js      renderer, HDRI, jour/nuit, torches, particules, rendu à la demande, résolution dynamique
  rig.js        caméra (pan/zoom/rotation, vols, secousse, cinématiques)
  board3d.js    plateau : tuiles (chute + numéro), figurines, plaques de nom par camp, surbrillances, POI, picking
  figures.js    figurines KayKit animées (GLB), palette « civile » des PNJ, socles
  poi.js        marqueur 3D de point d'intérêt
  props.js / textures.js / impostor.js   décors procéduraux, textures, portraits pré-rendus
js/engines/   hex.js (seul moteur conservé)
js/editor/    éditeur de niveaux (editor.html) : formulaires, carte hex, dialogues
levels/       niveaux JSON (prologue.json)
tools/        build-sw.py (cache hors-ligne + version), validate-level.mjs, aperçus POI / figurines
```

**Principe** : l'app arbitre, la table physique joue. Chaque découverte déclenche des consignes de mise en place : tuiles, jetons, figurines. Les jets se font avec de vrais dés D100.

## 2. Ce qui marche bien
- Boucle complète du Prologue : intro, mise en place, manches, exploration, PNJ et dialogues, quêtes, combat, Ténèbres, glas, victoire/défaite, XP.
- Tuiles qui tombent une par une avec leur numéro, illustration peinte plaquée sur les tuiles.
- Héros, PNJ et ennemis distincts : plaques, bulle, halo, tenue civile.
- PWA hors-ligne, mise à jour fiable malgré le CDN (version dans les URL).
- Réglages graphiques complets, rendu à la demande économe sur mobile.

## 3. Améliorations possibles

**Faits** : combat à la marge de réussite (1), points d'intérêt dégagés des figurines (3), IA des monstres (6), éditeur de carte/niveau (11), prototypes retirés (14), torches (15), stats et tests de dés dans les dialogues.


### Priorité haute (jouabilité)
1. **Système de combat définitif** : c'est encore « 1 jet D100 » provisoire. Pistes : dégâts selon la marge de réussite, cartes de compétence par héros, positionnement (flanc, portée).
2. **Annuler la dernière action** (mauvais tap sur une case) : instantané de l'état avant chaque action, bouton « Annuler » tant qu'aucun dé n'a été lancé.
3. **Points d'intérêt qui gênent les figurines** : le marqueur est dans un coin de la case et des figurines peuvent s'y poser. Réserver ce coin dans le placement des figurines.
4. **Lisibilité en vue d'ensemble** : agrandir les plaques de nom quand on dézoome, regrouper les figurines d'une même case (« ×3 »).
5. **Rôle du destrier** : aujourd'hui, seulement +2 déplacement pour Aldric. Pistes : porter un objet, transporter un 2ᵉ héros, mourir à la place d'Aldric.
6. **IA des monstres** : elle vise toujours le héros le plus proche. Pistes : priorités par carte (le plus blessé, le mage), garder un lieu, fuir à 1 PV.

### Contenu
7. **Étapes I à V de la campagne** (aujourd'hui « À venir ») : nouvelles cartes `hexMap`, PNJ, quêtes, boss, mémoire et réputation déjà prêtes à être exploitées.
8. **Tuiles en haute définition** : 1 image par tuile (prompt prêt : `docs/prompt-tuiles-hd.md`), puis remplacer `assets/maps/prologue-v1.jpg`.
9. **Planche d'impression** : PDF A4 des tuiles (fond perdu, traits de coupe, verso avec le code), plus jetons et cartes de monstres.
10. **Plus de modèles de PNJ et monstres** : aujourd'hui il n'y a que 5 corps KayKit + renard/cheval. Des loups, rats et le Gardien mériteraient leur propre modèle.

### Outils de création
11. **Éditeur de carte visuel** : dessiner le `hexMap`, placer lieux, PNJ et zones à la souris, puis exporter le bloc JS du scénario.
12. **Tests automatiques** : partie de bout en bout dans un navigateur sans interface (le script de test de cette session sert de base), lancée à chaque push.
13. **Déploiement automatique** : action GitHub qui lance `build-sw.py` et `validate-story.mjs` avant de publier (aujourd'hui c'est manuel).

### Technique et qualité
14. **Retirer les anciens prototypes** (tabletop, cards, paper) : moins de code et de fichiers mis en cache hors-ligne. Ils restent dans l'historique Git.
15. **Torches des tuiles de village non découvertes** : la flamme est visible avant que la tuile tombe. Ne l'allumer qu'à la découverte.
16. **Sauvegardes** : changer `SAVE_V` efface les parties en cours. Prévoir une migration de sauvegarde.
17. **Accessibilité** : vert et rouge sont utilisés pour gain/perte (daltonisme), tailles de texte réglables, bouton « Lire à voix haute » pour les narrations.
18. **Audio** : seulement des sons synthétisés. Ajouter musiques d'ambiance (village, combat, nuit) et cloche enregistrée.
19. **Application native** (Capacitor) pour les stores : l'écran reste allumé, vibrations plus fiables, pas de barre du navigateur.
20. **Langues** : tous les textes sont en français dans le code. Les extraire si une version anglaise est envisagée.
