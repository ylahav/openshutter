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
import SocialShareButtons from '$lib/components/SocialShareButtons.svelte';
import { getPhotoUrl, getPhotoFullUrl, getPhotoRotationStyle } from '$lib/utils/photoUrl';
import { handleImageLoadError } from '$lib/utils/imageErrorHandler';
import { logger } from '$lib/utils/logger';

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
	let photoLoaded: Record<string, boolean> = {};

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

	// Photo URL functions are now imported from shared utility

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
			logger.error(`Failed to fetch cover photo for sub-album ${albumId}:`, error);
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
			logger.error('Failed to fetch sub-album cover images:', error);
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
			logger.error('Failed to load more photos:', error);
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
				credentials: 'include',
			});
			const responseData = await response.json().catch(() => ({}));
			if (!response.ok) {
				if (response.status === 403) {
					throw new Error('Access denied. This album is private. Sign in to view it if you have access.');
				}
				throw new Error(responseData?.error || 'Album not found');
			}

			albumData = responseData;
			logger.debug('Album data loaded:', albumData);

			// Open lightbox at photo from hash (#p=index) when sharing a single photo
			if (browser && albumData?.photos?.length) {
				const m = window.location.hash.match(/^#p=(\d+)$/);
				if (m) {
					const idx = parseInt(m[1], 10);
					if (idx >= 0 && idx < albumData.photos.length) {
						lightboxIndex = idx;
						lightboxOpen = true;
					}
				}
			}
			
			// Debug: Log photo URLs for first few photos
			if (albumData && albumData.photos && albumData.photos.length > 0) {
				logger.debug('[DEBUG] Sample photo URLs:', albumData.photos.slice(0, 3).map((p: any) => ({
					id: p._id,
					filename: p.filename,
					storage: p.storage,
					thumbnailUrl: getPhotoUrl(p),
					fullImageUrl: getPhotoFullUrl(p)
				})));
			}

			// Fetch cover images for sub-albums using the batch API (hierarchical logic)
			if (albumData && albumData.subAlbums && albumData.subAlbums.length > 0) {
				fetchSubAlbumCoverImages(albumData.subAlbums.map((a: any) => a._id));
			}
		} catch (err) {
			logger.error('Failed to fetch album data:', err);
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
				<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
					<div class="flex-1 text-center md:text-left">
						<h1 class="text-5xl font-bold text-white mb-6 tracking-tight">
							<MultiLangText value={albumData.album.name} fallback="Untitled Album" />
						</h1>
						{#if albumData.album.description}
							<div class="text-lg text-purple-200 max-w-4xl mx-auto md:mx-0 prose prose-lg prose-invert">
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
					<div class="md:text-right text-center">
						<p class="text-xs uppercase tracking-wide text-purple-200 mb-2">Share album</p>
						<SocialShareButtons title="Album" size="sm" />
					</div>
				</div>

				{#if albumData.subAlbums && albumData.subAlbums.length > 0}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
						{#each albumData.subAlbums as subAlbum, idx}
							{@const coverImageUrl = subAlbumCoverImages[subAlbum._id]}
							{@const isLogo = coverImageUrl && (coverImageUrl.includes('/logos/') || coverImageUrl.includes('logo') || (coverImageUrl.includes('/api/storage/serve/') && coverImageUrl.includes('logo')))}
							<a href={`/albums/${subAlbum.alias}`} class="group relative overflow-hidden rounded-2xl cursor-pointer transform transition-all duration-500 hover:scale-105 hover:z-10">
								<div class="aspect-square bg-linear-to-b from-purple-600 to-blue-600 relative overflow-hidden rounded-2xl">
									{#if coverImageUrl}
										<img
											src={coverImageUrl}
											alt=""
											class="w-full h-full {isLogo
												? 'object-contain p-8 opacity-60 group-hover:opacity-80 transition-opacity bg-white'
												: 'object-cover group-hover:scale-110 transition-transform duration-500'}"
										/>
									{:else}
										<div class="absolute inset-0 flex items-center justify-center bg-linear-to-b from-purple-600 to-blue-600">
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
					<div class="columns-1 sm:columns-2 lg:columns-3 gap-4">
						{#each albumData.photos as photo, i}
							{@const photoWidth = photo.dimensions?.width || photo.metadata?.width}
							{@const photoHeight = photo.dimensions?.height || photo.metadata?.height}
							{@const hasDimensions = photoWidth && photoHeight && photoWidth > 0 && photoHeight > 0}
							{@const aspectRatio = hasDimensions ? photoWidth / photoHeight : 1}
							{@const isLandscape = aspectRatio >= 1}
							{@const thumbnailUrl = getPhotoUrl(photo)}
							{@const fullImageUrl = getPhotoFullUrl(photo)}
							<div
								class="group bg-white/5 backdrop-blur-sm rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105 hover:z-10 border border-white/10 mb-4 break-inside-avoid"
							>
								<button
									type="button"
									on:click={() => {
										lightboxIndex = i;
										lightboxOpen = true;
									}}
									class="w-full"
								>
									<div class="bg-linear-to-br from-purple-600 to-blue-600 relative overflow-hidden rounded-xl mb-3"
										style={hasDimensions && aspectRatio < 1
											? `width: 100%; max-height: 600px; aspect-ratio: ${aspectRatio};` 
											: hasDimensions
											? `width: 100%; padding-bottom: ${(1 / aspectRatio) * 100}%;`
											: 'width: 100%; padding-bottom: 100%;'}
									>
										{#if !photoLoaded[photo._id]}
											<div
												class="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10 rounded-xl"
												aria-live="polite"
												aria-busy="true"
											>
												<div class="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white mb-2"></div>
												<span class="text-white/90 text-xs">Loading photo…</span>
											</div>
										{/if}
										<img
											src={thumbnailUrl}
											alt=""
											class={hasDimensions && aspectRatio < 1 
												? "w-full h-full object-cover group-hover:scale-110 transition-all duration-300 " + (photoLoaded[photo._id] ? 'opacity-100' : 'opacity-30')
												: "absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-all duration-300 " + (photoLoaded[photo._id] ? 'opacity-100' : 'opacity-30')}
											style="image-orientation: from-image; {getPhotoRotationStyle(photo)}"
											on:error={async (e) => {
												// Check for token renewal errors first
												await handleImageLoadError(e);
												
												// Fallback to full image if thumbnail fails to load
												const target = e.currentTarget as HTMLImageElement;
												const currentSrc = target.src;
												
												logger.debug('[Photo] Image load error:', {
													currentSrc,
													thumbnailUrl,
													fullImageUrl,
													photoId: photo._id,
													storage: photo.storage
												});
												
												// Only fallback if we haven't already tried the full image
												if (currentSrc !== fullImageUrl && fullImageUrl && fullImageUrl !== thumbnailUrl) {
													logger.debug('[Photo] Attempting fallback to full image:', fullImageUrl);
													target.src = fullImageUrl;
												} else {
													// If full image also fails or already tried, show placeholder instead of hiding
													logger.error('[Photo] All image URLs failed, showing placeholder:', {
														thumbnail: thumbnailUrl,
														fullImage: fullImageUrl,
														currentSrc
													});
													// Show placeholder instead of hiding
													target.src = '/placeholder.jpg';
													target.onerror = null; // Prevent infinite loop
													photoLoaded = { ...photoLoaded, [photo._id]: true };
												}
											}}
											on:load={() => {
												logger.debug('[Photo] Image loaded successfully:', thumbnailUrl);
												photoLoaded = { ...photoLoaded, [photo._id]: true };
											}}
										/>
										<div class="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300 pointer-events-none"></div>
									</div>
								</button>
								
								<!-- Photo metadata below the image -->
								<div class="px-1">
									{#if photo.title}
										<h3 class="text-white font-semibold text-sm mb-1">
											<MultiLangText value={photo.title} fallback={`Photo ${i + 1}`} />
										</h3>
									{/if}
									{#if photo.description}
										<p class="text-purple-200 text-xs mb-2 line-clamp-2">
											{@html (typeof photo.description === 'string' ? photo.description : (photo.description as any)?.[$currentLanguage] || (photo.description as any)?.en || '').replace(/<[^>]*>/g, '')}
										</p>
									{/if}
									
									{#if photo.location || (photo.tags && photo.tags.length > 0) || (photo.people && photo.people.length > 0)}
										<div class="flex flex-wrap gap-2 text-xs text-purple-300">
											{#if photo.location}
												<span class="flex items-center gap-1">
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
													</svg>
													{#if typeof photo.location === 'string'}
														{photo.location}
													{:else}
														<MultiLangText value={(photo.location as { _id: string; name: any }).name} />
													{/if}
												</span>
											{/if}
											
											{#if photo.tags && photo.tags.length > 0}
												<span class="flex items-center gap-1 flex-wrap">
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
													</svg>
													{#each photo.tags.slice(0, 3) as tag}
														<span>
															{#if typeof tag === 'string'}
																{tag}
															{:else}
																<MultiLangText value={tag.name} />
															{/if}
														</span>
														{#if tag !== photo.tags[photo.tags.length - 1] && photo.tags.indexOf(tag) < 2}
															<span>,</span>
														{/if}
													{/each}
													{#if photo.tags.length > 3}
														<span>+{photo.tags.length - 3}</span>
													{/if}
												</span>
											{/if}
											
											{#if photo.people && photo.people.length > 0}
												<span class="flex items-center gap-1 flex-wrap">
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
													</svg>
													{#each photo.people.slice(0, 2) as person}
														<span>
															{#if typeof person === 'string'}
																{person}
															{:else}
																<MultiLangText value={(person as { _id: string; fullName?: any; firstName?: any }).fullName || (person as { _id: string; fullName?: any; firstName?: any }).firstName} />
															{/if}
														</span>
														{#if person !== photo.people[photo.people.length - 1] && photo.people.indexOf(person) < 1}
															<span>,</span>
														{/if}
													{/each}
													{#if photo.people.length > 2}
														<span>+{photo.people.length - 2}</span>
													{/if}
												</span>
											{/if}
										</div>
									{/if}
								</div>
							</div>
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
				rotation: p.rotation,
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
