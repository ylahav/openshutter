<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';
	import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
	import AdminConfirmDialog from '$lib/components/admin/AdminConfirmDialog.svelte';
	import { getPhotoUrl, getPhotoRotationStyle } from '$lib/utils/photoUrl';
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

	interface Location {
		_id: string;
		name: string | { en?: string; he?: string };
		alias?: string;
		address?: string;
		category?: string;
		isActive?: boolean;
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
	
	// Bulk operations
	let selectedPhotoIds = new Set<string>();
	let showBulkActions = false;
	let showLocationDialog = false;
	let showMetadataDialog = false;
	let locations: Location[] = [];
	let selectedLocationId: string | null = null;
	let showTagsDialog = false;
	let tags: { _id: string; name: string | { en?: string; he?: string }; category?: string }[] = [];
	let selectedTagIds: string[] = [];
	let bulkMetadataRating: string = '';
	let bulkMetadataCategory: string = '';
	let bulkExifDate: string = '';
	let bulkExifMake: string = '';
	let bulkExifModel: string = '';
	let isBulkUpdating = false;
	/** Progress for bulk regenerate thumbnails (streaming) */
	let regenProgress: { total: number; processed: number; failed: number; inProgress: boolean } | null = null;

	// Album and photo utility functions are now imported from shared utilities

	// Photo URL function is now imported from shared utility
	// Using empty string fallback for admin pages (as per original implementation)

	async function loadAlbum() {
		try {
			loading = true;
			error = '';
			const response = await fetch(`/api/admin/albums/${albumId}?t=${Date.now()}`, {
				cache: 'no-store',
			});
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			album = result.data || result;
		} catch (err) {
			logger.error('Failed to fetch album:', err);
			error = handleError(err, $t('admin.failedToLoadAlbum'));
		} finally {
			loading = false;
		}
	}

	async function loadPhotos() {
		try {
			const response = await fetch(`/api/admin/albums/${albumId}/photos?t=${Date.now()}`, {
				cache: 'no-store',
			});
			logger.debug('Photos API response status:', response.status);
			
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			
			const result = await response.json();
			logger.debug('Photos API result:', result);
			if (result.success) {
				photos = result.data || [];
				logger.debug(`Loaded ${photos.length} photos`);
				if (photos.length > 0) {
					logger.debug('Sample photo:', {
						_id: photos[0]._id,
						filename: photos[0].filename,
						hasStorage: !!photos[0].storage,
						storage: photos[0].storage,
						thumbnailPath: photos[0].storage?.thumbnailPath,
						url: photos[0].storage?.url,
						constructedUrl: getPhotoUrl(photos[0], { fallback: '' }),
					});
				}
			} else {
				throw new Error(result.error || $t('admin.failedToLoadPhotos'));
			}
		} catch (err) {
			logger.error('Failed to fetch photos:', err);
			error = handleError(err, $t('admin.failedToFetchPhotos'));
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
			logger.debug('[confirmDeletePhoto] Deleting photo:', deletedPhotoId);
			const response = await fetch(`/api/admin/photos/${deletedPhotoId}`, {
				method: 'DELETE',
			});

			logger.debug('[confirmDeletePhoto] Response status:', response.status, response.statusText);

			let result: { success?: boolean; error?: string; message?: string } = {};
			try {
				result = await response.json() as { success?: boolean; error?: string; message?: string };
				logger.debug('[confirmDeletePhoto] Response data:', result);
			} catch (parseError) {
				logger.warn('[confirmDeletePhoto] Failed to parse JSON response:', parseError);
			}

			if (response.ok && (result.success !== false)) {
				// Photo deleted successfully
				logger.debug('[confirmDeletePhoto] Photo deleted successfully, closing dialog');
				
				// Close dialog immediately
				closePhotoDeleteDialog();
				
				// Remove photo from local array immediately for better UX
				photos = photos.filter((p) => p._id !== deletedPhotoId);
				
				// Show success message
				successMessage = $t('admin.photoDeletedSuccessfully').replace('{title}', photoTitle);
				
				// Clear success message after 3 seconds
				setTimeout(() => {
					successMessage = '';
				}, 3000);
				
				// Reload album and photos to update counts
				await Promise.all([loadAlbum(), loadPhotos()]);
			} else {
				const errorMsg = result.error || result.message || $t('admin.failedToDeletePhotoWithStatus')
					.replace('{status}', String(response.status));
				error = errorMsg;
				// Update isDeleting by creating a new object
				photoDeleteDialog = {
					...photoDeleteDialog,
					isDeleting: false,
				};
				logger.error('[confirmDeletePhoto] Delete failed:', errorMsg);
			}
		} catch (err) {
			logger.error('[confirmDeletePhoto] Exception during delete:', err);
			error = handleError(err, $t('admin.failedToDeletePhoto'));
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
		logger.debug('[deleteAlbum] Deleting album:', albumId, 'URL:', deleteUrl);
		
		try {
			const response = await fetch(deleteUrl, { method: 'DELETE' });
			logger.debug('[deleteAlbum] Response status:', response.status, response.statusText);
			
			if (response.ok) {
				logger.debug('[deleteAlbum] Album deleted successfully, redirecting...');
				goto('/admin/albums');
			} else {
				const errorText = await response.text();
				logger.error('[deleteAlbum] Delete failed:', response.status, errorText);
				
				let errorData: { error?: string; message?: string } = {};
				try {
					errorData = JSON.parse(errorText) as { error?: string; message?: string };
				} catch (parseError) {
					logger.warn('[deleteAlbum] Failed to parse error response as JSON');
				}
				
				error = errorData.error || errorData.message || `Failed to delete album (${response.status} ${response.statusText})`;
			}
		} catch (err) {
			logger.error('[deleteAlbum] Exception during delete:', err);
			error = handleError(err, $t('admin.failedToDeleteAlbum'));
		}
	}

	function togglePhotoSelection(photoId: string) {
		if (selectedPhotoIds.has(photoId)) {
			selectedPhotoIds.delete(photoId);
		} else {
			selectedPhotoIds.add(photoId);
		}
		selectedPhotoIds = selectedPhotoIds; // Trigger reactivity
		showBulkActions = selectedPhotoIds.size > 0;
	}

	function toggleSelectAll() {
		if (selectedPhotoIds.size === photos.length) {
			selectedPhotoIds.clear();
		} else {
			selectedPhotoIds = new Set(photos.map(p => p._id));
		}
		selectedPhotoIds = selectedPhotoIds; // Trigger reactivity
		showBulkActions = selectedPhotoIds.size > 0;
	}

	async function loadLocations() {
		try {
			const response = await fetch('/api/admin/locations?limit=1000');
			if (response.ok) {
				const result = await response.json();
				locations = Array.isArray(result.data) ? result.data : [];
			}
		} catch (err) {
			logger.error('Failed to load locations:', err);
		}
	}

	async function bulkUpdatePhotos(updates: {
		isPublished?: boolean;
		location?: string | null;
		tags?: string[];
		metadata?: Record<string, unknown>;
		exif?: Record<string, unknown>;
	}) {
		if (selectedPhotoIds.size === 0 || isBulkUpdating) return;

		isBulkUpdating = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/admin/photos/bulk-update', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					photoIds: Array.from(selectedPhotoIds),
					updates
				})
			});

			const result = await response.json();

			if (result.success) {
				successMessage = result.data?.message || `Updated ${selectedPhotoIds.size} photo(s)`;
				selectedPhotoIds.clear();
				showBulkActions = false;
				showLocationDialog = false;
				showTagsDialog = false;
				selectedLocationId = null;
				selectedTagIds = [];
				
				// Reload photos to reflect changes
				await loadPhotos();
				
				setTimeout(() => {
					successMessage = '';
				}, 3000);
			} else {
				error = result.error || 'Failed to update photos';
			}
		} catch (err) {
			logger.error('Bulk update failed:', err);
			error = `Failed to update photos: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			isBulkUpdating = false;
		}
	}

	function openLocationDialog() {
		showLocationDialog = true;
		if (locations.length === 0) {
			loadLocations();
		}
	}

	function applyLocation() {
		if (selectedLocationId !== null) {
			bulkUpdatePhotos({ location: selectedLocationId });
		}
	}

	async function loadTags() {
		try {
			const response = await fetch('/api/admin/tags?limit=500', { credentials: 'include' });
			if (!response.ok) return;
			const result = await response.json();
			const data = result.data ?? result;
			tags = Array.isArray(data) ? data : data?.data ?? [];
		} catch (err) {
			logger.error('Failed to load tags', err);
		}
	}

	function openTagsDialog() {
		showTagsDialog = true;
		selectedTagIds = [];
		if (tags.length === 0) {
			loadTags();
		}
	}

	function toggleTag(tagId: string) {
		if (selectedTagIds.includes(tagId)) {
			selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
		} else {
			selectedTagIds = [...selectedTagIds, tagId];
		}
	}

	function applyTags() {
		bulkUpdatePhotos({ tags: selectedTagIds });
		showTagsDialog = false;
	}

	function openMetadataDialog() {
		showMetadataDialog = true;
		bulkMetadataRating = '';
		bulkMetadataCategory = '';
		bulkExifDate = '';
		bulkExifMake = '';
		bulkExifModel = '';
	}

	function applyMetadata() {
		const metadata: Record<string, unknown> = {};
		if (bulkMetadataRating !== '') {
			const r = Number(bulkMetadataRating);
			if (r >= 1 && r <= 5) metadata.rating = r;
		}
		if (bulkMetadataCategory.trim() !== '') metadata.category = bulkMetadataCategory.trim();
		const exif: Record<string, unknown> = {};
		if (bulkExifDate.trim()) exif.dateTime = new Date(bulkExifDate.trim()).toISOString();
		if (bulkExifMake.trim()) exif.make = bulkExifMake.trim();
		if (bulkExifModel.trim()) exif.model = bulkExifModel.trim();
		if (Object.keys(metadata).length > 0 || Object.keys(exif).length > 0) {
			bulkUpdatePhotos({ ...(Object.keys(metadata).length > 0 ? { metadata } : {}), ...(Object.keys(exif).length > 0 ? { exif } : {}) });
			showMetadataDialog = false;
		}
	}

	async function bulkReExtractExif() {
		if (selectedPhotoIds.size === 0 || isBulkUpdating) return;

		isBulkUpdating = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/admin/photos/bulk/re-extract-exif', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ photoIds: Array.from(selectedPhotoIds) })
			});

			const result = await response.json();

			if (result.success) {
				const msg = result.processedCount != null
					? `Re-extracted EXIF for ${result.processedCount} photo(s)${result.failedCount > 0 ? `; ${result.failedCount} failed.` : ''}`
					: (result.message || 'Re-extracted EXIF for selected photos.');
				successMessage = msg;
				selectedPhotoIds.clear();
				showBulkActions = false;
				await loadPhotos();
				setTimeout(() => { successMessage = ''; }, 4000);
			} else {
				error = result.error || 'Failed to re-extract EXIF';
			}
		} catch (err) {
			logger.error('Bulk re-extract EXIF failed:', err);
			error = `Failed to re-extract EXIF: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			isBulkUpdating = false;
		}
	}

	async function bulkRegenerateThumbnails() {
		if (selectedPhotoIds.size === 0 || isBulkUpdating || regenProgress?.inProgress) return;

		isBulkUpdating = true;
		error = '';
		successMessage = '';
		regenProgress = { total: selectedPhotoIds.size, processed: 0, failed: 0, inProgress: true };

		try {
			const response = await fetch('/api/admin/photos/bulk/regenerate-thumbnails-stream', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ photoIds: Array.from(selectedPhotoIds) })
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				error = err.error || 'Failed to start regenerate thumbnails';
				regenProgress = null;
				isBulkUpdating = false;
				return;
			}

			const reader = response.body?.getReader();
			if (!reader) {
				error = 'No response stream';
				regenProgress = null;
				isBulkUpdating = false;
				return;
			}

			const decoder = new TextDecoder();
			let buffer = '';
			let lastDone: { success: boolean; message?: string; error?: string } | null = null;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';
				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const data = JSON.parse(line);
						if (data.event === 'progress') {
							regenProgress = {
								total: data.total ?? regenProgress?.total ?? 0,
								processed: data.processedCount ?? 0,
								failed: data.failedCount ?? 0,
								inProgress: true
							};
						} else if (data.event === 'done') {
							lastDone = {
								success: !!data.success,
								message: data.message,
								error: data.error
							};
						}
					} catch (_e) {
						// skip malformed lines
					}
				}
			}

			regenProgress = regenProgress ? { ...regenProgress, inProgress: false } : null;

			if (lastDone?.success) {
				successMessage = lastDone.message ?? `Regenerated thumbnails for ${regenProgress?.processed ?? 0} photo(s).`;
				selectedPhotoIds.clear();
				showBulkActions = false;
				await loadPhotos();
				setTimeout(() => { successMessage = ''; }, 4000);
			} else if (lastDone && !lastDone.success) {
				error = lastDone.error ?? 'Failed to regenerate thumbnails';
			}
		} catch (err) {
			logger.error('Bulk regenerate thumbnails failed:', err);
			error = `Failed to regenerate thumbnails: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			regenProgress = null;
			isBulkUpdating = false;
		}
	}

	onMount(async () => {
		await Promise.all([loadAlbum(), loadPhotos()]);
	});
</script>

<svelte:head>
	<title>{album ? getAlbumName(album) : $t('admin.albumFallbackTitle')} - {$t('navigation.admin')}</title>
</svelte:head>

{#if loading}
	<div class="min-h-[50vh] flex items-center justify-center">
			<div class="text-center">
			<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary-600)"></div>
			<p class="mt-4 text-(--color-surface-600-400)">{$t('admin.loadingAlbum')}</p>
		</div>
	</div>
{:else if error || !album}
	<div class="min-h-[50vh] flex items-center justify-center">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-(--color-surface-950-50) mb-4">{$t('admin.errorTitle')}</h1>
			<p class="text-(--color-surface-600-400) mb-4">{error || $t('admin.albumNotFound')}</p>
			<a href="/admin/albums" class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700)">
				{$t('admin.backToAlbums')}
			</a>
		</div>
	</div>
{:else}
	<div class="py-8">
		<div class="max-w-7xl mx-auto px-4">
			<!-- Breadcrumbs -->
			{#if album}
				<AlbumBreadcrumbs album={album} role="admin" />
			{/if}

			<!-- Header -->
			<div class="mb-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-(--color-surface-950-50)">{getAlbumName(album)}</h1>
						<p class="mt-2 text-(--color-surface-600-400)">
							{album.photoCount || 0} {album.photoCount === 1 ? $t('admin.photoSingular') : $t('admin.photosPlural')}
							• {album.isPublic ? $t('admin.public') : $t('admin.private')}
							{#if album.isFeatured}
								• ⭐ {$t('admin.featured')}
							{/if}
						</p>
					</div>
					<div class="flex items-center gap-3">
						<a
							href="/admin/photos/upload?albumId={albumId}"
							class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700)"
						>
							{$t('admin.uploadPhotos')}
						</a>
						<a
							href="/albums/new?parentAlbumId={albumId}"
							class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
						>
							{$t('admin.createSubAlbum')}
						</a>
						<a
							href="/admin/albums/{albumId}/edit"
							class="btn preset-filled-primary-500"
						>
							{$t('admin.editAlbum')}
						</a>
						<button
							on:click={() => (showDeleteDialog = true)}
							class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
						>
							{$t('admin.deleteAlbum')}
						</button>
						<a href="/admin/albums" class="px-4 py-2 text-(--color-surface-800-200) bg-(--color-surface-100-900) rounded-md hover:bg-(--color-surface-200-800)">
							{$t('admin.back')}
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
				<div class="mb-6 card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
					{@html MultiLangUtils.getHTMLValue(album.description, $currentLanguage) || ''}
				</div>
			{/if}

			<!-- Photos Grid -->
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-2xl font-bold text-(--color-surface-950-50)">
						{$t('admin.photosHeading')} ({photos.length}
						{#if album && album.photoCount !== photos.length}
							<span class="text-sm font-normal text-(--color-surface-600-400)">
								/ {album.photoCount} {$t('admin.totalLabel')}
							</span>
						{/if})
					</h2>
					{#if photos.length > 0}
						<div class="flex items-center gap-2">
							<button
								on:click={toggleSelectAll}
								class="px-3 py-1 text-sm text-(--color-surface-800-200) bg-(--color-surface-100-900) rounded-md hover:bg-(--color-surface-200-800)"
							>
								{selectedPhotoIds.size === photos.length
									? $t('admin.deselectAll')
									: $t('admin.selectAll')}
							</button>
						</div>
					{/if}
				</div>

				{#if showBulkActions}
					<div class="mb-4 p-4 bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] border border-[color-mix(in_oklab,var(--color-primary-500)_18%,transparent)] rounded-lg">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-(--color-primary-900)">
								{selectedPhotoIds.size} photo{selectedPhotoIds.size === 1 ? '' : 's'} selected
							</span>
							<div class="flex gap-2">
								<button
									on:click={() => bulkUpdatePhotos({ isPublished: true })}
									disabled={isBulkUpdating}
									class="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
								>
									Publish
								</button>
								<button
									on:click={() => bulkUpdatePhotos({ isPublished: false })}
									disabled={isBulkUpdating}
									class="px-3 py-1 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
								>
									Unpublish
								</button>
								<button
									on:click={openLocationDialog}
									disabled={isBulkUpdating}
									class="px-3 py-1 text-sm bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) disabled:opacity-50"
								>
									{$t('admin.setLocation')}
								</button>
								<button
									on:click={openTagsDialog}
									disabled={isBulkUpdating}
									class="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
								>
									{$t('admin.setTags')}
								</button>
								<button
									on:click={openMetadataDialog}
									disabled={isBulkUpdating}
									class="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
								>
									{$t('admin.setMetadata')}
								</button>
								<button
									on:click={bulkReExtractExif}
									disabled={isBulkUpdating}
									class="px-3 py-1 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50"
									title={$t('admin.reExtractExifTitle')}
								>
									{$t('admin.reExtractExif')}
								</button>
								<button
									on:click={bulkRegenerateThumbnails}
									disabled={isBulkUpdating || (regenProgress?.inProgress ?? false)}
									class="px-3 py-1 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
									title={$t('admin.regenerateThumbnailsTitle')}
								>
									{$t('admin.regenerateThumbnails')}
								</button>
								<button
									on:click={() => { selectedPhotoIds.clear(); showBulkActions = false; }}
									class="btn btn-sm preset-filled-primary-500"
								>
									{$t('admin.cancel')}
								</button>
							</div>
						</div>
					</div>
				{/if}

				{#if regenProgress?.inProgress}
					<div class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
						<div class="flex items-center justify-between mb-2">
							<span class="text-sm font-medium text-amber-900">
								Regenerating thumbnails… {regenProgress.processed + regenProgress.failed}/{regenProgress.total}
								{#if regenProgress.failed > 0}
									<span class="text-amber-700">({regenProgress.failed} failed)</span>
								{/if}
							</span>
						</div>
						<div class="w-full bg-amber-200 rounded-full h-2.5">
							<div
								class="bg-amber-600 h-2.5 rounded-full transition-all duration-300"
								style="width: {regenProgress.total ? Math.round(((regenProgress.processed + regenProgress.failed) / regenProgress.total) * 100) : 0}%"
							></div>
						</div>
					</div>
				{/if}

				{#if photos.length === 0}
					<div class="text-center py-12">
						<svg
							class="mx-auto h-12 w-12 text-(--color-surface-400-600)"
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
						<h3 class="mt-2 text-sm font-medium text-(--color-surface-950-50)">No photos yet</h3>
						<p class="mt-1 text-sm text-(--color-surface-600-400)">Upload photos to get started</p>
						<div class="mt-6">
							<a
								href="/admin/photos/upload?albumId={albumId}"
								class="inline-flex items-center px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700)"
							>
								Upload Photos
							</a>
						</div>
					</div>
				{:else}
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
						{#each photos as photo}
							{@const photoUrl = getPhotoUrl(photo, { fallback: '' })}
							{@const isSelected = selectedPhotoIds.has(photo._id)}
							<div class="relative group">
								<div class="absolute top-2 left-2 z-10">
									<input
										type="checkbox"
										checked={isSelected}
										on:change={() => togglePhotoSelection(photo._id)}
										class="w-5 h-5 text-(--color-primary-600) border-surface-300-700 rounded focus:ring-(--color-primary-500) bg-(--color-surface-50-950)/90"
										title={isSelected ? 'Deselect' : 'Select'}
									/>
								</div>
								<div class="aspect-square bg-(--color-surface-200-800) rounded-lg overflow-hidden {isSelected ? 'ring-4 ring-(--color-primary-500)' : ''}">
									{#if photoUrl}
										<img
											src={photoUrl}
											alt={getPhotoTitle(photo)}
											class="w-full h-full object-cover"
											style="image-orientation: from-image; {getPhotoRotationStyle(photo)}"
											on:error={(e) => {
												logger.debug('Image failed to load:', photoUrl, photo);
												const target = e.currentTarget as HTMLImageElement;
												target.style.display = 'none';
											}}
											on:load={() => {
												logger.debug('Image loaded successfully:', photoUrl);
											}}
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center">
											<svg class="w-12 h-12 text-(--color-surface-400-600)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
											class="px-3 py-1 bg-(--color-primary-600) text-white text-sm rounded hover:bg-(--color-primary-700)"
										>
											{$t('admin.edit')}
										</a>
										<button
											on:click={() => openPhotoDeleteDialog(photo)}
											disabled={photoDeleteDialog.isDeleting}
											class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
										>
											{$t('admin.delete')}
										</button>
									</div>
								</div>
								{#if !photo.isPublished}
									<div class="absolute top-2 right-2">
										<span
											class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
										>
											{$t('admin.draft')}
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
	<AdminConfirmDialog
		open={showDeleteDialog}
		title={$t('admin.deleteAlbum')}
		message={$t('admin.confirmDeleteAlbumWithPhotos')
			.replace('{name}', getAlbumName(album))}
		confirmText={$t('admin.deleteAlbum')}
		cancelText={$t('admin.cancel')}
		variant="danger"
		onOpenChange={(o) => {
			if (!o) showDeleteDialog = false;
		}}
		onConfirm={deleteAlbum}
	/>
{/if}

<!-- Delete Photo Confirmation Dialog -->
<AdminConfirmDialog
	open={photoDeleteDialog.isOpen}
	title={$t('admin.deletePhoto')}
	message={$t('admin.confirmDeletePhoto')
		.replace('{title}', photoDeleteDialog.photoTitle)}
	confirmText={photoDeleteDialog.isDeleting ? $t('admin.deleting') : $t('admin.delete')}
	cancelText={$t('admin.cancel')}
	variant="danger"
	confirmDisabled={photoDeleteDialog.isDeleting}
	onOpenChange={(o) => {
		if (!o) closePhotoDeleteDialog();
	}}
	onConfirm={confirmDeletePhoto}
/>

<!-- Location Selection Dialog -->
{#if showLocationDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 max-w-md w-full mx-4">
			<h3 class="text-lg font-semibold mb-4">
				{$t('admin.setLocationForCount')
					.replace('{count}', String(selectedPhotoIds.size))
					.replace(
						'{photosLabel}',
						selectedPhotoIds.size === 1 ? $t('admin.photoSingular') : $t('admin.photosPlural')
					)}
			</h3>
			<div class="mb-4">
				<label for="location-select" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
					{$t('admin.selectLocation')}
				</label>
				<select
					id="location-select"
					bind:value={selectedLocationId}
					class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)"
				>
					<option value="">{ $t('admin.noLocation') }</option>
					{#each locations as location}
						<option value={location._id}>
							{typeof location.name === 'string' 
								? location.name 
								: MultiLangUtils.getTextValue(location.name, $currentLanguage) || location.address || $t('admin.unnamedLocation')}
						</option>
					{/each}
				</select>
			</div>
			<div class="flex justify-end gap-2">
				<button
					on:click={() => { showLocationDialog = false; selectedLocationId = null; }}
					class="px-4 py-2 text-(--color-surface-800-200) bg-(--color-surface-100-900) rounded-md hover:bg-(--color-surface-200-800)"
				>
					{$t('admin.cancel')}
				</button>
				<button
					on:click={applyLocation}
					disabled={isBulkUpdating}
					class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) disabled:opacity-50"
				>
					{isBulkUpdating ? $t('admin.applying') : $t('admin.apply')}
				</button>
		</div>
	</div>
</div>
{/if}

<!-- Tags Selection Dialog -->
{#if showTagsDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
			<h3 class="text-lg font-semibold mb-2">Set Tags for {selectedPhotoIds.size} Photo{selectedPhotoIds.size === 1 ? '' : 's'}</h3>
			<p class="text-sm text-(--color-surface-600-400) mb-4">
				{$t('admin.setTagsDescription')}
			</p>
			<div class="flex-1 overflow-y-auto border border-surface-200-800 rounded-md p-3 mb-4 min-h-[200px]">
				{#if tags.length === 0}
					<p class="text-sm text-(--color-surface-600-400)">{$t('admin.loadingTags')}</p>
				{:else}
					<div class="space-y-2">
						{#each tags as tag}
							{@const tagName = typeof tag.name === 'string' ? tag.name : MultiLangUtils.getTextValue(tag.name, $currentLanguage) || tag._id}
							<label class="flex items-center gap-2 cursor-pointer hover:bg-(--color-surface-50-950) p-2 rounded">
								<input
									type="checkbox"
									checked={selectedTagIds.includes(tag._id)}
									on:change={() => toggleTag(tag._id)}
								/>
								<span class="text-sm text-(--color-surface-950-50)">{tagName}</span>
								{#if tag.category}
									<span class="text-xs text-(--color-surface-600-400)">({tag.category})</span>
								{/if}
							</label>
						{/each}
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-2">
				<button
					on:click={() => { showTagsDialog = false; selectedTagIds = []; }}
					class="px-4 py-2 text-(--color-surface-800-200) bg-(--color-surface-100-900) rounded-md hover:bg-(--color-surface-200-800)"
				>
					{$t('admin.cancel')}
				</button>
				<button
					on:click={applyTags}
					disabled={isBulkUpdating}
					class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
				>
					{isBulkUpdating ? $t('admin.applying') : $t('admin.apply')}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Metadata (Rating/Category) Dialog -->
{#if showMetadataDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 max-w-md w-full mx-4">
			<h3 class="text-lg font-semibold mb-4">
				{$t('admin.setMetadataForCount')
					.replace('{count}', String(selectedPhotoIds.size))
					.replace(
						'{photosLabel}',
						selectedPhotoIds.size === 1 ? $t('admin.photoSingular') : $t('admin.photosPlural')
					)}
			</h3>
			<p class="text-sm text-(--color-surface-600-400) mb-4">
				{$t('admin.setMetadataDescription')}
			</p>
			<div class="space-y-4 mb-4">
				<div>
					<label for="bulk-rating" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">
						{$t('admin.ratingLabel')}
					</label>
					<select
						id="bulk-rating"
						bind:value={bulkMetadataRating}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">{ $t('admin.leaveUnchangedOption') }</option>
						{#each [1, 2, 3, 4, 5] as n}
							<option value={n}>{n}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="bulk-category" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">
						{$t('admin.categoryLabel')}
					</label>
					<input
						id="bulk-category"
						type="text"
						bind:value={bulkMetadataCategory}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
						placeholder={$t('admin.categoryPlaceholder')}
					/>
				</div>
				<div class="border-t border-surface-200-800 pt-3 mt-3">
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.exifOverridesLabel')}
					</span>
					<div class="grid grid-cols-1 gap-3">
						<div>
							<label for="bulk-exif-date" class="block text-xs font-medium text-(--color-surface-600-400) mb-0.5">
								{$t('admin.exifDateTakenLabel')}
							</label>
							<input
								id="bulk-exif-date"
								type="datetime-local"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								bind:value={bulkExifDate}
							/>
						</div>
						<div>
							<label for="bulk-exif-make" class="block text-xs font-medium text-(--color-surface-600-400) mb-0.5">
								{$t('admin.exifMakeLabel')}
							</label>
							<input
								id="bulk-exif-make"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								placeholder={$t('admin.exifMakePlaceholder')}
								bind:value={bulkExifMake}
							/>
						</div>
						<div>
							<label for="bulk-exif-model" class="block text-xs font-medium text-(--color-surface-600-400) mb-0.5">
								{$t('admin.exifModelLabel')}
							</label>
							<input
								id="bulk-exif-model"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								placeholder={$t('admin.exifModelPlaceholder')}
								bind:value={bulkExifModel}
							/>
						</div>
					</div>
				</div>
			</div>
			<div class="flex justify-end gap-2">
				<button
					on:click={() => { showMetadataDialog = false; bulkMetadataRating = ''; bulkMetadataCategory = ''; bulkExifDate = ''; bulkExifMake = ''; bulkExifModel = ''; }}
					class="px-4 py-2 text-(--color-surface-800-200) bg-(--color-surface-100-900) rounded-md hover:bg-(--color-surface-200-800)"
				>
					{$t('admin.cancel')}
				</button>
				<button
					on:click={applyMetadata}
					disabled={isBulkUpdating || (bulkMetadataRating === '' && bulkMetadataCategory.trim() === '' && !bulkExifDate.trim() && !bulkExifMake.trim() && !bulkExifModel.trim())}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isBulkUpdating ? $t('admin.applying') : $t('admin.apply')}
				</button>
			</div>
		</div>
	</div>
{/if}
