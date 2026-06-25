-- Revendiquer un profil sans compte : passer son user_id de null à soi-même.
-- USING filtre les lignes revendicables (user_id null) ; WITH CHECK garantit
-- qu'on ne peut l'attribuer qu'à soi. S'ajoute (OR) à participants_update_own_or_org.
create policy "participants_claim_profile" on public.participants for update
  using (user_id is null)
  with check (user_id = auth.uid());
