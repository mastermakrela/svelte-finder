<script lang="ts">
	import { onMount } from 'svelte';
	import { Finder, memoryFS, type FinderView } from '#lib';

	import Demo from './Demo.svelte';
	import { addPhotos, project } from './project.js';
	import Button from './ui/Button.svelte';
	import ToggleGroup from './ui/ToggleGroup.svelte';

	// spread the files over the last few years so date grouping has something to show
	const DAYS_AGO = [0, 1, 4, 12, 45, 120, 400, 900];
	const NOW = Date.now();
	const modified = (path: string) =>
		NOW -
		DAYS_AGO[[...path].reduce((sum, c) => sum + c.charCodeAt(0), 0) % DAYS_AGO.length] * 86_400_000;
	const fs = memoryFS(project, { modified });
	onMount(() => addPhotos(fs, modified));
	const VIEWS: FinderView[] = ['icons', 'list', 'columns'];

	let view = $state<FinderView>('icons');
	let path = $state('/static/images');
	let grouped = $state(false);
</script>

<Demo>
	{#snippet controls()}
		<ToggleGroup label="View" items={VIEWS} bind:value={view} />
		<Button
			variant="ghost"
			size="sm"
			aria-pressed={grouped}
			onclick={() => {
				grouped = !grouped;
				if (grouped) view = 'list';
			}}>By date</Button
		>
		<code class="ml-auto truncate px-2 font-mono text-[12.5px] text-muted-foreground">{path}</code>
	{/snippet}
	<Finder
		{fs}
		rootLabel="field-notes"
		bind:view
		bind:path
		group={grouped ? 'modified' : null}
		class="h-full"
	/>
</Demo>
