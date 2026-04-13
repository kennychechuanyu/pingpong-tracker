<script>
  import { push } from 'svelte-spa-router'
  import { deleteChallenge, pendingChallenge, enrichedChallenges, enrichedReactions, sessionPlayer, players, castReaction, rematchPlayers } from '../lib/stores.js'
  import EditMatchModal from './EditMatchModal.svelte'
  import PinPrompt from './PinPrompt.svelte'

  export let enrichedMatches = []

  let editMatch = null
  let editOpen = false
  let longPressTimer = null

  // ── Reactions ─────────────────────────────
  const REACT_EMOJIS = ['🔥', '😱', '💀', '🙏', '👏']
  let reactTarget = null   // { matchId, emoji }
  let reactPinOpen = false
  $: allPinPlayers = $players.filter(p => p.pin_hash)

  function myReaction(matchId) {
    return $sessionPlayer ? $enrichedReactions.find(r => r.match_id === matchId && r.player_id === $sessionPlayer.id) : null
  }
  function emojiCount(matchId, emoji) {
    return $enrichedReactions.filter(r => r.match_id === matchId && r.emoji === emoji).length
  }

  function startReact(match, emoji) {
    if (!allPinPlayers.length) return
    if ($sessionPlayer) { doReact($sessionPlayer, match.id, emoji); return }
    reactTarget = { matchId: match.id, emoji }
    reactPinOpen = true
  }

  function onReactPinSuccess(e) {
    const p = e.detail
    sessionPlayer.set(p)
    if (reactTarget) doReact(p, reactTarget.matchId, reactTarget.emoji)
  }

  async function doReact(voter, matchId, emoji) {
    reactTarget = null
    try { await castReaction(matchId, voter.id, emoji) } catch {}
  }

  function startRematch(match) {
    rematchPlayers.set({ winner: match.winner, loser: match.loser })
    push('/log')
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  function relativeTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return null
  }

  $: groupedMatches = (() => {
    const groups = []
    let currentKey = null
    for (const match of enrichedMatches) {
      const key = formatDate(match.played_at)
      if (key !== currentKey) {
        currentKey = key
        groups.push({ label: key, matches: [] })
      }
      groups[groups.length - 1].matches.push(match)
    }
    return groups
  })()

  function openEdit(match) { editMatch = match; editOpen = true }

  function startLongPress(match) {
    longPressTimer = setTimeout(() => {
      openEdit(match)
      if (navigator.vibrate) navigator.vibrate(40)
    }, 600)
  }
  function cancelLongPress() { clearTimeout(longPressTimer); longPressTimer = null }

  function logResult(challenge) { pendingChallenge.set(challenge); push('/log') }
  function initial(name) { return name?.[0]?.toUpperCase() ?? '?' }
</script>

<div class="wrap">
  <header>
    <h1>History</h1>
    <span class="count">{enrichedMatches.length} games</span>
  </header>

  <!-- Pending challenges -->
  {#if $enrichedChallenges.length > 0}
    <div class="challenges-block">
      <div class="challenges-heading">
        <span class="ch-icon">⚔️</span>
        <span class="ch-title">Challenges</span>
        <span class="ch-count">{$enrichedChallenges.length} pending</span>
      </div>
      {#each $enrichedChallenges as c}
        <div class="challenge-card">
          <div class="c-players">
            <span class="c-name">{c.player1.name}</span>
            <span class="c-vs">vs</span>
            <span class="c-name">{c.player2.name}</span>
          </div>
          <div class="c-meta">
            {#if c.stakes}<span class="c-stakes">🎲 {c.stakes}</span>{/if}
            {#if c.best_of > 1}<span class="c-bo">Bo{c.best_of}</span>{/if}
            {#if c.scheduled_at}<span class="c-when">📅 {formatDate(c.scheduled_at)} {formatTime(c.scheduled_at)}</span>{/if}
          </div>
          <div class="c-actions">
            <button class="btn-log" on:click={() => logResult(c)}>Log Result →</button>
            <button class="btn-dismiss" on:click={() => deleteChallenge(c.id)} aria-label="Remove">✕</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if enrichedMatches.length === 0}
    <div class="empty">
      <div class="empty-icon">🏓</div>
      <p>No games yet.</p>
      <p class="sub">First one to lose buys bubble tea.</p>
    </div>
  {:else}
    <div class="feed">
      {#each groupedMatches as group, gi}
        <!-- Date separator -->
        <div class="date-sep">
          <span class="date-line"></span>
          <span class="date-label">{group.label}</span>
          <span class="date-line"></span>
        </div>

        {#each group.matches as match, i}
          <div
            class="card"
            style="animation-delay: {(gi * 4 + i) * 20}ms"
            on:touchstart={() => startLongPress(match)}
            on:touchend={cancelLongPress}
            on:touchmove={cancelLongPress}
            on:mousedown={() => startLongPress(match)}
            on:mouseup={cancelLongPress}
            on:mouseleave={cancelLongPress}
            role="listitem"
          >
            <!-- Players + Score -->
            <div class="match-row">
              <!-- Winner -->
              <div class="p-col winner-col">
                <div class="av">
                  {#if match.winner.avatar_url}
                    <img src={match.winner.avatar_url} alt={match.winner.name} />
                  {:else}
                    <span class="av-init">{initial(match.winner.name)}</span>
                  {/if}
                </div>
                <div class="p-info">
                  <span class="pname win-name">{match.winner.name}</span>
                  <span class="result-label win-lbl">Winner</span>
                </div>
              </div>

              <!-- Score -->
              <div class="score-block">
                <span class="sc win-sc">{match.winner_score}</span>
                <span class="sc-sep">–</span>
                <span class="sc lose-sc">{match.loser_score}</span>
                {#if match.best_of > 1}
                  <span class="bo-inline">Bo{match.best_of}</span>
                {/if}
                {#if match.game_scores}
                  <div class="gs-line">
                    {#each match.game_scores as g, i}
                      <span class="gs-g">{g.w}–{g.l}</span>{#if i < match.game_scores.length - 1}<span class="gs-dot">·</span>{/if}
                    {/each}
                  </div>
                {/if}
              </div>

              <!-- Loser -->
              <div class="p-col loser-col">
                <div class="p-info right">
                  <span class="pname lose-name">{match.loser.name}</span>
                  <span class="result-label lose-lbl">Loser</span>
                </div>
                <div class="av loser-av">
                  {#if match.loser.avatar_url}
                    <img src={match.loser.avatar_url} alt={match.loser.name} />
                  {:else}
                    <span class="av-init">{initial(match.loser.name)}</span>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Meta row -->
            <div class="meta">
              <span class="time-tag">
                <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10" style="opacity:0.5;flex-shrink:0">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM7.25 4v4.31l2.97 1.71-.75 1.3L6 9.25V4h1.25z"/>
                </svg>
                {formatTime(match.played_at)}
                {#if relativeTime(match.played_at)}
                  <span class="rel">· {relativeTime(match.played_at)}</span>
                {/if}
              </span>

              {#if match.stakes}
                <span class="stakes-pill">🎲 {match.stakes}</span>
              {/if}

              <button class="edit-btn" on:click|stopPropagation={() => openEdit(match)} aria-label="Edit game">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/>
                </svg>
              </button>
            </div>

            <!-- Reactions + Rematch -->
            <div class="reaction-row">
              {#each REACT_EMOJIS as emoji}
                {@const count = emojiCount(match.id, emoji)}
                {@const mine = myReaction(match.id)?.emoji === emoji}
                <button
                  class="react-btn"
                  class:mine={mine}
                  on:click|stopPropagation={() => startReact(match, emoji)}
                  type="button"
                  title={mine ? 'Your reaction' : ''}
                >
                  <span class="react-emoji">{emoji}</span>
                  {#if count > 0}<span class="react-count">{count}</span>{/if}
                </button>
              {/each}
              <button class="rematch-btn" on:click|stopPropagation={() => startRematch(match)} type="button">
                ↩ Rematch
              </button>
            </div>
          </div>
        {/each}
      {/each}
    </div>
  {/if}
</div>

<EditMatchModal bind:open={editOpen} match={editMatch} />

<PinPrompt
  bind:open={reactPinOpen}
  players={allPinPlayers}
  title="React to this game"
  subtitle="Enter your PIN to add your reaction"
  on:success={onReactPinSuccess}
/>

<style>
  .wrap {
    padding: 24px 16px calc(var(--nav-h) + 32px + env(safe-area-inset-bottom));
  }

  header {
    display: flex; align-items: baseline; justify-content: space-between;
    margin-bottom: 20px;
  }

  h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; color: var(--text); }
  .count { font-size: 12px; color: var(--text-muted); letter-spacing: 0.04em; text-transform: uppercase; }

  /* Challenges */
  .challenges-block {
    background: var(--surface);
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: 14px;
    padding: 12px;
    margin-bottom: 24px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .challenges-heading { display: flex; align-items: center; gap: 7px; padding-bottom: 4px; }
  .ch-icon { font-size: 14px; }
  .ch-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--amber); flex: 1; }
  .ch-count { font-size: 11px; color: var(--text-muted); }

  .challenge-card {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .c-players { display: flex; align-items: center; gap: 8px; }
  .c-name { font-size: 14px; font-weight: 700; color: var(--text); flex: 1; }
  .c-vs { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
  .c-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .c-stakes { font-size: 12px; color: var(--amber); font-weight: 500; }
  .c-bo { font-size: 11px; color: var(--text-muted); background: var(--surface); padding: 2px 6px; border-radius: 4px; font-weight: 600; }
  .c-when { font-size: 11px; color: var(--text-muted); }
  .c-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
  .btn-log {
    flex: 1; padding: 8px 12px; background: var(--amber); color: #000;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: opacity 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-log:active { opacity: 0.8; }
  .btn-dismiss {
    width: 32px; height: 32px; background: none;
    border: 1px solid var(--border); border-radius: 8px;
    color: var(--text-muted); font-size: 13px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent; transition: color 0.15s, border-color 0.15s;
  }
  .btn-dismiss:hover { color: var(--red); border-color: var(--red); }

  /* Feed */
  .feed { display: flex; flex-direction: column; gap: 0; }

  /* Date separator */
  .date-sep {
    display: flex; align-items: center; gap: 10px;
    padding: 20px 0 10px;
  }
  .date-sep:first-child { padding-top: 0; }
  .date-line { flex: 1; height: 1px; background: rgba(255,255,255,0.05); }
  .date-label {
    font-size: 11px; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.08em;
    white-space: nowrap;
  }

  /* Match card */
  .card {
    background: #141414;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 14px 14px 10px;
    margin-bottom: 8px;
    animation: fadeUp 0.3s ease both;
    user-select: none; -webkit-user-select: none;
    cursor: default;
    transition: border-color 0.15s;
  }
  .card:active { border-color: rgba(255,255,255,0.12); }

  /* Match row */
  .match-row {
    display: flex; align-items: center; gap: 10px;
  }

  .p-col {
    flex: 1; display: flex; align-items: center; gap: 9px; min-width: 0;
  }
  .winner-col { justify-content: flex-start; }
  .loser-col  { justify-content: flex-end; }

  /* Avatar */
  .av {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: #252525; border: 1.5px solid rgba(255,255,255,0.07);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .av-init { font-size: 15px; font-weight: 700; color: #555; }

  .loser-av { opacity: 0.55; }

  .p-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .p-info.right { align-items: flex-end; }

  .pname {
    font-size: 13px; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 90px;
  }
  .win-name { color: var(--text); }
  .lose-name { color: #555; }

  .result-label { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; }
  .win-lbl { color: rgba(34,197,94,0.7); }
  .lose-lbl { color: rgba(239,68,68,0.5); }

  /* Score */
  .score-block {
    display: flex; flex-direction: column; align-items: center;
    flex-shrink: 0; gap: 0;
  }
  .sc {
    font-size: 26px; font-weight: 800; letter-spacing: -1px;
    font-variant-numeric: tabular-nums; line-height: 1;
  }
  .win-sc { color: var(--text); }
  .lose-sc { color: #444; }
  .sc-sep { font-size: 13px; color: #333; font-weight: 700; line-height: 1; margin: 1px 0; }

  .bo-inline {
    font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
    color: var(--text-muted); text-transform: uppercase;
    margin-top: 3px;
  }

  .gs-line {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    margin-top: 4px;
    flex-wrap: wrap;
  }

  .gs-g {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }

  .gs-dot {
    font-size: 8px;
    color: var(--text-muted);
    opacity: 0.3;
    margin: 0 1px;
  }

  /* Meta row */
  .meta {
    display: flex; align-items: center; gap: 8px;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.04);
  }

  .time-tag {
    display: flex; align-items: center; gap: 4px;
    font-size: 11px; color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .rel { color: rgba(255,255,255,0.25); }

  .stakes-pill {
    font-size: 11px; font-weight: 600;
    color: var(--amber);
    background: rgba(245,158,11,0.08);
    border: 1px solid rgba(245,158,11,0.2);
    padding: 2px 8px; border-radius: 10px;
    white-space: nowrap;
  }

  .edit-btn {
    margin-left: auto; background: none; border: none; padding: 4px 6px;
    color: var(--text-muted); opacity: 0.35;
    cursor: pointer; display: flex; align-items: center;
    transition: opacity 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent; flex-shrink: 0;
  }
  .edit-btn:hover { opacity: 1; color: var(--text); }

  /* Empty */
  .empty {
    display: flex; flex-direction: column; align-items: center;
    padding: 64px 24px; gap: 8px;
  }
  .empty-icon { font-size: 48px; margin-bottom: 8px; }
  .empty p { margin: 0; font-size: 16px; font-weight: 600; color: var(--text); }
  .empty .sub { font-size: 14px; font-weight: 400; color: var(--text-muted); }

  /* Reactions */
  .reaction-row {
    display: flex; align-items: center; gap: 4px;
    margin-top: 8px; padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.04);
    flex-wrap: wrap;
  }

  .react-btn {
    display: flex; align-items: center; gap: 3px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 20px; padding: 4px 7px;
    cursor: pointer; font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .react-btn:active { opacity: 0.7; }
  .react-btn.mine {
    background: rgba(245,158,11,0.12);
    border-color: rgba(245,158,11,0.35);
  }
  .react-emoji { font-size: 14px; line-height: 1; }
  .react-count { font-size: 11px; font-weight: 600; color: var(--text-muted); line-height: 1; }
  .react-btn.mine .react-count { color: var(--amber); }

  .rematch-btn {
    margin-left: auto; background: none;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px; padding: 4px 10px;
    font-size: 11px; font-weight: 600; color: var(--text-muted);
    cursor: pointer; font-family: inherit;
    transition: color 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent; flex-shrink: 0;
  }
  .rematch-btn:hover { color: var(--amber); border-color: rgba(245,158,11,0.3); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
