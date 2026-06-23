# Réconciliation schéma ↔ migrations — diagnostic & plan

> Date : 2026-06-23 · Source : schéma réel du projet lié `ndoryaqqywaqdsthlkba`
> (API Management Supabase, lecture seule) comparé aux migrations versionnées.
> **Aucune migration n'a été appliquée. À valider avant tout merge / push.**

## Méthode

1. Types régénérés depuis le projet lié (`supabase gen types typescript --linked`)
   pour révéler la forme réelle (non commité — régénérable à la demande).
2. Introspection DDL exacte (colonnes, defaults, contraintes, RLS, fonctions,
   index) via `POST /v1/projects/{ref}/database/query`.
3. Diff contre `supabase/migrations/`.

## Dérive constatée (prod ≠ migrations)

| Objet | Prod (réel) | Migrations | Conséquence sur un rebuild |
|---|---|---|---|
| `participants.role` | `text not null default 'participant'`, CHECK `('créateur','co_organisateur','participant')` | ❌ jamais créé | `is_event_organizer()` (migration `…000005`) référence `role` → **création de la fonction échoue** |
| `events.event_type` | `text not null default 'autre'`, CHECK 6 valeurs | ❌ jamais créé | insert `createEvent` casse |
| `date_proposals` (table) | existe + RLS + 4 policies | ❌ jamais de `create table` (seule la policy DELETE est dans `…000005`) | la policy DELETE de `…000005` casse (table absente) |
| `accommodation_options` (table) | existe + RLS + 3 policies | ❌ aucune trace | module hébergement casse |
| `events.date_start/date_end` | **nullable** | `not null` (migration initiale) | mode sondage impossible (insert null rejeté) |

## Trous de sécurité (RLS permissive — §2)

Policies réelles relevées :

- `date_proposals` : `delete using(true)` → **n'importe qui supprime n'importe quelle proposition** ; `insert/update` également `true`.
- `accommodation_options` : `insert/update` `true` → écriture par n'importe qui.
- Les deux `select using(true)` (lecture publique — acceptable pour un event partagé, laissé tel quel).

Helper disponible pour resceller : `is_event_member(p_event uuid)` (SECURITY DEFINER, déjà en base et dans la migration `…000007`).

## Index (§13)

- `events_slug_idx` **redondant** avec `events_slug_key` (unique sur `slug`).
- FK non indexées : `transport_legs.driver_id`, `transport_legs.created_by`
  (cette dernière utilisée dans la sous-requête RLS de delete).

## Plan (3 migrations brouillon + 1 helper)

1. **`20260618000002_schema_reconciliation.sql`** — rattrape l'historique pour
   qu'un rebuild = prod. Idempotent (`add column / create table / drop policy …
   if (not) exists`), donc **no-op si rejoué sur prod**. Placé **avant**
   `…000005` pour que `role` et `date_proposals` existent quand `…000005` les
   référence. **Zéro changement de comportement.**

2. **`20260623000002_secure_polls_accommodation_rls.sql`** — §2. Resserre les
   policies d'écriture `date_proposals` / `accommodation_options` sur
   `is_event_member(event_id)`. **Change le comportement RLS** → à appliquer en
   connaissance de cause.

3. **`20260623000003_fk_indexes.sql`** — §13. Ajoute les index FK manquants,
   supprime l'index slug redondant. Sans risque fonctionnel.

4. **`lib/actions/assert.ts`** — §3. Helper `mustSucceed(result, msg)` (vérifie
   `error` + lignes touchées). Fourni ; à câbler sur les écritures qui font
   confiance à un id client sans `.select()` :
   `promoteParticipant`, `updatePresence`, `updatePartialDays`,
   `updateDepartureInfo`, `fixDate`. Câblage = changement de comportement
   (throw si 0 ligne) → fait dans une passe dédiée après validation.

## Lost-update sur les votes (note, non corrigé ici)

`votes jsonb` en read-modify-write côté serveur → deux votants concurrents
s'écrasent. Correctif structurel (table `vote` 1 ligne/vote, ou `jsonb_set`
atomique) hors de cette passe de réconciliation — à arbitrer séparément.

## Adoption des types générés (suivi)

`lib/database.types.generated.ts` est le schéma réel. Le remplacement de
`lib/database.types.ts` (maintenu à la main) par ces types + un diff de types
en CI est la cause-racine à traiter — fait dans une PR dédiée (impact typecheck
à absorber sur tout l'app).
