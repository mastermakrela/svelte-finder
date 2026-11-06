<script lang="ts">
	import { Finder, justBashFS, withChangeFeed } from '#lib';
	import { Bash } from 'just-bash/browser';

	import Demo from './Demo.svelte';
	import Shell from './Shell.svelte';

	const bash = new Bash({
		cwd: '/project',
		files: {
			'/project/README.md': '# project\n',
			'/project/src/index.ts': "export * from './lib';\n",
			'/project/src/lib.ts': 'export const answer = 42;\n'
		}
	});
	// just-bash has no change events: withChangeFeed adds a watch that fires on notify().
	const fs = withChangeFeed(justBashFS(bash.fs));

	async function run(line: string) {
		const { stdout, stderr } = await bash.exec(line);
		fs.notify();
		return stdout + stderr;
	}
</script>

<Demo tall>
	<Finder {fs} root="/project" rootLabel="project" view="list" class="h-full" />
	{#snippet footer()}
		<Shell
			class="h-66 sm:h-50"
			{run}
			empty="Output appears here."
			examples={[
				'mkdir -p docs/notes',
				'touch docs/todo.md',
				'echo "hello" > hello.txt',
				'rm -r src',
				'ls -la'
			]}
		/>
	{/snippet}
</Demo>
