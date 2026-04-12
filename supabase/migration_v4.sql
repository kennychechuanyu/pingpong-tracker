-- Run this in Supabase SQL Editor after migration_v3.sql

create table if not exists challenges (
  id uuid default gen_random_uuid() primary key,
  player1_id uuid references players(id) on delete cascade,
  player2_id uuid references players(id) on delete cascade,
  stakes text,
  best_of int default 1,
  created_at timestamptz default now()
);

alter table challenges enable row level security;

create policy "Public read challenges"
  on challenges for select using (true);

create policy "Public insert challenges"
  on challenges for insert with check (true);

create policy "Public delete challenges"
  on challenges for delete using (true);
