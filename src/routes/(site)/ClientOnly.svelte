<!--
@component
Mounts a demo in the browser only, once it nears the viewport: prerendering never evaluates
the demo or the backend it pulls in, and the page doesn't download it until a reader gets close.
-->
<script lang="ts">
	import type { Component } from 'svelte';

	// `class` sizes the placeholder to the loaded demo, so nothing shifts when it mounts.
	let {
		class: className,
		load,
		name
	}: { class: string; load: () => Promise<{ default: Component }>; name: string } = $props();

	let Demo = $state<Component>();
	let failed = $state(false);

	function nearby(node: Element) {
		const io = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				io.disconnect();
				load().then(
					(module) => (Demo = module.default),
					() => (failed = true)
				);
			},
			{ rootMargin: '600px' }
		);
		io.observe(node);
		return () => io.disconnect();
	}
</script>

{#if Demo}
	<Demo />
{:else}
	<div
		{@attach nearby}
		class={[
			'mt-6 flex items-center justify-center border bg-well text-[13px] text-muted-foreground',
			className
		]}
	>
		{failed ? `The ${name} demo failed to load. Reload the page to try again.` : `Loading ${name}…`}
	</div>
{/if}
