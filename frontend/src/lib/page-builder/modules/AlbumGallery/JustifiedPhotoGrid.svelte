<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import AlbumGridImage from '$lib/components/AlbumGridImage.svelte';
	import { getPhotoGridUrl } from '$lib/utils/photoUrl';
	import { layoutJustifiedRows, photoAspectRatio } from './justify-rows';

	export let photos: any[] = [];
	export let gapPx = 4;
	export let targetRowHeight = 220;

	const dispatch = createEventDispatcher<{ open: { photo: any } }>();

	let container: HTMLDivElement | null = null;
	let width = 0;

	$: items = photos.map((p) => ({ photo: p, aspect: photoAspectRatio(p) }));
	$: rows =
		width > 0 && items.length > 0
			? layoutJustifiedRows(items, width, targetRowHeight, gapPx)
			: [];

	function thumbUrl(p: any) {
		return getPhotoGridUrl(p ?? {}, '');
	}

	function label(p: any) {
		return (
			(typeof p?.title === 'string' && p.title) ||
			(typeof p?.name === 'string' && p.name) ||
			(typeof p?.filename === 'string' && p.filename) ||
			'Photo'
		);
	}

	onMount(() => {
		if (!browser || !container) return;
		const ro = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect?.width ?? 0;
			width = Math.floor(w);
		});
		ro.observe(container);
		width = Math.floor(container.getBoundingClientRect().width);
		return () => ro.disconnect();
	});
</script>

<div bind:this={container} class="pb-justifyPhotoGrid" style="--pb-justify-gap:{gapPx}px">
	{#each rows as row, rowIndex}
		<div class="pb-justifyPhotoGrid__row" style="gap: {gapPx}px; margin-bottom: {gapPx}px">
			{#each row as cell, cellIndex}
				{@const flatIndex = rows.slice(0, rowIndex).reduce((n, r) => n + r.length, 0) + cellIndex}
				<button
					type="button"
					class="pb-justifyPhotoGrid__cell"
					style="width:{Math.round(cell.widthPx)}px;height:{Math.round(cell.heightPx)}px"
					aria-label={label(cell.item.photo)}
					on:click={() => dispatch('open', { photo: cell.item.photo })}
				>
					{#if thumbUrl(cell.item.photo)}
						<AlbumGridImage
							index={flatIndex}
							src={thumbUrl(cell.item.photo)}
							alt=""
							className="pb-justifyPhotoGrid__img"
							draggable={false}
						/>
					{:else}
						<span class="pb-justifyPhotoGrid__fallback">No image</span>
					{/if}
				</button>
			{/each}
		</div>
	{/each}
</div>
