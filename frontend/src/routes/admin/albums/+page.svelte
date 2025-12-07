<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  export const data = undefined as any; // From +layout.server.ts, not used in this component

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
		coverPhoto?: any;
		createdAt: string;
		updatedAt: string;
	}

	let albums: Album[] = [];
	let loading = true;
	let error = '';
	let searchQuery = '';

	// Cover photo modal state
	let coverPhotoModal: {
		isOpen: boolean;
		album: Album | null;
		photos: any[];
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
	} = {
		isOpen: false,
		albumId: null,
		albumName: '',
	};

	onMount(async () => {
		await loadAlbums();
	});

	async function loadAlbums() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/albums');
			if (!response.ok) {
				throw new Error('Failed to fetch albums');
			}
			const result = await response.json();
			albums = Array.isArray(result) ? result : result.data || [];
			// Sort by level and order
			albums.sort((a, b) => {
				if (a.level !== b.level) return a.level - b.level;
				return a.order - b.order;
			});
		} catch (err) {
			console.error('Error loading albums:', err);
			error = `Failed to load albums: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			loading = false;
		}
	}

	function getAlbumName(album: Album): string {
		if (typeof album.name === 'string') return album.name;
		return album.name?.en || album.name?.he || '(No name)';
	}


	function getFilteredAlbums(): Album[] {
		if (!searchQuery.trim()) return albums;
		const query = searchQuery.toLowerCase();
		return albums.filter(
			(album) =>
				getAlbumName(album).toLowerCase().includes(query) ||
				album.alias.toLowerCase().includes(query),
		);
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
			console.error('Failed to fetch photos:', err);
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
			console.error('Failed to set cover photo:', err);
		}
	}

	function openDeleteDialog(album: Album) {
		deleteDialog = {
			isOpen: true,
			albumId: album._id,
			albumName: getAlbumName(album),
		};
	}

	function closeDeleteDialog() {
		deleteDialog = {
			isOpen: false,
			albumId: null,
			albumName: '',
		};
	}

	async function confirmDelete() {
		if (!deleteDialog.albumId) return;

		try {
			const response = await fetch(`/api/albums/${deleteDialog.albumId}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				await loadAlbums();
				closeDeleteDialog();
			} else {
				error = 'Failed to delete album';
			}
		} catch (err) {
			console.error('Failed to delete album:', err);
			error = `Failed to delete album: ${err instanceof Error ? err.message : 'Unknown error'}`;
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
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Album
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Photos
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Level
								</th>
								<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each getFilteredAlbums() as album}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center" style="padding-left: {album.level * 1.5}rem;">
											<div>
												<div class="text-sm font-medium text-gray-900">{getAlbumName(album)}</div>
												<div class="text-sm text-gray-500">{album.alias}</div>
											</div>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex gap-1">
											{#if album.isFeatured}
												<span
													class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
													title="Featured"
												>
													⭐
												</span>
											{/if}
											{#if album.isPublic}
												<span
													class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
													title="Public"
												>
													🌐
												</span>
											{:else}
												<span
													class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
													title="Private"
												>
													🔒
												</span>
											{/if}
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{album.photoCount || 0}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{album.level}</td>
									<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<div class="flex items-center justify-end gap-2">
											<button
												on:click={() => goto(`/admin/albums/${album._id}`)}
												class="text-blue-600 hover:text-blue-900"
												title="Manage"
											>
												Manage
											</button>
											<button
												on:click={() => openCoverPhotoModal(album)}
												class="text-purple-600 hover:text-purple-900"
												title="Set Cover Photo"
											>
												🖼️
											</button>
											<a
												href="/albums/{album.alias}"
												target="_blank"
												class="text-gray-600 hover:text-gray-900"
												title="View"
											>
												👁️
											</a>
											<button
												on:click={() => openDeleteDialog(album)}
												class="text-red-600 hover:text-red-900"
												title="Delete"
											>
												🗑️
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
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
									alt={photo.title || photo.filename || 'Photo'}
									class="w-full h-20 object-cover rounded-lg hover:opacity-75 transition-opacity {isCurrentCover
										? 'ring-2 ring-blue-500'
										: ''}"
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
	message="Are you sure you want to delete &quot;{deleteDialog.albumName}&quot;? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	on:confirm={confirmDelete}
	on:cancel={closeDeleteDialog}
/>
