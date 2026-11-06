<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { on } from 'svelte/events';

	import { GROUPS, SECTIONS } from './nav.js';

	let active = $state(SECTIONS[0].id);

	// The last section whose top has scrolled past the header is the current one.
	// Read on every scroll: an IntersectionObserver only fires on crossings, and
	// a section's top reaches the line well after the previous bottom left it.
	const track: Attachment = () => {
		const targets = SECTIONS.map(({ id }) => document.getElementById(id)).filter(
			(target) => target !== null
		);
		const update = () => {
			active =
				targets.findLast((target) => target.getBoundingClientRect().top <= 120)?.id ??
				SECTIONS[0].id;
		};
		update();
		const offScroll = on(window, 'scroll', update, { passive: true });
		const offResize = on(window, 'resize', update);

		return () => {
			offScroll();
			offResize();
		};
	};
</script>

<nav
	aria-label="Sections"
	class="no-scrollbar -mx-5 flex gap-x-8 overflow-x-auto border-b px-5 pb-3 min-[900px]:mx-0 min-[900px]:flex-col min-[900px]:gap-8 min-[900px]:overflow-visible min-[900px]:border-b-0 min-[900px]:px-0 min-[900px]:pb-0"
	{@attach track}
>
	{#each GROUPS as group (group.title)}
		<div class="flex items-center gap-x-6 min-[900px]:block">
			<strong class="kicker hidden text-muted-foreground min-[900px]:block">{group.title}</strong>
			<ul
				class="flex list-none gap-x-5 p-0 min-[900px]:mt-3 min-[900px]:flex-col min-[900px]:gap-x-0 min-[900px]:border-l"
			>
				{#each group.items as section (section.id)}
					<li class="flex-none">
						<a
							href="#{section.id}"
							aria-current={section.id === active ? 'location' : undefined}
							class={[
								'relative block py-1 text-[13.5px] whitespace-nowrap no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring min-[900px]:pl-4',
								section.id === active
									? "font-medium text-accent min-[900px]:bg-accent-soft min-[900px]:before:absolute min-[900px]:before:inset-y-0 min-[900px]:before:-left-px min-[900px]:before:w-px min-[900px]:before:bg-accent min-[900px]:before:content-['']"
									: 'text-muted-foreground hover:text-foreground'
							]}
						>
							{section.title}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</nav>
