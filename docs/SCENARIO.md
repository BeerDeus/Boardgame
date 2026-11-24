# Créer un niveau (étape de campagne)

Un niveau = **un fichier JSON** `levels/<id>.json`, créé avec l'**éditeur** (`editor.html`, accessible depuis le hub). Le jeu le lit via `js/core/level.js`. Aucune programmation n'est nécessaire.

## Démarche
1. Hub → **Éditeur de niveaux** (sur PC de préférence). « Exemple : Prologue » ouvre le tutoriel comme modèle.
2. Construire : **Carte** → **Lieux** → **Personnages** → **Dialogues** → **Quêtes & objets** → **Événements**.
3. **Tester ▸** ouvre le niveau dans le jeu, dans un onglet séparé. Ni la campagne ni la partie en cours ne sont touchées.
4. **Campagne** (onglet) : placer le niveau dans un Acte (« + Étape : niveau en cours »), régler l'ordre, le déblocage (« Débloquée après »), le titre et l'illustration.
5. **⇪ Publier** envoie `levels/<id>.json` et `levels/campaign.json` sur GitHub, branche `claude/board-game-display-engine-mg98tg` (déployée par Hostinger). Publication refusée tant que le niveau ou la campagne ont des erreurs.
   - **Jeton** : github.com → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token ; *Repository access* : **Only select repositories → BeerDeus/Boardgame** ; *Permissions* : **Contents : Read and write** (rien d'autre). Copier le jeton `github_pat_…` dans la fenêtre « Publier ». Il est stocké **uniquement** dans le navigateur de cet appareil (localStorage) et n'est jamais commité ; « Oublier le jeton » l'efface.
   - Après publication, le jeu en ligne lit les nouveaux fichiers (les JSON sont toujours revalidés). Pour le mode hors-ligne d'un **nouveau** niveau, relancer un jour `python3 tools/build-sw.py`.
6. **Exporter** télécharge `<id>.json` (sauvegarde). Ajout manuel au jeu :
   - le placer dans `levels/` ;
   - ajouter l'étape dans `levels/campaign.json` (Acte → étapes : `{ "id": "etape1", "num": "Étape I", "title": "…", "level": "levels/etape1.json" }`) ;
   - vérifier : `node tools/validate-level.mjs levels/etape1.json` ;
   - mettre à jour le cache : `python3 tools/build-sw.py`.

Le travail est enregistré automatiquement dans le navigateur. Exporter régulièrement pour garder une copie.

## Statistiques et tests de dés
- Chaque héros a **Combat** (attaques) et 4 stats, en % (`js/core/heroes.js`) :
  - **Force** : soulever, enfoncer, intimider ;
  - **Agilité** : esquiver, crocheter, discrétion ;
  - **Intelligence** : savoir, énigmes, pister ;
  - **Volonté** : peur, prière, persuasion.
- Un test est **réussi si D100 ≤ stat + difficulté + modificateur**. Le jet est fait par le héros actif.
  - Difficultés : Facile **+20**, Normal **0**, Difficile **−20**, Héroïque **−40**.
  - Chaque boost ✦ dépensé avant le jet ajoute **+10**.
  - Critique si D100 ≤ chance/5 ; maladresse à partir de 96.
- Où placer un test :
  - **effet « Test de stat »**, dans une activité de lieu ou un événement, avec des effets « si réussite » et « si échec » ;
  - **choix de dialogue avec « Lancer les dés »**, qui mène à un nœud de réussite ou d'échec ;
  - **nœud de dialogue en mode « Test de stat automatique »** : le jet a lieu après le texte.
- Les progressions de niveau ajoutent +5 à une stat ; les avantages (`js/core/campaign.js`) ajoutent +10 à certaines.

## Combat
Toucher si D100 ≤ Combat du héros − défense de l'ennemi. **Dégâts = dégâts de base + 1 par tranche de 20 sous la chance, ×2 sur critique.** Exemple : chance 55, jet 12 → 43 de marge → +2 dégâts.
Les monstres jouent des cartes (`js/core/monsters.js`). Ils visent le héros atteignable le plus blessé, sinon le plus proche. **Garde N** : le monstre ne s'éloigne pas à plus de N cases de son lieu.

## Briques du format
Toutes les briques se choisissent dans des menus de l'éditeur (`js/core/level.js`).

**Effets** (par catégorie) :
- **Récit** : message (`{héros}` = nom du héros actif), narration plein écran, lancer un dialogue, nuit, cloche.
- **Dés et logique** :
  - test de stat (avec effets de réussite et d'échec) ;
  - si / alors / sinon ;
  - **au hasard (x %)** ;
  - **fenêtre de choix** : options avec condition et effets ;
  - **compteur** ; drapeau.
- **Héros** :
  - boosts ±, soins, **blessure** (mortelle ou non), repos ;
  - **bonus/malus de stat**, pour ce niveau ou **permanent dans la campagne** ;
  - **état** : poison, étourdi, guérison ;
  - **bonus de dégâts** (arme forgée…), **XP bonus**, **déplacer des héros vers un lieu**.
- **Objets et quêtes** : donner ou retirer un objet, démarrer ou terminer une quête.
- **Carte et figurines** : révéler un lieu ou le plus proche, **déverrouiller une zone**, apparition (figurine ou vague), **retirer une figurine** (départ, fuite).
- **Partie** : glas ±, **limite de glas ±**, réputation, mémoire de campagne, victoire, **défaite**.

**Conditions** :
- **sur l'état du niveau** : drapeau posé ou non, objet possédé ou non, état de quête ;
- **sur le héros actif** : qui c'est, une de ses stats ≥ N, ses PV ≤ N, il est blessé ;
- **sur la partie** : nombre de héros, manche, glas, nuit, compteur ;
- **sur les lieux et figurines** : ennemis présents ou non à un lieu, figurine en vie ;
- **mémoire** : réputation, mémoire de campagne ;
- **combinaisons** : **NON**, toutes, au moins une.

**Dialogues** (onglet Dialogues, présenté en **arbre** comme un script) :
- Sous chaque choix, « ＋ Répondre » crée la réplique suivante en retrait. Le menu « → » peut aussi renvoyer vers une réplique existante, par exemple pour revenir au menu de questions ; elle s'affiche alors en lien « ↪ ».
- Chaque choix peut être **toujours proposé**, proposé **une seule fois**, ou proposé **jusqu'à réussite** (un échec se retente plus tard).
- Un **texte d'ambiance** (le narrateur décrit la scène) s'affiche avant la première réplique.
- Chaque nœud a un orateur (PNJ, héros ou narrateur) et un texte, puis :
  - une suite simple ;
  - des **choix** (condition, une seule fois, indice, effets) ;
  - un **test de stat**, avec des effets de réussite ou d'échec (récompense, malus…) et une suite propre à chaque issue ou une suite commune.
- Le joueur voit seulement **quelle stat** est testée (« 🎲 Force ») et devine la difficulté à la formulation.
- Les **variantes** changent le texte selon une condition, les **embranchements** changent la suite.

**Objets** : on peut les rendre **utilisables depuis la besace**, avec une condition, des effets, et le choix d'être consommés ou non.
Chaque objet a une **carte physique** (format poker 63 × 88 mm) : code (O-01…), type (consommable, objet de quête, équipement, relique), illustration, texte imprimé. La planche d'impression est `cards.html` (recto de tous les objets de la campagne + verso commun, export SVG). En jeu : « **Prenez la carte** » à l'obtention, « **Défaussez la carte** » à l'usage ou à la perte. Les quêtes (nouvelle / terminée) s'affichent dans une fenêtre à valider ; les autres messages restent 5-6 s et sont repris dans le journal (« Derniers événements »).
**Personnages** : « Quand on lui parle », c'est la première règle dont la condition est vraie qui choisit le dialogue. Si aucun dialogue, le PNJ dit sa réplique.
**Carte** : `hexMap` (lignes « odd-r »), `tiles["col,ligne"] = { terrain, zone }`, lieux avec `cell: [col, ligne]`. Les codes des tuiles physiques (F-01…) sont attribués ligne par ligne.
