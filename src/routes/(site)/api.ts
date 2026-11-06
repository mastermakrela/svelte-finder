/** The reference tables of the API section: [name, type, what it does]. */
export const API: {
	name: string;
	note?: string;
	props: [string, string, string][];
}[] = [
	{
		name: 'Finder',
		note: 'Fills its container: give the parent, or the Finder through `class`, a height.',
		props: [
			[
				'fs',
				'FinderFS<E>',
				'The filesystem to browse. Required. The Finder is generic over its entry type E, so every callback and snippet below receives your own entry type.'
			],
			[
				'root',
				"string (default '/')",
				'Where the path bar starts. Navigation and search never go above it, and a path outside it falls back to it.'
			],
			[
				'path (bindable)',
				'string',
				'The open directory. Defaults to root. Opening a folder writes it back; assigning it navigates.'
			],
			[
				'view (bindable)',
				"'icons' | 'list' | 'columns'",
				'How the directory is laid out. Defaults to columns. The toolbar switch writes it back.'
			],
			[
				'selected (bindable)',
				'string | null',
				'Path of the selected entry, or null. Highlighted while its folder is open or it matches the search.'
			],
			[
				'query (bindable)',
				"string (default '')",
				'The search text. Anything but whitespace shows the matches under root instead of the folder.'
			],
			[
				'searchable',
				'boolean (default true)',
				'Shows the search field. Without fs.search it matches path substrings across the whole tree under root.'
			],
			[
				'rootLabel',
				'string',
				'Label of the root crumb in the path bar. Defaults to the last segment of root.'
			],
			[
				'onopen',
				'(entry: E) => void',
				'A file was double-clicked or opened with Enter (or clicked by a keyboard or screen reader, which have no double-click). A single click only selects; in the columns view it also opens a folder as the next column. Folders open in place instead of calling this.'
			],
			[
				'href',
				'(entry: E) => string | undefined',
				'A URL renders the entry as a link: a click or Enter follows it instead of selecting.'
			],
			[
				'onentrycontextmenu',
				'(entry: E, event: MouseEvent) => void',
				'Right-click on an entry. Call event.preventDefault() to replace the browser menu.'
			],
			[
				'entryclass',
				'(entry: E) => string | undefined',
				'Extra class on each entry: column item, tile or list row.'
			],
			[
				'entrystyle',
				'(entry: E) => string | undefined',
				'Inline style on each entry: column item, tile or list row.'
			],
			[
				'meta',
				'Snippet<[E, FinderView]>',
				'Trailing content after a name: at the end of a column row or the list name cell, under a tile.'
			],
			[
				'columns',
				'{ label, align?, cell: Snippet<[E]> }[]',
				"Extra list-view columns between Name and Size. align is 'start' or 'end'."
			],
			[
				'group',
				"'modified' | null (default null)",
				"List view: puts the open folder's entries under Finder's date headings (Today, Yesterday, Previous 7 Days, Previous 30 Days, this year's months, then years), sorted as usual inside each. Search results stay ungrouped. Needs Temporal: in a browser without it (Safari today) the list stays flat."
			],
			[
				'preview',
				'Snippet<[E | null, folder: string]>',
				"Fills the columns view pane, which is always shown when this is given: the selected file, or null and the open folder. Without it the pane shows the selected file's facts, and with fs.read an image (png, jpg, gif, webp, avif, svg) or the start of a text file."
			],
			[
				'icon',
				"Snippet<[E, 'small' | 'large', builtin: Snippet]>",
				'Replaces the icon of every entry: small in the list and columns views, large in icons. Render builtin() for the entries you leave alone.'
			],
			[
				'toolbar',
				'boolean (default true)',
				'Shows the toolbar: Back and Forward, view switch, path bar, Go to folder, search field and actions.'
			],
			['actions', 'Snippet', 'Rendered at the end of the toolbar.'],
			[
				'statusbar',
				'boolean (default true)',
				'Shows the folder and file count, or the match count while searching.'
			],
			[
				'status',
				'Snippet<[{ folders, files, matches }]>',
				'Replaces the status bar text. matches is null unless a search is running.'
			],
			['class', 'string', 'Added to the root element.'],
			[
				'refresh()',
				'() => void',
				'Lists the visible directories again and restarts a running search. Reach it with bind:this.'
			],
			[
				'back(), forward()',
				'() => void',
				"Open the previous or next folder in the history, as the toolbar's Back and Forward buttons do. Through bind:this."
			],
			[
				'go(index)',
				'(index: number) => void',
				'Open the folder at history.paths[index]. Through bind:this.'
			],
			[
				'history',
				'{ readonly paths: string[]; readonly index: number }',
				'The folders the Finder has shown, oldest first, and the index of the open one; reactive. Opening a folder after going back drops the forward part, as in a browser. Through bind:this.'
			],
			[
				'goToFolder()',
				'() => void',
				'Shows Go to folder, as the toolbar button and Cmd/Ctrl+Shift+G (while the Finder has focus) do: type a path, Tab completes, Enter goes there, Escape closes.'
			]
		]
	},
	{
		name: 'Adapters',
		note: 'Each returns a `FinderFS`. None imports its backend: they type the slice of it they call, so the backend is your dependency, not this package’s.',
		props: [
			[
				'memoryFS(tree)',
				'(tree: MemoryTree, options?: { modified?: (path: string) => number }) => MemoryFS',
				'An in-memory tree: a string or Uint8Array is a file, an object a directory. Implements watch, read and move, and adds write(path, content), mkdir(path) and remove(path).'
			],
			[
				'modernMonacoFS(fs)',
				'(fs: Workspace["fs"]) => FinderFS',
				'The filesystem of a modern-monaco Workspace, as used by modern-monaco-svelte. Implements watch, so editor saves show up, and read and move through readFile and rename.'
			],
			[
				'justBashFS(fs)',
				'(fs: Bash["fs"]) => FinderFS',
				'The filesystem of a just-bash shell. Implements read and move (readFileBuffer, mv; an existing target is refused). No watch of its own: wrap it in withChangeFeed.'
			],
			[
				'withChangeFeed(fs)',
				'(fs: FinderFS<E>) => FinderFS<E> & { notify() }',
				'Adds watch to a backend without change events: call notify() after you change something and every Finder on it lists again. Events of an existing watch still arrive; a move through it notifies by itself.'
			]
		]
	},
	{
		name: 'Types and helpers',
		props: [
			[
				'FinderEntry',
				'{ name, path, kind, size?, modified?, symlink? }',
				"An entry: base name, absolute path, 'file' or 'directory', size in bytes and modification time in epoch milliseconds when the backend knows them. symlink marks a link; kind is its target's."
			],
			[
				'FinderFS<E>',
				'{ list, watch?, search?, read?, move? }',
				"list(path) resolves the entries of a directory and rejects for anything else. watch(path, onChange) returns an unsubscribe. search(query, root, { signal }) replaces the tree walk with your own search and is aborted when the query changes. read(path) resolves a file's bytes, for the preview of images and text. move(from, to) moves an entry to its new full path and rejects if that exists; with it entries drag onto folders and path levels."
			],
			['FinderView', "'icons' | 'list' | 'columns'", 'Type of the view prop.'],
			[
				'joinPath(dir, name)',
				'string',
				"'/a' and 'b' give '/a/b'; the root never doubles its slash."
			],
			['parentPath(path)', 'string', "'/a/b' gives '/a', '/a' and '/' give '/'."]
		]
	}
];
