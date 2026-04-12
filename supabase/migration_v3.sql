-- Run this in Supabase SQL Editor after migration_v2.sql

alter table matches add column if not exists stakes text;
alter table matches add column if not exists best_of int default 1;
