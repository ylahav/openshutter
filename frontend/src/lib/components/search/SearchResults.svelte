<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import PhotoLightbox from '../PhotoLightbox.svelte';
	import { getPhotoUrl, getPhotoFullUrl, getPhotoRotationStyle } from '$lib/utils/photoUrl';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';

	export let results: {
		photos: any[];
		albums: any[];
		people: any[];
		locations: any[];
		totalPhotos: number;
		totalAlbums: number;
		totalPeople: number;
		totalLocations: number;
		page: number;
		limit: number;
		hasMore: boolean;
	};
	export let loading = false;
	export let error: string | null = null;
	export let query = '';
	/** Summary of current search (query + active filters) for display in results header */
	export let searchSummary = '';

	const dispatch = createEventDispatcher();

	let lightboxOpen = false;
	let lightboxIndex = 0;

	$: photoCount = Array.isArray(results.photos) && results.photos.length > 0
		? results.photos.length
		: results.totalPhotos || 0;
	$: hasResults = photoCount > 0 || results.totalPhotos > 0;

	$: lightboxPhotos = Array.isArray(results.photos)
		? results.photos.map((photo: any) => {
				const imageUrl = getPhotoFullUrl(photo, '');
				const thumbnailUrl = getPhotoUrl(photo, { fallback: '' });
				return {
					_id: photo._id,
					url: imageUrl || thumbnailUrl,
					thumbnailUrl: thumbnailUrl || imageUrl,
					title:
						typeof photo.title === 'string'
							? photo.title
							: MultiLangUtils.getTextValue(photo.title || {}, $currentLanguage) || '',
					takenAt: photo.exif?.dateTime || photo.uploadedAt,
					exif: photo.exif,
					rotation: photo.rotation,
					metadata: photo.dimensions
						? {
								width: photo.dimensions.width,
								height: photo.dimensions.height,
								fileSize: photo.size,
								format: photo.mimeType
							}
						: undefined
				};
			})
		: [];

	function handleLoadMore() {
		dispatch('loadMore');
	}

	function openLightbox(index: number) {
		lightboxIndex = index;
		lightboxOpen = true;
	}
</script>

<div class="space-y-6">
	{#if error}
		<div class="bg-white rounded-lg shadow-sm border p-8 text-center">
			<div class="text-red-500 mb-4">
				<svg class="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<h3 class="text-lg font-semibold">{$t('search.error')}</h3>
				<p class="text-sm text-gray-600 mt-1">{error}</p>
			</div>
			<button
				on:click={() => window.location.reload()}
				class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
			>
				{$t('search.retry')}
			</button>
		</div>
	{:else if !query && !hasResults}
		<div class="bg-white rounded-lg shadow-sm border p-8 text-center">
			<svg class="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
			<h3 class="text-lg font-semibold text-gray-900 mb-2">{$t('search.startSearching')}</h3>
			<p class="text-gray-600">{$t('search.startSearchingDescription')}</p>
		</div>
	{:else}
		<!-- Results Header -->
		{#if hasResults}
			<div class="bg-white rounded-lg shadow-sm border p-4">
				<div class="flex items-center justify-between flex-wrap gap-2">
					<div class="flex items-center space-x-4 flex-wrap">
						<h2 class="text-lg font-semibold text-gray-900">{$t('search.results')}</h2>
						<span class="text-sm text-gray-600">
							{photoCount} {photoCount === 1 ? $t('search.photo') : $t('search.photos')}
						</span>
						{#if searchSummary && searchSummary.trim()}
							<span class="text-sm text-gray-500 border-l border-gray-300 pl-4">
								{$t('search.searchingFor')} {searchSummary}
							</span>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Loading / Thinking State (POST sent, waiting for result) -->
		{#if loading}
			<div class="bg-white rounded-lg shadow-sm border p-8 text-center">
				<div class="flex flex-col items-center gap-4">
					<!-- Thinking icon: lightbulb (idea/thinking) with subtle pulse -->
					<svg
						class="h-12 w-12 text-amber-500 animate-pulse"
						fill="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"
						/>
					</svg>
					<p class="text-gray-600 font-medium">{$t('search.thinking') || 'Thinking...'}</p>
					<p class="text-sm text-gray-400">{$t('search.searching') || 'Searching...'}</p>
				</div>
			</div>
		{:else}
			<!-- Photos Grid -->
			{#if Array.isArray(results.photos) && results.photos.length > 0}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{#each results.photos as photo, index}
						<div
							on:click={() => openLightbox(index)}
							class="cursor-pointer bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
						>
							{#if photo.storage?.thumbnailPath || photo.storage?.url}
								{@const imageUrl = getPhotoUrl(photo, { fallback: '' })}
								<img
									src={imageUrl}
									alt={photo.filename || 'Photo'}
									class="w-full h-48 object-contain bg-black/5"
									style={getPhotoRotationStyle(photo)}
									loading="lazy"
								/>
							{:else}
								<div class="w-full h-48 bg-gray-200 flex items-center justify-center">
									<span class="text-gray-400">{$t('search.noImage')}</span>
								</div>
							{/if}
							<div class="p-2">
								<p class="text-sm text-gray-600 truncate">
									{photo.filename || photo.title || $t('search.untitled')}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Load More Button -->
			{#if results.hasMore}
				<div class="text-center">
					<button
						on:click={handleLoadMore}
						disabled={loading}
						class="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? $t('search.loading') : $t('search.loadMore')}
					</button>
				</div>
			{/if}

			<!-- No Results Message -->
			{#if query && !hasResults}
				<div class="bg-white rounded-lg shadow-sm border p-8 text-center">
					<svg class="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">{$t('search.noResults')}</h3>
					<p class="text-gray-600">{$t('search.noResultsDescription')}</p>
				</div>
			{/if}
		{/if}
	{/if}

	<!-- Photo Lightbox -->
	{#if lightboxPhotos.length > 0}
		<PhotoLightbox
			photos={lightboxPhotos}
			startIndex={lightboxIndex}
			isOpen={lightboxOpen}
			onClose={() => (lightboxOpen = false)}
		/>
	{/if}
</div>
