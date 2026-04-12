<script>
  import { computeRecords } from '../lib/records.js'

  export let open = false
  export let rankings = []
  export let matches = []

  const close = () => (open = false)

  $: records = (() => {
    if (!open) return null
    try { return computeRecords(rankings, matches) }
    catch { return null }
  })()
</script>

{#if open}
  <div class="overlay" on:click={close} role="button" tabindex="-1" aria-label="Close" on:keydown={e => e.key === 'Escape' && close()}>
    <div class="modal" on:click|stopPropagation on:keydown role="dialog" aria-modal="true" aria-label="Hall of Records" tabindex="-1">
      <div class="drag-handle"></div>
      <div class="modal-header">
        <h2>Hall of Records</h2>
        <button class="close-btn" on:click={close} aria-label="Close">✕</button>
      </div>

      <div class="body">
        {#if !records}
          <div class="empty">
            <div class="empty-icon">🏓</div>
            <p class="empty-text">No records yet.</p>
            <p class="empty-sub">Play some matches to start setting records.</p>
          </div>
        {:else}

          <!-- Peak Rating -->
          {#if records.peakRating}
            <div class="record-card">
              <div class="record-icon">👑</div>
              <div class="record-body">
                <span class="record-label">Peak Rating</span>
                <span class="record-value">{records.peakRating.value}</span>
                <span class="record-detail">{records.peakRating.player.name}</span>
              </div>
            </div>
          {/if}

          <!-- Longest Win Streak -->
          {#if records.longestWinStreak}
            <div class="record-card">
              <div class="record-icon">🔥</div>
              <div class="record-body">
                <span class="record-label">Longest Win Streak</span>
                <span class="record-value">{records.longestWinStreak.value} wins</span>
                <span class="record-detail">{records.longestWinStreak.player.name}</span>
              </div>
            </div>
          {/if}

          <!-- Biggest Upset -->
          {#if records.biggestUpset}
            <div class="record-card">
              <div class="record-icon">💀</div>
              <div class="record-body">
                <span class="record-label">Biggest Upset</span>
                <span class="record-value">{Math.round(records.biggestUpset.expectedWinProb * 100)}% chance</span>
                <span class="record-detail">
                  {records.biggestUpset.winner.name} beat {records.biggestUpset.loser.name}
                  {#if records.biggestUpset.winnerScore != null}
                    <span class="record-score">{records.biggestUpset.winnerScore}–{records.biggestUpset.loserScore}</span>
                  {/if}
                </span>
              </div>
            </div>
          {/if}

          <!-- Iron Man -->
          {#if records.ironMan}
            <div class="record-card">
              <div class="record-icon">⚔️</div>
              <div class="record-body">
                <span class="record-label">Iron Man</span>
                <span class="record-value">{records.ironMan.value} games</span>
                <span class="record-detail">{records.ironMan.player.name}</span>
              </div>
            </div>
          {/if}

          <!-- Biggest Rivalry -->
          {#if records.biggestRivalry}
            <div class="record-card">
              <div class="record-icon">⚔️</div>
              <div class="record-body">
                <span class="record-label">Biggest Rivalry</span>
                <span class="record-value">{records.biggestRivalry.value} matches</span>
                <span class="record-detail">
                  {records.biggestRivalry.player1.name} vs {records.biggestRivalry.player2.name}
                  <span class="record-score">{records.biggestRivalry.player1Wins}–{records.biggestRivalry.player2Wins}</span>
                </span>
              </div>
            </div>
          {/if}

          <!-- Biggest Single Gain -->
          {#if records.biggestGain}
            <div class="record-card">
              <div class="record-icon">🚀</div>
              <div class="record-body">
                <span class="record-label">Biggest Single Gain</span>
                <span class="record-value">+{records.biggestGain.value}</span>
                <span class="record-detail">
                  {records.biggestGain.player.name}
                  <span class="record-score">{records.biggestGain.fromElo} → {records.biggestGain.toElo}</span>
                </span>
              </div>
            </div>
          {/if}

        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .modal {
    background: #161616;
    border: 1px solid rgba(255,255,255,0.07);
    border-bottom: none;
    border-radius: 24px 24px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 88dvh;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1);
  }

  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .drag-handle {
    width: 36px;
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    margin: 12px auto 0;
    flex-shrink: 0;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px 0;
    flex-shrink: 0;
  }

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #f0f0f0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #5a5a5a;
    font-size: 16px;
    cursor: pointer;
    padding: 4px 8px;
    transition: color 0.15s;
  }

  .close-btn:hover { color: #f0f0f0; }

  .body {
    overflow-y: auto;
    padding: 16px 20px 32px;
    -webkit-overflow-scrolling: touch;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* ── Empty state ──────────────────────────── */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px;
    gap: 6px;
  }

  .empty-icon { font-size: 40px; margin-bottom: 8px; }

  .empty-text {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #f0f0f0;
  }

  .empty-sub {
    margin: 0;
    font-size: 14px;
    color: #666;
  }

  /* ── Record card ──────────────────────────── */
  .record-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px;
    background: #1e1e1e;
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 14px;
    animation: fadeIn 0.3s ease both;
  }

  .record-card:nth-child(1) { animation-delay: 0ms; }
  .record-card:nth-child(2) { animation-delay: 40ms; }
  .record-card:nth-child(3) { animation-delay: 80ms; }
  .record-card:nth-child(4) { animation-delay: 120ms; }
  .record-card:nth-child(5) { animation-delay: 160ms; }
  .record-card:nth-child(6) { animation-delay: 200ms; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .record-icon {
    font-size: 28px;
    line-height: 1;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(245, 158, 11, 0.08);
    border-radius: 10px;
  }

  .record-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
  }

  .record-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--amber, #f59e0b);
  }

  .record-value {
    font-size: 22px;
    font-weight: 800;
    color: #f0f0f0;
    letter-spacing: -0.5px;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .record-detail {
    font-size: 13px;
    color: #999;
    line-height: 1.4;
  }

  .record-score {
    color: #666;
    margin-left: 4px;
    font-variant-numeric: tabular-nums;
  }
</style>
