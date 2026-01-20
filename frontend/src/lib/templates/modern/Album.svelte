<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto, afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { t } from '$stores/i18n';
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
			showExifData?: boolean;
		};
		subAlbums: Array<{
			_id: string;
			name: any;
			description?: any;
			alias: string;
			photoCount?: number;
			childAlbumCount?: number;
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
			metadata?: {
				width?: number;
				height?: number;
				fileSize?: number;
				format?: string;
			};
			dimensions?: {
				width?: number;
				height?: number;
			};
			size?: number;
			mimeType?: string;
			faceRecognition?: any;
			tags?: Array<string | { _id: string; name: any }>;
			people?: Array<string | { _id: string; fullName?: any; firstName?: any }>;
			location?: string | { _id: string; name: any };
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
	let subAlbumCoverImages: Record<string, string> = {};
	let isInitialLoad = true;

	// React to route parameter changes using afterNavigate (recommended for SvelteKit)
	afterNavigate(({ to, from }) => {
		if (!browser) return;
		
		const newAlias = to?.params?.alias || to?.params?.id;
		const oldAlias = from?.params?.alias || from?.params?.id;
		
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

	async function fetchSubAlbumCoverImages(albumIds: string[]) {
		if (albumIds.length === 0) return;

		try {
			const response = await fetch('/api/albums/cover-images', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ albumIds }),
			});

			if (response.ok) {
				const result = await response.json();
				
				// Handle both wrapped {success, data} and direct Record<string, string> formats
				if (result.success && result.data) {
					subAlbumCoverImages = result.data;
				} else if (result && typeof result === 'object' && !result.success) {
					subAlbumCoverImages = result;
				}
			}
		} catch (error) {
			console.error('Failed to fetch sub-album cover images:', error);
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

			// Fetch cover images for sub-albums using the batch API (hierarchical logic)
			if (albumData && albumData.subAlbums && albumData.subAlbums.length > 0) {
				fetchSubAlbumCoverImages(albumData.subAlbums.map((a: any) => a._id));
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
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<div class="text-white">{$t('albums.loadingAlbum')}</div>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="text-red-300 mb-4">{error}</div>
			<button on:click={() => goto('/albums')} class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
				{$t('albums.backToAlbums')}
			</button>
		</div>
	</div>
{:else if !albumData || !albumData.album}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="text-purple-200 mb-4">{$t('albums.albumNotFound')}</div>
			<button on:click={() => goto('/albums')} class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
				{$t('albums.backToAlbums')}
			</button>
		</div>
	</div>
{:else}
	<div class="flex-1 min-h-screen">
		{#if albumData.album}
			<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-1">
				<AlbumBreadcrumbs album={albumData.album} role="public" />
			</div>
		{/if}

		<section class="py-8">
			<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="text-center mb-12">
					<h1 class="text-5xl font-bold text-white mb-6 tracking-tight">
						<MultiLangText value={albumData.album.name} fallback="Untitled Album" />
					</h1>
					{#if albumData.album.description}
						<div class="text-lg text-purple-200 max-w-4xl mx-auto prose prose-lg prose-invert">
							<MultiLangHTML value={albumData.album.description} />
						</div>
					{/if}
					<div class="mt-6 text-sm text-purple-300">
						{albumData.photos.length} {albumData.photos.length === 1 ? $t('search.photo') : $t('albums.photos')}
						{#if albumData.subAlbums && albumData.subAlbums.length > 0}
							• {albumData.subAlbums.length} {$t('albums.subAlbums')}
						{/if}
					</div>
				</div>

				{#if albumData.subAlbums && albumData.subAlbums.length > 0}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
						{#each albumData.subAlbums as subAlbum, idx}
							{@const coverImageUrl = subAlbumCoverImages[subAlbum._id]}
							{@const isLogo = coverImageUrl && (coverImageUrl.includes('/logos/') || coverImageUrl.includes('logo') || (coverImageUrl.includes('/api/storage/serve/') && coverImageUrl.includes('logo')))}
							<a href={`/albums/${subAlbum.alias}`} class="group relative overflow-hidden rounded-2xl cursor-pointer transform transition-all duration-500 hover:scale-105 hover:z-10">
								<div class="aspect-square bg-gradient-to-br from-purple-600 to-blue-600 relative overflow-hidden rounded-2xl">
									{#if coverImageUrl}
										<img
											src={coverImageUrl}
											alt=""
											class="w-full h-full {isLogo
												? 'object-contain p-8 opacity-60 group-hover:opacity-80 transition-opacity bg-white'
												: 'object-cover group-hover:scale-110 transition-transform duration-500'}"
										/>
									{:else}
										<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
											<svg class="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
											</svg>
										</div>
									{/if}
									<div class="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300"></div>
									<div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
										<h3 class="text-white font-semibold text-lg mb-1">
											<MultiLangText value={subAlbum.name} fallback="Untitled Album" />
										</h3>
										<p class="text-white/70 text-sm">
											{#if subAlbum.photoCount && subAlbum.photoCount > 0}
												{subAlbum.photoCount} {(subAlbum.photoCount === 1 ? $t('search.photo') : $t('albums.photos'))}
											{/if}
											{#if subAlbum.photoCount && subAlbum.photoCount > 0 && subAlbum.childAlbumCount && subAlbum.childAlbumCount > 0}
												• 
											{/if}
											{#if subAlbum.childAlbumCount && subAlbum.childAlbumCount > 0}
												{subAlbum.childAlbumCount} {subAlbum.childAlbumCount === 1 ? $t('albums.subAlbum') : $t('albums.subAlbums')}
											{/if}
										</p>
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
								class="group relative overflow-hidden rounded-2xl cursor-pointer transform transition-all duration-500 hover:scale-105 hover:z-10"
							>
								<div class="aspect-square bg-gradient-to-br from-purple-600 to-blue-600 relative overflow-hidden rounded-2xl">
									<img
										src={getPhotoUrl(photo)}
										alt=""
										class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
									/>
									<div class="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300"></div>
									{#if photo.title || photo.description}
										<div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
											{#if photo.title}
												<h3 class="text-white font-semibold text-sm mb-1">
													<MultiLangText value={photo.title} fallback={`Photo ${i + 1}`} />
												</h3>
											{/if}
											{#if photo.description}
												<p class="text-white/70 text-xs line-clamp-2">
													{@html (typeof photo.description === 'string' ? photo.description : (photo.description as any)?.[$currentLanguage] || (photo.description as any)?.en || '').replace(/<[^>]*>/g, '')}
												</p>
											{/if}
										</div>
									{/if}
								</div>
							</button>
						{/each}
					</div>

					{#if albumData.pagination && albumData.pagination.page < albumData.pagination.pages}
						<div class="text-center mt-8">
							<button
								on:click={loadMorePhotos}
								disabled={loadingMore}
								class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{loadingMore ? $t('search.loading') : `${$t('search.loadMore')} (${albumData.pagination.total - albumData.photos.length} ${$t('albums.remaining')})`}
							</button>
						</div>
					{/if}
				{:else if (!albumData.photos || albumData.photos.length === 0) && (!albumData.subAlbums || albumData.subAlbums.length === 0)}
					<div class="text-center py-12">
						<div class="text-purple-200">{$t('albums.emptyAlbum')}</div>
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
				description: p.description,
				takenAt: p.exif?.dateTimeOriginal,
				exif: p.exif, // Include full EXIF data
				metadata: p.metadata || (p.storage ? {
					width: p.dimensions?.width,
					height: p.dimensions?.height,
					fileSize: p.size,
					format: p.mimeType?.split('/')[1]?.toUpperCase()
				} : undefined),
				storage: p.storage,
				faceRecognition: p.faceRecognition
			}))}
			startIndex={lightboxIndex}
			isOpen={lightboxOpen}
			onClose={() => (lightboxOpen = false)}
			autoPlay={false}
			intervalMs={4000}
			showExifData={albumData.album.showExifData !== false}
		/>
	{/if}
{/if}
