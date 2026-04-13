<script>
  export let open = false
  const close = () => (open = false)
</script>

{#if open}
  <div class="overlay" on:click={close} role="button" tabindex="-1" aria-label="Close" on:keydown={e => e.key === 'Escape' && close()}>
    <div class="modal" on:click|stopPropagation on:keydown role="dialog" aria-modal="true" aria-label="How Rankings Work" tabindex="-1">
      <div class="drag-handle"></div>
      <div class="modal-header">
        <h2>How Rankings Work</h2>
        <button class="close-btn" on:click={close} aria-label="Close">✕</button>
      </div>

      <div class="body">

        <section>
          <h3>The Basics</h3>
          <p>Every player starts at <strong>1000 points</strong>. Win a match and your score goes up. Lose and it goes down. Simple.</p>
          <p>But <em>how much</em> it changes depends on who you played — and how convincingly you won.</p>
        </section>

        <div class="divider"></div>

        <section>
          <h3>Beating a Stronger Player Earns More</h3>
          <p>Before each game, the system calculates how likely you are to win — your <em>expected score</em>. Beat that expectation and you gain points. Fall short and you lose them.</p>

          <div class="formula-box">
            <div class="formula-line">
              <span class="formula-label">Expected win chance</span>
              <span class="formula-eq">E = 1 ÷ (1 + 10<sup>Δrating ÷ 400</sup>)</span>
            </div>
            <div class="formula-line">
              <span class="formula-label">Points gained/lost</span>
              <span class="formula-eq">K × (result − E)</span>
            </div>
            <p class="formula-note">result = 1 for a win, 0 for a loss · K = 32 (standard)</p>
          </div>

          <div class="example-box">
            <div class="example-row header-row">
              <span class="ex-label">Matchup</span>
              <span class="ex-mid">Win chance</span>
              <span class="ex-val">Points</span>
            </div>
            <div class="example-row">
              <span class="ex-label">You (1000) beat a <strong>1200</strong></span>
              <span class="ex-mid dim">24% → win</span>
              <span class="ex-val pos">+24</span>
            </div>
            <div class="example-row">
              <span class="ex-label">You (1000) beat a <strong>1000</strong></span>
              <span class="ex-mid dim">50% → win</span>
              <span class="ex-val pos">+16</span>
            </div>
            <div class="example-row">
              <span class="ex-label">You (1000) beat an <strong>800</strong></span>
              <span class="ex-mid dim">76% → win</span>
              <span class="ex-val pos">+8</span>
            </div>
            <div class="example-divider"></div>
            <div class="example-row">
              <span class="ex-label">You (1000) lose to an <strong>800</strong></span>
              <span class="ex-mid dim">76% → loss</span>
              <span class="ex-val neg">−24</span>
            </div>
            <div class="example-row">
              <span class="ex-label">You (1000) lose to a <strong>1200</strong></span>
              <span class="ex-mid dim">24% → loss</span>
              <span class="ex-val neg">−8</span>
            </div>
          </div>
          <p class="hint">Upset a favourite → big reward. Lose to an underdog → big penalty.</p>
        </section>

        <div class="divider"></div>

        <section>
          <h3>Margin of Victory Matters</h3>
          <p>The more convincingly you win, the bigger the bonus. Every point in every game counts.</p>
          <div class="margin-row">
            <div class="margin-item dominant">
              <span class="margin-mult">1.3×</span>
              <span class="margin-label">Dominant</span>
              <span class="margin-score">11–0 to 11–2</span>
            </div>
            <div class="margin-item comfortable">
              <span class="margin-mult">1.15×</span>
              <span class="margin-label">Comfortable</span>
              <span class="margin-score">11–3 to 11–6</span>
            </div>
            <div class="margin-item close">
              <span class="margin-mult">1.0×</span>
              <span class="margin-label">Close</span>
              <span class="margin-score">11–7 to 11–10</span>
            </div>
          </div>
        </section>

        <div class="divider"></div>

        <section>
          <h3>Best-of-N Series</h3>
          <p>In a series (Bo3, Bo5, Bo7), Elo is calculated for <strong>each individual game</strong> using the actual point scores. This means:</p>
          <div class="series-table">
            <div class="st-row"><span class="st-score">4–0 sweep</span><span class="st-mult dominant-c">≈ 4 game wins of Elo</span></div>
            <div class="st-row"><span class="st-score">4–3 grind</span><span class="st-mult close-c">≈ 1 net game of Elo</span></div>
          </div>
          <p class="series-note">A series naturally gives more Elo swing because more games are played. Winning each game 11–2 stacks higher than barely scraping 11–9 each time.</p>
        </section>

        <div class="divider"></div>

        <section>
          <h3>New Players Move Faster</h3>
          <p>Your rating reacts more to each match when you're new — so it finds your true level quickly. Veterans' ratings are more stable.</p>
          <div class="k-row">
            <div class="k-item">
              <span class="k-games">Games 1–10</span>
              <span class="k-val">K = 40</span>
              <span class="k-desc">Fast calibration</span>
            </div>
            <div class="k-item">
              <span class="k-games">Games 11–30</span>
              <span class="k-val">K = 32</span>
              <span class="k-desc">Standard</span>
            </div>
            <div class="k-item">
              <span class="k-games">30+ games</span>
              <span class="k-val">K = 24</span>
              <span class="k-desc">Stable</span>
            </div>
          </div>
        </section>

        <div class="divider"></div>

        <section>
          <h3>Provisional Players</h3>
          <p>Players with fewer than <strong>10 games</strong> show a <span class="prov-badge">PROV</span> badge. Their rating is real and counts — it just hasn't had enough matches to fully settle yet.</p>
        </section>

        <div class="divider"></div>

        <section>
          <h3>Pong Coins (PC)</h3>
          <p>A separate reward currency — you earn it by <strong>showing up</strong>, not just winning. Elo is how good you are; Pong Coins are how much you play.</p>
          <div class="coin-rules">
            <div class="coin-rule-row">
              <span class="coin-rule-dot"></span>
              <span class="coin-rule-label">Base reward</span>
              <span class="coin-rule-val">+100 PC / match</span>
            </div>
            <div class="coin-rule-row">
              <span class="coin-rule-dot win"></span>
              <span class="coin-rule-label">Win bonus</span>
              <span class="coin-rule-val">+50 PC</span>
            </div>
            <div class="coin-rule-row">
              <span class="coin-rule-dot daily"></span>
              <span class="coin-rule-label">Daily first match</span>
              <span class="coin-rule-val">+100 PC</span>
            </div>
          </div>
          <p class="coin-note">Losing still earns you the base + daily bonus. Keep playing and you'll climb the tiers: Rookie → Player → Regular → Veteran → Legend.</p>
        </section>

        <div class="divider"></div>

        <section>
          <h3>Tiebreaker & Form</h3>
          <p>If two players have the same rating, the one with the higher win rate ranks higher.</p>
          <p>The coloured dots on each row show your last 5 results: <span class="w-dot">●</span> win, <span class="l-dot">●</span> loss, newest on the right.</p>
        </section>

        <div class="divider"></div>

        <section>
          <h3>Achievements</h3>
          <p>Earned automatically — no claiming needed. They appear on your profile and next to your name in the rankings.</p>
          <div class="achievement-list">
            <div class="ach-item">
              <span class="ach-emoji">👑</span>
              <div class="ach-info">
                <span class="ach-name">King</span>
                <span class="ach-rule">Ranked #1 with 5+ games (non-provisional)</span>
              </div>
            </div>
            <div class="ach-item">
              <span class="ach-emoji">🔥</span>
              <div class="ach-info">
                <span class="ach-name">On Fire</span>
                <span class="ach-rule">Win streak of 3 or more in a row</span>
              </div>
            </div>
            <div class="ach-item">
              <span class="ach-emoji">💀</span>
              <div class="ach-info">
                <span class="ach-name">Slump</span>
                <span class="ach-rule">Loss streak of 3 or more in a row</span>
              </div>
            </div>
            <div class="ach-item">
              <span class="ach-emoji">🎯</span>
              <div class="ach-info">
                <span class="ach-name">Flawless</span>
                <span class="ach-rule">Last 5 games all wins</span>
              </div>
            </div>
            <div class="ach-item">
              <span class="ach-emoji">🏆</span>
              <div class="ach-info">
                <span class="ach-name">Dominant</span>
                <span class="ach-rule">10+ games with 75%+ win rate (not #1)</span>
              </div>
            </div>
            <div class="ach-item">
              <span class="ach-emoji">⚔️</span>
              <div class="ach-info">
                <span class="ach-name">Veteran</span>
                <span class="ach-rule">25+ games played</span>
              </div>
            </div>
          </div>
        </section>

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
  }

  section { margin: 0; }

  h3 {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #f59e0b;
  }

  p {
    margin: 0 0 10px;
    font-size: 14px;
    line-height: 1.6;
    color: #b0b0b0;
  }

  p:last-child { margin-bottom: 0; }
  strong { color: #f0f0f0; }
  em { color: #f0f0f0; font-style: italic; }

  .divider {
    height: 1px;
    background: rgba(255,255,255,0.05);
    margin: 18px 0;
  }

  /* Formula box */
  .formula-box {
    background: #1a1a2e;
    border: 1px solid rgba(245,158,11,0.15);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 10px 0;
  }

  .formula-line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .formula-label {
    font-size: 11px;
    color: #666;
    flex-shrink: 0;
  }

  .formula-eq {
    font-size: 13px;
    font-weight: 600;
    color: #f59e0b;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .formula-eq sup { font-size: 9px; }

  .formula-note {
    font-size: 11px;
    color: #555;
    margin: 0;
    padding-top: 4px;
    border-top: 1px solid rgba(255,255,255,0.04);
    line-height: 1.5;
  }

  /* Example box */
  .example-box {
    background: #1e1e1e;
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }

  .example-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .example-row.header-row .ex-label,
  .example-row.header-row .ex-mid,
  .example-row.header-row .ex-val { font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }

  .example-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 2px 0; }

  .ex-label { font-size: 13px; color: #888; flex: 1; }
  .ex-label strong { color: #bbb; font-weight: 600; }
  .ex-mid { font-size: 11px; color: #555; flex-shrink: 0; font-variant-numeric: tabular-nums; }
  .ex-mid.dim { color: #555; }
  .ex-val { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; flex-shrink: 0; min-width: 28px; text-align: right; }
  .ex-val.pos { color: #22c55e; }
  .ex-val.neg { color: #ef4444; }

  .hint {
    font-size: 12px;
    color: #555;
    font-style: italic;
    margin: 8px 0 0;
  }

  /* Margin */
  .margin-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-top: 10px;
  }

  .margin-item {
    background: #1e1e1e;
    border-radius: 10px;
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
  }

  .margin-score { font-size: 10px; color: #555; line-height: 1.3; }
  .margin-mult { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .margin-label { font-size: 10px; color: #666; font-weight: 600; }

  .margin-item.dominant .margin-mult { color: #f59e0b; }
  .margin-item.comfortable .margin-mult { color: #d97706; }
  .margin-item.close .margin-mult { color: #666; }

  /* Series examples table */
  .series-table {
    margin-top: 12px;
    background: #1e1e1e;
    border-radius: 10px;
    overflow: hidden;
  }

  .st-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .st-row:last-child { border-bottom: none; }

  .st-score {
    font-size: 12px;
    color: #777;
    font-variant-numeric: tabular-nums;
  }

  .st-mult {
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .dominant-c { color: #f59e0b; }
  .close-c { color: #555; }

  .series-note {
    font-size: 12px;
    color: #555;
    font-style: italic;
    margin-top: 10px;
    line-height: 1.5;
  }

  /* Pong coin rules */
  .coin-rules {
    margin-top: 12px;
    background: rgba(245,193,74,0.05);
    border: 1px solid rgba(245,193,74,0.18);
    border-radius: 10px;
    overflow: hidden;
  }

  .coin-rule-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .coin-rule-row:last-child { border-bottom: none; }

  .coin-rule-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(245,193,74,0.85);
    box-shadow: 0 0 6px rgba(245,193,74,0.4);
    flex-shrink: 0;
  }
  .coin-rule-dot.win   { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.4); }
  .coin-rule-dot.daily { background: #5fb8e6; box-shadow: 0 0 6px rgba(95,184,230,0.4); }

  .coin-rule-label {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
    color: #888;
  }

  .coin-rule-val {
    font-size: 12px;
    font-weight: 800;
    color: #f5c14a;
    font-variant-numeric: tabular-nums;
  }

  .coin-note {
    font-size: 11px;
    color: #555;
    line-height: 1.55;
    margin-top: 10px;
  }

  /* K-factor */
  .k-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-top: 10px;
  }

  .k-item {
    background: #1e1e1e;
    border-radius: 10px;
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
  }

  .k-games { font-size: 10px; color: #666; }
  .k-val { font-size: 15px; font-weight: 800; color: #f59e0b; font-variant-numeric: tabular-nums; }
  .k-desc { font-size: 10px; color: #555; }

  /* Badges */
  .prov-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(245,158,11,0.15);
    color: #f59e0b;
    letter-spacing: 0.05em;
  }

  .w-dot { color: #22c55e; font-size: 12px; }
  .l-dot { color: #ef4444; font-size: 12px; }

  /* Achievements */
  .achievement-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 10px;
  }

  .ach-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    background: #1e1e1e;
    border-radius: 10px;
  }

  .ach-emoji { font-size: 20px; flex-shrink: 0; width: 24px; text-align: center; }

  .ach-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ach-name {
    font-size: 13px;
    font-weight: 700;
    color: #f0f0f0;
  }

  .ach-rule {
    font-size: 12px;
    color: #666;
    line-height: 1.4;
  }
</style>
