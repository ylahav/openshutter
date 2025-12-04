<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import Header from '$components/Header.svelte';
	import Footer from '$components/Footer.svelte';

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
			console.error(`Failed to fetch cover photo for album ${albumId}:`, error);
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
			console.error('Failed to fetch albums:', err);
			error = 'Failed to fetch albums';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchRootAlbums();
	});
</script>

<Header />

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<div class="text-gray-600">Loading gallery...</div>
		</div>
	</div>
{:else}
	<main class="flex-1 min-h-screen bg-gray-50">
		{#if error}
			<section class="py-8">
				<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<div class="text-gray-600 mb-4">{error}</div>
				</div>
			</section>
		{:else if albums.length === 0}
			<section class="py-12">
				<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<div class="text-gray-600 mb-4">No albums found. Create your first album to get started!</div>
					<a href="/albums/new" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
						Create New Album
					</a>
				</div>
			</section>
		{:else}
			<section class="py-8">
				<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each albums as album}
							<a href={`/albums/${album.alias}`} class="group">
								<div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
									<div class="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
										{#if album.coverPhotoId && coverPhotos[album._id]}
											<img
												src={coverPhotos[album._id].storage?.thumbnailPath ||
													coverPhotos[album._id].url ||
													'/placeholder.jpg'}
												alt={MultiLangUtils.getTextValue(album.name, $currentLanguage)}
												class="w-full h-full object-cover group-hover:scale-105 transition-transform"
											/>
										{:else}
											<div class="text-4xl text-gray-400">📷</div>
										{/if}
									</div>
									<div class="p-4 flex flex-col flex-grow">
										<h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
											{MultiLangUtils.getTextValue(album.name, $currentLanguage) || album.alias || 'Untitled Album'}
										</h3>
										<div class="text-sm text-gray-500 mb-2">
											{#if album.photoCount && album.photoCount > 0}
												{album.photoCount} photos
											{/if}
											{#if album.photoCount && album.photoCount > 0 && album.childAlbumCount && album.childAlbumCount > 0}
												•
											{/if}
											{#if album.childAlbumCount && album.childAlbumCount > 0}
												{album.childAlbumCount} sub-albums
											{/if}
											{#if (!album.photoCount || album.photoCount === 0) && (!album.childAlbumCount || album.childAlbumCount === 0)}
												Empty album
											{/if}
										</div>
										{#if album.description}
											<div
												class="text-sm text-gray-600 flex-grow line-clamp-2"
												{@html MultiLangUtils.getHTMLValue(album.description, $currentLanguage) || ''}
											></div>
										{/if}
									</div>
								</div>
							</a>
						{/each}
					</div>
				</div>
			</section>
		{/if}
	</main>
{/if}

<Footer />
