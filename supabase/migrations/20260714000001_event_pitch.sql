-- ============================================================
-- « Le plan » : le pitch de l'event, écrit par l'orga pour chauffer la team.
--
-- Tant que les dates ne sont pas fixées (date_start null), la page de l'event
-- n'est plus un hub aux tuiles grisées mais une landing : titre, lieu, pitch,
-- le crew, puis le sondage de dates. Le pitch est le seul contenu qui manquait
-- en base — le reste existait déjà.
--
-- 280 caractères : c'est 2-3 lignes, la contrainte fait le travail éditorial.
-- Le CHECK garde l'invariant côté base, l'UI le rappelle avec un compteur.
-- ============================================================

alter table public.events
  add column if not exists pitch text;

alter table public.events
  add constraint event_pitch_length check (pitch is null or char_length(pitch) <= 280);

-- ---------- Écriture du pitch : orgas uniquement ----------
-- Même raisonnement que set_event_tricount_url : la policy events_update_creator
-- n'ouvre l'UPDATE qu'au créateur (created_by = auth.uid()), alors que l'UI
-- considère « orga » = créateur OU co_organisateur. Un UPDATE direct par un
-- co-orga serait bloqué par la RLS et échouerait en silence (0 ligne, aucune
-- erreur) — le pitch semblerait « ne pas se sauvegarder ».
--
-- SECURITY DEFINER + contrôle explicite via is_event_organizer : cette RPC ne
-- touche QUE la colonne pitch, sans élargir l'UPDATE de toute la table events
-- (title, dates, destination…). Les invités, eux, n'ont aucun chemin d'écriture.
--
-- p_pitch null = retrait du pitch.
create or replace function public.set_event_pitch(
  p_slug text,
  p_pitch text
) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_event uuid;
begin
  select id into v_event from public.events where slug = p_slug;
  if v_event is null then
    raise exception 'INTROUVABLE';
  end if;

  -- auth.uid() reste celui de l'appelant·e même en SECURITY DEFINER (lu depuis
  -- le JWT de la requête) : is_event_organizer contrôle donc bien le membre courant.
  if not is_event_organizer(v_event) then
    raise exception 'NON_AUTORISE';
  end if;

  update public.events set pitch = p_pitch where id = v_event;
end;
$$;
