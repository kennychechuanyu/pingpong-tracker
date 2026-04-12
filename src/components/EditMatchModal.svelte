<script>
  import { onMount, onDestroy } from 'svelte'
  import { updateMatch, deleteMatch, adminPlayers } from '../lib/stores.js'
  import PinPrompt from './PinPrompt.svelte'

  export let open = false
  export let match = null  // enriched match (has .winner, .loser, .winner_id, .loser_id)

  let winnerScore = 11
  let loserScore = 0
  let swapped = false   // true = original loser is now winner
  let saving = false
  let deleting = false
  let confirmDelete = false
  let error = ''
  let pinPromptOpen = false
  let pinPromptAction = null

  $: if (open && match) {
    winnerScore = match.winner_score
    loserScore = match.loser_score
    swapped = false
    saving = false
    deleting = false
    confirmDelete = false
    error = ''
  }

  // Displayed names based on swap state
  $: displayWinner = swapped ? match?.loser : match?.winner
  $: displayLoser  = swapped ? match?.winner : match?.loser

  $: pinPlayers = match ? [match.winner, match.loser].filter(p => p?.pin_hash) : []
  $: allPinPlayers = [...pinPlayers, ...$adminPlayers.filter(a => !pinPlayers.find(p => p?.id === a.id))]

  function requestSave() {
    if (!canSave) return
    if (allPinPlayers.length > 0) { pinPromptAction = 'save'; pinPromptOpen = true }
    else save()
  }

  function requestDelete() {
    if (!confirmDelete) { confirmDelete = true; return }
    if (allPinPlayers.length > 0) { pinPromptAction = 'delete'; pinPromptOpen = true }
    else doDelete()
  }

  function onPinSuccess() {
    if (pinPromptAction === 'save') save()
    else if (pinPromptAction === 'delete') doDelete()
    pinPromptAction = null
  }

  $: busy = saving || deleting
  $: canSave = !busy &&
    Number.isInteger(+winnerScore) && +winnerScore >= 0 &&
    Number.isInteger(+loserScore)  && +loserScore  >= 0 &&
    +winnerScore !== +loserScore

  function close() {
    if (busy) return
    open = false
    confirmDelete = false
  }

  async function save() {
    if (!canSave || !match) return
    saving = true
    error = ''
    try {
      const ws = Math.max(+winnerScore, +loserScore)
      const ls = Math.min(+winnerScore, +loserScore)
      // swapped=true means original loser won, so flip IDs
      const wid = swapped ? match.loser_id : match.winner_id
      const lid = swapped ? match.winner_id : match.loser_id
      await updateMatch(match.id, {
        winner_id: wid,
        loser_id: lid,
        winner_score: ws,
        loser_score: ls,
      })
      open = false
    } catch (e) {
      error = e.message || 'Failed to save.'
      saving = false
    }
  }

  async function doDelete() {
    if (!confirmDelete) { confirmDelete = true; return }
    deleting = true
    error = ''
    try {
      await deleteMatch(match.id)
      open = false
    } catch (e) {
      error = e.message || 'Failed to delete.'
      deleting = false
      confirmDelete = false
    }
  }

  function handleKey(e) { if (e.key === 'Escape') close() }
  onMount(() => window.addEventListener('keydown', handleKey))
  onDestroy(() => window.removeEventListener('keydown', handleKey))
</script>

{#if open && match}
  <div class="overlay" on:click={close} role="button" tabindex="-1" aria-label="Close" on:keydown={() => {}}>
    <div class="sheet" on:click|stopPropagation on:keydown={() => {}} role="dialog" aria-modal="true" tabindex="-1">
      <div class="drag-handle"></div>

      <div class="sheet-header">
        <h2>Edit Game</h2>
        <button class="close-btn" on:click={close} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="form">

        <!-- Result display -->
        <div class="result-row">
          <div class="result-player winner-side">
            <span class="role-badge win">W</span>
            <span class="player-name">{displayWinner?.name ?? '—'}</span>
          </div>
          <div class="score-inputs">
            <input
              type="number" min="0" max="99"
              class="score-input"
              bind:value={winnerScore}
              on:focus={e => e.target.select()}
            />
            <span class="score-sep">–</span>
            <input
              type="number" min="0" max="99"
              class="score-input"
              bind:value={loserScore}
              on:focus={e => e.target.select()}
            />
          </div>
          <div class="result-player loser-side">
            <span class="player-name">{displayLoser?.name ?? '—'}</span>
            <span class="role-badge lose">L</span>
          </div>
        </div>

        <!-- Swap button -->
        <button class="swap-btn" class:active={swapped} on:click={() => (swapped = !swapped)} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
          {swapped ? 'Result swapped — tap to undo' : 'Swap winner & loser'}
        </button>

        {#if error}
          <p class="error-msg">{error}</p>
        {/if}

        <button class="submit-btn" on:click={requestSave} disabled={!canSave} type="button">
          {#if saving}
            <span class="spinner"></span>Saving…
          {:else}
            Save Changes
          {/if}
        </button>

        <div class="divider"></div>

        <button
          class="delete-btn"
          class:confirming={confirmDelete}
          on:click={requestDelete}
          disabled={busy}
          type="button"
        >
          {#if deleting}
            <span class="spinner spinner-red"></span>Deleting…
          {:else if confirmDelete}
            Tap again to confirm delete
          {:else}
            Delete Game
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<PinPrompt
  bind:open={pinPromptOpen}
  players={allPinPlayers}
  title={pinPromptAction === 'delete' ? 'Confirm Delete' : 'Confirm Changes'}
  subtitle="Enter a PIN from one of the players in this match"
  on:success={onPinSuccess}
/>

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 300;
    display: flex; align-items: flex-end; justify-content: center;
  }

  .sheet {
    background: #161616;
    border: 1px solid rgba(255,255,255,0.07);
    border-bottom: none;
    border-radius: 24px 24px 0 0;
    width: 100%; max-width: 480px;
    max-height: 92dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding-bottom: calc(24px + env(safe-area-inset-bottom));
    animation: rise 0.3s cubic-bezier(0.32,0.72,0,1);
  }

  @keyframes rise {
    from { transform: translateY(60px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .drag-handle {
    width: 36px; height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    margin: 12px auto 0;
  }

  .sheet-header {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 16px 20px 0;
  }

  h2 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; color: #f0f0f0; }

  .close-btn {
    background: rgba(255,255,255,0.06); border: none; border-radius: 50%;
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #888;
    transition: background 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .close-btn:hover { background: rgba(255,255,255,0.1); color: #f0f0f0; }

  .form { padding: 20px 20px 0; display: flex; flex-direction: column; gap: 14px; }

  /* Result row */
  .result-row {
    display: flex; align-items: center; gap: 10px;
    background: #1e1e1e;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 16px 14px;
  }

  .result-player {
    flex: 1; display: flex; align-items: center; gap: 7px; min-width: 0;
  }
  .winner-side { justify-content: flex-start; }
  .loser-side  { justify-content: flex-end; }

  .player-name {
    font-size: 14px; font-weight: 700; color: #f0f0f0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .loser-side .player-name { color: #666; }

  .role-badge {
    font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;
    letter-spacing: 0.05em; flex-shrink: 0;
  }
  .role-badge.win { background: rgba(34,197,94,0.15); color: #22c55e; }
  .role-badge.lose { background: rgba(239,68,68,0.15); color: #ef4444; }

  .score-inputs {
    display: flex; align-items: center; gap: 6px; flex-shrink: 0;
  }

  .score-input {
    width: 44px; height: 44px;
    background: #121212; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px; color: #f0f0f0;
    font-size: 20px; font-weight: 700;
    text-align: center; outline: none;
    -moz-appearance: textfield;
    font-family: inherit; font-variant-numeric: tabular-nums;
    transition: border-color 0.15s;
  }
  .score-input::-webkit-outer-spin-button,
  .score-input::-webkit-inner-spin-button { -webkit-appearance: none; }
  .score-input:focus { border-color: rgba(245,158,11,0.6); }

  .score-sep { font-size: 18px; color: #444; font-weight: 700; }

  /* Swap button */
  .swap-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 13px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 12px; color: #888;
    font-size: 14px; font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent; font-family: inherit;
  }
  .swap-btn:hover { background: rgba(255,255,255,0.07); color: #ccc; }
  .swap-btn.active {
    background: rgba(245,158,11,0.1);
    border-color: rgba(245,158,11,0.4);
    color: #f59e0b;
  }

  .error-msg { margin: 0; font-size: 13px; color: #ef4444; }

  .submit-btn {
    width: 100%; padding: 15px;
    background: #f59e0b; color: #000;
    font-size: 16px; font-weight: 700; border: none; border-radius: 12px;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: opacity 0.15s, transform 0.1s;
    -webkit-tap-highlight-color: transparent; font-family: inherit;
  }
  .submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .submit-btn:not(:disabled):active { transform: scale(0.98); }

  .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 2px 0 0; }

  .delete-btn {
    width: 100%; padding: 14px;
    background: transparent;
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 12px; color: #ef4444;
    font-size: 14px; font-weight: 600;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent; font-family: inherit;
  }
  .delete-btn.confirming { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.5); }
  .delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(0,0,0,0.25); border-top-color: #000;
    border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0;
  }
  .spinner-red { border-color: rgba(239,68,68,0.25); border-top-color: #ef4444; }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
