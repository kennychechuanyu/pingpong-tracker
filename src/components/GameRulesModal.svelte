<script>
  export let open = false
  const close = () => (open = false)
</script>

{#if open}
  <div class="overlay" on:click={close} role="button" tabindex="-1" aria-label="Close" on:keydown={e => e.key === 'Escape' && close()}>
    <div class="modal" on:click|stopPropagation on:keydown role="dialog" aria-modal="true" aria-label="How to Play" tabindex="-1">
      <div class="drag-handle"></div>
      <div class="modal-header">
        <h2>How to Play</h2>
        <button class="close-btn" on:click={close} aria-label="Close">✕</button>
      </div>

      <div class="body">

        <!-- ─────────── Scoring ─────────── -->
        <section>
          <h3><span class="emoji">🎯</span> Scoring</h3>
          <div class="stat-grid">
            <div class="stat-card">
              <span class="stat-num">11</span>
              <span class="stat-lbl">points to win</span>
            </div>
            <div class="stat-card">
              <span class="stat-num">+2</span>
              <span class="stat-lbl">win by margin</span>
            </div>
            <div class="stat-card">
              <span class="stat-num">Bo3/5/7</span>
              <span class="stat-lbl">match format</span>
            </div>
          </div>
          <p>First player to <strong>11 points</strong> wins a game — but you must lead by <strong>at least 2 points</strong>. Matches are usually best-of-3, 5, or 7 games.</p>
        </section>

        <!-- Deuce -->
        <div class="callout callout-amber">
          <div class="callout-title">At 10–10: Deuce</div>
          <p>The game continues until one player leads by 2. So 12–10, 13–11, 14–12, and so on. A single lucky point isn't enough.</p>
        </div>

        <div class="divider"></div>

        <!-- ─────────── Serving ─────────── -->
        <section>
          <h3><span class="emoji">🏓</span> Serving</h3>

          <!-- Serve trajectory diagram -->
          <div class="diagram">
            <svg viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg">
              <!-- Ground -->
              <line x1="10" y1="160" x2="390" y2="160" stroke="#333" stroke-width="1" stroke-dasharray="2,3"/>

              <!-- Table -->
              <rect x="40" y="110" width="320" height="6" rx="1" fill="#1a4d7a"/>
              <!-- Table legs -->
              <line x1="60" y1="116" x2="60" y2="160" stroke="#1a4d7a" stroke-width="4" stroke-linecap="round"/>
              <line x1="340" y1="116" x2="340" y2="160" stroke="#1a4d7a" stroke-width="4" stroke-linecap="round"/>
              <!-- Net -->
              <line x1="200" y1="85" x2="200" y2="110" stroke="#888" stroke-width="2"/>
              <g stroke="#888" stroke-width="0.5" opacity="0.6">
                <line x1="200" y1="90" x2="200" y2="110"/>
                <line x1="197" y1="88" x2="203" y2="88"/>
              </g>

              <!-- Open palm (server) -->
              <ellipse cx="70" cy="70" rx="12" ry="3" fill="#f59e0b"/>
              <text x="70" y="88" font-size="9" fill="#888" text-anchor="middle">open palm</text>

              <!-- Ball at top of toss -->
              <circle cx="70" cy="25" r="4" fill="white" stroke="#888" stroke-width="0.5"/>
              <!-- Toss arrow -->
              <line x1="70" y1="65" x2="70" y2="32" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="2,2"/>
              <polygon points="70,28 67,34 73,34" fill="#22c55e"/>
              <text x="85" y="48" font-size="9" fill="#22c55e">16 cm+</text>

              <!-- Ball trajectory: toss peak → server bounce → over net → receiver bounce -->
              <path d="M 70 30 Q 95 70 125 108" stroke="#f59e0b" stroke-width="1.5" fill="none" stroke-dasharray="3,2"/>
              <path d="M 125 108 Q 190 40 275 108" stroke="#f59e0b" stroke-width="1.5" fill="none" stroke-dasharray="3,2"/>

              <!-- Bounce markers -->
              <circle cx="125" cy="108" r="3" fill="none" stroke="#f59e0b" stroke-width="1"/>
              <circle cx="275" cy="108" r="3" fill="none" stroke="#f59e0b" stroke-width="1"/>

              <!-- Labels -->
              <text x="125" y="132" font-size="8" fill="#888" text-anchor="middle">1st bounce</text>
              <text x="275" y="132" font-size="8" fill="#888" text-anchor="middle">2nd bounce</text>
              <text x="200" y="75" font-size="8" fill="#888" text-anchor="middle">net</text>
            </svg>
          </div>

          <p>The server gets <strong>2 serves in a row</strong>, then the receiver gets 2. Alternate like this every 2 points until 10–10. After that, serves alternate <strong>every 1 point</strong>.</p>

          <div class="rule-list">
            <div class="rule-item">
              <span class="rule-num">1</span>
              <div class="rule-body">
                <strong>Open palm</strong>
                <span>Ball rests on flat, open palm — no gripping or curling the fingers.</span>
              </div>
            </div>
            <div class="rule-item">
              <span class="rule-num">2</span>
              <div class="rule-body">
                <strong>Vertical toss, 16 cm+</strong>
                <span>Toss the ball straight up at least 16 cm (6 in). No spin from the toss.</span>
              </div>
            </div>
            <div class="rule-item">
              <span class="rule-num">3</span>
              <div class="rule-body">
                <strong>Behind the end line</strong>
                <span>Ball must be above and behind the end line when tossed and when struck.</span>
              </div>
            </div>
            <div class="rule-item">
              <span class="rule-num">4</span>
              <div class="rule-body">
                <strong>Visible to receiver</strong>
                <span>The receiver must be able to see the ball at all times — no hiding with your arm or body.</span>
              </div>
            </div>
            <div class="rule-item">
              <span class="rule-num">5</span>
              <div class="rule-body">
                <strong>Bounce both sides</strong>
                <span>Ball must bounce once on your side, cross the net, then bounce on the receiver's side.</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Fault vs Let -->
        <div class="two-col">
          <div class="callout callout-red">
            <div class="callout-title">❌ Fault (lose point)</div>
            <ul>
              <li>Ball hits net and doesn't cross</li>
              <li>Ball misses either side of the table</li>
              <li>Hidden serve</li>
              <li>Toss not vertical or too low</li>
              <li>Ball struck below the table surface</li>
            </ul>
          </div>
          <div class="callout callout-green">
            <div class="callout-title">↻ Let (replay)</div>
            <ul>
              <li>Ball clips the net but still lands legally on the receiver's side</li>
              <li>Receiver wasn't ready</li>
              <li>Outside interference (ball rolls onto table, etc.)</li>
            </ul>
          </div>
        </div>

        <div class="divider"></div>

        <!-- ─────────── Grip Styles ─────────── -->
        <section>
          <h3><span class="emoji">✊</span> Grip Styles</h3>

          <div class="grip-grid">
            <!-- Shakehand -->
            <div class="grip-card">
              <div class="grip-visual">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <!-- Paddle blade (viewed from player side) -->
                  <circle cx="100" cy="62" r="50" fill="#b91c1c" stroke="#000" stroke-width="2.5"/>
                  <circle cx="100" cy="62" r="46" fill="#dc2626" stroke="none"/>
                  <!-- Black edging -->
                  <circle cx="100" cy="62" r="50" fill="none" stroke="#1a1a1a" stroke-width="3"/>

                  <!-- Handle -->
                  <rect x="90" y="110" width="20" height="40" rx="2" fill="#6b3410" stroke="#000" stroke-width="1.5"/>
                  <line x1="90" y1="120" x2="110" y2="120" stroke="#000" stroke-width="0.5" opacity="0.4"/>
                  <line x1="90" y1="133" x2="110" y2="133" stroke="#000" stroke-width="0.5" opacity="0.4"/>

                  <!-- Back of fist wrapping the handle -->
                  <path d="M 75 135 Q 62 150, 70 172 Q 85 190, 110 188 Q 135 185, 138 165 Q 140 145, 128 135 Z"
                        fill="#f5d5a0" stroke="#b08050" stroke-width="2"/>

                  <!-- Finger knuckles (curled middle/ring/pinky) -->
                  <ellipse cx="85" cy="150" rx="5" ry="6" fill="#e8c088" stroke="#b08050" stroke-width="1.2"/>
                  <ellipse cx="100" cy="152" rx="5" ry="6" fill="#e8c088" stroke="#b08050" stroke-width="1.2"/>
                  <ellipse cx="115" cy="150" rx="5" ry="6" fill="#e8c088" stroke="#b08050" stroke-width="1.2"/>

                  <!-- THUMB — wrapping up onto blade face from the left -->
                  <path d="M 85 115 Q 72 108, 64 92 Q 58 78, 68 70 Q 78 78, 84 92 Q 90 105, 88 116 Z"
                        fill="#f59e0b" stroke="#92400e" stroke-width="2"/>
                  <ellipse cx="67" cy="78" rx="2.5" ry="3" fill="#fcd88a" stroke="#92400e" stroke-width="0.4"/>

                  <!-- INDEX — along the bottom-right edge of blade -->
                  <path d="M 112 115 Q 128 110, 144 98 Q 154 88, 150 83 Q 140 85, 126 96 Q 116 104, 110 110 Z"
                        fill="#22c55e" stroke="#14532d" stroke-width="2"/>

                  <!-- Leader labels -->
                  <text x="20" y="85" font-size="11" fill="#f59e0b" font-weight="800">thumb</text>
                  <line x1="50" y1="82" x2="63" y2="78" stroke="#f59e0b" stroke-width="1.5"/>

                  <text x="152" y="78" font-size="11" fill="#22c55e" font-weight="800">index</text>
                  <line x1="151" y1="82" x2="145" y2="92" stroke="#22c55e" stroke-width="1.5"/>
                </svg>
              </div>
              <div class="grip-label">
                <span class="grip-cn">橫板</span>
                <span class="grip-en">Shakehand</span>
              </div>
              <p class="grip-desc">Grip the handle like shaking hands with it. <strong>Thumb wraps up</strong> onto one side of the blade, <strong>index finger</strong> rests along the bottom edge. Other fingers wrap the handle. Most common grip worldwide — balanced forehand and backhand.</p>
            </div>

            <!-- Penhold -->
            <div class="grip-card">
              <div class="grip-visual">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <!-- Paddle blade (slightly tilted to suggest penhold angle) -->
                  <g transform="rotate(-5 100 62)">
                    <circle cx="100" cy="62" r="50" fill="#1a1a1a" stroke="#000" stroke-width="2.5"/>
                    <circle cx="100" cy="62" r="46" fill="#2a2a2a" stroke="none"/>
                    <circle cx="100" cy="62" r="50" fill="none" stroke="#000" stroke-width="3"/>
                    <!-- SHORT penhold handle -->
                    <rect x="92" y="110" width="16" height="16" rx="2" fill="#6b3410" stroke="#000" stroke-width="1.5"/>
                  </g>

                  <!-- Back fingers (curled on BACK of blade — shown as wrapping around from behind) -->
                  <path d="M 70 122 Q 55 140, 65 165 Q 80 180, 100 180 Q 120 180, 135 165 Q 145 140, 130 122 Z"
                        fill="#f5d5a0" stroke="#b08050" stroke-width="2"/>
                  <!-- Back-finger segment lines showing 3 curled fingers -->
                  <line x1="82" y1="145" x2="92" y2="158" stroke="#b08050" stroke-width="1.5"/>
                  <line x1="100" y1="148" x2="105" y2="162" stroke="#b08050" stroke-width="1.5"/>
                  <line x1="118" y1="145" x2="125" y2="158" stroke="#b08050" stroke-width="1.5"/>

                  <!-- Wrist -->
                  <rect x="88" y="175" width="24" height="22" rx="3" fill="#e8c088" stroke="#b08050" stroke-width="1.5"/>

                  <!-- THUMB — pinching from LEFT side of handle (pen-grip style) -->
                  <path d="M 82 108 Q 68 104, 58 118 Q 52 130, 62 134 Q 75 130, 88 118 Z"
                        fill="#f59e0b" stroke="#92400e" stroke-width="2"/>
                  <ellipse cx="64" cy="123" rx="2.5" ry="3" fill="#fcd88a" stroke="#92400e" stroke-width="0.4"/>

                  <!-- INDEX — curling from RIGHT side of handle, meeting thumb at top (pen-grip V) -->
                  <path d="M 118 108 Q 132 104, 142 118 Q 148 130, 138 134 Q 125 130, 112 118 Z"
                        fill="#22c55e" stroke="#14532d" stroke-width="2"/>
                  <ellipse cx="136" cy="123" rx="2.5" ry="3" fill="#bbf7d0" stroke="#14532d" stroke-width="0.4"/>

                  <!-- Small "pinch" indicator arrows -->
                  <path d="M 72 100 L 80 108" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round"/>
                  <polygon points="80,108 76,104 78,111" fill="#f59e0b"/>
                  <path d="M 128 100 L 120 108" stroke="#22c55e" stroke-width="1.2" stroke-linecap="round"/>
                  <polygon points="120,108 124,104 122,111" fill="#22c55e"/>

                  <!-- Leader labels -->
                  <text x="20" y="125" font-size="11" fill="#f59e0b" font-weight="800">thumb</text>
                  <line x1="50" y1="122" x2="58" y2="120" stroke="#f59e0b" stroke-width="1.5"/>

                  <text x="152" y="125" font-size="11" fill="#22c55e" font-weight="800">index</text>
                  <line x1="151" y1="122" x2="142" y2="120" stroke="#22c55e" stroke-width="1.5"/>
                </svg>
              </div>
              <div class="grip-label">
                <span class="grip-cn">直板</span>
                <span class="grip-en">Penhold</span>
              </div>
              <p class="grip-desc">Grip like holding a pen. <strong>Thumb and index pinch the front of the handle</strong>, forming a V. Other three fingers curl on the <strong>back of the blade</strong>. Traditional Chinese / Korean style. Quick wrist, strong forehand, close-to-table play.</p>
            </div>
          </div>

          <!-- Quick comparison callout -->
          <div class="grip-compare">
            <div class="gc-row">
              <span class="gc-label">Thumb & index</span>
              <span class="gc-shake">spread around blade</span>
              <span class="gc-pen">pinched at handle</span>
            </div>
            <div class="gc-row">
              <span class="gc-label">Other fingers</span>
              <span class="gc-shake">wrap the handle</span>
              <span class="gc-pen">curl on back of blade</span>
            </div>
            <div class="gc-row">
              <span class="gc-label">Handle length</span>
              <span class="gc-shake">long</span>
              <span class="gc-pen">short</span>
            </div>
          </div>
        </section>

        <div class="divider"></div>

        <!-- ─────────── Winning a Point ─────────── -->
        <section>
          <h3><span class="emoji">🏆</span> Winning a Point</h3>
          <p>You win a point when your opponent:</p>
          <div class="point-list">
            <div class="point-item"><span class="pt-x">✗</span> Fails to return the ball after it bounces once on their side</div>
            <div class="point-item"><span class="pt-x">✗</span> Hits the ball into the net</div>
            <div class="point-item"><span class="pt-x">✗</span> Hits the ball off the table</div>
            <div class="point-item"><span class="pt-x">✗</span> Lets the ball bounce twice on their side</div>
            <div class="point-item"><span class="pt-x">✗</span> Volleys the ball (hits before it bounces)</div>
            <div class="point-item"><span class="pt-x">✗</span> Touches the table with their free hand</div>
            <div class="point-item"><span class="pt-x">✗</span> Moves the table with their body</div>
            <div class="point-item"><span class="pt-x">✗</span> Obstructs the ball (catches it over the table before it bounces)</div>
            <div class="point-item"><span class="pt-x">✗</span> Commits a service fault</div>
          </div>
        </section>

        <div class="divider"></div>

        <!-- ─────────── Match Flow ─────────── -->
        <section>
          <h3><span class="emoji">🎬</span> Match Flow</h3>
          <ol class="flow-list">
            <li>Decide first server (coin flip, rock-paper-scissors, paddle spin — your call)</li>
            <li>Server serves 2 points, then hand over to receiver</li>
            <li>Play to 11 (win by 2). First to reach wins the <strong>game</strong></li>
            <li>Switch ends between games</li>
            <li>In the deciding game of a match, switch ends again when one player reaches 5</li>
            <li>Win enough games to take the match (2 of 3, 3 of 5, 4 of 7)</li>
          </ol>
        </section>

        <div class="divider"></div>

        <!-- Official rules link -->
        <section>
          <p class="footer-note">Based on official ITTF (International Table Tennis Federation) rules. House rules may vary — if in doubt, ask the crew. 🏓</p>
        </section>

      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
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
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  }

  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .drag-handle {
    width: 36px;
    height: 4px;
    background: rgba(255,255,255,0.12);
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
    font-size: 20px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .close-btn {
    background: rgba(255,255,255,0.05);
    border: none;
    color: var(--text-muted);
    font-size: 14px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s;
  }
  .close-btn:hover { background: rgba(255,255,255,0.1); color: var(--text); }

  .body {
    overflow-y: auto;
    padding: 18px 20px 36px;
    -webkit-overflow-scrolling: touch;
  }

  section { margin-bottom: 18px; }

  h3 {
    font-size: 15px;
    font-weight: 800;
    color: var(--text);
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: -0.005em;
  }

  .emoji {
    font-size: 18px;
    line-height: 1;
  }

  p {
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-muted);
    margin: 0 0 10px;
  }

  p strong {
    color: var(--text);
    font-weight: 700;
  }

  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
    margin: 18px 0;
  }

  /* Stat cards (scoring) */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .stat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }

  .stat-num {
    font-size: 20px;
    font-weight: 800;
    color: var(--amber);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .stat-lbl {
    font-size: 9px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
    font-weight: 600;
  }

  /* Callout boxes */
  .callout {
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 12px;
  }

  .callout p { margin: 0; }
  .callout ul {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
    line-height: 1.55;
    color: var(--text-muted);
  }
  .callout li { margin-bottom: 3px; }

  .callout-title {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
  }

  .callout-amber {
    background: rgba(245,158,11,0.07);
    border: 1px solid rgba(245,158,11,0.2);
  }
  .callout-amber .callout-title { color: var(--amber); }
  .callout-amber p { color: #d4a04a; }

  .callout-red {
    background: rgba(239,68,68,0.06);
    border: 1px solid rgba(239,68,68,0.18);
  }
  .callout-red .callout-title { color: #ef4444; }

  .callout-green {
    background: rgba(34,197,94,0.06);
    border: 1px solid rgba(34,197,94,0.18);
  }
  .callout-green .callout-title { color: #22c55e; }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }

  @media (max-width: 400px) {
    .two-col { grid-template-columns: 1fr; }
  }

  /* Diagram */
  .diagram {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 10px;
    margin-bottom: 12px;
  }

  .diagram svg {
    width: 100%;
    height: auto;
    display: block;
  }

  /* Rule list (numbered) */
  .rule-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }

  .rule-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: 10px;
    padding: 10px 12px;
  }

  .rule-num {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--amber);
    color: #000;
    font-size: 11px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rule-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .rule-body strong {
    font-size: 12px;
    color: var(--text);
    font-weight: 700;
  }

  .rule-body span {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.45;
  }

  /* Grip cards */
  .grip-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  @media (max-width: 400px) {
    .grip-grid { grid-template-columns: 1fr; }
  }

  .grip-card {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .grip-visual {
    width: 130px;
    height: 130px;
  }
  .grip-visual svg { width: 100%; height: 100%; display: block; }

  .grip-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }

  .grip-cn {
    font-size: 17px;
    font-weight: 800;
    color: var(--amber);
    letter-spacing: 0.05em;
  }

  .grip-en {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .grip-desc {
    font-size: 11px;
    text-align: center;
    line-height: 1.55;
    margin: 0;
  }
  .grip-desc strong { color: var(--text); font-weight: 700; }

  /* Grip comparison table */
  .grip-compare {
    margin-top: 12px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    overflow: hidden;
  }

  .gc-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    align-items: center;
  }
  .gc-row:last-child { border-bottom: none; }

  .gc-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .gc-shake, .gc-pen {
    font-size: 11px;
    color: var(--text);
    text-align: center;
    font-weight: 500;
  }

  .gc-shake { color: #fca5a5; }
  .gc-pen { color: #cbd5e1; }

  /* Point list */
  .point-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
  }

  .point-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    color: var(--text-muted);
    padding: 6px 10px;
    border-radius: 6px;
    background: rgba(255,255,255,0.02);
    line-height: 1.4;
  }

  .pt-x {
    color: #ef4444;
    font-weight: 800;
    flex-shrink: 0;
  }

  /* Flow list */
  .flow-list {
    padding-left: 0;
    margin: 0;
    list-style: none;
    counter-reset: flow;
  }

  .flow-list li {
    counter-increment: flow;
    font-size: 12px;
    color: var(--text-muted);
    padding: 8px 10px 8px 36px;
    position: relative;
    line-height: 1.5;
  }

  .flow-list li::before {
    content: counter(flow);
    position: absolute;
    left: 8px;
    top: 7px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(245,158,11,0.15);
    color: var(--amber);
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .flow-list li strong { color: var(--text); font-weight: 700; }

  .footer-note {
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.6;
    text-align: center;
    font-style: italic;
    margin: 0;
  }
</style>
