-- ============================================================
-- RLS — Row Level Security
-- ============================================================

alter table public.events         enable row level security;
alter table public.participants    enable row level security;
alter table public.transport_legs  enable row level security;
alter table public.transport_occupants enable row level security;

-- events: anyone can read, anon key can insert, creator_token required for update/delete
create policy "events_select_public"  on public.events for select using (true);
create policy "events_insert_anon"    on public.events for insert with check (true);
create policy "events_update_creator" on public.events for update
  using (creator_token = (current_setting('request.headers', true)::json->>'x-creator-token')::uuid);
create policy "events_delete_creator" on public.events for delete
  using (creator_token = (current_setting('request.headers', true)::json->>'x-creator-token')::uuid);

-- participants: public read per event, anyone can join, only own row can be updated
create policy "participants_select_public" on public.participants for select using (true);
create policy "participants_insert_anon"   on public.participants for insert with check (true);
create policy "participants_update_own"    on public.participants for update
  using (session_token = (current_setting('request.headers', true)::json->>'x-session-token')::uuid);

-- transport_legs: public read per event, participants can insert
create policy "legs_select_public" on public.transport_legs for select using (true);
create policy "legs_insert_participant" on public.transport_legs for insert with check (
  exists (
    select 1 from public.participants p
    where p.event_id = transport_legs.event_id
      and p.session_token = (current_setting('request.headers', true)::json->>'x-session-token')::uuid
  )
);
create policy "legs_delete_driver" on public.transport_legs for delete
  using (
    driver_id in (
      select id from public.participants
      where session_token = (current_setting('request.headers', true)::json->>'x-session-token')::uuid
    )
  );

-- transport_occupants: public read, participants can insert/delete own
create policy "occupants_select_public" on public.transport_occupants for select using (true);
create policy "occupants_insert_participant" on public.transport_occupants for insert with check (
  participant_id in (
    select id from public.participants
    where session_token = (current_setting('request.headers', true)::json->>'x-session-token')::uuid
  )
);
create policy "occupants_delete_own" on public.transport_occupants for delete
  using (
    participant_id in (
      select id from public.participants
      where session_token = (current_setting('request.headers', true)::json->>'x-session-token')::uuid
    )
  );

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.transport_legs;
alter publication supabase_realtime add table public.transport_occupants;
