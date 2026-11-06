<script lang="ts">
	import '../../app.css';

	import SiteFooter from './SiteFooter.svelte';
	import SiteHeader from './SiteHeader.svelte';

	let { children } = $props();
</script>

<a
	href="#content"
	class="sr-only bg-background px-4 py-2 no-underline focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:px-4 focus:py-2"
>
	Skip to content
</a>
<SiteHeader />
{@render children()}
<SiteFooter />
