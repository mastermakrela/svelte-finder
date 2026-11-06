<script lang="ts" generics="E extends FinderEntry">
	import type { Snippet } from 'svelte';
	import EntryIcon from './EntryIcon.svelte';
	import { dateGroup, fmtBytes, fmtDate } from './format.js';
	import type { FinderEntry } from './fs.js';
	import { entryElement, type EntryContext } from './listing.svelte.js';

	let {
		entries,
		selectedPath,
		ctx,
		columns = [],
		empty,
		relativeTo,
		group = null
	}: {
		entries: E[];
		selectedPath: string | undefined;
		ctx: EntryContext<E>;
		/** Extra columns between Name and Size. */
		columns?: { label: string; align?: 'start' | 'end'; cell: Snippet<[entry: E]> }[];
		empty: string;
		/** Show each entry's path below this folder instead of its name (search results). */
		relativeTo?: string;
		/** Group rows under date headings, as Finder does. Without a working `Temporal` the list stays flat. */
		group?: 'modified' | null;
	} = $props();

	/** The rows under their headings; one unlabelled group when not grouping. */
	const groups = $derived.by((): { label?: string; entries: E[] }[] => {
		if (entries.length === 0) return [];
		if (group !== 'modified' || typeof Temporal === 'undefined') return [{ entries }];
		let rows;
		try {
			const now = Temporal.Now.zonedDateTimeISO();
			rows = entries.map((entry) => ({ entry, ...dateGroup(entry.modified, now) }));
		} catch {
			// an early or partial Temporal (an engine flag) may lack what dateGroup uses
			return [{ entries }];
		}
		// stable, so each group keeps the folder order
		rows.sort((a, b) => a.rank - b.rank);
		const out: { label?: string; entries: E[] }[] = [];
		let last: { label?: string; entries: E[] } | undefined;
		for (const row of rows) {
			if (last?.label !== row.label) out.push((last = { label: row.label, entries: [] }));
			last.entries.push(row.entry);
		}
		return out;
	});

	function label(entry: E): string {
		if (relativeTo === undefined) return entry.name;
		return entry.path.slice(relativeTo === '/' ? 1 : relativeTo.length + 1);
	}
</script>

<!-- a size container, so Modified can drop out when the Finder (not the page) is narrow -->
<div class="list">
	<table>
		<thead>
			<tr>
				<th>Name</th>
				{#each columns as column, i (i)}
					<th class={{ num: column.align === 'end' }}>{column.label}</th>
				{/each}
				<th class="num">Size</th>
				<th class="modified">Modified</th>
			</tr>
		</thead>
		{#each groups as g (g.label)}
			<tbody>
				{#if g.label}
					<tr class="group">
						<th colspan={columns.length + 3} scope="rowgroup">{g.label}</th>
					</tr>
				{/if}
				{#each g.entries as entry (entry.path)}
					{@const selected = entry.path === selectedPath}
					{@const el = entryElement(entry, ctx, selected)}
					<tr
						class={ctx.entryclass?.(entry)}
						style={ctx.entrystyle?.(entry)}
						data-path={entry.path}
						data-kind={entry.kind}
						data-selected={selected}
					>
						<td>
							<div class="cell">
								<!-- ::before stretches the entry over the whole row, so the row is one click target and one Tab stop -->
								<svelte:element this={el.tag} {...el.attrs} class="entry">
									<EntryIcon {entry} size="small" icon={ctx.icon} />
									<span class="name">{label(entry)}</span>
								</svelte:element>
								{#if ctx.meta}
									<span class="meta">{@render ctx.meta(entry, 'list')}</span>
								{/if}
							</div>
						</td>
						{#each columns as column, i (i)}
							<td class={['muted', { num: column.align === 'end' }]}
								>{@render column.cell(entry)}</td
							>
						{/each}
						<td class="num muted">{entry.kind === 'file' ? fmtBytes(entry.size) : '—'}</td>
						<td class="muted modified">{fmtDate(entry.modified)}</td>
					</tr>
				{/each}
			</tbody>
		{:else}
			<tbody>
				<tr>
					<td colspan={columns.length + 3} class="empty">{empty}</td>
				</tr>
			</tbody>
		{/each}
	</table>
</div>

<style>
	.list {
		container-type: inline-size;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 1;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--_border);
		background: var(--_bg);
		color: var(--_muted);
		font-weight: 500;
		text-align: left;
		white-space: nowrap;
	}

	.group th {
		position: static;
		padding-top: 1rem;
		color: var(--_fg);
		font-weight: 600;
	}

	td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--_border);
		white-space: nowrap;
		vertical-align: middle;
	}

	tr {
		position: relative;
		isolation: isolate;
		-webkit-user-select: none;
		user-select: none;
	}

	.entry {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		max-width: 100%;
		padding: 0;
		vertical-align: middle;
		text-align: left;
	}

	/* also paints the row's highlight: one box, where per-cell backgrounds leave hairline seams at fractional widths */
	.entry::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
	}

	/* the row's hit area, above the cells; ::after stays below them to paint */
	.entry::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	/* controls a consumer puts in meta or a custom column rise above the hit area */
	td :global(:is(a, button, input, select, textarea, label, [tabindex]):not(.entry)) {
		position: relative;
		z-index: 2;
	}

	tr:hover .entry::after,
	.entry:focus-visible::after {
		background: var(--_hover);
	}

	tr[data-selected='true'] .entry::after {
		background: var(--_sel-bg);
	}

	/* the drop outline goes round the row, not just the name */
	.entry[data-drop='true'] {
		outline: none;
	}

	.entry[data-drop='true']::after {
		outline: 2px solid var(--_fg);
		outline-offset: -2px;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	td:first-child {
		max-width: 0;
		width: 100%;
	}

	.cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.meta {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.25rem;
		margin-left: auto;
		color: var(--_muted);
		font-variant-numeric: tabular-nums;
	}

	@container (max-width: 34rem) {
		.modified {
			display: none;
		}
	}

	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.muted {
		color: var(--_muted);
	}

	.empty {
		padding: 2rem 0.75rem;
		color: var(--_muted);
		font-size: 0.875rem;
		text-align: center;
		white-space: normal;
	}
</style>
