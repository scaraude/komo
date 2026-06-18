# Module Hébergement

**Ticket** VIR-22

## Ce que l'utilisateur peut faire

Sur un event multi-jours, proposer des options de logement (Airbnb, camping…) avec un lien et un prix, et voter pour celle qu'il préfère.

## Quand affiché

Uniquement dans l'onglet Présence des events multi-jours (`date_start !== date_end`). Masqué pour les events d'un seul jour et les sondages.

## Proposer une option

Formulaire inline : label (requis), URL (optionnel), prix par nuit (optionnel). Insert optimiste avec `crypto.randomUUID()` temporaire, puis `proposeAccommodation` en arrière-plan.

## Voter

Toggle "Top" / "✓ Top". Même fix pattern que le sondage de dates : `voteAccommodation` fait `return` silencieux si l'option n'est pas en DB, le composant absorbe les erreurs dans `try/catch`.

## Affichage

Options triées par nombre de votes décroissant. Progress bar olive (distincte du terracotta transport). Compteur `votes / totalParticipants`. Lien cliquable si `url` renseigné. Prix affiché si fourni.

## Fichiers

- `components/accommodation/AccommodationSection.tsx`
- `lib/actions/accommodation.ts` — `proposeAccommodation`, `voteAccommodation`
