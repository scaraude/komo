-- ============================================================
-- Édition des trajets : policy UPDATE manquante sur transport_legs.
--
-- Les autres entités éditables (activities / meals / products) ont déjà une
-- policy UPDATE en `is_event_member`. transport_legs n'en avait aucune (seuls
-- insert/delete/select existaient, cf. 20260619000005_auth_identity.sql), donc
-- tout UPDATE partait silencieusement à 0 ligne. On l'ajoute, alignée sur la
-- même règle « tout membre de l'event peut modifier ».
--
-- Note de cohérence : la suppression reste réservée à l'auteur
-- (legs_delete_author) ; l'édition est ouverte à tous les membres comme pour la
-- bouffe et les activités. Si on veut resserrer plus tard (auteur/orga), le
-- helper public.is_event_organizer existe déjà.
-- ============================================================

create policy "legs_update_member" on public.transport_legs for update
  using (exists (
    select 1 from public.participants p
    where p.event_id = transport_legs.event_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.participants p
    where p.event_id = transport_legs.event_id
      and p.user_id = auth.uid()
  ));
