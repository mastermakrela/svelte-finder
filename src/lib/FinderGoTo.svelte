<script lang="ts" generics="E extends FinderEntry">
	import { joinPath, type FinderEntry, type FinderFS } from './fs.js';
	import { tick } from 'svelte';
	import Icon from './Icon.svelte';
	import type { FinderCache } from './listing.svelte.js';

	/** Finder's Go to Folder: type a path, pick from what is in the folder typed so far. */
	let {
		fs,
		cache,
		root,
		rootLabel,
		open,
		ongo
	}: {
		fs: FinderFS<E>;
		cache: FinderCache<E>;
		root: string;
		rootLabel: string;
		/** A path without a leading slash is relative to this folder. */
		open: string;
		ongo: (path: string, kind: FinderEntry['kind']) => void;
	} = $props();

	const id = $props.id();
	let dialog = $state<HTMLDialogElement>();
	let input = $state<HTMLInputElement>();
	let value = $state('');
	/** The highlighted suggestion; -1 is the typed path itself. */
	let active = $state(-1);
	let error = $state('');

	const within = (p: string) => p === root || p.startsWith(root === '/' ? '/' : `${root}/`);
	const typed = $derived(value.startsWith('/') ? value : joinPath(open, value));
	const cut = $derived(typed.lastIndexOf('/'));
	const folder = $derived(typed.slice(0, cut) || '/');
	const stem = $derived(typed.slice(cut + 1).toLowerCase());
	// two deriveds: one that creates the Dir doesn't track the state the Dir creates
	const listing = $derived(within(folder) ? cache.dir(folder) : undefined);
	const suggestions = $derived(
		(listing?.entries ?? []).filter((e) => e.name.toLowerCase().startsWith(stem)).slice(0, 8)
	);

	/** Opens with the open folder filled in and selected, so typing replaces it, as in Finder. */
	export async function show() {
		value = open === '/' ? '/' : `${open}/`;
		active = -1;
		error = '';
		dialog?.showModal();
		await tick();
		input?.select();
	}

	/** The crumbs of `path` below root, root's label first. */
	function crumbs(path: string): string[] {
		const rest = path.slice(root === '/' ? 1 : root.length + 1);
		return [rootLabel, ...(rest ? rest.split('/') : [])];
	}

	function pick(entry: E) {
		dialog?.close();
		ongo(entry.path, entry.kind);
	}

	async function submit() {
		const entry = suggestions[active];
		if (entry) return pick(entry);
		const path = typed.length > 1 ? typed.replace(/\/+$/, '') : typed;
		try {
			if (!within(path)) throw new Error();
			await fs.list(path);
		} catch {
			error = `There is no folder ${path}.`;
			return;
		}
		dialog?.close();
		ongo(path, 'directory');
	}

	function onkeydown(event: KeyboardEvent) {
		const last = suggestions.length - 1;
		if (event.key === 'ArrowDown') active = active >= last ? -1 : active + 1;
		else if (event.key === 'ArrowUp') active = active < 0 ? last : active - 1;
		else if (event.key === 'Tab' && suggestions.length > 0) {
			const entry = suggestions[Math.max(active, 0)];
			value = entry.kind === 'directory' ? `${entry.path}/` : entry.path;
			active = -1;
		} else if (event.key === 'Enter') void submit();
		else return;
		event.preventDefault();
	}
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="{id}-title"
	onclick={(event) => {
		// the backdrop is the dialog itself; its content sits in .body
		if (event.target === dialog) dialog.close();
	}}
>
	<div class="body">
		<p id="{id}-title" class="title">Go to folder</p>
		<input
			bind:this={input}
			type="text"
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={suggestions.length > 0}
			aria-controls="{id}-list"
			aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${id}-error` : undefined}
			autocomplete="off"
			spellcheck="false"
			bind:value
			oninput={() => {
				active = stem ? 0 : -1;
				error = '';
			}}
			{onkeydown}
		/>
		{#if error}
			<p id="{id}-error" class="error" role="alert">{error}</p>
		{/if}
		<ul id="{id}-list" role="listbox" aria-label="Suggestions">
			{#each suggestions as entry, i (entry.path)}
				<!-- the keyboard drives options from the input through aria-activedescendant, as a combobox does -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li id="{id}-{i}" role="option" aria-selected={i === active} onclick={() => pick(entry)}>
					{#each crumbs(entry.path) as crumb, j (j)}
						{#if j > 0}<Icon name="chevronRight" size="0.75rem" />{/if}
						<span class="chip">{crumb}</span>
					{/each}
					{#if entry.kind === 'directory'}<span class="kind">folder</span>{/if}
				</li>
			{/each}
		</ul>
	</div>
</dialog>

<style>
	dialog {
		width: min(32rem, calc(100vw - 2rem));
		margin: 15vh auto auto;
		padding: 0;
		border: 1px solid var(--_border);
		border-radius: var(--_radius);
		background: var(--_bg);
		color: var(--_fg);
		font-family: var(--_font);
		font-size: 0.875rem;
	}

	dialog::backdrop {
		background: oklch(0 0 0 / 0.2);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
	}

	.title {
		margin: 0;
		color: var(--_muted);
		font-size: 0.75rem;
	}

	input {
		height: 2rem;
		padding: 0 0.5rem;
		border: 1px solid var(--_border);
		border-radius: var(--_radius);
		background: var(--_bg);
		color: var(--_fg);
		font-family: var(--_mono);
		font-size: 0.75rem;
	}

	input:focus-visible {
		outline: 2px solid var(--_muted);
		outline-offset: -1px;
	}

	.error {
		margin: 0;
		color: var(--_fg);
		font-size: 0.75rem;
	}

	ul {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.5rem;
		border-radius: var(--_radius);
		color: var(--_muted);
		cursor: default;
		user-select: none;
	}

	li:hover {
		background: var(--_hover);
	}

	li[aria-selected='true'] {
		--_muted: color-mix(in oklch, var(--_sel-fg) 70%, transparent);
		background: var(--_sel-bg);
		color: var(--_sel-fg);
	}

	.chip {
		padding: 0.0625rem 0.375rem;
		border: 1px solid var(--_border);
		border-radius: var(--_radius);
		color: var(--_fg);
		font-family: var(--_mono);
		font-size: 0.6875rem;
	}

	li[aria-selected='true'] .chip {
		border-color: currentColor;
		color: inherit;
	}

	.kind {
		margin-left: auto;
		font-size: 0.6875rem;
	}
</style>
