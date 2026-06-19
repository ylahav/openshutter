<script lang="ts">
	import { onMount, tick } from 'svelte';

	const { avatar, alt = '' }: {
		avatar: {
			imageUrl: string;
			box?: { x: number; y: number; width: number; height: number };
			sourceWidth: number;
			sourceHeight: number;
		};
		alt?: string;
	} = $props();

	let wrap: HTMLDivElement;
	let sidePx = $state(80);

	function measure() {
		if (!wrap) return;
		const w = wrap.clientWidth;
		sidePx = w > 0 ? w : 80;
	}

	onMount(async () => {
		await tick();
		measure();
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
		if (ro && wrap) ro.observe(wrap);
		return () => ro?.disconnect();
	});

	$effect(() => {
		if (typeof window !== 'undefined' && wrap && avatar?.imageUrl) {
			queueMicrotask(measure);
		}
	});
</script>

<div
	bind:this={wrap}
	class="relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-surface-200-800 bg-(--color-surface-100-900) shadow-sm"
>
	{#if avatar.box && avatar.sourceWidth > 0 && avatar.sourceHeight > 0 && avatar.box.width > 0 && avatar.box.height > 0}
		{@const box = avatar.box}
		{@const W = avatar.sourceWidth}
		{@const H = avatar.sourceHeight}
		{@const s = sidePx / Math.max(box.width, box.height)}
		{@const iw = W * s}
		{@const ih = H * s}
		{@const left = -box.x * s}
		{@const top = -box.y * s}
		<img
			src={avatar.imageUrl}
			{alt}
			class="absolute max-w-none select-none"
			draggable="false"
			loading="lazy"
			decoding="async"
			style:left="{left}px"
			style:top="{top}px"
			style:width="{iw}px"
			style:height="{ih}px"
		/>
	{:else}
		<img src={avatar.imageUrl} {alt} class="h-full w-full object-cover select-none" draggable="false" loading="lazy" decoding="async" />
	{/if}
</div>
