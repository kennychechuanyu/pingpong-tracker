-- Add individual game scores for Best-of-N series
-- Format: [{w: 11, l: 7}, {w: 9, l: 11}, ...] where w=match winner's score, l=match loser's score
ALTER TABLE matches ADD COLUMN IF NOT EXISTS game_scores jsonb;
