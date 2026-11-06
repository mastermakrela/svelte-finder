<script lang="ts" generics="E extends FinderEntry">
	import DirView from './DirView.svelte';
	import EntryIcon from './EntryIcon.svelte';
	import Icon from './Icon.svelte';
	import type { FinderEntry } from './fs.js';
	import { entryElement, type Dir, type EntryContext } from './listing.svelte.js';

	/** One folder level of the columns view. */
	let {
		dir,
		path,
		label,
		openPath,
		selectedPath,
		last,
		ctx
	}: {
		dir: Dir<E>;
		/** The folder this column lists; its empty space takes drops, as in Finder. */
		path: string;
		label: string;
		/** The child folder the next column shows, if any. */
		openPath: string | undefined;
		selectedPath: string | undefined;
		/** The open folder's column: its buttons carry `aria-pressed`. */
		last: boolean;
		ctx: EntryContext<E>;
	} = $props();
</script>

<div class="column" role="group" aria-label={label} {...ctx.mover?.target(path)}>
	<DirView {dir}>
		{#snippet children(entries)}
			<ul>
				{#each entries as entry (entry.path)}
					{@const selected = entry.path === selectedPath}
					{@const el = entryElement(entry, ctx, last ? selected : undefined)}
					<li>
						<svelte:element
							this={el.tag}
							{...el.attrs}
							class={['entry', ctx.entryclass?.(entry)]}
							style={ctx.entrystyle?.(entry)}
							data-path={entry.path}
							data-kind={entry.kind}
							data-selected={selected}
							data-open={entry.path === openPath}
							aria-current={entry.path === openPath ? 'true' : undefined}
						>
							<EntryIcon {entry} size="small" icon={ctx.icon} />
							<span class="name">{entry.name}</span>
							{#if ctx.meta}
								<span class="meta">{@render ctx.meta(entry, 'columns')}</span>
							{/if}
							{#if entry.kind === 'directory'}
								<span class="chevron"><Icon name="chevronRight" size="0.875rem" /></span>
							{/if}
						</svelte:element>
					</li>
				{:else}
					<li class="empty">Empty folder</li>
				{/each}
			</ul>
		{/snippet}
	</DirView>
</div>

<style>
	.column[data-drop='true'] {
		outline: 2px solid var(--_fg);
		outline-offset: -2px;
	}

	.column {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		width: var(--_col);
		border-right: 1px solid var(--_border);
	}

	ul {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		margin: 0;
		padding: 0.25rem 0;
		list-style: none;
	}

	.entry {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.375rem 0.75rem;
		border-radius: var(--_radius);
		text-align: left;
	}

	.entry:hover,
	.entry:focus-visible,
	.entry[data-open='true'] {
		background: var(--_hover);
	}

	.entry[data-selected='true'] {
		background: var(--_sel-bg);
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		font-size: 0.75rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.25rem;
		color: var(--_muted);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
	}

	.chevron {
		display: inline-flex;
		color: var(--_muted);
	}

	.empty {
		padding: 0.5rem 0.75rem;
		color: var(--_muted);
		font-size: 0.75rem;
	}
</style>
