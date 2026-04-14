<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import { verifyPin } from '../lib/pin.js'

  export let open = false
  export let players = []   // players whose PIN can unlock; pass all relevant, component filters to those with pin_hash
  export let title = 'Enter PIN'
  export let subtitle = ''

  const dispatch = createEventDispatcher()

  let selectedPlayer = null
  let digits = ''
  let wrong = false
  let checking = false

  $: validPlayers = players.filter(p => p?.pin_hash)
  $: if (open && validPlayers.length) {
    digits = ''
    wrong = false
    checking = false
    selectedPlayer = validPlayers[0]
  }

  async function tryPin() {
    if (checking || digits.length !== 4 || !selectedPlayer) return
    checking = true
    const ok = await verifyPin(selectedPlayer, digits)
    if (ok) {
      dispatch('success', { player: selectedPlayer, pin: digits })
      open = false
    } else {
      wrong = true
      digits = ''
      checking = false
    }
  }

  function press(n) {
    if (digits.length >= 4 || checking) return
    wrong = false
    digits += n
    if (digits.length === 4) tryPin()
  }

  function del() {
    if (checking) return
    wrong = false
    digits = digits.slice(0, -1)
  }

  function close() { if (!checking) { open = false; dispatch('cancel') } }
  function handleKey(e) {
    if (e.key === 'Escape') close()
    if (e.key >= '0' && e.key <= '9') press(e.key)
    if (e.key === 'Backspace') del()
    if (e.key === 'Enter' && digits.length === 4) tryPin()
  }
  onMount(() => window.addEventListener('keydown', handleKey))
  onDestroy(() => window.removeEventListener('keydown', handleKey))
</script>

{#if open}
  <div class="overlay" on:click={close} role="button" tabindex="-1" aria-label="Close" on:keydown={() => {}}>
    <div class="sheet" on:click|stopPropagation on:keydown={() => {}} role="dialog" aria-modal="true" tabindex="-1">
      <div class="drag-handle"></div>

      <div class="header">
        <p class="title">{title}</p>
        {#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
      </div>

      <!-- Player selector (only shown if multiple players have PINs) -->
      {#if validPlayers.length > 1}
        <div class="player-tabs">
          {#each validPlayers as p}
            <button
              class="player-tab"
              class:active={selectedPlayer?.id === p.id}
              on:click={() => { selectedPlayer = p; digits = ''; wrong = false }}
              type="button"
            >
              {#if p.avatar_url}
                <img src={p.avatar_url} alt={p.name} class="tab-avatar" />
              {:else}
                <div class="tab-initial">{p.name[0].toUpperCase()}</div>
              {/if}
              <span>{p.name}</span>
            </button>
          {/each}
        </div>
      {:else if validPlayers.length === 1}
        <div class="single-player">
          {#if validPlayers[0].avatar_url}
            <img src={validPlayers[0].avatar_url} alt={validPlayers[0].name} class="single-avatar" />
          {:else}
            <div class="single-initial">{validPlayers[0].name[0].toUpperCase()}</div>
          {/if}
          <span class="single-name">{validPlayers[0].name}'s PIN</span>
        </div>
      {/if}

      <!-- Dots -->
      <div class="dots" class:wrong>
        {#each [0,1,2,3] as i}
          <div class="dot" class:filled={i < digits.length} class:wrong></div>
        {/each}
      </div>
      {#if wrong}
        <p class="wrong-msg">Wrong PIN — try again</p>
      {:else}
        <p class="wrong-msg invisible">·</p>
      {/if}

      <!-- Numpad -->
      <div class="numpad">
        {#each [1,2,3,4,5,6,7,8,9] as n}
          <button class="num-btn" on:click={() => press(String(n))} type="button">{n}</button>
        {/each}
        <div></div>
        <button class="num-btn" on:click={() => press('0')} type="button">0</button>
        <button class="num-btn del-btn" on:click={del} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
      </div>

      <button class="cancel-btn" on:click={close} type="button">Cancel</button>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 400;
    display: flex; align-items: flex-end; justify-content: center;
  }

  .sheet {
    background: #161616;
    border: 1px solid rgba(255,255,255,0.07);
    border-bottom: none;
    border-radius: 24px 24px 0 0;
    width: 100%; max-width: 480px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
    animation: rise 0.28s cubic-bezier(0.32,0.72,0,1);
  }

  @keyframes rise {
    from { transform: translateY(60px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }

  .drag-handle {
    width: 36px; height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    margin: 12px auto 0;
  }

  .header { text-align: center; padding: 16px 20px 4px; }
  .title { margin: 0; font-size: 18px; font-weight: 700; color: #f0f0f0; letter-spacing: -0.3px; }
  .subtitle { margin: 4px 0 0; font-size: 13px; color: #888; }

  /* Player selector */
  .player-tabs {
    display: flex; justify-content: center; gap: 10px;
    padding: 12px 20px 0;
  }
  .player-tab {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    background: #1e1e1e; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; padding: 10px 16px;
    cursor: pointer; color: #888; font-size: 12px; font-weight: 600;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent; font-family: inherit;
  }
  .player-tab.active { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.4); color: #f59e0b; }

  .tab-avatar, .single-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
  .tab-initial, .single-initial {
    width: 36px; height: 36px; border-radius: 50%;
    background: #2a2a2a; display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #888;
  }

  .single-player {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 14px 20px 0;
  }
  .single-name { font-size: 13px; font-weight: 600; color: #888; }

  /* Dots */
  .dots {
    display: flex; justify-content: center; gap: 16px;
    padding: 20px 20px 4px;
  }
  .dot {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.15);
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
  }
  .dot.filled { background: #f59e0b; border-color: #f59e0b; transform: scale(1.1); }
  .dot.filled.wrong { background: #ef4444; border-color: #ef4444; }

  .wrong-msg {
    text-align: center; font-size: 12px; color: #ef4444;
    margin: 0 0 4px; height: 16px; line-height: 16px;
  }
  .wrong-msg.invisible { opacity: 0; }

  /* Numpad */
  .numpad {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 8px; padding: 8px 24px 0;
    max-width: 320px; margin: 0 auto;
  }

  .num-btn {
    height: 60px; border-radius: 14px;
    background: #1e1e1e; border: 1px solid rgba(255,255,255,0.07);
    color: #f0f0f0; font-size: 22px; font-weight: 600;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.1s, transform 0.1s;
    -webkit-tap-highlight-color: transparent; font-family: inherit;
    font-variant-numeric: tabular-nums;
  }
  .num-btn:active { background: #2a2a2a; transform: scale(0.94); }
  .del-btn { color: #888; }

  .cancel-btn {
    display: block; width: calc(100% - 48px); margin: 12px auto 0;
    padding: 14px; background: none; border: none;
    color: #888; font-size: 15px; font-weight: 500;
    cursor: pointer; font-family: inherit;
    transition: color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .cancel-btn:hover { color: #f0f0f0; }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .dots.wrong { animation: shake 0.4s ease; }
</style>
