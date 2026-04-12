-- Votes table: one vote per player per challenge
create table votes (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references challenges(id) on delete cascade not null,
  voter_id uuid references players(id) on delete cascade not null,
  pick_id uuid references players(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(challenge_id, voter_id)
);
