-- ============================================================
-- Auth identity — bascule des tokens-headers anonymes vers Supabase
-- Auth (auth.uid()).
--
--  • participants.user_id  -> auth.users  (remplace session_token)
--  • events.created_by     -> auth.users  (remplace creator_token)
--  • dédoublonnage : un seul participant par (event, user)
--  • RLS réécrite en auth.uid() sur events / participants / transport_*
--
-- Colonnes ajoutées NULLABLE : les anciennes lignes de test restent
-- inertes (user_id NULL) sans rien casser ; on resserrera en NOT NULL
-- après reset propre.
--
-- Hors scope ("on y revient") : bouffe/dates/héberg. ont des policies
-- permissives (true), non couplées à l'identité — on ne touche pas leur
-- sécu ici, juste leur client applicatif. Dette notée.
-- ============================================================

-- ---------- Colonnes d'identité ----------
alter table public.participants
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.participants
  alter column session_token drop not null;

-- un seul participant par (event, user) ; les NULL (anciennes lignes)
-- n'entrent pas en conflit grâce au partial index.
create unique index if not exists participants_event_user_key
  on public.participants (event_id, user_id)
  where user_id is not null;

alter table public.events
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- ---------- Helper : organisateur d'un event ----------
-- SECURITY DEFINER => contourne la RLS de participants, ce qui évite la
-- récursion quand on l'appelle DANS une policy de participants.
create or replace function public.is_event_organizer(p_event uuid)
  returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from public.participants
      where event_id = p_event
        and user_id = auth.uid()
        and role in ('créateur', 'co_organisateur')
    );
  $$;

-- ============================================================
-- RLS — réécriture des policies basées sur l'identité
-- ============================================================

-- ---- events ----
drop policy if exists "events_insert_anon"    on public.events;
drop policy if exists "events_update_creator" on public.events;
create policy "events_insert_self" on public.events for insert
  with check (created_by = auth.uid());
create policy "events_update_creator" on public.events for update
  using (created_by = auth.uid());

-- ---- participants ----
drop policy if exists "participants_insert_anon" on public.participants;
drop policy if exists "participants_update_own"  on public.participants;
-- on ne peut insérer qu'une ligne pour SOI
create policy "participants_insert_self" on public.participants for insert
  with check (user_id = auth.uid());
-- on modifie sa propre ligne, ou n'importe laquelle si on est orga (promote)
create policy "participants_update_own_or_org" on public.participants for update
  using (user_id = auth.uid() or public.is_event_organizer(event_id));

-- ---- transport_legs ----
drop policy if exists "legs_insert_participant" on public.transport_legs;
drop policy if exists "legs_delete_author"      on public.transport_legs;
create policy "legs_insert_member" on public.transport_legs for insert
  with check (exists (
    select 1 from public.participants p
    where p.event_id = transport_legs.event_id
      and p.user_id = auth.uid()
  ));
create policy "legs_delete_author" on public.transport_legs for delete
  using (created_by in (
    select id from public.participants where user_id = auth.uid()
  ));

-- ---- transport_occupants ----
-- insert/delete : soi-même, OU un orga qui gère les affectations de son event
drop policy if exists "occupants_insert_participant" on public.transport_occupants;
drop policy if exists "occupants_delete_own"         on public.transport_occupants;
create policy "occupants_insert" on public.transport_occupants for insert
  with check (
    participant_id in (select id from public.participants where user_id = auth.uid())
    or exists (
      select 1 from public.transport_legs l
      where l.id = transport_occupants.leg_id
        and public.is_event_organizer(l.event_id)
    )
  );
create policy "occupants_delete" on public.transport_occupants for delete
  using (
    participant_id in (select id from public.participants where user_id = auth.uid())
    or exists (
      select 1 from public.transport_legs l
      where l.id = transport_occupants.leg_id
        and public.is_event_organizer(l.event_id)
    )
  );

-- ---- date_proposals : delete manquait (fixDate en a besoin) ----
-- Table déjà permissive (insert/update/select = true) ; on reste cohérent.
-- Dette de sécu de tout ce module : à traiter quand on revient sur la bouffe.
drop policy if exists "date_proposals delete" on public.date_proposals;
create policy "date_proposals delete" on public.date_proposals for delete using (true);
