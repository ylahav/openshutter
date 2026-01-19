<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		description?: string | { en?: string; he?: string };
		alias: string;
		level: number;
		isFeatured: boolean;
		isPublic: boolean;
		photoCount: number;
		childAlbumCount?: number;
		coverPhotoId?: string;
		coverPhoto?: any;
	}

	let albums: Album[] = [];
	let isLoading = true;
	let error = '';
	let coverImages: Record<string, string> = {};

	// Functions that use current language reactively
	function getAlbumName(album: Album): string {
		if (typeof album.name === 'string') return album.name;
		// Use $currentLanguage to make it reactive - Svelte will track this dependency
		const lang = $currentLanguage;
		return MultiLangUtils.getTextValue(album.name, lang) || '(No name)';
	}

	function getAlbumDescription(album: Album): string {
		if (!album.description) return '';
		if (typeof album.description === 'string') return album.description;
		// Use $currentLanguage to make it reactive - Svelte will track this dependency
		// Use getHTMLValue since descriptions can contain HTML
		const lang = $currentLanguage;
		return MultiLangUtils.getHTMLValue(album.description, lang) || '';
	}

	async function fetchAlbums() {
		try {
			isLoading = true;
			error = '';
			// Fetch root albums (no parent) - API handles access control
			const response = await fetch('/api/albums?parentId=root');
			if (!response.ok) {
				throw new Error('Failed to fetch albums');
			}
			const data = await response.json();
			if (Array.isArray(data)) {
				albums = data.sort((a: Album, b: Album) => ((a as any).order || 0) - ((b as any).order || 0));
				// Fetch cover images for albums
				await fetchCoverImages();
			} else {
				console.error('API returned unexpected format:', data);
				albums = [];
			}
		} catch (err) {
			console.error('Failed to fetch albums:', err);
			error = `Failed to load albums: ${err instanceof Error ? err.message : 'Unknown error'}`;
			albums = [];
		} finally {
			isLoading = false;
		}
	}

	async function fetchCoverImages() {
		// Fetch cover images for ALL albums (not just those with coverPhotoId)
		if (albums.length === 0) return;

		try {
			// Fetch cover images from the cover-images API
			const response = await fetch('/api/albums/cover-images', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					albumIds: albums.map((a) => a._id),
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
		}
	}

	onMount(() => {
		fetchAlbums();
	});
</script>

<svelte:head>
	<title>Albums - OpenShutter</title>
</svelte:head>

{#if isLoading}
	<section class="py-16 bg-gray-50">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center">
				<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				<p class="mt-4 text-gray-600">{$t('loading.loadingGallery')}</p>
			</div>
		</div>
	</section>
{:else if error}
	<section class="py-16 bg-gray-50">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center">
				<div class="p-4 bg-red-50 border border-red-200 rounded-md max-w-md mx-auto">
					<p class="text-red-700">{error}</p>
				</div>
			</div>
		</div>
	</section>
{:else if albums.length === 0}
	<section class="py-16 bg-gray-50">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center py-12">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">{$t('albums.noAlbumsTitle')}</h3>
				<p class="mt-1 text-sm text-gray-500">{$t('albums.noAlbumsText')}</p>
			</div>
		</div>
	</section>
{:else}
	<section class="py-16 bg-gray-50">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">{$t('navigation.albums')}</h1>
				<p class="mt-2 text-gray-600">{$t('albums.browsePhotoCollections')}</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each albums as album}
					{@const coverImageUrl = coverImages[album._id]}
					{@const isLogo = coverImageUrl && (coverImageUrl.includes('/logos/') || coverImageUrl.includes('logo') || coverImageUrl.includes('/api/storage/serve/') && coverImageUrl.includes('logo'))}
					<div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
						<!-- Cover Image -->
						<div class="aspect-video bg-gray-200 overflow-hidden">
							{#if coverImageUrl}
								<img
									src={coverImageUrl}
									alt={getAlbumName(album)}
									class="w-full h-full transition-transform duration-300 group-hover:scale-105 {isLogo
										? 'object-contain p-4 bg-white'
										: 'object-cover'}"
								/>
							{:else}
								<div
									class="w-full h-full bg-linear-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
								>
									<svg class="w-16 h-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</div>
							{/if}
						</div>

						<!-- Album Info -->
						<div class="p-6">
							<div class="flex items-center justify-between mb-2">
								<h3
									class="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors"
								>
									{getAlbumName(album)}
								</h3>
								{#if album.isFeatured}
									<span
										class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
									>
										⭐ {$t('owner.featured')}
									</span>
								{/if}
							</div>

							{#if getAlbumDescription(album)}
								<div class="text-gray-600 mb-4 line-clamp-2">{@html getAlbumDescription(album)}</div>
							{/if}

							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-500">
									{#if album.photoCount && album.photoCount > 0}
										{album.photoCount} {$t('albums.photos')}
									{/if}
									{#if album.photoCount && album.photoCount > 0 && album.childAlbumCount && album.childAlbumCount > 0}
										• 
									{/if}
									{#if album.childAlbumCount && album.childAlbumCount > 0}
										{album.childAlbumCount} {album.childAlbumCount === 1 ? $t('albums.subAlbum') : $t('albums.subAlbums')}
									{/if}
								</span>
								<a
									href="/albums/{album.alias}"
									class="text-blue-600 hover:text-blue-700 font-medium text-sm group-hover:underline"
								>
									{$t('albums.viewAlbum')} →
								</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}
