# Sondage de dates

**Ticket** VIR-20

## Ce que l'utilisateur peut faire

Quand les dates ne sont pas encore arrêtées, les participants proposent des créneaux et votent pour ceux qui les arrangent. Le créateur fixe ensuite la meilleure date, ce qui fait basculer l'event en mode normal.

## Mode sondage

Déclenché à la création si "Pas sûr des dates ?" est activé → `date_start` et `date_end` sont `null` en DB. Détecté partout via `isSondage = !event.date_start`.

Impacts : tab "Dates 📅" à la place de "Présence", `DeadlineBar` masquée, `AccommodationSection` masquée, `MealGrid` vide (pas de jours calculables).

## Proposer une date

Optimistic UI : insert immédiat dans le state avec `crypto.randomUUID()` comme ID temporaire, puis `proposeDateOption` en arrière-plan. La vraie entrée remplace l'optimiste au prochain revalidate.

## Voter

Toggle : clic sur "Je peux" → optimistic update du champ `votes` jsonb → `voteDate` en arrière-plan.

**Fix pattern important** : pendant la fenêtre où l'insert optimiste existe côté client mais pas encore en DB, `voteDate` ferait une requête sur un UUID inexistant. La Server Action fait `return` silencieusement dans ce cas (pas de throw). Le composant entoure l'appel d'un `try/catch` dans `startTransition` pour absorber les erreurs résiduelles.

## Fixer la date (créateur uniquement)

Bouton "Fixer ✓" sur chaque proposition. `fixDate` :
1. Lit `proposed_date` de la proposition
2. UPDATE `events.date_start = events.date_end = proposed_date`
3. DELETE toutes les autres propositions du même event
4. `revalidatePath` → la page repasse en mode normal

## Tri

Propositions triées par nombre de votes décroissant, puis par date croissante à égalité.

## Fichiers

- `components/dates/DatePoll.tsx`
- `lib/actions/dates.ts` — `proposeDateOption`, `voteDate`, `fixDate`
