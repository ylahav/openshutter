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
	/** 'root' = all root albums, 'featured' = only featured albums, 'selected' = specific album IDs */
	$: albumSource = config?.albumSource ?? 'root';
	$: selectedAlbums = config?.selectedAlbums ?? config?.rootAlbumId ?? config?.rootGallery ? [config.rootAlbumId || config.rootGallery] : [];
	$: includeRoot = config?.includeRoot ?? true;

	let albums: any[] = [];
	let loading = true;
	let coverImages: Record<string, string> = {};
	let lastSelectedAlbums: string[] = [];
	let lastAlbumSource: string = '';

	$: effectiveSelectedAlbums = albumSource === 'selected'
		? (Array.isArray(selectedAlbums) ? selectedAlbums : selectedAlbums ? [selectedAlbums] : [])
		: [];

	$: if (browser && (JSON.stringify(effectiveSelectedAlbums) !== JSON.stringify(lastSelectedAlbums) || albumSource !== lastAlbumSource)) {
		lastSelectedAlbums = [...effectiveSelectedAlbums];
		lastAlbumSource = albumSource;
		loadAlbums();
	}

	onMount(async () => {
		await loadAlbums();
	});

	async function loadAlbums() {
		loading = true;
		try {
			if (albumSource === 'selected' && effectiveSelectedAlbums && effectiveSelectedAlbums.length > 0) {
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
				const response = await fetch('/api/albums/hierarchy?includePrivate=false');
				if (response.ok) {
					const result = await response.json();
					const albumsData = result.success ? result.data : (result.data || result);
					if (Array.isArray(albumsData)) {
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
								<p class="text-gray-600 text-sm line-clamp-2 mb-3">
									{typeof album.description === 'string'
										? album.description
										: MultiLangUtils.getTextValue(album.description, $currentLanguage) || ''}
								</p>
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
			<div class="text-center">
				<a
					href="/albums"
					class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
				>
					View All Albums
				</a>
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
