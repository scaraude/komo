-- ============================================================
-- Écriture du lien Tricount / cagnotte par N'IMPORTE QUEL membre de l'event.
--
-- À l'origine, tricount_url ne pouvait être écrit que par le créateur (via la
-- policy events_update_creator : created_by = auth.uid()). Mais l'UI ouvre
-- l'édition à tous les orgas (isAdmin = créateur OU co_organisateur), et on
-- veut désormais que TOUT membre puisse coller le lien : un UPDATE direct
-- bloqué par la RLS échouait silencieusement (0 ligne, aucune erreur) et le
-- lien semblait « ne pas se sauvegarder ».
--
-- On NE veut PAS élargir l'UPDATE de toute la table events (title, dates,
-- destination…). Cette RPC est donc SECURITY DEFINER et ne touche QUE la
-- colonne tricount_url, après un contrôle d'appartenance explicite via
-- is_event_member — l'équivalent scopé d'une policy, cohérent avec
-- set_presence / move_occupant. Le contrôle d'écrasement (le lien est partagé)
-- est fait côté UI par une confirmation.
--
-- p_url null = retrait du lien.
-- ============================================================

create or replace function public.set_event_tricount_url(
  p_slug text,
  p_url text
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
  -- le JWT de la requête) : is_event_member contrôle donc bien le membre courant.
  if not is_event_member(v_event) then
    raise exception 'NON_AUTORISE';
  end if;

  update public.events set tricount_url = p_url where id = v_event;
end;
$$;
