-- Team system: players belong to teams, 1v1 matches contribute to team standings
CREATE TABLE IF NOT EXISTS teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  emoji text DEFAULT '🏓',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE players ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

-- Enable realtime for teams
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
