<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getPhotoGridUrl } from '$lib/utils/photoUrl';
	import AlbumGridImage from '$lib/components/AlbumGridImage.svelte';
	import { layoutJustifiedRows, photoAspectRatio } from './justify-rows';

	let {
		photos = [],
		gapPx = 4,
		targetRowHeight = 220,
		onopen = undefined
	}: {
		photos?: any[];
		gapPx?: number;
		targetRowHeight?: number;
		onopen?: (detail: { photo: any }) => void;
	} = $props();

	let container = $state<HTMLDivElement | null>(null);
	let width = $state(0);

	const items = $derived(photos.map((p) => ({ photo: p, aspect: photoAspectRatio(p) })));
	const rows = $derived(
		width > 0 && items.length > 0 ? layoutJustifiedRows(items, width, targetRowHeight, gapPx) : []
	);

	function thumbUrl(p: any) {
		// Videos: use the captured poster when set; otherwise fall through to the
		// small-tier grid URL helper (which returns '' for videos and triggers the
		// no-image fallback in the cell).
		if (p?.mediaType === 'video' && typeof p?.poster?.url === 'string' && p.poster.url) {
			return p.poster.url;
		}
		return getPhotoGridUrl(p ?? {}, '');
	}

	function isVideo(p: any): boolean {
		return p?.mediaType === 'video';
	}

	function durationLabel(seconds: unknown): string {
		const s = Number(seconds);
		if (!Number.isFinite(s) || s <= 0) return '';
		const m = Math.floor(s / 60);
		const r = Math.round(s % 60);
		return `${m}:${r.toString().padStart(2, '0')}`;
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
					onclick={() => onopen?.({ photo: cell.item.photo })}
				>
					{#if thumbUrl(cell.item.photo)}
						<AlbumGridImage
							index={flatIndex}
							src={thumbUrl(cell.item.photo)}
							alt=""
							className="pb-justifyPhotoGrid__img"
							draggable={false}
						/>
						{#if isVideo(cell.item.photo)}
							{@const dur = durationLabel(cell.item.photo?.duration)}
							<div class="pb-photoCard__videoOverlay" aria-hidden="true">
								<svg class="pb-photoCard__playIcon" viewBox="0 0 24 24">
									<path fill="currentColor" d="M8 5v14l11-7z" />
								</svg>
								{#if dur}
									<span class="pb-photoCard__videoDuration">{dur}</span>
								{/if}
							</div>
						{/if}
					{:else if isVideo(cell.item.photo)}
						{@const dur = durationLabel(cell.item.photo?.duration)}
						<div class="pb-photoCard__videoPlaceholder">
							<svg class="pb-photoCard__playIcon" viewBox="0 0 24 24" aria-hidden="true">
								<path fill="currentColor" d="M8 5v14l11-7z" />
							</svg>
							{#if dur}
								<span class="pb-photoCard__videoDuration">{dur}</span>
							{/if}
						</div>
					{:else}
						<span class="pb-justifyPhotoGrid__fallback">No image</span>
					{/if}
				</button>
			{/each}
		</div>
	{/each}
</div>
