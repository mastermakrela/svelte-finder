<script lang="ts">
	import ClientOnly from '../ClientOnly.svelte';
	import CodeBlock from '../CodeBlock.svelte';
	import bashRaw from '../demos/BashDemo.svelte?raw';
	import monacoRaw from '../demos/MonacoDemo.svelte?raw';
	import { source } from '../highlight.js';
	import Prose from '../Prose.svelte';
	import { LEAD } from '../prose.js';
	import Section from '../Section.svelte';
	import Subheading from '../Subheading.svelte';

	const CONTRACT = `interface FinderFS {
  // Entries of the directory at path, in any order; reject if it is not a directory.
  list(path: string): Promise<FinderEntry[]>;
  // Optional: call onChange when anything at or below path changes; return an unsubscribe.
  watch?(path: string, onChange: () => void): () => void;
  // Optional: your own search under root; the signal aborts when the query changes.
  search?(query: string, root: string, opts: { signal: AbortSignal }): Promise<FinderEntry[]>;
  // Optional: the file's bytes; the built-in preview shows images and the start of text files.
  read?(path: string): Promise<Uint8Array>;
  // Optional: move from to its new full path, rejecting if that exists; entries become draggable.
  move?(from: string, to: string): Promise<void>;
}

interface FinderEntry {
  name: string; // base name, no slashes
  path: string; // absolute: '/', '/src', '/src/app.ts'
  kind: 'file' | 'directory';
  size?: number; // bytes
  modified?: number; // epoch milliseconds
  symlink?: boolean; // a link; kind is what it points at
}`;

	const CUSTOM = `import { joinPath, type FinderFS } from 'svelte-finder';

// A read-only Finder over an API that answers GET /ls?path=/src with
// [{ "name": "app.ts", "dir": false, "bytes": 812, "mtime": "2026-10-01T09:00:00Z" }]
export const httpFS = (base: string): FinderFS => ({
  async list(path) {
    const response = await fetch(\`\${base}/ls?path=\${encodeURIComponent(path)}\`);
    if (!response.ok) throw new Error(\`\${path}: \${response.status}\`);
    const rows: { name: string; dir: boolean; bytes: number; mtime: string }[] = await response.json();
    return rows.map((row) => ({
      name: row.name,
      path: joinPath(path, row.name),
      kind: row.dir ? 'directory' : 'file',
      size: row.bytes,
      modified: Date.parse(row.mtime)
    }));
  }
});`;
</script>

<Section
	id="filesystems"
	title="Filesystems"
	lead="The Finder never touches storage. It asks a `FinderFS` for one directory at a time, with absolute `/`-separated paths, and sorts, filters and searches what comes back itself. A backend that can report changes adds `watch`, and the Finder lists again when it fires. One that cannot leaves it out: wrap it in `withChangeFeed` and call `notify()` after you change something. A backend with its own search adds `search`, and the Finder asks it instead of walking the tree. With `read` the columns view previews images and text, and with `move` entries can be dragged onto folders and path levels."
>
	<CodeBlock lang="ts" code={CONTRACT} title="fs.ts" />
	<p class="{LEAD} mt-6">
		<Prose
			text="So an adapter is one function that maps your backend's listing onto `FinderEntry`. `joinPath` and `parentPath` are exported for the path arithmetic."
		/>
	</p>
	<CodeBlock lang="ts" code={CUSTOM} title="http-fs.ts" />

	<Subheading>modern-monaco-svelte</Subheading>
	<p class="{LEAD} mt-4">
		<Prose
			text="The editor to pair it with is `modern-monaco-svelte`, Svelte components for `modern-monaco`. Here a Finder and its `MonacoEditor` share one `Workspace`: `modernMonacoFS(workspace.fs)` lists the workspace, forwards its `watch` and maps `read` and `move` onto it, and a `WorkspaceState` keeps the open file. Double-click a file and `onopen` opens it; the editor follows the workspace history and the Finder highlights its file. Type in the editor and the list view's size and date follow. The workspace is stored in IndexedDB, so your edits are still there after a reload. The adapter takes any `modern-monaco` workspace's `fs`, with or without the Svelte components."
		/>
		<a
			class="underline underline-offset-4 hover:text-foreground"
			href="https://mastermakrela.github.io/modern-monaco-svelte/">modern-monaco-svelte docs</a
		>
	</p>
	<ClientOnly
		name="modern-monaco"
		class="h-[562px] sm:h-[442px]"
		load={() => import('../demos/MonacoDemo.svelte')}
	/>
	<CodeBlock code={source(monacoRaw)} title="MonacoDemo.svelte" />

	<Subheading>just-bash</Subheading>
	<p class="{LEAD} mt-4">
		<Prose
			text="A Finder over the in-memory filesystem of a `just-bash` shell, rooted at `/project` with the `root` prop. The shell has no change events, so the demo wraps the adapter in `withChangeFeed` and calls `notify()` after every command; a drag-and-drop move notifies by itself. Each command runs in `/project`; `cd` does not carry over to the next one."
		/>
	</p>
	<ClientOnly
		name="just-bash"
		class="h-[827px] sm:h-[643px]"
		load={() => import('../demos/BashDemo.svelte')}
	/>
	<CodeBlock code={source(bashRaw)} title="BashDemo.svelte" />
</Section>
