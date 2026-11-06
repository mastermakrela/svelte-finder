<script lang="ts">
	import CodeBlock from '../CodeBlock.svelte';
	import SelectionDemo from '../demos/SelectionDemo.svelte';
	import raw from '../demos/SelectionDemo.svelte?raw';
	import { source } from '../highlight.js';
	import Section from '../Section.svelte';
</script>

<Section
	id="selection"
	title="Selection and events"
	lead="A click selects and `bind:selected` holds the path, or `null`. A double-click or Enter opens: a folder in place, a file through `onopen`, which is where you load it into an editor, download it or route to it. In the columns view a click on a folder already opens it as the next column, as in Finder. Back and Forward in the toolbar walk the folders the Finder has shown, and `bind:this` reaches the same history from code: `history.paths`, `history.index`, `back()`, `forward()` and `go(index)` drive the row under this demo. The columns view's pane holds the `preview` snippet: the selected file, or `null` and the open folder's path. This one reads the file with `fs.read`."
>
	<SelectionDemo />
	<CodeBlock code={source(raw)} title="SelectionDemo.svelte" />
</Section>
