# Audit qualité de code & opportunités de refacto — Komo

> Date : 2026-06-22 · Périmètre : `app/`, `components/`, `lib/`, `supabase/migrations/` (~5 800 lignes)
> Stack : Next.js 16.2.6 (App Router, RSC, React 19) + Supabase + Tailwind v4

Codebase saine dans l'ensemble. Conventions Next 16 correctes (`params` async, `proxy.ts`, frontières RSC/client). Les vraies opportunités se regroupent en **3 chantiers structurels** + une **dette de naming** documentée.

Légende sévérité : 🔴 critique · 🟠 important · 🟡 qualité/cohérence

---

## 🔴 Critique

### 1. Dérive schéma ↔ migrations (vérifié à la main)

Les migrations versionnées **ne sont pas un historique fidèle du schéma**. La prod tourne parce que ces objets ont été créés hors-bande (dashboard / MCP).

| Objet | Utilisé par | Créé par une migration ? |
|---|---|---|
| `participants.role` | `is_event_organizer()` — RLS `SECURITY DEFINER` (`20260619000005:45`) | ❌ **jamais** (la table `participants` n'a pas de colonne `role`) |
| `events.event_type` | inséré à chaque `createEvent` (`lib/actions/events.ts:11,32`) | ❌ jamais |
| `date_proposals` (table) | `lib/actions/dates.ts`, `components/dates/DatePoll.tsx` ; une policy DELETE la référence | ❌ jamais de `create table` |
| `accommodation_options` (table) | `lib/actions/accommodation.ts`, `components/accommodation/AccommodationSection.tsx` | ❌ n'apparaît dans **aucune** migration |
| `events.date_start` / `date_end` | mode sondage (nullable attendu) | `not null` en SQL, `string \| null` en types |

**Conséquence forte :** `is_event_organizer()` référence une colonne `role` inexistante → toute policy RLS « organisateur » casse sur un schéma reconstruit depuis les migrations. `database.types.ts` est maintenu à la main (cf. ligne 1 « Placeholder types ») → c'est la cause racine de la dérive.

**Action :**
1. `supabase gen types typescript --linked` pour capturer le schéma réel.
2. Diff contre les migrations → écrire les migrations manquantes : `participants.role`, `events.event_type`, tables `date_proposals` & `accommodation_options`, nullabilité `date_start/date_end`.
3. Commiter les types régénérés + ajouter un diff de types en CI (cf. §9).

### 2. Modules non sécurisés (RLS permissive)

- `date_proposals` : policy `for delete using (true)` → n'importe qui peut supprimer n'importe quelle proposition (commentaire « dette de sécu » dans la migration). `accommodation_options` : aucune RLS en source.
- **Lost-update sur les votes** : `votes jsonb` en read-modify-write (`accommodation.ts:36`, `dates.ts:29`) → deux votants concurrents s'écrasent (last-write-wins sur toute la map). Envisager une table `vote` (1 ligne/vote) ou un `jsonb_set` atomique.

**Action :** au moment de créer les tables (§1), scoper toutes les écritures sur `is_event_member(event_id)`.

### 3. Écritures privilégiées sans contrôle d'ownership

Plusieurs actions font confiance à un `participantId` / `targetId` venu du client et s'appuient sur la seule RLS, **sans `.select()` ni vérification du nombre de lignes** → succès optimiste affiché même si 0 ligne touchée.

- `promoteParticipant` (`participants.ts:100`) — aucun check d'erreur ni retour
- `updatePresence` / `updatePartialDays` (`presence.ts`)
- `updateDepartureInfo` (`transport.ts:208`)
- `fixDate` (`dates.ts:40`) — 2 écritures destructrices sans check : peut wiper les `date_proposals` même si l'`update` de la date n'a rien changé.

**Action :** helper `mustSucceed(result, msg)` (vérifie `error` + nombre de lignes) appliqué partout. Le modèle correct existe déjà dans `deleteLeg` (`transport.ts:128`).

---

## 🟠 Important — chantiers structurels

### 4. Aucune couche UI partagée → duplication massive

Pas de `components/ui/`. Chaque panel ré-implémente from scratch, avec divergences (`rounded-[15px]` vs `[16px]` vs `[17px]`, `translate-y-1` vs `0.5`) :

- **Bouton CTA terracotta** : 7+ copies — `BouffePanel:230,651,696`, `ProposeVehicleForm:243`, `SuggestModal:70,102`, `AccommodationSection:129`, `DatePoll:150`, `LandingForm:150`
- **Modal / bottom-sheet** : le `Sheet` de `BouffePanel:554` ré-inliné dans `ProposeVehicleForm:85` et `SuggestModal:58` (sans `animate-sheet-up` ni `overflow-y-auto`)
- **Bouton « + » pointillé** ×4 (`ActivityPanel:199`, `TransportPanel:83`, `DatePoll:163`, `AccommodationSection:133`)
- **Card** ×6 (ombre `rgba(60,45,20,…)` codée en dur ~10×)
- **Pill vote/toggle** ×3, **avatar initiale** ×4 (dont 3 sans garde `pseudo[0]?` → crash sur pseudo vide : `ActivityCard:291`, `UnassignedZone:24`, `BouffePanel`)
- **Classes input/label** redéclarées par fichier (`ProposeVehicleForm` & `PointField` byte-identiques)

**Action :** créer `components/ui/` avec `Button`, `Sheet`, `Card`, `Avatar`, `DashedAddButton`, `form.ts`. Plus gros gain volume/risque.

### 5. Logique optimiste dupliquée → un hook

Le même triptyque `useState` + `useTransition` + mutate optimiste + `.catch(revert)` recopié dans ~7 composants : `BouffePanel` (×6 handlers), `CarCard:73`, `ActivityPanel:122`, `DatePoll:44`, `AccommodationSection:35`, `PresenceToggle:27`, `PartialPresence:82`.

Un `useOptimisticList<T>` retirerait ~80 lignes rien que dans `BouffePanel` et corrigerait un revert no-op buggé (`handleDeleteMeal`, `BouffePanel:185`, qui ne restaure pas le repas supprimé). Idem `useRealtimeTable(table, eventId, handlers)` pour le boilerplate `postgres_changes` (`ActivityPanel:67` + `LiveCounter:27`).

⚠️ Incohérence à trancher : seuls Activities/LiveCounter ont du realtime ; Meals/Dates/Accommodation/Transport sont optimistic-only → données périmées pour les autres utilisateurs.

### 6. `app/e/[slug]/page.tsx` (398 l.) : waterfall + sur-fetch

- **9 requêtes Supabase en série** (l.85-128) alors qu'elles sont indépendantes → ~300-450 ms de latence évitable. → `Promise.all` (seul `occupants` dépend de `legs`).
- **Sur-fetch** : la vue hub ne montre que des *counts* mais charge toutes les lignes des 5 modules ; une vue module charge les 4 autres modules inutilement. → gate par vue + `select('id', { count:'exact', head:true })` pour les counts du hub.
- **Décomposition** : extraire `loadEventData(slug, userId, view)` dans `lib/` + composants `<EventHub>` / `<EventModule>`.

### 7. `BouffePanel.tsx` (701 l.) à découper

14 composants/helpers dans un seul fichier. Le plus net : `DateCalendar` + `buildMonths` / `isoWeekdayIndex` / `getDaysBetween` / `WEEKDAYS` sont **dupliqués au byte près** dans `PartialPresence.tsx:6-61`.

**Action :** extraire `lib/calendar.ts` + `components/ui/EventCalendar.tsx` (consommé par les deux), puis sortir `MealsView` / `MealCard`, `ShoppingView`, et les forms (`MealForm` / `ProductForm` / `QtyUnit`).

### 8. Robustesse Next manquante

- **Zéro** `error.tsx` / `loading.tsx` / `not-found.tsx` dans tout `app/`. Une erreur (ex. `ensureUser` qui throw, panne Supabase) → page d'erreur Next brute. Ajouter au moins `app/error.tsx` + `app/e/[slug]/{error,loading}.tsx` (d'autant plus utile vu le fetch lourd en §6).
- **OG route** : `og/[slug]/route.tsx:14` renvoie une image **200 pour un slug inexistant** → devrait `return new Response(null, { status: 404 })`.
- **`connexion/page.tsx`** : `'use client'` + `await action()` manuel au lieu de `useActionState` → perd l'amélioration progressive ; incohérent avec `JoinForm.tsx` qui le fait bien.

---

## 🟡 Qualité / cohérence

### 9. Tests & outillage

- **Pas de script `test` ni `typecheck`** dans `package.json` (vitest présent mais lancé via `npx`). La dérive §1 serait visible en CI avec `tsc --noEmit`. → ajouter `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`, et un diff de types en CI.
- Tests existants (`lib/transport/solver`, `lib/activities/cost`) corrects. **Zéro test sur les server actions** (caps sièges/participants = logique métier non couverte par la RLS) et **zéro test RLS**.
- `test-e2e.mjs` **tape la prod** (`komo-skarods-projects.vercel.app`) → crée des events poubelle à chaque run ; `waitForTimeout` flaky ; non câblé dans npm. → pointer `BASE` sur un preview/local, ajouter `"test:e2e"`.
- `tsconfig` : `target: ES2017` daté pour Next 16 / Node 20 (→ `ES2022`) ; `noUncheckedIndexedAccess` off.

### 10. Naming FR dans identifiants (AGENTS.md = bug)

**Nouveaux (sans excuse de migration) :**
- `isSondage` → `isPoll` (`page.tsx:95+`)
- `BouffePanel` / `bouffeCount` → `MealsPanel` / `groceryCount`
- `pseudoOf` (fn locale), `soiree` (vibe), `name="sondage"` (`LandingForm`)

**Dette documentée à migrer quand on touche transport :**
- `hasBillet` / `isBillet` → `hasTicket` / `isTicketed`
- `'aller'` / `'retour'` → `'outbound'` / `'return'`
- `'navette'` → `'shuttle'`
- `participants.role` tokens `'créateur'` / `'co_organisateur'` → `'creator'` / `'co_organizer'`

**Nouveau token FR non documenté :** `unit text not null default 'unité'` (`20260619000008:5`) — à arbitrer (`'unit'` + traduction UI ?).

### 11. Type safety & validation

- Casts non sûrs depuis `FormData` : `mode` (`transport.ts:25`), `trunk_size` (`:38`), `event_type` (`events.ts:11`) castés sans validation contre l'ensemble autorisé.
- `votes as Record<string, boolean>` répété (`DatePoll` ×4, `AccommodationSection` ×3) alors que `database.types.ts` le type déjà → casts morts. Définir un type `Votes` + accesseurs (`countVotes`, `hasVoted`, `toggleVote`).
- Validation `NaN` absente : `parseFloat(priceRaw)` (`accommodation.ts:16`), `parseInt(...) + 1` (`transport.ts:37`) → `NaN` inséré en base.
- `signedPeople` : `.filter(Boolean) as Person[]` (`ActivityPanel:187`) → utiliser un type-guard `(p): p is Person => Boolean(p)`.

### 12. Cohérence data layer

- **`createClient()` vs `ensureUser()`** appliqués incohéremment sur les écritures — les commentaires du code (`meals.ts:7`, `transport.ts:9`) avertissent eux-mêmes du risque « RLS rejette en anonyme ». Standardiser sur `ensureUser()` partout.
- **`revalidatePath` manquant** sur `updateDeadline`, `joinLeg` / `leaveLeg`, presence — incohérent dans `transport.ts` lui-même (où `createLeg`/`deleteLeg` le font).
- **Date formatting dupliqué ×4** (`page.tsx:51`, `mes-komos:9`, `join/page.tsx`, `og/route.tsx:20`) + **bug timezone** : `join/page.tsx:41` parse `YYYY-MM-DD` sans garde `T12:00:00` → jour précédent en fuseau négatif. Extraire `formatEventDates()`.
- Paramètres `slug` inutilisés (presence, transport join/leave) → soit s'en servir pour `revalidate`, soit les retirer.

### 13. Sécurité diverse

- **`emailRedirectTo`** construit depuis `x-forwarded-host` / `x-forwarded-proto` spoofables (`auth.ts:8`) → préférer `clientEnv.siteUrl`. Vecteur open-redirect dans les emails d'auth.
- Index FK manquants (Postgres n'indexe pas les FK automatiquement) : `transport_legs.driver_id`, `transport_legs.created_by` (utilisé dans la subquery RLS de delete), `meals/products/activities.created_by`.
- Index redondant : `create index on events (slug)` alors que `slug` est déjà `unique` (`20260523000001:17`).

### 14. Accessibilité

- Boutons icône-seule sans `aria-label` : `🗑` (`BouffePanel:401,529`), `✕` (`ActivityCard:264`, `MealForm:636`).
- Modals sans `role="dialog"` / `aria-modal` / focus-trap / Escape (`Sheet`, `ProposeVehicleForm`, `SuggestModal`).
- Barres de progression décoratives sans `role="progressbar"` (`ActivityCard:282`, `DatePoll:128`, `AccommodationSection:91`).
- Groupes de boutons radio (`ActivityForm` price-mode) sans `role="radiogroup"` / `aria-pressed`.

---

## Ordre d'attaque recommandé

1. **Régénérer les types + migrations manquantes** (§1) — débloque tout le reste et révèle le vrai schéma.
2. **Sécuriser `date_proposals` / `accommodation_options` + helper `mustSucceed`** (§2, §3).
3. **Scripts `test` / `typecheck` + CI** (§9) — pour ne plus dériver en silence.
4. **`components/ui/` + `useOptimisticList`** (§4, §5) — plus gros gain de volume.
5. **`Promise.all` + gating page event** (§6) + **error/loading boundaries** (§8).
6. **Split BouffePanel + calendrier partagé** (§7) + passe naming (§10).

---

## Notes positives

- `PlaceAutocomplete.tsx` : composant le mieux factorisé (contrôlé, navigation clavier, fetch annulable) — bon modèle de référence.
- `proxy.ts` : convention Next 16 correcte (export nommé + `config.matcher`, refresh session Supabase).
- `eslint.config.mjs` : bon garde-fou `no-restricted-syntax` interdisant `process.env` hors `lib/env`.
- `mes-komos/page.tsx` : pattern 2-requêtes propre, pas de N+1.
- Tests `solver` / `cost` : couverture solide et de bonne qualité.
