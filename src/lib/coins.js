// Pong Coins (PC) — a participation-based reward currency.
// Separate from Elo. Losing still earns coins — showing up is what counts.

export const COIN_RULES = {
  BASE: 100,         // earned for every match played (win or lose)
  WIN_BONUS: 50,     // extra for winning
  DAILY_BONUS: 100,  // extra for your first match of the day
}

// Wealth tiers — rags-to-riches progression based on lifetime Pong Coins earned.
export const COIN_TIERS = [
  { threshold: 0,      name: 'Pauper',   zh: '貧民', color: '#8b7355' },
  { threshold: 1000,   name: 'Hustler',  zh: '小販', color: '#9ca3af' },
  { threshold: 5000,   name: 'Merchant', zh: '商人', color: '#cd853f' },
  { threshold: 15000,  name: 'Tycoon',   zh: '富豪', color: '#f5c14a' },
  { threshold: 50000,  name: 'Mogul',    zh: '大亨', color: '#c084fc' },
]

// Compute coin stats for a single player from their match history.
// Returns: { total, matchCount, wins, breakdown, tier }
export function computePlayerCoins(playerId, matches) {
  if (!playerId || !Array.isArray(matches)) {
    return {
      total: 0,
      matchCount: 0,
      wins: 0,
      breakdown: { base: 0, winBonus: 0, dailyBonus: 0 },
      tier: getTier(0),
    }
  }

  const sorted = [...matches].sort((a, b) =>
    (a.played_at ?? '') < (b.played_at ?? '') ? -1 : (a.played_at ?? '') > (b.played_at ?? '') ? 1 : 0
  )

  let total = 0
  let matchCount = 0
  let wins = 0
  let base = 0
  let winBonus = 0
  let dailyBonus = 0
  const daysCounted = new Set()

  for (const m of sorted) {
    if (m.winner_id !== playerId && m.loser_id !== playerId) continue

    // Base
    total += COIN_RULES.BASE
    base += COIN_RULES.BASE
    matchCount++

    // Win bonus
    if (m.winner_id === playerId) {
      total += COIN_RULES.WIN_BONUS
      winBonus += COIN_RULES.WIN_BONUS
      wins++
    }

    // Daily first-match bonus
    const day = (m.played_at ?? '').slice(0, 10)
    if (day && !daysCounted.has(day)) {
      daysCounted.add(day)
      total += COIN_RULES.DAILY_BONUS
      dailyBonus += COIN_RULES.DAILY_BONUS
    }
  }

  return {
    total,
    matchCount,
    wins,
    breakdown: { base, winBonus, dailyBonus },
    tier: getTier(total),
  }
}

// Compute coin reward for a single upcoming match (used by LogMatch result card).
// Note: the daily bonus is checked against past matches so we don't double-count.
export function computeSingleMatchReward(playerId, isWinner, playedAt, existingMatches) {
  let amount = COIN_RULES.BASE
  const parts = [{ label: 'Base', amount: COIN_RULES.BASE }]

  if (isWinner) {
    amount += COIN_RULES.WIN_BONUS
    parts.push({ label: 'Win bonus', amount: COIN_RULES.WIN_BONUS })
  }

  // Daily first-match bonus — check if the player already played today
  const day = (playedAt ?? new Date().toISOString()).slice(0, 10)
  const playedToday = (existingMatches ?? []).some(m => {
    if (m.winner_id !== playerId && m.loser_id !== playerId) return false
    return (m.played_at ?? '').slice(0, 10) === day
  })
  if (!playedToday) {
    amount += COIN_RULES.DAILY_BONUS
    parts.push({ label: 'Daily bonus', amount: COIN_RULES.DAILY_BONUS })
  }

  return { amount, parts }
}

// Map a coin total to the current tier and progress toward the next.
export function getTier(coins) {
  const c = coins ?? 0
  let currentIdx = 0
  for (let i = 0; i < COIN_TIERS.length; i++) {
    if (c >= COIN_TIERS[i].threshold) currentIdx = i
    else break
  }
  const current = COIN_TIERS[currentIdx]
  const next = COIN_TIERS[currentIdx + 1] ?? null
  const prevThreshold = current.threshold
  const nextThreshold = next ? next.threshold : prevThreshold
  const span = nextThreshold - prevThreshold
  const progress = span > 0 ? (c - prevThreshold) / span : 1.0
  return {
    current,
    next,
    progress: Math.min(Math.max(progress, 0), 1),
    toNext: next ? Math.max(next.threshold - c, 0) : 0,
  }
}

// Format a coin amount with thousands separator.
export function formatCoins(n) {
  const num = Math.max(0, Math.floor(n ?? 0))
  return num.toLocaleString('en-US')
}

// Compute a ranking of all players by lifetime Pong Coins earned.
// Takes the existing rankings list (so each entry already carries player fields + Elo stats).
// Returns a new array sorted by total coins descending, tiebreaker: more matches first.
export function computeCoinRankings(rankings, matches) {
  if (!Array.isArray(rankings) || !Array.isArray(matches)) return []

  // Sort matches once — cheaper than sorting inside computePlayerCoins for every player
  const sortedMatches = [...matches].sort((a, b) =>
    (a.played_at ?? '') < (b.played_at ?? '') ? -1 : (a.played_at ?? '') > (b.played_at ?? '') ? 1 : 0
  )

  const withStats = rankings.map(p => {
    const stats = computePlayerCoinsSorted(p.id, sortedMatches)
    return {
      ...p,
      coins: stats.total,
      coinMatches: stats.matchCount,
      coinWins: stats.wins,
      coinTier: stats.tier,
      coinBreakdown: stats.breakdown,
    }
  })

  return withStats.sort((a, b) => {
    if (b.coins !== a.coins) return b.coins - a.coins
    if (b.coinMatches !== a.coinMatches) return b.coinMatches - a.coinMatches
    return (b.coinWins ?? 0) - (a.coinWins ?? 0)
  })
}

// Internal helper: compute coins from a pre-sorted match list (no re-sorting).
function computePlayerCoinsSorted(playerId, sortedMatches) {
  let total = 0
  let matchCount = 0
  let wins = 0
  let base = 0
  let winBonus = 0
  let dailyBonus = 0
  const daysCounted = new Set()

  for (const m of sortedMatches) {
    if (m.winner_id !== playerId && m.loser_id !== playerId) continue

    total += COIN_RULES.BASE
    base += COIN_RULES.BASE
    matchCount++

    if (m.winner_id === playerId) {
      total += COIN_RULES.WIN_BONUS
      winBonus += COIN_RULES.WIN_BONUS
      wins++
    }

    const day = (m.played_at ?? '').slice(0, 10)
    if (day && !daysCounted.has(day)) {
      daysCounted.add(day)
      total += COIN_RULES.DAILY_BONUS
      dailyBonus += COIN_RULES.DAILY_BONUS
    }
  }

  return {
    total,
    matchCount,
    wins,
    breakdown: { base, winBonus, dailyBonus },
    tier: getTier(total),
  }
}
