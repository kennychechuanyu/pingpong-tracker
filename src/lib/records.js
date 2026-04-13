import { expected, newRatings, seriesRatings } from './elo.js'

const STARTING_ELO = 1000

/**
 * Compute all-time records from rankings and matches data.
 * Returns an object with: peakRating, longestWinStreak, biggestUpset,
 * ironMan, biggestRivalry, biggestGain.
 */
export function computeRecords(rankings, matches) {
  if (!rankings || !matches || matches.length === 0) {
    return null
  }

  const playerMap = Object.fromEntries(rankings.map(p => [p.id, p]))
  const sorted = [...matches].sort((a, b) =>
    a.played_at < b.played_at ? -1 : a.played_at > b.played_at ? 1 : 0
  )

  // ─── 1. Peak Rating ───────────────────────────────────────
  let peakRating = null
  for (const p of rankings) {
    if (!p.history || p.history.length === 0) continue
    const max = Math.max(...p.history)
    if (!peakRating || max > peakRating.value) {
      peakRating = { player: p, value: max }
    }
  }

  // ─── 2. Longest Win Streak (all-time) ─────────────────────
  let longestWinStreak = null
  for (const p of rankings) {
    let best = 0
    let current = 0
    for (const m of sorted) {
      if (m.winner_id === p.id) {
        current++
        if (current > best) best = current
      } else if (m.loser_id === p.id) {
        current = 0
      }
    }
    if (!longestWinStreak || best > longestWinStreak.value) {
      longestWinStreak = { player: p, value: best }
    }
  }

  // ─── 3. Biggest Upset & 6. Biggest Single Gain ────────────
  // Replay matches in chronological order, tracking Elo
  const ratings = {}
  const gamesPlayed = {}
  for (const p of rankings) {
    ratings[p.id] = STARTING_ELO
    gamesPlayed[p.id] = 0
  }

  let biggestUpset = null
  let biggestGain = null

  for (const m of sorted) {
    if (ratings[m.winner_id] == null || ratings[m.loser_id] == null) continue
    if (!playerMap[m.winner_id] || !playerMap[m.loser_id]) continue

    const prevW = ratings[m.winner_id]
    const prevL = ratings[m.loser_id]

    // Compute expected win probability for the winner
    const winnerExpected = expected(prevW, prevL)

    // Track biggest upset: match where winner had lowest expected probability
    if (!biggestUpset || winnerExpected < biggestUpset.expectedWinProb) {
      biggestUpset = {
        winner: playerMap[m.winner_id],
        loser: playerMap[m.loser_id],
        winnerScore: m.winner_score,
        loserScore: m.loser_score,
        expectedWinProb: winnerExpected,
        playedAt: m.played_at,
      }
    }

    // Delegate Elo math to elo.js to keep records in sync with rankings
    let newW, newL, gameCount
    if (m.game_scores && m.game_scores.length > 0) {
      const r = seriesRatings(prevW, prevL, m.game_scores, gamesPlayed[m.winner_id], gamesPlayed[m.loser_id])
      newW = r.winner
      newL = r.loser
      gameCount = m.game_scores.length
    } else if (m.best_of > 1) {
      // Legacy series: flat win/loss, no margin multiplier.
      // Pass score 1-1 so marginMultiplier returns 1.0 (margin = 0 → normalised = 0 → 1.0).
      const r = newRatings(prevW, prevL, 1, 1, gamesPlayed[m.winner_id], gamesPlayed[m.loser_id])
      newW = r.winner
      newL = r.loser
      gameCount = 1
    } else {
      const r = newRatings(prevW, prevL, m.winner_score, m.loser_score, gamesPlayed[m.winner_id], gamesPlayed[m.loser_id])
      newW = r.winner
      newL = r.loser
      gameCount = 1
    }

    // Track biggest single Elo gain
    const winnerDelta = newW - prevW
    if (!biggestGain || winnerDelta > biggestGain.value) {
      biggestGain = {
        player: playerMap[m.winner_id],
        value: winnerDelta,
        fromElo: prevW,
        toElo: newW,
      }
    }
    // Also check loser gaining (in series where loser wins some games, delta could be positive — unlikely but check)
    const loserDelta = newL - prevL
    if (loserDelta > 0 && (!biggestGain || loserDelta > biggestGain.value)) {
      biggestGain = {
        player: playerMap[m.loser_id],
        value: loserDelta,
        fromElo: prevL,
        toElo: newL,
      }
    }

    ratings[m.winner_id] = newW
    ratings[m.loser_id] = newL
    gamesPlayed[m.winner_id] += gameCount
    gamesPlayed[m.loser_id] += gameCount
  }

  // ─── 4. Iron Man (most total matches) ─────────────────────
  let ironMan = null
  for (const p of rankings) {
    if (p.games > 0 && (!ironMan || p.games > ironMan.value)) {
      ironMan = { player: p, value: p.games }
    }
  }

  // ─── 5. Biggest Rivalry ───────────────────────────────────
  const pairCounts = {}
  const pairWins = {}
  for (const m of sorted) {
    const ids = [m.winner_id, m.loser_id].sort()
    const key = ids.join('-')
    pairCounts[key] = (pairCounts[key] || 0) + 1
    if (!pairWins[key]) pairWins[key] = {}
    pairWins[key][m.winner_id] = (pairWins[key][m.winner_id] || 0) + 1
  }

  let biggestRivalry = null
  for (const [key, count] of Object.entries(pairCounts)) {
    if (!biggestRivalry || count > biggestRivalry.value) {
      const [id1, id2] = key.split('-')
      if (!playerMap[id1] || !playerMap[id2]) continue
      const wins = pairWins[key] || {}
      biggestRivalry = {
        player1: playerMap[id1],
        player2: playerMap[id2],
        value: count,
        player1Wins: wins[id1] || 0,
        player2Wins: wins[id2] || 0,
      }
    }
  }

  return {
    peakRating,
    longestWinStreak,
    biggestUpset,
    ironMan,
    biggestRivalry,
    biggestGain,
  }
}
