<script>
  import { newRatings, seriesRatings } from '../lib/elo.js'
  import { logMatch, rankings, matches as matchesStore, addChallenge, deleteChallenge, pendingChallenge, adminPlayers, rematchPlayers } from '../lib/stores.js'
  import { computeSingleMatchReward, formatCoins } from '../lib/coins.js'
  import AddPlayerModal from './AddPlayerModal.svelte'
  import PinPrompt from './PinPrompt.svelte'

  export let players = []

  const PRESETS = [
    { emoji: '🧋', label: 'Bubble Tea' },
    { emoji: '🍺', label: 'Beer' },
    { emoji: '🍜', label: 'Lunch' },
    { emoji: '☕', label: 'Coffee' },
    { emoji: '💪', label: 'Push-ups' },
  ]

  let mode = 'log' // 'log' | 'challenge'
  let addPlayerOpen = false
  let pinPromptOpen = false

  // ── Log mode ──────────────────────────────
  let player1 = null
  let player2 = null
  let p1Score = ''
  let p2Score = ''
  let gameScores = []
  let curP1 = ''
  let curP2 = ''
  let submitting = false
  let result = null
  let logError = ''
  let activeChallenge = null

  // ── Challenge mode ────────────────────────
  let cp1 = null
  let cp2 = null
  let scheduledDate = ''
  let scheduledTime = ''
  let challengeSubmitting = false
  let challengeDone = false
  let challengeError = ''

  $: scheduledAt = scheduledDate
    ? new Date(`${scheduledDate}T${scheduledTime || '12:00'}`).toISOString()
    : null

  // ── Shared stakes ─────────────────────────
  let stakesPreset = null   // null | 'Bubble Tea' | … | 'custom'
  let stakesCustom = ''
  let bestOf = 1

  $: stakesValue = stakesPreset === 'custom'
    ? (stakesCustom.trim() || null)
    : stakesPreset

  // Pre-fill from a rematch button in History
  $: if ($rematchPlayers) {
    player1 = $rematchPlayers.winner
    player2 = $rematchPlayers.loser
    rematchPlayers.set(null)
    mode = 'log'
  }

  // Pre-fill from a pending challenge (set by History → Log Result)
  $: if ($pendingChallenge && $pendingChallenge !== activeChallenge) {
    activeChallenge = $pendingChallenge
    const preset = PRESETS.find(p => p.label === activeChallenge.stakes)
    stakesPreset = preset ? preset.label : (activeChallenge.stakes ? 'custom' : null)
    stakesCustom = !preset && activeChallenge.stakes ? activeChallenge.stakes : ''
    const bo = activeChallenge.best_of ?? 1
    bestOf = bo
    gameScores = []; curP1 = ''; curP2 = ''
    if (bo === 1) { p1Score = ''; p2Score = '' }
    mode = 'log'
  }

  // ── Series / winner derivation ────────────
  $: p1Wins = gameScores.filter(g => g.p1 > g.p2).length
  $: p2Wins = gameScores.filter(g => g.p2 > g.p1).length
  $: seriesWins = Math.max(p1Wins, p2Wins)
  $: seriesLosses = Math.min(p1Wins, p2Wins)
  $: seriesComplete = bestOf > 1 && (p1Wins === needed || p2Wins === needed)

  // Auto-determine winner from scores
  $: actualWinner = (() => {
    if (!player1 || !player2) return null
    if (bestOf > 1) {
      if (p1Wins === needed) return player1
      if (p2Wins === needed) return player2
      return null
    }
    const p1 = Number.isFinite(parseInt(p1Score)) ? parseInt(p1Score) : null
    const p2 = Number.isFinite(parseInt(p2Score)) ? parseInt(p2Score) : null
    if (p1 == null || p2 == null) return null
    if (p1 > p2) return player1
    if (p2 > p1) return player2
    return null
  })()
  $: actualLoser = actualWinner ? (actualWinner.id === player1?.id ? player2 : player1) : null

  // ws/ls represent the match winner's scores (used for logMatch + Elo preview)
  $: ws = actualWinner && bestOf > 1
    ? (actualWinner.id === player1?.id ? p1Wins : p2Wins)
    : actualWinner ? (actualWinner.id === player1?.id ? parseInt(p1Score) : parseInt(p2Score)) : 0
  $: ls = actualLoser && bestOf > 1
    ? (actualLoser.id === player1?.id ? p1Wins : p2Wins)
    : actualLoser ? (actualLoser.id === player1?.id ? parseInt(p1Score) : parseInt(p2Score)) : 0

  // ── Elo preview ───────────────────────────
  $: winnerRanking = $rankings.find(r => r.id === actualWinner?.id)
  $: loserRanking  = $rankings.find(r => r.id === actualLoser?.id)
  $: winnerElo   = winnerRanking?.elo ?? 1000
  $: loserElo    = loserRanking?.elo  ?? 1000
  $: winnerGames = winnerRanking?.gamesPlayed ?? 0
  $: loserGames  = loserRanking?.gamesPlayed  ?? 0

  // Convert gameScores to winner's perspective for seriesRatings
  $: winnerPerspectiveGameScores = actualWinner
    ? gameScores.map(g => ({
        w: actualWinner.id === player1?.id ? g.p1 : g.p2,
        l: actualWinner.id === player1?.id ? g.p2 : g.p1,
      }))
    : []

  $: preview = actualWinner && actualLoser
    ? (bestOf > 1
      ? (gameScores.length > 0 ? seriesRatings(winnerElo, loserElo, winnerPerspectiveGameScores, winnerGames, loserGames) : null)
      : newRatings(winnerElo, loserElo, ws, ls, winnerGames, loserGames))
    : null
  $: winnerDelta = preview ? preview.winner - winnerElo : null
  $: loserDelta  = preview ? preview.loser  - loserElo  : null
  $: winProb = actualWinner && actualLoser
    ? Math.round((1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400))) * 100)
    : null

  function clearChallenge() {
    activeChallenge = null
    pendingChallenge.set(null)
    stakesPreset = null
    stakesCustom = ''
    bestOf = 1
  }

  function switchMode(m) {
    mode = m
    logError = ''
    challengeError = ''
    if (m === 'challenge') clearChallenge()
  }

  function togglePreset(label) {
    stakesPreset = stakesPreset === label ? null : label
    if (label !== 'custom') stakesCustom = ''
  }

  $: needed = Math.ceil(bestOf / 2)  // wins required to win the series

  function onBestOfChange(n) {
    bestOf = n
    gameScores = []; curP1 = ''; curP2 = ''
    if (n === 1) { p1Score = ''; p2Score = '' }
  }

  function confirmGame() {
    const p1 = parseInt(curP1)
    const p2 = parseInt(curP2)
    if (isNaN(p1) || isNaN(p2) || p1 === p2 || p1 < 0 || p2 < 0) return
    gameScores = [...gameScores, { p1, p2 }]
    curP1 = ''; curP2 = ''
  }

  function undoLastGame() {
    gameScores = gameScores.slice(0, -1)
  }

  $: canConfirmGame = (() => {
    const p1 = parseInt(curP1)
    const p2 = parseInt(curP2)
    return !isNaN(p1) && !isNaN(p2) && p1 !== p2 && p1 >= 0 && p2 >= 0
  })()

  function validate() {
    if (!player1) return 'Pick player 1.'
    if (!player2) return 'Pick player 2.'
    if (bestOf > 1) {
      if (!seriesComplete) return `Enter game scores until someone reaches ${needed} wins.`
    } else {
      const p1 = parseInt(p1Score)
      const p2 = parseInt(p2Score)
      if (isNaN(p1) || isNaN(p2)) return 'Enter both scores.'
      if (p1 < 0 || p2 < 0) return 'Scores cannot be negative.'
      if (p1 === p2) return 'Scores cannot be equal.'
    }
    return ''
  }

  $: pinPlayers = [player1, player2].filter(p => p?.pin_hash)
  $: allPinPlayers = [...pinPlayers, ...$adminPlayers.filter(a => !pinPlayers.find(p => p?.id === a.id))]

  function requestSubmit() {
    const err = validate()
    if (err) { logError = err; return }
    if (allPinPlayers.length > 0) { pinPromptOpen = true }
    else submit()
  }

  async function submit() {
    const err = validate()
    if (err) { logError = err; return }
    submitting = true
    logError = ''
    try {
      // Convert gameScores to winner's perspective for DB storage
      const dbGameScores = bestOf > 1
        ? gameScores.map(g => ({
            w: actualWinner.id === player1.id ? g.p1 : g.p2,
            l: actualWinner.id === player1.id ? g.p2 : g.p1,
          }))
        : null
      // Compute coin rewards BEFORE logging the match (so "daily bonus" detection
      // still sees today as empty for this player if it is their first of the day).
      const now = new Date().toISOString()
      const prospectiveMatch = {
        winner_id: actualWinner.id,
        loser_id: actualLoser.id,
        winner_score: ws,
        loser_score: ls,
        game_scores: dbGameScores,
        best_of: bestOf,
        played_at: now,
      }
      const winnerReward = computeSingleMatchReward(actualWinner.id, prospectiveMatch, $matchesStore)
      const loserReward  = computeSingleMatchReward(actualLoser.id, prospectiveMatch, $matchesStore)

      await logMatch(actualWinner.id, actualLoser.id, ws, ls, stakesValue, bestOf, dbGameScores)
      if (activeChallenge) {
        await deleteChallenge(activeChallenge.id)
        pendingChallenge.set(null)
      }
      result = {
        winner: actualWinner, loser: actualLoser,
        winnerScore: ws, loserScore: ls,
        winnerDelta, loserDelta,
        newWinnerElo: preview.winner,
        newLoserElo: preview.loser,
        stakes: stakesValue, bestOf,
        gameScores: dbGameScores,
        winnerCoins: winnerReward,
        loserCoins: loserReward,
      }
      setTimeout(() => {
        result = null
        player1 = null; player2 = null
        p1Score = ''; p2Score = ''
        gameScores = []; curP1 = ''; curP2 = ''
        activeChallenge = null
        stakesPreset = null; stakesCustom = ''; bestOf = 1
      }, 3500)
    } catch (e) {
      logError = e.message ?? 'Something went wrong, try again.'
    } finally {
      submitting = false
    }
  }

  async function submitChallenge() {
    if (!cp1 || !cp2) { challengeError = 'Pick both players.'; return }
    challengeSubmitting = true
    challengeError = ''
    try {
      await addChallenge({ player1Id: cp1.id, player2Id: cp2.id, stakes: stakesValue, bestOf, scheduledAt })
      challengeDone = true
      setTimeout(() => {
        challengeDone = false
        cp1 = null; cp2 = null
        scheduledDate = ''; scheduledTime = ''
        stakesPreset = null; stakesCustom = ''; bestOf = 1
      }, 2500)
    } catch (e) {
      challengeError = e.message ?? 'Something went wrong.'
    } finally {
      challengeSubmitting = false
    }
  }
</script>

<div class="wrap">

  <!-- Mode toggle -->
  <div class="mode-toggle">
    <button class="mode-btn" class:active={mode === 'log'} on:click={() => switchMode('log')}>
      Log a Game
    </button>
    <button class="mode-btn" class:active={mode === 'challenge'} on:click={() => switchMode('challenge')}>
      Set a Challenge
    </button>
  </div>

  <!-- ────────── LOG A GAME ────────── -->
  {#if mode === 'log'}
    {#if result}
      <div class="result-card">
        <div class="result-row">
          <div class="result-player winner-side">
            <span class="result-name">{result.winner.name}</span>
            <span class="result-score">{result.winnerScore}</span>
            <span class="result-elo pos">+{result.winnerDelta} → {result.newWinnerElo}</span>
          </div>
          <div class="result-vs">VS</div>
          <div class="result-player loser-side">
            <span class="result-name">{result.loser.name}</span>
            <span class="result-score">{result.loserScore}</span>
            <span class="result-elo neg">{result.loserDelta} → {result.newLoserElo}</span>
          </div>
        </div>
        {#if result.gameScores}
          <div class="result-games">
            {#each result.gameScores as g, i}
              <span class="rg-game">G{i+1}: {g.w}–{g.l}</span>
            {/each}
          </div>
        {/if}

        <!-- Pong Coin rewards -->
        <div class="result-coins">
          <div class="coin-reward coin-reward-winner">
            <svg viewBox="0 0 24 24" class="cr-svg" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="11" fill="#f5c14a" stroke="#7a4f00" stroke-width="1.3"/>
              <circle cx="12" cy="12" r="8.5" fill="none" stroke="#7a4f00" stroke-width="0.6" stroke-dasharray="1,1" opacity="0.6"/>
              <text x="12" y="16" text-anchor="middle" font-size="9" font-weight="900" fill="#5a3600" font-family="Georgia, serif">PC</text>
            </svg>
            <div class="cr-info">
              <span class="cr-name">{result.winner.name}</span>
              <span class="cr-breakdown">
                {#each result.winnerCoins.parts as part, i}
                  {#if i > 0}<span class="cr-plus">+</span>{/if}
                  <span class="cr-part">{part.amount}</span>
                {/each}
              </span>
            </div>
            <span class="cr-total tnum">+{formatCoins(result.winnerCoins.amount)}</span>
          </div>
          <div class="coin-reward coin-reward-loser">
            <svg viewBox="0 0 24 24" class="cr-svg" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="11" fill="#f5c14a" stroke="#7a4f00" stroke-width="1.3"/>
              <circle cx="12" cy="12" r="8.5" fill="none" stroke="#7a4f00" stroke-width="0.6" stroke-dasharray="1,1" opacity="0.6"/>
              <text x="12" y="16" text-anchor="middle" font-size="9" font-weight="900" fill="#5a3600" font-family="Georgia, serif">PC</text>
            </svg>
            <div class="cr-info">
              <span class="cr-name">{result.loser.name}</span>
              <span class="cr-breakdown">
                {#each result.loserCoins.parts as part, i}
                  {#if i > 0}<span class="cr-plus">+</span>{/if}
                  <span class="cr-part">{part.amount}</span>
                {/each}
              </span>
            </div>
            <span class="cr-total tnum">+{formatCoins(result.loserCoins.amount)}</span>
          </div>
        </div>

        {#if result.stakes}
          <div class="result-gamble">
            <span class="rg-icon">🎰</span>
            <span class="rg-text"><strong>{result.loser.name}</strong> owes <strong>{result.winner.name}</strong>: {result.stakes}{result.bestOf > 1 ? ` · Bo${result.bestOf}` : ''}</span>
          </div>
        {/if}
        <p class="result-label">Locked in ✓</p>
      </div>

    {:else}
      <!-- Challenge banner -->
      {#if activeChallenge}
        <div class="challenge-banner">
          <span class="cb-icon">⚔️</span>
          <span class="cb-text">
            {activeChallenge.player1?.name} vs {activeChallenge.player2?.name}
            {#if activeChallenge.stakes}<span class="cb-stakes"> · {activeChallenge.stakes}</span>{/if}
            {#if activeChallenge.best_of > 1}<span class="cb-bo"> · Bo{activeChallenge.best_of}</span>{/if}
          </span>
          <button class="cb-clear" on:click={clearChallenge} aria-label="Clear challenge">✕</button>
        </div>
      {/if}

      <section>
        <div class="section-header">
          <span class="label">Player 1</span>
          {#if player1}<span class="selected-name">{player1.name}</span>{/if}
        </div>
        <div class="player-scroll">
          {#each players as p}
            <button
              class="ps-item"
              class:chosen={player1?.id === p.id}
              class:dimmed={player2?.id === p.id}
              on:click={() => { player1 = p; if (player2?.id === p.id) player2 = null; logError = '' }}
              type="button"
            >
              <div class="ps-avatar">
                {#if p.avatar_url}
                  <img src={p.avatar_url} alt={p.name} />
                {:else}
                  {p.name[0].toUpperCase()}
                {/if}
                {#if player1?.id === p.id}
                  <div class="ps-check">✓</div>
                {/if}
              </div>
              <span class="ps-name">{p.name}</span>
            </button>
          {/each}
        </div>
      </section>

      <section>
        <div class="section-header">
          <span class="label">Player 2</span>
          {#if player2}<span class="selected-name">{player2.name}</span>{/if}
        </div>
        <div class="player-scroll">
          {#each players as p}
            <button
              class="ps-item"
              class:chosen={player2?.id === p.id}
              class:dimmed={player1?.id === p.id}
              on:click={() => { player2 = p; logError = '' }}
              disabled={player1?.id === p.id}
              type="button"
            >
              <div class="ps-avatar">
                {#if p.avatar_url}
                  <img src={p.avatar_url} alt={p.name} />
                {:else}
                  {p.name[0].toUpperCase()}
                {/if}
                {#if player2?.id === p.id}
                  <div class="ps-check">✓</div>
                {/if}
              </div>
              <span class="ps-name">{p.name}</span>
            </button>
          {/each}
        </div>
      </section>

      {#if bestOf > 1}
        <section>
          <div class="section-header">
            <span class="label">Game Scores</span>
            <span class="score-hint">Best of {bestOf} · first to {needed}</span>
          </div>

          {#if gameScores.length > 0}
            <div class="series-tally">
              <span class="tally-name" class:tally-lead={p1Wins > p2Wins}>{player1?.name ?? 'Player 1'}</span>
              <span class="tally-num" class:tally-lead={p1Wins > p2Wins}>{p1Wins}</span>
              <span class="tally-sep">–</span>
              <span class="tally-num" class:tally-lead={p2Wins > p1Wins}>{p2Wins}</span>
              <span class="tally-name" class:tally-lead={p2Wins > p1Wins}>{player2?.name ?? 'Player 2'}</span>
            </div>
          {/if}

          {#each gameScores as game, i}
            <div class="game-row">
              <span class="game-label">G{i + 1}</span>
              <span class="game-s" class:game-w={game.p1 > game.p2}>{game.p1}</span>
              <span class="game-sep">–</span>
              <span class="game-s" class:game-w={game.p2 > game.p1}>{game.p2}</span>
              {#if i === gameScores.length - 1 && !seriesComplete}
                <button class="game-undo" on:click={undoLastGame} type="button">✕</button>
              {/if}
            </div>
          {/each}

          {#if !seriesComplete}
            <div class="game-row game-active">
              <span class="game-label">G{gameScores.length + 1}</span>
              <input type="number" bind:value={curP1} min="0" max="99" class="game-input" placeholder="–" />
              <span class="game-sep">–</span>
              <input type="number" bind:value={curP2} min="0" max="99" class="game-input" placeholder="–" />
              <button class="game-ok" on:click={confirmGame} disabled={!canConfirmGame} type="button">✓</button>
            </div>
          {:else}
            <div class="series-done">Series complete</div>
          {/if}
        </section>
      {:else}
        <section>
          <div class="section-header">
            <span class="label">Score</span>
          </div>
          <div class="score-row">
            <div class="score-field">
              <label for="score-p1">{player1?.name ?? 'Player 1'}</label>
              <input id="score-p1" type="number" bind:value={p1Score} min="0" max="99" class="tnum" placeholder="–" />
            </div>
            <span class="score-dash">–</span>
            <div class="score-field">
              <label for="score-p2">{player2?.name ?? 'Player 2'}</label>
              <input id="score-p2" type="number" bind:value={p2Score} min="0" max="99" class="tnum" placeholder="–" />
            </div>
          </div>
        </section>
      {/if}

      <!-- Gamble -->
      <section>
        <div class="gamble-card" class:has-bet={stakesPreset !== null}>
          <div class="gamble-header">
            <span class="gamble-dice">🎲</span>
            <span class="gamble-title">Gamble</span>
            <span class="gamble-opt">optional</span>
          </div>
          <div class="presets">
            {#each PRESETS as p}
              <button
                class="preset-chip"
                class:active={stakesPreset === p.label}
                on:click={() => togglePreset(p.label)}
                type="button"
              >{p.emoji} {p.label}</button>
            {/each}
            <button
              class="preset-chip"
              class:active={stakesPreset === 'custom'}
              on:click={() => togglePreset('custom')}
              type="button"
            >✏️ Custom</button>
          </div>
          {#if stakesPreset === 'custom'}
            <input
              type="text"
              bind:value={stakesCustom}
              placeholder="e.g. 10 push-ups, wash dishes..."
              class="custom-input"
              maxlength="60"
            />
          {/if}
          {#if stakesPreset && stakesValue}
            <p class="gamble-summary">Loser pays: <strong>{stakesValue}</strong></p>
          {/if}
        </div>
      </section>

      <!-- Best of -->
      <section class="bestof-section">
        <span class="label">Best of</span>
        <div class="bestof-pills">
          {#each [1, 3, 5, 7] as n}
            <button class="pill" class:active={bestOf === n} on:click={() => onBestOfChange(n)} type="button">{n}</button>
          {/each}
        </div>
      </section>

      <!-- Elo preview -->
      {#if preview && actualWinner && actualLoser}
        <div class="preview">
          <div class="preview-row">
            <span class="preview-name">{actualWinner.name}</span>
            <span class="preview-delta pos">+{winnerDelta}</span>
          </div>
          <div class="preview-row">
            <span class="preview-name">{actualLoser.name}</span>
            <span class="preview-delta neg">{loserDelta}</span>
          </div>
          {#if winProb !== null}
            <div class="preview-prob">
              {#if winProb >= 60}
                <span class="prob-label">{actualWinner.name} is the favourite</span>
                <span class="prob-bar-wrap"><span class="prob-bar" style="width: {winProb}%"></span></span>
                <span class="prob-pct tnum">{winProb}%</span>
              {:else if winProb <= 40}
                <span class="prob-label">{actualLoser.name} is the underdog — upset earns extra</span>
              {:else}
                <span class="prob-label">Pretty even match</span>
              {/if}
            </div>
          {/if}
        </div>
      {/if}

      {#if logError}<p class="error">{logError}</p>{/if}

      <button class="submit-btn" on:click={requestSubmit} disabled={submitting || !actualWinner || !actualLoser}>
        {#if submitting}
          <span class="spinner"></span> Saving…
        {:else}
          Lock It In {#if pinPlayers.length > 0}<span>🔒</span>{/if}
        {/if}
      </button>

      <div class="add-player-wrap">
        <button class="add-link" on:click={() => (addPlayerOpen = true)}>+ New player</button>
      </div>
    {/if}

  <!-- ────────── SET A CHALLENGE ────────── -->
  {:else}
    {#if challengeDone}
      <div class="challenge-done">
        <div class="done-icon">⚔️</div>
        <p>Challenge set!</p>
        <p class="done-sub">It'll show up in History for everyone to see.</p>
      </div>

    {:else}
      <section>
        <div class="section-header">
          <span class="label">Player 1</span>
          {#if cp1}<span class="selected-name">{cp1.name}</span>{/if}
        </div>
        <div class="player-scroll">
          {#each players as p}
            <button
              class="ps-item"
              class:chosen={cp1?.id === p.id}
              class:dimmed={cp2?.id === p.id}
              on:click={() => { cp1 = p; if (cp2?.id === p.id) cp2 = null; challengeError = '' }}
              type="button"
            >
              <div class="ps-avatar">
                {#if p.avatar_url}
                  <img src={p.avatar_url} alt={p.name} />
                {:else}
                  {p.name[0].toUpperCase()}
                {/if}
                {#if cp1?.id === p.id}
                  <div class="ps-check">✓</div>
                {/if}
              </div>
              <span class="ps-name">{p.name}</span>
            </button>
          {/each}
        </div>
      </section>

      <section>
        <div class="section-header">
          <span class="label">Player 2</span>
          {#if cp2}<span class="selected-name">{cp2.name}</span>{/if}
        </div>
        <div class="player-scroll">
          {#each players as p}
            <button
              class="ps-item"
              class:chosen={cp2?.id === p.id}
              class:dimmed={cp1?.id === p.id}
              on:click={() => { cp2 = p; challengeError = '' }}
              disabled={cp1?.id === p.id}
              type="button"
            >
              <div class="ps-avatar">
                {#if p.avatar_url}
                  <img src={p.avatar_url} alt={p.name} />
                {:else}
                  {p.name[0].toUpperCase()}
                {/if}
                {#if cp2?.id === p.id}
                  <div class="ps-check">✓</div>
                {/if}
              </div>
              <span class="ps-name">{p.name}</span>
            </button>
          {/each}
        </div>
      </section>

      <!-- Gamble -->
      <section>
        <div class="gamble-card" class:has-bet={stakesPreset !== null}>
          <div class="gamble-header">
            <span class="gamble-dice">🎲</span>
            <span class="gamble-title">Gamble</span>
            <span class="gamble-opt">optional</span>
          </div>
          <div class="presets">
            {#each PRESETS as p}
              <button
                class="preset-chip"
                class:active={stakesPreset === p.label}
                on:click={() => togglePreset(p.label)}
                type="button"
              >{p.emoji} {p.label}</button>
            {/each}
            <button
              class="preset-chip"
              class:active={stakesPreset === 'custom'}
              on:click={() => togglePreset('custom')}
              type="button"
            >✏️ Custom</button>
          </div>
          {#if stakesPreset === 'custom'}
            <input
              type="text"
              bind:value={stakesCustom}
              placeholder="e.g. 10 push-ups, wash dishes..."
              class="custom-input"
              maxlength="60"
            />
          {/if}
          {#if stakesPreset && stakesValue}
            <p class="gamble-summary">Loser pays: <strong>{stakesValue}</strong></p>
          {/if}
        </div>
      </section>

      <!-- Best of -->
      <section class="bestof-section">
        <span class="label">Best of</span>
        <div class="bestof-pills">
          {#each [1, 3, 5, 7] as n}
            <button class="pill" class:active={bestOf === n} on:click={() => (bestOf = n)} type="button">{n}</button>
          {/each}
        </div>
      </section>

      <!-- When -->
      <section>
        <div class="section-header"><span class="label">When <span class="optional">optional</span></span></div>
        <div class="datetime-row">
          <input
            type="date"
            bind:value={scheduledDate}
            class="datetime-input"
            min={new Date().toISOString().slice(0, 10)}
          />
          {#if scheduledDate}
            <input
              type="time"
              bind:value={scheduledTime}
              class="datetime-input time-input"
            />
          {/if}
        </div>
      </section>

      {#if challengeError}<p class="error">{challengeError}</p>{/if}

      <button class="submit-btn" on:click={submitChallenge} disabled={challengeSubmitting}>
        {#if challengeSubmitting}<span class="spinner"></span> Saving…{:else}Issue Challenge ⚔️{/if}
      </button>
    {/if}
  {/if}
</div>

<AddPlayerModal bind:open={addPlayerOpen} />
<PinPrompt
  bind:open={pinPromptOpen}
  players={allPinPlayers}
  title="Confirm Match"
  subtitle="Enter your PIN to lock it in"
  on:success={submit}
/>

<style>
  .wrap {
    padding: 16px 16px calc(var(--nav-h) + 24px + env(safe-area-inset-bottom));
  }

  /* Mode toggle */
  .mode-toggle {
    display: flex;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 4px;
    gap: 4px;
    margin-bottom: 24px;
  }

  .mode-btn {
    flex: 1;
    padding: 9px 8px;
    border-radius: 8px;
    border: none;
    background: none;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
    letter-spacing: 0.01em;
  }

  .mode-btn.active {
    background: var(--amber);
    color: #000;
  }

  /* Challenge banner */
  .challenge-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(245,158,11,0.08);
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 20px;
  }

  .cb-icon { font-size: 16px; flex-shrink: 0; }

  .cb-text {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: var(--amber);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cb-stakes, .cb-bo {
    font-weight: 400;
    color: var(--text-muted);
  }

  .cb-clear {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 14px;
    cursor: pointer;
    padding: 2px 4px;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }

  section { margin-bottom: 20px; }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

  .optional {
    font-size: 9px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: var(--text-muted);
    opacity: 0.5;
  }

  .selected-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--amber);
  }

  /* Player avatar scroll */
  .player-scroll {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 4px 0 10px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    /* fade edges for scroll hint */
    -webkit-mask-image: linear-gradient(to right, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);
    mask-image: linear-gradient(to right, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);
    margin: 0 -4px;
    padding-left: 8px;
    padding-right: 8px;
  }
  .player-scroll::-webkit-scrollbar { display: none; }

  .ps-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 6px;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.15s;
  }
  .ps-item:disabled { cursor: not-allowed; }
  .ps-item.dimmed { opacity: 0.2; pointer-events: none; }

  .ps-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--surface);
    border: 2px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    font-size: 20px;
    font-weight: 700;
    color: #666;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
    flex-shrink: 0;
  }
  .ps-item:not(:disabled):active .ps-avatar { transform: scale(0.93); }
  .ps-item.chosen .ps-avatar {
    border-color: var(--amber);
    box-shadow: 0 0 0 3px rgba(245,158,11,0.2);
  }
  .ps-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .ps-check {
    position: absolute; inset: 0;
    background: rgba(245,158,11,0.85);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 800; color: #000;
    border-radius: 50%;
  }

  .ps-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    max-width: 64px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    letter-spacing: 0.01em;
    transition: color 0.15s;
  }
  .ps-item.chosen .ps-name { color: var(--amber); }

  /* Score */
  .score-row { display: flex; align-items: flex-end; gap: 12px; }

  .score-field { display: flex; flex-direction: column; gap: 6px; flex: 1; }

  .score-field label {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .score-field input {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-size: 28px;
    font-weight: 700;
    text-align: center;
    padding: 12px 8px;
    width: 100%;
    outline: none;
    transition: border-color 0.15s;
    -moz-appearance: textfield;
    font-family: inherit;
  }

  .score-field input::-webkit-outer-spin-button,
  .score-field input::-webkit-inner-spin-button { -webkit-appearance: none; }
  .score-field input:focus { border-color: var(--amber); }

  .score-dash { font-size: 24px; color: var(--text-muted); padding-bottom: 14px; flex-shrink: 0; }

  .score-hint { font-size: 11px; color: var(--text-muted); }

  /* Game-by-game tracker */
  .series-tally {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 14px;
    margin-bottom: 10px;
    background: var(--surface);
    border-radius: 10px;
  }

  .tally-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    max-width: 80px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.2s;
  }

  .tally-num {
    font-size: 22px;
    font-weight: 800;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    transition: color 0.2s;
  }

  .tally-lead { color: var(--amber); }

  .tally-sep {
    font-size: 14px;
    color: var(--text-muted);
    opacity: 0.4;
  }

  .game-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    border-radius: 8px;
    margin-bottom: 4px;
    background: rgba(255,255,255,0.03);
  }

  .game-row.game-active {
    background: rgba(245,158,11,0.06);
    border: 1px solid rgba(245,158,11,0.15);
    padding: 6px 11px;
  }

  .game-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    min-width: 24px;
    letter-spacing: 0.03em;
  }

  .game-s {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    min-width: 22px;
    text-align: center;
  }

  .game-s.game-w { color: var(--green); }

  .game-sep {
    font-size: 13px;
    color: var(--text-muted);
    opacity: 0.4;
  }

  .game-input {
    width: 50px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 16px;
    font-weight: 700;
    text-align: center;
    padding: 8px 4px;
    outline: none;
    -moz-appearance: textfield;
    font-family: inherit;
    font-variant-numeric: tabular-nums;
  }

  .game-input::-webkit-outer-spin-button,
  .game-input::-webkit-inner-spin-button { -webkit-appearance: none; }
  .game-input:focus { border-color: var(--amber); }
  .game-input::placeholder { color: var(--text-muted); opacity: 0.25; }

  .game-ok {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--amber);
    color: #000;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.15s, transform 0.1s;
    -webkit-tap-highlight-color: transparent;
    margin-left: auto;
  }

  .game-ok:disabled { opacity: 0.25; cursor: not-allowed; }
  .game-ok:not(:disabled):active { transform: scale(0.9); }

  .game-undo {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 6px;
    opacity: 0.4;
    margin-left: auto;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.15s;
  }

  .game-undo:hover { opacity: 0.8; }

  .series-done {
    text-align: center;
    padding: 10px;
    font-size: 12px;
    font-weight: 700;
    color: var(--green);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .result-games {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 12px;
    margin-bottom: 12px;
    padding: 8px 0;
  }

  .rg-game {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  /* Gamble card */
  .gamble-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 14px 14px 10px;
    transition: background 0.25s, border-color 0.25s;
  }
  .gamble-card.has-bet {
    background: rgba(245,158,11,0.06);
    border-color: rgba(245,158,11,0.3);
  }

  .gamble-header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 13px;
  }
  .gamble-dice { font-size: 16px; line-height: 1; }
  .gamble-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    transition: color 0.2s;
  }
  .gamble-card.has-bet .gamble-title { color: var(--amber); }
  .gamble-opt {
    font-size: 10px;
    font-weight: 400;
    color: var(--text-muted);
    opacity: 0.45;
    margin-left: 2px;
  }
  .gamble-card.has-bet .gamble-opt { opacity: 0; }

  .gamble-summary {
    margin: 10px 0 2px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .gamble-summary strong { color: var(--amber); font-weight: 700; }

  /* Bet presets */
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 2px;
  }

  .preset-chip {
    padding: 8px 13px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(255,255,255,0.04);
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s, transform 0.1s;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
  }
  .preset-chip:active { transform: scale(0.93); }
  .preset-chip.active {
    background: rgba(245,158,11,0.18);
    border-color: rgba(245,158,11,0.55);
    color: var(--amber);
    font-weight: 700;
  }

  .custom-input {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 14px;
    padding: 10px 12px;
    width: 100%;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
  }

  .custom-input::placeholder { color: var(--text-muted); opacity: 0.5; }
  .custom-input:focus { border-color: var(--amber); }

  /* Date / time */
  .datetime-row {
    display: flex;
    gap: 8px;
  }

  .datetime-input {
    flex: 1;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-size: 14px;
    font-weight: 500;
    padding: 10px 12px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s;
    color-scheme: dark;
  }

  .datetime-input:focus { border-color: var(--amber); }
  .time-input { flex: 0 0 auto; width: 130px; }

  /* Best of */
  .bestof-section {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .bestof-pills { display: flex; gap: 6px; }

  .pill {
    width: 38px;
    height: 34px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
  }

  .pill.active { background: var(--amber); border-color: var(--amber); color: #000; }

  /* Elo preview */
  .preview {
    padding: 12px 14px;
    background: var(--surface);
    border-radius: 10px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .preview-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
  .preview-name { font-weight: 500; color: var(--text); }
  .preview-delta { font-weight: 700; font-variant-numeric: tabular-nums; font-size: 13px; }
  .preview-delta.pos { color: var(--green); }
  .preview-delta.neg { color: var(--red); }

  .preview-prob {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--text-muted);
  }

  .prob-label { flex: 1; }
  .prob-bar-wrap { width: 60px; height: 4px; background: var(--surface2); border-radius: 2px; overflow: hidden; flex-shrink: 0; }
  .prob-bar { height: 100%; background: var(--amber); border-radius: 2px; transition: width 0.2s; }
  .prob-pct { font-size: 11px; font-weight: 600; color: var(--amber); flex-shrink: 0; }

  .error { font-size: 13px; color: var(--red); margin: 0 0 12px; }

  /* Submit */
  .submit-btn {
    width: 100%;
    padding: 15px;
    background: var(--amber);
    color: #000;
    font-size: 16px;
    font-weight: 700;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.15s, transform 0.1s;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
  }

  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .submit-btn:not(:disabled):active { transform: scale(0.97); }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(0,0,0,0.3);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .add-player-wrap { margin-top: 20px; display: flex; justify-content: center; }

  .add-link {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    padding: 4px 8px;
    transition: color 0.15s;
    font-family: inherit;
  }

  .add-link:hover { color: var(--amber); }

  /* Result card */
  .result-card {
    animation: pop 0.35s ease both;
    background: var(--surface);
    border: 1px solid rgba(245,158,11,0.3);
    border-radius: 16px;
    padding: 28px 20px 20px;
    text-align: center;
  }

  @keyframes pop {
    from { transform: scale(0.95); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }

  .result-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .result-player { flex: 1; display: flex; flex-direction: column; gap: 4px; align-items: center; }
  .result-name { font-size: 15px; font-weight: 700; color: var(--text); }
  .result-score { font-size: 36px; font-weight: 800; letter-spacing: -1px; line-height: 1; }
  .winner-side .result-score { color: var(--green); }
  .loser-side .result-score { color: var(--red); }
  .result-elo { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .result-elo.pos { color: var(--green); }
  .result-elo.neg { color: var(--red); }
  .result-vs { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.1em; flex-shrink: 0; }

  /* Coin rewards in result card */
  .result-coins {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 14px 0;
    padding: 12px 12px 10px;
    background:
      radial-gradient(ellipse 100% 60% at 50% 0%, rgba(245,193,74,0.08), transparent 70%),
      rgba(255,255,255,0.015);
    border: 1px solid rgba(245,193,74,0.2);
    border-radius: 12px;
  }

  .coin-reward {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 2px;
    animation: coinPop 0.4s ease-out both;
  }
  .coin-reward-winner { animation-delay: 0.15s; }
  .coin-reward-loser  { animation-delay: 0.3s; }

  @keyframes coinPop {
    from { transform: translateX(-6px); opacity: 0; }
    to   { transform: translateX(0);     opacity: 1; }
  }

  .cr-svg {
    width: 26px;
    height: 26px;
    display: block;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 4px rgba(245,193,74,0.4));
  }

  .cr-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
  }

  .cr-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cr-breakdown {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    opacity: 0.65;
  }

  .cr-part { font-weight: 600; }
  .cr-plus { opacity: 0.5; }

  .cr-total {
    font-size: 18px;
    font-weight: 900;
    color: #f5c14a;
    letter-spacing: -0.01em;
    background: linear-gradient(180deg, #ffe89a, #f5c14a, #c99320);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    flex-shrink: 0;
  }

  .result-gamble {
    display: flex;
    align-items: center;
    gap: 9px;
    background: rgba(245,158,11,0.1);
    border: 1px solid rgba(245,158,11,0.3);
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 10px;
  }
  .rg-icon { font-size: 20px; flex-shrink: 0; }
  .rg-text { font-size: 13px; font-weight: 500; color: var(--amber); line-height: 1.4; }
  .rg-text strong { color: #f0f0f0; font-weight: 700; }
  .result-label { margin: 0; font-size: 13px; color: var(--text-muted); }

  /* Challenge done */
  .challenge-done {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px;
    gap: 8px;
    animation: pop 0.3s ease both;
  }

  .done-icon { font-size: 48px; margin-bottom: 8px; }

  .challenge-done p {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }

  .done-sub { font-size: 14px; font-weight: 400; color: var(--text-muted); }
</style>
