<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
import { MultiLangUtils } from '$utils/multiLang';
import { logger } from '$lib/utils/logger';
import SocialShareButtons from '$lib/components/SocialShareButtons.svelte';

	interface TemplateAlbum {
		_id: string;
		name: any;
		description?: any;
		alias: string;
		photoCount?: number;
		childAlbumCount?: number;
		coverPhotoId?: string;
	}

	interface TemplatePhoto {
		_id: string;
		url?: string;
		storage?: {
			url?: string;
			thumbnailPath?: string;
		};
	}

	let albums: TemplateAlbum[] = [];
	let loading = true;
	let error: string | null = null;
	let coverPhotos: Record<string, TemplatePhoto> = {};

	async function fetchCoverPhoto(albumId: string, coverPhotoId: string) {
		try {
			const response = await fetch(`/api/photos/${coverPhotoId}`);
			if (response.ok) {
				const photo = await response.json();
				coverPhotos = { ...coverPhotos, [albumId]: photo };
			}
		} catch (error) {
			logger.error(`Failed to fetch cover photo for album ${albumId}:`, error);
		}
	}

	async function fetchRootAlbums() {
		try {
			loading = true;
			const response = await fetch('/api/albums?parentId=root');
			if (!response.ok) {
				throw new Error('Failed to fetch albums');
			}
			const albumsData = await response.json();
			if (Array.isArray(albumsData)) {
				albums = albumsData.sort((a: TemplateAlbum, b: TemplateAlbum) => (a.order || 0) - (b.order || 0));
				albums.forEach((album: TemplateAlbum) => {
					if (album.coverPhotoId) {
						fetchCoverPhoto(album._id, album.coverPhotoId);
					}
				});
			} else {
				error = 'Failed to fetch albums';
			}
		} catch (err) {
			logger.error('Failed to fetch albums:', err);
			error = 'Failed to fetch albums';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchRootAlbums();
	});
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<div class="text-white">Loading gallery...</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen">
		{#if error}
			<section class="py-8">
				<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<div class="text-red-300 mb-4">{error}</div>
				</div>
			</section>
		{:else if albums.length === 0}
			<section class="py-12">
				<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<div class="text-purple-200 mb-4">No albums found. Create your first album to get started!</div>
					<a href="/albums/new" class="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
						Create New Album
					</a>
				</div>
			</section>
		{:else}
			<section class="py-8">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
			<h1 class="text-3xl font-bold text-white">Photo Gallery</h1>
			<div class="md:text-right">
				<p class="text-xs uppercase tracking-wide text-purple-200 mb-1">Share gallery</p>
				<SocialShareButtons title="Photo Gallery" size="sm" />
			</div>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each albums as album, idx}
							<a href={`/albums/${album.alias}`} class="group relative overflow-hidden rounded-2xl cursor-pointer transform transition-all duration-500 hover:scale-105 hover:z-10">
								<div class="aspect-square bg-linear-to-b from-purple-600 to-blue-600 relative overflow-hidden rounded-2xl">
									{#if album.coverPhotoId && coverPhotos[album._id]}
										<img
											src={coverPhotos[album._id].storage?.thumbnailPath ||
												coverPhotos[album._id].url ||
												'/placeholder.jpg'}
											alt={MultiLangUtils.getTextValue(album.name, $currentLanguage)}
											class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
											style="image-orientation: from-image;"
										/>
									{:else}
										<div class="absolute inset-0 flex items-center justify-center bg-linear-to-b from-purple-600 to-blue-600">
											<svg class="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
											</svg>
										</div>
									{/if}
									<div class="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300"></div>
									<div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
										<h3 class="text-white font-semibold text-lg mb-1">
											{MultiLangUtils.getTextValue(album.name, $currentLanguage) || album.alias || 'Untitled Album'}
										</h3>
										<p class="text-white/70 text-sm">
											{#if album.photoCount && album.photoCount > 0}
												{album.photoCount} photos
											{/if}
											{#if album.photoCount && album.photoCount > 0 && album.childAlbumCount && album.childAlbumCount > 0}
												• 
											{/if}
											{#if album.childAlbumCount && album.childAlbumCount > 0}
												{album.childAlbumCount} sub-albums
											{/if}
										</p>
									</div>
								</div>
							</a>
						{/each}
					</div>
				</div>
			</section>
		{/if}
	</div>
{/if}
