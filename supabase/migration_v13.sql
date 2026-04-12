-- Per-player trash talk on challenges (p1 already has trash_talk from v11)
alter table challenges add column if not exists trash_talk_p2 text;
