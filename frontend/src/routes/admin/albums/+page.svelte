<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import AlbumTree from '$lib/components/AlbumTree.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { getPhotoTitle } from '$lib/utils/photoUtils';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	// svelte-ignore export_let_unused - Required by SvelteKit page component
	export let data: PageData;

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		alias: string;
		description?: string | { en?: string; he?: string };
		isPublic: boolean;
		isFeatured: boolean;
		photoCount: number;
		level: number;
		order: number;
		parentAlbumId?: string;
		coverPhotoId?: string;
		coverPhoto?: {
			_id: string;
			url?: string;
			thumbnailUrl?: string;
		};
		createdAt: string;
		updatedAt: string;
	}

	interface Photo {
		_id: string;
		filename: string;
		title?: string | { en?: string; he?: string };
		url?: string;
		thumbnailUrl?: string;
		storage?: {
			provider?: string;
			url?: string;
			path?: string;
			thumbnailPath?: string;
		};
		isPublished?: boolean;
	}

	let albums: Album[] = [];
	let loading = true;
	let error = '';
	let searchQuery = '';

	// Cover photo modal state
	let coverPhotoModal: {
		isOpen: boolean;
		album: Album | null;
		photos: Photo[];
		loading: boolean;
		currentPage: number;
		photosPerPage: number;
		totalPhotos: number;
	} = {
		isOpen: false,
		album: null,
		photos: [],
		loading: false,
		currentPage: 1,
		photosPerPage: 24,
		totalPhotos: 0,
	};

	// Delete confirmation
	let deleteDialog: {
		isOpen: boolean;
		albumId: string | null;
		albumName: string;
		isDeleting: boolean;
	} = {
		isOpen: false,
		albumId: null,
		albumName: '',
		isDeleting: false,
	};

	// Reload albums when navigating to this page (handles both initial mount and navigation)
	afterNavigate(() => {
		// Only reload if we're on the admin albums page
		if ($page.url.pathname === '/admin/albums') {
			logger.debug('[afterNavigate] Navigating to admin albums page, reloading albums...');
			loadAlbums().catch((err) => {
				logger.error('Error reloading albums after navigation:', err);
			});
		}
	});

	onMount(() => {
		// Load albums asynchronously
		(async () => {
			logger.debug('[onMount] Starting album load...');
			try {
				await loadAlbums();
				logger.debug('[onMount] Album load completed. Albums count:', albums.length, 'Loading:', loading);
			} catch (err) {
				logger.error('[onMount] Failed to load albums on mount:', err);
				loading = false; // Ensure loading is set to false even if loadAlbums fails unexpectedly
				error = handleError(err, 'Failed to load albums');
				albums = []; // Ensure albums is always an array
			}
		})();
		
		// Set up event delegation for action buttons in AlbumTree
		const handleActionClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			
			// Check if the click is on a button or its child (emoji)
			const button = target.closest('[data-action]') as HTMLElement;
			if (!button) return;
			
			// Prevent default behavior
			e.preventDefault();
			e.stopPropagation();
			
			const actionsContainer = button.closest('.album-actions') as HTMLElement;
			if (!actionsContainer) {
				logger.warn('[handleActionClick] No album-actions container found');
				return;
			}
			
			const albumId = actionsContainer.getAttribute('data-album-id');
			if (!albumId) {
				logger.warn('[handleActionClick] No album ID found');
				return;
			}
			
			const album = albums.find(a => a._id === albumId);
			if (!album) {
				logger.warn('[handleActionClick] Album not found:', albumId);
				return;
			}
			
			const action = button.getAttribute('data-action');
			logger.debug('[handleActionClick] Action clicked:', action, 'for album:', albumId);
			
			if (action === 'cover-photo') {
				openCoverPhotoModal(album);
			} else if (action === 'delete') {
				openDeleteDialog(album);
			}
		};
		
		// Use capture phase to ensure we catch the event early
		document.addEventListener('click', handleActionClick, true);
		return () => {
			document.removeEventListener('click', handleActionClick, true);
		};
	});

	async function loadAlbums() {
		loading = true;
		error = '';
		try {
			// Use admin endpoint to get ALL albums (including private ones)
			// Add cache-busting timestamp to ensure fresh data
			const cacheBuster = new Date().getTime();
			const response = await fetch(`/api/admin/albums?t=${cacheBuster}`, {
				cache: 'no-store',
				headers: {
					'Cache-Control': 'no-cache'
				}
			});
			
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			
			let result;
			try {
				const responseText = await response.text();
				logger.debug('[loadAlbums] Raw response text length:', responseText.length);
				result = JSON.parse(responseText);
			} catch (parseError) {
				logger.error('Failed to parse JSON response:', parseError);
				throw new Error('Invalid response format from server');
			}
			
			logger.debug('[loadAlbums] Response received:', { 
				isArray: Array.isArray(result), 
				type: typeof result,
				hasData: result?.data !== undefined,
				hasSuccess: result?.success !== undefined,
				resultPreview: Array.isArray(result) 
					? `Array(${result.length})` 
					: typeof result === 'object' 
						? JSON.stringify(result).substring(0, 200)
						: String(result)
			});
			
			// Handle both array and object responses
			if (Array.isArray(result)) {
				albums = result;
				logger.debug(`[loadAlbums] Loaded ${result.length} albums (direct array)`);
			} else if (result && Array.isArray(result.data)) {
				albums = result.data;
				logger.debug(`[loadAlbums] Loaded ${result.data.length} albums from result.data`);
			} else if (result && typeof result === 'object') {
				// Check if it's an error object
				if (result.error || result.success === false) {
					throw new Error(result.error || result.message || 'Failed to fetch albums');
				}
				// If result is an object but not an error, try to extract albums
				logger.warn('[loadAlbums] Unexpected response format:', result);
				albums = [];
			} else {
				logger.warn('[loadAlbums] No albums found in response:', result);
				albums = [];
			}
			
			// Force reactivity update
			albums = [...albums];
		} catch (err) {
			logger.error('Error loading albums:', err);
			error = handleError(err, 'Failed to load albums');
			albums = []; // Ensure albums is always an array
		} finally {
			loading = false;
			logger.debug('[loadAlbums] Loading complete. Albums count:', albums.length);
		}
	}

	function renderAlbumActions(node: Album): string {
		const albumName = getAlbumName(node).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
		return `
			<div class="flex items-center gap-2 album-actions" data-album-id="${node._id}">
				<button
					type="button"
					data-action="cover-photo"
					class="text-purple-600 hover:text-purple-900 p-1.5 rounded hover:bg-purple-50"
					title="Set Cover Photo"
				>
					🖼️
				</button>
				<a
					href="/albums/${node.alias}"
					target="_blank"
					class="text-gray-600 hover:text-gray-900 p-1.5 rounded hover:bg-gray-100"
					title="View"
				>
					👁️
				</a>
				<button
					type="button"
					data-action="delete"
					class="text-red-600 hover:text-red-900 p-1.5 rounded hover:bg-red-50"
					title="Delete"
				>
					🗑️
				</button>
			</div>
		`;
	}

	function handleOpen(node: Album) {
		goto(`/admin/albums/${node._id}`);
	}

	// Album name function is now imported from shared utility


	function getFilteredAlbums(): Album[] {
		if (!searchQuery.trim()) return albums;
		const query = searchQuery.toLowerCase();
		return albums.filter(
			(album) =>
				getAlbumName(album).toLowerCase().includes(query) ||
				album.alias.toLowerCase().includes(query),
		);
	}

	async function handleReorder(
		updates: Array<{ id: string; parentAlbumId: string | null; order: number }>
	) {
		try {
			logger.debug('[handleReorder] Sending updates:', updates);
			const response = await fetch('/api/admin/albums/reorder', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ updates })
			});
			
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'Failed to reorder albums' }));
				throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
			}
			
			const result = await response.json();
			logger.debug('[handleReorder] Server response:', result);
			await loadAlbums();
		} catch (err) {
			logger.error('Failed to reorder albums:', err);
			error = handleError(err, 'Failed to reorder albums');
			throw err; // Re-throw so AlbumTree can handle the error
		}
	}

	async function openCoverPhotoModal(album: Album) {
		coverPhotoModal = {
			isOpen: true,
			album,
			photos: [],
			loading: true,
			currentPage: 1,
			photosPerPage: 24,
			totalPhotos: 0,
		};

		try {
			const response = await fetch(`/api/admin/albums/${album._id}/photos`);
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					coverPhotoModal.photos = result.data || [];
					coverPhotoModal.totalPhotos = coverPhotoModal.photos.length;
				}
			}
		} catch (err) {
			logger.error('Failed to fetch photos:', err);
		} finally {
			coverPhotoModal.loading = false;
		}
	}

	function closeCoverPhotoModal() {
		coverPhotoModal = {
			isOpen: false,
			album: null,
			photos: [],
			loading: false,
			currentPage: 1,
			photosPerPage: 24,
			totalPhotos: 0,
		};
	}

	async function setCoverPhoto(photoId: string) {
		if (!coverPhotoModal.album) return;

		try {
			const response = await fetch(`/api/admin/albums/${coverPhotoModal.album._id}/cover-photo`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ coverPhotoId: photoId }),
			});

			if (response.ok) {
				await loadAlbums();
				closeCoverPhotoModal();
			}
		} catch (err) {
			logger.error('Failed to set cover photo:', err);
			error = handleError(err, 'Failed to set cover photo');
		}
	}

	function openDeleteDialog(album: Album) {
		deleteDialog = {
			isOpen: true,
			albumId: album._id,
			albumName: getAlbumName(album),
			isDeleting: false
		};
	}

	function closeDeleteDialog() {
		// Create a new object to ensure reactivity
		deleteDialog = {
			isOpen: false,
			albumId: null,
			albumName: '',
			isDeleting: false,
		};
	}

	async function confirmDelete() {
		if (!deleteDialog.albumId || deleteDialog.isDeleting) return;

		// Save album ID before async operations
		const albumIdToDelete = deleteDialog.albumId;

		// Update isDeleting by creating a new object to ensure reactivity
		deleteDialog = {
			...deleteDialog,
			isDeleting: true,
		};
		error = '';

		try {
			const response = await fetch(`/api/admin/albums/${albumIdToDelete}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				// Close dialog immediately
				closeDeleteDialog();
				// Then reload albums
				await loadAlbums();
			} else {
				const errorData = await response.json().catch(() => ({ error: 'Failed to delete album' }));
				error = errorData.error || errorData.message || 'Failed to delete album';
				// Update isDeleting by creating a new object
				deleteDialog = {
					...deleteDialog,
					isDeleting: false,
				};
			}
		} catch (err) {
			logger.error('Failed to delete album:', err);
			error = handleError(err, 'Failed to delete album');
			// Update isDeleting by creating a new object
			deleteDialog = {
				...deleteDialog,
				isDeleting: false,
			};
		}
	}

	function getPaginatedPhotos() {
		const startIndex = (coverPhotoModal.currentPage - 1) * coverPhotoModal.photosPerPage;
		const endIndex = startIndex + coverPhotoModal.photosPerPage;
		return coverPhotoModal.photos.slice(startIndex, endIndex);
	}

	function getTotalPages(): number {
		return Math.ceil(coverPhotoModal.totalPhotos / coverPhotoModal.photosPerPage);
	}

	function goToPage(page: number) {
		coverPhotoModal.currentPage = page;
	}
</script>

<svelte:head>
	<title>Albums Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-7xl mx-auto px-4">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Albums Management</h1>
				<p class="text-gray-600 mt-2">Manage your photo albums</p>
			</div>
			<div class="flex gap-3">
				<a
					href="/albums/new"
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
				>
					+ Create Album
				</a>
				<a href="/admin" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 text-sm">
					← Back to Admin
				</a>
			</div>
		</div>

		{#if error}
			<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
		{/if}

		<!-- Stats Overview -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-blue-600">{albums.length}</div>
					<div class="text-sm text-gray-600">Total Albums</div>
				</div>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600">
						{albums.filter((a) => a.isPublic).length}
					</div>
					<div class="text-sm text-gray-600">Public Albums</div>
				</div>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-purple-600">
						{albums.filter((a) => a.isFeatured).length}
					</div>
					<div class="text-sm text-gray-600">Featured Albums</div>
				</div>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-orange-600">
						{albums.reduce((total, album) => total + (album.photoCount || 0), 0)}
					</div>
					<div class="text-sm text-gray-600">Total Photos</div>
				</div>
			</div>
		</div>

		<!-- Search -->
		<div class="mb-4">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search albums..."
				class="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>

		{#if loading}
			<div class="text-center py-8">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<p class="mt-2 text-gray-600">Loading albums...</p>
			</div>
		{:else if getFilteredAlbums().length === 0}
			<div class="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
				<div class="text-gray-400 text-6xl mb-4">📁</div>
				<h3 class="text-xl font-semibold text-gray-900 mb-2">No Albums Found</h3>
				<p class="text-gray-600 mb-6">
					{searchQuery ? 'No albums match your search.' : 'Get started by creating your first album.'}
				</p>
				{#if !searchQuery}
					<a
						href="/albums/new"
						class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Create Album
					</a>
				{/if}
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<AlbumTree
					albums={getFilteredAlbums().map((a) => ({
						_id: a._id,
						name:
							typeof a.name === 'string'
								? a.name
								: MultiLangUtils.getTextValue(a.name, $currentLanguage) || '(No name)',
						alias: a.alias,
						parentAlbumId: a.parentAlbumId ?? null,
						level: a.level,
						order: a.order,
						photoCount: a.photoCount,
						isPublic: a.isPublic,
						isFeatured: a.isFeatured
					}))}
					onReorder={handleReorder}
					onOpen={handleOpen}
					renderActions={renderAlbumActions}
					showAccordion={true}
					expandAllByDefault={false}
				/>
			</div>
		{/if}
	</div>
</div>

<!-- Cover Photo Modal -->
{#if coverPhotoModal.isOpen}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-10 mx-auto p-5 border w-11/12 md:w-5/6 lg:w-4/5 xl:w-3/4 shadow-lg rounded-md bg-white max-w-6xl">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-medium text-gray-900">
					Select Cover Photo - {coverPhotoModal.album ? getAlbumName(coverPhotoModal.album) : ''}
				</h3>
				<button 
					on:click={closeCoverPhotoModal} 
					class="text-gray-400 hover:text-gray-600"
					aria-label="Close modal"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			{#if coverPhotoModal.loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
					<p class="mt-2 text-gray-600">Loading photos...</p>
				</div>
			{:else if coverPhotoModal.totalPhotos === 0}
				<div class="text-center py-8">
					<p class="text-gray-600">No photos available</p>
				</div>
			{:else}
				<div class="max-h-[70vh] overflow-y-auto">
					<div class="mb-4 text-sm text-gray-600">
						Showing {((coverPhotoModal.currentPage - 1) * coverPhotoModal.photosPerPage) + 1}-{Math.min(
							coverPhotoModal.currentPage * coverPhotoModal.photosPerPage,
							coverPhotoModal.totalPhotos,
						)} of {coverPhotoModal.totalPhotos} photos
					</div>

					<div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-6">
						{#each getPaginatedPhotos() as photo}
							{@const isCurrentCover = coverPhotoModal.album?.coverPhotoId === photo._id}
							<button
								type="button"
								class="relative cursor-pointer group {isCurrentCover
									? 'ring-4 ring-blue-500 ring-opacity-75'
									: ''}"
								on:click={() => setCoverPhoto(photo._id)}
								aria-label="Set as cover photo"
							>
								<img
									src={photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
									alt={getPhotoTitle(photo) || photo.filename || 'Photo'}
									class="w-full h-20 object-cover rounded-lg hover:opacity-75 transition-opacity {isCurrentCover
										? 'ring-2 ring-blue-500'
										: ''}"
									style="image-orientation: from-image;"
								/>
								{#if isCurrentCover}
									<div
										class="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium"
									>
										✓
									</div>
								{/if}
							</button>
						{/each}
					</div>

					{#if getTotalPages() > 1}
						<div class="flex items-center justify-center space-x-2 mt-4">
							<button
								on:click={() => goToPage(coverPhotoModal.currentPage - 1)}
								disabled={coverPhotoModal.currentPage === 1}
								class="px-3 py-1 text-sm font-medium text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Previous
							</button>
							<span class="text-sm text-gray-600">
								Page {coverPhotoModal.currentPage} of {getTotalPages()}
							</span>
							<button
								on:click={() => goToPage(coverPhotoModal.currentPage + 1)}
								disabled={coverPhotoModal.currentPage === getTotalPages()}
								class="px-3 py-1 text-sm font-medium text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Next
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<div class="mt-6 flex justify-end">
				<button
					on:click={closeCoverPhotoModal}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
	isOpen={deleteDialog.isOpen}
	title="Delete Album"
	message="Are you sure you want to delete &quot;{deleteDialog.albumName}&quot;? This will delete all photos and sub-albums. This action cannot be undone."
	confirmText={deleteDialog.isDeleting ? 'Deleting...' : 'Delete'}
	cancelText="Cancel"
	variant="danger"
	disabled={deleteDialog.isDeleting}
	on:confirm={confirmDelete}
	on:cancel={closeDeleteDialog}
/>
