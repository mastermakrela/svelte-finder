import { InMemoryFs } from 'just-bash';
import type { IFileSystem } from 'just-bash';
import type { FileSystem } from 'modern-monaco';
import { describe, expect, it } from 'vitest';
import { joinPath, parentPath, type FinderFS } from '../fs.js';
import { justBashFS } from './just-bash.js';
import { memoryFS, type MemoryTree } from './memory.js';
import { modernMonacoFS } from './modern-monaco.js';

// Type-level: the real backends must be assignable to the structural params.
export const monacoOk: Parameters<typeof modernMonacoFS>[0] = {} as FileSystem;
export const bashOk: Parameters<typeof justBashFS>[0] = {} as IFileSystem;
export const bashRealOk: Parameters<typeof justBashFS>[0] = new InMemoryFs();

const tree: MemoryTree = {
	'readme.md': 'hello',
	src: { 'app.ts': 'let x = 1;', lib: { 'a.ts': 'a' } },
	empty: {}
};

/** Flatten the fixture into absolute file paths for seeding other backends. */
function files(t: MemoryTree, dir = '/'): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [name, v] of Object.entries(t)) {
		const p = joinPath(dir, name);
		if (typeof v === 'string') out[p] = v;
		else Object.assign(out, files(v as MemoryTree, p));
	}
	return out;
}

function dirs(t: MemoryTree, dir = '/'): string[] {
	return Object.entries(t).flatMap(([name, v]) =>
		typeof v === 'string' || v instanceof Uint8Array
			? []
			: [joinPath(dir, name), ...dirs(v, joinPath(dir, name))]
	);
}

function fakeMonaco() {
	const f = files(tree);
	const d = new Set(['/', ...dirs(tree)]);
	return modernMonacoFS({
		async readDirectory(path) {
			if (!d.has(path)) throw new Error('ENOENT');
			const names = new Map<string, number>();
			for (const p of [...Object.keys(f), ...d]) {
				if (p !== '/' && parentPath(p) === path)
					names.set(p.slice(p.lastIndexOf('/') + 1), d.has(p) ? 2 : 1);
			}
			return [...names];
		},
		async stat(path) {
			if (d.has(path)) return { type: 2, size: 0, mtime: 1 };
			if (path in f) return { type: 1, size: f[path].length, mtime: 1 };
			throw new Error('ENOENT');
		},
		async readFile(path) {
			if (!(path in f)) throw new Error('ENOENT');
			return new TextEncoder().encode(f[path]);
		},
		// like modern-monaco's: refuses an existing target, carries a folder's contents along
		async rename(from, to) {
			if (to in f || d.has(to)) throw new Error('file exists');
			const moved = (p: string) =>
				p === from || p.startsWith(`${from}/`) ? to + p.slice(from.length) : p;
			for (const p of Object.keys(f)) {
				const content = f[p];
				delete f[p];
				f[moved(p)] = content;
			}
			for (const p of [...d]) {
				d.delete(p);
				d.add(moved(p));
			}
		},
		watch: () => () => {}
	});
}

function bash() {
	const fs = new InMemoryFs(files(tree));
	for (const p of dirs(tree)) void fs.mkdir(p, { recursive: true });
	return justBashFS(fs);
}

const backends: [string, () => FinderFS][] = [
	['memoryFS', () => memoryFS(tree)],
	['modernMonacoFS', fakeMonaco],
	['justBashFS', bash]
];

describe.each(backends)('%s contract', (_, make) => {
	it('lists the root with names and kinds', async () => {
		const got = (await make().list('/')).map((e) => [e.name, e.kind]).sort();
		expect(got).toEqual([
			['empty', 'directory'],
			['readme.md', 'file'],
			['src', 'directory']
		]);
	});

	it('lists nested directories with absolute paths', async () => {
		const got = await make().list('/src');
		expect(got.map((e) => e.path).sort()).toEqual(['/src/app.ts', '/src/lib']);
		expect(await make().list('/src/lib')).toHaveLength(1);
		expect(await make().list('/empty')).toEqual([]);
	});

	it('reports file size', async () => {
		const e = (await make().list('/')).find((x) => x.name === 'readme.md');
		expect(e?.size).toBe(5);
	});

	it('rejects for a file path', async () => {
		await expect(make().list('/readme.md')).rejects.toThrow();
	});

	it('rejects for a missing path', async () => {
		await expect(make().list('/nope')).rejects.toThrow();
	});

	it('reads a file as bytes', async () => {
		const bytes = await make().read!('/readme.md');
		expect(new TextDecoder().decode(bytes)).toBe('hello');
	});

	it('moves a file and a folder with its contents', async () => {
		const fs = make();
		await fs.move!('/readme.md', '/src/readme.md');
		await fs.move!('/src/lib', '/empty/lib');
		expect((await fs.list('/')).map((e) => e.name).sort()).toEqual(['empty', 'src']);
		expect((await fs.list('/src')).map((e) => e.name).sort()).toEqual(['app.ts', 'readme.md']);
		expect((await fs.list('/empty/lib')).map((e) => e.name)).toEqual(['a.ts']);
	});

	it('refuses to move onto an existing entry', async () => {
		const fs = make();
		await expect(fs.move!('/readme.md', '/src/app.ts')).rejects.toThrow();
		expect((await fs.list('/')).map((e) => e.name)).toContain('readme.md');
	});
});

describe('justBashFS without readdirWithFileTypes', () => {
	it('falls back to readdir + stat', async () => {
		const fs = new InMemoryFs(files(tree));
		const got = await justBashFS({
			readdir: (p) => fs.readdir(p),
			stat: (p) => fs.stat(p)
		}).list('/src');
		expect(got.map((e) => [e.name, e.kind]).sort()).toEqual([
			['app.ts', 'file'],
			['lib', 'directory']
		]);
	});
});

describe('memoryFS mutations', () => {
	it('reflects write, mkdir and remove', async () => {
		const fs = memoryFS(tree);
		fs.write('/new/deep/f.txt', 'é');
		expect((await fs.list('/new/deep'))[0]).toMatchObject({ name: 'f.txt', size: 2 });
		fs.mkdir('/made');
		expect((await fs.list('/')).map((e) => e.name)).toContain('made');
		expect(new TextDecoder().decode(await fs.read('/new/deep/f.txt'))).toBe('é');
		fs.remove('/new');
		expect((await fs.list('/')).map((e) => e.name)).not.toContain('new');
	});

	it('fires watchers on ancestors and stops after unsubscribe', () => {
		const fs = memoryFS(tree);
		let root = 0;
		let other = 0;
		const off = fs.watch('/', () => root++);
		fs.watch('/empty', () => other++);
		fs.write('/src/lib/b.ts', 'b');
		expect([root, other]).toEqual([1, 0]);
		off();
		fs.write('/src/lib/c.ts', 'c');
		expect(root).toBe(1);
	});
});

describe('memoryFS dates', () => {
	it('seeds and writes the dates it is given', async () => {
		const fs = memoryFS({ a: { b: 'x' } }, { modified: (path) => path.length });
		expect((await fs.list('/a'))[0].modified).toBe('/a/b'.length);
		fs.write('/a/b', 'y', 42);
		expect((await fs.list('/a'))[0].modified).toBe(42);
	});
});
