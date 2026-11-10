# svelte-finder

A Finder for the web: icons, list and columns views over any filesystem, for Svelte 5. The component lists directories through a small interface, so the same Finder browses an in-memory tree, the workspace of a [modern-monaco-svelte](https://mastermakrela.github.io/modern-monaco-svelte/) editor (or any [modern-monaco](https://github.com/esm-dev/modern-monaco) workspace), a [just-bash](https://github.com/vercel-labs/just-bash) shell or your own API. Back and Forward, Go to folder, drag-and-drop moves, image previews and date groups come along, as in macOS. Written with runes, styled with CSS custom properties.

Demos and docs: <https://finder.mastermakrela.com>.

## Install

```sh
bun add svelte-finder
# or
npm install svelte-finder
pnpm add svelte-finder
```

Peer dependency: `svelte ^5.40`. The adapters type only the slice of each backend they call, so `modern-monaco` and `just-bash` are needed only if you use them.

## Quick start

The Finder sizes to its container, so give that a height.

```svelte
<script lang="ts">
	import { Finder, memoryFS } from 'svelte-finder';

	const fs = memoryFS({
		'README.md': '# Hello\n',
		src: {
			'app.ts': 'export {};\n',
			lib: { 'util.ts': 'export const id = <T>(x: T) => x;\n' }
		},
		'logo.png': new Uint8Array(2048)
	});
</script>

<div style="height: 420px">
	<Finder {fs} />
</div>
```

In the tree, a string or `Uint8Array` is a file and an object is a directory. The Finder opens at `/` in the columns view, with a toolbar (view switch, path bar, search) and a status bar.

### Views, path, selection and search

`view`, `path`, `selected` and `query` are bindable. Clicks work as in Finder: a click selects, a double-click or Enter opens. A folder opens in place, a file goes to `onopen`. In the columns view a click on a folder already opens it as the next column. A click from the keyboard (Space) or a screen reader has no double-click to follow, so it opens.

`selected` is a **path**, not an entry. It stays with its folder: the highlight shows while that folder is open (or while it is a search match) and comes back when you return to it. The Finder changes it when the user clicks an entry, picks a file in Go to folder, or moves the selected entry; set it to `null` yourself to clear it.

```svelte
<script lang="ts">
	import { Finder, type FinderView } from 'svelte-finder';

	let view = $state<FinderView>('list');
	let path = $state('/src');
	let selected = $state<string | null>(null);
	let query = $state('');
</script>

<Finder
	{fs}
	bind:view
	bind:path
	bind:selected
	bind:query
	onopen={(entry) => openInEditor(entry.path)}
/>
```

Because `path` and `query` are plain strings, they can live in the URL: bind them to your router's search params and a folder deep in the tree can be shared, and Back walks the folders.

### History and Go to folder

The toolbar has Back and Forward over the folders the Finder has shown. Reach the same history with `bind:this`: `history.paths` (oldest first) and `history.index` (the open one) are reactive, and `back()`, `forward()` and `go(index)` navigate. Opening a new folder after going back drops the forward part, as in a browser.

```svelte
<script lang="ts">
	import { Finder, type FinderEntry } from 'svelte-finder';

	let finder = $state<Finder<FinderEntry>>();
</script>

<Finder bind:this={finder} {fs} />
{#each finder?.history.paths ?? [] as path, i (i)}
	<button aria-current={i === finder?.history.index} onclick={() => finder?.go(i)}>{path}</button>
{/each}
```

Cmd+Shift+G (Ctrl+Shift+G elsewhere) while the Finder has focus, the toolbar's Go to folder button, or `goToFolder()` opens Go to folder: type a path (absolute, or relative to the open folder), pick from what is in the folder typed so far, Tab completes, Enter goes there (a file opens its folder and is selected), Escape closes.

### Date groups

`group="modified"` puts the list view's entries under Finder's date headings: Today, Yesterday, Previous 7 Days, Previous 30 Days, then this year's months, then years. Entries keep their usual order inside each group; search results stay ungrouped.

Grouping uses [`Temporal`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal), without a polyfill. Chrome and Edge 144+ and Firefox 139+ have it; Safari (macOS and iOS) does not yet, only its Technology Preview. Where `Temporal` is missing the list stays flat; nothing throws. Load a polyfill yourself if you need groups there.

### Links

`href` turns entries into real links. When it returns a string the entry renders as `<a href>` instead of a button, so it is **open on click**: a click (or Enter) follows the link and does not select. Return `undefined` to keep the button for that entry: click selects, double-click or Enter opens.

```svelte
<Finder
	{fs}
	href={(entry) => (entry.kind === 'file' ? `/files${entry.path}` : `?path=${entry.path}`)}
/>
```

### Your own entry data

`FinderFS` and the Finder are generic over the entry type. Extend `FinderEntry` and every callback and snippet receives your type, so per-entry data reaches the rows without a lookup. A document space for RAG:

```svelte
<script lang="ts">
	import { Finder, joinPath, type FinderEntry, type FinderFS } from 'svelte-finder';

	type Doc = FinderEntry & { chunkCount: number; audience: 'public' | 'staff' };

	const fs: FinderFS<Doc> = {
		async list(path) {
			const rows: { name: string; dir: boolean; chunks: number; audience: Doc['audience'] }[] =
				await (await fetch(`/api/space?path=${encodeURIComponent(path)}`)).json();
			return rows.map((row) => ({
				name: row.name,
				path: joinPath(path, row.name),
				kind: row.dir ? 'directory' : 'file',
				chunkCount: row.chunks,
				audience: row.audience
			}));
		}
	};
</script>

<Finder
	{fs}
	view="list"
	entryclass={(doc) => (doc.audience === 'staff' ? 'staff' : undefined)}
	columns={[{ label: 'Chunks', align: 'end', cell: chunks }]}
>
	{#snippet meta(doc, view)}
		{#if view !== 'list'}{doc.chunkCount} chunks{/if}
	{/snippet}
	{#snippet actions()}
		<button onclick={upload}>Upload</button>
	{/snippet}
	{#snippet status({ folders, files, matches })}
		{matches ?? folders + files} items
	{/snippet}
	{#snippet preview(doc, folder)}
		{#if doc}<DocDetail {doc} />{:else}<FolderDetail path={folder} />{/if}
	{/snippet}
</Finder>

{#snippet chunks(doc: Doc)}{doc.chunkCount}{/snippet}
```

- `meta` is trailing content after the name in every view: the end of a column row, the end of the list's name cell, the caption under a tile (replacing the size).
- `columns` adds list-view columns between Name and Size.
- `entryclass` and `entrystyle` go on each entry's element (column item, tile, list row), e.g. a tint per audience. Use `entrystyle` for custom properties; a `background` set inline would hide the hover and selection.
- `preview`, when given, is always shown in the columns view: the selected file, or `null` with the open folder's path. Without it the built-in pane appears only for a selected file.
- `actions` renders at the end of the toolbar; `status` replaces the status bar text (`matches` is `null` unless searching).
- `onentrycontextmenu(entry, event)` fires on right-click; call `event.preventDefault()` to show your own menu.

## Filesystems

The Finder asks a `FinderFS` for one directory at a time. Paths are absolute and `/`-separated (`/`, `/src`, `/src/app.ts`).

```ts
interface FinderFS<E extends FinderEntry = FinderEntry> {
	list(path: string): Promise<E[]>; // any order; reject if not a directory
	watch?(path: string, onChange: () => void): () => void; // optional change feed
	search?(query: string, root: string, opts: { signal: AbortSignal }): Promise<E[]>; // optional
	read?(path: string): Promise<Uint8Array>; // optional: previews
	move?(from: string, to: string): Promise<void>; // optional: drag to move; `to` is the new full path
}

interface FinderEntry {
	name: string;
	path: string;
	kind: 'file' | 'directory';
	size?: number; // bytes
	modified?: number; // epoch milliseconds
	symlink?: boolean;
}
```

Drag a column's right edge to resize it, as in Finder; hold Option to resize every column at once, and double-click the edge to go back to `--finder-column-width`. From the keyboard, the edge is a separator: Left and Right arrows change the width, Enter resets it. Widths last while the Finder is mounted.

Listing happens in the browser only: during server rendering the Finder shows its loading skeleton. A directory that comes back into view (you return to it, or its column reappears) lists again in the background while its old entries stay on screen.

### Search

Without `search`, typing in the search field walks the tree under `root` with `list` (up to 5000 entries) and matches path substrings. A backend that can search on its own (an index, a database) implements `search`: the Finder calls it with the trimmed query instead of walking, shows the results as they come back, and aborts `signal` when the query changes or is cleared.

### Previews and moving

With `read`, the columns view's built-in pane shows a selected image (png, jpg, gif, webp, avif, svg) through a blob URL, and the first lines of a text file. Without it, or for anything else, it shows the icon and the file's kind, size and date.

With `move`, entries can be dragged onto a folder (in every view) or onto a level of the path bar. The Finder calls `move(from, joinPath(folder, name))`, refuses a folder into itself or its own subfolder, and lists again; a failed move shows its message in the status bar. `move` must reject when the target exists. Without `move` nothing is draggable. A drag between two Finders works when both browse the same `fs` object.

### Change events

A backend with `watch` updates the Finder on its own. For one without, wrap it in `withChangeFeed` and call `notify()` after you change something; every Finder on it re-lists. If the backend already has `watch`, its events still arrive, and a `move` through the wrapper notifies by itself.

```ts
import { justBashFS, withChangeFeed } from 'svelte-finder';

const fs = withChangeFeed(justBashFS(bash.fs));
await bash.exec('mkdir docs');
fs.notify();
```

`refresh()` does the same for one Finder:

```svelte
<script lang="ts">
	let finder = $state<ReturnType<typeof Finder>>();
</script>

<Finder bind:this={finder} {fs} />
<button onclick={() => finder?.refresh()}>Reload</button>
```

### Adapters

Every adapter implements `read` and `move`.

| Adapter                         | Backend                                                      | `watch` |
| ------------------------------- | ------------------------------------------------------------ | ------- |
| `memoryFS(tree, { modified }?)` | A nested object. Also `write`, `mkdir`, `remove`.            | yes     |
| `modernMonacoFS(workspace.fs)`  | A modern-monaco `Workspace`, as used by modern-monaco-svelte | yes     |
| `justBashFS(bash.fs)`           | The filesystem of a just-bash `Bash`                         | no      |
| `withChangeFeed(fs)`            | Any `FinderFS`; adds `watch` and `notify()`                  | yes     |

The editor to pair with the Finder is [modern-monaco-svelte](https://mastermakrela.github.io/modern-monaco-svelte/). Give both the same `Workspace`; its `WorkspaceState` keeps the open file, which the editor follows and the Finder can highlight. The adapter only needs the workspace's `fs`, so a plain `modern-monaco` setup works the same.

```svelte
<script lang="ts">
	import { Workspace } from 'modern-monaco';
	import { MonacoEditor, WorkspaceState } from 'modern-monaco-svelte';
	import { Finder, modernMonacoFS } from 'svelte-finder';

	const workspace = new Workspace({ initialFiles: { 'README.md': '# Hi\n' } });
	const files = new WorkspaceState(workspace);
</script>

<Finder
	fs={modernMonacoFS(workspace.fs)}
	selected={files.current ? `/${files.current}` : null}
	onopen={(entry) => files.open(entry.path.slice(1))}
/>
<MonacoEditor {workspace} file={files.current} followHistory />
```

```ts
import { Bash } from 'just-bash';
import { justBashFS, withChangeFeed } from 'svelte-finder';

const bash = new Bash({ files: { '/project/README.md': '# Hi\n' }, cwd: '/project' });
const bashFS = withChangeFeed(justBashFS(bash.fs)); // root="/project", bashFS.notify() after each exec
```

Your own backend is one function that maps a listing onto `FinderEntry`; `joinPath` and `parentPath` are exported for the path arithmetic:

```ts
import { joinPath, type FinderFS } from 'svelte-finder';

export const httpFS = (base: string): FinderFS => ({
	async list(path) {
		const response = await fetch(`${base}/ls?path=${encodeURIComponent(path)}`);
		if (!response.ok) throw new Error(`${path}: ${response.status}`);
		const rows: { name: string; dir: boolean; bytes: number }[] = await response.json();
		return rows.map((row) => ({
			name: row.name,
			path: joinPath(path, row.name),
			kind: row.dir ? 'directory' : 'file',
			size: row.bytes
		}));
	}
});
```

## Props

`E` is the entry type of `fs` (`FinderEntry` unless you extend it).

| Prop                  | Type                                                                    | Default                |
| --------------------- | ----------------------------------------------------------------------- | ---------------------- |
| `fs`                  | `FinderFS<E>`                                                           | required               |
| `root`                | `string`                                                                | `'/'`                  |
| `path` (bindable)     | `string`                                                                | `root`                 |
| `view` (bindable)     | `'icons' \| 'list' \| 'columns'`                                        | `'columns'`            |
| `selected` (bindable) | `string \| null` (a path)                                               | `null`                 |
| `query` (bindable)    | `string` (the search text)                                              | `''`                   |
| `searchable`          | `boolean` (shows the search field)                                      | `true`                 |
| `rootLabel`           | `string` (root crumb label)                                             | last segment of `root` |
| `onopen`              | `(entry: E) => void`                                                    |                        |
| `href`                | `(entry: E) => string \| undefined` (renders `<a href>`, open on click) |                        |
| `onentrycontextmenu`  | `(entry: E, event: MouseEvent) => void`                                 |                        |
| `entryclass`          | `(entry: E) => string \| undefined`                                     |                        |
| `entrystyle`          | `(entry: E) => string \| undefined`                                     |                        |
| `meta`                | `Snippet<[E, FinderView]>`                                              |                        |
| `columns`             | `{ label, align?: 'start' \| 'end', cell: Snippet<[E]> }[]`             |                        |
| `group`               | `'modified' \| null` (list view date headings, needs `Temporal`)        | `null`                 |
| `preview`             | `Snippet<[E \| null, folder: string]>`                                  | image or text, facts   |
| `icon`                | `Snippet<[E, 'small' \| 'large', builtin: Snippet]>`                    | built-in icons         |
| `toolbar`             | `boolean`                                                               | `true`                 |
| `statusbar`           | `boolean`                                                               | `true`                 |
| `actions`             | `Snippet` (end of the toolbar)                                          |                        |
| `status`              | `Snippet<[{ folders, files, matches: number \| null }]>`                |                        |
| `class`               | `string`                                                                |                        |

Reached with `bind:this`: `refresh()` lists the visible directories again and restarts a running search; `back()`, `forward()`, `go(index)` and `history` are the navigation history; `goToFolder()` opens Go to folder.

## Styling

The Finder ships a neutral light look. Every colour, font and size is a custom property with that look as its fallback; set them on any ancestor.

| Variable                | Default                    | Paints                                              |
| ----------------------- | -------------------------- | --------------------------------------------------- |
| `--finder-bg`           | `oklch(1 0 0)`             | Window background, the search field                 |
| `--finder-fg`           | `oklch(0.145 0 0)`         | Names, the current path crumb                       |
| `--finder-muted-fg`     | `oklch(0.556 0 0)`         | Sizes, dates, chevrons, the status bar              |
| `--finder-border`       | `oklch(0.922 0 0)`         | Toolbar, list, column and status bar rules          |
| `--finder-hover-bg`     | `oklch(0.97 0 0)`          | Hovered rows, the pressed view button, open folders |
| `--finder-selected-bg`  | `oklch(0.205 0 0)`         | The selected entry                                  |
| `--finder-selected-fg`  | `oklch(0.985 0 0)`         | Text on the selected entry                          |
| `--finder-accent`       | `oklch(0.556 0 0 / 0.2)`   | The fill of folder icons                            |
| `--finder-font`         | `ui-sans-serif, system-ui` | The toolbar, headers, kinds and dates               |
| `--finder-mono`         | `ui-monospace, Menlo`      | Entry names and path crumbs                         |
| `--finder-radius`       | `0`                        | Corners of the window, rows and buttons             |
| `--finder-column-width` | `16rem`                    | Each column in the columns view, until dragged      |
| `--finder-icon-size`    | `3.5rem`                   | Large icons: the icons view and the detail pane     |

```css
.my-finder {
	--finder-bg: #2b211b;
	--finder-fg: #f3e7d6;
	--finder-selected-bg: #e2a55a;
	--finder-selected-fg: #2b211b;
}
```

These variables and the `data-*` attributes below are the stable styling surface; the rest of the markup and its class names are private and may change in any release.

| Attribute       | On                                                            | Values                     |
| --------------- | ------------------------------------------------------------- | -------------------------- |
| `data-view`     | The Finder's root element                                     | `icons`, `list`, `columns` |
| `data-path`     | Every entry element (column item, tile, list row)             | The entry's absolute path  |
| `data-kind`     | Every entry element                                           | `file`, `directory`        |
| `data-selected` | Every entry element                                           | `true`, `false`            |
| `data-open`     | Column items: the folder whose contents the next column shows | `true`, `false`            |
| `data-drop`     | Folder entries and path levels, while a drag is over them     | `true`, `false`            |

## License

[MIT](./LICENSE)
