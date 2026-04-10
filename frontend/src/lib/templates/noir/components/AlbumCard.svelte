<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { logger } from '$lib/utils/logger';

	interface TemplateAlbum {
		_id: string;
		name?: any;
		description?: any;
		alias?: string;
		photoCount?: number;
	}

	export let album: TemplateAlbum;
	export let fadeIndex = 0;

	const surfaceCycle = ['var(--tp-surface-2)', 'var(--tp-surface-3)', 'var(--tp-surface-1)'] as const;

	let coverImageUrl: string | null = null;
	let coverImageLoading = true;

	$: displayName = MultiLangUtils.getTextValue(album.name, $currentLanguage);
	$: photoMeta =
		typeof album.photoCount === 'number' && album.photoCount > 0
			? `${album.photoCount} photographs`
			: '';
	$: placeholderBg = surfaceCycle[fadeIndex % surfaceCycle.length];

	onMount(async () => {
		try {
			const res = await fetch(`/api/albums/${album._id}/cover-image`);
			if (res.ok) {
				const data = await res.json();
				coverImageUrl = data.url || null;
			}
		} catch (err) {
			logger.error('Failed to fetch cover image:', err);
		} finally {
			coverImageLoading = false;
		}
	});
</script>

<a
	href={`/albums/${album.alias || album._id}`}
	class="group block outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--tp-fg)_45%,transparent)] transition-colors"
>
	<div class="ac fi" style="animation-delay: {0.1 + fadeIndex * 0.08}s;">
		<div class="absolute inset-0" style="background: {placeholderBg};">
			{#if !coverImageLoading && coverImageUrl}
				<img src={coverImageUrl} alt={displayName} class="ac-img" />
			{/if}
			{#if coverImageLoading}
				<div class="absolute inset-0 flex items-center justify-center">
					<div
						class="w-6 h-6 rounded-full animate-spin border border-[color:color-mix(in_srgb,var(--tp-fg)_14%,transparent)] border-t-[color:var(--tp-fg)]"
					></div>
				</div>
			{/if}
		</div>
		<div class="ac-ov"></div>
		<div class="ac-info">
			<div class="ac-title">
				{displayName}
			</div>
			{#if photoMeta}
				<div class="ac-meta">
					{photoMeta}
				</div>
			{/if}
		</div>
	</div>
</a>

<style>
	@keyframes noir-fade-in {
		to {
			opacity: 1;
		}
	}
</style>
