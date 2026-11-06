<script lang="ts">
	import CodeBlock from '../CodeBlock.svelte';
	import Prose from '../Prose.svelte';
	import { LEAD } from '../prose.js';
	import Section from '../Section.svelte';

	const MINIMAL = `<${'script'} lang="ts">
  import { Finder, memoryFS } from 'svelte-finder';

  const fs = memoryFS({
    'README.md': '# Hello\\n',
    src: {
      'app.ts': 'export {};\\n',
      lib: { 'util.ts': 'export const id = <T>(x: T) => x;\\n' }
    },
    'logo.png': new Uint8Array(2048)
  });
</${'script'}>

<div style="height: 420px">
  <Finder {fs} />
</div>`;

	const MUTATE = `fs.write('/src/lib/new.ts', 'export {};\\n'); // parents are created
fs.mkdir('/docs');
await fs.move('/docs', '/src/docs');
fs.remove('/logo.png');
await fs.read('/README.md'); // the bytes of '# Hello\\n'`;
</script>

<Section
	id="quick-start"
	title="Quick start"
	lead="Give the Finder a filesystem and a box to fill. It sizes to its container, so give that a height. `memoryFS` takes a nested object: a string or `Uint8Array` is a file, an object is a directory. The Finder opens at `/` in the columns view, with a toolbar, a search field and a status bar."
>
	<CodeBlock code={MINIMAL} title="+page.svelte" />
	<p class="{LEAD} mt-6">
		<Prose
			text="The object returned by `memoryFS` also writes, moves and reads. Every change notifies the Finder through `watch`, so it updates without being told."
		/>
	</p>
	<CodeBlock lang="ts" code={MUTATE} />
</Section>
