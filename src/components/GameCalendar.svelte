<script>
  import { push } from 'svelte-spa-router'
  import {
    enrichedChallenges, enrichedVotes, pendingChallenge,
    deleteChallenge, castVote, players, sessionPlayer,
    updateChallengeTrashTalk
  } from '../lib/stores.js'
  import PinPrompt from './PinPrompt.svelte'

  $: scheduled = $enrichedChallenges
    .filter(c => c.scheduled_at)
    .sort((a, b) => a.scheduled_at < b.scheduled_at ? -1 : 1)

  $: unscheduled = $enrichedChallenges.filter(c => !c.scheduled_at)

  $: groups = (() => {
    const map = {}
    for (const c of scheduled) {
      const key = c.scheduled_at.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(c)
    }
    return Object.entries(map).sort(([a], [b]) => a < b ? -1 : 1)
  })()

  // Vote data per challenge
  $: voteMap = $enrichedVotes.reduce((acc, v) => {
    if (!acc[v.challenge_id]) acc[v.challenge_id] = []
    acc[v.challenge_id].push(v)
    return acc
  }, {})

  $: allPinPlayers = $players.filter(p => p.pin_hash)

  function cvotes(challengeId) { return voteMap[challengeId] || [] }
  function p1votes(c) { return cvotes(c.id).filter(v => v.pick_id === c.player1_id) }
  function p2votes(c) { return cvotes(c.id).filter(v => v.pick_id === c.player2_id) }
  function myVote(c) { return $sessionPlayer ? cvotes(c.id).find(v => v.voter_id === $sessionPlayer.id) : null }
  function totalVotes(c) { return cvotes(c.id).length }
  function p1pct(c) {
    const t = totalVotes(c)
    return t ? Math.round(p1votes(c).length / t * 100) : 50
  }

  // Voting flow
  let voteTarget = null   // { challengeId, pickId }
  let pinPromptOpen = false

  function startVote(c, pickId) {
    if (!allPinPlayers.length) return
    const mv = myVote(c)
    if ($sessionPlayer) {
      if (mv?.pick_id === pickId) return  // already voted this way
      voteTarget = { challengeId: c.id, pickId }
      doCastVote($sessionPlayer)
      return
    }
    voteTarget = { challengeId: c.id, pickId }
    pinPromptOpen = true
  }

  function onPinSuccess(e) {
    const verifiedPlayer = e.detail
    sessionPlayer.set(verifiedPlayer)
    doCastVote(verifiedPlayer)
  }

  async function doCastVote(voter) {
    if (!voteTarget) return
    const { challengeId, pickId } = voteTarget
    voteTarget = null
    try { await castVote(challengeId, voter.id, pickId) } catch {}
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  function dayLabel(dateStr) {
    if (dateStr === todayStr) return 'Today'
    if (dateStr === tomorrowStr) return 'Tomorrow'
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  function daySubLabel(dateStr) {
    if (dateStr === todayStr || dateStr === tomorrowStr) {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    }
    return ''
  }

  function timeLabel(scheduledAt) {
    return new Date(scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function isPast(scheduledAt) { return new Date(scheduledAt) < new Date() }
  function isToday(dateStr) { return dateStr === todayStr }

  function logResult(c) { pendingChallenge.set(c); push('/log') }
  function initial(name) { return name?.[0]?.toUpperCase() ?? '?' }

  // ── Trash talk ───────────────────────────
  let trashEditId = null
  let trashEditField = null   // 'trash_talk' | 'trash_talk_p2'
  let trashEditText = ''
  let trashPinOpen = false
  let trashPinPlayers = []

  function startTrashEdit(c, field) {
    const playerId = field === 'trash_talk' ? c.player1_id : c.player2_id
    const player   = field === 'trash_talk' ? c.player1 : c.player2
    const current  = field === 'trash_talk' ? (c.trash_talk || '') : (c.trash_talk_p2 || '')
    if ($sessionPlayer?.id === playerId) {
      trashEditId = c.id; trashEditField = field; trashEditText = current
      return
    }
    if (!player?.pin_hash) return
    trashPinPlayers = [player]
    trashEditId = c.id; trashEditField = field; trashEditText = current
    trashPinOpen = true
  }

  function onTrashPinSuccess(e) {
    sessionPlayer.set(e.detail)
    // trashEditId/Field already set — UI will show the input
  }

  async function saveTrashTalk() {
    if (!trashEditId || !trashEditField) return
    const id = trashEditId, field = trashEditField, text = trashEditText.trim()
    trashEditId = null; trashEditField = null; trashEditText = ''
    try { await updateChallengeTrashTalk(id, field, text) } catch {}
  }

  function cancelEdit() { trashEditId = null; trashEditField = null; trashEditText = '' }
</script>

{#snippet trashBubbles(c)}
  <div class="tt-section">
    <!-- P1 bubble (left) -->
    <div class="tt-row">
      <div class="tt-av">
        {#if c.player1.avatar_url}<img src={c.player1.avatar_url} alt={c.player1.name} />{:else}<span>{initial(c.player1.name)}</span>{/if}
      </div>
      {#if trashEditId === c.id && trashEditField === 'trash_talk'}
        <div class="tt-edit">
          <input class="tt-input" bind:value={trashEditText} maxlength="80" placeholder="Say something spicy…" />
          <button class="tt-send" on:click={saveTrashTalk} type="button">Send</button>
          <button class="tt-x" on:click={cancelEdit} type="button">✕</button>
        </div>
      {:else if c.trash_talk}
        <button class="tt-bubble tt-l" on:click={() => startTrashEdit(c, 'trash_talk')} type="button">"{c.trash_talk}"</button>
      {:else}
        <button class="tt-ghost tt-ghost-l" on:click={() => startTrashEdit(c, 'trash_talk')} type="button">+ say something</button>
      {/if}
    </div>

    <!-- P2 bubble (right) -->
    <div class="tt-row tt-row-r">
      {#if trashEditId === c.id && trashEditField === 'trash_talk_p2'}
        <div class="tt-edit tt-edit-r">
          <button class="tt-x" on:click={cancelEdit} type="button">✕</button>
          <button class="tt-send" on:click={saveTrashTalk} type="button">Send</button>
          <input class="tt-input tt-input-r" bind:value={trashEditText} maxlength="80" placeholder="Fire back…" />
        </div>
      {:else if c.trash_talk_p2}
        <button class="tt-bubble tt-r" on:click={() => startTrashEdit(c, 'trash_talk_p2')} type="button">"{c.trash_talk_p2}"</button>
      {:else}
        <button class="tt-ghost tt-ghost-r" on:click={() => startTrashEdit(c, 'trash_talk_p2')} type="button">say something +</button>
      {/if}
      <div class="tt-av">
        {#if c.player2.avatar_url}<img src={c.player2.avatar_url} alt={c.player2.name} />{:else}<span>{initial(c.player2.name)}</span>{/if}
      </div>
    </div>
  </div>
{/snippet}

<div class="wrap">
  <header>
    <div>
      <p class="brand">Ping Pong Leuven</p>
      <p class="brand-sub">Psychological Institute</p>
      <h1>Calendar</h1>
    </div>
    <button class="new-btn" on:click={() => push('/log')} aria-label="Set a challenge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      Schedule
    </button>
  </header>

  {#if groups.length === 0 && unscheduled.length === 0}
    <div class="empty">
      <div class="empty-icon">📅</div>
      <p>Nothing scheduled yet.</p>
      <p class="sub">Set up a challenge in Games and pick a date.</p>
      <button class="empty-cta" on:click={() => push('/log')}>Set a Challenge</button>
    </div>

  {:else}
    {#each groups as [dateStr, items]}
      <div class="day-group">
        <div class="day-header" class:today={isToday(dateStr)}>
          <span class="day-label">{dayLabel(dateStr)}</span>
          {#if daySubLabel(dateStr)}<span class="day-sub">{daySubLabel(dateStr)}</span>{/if}
          {#if isPast(items[0].scheduled_at) && !isToday(dateStr)}
            <span class="overdue-tag">overdue</span>
          {/if}
        </div>

        {#each items as c}
          <div class="match-card" class:past={isPast(c.scheduled_at)} class:today-card={isToday(dateStr)}>
            <!-- Time -->
            <div class="card-time">
              <span class="time-label">{timeLabel(c.scheduled_at)}</span>
              {#if isPast(c.scheduled_at)}<span class="past-tag">past</span>{/if}
              {#if c.stakes || c.best_of > 1}
                <div class="card-tags">
                  {#if c.stakes}<span class="stakes-tag">🎲 {c.stakes}</span>{/if}
                  {#if c.best_of > 1}<span class="bo-tag">Bo{c.best_of}</span>{/if}
                </div>
              {/if}
            </div>

            <!-- Players -->
            <div class="card-body">
              <div class="players-row">
                <div class="player-block">
                  {#if c.player1.avatar_url}
                    <img src={c.player1.avatar_url} alt={c.player1.name} class="p-avatar" />
                  {:else}
                    <div class="p-initial">{initial(c.player1.name)}</div>
                  {/if}
                  <span class="p-name">{c.player1.name}</span>
                </div>
                <span class="vs">vs</span>
                <div class="player-block right">
                  <span class="p-name">{c.player2.name}</span>
                  {#if c.player2.avatar_url}
                    <img src={c.player2.avatar_url} alt={c.player2.name} class="p-avatar" />
                  {:else}
                    <div class="p-initial">{initial(c.player2.name)}</div>
                  {/if}
                </div>
              </div>
            </div>

            {@render trashBubbles(c)}

            <!-- Vote section -->
            {#if allPinPlayers.length > 0}
              <div class="vote-section">
                <div class="vote-header">
                  <span class="vote-icon">🔮</span>
                  <span class="vote-title">Who wins?</span>
                  {#if totalVotes(c) > 0}
                    <span class="vote-total">{totalVotes(c)} {totalVotes(c) === 1 ? 'vote' : 'votes'}</span>
                  {/if}
                  {#if $sessionPlayer && myVote(c)}
                    <span class="voted-badge">You voted</span>
                  {/if}
                </div>

                <div class="vote-cols">
                  <!-- Player 1 side -->
                  <button
                    class="vote-col"
                    class:my-pick={myVote(c)?.pick_id === c.player1_id}
                    class:other-pick={myVote(c) && myVote(c).pick_id !== c.player1_id}
                    on:click={() => startVote(c, c.player1_id)}
                    type="button"
                  >
                    <div class="voter-stack">
                      {#each p1votes(c).slice(0, 5) as v}
                        <div class="voter-chip" title={v.voter?.name}>
                          {#if v.voter?.avatar_url}
                            <img src={v.voter.avatar_url} alt={v.voter.name} />
                          {:else}
                            <span>{initial(v.voter?.name)}</span>
                          {/if}
                        </div>
                      {/each}
                      {#if p1votes(c).length > 5}
                        <div class="voter-chip overflow">+{p1votes(c).length - 5}</div>
                      {/if}
                    </div>
                    <div class="vote-count-row">
                      <span class="vote-count">{p1votes(c).length}</span>
                      {#if myVote(c)?.pick_id === c.player1_id}
                        <span class="pick-check">✓</span>
                      {:else if !myVote(c)}
                        <span class="tap-hint">tap</span>
                      {/if}
                    </div>
                    <span class="vote-col-name">{c.player1.name}</span>
                  </button>

                  <div class="vote-divider">
                    <span class="vote-vs">vs</span>
                  </div>

                  <!-- Player 2 side -->
                  <button
                    class="vote-col"
                    class:my-pick={myVote(c)?.pick_id === c.player2_id}
                    class:other-pick={myVote(c) && myVote(c).pick_id !== c.player2_id}
                    on:click={() => startVote(c, c.player2_id)}
                    type="button"
                  >
                    <div class="voter-stack">
                      {#each p2votes(c).slice(0, 5) as v}
                        <div class="voter-chip" title={v.voter?.name}>
                          {#if v.voter?.avatar_url}
                            <img src={v.voter.avatar_url} alt={v.voter.name} />
                          {:else}
                            <span>{initial(v.voter?.name)}</span>
                          {/if}
                        </div>
                      {/each}
                      {#if p2votes(c).length > 5}
                        <div class="voter-chip overflow">+{p2votes(c).length - 5}</div>
                      {/if}
                    </div>
                    <div class="vote-count-row">
                      {#if myVote(c)?.pick_id === c.player2_id}
                        <span class="pick-check">✓</span>
                      {:else if !myVote(c)}
                        <span class="tap-hint">tap</span>
                      {/if}
                      <span class="vote-count">{p2votes(c).length}</span>
                    </div>
                    <span class="vote-col-name">{c.player2.name}</span>
                  </button>
                </div>

                <!-- Vote bar -->
                {#if totalVotes(c) > 0}
                  <div class="vote-bar-outer">
                    <div class="vote-bar-p1" style="width: {p1pct(c)}%"></div>
                  </div>
                  <div class="vote-pct-row">
                    <span>{p1pct(c)}%</span>
                    <span>{100 - p1pct(c)}%</span>
                  </div>
                {:else}
                  <p class="vote-prompt">Be the first to predict →</p>
                {/if}
              </div>
            {/if}

            <!-- Actions -->
            <div class="card-actions">
              <button class="btn-log" on:click={() => logResult(c)}>Log Result →</button>
              <button class="btn-remove" on:click={() => deleteChallenge(c.id)} aria-label="Remove">✕</button>
            </div>
          </div>
        {/each}
      </div>
    {/each}

    <!-- Open challenges (no date) -->
    {#if unscheduled.length > 0}
      <div class="day-group">
        <div class="day-header">
          <span class="day-label">⚔️ Open Challenges</span>
          <span class="day-sub">no date set</span>
        </div>
        {#each unscheduled as c}
          <div class="match-card">
            <div class="card-body">
              <div class="players-row">
                <div class="player-block">
                  {#if c.player1.avatar_url}
                    <img src={c.player1.avatar_url} alt={c.player1.name} class="p-avatar" />
                  {:else}
                    <div class="p-initial">{initial(c.player1.name)}</div>
                  {/if}
                  <span class="p-name">{c.player1.name}</span>
                </div>
                <span class="vs">vs</span>
                <div class="player-block right">
                  <span class="p-name">{c.player2.name}</span>
                  {#if c.player2.avatar_url}
                    <img src={c.player2.avatar_url} alt={c.player2.name} class="p-avatar" />
                  {:else}
                    <div class="p-initial">{initial(c.player2.name)}</div>
                  {/if}
                </div>
              </div>
              {#if c.stakes || c.best_of > 1}
                <div class="card-meta">
                  {#if c.stakes}<span class="stakes-tag">🎲 {c.stakes}</span>{/if}
                  {#if c.best_of > 1}<span class="bo-tag">Bo{c.best_of}</span>{/if}
                </div>
              {/if}
            </div>

            {@render trashBubbles(c)}

            {#if allPinPlayers.length > 0}
              <div class="vote-section">
                <div class="vote-header">
                  <span class="vote-icon">🔮</span>
                  <span class="vote-title">Who wins?</span>
                  {#if totalVotes(c) > 0}
                    <span class="vote-total">{totalVotes(c)} {totalVotes(c) === 1 ? 'vote' : 'votes'}</span>
                  {/if}
                  {#if $sessionPlayer && myVote(c)}
                    <span class="voted-badge">You voted</span>
                  {/if}
                </div>
                <div class="vote-cols">
                  <button
                    class="vote-col"
                    class:my-pick={myVote(c)?.pick_id === c.player1_id}
                    class:other-pick={myVote(c) && myVote(c).pick_id !== c.player1_id}
                    on:click={() => startVote(c, c.player1_id)}
                    type="button"
                  >
                    <div class="voter-stack">
                      {#each p1votes(c).slice(0, 5) as v}
                        <div class="voter-chip" title={v.voter?.name}>
                          {#if v.voter?.avatar_url}<img src={v.voter.avatar_url} alt={v.voter.name} />
                          {:else}<span>{initial(v.voter?.name)}</span>{/if}
                        </div>
                      {/each}
                    </div>
                    <div class="vote-count-row">
                      <span class="vote-count">{p1votes(c).length}</span>
                      {#if myVote(c)?.pick_id === c.player1_id}<span class="pick-check">✓</span>
                      {:else if !myVote(c)}<span class="tap-hint">tap</span>{/if}
                    </div>
                    <span class="vote-col-name">{c.player1.name}</span>
                  </button>
                  <div class="vote-divider"><span class="vote-vs">vs</span></div>
                  <button
                    class="vote-col"
                    class:my-pick={myVote(c)?.pick_id === c.player2_id}
                    class:other-pick={myVote(c) && myVote(c).pick_id !== c.player2_id}
                    on:click={() => startVote(c, c.player2_id)}
                    type="button"
                  >
                    <div class="voter-stack">
                      {#each p2votes(c).slice(0, 5) as v}
                        <div class="voter-chip" title={v.voter?.name}>
                          {#if v.voter?.avatar_url}<img src={v.voter.avatar_url} alt={v.voter.name} />
                          {:else}<span>{initial(v.voter?.name)}</span>{/if}
                        </div>
                      {/each}
                    </div>
                    <div class="vote-count-row">
                      {#if myVote(c)?.pick_id === c.player2_id}<span class="pick-check">✓</span>
                      {:else if !myVote(c)}<span class="tap-hint">tap</span>{/if}
                      <span class="vote-count">{p2votes(c).length}</span>
                    </div>
                    <span class="vote-col-name">{c.player2.name}</span>
                  </button>
                </div>
                {#if totalVotes(c) > 0}
                  <div class="vote-bar-outer">
                    <div class="vote-bar-p1" style="width: {p1pct(c)}%"></div>
                  </div>
                  <div class="vote-pct-row">
                    <span>{p1pct(c)}%</span>
                    <span>{100 - p1pct(c)}%</span>
                  </div>
                {:else}
                  <p class="vote-prompt">Be the first to predict →</p>
                {/if}
              </div>
            {/if}

            <div class="card-actions">
              <button class="btn-log" on:click={() => logResult(c)}>Log Result →</button>
              <button class="btn-remove" on:click={() => deleteChallenge(c.id)} aria-label="Remove">✕</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<PinPrompt
  bind:open={pinPromptOpen}
  players={allPinPlayers}
  title="Cast Your Vote"
  subtitle="Enter your PIN to confirm your prediction"
  on:success={onPinSuccess}
/>

<PinPrompt
  bind:open={trashPinOpen}
  players={trashPinPlayers}
  title="Add Your Trash Talk"
  subtitle="Prove it's really you first"
  on:success={onTrashPinSuccess}
/>

<style>
  .wrap {
    padding: 24px 16px calc(var(--nav-h) + 24px + env(safe-area-inset-bottom));
  }

  header {
    display: flex; align-items: flex-end; justify-content: space-between;
    margin-bottom: 24px;
  }

  .brand { margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--amber); }
  .brand-sub { margin: 1px 0 2px; font-size: 10px; font-weight: 500; letter-spacing: 0.06em; color: var(--text-muted); opacity: 0.7; }
  h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; color: var(--text); }

  .new-btn {
    display: flex; align-items: center; gap: 6px;
    background: var(--amber); color: #000;
    border: none; border-radius: 10px; padding: 8px 14px;
    font-size: 13px; font-weight: 700; cursor: pointer;
    -webkit-tap-highlight-color: transparent; font-family: inherit;
    transition: opacity 0.15s; margin-bottom: 4px;
  }
  .new-btn:active { opacity: 0.8; }

  /* Day groups */
  .day-group { margin-bottom: 24px; }

  .day-header {
    display: flex; align-items: baseline; gap: 8px;
    margin-bottom: 10px; padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  .day-header.today { border-bottom-color: rgba(245,158,11,0.3); }
  .day-label { font-size: 15px; font-weight: 700; color: var(--text); }
  .day-header.today .day-label { color: var(--amber); }
  .day-sub { font-size: 12px; color: var(--text-muted); flex: 1; }
  .overdue-tag {
    font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase; color: var(--red);
    background: rgba(239,68,68,0.12); padding: 2px 6px; border-radius: 4px;
  }

  /* Match card */
  .match-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden; margin-bottom: 10px;
    transition: border-color 0.15s;
  }
  .match-card.today-card {
    border-color: rgba(245,158,11,0.3);
    background: linear-gradient(135deg, rgba(245,158,11,0.04) 0%, var(--surface) 60%);
  }
  .match-card.past { opacity: 0.65; }

  .card-time {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px 0; flex-wrap: wrap;
  }
  .time-label { font-size: 13px; font-weight: 700; color: var(--amber); font-variant-numeric: tabular-nums; }
  .past-tag {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 1px 5px; border-radius: 3px;
  }
  .card-tags { display: flex; gap: 6px; margin-left: auto; }
  .stakes-tag { font-size: 11px; color: var(--amber); font-weight: 600; }
  .bo-tag {
    font-size: 11px; color: var(--text-muted); background: rgba(255,255,255,0.06);
    padding: 1px 6px; border-radius: 4px; font-weight: 600;
  }

  .card-body { padding: 10px 16px 14px; }
  .card-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  /* ── Trash talk speech bubbles ── */
  .tt-section {
    padding: 6px 14px 12px;
    display: flex; flex-direction: column; gap: 6px;
    border-top: 1px solid rgba(255,255,255,0.04);
  }

  .tt-row { display: flex; align-items: flex-end; gap: 7px; }
  .tt-row-r { justify-content: flex-end; }

  .tt-av {
    width: 24px; height: 24px; border-radius: 50%;
    background: #252525; border: 1px solid rgba(255,255,255,0.07);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0;
  }
  .tt-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .tt-av span { font-size: 10px; font-weight: 700; color: #555; }

  .tt-bubble {
    max-width: 68%; padding: 7px 11px;
    font-size: 12px; font-style: italic; line-height: 1.45;
    border: none; cursor: pointer; font-family: inherit;
    transition: opacity 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .tt-bubble:active { opacity: 0.7; }

  .tt-l {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px 14px 14px 3px;
    color: rgba(255,255,255,0.75); text-align: left;
  }
  .tt-r {
    background: rgba(245,158,11,0.1);
    border: 1px solid rgba(245,158,11,0.22);
    border-radius: 14px 14px 3px 14px;
    color: rgba(245,158,11,0.9); text-align: right;
  }

  .tt-ghost {
    font-size: 11px; padding: 5px 11px;
    background: none; border: 1px dashed rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.18); cursor: pointer;
    font-family: inherit; font-style: italic;
    transition: color 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .tt-ghost:hover { color: rgba(255,255,255,0.35); border-color: rgba(255,255,255,0.22); }
  .tt-ghost-l { border-radius: 14px 14px 14px 3px; }
  .tt-ghost-r { border-radius: 14px 14px 3px 14px; }

  .tt-edit { flex: 1; display: flex; align-items: center; gap: 5px; }
  .tt-edit-r { flex-direction: row-reverse; }

  .tt-input {
    flex: 1; min-width: 0;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(245,158,11,0.4);
    border-radius: 10px; color: var(--text);
    font-size: 12px; font-style: italic;
    padding: 6px 10px; font-family: inherit; outline: none;
  }
  .tt-input-r { text-align: right; }

  .tt-send {
    background: var(--amber); color: #000; border: none;
    border-radius: 8px; padding: 5px 10px;
    font-size: 11px; font-weight: 700; cursor: pointer;
    font-family: inherit; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .tt-x {
    background: none; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px; padding: 5px 7px; color: var(--text-muted);
    cursor: pointer; font-family: inherit; font-size: 11px; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }

  .players-row { display: flex; align-items: center; gap: 10px; }

  .player-block { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .player-block.right { justify-content: flex-end; flex-direction: row-reverse; }

  .p-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1px solid var(--border); }
  .p-initial {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(245,158,11,0.1); display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: var(--amber); flex-shrink: 0; border: 1px solid var(--border);
  }
  .p-name { font-size: 15px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vs { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); flex-shrink: 0; }

  /* ── Vote section ── */
  .vote-section {
    border-top: 1px solid rgba(255,255,255,0.05);
    padding: 12px 14px 14px;
    background: rgba(0,0,0,0.15);
  }

  .vote-header {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 10px;
  }
  .vote-icon { font-size: 13px; }
  .vote-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); flex: 1; }
  .vote-total { font-size: 11px; color: var(--text-muted); }
  .voted-badge {
    font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
    background: rgba(245,158,11,0.15); color: var(--amber);
    padding: 2px 7px; border-radius: 10px;
  }

  .vote-cols { display: flex; align-items: stretch; gap: 6px; }

  .vote-col {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 6px; padding: 10px 8px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; cursor: pointer;
    transition: background 0.15s, border-color 0.2s, transform 0.1s;
    -webkit-tap-highlight-color: transparent; font-family: inherit;
  }
  .vote-col:hover { background: rgba(255,255,255,0.06); }
  .vote-col:active { transform: scale(0.97); }

  .vote-col.my-pick {
    background: rgba(245,158,11,0.1);
    border-color: rgba(245,158,11,0.5);
    box-shadow: 0 0 0 3px rgba(245,158,11,0.06);
  }
  .vote-col.other-pick {
    opacity: 0.45;
  }

  .voter-stack {
    display: flex; flex-direction: row-reverse;
    justify-content: center; min-height: 24px;
  }
  .voter-chip {
    width: 24px; height: 24px; border-radius: 50%;
    background: #2a2a2a; border: 2px solid #161616;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; margin-left: -6px; flex-shrink: 0;
    font-size: 9px; font-weight: 700; color: #888;
  }
  .voter-chip:first-child { margin-left: 0; }
  .voter-chip img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .voter-chip.overflow { background: rgba(245,158,11,0.15); color: var(--amber); font-size: 8px; }

  .vote-count-row {
    display: flex; align-items: center; gap: 4px;
  }
  .vote-count {
    font-size: 20px; font-weight: 800; color: var(--text);
    font-variant-numeric: tabular-nums; line-height: 1;
  }
  .vote-col.my-pick .vote-count { color: var(--amber); }

  .pick-check { font-size: 13px; color: var(--amber); font-weight: 700; }

  .tap-hint {
    font-size: 9px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--text-muted); opacity: 0.5;
  }

  .vote-col-name {
    font-size: 10px; font-weight: 600; color: var(--text-muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 80px; text-align: center;
  }
  .vote-col.my-pick .vote-col-name { color: rgba(245,158,11,0.8); }

  .vote-divider {
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; width: 20px;
  }
  .vote-vs { font-size: 9px; font-weight: 700; color: var(--text-muted); opacity: 0.4; letter-spacing: 0.05em; }

  /* Vote bar */
  .vote-bar-outer {
    height: 4px; background: rgba(255,255,255,0.06);
    border-radius: 2px; overflow: hidden; margin-top: 10px;
  }
  .vote-bar-p1 {
    height: 100%; background: var(--amber);
    border-radius: 2px;
    transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
  }
  .vote-pct-row {
    display: flex; justify-content: space-between;
    margin-top: 4px;
    font-size: 10px; color: var(--text-muted); font-variant-numeric: tabular-nums;
  }

  .vote-prompt {
    margin: 8px 0 0; font-size: 11px; color: var(--text-muted);
    text-align: center; opacity: 0.6; font-style: italic;
  }

  /* Card actions */
  .card-actions {
    display: flex; align-items: stretch;
    border-top: 1px solid var(--border);
  }
  .btn-log {
    flex: 1; padding: 11px 16px;
    background: none; border: none; color: var(--amber);
    font-size: 13px; font-weight: 700; cursor: pointer;
    text-align: left; -webkit-tap-highlight-color: transparent;
    font-family: inherit; transition: background 0.12s;
  }
  .btn-log:hover { background: rgba(245,158,11,0.06); }
  .btn-remove {
    width: 44px; background: none; border: none;
    border-left: 1px solid var(--border);
    color: var(--text-muted); font-size: 13px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.12s, background 0.12s;
  }
  .btn-remove:hover { color: var(--red); background: rgba(239,68,68,0.06); }

  /* Empty */
  .empty {
    display: flex; flex-direction: column; align-items: center;
    padding: 64px 24px; gap: 8px; text-align: center;
  }
  .empty-icon { font-size: 48px; margin-bottom: 8px; }
  .empty p { margin: 0; font-size: 16px; font-weight: 600; color: var(--text); }
  .empty .sub { font-size: 14px; font-weight: 400; color: var(--text-muted); margin-bottom: 8px; }
  .empty-cta {
    margin-top: 8px; padding: 12px 24px;
    background: var(--amber); color: #000; border: none; border-radius: 10px;
    font-size: 14px; font-weight: 700; cursor: pointer;
    -webkit-tap-highlight-color: transparent; font-family: inherit;
  }
</style>
