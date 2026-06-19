-- ============================================================
-- email_is_registered — oracle d'existence d'email, réservé au backend.
--
-- Sert au flux « relier » du join : quand un visiteur anonyme saisit un
-- email DÉJÀ rattaché à un vrai compte, on refuse de créer un doublon et
-- on l'envoie sur un magic link. Pour décider, le serveur doit savoir si
-- l'email existe — d'où cette fonction.
--
-- SECURITY DEFINER pour lire auth.users (inaccessible autrement), mais
-- EXECUTE retiré à public/anon/authenticated : seul le service_role
-- (client admin serveur) peut l'appeler → pas d'oracle d'énumération
-- exposé sur l'API publique. On ignore les identités anonymes (elles
-- n'ont pas d'email « possédé »).
-- ============================================================

create or replace function public.email_is_registered(p_email text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where email is not null
      and lower(email) = lower(trim(p_email))
      and coalesce(is_anonymous, false) = false
  );
$$;

revoke all on function public.email_is_registered(text) from public;
grant execute on function public.email_is_registered(text) to service_role;
