-- Quitter le Komo : un membre supprime sa propre ligne participant.
-- Le créateur ne peut PAS quitter (rôle 'créateur' exclu) — bloqué aussi côté
-- action. Les rattachements partent via les FK on delete : cascade pour
-- transport_occupants / activity_signups / meal_owners / date_proposals /
-- accommodation_options, set null pour les *_created_by et transport_legs.driver_id.
create policy "participants_delete_self" on public.participants for delete
  using (user_id = auth.uid() and role <> 'créateur');
