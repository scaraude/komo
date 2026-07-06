-- ============================================================
-- Suppression d'une proposition de date : on la resserre à l'AUTEUR du créneau
-- ou à un ORGANISATEUR.
--
-- Avant : « date_proposals delete » = is_event_member(event_id) → n'importe
-- quel membre pouvait supprimer la proposition d'un autre. Désormais on ne peut
-- retirer que ses propres créneaux ; l'organisateur garde le droit de tout
-- purger (fixDate clôt le sondage en supprimant les propositions restantes).
-- ============================================================

drop policy if exists "date_proposals delete" on public.date_proposals;
create policy "date_proposals delete" on public.date_proposals for delete
  using (
    public.is_event_organizer(event_id)
    or exists (
      select 1 from public.participants p
      where p.id = date_proposals.created_by
        and p.user_id = auth.uid()
    )
  );
