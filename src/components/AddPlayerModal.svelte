<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import { addPlayer, setPlayerPin } from '../lib/stores.js'
  import { hashPin } from '../lib/pin.js'

  export let open = false

  const dispatch = createEventDispatcher()

  let name = ''
  let paddleType = ''
  let philosophy = ''
  let avatarFile = null
  let avatarPreview = null
  let pin = ''
  let submitting = false
  let error = ''
  let fileInput

  $: canSubmit = name.trim().length > 0 && paddleType !== '' && pin.length === 4 && !submitting

  function reset() {
    name = ''
    paddleType = ''
    philosophy = ''
    pin = ''
    avatarFile = null
    avatarPreview = null
    submitting = false
    error = ''
  }

  function close() {
    if (submitting) return
    open = false
    reset()
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    avatarFile = file
    const reader = new FileReader()
    reader.onload = ev => { avatarPreview = ev.target.result }
    reader.readAsDataURL(file)
  }

  async function submit() {
    if (!canSubmit) return
    submitting = true
    error = ''
    try {
      const player = await addPlayer({
        name: name.trim(),
        paddle_type: paddleType,
        philosophy: philosophy.trim() || null,
        avatarFile,
      })
      const hash = await hashPin(pin)
      await setPlayerPin(player.id, hash)
      dispatch('created', player)
      open = false
      reset()
    } catch (e) {
      error = e.message ? `${e.name}: ${e.message}` : 'Failed to add player.'
      submitting = false
    }
  }

  function handleKey(e) {
    if (e.key === 'Escape') close()
  }

  onMount(() => window.addEventListener('keydown', handleKey))
  onDestroy(() => window.removeEventListener('keydown', handleKey))
</script>

{#if open}
  <div class="overlay" on:click={close} role="button" tabindex="-1" aria-label="Close" on:keydown={() => {}}>
    <div
      class="sheet"
      on:click|stopPropagation
      on:keydown={() => {}}
      role="dialog"
      aria-modal="true"
      aria-label="Add new player"
      tabindex="-1"
    >
      <div class="drag-handle"></div>

      <div class="sheet-header">
        <h2>New Player</h2>
        <button class="close-btn" on:click={close} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Avatar picker -->
      <div class="avatar-section">
        <button
          class="avatar-ring"
          class:has-photo={!!avatarPreview}
          on:click={() => fileInput.click()}
          type="button"
          aria-label="Upload photo"
        >
          {#if avatarPreview}
            <img src={avatarPreview} alt="Avatar preview" class="avatar-img" />
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
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
        </button>
        <input
          bind:this={fileInput}
          type="file"
          accept="image/*"
          on:change={onFileChange}
          style="display:none"
        />
      </div>

      <div class="form">
        <!-- Name -->
        <div class="field">
          <label for="player-name" class="field-label">Name</label>
          <input
            id="player-name"
            type="text"
            bind:value={name}
            placeholder="Player name"
            maxlength="30"
            class="text-input"
            on:keydown={e => e.key === 'Enter' && submit()}
          />
        </div>

        <!-- Paddle type -->
        <div class="field">
          <span class="field-label">Paddle Style</span>
          <div class="paddle-row">
            <button
              class="paddle-btn"
              class:selected={paddleType === 'Penhold'}
              on:click={() => (paddleType = 'Penhold')}
              type="button"
            >
              <span class="paddle-main">Penhold</span>
              <span class="paddle-sub">直板</span>
            </button>
            <button
              class="paddle-btn"
              class:selected={paddleType === 'Shakehand'}
              on:click={() => (paddleType = 'Shakehand')}
              type="button"
            >
              <span class="paddle-main">Shakehand</span>
              <span class="paddle-sub">橫板</span>
            </button>
          </div>
        </div>

        <!-- Philosophy -->
        <div class="field">
          <div class="field-label-row">
            <label for="player-philosophy" class="field-label">Philosophy <span class="optional">optional</span></label>
            <span class="char-count" class:near-limit={philosophy.length > 60}>{philosophy.length}/80</span>
          </div>
          <input
            id="player-philosophy"
            type="text"
            bind:value={philosophy}
            placeholder="My ping pong philosophy in one sentence"
            maxlength="80"
            class="text-input philosophy-input"
          />
        </div>

        <!-- PIN -->
        <div class="pin-section">
          <span class="pin-label">PIN <span class="pin-opt">4 digits · protects your profile</span></span>
          <input
            type="tel" inputmode="numeric" maxlength="4" pattern="\d{4}"
            placeholder="····" class="pin-input"
            bind:value={pin}
          />
        </div>

        {#if error}
          <p class="error-msg">{error}</p>
        {/if}

        <button class="submit-btn" on:click={submit} disabled={!canSubmit} type="button">
          {#if submitting}
            <span class="spinner"></span>
            Adding…
          {:else}
            Add Player
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 300;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .sheet {
    background: #161616;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-bottom: none;
    border-radius: 24px 24px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 92dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding-bottom: calc(24px + env(safe-area-inset-bottom));
    animation: rise 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }

  @keyframes rise {
    from { transform: translateY(60px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .drag-handle {
    width: 36px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    margin: 12px auto 0;
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 0;
  }

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: #f0f0f0;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.06);
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #888;
    transition: background 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .close-btn:hover { background: rgba(255, 255, 255, 0.1); color: #f0f0f0; }

  /* Avatar */
  .avatar-section {
    display: flex;
    justify-content: center;
    padding: 20px 0 8px;
  }

  .avatar-ring {
    position: relative;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    border: 2px dashed rgba(255, 255, 255, 0.15);
    background: #1e1e1e;
    cursor: pointer;
    overflow: visible;
    transition: border-color 0.2s, transform 0.15s;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .avatar-ring:active { transform: scale(0.96); }

  .avatar-ring.has-photo {
    border: 2px solid rgba(245, 158, 11, 0.5);
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1);
  }

  .avatar-img {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: #4a4a4a;
  }

  .avatar-placeholder span {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .avatar-badge {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #f59e0b;
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #161616;
  }

  /* Form */
  .form {
    padding: 12px 20px 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .field { display: flex; flex-direction: column; gap: 8px; }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #5a5a5a;
  }

  .field-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .optional {
    font-size: 10px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: #404040;
  }

  .char-count {
    font-size: 11px;
    color: #404040;
    font-variant-numeric: tabular-nums;
    transition: color 0.15s;
  }

  .char-count.near-limit { color: #f59e0b; }

  .text-input {
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    color: #f0f0f0;
    font-size: 15px;
    padding: 12px 14px;
    width: 100%;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
  }

  .text-input::placeholder { color: #3a3a3a; }
  .text-input:focus { border-color: rgba(245, 158, 11, 0.5); }

  .philosophy-input { font-style: italic; }

  /* Paddle type */
  .paddle-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .paddle-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 14px 8px;
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
    -webkit-tap-highlight-color: transparent;
  }

  .paddle-btn:active { transform: scale(0.97); }

  .paddle-btn.selected {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.6);
  }

  .paddle-main {
    font-size: 15px;
    font-weight: 700;
    color: #888;
    letter-spacing: 0.02em;
    transition: color 0.15s;
  }

  .paddle-btn.selected .paddle-main { color: #f59e0b; }

  .paddle-sub {
    font-size: 13px;
    font-weight: 500;
    color: #3a3a3a;
    transition: color 0.15s;
  }

  .paddle-btn.selected .paddle-sub { color: rgba(245, 158, 11, 0.5); }

  /* PIN */
  .pin-section {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pin-label {
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; color: #888;
  }
  .pin-opt {
    font-size: 10px; font-weight: 400;
    text-transform: none; letter-spacing: 0; color: #555;
  }
  .pin-input {
    background: #121212; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; color: #f0f0f0; font-size: 20px; font-weight: 700;
    letter-spacing: 0.3em; text-align: center; padding: 10px 12px; outline: none;
    font-family: inherit; transition: border-color 0.15s; width: 100%;
  }
  .pin-input:focus { border-color: rgba(245,158,11,0.5); }
  .pin-input::placeholder { letter-spacing: 0.15em; color: #333; font-size: 16px; }

  /* Submit */
  .error-msg {
    margin: 0;
    font-size: 13px;
    color: #ef4444;
  }

  .submit-btn {
    width: 100%;
    padding: 15px;
    background: #f59e0b;
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
    letter-spacing: -0.1px;
  }

  .submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .submit-btn:not(:disabled):active { transform: scale(0.98); }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0, 0, 0, 0.25);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
