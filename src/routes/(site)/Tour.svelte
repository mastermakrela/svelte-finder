<script lang="ts">
	import { asset } from '$app/paths';
	import type { Attachment } from 'svelte/attachments';

	// Autoplay only for visitors who have not asked for less motion; the rest get the poster and controls.
	const autoplay: Attachment<HTMLVideoElement> = (video) => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		video.autoplay = true;
		video.play().catch(() => {});
	};
</script>

<div class="border-b bg-well">
	<figure
		class="mx-auto grid w-full max-w-[1220px] grid-cols-[minmax(0,1fr)] items-end gap-4 px-5 py-10 min-[900px]:px-8 min-[1000px]:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] min-[1000px]:gap-14 min-[1000px]:py-14"
	>
		<figcaption class="text-[14px] text-pretty text-muted-foreground max-[999px]:order-last">
			Columns with a file preview, icons and list views, search, and two commands that update both
			Finder windows live. Recorded from the demos on this page.
		</figcaption>
		<video
			class="aspect-[1280/800] w-full border bg-card"
			poster={asset('finder-poster.png')}
			width="1280"
			height="800"
			muted
			loop
			playsinline
			controls
			preload="metadata"
			{@attach autoplay}
		>
			<source src={asset('finder.webm')} type="video/webm" />
			<source src={asset('finder.mp4')} type="video/mp4" />
		</video>
	</figure>
</div>
