-- Create a dedicated Storage bucket for profile pictures
begin;

-- Create a bucket named "avatars". Set public := true for simple viewing via public URL.
-- If you prefer private access with signed URLs, change to public := false and skip the public read policy below.
select storage.create_bucket('avatars', public := true);

-- Add a column on profiles to store the path to the user's avatar in the bucket
alter table public.profiles
  add column if not exists avatar_path text;

-- Policies for Storage Objects specifically for the avatars bucket
-- Notes:
-- - We enforce that uploads go to a prefix `${auth.uid()}/...` so each user owns their folder.
-- - We allow public read of files in the avatars bucket (because the bucket is public).
--   If you keep the bucket private, remove the public read policy and use signed URLs in the app.

-- Allow public read for avatars bucket (use only if bucket is public)
create policy if not exists "public read avatars"
  on storage.objects for select
  using (
    bucket_id = (select id from storage.buckets where name = 'avatars')
  );

-- Allow authenticated users to upload files under their own folder `${auth.uid()}/...`
create policy if not exists "users can upload own avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = (select id from storage.buckets where name = 'avatars')
    and position(auth.uid()::text || '/' in name) = 1
  );

-- Allow authenticated users to update their own files in avatars bucket
create policy if not exists "users can update own avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = (select id from storage.buckets where name = 'avatars')
    and owner = auth.uid()
  )
  with check (owner = auth.uid());

-- Allow authenticated users to delete their own files in avatars bucket
create policy if not exists "users can delete own avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = (select id from storage.buckets where name = 'avatars')
    and owner = auth.uid()
  );

commit;
