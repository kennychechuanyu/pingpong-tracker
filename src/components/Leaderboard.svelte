<script>
  import { push } from 'svelte-spa-router'
  import RulesModal from './RulesModal.svelte'
  import AddPlayerModal from './AddPlayerModal.svelte'
  import { getAchievements } from '../lib/achievements.js'

  export let rankings = []
  export let deltas = {}

  let rulesOpen = false
  let addPlayerOpen = false

  $: ranked = rankings.filter(p => p.games > 0)
  $: unranked = rankings.filter(p => p.games === 0)

  const podiumColors = [
    { accent: '#FFD700', bg: 'rgba(255,215,0,0.07)',    border: 'rgba(255,215,0,0.3)'    },
    { accent: '#B8BEC6', bg: 'rgba(184,190,198,0.05)',  border: 'rgba(184,190,198,0.22)' },
    { accent: '#CD7F32', bg: 'rgba(205,127,50,0.07)',   border: 'rgba(205,127,50,0.28)'  },
  ]
</script>

<RulesModal bind:open={rulesOpen} />
<AddPlayerModal bind:open={addPlayerOpen} />

<div class="wrap">
  <header>
    <div>
      <p class="brand">Ping Pong Leuven</p>
      <p class="brand-sub">Psychological Institute</p>
      <h1>Rankings</h1>
    </div>
    <div class="header-actions">
      <span class="count">{ranked.length} ranked</span>
      <button class="icon-btn" on:click={() => (addPlayerOpen = true)} aria-label="Add player">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/>
          <line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
      </button>
      <button class="icon-btn" on:click={() => (rulesOpen = true)} aria-label="How rankings work">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
      </button>
    </div>
  </header>

  {#if rankings.length === 0}
    <div class="empty">
      <div class="empty-icon">🏓</div>
      <p>No one's here yet.</p>
      <p class="sub">Tap the person icon above to add your crew.</p>
    </div>
  {:else}
    <ul>
      {#each ranked as player, i}
        {@const delta = deltas[player.id] ?? 0}
        {@const isTop = i === 0}
        {@const isPodium = i < 3}
        {@const pc = podiumColors[i]}
        {@const total = player.wins + player.losses}
        {@const winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0}

        <li style="animation-delay: {i * 40}ms">
          <button
            class="row"
            class:podium={isPodium}
            style={isPodium
              ? `border-color: ${pc.border}; border-left: 4px solid ${pc.accent}; background: linear-gradient(100deg, ${pc.bg} 0%, var(--surface) 55%);`
              : ''}
            on:click={() => push(`/player/${player.id}`)}
          >
            <!-- Rank -->
            <div class="rank-col" class:rank-podium={isPodium}>
              {#if isPodium}
                <span class="medal-num" style="color: {pc.accent}">{i + 1}</span>
              {:else}
                <span class="rank-num">{i + 1}</span>
              {/if}
            </div>

            <!-- Avatar -->
            <div
              class="avatar-cell"
              class:avatar-podium={isPodium}
              style={isPodium ? `border: 2px solid ${pc.accent}40;` : ''}
            >
              {#if player.avatar_url}
                <img src={player.avatar_url} alt={player.name} class="avatar-img" />
              {:else}
                <div class="avatar-initial" style={isPodium ? `color: ${pc.accent}; background: ${pc.accent}18;` : ''}>
                  {player.name[0].toUpperCase()}
                </div>
              {/if}
            </div>

            <!-- Info -->
            <div class="info">
              <!-- Name row -->
              <div class="name-row">
                <span
                  class="name"
                  class:provisional={player.provisional}
                  class:name-podium={isPodium}
                >{player.name}</span>
                {#if player.paddle_type}
                  <span class="paddle-tag">{player.paddle_type}</span>
                {/if}
                {#if isTop && !player.provisional}
                  <span class="crown">♛</span>
                {/if}
                {#if player.provisional}
                  <span class="prov-badge">PROV</span>
                {:else if player.streak.count >= 2}
                  <span class="streak" class:streak-w={player.streak.type === 'W'} class:streak-l={player.streak.type === 'L'}>
                    {player.streak.type}{player.streak.count}
                  </span>
                {/if}
                {#each getAchievements(player, i).slice(0, 2) as badge}
                  <span class="badge-chip" title={badge.label}>{badge.emoji}</span>
                {/each}
              </div>

              <!-- Stats row -->
              <div class="stats-row">
                {#if total > 0}
                  <span class="win-rate tnum" style={isPodium ? `color: ${pc.accent};` : ''}>{winRate}%</span>
                  <span class="stat-sep">·</span>
                {/if}
                <span class="wins tnum">{player.wins}W</span>
                <span class="stat-sep">·</span>
                <span class="losses tnum">{player.losses}L</span>
                {#if player.form.length > 0}
                  <div class="form" aria-label="Recent form">
                    {#each player.form as result}
                      <span
                        class="dot"
                        class:dot-w={result === 'W'}
                        class:dot-l={result === 'L'}
                        class:dot-lg={isPodium}
                      ></span>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <!-- Elo -->
            <div class="elo-col">
              <span class="elo tnum" class:elo-podium={isPodium}>{player.elo}</span>
              {#if delta !== 0}
                <span class="delta tnum" class:pos={delta > 0} class:neg={delta < 0}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              {/if}
            </div>

            <div class="chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </button>
        </li>
      {/each}
    </ul>

    {#if unranked.length > 0}
      <div class="unranked-section">
        <span class="unranked-label">Yet to play</span>
        <div class="unranked-list">
          {#each unranked as player}
            <button class="unranked-item" on:click={() => push(`/player/${player.id}`)}>
              <div class="unranked-av">
                {#if player.avatar_url}
                  <img src={player.avatar_url} alt={player.name} />
                {:else}
                  {player.name[0].toUpperCase()}
                {/if}
              </div>
              <span class="unranked-name">{player.name}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <p class="contact">Questions? <a href="mailto:kenny.yu@kuleuven.be">kenny.yu@kuleuven.be</a></p>
</div>

<style>
  .wrap {
    padding: 24px 16px calc(var(--nav-h) + 24px + env(safe-area-inset-bottom));
  }

  header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .brand {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--amber);
  }

  .brand-sub {
    margin: 1px 0 2px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    opacity: 0.7;
  }

  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 4px;
  }

  .count {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .icon-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .icon-btn:hover { color: var(--amber); border-color: rgba(245,158,11,0.4); }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  ul li { animation: fadeUp 0.3s ease both; }

  /* ── Base row ─────────────────────────────── */
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 12px 12px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    cursor: pointer;
    transition: opacity 0.12s, transform 0.1s;
    width: 100%;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }

  .row:active { transform: scale(0.985); opacity: 0.85; }

  /* ── Podium rows ──────────────────────────── */
  .row.podium {
    padding: 14px 12px 14px 12px; /* border-left eats 4px, so no extra left pad */
    border-radius: 14px;
    gap: 12px;
  }

  /* ── Rank column ──────────────────────────── */
  .rank-col {
    width: 28px;
    flex-shrink: 0;
    text-align: center;
  }

  .rank-col.rank-podium {
    width: 34px;
  }

  .medal-num {
    font-size: 26px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -1px;
    display: block;
  }

  .rank-num {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
  }

  /* ── Avatar ───────────────────────────────── */
  .avatar-cell {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    flex-shrink: 0;
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .avatar-cell.avatar-podium {
    width: 50px;
    height: 50px;
  }

  .avatar-img {
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
    font-size: 15px;
    font-weight: 700;
    color: var(--amber);
  }

  /* ── Info ─────────────────────────────────── */
  .info { flex: 1; min-width: 0; }

  .name-row {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 5px;
    flex-wrap: nowrap;
  }

  .name {
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text);
  }

  .name.provisional { color: var(--text-muted); }

  .name.name-podium {
    font-size: 16px;
    font-weight: 700;
  }

  .paddle-tag {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.03em;
    flex-shrink: 0;
    opacity: 0.7;
  }

  .crown {
    font-size: 12px;
    color: #FFD700;
    line-height: 1;
    flex-shrink: 0;
  }

  .prov-badge {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 4px;
    letter-spacing: 0.05em;
    background: rgba(245,158,11,0.12);
    color: var(--amber);
    flex-shrink: 0;
  }

  .streak {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 4px;
    letter-spacing: 0.03em;
    flex-shrink: 0;
  }

  .streak-w { background: rgba(34,197,94,0.15); color: var(--green); }
  .streak-l { background: rgba(239,68,68,0.15); color: var(--red); }

  .badge-chip {
    font-size: 13px;
    line-height: 1;
    flex-shrink: 0;
  }

  /* ── Stats row ────────────────────────────── */
  .stats-row {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: nowrap;
  }

  .win-rate {
    font-size: 12px;
    font-weight: 700;
    color: var(--amber);
    flex-shrink: 0;
  }

  .stat-sep {
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.35;
    flex-shrink: 0;
  }

  .wins {
    font-size: 12px;
    font-weight: 600;
    color: var(--green);
    flex-shrink: 0;
  }

  .losses {
    font-size: 12px;
    font-weight: 600;
    color: var(--red);
    flex-shrink: 0;
  }

  .form {
    display: flex;
    gap: 3px;
    align-items: center;
    margin-left: 4px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--text-muted);
    opacity: 0.2;
  }

  .dot.dot-lg { width: 8px; height: 8px; }
  .dot-w { background: var(--green); opacity: 1; }
  .dot-l { background: var(--red); opacity: 1; }

  /* ── Elo column ───────────────────────────── */
  .elo-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
  }

  .elo {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
  }

  .elo.elo-podium {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -1px;
  }

  .delta {
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .delta.pos { color: var(--green); }
  .delta.neg { color: var(--red); }

  .chevron {
    color: var(--text-muted);
    opacity: 0.3;
    flex-shrink: 0;
  }

  /* ── Empty ────────────────────────────────── */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 64px 24px;
    gap: 8px;
  }

  .empty-icon { font-size: 48px; margin-bottom: 8px; }

  .empty p {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }

  .empty .sub {
    font-size: 14px;
    font-weight: 400;
    color: var(--text-muted);
  }

  /* ── Contact ──────────────────────────────── */
  /* Unranked / yet to play */
  .unranked-section {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .unranked-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    opacity: 0.5;
    display: block;
    margin-bottom: 10px;
  }

  .unranked-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .unranked-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    -webkit-tap-highlight-color: transparent;
    opacity: 0.45;
    transition: opacity 0.15s;
  }

  .unranked-item:hover { opacity: 0.7; }

  .unranked-av {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px dashed rgba(255,255,255,0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 15px;
    font-weight: 700;
    color: #555;
  }

  .unranked-av img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: grayscale(0.5);
  }

  .unranked-name {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    max-width: 56px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }

  .contact {
    margin: 24px 0 0;
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.5;
    text-align: center;
  }

  .contact a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
