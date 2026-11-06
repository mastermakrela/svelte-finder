<script lang="ts" generics="E extends FinderEntry">
	import type { Snippet } from 'svelte';
	import type { FinderEntry } from './fs.js';
	import type { Dir } from './listing.svelte.js';

	/** A directory's loading and error states; `children` renders the entries once they are there. */
	let { dir, children }: { dir: Dir<E>; children: Snippet<[E[]]> } = $props();
</script>

{#if dir.error}
	<p class="failed" role="alert">{dir.error.message}</p>
{:else if dir.entries}
	{@render children(dir.entries)}
{:else}
	<div class="skeleton" aria-busy="true">
		<span></span><span></span><span></span>
	</div>
{/if}

<style>
	.skeleton {
		display: grid;
		gap: 0.625rem;
		padding: 0.75rem;
	}

	.skeleton span {
		height: 1rem;
		border-radius: var(--_radius);
		background: var(--_hover);
	}

	.skeleton span:nth-child(1) {
		width: 75%;
	}

	.skeleton span:nth-child(2) {
		width: 50%;
	}

	.skeleton span:nth-child(3) {
		width: 66%;
	}
</style>
