<!--
@component
A desktop window: a title bar to drag (or focus and nudge with the arrow keys),
a corner to resize, minimise and close. It starts where the desktop's stylesheet places
`[data-place]` (`--x0`, `--y0`, `--w0`, `--h0`) until it is moved. Below 640px it fills
the desktop, one window at a time.
-->
<script lang="ts">
	import Minus from 'phosphor-svelte/lib/Minus';
	import X from 'phosphor-svelte/lib/X';
	import type { Snippet } from 'svelte';

	let {
		active,
		children,
		detail,
		hidden,
		onclose,
		onfocus,
		onminimize,
		place,
		title,
		x = $bindable(),
		y = $bindable(),
		z
	}: {
		active: boolean;
		children: Snippet;
		detail?: string;
		hidden: boolean;
		onclose: () => void;
		onfocus: () => void;
		onminimize: () => void;
		place: string;
		title: string;
		x?: number;
		y?: number;
		z: number;
	} = $props();

	let node = $state<HTMLElement>();
	let grab: { dx: number; dy: number } | undefined;

	// Kept inside the desktop, whatever its size is now.
	function moveTo(left: number, top: number) {
		const desk = node?.offsetParent;
		if (!node || !desk) return;
		x = Math.round(Math.min(Math.max(0, left), desk.clientWidth - node.offsetWidth));
		y = Math.round(Math.min(Math.max(0, top), desk.clientHeight - node.offsetHeight));
	}

	const NUDGE: Record<string, [number, number]> = {
		ArrowLeft: [-16, 0],
		ArrowRight: [16, 0],
		ArrowUp: [0, -16],
		ArrowDown: [0, 16]
	};

	const BUTTON =
		'inline-flex size-7 items-center justify-center text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
</script>

<section
	bind:this={node}
	aria-label={detail ? `${title} ${detail}` : title}
	data-place={place}
	class={[
		'window flex flex-col overflow-hidden border bg-card shadow-[0_18px_40px_-18px_rgb(0_0_0/0.35)]',
		!active && 'max-sm:hidden'
	]}
	{hidden}
	style:--x={x === undefined ? undefined : `${x}px`}
	style:--y={y === undefined ? undefined : `${y}px`}
	style:z-index={z}
	onfocusin={onfocus}
	onpointerdowncapture={onfocus}
>
	<div
		class={[
			'flex h-9 flex-none items-center border-b border-t-2 pr-1',
			active ? 'border-t-accent bg-card' : 'border-t-transparent bg-muted'
		]}
	>
		<button
			type="button"
			class="flex h-full min-w-0 flex-1 cursor-grab touch-none items-center gap-2 pl-3 text-left text-[13px] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:cursor-grabbing max-sm:cursor-default"
			aria-label="Move {title}"
			onpointerdown={(event) => {
				if (event.button !== 0 || !matchMedia('(min-width: 640px)').matches) return;
				event.currentTarget.setPointerCapture(event.pointerId);
				grab = { dx: event.clientX - node!.offsetLeft, dy: event.clientY - node!.offsetTop };
			}}
			onpointermove={(event) => {
				if (grab) moveTo(event.clientX - grab.dx, event.clientY - grab.dy);
			}}
			onpointerup={() => (grab = undefined)}
			onpointercancel={() => (grab = undefined)}
			onkeydown={(event) => {
				const step = NUDGE[event.key];
				if (!step || !node) return;
				event.preventDefault();
				moveTo(node.offsetLeft + step[0], node.offsetTop + step[1]);
			}}
		>
			<span class="font-medium">{title}</span>
			{#if detail}
				<span class="truncate font-mono text-[12px] text-muted-foreground">{detail}</span>
			{/if}
		</button>
		<button type="button" class={BUTTON} aria-label="Minimise {title}" onclick={onminimize}>
			<Minus size={14} />
		</button>
		<button type="button" class={BUTTON} aria-label="Close {title}" onclick={onclose}>
			<X size={14} />
		</button>
	</div>
	<div class="min-h-0 flex-1">{@render children()}</div>
</section>

<style>
	/* Where the window would sit, clamped so a narrower desktop never hides it off the edge.
	   A resize sets width and height inline, which wins over these. */
	.window {
		--w: var(--w0, 28rem);
		--h: var(--h0, 18rem);
		position: absolute;
		left: clamp(0px, var(--x, var(--x0, 24px)), 100% - var(--w));
		top: clamp(0px, var(--y, var(--y0, 24px)), 100% - var(--h));
		width: min(var(--w), 100%);
		height: min(var(--h), 100%);
		min-width: 16rem;
		min-height: 10rem;
		resize: both;
	}

	@media (width < 640px) {
		.window {
			position: relative;
			inset: auto;
			flex: 1 1 0;
			width: auto !important;
			height: auto !important;
			min-width: 0;
			resize: none;
		}
	}
</style>
