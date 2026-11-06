<!--
@component
A wterm terminal running @wterm/just-bash's line editor on the desktop's shared Bash.
wterm focuses itself when it starts, so it starts on a click (or Enter) in the pane,
behind a copy of its first screen; on page load it would steal focus and scroll to the top.
-->
<script lang="ts">
	import { BashShell } from '@wterm/just-bash';
	import { Terminal } from '@wterm/svelte';
	import '@wterm/dom/src/terminal.css';

	import { isDark } from './dark.js';
	import type { Disk } from './disk.js';
	import { HOME } from './home.js';

	let { disk, paused }: { disk: Disk; paused: boolean } = $props();

	const GREETING = [
		'Same files as every window. Try:',
		'  touch notes.md',
		'  mv site/media/dune.jpg .',
		'  rm -r project',
		''
	];

	let started = $state(false);

	const shell = new BashShell({
		cwd: HOME,
		greeting: GREETING.map((line) => `\x1b[2m${line}\x1b[0m`),
		prompt: (cwd) => `\x1b[1;38;2;214;72;30m${cwd.replace(HOME, '~')}\x1b[0m $ `
	});
</script>

{#if started}
	<Terminal
		class="desk-term h-full"
		autoResize
		renderingPaused={paused}
		theme={isDark() ? undefined : 'light'}
		aria-label="Terminal"
		onReady={async (term) => {
			await shell.attach((data) => term.write(data));
			// shortcut: BashShell always builds its own Bash (no option in @wterm/just-bash 0.5.9), so we
			// swap its private instance for the shared one; upgrade once ShellOptions accepts a Bash or fs.
			Object.assign(shell, { _bash: disk.bash });
		}}
		onData={async (data) => {
			await shell.handleInput(data);
			// handleInput resolves once Enter's command has finished running.
			if (data.includes('\r')) disk.fs.notify();
		}}
	/>
{:else}
	<button
		type="button"
		class="desk-term flex size-full cursor-text items-start bg-card text-left font-mono whitespace-pre outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
		aria-label="Start the terminal"
		onclick={() => (started = true)}
	>
		<span
			><span class="text-muted-foreground">{GREETING.join('\n')}</span><span
				class="font-bold text-accent">~</span
			>
			$ <span class="cursor">&nbsp;</span></span
		>
	</button>
{/if}

<style>
	.desk-term,
	:global(.wterm.desk-term) {
		--term-bg: var(--card);
		--term-fg: var(--foreground);
		--term-cursor: var(--accent);
		--term-font-family: var(--font-mono);
		--term-font-size: 13px;
		--term-row-height: 17px;
		padding: 10px 12px;
		border-radius: 0;
		box-shadow: none;
		font-size: 13px;
		line-height: 17px;
	}

	.cursor {
		outline: 1px solid var(--accent);
		outline-offset: -1px;
	}
</style>
