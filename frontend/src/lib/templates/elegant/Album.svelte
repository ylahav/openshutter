<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
import { MultiLangUtils } from '$utils/multiLang';
import MultiLangText from '$lib/components/MultiLangText.svelte';
import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
import { getPhotoUrl, getPhotoRotationStyle } from '$lib/utils/photoUrl';
import { logger } from '$lib/utils/logger';
import SocialShareButtons from '$lib/components/SocialShareButtons.svelte';

	interface AlbumData {
		album: {
			_id: string;
			name: any;
			description?: any;
			alias: string;
			photoCount?: number;
		};
		subAlbums: any[];
		photos: any[];
	}

	let alias = $page.params.alias || $page.params.id;
	let albumData: AlbumData | null = null;
	let loading = true;
	let error: string | null = null;
	let lightboxOpen = false;
	let lightboxIndex = 0;
	let isInitialLoad = true;
	let photoLoaded: Record<string, boolean> = {};
	let subAlbumCoverImages: Record<string, string> = {};

	// React to route parameter changes
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

	onMount(async () => {
		if (alias && isInitialLoad) {
			await fetchAlbumData();
			isInitialLoad = false;
		}
	});

	async function fetchAlbumData() {
		if (!alias || !browser) return;
		try {
			loading = true;
			error = null;
			const res = await fetch(`/api/albums/${encodeURIComponent(alias)}/data?page=1&limit=50&t=${Date.now()}`, {
				cache: 'no-store'
			});
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({ error: 'Album not found' }));
				throw new Error(errorData.error || 'Album not found');
			}
			const data = await res.json();
			albumData = data;
			logger.debug('Album data loaded:', albumData);
			// Open lightbox at photo from hash (#p=index) when sharing a single photo
			if (browser && data?.photos?.length) {
				const m = window.location.hash.match(/^#p=(\d+)$/);
				if (m) {
					const idx = parseInt(m[1], 10);
					if (idx >= 0 && idx < data.photos.length) {
						lightboxIndex = idx;
						lightboxOpen = true;
					}
				}
			}
			if (data?.subAlbums?.length) {
				fetchSubAlbumCoverImages(data.subAlbums.map((a: { _id: string }) => a._id));
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch album';
			albumData = null;
		} finally {
			loading = false;
		}
	}

	function openLightbox(index: number) {
		lightboxIndex = index;
		lightboxOpen = true;
	}

	async function fetchSubAlbumCoverImages(albumIds: string[]) {
		if (albumIds.length === 0) return;
		try {
			const response = await fetch('/api/albums/cover-images', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ albumIds })
			});
			if (response.ok) {
				const result = await response.json();
				const data = result.success ? result.data : result;
				if (data && typeof data === 'object') {
					subAlbumCoverImages = { ...subAlbumCoverImages, ...data };
				}
			}
		} catch (err) {
			logger.error('Failed to fetch sub-album cover images:', err);
		}
	}

	// Photo URL function is now imported from shared utility
	$: showAlbumShare = $siteConfigData?.features?.enableSharing !== false && $siteConfigData?.features?.sharingOnAlbum !== false;
	$: showPhotoShare = $siteConfigData?.features?.enableSharing !== false && $siteConfigData?.features?.sharingOnPhoto !== false;
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-linear-to-b from-purple-50 to-white">
		<div class="text-center">
			<div class="w-10 h-10 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-sm text-gray-600 font-light">Loading album...</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen flex items-center justify-center bg-linear-to-b from-purple-50 to-white">
		<div class="text-center">
			<p class="text-sm text-red-600 font-light">{error}</p>
		</div>
	</div>
{:else if albumData}
	<div class="min-h-screen bg-linear-to-b from-purple-50 to-white">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
			<!-- Breadcrumbs: above the title, inside template border with space from top -->
			{#if albumData.album}
				<div class="pb-4 mb-6 border-b border-purple-100">
					<AlbumBreadcrumbs albumId={albumData.album._id} />
				</div>
			{/if}

			<!-- Album Header -->
			<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
				<div class="flex-1">
					<h1
						class="text-4xl md:text-5xl font-serif text-gray-900 mb-6 tracking-wide"
						style="font-family: 'Playfair Display', serif;"
					>
						{MultiLangUtils.getTextValue(albumData.album.name, $currentLanguage)}
					</h1>
					{#if albumData.album.description}
						<div class="prose prose-lg max-w-4xl mx-auto mb-4 text-gray-700">
							{@html MultiLangUtils.getHTMLValue(albumData.album.description, $currentLanguage)}
						</div>
					{/if}
				</div>
				{#if showAlbumShare}
					<div class="md:text-right">
						<p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Share album</p>
						<SocialShareButtons
							title={MultiLangUtils.getTextValue(albumData.album.name, $currentLanguage)}
							size="sm"
						/>
					</div>
				{/if}
			</div>
		</div>

		<!-- Sub-albums -->
		{#if albumData.subAlbums && albumData.subAlbums.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-purple-100">
				<h2 class="text-2xl font-serif text-gray-900 mb-6 tracking-wide" style="font-family: 'Playfair Display', serif;">
					Sub-albums
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					{#each albumData.subAlbums as subAlbum}
						{@const coverImageUrl = subAlbumCoverImages[subAlbum._id]}
						<a
							href={`/albums/${subAlbum.alias || subAlbum._id}`}
							class="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
						>
							<div class="aspect-square bg-linear-to-b from-purple-100 to-purple-50 relative overflow-hidden">
								{#if coverImageUrl}
									<img
										src={coverImageUrl}
										alt=""
										class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
									/>
								{:else}
									<div class="absolute inset-0 flex items-center justify-center text-purple-200">
										<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</div>
								{/if}
							</div>
							<div class="p-6">
								<h3 class="text-lg font-serif text-gray-900 mb-2" style="font-family: 'Playfair Display', serif;">
									{MultiLangUtils.getTextValue(subAlbum.name, $currentLanguage)}
								</h3>
								<p class="text-sm text-gray-600 font-light">
									{#if subAlbum.photoCount && subAlbum.photoCount > 0}
										{subAlbum.photoCount} photos
									{/if}
									{#if subAlbum.photoCount && subAlbum.photoCount > 0 && subAlbum.childAlbumCount && subAlbum.childAlbumCount > 0}
										• 
									{/if}
									{#if subAlbum.childAlbumCount && subAlbum.childAlbumCount > 0}
										{subAlbum.childAlbumCount} {subAlbum.childAlbumCount === 1 ? 'album' : 'albums'}
									{/if}
								</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Photos Grid -->
		{#if albumData.photos && albumData.photos.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-purple-100">
				<h2 class="text-2xl font-serif text-gray-900 mb-6 tracking-wide" style="font-family: 'Playfair Display', serif;">
					Photos
				</h2>
				<div class="columns-1 sm:columns-2 lg:columns-3 gap-6">
					{#each albumData.photos as photo, index}
						{@const photoWidth = photo.dimensions?.width || photo.metadata?.width}
						{@const photoHeight = photo.dimensions?.height || photo.metadata?.height}
						{@const hasDimensions = photoWidth && photoHeight && photoWidth > 0 && photoHeight > 0}
						{@const aspectRatio = hasDimensions ? photoWidth / photoHeight : 1}
						<div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5 border border-purple-100 transform hover:-translate-y-1 mb-6 break-inside-avoid">
							<button
								on:click={() => openLightbox(index)}
								class="w-full mb-4"
							>
								<div class="bg-linear-to-b from-purple-100 to-indigo-100 relative overflow-hidden rounded-lg"
									style={hasDimensions && aspectRatio < 1
										? `width: 100%; max-height: 600px; aspect-ratio: ${aspectRatio};` 
										: hasDimensions
										? `width: 100%; padding-bottom: ${(1 / aspectRatio) * 100}%;`
										: 'width: 100%; padding-bottom: 100%;'}
								>
									{#if !photoLoaded[photo._id]}
										<div
											class="absolute inset-0 flex flex-col items-center justify-center bg-purple-100/90 z-10 rounded-lg"
											aria-live="polite"
											aria-busy="true"
										>
											<div class="animate-spin rounded-full h-10 w-10 border-2 border-purple-200 border-t-purple-600 mb-2"></div>
											<span class="text-purple-700 text-xs">Loading photo…</span>
										</div>
									{/if}
									<img
										src={getPhotoUrl(photo)}
										alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
										class={hasDimensions && aspectRatio < 1 
											? "w-full h-full object-cover hover:scale-110 transition-all duration-300 " + (photoLoaded[photo._id] ? 'opacity-100' : 'opacity-30')
											: "absolute inset-0 w-full h-full object-cover hover:scale-110 transition-all duration-300 " + (photoLoaded[photo._id] ? 'opacity-100' : 'opacity-30')}
										style="image-orientation: from-image; {getPhotoRotationStyle(photo)}"
										on:load={() => { photoLoaded = { ...photoLoaded, [photo._id]: true }; }}
										on:error={() => { photoLoaded = { ...photoLoaded, [photo._id]: true }; }}
									/>
								</div>
							</button>
							
							<!-- Photo metadata below the image -->
							<div class="px-1">
								{#if photo.title}
									<h3 class="text-gray-900 font-serif text-sm mb-1" style="font-family: 'Playfair Display', serif;">
										<MultiLangText value={photo.title} fallback={`Photo ${index + 1}`} />
									</h3>
								{/if}
								{#if photo.description}
									<p class="text-gray-600 text-xs mb-2 line-clamp-2 font-light">
										{@html (typeof photo.description === 'string' ? photo.description : MultiLangUtils.getHTMLValue(photo.description, $currentLanguage) || '').replace(/<[^>]*>/g, '')}
									</p>
								{/if}
								
								{#if photo.location || (photo.tags && photo.tags.length > 0) || (photo.people && photo.people.length > 0)}
									<div class="flex flex-wrap gap-2 text-xs text-gray-500 font-light">
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
								{#if showPhotoShare && typeof window !== 'undefined'}
									<div class="mt-3 pt-3 border-t border-purple-100">
										<p class="text-xs text-gray-500 font-light mb-1">Share this photo</p>
										<SocialShareButtons
											url={typeof window !== 'undefined' ? `${window.location.origin}${$page.url.pathname}#p=${index}` : undefined}
											title={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
											size="sm"
										/>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			{#if !albumData.subAlbums || albumData.subAlbums.length === 0}
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-purple-100">
					<p class="text-sm text-gray-600 text-center font-light">No photos in this album yet.</p>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Photo Lightbox -->
	{#if lightboxOpen && albumData.photos}
		<PhotoLightbox
			photos={albumData.photos}
			initialIndex={lightboxIndex}
			on:close={() => (lightboxOpen = false)}
		/>
	{/if}
{/if}
