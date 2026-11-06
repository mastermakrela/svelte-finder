<script lang="ts">
	import Hero from './Hero.svelte';
	import Api from './sections/Api.svelte';
	import Filesystems from './sections/Filesystems.svelte';
	import Install from './sections/Install.svelte';
	import QuickStart from './sections/QuickStart.svelte';
	import Selection from './sections/Selection.svelte';
	import Styling from './sections/Styling.svelte';
	import Views from './sections/Views.svelte';
	import SideNav from './SideNav.svelte';
	import Tour from './Tour.svelte';

	const URL = 'https://finder.mastermakrela.com/';
	const TITLE = 'svelte-finder: a Finder-style file browser for Svelte';
	const DESCRIPTION =
		'A Svelte 5 file browser with icons, list and columns views over any filesystem: an in-memory tree, a modern-monaco workspace, a just-bash shell or your own two-method adapter.';
</script>

<svelte:head>
	<title>{TITLE}</title>
	<meta name="description" content={DESCRIPTION} />
	<meta property="og:title" content={TITLE} />
	<meta property="og:description" content={DESCRIPTION} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={URL} />
	<meta property="og:image" content="{URL}og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="canonical" href={URL} />
</svelte:head>

<Hero />
<Tour />
<div
	class="mx-auto grid w-full max-w-[1220px] grid-cols-[minmax(0,1fr)] gap-10 px-5 pt-12 pb-24 min-[900px]:grid-cols-[190px_minmax(0,1fr)] min-[900px]:gap-16 min-[900px]:px-8 min-[900px]:pt-16 min-[900px]:pb-32"
>
	<div class="self-start min-[900px]:sticky min-[900px]:top-24">
		<SideNav />
	</div>
	<main id="content" class="flex max-w-[900px] min-w-0 flex-col gap-14 [counter-reset:section]">
		<Install />
		<QuickStart />
		<Views />
		<Selection />
		<Filesystems />
		<Styling />
		<Api />
	</main>
</div>
