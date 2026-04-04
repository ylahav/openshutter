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
	class="group w-full min-w-0 max-w-full text-left bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 overflow-hidden hover:shadow-xl dark:hover:shadow-gray-900/70 transition-all duration-300 transform hover:-translate-y-1 focus:outline-hidden focus:ring-2 focus:ring-blue-500/60"
>
	<div class="p-4 @sm:p-6">
		{#each cardFieldOrder as field}
			{#if field === 'title' && showTitle}
				<h3
					class="text-lg @sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words"
				>
					{photoTitle}
				</h3>
			{:else if field === 'cover' && showCover}
				<div class="{coverAspectClass} mb-3 bg-linear-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden">
					{#if photoUrl}
						<img src={photoUrl} alt={photoTitle} class="w-full h-full object-cover" />
					{:else}
						<div class="text-gray-400 dark:text-gray-500 text-xl">No image</div>
					{/if}
				</div>
			{:else if field === 'description' && showDescription && photo?.description}
				<div class="text-gray-600 dark:text-gray-300 text-sm mb-3">
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
					<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">
						⭐ Featured
					</span>
				</div>
			{/if}
		{/each}
	</div>
</button>
