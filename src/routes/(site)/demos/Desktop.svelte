<!--
@component
The landing page's desktop: Finders, a wterm terminal, a Monaco editor and a made-up web app,
all on one just-bash filesystem. Window frames and the taskbar prerender; the filesystem and
every pane load in the browser, the editor only once its window first shows.
-->
<script lang="ts">
	import { imageType } from '#lib/format.js';
	import { Finder, type FinderView } from '#lib';
	import ArrowDown from 'phosphor-svelte/lib/ArrowDown';
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';

	import CopyButton from '../CopyButton.svelte';
	import type { Disk } from './disk.js';
	import { HOME } from './home.js';
	import Window from './Window.svelte';

	type Kind = 'Finder' | 'Terminal' | 'Editor' | 'Browser';
	type Win = {
		id: number;
		kind: Kind;
		place: string;
		x?: number;
		y?: number;
		z: number;
		minimized: boolean;
		// The pane mounts the first time its window shows, and stays mounted.
		seen: boolean;
		path: string;
		view: FinderView;
		selected: string | null;
	};

	const INSTALL = 'bun add svelte-finder';
	const ITEM =
		'block w-full px-3 py-1.5 text-left text-[13px] no-underline transition-colors outline-none hover:bg-muted focus-visible:bg-muted';

	const mobile = new MediaQuery('max-width: 639px');

	let disk = $state.raw<Disk>();
	let file = $state(`${HOME}/README.md`);
	let menuOpen = $state(false);
	let top = 4;
	let nextId = 1;
	let windows = $state<Win[]>([
		{
			...win('Finder', 'columns', 4),
			path: `${HOME}/site/posts`,
			view: 'columns',
			selected: `${HOME}/site/posts/westerhever.md`
		},
		{ ...win('Finder', 'list', 2), path: `${HOME}/project/src`, view: 'list' },
		win('Terminal', 'term', 3),
		win('Browser', 'app', 1),
		{ ...win('Editor', 'editor', 0), minimized: true }
	]);

	const active = $derived(windows.filter((w) => !w.minimized).toSorted((a, b) => b.z - a.z)[0]);

	function win(kind: Kind, place: string, z: number): Win {
		return {
			id: nextId++,
			kind,
			place,
			z,
			minimized: false,
			seen: false,
			path: HOME,
			view: 'icons',
			selected: null
		};
	}

	const short = (path: string) => path.replace(HOME, '~');

	onMount(() => {
		for (const w of windows) w.seen = !w.minimized && (!mobile.current || w === active);
		import('./disk.js').then((module) => (disk = new module.Disk()));
	});

	function focus(w: Win) {
		w.minimized = false;
		w.seen = true;
		if (w.z !== top) w.z = ++top;
	}

	function open(kind: Kind) {
		menuOpen = false;
		const single = kind === 'Editor' || kind === 'Browser';
		const existing = single && windows.find((w) => w.kind === kind);
		if (existing) return focus(existing);
		const offset = 40 + (windows.length % 6) * 28;
		const w = single ? win(kind, kind === 'Editor' ? 'editor' : 'app', 0) : win(kind, 'new', 0);
		if (!single) Object.assign(w, { x: offset, y: offset });
		windows.push(w);
		focus(windows[windows.length - 1]);
	}

	function edit(path: string) {
		// photos are bytes, not text: the Finder's own preview shows them
		if (imageType(path)) return;
		file = path;
		open('Editor');
	}
</script>

<div class="flex h-full flex-col">
	<div
		class="desk relative min-h-0 flex-1 bg-well bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[16px_16px] max-sm:flex max-sm:flex-col"
	>
		<div class="intro flex-none p-5 pb-4 sm:absolute sm:p-0">
			<h1
				class="text-[clamp(24px,2.6vw,34px)] leading-[1.1] font-medium tracking-[-0.03em] text-balance"
			>
				A Finder for the web, over any filesystem
			</h1>
			<p class="mt-3 max-w-[44ch] text-[14px] text-pretty text-muted-foreground max-sm:hidden">
				A Svelte 5 file browser. Every window here shares one in-browser filesystem: type in the
				terminal, double-click a file to edit it, publish a post from the browser.
			</p>
			<div class="mt-4 flex flex-wrap items-center gap-2">
				<div class="flex h-9 items-center gap-1 border bg-card pr-1 pl-3">
					<code class="font-mono text-[13px] text-muted-foreground">{INSTALL}</code>
					<CopyButton text={INSTALL} label="Copy install command" />
				</div>
				<a
					href="#install"
					class="inline-flex h-9 items-center px-3 text-[13px] font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
				>
					Read the docs
				</a>
			</div>
		</div>

		{#each windows as w (w.id)}
			<Window
				title={w.kind}
				detail={w.kind === 'Finder'
					? short(w.path)
					: w.kind === 'Editor'
						? short(file)
						: w.kind === 'Browser'
							? 'fieldnotes.blog'
							: undefined}
				place={w.place}
				bind:x={w.x}
				bind:y={w.y}
				z={w.z}
				hidden={w.minimized}
				active={w === active}
				onfocus={() => focus(w)}
				onminimize={() => (w.minimized = true)}
				onclose={() => (windows = windows.filter((other) => other.id !== w.id))}
			>
				{#if disk && w.seen}
					{#if w.kind === 'Finder'}
						<Finder
							class="h-full"
							fs={disk.fs}
							root={HOME}
							rootLabel="home"
							bind:path={w.path}
							bind:view={w.view}
							bind:selected={w.selected}
							onopen={(entry) => edit(entry.path)}
						/>
					{:else if w.kind === 'Terminal'}
						{#await import('./Terminal.svelte') then { default: Terminal }}
							<Terminal {disk} paused={w.minimized || (mobile.current && w !== active)} />
						{/await}
					{:else if w.kind === 'Editor'}
						{#await import('./Editor.svelte') then { default: Editor }}
							<Editor {disk} path={file} />
						{/await}
					{:else}
						{#await import('./MediaApp.svelte') then { default: MediaApp }}
							<MediaApp {disk} />
						{/await}
					{/if}
				{/if}
			</Window>
		{/each}
	</div>

	<div class="relative z-[1000] flex h-11 flex-none items-center gap-1 border-t bg-card px-1.5">
		<details class="relative" bind:open={menuOpen}>
			<summary
				class="flex h-8 cursor-pointer list-none items-center gap-2 px-3 text-[13px] font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
			>
				<svg aria-hidden="true" fill="none" height="12" viewBox="0 0 20 14" width="17">
					<rect class="fill-accent" height="14" width="4" x="0" />
					<rect fill="currentColor" height="14" opacity="0.5" width="4" x="6" />
					<rect fill="currentColor" height="14" opacity="0.25" width="7" x="13" />
				</svg>
				Start
			</summary>
			<menu
				class="absolute bottom-full left-0 mb-2 w-52 border bg-card p-1 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.3)]"
			>
				<li>
					<button type="button" class={ITEM} onclick={() => open('Finder')}>New Finder</button>
				</li>
				<li>
					<button type="button" class={ITEM} onclick={() => open('Terminal')}>New terminal</button>
				</li>
				<li><button type="button" class={ITEM} onclick={() => open('Editor')}>Editor</button></li>
				<li><button type="button" class={ITEM} onclick={() => open('Browser')}>Browser</button></li>
				<li class="my-1 border-t" role="separator"></li>
				<li>
					<button
						type="button"
						class={ITEM}
						onclick={() => {
							menuOpen = false;
							disk?.reset();
						}}>Reset filesystem</button
					>
				</li>
				<li>
					<a class={ITEM} href="#install" onclick={() => (menuOpen = false)}>Documentation</a>
				</li>
			</menu>
		</details>
		<div class="flex min-w-0 flex-1 gap-1 overflow-x-auto border-l pl-1.5 no-scrollbar">
			{#each windows as w (w.id)}
				<button
					type="button"
					aria-pressed={w === active}
					class={[
						'flex h-8 max-w-48 flex-none items-center gap-1.5 border-b-2 px-3 text-[12.5px] transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
						w === active ? 'border-b-accent bg-muted' : 'border-b-transparent',
						w.minimized && 'text-muted-foreground opacity-60'
					]}
					onclick={() => focus(w)}
				>
					<span>{w.kind}</span>
					{#if w.kind === 'Finder'}
						<span class="truncate font-mono text-[11.5px] text-muted-foreground"
							>{w.path === HOME ? '~' : w.path.slice(w.path.lastIndexOf('/') + 1)}</span
						>
					{/if}
				</button>
			{/each}
		</div>
		<a
			href="#install"
			class="flex h-8 flex-none items-center gap-1.5 border-l px-3 text-[13px] text-muted-foreground no-underline transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
		>
			Docs<ArrowDown size={13} />
		</a>
	</div>
</div>

<style>
	/* Starting places, as fractions of the desktop. Wide: intro over the terminal, two Finders
	   stacked in the middle, the browser on the right. */
	.desk {
		--c1: calc((100% - 56px) * 0.3);
		--c2: calc((100% - 56px) * 0.4);
		--c3: calc((100% - 56px) * 0.3);
		--row: calc((100% - 44px) * 0.52);
		--intro: 17rem;
		--finder-column-width: 11.5rem;
	}

	@media (width >= 640px) {
		.intro {
			left: 24px;
			top: 24px;
			width: calc(var(--c1) - 16px);
		}
	}

	.desk :global(.window[data-place='term']) {
		--x0: 16px;
		--y0: var(--intro);
		--w0: var(--c1);
		--h0: calc(100% - var(--intro) - 16px);
	}

	.desk :global(.window[data-place='columns']) {
		--x0: calc(28px + var(--c1));
		--y0: 16px;
		--w0: var(--c2);
		--h0: var(--row);
	}

	.desk :global(.window[data-place='list']) {
		--x0: calc(28px + var(--c1));
		--y0: calc(28px + var(--row));
		--w0: var(--c2);
		--h0: calc(100% - 44px - var(--row));
	}

	.desk :global(.window[data-place='app']) {
		--x0: calc(40px + var(--c1) + var(--c2));
		--y0: 16px;
		--w0: var(--c3);
		--h0: calc(100% - 32px);
	}

	.desk :global(.window[data-place='editor']) {
		--x0: calc(52px + var(--c1));
		--y0: 48px;
		--w0: calc(var(--c2) + 48px);
		--h0: calc(100% - 96px);
	}

	@media (width < 1280px) {
		.desk {
			--intro: 19rem;
		}
	}

	/* Two columns: the list Finder waits behind the columns one, a taskbar click away. */
	@media (width < 1100px) {
		.desk {
			--c1: calc((100% - 44px) * 0.44);
			--c2: calc((100% - 44px) * 0.56);
			--row: calc((100% - 44px) * 0.5);
		}

		.desk :global(.window[data-place='list']) {
			--y0: 16px;
			--h0: var(--row);
		}

		.desk :global(.window[data-place='app']) {
			--x0: calc(28px + var(--c1));
			--y0: calc(28px + var(--row));
			--w0: var(--c2);
			--h0: calc(100% - 44px - var(--row));
		}

		.desk :global(.window[data-place='editor']) {
			--x0: calc(28px + var(--c1));
			--w0: var(--c2);
		}
	}
</style>
