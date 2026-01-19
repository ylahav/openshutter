<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  export const data = undefined as any; // From +layout.server.ts, not used in this component

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		description?: string | { en?: string; he?: string };
		alias: string;
		level: number;
		isFeatured: boolean;
		isPublic: boolean;
		photoCount: number;
		coverPhotoId?: string;
		parentAlbumId?: string;
		storagePath: string;
	}

	interface Photo {
		_id: string;
		title?: string | { en?: string; he?: string };
		filename: string;
		url?: string;
		storage?: {
			provider?: string;
			url?: string;
			path?: string;
			thumbnailPath?: string;
			thumbnails?: Record<string, string>;
		};
		isPublished: boolean;
	}

	const albumId = $page.params.id;
	let album: Album | null = null;
	let photos: Photo[] = [];
	let loading = true;
	let error = '';
	let successMessage = '';
	let showDeleteDialog = false;
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

	function getAlbumName(album: Album | null): string {
		if (!album) return '';
		if (typeof album.name === 'string') return album.name;
		return album.name?.en || album.name?.he || '(No name)';
	}

	function getPhotoTitle(photo: Photo): string {
		if (photo.title) {
			if (typeof photo.title === 'string') return photo.title;
			return photo.title?.en || photo.title?.he || photo.filename;
		}
		return photo.filename;
	}

	function getPhotoUrl(photo: Photo): string {
		if (!photo.storage) {
			console.log('Photo has no storage:', photo._id, photo.filename);
			return photo.url || '';
		}
		
		// Check thumbnails object first (for multiple sizes)
		if (photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
			const thumbnails = photo.storage.thumbnails as Record<string, string>;
			// Prefer medium, then small, then any available
			const thumbnailUrl = thumbnails.medium || thumbnails.small || Object.values(thumbnails)[0];
			if (thumbnailUrl) {
				if (thumbnailUrl.startsWith('/api/storage/serve/') || thumbnailUrl.startsWith('http')) {
					return thumbnailUrl;
				}
				const provider = photo.storage.provider || 'local';
				// Remove leading slash if present, as encodeURIComponent will handle it
				const cleanPath = thumbnailUrl.startsWith('/') ? thumbnailUrl.slice(1) : thumbnailUrl;
				return `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
			}
		}
		
		// If thumbnailPath exists, use it
		if (photo.storage.thumbnailPath) {
			// If it's already a full URL, use it as-is
			if (photo.storage.thumbnailPath.startsWith('/api/storage/serve/') || photo.storage.thumbnailPath.startsWith('http')) {
				return photo.storage.thumbnailPath;
			}
			// Otherwise construct the URL
			const provider = photo.storage.provider || 'local';
			// Remove leading slash if present
			const cleanPath = photo.storage.thumbnailPath.startsWith('/') 
				? photo.storage.thumbnailPath.slice(1) 
				: photo.storage.thumbnailPath;
			const constructed = `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
			console.log('Constructed thumbnail URL:', constructed, 'from:', photo.storage.thumbnailPath);
			return constructed;
		}
		
		// Fallback to url if available
		if (photo.storage.url) {
			if (photo.storage.url.startsWith('/api/storage/serve/') || photo.storage.url.startsWith('http')) {
				return photo.storage.url;
			}
			const provider = photo.storage.provider || 'local';
			// Remove leading slash if present
			const cleanPath = photo.storage.url.startsWith('/') 
				? photo.storage.url.slice(1) 
				: photo.storage.url;
			return `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
		}
		
		// Fallback to path if available
		if (photo.storage.path) {
			const provider = photo.storage.provider || 'local';
			// Remove leading slash if present
			const cleanPath = photo.storage.path.startsWith('/') 
				? photo.storage.path.slice(1) 
				: photo.storage.path;
			return `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
		}
		
		console.log('No valid photo URL found for:', photo._id, photo.filename, photo.storage);
		return photo.url || '';
	}

	async function loadAlbum() {
		try {
			loading = true;
			error = '';
			const response = await fetch(`/api/admin/albums/${albumId}?t=${Date.now()}`, {
				cache: 'no-store',
			});
			if (!response.ok) {
				throw new Error('Failed to fetch album');
			}
			const result = await response.json();
			album = result.data || result;
		} catch (err) {
			console.error('Failed to fetch album:', err);
			error = `Failed to load album: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			loading = false;
		}
	}

	async function loadPhotos() {
		try {
			const response = await fetch(`/api/admin/albums/${albumId}/photos?t=${Date.now()}`, {
				cache: 'no-store',
			});
			console.log('Photos API response status:', response.status);
			if (response.ok) {
				const result = await response.json();
				console.log('Photos API result:', result);
				if (result.success) {
					photos = result.data || [];
					console.log(`Loaded ${photos.length} photos`);
					if (photos.length > 0) {
						console.log('Sample photo:', {
							_id: photos[0]._id,
							filename: photos[0].filename,
							hasStorage: !!photos[0].storage,
							storage: photos[0].storage,
							thumbnailPath: photos[0].storage?.thumbnailPath,
							url: photos[0].storage?.url,
							constructedUrl: getPhotoUrl(photos[0]),
						});
					}
				} else {
					console.error('Photos API returned error:', result.error);
					error = result.error || 'Failed to load photos';
				}
			} else {
				const errorText = await response.text();
				console.error('Photos API error response:', response.status, errorText);
				error = `Failed to load photos: ${response.status} ${response.statusText}`;
			}
		} catch (err) {
			console.error('Failed to fetch photos:', err);
			error = `Failed to fetch photos: ${err instanceof Error ? err.message : 'Unknown error'}`;
		}
	}

	function openPhotoDeleteDialog(photo: Photo) {
		photoDeleteDialog = {
			isOpen: true,
			photoId: photo._id,
			photoTitle: getPhotoTitle(photo),
			isDeleting: false,
		};
	}

	function closePhotoDeleteDialog() {
		// Create a new object to ensure reactivity
		photoDeleteDialog = {
			isOpen: false,
			photoId: null,
			photoTitle: '',
			isDeleting: false,
		};
	}

	async function confirmDeletePhoto() {
		if (!photoDeleteDialog.photoId || photoDeleteDialog.isDeleting) return;

		// Save values before any async operations
		const deletedPhotoId = photoDeleteDialog.photoId;
		const photoTitle = photoDeleteDialog.photoTitle;

		// Update isDeleting by creating a new object to ensure reactivity
		photoDeleteDialog = {
			...photoDeleteDialog,
			isDeleting: true,
		};
		error = '';
		successMessage = '';

		try {
			console.log('[confirmDeletePhoto] Deleting photo:', deletedPhotoId);
			const response = await fetch(`/api/admin/photos/${deletedPhotoId}`, {
				method: 'DELETE',
			});

			console.log('[confirmDeletePhoto] Response status:', response.status, response.statusText);

			let result: any = {};
			try {
				result = await response.json();
				console.log('[confirmDeletePhoto] Response data:', result);
			} catch (parseError) {
				console.warn('[confirmDeletePhoto] Failed to parse JSON response:', parseError);
			}

			if (response.ok && (result.success !== false)) {
				// Photo deleted successfully
				console.log('[confirmDeletePhoto] Photo deleted successfully, closing dialog');
				
				// Close dialog immediately
				closePhotoDeleteDialog();
				
				// Remove photo from local array immediately for better UX
				photos = photos.filter((p) => p._id !== deletedPhotoId);
				
				// Show success message
				successMessage = `Photo "${photoTitle}" deleted successfully`;
				
				// Clear success message after 3 seconds
				setTimeout(() => {
					successMessage = '';
				}, 3000);
				
				// Reload album and photos to update counts
				await Promise.all([loadAlbum(), loadPhotos()]);
			} else {
				const errorMsg = result.error || result.message || `Failed to delete photo (${response.status})`;
				error = errorMsg;
				// Update isDeleting by creating a new object
				photoDeleteDialog = {
					...photoDeleteDialog,
					isDeleting: false,
				};
				console.error('[confirmDeletePhoto] Delete failed:', errorMsg);
			}
		} catch (err) {
			console.error('[confirmDeletePhoto] Exception during delete:', err);
			error = `Failed to delete photo: ${err instanceof Error ? err.message : 'Unknown error'}`;
			// Update isDeleting by creating a new object
			photoDeleteDialog = {
				...photoDeleteDialog,
				isDeleting: false,
			};
		}
	}

	async function deleteAlbum() {
		showDeleteDialog = false;
		error = '';
		
		const deleteUrl = `/api/admin/albums/${albumId}`;
		console.log('[deleteAlbum] Deleting album:', albumId, 'URL:', deleteUrl);
		
		try {
			const response = await fetch(deleteUrl, { method: 'DELETE' });
			console.log('[deleteAlbum] Response status:', response.status, response.statusText);
			
			if (response.ok) {
				console.log('[deleteAlbum] Album deleted successfully, redirecting...');
				goto('/admin/albums');
			} else {
				const errorText = await response.text();
				console.error('[deleteAlbum] Delete failed:', response.status, errorText);
				
				let errorData: any = {};
				try {
					errorData = JSON.parse(errorText);
				} catch (parseError) {
					console.warn('[deleteAlbum] Failed to parse error response as JSON');
				}
				
				error = errorData.error || errorData.message || `Failed to delete album (${response.status} ${response.statusText})`;
			}
		} catch (err) {
			console.error('[deleteAlbum] Exception during delete:', err);
			error = `Failed to delete album: ${err instanceof Error ? err.message : 'Unknown error'}`;
		}
	}

	onMount(async () => {
		await Promise.all([loadAlbum(), loadPhotos()]);
	});
</script>

<svelte:head>
	<title>{album ? getAlbumName(album) : 'Album'} - Admin</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			<p class="mt-4 text-gray-600">Loading album...</p>
		</div>
	</div>
{:else if error || !album}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-gray-900 mb-4">Error</h1>
			<p class="text-gray-600 mb-4">{error || 'Album not found'}</p>
			<a href="/admin/albums" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
				Back to Albums
			</a>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-7xl mx-auto px-4">
			<!-- Breadcrumbs -->
			{#if album}
				<AlbumBreadcrumbs album={album} />
			{/if}

			<!-- Header -->
			<div class="mb-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-gray-900">{getAlbumName(album)}</h1>
						<p class="mt-2 text-gray-600">
							{album.photoCount || 0} photos • {album.isPublic ? 'Public' : 'Private'}
							{#if album.isFeatured}
								• ⭐ Featured
							{/if}
						</p>
					</div>
					<div class="flex gap-3">
						<a
							href="/admin/photos/upload?albumId={albumId}"
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							Upload Photos
						</a>
						<a
							href="/admin/albums/{albumId}/edit"
							class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
						>
							Edit Album
						</a>
						<button
							on:click={() => (showDeleteDialog = true)}
							class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
						>
							Delete Album
						</button>
						<a href="/admin/albums" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
							← Back
						</a>
					</div>
				</div>
			</div>

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
			{/if}

			{#if successMessage}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700 text-sm">{successMessage}</div>
			{/if}

			<!-- Album Description -->
			{#if album.description}
				<div class="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
					{@html MultiLangUtils.getHTMLValue(album.description, $currentLanguage) || ''}
				</div>
			{/if}

			<!-- Photos Grid -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-2xl font-bold text-gray-900">
						Photos ({photos.length}
						{#if album && album.photoCount !== photos.length}
							<span class="text-sm font-normal text-gray-500">
								/ {album.photoCount} total
							</span>
						{/if})
					</h2>
				</div>

				{#if photos.length === 0}
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
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<h3 class="mt-2 text-sm font-medium text-gray-900">No photos yet</h3>
						<p class="mt-1 text-sm text-gray-500">Upload photos to get started</p>
						<div class="mt-6">
							<a
								href="/admin/photos/upload?albumId={albumId}"
								class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
							>
								Upload Photos
							</a>
						</div>
					</div>
				{:else}
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
						{#each photos as photo}
							{@const photoUrl = getPhotoUrl(photo)}
							<div class="relative group">
								<div class="aspect-square bg-gray-200 rounded-lg overflow-hidden">
									{#if photoUrl}
										<img
											src={photoUrl}
											alt={getPhotoTitle(photo)}
											class="w-full h-full object-cover"
											on:error={(e) => {
												console.error('Image failed to load:', photoUrl, photo);
												const target = e.currentTarget as HTMLImageElement;
												target.style.display = 'none';
											}}
											on:load={() => {
												console.log('Image loaded successfully:', photoUrl);
											}}
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center">
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
								</div>
								<div
									class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
								>
									<div class="flex gap-2">
										<a
											href="/admin/photos/{photo._id}/edit"
											class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
										>
											Edit
										</a>
										<button
											on:click={() => openPhotoDeleteDialog(photo)}
											disabled={photoDeleteDialog.isDeleting}
											class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
										>
											Delete
										</button>
									</div>
								</div>
								{#if !photo.isPublished}
									<div class="absolute top-2 right-2">
										<span
											class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
										>
											Draft
										</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Delete Album Confirmation Dialog -->
{#if album}
	<ConfirmDialog
		isOpen={showDeleteDialog}
		title="Delete Album"
		message="Are you sure you want to delete &quot;{getAlbumName(album)}&quot;? This action cannot be undone and will also delete all photos in this album."
		confirmText="Delete Album"
		cancelText="Cancel"
		variant="danger"
		on:confirm={deleteAlbum}
		on:cancel={() => (showDeleteDialog = false)}
	/>
{/if}

<!-- Delete Photo Confirmation Dialog -->
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
