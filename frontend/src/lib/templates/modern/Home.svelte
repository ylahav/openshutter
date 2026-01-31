<script lang="ts">
	import type { PageData } from '../../../routes/$types';
	import HomeHero from '$components/HomeHero.svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';

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
				logger.debug('Cover images API response:', result);
				
				// Handle both wrapped {success, data} and direct Record<string, string> formats
				if (result.success && result.data) {
					// Wrapped format: {success: true, data: Record<string, string>}
					coverImages = result.data;
				} else if (result && typeof result === 'object' && !result.success) {
					// Direct format: Record<string, string> (albumId -> coverImageUrl)
					coverImages = result;
				} else {
					logger.warn('Unexpected response structure:', result);
				}
			} else {
				logger.error('Failed to fetch cover images, status:', response.status);
			}
		} catch (err) {
			logger.error('Failed to fetch cover images:', err);
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

<section class="bg-linear-to-b from-slate-900 via-purple-900 to-slate-900">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
		<div class="flex items-center justify-between mb-10">
			<div>
				<h2 class="text-4xl font-bold text-white mb-2 tracking-tight">{$t('admin.featuredAlbums')}</h2>
				<p class="text-purple-300 text-lg">{$t('albums.rootLevelAlbumsDescription')}</p>
			</div>
			<a href="/albums" class="text-sm font-medium text-white hover:text-purple-300 transition-colors px-4 py-2 bg-purple-600/50 hover:bg-purple-600/70 rounded-lg backdrop-blur-sm">
				{$t('hero.browseAllAlbums')} →
			</a>
		</div>

		{#if data.albumsError}
			<div class="bg-red-900/50 text-red-200 px-4 py-3 rounded-lg text-sm border border-red-700">
				Failed to load albums: {data.albumsError}
			</div>
		{:else if !data.rootAlbums || data.rootAlbums.length === 0}
			<div class="bg-slate-800/50 text-gray-300 px-4 py-3 rounded-lg text-sm border border-slate-700">
				No albums available yet.
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each data.rootAlbums as album, idx}
					{@const coverImageUrl = coverImages[album._id]}
					{@const isLogo = coverImageUrl && (coverImageUrl.includes('/logos/') || coverImageUrl.includes('logo') || (coverImageUrl.includes('/api/storage/serve/') && coverImageUrl.includes('logo')))}
					<a
						href={`/albums/${album.alias ?? album._id}`}
						class="group relative overflow-hidden rounded-2xl cursor-pointer transform transition-all duration-500 hover:scale-105 hover:z-10"
						style="animation-delay: {idx * 0.1}s"
					>
						<div class="aspect-square bg-linear-to-b from-purple-600 to-blue-600 relative overflow-hidden rounded-2xl">
							{#if coverImagesLoading[album._id]}
								<div class="absolute inset-0 flex items-center justify-center bg-slate-800/50">
									<div class="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
								</div>
							{:else if coverImageUrl}
								<img
									src={coverImageUrl}
									alt={MultiLangUtils.getTextValue(album.name, $currentLanguage) || 'Album cover'}
									class="w-full h-full transition-all duration-500 {isLogo
										? 'object-contain p-4 bg-white'
										: 'object-cover group-hover:scale-110'}"
								/>
							{:else}
								<div class="absolute inset-0 flex items-center justify-center bg-linear-to-b from-purple-600 to-blue-600">
									<svg class="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</div>
							{/if}
							<div class="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300"></div>
							<div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
								<h3 class="text-white font-semibold text-lg mb-1">
									{#if album.name}
										{MultiLangUtils.getTextValue(album.name, $currentLanguage)}
									{:else}
										Untitled album
									{/if}
								</h3>
								{#if album.description}
									{@const desc = MultiLangUtils.getHTMLValue(album.description, $currentLanguage)}
									{#if desc}
										<p class="text-white/70 text-sm line-clamp-1">{@html desc.replace(/<[^>]*>/g, '')}</p>
									{/if}
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
