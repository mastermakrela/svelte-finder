import { describe, expect, it } from 'vitest';
import type { FinderEntry } from '../fs.js';
import { withChangeFeed } from './change-feed.js';
import { memoryFS } from './memory.js';

describe('withChangeFeed', () => {
	it('fires every subscriber on notify and stops after unsubscribe', () => {
		const fs = withChangeFeed<FinderEntry>({ list: async () => [] });
		const calls: string[] = [];
		const offA = fs.watch!('/', () => calls.push('a'));
		fs.watch!('/', () => calls.push('b'));
		fs.notify();
		offA();
		fs.notify();
		expect(calls).toEqual(['a', 'b', 'b']);
	});

	it('unsubscribes the same callback per subscription', () => {
		const fs = withChangeFeed<FinderEntry>({ list: async () => [] });
		let n = 0;
		const cb = () => n++;
		const off = fs.watch!('/', cb);
		fs.watch!('/', cb);
		off();
		fs.notify();
		expect(n).toBe(1);
	});

	it('chains the inner watch and passes list and search through', async () => {
		const inner = memoryFS({ a: 'x' });
		const fs = withChangeFeed(inner);
		let n = 0;
		const off = fs.watch!('/', () => n++);
		inner.write('/b', 'y');
		fs.notify();
		off();
		inner.write('/c', 'z');
		fs.notify();
		expect(n).toBe(2);
		expect((await fs.list('/')).map((e) => e.name).sort()).toEqual(['a', 'b', 'c']);
		expect(fs.search).toBeUndefined();
	});

	it('passes read through and notifies after a move', async () => {
		const fs = withChangeFeed(memoryFS({ a: 'x', d: {} }));
		let n = 0;
		fs.watch!('/', () => n++);
		await fs.move!('/a', '/d/a');
		expect(n).toBeGreaterThan(0);
		expect(new TextDecoder().decode(await fs.read!('/d/a'))).toBe('x');
	});

	it('leaves move out when the backend has none', () => {
		expect(withChangeFeed<FinderEntry>({ list: async () => [] }).move).toBeUndefined();
	});
});
