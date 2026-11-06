import adapter from '@sveltejs/adapter-static';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Every route is prerendered (see src/routes/+layout.ts), so no SPA fallback.
			adapter: adapter(),

			paths: {
				// The site lives at finder.mastermakrela.com, served from /. Forks hosting under a sub-path: BASE_PATH=/<repo> bun run build
				base: (process.env.BASE_PATH ?? '') as '' | `/${string}`
			}
		})
	],

	test: {
		expect: { requireAssertions: true },
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
