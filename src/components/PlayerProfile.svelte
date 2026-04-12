<script>
  import { push } from 'svelte-spa-router'
  import EditPlayerModal from './EditPlayerModal.svelte'
  import { getAchievements } from '../lib/achievements.js'

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

  const SPARK_W = 280
  const SPARK_H = 72

  function sparkPath(history) {
    if (!history || history.length < 2) return ''
    const min = Math.min(...history)
    const max = Math.max(...history)
    const range = max - min || 1
    const pts = history.map((v, i) => {
      const x = (i / (history.length - 1)) * SPARK_W
      const y = SPARK_H - ((v - min) / range) * (SPARK_H - 8) - 4
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return 'M ' + pts.join(' L ')
  }

  function sparkEndY(history) {
    if (!history || history.length < 2) return null
    const min = Math.min(...history)
    const max = Math.max(...history)
    const range = max - min || 1
    return (SPARK_H - ((history[history.length - 1] - min) / range) * (SPARK_H - 8) - 4).toFixed(1)
  }

  function longestWinStreak(pid, sorted) {
    let max = 0, cur = 0
    for (const m of sorted) {
      if (m.winner_id === pid) { cur++; if (cur > max) max = cur }
      else if (m.loser_id === pid) { cur = 0 }
    }
    return max
  }

  function headToHead(pid, sorted) {
    const map = {}
    for (const m of sorted) {
      if (m.winner_id !== pid && m.loser_id !== pid) continue
      const opp = m.winner_id === pid ? m.loser : m.winner
      if (!opp) continue
      if (!map[opp.id]) map[opp.id] = { player: opp, wins: 0, losses: 0 }
      if (m.winner_id === pid) map[opp.id].wins++
      else map[opp.id].losses++
    }
    return Object.values(map).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
  }

  $: sorted = [...allMatches].sort((a, b) =>
    a.played_at < b.played_at ? -1 : a.played_at > b.played_at ? 1 : 0
  )
  $: h2h = player ? headToHead(player.id, sorted) : []
  $: streak = player ? longestWinStreak(player.id, sorted) : 0
  $: total = player ? player.wins + player.losses : 0
  $: winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0
  $: nemesis = h2h.reduce((acc, r) => (!acc || r.losses > acc.losses) ? r : acc, null)
  $: punchingBag = h2h.reduce((acc, r) => (!acc || r.wins > acc.wins) ? r : acc, null)
  $: path = player ? sparkPath(player.history) : ''
  $: endY = player ? sparkEndY(player.history) : null
  $: startElo = player?.history?.[0] ?? 1000
  $: endElo = player?.history?.[player.history.length - 1] ?? 1000
  $: rank = player ? allPlayers.findIndex(p => p.id === player.id) : -1
  $: achievements = player ? getAchievements(player, rank) : []
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

    <div class="header">
      <div class="avatar-wrap">
        {#if player.avatar_url}
          <img src={player.avatar_url} alt={player.name} class="avatar-photo" />
        {:else}
          <div class="avatar-initial">{player.name[0].toUpperCase()}</div>
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
        </div>
      </div>
    </div>

    {#if player.history && player.history.length >= 2}
      <div class="card spark-card">
        <div class="card-label">Elo over time</div>
        <div class="spark-wrap">
          <svg viewBox="0 0 {SPARK_W} {SPARK_H}" width="100%" preserveAspectRatio="none">
            <path d={path} fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            {#if endY !== null}
              <circle cx={SPARK_W} cy={endY} r="3" fill="var(--amber)" />
            {/if}
          </svg>
          <div class="spark-labels">
            <span class="tnum">{startElo}</span>
            <span class="tnum" class:up={endElo >= startElo} class:down={endElo < startElo}>{endElo}</span>
          </div>
        </div>
      </div>
    {/if}

    <div class="stats-row">
      <div class="stat">
        <span class="stat-val tnum">{winRate}%</span>
        <span class="stat-lbl">Win rate</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <span class="stat-val tnum">{total}</span>
        <span class="stat-lbl">Matches</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <span class="stat-val tnum">{streak}</span>
        <span class="stat-lbl">Best streak</span>
      </div>
    </div>

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
              <tr class:nemesis={isNemesis} class:pb={isPB}>
                <td class="opp-name">
                  {row.player.name}
                  {#if isNemesis}<span class="tag nemesis-tag">nemesis</span>{/if}
                  {#if isPB}<span class="tag pb-tag">rival</span>{/if}
                </td>
                <td class="tnum win-num">{row.wins}</td>
                <td class="tnum loss-num">{row.losses}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

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

  <EditPlayerModal bind:open={editOpen} {player} {allPlayers} />
{/if}

<style>
  .wrap {
    padding: 16px 16px calc(var(--nav-h) + 24px + env(safe-area-inset-bottom));
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
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

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }

  .avatar-wrap {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    flex-shrink: 0;
    overflow: hidden;
    border: 2px solid rgba(245,158,11,0.3);
  }

  .avatar-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatar-initial {
    width: 100%;
    height: 100%;
    background: var(--amber-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
    color: var(--amber);
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
    font-size: 20px;
    font-weight: 700;
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
    margin: 0 0 6px;
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
  }

  .elo {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -1px;
    color: var(--text);
    line-height: 1;
  }

  .elo-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

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
  }

  .record .w { color: var(--green); }
  .record .l { color: var(--red); }
  .record .sep { opacity: 0.4; }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .card-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  /* Achievements */
  .badges-grid {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .badge-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    background: rgba(245,158,11,0.06);
    border: 1px solid rgba(245,158,11,0.18);
    border-radius: 12px;
    padding: 10px 14px;
    min-width: 62px;
  }
  .badge-emoji { font-size: 22px; line-height: 1; }
  .badge-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--amber);
    text-align: center;
    letter-spacing: 0.02em;
  }

  .spark-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .spark-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-muted);
  }

  .spark-labels .up { color: var(--green); }
  .spark-labels .down { color: var(--red); }

  .stats-row {
    display: flex;
    align-items: stretch;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    margin-bottom: 12px;
    overflow: hidden;
  }

  .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 8px;
    gap: 4px;
  }

  .stat-val {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text);
  }

  .stat-lbl {
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .stat-divider {
    width: 1px;
    background: var(--border);
    margin: 12px 0;
  }

  table.h2h {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  thead th {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
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
  }

  tbody td:not(:first-child) { text-align: center; }

  .opp-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
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

  /* 師生關係 */
  .sifu-card { display: flex; flex-direction: column; gap: 14px; }

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
