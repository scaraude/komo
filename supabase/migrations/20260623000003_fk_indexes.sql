-- ============================================================
-- §13 — Index sur les clés étrangères (Postgres ne les crée pas seul) et
-- suppression de l'index slug redondant. Sans risque fonctionnel.
-- ============================================================

create index if not exists transport_legs_driver_id_idx  on public.transport_legs(driver_id);
create index if not exists transport_legs_created_by_idx  on public.transport_legs(created_by);
create index if not exists meals_created_by_idx           on public.meals(created_by);
create index if not exists products_created_by_idx        on public.products(created_by);
create index if not exists activities_created_by_idx      on public.activities(created_by);

-- redondant avec l'index unique events_slug_key
drop index if exists public.events_slug_idx;
