<script>
  import { router, push } from 'svelte-spa-router'

  const tabs = [
    {
      path: '/',
      label: 'Rankings',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 21h8M12 17v4M7 4H4l1 5c0 2.2 1.8 4 4 4s4-1.8 4-4V4H7zM17 4h3l-1 5c0 2.2-1.8 4-4 4"/>
        <path d="M7 4h10"/>
      </svg>`,
    },
    {
      path: '/log',
      label: 'Games',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v8M8 12h8"/>
      </svg>`,
    },
    {
      path: '/history',
      label: 'History',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>`,
    },
    {
      path: '/calendar',
      label: 'Calendar',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>`,
    },
  ]
</script>

<nav>
  {#each tabs as tab}
    <button
      class="tab"
      class:active={router.location === tab.path}
      on:click={() => push(tab.path)}
      aria-label={tab.label}
    >
      <span class="icon">{@html tab.icon}</span>
      <span class="label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    height: calc(var(--nav-h) + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: rgba(15, 15, 15, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid var(--border);
    display: flex;
    align-items: stretch;
    z-index: 100;
  }

  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.15s;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
  }

  .tab:active { opacity: 0.7; }

  .tab.active {
    color: var(--amber);
  }

  .icon {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon :global(svg) {
    width: 22px;
    height: 22px;
  }

  .label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
</style>
