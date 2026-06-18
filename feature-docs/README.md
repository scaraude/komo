# Feature docs — Komo

7 features produit. Un fichier par feature.

L'infra sous-jacente (stack, DB, RLS, deploy) n'est pas documentée ici — elle est dans les tickets VIR-01 à VIR-04 sur Notion.

---

## Features

| Feature | Fichier | Tickets |
|---|---|---|
| Créer un event | [creer-un-event.md](creer-un-event.md) | VIR-07 · VIR-08 · VIR-19 |
| Rejoindre sans compte | [rejoindre-sans-compte.md](rejoindre-sans-compte.md) | VIR-05 · VIR-06 |
| Module Présence | [module-presence.md](module-presence.md) | VIR-09 · VIR-10 · VIR-11 · VIR-12 |
| Module Transport | [module-transport.md](module-transport.md) | VIR-13 · VIR-14 · VIR-15 · VIR-16 · VIR-17 · VIR-18 · VIR-21 |
| Sondage de dates | [sondage-de-dates.md](sondage-de-dates.md) | VIR-20 |
| Module Hébergement | [module-hebergement.md](module-hebergement.md) | VIR-22 |
| Module Bouffe | [module-bouffe.md](module-bouffe.md) | VIR-23 |

---

## Patterns transversaux

### Optimistic UI
Toutes les mutations utilisent `useState` + mise à jour locale immédiate + `startTransition(() => serverAction(...))`. Pas de `useOptimistic` — il reverte automatiquement à la fin de la transition, causant un flash.

### Optimistic + vote sur ID temporaire
Les inserts optimistes utilisent `crypto.randomUUID()` comme ID temporaire. Si un vote est déclenché avant que le vrai ID soit en DB, la Server Action fait `return` silencieusement (pas de throw). Le composant client entoure l'appel d'un `try/catch` dans `startTransition`. Concerne : `voteDate`, `voteAccommodation`.

### Auth sans compte
Pas de Supabase Auth natif. Deux tokens UUID stockés en cookies : `session_token` (participant, httpOnly: false pour Realtime) et `creator_token` (admin, httpOnly: true). Injectés dans les headers Supabase (`x-session-token`, `x-creator-token`) lus par les RLS policies.
