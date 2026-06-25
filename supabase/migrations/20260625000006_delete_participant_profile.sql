-- Suppression d'un profil SANS compte par un membre de l'event.
-- Ne concerne QUE les profils non rattachés à un compte (user_id null) : une
-- vraie personne part via « Quitter le Komo » (participants_delete_self).
-- is_event_member est SECURITY DEFINER → pas de récursion RLS sur participants.
create policy "participants_delete_profile_by_member" on public.participants for delete
  using (user_id is null and public.is_event_member(event_id));
