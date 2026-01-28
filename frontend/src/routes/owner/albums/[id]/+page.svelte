<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { getAlbumName, getAlbumDescription } from '$lib/utils/albumUtils';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		description?: string | { en?: string; he?: string };
		alias: string;
		isPublic: boolean;
		isFeatured: boolean;
		photoCount: number;
		coverPhoto?: {
			url: string;
		};
	}

	interface Photo {
		_id: string;
		filename: string;
		title?: string | { en?: string; he?: string };
		storage?: {
			url?: string;
			thumbnailPath?: string;
		};
	}

	let album: Album | null = null;
	let photos: Photo[] = [];
	let loading = true;
	let error: string | null = null;
	let albumId = $page.params.id;

	const isAdmin = data.user?.role === 'admin';
	const backHref = isAdmin ? '/admin/albums' : '/owner/albums';
	const editHref = isAdmin ? `/admin/albums/${albumId}/edit` : `/owner/albums/${albumId}/edit`;

	onMount(async () => {
		await loadAlbum();
	});

	async function loadAlbum() {
		try {
			loading = true;
			const [albumRes, photosRes] = await Promise.all([
				fetch(`/api/albums/${albumId}`),
				fetch(`/api/albums/${albumId}/photos`)
			]);

			if (!albumRes.ok) {
				await handleApiErrorResponse(albumRes);
			}

			const albumData = await albumRes.json();
			album = albumData.data || albumData;

			if (!photosRes.ok) {
				logger.warn('Failed to load photos, continuing without photos');
			} else {
				const photosData = await photosRes.json();
				photos = photosData.data || [];
			}
		} catch (err) {
			logger.error('Failed to load album:', err);
			error = handleError(err, 'Failed to load album');
		} finally {
			loading = false;
		}
	}

	// Album utility functions are now imported from shared utilities
</script>

<svelte:head>
	<title>{album ? getAlbumName(album) : 'Album'} - Owner</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else if error || !album}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="text-red-600 text-xl mb-4">⚠️</div>
			<p class="text-gray-600">{error || 'Album not found'}</p>
			<button
				on:click={() => goto(backHref)}
				class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
			>
				Back to Albums
			</button>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Header -->
			<div class="flex items-center justify-between mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">{getAlbumName(album)}</h1>
					{#if getAlbumDescription(album)}
            <div class="mt-2 text-gray-600 prose max-w-none">{@html getAlbumDescription(album)}</div>
					{/if}
				</div>
				<div class="flex space-x-3">
					<button
						on:click={() => goto(editHref)}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Edit Album
					</button>
					<button
						on:click={() => goto(`/admin/photos/upload?albumId=${albumId}`)}
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						Upload Photos
					</button>
					<button
						on:click={() => goto(`/albums/new?parentAlbumId=${albumId}`)}
						class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
					>
						Create Sub-Album
					</button>
				</div>
			</div>

			<!-- Album Info -->
			<div class="bg-white rounded-lg shadow p-6 mb-8">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<span class="text-sm text-gray-500">Photos</span>
						<p class="text-2xl font-semibold text-gray-900">{album.photoCount || 0}</p>
					</div>
					<div>
						<span class="text-sm text-gray-500">Status</span>
						<p class="text-2xl font-semibold text-gray-900">
							{album.isPublic ? 'Public' : 'Private'}
						</p>
					</div>
					<div>
						<span class="text-sm text-gray-500">Featured</span>
						<p class="text-2xl font-semibold text-gray-900">
							{album.isFeatured ? 'Yes' : 'No'}
						</p>
					</div>
				</div>
			</div>

			<!-- Photos Grid -->
			{#if photos.length === 0}
				<div class="bg-white rounded-lg shadow p-12 text-center">
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
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">No photos yet</h3>
					<p class="mt-1 text-sm text-gray-500">Get started by uploading some photos</p>
					<div class="mt-6">
						<button
							on:click={() => goto(`/admin/photos/upload?albumId=${albumId}`)}
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							Upload Photos
						</button>
					</div>
				</div>
			{:else}
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
					{#each photos as photo}
						<div class="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
							{#if photo.storage?.thumbnailPath}
								<img
									src={photo.storage.thumbnailPath}
									alt={typeof photo.title === 'string' ? photo.title : photo.filename}
									class="w-full h-48 object-cover"
								/>
							{:else}
								<div class="w-full h-48 bg-gray-200 flex items-center justify-center">
									<svg class="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</div>
							{/if}
							<div class="p-2">
								<p class="text-xs text-gray-600 truncate">
									{typeof photo.title === 'string'
										? photo.title
										: photo.title
											? MultiLangUtils.getTextValue(photo.title, $currentLanguage)
											: photo.filename}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
