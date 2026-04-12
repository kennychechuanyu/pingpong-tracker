-- Run this in Supabase SQL Editor to verify and fix the full schema.
-- Safe to run multiple times.

-- Players: extra columns
alter table players add column if not exists avatar_url text;
alter table players add column if not exists paddle_type text;
alter table players add column if not exists philosophy text;

-- Add check constraint only if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'players_paddle_type_check'
  ) then
    alter table players
      add constraint players_paddle_type_check
      check (paddle_type in ('Penhold', 'Shakehand'));
  end if;
end$$;

-- Matches: extra columns
alter table matches add column if not exists stakes text;
alter table matches add column if not exists best_of int default 1;

-- Challenges table
create table if not exists challenges (
  id uuid default gen_random_uuid() primary key,
  player1_id uuid references players(id) on delete cascade,
  player2_id uuid references players(id) on delete cascade,
  stakes text,
  best_of int default 1,
  scheduled_at timestamptz,
  created_at timestamptz default now()
);

-- RLS on all tables
alter table players   enable row level security;
alter table matches   enable row level security;
alter table challenges enable row level security;

-- Players policies
drop policy if exists "allow all" on players;
create policy "allow all" on players for all using (true) with check (true);

-- Matches policies
drop policy if exists "allow all" on matches;
create policy "allow all" on matches for all using (true) with check (true);

-- Challenges policies
drop policy if exists "Public read challenges"   on challenges;
drop policy if exists "Public insert challenges" on challenges;
drop policy if exists "Public delete challenges" on challenges;
create policy "Public read challenges"   on challenges for select using (true);
create policy "Public insert challenges" on challenges for insert with check (true);
create policy "Public delete challenges" on challenges for delete using (true);
create policy "Public update challenges" on challenges for update using (true);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "Public read avatars"   on storage.objects;
drop policy if exists "Public upload avatars" on storage.objects;
drop policy if exists "Public update avatars" on storage.objects;

create policy "Public read avatars"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Public upload avatars"
  on storage.objects for insert with check (bucket_id = 'avatars');

create policy "Public update avatars"
  on storage.objects for update using (bucket_id = 'avatars');
