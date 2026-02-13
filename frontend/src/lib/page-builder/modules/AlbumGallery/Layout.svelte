<!-- frontend/src/lib/page-builder/modules/AlbumGallery/Layout.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { logger } from '$lib/utils/logger';

	export let config: any = {};
	export let data: any = null;
	export let templateConfig: Record<string, any> = {};

	$: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage) || '';
	$: descriptionHTML = config?.description ? MultiLangUtils.getHTMLValue(config.description, $currentLanguage) : '';
	/** 'root' = root-level albums only (no children), 'featured' = all featured albums (flattened), 'selected' = specific album IDs, 'current' = album from URL (alias) */
	$: albumSource = config?.albumSource ?? 'root';
	$: selectedAlbums = config?.selectedAlbums ?? config?.rootAlbumId ?? config?.rootGallery ? [config.rootAlbumId || config.rootGallery] : [];
	$: includeRoot = config?.includeRoot ?? true;
	// Get album alias from page context (URL parameter)
	$: currentAlbumAlias = data?.alias || null;

	let albums: any[] = [];
	let loading = true;
	let coverImages: Record<string, string> = {};
	let lastSelectedAlbums: string[] = [];
	let lastAlbumSource: string = '';

	$: effectiveSelectedAlbums = albumSource === 'selected'
		? (Array.isArray(selectedAlbums) ? selectedAlbums : selectedAlbums ? [selectedAlbums] : [])
		: [];

	$: currentAlbumKey = albumSource === 'current' ? `current:${currentAlbumAlias || 'none'}` : '';
	$: if (browser && (
		JSON.stringify(effectiveSelectedAlbums) !== JSON.stringify(lastSelectedAlbums) || 
		albumSource !== lastAlbumSource ||
		(albumSource === 'current' && currentAlbumKey !== lastAlbumSource)
	)) {
		lastSelectedAlbums = [...effectiveSelectedAlbums];
		lastAlbumSource = albumSource === 'current' ? currentAlbumKey : albumSource;
		loadAlbums();
	}

	onMount(async () => {
		await loadAlbums();
	});

	async function loadAlbums() {
		loading = true;
		try {
			if (albumSource === 'current' && currentAlbumAlias) {
				// Fetch the current album from URL alias
				try {
					const response = await fetch(`/api/albums/${encodeURIComponent(currentAlbumAlias)}/data?page=1&limit=50`);
					if (response.ok) {
						const result = await response.json();
						const albumData = result.success ? result.data : result;
						if (albumData?.album) {
							// For 'current', we show the album's photos, not sub-albums
							// This is handled by the albumGallery type, not albumsGrid
							albums = albumData.subAlbums || [];
							if (albums.length > 0) {
								await fetchCoverImages();
							}
						}
					} else if (response.status === 404) {
						logger.warn(`Album not found: ${currentAlbumAlias}`);
						albums = [];
					}
				} catch (err) {
					logger.error(`Failed to fetch current album ${currentAlbumAlias}:`, err);
					albums = [];
				}
			} else if (albumSource === 'selected' && effectiveSelectedAlbums && effectiveSelectedAlbums.length > 0) {
				const albumPromises = effectiveSelectedAlbums.map(async (albumId) => {
					try {
						const response = await fetch(`/api/albums/${albumId}`);
						if (response.ok) {
							return await response.json();
						}
					} catch (err) {
						logger.error(`Failed to fetch album ${albumId}:`, err);
					}
					return null;
				});

				const fetchedAlbums = await Promise.all(albumPromises);
				albums = fetchedAlbums.filter(
					(album) => album && (album.isPublic || album.isFeatured)
				);

				if (albums.length > 0) {
					await fetchCoverImages();
				}
			} else {
				if (albumSource === 'root') {
					// For 'root', fetch only root-level albums (parentAlbumId=null)
					try {
						const response = await fetch('/api/albums?parentId=root');
						if (response.ok) {
							const result = await response.json();
							logger.debug('[AlbumGallery] Root albums response:', result);
							if (Array.isArray(result)) {
								albums = result;
								logger.debug(`[AlbumGallery] Loaded ${result.length} root albums (direct array)`);
							} else if (result.success && Array.isArray(result.data)) {
								albums = result.data;
								logger.debug(`[AlbumGallery] Loaded ${result.data.length} root albums (from result.data)`);
							} else if (result.data && Array.isArray(result.data)) {
								albums = result.data;
								logger.debug(`[AlbumGallery] Loaded ${result.data.length} root albums (from result.data fallback)`);
							} else {
								logger.warn('[AlbumGallery] Unexpected root albums response format:', result);
								albums = [];
							}
						} else {
							const errorText = await response.text();
							logger.error(`[AlbumGallery] Failed to fetch root albums: ${response.status} ${response.statusText}`, errorText);
							albums = [];
						}
					} catch (err) {
						logger.error('[AlbumGallery] Error fetching root albums:', err);
						albums = [];
					}
				} else {
					// For 'featured' or other cases, fetch hierarchy and flatten recursively
					const response = await fetch('/api/albums/hierarchy?includePrivate=false');
					if (response.ok) {
						const result = await response.json();
						const albumsData = result.success ? result.data : (result.data || result);
						if (Array.isArray(albumsData)) {
							// Flatten recursively
							const flattenAlbums = (items: any[]): any[] => {
								let resultList: any[] = [];
								for (const album of items) {
									if (album.isPublic || album.isFeatured) {
										resultList.push(album);
									}
									if (album.children && album.children.length > 0) {
										resultList = resultList.concat(flattenAlbums(album.children));
									}
								}
								return resultList;
							};
							albums = flattenAlbums(albumsData);
							if (albumSource === 'featured') {
								albums = albums.filter((a) => a.isFeatured);
							}
						}
					}
				}

				if (albums.length > 0) {
					await fetchCoverImages();
				}
			}
		} catch (err) {
			logger.error('Failed to load albums:', err);
			albums = [];
		} finally {
			loading = false;
		}
	}

	async function fetchCoverImages() {
		if (albums.length === 0) return;

		try {
			const response = await fetch('/api/albums/cover-images', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ albumIds: albums.map((a) => a._id) }),
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					coverImages = result.data;
				} else if (result && typeof result === 'object' && !result.success) {
					coverImages = result;
				} else {
					coverImages = {};
				}
			}
		} catch (err) {
			logger.error('Failed to fetch cover images:', err);
			coverImages = {};
		}
	}
</script>

<section class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
	<div class="max-w-6xl mx-auto">
		{#if titleText || descriptionHTML}
			<div class="text-center mb-16">
				{#if titleText}
					<h2 class="text-4xl font-bold text-gray-900 mb-4">{titleText}</h2>
				{/if}
				{#if descriptionHTML}
					<div class="text-lg text-gray-600 max-w-3xl mx-auto prose prose-lg">
						{@html descriptionHTML}
					</div>
				{/if}
			</div>
		{/if}

		{#if loading}
			<div class="text-center py-12">
				<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				<p class="mt-4 text-gray-600">Loading galleries...</p>
			</div>
		{:else if albums.length > 0}
			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
				{#each albums as album}
					<a
						href="/albums/{album.alias}"
						class="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
					>
						<div class="aspect-video bg-linear-to-b from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden">
							{#if coverImages[album._id]}
								<img
									src={coverImages[album._id]}
									alt={getAlbumName(album)}
									class="w-full h-full object-cover"
								/>
							{:else}
								<div class="text-gray-400 text-xl">No cover</div>
							{/if}
						</div>
						<div class="p-6">
							<h3 class="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
								{getAlbumName(album)}
							</h3>
							{#if album.description}
								<div class="text-gray-600 text-sm line-clamp-2 mb-3 prose prose-sm max-w-none">
									{@html typeof album.description === 'string'
										? album.description
										: MultiLangUtils.getHTMLValue(album.description, $currentLanguage) || ''}
								</div>
							{/if}
							<div class="flex items-center justify-between text-sm text-gray-500">
								<span>{album.photoCount || 0} photos</span>
								{#if album.isFeatured}
									<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
										⭐ Featured
									</span>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="text-center py-12 bg-white rounded-xl shadow-md">
				<p class="text-gray-600">No public albums available at the moment.</p>
				<a
					href="/albums"
					class="inline-flex items-center mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
				>
					Browse Albums
				</a>
			</div>
		{/if}
	</div>
</section>
