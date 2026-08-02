-- LinkedIn post image attachments: private storage bucket + columns on
-- linkedin_posts to record the uploaded image. Mirrors the stage-attachments
-- bucket/RLS pattern from 0077. Admin-only (this table already has a single
-- "is_admin() full access" policy, so images inherit the same access model).

----------------------------------------------------------------------
-- 1. linkedin-post-images storage bucket (private).
----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'linkedin-post-images',
  'linkedin-post-images',
  false,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "admin_all_linkedin_post_images" on storage.objects;
create policy "admin_all_linkedin_post_images" on storage.objects
  for all
  using      (bucket_id = 'linkedin-post-images' and public.is_admin())
  with check (bucket_id = 'linkedin-post-images' and public.is_admin());

----------------------------------------------------------------------
-- 2. image_path / image_alt columns on linkedin_posts.
----------------------------------------------------------------------
alter table public.linkedin_posts
  add column if not exists image_path text,
  add column if not exists image_alt text;

comment on column public.linkedin_posts.image_path is 'Storage path within the linkedin-post-images bucket, if this post has an attached image';
comment on column public.linkedin_posts.image_alt is 'Alt text for the attached image';

NOTIFY pgrst, 'reload schema';
