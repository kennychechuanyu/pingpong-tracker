<script>
  import MatchFeed from '../components/MatchFeed.svelte'
  import { enrichedMatches } from '../lib/stores.js'
</script>

<MatchFeed enrichedMatches={$enrichedMatches} />
