-- Add archrival (宿敵) relationship to players
alter table players
  add column if not exists rival_id uuid references players(id) on delete set null;
