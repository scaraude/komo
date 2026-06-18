# Module Transport

**Tickets** VIR-13 · VIR-14 · VIR-15 · VIR-16 · VIR-17 · VIR-18 · VIR-21

## Ce que l'utilisateur peut faire

Proposer un trajet, rejoindre la voiture d'un pote, voir qui n'a pas encore de solution de transport, et (si créateur) lancer une suggestion automatique d'affectation.

## Grille de trajets (VIR-13 · VIR-15)

Toggle **→ Aller / ← Retour** filtre les trajets affichés (state local, pas de navigation). Chaque trajet est une CarCard :

- Header : icône mode, label, ville départ, heure, pill "X libre(s)" / "Complet"
- Body : liste des occupants (avatar initiale + pseudo), places vides cliquables ("+ Rejoindre")
- Footer : lien réservation si fourni

Actions : `joinLeg` (rejoindre) · `leaveLeg` (quitter — passager uniquement, pas conducteur).

**Modes de transport** : 🚗 Voiture · 🚙 Location · 🚆 Train · 🚌 Bus · 🚐 Navette

## Proposer un trajet (VIR-13)

Modal `ProposeVehicleForm` : mode, libellé, ville départ, heure, nb places (stepper), coffre, lien. Server Action `createLeg` insère le leg puis ajoute le créateur comme conducteur dans `transport_occupants`.

## Informations passager (VIR-14)

`updateDepartureInfo(slug, participantId, city, luggageSize)` → UPDATE `participants.departure_city` + `luggage_size`. Affiché dans les chips de la zone sans transport (🎒 léger · 🧳 moyen · 🪣 gros).

## Zone "sans transport" (VIR-16) — le hook différenciateur

Participants avec `presence_status IN ('hot', 'maybe', 'unsure')` et sans entrée dans `transport_occupants` pour la direction active. Fond rayé diagonal terracotta, dot animé, chips avec ville + bagages. Masquée si tout le monde est casé.

C'est la raison d'être de l'app : rendre immédiatement visible qui est bloqué, sans parcourir une liste.

## Solveur d'affectation (VIR-21)

Bouton ✨ visible uniquement pour le créateur quand `unassigned.length > 0`.

**`lib/transport/solver.ts`** — pure function, zéro Supabase :
```
computeSuggestions(unassigned, legs, occupants) → Assignment[]
```
Algorithme glouton : pour chaque non-assigné, cherche un leg avec des places libres en priorisant la correspondance de ville de départ, puis le plus de places disponibles.

Modal `SuggestModal` en 2 phases : calculer → preview des affectations → confirmer ou annuler. `applyAssignments` fait un batch INSERT en évitant les doublons.

Le solver est couvert par 5 tests Vitest (`lib/transport/solver.test.ts`).

## Temps réel (VIR-18)

Subscribe Realtime sur `transport_legs` et `transport_occupants`. Mutations locales du state (pas de re-fetch) : INSERT → push, DELETE → filter. La zone sans transport se recalcule instantanément depuis le state.

## Fichiers

- `components/transport/TransportPanel.tsx` — orchestrateur
- `components/transport/CarCard.tsx`
- `components/transport/ProposeVehicleForm.tsx`
- `components/transport/UnassignedZone.tsx`
- `components/transport/SuggestModal.tsx`
- `lib/transport/solver.ts`
- `lib/transport/solver.test.ts`
- `lib/actions/transport.ts`
