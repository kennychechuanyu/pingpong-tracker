<script>
  import Router from 'svelte-spa-router'
  import { onMount, onDestroy } from 'svelte'
  import Nav from './components/Nav.svelte'
  import Home from './routes/Home.svelte'
  import Log from './routes/Log.svelte'
  import History from './routes/History.svelte'
  import Player from './routes/Player.svelte'
  import Calendar from './routes/Calendar.svelte'
  import { loadAll, subscribeRealtime, loading } from './lib/stores.js'

  const routes = {
    '/': Home,
    '/log': Log,
    '/history': History,
    '/calendar': Calendar,
    '/player/:id': Player,
  }

  let unsubscribe

  onMount(async () => {
    await loadAll()
    unsubscribe = subscribeRealtime()
  })

  onDestroy(() => {
    if (unsubscribe) unsubscribe()
  })
</script>

{#if $loading}
  <div class="splash">
    <div class="ping">🏓</div>
  </div>
{:else}
  <Router {routes} />
  <Nav />
{/if}

<style>
  .splash {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ping {
    font-size: 48px;
    animation: bounce 0.8s ease-in-out infinite alternate;
  }

  @keyframes bounce {
    from { transform: translateY(0) rotate(-10deg); }
    to   { transform: translateY(-16px) rotate(10deg); }
  }
</style>
