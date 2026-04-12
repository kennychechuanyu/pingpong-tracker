<script>
  import Leaderboard from '../components/Leaderboard.svelte'
  import { rankings, lastDeltas } from '../lib/stores.js'
</script>

<Leaderboard rankings={$rankings} deltas={$lastDeltas} />
