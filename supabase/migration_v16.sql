-- PIN protection: require knowledge of the current PIN to change it.
-- Prevents direct UPDATE of pin_hash via the anon key.

-- pgcrypto for server-side hashing (usually enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────
-- Hash function (MUST match client-side hashPin in src/lib/pin.js)
-- salt = 'psi-pingpong-2026'
-- algorithm = SHA-256, hex output
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION hash_pin(p_pin text) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(p_pin || 'psi-pingpong-2026', 'sha256'), 'hex');
$$;

-- ─────────────────────────────────────────────────────────────────
-- Safely set, change, or clear a player's PIN.
-- Requires the caller to know the current PIN (plaintext) if one is set.
-- Runs as SECURITY DEFINER so it bypasses the pin_hash UPDATE revoke below.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_player_pin(
  p_id uuid,
  p_new_pin text,
  p_current_pin text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT pin_hash INTO stored_hash FROM players WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  -- If a PIN is already set, require the caller to know it
  IF stored_hash IS NOT NULL THEN
    IF p_current_pin IS NULL OR hash_pin(p_current_pin) <> stored_hash THEN
      RAISE EXCEPTION 'Current PIN does not match';
    END IF;
  END IF;

  -- Apply: null or empty new_pin clears the PIN
  IF p_new_pin IS NULL OR p_new_pin = '' THEN
    UPDATE players SET pin_hash = NULL WHERE id = p_id;
  ELSE
    UPDATE players SET pin_hash = hash_pin(p_new_pin) WHERE id = p_id;
  END IF;
END;
$$;

-- Anyone can call the function (it enforces the PIN check internally)
GRANT EXECUTE ON FUNCTION set_player_pin(uuid, text, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────
-- Lock down direct column UPDATEs from the public anon role.
-- After this, the ONLY way to change pin_hash is via set_player_pin().
-- is_admin is also revoked so no one can self-promote via the REST API.
-- ─────────────────────────────────────────────────────────────────
REVOKE UPDATE (pin_hash, is_admin) ON players FROM anon;
REVOKE UPDATE (pin_hash, is_admin) ON players FROM authenticated;
