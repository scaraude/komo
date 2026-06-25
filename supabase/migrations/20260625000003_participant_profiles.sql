-- Profils participants SANS compte.
--
-- Jusqu'ici un membre ne pouvait insérer QUE sa propre ligne
-- (participants_insert_self : user_id = auth.uid()). On autorise en plus tout
-- membre de l'event à créer un « profil » sans compte (user_id null) — pour
-- ajouter des potes qui n'ont pas encore rejoint. Les policies INSERT étant
-- combinées en OR, les deux cas coexistent.
--
-- is_event_member est SECURITY DEFINER → pas de récursion RLS sur participants.
create policy "participants_insert_profile_by_member" on public.participants for insert
  with check (user_id is null and public.is_event_member(event_id));
