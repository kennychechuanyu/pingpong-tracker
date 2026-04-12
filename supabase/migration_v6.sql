-- Add sifu (teacher) relationship to players
alter table players
  add column if not exists sifu_id uuid references players(id) on delete set null;
