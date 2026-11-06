<script lang="ts">
	import { API } from '../api.js';
	import Prose from '../Prose.svelte';
	import { LEAD } from '../prose.js';
	import Reference from '../Reference.svelte';
	import Section from '../Section.svelte';
</script>

<Section
	id="api"
	title="API"
	lead="One component, three adapters, a change feed for backends that cannot report changes, and the types that connect them. Everything is exported from `svelte-finder`."
>
	{#each API as group (group.name)}
		<div class="mt-10">
			<h3 class="font-mono text-[14px] font-medium text-foreground">{group.name}</h3>
			{#if group.note}
				<p class="{LEAD} mt-2"><Prose text={group.note} /></p>
			{/if}
			<Reference head={['Name', 'Type', 'Does']} rows={group.props} />
		</div>
	{/each}
</Section>
