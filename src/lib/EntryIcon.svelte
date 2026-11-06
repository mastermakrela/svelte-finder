<script module lang="ts">
	import type { IconName } from './Icon.svelte';
	const KINDS: [IconName, RegExp][] = [
		['spreadsheet', /^(csv|tsv|xlsx?|xlsm|ods)$/],
		['presentation', /^(pptx?|odp|key)$/],
		['json', /^json$/],
		['fileText', /^(pdf|docx?|odt|rtf|md|txt|rst|log)$/],
		['image', /^(png|jpe?g|gif|webp|avif|svg|bmp|ico)$/]
	];
</script>

<script lang="ts" generics="E extends FinderEntry">
	import type { Snippet } from 'svelte';
	import { extensionOf } from './format.js';
	import type { FinderEntry } from './fs.js';
	import Icon from './Icon.svelte';

	/** `large` writes the extension onto the icon, as Finder does on big icons. `icon` replaces the built-in one,
	 *  which it gets as `builtin` to render for the entries it leaves alone. */
	let {
		entry,
		size,
		icon
	}: {
		entry: E;
		size: 'small' | 'large';
		icon?: Snippet<[entry: E, size: 'small' | 'large', builtin: Snippet]>;
	} = $props();

	const ext = $derived(entry.kind === 'file' ? extensionOf(entry.name) : '');
	const name = $derived<IconName>(
		entry.kind === 'directory' ? 'folder' : (KINDS.find(([, re]) => re.test(ext))?.[0] ?? 'file')
	);
	const px = $derived(size === 'large' ? 'var(--_icon)' : '1rem');
</script>

{#snippet builtin()}
	<span class="icon" aria-hidden="true">
		<Icon {name} size={px} fill={name === 'folder' ? 'var(--_accent)' : 'none'} />
		{#if size === 'large' && ext}
			<span class="plate">{ext}</span>
		{/if}
	</span>
{/snippet}

{#if icon}
	{@render icon(entry, size, builtin)}
{:else}
	{@render builtin()}
{/if}

<style>
	.icon {
		position: relative;
		display: inline-flex;
		flex-shrink: 0;
		color: var(--_muted);
	}

	.plate {
		position: absolute;
		inset-inline: 0;
		bottom: 16%;
		margin-inline: auto;
		width: fit-content;
		max-width: 80%;
		overflow: hidden;
		padding: 0 0.25rem;
		background: var(--_bg);
		color: var(--_fg);
		font-family: var(--_font);
		font-size: 9px;
		font-weight: 600;
		line-height: 1;
		text-transform: uppercase;
	}
</style>
