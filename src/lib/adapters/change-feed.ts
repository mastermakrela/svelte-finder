import type { FinderEntry, FinderFS } from '../fs.js';

/**
 * Gives a backend without change events a `watch`: call `notify()` after you change something
 * and every Finder on it re-lists. If `fs` already has `watch`, its events still arrive too.
 * A `move` through it notifies by itself.
 */
export function withChangeFeed<E extends FinderEntry>(
	fs: FinderFS<E>
): FinderFS<E> & { notify(): void } {
	const listeners = new Set<() => void>();
	const notify = () => {
		for (const listener of [...listeners]) listener();
	};
	const move = fs.move?.bind(fs);
	return {
		list: fs.list.bind(fs),
		search: fs.search?.bind(fs),
		read: fs.read?.bind(fs),
		move:
			move &&
			(async (from, to) => {
				await move(from, to);
				notify();
			}),
		watch(path, onChange) {
			// one closure per subscription, so the same callback subscribed twice unsubscribes once
			const listener = () => onChange();
			listeners.add(listener);
			const off = fs.watch?.(path, onChange);
			return () => {
				listeners.delete(listener);
				off?.();
			};
		},
		notify
	};
}
