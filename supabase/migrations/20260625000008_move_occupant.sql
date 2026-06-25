-- ============================================================
-- Déplacement atomique d'un occupant entre véhicules (drag & drop).
--
-- Remplace le delete(source) + insert(target) non transactionnel de
-- l'action `moveOccupant` : si l'insert échouait (voiture pleine,
-- violation d'unicité, RLS, réseau), la ligne source était déjà
-- supprimée → le participant disparaissait des DEUX legs côté serveur.
-- Tout se joue ici dans UNE seule fonction = UNE transaction : soit le
-- déplacement complet réussit, soit rien n'est modifié (rollback).
--
-- Capacité contrôlée CÔTÉ SERVEUR : un véhicule plein est refusé même si
-- le pré-check client est contourné.
--
-- SECURITY INVOKER (défaut) : la fonction tourne sous la RLS de
-- l'appelant·e. Les policies occupants_insert / occupants_delete
-- (20260625000005, is_event_member) gardent donc l'autorisation
-- « n'importe quel membre déplace n'importe qui » de la PR #41 intacte,
-- sans re-check explicite. Les lectures (total_seats, count) passent par
-- les policies select publiques (legs_select_public / occupants_select_public).
--
--   p_from_leg null : le participant venait de la zone « non affectés ».
--   p_to_leg   null : on le renvoie vers la zone « non affectés ».
-- On ne touche jamais à un occupant conducteur·ice (is_driver) ni
-- verrouillé (locked) : le DELETE les exclut.
-- ============================================================

create or replace function public.move_occupant(
  p_from_leg uuid,
  p_to_leg uuid,
  p_participant uuid
) returns void
  language plpgsql security invoker set search_path = public as $$
declare
  v_total_seats integer;
  v_count integer;
begin
  -- Contrôle de capacité serveur — seulement vers un véhicule (pas la zone
  -- « non affectés », p_to_leg null = capacité illimitée).
  if p_to_leg is not null then
    select total_seats into v_total_seats
    from public.transport_legs
    where id = p_to_leg;

    if v_total_seats is not null then
      select count(*) into v_count
      from public.transport_occupants
      where leg_id = p_to_leg;

      if v_count >= v_total_seats then
        raise exception 'COMPLET';
      end if;
    end if;
  end if;

  -- Retrait de la source (jamais un·e conducteur·ice ni un occupant verrouillé).
  if p_from_leg is not null then
    delete from public.transport_occupants
    where leg_id = p_from_leg
      and participant_id = p_participant
      and is_driver = false
      and locked = false;
  end if;

  -- Ajout sur la cible. on conflict do nothing : un déplacement redondant
  -- (déjà à bord) est un no-op et non une erreur d'unicité.
  if p_to_leg is not null then
    insert into public.transport_occupants (leg_id, participant_id)
    values (p_to_leg, p_participant)
    on conflict (leg_id, participant_id) do nothing;
  end if;
end;
$$;
