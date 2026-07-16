create or replace function public.reconnectable_account_on_event(
  p_email text,
  p_event_id uuid
)
  returns table (user_id uuid, email_confirmed boolean)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select
    u.id,
    (u.email is not null and coalesce(u.is_anonymous, false) = false) as email_confirmed
  from auth.users u
  join public.participants p on p.user_id = u.id
  where p.event_id = p_event_id
    and (
      (u.email is not null
        and lower(u.email) = lower(trim(p_email))
        and coalesce(u.is_anonymous, false) = false)
      or (u.email_change is not null
        and lower(u.email_change) = lower(trim(p_email)))
    )
  order by email_confirmed desc, u.created_at desc
  limit 1;
$$;

revoke all on function public.reconnectable_account_on_event(text, uuid) from public;
grant execute on function public.reconnectable_account_on_event(text, uuid) to service_role;
