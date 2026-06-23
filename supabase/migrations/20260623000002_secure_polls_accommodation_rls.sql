-- ============================================================
-- §2 — Resserre les policies d'écriture permissives (using/check = true) des
-- modules sondage de dates et hébergement sur l'appartenance à l'event.
--
-- CHANGE LE COMPORTEMENT RLS : seuls les membres de l'event peuvent désormais
-- écrire/voter/supprimer. La lecture (select) reste publique. À valider.
-- ============================================================

-- ---------- date_proposals ----------
drop policy if exists "insert participant" on public.date_proposals;
create policy "insert participant" on public.date_proposals for insert
  with check (public.is_event_member(event_id));

drop policy if exists "update participant" on public.date_proposals;
create policy "update participant" on public.date_proposals for update
  using (public.is_event_member(event_id));

drop policy if exists "date_proposals delete" on public.date_proposals;
create policy "date_proposals delete" on public.date_proposals for delete
  using (public.is_event_member(event_id));

-- ---------- accommodation_options ----------
drop policy if exists "insert participant" on public.accommodation_options;
create policy "insert participant" on public.accommodation_options for insert
  with check (public.is_event_member(event_id));

drop policy if exists "update participant" on public.accommodation_options;
create policy "update participant" on public.accommodation_options for update
  using (public.is_event_member(event_id));
