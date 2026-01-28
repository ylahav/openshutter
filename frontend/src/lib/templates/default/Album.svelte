<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import MultiLangText from '$lib/components/MultiLangText.svelte';
	import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import { getPhotoUrl } from '$lib/utils/photoUrl';

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

	let albumData: AlbumData | null = null;
	let loading = true;
	let error: string | null = null;
	let lightboxOpen = false;
	let lightboxIndex = 0;

	$: alias = $page.params.alias || $page.params.id;

	onMount(async () => {
		if (alias) {
			await fetchAlbumData();
		}
	});

	async function fetchAlbumData() {
		if (!alias) return;
		try {
			loading = true;
			const res = await fetch(`/api/albums/by-alias/${alias}/data`);
			if (!res.ok) throw new Error('Album not found');
			const data = await res.json();
			albumData = data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch album';
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
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
			<p class="text-gray-600">Loading album...</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<p class="text-red-600">{error}</p>
		</div>
	</div>
{:else if albumData}
	<div class="min-h-screen bg-gray-50">
		<!-- Breadcrumbs -->
		{#if albumData.album}
			<AlbumBreadcrumbs albumId={albumData.album._id} />
		{/if}

		<!-- Album Header -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<h1 class="text-4xl font-bold text-gray-900 mb-4">
				{MultiLangUtils.getTextValue(albumData.album.name, $currentLanguage)}
			</h1>
			{#if albumData.album.description}
				<div class="prose prose-lg max-w-4xl mx-auto mb-6">
					{@html MultiLangUtils.getHTMLValue(albumData.album.description, $currentLanguage)}
				</div>
			{/if}
		</div>

		<!-- Sub-albums -->
		{#if albumData.subAlbums && albumData.subAlbums.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<h2 class="text-2xl font-semibold text-gray-900 mb-4">Sub-albums</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					{#each albumData.subAlbums as subAlbum}
						<a
							href={`/albums/${subAlbum.alias || subAlbum._id}`}
							class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
						>
							<h3 class="text-lg font-semibold text-gray-900 mb-2">
								{MultiLangUtils.getTextValue(subAlbum.name, $currentLanguage)}
							</h3>
							<p class="text-sm text-gray-600">
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
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<h2 class="text-2xl font-semibold text-gray-900 mb-4">Photos</h2>
				<div class="columns-1 sm:columns-2 lg:columns-3 gap-4">
					{#each albumData.photos as photo, index}
						{@const photoWidth = photo.dimensions?.width || photo.metadata?.width}
						{@const photoHeight = photo.dimensions?.height || photo.metadata?.height}
						{@const hasDimensions = photoWidth && photoHeight && photoWidth > 0 && photoHeight > 0}
						{@const aspectRatio = hasDimensions ? photoWidth / photoHeight : 1}
						<div class="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-4 border border-gray-100 mb-4 break-inside-avoid">
							<button
								on:click={() => openLightbox(index)}
								class="w-full mb-3"
							>
								<div class="bg-gray-200 relative overflow-hidden rounded-lg"
									style={hasDimensions && aspectRatio < 1
										? `width: 100%; max-height: 600px; aspect-ratio: ${aspectRatio};` 
										: hasDimensions
										? `width: 100%; padding-bottom: ${(1 / aspectRatio) * 100}%;`
										: 'width: 100%; padding-bottom: 100%;'}
								>
									<img
										src={getPhotoUrl(photo)}
										alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
										class={hasDimensions && aspectRatio < 1 
											? "w-full h-full object-cover"
											: "absolute inset-0 w-full h-full object-cover"}
										style="image-orientation: from-image;"
									/>
								</div>
							</button>
							
							<!-- Photo metadata below the image -->
							<div class="px-1">
								{#if photo.title}
									<h3 class="text-gray-900 font-semibold text-sm mb-1">
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
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<p class="text-gray-600 text-center">No photos in this album yet.</p>
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
