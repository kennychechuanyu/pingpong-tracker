-- Trash talk field on challenges
alter table challenges add column if not exists trash_talk text;
