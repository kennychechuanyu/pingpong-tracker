<script>
  import { push } from 'svelte-spa-router'
  import EditPlayerModal from './EditPlayerModal.svelte'
  import { getAchievements } from '../lib/achievements.js'
  import { computePlayerCoins, formatCoins, COIN_RULES } from '../lib/coins.js'

  export let player = null
  export let allMatches = []
  export let allPlayers = []

  let editOpen = false

  $: sifu = player?.sifu_id ? allPlayers.find(p => p.id === player.sifu_id) : null
  $: disciples = player ? allPlayers.filter(p => p.sifu_id === player.id) : []
  // Rival: declared by me OR declared by the other person pointing at me
  $: rival = player?.rival_id
    ? allPlayers.find(p => p.id === player.rival_id)
    : allPlayers.find(p => p.rival_id === player?.id) ?? null

  $: byId = Object.fromEntries(allPlayers.map(p => [p.id, p]))

  const SPARK_W = 300
  const SPARK_H = 90

  function sparkCoords(history) {
    if (!history || history.length < 2) return []
    const min = Math.min(...history)
    const max = Math.max(...history)
    const range = max - min || 1
    return history.map((v, i) => {
      const x = (i / (history.length - 1)) * SPARK_W
      const y = SPARK_H - ((v - min) / range) * (SPARK_H - 12) - 6
      return { x, y, v }
    })
  }

  function linePath(coords) {
    if (coords.length < 2) return ''
    return 'M ' + coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')
  }

  function areaPath(coords) {
    if (coords.length < 2) return ''
    const line = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')
    return `M ${coords[0].x.toFixed(1)},${SPARK_H} L ${line} L ${SPARK_W},${SPARK_H} Z`
  }

  function longestWinStreak(pid, sortedList) {
    let max = 0, cur = 0
    for (const m of sortedList) {
      if (m.winner_id === pid) { cur++; if (cur > max) max = cur }
      else if (m.loser_id === pid) { cur = 0 }
    }
    return max
  }

  function headToHead(pid, sortedList) {
    const map = {}
    for (const m of sortedList) {
      if (m.winner_id !== pid && m.loser_id !== pid) continue
      const opp = m.winner_id === pid ? m.loser : m.winner
      if (!opp) continue
      if (!map[opp.id]) map[opp.id] = { player: opp, wins: 0, losses: 0 }
      if (m.winner_id === pid) map[opp.id].wins++
      else map[opp.id].losses++
    }
    return Object.values(map).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
  }

  function uniqueDays(pid, sortedList) {
    const days = new Set()
    for (const m of sortedList) {
      if (m.winner_id === pid || m.loser_id === pid) {
        const d = (m.played_at || '').slice(0, 10)
        if (d) days.add(d)
      }
    }
    return days.size
  }

  function formatBreakdown(pid, sortedList) {
    const buckets = {
      1: { label: 'Bo1', wins: 0, total: 0 },
      3: { label: 'Bo3', wins: 0, total: 0 },
      5: { label: 'Bo5', wins: 0, total: 0 },
      7: { label: 'Bo7', wins: 0, total: 0 },
    }
    for (const m of sortedList) {
      if (m.winner_id !== pid && m.loser_id !== pid) continue
      const bo = m.best_of || 1
      if (!buckets[bo]) continue
      buckets[bo].total++
      if (m.winner_id === pid) buckets[bo].wins++
    }
    return [1, 3, 5, 7]
      .map(k => ({ ...buckets[k], key: k }))
      .filter(b => b.total > 0)
  }

  function winMargins(pid, sortedList) {
    let dominant = 0, comfortable = 0, close = 0
    for (const m of sortedList) {
      if (m.winner_id !== pid) continue
      if (m.game_scores && Array.isArray(m.game_scores) && m.game_scores.length > 0) {
        // Series: count games lost
        const gamesLost = m.game_scores.filter(g => g.l > g.w).length
        if (gamesLost === 0) dominant++
        else if (gamesLost === 1) comfortable++
        else close++
      } else {
        const margin = (m.winner_score ?? 0) - (m.loser_score ?? 0)
        if (margin >= 9) dominant++
        else if (margin >= 5) comfortable++
        else close++
      }
    }
    return { dominant, comfortable, close }
  }

  function upsetStats(pid, sortedList, lookup) {
    const me = lookup[pid]
    if (!me) return { won: [], lost: [] }
    // Group by opponent so we collapse multiple upset matches vs the same player
    const wonByOpp = {}
    const lostByOpp = {}
    const myElo = me.elo ?? 0
    for (const m of sortedList) {
      if (m.winner_id !== pid && m.loser_id !== pid) continue
      const oppId = m.winner_id === pid ? m.loser_id : m.winner_id
      const opp = lookup[oppId]
      if (!opp) continue
      const oppElo = opp.elo ?? 0
      if (m.winner_id === pid && oppElo > myElo) {
        if (!wonByOpp[oppId]) wonByOpp[oppId] = { opp, count: 0, eloDiff: oppElo - myElo }
        wonByOpp[oppId].count++
      } else if (m.loser_id === pid && oppElo < myElo) {
        if (!lostByOpp[oppId]) lostByOpp[oppId] = { opp, count: 0, eloDiff: myElo - oppElo }
        lostByOpp[oppId].count++
      }
    }
    const won = Object.values(wonByOpp).sort((a, b) => b.eloDiff - a.eloDiff)
    const lost = Object.values(lostByOpp).sort((a, b) => b.eloDiff - a.eloDiff)
    const wonTotal = won.reduce((s, w) => s + w.count, 0)
    const lostTotal = lost.reduce((s, l) => s + l.count, 0)
    return { won, lost, wonTotal, lostTotal }
  }

  function recentForm(pid, sortedList, n) {
    const results = []
    for (let i = sortedList.length - 1; i >= 0 && results.length < n; i--) {
      const m = sortedList[i]
      if (m.winner_id === pid) results.push('W')
      else if (m.loser_id === pid) results.push('L')
    }
    return results.reverse()
  }

  $: sorted = [...allMatches].sort((a, b) =>
    a.played_at < b.played_at ? -1 : a.played_at > b.played_at ? 1 : 0
  )
  $: h2h = player ? headToHead(player.id, sorted) : []
  $: bestStreak = player ? longestWinStreak(player.id, sorted) : 0
  $: total = player ? player.wins + player.losses : 0
  $: winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0
  $: nemesis = h2h.reduce((acc, r) => (!acc || r.losses > acc.losses) ? r : acc, null)
  $: punchingBag = h2h.reduce((acc, r) => (!acc || r.wins > acc.wins) ? r : acc, null)

  $: coords = player ? sparkCoords(player.history) : []
  $: linePathD = linePath(coords)
  $: areaPathD = areaPath(coords)
  $: peakPoint = coords.length > 0
    ? coords.reduce((best, c) => (c.v > best.v ? c : best), coords[0])
    : null
  $: endPoint = coords.length > 0 ? coords[coords.length - 1] : null
  $: peakElo = player?.history?.length ? Math.max(...player.history) : (player?.elo ?? 1000)
  $: lowElo = player?.history?.length ? Math.min(...player.history) : (player?.elo ?? 1000)
  $: startElo = player?.history?.[0] ?? 1000
  $: endElo = player?.history?.[player.history.length - 1] ?? 1000
  $: lastDelta = player?.history && player.history.length >= 2
    ? player.history[player.history.length - 1] - player.history[player.history.length - 2]
    : 0

  // Only players with at least 1 match are ranked — matches Leaderboard behavior.
  // 0-game players have no rank number (they live in "Yet to play" on the leaderboard).
  $: rankedList = allPlayers.filter(p => p.games > 0)
  $: rank = player && player.games > 0 ? rankedList.findIndex(p => p.id === player.id) : -1
  $: rankDisplay = rank >= 0 ? rank + 1 : null

  $: achievements = player ? getAchievements(player, rank) : []

  $: daysActive = player ? uniqueDays(player.id, sorted) : 0
  $: formats = player ? formatBreakdown(player.id, sorted) : []
  $: showFormats = formats.length > 0 && (formats.some(f => f.key !== 1) || total > 5)
  $: margins = player ? winMargins(player.id, sorted) : { dominant: 0, comfortable: 0, close: 0 }
  $: marginTotal = margins.dominant + margins.comfortable + margins.close
  $: marginMax = Math.max(margins.dominant, margins.comfortable, margins.close, 1)
  $: upsets = player ? upsetStats(player.id, sorted, byId) : { won: [], lost: [], wonTotal: 0, lostTotal: 0 }
  $: form10 = player ? recentForm(player.id, sorted, 10) : []
  $: formWins = form10.filter(r => r === 'W').length
  $: formLosses = form10.filter(r => r === 'L').length

  // Pong Coins
  $: coinStats = player ? computePlayerCoins(player.id, allMatches) : null

  function rankOrdinalClass(r) {
    if (r === 1) return 'rank-gold'
    if (r === 2) return 'rank-silver'
    if (r === 3) return 'rank-bronze'
    return ''
  }
</script>

{#if player}
  <div class="wrap">
    <div class="topbar">
      <button class="back" on:click={() => push('/')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Rankings
      </button>
      <button class="edit-btn" on:click={() => (editOpen = true)} aria-label="Edit player">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Edit
      </button>
    </div>

    <div class="hero">
      <div class="hero-glow"></div>
      <div class="hero-inner">
        <div class="avatar-wrap">
          {#if player.avatar_url}
            <img src={player.avatar_url} alt={player.name} class="avatar-photo" />
          {:else}
            <div class="avatar-initial">{player.name[0].toUpperCase()}</div>
          {/if}
          {#if rankDisplay !== null}
            <div class="rank-badge {rankOrdinalClass(rankDisplay)}">#{rankDisplay}</div>
          {/if}
        </div>
        <div class="header-info">
          <div class="name-line">
            <h1>{player.name}</h1>
            {#if player.paddle_type}
              <span class="paddle-badge">{player.paddle_type}</span>
            {/if}
          </div>
          {#if player.philosophy}
            <p class="philosophy">"{player.philosophy}"</p>
          {/if}
          <div class="elo-row">
            <span class="elo tnum">{player.elo}</span>
            <span class="elo-label">ELO</span>
            {#if lastDelta !== 0}
              <span class="trend" class:trend-up={lastDelta > 0} class:trend-down={lastDelta < 0}>
                {lastDelta > 0 ? '▲' : '▼'} {Math.abs(lastDelta)}
              </span>
            {/if}
            {#if player.streak?.count >= 2}
              <span class="streak" class:streak-w={player.streak.type === 'W'} class:streak-l={player.streak.type === 'L'}>
                {player.streak.type}{player.streak.count}
              </span>
            {/if}
          </div>
          <div class="record tnum">
            <span class="w">{player.wins}W</span>
            <span class="sep">·</span>
            <span class="l">{player.losses}L</span>
            {#if player.provisional}
              <span class="sep">·</span>
              <span class="prov">provisional</span>
            {/if}
          </div>
          {#if coinStats && coinStats.total > 0}
            <div class="hero-coin-pill">
              <svg viewBox="0 0 20 20" class="hero-coin-svg" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="9" fill="#f5c14a" stroke="#7a4f00" stroke-width="1"/>
                <circle cx="10" cy="10" r="7" fill="none" stroke="#7a4f00" stroke-width="0.6" stroke-dasharray="1,1" opacity="0.6"/>
                <text x="10" y="13" text-anchor="middle" font-size="7" font-weight="900" fill="#5a3600" font-family="Georgia, serif">PC</text>
              </svg>
              <span class="hero-coin-val tnum">{formatCoins(coinStats.total)}</span>
            </div>
          {/if}
        </div>
      </div>
    </div>

    {#if player.history && player.history.length >= 2 && coords.length >= 2}
      <div class="card spark-card">
        <div class="card-label">Elo trajectory</div>
        <div class="spark-wrap">
          <svg viewBox="0 0 {SPARK_W} {SPARK_H}" width="100%" preserveAspectRatio="none" class="spark-svg">
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--amber)" stop-opacity="0.42" />
                <stop offset="100%" stop-color="var(--amber)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPathD} fill="url(#sparkGrad)" stroke="none" />
            <path d={linePathD} fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            {#if peakPoint}
              <circle cx={peakPoint.x} cy={peakPoint.y} r="3.5" fill="var(--surface)" stroke="var(--amber)" stroke-width="2" />
            {/if}
            {#if endPoint}
              <circle cx={endPoint.x} cy={endPoint.y} r="3" fill="var(--amber)" />
            {/if}
          </svg>
          <div class="spark-labels">
            <div class="spark-label-cell">
              <span class="spark-label-key">LOW</span>
              <span class="tnum spark-label-val">{lowElo}</span>
            </div>
            <div class="spark-label-cell mid">
              <span class="spark-label-key">PEAK</span>
              <span class="tnum spark-label-val peak">{peakElo}</span>
            </div>
            <div class="spark-label-cell end">
              <span class="spark-label-key">NOW</span>
              <span class="tnum spark-label-val" class:up={endElo >= startElo} class:down={endElo < startElo}>{endElo}</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Pong Coins -->
    {#if coinStats && coinStats.gamesPlayed > 0}
      <div class="card coin-card">
        <div class="coin-sheen"></div>
        <div class="coin-header">
          <div class="coin-title">
            <span class="coin-name">Pong Coins</span>
            <span class="coin-abbr">PC</span>
          </div>
          <span class="coin-sub">earned by playing — win or lose</span>
        </div>

        <div class="coin-main">
          <div class="big-coin">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="coinFace" cx="35%" cy="30%" r="75%">
                  <stop offset="0%" stop-color="#ffe89a"/>
                  <stop offset="45%" stop-color="#f5c14a"/>
                  <stop offset="100%" stop-color="#a06a00"/>
                </radialGradient>
                <linearGradient id="coinEdge" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#d69a20"/>
                  <stop offset="100%" stop-color="#6b4500"/>
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="47" fill="url(#coinEdge)"/>
              <circle cx="50" cy="50" r="43" fill="url(#coinFace)" stroke="#7a4f00" stroke-width="1"/>
              <circle cx="50" cy="50" r="36" fill="none" stroke="#7a4f00" stroke-width="0.8" stroke-dasharray="1.5,1.5" opacity="0.6"/>
              <text x="50" y="62" text-anchor="middle" font-size="32" font-weight="900" fill="#5a3600" font-family="Georgia, serif" letter-spacing="-1">PC</text>
              <!-- Shine highlight -->
              <ellipse cx="38" cy="32" rx="15" ry="8" fill="#fff" opacity="0.35"/>
            </svg>
          </div>
          <div class="coin-numeric">
            <span class="coin-total tnum">{formatCoins(coinStats.total)}</span>
            <span class="coin-total-lbl">total coins</span>
          </div>
        </div>

        <!-- Tier badge + progress -->
        <div class="tier-block">
          <div class="tier-row">
            <span class="tier-badge" style="color: {coinStats.tier.current.color}; border-color: {coinStats.tier.current.color}40; background: {coinStats.tier.current.color}12;">
              <span class="tier-name">{coinStats.tier.current.name}</span>
              <span class="tier-zh">{coinStats.tier.current.zh}</span>
            </span>
            {#if coinStats.tier.next}
              <span class="tier-next tnum">
                {formatCoins(coinStats.tier.toNext)} to <strong>{coinStats.tier.next.name}</strong>
              </span>
            {:else}
              <span class="tier-next">max tier reached</span>
            {/if}
          </div>
          <div class="tier-bar-track">
            <div class="tier-bar-fill" style="width: {(coinStats.tier.progress * 100).toFixed(1)}%; background: linear-gradient(90deg, {coinStats.tier.current.color}, {coinStats.tier.next ? coinStats.tier.next.color : coinStats.tier.current.color});"></div>
          </div>
        </div>

        <!-- Breakdown -->
        <div class="coin-breakdown">
          <div class="coin-line">
            <span class="coin-line-dot"></span>
            <span class="coin-line-label">Base <span class="coin-line-sub">· {COIN_RULES.BASE}/game × {coinStats.gamesPlayed}</span></span>
            <span class="coin-line-val tnum">{formatCoins(coinStats.breakdown.base)}</span>
          </div>
          <div class="coin-line">
            <span class="coin-line-dot dot-win"></span>
            <span class="coin-line-label">Win bonus <span class="coin-line-sub">· +{COIN_RULES.WIN_BONUS}/game × {coinStats.gamesWon}</span></span>
            <span class="coin-line-val tnum">{formatCoins(coinStats.breakdown.winBonus)}</span>
          </div>
          <div class="coin-line">
            <span class="coin-line-dot dot-daily"></span>
            <span class="coin-line-label">Daily bonus <span class="coin-line-sub">· first match each day</span></span>
            <span class="coin-line-val tnum">{formatCoins(coinStats.breakdown.dailyBonus)}</span>
          </div>
        </div>
      </div>
    {/if}

    <div class="stat-grid">
      <div class="stat-tile">
        <span class="stat-icon">◆</span>
        <span class="stat-val tnum">{winRate}%</span>
        <span class="stat-lbl">Win rate</span>
      </div>
      <div class="stat-tile">
        <span class="stat-icon">★</span>
        <span class="stat-val tnum">{peakElo}</span>
        <span class="stat-lbl">Peak Elo</span>
      </div>
      <div class="stat-tile">
        <span class="stat-icon">🔥</span>
        <span class="stat-val tnum">{bestStreak}</span>
        <span class="stat-lbl">Best streak</span>
      </div>
      <div class="stat-tile">
        <span class="stat-icon">#</span>
        <span class="stat-val tnum">{rankDisplay !== null ? '#' + rankDisplay : '—'}</span>
        <span class="stat-lbl">Rank</span>
      </div>
      <div class="stat-tile">
        <span class="stat-icon">⚔</span>
        <span class="stat-val tnum">{total}</span>
        <span class="stat-lbl">Matches</span>
      </div>
      <div class="stat-tile">
        <span class="stat-icon">◷</span>
        <span class="stat-val tnum">{daysActive}</span>
        <span class="stat-lbl">Days active</span>
      </div>
    </div>

    {#if form10.length > 0}
      <div class="card form-card">
        <div class="form-head">
          <div class="card-label nomb">Last {form10.length}</div>
          <span class="form-score tnum">{formWins}–{formLosses}</span>
        </div>
        <div class="form-dots">
          {#each form10 as r}
            <span class="form-dot" class:dot-w={r === 'W'} class:dot-l={r === 'L'}>{r}</span>
          {/each}
        </div>
      </div>
    {/if}

    {#if showFormats}
      <div class="card">
        <div class="card-label">Format breakdown</div>
        <div class="format-list">
          {#each formats as f}
            {@const pct = total > 0 ? (f.total / total) * 100 : 0}
            {@const fwr = f.total > 0 ? Math.round((f.wins / f.total) * 100) : 0}
            <div class="format-row">
              <div class="format-top">
                <span class="format-label">{f.label}</span>
                <span class="format-meta tnum">{f.total} · {fwr}%</span>
              </div>
              <div class="format-bar-track">
                <div class="format-bar-fill" style="width: {pct}%"></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if marginTotal > 0}
      <div class="card">
        <div class="card-label">Win margins</div>
        <div class="margin-list">
          <div class="margin-row">
            <div class="margin-top">
              <div class="margin-label-wrap">
                <span class="margin-label margin-label-dom">Dominant</span>
                <span class="margin-hint">11-0 to 11-2 · or a sweep</span>
              </div>
              <span class="margin-count tnum">{margins.dominant}</span>
            </div>
            <div class="margin-bar-track">
              <div class="margin-bar-fill margin-dominant" style="width: {(margins.dominant / marginMax) * 100}%"></div>
            </div>
          </div>
          <div class="margin-row">
            <div class="margin-top">
              <div class="margin-label-wrap">
                <span class="margin-label margin-label-com">Comfortable</span>
                <span class="margin-hint">11-3 to 11-6 · or 1 game dropped</span>
              </div>
              <span class="margin-count tnum">{margins.comfortable}</span>
            </div>
            <div class="margin-bar-track">
              <div class="margin-bar-fill margin-comfortable" style="width: {(margins.comfortable / marginMax) * 100}%"></div>
            </div>
          </div>
          <div class="margin-row">
            <div class="margin-top">
              <div class="margin-label-wrap">
                <span class="margin-label margin-label-grind">Grind</span>
                <span class="margin-hint">11-7 to 11-10 · or 2+ games dropped</span>
              </div>
              <span class="margin-count tnum">{margins.close}</span>
            </div>
            <div class="margin-bar-track">
              <div class="margin-bar-fill margin-close" style="width: {(margins.close / marginMax) * 100}%"></div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    {#if total > 0}
      <div class="card">
        <div class="card-label">Upset tracker</div>

        <!-- Giant-slayer wins -->
        <div class="upset-block upset-won">
          <div class="upset-head">
            <span class="upset-num tnum">{upsets.wonTotal}</span>
            <div class="upset-meta">
              <span class="upset-lbl">Giant-slayer wins</span>
              <span class="upset-desc">beat higher-rated opponents</span>
            </div>
          </div>
          {#if upsets.won.length > 0}
            <div class="upset-list">
              {#each upsets.won.slice(0, 5) as u}
                <button class="upset-item" on:click={() => push(`/player/${u.opp.id}`)}>
                  <div class="upset-av">
                    {#if u.opp.avatar_url}
                      <img src={u.opp.avatar_url} alt={u.opp.name} />
                    {:else}
                      {u.opp.name[0].toUpperCase()}
                    {/if}
                  </div>
                  <span class="upset-opp-name">{u.opp.name}</span>
                  {#if u.count > 1}<span class="upset-count">×{u.count}</span>{/if}
                  <span class="upset-gap upset-gap-pos">+{u.eloDiff}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Upset losses -->
        <div class="upset-block upset-lost">
          <div class="upset-head">
            <span class="upset-num tnum">{upsets.lostTotal}</span>
            <div class="upset-meta">
              <span class="upset-lbl">Upset losses</span>
              <span class="upset-desc">lost to lower-rated opponents</span>
            </div>
          </div>
          {#if upsets.lost.length > 0}
            <div class="upset-list">
              {#each upsets.lost.slice(0, 5) as u}
                <button class="upset-item" on:click={() => push(`/player/${u.opp.id}`)}>
                  <div class="upset-av">
                    {#if u.opp.avatar_url}
                      <img src={u.opp.avatar_url} alt={u.opp.name} />
                    {:else}
                      {u.opp.name[0].toUpperCase()}
                    {/if}
                  </div>
                  <span class="upset-opp-name">{u.opp.name}</span>
                  {#if u.count > 1}<span class="upset-count">×{u.count}</span>{/if}
                  <span class="upset-gap upset-gap-neg">−{u.eloDiff}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <div class="upset-foot">Elo gap based on current ratings</div>
      </div>
    {/if}

    {#if achievements.length > 0}
      <div class="card">
        <div class="card-label">Achievements</div>
        <div class="badges-grid">
          {#each achievements as badge}
            <div class="badge-item" title={badge.label}>
              <span class="badge-emoji">{badge.emoji}</span>
              <span class="badge-label">{badge.label}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if h2h.length > 0}
      <div class="card">
        <div class="card-label">Head-to-head</div>
        <table class="h2h">
          <thead>
            <tr>
              <th>Opponent</th>
              <th class="tnum">W</th>
              <th class="tnum">L</th>
            </tr>
          </thead>
          <tbody>
            {#each h2h as row}
              {@const isNemesis = nemesis && row.player.id === nemesis.player?.id && row.losses > 0}
              {@const isPB = punchingBag && row.player.id === punchingBag.player?.id && row.wins > 0 && !isNemesis}
              {@const rowTotal = row.wins + row.losses}
              {@const rowWr = rowTotal > 0 ? (row.wins / rowTotal) * 100 : 0}
              <tr class:nemesis={isNemesis} class:pb={isPB}>
                <td class="opp-name">
                  <div class="opp-top">
                    <span class="opp-name-text">{row.player.name}</span>
                    {#if isNemesis}<span class="tag nemesis-tag">nemesis</span>{/if}
                    {#if isPB}<span class="tag pb-tag">rival</span>{/if}
                  </div>
                  <div class="opp-bar">
                    <div class="opp-bar-fill" style="width: {rowWr}%"></div>
                  </div>
                </td>
                <td class="tnum win-num">{row.wins}</td>
                <td class="tnum loss-num">{row.losses}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if sifu || disciples.length > 0 || rival}
      <div class="card sifu-card">
        <div class="sifu-row">
          <div class="sifu-role-wrap">
            <span class="sifu-role-zh">師父</span>
            <span class="sifu-role-en">Sifu</span>
          </div>
          {#if sifu}
            <button class="sifu-person" on:click={() => push(`/player/${sifu.id}`)}>
              <div class="sifu-avatar">
                {#if sifu.avatar_url}
                  <img src={sifu.avatar_url} alt={sifu.name} />
                {:else}
                  {sifu.name[0].toUpperCase()}
                {/if}
              </div>
              <span class="sifu-name">{sifu.name}</span>
            </button>
          {:else}
            <span class="sifu-none">—</span>
          {/if}
        </div>

        {#if disciples.length > 0}
          <div class="sifu-row">
            <div class="sifu-role-wrap">
              <span class="sifu-role-zh">門徒</span>
              <span class="sifu-role-en">Students</span>
            </div>
            <div class="disciples-list">
              {#each disciples as d}
                <button class="sifu-person" on:click={() => push(`/player/${d.id}`)}>
                  <div class="sifu-avatar">
                    {#if d.avatar_url}
                      <img src={d.avatar_url} alt={d.name} />
                    {:else}
                      {d.name[0].toUpperCase()}
                    {/if}
                  </div>
                  <span class="sifu-name">{d.name}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        {#if rival}
          <div class="sifu-row rival-row">
            <div class="sifu-role-wrap">
              <span class="sifu-role-zh rival-zh">宿敵</span>
              <span class="sifu-role-en">Archrival</span>
            </div>
            <button class="sifu-person" on:click={() => push(`/player/${rival.id}`)}>
              <div class="sifu-avatar rival-avatar">
                {#if rival.avatar_url}
                  <img src={rival.avatar_url} alt={rival.name} />
                {:else}
                  {rival.name[0].toUpperCase()}
                {/if}
              </div>
              <span class="sifu-name rival-name">{rival.name}</span>
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <EditPlayerModal bind:open={editOpen} {player} {allPlayers} />
{/if}

<style>
  .wrap {
    padding: 16px 16px calc(var(--nav-h) + 48px + env(safe-area-inset-bottom));
    max-width: 480px;
    margin: 0 auto;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .back {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: var(--amber);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 4px 0;
    -webkit-tap-highlight-color: transparent;
  }

  .edit-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    color: #888;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
  }
  .edit-btn:hover { background: rgba(255,255,255,0.1); color: #f0f0f0; }

  /* HERO */
  .hero {
    position: relative;
    padding: 20px 18px;
    margin-bottom: 14px;
    border-radius: 16px;
    background:
      radial-gradient(140% 120% at 100% 0%, rgba(245,158,11,0.14) 0%, rgba(245,158,11,0) 55%),
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .hero-glow {
    position: absolute;
    top: -50%;
    right: -30%;
    width: 80%;
    height: 140%;
    background: radial-gradient(closest-side, rgba(245,158,11,0.18), transparent 70%);
    pointer-events: none;
    filter: blur(8px);
  }

  .hero-inner {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .avatar-wrap {
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 2px solid rgba(245,158,11,0.35);
    box-shadow: 0 0 0 4px rgba(245,158,11,0.07), 0 4px 16px rgba(0,0,0,0.4);
  }

  .avatar-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 50%;
  }

  .avatar-initial {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(245,158,11,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 800;
    color: var(--amber);
  }

  .rank-badge {
    position: absolute;
    bottom: -4px;
    right: -6px;
    font-size: 11px;
    font-weight: 800;
    padding: 3px 7px;
    border-radius: 10px;
    background: var(--surface);
    color: var(--text);
    border: 1.5px solid var(--border);
    letter-spacing: 0.02em;
    line-height: 1;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .rank-badge.rank-gold {
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    color: #1a1a1a;
    border-color: #fbbf24;
  }
  .rank-badge.rank-silver {
    background: linear-gradient(135deg, #9ca3af, #d1d5db);
    color: #1a1a1a;
    border-color: #d1d5db;
  }
  .rank-badge.rank-bronze {
    background: linear-gradient(135deg, #b45309, #d97706);
    color: #1a1a1a;
    border-color: #d97706;
  }

  .header-info { flex: 1; min-width: 0; }

  .name-line {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }

  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .paddle-badge {
    font-size: 12px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 5px;
    background: rgba(245,158,11,0.12);
    color: var(--amber);
    flex-shrink: 0;
    letter-spacing: 0.05em;
  }

  .philosophy {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--text-muted);
    font-style: italic;
    line-height: 1.4;
  }

  .elo-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }

  .elo {
    font-size: 34px;
    font-weight: 800;
    letter-spacing: -1.5px;
    color: var(--text);
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #d4d4d4 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .elo-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }

  .trend {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 0.02em;
  }
  .trend-up { background: rgba(34,197,94,0.15); color: var(--green); }
  .trend-down { background: rgba(239,68,68,0.15); color: var(--red); }

  .streak {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .streak-w { background: rgba(34,197,94,0.15); color: var(--green); }
  .streak-l { background: rgba(239,68,68,0.15); color: var(--red); }

  .record {
    font-size: 13px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .record .w { color: var(--green); font-weight: 600; }
  .record .l { color: var(--red); font-weight: 600; }
  .record .sep { opacity: 0.4; }
  .prov {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    opacity: 0.7;
  }

  /* CARDS */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .card-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-bottom: 12px;
  }
  .card-label.nomb { margin-bottom: 0; }

  /* SPARK */
  .spark-card { padding-bottom: 14px; }
  .spark-wrap {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .spark-svg {
    display: block;
    height: 90px;
  }

  .spark-labels {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .spark-label-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }
  .spark-label-cell.mid { align-items: center; }
  .spark-label-cell.end { align-items: flex-end; }

  .spark-label-key {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    opacity: 0.7;
  }

  .spark-label-val {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  }
  .spark-label-val.peak { color: var(--amber); }
  .spark-label-val.up { color: var(--green); }
  .spark-label-val.down { color: var(--red); }

  /* STAT GRID */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .stat-tile {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 10px 12px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    overflow: hidden;
  }
  .stat-tile::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(245,158,11,0.05), transparent 60%);
    pointer-events: none;
  }

  .stat-icon {
    position: absolute;
    top: 8px;
    right: 10px;
    font-size: 12px;
    color: var(--amber);
    opacity: 0.55;
  }

  .stat-val {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--text);
    line-height: 1.1;
  }

  .stat-lbl {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* FORM */
  .form-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .form-score {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
  }

  .form-dots {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .form-dot {
    flex: 1;
    min-width: 26px;
    height: 30px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.02em;
    border: 1px solid transparent;
  }
  .dot-w {
    background: rgba(34,197,94,0.14);
    border-color: rgba(34,197,94,0.35);
    color: var(--green);
  }
  .dot-l {
    background: rgba(239,68,68,0.12);
    border-color: rgba(239,68,68,0.32);
    color: var(--red);
  }

  /* FORMAT BREAKDOWN */
  .format-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .format-row { display: flex; flex-direction: column; gap: 5px; }

  .format-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .format-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: 0.04em;
  }

  .format-meta {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 600;
  }

  .format-bar-track {
    height: 6px;
    background: rgba(255,255,255,0.05);
    border-radius: 3px;
    overflow: hidden;
  }

  .format-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--amber), rgba(245,158,11,0.6));
    border-radius: 3px;
  }

  /* ── PONG COINS ─────────────────────────── */

  /* Hero pill (compact coin indicator in hero section) */
  .hero-coin-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px 5px 6px;
    margin-top: 10px;
    background: linear-gradient(135deg, rgba(245,193,74,0.12), rgba(160,106,0,0.08));
    border: 1px solid rgba(245,193,74,0.3);
    border-radius: 999px;
    box-shadow:
      0 1px 3px rgba(160,106,0,0.15),
      inset 0 1px 0 rgba(255,255,255,0.05);
  }

  .hero-coin-svg { width: 18px; height: 18px; display: block; flex-shrink: 0; }

  .hero-coin-val {
    font-size: 13px;
    font-weight: 800;
    color: #f5c14a;
    letter-spacing: 0.01em;
  }

  /* Main coin card */
  .coin-card {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(ellipse 80% 60% at 20% 10%, rgba(245,193,74,0.1), transparent 70%),
      var(--surface);
    border-color: rgba(245,193,74,0.22);
  }

  .coin-sheen {
    position: absolute;
    top: -40%;
    left: -40%;
    width: 100%;
    height: 100%;
    background: radial-gradient(ellipse, rgba(255,224,140,0.08), transparent 60%);
    pointer-events: none;
  }

  .coin-header {
    position: relative;
    margin-bottom: 14px;
  }

  .coin-title {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .coin-name {
    font-size: 18px;
    font-weight: 800;
    color: #f5c14a;
    letter-spacing: -0.005em;
  }

  .coin-abbr {
    font-size: 10px;
    font-weight: 700;
    color: rgba(245,193,74,0.55);
    padding: 2px 6px;
    border: 1px solid rgba(245,193,74,0.25);
    border-radius: 4px;
    letter-spacing: 0.08em;
  }

  .coin-sub {
    display: block;
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.55;
    font-style: italic;
    margin-top: 4px;
  }

  .coin-main {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 0 18px;
  }

  .big-coin {
    flex-shrink: 0;
    width: 80px;
    height: 80px;
    filter: drop-shadow(0 4px 12px rgba(245,193,74,0.35));
    animation: coinRise 0.5s ease-out both;
  }
  .big-coin svg { width: 100%; height: 100%; display: block; }

  @keyframes coinRise {
    from { transform: translateY(6px) scale(0.95); opacity: 0; }
    to   { transform: translateY(0) scale(1);      opacity: 1; }
  }

  .coin-numeric {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .coin-total {
    font-size: 36px;
    font-weight: 900;
    color: #f5c14a;
    letter-spacing: -1px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    background: linear-gradient(180deg, #ffe89a 0%, #f5c14a 55%, #c99320 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .coin-total-lbl {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 4px;
  }

  /* Tier badge + progress */
  .tier-block {
    position: relative;
    padding: 12px 0;
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .tier-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }

  .tier-badge {
    display: inline-flex;
    align-items: baseline;
    gap: 7px;
    padding: 5px 10px 5px 11px;
    border-radius: 20px;
    border: 1px solid;
    font-weight: 800;
  }

  .tier-name {
    font-size: 12px;
    letter-spacing: 0.03em;
  }

  .tier-zh {
    font-size: 10px;
    opacity: 0.75;
    letter-spacing: 0.05em;
  }

  .tier-next {
    font-size: 11px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .tier-next strong {
    color: var(--text);
    font-weight: 700;
  }

  .tier-bar-track {
    height: 6px;
    background: rgba(255,255,255,0.04);
    border-radius: 3px;
    overflow: hidden;
  }

  .tier-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease;
    box-shadow: 0 0 8px rgba(245,193,74,0.3);
  }

  /* Breakdown */
  .coin-breakdown {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .coin-line {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 2px;
  }

  .coin-line-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(245,193,74,0.8);
    flex-shrink: 0;
    box-shadow: 0 0 6px rgba(245,193,74,0.4);
  }
  .coin-line-dot.dot-win   { background: var(--green); box-shadow: 0 0 6px rgba(34,197,94,0.4); }
  .coin-line-dot.dot-daily { background: #5fb8e6; box-shadow: 0 0 6px rgba(95,184,230,0.4); }

  .coin-line-label {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    min-width: 0;
  }

  .coin-line-sub {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 500;
    opacity: 0.7;
  }

  .coin-line-val {
    font-size: 13px;
    font-weight: 800;
    color: #f5c14a;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  /* WIN MARGINS */
  .margin-list { display: flex; flex-direction: column; gap: 14px; }

  .margin-row { display: flex; flex-direction: column; gap: 6px; }

  .margin-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .margin-label-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .margin-label {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: -0.005em;
  }

  .margin-label-dom   { color: var(--amber); }
  .margin-label-com   { color: #d4a04a; }
  .margin-label-grind { color: var(--text); }

  .margin-hint {
    font-size: 10px;
    color: var(--text-muted);
    line-height: 1.3;
    opacity: 0.75;
  }

  .margin-count {
    font-size: 15px;
    font-weight: 800;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    padding-top: 2px;
  }

  .margin-bar-track {
    height: 8px;
    background: rgba(255,255,255,0.04);
    border-radius: 4px;
    overflow: hidden;
  }

  .margin-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  .margin-dominant { background: var(--amber); box-shadow: 0 0 8px rgba(245,158,11,0.3); }
  .margin-comfortable { background: rgba(245,158,11,0.55); }
  .margin-close { background: rgba(255,255,255,0.22); }

  /* UPSETS */
  .upset-block {
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: rgba(255,255,255,0.02);
    margin-bottom: 10px;
  }
  .upset-block:last-of-type { margin-bottom: 0; }
  .upset-won  { border-color: rgba(34,197,94,0.28); background: rgba(34,197,94,0.04); }
  .upset-lost { border-color: rgba(239,68,68,0.28); background: rgba(239,68,68,0.04); }

  .upset-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .upset-num {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1;
    min-width: 34px;
  }
  .upset-won .upset-num { color: var(--green); }
  .upset-lost .upset-num { color: var(--red); }

  .upset-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .upset-lbl {
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
  }

  .upset-desc {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.3;
  }

  .upset-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 4px;
    border-top: 1px solid rgba(255,255,255,0.05);
    margin-top: 4px;
  }

  .upset-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 8px;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 8px;
    text-align: left;
    width: 100%;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.12s;
  }
  .upset-item:hover { background: rgba(255,255,255,0.04); }
  .upset-item:active { background: rgba(255,255,255,0.06); }

  .upset-av {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .upset-av img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .upset-opp-name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .upset-count {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    background: rgba(255,255,255,0.06);
    padding: 2px 6px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  .upset-gap {
    font-size: 11px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    padding: 3px 8px;
    border-radius: 10px;
    flex-shrink: 0;
  }
  .upset-gap-pos { color: var(--green); background: rgba(34,197,94,0.1); }
  .upset-gap-neg { color: var(--red); background: rgba(239,68,68,0.1); }

  .upset-foot {
    margin-top: 10px;
    font-size: 10px;
    color: var(--text-muted);
    text-align: center;
    opacity: 0.55;
    font-style: italic;
  }

  /* ACHIEVEMENTS */
  .badges-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .badge-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: rgba(245,158,11,0.06);
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: 12px;
    padding: 12px 14px;
    min-width: 72px;
    transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .badge-item:hover {
    transform: translateY(-1px);
    background: rgba(245,158,11,0.1);
    box-shadow: 0 4px 16px rgba(245,158,11,0.15);
  }
  .badge-emoji { font-size: 24px; line-height: 1; }
  .badge-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--amber);
    text-align: center;
    letter-spacing: 0.02em;
  }

  /* H2H */
  table.h2h {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  thead th {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    text-align: left;
    padding-bottom: 10px;
  }

  thead th:not(:first-child) { text-align: center; }

  tbody tr {
    border-top: 1px solid var(--border);
  }

  tbody td {
    padding: 10px 0;
    color: var(--text);
    vertical-align: middle;
  }

  tbody td:not(:first-child) { text-align: center; width: 40px; }

  .opp-name {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-weight: 500;
    padding-right: 10px;
  }

  .opp-top {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .opp-name-text {
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }

  .opp-bar {
    height: 4px;
    background: rgba(239,68,68,0.18);
    border-radius: 2px;
    overflow: hidden;
  }

  .opp-bar-fill {
    height: 100%;
    background: var(--green);
    border-radius: 2px;
  }

  .tag {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 4px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .nemesis-tag { background: rgba(239,68,68,0.15); color: var(--red); }
  .pb-tag { background: rgba(34,197,94,0.15); color: var(--green); }

  .win-num { color: var(--green); font-weight: 700; }
  .loss-num { color: var(--red); font-weight: 700; }

  /* SIFU */
  .sifu-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .sifu-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .sifu-role-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    width: 38px;
    flex-shrink: 0;
  }

  .sifu-role-zh {
    font-size: 13px;
    font-weight: 700;
    color: #aaa;
    letter-spacing: 0.05em;
    line-height: 1;
  }

  .sifu-role-en {
    font-size: 9px;
    font-weight: 500;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1;
  }

  .sifu-none {
    font-size: 16px;
    color: #444;
  }

  .disciples-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .sifu-person {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.15s;
  }
  .sifu-person:active { opacity: 0.7; }

  .sifu-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--surface);
    border: 1.5px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 16px;
    font-weight: 700;
    color: #666;
    flex-shrink: 0;
  }
  .sifu-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .sifu-name {
    font-size: 10px;
    font-weight: 600;
    color: #ccc;
    max-width: 48px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }

  .rival-row { padding-top: 10px; border-top: 1px solid var(--border); margin-top: 2px; }
  .rival-zh { color: var(--red) !important; }
  .rival-avatar { border-color: rgba(239,68,68,0.35) !important; }
  .rival-name { color: var(--red) !important; }
</style>
