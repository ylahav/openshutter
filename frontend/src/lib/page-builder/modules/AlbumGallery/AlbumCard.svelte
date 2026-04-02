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
	class="group bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 overflow-hidden hover:shadow-xl dark:hover:shadow-gray-900/70 transition-all duration-300 transform hover:-translate-y-1"
>
	<div class="p-6">
		{#each cardFieldOrder as field}
			{#if field === 'title' && showTitle}
				<h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
					{getAlbumName(album)}
				</h3>
			{:else if field === 'cover' && showCover}
				<div class="{coverAspectClass} mb-3 bg-linear-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden">
					{#if coverUrl}
						<img src={coverUrl} alt={getAlbumName(album)} class="w-full h-full object-cover" />
					{:else}
						<div class="text-gray-400 dark:text-gray-500 text-xl">No cover</div>
					{/if}
				</div>
			{:else if field === 'description' && showDescription && album.description}
				<div class="text-gray-600 dark:text-gray-300 text-sm mb-3">
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
				<div class="text-sm text-gray-500 dark:text-gray-400 mb-2">{album.photoCount || 0} photos</div>
			{:else if field === 'featuredBadge' && showFeaturedBadge && album.isFeatured}
				<div class="mb-2">
					<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">
						⭐ Featured
					</span>
				</div>
			{/if}
		{/each}
	</div>
</a>
