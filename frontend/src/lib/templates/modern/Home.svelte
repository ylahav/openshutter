<script lang="ts">
	import type { PageData } from '../../../routes/$types';
	import HomeHero from '$components/HomeHero.svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';
	import { onMount } from 'svelte';

	export let data: PageData;

	let coverImages: Record<string, string> = {};
	let coverImagesLoading: Record<string, boolean> = {};

	onMount(async () => {
		if (!data.rootAlbums || data.rootAlbums.length === 0) return;

		// Initialize loading state for all albums
		data.rootAlbums.forEach((album) => {
			coverImagesLoading[album._id] = true;
		});

		// Fetch cover images for all albums using batch API
		try {
			const response = await fetch('/api/albums/cover-images', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					albumIds: data.rootAlbums.map((a) => a._id),
				}),
			});

			if (response.ok) {
				const result = await response.json();
				console.log('Cover images API response:', result);
				
				// Handle both wrapped {success, data} and direct Record<string, string> formats
				if (result.success && result.data) {
					// Wrapped format: {success: true, data: Record<string, string>}
					coverImages = result.data;
				} else if (result && typeof result === 'object' && !result.success) {
					// Direct format: Record<string, string> (albumId -> coverImageUrl)
					coverImages = result;
				} else {
					console.warn('Unexpected response structure:', result);
				}
			} else {
				console.error('Failed to fetch cover images, status:', response.status);
			}
		} catch (err) {
			console.error('Failed to fetch cover images:', err);
		} finally {
			// Mark all albums as no longer loading
			data.rootAlbums.forEach((album) => {
				coverImagesLoading[album._id] = false;
			});
		}
	});
</script>

<!-- Modern template home layout -->
<HomeHero />

<section class="bg-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h2 class="text-2xl font-semibold text-gray-900">{$t('admin.featuredAlbums')}</h2>
				<p class="mt-1 text-sm text-gray-500">{$t('albums.rootLevelAlbumsDescription')}</p>
			</div>
			<a href="/albums" class="text-sm font-medium text-primary-600 hover:text-primary-700">
				{$t('hero.browseAllAlbums')}
			</a>
		</div>

		{#if data.albumsError}
			<div class="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">
				Failed to load albums: {data.albumsError}
			</div>
		{:else if !data.rootAlbums || data.rootAlbums.length === 0}
			<div class="bg-gray-50 text-gray-600 px-4 py-3 rounded-md text-sm">
				No albums available yet.
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each data.rootAlbums as album}
					{@const coverImageUrl = coverImages[album._id]}
					{@const isLogo = coverImageUrl && (coverImageUrl.includes('/logos/') || coverImageUrl.includes('logo') || (coverImageUrl.includes('/api/storage/serve/') && coverImageUrl.includes('logo')))}
					<a
						href={`/albums/${album.alias ?? album._id}`}
						class="group rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col"
					>
						<div class="aspect-4/3 bg-gray-100 relative overflow-hidden">
							{#if coverImagesLoading[album._id]}
								<div class="absolute inset-0 flex items-center justify-center">
									<div class="w-8 h-8 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin"></div>
								</div>
							{:else if coverImageUrl}
								<img
									src={coverImageUrl}
									alt={MultiLangUtils.getTextValue(album.name, $currentLanguage) || 'Album cover'}
									class="w-full h-full transition-transform duration-300 group-hover:scale-110 {isLogo
										? 'object-contain p-4 bg-white'
										: 'object-cover'}"
								/>
							{:else}
								<div class="absolute inset-0 flex items-center justify-center text-gray-400">
									<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</div>
							{/if}
						</div>
						<div class="p-4 flex-1 flex flex-col">
							<h3 class="text-base font-semibold text-gray-900 group-hover:text-primary-600 truncate">
								{#if album.name}
									{MultiLangUtils.getTextValue(album.name, $currentLanguage)}
								{:else}
									Untitled album
								{/if}
							</h3>
							{#if album.description}
								{@const desc = MultiLangUtils.getHTMLValue(album.description, $currentLanguage)}
								{#if desc}
									<div class="mt-1 text-xs text-gray-500 line-clamp-2">{@html desc}</div>
								{/if}
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
