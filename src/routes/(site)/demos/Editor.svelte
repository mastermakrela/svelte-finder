<!--
@component
Monaco on a file of the desktop's just-bash filesystem: reads it, writes edits back and
notifies, and picks up changes made elsewhere (the terminal, the app) while you are not typing.
-->
<script lang="ts">
	import { extensionOf } from '#lib/format.js';
	import { MonacoEditor } from 'modern-monaco-svelte';

	import { isDark } from './dark.js';
	import type { Disk } from './disk.js';

	let { disk, path }: { disk: Disk; path: string } = $props();

	const LANGUAGES: Record<string, string> = {
		css: 'css',
		json: 'json',
		md: 'markdown',
		svelte: 'svelte',
		svg: 'xml',
		ts: 'typescript'
	};

	let value = $state('');
	let pending: (() => void) | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const language = $derived(LANGUAGES[extensionOf(path)] ?? 'plaintext');

	function flush() {
		clearTimeout(timer);
		pending?.();
		pending = undefined;
	}

	$effect(() => {
		const file = path;
		const reload = () => {
			// a write still waiting would be overwritten by the older text on disk
			if (pending) return;
			disk.read(file).then(
				(text) => {
					if (!pending && file === path) value = text;
				},
				() => {}
			);
		};
		reload();
		const off = disk.fs.watch?.(file, reload);
		return () => {
			flush();
			off?.();
		};
	});
</script>

<MonacoEditor
	bind:value
	{language}
	dark={isDark()}
	options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
	class="h-full"
	onchange={(text) => {
		const file = path;
		clearTimeout(timer);
		pending = () => disk.write(file, text);
		timer = setTimeout(flush, 250);
	}}
>
	{#snippet loading()}
		<p class="p-4 text-[13px] text-muted-foreground">Loading editor…</p>
	{/snippet}
</MonacoEditor>
