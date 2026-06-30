-- ============================================================
-- email_has_pseudo_on_event — oracle réservé au backend pour le flux
-- de join « email d'abord ».
--
-- Quand un visiteur saisit son email à l'étape 1 du join, on ne déclenche
-- un magic link de reconnexion QUE s'il a déjà un pseudo (un participant)
-- sur CET event sous un vrai compte. Sinon (compte inconnu, ou compte
-- existant mais pas encore membre de l'event) on le laisse choisir/ajouter
-- un pseudo dans la liste, sans aller-retour par email.
--
-- Même posture de sécurité que email_is_registered : SECURITY DEFINER pour
-- lire auth.users, EXECUTE retiré à public/anon/authenticated → seul le
-- service_role peut l'appeler (pas d'oracle d'énumération exposé). Les
-- identités anonymes sont ignorées (pas d'email « possédé »).
-- ============================================================

create or replace function public.email_has_pseudo_on_event(p_email text, p_event_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    join public.participants p on p.user_id = u.id
    where u.email is not null
      and lower(u.email) = lower(trim(p_email))
      and coalesce(u.is_anonymous, false) = false
      and p.event_id = p_event_id
  );
$$;

revoke all on function public.email_has_pseudo_on_event(text, uuid) from public;
grant execute on function public.email_has_pseudo_on_event(text, uuid) to service_role;
