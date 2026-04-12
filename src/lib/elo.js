const STARTING_ELO = 1000
export const PROVISIONAL_GAMES = 10

function dynamicK(gamesPlayedBeforeMatch) {
  if (gamesPlayedBeforeMatch < 10) return 40
  if (gamesPlayedBeforeMatch < 30) return 32
  return 24
}

function marginMultiplier(winnerScore, loserScore) {
  if (winnerScore === 0) return 1.0
  const normalised = (winnerScore - loserScore) / winnerScore * 11
  if (normalised >= 9) return 1.3
  if (normalised >= 5) return 1.15
  return 1.0
}

export function expected(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export function newRatings(ratingWinner, ratingLoser, winnerScore = 11, loserScore = 0, winnerGames = 0, loserGames = 0) {
  const eWinner = expected(ratingWinner, ratingLoser)
  const eLoser = expected(ratingLoser, ratingWinner)
  const mult = marginMultiplier(winnerScore, loserScore)
  const kW = dynamicK(winnerGames)
  const kL = dynamicK(loserGames)
  return {
    winner: Math.round(ratingWinner + kW * mult * (1 - eWinner)),
    loser: Math.round(ratingLoser + kL * mult * (0 - eLoser)),
  }
}

export function seriesRatings(ratingWinner, ratingLoser, gameScores, winnerGames = 0, loserGames = 0) {
  const eW = expected(ratingWinner, ratingLoser)
  const eL = expected(ratingLoser, ratingWinner)
  const kW = dynamicK(winnerGames)
  const kL = dynamicK(loserGames)

  let deltaW = 0
  let deltaL = 0

  for (const g of gameScores) {
    const high = Math.max(g.w, g.l)
    const low = Math.min(g.w, g.l)
    const mult = marginMultiplier(high, low)
    if (g.w > g.l) {
      deltaW += kW * mult * (1 - eW)
      deltaL += kL * mult * (0 - eL)
    } else {
      deltaW += kW * mult * (0 - eW)
      deltaL += kL * mult * (1 - eL)
    }
  }

  return {
    winner: Math.round(ratingWinner + deltaW),
    loser: Math.round(ratingLoser + deltaL),
  }
}

export function computeAll(players, matches) {
  const ratings = {}
  const wins = {}
  const losses = {}
  const history = {}
  const deltas = {}
  const gamesPlayed = {}
  const formFull = {}

  for (const p of players) {
    ratings[p.id] = STARTING_ELO
    wins[p.id] = 0
    losses[p.id] = 0
    history[p.id] = [STARTING_ELO]
    deltas[p.id] = 0
    gamesPlayed[p.id] = 0
    formFull[p.id] = []
  }

  const sorted = [...matches].sort((a, b) =>
    a.played_at < b.played_at ? -1 : a.played_at > b.played_at ? 1 : 0
  )

  for (const m of sorted) {
    if (ratings[m.winner_id] == null || ratings[m.loser_id] == null) continue

    const prevW = ratings[m.winner_id]
    const prevL = ratings[m.loser_id]
    let newW, newL, gameCount

    if (m.game_scores && m.game_scores.length > 0) {
      const r = seriesRatings(prevW, prevL, m.game_scores, gamesPlayed[m.winner_id], gamesPlayed[m.loser_id])
      newW = r.winner
      newL = r.loser
      gameCount = m.game_scores.length
    } else if (m.best_of > 1) {
      const eW = expected(prevW, prevL)
      const eL = expected(prevL, prevW)
      const kW = dynamicK(gamesPlayed[m.winner_id])
      const kL = dynamicK(gamesPlayed[m.loser_id])
      newW = Math.round(prevW + kW * (1 - eW))
      newL = Math.round(prevL + kL * (0 - eL))
      gameCount = 1
    } else {
      const r = newRatings(prevW, prevL, m.winner_score, m.loser_score, gamesPlayed[m.winner_id], gamesPlayed[m.loser_id])
      newW = r.winner
      newL = r.loser
      gameCount = 1
    }

    ratings[m.winner_id] = newW
    ratings[m.loser_id] = newL
    wins[m.winner_id]++
    losses[m.loser_id]++
    gamesPlayed[m.winner_id] += gameCount
    gamesPlayed[m.loser_id] += gameCount
    history[m.winner_id].push(newW)
    history[m.loser_id].push(newL)
    deltas[m.winner_id] = newW - prevW
    deltas[m.loser_id] = newL - prevL
    formFull[m.winner_id].push('W')
    formFull[m.loser_id].push('L')
  }

  const rankings = players.map(p => {
    const w = wins[p.id] ?? 0
    const l = losses[p.id] ?? 0
    return {
      ...p,
      elo: ratings[p.id] ?? STARTING_ELO,
      wins: w,
      losses: l,
      games: w + l,
      history: history[p.id] ?? [STARTING_ELO],
      streak: computeStreak(p.id, sorted),
      form: (formFull[p.id] ?? []).slice(-5),
      provisional: (w + l) < PROVISIONAL_GAMES,
    }
  }).sort((a, b) => {
    if (b.elo !== a.elo) return b.elo - a.elo
    const wrA = a.games > 0 ? a.wins / a.games : 0
    const wrB = b.games > 0 ? b.wins / b.games : 0
    return wrB - wrA
  })

  return { rankings, deltas }
}

function computeStreak(playerId, sortedMatches) {
  const relevant = sortedMatches.filter(
    m => m.winner_id === playerId || m.loser_id === playerId
  )
  if (!relevant.length) return { type: null, count: 0 }

  const last = relevant[relevant.length - 1]
  const type = last.winner_id === playerId ? 'W' : 'L'
  let count = 0

  for (let i = relevant.length - 1; i >= 0; i--) {
    const won = relevant[i].winner_id === playerId
    if ((type === 'W' && won) || (type === 'L' && !won)) count++
    else break
  }

  return { type, count }
}
