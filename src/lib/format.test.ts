import { describe, expect, it } from 'vitest';
import { dateGroup, fmtBytes, sortEntries } from './format.js';
import type { FinderEntry } from './fs.js';

const entry = (name: string, kind: FinderEntry['kind']): FinderEntry => ({
	name,
	path: `/${name}`,
	kind
});

describe('sortEntries', () => {
	it('puts folders first, then names in reading order', () => {
		const sorted = sortEntries([
			entry('b.txt', 'file'),
			entry('file10', 'file'),
			entry('zeta', 'directory'),
			entry('file2', 'file'),
			entry('Alpha', 'directory')
		]);
		expect(sorted.map((e) => e.name)).toEqual(['Alpha', 'zeta', 'b.txt', 'file2', 'file10']);
	});

	it('does not reorder its input', () => {
		const input = [entry('b', 'file'), entry('a', 'file')];
		sortEntries(input);
		expect(input.map((e) => e.name)).toEqual(['b', 'a']);
	});
});

describe('fmtBytes', () => {
	it('uses decimal B/KB/MB units', () => {
		expect(fmtBytes(0)).toBe('0 B');
		expect(fmtBytes(512)).toBe('512 B');
		expect(fmtBytes(1000)).toBe('1 KB');
		expect(fmtBytes(2_400_000)).toMatch(/^2[.,]4 MB$/);
	});

	it('shows a dash when the size is unknown', () => {
		expect(fmtBytes(undefined)).toBe('—');
	});
});

describe('dateGroup', () => {
	const now = Temporal.ZonedDateTime.from('2026-11-05T10:00[Europe/Berlin]');
	const at = (iso: string) => Temporal.ZonedDateTime.from(iso).epochMilliseconds;
	const label = (iso: string) => dateGroup(at(iso), now, 'en').label;

	it('buckets by calendar day in the time zone of now', () => {
		expect(label('2026-11-05T00:30[Europe/Berlin]')).toBe('Today');
		// 23:30 UTC on the 4th is already the 5th in Berlin
		expect(label('2026-11-04T23:30[UTC]')).toBe('Today');
		expect(label('2026-11-04T23:59[Europe/Berlin]')).toBe('Yesterday');
		expect(label('2026-10-29T12:00[Europe/Berlin]')).toBe('Previous 7 Days');
		expect(label('2026-10-28T12:00[Europe/Berlin]')).toBe('Previous 30 Days');
		expect(label('2026-10-06T12:00[Europe/Berlin]')).toBe('Previous 30 Days');
		expect(label('2026-10-05T12:00[Europe/Berlin]')).toBe('October');
		expect(label('2026-01-01T00:00[Europe/Berlin]')).toBe('January');
		expect(label('2025-12-31T12:00[Europe/Berlin]')).toBe('2025');
	});

	it('lets Previous 30 Days reach into last year', () => {
		const jan = Temporal.ZonedDateTime.from('2027-01-10T10:00[Europe/Berlin]');
		expect(dateGroup(at('2026-12-20T12:00[Europe/Berlin]'), jan).label).toBe('Previous 30 Days');
		expect(dateGroup(at('2026-12-01T12:00[Europe/Berlin]'), jan).label).toBe('2026');
	});

	it('ranks groups newest first, the future as today, no date last', () => {
		const ranks = [
			'2026-11-07T12:00',
			'2026-11-04T12:00',
			'2026-10-30T12:00',
			'2026-10-10T12:00',
			'2026-08-01T12:00',
			'2026-02-01T12:00',
			'2025-06-01T12:00',
			'2019-06-01T12:00'
		].map((d) => dateGroup(at(`${d}[Europe/Berlin]`), now).rank);
		expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
		expect(ranks[0]).toBe(0);
		expect(dateGroup(undefined, now)).toEqual({ rank: Infinity, label: 'No date' });
	});
});
