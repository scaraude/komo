-- ============================================================
-- Avatar photo — colonne + bucket Storage.
--
-- La photo est rattachée au COMPTE (user_id), pas au participant d'un
-- event donné : on la propage sur toutes les lignes participants d'un
-- même user_id (fait côté action applicative, pas ici) pour qu'elle
-- suive l'utilisateur d'un event à l'autre sans ré-upload.
-- ============================================================

alter table public.participants
  add column if not exists avatar_url text;

-- Bucket public en lecture (photo non sensible) ; écriture restreinte au
-- dossier `{auth.uid()}/...` par les policies storage.objects ci-dessous.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
