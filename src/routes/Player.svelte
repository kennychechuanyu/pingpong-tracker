<script>
  import PlayerProfile from '../components/PlayerProfile.svelte'
  import { rankings, enrichedMatches } from '../lib/stores.js'

  export let params = {}

  $: player = $rankings.find(p => p.id === params.id) ?? null
</script>

<PlayerProfile
  player={player}
  allMatches={$enrichedMatches}
  allPlayers={$rankings}
/>
