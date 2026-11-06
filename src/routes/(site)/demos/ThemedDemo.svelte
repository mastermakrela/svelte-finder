<script lang="ts">
	import { onMount } from 'svelte';
	import { Finder, memoryFS } from '#lib';

	import Demo from './Demo.svelte';
	import { addPhotos, project } from './project.js';

	const fs = memoryFS(project);
	onMount(() => addPhotos(fs));
</script>

<Demo>
	<div class="darkroom">
		<Finder {fs} rootLabel="field-notes" path="/static/images" />
	</div>
</Demo>

<style>
	.darkroom {
		--finder-bg: #2b211b;
		--finder-fg: #f3e7d6;
		--finder-muted-fg: #b09a86;
		--finder-border: #f3e7d61f;
		--finder-hover-bg: #3a2d25;
		--finder-selected-bg: #e2a55a;
		--finder-selected-fg: #2b211b;
		--finder-accent: #e2a55a66;
		--finder-font: 'Iowan Old Style', Charter, Georgia, serif;
		--finder-mono: 'Iowan Old Style', Charter, Georgia, serif;
		--finder-radius: 6px;
		--finder-column-width: 13rem;
		--finder-icon-size: 4rem;

		height: 100%;
		border-radius: 10px;
		overflow: hidden;
	}
</style>
