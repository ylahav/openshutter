<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { getAlbumName, getAlbumDescription } from '$lib/utils/albumUtils';
	import { getPhotoTitle } from '$lib/utils/photoUtils';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError } from '$lib/utils/errorHandler';
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
		isPublished?: boolean;
	}

	const album: Album | undefined = data.album;
	let photos: Photo[] = data.photos ?? [];
	const albumId = $page.params.id;

	const isAdmin = data.user?.role === 'admin';
	const backHref = isAdmin ? '/admin/albums' : '/owner/albums';
	const editHref = isAdmin ? `/admin/albums/${albumId}/edit` : `/owner/albums/${albumId}/edit`;

	let photoDeleteDialog: {
		isOpen: boolean;
		photoId: string | null;
		photoTitle: string;
		isDeleting: boolean;
	} = {
		isOpen: false,
		photoId: null,
		photoTitle: '',
		isDeleting: false,
	};
	let errorMessage = '';

	function openPhotoDeleteDialog(photo: Photo) {
		photoDeleteDialog = {
			isOpen: true,
			photoId: photo._id,
			photoTitle: getPhotoTitle(photo),
			isDeleting: false,
		};
	}

	function closePhotoDeleteDialog() {
		photoDeleteDialog = {
			isOpen: false,
			photoId: null,
			photoTitle: '',
			isDeleting: false,
		};
		errorMessage = '';
	}

	async function confirmDeletePhoto() {
		if (!photoDeleteDialog.photoId || photoDeleteDialog.isDeleting) return;
		const deletedPhotoId = photoDeleteDialog.photoId;
		photoDeleteDialog = { ...photoDeleteDialog, isDeleting: true };
		errorMessage = '';
		try {
			const response = await fetch(`/api/admin/photos/${deletedPhotoId}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			const result = await response.json().catch(() => ({}));
			if (response.ok && result.success !== false) {
				closePhotoDeleteDialog();
				photos = photos.filter((p) => p._id !== deletedPhotoId);
				await invalidateAll();
			} else {
				errorMessage = result.error || result.message || `Failed to delete photo (${response.status})`;
				photoDeleteDialog = { ...photoDeleteDialog, isDeleting: false };
			}
		} catch (err) {
			logger.error('Delete photo error:', err);
			errorMessage = handleError(err, 'Failed to delete photo');
			photoDeleteDialog = { ...photoDeleteDialog, isDeleting: false };
		}
	}

	async function refresh() {
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{album ? getAlbumName(album) : 'Album'} - Owner</title>
</svelte:head>

{#if !album}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<p class="text-gray-600">Album not found</p>
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
				<div class="flex flex-wrap gap-3">
					<button
						on:click={() => goto(editHref)}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Edit Album
					</button>
					<button
						on:click={() => goto(`/admin/photos/upload?albumId=${albumId}&returnTo=/owner/albums`)}
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
					<button
						on:click={refresh}
						class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
					>
						Refresh
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
							on:click={() => goto(`/admin/photos/upload?albumId=${albumId}&returnTo=/owner/albums`)}
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							Upload Photos
						</button>
					</div>
				</div>
			{:else}
				{#if errorMessage}
					<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
						{errorMessage}
					</div>
				{/if}
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
					{#each photos as photo}
						<div class="group relative bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
							<div class="relative h-48">
								{#if photo.storage?.thumbnailPath}
									<img
										src={photo.storage.thumbnailPath}
										alt={typeof photo.title === 'string' ? photo.title : photo.filename}
										class="w-full h-full object-cover"
									/>
								{:else}
									<div class="w-full h-full bg-gray-200 flex items-center justify-center">
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
								<div
									class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-t-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
								>
									<div class="flex gap-2">
										<a
											href="/owner/photos/{photo._id}/edit"
											class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
										>
											Edit
										</a>
										<button
											type="button"
											on:click={() => openPhotoDeleteDialog(photo)}
											disabled={photoDeleteDialog.isDeleting}
											class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
										>
											Delete
										</button>
									</div>
								</div>
								{#if photo.isPublished === false}
									<div class="absolute top-2 right-2">
										<span
											class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
										>
											Draft
										</span>
									</div>
								{/if}
							</div>
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

<ConfirmDialog
	isOpen={photoDeleteDialog.isOpen}
	title="Delete Photo"
	message="Are you sure you want to delete &quot;{photoDeleteDialog.photoTitle}&quot;? This action cannot be undone."
	confirmText={photoDeleteDialog.isDeleting ? 'Deleting...' : 'Delete'}
	cancelText="Cancel"
	variant="danger"
	disabled={photoDeleteDialog.isDeleting}
	on:confirm={confirmDeletePhoto}
	on:cancel={closePhotoDeleteDialog}
/>
{/if}
