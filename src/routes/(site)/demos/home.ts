export const HOME = '/home/user';

export const FILES: Record<string, string> = {
	[`${HOME}/README.md`]: `# svelte-finder

A Finder-style file browser for Svelte 5: icons, list and columns views
over any filesystem.

    bun add svelte-finder

Every window on this desktop browses this one just-bash filesystem.
Change a file anywhere and every Finder lists it again.
`,
	[`${HOME}/project/package.json`]: `{
	"name": "fieldnotes",
	"private": true,
	"type": "module",
	"dependencies": {
		"svelte-finder": "^0.1.0"
	}
}
`,
	[`${HOME}/project/src/routes/admin/media/+page.svelte`]: `<script lang="ts">
	import { Finder } from 'svelte-finder';
	import { media } from '$lib/media';

	let cover = $state<string | null>(null);
</script>

<Finder fs={media} root="/media" view="icons" bind:selected={cover} />
`,
	[`${HOME}/project/src/lib/media.ts`]: `import { justBashFS, withChangeFeed } from 'svelte-finder';
import { Bash } from 'just-bash/browser';

const bash = new Bash();
export const media = withChangeFeed(justBashFS(bash.fs));
`,
	[`${HOME}/project/src/app.css`]:
		'body {\n\tmargin: 0;\n\tfont-family: system-ui, sans-serif;\n}\n',
	[`${HOME}/site/posts/westerhever.md`]: `---
title: Westerhever at low tide
cover: /media/beach-rock.avif
---

Out past the salt marsh the mudflats run all the way to the horizon.
`,
	[`${HOME}/site/posts/oystercatchers.md`]: `---
title: Counting oystercatchers
cover: /media/stones.png
---

Forty-two on the sandbank before the tide came back in.
`
};
