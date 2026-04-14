<script>
  import { onMount, onDestroy } from 'svelte'
  import { updatePlayer, deletePlayer, setPlayerPin, setPlayerTeam, adminPlayers, teams } from '../lib/stores.js'
  import { push } from 'svelte-spa-router'
  import PinPrompt from './PinPrompt.svelte'

  export let open = false
  export let player = null
  export let allPlayers = []

  let name = ''
  let paddleType = ''
  let philosophy = ''
  let sifuId = null
  let rivalId = null
  let teamId = null
  let avatarFile = null
  let avatarPreview = null
  let submitting = false
  let deleting = false
  let confirmDelete = false
  let error = ''
  let fileInput

  // PIN setup
  let newPin = ''
  let pinError = ''
  let pinSaving = false

  // PIN confirmation flow
  let pinPromptOpen = false
  let pinPromptAction = null  // 'save' | 'delete'

  $: if (open && player) {
    name = player.name ?? ''
    paddleType = player.paddle_type ?? ''
    philosophy = player.philosophy ?? ''
    sifuId = player.sifu_id ?? null
    rivalId = player.rival_id ?? null
    teamId = player.team_id ?? null
    avatarFile = null
    avatarPreview = null
    submitting = false
    deleting = false
    confirmDelete = false
    error = ''
    newPin = ''
    pinError = ''
  }

  $: otherPlayers = allPlayers.filter(p => p.id !== player?.id)
  $: canSubmit = name.trim().length > 0 && paddleType !== '' && !submitting && !deleting

  function close() {
    if (submitting || deleting) return
    open = false
    confirmDelete = false
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    avatarFile = file
    const reader = new FileReader()
    reader.onload = ev => { avatarPreview = ev.target.result }
    reader.readAsDataURL(file)
  }

  // Called after PIN confirmed (or directly if no PIN set)
  async function save() {
    if (!canSubmit) return
    submitting = true
    error = ''
    try {
      await updatePlayer(player.id, { name, paddle_type: paddleType, philosophy, avatarFile, sifu_id: sifuId, rival_id: rivalId })
      await setPlayerTeam(player.id, teamId)
      open = false
    } catch (e) {
      error = e.message || 'Failed to save.'
      submitting = false
    }
  }

  function requestSave() {
    if (!canSubmit) return
    if (player.pin_hash) { pinPromptAction = 'save'; pinPromptOpen = true }
    else save()
  }

  async function doDelete() {
    if (!confirmDelete) { confirmDelete = true; return }
    deleting = true
    error = ''
    try {
      await deletePlayer(player.id)
      open = false
      push('/')
    } catch (e) {
      error = e.message || 'Failed to delete.'
      deleting = false
      confirmDelete = false
    }
  }

  function requestDelete() {
    if (!confirmDelete) { confirmDelete = true; return }
    if (player.pin_hash) { pinPromptAction = 'delete'; pinPromptOpen = true }
    else doDelete()
  }

  function onPinSuccess(e) {
    const verifiedPin = e?.detail?.pin ?? null
    const action = pinPromptAction
    pinPromptAction = null
    if (action === 'save') save()
    else if (action === 'delete') doDelete()
    else if (action === 'setPin') doSetPin(verifiedPin)
    else if (action === 'removePin') doRemovePin(verifiedPin)
  }

  function setPin() {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { pinError = 'PIN must be 4 digits.'; return }
    // Changing an existing PIN requires verifying the current one first
    if (player?.pin_hash) {
      pinPromptAction = 'setPin'
      pinPromptOpen = true
      return
    }
    doSetPin(null)
  }

  async function doSetPin(currentPin) {
    pinSaving = true; pinError = ''
    try {
      await setPlayerPin(player.id, newPin, currentPin)
      newPin = ''
    } catch (e) {
      pinError = e.message || 'Failed to set PIN.'
    } finally { pinSaving = false }
  }

  function removePin() {
    if (player?.pin_hash) {
      pinPromptAction = 'removePin'
      pinPromptOpen = true
      return
    }
    // Nothing to remove
  }

  async function doRemovePin(currentPin) {
    pinSaving = true; pinError = ''
    try {
      await setPlayerPin(player.id, null, currentPin)
    } catch (e) {
      pinError = e.message || 'Failed to remove PIN.'
    } finally { pinSaving = false }
  }

  function handleKey(e) { if (e.key === 'Escape') close() }
  onMount(() => window.addEventListener('keydown', handleKey))
  onDestroy(() => window.removeEventListener('keydown', handleKey))
</script>

{#if open}
  <div class="overlay" on:click={close} role="button" tabindex="-1" aria-label="Close" on:keydown={() => {}}>
    <div class="sheet" on:click|stopPropagation on:keydown={() => {}} role="dialog" aria-modal="true" tabindex="-1">
      <div class="drag-handle"></div>

      <div class="sheet-header">
        <h2>Edit Player</h2>
        <button class="close-btn" on:click={close} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Avatar -->
      <div class="avatar-section">
        <button class="avatar-ring" class:has-photo={!!(avatarPreview || player?.avatar_url)}
          on:click={() => fileInput.click()} type="button" aria-label="Change photo">
          {#if avatarPreview}
            <img src={avatarPreview} alt="Preview" class="avatar-img" />
          {:else if player?.avatar_url}
            <img src={player.avatar_url} alt={player.name} class="avatar-img" />
          {:else}
            <div class="avatar-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>Photo</span>
            </div>
          {/if}
          <div class="avatar-badge">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </div>
        </button>
        <input bind:this={fileInput} type="file" accept="image/*" on:change={onFileChange} style="display:none" />
      </div>

      <div class="form">
        <div class="field">
          <label for="edit-name" class="field-label">Name</label>
          <input id="edit-name" type="text" bind:value={name} placeholder="Player name"
            maxlength="30" class="text-input" on:keydown={e => e.key === 'Enter' && save()} />
        </div>

        <div class="field">
          <span class="field-label">Paddle Style</span>
          <div class="paddle-row">
            <button class="paddle-btn" class:selected={paddleType === 'Penhold'}
              on:click={() => (paddleType = 'Penhold')} type="button">
              <span class="paddle-main">Penhold</span>
              <span class="paddle-sub">直板</span>
            </button>
            <button class="paddle-btn" class:selected={paddleType === 'Shakehand'}
              on:click={() => (paddleType = 'Shakehand')} type="button">
              <span class="paddle-main">Shakehand</span>
              <span class="paddle-sub">橫板</span>
            </button>
          </div>
        </div>

        <div class="field">
          <div class="field-label-row">
            <label for="edit-philosophy" class="field-label">Philosophy <span class="optional">optional</span></label>
            <span class="char-count" class:near-limit={philosophy.length > 60}>{philosophy.length}/80</span>
          </div>
          <input id="edit-philosophy" type="text" bind:value={philosophy}
            placeholder="My ping pong philosophy in one sentence"
            maxlength="80" class="text-input philosophy-input" />
        </div>

        <div class="field">
          <div class="field-label-row">
            <span class="field-label">師父 <span class="optional">Sifu · optional</span></span>
            {#if sifuId}
              <button class="clear-sifu" on:click={() => (sifuId = null)} type="button">Clear</button>
            {/if}
          </div>
          {#if otherPlayers.length > 0}
            <div class="sifu-scroll">
              {#each otherPlayers as p}
                <button
                  class="sp-item"
                  class:chosen={sifuId === p.id}
                  on:click={() => (sifuId = sifuId === p.id ? null : p.id)}
                  type="button"
                >
                  <div class="sp-avatar">
                    {#if p.avatar_url}
                      <img src={p.avatar_url} alt={p.name} />
                    {:else}
                      {p.name[0].toUpperCase()}
                    {/if}
                  </div>
                  <span class="sp-name">{p.name}</span>
                </button>
              {/each}
            </div>
          {:else}
            <p class="no-players">No other players yet.</p>
          {/if}
        </div>

        <div class="field">
          <div class="field-label-row">
            <span class="field-label rival-label">宿敵 <span class="optional">Archrival · optional</span></span>
            {#if rivalId}
              <button class="clear-sifu" on:click={() => (rivalId = null)} type="button">Clear</button>
            {/if}
          </div>
          {#if otherPlayers.length > 0}
            <div class="sifu-scroll">
              {#each otherPlayers as p}
                <button
                  class="sp-item"
                  class:chosen-rival={rivalId === p.id}
                  on:click={() => (rivalId = rivalId === p.id ? null : p.id)}
                  type="button"
                >
                  <div class="sp-avatar" class:sp-avatar-rival={rivalId === p.id}>
                    {#if p.avatar_url}
                      <img src={p.avatar_url} alt={p.name} />
                    {:else}
                      {p.name[0].toUpperCase()}
                    {/if}
                  </div>
                  <span class="sp-name" class:sp-name-rival={rivalId === p.id}>{p.name}</span>
                </button>
              {/each}
            </div>
          {:else}
            <p class="no-players">No other players yet.</p>
          {/if}
        </div>

        <!-- Team -->
        {#if $teams.length > 0}
          <div class="field">
            <span class="field-label">Team <span class="optional">optional</span></span>
            <div class="team-pills">
              <button
                class="team-pill"
                class:active={!teamId}
                on:click={() => (teamId = null)}
                type="button"
              >None</button>
              {#each $teams as t}
                <button
                  class="team-pill"
                  class:active={teamId === t.id}
                  on:click={() => (teamId = teamId === t.id ? null : t.id)}
                  type="button"
                >{t.emoji} {t.name}</button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- PIN section -->
        <div class="pin-section">
          {#if player?.pin_hash}
            <div class="pin-status">
              <span class="pin-lock">🔒</span>
              <span class="pin-status-text">PIN protected</span>
              <button class="pin-remove" on:click={removePin} disabled={pinSaving} type="button">
                {pinSaving ? '…' : 'Remove'}
              </button>
            </div>
          {:else}
            <div class="pin-setup">
              <span class="pin-label">Set PIN <span class="pin-opt">4 digits · optional</span></span>
              <div class="pin-row">
                <input
                  type="tel" inputmode="numeric" maxlength="4" pattern="\d{4}"
                  placeholder="····" class="pin-input"
                  bind:value={newPin}
                  on:keydown={e => e.key === 'Enter' && setPin()}
                />
                <button class="pin-set-btn" on:click={setPin} disabled={newPin.length !== 4 || pinSaving} type="button">
                  {pinSaving ? '…' : 'Set'}
                </button>
              </div>
            </div>
          {/if}
          {#if pinError}<p class="pin-error">{pinError}</p>{/if}
        </div>

        {#if error}
          <p class="error-msg">{error}</p>
        {/if}

        <button class="submit-btn" on:click={requestSave} disabled={!canSubmit} type="button">
          {#if submitting}
            <span class="spinner"></span>Saving…
          {:else}
            Save Changes {#if player?.pin_hash}<span class="btn-lock">🔒</span>{/if}
          {/if}
        </button>

        <div class="divider"></div>

        <button
          class="delete-btn"
          class:confirming={confirmDelete}
          on:click={requestDelete}
          disabled={deleting || submitting}
          type="button"
        >
          {#if deleting}
            <span class="spinner spinner-red"></span>Deleting…
          {:else if confirmDelete}
            Tap again to confirm delete
          {:else}
            Delete Player
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<PinPrompt
  bind:open={pinPromptOpen}
  players={[player, ...$adminPlayers.filter(a => a.id !== player?.id)]}
  title={pinPromptAction === 'delete' ? 'Confirm Delete' : 'Confirm Changes'}
  subtitle={pinPromptAction === 'delete' ? 'Enter your PIN to delete this profile' : 'Enter your PIN to save changes'}
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

  .avatar-section { display: flex; justify-content: center; padding: 20px 0 8px; }

  .avatar-ring {
    position: relative; width: 96px; height: 96px; border-radius: 50%;
    border: 2px dashed rgba(255,255,255,0.15);
    background: #1e1e1e; cursor: pointer; overflow: visible;
    transition: border-color 0.2s, transform 0.15s;
    -webkit-tap-highlight-color: transparent;
    display: flex; align-items: center; justify-content: center;
  }
  .avatar-ring:active { transform: scale(0.96); }
  .avatar-ring.has-photo { border: 2px solid rgba(245,158,11,0.5); box-shadow: 0 0 0 4px rgba(245,158,11,0.1); }

  .avatar-img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; }

  .avatar-placeholder { display: flex; flex-direction: column; align-items: center; gap: 4px; color: #4a4a4a; }
  .avatar-placeholder span { font-size: 11px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }

  .avatar-badge {
    position: absolute; bottom: 2px; right: 2px;
    width: 24px; height: 24px; border-radius: 50%;
    background: #f59e0b; color: #000;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid #161616;
  }

  .form { padding: 12px 20px 0; display: flex; flex-direction: column; gap: 18px; }

  .field { display: flex; flex-direction: column; gap: 8px; }

  .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #5a5a5a; }

  .field-label-row { display: flex; align-items: center; justify-content: space-between; }
  .optional { font-size: 10px; font-weight: 400; text-transform: none; letter-spacing: 0; color: #404040; }
  .char-count { font-size: 11px; color: #404040; font-variant-numeric: tabular-nums; transition: color 0.15s; }
  .char-count.near-limit { color: #f59e0b; }

  .text-input {
    background: #1e1e1e; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px; color: #f0f0f0; font-size: 15px;
    padding: 12px 14px; width: 100%; outline: none;
    transition: border-color 0.15s; font-family: inherit;
  }
  .text-input::placeholder { color: #3a3a3a; }
  .text-input:focus { border-color: rgba(245,158,11,0.5); }
  .philosophy-input { font-style: italic; }

  .paddle-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  .paddle-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px; padding: 14px 8px;
    background: #1e1e1e; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .paddle-btn:active { transform: scale(0.97); }
  .paddle-btn.selected { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.6); }

  .paddle-main { font-size: 15px; font-weight: 700; color: #888; letter-spacing: 0.02em; transition: color 0.15s; }
  .paddle-btn.selected .paddle-main { color: #f59e0b; }
  .paddle-sub { font-size: 13px; font-weight: 500; color: #3a3a3a; transition: color 0.15s; }
  .paddle-btn.selected .paddle-sub { color: rgba(245,158,11,0.5); }

  /* Sifu picker */
  .clear-sifu {
    background: none; border: none;
    font-size: 11px; color: #555; cursor: pointer;
    padding: 0; font-family: inherit;
    transition: color 0.15s;
  }
  .clear-sifu:hover { color: #ef4444; }

  .sifu-scroll {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 4px 0 8px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-mask-image: linear-gradient(to right, transparent 0, black 10px, black calc(100% - 10px), transparent 100%);
    mask-image: linear-gradient(to right, transparent 0, black 10px, black calc(100% - 10px), transparent 100%);
  }
  .sifu-scroll::-webkit-scrollbar { display: none; }

  .sp-item {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    background: none; border: none; cursor: pointer;
    padding: 4px 6px; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }

  .sp-avatar {
    width: 48px; height: 48px; border-radius: 50%;
    background: #1e1e1e;
    border: 2px solid rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; position: relative;
    font-size: 18px; font-weight: 700; color: #555;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .sp-item.chosen .sp-avatar {
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.2);
  }
  .sp-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .sp-name {
    font-size: 10px; font-weight: 600; color: #555;
    max-width: 56px; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; text-align: center;
    transition: color 0.15s;
  }
  .sp-item.chosen .sp-name { color: #f59e0b; }

  .no-players { margin: 0; font-size: 12px; color: #444; font-style: italic; }

  /* Team pills */
  .team-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .team-pill {
    padding: 7px 12px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(255,255,255,0.04);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
  }

  .team-pill.active {
    background: rgba(245,158,11,0.18);
    border-color: rgba(245,158,11,0.55);
    color: var(--amber);
    font-weight: 700;
  }

  /* PIN section */
  .pin-section {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 12px 14px;
  }
  .pin-status { display: flex; align-items: center; gap: 8px; }
  .pin-lock { font-size: 14px; }
  .pin-status-text { flex: 1; font-size: 13px; font-weight: 600; color: #ccc; }
  .pin-remove {
    background: none; border: none; color: #555; font-size: 12px;
    cursor: pointer; font-family: inherit; padding: 2px 6px;
    transition: color 0.15s;
  }
  .pin-remove:hover { color: #ef4444; }
  .pin-setup { display: flex; flex-direction: column; gap: 8px; }
  .pin-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888; }
  .pin-opt { font-size: 10px; font-weight: 400; text-transform: none; letter-spacing: 0; color: #555; }
  .pin-row { display: flex; gap: 8px; }
  .pin-input {
    flex: 1; background: #121212; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; color: #f0f0f0; font-size: 20px; font-weight: 700;
    letter-spacing: 0.3em; text-align: center; padding: 8px 12px; outline: none;
    font-family: inherit; transition: border-color 0.15s;
  }
  .pin-input:focus { border-color: rgba(245,158,11,0.5); }
  .pin-input::placeholder { letter-spacing: 0.15em; color: #333; font-size: 16px; }
  .pin-set-btn {
    padding: 8px 16px; background: #f59e0b; color: #000;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: opacity 0.15s;
  }
  .pin-set-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .pin-error { margin: 6px 0 0; font-size: 12px; color: #ef4444; }

  .btn-lock { font-size: 13px; margin-left: 2px; }

  .rival-label { color: #ef4444 !important; }
  .sp-avatar-rival { border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.2) !important; }
  .sp-name-rival { color: #ef4444 !important; }

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

  .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 4px 0 0; }

  .delete-btn {
    width: 100%; padding: 14px;
    background: transparent;
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 12px; color: #ef4444;
    font-size: 14px; font-weight: 600;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
    -webkit-tap-highlight-color: transparent; font-family: inherit;
  }
  .delete-btn:not(:disabled):active { transform: scale(0.98); }
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
