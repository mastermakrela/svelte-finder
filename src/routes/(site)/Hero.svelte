<script lang="ts">
	import Desktop from './demos/Desktop.svelte';
</script>

<!-- The viewport below the sticky header; short or tiny screens still get a usable desktop. -->
<section class="h-[calc(100svh-3.5rem)] min-h-[34rem] border-b" aria-label="Demo desktop">
	<Desktop />
</section>
