-- Run this in Supabase SQL Editor after the initial schema.sql

alter table players add column if not exists avatar_url text;
alter table players add column if not exists paddle_type text check (paddle_type in ('Penhold', 'Shakehand'));
alter table players add column if not exists philosophy text;

-- Storage bucket for player avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Public upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars');

create policy "Public update avatars"
  on storage.objects for update
  using (bucket_id = 'avatars');
