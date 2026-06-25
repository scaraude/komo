-- ============================================================
-- Drag & drop des participants sur la page transport.
--
-- Le ticket exige que N'IMPORTE QUEL membre de l'event puisse
-- déplacer N'IMPORTE QUI entre les véhicules et la zone « non
-- affectés ». Les policies actuelles (20260619000005) limitaient
-- insert/delete au participant lui-même OU à un organisateur.
--
-- On recrée occupants_insert / occupants_delete pour autoriser tout
-- MEMBRE de l'event auquel appartient le leg, via le helper existant
-- public.is_event_member(uuid) (SECURITY DEFINER, défini dans
-- 20260619000007_food_meals_products.sql).
-- ============================================================

drop policy if exists "occupants_insert" on public.transport_occupants;
drop policy if exists "occupants_delete" on public.transport_occupants;

create policy "occupants_insert" on public.transport_occupants for insert
  with check (exists (
    select 1 from public.transport_legs l
    where l.id = transport_occupants.leg_id and public.is_event_member(l.event_id)
  ));

create policy "occupants_delete" on public.transport_occupants for delete
  using (exists (
    select 1 from public.transport_legs l
    where l.id = transport_occupants.leg_id and public.is_event_member(l.event_id)
  ));
