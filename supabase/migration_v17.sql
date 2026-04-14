-- Tighten PIN protection: first-time PIN setup on a player who has no PIN
-- must be authorized by an admin's PIN.
--
-- Without this, anyone could "claim" an unprotected account by setting a PIN
-- on it — locking the real player out.

-- Drop the 3-arg version from migration_v16 so we can recreate with 4 args.
DROP FUNCTION IF EXISTS set_player_pin(uuid, text, text);

CREATE OR REPLACE FUNCTION set_player_pin(
  p_id uuid,
  p_new_pin text,
  p_current_pin text,
  p_admin_pin text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
  admin_hash_check text;
BEGIN
  SELECT pin_hash INTO stored_hash FROM players WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  IF stored_hash IS NOT NULL THEN
    -- Target has a PIN: require knowledge of it to change or remove it.
    IF p_current_pin IS NULL OR hash_pin(p_current_pin) <> stored_hash THEN
      RAISE EXCEPTION 'Current PIN does not match';
    END IF;
  ELSE
    -- Target has NO PIN. Require an admin to authorize first-time setup
    -- so hostile users can't "claim" unprotected accounts.
    -- Bootstrap exception: if no admins with PINs exist yet, allow open setup.
    IF EXISTS (SELECT 1 FROM players WHERE is_admin = true AND pin_hash IS NOT NULL) THEN
      IF p_admin_pin IS NULL THEN
        RAISE EXCEPTION 'Admin PIN required to set a first-time PIN';
      END IF;
      admin_hash_check := hash_pin(p_admin_pin);
      IF NOT EXISTS (
        SELECT 1 FROM players
        WHERE is_admin = true
          AND pin_hash = admin_hash_check
      ) THEN
        RAISE EXCEPTION 'Admin PIN does not match';
      END IF;
    END IF;
  END IF;

  -- Apply the update (NULL or empty = clear)
  IF p_new_pin IS NULL OR p_new_pin = '' THEN
    UPDATE players SET pin_hash = NULL WHERE id = p_id;
  ELSE
    UPDATE players SET pin_hash = hash_pin(p_new_pin) WHERE id = p_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_player_pin(uuid, text, text, text) TO anon, authenticated;
