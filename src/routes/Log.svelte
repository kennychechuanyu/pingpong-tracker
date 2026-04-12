<script>
  import LogMatch from '../components/LogMatch.svelte'
  import { players } from '../lib/stores.js'
</script>

<LogMatch players={$players} />
