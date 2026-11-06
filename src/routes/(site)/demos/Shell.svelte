<!--
@component
A one-line terminal: example commands, the last command's output and a prompt.
`run` executes a line and resolves to what it printed.
-->
<script lang="ts">
	import Button from './ui/Button.svelte';

	let {
		class: className,
		empty,
		examples,
		run
	}: {
		class?: string;
		empty: string;
		examples: string[];
		run: (line: string) => Promise<string>;
	} = $props();

	let command = $state('');
	let output = $state('');

	async function submit(line: string) {
		command = line;
		output = `$ ${line}\n${await run(line)}`;
	}
</script>

<div class={['flex min-h-0 flex-col', className]}>
	<div class="flex flex-wrap gap-1.5 border-b px-3 py-2">
		{#each examples as example (example)}
			<button
				type="button"
				class="bg-muted px-2 py-0.5 text-left font-mono text-[12px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
				onclick={() => submit(example)}>{example}</button
			>
		{/each}
	</div>
	<pre
		class="m-0 min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[12.5px] leading-[1.6] whitespace-pre-wrap text-muted-foreground">{output ||
			empty}</pre>
	<form
		class="flex items-center gap-2 border-t p-2"
		onsubmit={(event) => {
			event.preventDefault();
			submit(command);
		}}
	>
		<label
			class="flex h-9 min-w-0 flex-1 items-center gap-2 border px-3 font-mono text-[16px] focus-within:ring-2 focus-within:ring-ring sm:text-[13px]"
		>
			<span class="text-accent" aria-hidden="true">$</span>
			<input
				class="min-w-0 flex-1 bg-transparent outline-none"
				aria-label="Command"
				name="command"
				autocomplete="off"
				spellcheck="false"
				bind:value={command}
			/>
		</label>
		<Button size="sm" type="submit">Run</Button>
	</form>
</div>
