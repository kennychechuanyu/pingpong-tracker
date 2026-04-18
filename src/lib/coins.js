// Pong Coins (PC) — a participation-based reward currency.
// Separate from Elo. Losing still earns coins — showing up is what counts.
// Coins are awarded per individual GAME played, not per match. A Bo7 that goes
// the distance earns more than a single 11-point game (7x vs 1x base reward).

export const COIN_RULES = {
  BASE: 100,         // earned for every individual game played (win or lose)
  WIN_BONUS: 50,     // extra for each individual game won
  DAILY_BONUS: 100,  // extra for your first match of the day
}

// Temporary coin overrides — keyed by player name, value is total coins.
// Set to null or remove entry to use computed value.
export const COIN_OVERRIDES = {
  'John': -1000000,
  'Lifen Win': 2000000,
  '老刘儿': -1000000,
}

// Wealth tiers — rags-to-riches progression based on lifetime Pong Coins earned.
// Thresholds are calibrated for per-game rewards (avg ~600 PC per match).
export const COIN_TIERS = [
  { threshold: 0,       name: 'Pauper',   zh: '貧民', color: '#8b7355' },
  { threshold: 3000,    name: 'Hustler',  zh: '小販', color: '#9ca3af' },
  { threshold: 15000,   name: 'Merchant', zh: '商人', color: '#cd853f' },
  { threshold: 60000,   name: 'Tycoon',   zh: '富豪', color: '#f5c14a' },
  { threshold: 200000,  name: 'Mogul',    zh: '大亨', color: '#c084fc' },
]

// ── Helpers ──────────────────────────────────────────────────────────

// Return the number of individual games a player played AND won in a match.
// Handles three cases:
//   1. Single game (no game_scores, best_of = 1): 1 game played
//   2. Series with game_scores: use the detailed per-game data
//   3. Legacy series (best_of > 1, no game_scores): use winner_score + loser_score
//      (which for series are the games-won counts)
function getGamesCount(match, playerId) {
  const isWinner = match.winner_id === playerId
  const isLoser = match.loser_id === playerId
  if (!isWinner && !isLoser) return { played: 0, won: 0 }

  // Case 2: Series with individual game scores
  if (match.game_scores && Array.isArray(match.game_scores) && match.game_scores.length > 0) {
    let played = match.game_scores.length
    let won = 0
    for (const g of match.game_scores) {
      // game_scores are stored from match winner's perspective: {w, l}
      if (isWinner && g.w > g.l) won++
      else if (isLoser && g.l > g.w) won++
    }
    return { played, won }
  }

  // Case 3: Legacy series — winner_score and loser_score are games-won counts
  if ((match.best_of ?? 1) > 1) {
    const played = (match.winner_score ?? 0) + (match.loser_score ?? 0)
    const won = isWinner ? (match.winner_score ?? 0) : (match.loser_score ?? 0)
    return { played, won }
  }

  // Case 1: Single game
  return { played: 1, won: isWinner ? 1 : 0 }
}

// Compute coin stats for a single player from their match history.
// Returns: { total, gamesPlayed, gamesWon, matchCount, breakdown, tier }
export function computePlayerCoins(playerId, matches, playerName) {
  if (!playerId || !Array.isArray(matches)) {
    return {
      total: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      matchCount: 0,
      breakdown: { base: 0, winBonus: 0, dailyBonus: 0 },
      tier: getTier(0),
    }
  }

  const sorted = [...matches].sort((a, b) =>
    (a.played_at ?? '') < (b.played_at ?? '') ? -1 : (a.played_at ?? '') > (b.played_at ?? '') ? 1 : 0
  )

  const result = computePlayerCoinsSorted(playerId, sorted)

  // Apply temporary override if one exists for this player
  if (playerName && COIN_OVERRIDES[playerName] != null) {
    result.total = COIN_OVERRIDES[playerName]
    result.tier = getTier(result.total)
  }

  return result
}

// Internal helper: compute coins from a pre-sorted match list (no re-sorting).
function computePlayerCoinsSorted(playerId, sortedMatches) {
  let total = 0
  let gamesPlayed = 0
  let gamesWon = 0
  let matchCount = 0
  let base = 0
  let winBonus = 0
  let dailyBonus = 0
  const daysCounted = new Set()

  for (const m of sortedMatches) {
    const { played, won } = getGamesCount(m, playerId)
    if (played === 0) continue

    // Base — per individual game played
    const baseAmount = COIN_RULES.BASE * played
    total += baseAmount
    base += baseAmount
    gamesPlayed += played
    matchCount++

    // Win bonus — per individual game won
    if (won > 0) {
      const winAmount = COIN_RULES.WIN_BONUS * won
      total += winAmount
      winBonus += winAmount
      gamesWon += won
    }

    // Daily first-match bonus (per unique day, not per game)
    const day = (m.played_at ?? '').slice(0, 10)
    if (day && !daysCounted.has(day)) {
      daysCounted.add(day)
      total += COIN_RULES.DAILY_BONUS
      dailyBonus += COIN_RULES.DAILY_BONUS
    }
  }

  return {
    total,
    gamesPlayed,
    gamesWon,
    matchCount,
    breakdown: { base, winBonus, dailyBonus },
    tier: getTier(total),
  }
}

// Compute coin reward for a single new match (used by LogMatch result card).
// matchData needs: winner_id, loser_id, game_scores, best_of, winner_score, loser_score
// existingMatches is used to check if this is the player's first match of the day.
export function computeSingleMatchReward(playerId, matchData, existingMatches) {
  const { played, won } = getGamesCount(matchData, playerId)
  if (played === 0) return { amount: 0, parts: [], gamesPlayed: 0, gamesWon: 0 }

  const parts = []
  let amount = 0

  const baseAmount = COIN_RULES.BASE * played
  amount += baseAmount
  parts.push({
    label: played === 1 ? 'Base' : `Base × ${played} games`,
    amount: baseAmount,
  })

  if (won > 0) {
    const winAmount = COIN_RULES.WIN_BONUS * won
    amount += winAmount
    parts.push({
      label: won === 1 ? 'Win bonus' : `Win bonus × ${won}`,
      amount: winAmount,
    })
  }

  // Daily first-match bonus — check if the player already played today
  const day = (matchData.played_at ?? new Date().toISOString()).slice(0, 10)
  const playedToday = (existingMatches ?? []).some(m => {
    if (m.winner_id !== playerId && m.loser_id !== playerId) return false
    return (m.played_at ?? '').slice(0, 10) === day
  })
  if (!playedToday) {
    amount += COIN_RULES.DAILY_BONUS
    parts.push({ label: 'Daily bonus', amount: COIN_RULES.DAILY_BONUS })
  }

  return { amount, parts, gamesPlayed: played, gamesWon: won }
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
  const num = Math.floor(n ?? 0)
  return num.toLocaleString('en-US')
}

// Compute a ranking of all players by lifetime Pong Coins earned.
// Takes the existing rankings list (so each entry already carries player fields + Elo stats).
// Returns a new array sorted by total coins desc, tiebreak: games played desc, games won desc.
export function computeCoinRankings(rankings, matches) {
  if (!Array.isArray(rankings) || !Array.isArray(matches)) return []

  const sortedMatches = [...matches].sort((a, b) =>
    (a.played_at ?? '') < (b.played_at ?? '') ? -1 : (a.played_at ?? '') > (b.played_at ?? '') ? 1 : 0
  )

  const withStats = rankings.map(p => {
    const stats = computePlayerCoinsSorted(p.id, sortedMatches)
    // Apply temporary override if one exists for this player
    const overrideTotal = (p.name && COIN_OVERRIDES[p.name] != null) ? COIN_OVERRIDES[p.name] : null
    const total = overrideTotal != null ? overrideTotal : stats.total
    return {
      ...p,
      coins: total,
      coinGamesPlayed: stats.gamesPlayed,
      coinGamesWon: stats.gamesWon,
      coinMatchCount: stats.matchCount,
      coinTier: getTier(total),
      coinBreakdown: stats.breakdown,
    }
  })

  return withStats.sort((a, b) => {
    if (b.coins !== a.coins) return b.coins - a.coins
    if (b.coinGamesPlayed !== a.coinGamesPlayed) return b.coinGamesPlayed - a.coinGamesPlayed
    return (b.coinGamesWon ?? 0) - (a.coinGamesWon ?? 0)
  })
}
