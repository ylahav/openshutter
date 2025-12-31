<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import PhotoLightbox from '../PhotoLightbox.svelte';
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

	const dispatch = createEventDispatcher();

	let lightboxOpen = false;
	let lightboxIndex = 0;

	$: photoCount = Array.isArray(results.photos) && results.photos.length > 0
		? results.photos.length
		: results.totalPhotos || 0;
	$: hasResults = photoCount > 0 || results.totalPhotos > 0;

	$: lightboxPhotos = Array.isArray(results.photos)
		? results.photos.map((photo: any) => {
				let imageUrl = '';
				if (photo.storage?.url) {
					if (photo.storage.url.startsWith('/api/storage/serve/') || photo.storage.url.startsWith('http')) {
						imageUrl = photo.storage.url;
					} else {
						const provider = photo.storage.provider || 'local';
						imageUrl = `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.url)}`;
					}
				} else if (photo.storage?.thumbnailPath) {
					if (
						photo.storage.thumbnailPath.startsWith('/api/storage/serve/') ||
						photo.storage.thumbnailPath.startsWith('http')
					) {
						imageUrl = photo.storage.thumbnailPath;
					} else {
						const provider = photo.storage.provider || 'local';
						imageUrl = `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.thumbnailPath)}`;
					}
				}

				let thumbnailUrl = '';
				if (photo.storage?.thumbnailPath) {
					if (
						photo.storage.thumbnailPath.startsWith('/api/storage/serve/') ||
						photo.storage.thumbnailPath.startsWith('http')
					) {
						thumbnailUrl = photo.storage.thumbnailPath;
					} else {
						const provider = photo.storage.provider || 'local';
						thumbnailUrl = `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.thumbnailPath)}`;
					}
				} else if (photo.storage?.url) {
					thumbnailUrl = imageUrl;
				}

				return {
					_id: photo._id,
					url: imageUrl,
					thumbnailUrl: thumbnailUrl,
					title:
						typeof photo.title === 'string'
							? photo.title
							: MultiLangUtils.getTextValue(photo.title || {}, $currentLanguage) || '',
					takenAt: photo.exif?.dateTime || photo.uploadedAt,
					exif: photo.exif,
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
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-4">
						<h2 class="text-lg font-semibold text-gray-900">{$t('search.results')}</h2>
						<span class="text-sm text-gray-600">
							{photoCount} {photoCount === 1 ? $t('search.photo') : $t('search.photos')}
						</span>
					</div>
				</div>

				{#if query}
					<div class="mt-2">
						<span class="text-sm text-gray-600">
							{$t('search.searchingFor')} <strong>"{query}"</strong>
						</span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Loading State -->
		{#if loading}
			<div class="bg-white rounded-lg shadow-sm border p-8 text-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
				<p class="text-gray-600">{$t('search.searching')}</p>
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
								{@const imageUrl =
									photo.storage.thumbnailPath?.startsWith('/api/storage/serve/') ||
									photo.storage.thumbnailPath?.startsWith('http')
										? photo.storage.thumbnailPath
										: photo.storage.url?.startsWith('/api/storage/serve/') ||
											photo.storage.url?.startsWith('http')
											? photo.storage.url
											: `/api/storage/serve/${photo.storage.provider || 'local'}/${encodeURIComponent(
													photo.storage.thumbnailPath || photo.storage.url
												)}`}
								<img
									src={imageUrl}
									alt={photo.filename || 'Photo'}
									class="w-full h-48 object-cover"
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
