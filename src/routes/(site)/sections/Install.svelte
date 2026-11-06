<script lang="ts">
	import CodeBlock from '../CodeBlock.svelte';
	import ToggleGroup from '../demos/ui/ToggleGroup.svelte';
	import Section from '../Section.svelte';

	const MANAGERS = ['bun', 'npm', 'pnpm'] as const;
	const COMMAND = { bun: 'bun add', npm: 'npm install', pnpm: 'pnpm add' };

	let manager = $state<(typeof MANAGERS)[number]>('bun');

	const IMPORTS = `import { Finder, memoryFS, modernMonacoFS, justBashFS } from 'svelte-finder'
import type { FinderEntry, FinderFS, FinderView } from 'svelte-finder'`;
</script>

<Section
	id="install"
	title="Install"
	lead="One package, written with runes for Svelte 5. Its only peer dependency is `svelte ^5.40`. The adapters describe the slice of each backend they call as their own types, so `modern-monaco` and `just-bash` are only needed if you use them."
>
	<div class="mt-6">
		<ToggleGroup label="Package manager" items={MANAGERS} bind:value={manager} />
	</div>
	<div class="-mt-3">
		<CodeBlock lang="sh" code="{COMMAND[manager]} svelte-finder" />
	</div>
	<CodeBlock lang="ts" code={IMPORTS} />
</Section>
