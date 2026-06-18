# Module Bouffe

**Ticket** VIR-23

## Ce que l'utilisateur peut faire

Organiser les repas collectifs : ajouter des créneaux repas (déjeuner / dîner) pour chaque jour de l'event, et s'inscrire pour apporter quelque chose.

## Structure

- **Slot** = un repas (midi ou soir) pour un jour donné, créé à la demande
- **Contribution** = un participant apporte `what` pour `for_count` personnes dans un slot

## Par jour

Pour chaque jour entre `date_start` et `date_end`, deux boutons "Ajouter déjeuner" / "Ajouter dîner". Cliquer crée le slot optimistement et le persiste via `addMealSlot`.

Une fois le slot créé, la card affiche :
- La liste des contributions avec nom du participant
- Un indicateur de couverture coloré
- Le bouton "+ Je m'occupe de…"

## Indicateur de couverture

```
0 couvert        → "Rien prévu"      terracotta
< totalParticipants → "X/N couverts"  amber
≥ totalParticipants → "N/N couverts"  olive
```

`totalParticipants` = participants avec `presence_status IN ('hot', 'maybe', 'unsure')`.

## Ajouter une contribution

Formulaire inline `ContribForm` : texte libre (ex: "Tiramisu") + stepper pour le nombre de personnes (1–20, défaut 4). Insert optimiste, puis `addContribution` en arrière-plan.

Un participant peut supprimer uniquement ses propres contributions (bouton ✕ visible si `c.participant_id === participantId`).

## Cas sondage

Si l'event est en mode sondage (dates null), `eventDays` est vide → `MealGrid` n'affiche aucun jour.

## Fichiers

- `components/meals/MealGrid.tsx`
- `lib/actions/meals.ts` — `addMealSlot`, `addContribution`, `removeContribution`
