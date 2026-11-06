<script lang="ts">
	import { onMount } from 'svelte';
	import { Finder, memoryFS, type FinderEntry } from '#lib';

	import Demo from './Demo.svelte';
	import { addPhotos, project } from './project.js';
	import Button from './ui/Button.svelte';

	const fs = memoryFS(project);
	onMount(() => addPhotos(fs));
	const decoder = new TextDecoder();

	let finder = $state<Finder<FinderEntry>>();
	let selected = $state<string | null>(null);

	const paths = $derived(finder?.history.paths ?? []);
	const index = $derived(finder?.history.index ?? -1);
</script>

<Demo tall>
	<Finder
		bind:this={finder}
		{fs}
		rootLabel="field-notes"
		path="/src/lib/utils"
		bind:selected
		class="h-full"
	>
		{#snippet preview(entry, folder)}
			<div class="flex h-full flex-col gap-3 p-4">
				<strong class="truncate font-mono text-[13px] font-medium">{entry?.name ?? folder}</strong>
				{#if entry}
					{#await fs.read(entry.path) then bytes}
						{#if bytes.includes(0)}
							<p class="text-[12.5px] text-muted-foreground">Binary, {bytes.length} bytes</p>
						{:else}
							<pre
								class="m-0 min-h-0 flex-1 overflow-auto bg-well p-3 font-mono text-[11.5px] leading-[1.6] whitespace-pre-wrap">{decoder.decode(
									bytes
								)}</pre>
						{/if}
					{/await}
				{:else}
					<p class="text-[12.5px] text-muted-foreground">Select a file to read it here.</p>
				{/if}
			</div>
		{/snippet}
	</Finder>
	{#snippet footer()}
		<div class="flex items-center gap-1 px-2 py-2 text-[13px]">
			<Button variant="ghost" size="sm" disabled={index <= 0} onclick={() => finder?.back()}
				>Back</Button
			>
			<Button
				variant="ghost"
				size="sm"
				disabled={index >= paths.length - 1}
				onclick={() => finder?.forward()}>Forward</Button
			>
			<ol class="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="History">
				{#each paths as path, i (i)}
					<li class="shrink-0">
						<button
							type="button"
							class={[
								'px-2 py-1 font-mono text-[12.5px] hover:bg-muted',
								i === index ? 'bg-muted text-foreground' : 'text-muted-foreground'
							]}
							aria-current={i === index ? 'step' : undefined}
							onclick={() => finder?.go(i)}>{path}</button
						>
					</li>
				{/each}
			</ol>
		</div>
	{/snippet}
</Demo>
