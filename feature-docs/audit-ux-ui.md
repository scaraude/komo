# Audit UX / UI — Komo

Audit complet des flows et formulaires. Objectif : **simplifier**, repérer les
formulaires qui dérapent en complexité, proposer des alternatives concrètes.

Légende sévérité : 🔴 bloquant / 🟠 important / 🟡 confort · 🟢 = point fort à garder.

---

## 0. Vue d'ensemble

L'app est mobile-first (max 440px), cohérente sur l'intention, avec un parti pris
graphique fort (terracotta, serif, ombres portées). La navigation **hub → modules**
(`/e/[slug]` puis `?tab=…`) est lisible. Les empty states sont soignés, l'optimistic
UI est partout. Bon socle.

Trois problèmes transversaux dominent :

1. **Deux designs cohabitent** (mi-refonte) → l'app paraît incohérente d'un onglet à l'autre.
2. **Deux formulaires de création d'event** divergents, dont un orphelin.
3. **Quelques formulaires demandent trop** (transport, bouffe, activités) — friction sur des actions censées prendre 30 s.

---

## 1. Flow « Créer un event » — 🔴 duplication & feature inaccessible

### Constat
Il existe **deux** formulaires de création, totalement différents :

| | `app/LandingForm.tsx` (utilisé sur `/`) | `app/new/NewEventForm.tsx` (utilisé sur `/new`) |
|---|---|---|
| Layout | mono-page | 2 étapes (type → détails) |
| Vibes | 4 (`weekend, soiree, concert, road_trip`) | 6 (+ `sport, autre`) |
| Vibe | facultative (défaut `autre`) | obligatoire (étape 1) |
| Destination | `PlaceAutocomplete` (Geoapify) | input texte simple |
| Email | oui (capture identité) | non |
| **Mode sondage** | **absent** | présent (toggle « Pas sûr des dates ? ») |
| Style | nouveau (doux) | ancien (brutaliste) |

### Problèmes
- 🔴 **Le sondage de dates est inaccessible depuis l'entrée réelle.** `LandingForm` rend les dates `required` et n'a pas le toggle sondage. Or tout le module « Sondage de dates » repose sur un event créé avec `date_start = null`. Depuis la home, **on ne peut jamais créer un event en mode sondage** — une feature documentée (VIR-20) est morte côté UX.
- 🟠 `/new` + `NewEventForm` semblent **orphelins** (la doc `creer-un-event.md` décrit pourtant ce composant 2 étapes — la doc est désynchronisée du code réel).
- 🟡 Liste de vibes incohérente (4 vs 6) alors que `page.tsx` gère le wording des 6 types.

### Recommandations
1. **Garder une seule création** : `LandingForm` (mono-page, plus simple, capture email). Supprimer `NewEventForm` + route `/new`, ou les rediriger. Mettre à jour `creer-un-event.md`.
2. **Réintégrer le mode sondage dans `LandingForm`** sans le rendre lourd : remplacer le bloc « Quand » par un mini-toggle au-dessus des champs date :
   - défaut : 2 champs date.
   - lien discret « 📅 Pas encore de date → on vote » qui masque les champs et pose `sondage=1`.
   C'est 4 lignes de JSX réutilisées de l'ancien form, et ça rétablit la feature.
3. Aligner les 6 vibes (ajouter `sport` + `autre`) ou assumer 4 + « autre » implicite, mais une seule source de vérité (`EVENT_TYPES`).

---

## 2. Les formulaires « lourds » — où ça dérape et comment alléger

### 2a. `ProposeVehicleForm` (transport) — 🟠 le plus chargé

Champs pilotés par le mode (5 modes) : label, départ, arrivée, date, heure/plage,
stepper places, toggle chauffeur, n° train, lien, commentaire, + encart info.
Pour le cas dominant « je conduis, 4 places, samedi matin », il y a beaucoup à scanner.

**Alternatives :**
- 🟢 Le pattern « chips de mode qui révèlent les bons champs » est bon — à garder.
- **Rendre le `label` optionnel et auto-suggéré.** Demander à un pote de *nommer* son trajet est de la friction pure. Défaut = `{ville départ} → {ville arrivée}` ou `{emoji mode} {ville}`. Champ « renommer » repliable.
- **Progressive disclosure** : visible par défaut = mode, points, date+heure, places/chauffeur. Replier derrière « + détails » : `n° train`, `lien`, `commentaire`. Ça réduit la hauteur perçue de ~40 %.
- **Toggle « Heure fixe / Plage »** : utile mais c'est un contrôle de plus. Le garder en mode « avancé » (apparaît seulement si l'utilisateur tape une heure puis veut une fourchette), ou via un petit « + plage ».
- ⚠️ **À vérifier (modèle mental places)** : le form dit « ta place est comptée en plus des places passagers » mais `CarCard` calcule `free = total_seats − occupants` et le chauffeur occupe un siège. Risque d'off-by-one : si je mets 4 places passagers + je suis chauffeur, la capacité affichée est-elle 4 ou 5 ? Vérifier `createLeg` côté serveur et clarifier le wording (« Places **au total** » vs « places **passagers** »).

### 2b. `BouffePanel` (715 lignes) — 🟠 trop d'axes de navigation imbriqués

Empilement : 2 vues (Repas / Liste de courses) × 2 layouts (Liste / Par date) +
sheet de choix (repas vs produit) + form repas (avec calendrier inline + ajout de
produits inline) + form produit (qty/unité/tags/rattachement) + sheet date.

**Alternatives :**
- **Tags en texte brut** (`"Tags séparés par des virgules"`) 🔴 : pattern dev, incompréhensible pour un pote. Et le tag duplique le concept « rattaché à un repas ». → Supprimer le champ tags libre, **ou** le remplacer par 3–4 chips prédéfinies (apéro, petit-déj, goûter…).
- **Double switch de vue** (Repas/Courses + Liste/Par date) : 4 combinaisons pour une liste de courses entre potes, c'est over-engineered. Proposer : garder Repas / Courses ; ne montrer « Par date » que si l'event est multi-jours **et** qu'au moins un repas est daté.
- **Form repas** : le calendrier pleine largeur inline rend le sheet très long. Le réduire à un tag « 📅 jour ? » qui ouvre le calendrier à la demande (comme déjà fait sur la carte repas via `dateSheetMeal`) → réutiliser ce composant au lieu de l'inline.
- 🟢 Le flux « repas = moment + produits » et la liste de courses dérivée sont une bonne idée — c'est la mécanique qu'il faut, juste trop d'habillage.

### 2c. `ActivityForm` + `ActivityCard` — 🟠 modèle de prix trop riche

`priceMode` à 4 valeurs (none/total/per_person/per_group) + `group_size` + min/max
participants + simulateur de coût avec stepper sur chaque carte.

**Alternatives :**
- **Le mode `per_group`** (prix par groupe de N) est un cas rare qui complexifie tout (form + calcul `groupMsg` + simulateur). À supprimer en v1, ou le cacher derrière « cas spécial ». 90 % des cas = total à diviser, ou prix/pers.
- **min/max participants** : deux inputs `number` placeholder-only côte à côte (`min (optionnel)` / `max / places`) = ambigu. Mettre des labels persistants et expliciter (« Minimum pour que ça tienne », « Places dispo »).
- 🟢 Le simulateur « si on est N → X€/pers » est une vraie valeur ajoutée. À garder, mais il suffit pour les modes total / per_person.

### 2d. `DatePoll` — 🟡 proposition une par une

On propose une date à la fois (un seul `input[type=date]`). Pour caler un week-end on
en propose plusieurs successivement. → Permettre la sélection multiple (réutiliser le
calendrier de `PartialPresence`/`BouffePanel`, déjà écrit) plutôt qu'un input date sec.

---

## 3. Cohérence visuelle — 🟠 deux langages graphiques

L'app est en pleine refonte, et ça se voit **en changeant d'onglet** :

- **Style « doux » (nouveau)** : hub, `BouffePanel`, `TransportPanel`, `LandingForm`, `mes-komos`, `connexion` — `border-line-2`, ombres subtiles, rayons 16–24px.
- **Style « brutaliste » (ancien)** : `ActivityPanel`, `DatePoll`, `AccommodationSection`, `JoinForm`, `NewEventForm` — `border-2 border-ink`, ombres dures `shadow-[3px_3px_0]`.

→ Activités et Dates « jurent » à côté de Bouffe et Transport. **Choisir un langage**
(le doux semble être la cible) et migrer les 3–4 composants restants. Gain de
perception de qualité immédiat, peu de risque (CSS only).

**Modales dupliquées** : `BouffePanel.Sheet`, `ProposeVehicleForm`, `SuggestModal`,
`ShareSheet` réimplémentent chacun leur overlay. Comportements divergents : seul
`ShareSheet` gère Échap, aucun ne gère le focus-trap. → Extraire **un** primitive
`<Sheet>` / `<Modal>` (overlay + clic-extérieur + Échap + focus-trap + `animate-sheet-up`)
et l'utiliser partout.

---

## 4. Accessibilité & micro-interactions — 🟠/🟡

- 🟠 **Labels qui disparaissent** : beaucoup de champs n'ont qu'un placeholder
  (ActivityForm prix/min/max, AccommodationSection url/prix, DatePoll). Au focus le
  repère disparaît. → labels persistants ou `float label`.
- 🟠 **Boutons emoji-only sans `aria-label`** : le bouton ✨ d'auto-affectation
  (`TransportPanel`), le 🗑 de suppression de repas/produit. (Le toggle Liste/Par date
  a déjà `aria-label` ✅ — bon réflexe à généraliser.)
- 🟡 **États `pending` incohérents** : `JoinForm`, `ProposeVehicleForm`, `SuggestModal`
  désactivent pendant l'envoi ✅ ; `DatePoll` (Proposer) et `AccommodationSection`
  (submit) non → double-soumission possible.
- 🟡 **`PointField`** : la logique pill « lieu de l'event » + ✕ pour éditer +
  « ↩ Remettre {défaut} » est maligne mais opaque. Un pote qui propose un trajet vers
  la destination connue ne comprend pas pourquoi l'arrivée est une pastille verrouillée.
  → libellé explicite « Arrivée : {destination} (modifier) ».
- 🟡 **`ShareSheet`** affiche `komo.app/{slug}` en SSR puis le remplace au mount →
  flash d'un faux domaine. Calculer l'URL plus tôt ou masquer jusqu'au mount.

---

## 5. Navigation & architecture des écrans — 🟡

- **Lien retour ambigu** : sur un écran module le retour s'affiche « ‹ Présence »
  (le titre de l'écran courant), pas « ‹ Retour ». Le chevron dit « reculer », le mot
  dit « tu es ici ». → « ‹ {titre de l'event} » ou « ‹ Retour ».
- **Hub-and-spoke strict** : pour passer de Transport à Bouffe il faut repasser par le
  hub (2 taps). Pour l'orga qui jongle, une **barre d'onglets basse** persistante (ou un
  switch rapide en tête d'écran module) réduirait beaucoup les allers-retours. À mettre
  en balance avec la simplicité voulue.
- **L'écran Présence fait trop** : RSVP + jours partiels + **vote logement** + roster +
  bouton récap. Le logement (`AccommodationSection`) gagnerait à être sa **propre tuile**
  de module plutôt qu'enterré sous Présence (on ne le découvre que si l'event est
  multi-jours **et** qu'on scrolle).
- **Double affordance de partage** : `ShareSheet` (hub) + « 🔗 Copier le lien »
  (`DeadlineBar`). Redondant — garder un seul point d'entrée fort.

---

## 6. Dette identifiants (rappel AGENTS.md) — 🟡

Vu dans le code, déjà listé comme dette à migrer : `direction: 'aller'|'retour'`,
`role: 'créateur'|'co_organisateur'`, `mode: 'navette'`, `hasBillet`/`isBillet`.
À traiter via migration quand on touche ces modules (pas en plein milieu d'une feature).

---

## 7. Plan d'action proposé (par ROI)

| # | Action | Sévérité | Effort | Impact |
|---|---|---|---|---|
| 1 | Réintégrer le mode sondage dans `LandingForm` | 🔴 | S | feature débloquée |
| 2 | Supprimer `NewEventForm`/`/new`, resync doc | 🔴 | S | clarté/maintenance |
| 3 | Migrer Activités + Dates + Logement + Join au style « doux » | 🟠 | M | cohérence perçue |
| 4 | Extraire un `<Sheet>` unique (Échap + focus-trap) | 🟠 | M | a11y + cohérence |
| 5 | Bouffe : retirer tags libres, simplifier double-switch | 🟠 | M | friction −− |
| 6 | Transport : `label` optionnel auto-suggéré + « + détails » repliable | 🟠 | M | friction −− |
| 7 | Activités : retirer `per_group`, labels min/max | 🟠 | S | friction − |
| 8 | Labels persistants + `aria-label` partout + pending states | 🟠 | S | a11y |
| 9 | Logement = tuile module dédiée | 🟡 | M | découvrabilité |
| 10 | DatePoll : sélection multi-dates | 🟡 | M | confort |

S = ½ j, M = 1–2 j (ordres de grandeur).
</content>
</invoke>
