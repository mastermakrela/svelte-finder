<script lang="ts">
	import { Finder, modernMonacoFS } from '#lib';
	import { Workspace } from 'modern-monaco';
	import { MonacoEditor, WorkspaceState } from 'modern-monaco-svelte';

	import { isDark } from './dark.js';
	import Demo from './Demo.svelte';

	// Lives in IndexedDB: your edits survive a reload, initialFiles only seed it once.
	const workspace = new Workspace({
		name: 'svelte-finder-demo',
		initialFiles: {
			'README.md': '# Workspace\n\nDouble-click a file in the Finder to open it here.\n',
			'src/main.ts': "import { greet } from './greet';\n\nconsole.log(greet('Finder'));\n",
			'src/greet.ts': 'export const greet = (name: string) => `Hello, ${name}!`;\n',
			'styles/app.css': 'body {\n\tmargin: 0;\n\tfont-family: system-ui, sans-serif;\n}\n'
		},
		entryFile: 'README.md'
	});
	const fs = modernMonacoFS(workspace.fs);
	// the open file lives in the workspace's history: onopen pushes onto it, the editor follows
	const files = new WorkspaceState(workspace);
	$effect(() => () => files.dispose());
</script>

<Demo tall>
	<div
		class="grid h-full grid-rows-2 gap-2.5 min-[700px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] min-[700px]:grid-rows-1"
	>
		<Finder
			{fs}
			rootLabel="workspace"
			view="list"
			searchable={false}
			selected={files.current ? `/${files.current}` : null}
			onopen={(entry) => files.open(entry.path.slice(1))}
			class="h-full"
		/>
		<MonacoEditor
			{workspace}
			file={files.current}
			followHistory
			dark={isDark()}
			options={{ minimap: { enabled: false }, fontSize: 13 }}
			class="h-full border"
		/>
	</div>
</Demo>
