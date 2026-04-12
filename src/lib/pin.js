const SALT = 'psi-pingpong-2026'

export async function hashPin(pin) {
  const data = new TextEncoder().encode(pin + SALT)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(player, pin) {
  if (!player?.pin_hash) return true   // no PIN set = open
  const hash = await hashPin(pin)
  return hash === player.pin_hash
}
