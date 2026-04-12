-- Emoji reactions on match results (one per player per match, changeable)
create table reactions (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(match_id, player_id)
);
