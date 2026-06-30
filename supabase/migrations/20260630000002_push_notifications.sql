-- ============================================================
-- Notifications push + centre de notifs in-app (PWA).
--
--  • push_subscriptions : endpoints Web Push d'un utilisateur (1 par
--                         navigateur/appareil souscrit). Clés p256dh/auth issues
--                         de PushManager.subscribe(). Purgées côté serveur quand
--                         l'endpoint renvoie 404/410 (souscription morte).
--  • notification_prefs  : préférences GLOBALES par utilisateur (un seul jeu pour
--                          tous ses Komos). Ligne absente ⇒ on applique les
--                          défauts ci-dessous côté serveur (cf. dispatch.ts).
--                          Défauts : activité + transport ON, repas + arrivée OFF.
--  • notifications       : centre de notifs in-app (la liste du menu utilisateur).
--                          Un INSERT par destinataire et par événement métier.
--
-- Toutes ces tables sont PAR UTILISATEUR (clé user_id), pas par event : la RLS
-- est donc `user_id = auth.uid()`, sans is_event_member. L'écriture vers AUTRUI
-- (notifier les autres membres) se fait via le client service_role (dispatch),
-- qui contourne la RLS — aucune policy d'insert pour autrui n'est exposée.
-- ============================================================

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

create table public.notification_prefs (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  on_activity_created   boolean not null default true,
  on_transport_created  boolean not null default true,
  on_meal_created       boolean not null default false,
  on_participant_joined boolean not null default false,
  updated_at            timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   uuid not null references public.events(id) on delete cascade,
  type       text not null check (type in ('activity_created', 'transport_created', 'meal_created', 'participant_joined')),
  title      text not null,
  body       text,
  url        text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.notifications       enable row level security;

-- push_subscriptions : chacun gère SES propres souscriptions.
create policy "push_subscriptions_select_own" on public.push_subscriptions for select using (user_id = auth.uid());
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy "push_subscriptions_update_own" on public.push_subscriptions for update using (user_id = auth.uid());
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete using (user_id = auth.uid());

-- notification_prefs : chacun lit/écrit SES préférences.
create policy "notification_prefs_select_own" on public.notification_prefs for select using (user_id = auth.uid());
create policy "notification_prefs_insert_own" on public.notification_prefs for insert with check (user_id = auth.uid());
create policy "notification_prefs_update_own" on public.notification_prefs for update using (user_id = auth.uid());

-- notifications : le destinataire lit / marque lu / supprime SES notifs.
-- (L'INSERT n'est PAS exposé : seul le service_role écrit, via dispatch.)
create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid());
create policy "notifications_delete_own" on public.notifications for delete using (user_id = auth.uid());

-- Realtime : le badge « non lu » du menu se met à jour en live.
alter publication supabase_realtime add table public.notifications;
