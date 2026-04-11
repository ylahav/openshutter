<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getAlbumName } from '$lib/utils/albumUtils';

	export let album: any;
	export let href: string = '#';
	export let coverUrl: string = '';
	export let coverAspectClass: string = 'aspect-video';
	export let cardFieldOrder: Array<'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge'> = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
	export let showTitle = true;
	export let showCover = true;
	export let showDescription = true;
	export let descriptionLines = 2;
	export let showPhotoCount = true;
	export let showFeaturedBadge = true;
</script>

<a
	href={href}
	class="group block min-w-0 max-w-full bg-[color:var(--tp-surface-1)] rounded-xl border border-[color:var(--tp-border)] overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_12px_40px_color-mix(in_srgb,var(--tp-fg)_12%,transparent)]"
>
	<div class="p-4 @sm:p-6">
		{#each cardFieldOrder as field}
			{#if field === 'title' && showTitle}
				<h3
					class="text-lg @sm:text-xl font-semibold text-[color:var(--tp-fg)] mb-3 group-hover:text-[color:var(--os-primary)] transition-colors break-words"
				>
					{getAlbumName(album)}
				</h3>
			{:else if field === 'cover' && showCover}
				<div
					class="{coverAspectClass} mb-3 bg-linear-to-b from-[color:var(--tp-surface-2)] to-[color:var(--tp-surface-3)] flex items-center justify-center overflow-hidden"
				>
					{#if coverUrl}
						<img src={coverUrl} alt={getAlbumName(album)} class="w-full h-full object-cover" />
					{:else}
						<div class="text-[color:var(--tp-fg-subtle)] text-xl">No cover</div>
					{/if}
				</div>
			{:else if field === 'description' && showDescription && album.description}
				<div class="text-[color:var(--tp-fg-muted)] text-sm mb-3">
					<div
						class="prose prose-sm max-w-none"
						style="display:-webkit-box;-webkit-line-clamp:{descriptionLines};-webkit-box-orient:vertical;overflow:hidden;"
					>
						{@html (() => {
							if (typeof album.description === 'string') return album.description;
							const html = MultiLangUtils.getHTMLValue(album.description as Record<string, string>, $currentLanguage);
							if (html) return html;
							return MultiLangUtils.getTextValue(album.description as Record<string, string>, $currentLanguage) || '';
						})()}
					</div>
				</div>
			{:else if field === 'photoCount' && showPhotoCount}
				<div class="text-sm text-[color:var(--tp-fg-subtle)] mb-2">{album.photoCount || 0} photos</div>
			{:else if field === 'featuredBadge' && showFeaturedBadge && album.isFeatured}
				<div class="mb-2">
					<span
						class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[color:color-mix(in_srgb,var(--os-primary)_22%,var(--tp-surface-2))] text-[color:var(--tp-fg)]"
					>
						⭐ Featured
					</span>
				</div>
			{/if}
		{/each}
	</div>
</a>
