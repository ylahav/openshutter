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
	<div
		class="album-card relative aspect-square overflow-hidden cursor-pointer opacity-0 animate-[noir-fade-in_1.2s_ease_forwards]"
		style="animation-delay: {0.1 + fadeIndex * 0.08}s;"
	>
		<div
			class="album-card-bg absolute inset-0 transition-transform duration-[600ms] cubic-bezier(0.25, 0.46, 0.45, 0.94) group-hover:scale-[1.04]"
			style="background: {placeholderBg};"
		>
			{#if !coverImageLoading && coverImageUrl}
				<img src={coverImageUrl} alt={displayName} class="w-full h-full object-cover" />
			{/if}
			{#if coverImageLoading}
				<div class="absolute inset-0 flex items-center justify-center">
					<div
						class="w-6 h-6 rounded-full animate-spin border border-[color:color-mix(in_srgb,var(--tp-fg)_14%,transparent)] border-t-[color:var(--tp-fg)]"
					></div>
				</div>
			{/if}
		</div>
		<div
			class="album-card-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
			style="background: linear-gradient(to top, var(--tp-overlay-scrim), transparent 50%);"
		></div>
		<div
			class="album-card-info absolute inset-x-0 bottom-0 p-5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300"
		>
			<div
				class="text-[11px] uppercase tracking-[0.14em] mb-1 transition-colors"
				style="font-family: var(--os-font-body); color: var(--tp-fg);"
			>
				{displayName}
			</div>
			{#if photoMeta}
				<div
					class="text-[9px] tracking-[0.1em] transition-colors"
					style="font-family: var(--os-font-body); color: var(--tp-fg-muted);"
				>
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
