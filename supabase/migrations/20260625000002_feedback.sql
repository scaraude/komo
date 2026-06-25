-- Feedback in-app : un message libre laissé par un utilisateur sur l'appli.
-- Stockage = source de vérité (le ping Discord est best-effort côté server action).
create table public.feedback (
  id          uuid primary key default gen_random_uuid(),
  message     text not null check (char_length(message) between 1 and 2000),
  event_id    uuid references public.events(id) on delete set null,
  user_id     uuid references auth.users(id)   on delete set null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Insert ouvert à tout utilisateur authentifié (sessions anonymes incluses).
-- Pas de policy SELECT : le contenu n'est lisible que via service role / dashboard.
create policy "feedback_insert_authenticated" on public.feedback
  for insert with check (auth.uid() is not null);
