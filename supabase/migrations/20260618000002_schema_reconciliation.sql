-- ============================================================
-- Réconciliation schéma ↔ migrations.
--
-- Capture les objets créés hors-bande (dashboard/MCP) pour qu'un rebuild
-- depuis les migrations reproduise la prod. Tout est idempotent → no-op si
-- rejoué sur une base qui les a déjà.
--
-- Placé AVANT 20260619000005 (auth_identity), qui référence participants.role
-- et la policy delete de date_proposals : ces objets doivent exister d'abord.
-- ============================================================

-- ---------- participants.role ----------
alter table public.participants
  add column if not exists role text not null default 'participant';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'participants_role_check') then
    alter table public.participants
      add constraint participants_role_check
      check (role in ('créateur', 'co_organisateur', 'participant'));
  end if;
end $$;

-- ---------- events.event_type ----------
alter table public.events
  add column if not exists event_type text not null default 'autre';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'events_event_type_check') then
    alter table public.events
      add constraint events_event_type_check
      check (event_type in ('weekend', 'soiree', 'concert', 'road_trip', 'sport', 'autre'));
  end if;
end $$;

-- ---------- events : dates nullable (mode sondage) ----------
alter table public.events alter column date_start drop not null;
alter table public.events alter column date_end   drop not null;

-- ---------- date_proposals ----------
create table if not exists public.date_proposals (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  proposed_date date not null,
  created_by    uuid not null references public.participants(id) on delete cascade,
  votes         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists date_proposals_event_id on public.date_proposals(event_id);
alter table public.date_proposals enable row level security;

drop policy if exists "select public" on public.date_proposals;
create policy "select public" on public.date_proposals for select using (true);
drop policy if exists "insert participant" on public.date_proposals;
create policy "insert participant" on public.date_proposals for insert with check (true);
drop policy if exists "update participant" on public.date_proposals;
create policy "update participant" on public.date_proposals for update using (true);
-- (la policy delete reste définie dans 20260619000005)

-- ---------- accommodation_options ----------
create table if not exists public.accommodation_options (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  label           text not null,
  url             text,
  price_per_night numeric,
  proposed_by     uuid not null references public.participants(id) on delete cascade,
  votes           jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists accommodation_options_event_id on public.accommodation_options(event_id);
alter table public.accommodation_options enable row level security;

drop policy if exists "select public" on public.accommodation_options;
create policy "select public" on public.accommodation_options for select using (true);
drop policy if exists "insert participant" on public.accommodation_options;
create policy "insert participant" on public.accommodation_options for insert with check (true);
drop policy if exists "update participant" on public.accommodation_options;
create policy "update participant" on public.accommodation_options for update using (true);
