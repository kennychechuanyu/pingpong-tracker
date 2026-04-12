create table players (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table matches (
  id uuid default gen_random_uuid() primary key,
  winner_id uuid references players(id) on delete cascade,
  loser_id uuid references players(id) on delete cascade,
  winner_score int not null default 11,
  loser_score int not null default 0,
  played_at timestamptz default now()
);

alter table matches enable row level security;
alter table players enable row level security;

create policy "allow all" on players for all using (true) with check (true);
create policy "allow all" on matches for all using (true) with check (true);
