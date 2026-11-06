import { joinPath, parentPath, type FinderEntry, type FinderFS } from '../fs.js';

export interface MemoryTree {
	[name: string]: string | Uint8Array | MemoryTree;
}

export interface MemoryFS extends FinderFS {
	watch(path: string, onChange: () => void): () => void;
	write(path: string, content: string | Uint8Array, modified?: number): void;
	mkdir(path: string): void;
	remove(path: string): void;
	read(path: string): Promise<Uint8Array>;
	move(from: string, to: string): Promise<void>;
}

type Node = { content: string | Uint8Array | null; modified: number };

const encoder = new TextEncoder();

/** In-memory FinderFS for demos and tests. */
/** `modified` dates the seeded entries (milliseconds), e.g. to give date grouping something to show. */
export function memoryFS(
	tree: MemoryTree,
	{ modified }: { modified?: (path: string) => number } = {}
): MemoryFS {
	const now = Date.now();
	// Flat path -> node map; content === null marks a directory.
	const nodes = new Map<string, Node>([['/', { content: null, modified: Date.now() }]]);
	const listeners = new Set<{ path: string; onChange: () => void }>();

	const notify = (path: string) => {
		for (let p = path; ; p = parentPath(p)) {
			for (const l of listeners) if (l.path === p) l.onChange();
			if (p === '/') break;
		}
	};

	const mkdirp = (path: string) => {
		if (nodes.get(path)?.content === null) return;
		if (nodes.has(path)) throw new Error(`Not a directory: ${path}`);
		mkdirp(parentPath(path));
		nodes.set(path, { content: null, modified: Date.now() });
	};

	const seed = (dir: string, t: MemoryTree) => {
		for (const [name, v] of Object.entries(t)) {
			const path = joinPath(dir, name);
			if (typeof v === 'string' || v instanceof Uint8Array) {
				nodes.set(path, { content: v, modified: modified?.(path) ?? now });
			} else {
				nodes.set(path, { content: null, modified: modified?.(path) ?? now });
				seed(path, v);
			}
		}
	};
	seed('/', tree);

	return {
		async list(path) {
			if (nodes.get(path)?.content !== null) {
				throw new Error(`Not a directory: ${path}`);
			}
			const out: FinderEntry[] = [];
			for (const [p, n] of nodes) {
				if (p === '/' || parentPath(p) !== path) continue;
				out.push({
					name: p.slice(p.lastIndexOf('/') + 1),
					path: p,
					kind: n.content === null ? 'directory' : 'file',
					size:
						n.content === null
							? undefined
							: typeof n.content === 'string'
								? encoder.encode(n.content).length
								: n.content.length,
					modified: n.modified
				});
			}
			return out;
		},
		watch(path, onChange) {
			const l = { path, onChange };
			listeners.add(l);
			return () => listeners.delete(l);
		},
		write(path, content, modified = Date.now()) {
			mkdirp(parentPath(path));
			if (nodes.get(path)?.content === null) throw new Error(`Is a directory: ${path}`);
			nodes.set(path, { content, modified });
			notify(path);
		},
		mkdir(path) {
			mkdirp(path);
			notify(path);
		},
		remove(path) {
			if (!nodes.has(path) || path === '/') throw new Error(`No such entry: ${path}`);
			for (const p of [...nodes.keys()])
				if (p === path || p.startsWith(`${path}/`)) nodes.delete(p);
			notify(path);
		},
		async read(path) {
			const n = nodes.get(path);
			if (n?.content == null) throw new Error(`Not a file: ${path}`);
			return typeof n.content === 'string' ? encoder.encode(n.content) : n.content;
		},
		async move(from, to) {
			if (from === '/' || !nodes.has(from)) throw new Error(`No such entry: ${from}`);
			if (nodes.has(to)) throw new Error(`Already exists: ${to}`);
			if (to.startsWith(`${from}/`)) throw new Error(`Can't move ${from} into itself`);
			if (nodes.get(parentPath(to))?.content !== null) {
				throw new Error(`Not a directory: ${parentPath(to)}`);
			}
			for (const [p, n] of [...nodes]) {
				if (p !== from && !p.startsWith(`${from}/`)) continue;
				nodes.delete(p);
				nodes.set(to + p.slice(from.length), n);
			}
			notify(from);
			notify(to);
		}
	};
}
