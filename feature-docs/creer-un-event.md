# Créer un event

**Tickets** VIR-07 · VIR-08 · VIR-19

## Ce que l'utilisateur peut faire

Créer un event en un seul écran (la landing `/`) : nom, destination (autocomplete
Geoapify), dates, vibe facultative, email facultatif. Obtenir un lien court à
partager sur WhatsApp.

## Formulaire unique — `app/LandingForm.tsx`

Un seul écran, pas d'étape de sélection de type au préalable. Champs :

- **Nom du Komo** — requis.
- **Où ça ?** — destination, requis, via `PlaceAutocomplete` (proxy `/api/places`).
- **Quand** — deux champs date. Toggle « Pas encore de date ? » → masque les
  dates, pose `sondage=1` ; `createEvent` stocke `date_start`/`date_end` à `null`.
  La page event bascule alors en mode sondage (tab « Dates 📅 » au lieu de « Présence »).
- **Une vibe ? · facultatif** — chips ; aucune sélection ⇒ `event_type = 'autre'`.
- **Ton email · facultatif** — affiché seulement si l'identité n'a pas déjà un email
  lié (`showEmail`). Sert à retrouver ses Komos.

La vibe influe sur le wording dans toute l'app :

| Type | Eyebrow sur la page event | Question présence |
|---|---|---|
| Week-end 🏔️ | Komo · week-end | tu viens ? |
| Soirée 🎉 | Komo · soirée | tu viens ? |
| Concert 🎸 | Komo · concert | tu y vas ? |
| Road trip 🚗 | Komo · road trip | t'embarques ? |
| Sport ⚽ | Komo · sport | tu joues ? |
| Autre ✨ | Komo · ton event | tu es là ? |

## Après soumission

Server Action `createEvent` :
1. Génère `slug = nanoid(8)` (identifiant URL court)
2. Génère `creator_token = crypto.randomUUID()` (stocké en cookie httpOnly)
3. INSERT dans `events`
4. Redirect vers `/e/[slug]/join`

## Page event `/e/[slug]`

Server Component. Vérifie le cookie session → redirige vers `/join` si absent. Affiche header (titre, dates, destination), live counter, deadline bar, puis les tabs selon le mode.

**Tabs en mode normal** : Présence · Transport · 🍽️ Bouffe · Frais (Frais = placeholder désactivé)  
**Tabs en mode sondage** : Dates 📅 · Transport · 🍽️ Bouffe · Frais

## Open Graph

`app/e/[slug]/layout.tsx` génère une `og:image` pointant vers `/api/og/[slug]` (edge function, `@vercel/og`). L'image affiche le titre, la date, la destination, et les compteurs de présence — générée à la demande pour refléter l'état réel au moment du partage.

## Fichiers

- `app/LandingForm.tsx` — Client Component, formulaire unique (landing `/`)
- `app/page.tsx` — rend `LandingForm`
- `app/DestinationField.tsx` — wrapper autocomplete destination
- `lib/actions/events.ts` — `createEvent`, `updateDeadline`
- `app/e/[slug]/page.tsx` — page principale
- `app/e/[slug]/layout.tsx` — metadata + OG
- `app/api/og/[slug]/route.tsx` — image OG (edge runtime)
