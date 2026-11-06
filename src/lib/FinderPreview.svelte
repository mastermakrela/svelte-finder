<script module lang="ts">
	const EXCERPT_BYTES = 2000;
	const MAX_TEXT_BYTES = 1_000_000;

	/** The start of `bytes` as UTF-8 text, or undefined when it looks binary. */
	function excerpt(bytes: Uint8Array): string | undefined {
		const head = bytes.subarray(0, EXCERPT_BYTES);
		if (head.includes(0)) return undefined;
		try {
			// stream: a character cut in half at the end is held back instead of failing the decode
			return new TextDecoder('utf-8', { fatal: true }).decode(head, { stream: true });
		} catch {
			return undefined;
		}
	}
</script>

<script lang="ts" generics="E extends FinderEntry">
	import type { Snippet } from 'svelte';
	import EntryIcon from './EntryIcon.svelte';
	import { extensionOf, fmtBytes, fmtDate, imageType } from './format.js';
	import type { FinderEntry, FinderFS } from './fs.js';

	let {
		entry,
		icon,
		read
	}: {
		entry: E;
		icon?: Snippet<[entry: E, size: 'small' | 'large', builtin: Snippet]>;
		read?: FinderFS['read'];
	} = $props();

	const ext = $derived(extensionOf(entry.name));
	const type = $derived(entry.kind === 'file' ? imageType(entry.name) : undefined);

	/** What was read for `path`; checked against the entry so a slow read never shows on the next one. */
	let content = $state.raw<{ path: string; url?: string; text?: string }>();
	let broken = $state<string>();

	$effect(() => {
		const { path, kind, size } = entry;
		const image = type;
		if (!read || kind !== 'file' || (!image && (size ?? 0) > MAX_TEXT_BYTES)) return;
		let url: string | undefined;
		let gone = false;
		read(path).then(
			(bytes) => {
				if (gone) return;
				// slice copies: a view on a SharedArrayBuffer can't go into a Blob
				if (image) url = URL.createObjectURL(new Blob([bytes.slice()], { type: image }));
				content = { path, url, text: image ? undefined : excerpt(bytes) };
			},
			() => {
				// unreadable: the icon and the facts stay
			}
		);
		return () => {
			gone = true;
			if (url) URL.revokeObjectURL(url);
		};
	});

	const shown = $derived(content?.path === entry.path ? content : undefined);
</script>

<div class="preview">
	<div class="head">
		{#if shown?.url && broken !== shown.url}
			<img src={shown.url} alt="" onerror={() => (broken = shown.url)} />
		{:else}
			<EntryIcon {entry} size="large" {icon} />
		{/if}
		<p class="name">{entry.name}</p>
	</div>
	{#if shown?.text}
		<pre>{shown.text}</pre>
	{/if}
	<dl>
		<dt>Kind</dt>
		<dd>{entry.kind === 'directory' ? 'Folder' : ext ? `${ext.toUpperCase()} file` : 'File'}</dd>
		{#if entry.kind === 'file'}
			<dt>Size</dt>
			<dd class="num">{fmtBytes(entry.size)}</dd>
		{/if}
		<dt>Modified</dt>
		<dd>{fmtDate(entry.modified)}</dd>
	</dl>
</div>

<style>
	.preview {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1rem;
	}

	.head {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding-top: 1.5rem;
		text-align: center;
	}

	img {
		display: block;
		width: 100%;
		max-height: 12rem;
		object-fit: contain;
		border-radius: var(--_radius);
	}

	.name {
		margin: 0;
		font-family: var(--_mono);
		font-size: 0.75rem;
		overflow-wrap: anywhere;
	}

	pre {
		max-height: 12rem;
		margin: 0;
		overflow: hidden;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--_border);
		border-radius: var(--_radius);
		color: var(--_muted);
		font-family: var(--_mono);
		font-size: 0.6875rem;
		line-height: 1.5;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		mask-image: linear-gradient(to bottom, black 75%, transparent);
	}

	dl {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.5rem 1rem;
		margin: 0;
		font-size: 0.75rem;
	}

	dt {
		color: var(--_muted);
	}

	dd {
		margin: 0;
	}

	.num {
		font-variant-numeric: tabular-nums;
	}
</style>
