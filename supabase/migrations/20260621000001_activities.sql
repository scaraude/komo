-- ============================================================
-- Module Activités (VIR-24).
--
--  • activities       : une activité proposée. Prix optionnel avec un MODE de
--                       découpage (`price_type`) :
--                         - 'total'      → prix total fixe, divisé entre inscrits
--                         - 'per_person' → prix par personne, total = prix × inscrits
--                         - 'per_group'  → prix par groupe/unité (ex : court de
--                                          padel à 2), per-pers = prix / group_size
--                       `group_size` = taille d'un groupe (contrainte d'affichage
--                       + calcul du coût, pas d'attribution nominative).
--                       `max_participants` null = inscriptions illimitées.
--                       Pas de champ `confirmed` : le statut de validation suit
--                       celui de l'event pour l'instant.
--  • activity_signups : inscriptions (s'inscrire / se désinscrire). Plafonné à
--                       max_participants côté server action (pas en RLS).
--
-- RLS en auth.uid() via is_event_member (helper défini dans le module bouffe) :
-- lecture publique, écritures réservées aux membres de l'event.
-- ============================================================

create table public.activities (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events(id) on delete cascade,
  label            text not null,
  activity_date    date,
  start_time       time,
  price            numeric check (price >= 0),
  price_type       text check (price_type in ('total', 'per_person', 'per_group')),
  group_size       integer check (group_size > 0),
  min_participants integer check (min_participants >= 0),
  max_participants integer check (max_participants > 0),
  booking_url      text,
  created_by       uuid references public.participants(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index on public.activities (event_id);

create table public.activity_signups (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  activity_id    uuid not null references public.activities(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (activity_id, participant_id)
);
create index on public.activity_signups (activity_id);
create index on public.activity_signups (event_id);

alter table public.activities       enable row level security;
alter table public.activity_signups enable row level security;

-- Lecture publique (comme le reste de l'app) ; écritures réservées aux membres.
create policy "activities_select_public" on public.activities for select using (true);
create policy "activities_insert_member" on public.activities for insert with check (public.is_event_member(event_id));
create policy "activities_update_member" on public.activities for update using (public.is_event_member(event_id));
create policy "activities_delete_member" on public.activities for delete using (public.is_event_member(event_id));

create policy "activity_signups_select_public" on public.activity_signups for select using (true);
create policy "activity_signups_insert_member" on public.activity_signups for insert with check (public.is_event_member(event_id));
create policy "activity_signups_delete_member" on public.activity_signups for delete using (public.is_event_member(event_id));

-- Realtime : la liste et les inscriptions se mettent à jour en live.
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.activity_signups;
