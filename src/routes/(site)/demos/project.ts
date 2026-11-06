/**
 * The project every memoryFS demo browses: a small SvelteKit notes app.
 * A string or Uint8Array is a file, an object is a directory.
 */
import type { MemoryFS } from '#lib';

import { loadPhotos, PHOTO_NAMES } from './photos.js';

export type Tree = { [name: string]: string | Uint8Array | Tree };

export const project: Tree = {
	'README.md': `# field-notes

A notebook for the things you notice outside: birds, weather, the
plants that came back after winter.

    bun install
    bun run dev
`,
	'package.json': `{
  "name": "field-notes",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "test": "vitest --run"
  },
  "devDependencies": {
    "@sveltejs/kit": "^3.0.0",
    "svelte": "^5.40.0",
    "vite": "^8.0.0"
  }
}
`,
	'bun.lock': new Uint8Array(84_312),
	'tsconfig.json': `{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": { "strict": true }
}
`,
	'vite.config.ts': `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [sveltekit()] });
`,
	'.gitignore': `node_modules
.svelte-kit
build
`,
	src: {
		'app.html': `<!doctype html>
<html lang="en">
  <head>%sveltekit.head%</head>
  <body>%sveltekit.body%</body>
</html>
`,
		'app.css': `:root {
  --paper: #f7f4ec;
  --ink: #23201b;
}

body {
  background: var(--paper);
  color: var(--ink);
}
`,
		lib: {
			components: {
				'NoteCard.svelte': `<script lang="ts">
  import type { Note } from '../notes.svelte';

  let { note }: { note: Note } = $props();
</script>

<article>
  <h2>{note.title}</h2>
  <time datetime={note.date}>{note.date}</time>
  <p>{note.body}</p>
</article>
`,
				'Sidebar.svelte': `<script lang="ts">
  import { notes } from '../notes.svelte';
</script>

<nav>
  {#each notes.all as note (note.slug)}
    <a href="/notes/{note.slug}">{note.title}</a>
  {/each}
</nav>
`,
				'SearchBox.svelte': `<script lang="ts">
  let { query = $bindable('') } = $props();
</script>

<input type="search" placeholder="Search notes" bind:value={query} />
`
			},
			'notes.svelte.ts': `export type Note = { slug: string; title: string; date: string; body: string };

class Notes {
  all = $state<Note[]>([]);

  add(note: Note) {
    this.all.unshift(note);
  }
}

export const notes = new Notes();
`,
			utils: {
				'dates.ts': `export const day = (date: Date) => date.toISOString().slice(0, 10);
`,
				'slug.ts': `export const slug = (title: string) =>
  title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
`
			}
		},
		routes: {
			'+layout.svelte': `<script lang="ts">
  import '../app.css';
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { children } = $props();
</script>

<Sidebar />
<main>{@render children()}</main>
`,
			'+page.svelte': `<script lang="ts">
  import NoteCard from '$lib/components/NoteCard.svelte';
  import { notes } from '$lib/notes.svelte';
</script>

{#each notes.all as note (note.slug)}
  <NoteCard {note} />
{/each}
`,
			notes: {
				'[slug]': {
					'+page.svelte': `<script lang="ts">
  let { data } = $props();
</script>

<h1>{data.note.title}</h1>
<p>{data.note.body}</p>
`,
					'+page.ts': `import { error } from '@sveltejs/kit';
import { notes } from '$lib/notes.svelte';

export const load = ({ params }) => {
  const note = notes.all.find((note) => note.slug === params.slug);
  if (!note) error(404, 'No such note');
  return { note };
};
`
				}
			}
		}
	},
	static: {
		'favicon.png': new Uint8Array(3_214),
		'robots.txt': `User-agent: *
Allow: /
`,
		fonts: {
			'Fraunces.woff2': new Uint8Array(48_256),
			'Inter.woff2': new Uint8Array(71_904)
		},
		// empty until addPhotos fills them in the browser
		images: Object.fromEntries(PHOTO_NAMES.map((name) => [name, new Uint8Array()]))
	},
	docs: {
		'architecture.md': `# Architecture

Notes live in one runes store (src/lib/notes.svelte.ts). Routes read
from it; nothing talks to a server yet.
`,
		'changelog.md': `## 0.2.0

- Search box filters by title
- Dark paper theme

## 0.1.0

- First notes
`,
		screenshots: {
			'list.png': new Uint8Array(142_330),
			'note.png': new Uint8Array(158_904)
		}
	},
	tests: {
		'dates.test.ts': `import { expect, test } from 'vitest';
import { day } from '../src/lib/utils/dates';

test('day', () => expect(day(new Date('2026-04-02T10:00:00Z'))).toBe('2026-04-02'));
`,
		'slug.test.ts': `import { expect, test } from 'vitest';
import { slug } from '../src/lib/utils/slug';

test('slug', () => expect(slug('Grey heron, river bend')).toBe('grey-heron-river-bend'));
`
	}
};

/** Writes the real photo bytes into a demo's `/static/images`; call it once the demo is in the browser. */
export const addPhotos = (fs: MemoryFS, modified?: (path: string) => number) =>
	loadPhotos().then((photos) => {
		for (const [name, bytes] of photos) {
			const path = `/static/images/${name}`;
			fs.write(path, bytes, modified?.(path));
		}
	});
