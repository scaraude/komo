-- ============================================================
-- Auteur d'un trajet (indépendant du conducteur)
-- ============================================================
-- Avant, l'auteur d'un trajet était toujours son `driver_id`. Depuis le toggle
-- « je suis le chauffeur », un trajet peut avoir `driver_id` null (proposé sans
-- y monter) — il devenait alors impossible à supprimer par son auteur. On trace
-- donc explicitement l'auteur.

alter table public.transport_legs
  add column created_by uuid references public.participants(id) on delete set null;

-- Backfill : pour les trajets existants, l'auteur était le conducteur.
update public.transport_legs set created_by = driver_id where created_by is null;

-- La suppression est désormais réservée à l'auteur (et non plus au conducteur).
drop policy if exists "legs_delete_driver" on public.transport_legs;
create policy "legs_delete_author" on public.transport_legs for delete
  using (
    created_by in (
      select id from public.participants
      where session_token = (current_setting('request.headers', true)::json->>'x-session-token')::uuid
    )
  );
