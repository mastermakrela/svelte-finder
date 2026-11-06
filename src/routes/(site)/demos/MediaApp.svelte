<!--
@component
A made-up blog admin that picks a post cover with <Finder>: thumbnails through the `icon`
snippet, read from the same just-bash filesystem as every other window.
-->
<script lang="ts">
	import { Finder, type FinderEntry } from '#lib';
	import { imageType } from '#lib/format.js';
	import type { Snippet } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	import type { Disk } from './disk.js';
	import { HOME } from './home.js';

	let { disk }: { disk: Disk } = $props();

	const MEDIA = `${HOME}/site/media`;

	let title = $state('Low tide at Westerhever');
	let cover = $state<string | null>(`${MEDIA}/dune.jpg`);
	let published = $state<string>();

	const thumbs = new SvelteMap<string, { url: string; mtime: number }>();
	// Plain on purpose: the template adds to it while rendering, which reactive state forbids.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const requested = new Set<string>();

	const isImage = (path: string) => imageType(path) !== undefined;

	// The terminal notifies after every command: read an image again only when it changed.
	async function load(path: string) {
		const old = thumbs.get(path);
		try {
			const mtime = (await disk.bash.fs.stat(path)).mtime.getTime();
			if (old?.mtime === mtime) return;
			const bytes = await disk.bash.fs.readFileBuffer(path);
			const url = URL.createObjectURL(new Blob([bytes.slice()], { type: imageType(path) }));
			thumbs.set(path, { url, mtime });
		} catch {
			thumbs.delete(path); // removed, or not written yet
		}
		if (old) URL.revokeObjectURL(old.url);
	}

	// Read on first sight; the template asks for each thumbnail it shows.
	function image(path: string) {
		if (!requested.has(path)) {
			requested.add(path);
			load(path);
		}
		return thumbs.get(path)?.url;
	}

	$effect(() => disk.fs.watch?.(MEDIA, () => requested.forEach(load)));
	$effect(() => () => thumbs.forEach(({ url }) => URL.revokeObjectURL(url)));

	const coverUrl = $derived(cover && isImage(cover) ? image(cover) : undefined);
	const slug = $derived(
		title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'untitled'
	);

	async function publish(event: SubmitEvent) {
		event.preventDefault();
		const path = `${HOME}/site/posts/${slug}.md`;
		const front = cover ? `cover: ${cover.slice(`${HOME}/site`.length)}\n` : '';
		await disk.write(path, `---\ntitle: ${title}\n${front}---\n`);
		published = path.replace(HOME, '~');
	}
</script>

<form class="app flex h-full flex-col overflow-auto bg-background" onsubmit={publish}>
	<div class="flex items-center gap-2 border-b bg-muted px-2.5 py-1.5">
		<span
			class="flex-1 truncate rounded-full bg-background px-3 py-1 font-mono text-[11.5px] text-muted-foreground"
		>
			fieldnotes.blog/admin/posts/new
		</span>
	</div>

	<header class="flex items-baseline justify-between px-5 pt-4">
		<span class="font-serif text-[19px] font-semibold tracking-tight">Field Notes</span>
		<nav class="flex gap-4 text-[12.5px] text-muted-foreground">
			<span>Posts</span><span>Media</span><span>Settings</span>
		</nav>
	</header>

	<div class="flex min-h-0 flex-1 flex-col gap-3 px-5 pt-4 pb-5">
		<label class="flex flex-col gap-1 text-[12.5px] font-medium">
			Title
			<input
				class="h-9 rounded-md border bg-card px-3 text-[16px] font-normal sm:text-[14px]"
				bind:value={title}
			/>
		</label>

		<div class="flex flex-col gap-1">
			<span class="text-[12.5px] font-medium">Cover</span>
			<div class="aspect-[16/10] max-h-44 overflow-hidden rounded-md border bg-muted">
				{#if coverUrl}
					<img class="size-full object-cover" src={coverUrl} alt="" />
				{:else}
					<p
						class="flex size-full items-center justify-center p-4 text-center text-[12.5px] text-muted-foreground"
					>
						Pick an image from the media library.
					</p>
				{/if}
			</div>
		</div>

		<!-- Sized from outside: the Finder's own styles win over utility classes on it. -->
		<div class="relative min-h-60 flex-1 overflow-hidden rounded-md border">
			<Finder
				class="absolute inset-0"
				fs={disk.fs}
				root={MEDIA}
				rootLabel="Media library"
				view="icons"
				searchable={false}
				bind:selected={cover}
			>
				{#snippet icon(entry: FinderEntry, size: 'small' | 'large', builtin: Snippet)}
					{@const url = isImage(entry.path) ? image(entry.path) : undefined}
					{#if url}
						<img
							class={['object-cover', size === 'large' ? 'size-14 rounded-sm' : 'size-4']}
							src={url}
							alt=""
						/>
					{:else}
						{@render builtin()}
					{/if}
				{/snippet}
			</Finder>
		</div>

		<div class="flex items-center gap-3">
			<button
				type="submit"
				class="h-9 rounded-md bg-[var(--app-accent)] px-4 text-[13px] font-medium text-white transition-colors dark:text-background hover:bg-[color-mix(in_oklab,var(--app-accent),black_12%)]"
			>
				Publish
			</button>
			<p class="min-w-0 truncate text-[12.5px] text-muted-foreground" role="status">
				{published ? `Published to ${published}` : ''}
			</p>
		</div>
	</div>
</form>

<style>
	/* Its own brand: the blog's teal, rounded corners, over the site palette. */
	.app {
		--app-accent: oklch(0.52 0.09 205);
		--finder-radius: 6px;
		--finder-selected-bg: var(--app-accent);
		--finder-selected-fg: white;
		--finder-accent: color-mix(in oklab, var(--app-accent) 30%, transparent);
		--finder-icon-size: 3.5rem;
	}

	:global(.dark) .app {
		--app-accent: oklch(0.66 0.1 205);
	}
</style>
