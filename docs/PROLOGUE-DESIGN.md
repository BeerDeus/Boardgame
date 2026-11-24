# Prologue — design (validé et implémenté)

Objectif : relier tous les PNJ. Le fanal exige **3 composants tenus par 3 PNJ différents**, dont deux passent par une **mission d'échange**. Personnalités, tests de stats, chemins alternatifs et réactions selon le héros déjà écrits sont conservés.

## 1. Le fanal (victoire)
Tour du Guet → activité « Rallumer le fanal » disponible si le groupe a :
| Composant | Carte | Tenu par | Comment l'obtenir |
|---|---|---|---|
| Huile de lampe | O-02 | **Berthe** | Gratuite après « Comment rallume-t-on ce fanal ? » (1er objet = tutoriel « Prenez la carte ») |
| Pierre à feu | O-06 | **Mathilde** (forgée) | Échange : lui apporter un **Silex noir** (O-05) |
| Clé de la Tour | O-07 | **Gaspard** | Échange : porter sa **Lettre** (O-08) à Berthe, puis revenir avec sa réponse |

Allumage : test d'Intelligence **Facile** (la pierre à feu aide) ; échec = réessayer au tour suivant.

## 2. Chaînes de quêtes
```
Berthe ──huile──────────────────────────────────────────────▶ FANAL
   ▲ lettre                     ▲ médaillon d'Odon (bonus Sentinelle)
   │                            │
Gaspard ◀─ loups tués OU aveu ─┘──── réponse de Berthe ─▶ clé ─▶ FANAL
Lise ◀─ poupée (moulin) ── silex noir ─▶ Mathilde ─ pierre à feu ─▶ FANAL
Cache du contrebandier ── silex noir (autre source, test d'Agilité)
Gardien du pont ◀─ nom d'Aldegonde (Berthe / Lise / indice de Mathilde)
```
- **Mathilde** : « Mon dernier silex a éclaté hier. Rapportez-m'en un noir, de ceux qui chantent sous l'acier, et je vous forge une pierre à feu qui allumerait de la glace. » Indice : Lise ramasse « des cailloux qui font des étincelles » ; la cache du contrebandier en contient aussi. La lame (tests Force/Volonté/Intelligence, réaction de Brann) reste une récompense à part.
- **Lise** : rendre la poupée → elle offre son « caillou qui fait des étincelles » = **Silex noir** (+ le nom d'Aldegonde comme aujourd'hui).
- **Cache du contrebandier** : « Forcer la trappe » (Agilité) donne aussi un **Silex noir** (succès : + boosts ; échec : aiguille empoisonnée mais silex quand même).
- **Gaspard** (ancien de la Garde, il a gardé la clé en fuyant) :
  1. Il ne parle de la tour qu'après les **loups** (tanière) **ou** un **aveu** réussi (tests existants Intelligence / Volonté, ou intimidation Force).
  2. « Je ne peux pas la regarder en face. » Il confie une **Lettre** (O-08) pour Berthe.
  3. **Berthe** lit la lettre : choix « Plaider pour Gaspard » (test Volonté ; Aldric +10, il est chevalier) → pardon (réputation +) ; ou « La laisser à sa colère ». Dans les deux cas elle confie le **Médaillon d'Odon** (O-09) : « Montrez-le-lui, s'il reste quelque chose de lui. »
  4. Retour chez Gaspard avec la réponse → il donne la **Clé de la Tour** (+ herbes si les loups sont morts). Pardon → il donne aussi le raccourci du gué.
- **Sentinelle (Odon)** : nouveau choix « Montrer le médaillon » = réussite automatique du réveil d'Odon (sinon l'appel par son nom, test de Volonté, comme aujourd'hui).

## 3. Chemins alternatifs (conservés / ajoutés)
- Gardien : nom (Berthe, Lise, Mathilde), regard (Volonté), force (Force), ou raccourci du gué (Gaspard) — inchangé.
- Porte de la Tour sans la clé : **enfoncer** (Force difficile, échec +1 glas) ou **crocheter** (Agilité normale). La clé ouvre sans jet.
- **Sélène** : peut **subtiliser la clé** à la ceinture de Gaspard (Agilité difficile) ; s'il la surprend, Gaspard se fâche.
- **Brann** : Mathilde forge la pierre à feu sans épreuve (les autres doivent tenir le soufflet : Force normale, à retenter si échec).
- **Aldric** : +10 au test de Volonté pour plaider la cause de Gaspard auprès de Berthe.
- (Non retenu : allumage du fanal par la magie d'Ysolde.)

## 4. Objets (cartes)
O-01 Herbes de soin · O-02 Huile de lampe · O-03 Eau bénite · O-04 Poupée de chiffon · **O-05 Silex noir** (quête) · **O-06 Pierre à feu** (quête) · **O-07 Clé de la Tour** (quête) · **O-08 Lettre de Gaspard** (quête) · **O-09 Médaillon d'Odon** (relique).

## 5. Journal
Parler à Berthe → Rallumer le fanal (indice : huile, pierre à feu, clé) → sous-quêtes : « Un silex pour Mathilde », « La clé de Gaspard », « La lettre de Gaspard », « Retrouver la poupée de Lise », « Chasser les loups », « Atteindre la Tour du Guet », « Retrouver Odon ».

Durée : ~8 à 11 manches à 2 héros, dans les 22 glas (Normal).
