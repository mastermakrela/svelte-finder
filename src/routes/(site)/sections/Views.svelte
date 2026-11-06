<script lang="ts">
	import CodeBlock from '../CodeBlock.svelte';
	import ViewsDemo from '../demos/ViewsDemo.svelte';
	import raw from '../demos/ViewsDemo.svelte?raw';
	import { source } from '../highlight.js';
	import Section from '../Section.svelte';
</script>

<Section
	id="views"
	title="Views"
	lead="Three ways to look at a directory, as in macOS: `icons` is a grid, `list` is a table with size and date, `columns` keeps every parent open to the left. `bind:view` drives it from outside and hears the toolbar switch. `bind:path` does the same for the open directory: open a folder in the Finder and the path above follows, set it and the Finder goes there. In the list view `group='modified'` sorts the folder under Finder's date headings: Today, Yesterday, Previous 7 Days, Previous 30 Days, this year's months, then years. It is built on `Temporal`: Chrome and Firefox have it, Safari does not yet, and there the list stays flat."
>
	<ViewsDemo />
	<CodeBlock code={source(raw)} title="ViewsDemo.svelte" />
</Section>
