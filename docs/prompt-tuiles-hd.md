# Prompt ChatGPT — tuiles en haute définition (1 image par tuile)

ChatGPT génère au maximum du 1536×1024. Sur la carte entière, une tuile fait environ 213 px, trop peu pour l'impression.
Solution : régénérer **chaque tuile en 1024×1024** à partir de sa vignette (`docs/tuiles-modeles/<code>.png`), soit environ 375 dpi pour une tuile de 6 cm.

## Démarche
1. Dans **une seule conversation**, envoie d'abord la carte complète avec le **message 1** (style de référence).
2. Puis, pour chaque tuile, joins sa vignette et envoie le **message 2** en remplaçant `<CODE>` et `<CONTENU>` (liste ci-dessous).
3. Si une tuile dérive (cadrage, perspective, texte), renvoie le **message 3**.

---

### Message 1 — référence de style
```
Voici l'illustration complète d'un plateau de jeu en 14 tuiles hexagonales. Garde-la comme référence de style pour toute la suite : même peinture, même palette sombre et brumeuse, même lumière venant du haut à gauche, même niveau de détail. Je vais te demander de repeindre chaque tuile séparément, en haute définition. Ne génère rien pour l'instant, réponds juste « prêt ».
```

### Message 2 — une tuile (à répéter 14 fois)
```
Repeins cette vignette en haute définition, au format carré 1024×1024, en gardant EXACTEMENT la même composition : mêmes éléments, aux mêmes positions et aux mêmes tailles. Le chemin et la rivière doivent entrer et sortir de l'image aux mêmes endroits que sur la vignette, pour que la tuile se raccorde à ses voisines.

Tuile <CODE> : <CONTENU>

Règles :
- Vue du dessus, la plus verticale possible : on voit surtout les toits, les cimes et le sol.
- Même style que la carte de référence : peinture à l'huile de dark fantasy, crépuscule, brume au sol, couleurs éteintes. Beaucoup de détails nets (pierres, herbes, mousse, tuiles des toits).
- La tuile sera découpée en hexagone, pointe en haut, centré, d'une hauteur d'environ 87 % de l'image. Le sujet principal reste au centre, rien d'important près des bords de l'hexagone.
- Peins tout le carré jusqu'aux bords, y compris les coins qui seront coupés : pas de fond uni, pas de vignettage.
- AUCUN contour d'hexagone, aucun trait de découpe, aucun cadre, aucun texte, lettre ni chiffre.
```

### Message 3 — correction
```
Même tuile, mais : garde exactement la composition de la vignette, supprime tout contour ou trait d'hexagone, vue plus verticale (pas de façades), aucun texte.
```

---

## Contenu des 14 tuiles (pour `<CONTENU>`)

| Code | Contenu |
|---|---|
| F-01 | Tanière des loups : forêt sombre, chêne mort aux grosses racines, entrée noire d'une tanière, ossements au sol. Sentier qui descend vers le sud. |
| F-02 | Verger de la Combe : pommiers tordus aux pommes rouges, clôture de bois, petit sentier. |
| F-03 | Camp du chasseur : clairière, feu de camp qui fume, tente de toile, peaux qui sèchent sur des cadres de bois. |
| V-01 | Forge de Mathilde : forge au toit de chaume, foyer rougeoyant, enclume dehors, fumée, outils et tonneaux. |
| V-02 | Hameau de Vieille-Ronce : maisons au toit de chaume et auberge autour d'un puits de pierre, fenêtres éclairées, chemins de terre qui partent dans toutes les directions. |
| P-01 | Lande : herbes couchées par le vent, chemin de terre boueux d'ouest en est avec des empreintes fraîches. |
| M-01 | Gué des Noyés : marais d'eau noire, gué de pierres plates sur le chemin, roseaux et arbres morts, brume sur l'eau. |
| P-02 | Pont de Brume : rivière tumultueuse du nord au sud, pont de pierre moussue à une arche sur le chemin d'ouest en est. |
| U-01 | Ruines du Péage : murs effondrés d'un poste de péage, barrière de bois brisée en travers du chemin. |
| U-02 | Tour du Guet : tour ronde de pierre sombre, grand brasero éteint au sommet, murets en ruine autour. |
| P-03 | Moulin abandonné : moulin à vent en bois aux ailes déchirées, sacs de farine éventrés, clôture. |
| M-02 | Marais : tourbière d'eau noire, souches, végétation dense, petite source claire qui jaillit entre des rochers. |
| U-03 | Chapelle de la Brume : petite chapelle de pierre à clocheton, toit en partie effondré, pierres tombales. |
| R-01 | Cache du contrebandier : éboulis de rochers gris moussus, dalle de pierre trop bien posée qui cache une trappe. |

Renvoie-moi les 14 images (nommées par code si possible) : j'en fais la planche d'impression (fond perdu, traits de coupe, verso avec les codes) et/ou les textures de l'app.
