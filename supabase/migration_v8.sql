-- Add PIN protection to players
alter table players
  add column if not exists pin_hash text;
