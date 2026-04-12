-- Run this in Supabase SQL Editor after migration_v4.sql

alter table challenges add column if not exists scheduled_at timestamptz;
