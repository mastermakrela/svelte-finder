// Hashed asset files: cacheable and kept out of the page's JS; each demo fetches them when it mounts.
const urls = import.meta.glob<string>('./photos/*', {
	query: '?url',
	import: 'default',
	eager: true
});
const name = (path: string) => path.slice('./photos/'.length);

/** The photo file names, known at build time so listings show them before the bytes arrive. */
export const PHOTO_NAMES = Object.keys(urls).map(name);

let loading: Promise<[name: string, bytes: Uint8Array][]> | undefined;

/** The photos' bytes, fetched once and in parallel for every demo on the page. */
export const loadPhotos = () =>
	(loading ??= Promise.all(
		Object.entries(urls).map(async ([path, url]): Promise<[string, Uint8Array]> => [
			name(path),
			new Uint8Array(await (await fetch(url)).arrayBuffer())
		])
	));
