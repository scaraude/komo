-- ============================================================
-- Refonte du module bouffe : repas + produits.
--
--  • products  : un article. Libre (meal_id null → seulement dans la liste de
--                courses) ou rattaché à un repas. `tags` = libellés perso libres
--                (goûter, apéro…). `checked` = coché dans la liste de courses,
--                état PARTAGÉ. Pas de "qui l'apporte" : liste collective.
--  • meals     : un repas nommé qui regroupe des produits.
--
-- Deux vues côté UI : liste de courses (tous les products, cochables) et liste
-- des repas (chacun avec ses products).
--
-- Remplace meal_slots / meal_contributions (données de test jetables).
-- RLS en auth.uid() (membre de l'event) — on resserre ce module, fini le "true".
-- ============================================================

create table public.meals (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  label      text not null,
  created_by uuid references public.participants(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.meals (event_id);

create table public.products (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  meal_id    uuid references public.meals(id) on delete set null,
  name       text not null,
  tags       text[] not null default '{}',
  checked    boolean not null default false,
  created_by uuid references public.participants(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.products (event_id);
create index on public.products (meal_id);

-- Helper : l'utilisateur courant est-il membre de l'event ?
-- SECURITY DEFINER pour contourner la RLS de participants (pas de récursion).
create or replace function public.is_event_member(p_event uuid)
  returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from public.participants
      where event_id = p_event and user_id = auth.uid()
    );
  $$;

alter table public.meals    enable row level security;
alter table public.products enable row level security;

-- Lecture publique (comme le reste de l'app) ; écritures réservées aux membres.
create policy "meals_select_public" on public.meals for select using (true);
create policy "meals_insert_member" on public.meals for insert with check (public.is_event_member(event_id));
create policy "meals_update_member" on public.meals for update using (public.is_event_member(event_id));
create policy "meals_delete_member" on public.meals for delete using (public.is_event_member(event_id));

create policy "products_select_public" on public.products for select using (true);
create policy "products_insert_member" on public.products for insert with check (public.is_event_member(event_id));
create policy "products_update_member" on public.products for update using (public.is_event_member(event_id));
create policy "products_delete_member" on public.products for delete using (public.is_event_member(event_id));

-- Ancien modèle (remplacé). meal_contributions référence meal_slots → ordre.
drop table if exists public.meal_contributions;
drop table if exists public.meal_slots;
