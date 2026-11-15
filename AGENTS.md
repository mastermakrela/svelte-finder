# Agents

Before using ui-sdk, follow the ui-sdk skill if it's installed, and read `node_modules/@ui-sdk/svelte/docs/llms.txt`. To build a new component, also search `node_modules/@ui-sdk/svelte/docs/core.md` by heading, and read `rendering.md` next to it.

- Use `bun` (`bun install`, `bun run check`, `bun run test`), never npm.
- `src/lib` is the published package (public API in `src/lib/index.ts`); `src/routes/(site)` is the docs site. `@ui-sdk/*` are devDependencies, so `src/lib` must not import them.
