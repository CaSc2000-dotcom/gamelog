-- Private Storage bucket for session screenshots (and stretch video later).
-- Object key contract (see docs/erd.md):
--   {user_id}/{session_id}/{media_id}.{ext}
--
-- Per-object file_size_limit is a safety cap (50 MB). The Final Requirements Spec
-- 50 MB *per-session aggregate* must be enforced in the application by summing
-- media.byte_size for the session — not by this bucket limit alone.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'session-media',
  'session-media',
  false,
  52428800, -- 50 MiB per object
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path-scoped RLS: first folder segment must equal auth.uid().
-- Authenticated users may CRUD only under their own prefix in this bucket.
-- Idempotent: drop prior policy names if re-applying.

drop policy if exists "session_media_select_own" on storage.objects;
drop policy if exists "session_media_insert_own" on storage.objects;
drop policy if exists "session_media_update_own" on storage.objects;
drop policy if exists "session_media_delete_own" on storage.objects;

create policy "session_media_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'session-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "session_media_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'session-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "session_media_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'session-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'session-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "session_media_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'session-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
