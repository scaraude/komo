-- Enable UUID extension
create extension if not exists "pgcrypto";

-- events
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  creator_token uuid not null default gen_random_uuid(),
  title         text not null,
  destination   text not null,
  date_start    date not null,
  date_end      date not null,
  presence_deadline date,
  created_at    timestamptz not null default now()
);

create index on public.events (slug);

-- participants
create table public.participants (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  pseudo          text not null,
  session_token   uuid not null,
  presence_status text check (presence_status in ('hot','maybe','unsure','no')),
  partial_days    jsonb,
  departure_city  text,
  luggage_size    text check (luggage_size in ('light','medium','large')),
  joined_at       timestamptz not null default now()
);

create index on public.participants (event_id);
create index on public.participants (session_token);

-- transport_legs
create table public.transport_legs (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  direction      text not null check (direction in ('aller','retour')),
  mode           text not null check (mode in ('car','rental','train','bus','navette')),
  driver_id      uuid references public.participants(id) on delete set null,
  label          text not null,
  departure_city text not null,
  departure_time timestamptz,
  total_seats    integer check (total_seats > 0),
  trunk_size     text check (trunk_size in ('small','medium','large')),
  link_url       text,
  created_at     timestamptz not null default now()
);

create index on public.transport_legs (event_id);
create index on public.transport_legs (event_id, direction);

-- transport_occupants
create table public.transport_occupants (
  id             uuid primary key default gen_random_uuid(),
  leg_id         uuid not null references public.transport_legs(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  is_driver      boolean not null default false,
  locked         boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (leg_id, participant_id)
);

create index on public.transport_occupants (leg_id);
create index on public.transport_occupants (participant_id);
