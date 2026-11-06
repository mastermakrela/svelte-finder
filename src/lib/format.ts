import type { FinderEntry } from './fs.js';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** Decimal units (1000), matching the labels: `512 B`, `2.4 MB`. `—` when unknown. */
export function fmtBytes(bytes: number | undefined): string {
	if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return '—';
	let value = bytes;
	let step = 0;
	while (value >= 1000 && step < UNITS.length - 1) {
		value /= 1000;
		step += 1;
	}
	return `${value.toLocaleString(undefined, { maximumFractionDigits: step === 0 ? 0 : 1 })} ${UNITS[step]}`;
}

export function fmtDate(ms: number | undefined): string {
	return ms === undefined ? '—' : new Date(ms).toLocaleString();
}

/** Lower-case extension without the dot; `''` for none and for dotfiles like `.gitignore`. */
/** Extensions every current browser renders in an `<img>`, with the type the blob needs to render. */
const IMAGES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	avif: 'image/avif',
	svg: 'image/svg+xml'
};

/** The MIME type of a file name the browser shows as an image, else undefined. */
export const imageType = (name: string): string | undefined => IMAGES[extensionOf(name)];

export function extensionOf(name: string): string {
	const dot = name.lastIndexOf('.');
	return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Folders first, then by name as a person reads it (`file2` before `file10`). */
export function sortEntries<E extends FinderEntry>(entries: E[]): E[] {
	return [...entries].sort(
		(a, b) =>
			(a.kind === b.kind ? 0 : a.kind === 'directory' ? -1 : 1) ||
			a.name.localeCompare(b.name, undefined, { numeric: true })
	);
}

/**
 * Finder's date group for a modification time: Today, Yesterday, Previous 7 Days, Previous 30 Days,
 * then a month of this year, then a year. `rank` orders the groups, newest first. Days are calendar
 * days in `now`'s time zone. Needs `Temporal`.
 */
export function dateGroup(
	ms: number | undefined,
	now: Temporal.ZonedDateTime,
	locale?: string
): { rank: number; label: string } {
	if (ms === undefined) return { rank: Infinity, label: 'No date' };
	const today = now.toPlainDate();
	const day = Temporal.Instant.fromEpochMilliseconds(ms)
		.toZonedDateTimeISO(now.timeZoneId)
		.toPlainDate();
	const ago = day.until(today).days;
	if (ago <= 0) return { rank: 0, label: 'Today' };
	if (ago === 1) return { rank: 1, label: 'Yesterday' };
	if (ago <= 7) return { rank: 2, label: 'Previous 7 Days' };
	if (ago <= 30) return { rank: 3, label: 'Previous 30 Days' };
	if (day.year === today.year) {
		return { rank: 16 - day.month, label: day.toLocaleString(locale, { month: 'long' }) };
	}
	return { rank: 16 + today.year - day.year, label: String(day.year) };
}
