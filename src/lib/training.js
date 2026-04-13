// 修行 (Xiūxíng) — Training Log system
// A volume-based progression track parallel to the Elo skill ranking.
// Players earn dan ranks (段) and collect seals (印章) by showing up and playing,
// regardless of whether they win or lose.

// ── 段 Dan Ranks ────────────────────────────────────────────────────
// Ordered by matches required. Each entry is one rank.
export const DAN_RANKS = [
  { matches: 10,   zh: '一段', en: '1st Dan' },
  { matches: 25,   zh: '二段', en: '2nd Dan' },
  { matches: 50,   zh: '三段', en: '3rd Dan' },
  { matches: 100,  zh: '四段', en: '4th Dan' },
  { matches: 200,  zh: '五段', en: '5th Dan' },
  { matches: 350,  zh: '六段', en: '6th Dan' },
  { matches: 550,  zh: '七段', en: '7th Dan' },
  { matches: 800,  zh: '八段', en: '8th Dan' },
  { matches: 1100, zh: '九段', en: '9th Dan' },
  { matches: 1500, zh: '十段', en: '10th Dan' },
]

// ── 印章 Seals ──────────────────────────────────────────────────────
// Collectible milestone stamps. Each has a 2-character Chinese name
// for consistent visual and an English description.
export const SEALS = [
  { id: 'first_match',     zh: '初局', en: 'First Match',     desc: 'Played your first match.',           type: 'matches', t: 1 },
  { id: 'ten_matches',     zh: '十局', en: '10 Matches',      desc: 'Played 10 matches.',                 type: 'matches', t: 10 },
  { id: 'fifty_matches',   zh: '五十', en: '50 Matches',      desc: 'Played 50 matches.',                 type: 'matches', t: 50 },
  { id: 'hundred_matches', zh: '百局', en: '100 Matches',     desc: 'Played 100 matches.',                type: 'matches', t: 100 },
  { id: 'five_hundred',    zh: '五百', en: '500 Matches',     desc: 'Played 500 matches.',                type: 'matches', t: 500 },
  { id: 'thousand_matches',zh: '千局', en: '1,000 Matches',   desc: 'Played 1,000 matches.',              type: 'matches', t: 1000 },
  { id: 'first_win',       zh: '初勝', en: 'First Win',       desc: 'Won your first match.',              type: 'wins',    t: 1 },
  { id: 'ten_wins',        zh: '十勝', en: '10 Wins',         desc: 'Won 10 matches.',                    type: 'wins',    t: 10 },
  { id: 'hundred_wins',    zh: '百勝', en: '100 Wins',        desc: 'Won 100 matches.',                   type: 'wins',    t: 100 },
  { id: 'ten_days',        zh: '十日', en: '10 Days',         desc: 'Showed up on 10 different days.',    type: 'days',    t: 10 },
  { id: 'hundred_days',    zh: '百日', en: '100 Days',        desc: 'Showed up on 100 different days.',   type: 'days',    t: 100 },
  { id: 'streak_five',     zh: '連勝', en: 'Winning Streak',  desc: 'Won 5 matches in a row.',            type: 'streak',  t: 5 },
  { id: 'streak_ten',      zh: '十連', en: 'Dominant Streak', desc: 'Won 10 matches in a row.',           type: 'streak',  t: 10 },
]

// ── Helpers ─────────────────────────────────────────────────────────

// Compute current dan rank and progress toward next.
// matchCount is the player's total matches played (wins + losses).
export function getDanRank(matchCount) {
  const m = matchCount ?? 0
  let currentIdx = -1
  for (let i = 0; i < DAN_RANKS.length; i++) {
    if (m >= DAN_RANKS[i].matches) currentIdx = i
    else break
  }
  const current = currentIdx >= 0 ? DAN_RANKS[currentIdx] : null
  const next = DAN_RANKS[currentIdx + 1] ?? null
  const prevThreshold = current ? current.matches : 0
  const nextThreshold = next ? next.matches : prevThreshold
  const span = nextThreshold - prevThreshold
  const progress = span > 0 ? (m - prevThreshold) / span : 1.0
  return {
    current,
    next,
    progress: Math.min(Math.max(progress, 0), 1),
    matchesToNext: next ? Math.max(next.matches - m, 0) : 0,
  }
}

// Compute unique days a player showed up. Matches need .played_at as ISO string.
function uniqueDaysActive(playerId, sortedMatches) {
  const days = new Set()
  for (const m of sortedMatches) {
    if ((m.winner_id === playerId || m.loser_id === playerId) && m.played_at) {
      days.add(m.played_at.slice(0, 10))
    }
  }
  return days.size
}

// Compute best all-time win streak for a player.
// Assumes matches are sorted chronologically (oldest first).
function bestWinStreak(playerId, sortedMatches) {
  let best = 0
  let cur = 0
  for (const m of sortedMatches) {
    if (m.winner_id === playerId) {
      cur++
      if (cur > best) best = cur
    } else if (m.loser_id === playerId) {
      cur = 0
    }
  }
  return best
}

// Given a player object and the full matches list, return the list of earned seals.
// Sort the matches once inside for safety.
export function getEarnedSeals(player, matches) {
  if (!player || !Array.isArray(matches)) return []
  const sorted = [...matches].sort((a, b) =>
    (a.played_at ?? '') < (b.played_at ?? '') ? -1 : (a.played_at ?? '') > (b.played_at ?? '') ? 1 : 0
  )
  const totalMatches = (player.wins ?? 0) + (player.losses ?? 0)
  const totalWins = player.wins ?? 0
  const days = uniqueDaysActive(player.id, sorted)
  const streak = bestWinStreak(player.id, sorted)

  const earned = []
  for (const seal of SEALS) {
    let value = 0
    switch (seal.type) {
      case 'matches': value = totalMatches; break
      case 'wins':    value = totalWins; break
      case 'days':    value = days; break
      case 'streak':  value = streak; break
    }
    if (value >= seal.t) earned.push(seal)
  }
  return earned
}

// ── Milestone event detection for the match feed ───────────────────
// Walks matches chronologically and returns a map of matchId -> array of
// milestone events that fired on that match (dan rank-ups and seal unlocks).
// Each event: { kind: 'dan'|'seal', playerId, milestone }
export function computeMilestoneEvents(matches, players) {
  if (!Array.isArray(matches) || !Array.isArray(players)) return {}
  const sorted = [...matches].sort((a, b) =>
    (a.played_at ?? '') < (b.played_at ?? '') ? -1 : (a.played_at ?? '') > (b.played_at ?? '') ? 1 : 0
  )
  const stats = {}
  for (const p of players) {
    stats[p.id] = {
      matches: 0,
      wins: 0,
      days: new Set(),
      streak: 0,
      danIdx: -1,
      seals: new Set(),
    }
  }

  const byMatch = {}

  const checkPlayer = (pid, match) => {
    const s = stats[pid]
    if (!s) return
    // dan rank — find highest we've crossed
    let newIdx = s.danIdx
    while (newIdx + 1 < DAN_RANKS.length && s.matches >= DAN_RANKS[newIdx + 1].matches) {
      newIdx++
    }
    if (newIdx > s.danIdx) {
      s.danIdx = newIdx
      if (!byMatch[match.id]) byMatch[match.id] = []
      byMatch[match.id].push({ kind: 'dan', playerId: pid, milestone: DAN_RANKS[newIdx] })
    }
    // seals — check each
    for (const seal of SEALS) {
      if (s.seals.has(seal.id)) continue
      let value = 0
      switch (seal.type) {
        case 'matches': value = s.matches; break
        case 'wins':    value = s.wins; break
        case 'days':    value = s.days.size; break
        case 'streak':  value = s.streak; break
      }
      if (value >= seal.t) {
        s.seals.add(seal.id)
        if (!byMatch[match.id]) byMatch[match.id] = []
        byMatch[match.id].push({ kind: 'seal', playerId: pid, milestone: seal })
      }
    }
  }

  for (const m of sorted) {
    const winStat = stats[m.winner_id]
    const loseStat = stats[m.loser_id]
    if (!winStat || !loseStat) continue

    winStat.matches++
    winStat.wins++
    winStat.streak++
    if (m.played_at) winStat.days.add(m.played_at.slice(0, 10))

    loseStat.matches++
    loseStat.streak = 0
    if (m.played_at) loseStat.days.add(m.played_at.slice(0, 10))

    checkPlayer(m.winner_id, m)
    checkPlayer(m.loser_id, m)
  }

  return byMatch
}
