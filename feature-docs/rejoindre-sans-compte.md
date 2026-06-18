# Rejoindre sans compte

**Tickets** VIR-05 · VIR-06

## Ce que l'utilisateur peut faire

Rejoindre un event via un lien WhatsApp sans créer de compte. Le pseudo suffit. F5 = même session.

## Flux join

1. Arrivée sur `/e/[slug]` sans cookie session → redirect `/e/[slug]/join`
2. Page join : affiche le titre de l'event + input pseudo
3. Server Action `joinEvent` : génère `session_token = crypto.randomUUID()`, INSERT participant, pose le cookie, redirect `/e/[slug]`

## Stockage session

Cookie `komo_session_{slug}` — `httpOnly: false` intentionnellement pour que le JS client puisse le lire et l'envoyer dans les headers Supabase Realtime (connexions WebSocket). `SameSite: lax`, durée 1 an.

## Token créateur

À la création de l'event, un `creator_token` distinct est généré et stocké dans cookie `komo_creator_{slug}` — `httpOnly: true, SameSite: strict`. Comparé au `creator_token` en DB pour débloquer les actions admin :

- Modifier la deadline de présence
- Bouton ✨ auto-affecter le transport
- Bouton "Fixer ✓" une date dans le sondage

## RLS

Les tokens ne transitent jamais en clair dans les URLs. Les Server Actions les lisent via `getSessionToken(slug)` / `getCreatorToken(slug)` et les injectent dans les headers Supabase (`x-session-token`, `x-creator-token`). Les RLS policies lisent ces headers via `current_setting('request.headers')`.

## Invariants

- Deux navigateurs distincts = deux participants distincts
- Onglet privé = nouvelle session = nouveau participant
- Le créateur est le seul à avoir le `creator_token` dans son cookie

## Fichiers

- `lib/session.ts` — `getSessionToken`, `setSessionCookie`, `getCreatorToken`, `setCreatorCookie`
- `lib/actions/participants.ts` — `joinEvent`
- `app/e/[slug]/join/page.tsx`
