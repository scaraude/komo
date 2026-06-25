-- ============================================================
-- Changement du statut de présence d'un·e participant·e par N'IMPORTE QUEL
-- membre de l'event (et non plus seulement soi-même ou un·e orga).
--
-- Cas d'usage : les profils « sans compte » (potes ajoutés à la main) ne
-- peuvent pas se déclarer eux-mêmes — un membre doit pouvoir le faire à leur
-- place. On garde l'autorisation large « tout membre peut tout changer »,
-- cohérente avec move_occupant / occupants_any_member, propre à cette app
-- conviviale (cf. la position « la sécurité n'est pas critique ici »).
--
-- On NE veut PAS élargir l'UPDATE de toute la table participants (pseudo,
-- role, user_id…). Cette RPC est donc SECURITY DEFINER et ne touche QUE la
-- colonne presence_status, après un contrôle d'appartenance explicite :
-- l'équivalent scopé d'une policy, sans exposer les autres colonnes.
--
-- p_status null = retour à « non déclaré » (le cycle ? → 🔥 → 🤔 → ❌ → ?).
-- ============================================================

create or replace function public.set_presence(
  p_participant uuid,
  p_status text
) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_event uuid;
begin
  if p_status is not null and p_status not in ('hot', 'maybe', 'unsure', 'no') then
    raise exception 'STATUT_INVALIDE';
  end if;

  select event_id into v_event from public.participants where id = p_participant;
  if v_event is null then
    raise exception 'INTROUVABLE';
  end if;

  -- auth.uid() reste celui de l'appelant·e même en SECURITY DEFINER (lu depuis
  -- le JWT de la requête) : is_event_member contrôle donc bien le membre courant.
  if not is_event_member(v_event) then
    raise exception 'NON_AUTORISE';
  end if;

  update public.participants set presence_status = p_status where id = p_participant;
end;
$$;
