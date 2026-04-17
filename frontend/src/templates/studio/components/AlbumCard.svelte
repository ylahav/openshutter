<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { logger } from '$lib/utils/logger';
	import { t } from '$stores/i18n';
	import type { PackGalleryAlbumListItem } from '$lib/template-packs/pack-page-props';

	export let album: PackGalleryAlbumListItem;
	export let fadeIndex = 0;

	const gradients = [
		'linear-gradient(135deg, color-mix(in srgb, var(--os-primary) 35%, #0f172a), var(--os-primary))',
		'linear-gradient(135deg, color-mix(in srgb, var(--os-secondary) 40%, #0f172a), var(--os-secondary))',
		'linear-gradient(135deg, color-mix(in srgb, var(--os-accent) 35%, #0f172a), var(--os-accent))'
	] as const;

	let coverImageUrl: string | null = null;
	let coverImageLoading = true;

	$: displayName = MultiLangUtils.getTextValue(album.name, $currentLanguage);
	$: desc =
		album.description != null
			? MultiLangUtils.getHTMLValue(album.description, $currentLanguage).replace(/<[^>]*>/g, '').trim()
			: '';
	$: countText =
		typeof album.photoCount === 'number' && album.photoCount > 0
			? `${album.photoCount} ${$t('albums.photos')}`
			: '';

	onMount(async () => {
		if (!album._id) {
			coverImageLoading = false;
			return;
		}
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
	class="group block rounded-[10px] border overflow-hidden transition-all duration-200 no-underline opacity-0 translate-y-4 animate-[studio-fade-up_0.6s_ease_forwards] hover:-translate-y-0.5 hover:shadow-lg bg-[color:var(--tp-surface-1)] border-[color:var(--tp-border)] hover:border-[color:color-mix(in_srgb,var(--os-primary)_45%,var(--tp-border))]"
	style="animation-delay: {0.08 + fadeIndex * 0.08}s; box-shadow: 0 0 0 0 transparent; --tw-shadow: 0 4px 24px color-mix(in srgb, var(--os-primary) 8%, transparent);"
	on:mouseenter={(e) => {
		e.currentTarget.style.boxShadow = '0 4px 24px color-mix(in srgb, var(--os-primary) 12%, transparent)';
	}}
	on:mouseleave={(e) => {
		e.currentTarget.style.boxShadow = '';
	}}
>
	<div class="relative aspect-[4/3] overflow-hidden">
		<div
			class="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-105"
			style="background: {gradients[fadeIndex % 3]};"
		>
			{#if !coverImageLoading && coverImageUrl}
				<img src={coverImageUrl} alt={displayName} class="w-full h-full object-cover" />
			{/if}
			{#if coverImageLoading}
				<div class="absolute inset-0 flex items-center justify-center">
					<div
						class="w-7 h-7 rounded-full animate-spin border-2 border-white/20 border-t-white/80"
					></div>
				</div>
			{/if}
		</div>
		<div
			class="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none"
		></div>
		{#if countText}
			<div
				class="absolute bottom-2.5 right-3 text-[10px] font-medium tracking-wide px-2 py-0.5 rounded text-white bg-white/15"
			>
				{countText}
			</div>
		{/if}
	</div>
	<div class="px-4 pt-3.5 pb-4">
		<div
			class="text-[15px] font-semibold mb-1 transition-colors"
			style="font-family: var(--os-font-heading); color: var(--tp-fg);"
		>
			{displayName}
		</div>
		{#if desc}
			<p class="text-[12px] leading-snug line-clamp-2" style="color: var(--tp-fg-muted);">
				{desc}
			</p>
		{/if}
	</div>
</a>

<style>
	@keyframes studio-fade-up {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
