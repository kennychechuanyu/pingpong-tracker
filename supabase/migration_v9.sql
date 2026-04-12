-- Add admin flag to players
alter table players add column if not exists is_admin boolean default false;

-- Grant Kenny admin rights (run after confirming the name matches exactly)
update players set is_admin = true where name = 'Kenny Yu';
