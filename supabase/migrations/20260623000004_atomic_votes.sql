-- ============================================================
-- Votes atomiques — évite le lost-update du read-modify-write sur la map
-- `votes jsonb` (deux votants concurrents s'écrasaient). Un seul UPDATE avec
-- jsonb_set sérialise sous verrou de ligne.
--
-- SECURITY INVOKER : la RLS du module (is_event_member) s'applique normalement.
-- ============================================================

create or replace function public.set_date_vote(
  p_proposal uuid,
  p_participant uuid,
  p_vote boolean
) returns void
  language sql security invoker set search_path = public as $$
    update public.date_proposals
    set votes = jsonb_set(coalesce(votes, '{}'::jsonb), array[p_participant::text], to_jsonb(p_vote))
    where id = p_proposal;
  $$;

create or replace function public.toggle_accommodation_vote(
  p_option uuid,
  p_participant uuid
) returns void
  language sql security invoker set search_path = public as $$
    update public.accommodation_options
    set votes = jsonb_set(
          coalesce(votes, '{}'::jsonb),
          array[p_participant::text],
          to_jsonb(not coalesce((votes ->> p_participant::text)::boolean, false))
        )
    where id = p_option;
  $$;
