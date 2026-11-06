<script lang="ts">
	import CodeBlock from '../CodeBlock.svelte';
	import ThemedDemo from '../demos/ThemedDemo.svelte';
	import raw from '../demos/ThemedDemo.svelte?raw';
	import { source } from '../highlight.js';
	import Prose from '../Prose.svelte';
	import { LEAD } from '../prose.js';
	import Reference from '../Reference.svelte';
	import Section from '../Section.svelte';
	import Subheading from '../Subheading.svelte';

	const VARIABLES: [string, string, string][] = [
		['--finder-bg', 'oklch(1 0 0)', 'Window background, and the search field.'],
		['--finder-fg', 'oklch(0.145 0 0)', 'Names and the current path crumb.'],
		['--finder-muted-fg', 'oklch(0.556 0 0)', 'Sizes, dates, chevrons, the status bar.'],
		[
			'--finder-border',
			'oklch(0.922 0 0)',
			'Toolbar, list, column and status bar rules, and the search field.'
		],
		[
			'--finder-hover-bg',
			'oklch(0.97 0 0)',
			'Hovered rows, the pressed view button, open folders in columns.'
		],
		['--finder-selected-bg', 'oklch(0.205 0 0)', 'The selected entry.'],
		[
			'--finder-selected-fg',
			'oklch(0.985 0 0)',
			'Text on the selected entry; its muted text is mixed from it.'
		],
		['--finder-accent', 'oklch(0.556 0 0 / 0.2)', 'The fill of folder icons.'],
		['--finder-font', 'ui-sans-serif, system-ui', 'The toolbar, headers, kinds and dates.'],
		['--finder-mono', 'ui-monospace, Menlo', 'Entry names and the path crumbs below the root.'],
		['--finder-radius', '0', 'Corners of the window, rows and buttons.'],
		['--finder-column-width', '16rem', 'Width of each column in the columns view.'],
		['--finder-icon-size', '3.5rem', 'Large icons: the icons view and the detail pane.']
	];

	const HOOKS = `/* app.css */

/* The root carries the view: 'icons' | 'list' | 'columns'. */
.finder[data-view='list'] {
  font-size: 13px;
}

/* Every row, tile and column item says what it is and where it lives. */
.finder [data-kind='directory'] {
  font-weight: 500;
}
.finder [data-path$='.md'] {
  color: steelblue;
}

/* 'true' on the selected entry; in columns also on each folder you came through. */
.finder [data-selected='true'] {
  outline: 1px solid currentColor;
}
.finder [data-open='true'] {
  font-style: italic;
}`;
</script>

<Section
	id="styling"
	title="Styling"
	lead="The Finder ships a neutral light look and reads every colour, font and size from a custom property, each with that look as its fallback. Set them on any ancestor and every Finder inside follows: this page sets them once on `:root` from its own palette, which is why the demos switch with the theme toggle."
>
	<Reference head={['Variable', 'Default', 'Paints']} rows={VARIABLES} />

	<Subheading>A theme</Subheading>
	<p class="{LEAD} mt-4">
		<Prose
			text="Warm paper-on-walnut, a serif for names and rounder corners. Nothing but variables on a wrapper div, which overrides the page-wide values because it is closer to the Finder."
		/>
	</p>
	<ThemedDemo />
	<CodeBlock code={source(raw)} title="ThemedDemo.svelte" />

	<Subheading>Data hooks</Subheading>
	<p class="{LEAD} mt-4">
		<Prose
			text="For anything the variables do not reach, the markup carries state as attributes: `data-view` on the `.finder` root, `data-kind` and `data-path` on every entry, `data-selected` and, in the columns view, `data-open`. The Finder's styles are scoped to it, so target these from a global stylesheet, or wrap them in `:global(...)` inside a component. To style entries from your own data, `entryclass` and `entrystyle` return a class or an inline style per entry."
		/>
	</p>
	<CodeBlock lang="css" code={HOOKS} />
</Section>
