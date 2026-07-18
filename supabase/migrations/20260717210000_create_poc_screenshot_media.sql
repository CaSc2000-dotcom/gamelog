-- Disposable POC metadata for Tuesday Block 2 screenshot uploads.
-- Not the final ERD `media` table (that needs sessions FK on Wednesday).
-- Object key contract (same as session-media bucket):
--   {user_id}/{poc_session_id}/{media_id}.{ext}

create table public.poc_screenshot_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  poc_session_id uuid not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  created_at timestamptz not null default now()
);

create index poc_screenshot_media_user_created_idx
  on public.poc_screenshot_media (user_id, created_at desc);

create index poc_screenshot_media_user_session_idx
  on public.poc_screenshot_media (user_id, poc_session_id);

alter table public.poc_screenshot_media enable row level security;

create policy "poc_screenshot_media_select_own"
  on public.poc_screenshot_media
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "poc_screenshot_media_insert_own"
  on public.poc_screenshot_media
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "poc_screenshot_media_delete_own"
  on public.poc_screenshot_media
  for delete
  to authenticated
  using (auth.uid() = user_id);
