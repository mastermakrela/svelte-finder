<!--
@component
A row of pressable buttons where exactly one is pressed.
-->
<script lang="ts" generics="T extends string">
	import Button from './Button.svelte';

	let {
		items,
		label,
		value = $bindable()
	}: { items: readonly T[]; label: string; value: T } = $props();
</script>

<div role="group" aria-label={label} class="flex flex-wrap items-center gap-0.5">
	{#each items as item (item)}
		<Button variant="ghost" size="sm" aria-pressed={item === value} onclick={() => (value = item)}>
			{item}
		</Button>
	{/each}
</div>
