<script module lang="ts">
	import type { View } from './listing.svelte.js';
	export type FinderView = View;
</script>

<script lang="ts" generics="E extends FinderEntry">
	import { tick, untrack, type Snippet } from 'svelte';
	import DirView from './DirView.svelte';
	import FinderColumns from './FinderColumns.svelte';
	import FinderGoTo from './FinderGoTo.svelte';
	import FinderIcons from './FinderIcons.svelte';
	import FinderList from './FinderList.svelte';
	import { joinPath, parentPath, type FinderEntry, type FinderFS } from './fs.js';
	import Icon, { type IconName } from './Icon.svelte';
	import {
		FinderCache,
		Mover,
		NavHistory,
		type EntryContext,
		type FinderHistory
	} from './listing.svelte.js';

	let {
		fs,
		root: rootProp = '/',
		path = $bindable(rootProp),
		view = $bindable('columns'),
		selected = $bindable(null),
		query = $bindable(''),
		searchable = true,
		rootLabel: rootLabelProp,
		onopen,
		href,
		onentrycontextmenu,
		entryclass,
		entrystyle,
		meta,
		columns,
		group = null,
		preview,
		icon,
		toolbar = true,
		statusbar = true,
		actions,
		status,
		class: className
	}: {
		/** The filesystem to browse; `E` is its entry type. */
		fs: FinderFS<E>;
		/** The breadcrumb starts here; navigation and search never go above it. */
		root?: string;
		/** The open directory. A path outside `root` shows `root`. */
		path?: string;
		/** How the open directory is laid out. */
		view?: FinderView;
		/** Path of the selected entry. Shown while its folder is open (or it matches the search); the Finder changes it on a click, a Go to folder file pick or a move, else only the consumer does. */
		selected?: string | null;
		/** The search text; non-empty shows matches under `root` instead of the folder. */
		query?: string;
		/** Show the search field. */
		searchable?: boolean;
		/** Label of the root crumb; defaults to the last segment of `root`. */
		rootLabel?: string;
		/** A file was opened: double-click, Enter, or a keyboard or assistive-technology click. Folders open in place instead. */
		onopen?: (entry: E) => void;
		/** A URL makes the entry an `<a href>`: a click or Enter follows it instead of selecting. */
		href?: (entry: E) => string | undefined;
		/** Right-click on an entry; call `event.preventDefault()` to replace the browser menu. */
		onentrycontextmenu?: (entry: E, event: MouseEvent) => void;
		/** Extra class on each entry's element (column item, tile, list row). */
		entryclass?: (entry: E) => string | undefined;
		/** Inline style on each entry's element (column item, tile, list row). */
		entrystyle?: (entry: E) => string | undefined;
		/** Trailing content after the name: column row end, list name cell end, tile caption. */
		meta?: Snippet<[entry: E, view: FinderView]>;
		/** Extra list-view columns, between Name and Size. */
		columns?: { label: string; align?: 'start' | 'end'; cell: Snippet<[entry: E]> }[];
		/** List view: group a folder's entries under date headings (Today, Yesterday, …, months, years). Needs `Temporal`; without it the list stays flat. */
		group?: 'modified' | null;
		/** The columns view's pane; when given it is always shown: the selected file, or null for the open `folder`. */
		preview?: Snippet<[entry: E | null, folder: string]>;
		/** A custom icon per entry. */
		icon?: Snippet<[entry: E, size: 'small' | 'large', builtin: Snippet]>;
		/** Show the toolbar: view switch, path bar, search, `actions`. */
		toolbar?: boolean;
		/** Show the status bar. */
		statusbar?: boolean;
		/** Rendered at the end of the toolbar (Upload, New folder…). */
		actions?: Snippet;
		/** Replaces the status bar text; `matches` is null unless searching. */
		status?: Snippet<[counts: { folders: number; files: number; matches: number | null }]>;
		/** Added to the root element. */
		class?: string;
	} = $props();

	const VIEWS: { id: FinderView; label: string; icon: IconName }[] = [
		{ id: 'icons', label: 'Icons', icon: 'grid' },
		{ id: 'list', label: 'List', icon: 'list' },
		{ id: 'columns', label: 'Columns', icon: 'columns' }
	];

	// Absolute, no trailing slash, whatever the consumer passed.
	const root = $derived('/' + rootProp.replace(/^\/+|\/+$/g, ''));
	const cache = $derived(new FinderCache(fs));
	const read = $derived(fs.read?.bind(fs));
	$effect(() => {
		const c = cache;
		return () => c.dispose();
	});

	// Normalised like root; a path outside root falls back to root rather than escaping it.
	const open = $derived.by(() => {
		const p = '/' + path.replace(/^\/+|\/+$/g, '');
		return p === root || p.startsWith(root === '/' ? '/' : `${root}/`) ? p : root;
	});
	const levels = $derived.by(() => {
		const out = [root];
		if (open === root) return out;
		for (const name of open.slice(root === '/' ? 1 : root.length + 1).split('/')) {
			out.push(joinPath(out[out.length - 1], name));
		}
		return out;
	});
	const label = $derived(
		rootLabelProp ?? (root === '/' ? '/' : root.slice(root.lastIndexOf('/') + 1))
	);

	const nav = new NavHistory();
	// an effect, not a derived: history accumulates whatever opened the folder (a click, the consumer, Go to folder)
	$effect(() => {
		const shown = open;
		untrack(() => nav.visit(shown));
	});
	/** The folders this Finder has shown, oldest first, and the index of the open one. Read it through `bind:this`. */
	export const history: FinderHistory = nav;

	/** Open the folder at `index` of `history.paths`. */
	export function go(index: number) {
		const to = nav.go(index);
		if (to === undefined) return;
		query = '';
		path = to;
	}
	/** Open the previous folder in the history, as the toolbar's Back button does. */
	export function back() {
		go(nav.index - 1);
	}
	/** Open the next folder in the history, as the toolbar's Forward button does. */
	export function forward() {
		go(nav.index + 1);
	}

	let finder = $state<HTMLElement>();
	let goTo = $state<ReturnType<typeof FinderGoTo>>();
	/** Show Go to folder (also Cmd/Ctrl+Shift+G while the Finder has focus). */
	export function goToFolder() {
		goTo?.show();
	}

	const current = $derived(cache.dir(open));

	// The open folder went away (removed or moved elsewhere): climb to the nearest folder that still
	// lists, as Finder does. A path that never listed keeps its error, so a mistyped one stays visible.
	let climbing = false;
	$effect(() => {
		if (!current.error) {
			// still loading keeps climbing: the parent may be gone too
			if (current.entries) climbing = false;
			return;
		}
		if (open === root || !(current.entries || climbing)) return;
		climbing = true;
		path = parentPath(open);
	});
	$effect(() => cache.show(view === 'columns' ? levels : [open]));

	const q = $derived(searchable ? query.trim() : '');
	const results = $derived(q ? cache.search(root, q) : null);
	const matches = $derived(results?.entries ?? []);
	$effect(() => {
		if (!q) cache.stopSearch();
	});

	/** `selected` while it is on screen: in the open folder, the open folder itself (columns), or a match. */
	const shown = $derived.by(() => {
		if (!selected) return undefined;
		if (results) return matches.some((e) => e.path === selected) ? selected : undefined;
		return selected === open || parentPath(selected) === open ? selected : undefined;
	});
	/** The selected file in the open folder, as currently listed. */
	const detail = $derived(
		shown && shown !== open
			? (current.entries?.find((e) => e.path === shown && e.kind === 'file') ?? null)
			: null
	);
	const counts = $derived.by(() => {
		const folders = current.entries?.filter((e) => e.kind === 'directory').length ?? 0;
		return {
			folders,
			files: (current.entries?.length ?? 0) - folders,
			matches: results ? matches.length : null
		};
	});

	/** A failed move's message, shown in the status bar while its folder stays open. */
	let notice = $state<{ at: string; text: string }>();

	/** Move `from` into `folder`, then follow it: the selection, and the open path if it was inside. */
	async function moveInto(from: string, folder: string) {
		const to = joinPath(folder, from.slice(from.lastIndexOf('/') + 1));
		const at = open;
		try {
			await fs.move?.(from, to);
		} catch (err) {
			notice = { at, text: `Couldn't move ${from}: ${err instanceof Error ? err.message : err}` };
			return;
		}
		notice = undefined;
		const moved = (p: string) =>
			p === from || p.startsWith(`${from}/`) ? to + p.slice(from.length) : p;
		if (selected) selected = moved(selected);
		if (moved(open) !== open) path = moved(open);
		refresh();
	}
	const mover = $derived(fs.move ? new Mover(fs, moveInto) : undefined);

	const ctx: EntryContext<E> = $derived({
		onselect: (entry) => (selected = entry.path),
		onactivate: (entry) => {
			if (entry.kind === 'file') return onopen?.(entry);
			query = '';
			path = entry.path;
		},
		href,
		oncontextmenu: onentrycontextmenu,
		entryclass,
		entrystyle,
		icon,
		meta,
		mover
	});
	// In columns, a click reveals: a folder opens as the next column, a file shows in the pane.
	const columnCtx: EntryContext<E> = $derived({
		...ctx,
		onselect: (entry) => {
			path = entry.kind === 'directory' ? entry.path : parentPath(entry.path);
			selected = entry.path;
		}
	});

	/** Re-list every visible directory (and restart a running search). */
	export function refresh() {
		cache.refresh(levels);
	}

	$effect(() => fs.watch?.(root, refresh));
</script>

{#snippet failure(error: unknown)}
	<p class="failed" role="alert">{error instanceof Error ? error.message : String(error)}</p>
{/snippet}

<svelte:window
	onkeydown={(event) => {
		if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.key.toLowerCase() !== 'g')
			return;
		if (!finder?.contains(document.activeElement)) return;
		event.preventDefault();
		goToFolder();
	}}
/>

<!-- tabindex -1: Safari doesn't focus a clicked button, so focus lands here and the shortcut still applies -->
<div class={['finder', className]} data-view={view} tabindex="-1" bind:this={finder}>
	{#if toolbar}
		<div class="toolbar">
			<div class="buttons" role="group" aria-label="History">
				<button
					type="button"
					aria-label="Back"
					title="Back"
					disabled={nav.index <= 0}
					onclick={back}
				>
					<Icon name="chevronLeft" />
				</button>
				<button
					type="button"
					aria-label="Forward"
					title="Forward"
					disabled={nav.index >= nav.paths.length - 1}
					onclick={forward}
				>
					<Icon name="chevronRight" />
				</button>
			</div>

			<div class="buttons" role="group" aria-label="View">
				{#each VIEWS as v (v.id)}
					<button
						type="button"
						aria-label={v.label}
						title={v.label}
						aria-pressed={view === v.id}
						onclick={() => (view = v.id)}
					>
						<Icon name={v.icon} />
					</button>
				{/each}
			</div>

			<!-- scrolled to the end on every navigation, so a long path loses its start, not the open folder -->
			<nav
				aria-label="Folder path"
				{@attach (node) => {
					void levels;
					node.scrollLeft = node.scrollWidth;
				}}
			>
				<ol>
					{#each levels as level, i (level)}
						<li>
							{#if i > 0}<Icon name="chevronRight" size="0.875rem" />{/if}
							{#if i === levels.length - 1}
								<span aria-current="page" class={{ mono: i > 0 }} {...mover?.target(level)}>
									{i === 0 ? label : level.slice(level.lastIndexOf('/') + 1)}
								</span>
							{:else}
								<button
									type="button"
									class={{ mono: i > 0 }}
									onclick={() => (path = level)}
									{...mover?.target(level)}
								>
									{i === 0 ? label : level.slice(level.lastIndexOf('/') + 1)}
								</button>
							{/if}
						</li>
					{/each}
				</ol>
			</nav>

			<div class="buttons">
				<button
					type="button"
					aria-label="Go to folder"
					title="Go to folder (⇧⌘G)"
					aria-keyshortcuts="Meta+Shift+G Control+Shift+G"
					onclick={goToFolder}
				>
					<Icon name="goTo" />
				</button>
			</div>

			{#if searchable}
				<label class="search">
					<Icon name="search" size="0.875rem" />
					<input
						type="search"
						name="q"
						placeholder="Search all files"
						aria-label="Search all files"
						autocomplete="off"
						bind:value={query}
					/>
				</label>
			{/if}

			{#if actions}
				<div class="actions">{@render actions()}</div>
			{/if}
		</div>
	{/if}

	<FinderGoTo
		bind:this={goTo}
		{fs}
		{cache}
		{root}
		rootLabel={label}
		{open}
		ongo={(to, kind) => {
			query = '';
			path = kind === 'directory' ? to : parentPath(to);
			if (kind === 'file') selected = to;
			// the dialog hands focus back to an entry the navigation removes: keep it in the Finder
			void tick().then(() => {
				if (!finder?.contains(document.activeElement)) finder?.focus({ preventScroll: true });
			});
		}}
	/>

	<div class="body">
		<svelte:boundary failed={failure}>
			{#if results?.error}
				{@render failure(results.error)}
			{:else if results}
				<FinderList
					entries={matches}
					selectedPath={shown}
					{ctx}
					{columns}
					relativeTo={root}
					empty={results.done ? `No file matches "${q}".` : 'Searching…'}
				/>
			{:else if view === 'columns'}
				<FinderColumns
					{cache}
					{levels}
					rootLabel={label}
					selectedPath={shown}
					{detail}
					ctx={columnCtx}
					{preview}
					{read}
				/>
			{:else}
				<DirView dir={current}>
					{#snippet children(entries)}
						{#if view === 'icons'}
							<FinderIcons {entries} selectedPath={shown} {ctx} />
						{:else}
							<FinderList
								{entries}
								selectedPath={shown}
								{ctx}
								{columns}
								{group}
								empty="This folder is empty."
							/>
						{/if}
					{/snippet}
				</DirView>
			{/if}
		</svelte:boundary>
	</div>

	{#if statusbar}
		<div class="status">
			{#if notice?.at === open}
				<span role="alert">{notice.text}</span>
			{:else if status}
				{@render status(counts)}
			{:else if results}
				{matches.length}
				{matches.length === 1 ? 'match' : 'matches'}{results.capped ? ' …and more' : ''}
			{:else if current.entries}
				{[
					counts.folders && `${counts.folders} ${counts.folders === 1 ? 'folder' : 'folders'}`,
					counts.files && `${counts.files} ${counts.files === 1 ? 'file' : 'files'}`
				]
					.filter(Boolean)
					.join(', ') || 'Empty folder'}
			{/if}
		</div>
	{/if}
</div>

<style>
	.finder {
		--_bg: var(--finder-bg, oklch(1 0 0));
		--_fg: var(--finder-fg, oklch(0.145 0 0));
		--_muted: var(--finder-muted-fg, oklch(0.556 0 0));
		--_border: var(--finder-border, oklch(0.922 0 0));
		--_hover: var(--finder-hover-bg, oklch(0.97 0 0));
		--_sel-bg: var(--finder-selected-bg, oklch(0.205 0 0));
		--_sel-fg: var(--finder-selected-fg, oklch(0.985 0 0));
		--_accent: var(--finder-accent, oklch(0.556 0 0 / 0.2));
		--_font: var(--finder-font, ui-sans-serif, system-ui, sans-serif);
		--_mono: var(--finder-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
		--_radius: var(--finder-radius, 0);
		--_col: var(--finder-column-width, 16rem);
		--_icon: var(--finder-icon-size, 3.5rem);

		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		border-radius: var(--_radius);
		background: var(--_bg);
		color: var(--_fg);
		font-family: var(--_font);
		font-size: 0.875rem;
		outline: none;
	}

	.toolbar {
		display: flex;
		flex-shrink: 0;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--_border);
	}

	.buttons {
		display: flex;
	}

	/* shared by every view's entries; :where keeps each selector's specificity what it was in the views */
	button,
	:where(.body) :global(.entry) {
		box-sizing: border-box;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-decoration: none;
		cursor: default;
		-webkit-user-select: none;
		user-select: none;
	}

	:where(.body) :global(:is(.entry, tr)[data-selected='true']) {
		--_muted: color-mix(in oklch, var(--_sel-fg) 70%, transparent);
		color: var(--_sel-fg);
	}

	:where(.body) :global(.entry .name) {
		font-family: var(--_mono);
	}

	.buttons button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: var(--_radius);
		color: var(--_muted);
	}

	.buttons button:hover:enabled,
	.buttons button[aria-pressed='true'] {
		background: var(--_hover);
		color: var(--_fg);
	}

	.buttons button:disabled {
		opacity: 0.4;
	}

	:where(.body) :global(.entry[data-drop='true']),
	nav [data-drop='true'] {
		outline: 2px solid var(--_fg);
		outline-offset: -2px;
	}

	.buttons button:focus-visible,
	:where(.body) :global(.entry:focus-visible) {
		outline: 2px solid var(--_muted);
		outline-offset: -2px;
	}

	/* nav and search share the row from a zero basis, so neither forces a wrap above its minimum */
	nav {
		flex: 1 1 0;
		min-width: 5rem;
		overflow-x: auto;
		scrollbar-width: none;
	}

	ol {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.75rem;
		white-space: nowrap;
	}

	li {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--_muted);
	}

	nav button {
		padding: 0;
		color: var(--_muted);
	}

	nav button:hover,
	nav button:focus-visible {
		color: var(--_fg);
		text-decoration: underline;
	}

	[aria-current='page'] {
		color: var(--_fg);
	}

	.mono {
		font-family: var(--_mono);
	}

	.search {
		position: relative;
		display: flex;
		flex: 1 1 0;
		align-items: center;
		min-width: 7rem;
		max-width: 11rem;
		color: var(--_muted);
	}

	.search :global(svg) {
		position: absolute;
		left: 0.5rem;
		pointer-events: none;
	}

	input {
		width: 100%;
		min-width: 0;
		height: 2rem;
		padding: 0 0.5rem 0 1.75rem;
		border: 1px solid var(--_border);
		border-radius: var(--_radius);
		background: var(--_bg);
		color: var(--_fg);
		font: inherit;
		font-size: 0.75rem;
	}

	input:focus-visible {
		outline: 2px solid var(--_muted);
		outline-offset: -1px;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		user-select: text;
	}

	.status {
		flex-shrink: 0;
		min-height: 1lh;
		margin: 0;
		padding: 0.375rem 0.75rem;
		border-top: 1px solid var(--_border);
		color: var(--_muted);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}

	:where(.body) :global(.failed) {
		margin: 0;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		overflow-wrap: anywhere;
	}
</style>
