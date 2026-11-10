<script lang="ts" generics="E extends FinderEntry">
	import type { Snippet } from 'svelte';
	import FinderColumn from './FinderColumn.svelte';
	import FinderPreview from './FinderPreview.svelte';
	import type { FinderEntry, FinderFS } from './fs.js';
	import type { EntryContext, FinderCache } from './listing.svelte.js';

	let {
		cache,
		levels,
		rootLabel,
		selectedPath,
		detail,
		ctx,
		preview,
		read
	}: {
		cache: FinderCache<E>;
		/** Root first, the open folder last: one column each. */
		levels: string[];
		rootLabel: string;
		selectedPath: string | undefined;
		/** The selected file in the open folder, shown in the preview pane. */
		detail: E | null;
		ctx: EntryContext<E>;
		preview?: Snippet<[entry: E | null, folder: string]>;
		read?: FinderFS['read'];
	} = $props();

	/** Scroll so the open folder's column (and the pane after it, if both fit) is in view, starting
	 *  at a column edge: the first visible column is whole, never cut mid-icon. */
	function reveal(node: HTMLElement) {
		const pane = node.querySelector<HTMLElement>(':scope > .pane');
		node.style.paddingInlineEnd = '';
		if (pane) pane.style.minWidth = '';
		const cols = [...node.children].slice(0, levels.length) as HTMLElement[];
		const last = cols.at(-1);
		if (!last) return;
		const box = node.getBoundingClientRect();
		const left = (el: HTMLElement) => el.getBoundingClientRect().left - box.left + node.scrollLeft;
		const right = (el: HTMLElement) =>
			el.getBoundingClientRect().right - box.left + node.scrollLeft;
		const fit = (end: number) => cols.find((col) => end - left(col) <= node.clientWidth);
		const start = left((pane && fit(right(pane))) ?? fit(right(last)) ?? last);
		// scrollTo clamps to the content's end, which would land mid-column: add the missing room
		const room = start + node.clientWidth - node.scrollWidth;
		if (room > 0) {
			if (pane) pane.style.minWidth = `${pane.offsetWidth + room}px`;
			else node.style.paddingInlineEnd = `${room}px`;
		}
		node.scrollTo({ left: start });
	}

	/** Dragged widths in px, per folder; `all` is the Option-drag width for every other column. */
	let widths = $state<Record<string, number>>({});
	let all = $state<number>();

	function resize(path: string, width: number | undefined, every: boolean) {
		// shortcut: fixed px floor, not tied to the font size
		const w = width === undefined ? undefined : Math.max(96, Math.round(width));
		if (every) {
			all = w;
			widths = {};
		} else if (w === undefined) delete widths[path];
		else widths[path] = w;
	}
</script>

{#snippet failure(error: unknown)}
	<p class="failed" role="alert">{error instanceof Error ? error.message : String(error)}</p>
{/snippet}

<div
	class="columns"
	{@attach (node) => {
		// re-runs on every navigation or selection
		void levels;
		void detail;
		reveal(node);
	}}
>
	{#each levels as level, i (level)}
		<svelte:boundary failed={failure}>
			<FinderColumn
				dir={cache.dir(level)}
				path={level}
				label={i === 0 ? rootLabel : `Folder ${level}`}
				openPath={levels[i + 1]}
				{selectedPath}
				last={i === levels.length - 1}
				{ctx}
				width={widths[level] ?? all}
				onresize={(width, every) => resize(level, width, every)}
			/>
		</svelte:boundary>
	{/each}
	{#if preview || detail}
		<div class="pane" aria-label={detail ? 'Selected file' : 'Folder'} role="region">
			<svelte:boundary failed={failure}>
				{#if preview}
					{@render preview(detail, levels[levels.length - 1])}
				{:else if detail}
					<FinderPreview entry={detail} icon={ctx.icon} {read} />
				{/if}
			</svelte:boundary>
		</div>
	{/if}
</div>

<style>
	.columns {
		display: flex;
		height: 100%;
		overflow-x: auto;
	}

	.pane {
		flex: 1 0 18rem;
		min-width: 18rem;
		overflow-y: auto;
	}

	.failed {
		flex-shrink: 0;
		width: var(--_col);
		border-right: 1px solid var(--_border);
	}
</style>
