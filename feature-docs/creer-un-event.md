# Créer un event

**Tickets** VIR-07 · VIR-08 · VIR-19

## Ce que l'utilisateur peut faire

Créer un event en 2 étapes : choisir le type, puis remplir les détails (titre, destination, dates). Obtenir un lien court à partager sur WhatsApp.

## Étape 1 — Sélection du type

Grille 2×3 de cards. Le type choisi influe sur le wording dans toute l'app.

| Type | Eyebrow sur la page event | Question présence |
|---|---|---|
| Week-end 🏕️ | Komo · week-end | tu viens ? |
| Soirée 🎉 | Komo · soirée | tu viens ? |
| Concert 🎵 | Komo · concert | tu y vas ? |
| Road trip 🚗 | Komo · road trip | t'embarques ? |
| Sport ⚽ | Komo · sport | tu joues ? |
| Autre ✨ | Komo · ton event | tu es… |

## Étape 2 — Formulaire détails

Champs : titre, destination (placeholder adapté au type), dates début/fin.

**Mode sondage** : toggle "Pas sûr des dates ?" → les champs date disparaissent, `date_start` et `date_end` sont stockés `null`. La page event bascule automatiquement en mode sondage (tab "Dates 📅" à la place de "Présence").

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

- `app/new/NewEventForm.tsx` — Client Component 2 étapes
- `app/new/page.tsx`
- `lib/actions/events.ts` — `createEvent`, `updateDeadline`
- `app/e/[slug]/page.tsx` — page principale
- `app/e/[slug]/layout.tsx` — metadata + OG
- `app/api/og/[slug]/route.tsx` — image OG (edge runtime)
