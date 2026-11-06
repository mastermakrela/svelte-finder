<script lang="ts" generics="E extends FinderEntry">
	import EntryIcon from './EntryIcon.svelte';
	import { fmtBytes } from './format.js';
	import type { FinderEntry } from './fs.js';
	import { entryElement, type EntryContext } from './listing.svelte.js';

	let {
		entries,
		selectedPath,
		ctx
	}: {
		entries: E[];
		selectedPath: string | undefined;
		ctx: EntryContext<E>;
	} = $props();
</script>

{#if entries.length === 0}
	<p class="empty">This folder is empty.</p>
{:else}
	<ul>
		{#each entries as entry (entry.path)}
			{@const selected = entry.path === selectedPath}
			{@const el = entryElement(entry, ctx, selected)}
			<li>
				<svelte:element
					this={el.tag}
					{...el.attrs}
					class={['entry', ctx.entryclass?.(entry)]}
					style={ctx.entrystyle?.(entry)}
					data-path={entry.path}
					data-kind={entry.kind}
					data-selected={selected}
				>
					<EntryIcon {entry} size="large" icon={ctx.icon} />
					<span class="name">{entry.name}</span>
					{#if ctx.meta}
						<span class="meta">{@render ctx.meta(entry, 'icons')}</span>
					{:else if entry.kind === 'file' && entry.size !== undefined}
						<span class="meta">{fmtBytes(entry.size)}</span>
					{/if}
				</svelte:element>
			</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 0.25rem;
		margin: 0;
		padding: 0.75rem;
		list-style: none;
	}

	.entry {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		height: 100%;
		padding: 0.75rem 0.5rem;
		border-radius: var(--_radius);
	}

	.entry:hover,
	.entry:focus-visible {
		background: var(--_hover);
	}

	.entry[data-selected='true'] {
		background: var(--_sel-bg);
	}

	.name {
		display: -webkit-box;
		width: 100%;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		font-size: 0.75rem;
		overflow-wrap: anywhere;
	}

	.meta {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--_muted);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
	}

	.empty {
		margin: 0;
		padding: 4rem 1rem;
		color: var(--_muted);
		font-size: 0.875rem;
		text-align: center;
	}
</style>
