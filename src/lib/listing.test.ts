import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryFS } from './adapters/memory.js';
import type { FinderEntry, FinderFS } from './fs.js';
import { FinderCache } from './listing.svelte.js';

const tree = { 'readme.md': 'hi', src: { 'app.ts': 'x', 'readme.ts': 'y' } };

/** Resolves once `get()` stops being undefined, polling the microtask queue. */
async function until<T>(get: () => T | undefined): Promise<T> {
	for (let i = 0; i < 100; i++) {
		const v = get();
		if (v !== undefined) return v;
		await new Promise((r) => setTimeout(r, 0));
	}
	throw new Error('timed out');
}

describe('FinderCache.search', () => {
	// listing only runs in a browser; the Finder renders a skeleton on the server
	beforeEach(() => void vi.stubGlobal('document', {}));
	afterEach(() => void vi.unstubAllGlobals());

	it('walks the tree with list() when the backend has no search', async () => {
		const search = new FinderCache(memoryFS(tree)).search('/', 'README');
		const got = await until(() => (search.done ? search.entries : undefined));
		expect(got.map((e) => e.path).sort()).toEqual(['/readme.md', '/src/readme.ts']);
	});

	it('calls the backend search instead of listing, and aborts the previous query', async () => {
		const list = vi.fn(async (): Promise<FinderEntry[]> => []);
		const signals: AbortSignal[] = [];
		const fs: FinderFS = {
			list,
			async search(query, root, { signal }) {
				signals.push(signal);
				return [{ name: query, path: `${root}${query}`, kind: 'file' }];
			}
		};
		const cache = new FinderCache(fs);
		cache.search('/', 'a');
		await new Promise((r) => setTimeout(r, 0));
		cache.search('/', 'ab');
		cache.search('/', 'abc');
		const second = cache.search('/', 'abc');
		const got = await until(() => (second.done ? second.entries : undefined));
		expect(got).toEqual([{ name: 'abc', path: '/abc', kind: 'file' }]);
		// 'a' was running when 'ab' came; 'ab' was replaced before it reached the backend
		expect(signals.map((s) => s.aborted)).toEqual([true, false]);
		expect(list).not.toHaveBeenCalled();
	});

	it('lists nothing on the server', () => {
		vi.unstubAllGlobals();
		const list = vi.fn(async (): Promise<FinderEntry[]> => []);
		const cache = new FinderCache({ list });
		cache.dir('/');
		cache.search('/', 'x');
		expect(list).not.toHaveBeenCalled();
	});
});
