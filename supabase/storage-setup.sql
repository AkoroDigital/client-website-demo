-- ============================================================
-- FILE STORAGE for job photos and documents
--
-- What this does: creates a private storage "bucket" (a folder for
-- uploaded files) and locks it down exactly like the database
-- tables — nobody can read, upload, or delete a file without being
-- signed in as a team member. The bucket is marked "private", so
-- files also can't be guessed/opened via a plain URL; the app
-- generates a temporary, expiring link each time someone views one.
--
-- Run this in the same place as schema.sql: Supabase dashboard ->
-- SQL Editor -> New query -> paste -> Run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('job-documents', 'job-documents', false)
on conflict (id) do nothing;

create policy "team can view job documents" on storage.objects
  for select using (bucket_id = 'job-documents' and auth.role() = 'authenticated');

create policy "team can upload job documents" on storage.objects
  for insert with check (bucket_id = 'job-documents' and auth.role() = 'authenticated');

create policy "team can delete job documents" on storage.objects
  for delete using (bucket_id = 'job-documents' and auth.role() = 'authenticated');
