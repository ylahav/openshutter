<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getPhotoUrl } from '$lib/utils/photoUrl';

	const dispatch = createEventDispatcher<{ open: undefined }>();

	export let photo: any;
	export let coverAspectClass: string = 'aspect-video';
	export let cardFieldOrder: Array<'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge'> = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
	export let showTitle = true;
	export let showCover = true;
	export let showDescription = true;
	export let descriptionLines = 2;
	export let showFeaturedBadge = true;

	function resolveTitle(v: unknown): string {
		if (typeof v === 'string') return v;
		if (v && typeof v === 'object') return MultiLangUtils.getTextValue(v as Record<string, string>, $currentLanguage) || '';
		return '';
	}

	$: photoTitle =
		resolveTitle(photo?.title) ||
		resolveTitle(photo?.name) ||
		(typeof photo?.originalName === 'string' ? photo.originalName : '') ||
		(typeof photo?.filename === 'string' ? photo.filename : '') ||
		'Photo';

	$: photoUrl =
		(typeof photo?.coverUrl === 'string' && photo.coverUrl) ||
		(typeof photo?.thumbnailUrl === 'string' && photo.thumbnailUrl) ||
		(typeof photo?.previewUrl === 'string' && photo.previewUrl) ||
		(typeof photo?.url === 'string' && photo.url) ||
		(typeof photo?.imageUrl === 'string' && photo.imageUrl) ||
		getPhotoUrl(photo ?? {}, { preferThumbnail: true, fallback: '' });
</script>

<button
	type="button"
	on:click={() => dispatch('open')}
	class="group w-full min-w-0 max-w-full text-left bg-[color:var(--tp-surface-1)] rounded-xl border border-[color:var(--tp-border)] overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_12px_40px_color-mix(in_srgb,var(--tp-fg)_12%,transparent)] focus:outline-hidden focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--os-primary)_45%,transparent)]"
>
	<div class="p-4 @sm:p-6">
		{#each cardFieldOrder as field}
			{#if field === 'title' && showTitle}
				<h3
					class="text-lg @sm:text-xl font-semibold text-[color:var(--tp-fg)] mb-3 group-hover:text-[color:var(--os-primary)] transition-colors break-words"
				>
					{photoTitle}
				</h3>
			{:else if field === 'cover' && showCover}
				<div
					class="{coverAspectClass} mb-3 bg-linear-to-b from-[color:var(--tp-surface-2)] to-[color:var(--tp-surface-3)] flex items-center justify-center overflow-hidden"
				>
					{#if photoUrl}
						<img src={photoUrl} alt={photoTitle} class="w-full h-full object-cover" />
					{:else}
						<div class="text-[color:var(--tp-fg-subtle)] text-xl">No image</div>
					{/if}
				</div>
			{:else if field === 'description' && showDescription && photo?.description}
				<div class="text-[color:var(--tp-fg-muted)] text-sm mb-3">
					<div
						class="prose prose-sm max-w-none"
						style="display:-webkit-box;-webkit-line-clamp:{descriptionLines};-webkit-box-orient:vertical;overflow:hidden;"
					>
						{@html (() => {
							if (typeof photo.description === 'string') return photo.description;
							const html = MultiLangUtils.getHTMLValue(photo.description as Record<string, string>, $currentLanguage);
							if (html) return html;
							return MultiLangUtils.getTextValue(photo.description as Record<string, string>, $currentLanguage) || '';
						})()}
					</div>
				</div>
			{:else if field === 'featuredBadge' && showFeaturedBadge && photo?.isFeatured}
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
</button>
