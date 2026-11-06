import type { Snippet } from 'svelte';
import { sortEntries } from './format.js';
import { parentPath, type FinderEntry, type FinderFS } from './fs.js';

export type View = 'icons' | 'list' | 'columns';

export const SEARCH_LIMIT = 5000;

/** Server rendering shows the skeleton: listing there would run every backend on the server. */
const live = () => typeof document !== 'undefined';

/** One directory's listing. A reload keeps the old entries on screen until the new ones land. */
export class Dir<E extends FinderEntry = FinderEntry> {
	entries = $state.raw<E[]>();
	error = $state.raw<Error>();
	/** A load has finished once; plain so reading it tracks nothing. */
	settled = false;
	#fs: FinderFS<E>;
	#path: string;
	#seq = 0;

	constructor(fs: FinderFS<E>, path: string) {
		this.#fs = fs;
		this.#path = path;
		this.load();
	}

	load() {
		if (!live()) return;
		const seq = ++this.#seq;
		// deferred a microtask: Dirs are created inside deriveds, where a backend writing $state would throw;
		// async, so a backend that throws synchronously still lands in `error`
		(async () => {
			await null;
			return this.#fs.list(this.#path);
		})().then(
			(list) => {
				if (seq !== this.#seq) return;
				this.settled = true;
				this.entries = sortEntries(list);
				this.error = undefined;
			},
			(err) => {
				if (seq !== this.#seq) return;
				this.settled = true;
				this.error = err instanceof Error ? err : new Error(String(err));
			}
		);
	}
}

/** What the Finder shows while searching, from the backend's `search` or a walk. */
export interface Search<E extends FinderEntry = FinderEntry> {
	readonly entries: E[];
	readonly done: boolean;
	/** The walk stopped at SEARCH_LIMIT entries. */
	readonly capped: boolean;
	readonly error: Error | undefined;
}

/** Breadth-first walk of everything under `root`, for search. Stops at SEARCH_LIMIT entries. */
export class Walk<E extends FinderEntry = FinderEntry> {
	entries = $state.raw<E[]>([]);
	done = $state(false);
	capped = $state(false);
	#stopped = false;

	constructor(fs: FinderFS<E>, root: string) {
		if (live()) void this.#run(fs, root);
	}

	stop() {
		this.#stopped = true;
	}

	async #run(fs: FinderFS<E>, root: string) {
		await null; // out of the derived that created this walk, like Dir.load
		const queue = [root];
		// for…of also visits what the loop appends
		for (const dir of queue) {
			let list: E[] = [];
			try {
				list = await fs.list(dir);
			} catch {
				// an unreadable directory shouldn't end the search
			}
			if (this.#stopped) return;
			const room = SEARCH_LIMIT - this.entries.length;
			this.capped = list.length > room;
			list = list.slice(0, room);
			this.entries = [...this.entries, ...list];
			for (const e of list) if (e.kind === 'directory') queue.push(e.path);
			if (this.capped) break;
		}
		this.done = true;
	}
}

/** One call to the backend's `search`; `stop()` aborts it. */
class HookSearch<E extends FinderEntry> implements Search<E> {
	entries = $state.raw<E[]>([]);
	done = $state(false);
	error = $state.raw<Error>();
	readonly capped = false;
	#controller = new AbortController();

	constructor(search: NonNullable<FinderFS<E>['search']>, query: string, root: string) {
		if (!live()) return;
		const signal = this.#controller.signal;
		(async () => {
			await null; // out of the derived that started this search, like Dir.load
			return signal.aborted ? [] : search(query, root, { signal });
		})().then(
			(list) => {
				if (signal.aborted) return;
				this.entries = list;
				this.done = true;
			},
			(err) => {
				if (signal.aborted) return;
				this.error = err instanceof Error ? err : new Error(String(err));
				this.done = true;
			}
		);
	}

	get stopped() {
		return this.#controller.signal.aborted;
	}

	stop() {
		this.#controller.abort();
	}
}

/** Listings and search for one `fs`; a new `fs` gets a new cache. */
export class FinderCache<E extends FinderEntry = FinderEntry> {
	#fs: FinderFS<E>;
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a cache filled from inside deriveds; a reactive map would make that write unsafe
	#dirs = new Map<string, Dir<E>>();
	#shown: string[] = [];
	#walk: { key: string; walk: Walk<E> } | undefined;
	#hook: { key: string; search: HookSearch<E> } | undefined;
	#version = $state(0);

	constructor(fs: FinderFS<E>) {
		this.#fs = fs;
	}

	dir(path: string): Dir<E> {
		let dir = this.#dirs.get(path);
		if (!dir) this.#dirs.set(path, (dir = new Dir(this.#fs, path)));
		return dir;
	}

	/** Stale-while-revalidate: a cached directory that comes back into view lists again in the background. */
	show(visible: string[]) {
		for (const path of visible) {
			const dir = this.#dirs.get(path);
			if (dir?.settled && !this.#shown.includes(path)) dir.load();
		}
		this.#shown = visible;
	}

	walk(root: string): Walk<E> {
		const key = `${this.#version}:${root}`;
		if (this.#walk?.key !== key) {
			this.#walk?.walk.stop();
			this.#walk = { key, walk: new Walk(this.#fs, root) };
		}
		return this.#walk.walk;
	}

	/** Entries under `root` matching `query` (trimmed, non-empty): the backend's `search` when it has one, else a walk filtered by path. */
	search(root: string, query: string): Search<E> {
		const search = this.#fs.search;
		if (search) {
			const key = `${this.#version}:${root}:${query}`;
			if (this.#hook?.key !== key || this.#hook.search.stopped) {
				this.#hook?.search.stop();
				this.#hook = { key, search: new HookSearch(search.bind(this.#fs), query, root) };
			}
			return this.#hook.search;
		}
		const walk = this.walk(root);
		const q = query.toLowerCase();
		const skip = root === '/' ? 1 : root.length + 1;
		return {
			get entries() {
				return walk.entries.filter((e) => e.path.slice(skip).toLowerCase().includes(q));
			},
			get done() {
				return walk.done;
			},
			get capped() {
				return walk.capped;
			},
			error: undefined
		};
	}

	/** Abort a running backend search (the query was cleared). */
	stopSearch() {
		this.#hook?.search.stop();
	}

	/** Re-list `visible` in place, forget every other directory, restart search on next use. */
	refresh(visible: string[]) {
		for (const [path, dir] of this.#dirs) {
			if (visible.includes(path)) dir.load();
			else this.#dirs.delete(path);
		}
		this.#hook?.search.stop();
		this.#version += 1;
	}

	dispose() {
		this.#walk?.walk.stop();
		this.#hook?.search.stop();
	}
}

/** The folders a Finder has shown, oldest first, and which one is open. */
export interface FinderHistory {
	readonly paths: readonly string[];
	readonly index: number;
}

/** Back and forward over the folders a Finder has shown, as in a browser. */
export class NavHistory implements FinderHistory {
	paths = $state.raw<string[]>([]);
	index = $state(-1);

	/** `path` is open now: a new folder drops everything forward of the current one. */
	visit(path: string) {
		if (this.paths[this.index] === path) return;
		this.paths = [...this.paths.slice(0, this.index + 1), path];
		this.index = this.paths.length - 1;
	}

	/** Make `index` current and return its path; undefined when out of range. */
	go(index: number): string | undefined {
		if (index < 0 || index >= this.paths.length) return undefined;
		this.index = index;
		return this.paths[index];
	}
}

/** The entry being dragged, from any Finder on the page: `dragover` can't read the drag's data,
 *  and a Finder over another `fs` must refuse it. */
let dragged: { fs: object; path: string } | undefined;

/** Drag-to-move for one Finder whose `fs` can move: entries drag, folders and path levels take drops. */
export class Mover {
	/** The folder a drag hovers, to highlight it. */
	over = $state<string>();
	#fs: object;
	#move: (from: string, folder: string) => void;

	constructor(fs: object, move: (from: string, folder: string) => void) {
		this.#fs = fs;
		this.#move = move;
	}

	#accepts(folder: string) {
		if (dragged?.fs !== this.#fs) return false;
		const from = dragged.path;
		return folder !== from && !folder.startsWith(`${from}/`) && parentPath(from) !== folder;
	}

	source(path: string) {
		return {
			draggable: true,
			ondragstart: (event: DragEvent) => {
				dragged = { fs: this.#fs, path };
				event.dataTransfer?.setData('text/plain', path);
				if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
			},
			ondragend: () => {
				dragged = undefined;
				this.over = undefined;
			}
		};
	}

	target(folder: string) {
		return {
			'data-drop': this.over === folder,
			ondragover: (event: DragEvent) => {
				// a folder entry inside a column target took the drag already
				if (event.defaultPrevented || !this.#accepts(folder)) return;
				event.preventDefault();
				if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
				this.over = folder;
			},
			ondragleave: (event: DragEvent) => {
				const into = event.relatedTarget;
				if (
					into instanceof Node &&
					event.currentTarget instanceof Node &&
					event.currentTarget.contains(into)
				)
					return;
				if (this.over === folder) this.over = undefined;
			},
			ondrop: (event: DragEvent) => {
				if (!dragged || !this.#accepts(folder)) return;
				event.preventDefault();
				const from = dragged.path;
				dragged = undefined;
				this.over = undefined;
				this.#move(from, folder);
			}
		};
	}
}

/** Everything an entry element needs from the Finder, handed to every view. */
export interface EntryContext<E extends FinderEntry = FinderEntry> {
	/** Click: highlight (in columns, a folder also opens as the next column). */
	onselect: (entry: E) => void;
	/** Double-click or Enter: open a folder, or hand a file to `onopen`. */
	onactivate: (entry: E) => void;
	href?: (entry: E) => string | undefined;
	oncontextmenu?: (entry: E, event: MouseEvent) => void;
	entryclass?: (entry: E) => string | undefined;
	entrystyle?: (entry: E) => string | undefined;
	icon?: Snippet<[entry: E, size: 'small' | 'large', builtin: Snippet]>;
	meta?: Snippet<[entry: E, view: View]>;
	/** Present when the fs can move. */
	mover?: Mover;
}

/** The element behind an entry: an `<a href>` when `href` gives one (a click follows it), else a button.
 *  A click selects and a double-click activates, as in Finder. A click with `detail` 0 comes from a
 *  keyboard or assistive technology, which has no double-click, so it activates; Enter is taken over
 *  so it activates instead of clicking. */
export function entryElement<E extends FinderEntry>(
	entry: E,
	ctx: EntryContext<E>,
	pressed: boolean | undefined
) {
	const href = ctx.href?.(entry);
	const oncontextmenu =
		ctx.oncontextmenu && ((event: MouseEvent) => ctx.oncontextmenu?.(entry, event));
	const drag = ctx.mover && {
		...ctx.mover.source(entry.path),
		...(entry.kind === 'directory' ? ctx.mover.target(entry.path) : {})
	};
	if (href !== undefined) return { tag: 'a', attrs: { href, oncontextmenu, ...drag } } as const;
	return {
		tag: 'button',
		attrs: {
			...drag,
			type: 'button',
			'aria-pressed': pressed,
			oncontextmenu,
			onclick: (event: MouseEvent) => (event.detail === 0 ? ctx.onactivate : ctx.onselect)(entry),
			ondblclick: () => ctx.onactivate(entry),
			onkeydown: (event: KeyboardEvent) => {
				if (event.key !== 'Enter') return;
				event.preventDefault();
				ctx.onactivate(entry);
			}
		}
	} as const;
}
