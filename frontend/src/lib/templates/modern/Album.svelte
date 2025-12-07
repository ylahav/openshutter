<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto, afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import MultiLangText from '$lib/components/MultiLangText.svelte';
	import MultiLangHTML from '$lib/components/MultiLangHTML.svelte';

	interface AlbumData {
		album: {
			_id: string;
			name: any;
			description?: any;
			alias: string;
			photoCount?: number;
			coverPhotoId?: string;
			parentAlbumId?: string;
		};
		subAlbums: Array<{
			_id: string;
			name: any;
			description?: any;
			alias: string;
			photoCount?: number;
			coverPhotoId?: string;
		}>;
		photos: Array<{
			_id: string;
			title?: any;
			description?: any;
			alt?: any;
			url?: string;
			storage?: {
				provider?: string;
				url?: string;
				path?: string;
				thumbnailPath?: string;
				thumbnails?: Record<string, string>;
			};
			exif?: any;
		}>;
		pagination: {
			page: number;
			limit: number;
			total: number;
			pages: number;
		};
	}

	let alias = $page.params.alias || $page.params.id;
	let albumData: AlbumData | null = null;
	let loading = true;
	let error: string | null = null;
	let lightboxOpen = false;
	let lightboxIndex = 0;
	let loadingMore = false;
	let subAlbumCoverPhotos: Record<string, any> = {};
	let isInitialLoad = true;

	// React to route parameter changes using afterNavigate (recommended for SvelteKit)
	afterNavigate(({ to, from }) => {
		if (!browser) return;
		
		const newAlias = to?.params.alias || to?.params.id;
		const oldAlias = from?.params.alias || from?.params.id;
		
		// Only fetch if the alias actually changed (not on initial load)
		if (newAlias && newAlias !== oldAlias) {
			alias = newAlias;
			fetchAlbumData();
		} else if (isInitialLoad && newAlias) {
			// Handle initial load
			alias = newAlias;
			fetchAlbumData();
			isInitialLoad = false;
		}
	});

	function getPhotoUrl(photo: any): string {
		if (!photo.storage) {
			return photo.url || '/placeholder.jpg';
		}

		// Check thumbnails object first
		if (photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
			const thumbnails = photo.storage.thumbnails as Record<string, string>;
			const thumbnailUrl = thumbnails.medium || thumbnails.small || Object.values(thumbnails)[0];
			if (thumbnailUrl) {
				if (thumbnailUrl.startsWith('/api/storage/serve/') || thumbnailUrl.startsWith('http')) {
					return thumbnailUrl;
				}
				const provider = photo.storage.provider || 'local';
				const cleanPath = thumbnailUrl.startsWith('/') ? thumbnailUrl.slice(1) : thumbnailUrl;
				return `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
			}
		}

		// Check thumbnailPath
		if (photo.storage.thumbnailPath) {
			if (photo.storage.thumbnailPath.startsWith('/api/storage/serve/') || photo.storage.thumbnailPath.startsWith('http')) {
				return photo.storage.thumbnailPath;
			}
			const provider = photo.storage.provider || 'local';
			const cleanPath = photo.storage.thumbnailPath.startsWith('/') 
				? photo.storage.thumbnailPath.slice(1) 
				: photo.storage.thumbnailPath;
			return `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
		}

		// Fallback to url
		if (photo.storage.url) {
			if (photo.storage.url.startsWith('/api/storage/serve/') || photo.storage.url.startsWith('http')) {
				return photo.storage.url;
			}
			const provider = photo.storage.provider || 'local';
			const cleanPath = photo.storage.url.startsWith('/') 
				? photo.storage.url.slice(1) 
				: photo.storage.url;
			return `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
		}

		return photo.url || '/placeholder.jpg';
	}

	function getPhotoFullUrl(photo: any): string {
		if (!photo.storage) {
			return photo.url || '/placeholder.jpg';
		}

		// For full image, prefer url or path over thumbnailPath
		if (photo.storage.url) {
			if (photo.storage.url.startsWith('/api/storage/serve/') || photo.storage.url.startsWith('http')) {
				return photo.storage.url;
			}
			const provider = photo.storage.provider || 'local';
			const cleanPath = photo.storage.url.startsWith('/') 
				? photo.storage.url.slice(1) 
				: photo.storage.url;
			// Skip thumbnail paths
			if (!cleanPath.includes('/medium/') && !cleanPath.includes('/small/') && !cleanPath.includes('/thumb/')) {
				return `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
			}
		}

		// Fallback to thumbnailPath if no url
		return getPhotoUrl(photo);
	}

	async function fetchSubAlbumCoverPhoto(albumId: string, coverPhotoId: string) {
		try {
			const response = await fetch(`/api/photos/${coverPhotoId}?t=${Date.now()}`, {
				cache: 'no-store',
			});
			if (response.ok) {
				const photo = await response.json();
				subAlbumCoverPhotos = { ...subAlbumCoverPhotos, [albumId]: photo };
			}
		} catch (error) {
			console.error(`Failed to fetch cover photo for sub-album ${albumId}:`, error);
		}
	}

	async function loadMorePhotos() {
		if (!albumData || !albumData.pagination || loadingMore || !albumData.album) return;
		const albumId = albumData.album._id;
		const pagination = albumData.pagination;
		const nextPage = pagination.page + 1;
		if (nextPage > pagination.pages) return;

		try {
			loadingMore = true;
			const response = await fetch(
				`/api/albums/${albumId}/data?page=${nextPage}&limit=50&t=${Date.now()}`,
				{ cache: 'no-store' }
			);
			if (response.ok && albumData) {
				const result = await response.json();
				const newPhotos = result.photos || [];
				albumData.photos = [...albumData.photos, ...newPhotos];
				if (result.pagination) {
					albumData.pagination = result.pagination;
				}
			}
		} catch (error) {
			console.error('Failed to load more photos:', error);
		} finally {
			loadingMore = false;
		}
	}

	async function fetchAlbumData() {
		if (!alias || !browser) return;

		try {
			loading = true;
			error = null;
			// Clear previous sub-album cover photos when loading new album
			subAlbumCoverPhotos = {};

			const response = await fetch(`/api/albums/${encodeURIComponent(alias)}/data?page=1&limit=50&t=${Date.now()}`, {
				cache: 'no-store',
			});
			
			if (!response.ok) {
				throw new Error('Album not found');
			}

			albumData = await response.json();
			console.log('Album data loaded:', albumData);

			// Fetch cover photos for sub-albums
			if (albumData && albumData.subAlbums) {
				albumData.subAlbums.forEach((subAlbum) => {
					if (subAlbum.coverPhotoId) {
						fetchSubAlbumCoverPhoto(subAlbum._id, subAlbum.coverPhotoId);
					}
				});
			}
		} catch (err) {
			console.error('Failed to fetch album data:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch album';
		} finally {
			loading = false;
		}
	}

	// Initial load is handled by afterNavigate
	// But we also need onMount as a fallback for cases where afterNavigate doesn't fire
	onMount(() => {
		if (browser && alias && isInitialLoad) {
			fetchAlbumData();
			isInitialLoad = false;
		}
	});
</script>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<div class="text-gray-600">Loading album...</div>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="text-gray-600 mb-4">{error}</div>
			<button on:click={() => goto('/albums')} class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
				Back to Albums
			</button>
		</div>
	</div>
{:else if !albumData || !albumData.album}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="text-gray-600 mb-4">Album not found</div>
			<button on:click={() => goto('/albums')} class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
				Back to Albums
			</button>
		</div>
	</div>
{:else}
	<div class="flex-1 min-h-screen bg-gray-50">
		{#if albumData.album}
			<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-1">
				<AlbumBreadcrumbs album={albumData.album} role="public" />
			</div>
		{/if}

		<section class="py-8">
			<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="text-center mb-8">
					<h1 class="text-4xl font-bold text-gray-900 mb-4">
						<MultiLangText value={albumData.album.name} fallback="Untitled Album" />
					</h1>
					{#if albumData.album.description}
						<div class="text-lg text-gray-600">
							<MultiLangHTML value={albumData.album.description} />
						</div>
					{/if}
					<div class="mt-4 text-sm text-gray-500">
						{albumData.photos.length} photos
						{#if albumData.subAlbums && albumData.subAlbums.length > 0}
							• {albumData.subAlbums.length} sub-albums
						{/if}
					</div>
				</div>

				{#if albumData.subAlbums && albumData.subAlbums.length > 0}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
						{#each albumData.subAlbums as subAlbum}
							<a href={`/albums/${subAlbum.alias}`} class="group">
								<div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
									<div class="aspect-4/3 bg-gray-100 flex items-center justify-center overflow-hidden">
										{#if subAlbum.coverPhotoId && subAlbumCoverPhotos[subAlbum._id]}
											<img
												src={getPhotoUrl(subAlbumCoverPhotos[subAlbum._id])}
												alt=""
												class="w-full h-full object-cover group-hover:scale-105 transition-transform"
											/>
										{:else if browser && $siteConfigData?.logo}
											<!-- TODO: Replace with getLeadingPhoto API call when backend endpoint is ready -->
											<img
												src={$siteConfigData.logo}
												alt=""
												class="w-full h-full object-contain p-8 opacity-60 group-hover:opacity-80 transition-opacity"
											/>
										{:else}
											<div class="text-4xl text-gray-400">📁</div>
										{/if}
									</div>
									<div class="p-4">
										<h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
											<MultiLangText value={subAlbum.name} fallback="Untitled Album" />
										</h3>
										<div class="text-sm text-gray-500 mt-1">
											{subAlbum.photoCount || 0} photos
										</div>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}

				{#if albumData.photos && albumData.photos.length > 0}
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each albumData.photos as photo, i}
							<button
								type="button"
								on:click={() => {
									lightboxIndex = i;
									lightboxOpen = true;
								}}
								class="group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden text-left"
							>
								<div class="aspect-4/3 bg-gray-100 overflow-hidden">
									<img
										src={getPhotoUrl(photo)}
										alt=""
										class="w-full h-full object-cover group-hover:scale-105 transition-transform"
									/>
								</div>
								{#if photo.title}
									<div class="p-3">
										<h3 class="text-sm font-medium text-gray-900">
											<MultiLangText value={photo.title} fallback={`Photo ${i + 1}`} />
										</h3>
									</div>
								{/if}
							</button>
						{/each}
					</div>

					{#if albumData.pagination && albumData.pagination.page < albumData.pagination.pages}
						<div class="text-center mt-8">
							<button
								on:click={loadMorePhotos}
								disabled={loadingMore}
								class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loadingMore ? 'Loading...' : `Load More (${albumData.pagination.total - albumData.photos.length} remaining)`}
							</button>
						</div>
					{/if}
				{:else if !albumData.subAlbums || albumData.subAlbums.length === 0}
					<div class="text-center py-12">
						<div class="text-gray-600">This album is empty.</div>
					</div>
				{/if}
			</div>
		</section>
	</div>

	{#if albumData.photos && albumData.photos.length > 0}
		<PhotoLightbox
			photos={albumData.photos.map((p) => ({
				_id: p._id,
				url: getPhotoFullUrl(p),
				thumbnailUrl: getPhotoUrl(p),
				title: typeof p.title === 'string' ? p.title : p.title?.[$currentLanguage] || p.title?.en || '',
				takenAt: p.exif?.dateTimeOriginal,
			}))}
			startIndex={lightboxIndex}
			isOpen={lightboxOpen}
			onClose={() => (lightboxOpen = false)}
			autoPlay={false}
			intervalMs={4000}
		/>
	{/if}
{/if}
