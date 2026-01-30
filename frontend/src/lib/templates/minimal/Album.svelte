<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import MultiLangText from '$lib/components/MultiLangText.svelte';
	import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import { getPhotoUrl } from '$lib/utils/photoUrl';
	import { logger } from '$lib/utils/logger';

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

	// Photo URL function is now imported from shared utility
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-white">
		<div class="text-center">
			<div class="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-sm text-gray-600">Loading album...</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen flex items-center justify-center bg-white">
		<div class="text-center">
			<p class="text-sm text-black">{error}</p>
		</div>
	</div>
{:else if albumData}
	<div class="min-h-screen bg-white">
		<!-- Breadcrumbs -->
		{#if albumData.album}
			<AlbumBreadcrumbs albumId={albumData.album._id} />
		{/if}

		<!-- Album Header -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<h1 class="text-3xl font-light text-black mb-4 tracking-tight">
				{MultiLangUtils.getTextValue(albumData.album.name, $currentLanguage)}
			</h1>
			{#if albumData.album.description}
				<div class="prose prose-sm max-w-4xl mb-6 text-gray-600">
					{@html MultiLangUtils.getHTMLValue(albumData.album.description, $currentLanguage)}
				</div>
			{/if}
		</div>

		<!-- Sub-albums -->
		{#if albumData.subAlbums && albumData.subAlbums.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200">
				<h2 class="text-xl font-light text-black mb-4 tracking-tight">Sub-albums</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					{#each albumData.subAlbums as subAlbum}
						<a
							href={`/albums/${subAlbum.alias || subAlbum._id}`}
							class="bg-white border border-black hover:border-gray-600 transition-colors p-4"
						>
							<h3 class="text-base font-normal text-black mb-1">
								{MultiLangUtils.getTextValue(subAlbum.name, $currentLanguage)}
							</h3>
							<p class="text-xs text-gray-600">
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
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Photos Grid -->
		{#if albumData.photos && albumData.photos.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200">
				<h2 class="text-xl font-light text-black mb-4 tracking-tight">Photos</h2>
				<div class="columns-1 sm:columns-2 lg:columns-3 gap-3">
					{#each albumData.photos as photo, index}
						{@const photoWidth = photo.dimensions?.width || photo.metadata?.width}
						{@const photoHeight = photo.dimensions?.height || photo.metadata?.height}
						{@const hasDimensions = photoWidth && photoHeight && photoWidth > 0 && photoHeight > 0}
						{@const aspectRatio = hasDimensions ? photoWidth / photoHeight : 1}
						<div class="bg-white border border-black p-3 hover:border-gray-600 transition-colors mb-3 break-inside-avoid">
							<button
								on:click={() => openLightbox(index)}
								class="w-full mb-3"
							>
								<div class="bg-gray-100 relative overflow-hidden"
									style={hasDimensions && aspectRatio < 1
										? `width: 100%; max-height: 600px; aspect-ratio: ${aspectRatio};` 
										: hasDimensions
										? `width: 100%; padding-bottom: ${(1 / aspectRatio) * 100}%;`
										: 'width: 100%; padding-bottom: 100%;'}
								>
									{#if !photoLoaded[photo._id]}
										<div
											class="absolute inset-0 flex flex-col items-center justify-center bg-gray-200/90 z-10"
											aria-live="polite"
											aria-busy="true"
										>
											<div class="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-600 mb-2"></div>
											<span class="text-gray-600 text-xs">Loading photo…</span>
										</div>
									{/if}
									<img
										src={getPhotoUrl(photo)}
										alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
										class={hasDimensions && aspectRatio < 1 
											? "w-full h-full object-cover transition-opacity duration-200 " + (photoLoaded[photo._id] ? 'opacity-100' : 'opacity-30')
											: "absolute inset-0 w-full h-full object-cover transition-opacity duration-200 " + (photoLoaded[photo._id] ? 'opacity-100' : 'opacity-30')}
										style="image-orientation: from-image;"
										on:load={() => { photoLoaded = { ...photoLoaded, [photo._id]: true }; }}
										on:error={() => { photoLoaded = { ...photoLoaded, [photo._id]: true }; }}
									/>
								</div>
							</button>
							
							<!-- Photo metadata below the image -->
							<div class="px-1">
								{#if photo.title}
									<h3 class="text-black font-normal text-sm mb-1">
										<MultiLangText value={photo.title} fallback={`Photo ${index + 1}`} />
									</h3>
								{/if}
								{#if photo.description}
									<p class="text-gray-600 text-xs mb-2 line-clamp-2">
										{@html (typeof photo.description === 'string' ? photo.description : MultiLangUtils.getHTMLValue(photo.description, $currentLanguage) || '').replace(/<[^>]*>/g, '')}
									</p>
								{/if}
								
								{#if photo.location || (photo.tags && photo.tags.length > 0) || (photo.people && photo.people.length > 0)}
									<div class="flex flex-wrap gap-2 text-xs text-gray-500">
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
			</div>
		{:else}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200">
				<p class="text-sm text-gray-600 text-center">No photos in this album yet.</p>
			</div>
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
