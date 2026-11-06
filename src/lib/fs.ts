/**
 * The filesystem a Finder browses. Deliberately tiny: one listing call, an
 * optional change feed, and optional search, read and move. Adapters in `./adapters` map real backends onto it.
 *
 * Paths are absolute and `/`-separated (`/`, `/src`, `/src/app.ts`); the
 * Finder never passes a relative path or a trailing slash (except the root).
 */
export interface FinderEntry {
	/** Base name, no slashes. */
	name: string;
	/** Absolute path of the entry. */
	path: string;
	kind: 'file' | 'directory';
	/** Bytes. Omitted when the backend doesn't know. */
	size?: number;
	/** Last modification, epoch milliseconds. Omitted when the backend doesn't know. */
	modified?: number;
	/** The entry is a symbolic link; `kind` is what it points at when the backend knows, else `file`. */
	symlink?: boolean;
}

/** `E` is your entry type: extend `FinderEntry` with per-entry data and every snippet and callback receives it. */
export interface FinderFS<E extends FinderEntry = FinderEntry> {
	/** Entries of the directory at `path`, in any order; the Finder sorts. Rejects if `path` is not a directory. */
	list(path: string): Promise<E[]>;
	/**
	 * Optional live updates: call `onChange` whenever anything at or below
	 * `path` changes. Returns an unsubscribe function. Backends without
	 * change events leave it out and get one from `withChangeFeed(fs)`, whose `notify()`
	 * the app calls after each mutation.
	 */
	watch?(path: string, onChange: () => void): () => void;
	/**
	 * Optional server-side search: entries under `root` matching `query`, in the order to show them.
	 * When present the Finder calls it instead of walking the tree with `list`, and aborts
	 * `signal` once the query changes.
	 */
	search?(query: string, root: string, opts: { signal: AbortSignal }): Promise<E[]>;
	/** Optional: the bytes of the file at `path`. The built-in preview shows images and the start of text files with it. */
	read?(path: string): Promise<Uint8Array>;
	/**
	 * Optional: move the entry at `from` to `to`, its new full path (not the target folder).
	 * Rejects if `to` exists. When present, entries can be dragged onto folders.
	 */
	move?(from: string, to: string): Promise<void>;
}

/** `/a/b` + `c` → `/a/b/c`; root stays `/`-prefixed and never doubles the slash. */
export function joinPath(dir: string, name: string): string {
	return dir === '/' ? `/${name}` : `${dir}/${name}`;
}

/** `/a/b/c` → `/a/b`; `/a` → `/`; `/` → `/`. */
export function parentPath(path: string): string {
	const i = path.lastIndexOf('/');
	return i <= 0 ? '/' : path.slice(0, i);
}
