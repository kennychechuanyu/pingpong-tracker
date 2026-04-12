<script>
  import Leaderboard from '../components/Leaderboard.svelte'
  import { rankings, lastDeltas, matches, teams, players } from '../lib/stores.js'
</script>

<Leaderboard rankings={$rankings} deltas={$lastDeltas} matches={$matches} teams={$teams} players={$players} />
