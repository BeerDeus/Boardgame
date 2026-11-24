# Créer un niveau (étape de campagne)

Un niveau = **un fichier JSON** `levels/<id>.json`, créé avec l'**éditeur** (`editor.html`, accessible depuis le hub). Le jeu le lit via `js/core/level.js`. Aucune programmation n'est nécessaire.

## Démarche
1. Hub → **Éditeur de niveaux** (sur PC de préférence). « Exemple : Prologue » ouvre le tutoriel comme modèle.
2. Construire : **Carte** → **Lieux** → **Personnages** → **Dialogues** → **Quêtes & objets** → **Événements**.
3. **Tester ▸** ouvre le niveau dans le jeu, dans un onglet séparé. Ni la campagne ni la partie en cours ne sont touchées.
4. **Exporter** télécharge `<id>.json`. Pour l'ajouter au jeu :
   - le placer dans `levels/` ;
   - ajouter une étape dans `js/core/campaign.js` : `{ id: 'etape1', num: 'Étape I', title: '…', load: () => loadLevel('levels/etape1.json') }` ;
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
- **Effets** (`EFFECTS` dans `js/core/level.js`) : message, narration, test de stat, si/alors/sinon, donner ou retirer un objet, boosts, soins, repos, glas, drapeau, quêtes, révéler un lieu, déverrouiller une zone, apparition (figurine ou vague), lancer un dialogue, nuit, cloche, réputation, mémoire de campagne, victoire.
- **Conditions** (`CONDS`) : drapeau posé ou non, objet possédé ou non, état de quête, ennemis présents ou non au lieu, figurine en vie, réputation, mémoire de campagne, toutes / au moins une.
- **Dialogues** : chaque nœud a un orateur et un texte, puis une suite (nœud ou fin), des **choix** (condition, une seule fois, test, effets) ou un **test**.
  - Les **variantes** changent le texte selon une condition.
  - Les **embranchements** changent la suite selon une condition.
- **Personnages** : « Quand on lui parle », c'est la première règle dont la condition est vraie qui choisit le dialogue. Si aucun dialogue, le PNJ dit sa réplique.
- **Carte** : `hexMap` (lignes « odd-r »), `tiles["col,ligne"] = { terrain, zone }`, lieux avec `cell: [col, ligne]`. Les codes des tuiles physiques (F-01…) sont attribués ligne par ligne.
