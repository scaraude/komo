-- ============================================================
-- Repas : date associée + responsables (many-to-many).
--
--  • meals.meal_date : jour de l'event associé au repas (optionnel). Affiché
--    comme un tag côté UI « pour l'instant » — pas de regroupement/tri dédié.
--    Type `date` (pas timestamptz) : un repas est rattaché à un jour, pas une
--    heure précise.
--  • meal_owners : qui s'inscrit comme responsable d'un repas. Many-to-many
--    meals ↔ participants. event_id dénormalisé pour la RLS is_event_member,
--    comme products (le helper prend un event_id, pas de jointure dans la policy).
-- ============================================================

alter table public.meals
  add column if not exists meal_date date;

create table public.meal_owners (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  meal_id        uuid not null references public.meals(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (meal_id, participant_id)
);
create index on public.meal_owners (meal_id);
create index on public.meal_owners (participant_id);

alter table public.meal_owners enable row level security;

-- Lecture publique (comme le reste du module bouffe) ; écritures réservées aux
-- membres de l'event.
create policy "meal_owners_select_public" on public.meal_owners for select using (true);
create policy "meal_owners_insert_member" on public.meal_owners for insert with check (public.is_event_member(event_id));
create policy "meal_owners_delete_member" on public.meal_owners for delete using (public.is_event_member(event_id));
