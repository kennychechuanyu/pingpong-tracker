import { writable, derived } from 'svelte/store'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase.js'
import { computeAll } from './elo.js'

const SUPA_URL = SUPABASE_URL
const SUPA_KEY = SUPABASE_KEY

async function dbPost(table, body) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
}

export const players = writable([])
export const matches = writable([])
export const challenges = writable([])
export const votes = writable([])
export const reactions = writable([])
export const loading = writable(true)
export const pendingChallenge = writable(null)
// In-memory session: set after PIN verification, cleared on page reload
export const sessionPlayer = writable(null)
// Transient: set by rematch button, consumed by LogMatch on next mount
export const rematchPlayers = writable(null)

const _computed = derived([players, matches], ([$players, $matches]) =>
  computeAll($players, $matches)
)

export const rankings = derived(_computed, c => c.rankings)
export const lastDeltas = derived(_computed, c => c.deltas)
// Admin players (is_admin=true AND have a PIN set) — can approve any action
export const adminPlayers = derived(players, $p => $p.filter(p => p.is_admin && p.pin_hash))

export const enrichedMatches = derived([matches, players], ([$matches, $players]) => {
  const byId = Object.fromEntries($players.map(p => [p.id, p]))
  return [...$matches]
    .sort((a, b) => a.played_at < b.played_at ? 1 : a.played_at > b.played_at ? -1 : 0)
    .map(m => ({
      ...m,
      winner: byId[m.winner_id],
      loser: byId[m.loser_id],
    }))
    .filter(m => m.winner && m.loser)
})

export const enrichedVotes = derived([votes, players], ([$votes, $players]) => {
  const byId = Object.fromEntries($players.map(p => [p.id, p]))
  return $votes.map(v => ({ ...v, voter: byId[v.voter_id], pick: byId[v.pick_id] }))
})

export const enrichedReactions = derived([reactions, players], ([$reactions, $players]) => {
  const byId = Object.fromEntries($players.map(p => [p.id, p]))
  return $reactions.map(r => ({ ...r, player: byId[r.player_id] }))
})

export const enrichedChallenges = derived([challenges, players], ([$challenges, $players]) => {
  const byId = Object.fromEntries($players.map(p => [p.id, p]))
  return [...$challenges]
    .sort((a, b) => a.created_at < b.created_at ? -1 : 1)
    .map(c => ({
      ...c,
      player1: byId[c.player1_id],
      player2: byId[c.player2_id],
    }))
    .filter(c => c.player1 && c.player2)
})

export async function loadAll() {
  loading.set(true)
  try {
    const [{ data: p }, { data: m }, { data: c }, { data: v }, { data: rx }] = await Promise.all([
      supabase.from('players').select('*').order('created_at'),
      supabase.from('matches').select('*').order('played_at'),
      supabase.from('challenges').select('*').order('created_at'),
      supabase.from('votes').select('*').order('created_at'),
      supabase.from('reactions').select('*').order('created_at'),
    ])
    players.set(p ?? [])
    matches.set(m ?? [])
    challenges.set(c ?? [])
    votes.set(v ?? [])
    reactions.set(rx ?? [])
  } catch (e) {
    console.error('Failed to load data:', e)
  } finally {
    loading.set(false)
  }
}

export function subscribeRealtime() {
  const channel = supabase
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, async () => {
      const { data } = await supabase.from('matches').select('*').order('played_at')
      matches.set(data ?? [])
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, async () => {
      const { data } = await supabase.from('players').select('*').order('created_at')
      players.set(data ?? [])
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, async () => {
      const { data } = await supabase.from('challenges').select('*').order('created_at')
      challenges.set(data ?? [])
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, async () => {
      const { data } = await supabase.from('votes').select('*').order('created_at')
      votes.set(data ?? [])
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async () => {
      const { data } = await supabase.from('reactions').select('*').order('created_at')
      reactions.set(data ?? [])
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export async function addPlayer({ name, paddle_type, philosophy, avatarFile }) {
  // Raw fetch insert — bypasses Supabase client wrapper issues on Safari
  await dbPost('players', { name, paddle_type: paddle_type || null, philosophy: philosophy || null })

  // Fetch the newly created player
  const { data: player, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('name', name)
    .single()
  if (fetchError) throw new Error(fetchError.message || JSON.stringify(fetchError))

  if (avatarFile) {
    try {
      const ext = (avatarFile.name?.split('.').pop() || 'jpg').toLowerCase()
      const path = `${player.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type || 'image/jpeg' })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        await supabase.from('players').update({ avatar_url: urlData.publicUrl }).eq('id', player.id)
        player.avatar_url = urlData.publicUrl
      }
    } catch {
      // Avatar upload failed — player still created, just without a photo
    }
  }

  players.update(p => [...p, player])
  return player
}

export async function logMatch(winnerId, loserId, winnerScore, loserScore, stakes = null, bestOf = 1, gameScores = null) {
  const { data, error } = await supabase
    .from('matches')
    .insert({ winner_id: winnerId, loser_id: loserId, winner_score: winnerScore, loser_score: loserScore, stakes: stakes || null, best_of: bestOf, game_scores: gameScores || null })
    .select()
    .single()
  if (error) throw error
  matches.update(m => [...m, data])
  return data
}

export async function updateMatch(id, { winner_id, loser_id, winner_score, loser_score }) {
  const { error } = await supabase
    .from('matches')
    .update({ winner_id, loser_id, winner_score, loser_score })
    .eq('id', id)
  if (error) throw new Error(error.message || JSON.stringify(error))
  matches.update(ms => ms.map(m => m.id === id ? { ...m, winner_id, loser_id, winner_score, loser_score } : m))
}

export async function deleteMatch(id) {
  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) throw error
  matches.update(m => m.filter(match => match.id !== id))
}

export async function addChallenge({ player1Id, player2Id, stakes, bestOf, scheduledAt = null, trashTalk = null }) {
  const { data, error } = await supabase
    .from('challenges')
    .insert({ player1_id: player1Id, player2_id: player2Id, stakes: stakes || null, best_of: bestOf, scheduled_at: scheduledAt || null, trash_talk: trashTalk || null })
    .select()
    .single()
  if (error) throw error
  challenges.update(c => [...c, data])
  return data
}

export async function deleteChallenge(id) {
  const { error } = await supabase.from('challenges').delete().eq('id', id)
  if (error) throw error
  challenges.update(c => c.filter(ch => ch.id !== id))
}

export async function updatePlayer(id, { name, paddle_type, philosophy, avatarFile, sifu_id, rival_id }) {
  const updates = {
    name: name.trim(),
    paddle_type: paddle_type || null,
    philosophy: philosophy?.trim() || null,
    sifu_id: sifu_id || null,
    rival_id: rival_id || null,
  }

  if (avatarFile) {
    const ext = (avatarFile.name?.split('.').pop() || 'jpg').toLowerCase()
    const path = `${id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type || 'image/jpeg' })
    if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message)
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    // Append timestamp to bust browser cache when the same filename is re-uploaded
    updates.avatar_url = urlData.publicUrl + '?t=' + Date.now()
  }

  const { error } = await supabase.from('players').update(updates).eq('id', id)
  if (error) throw new Error(error.message || JSON.stringify(error))
  players.update(ps => ps.map(p => p.id === id ? { ...p, ...updates } : p))
}

export async function setPlayerPin(id, pinHash) {
  const { error } = await supabase.from('players').update({ pin_hash: pinHash }).eq('id', id)
  if (error) throw new Error(error.message || JSON.stringify(error))
  players.update(ps => ps.map(p => p.id === id ? { ...p, pin_hash: pinHash } : p))
}

export async function castReaction(matchId, playerId, emoji) {
  const { data, error } = await supabase
    .from('reactions')
    .upsert(
      { match_id: matchId, player_id: playerId, emoji },
      { onConflict: 'match_id,player_id' }
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  reactions.update(rs => {
    const idx = rs.findIndex(r => r.match_id === matchId && r.player_id === playerId)
    if (idx >= 0) return rs.map((r, i) => i === idx ? data : r)
    return [...rs, data]
  })
}

export async function castVote(challengeId, voterId, pickId) {
  const { data, error } = await supabase
    .from('votes')
    .upsert(
      { challenge_id: challengeId, voter_id: voterId, pick_id: pickId },
      { onConflict: 'challenge_id,voter_id' }
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  votes.update(vs => {
    const idx = vs.findIndex(v => v.challenge_id === challengeId && v.voter_id === voterId)
    if (idx >= 0) return vs.map((v, i) => i === idx ? data : v)
    return [...vs, data]
  })
}

export async function updateChallengeTrashTalk(id, field, text) {
  const { error } = await supabase
    .from('challenges')
    .update({ [field]: text || null })
    .eq('id', id)
  if (error) throw new Error(error.message || JSON.stringify(error))
  challenges.update(cs => cs.map(c => c.id === id ? { ...c, [field]: text || null } : c))
}

export async function deletePlayer(id) {
  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) throw new Error(error.message || JSON.stringify(error))
  players.update(ps => ps.filter(p => p.id !== id))
  matches.update(ms => ms.filter(m => m.winner_id !== id && m.loser_id !== id))
  challenges.update(cs => cs.filter(c => c.player1_id !== id && c.player2_id !== id))
}
