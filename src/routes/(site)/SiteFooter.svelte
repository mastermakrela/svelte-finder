<script lang="ts">
	const LINK =
		'text-foreground underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent';
	const KICKER = 'kicker no-underline transition-colors hover:text-foreground';
</script>

<footer class="border-t">
	<div
		class="mx-auto flex w-full max-w-[1220px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-10 text-[13px] text-muted-foreground min-[900px]:px-8"
	>
		<p>
			Created by <a class={LINK} href="https://mastermakrela.com/" rel="noreferrer" target="_blank"
				>mastermakrela</a
			>. MIT licensed. The demos run on
			<a
				class={LINK}
				href="https://mastermakrela.github.io/modern-monaco-svelte/"
				rel="noreferrer"
				target="_blank">modern-monaco-svelte</a
			>,
			<a class={LINK} href="https://github.com/vercel-labs/wterm" rel="noreferrer" target="_blank"
				>wterm</a
			>
			and
			<a
				class={LINK}
				href="https://github.com/vercel-labs/just-bash"
				rel="noreferrer"
				target="_blank">just-bash</a
			>.
		</p>
		<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
			<a
				class={KICKER}
				href="https://www.npmjs.com/package/svelte-finder"
				rel="noreferrer"
				target="_blank">npm</a
			>
			<a
				class={KICKER}
				href="https://github.com/mastermakrela/svelte-finder"
				rel="noreferrer"
				target="_blank">mastermakrela/svelte-finder</a
			>
		</div>
	</div>
</footer>
