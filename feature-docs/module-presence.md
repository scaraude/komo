# Module Présence

**Tickets** VIR-09 · VIR-10 · VIR-11 · VIR-12

## Ce que l'utilisateur peut faire

Déclarer s'il vient ou non (et à quel degré), indiquer les jours où il est dispo sur un event multi-jours, voir en temps réel combien de potes sont chauds.

## Statut de présence (VIR-09)

4 niveaux : 🔥 Chaud · 🤔 Probable · 😬 Pas sûr · ❌ Non

Optimistic UI via `useState` : le bouton s'active immédiatement, le Server Action persiste en arrière-plan. Pas de `useOptimistic` (il reverte au commit de la transition).

`lib/actions/presence.ts` → `updatePresence(slug, participantId, status)`

## Présence partielle par jour (VIR-10)

Visible uniquement sur les events multi-jours (`date_start !== date_end`). Une checkbox par jour entre `date_start` et `date_end`. Stocké en jsonb `participants.partial_days`.

Même pattern optimistic : `useState` + `updatePartialDays` en arrière-plan.

## Deadline + lien de relance (VIR-11)

Composant `DeadlineBar` affiché en mode event normal (pas sondage).

- Countdown "⏳ Deadline dans X jours"
- Compteur de non-répondants (`presence_status IS NULL`)
- Bouton "Copier le lien" → clipboard avec texte de relance pré-formaté
- Si créateur : input date pour modifier la deadline → `updateDeadline` dans `lib/actions/events.ts`

## Live counter temps réel (VIR-12)

Composant `LiveCounter` : 3 cards (Chauds / Hésitants / Out). Subscribe via Supabase Realtime sur `participants:event_id=eq.[id]`. Mise à jour sans re-fetch : mutation locale du state à chaque événement Postgres.

Deux onglets ouverts → changement de statut dans l'un → counter mis à jour dans l'autre en < 1s.

## Liste des participants

En bas de l'onglet Présence : chaque participant avec son avatar (initiale), son pseudo, son emoji de statut (ou `?`). Le participant courant est mis en avant (bordure terracotta).

## Fichiers

- `components/presence/PresenceToggle.tsx`
- `components/presence/PartialPresence.tsx`
- `components/presence/DeadlineBar.tsx`
- `components/presence/LiveCounter.tsx`
- `lib/actions/presence.ts`
