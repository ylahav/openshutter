<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { invalidate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimarySm, adminRingPrimary } from '$lib/admin/admin-cerberus';
	import AdminConfirmDialog from '$lib/components/admin/AdminConfirmDialog.svelte';
	import AlbumTree from '$lib/components/AlbumTree.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { t } from '$stores/i18n';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { getPhotoTitle } from '$lib/utils/photoUtils';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';
	import { routePageData } from '$lib/admin/routePageData';
	import { adminNavigate } from '$lib/admin/adminNavigation';

	let { data }: { data: PageData } = $props();

	const pd = routePageData<PageData>();

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		alias: string;
		description?: string | { en?: string; he?: string };
		isPublic: boolean;
		isPublished: boolean;
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
		allowedGroups?: string[];
		allowedUsers?: string[];
		createdAt: string;
		updatedAt: string;
		childAlbumCount?: number;
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

	type AlbumRow = Album;

	const albums = $derived(($pd.albums ?? []) as AlbumRow[]);
	let albumsKey = $state(0);

	// Cover photo modal state
	let coverPhotoModal: {
		isOpen: boolean;
		album: Album | null;
		photos: Photo[];
		loading: boolean;
		currentPage: number;
		photosPerPage: number;
		totalPhotos: number;
	} = $state({
		isOpen: false,
		album: null,
		photos: [],
		loading: false,
		currentPage: 1,
		photosPerPage: 24,
		totalPhotos: 0,
	});

	// Delete confirmation
	let deleteDialog: {
		isOpen: boolean;
		albumId: string | null;
		albumName: string;
		isDeleting: boolean;
	} = $state({
		isOpen: false,
		albumId: null,
		albumName: '',
		isDeleting: false,
	});

	let error = $state('');
	let searchQuery = $state('');
	type AlbumStatusFilter = 'all' | 'published' | 'draft' | 'private';
	type AlbumSortOption = 'manual' | 'name' | 'date';
	let statusFilter: AlbumStatusFilter = $state('all');
	let sortOption: AlbumSortOption = $state('manual');

	async function refreshAlbums() {
		await invalidate('admin:albums');
		albumsKey += 1;
	}

	async function togglePublished(album: Album) {
		try {
			const currentStatus = album.isPublished !== undefined ? album.isPublished : true;
			const newPublishedStatus = !currentStatus;
			const response = await fetch(`/api/admin/albums/${album._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					isPublished: newPublishedStatus
				}),
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			// Reload albums to get fresh data from server
			await refreshAlbums();
		} catch (err) {
			logger.error('Failed to toggle published status:', err);
			error = handleError(err, $t('admin.failedToUpdatePublishedStatus'));
		}
	}

	async function togglePublic(album: Album) {
		try {
			const currentStatus = album.isPublic !== undefined ? album.isPublic : false;
			const newPublicStatus = !currentStatus;
			const response = await fetch(`/api/admin/albums/${album._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					isPublic: newPublicStatus
				}),
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			// Reload albums to get fresh data from server
			await refreshAlbums();
		} catch (err) {
			logger.error('Failed to toggle public status:', err);
			error = handleError(err, $t('admin.failedToUpdatePublicStatus'));
		}
	}

	async function toggleFeatured(album: Album) {
		try {
			const current = album.isFeatured === true;
			const response = await fetch(`/api/admin/albums/${album._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					isFeatured: !current,
				}),
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			await refreshAlbums();
		} catch (err) {
			logger.error('Failed to toggle featured status:', err);
			error = handleError(err, $t('admin.failedToUpdateFeaturedStatus'));
		}
	}

	onMount(() => {
		// Set up event delegation for action buttons in AlbumTree
		const handleActionClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;

			// Let normal links (edit, upload, view in new tab) work natively
			if (target.closest('a[href]')) return;
			
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
			
			if (action === 'toggle-published') {
				togglePublished(album);
			} else if (action === 'toggle-public') {
				togglePublic(album);
			} else if (action === 'cover-photo') {
				openCoverPhotoModal(album);
			} else if (action === 'toggle-featured') {
				toggleFeatured(album);
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

	function escAttr(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
	}

	function renderAlbumActions(node: any): string {
		const isPublished = node.isPublished !== undefined ? node.isPublished : true;
		const isPublic = node.isPublic !== undefined ? node.isPublic : false;
		const isFeatured = node.isFeatured === true;
		const tx = (key: string) => escAttr(get(t)(key));
		const returnTo = encodeURIComponent('/admin/albums');
		const uploadHref = `/admin/photos/upload?albumId=${encodeURIComponent(node._id)}&returnTo=${returnTo}`;
		const iconBtn =
			'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base leading-none text-(--color-surface-500-500) hover:bg-(--color-surface-100-900) hover:text-(--color-surface-800-200)';
		const iconBtnActive = ' text-(--color-primary-600) hover:text-(--color-primary-800)';
		return `
			<div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 album-actions text-left" data-album-id="${node._id}">
				<button
					type="button"
					data-action="toggle-published"
					class="inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${isPublished
						? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100'
						: 'border-(--color-surface-300-600) bg-(--color-surface-100-900) text-(--color-surface-700-300) hover:bg-(--color-surface-200-800)'}"
					title="${isPublished ? tx('admin.albumsListUnpublishHint') : tx('admin.albumsListPublishHint')}"
				>
					${isPublished ? tx('admin.dashboardPublished') : tx('admin.dashboardDraft')}
				</button>
				<span class="shrink-0 text-(--color-surface-400-500) select-none" aria-hidden="true">·</span>
				<a
					href="/admin/albums/${node._id}/edit"
					class="shrink-0 text-xs font-medium text-(--color-primary-600) hover:text-(--color-primary-800) hover:underline"
					title="${tx('admin.editAlbum')}"
					data-sveltekit-reload
				>${tx('admin.albumsListActionEdit')}</a>
				<a
					href="${uploadHref}"
					class="shrink-0 text-xs font-medium text-(--color-primary-600) hover:text-(--color-primary-800) hover:underline"
					title="${tx('admin.uploadPhotos')}"
					data-sveltekit-reload
				>${tx('admin.albumsListActionUpload')}</a>
				<span class="mx-0.5 h-4 w-px shrink-0 self-center bg-(--color-surface-300-600)" aria-hidden="true"></span>
				<button
					type="button"
					data-action="toggle-public"
					class="${iconBtn}${isPublic ? iconBtnActive : ''}"
					title="${tx('admin.albumsListPublicToggleHint')}"
				>
					${isPublic ? '🌐' : '🔒'}
				</button>
				<button
					type="button"
					data-action="cover-photo"
					class="${iconBtn}"
					title="${tx('admin.setCoverPhoto')}"
				>
					🖼️
				</button>
				<a
					href="/albums/${node.alias}"
					target="_blank"
					rel="noopener noreferrer"
					class="${iconBtn}"
					title="${tx('search.view')}"
				>
					👁️
				</a>
				<button
					type="button"
					data-action="toggle-featured"
					class="${iconBtn}${isFeatured ? ' text-amber-600 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30' : ''}"
					title="${tx('admin.albumsListToggleFeaturedHint')}"
				>
					⭐
				</button>
				<span class="mx-0.5 h-4 w-px shrink-0 self-center bg-(--color-surface-300-600)" aria-hidden="true"></span>
				<button
					type="button"
					data-action="delete"
					class="shrink-0 text-xs font-medium text-red-600 hover:text-red-900 hover:underline"
					title="${tx('admin.deleteAlbum')}"
				>
					${tx('admin.delete')}
				</button>
			</div>
		`;
	}

	function handleOpen(node: { _id: string }) {
		adminNavigate(`/admin/albums/${node._id}`);
	}

	// Album name function is now imported from shared utility


	function albumMatchesRowStatus(a: Album): boolean {
		const published = a.isPublished !== false;
		const isPublic = a.isPublic === true;
		if (statusFilter === 'all') return true;
		if (statusFilter === 'draft') return !published;
		if (statusFilter === 'private') return published && !isPublic;
		if (statusFilter === 'published') return published && isPublic;
		return true;
	}

	function albumMatchesSearch(a: Album, q: string): boolean {
		if (!q.trim()) return true;
		const ql = q.toLowerCase();
		return (
			getAlbumName(a).toLowerCase().includes(ql) ||
			String(a.alias ?? '')
				.toLowerCase()
				.includes(ql)
		);
	}

	function getDisplayAlbums(): Album[] {
		const list = albums;
		const q = searchQuery.trim();
		if (!q && statusFilter === 'all') {
			return list;
		}
		const byId = new Map(list.map((x) => [x._id, x]));
		const direct = new Set(
			list.filter((a) => albumMatchesSearch(a, q) && albumMatchesRowStatus(a)).map((a) => a._id)
		);
		const visible = new Set<string>();
		const addAncestors = (id: string) => {
			let cur: Album | undefined = byId.get(id);
			while (cur) {
				visible.add(cur._id);
				const pid = cur.parentAlbumId;
				cur = pid ? byId.get(pid) : undefined;
			}
		};
		const addDescendants = (id: string) => {
			for (const a of list) {
				if (a.parentAlbumId === id) {
					visible.add(a._id);
					addDescendants(a._id);
				}
			}
	};
		for (const id of direct) {
			addAncestors(id);
			addDescendants(id);
		}
		return list.filter((a) => visible.has(a._id));
	}

	const reorderEnabled = $derived(!searchQuery.trim() && statusFilter === 'all' && sortOption === 'manual');

	async function handleReorder(
		updates: Array<{ id: string; parentAlbumId: string | null; order: number }>
	) {
		try {
			// Ensure all IDs are strings
			const sanitizedUpdates = updates.map(update => ({
				id: String(update.id),
				parentAlbumId: update.parentAlbumId != null ? String(update.parentAlbumId) : null,
				order: update.order
			}));
			const response = await fetch('/api/admin/albums/reorder', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ updates: sanitizedUpdates })
			});
			
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'Failed to reorder albums' }));
				throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
			}
			
			await response.json();
			await refreshAlbums();
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
				await refreshAlbums();
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
				const deletedName = deleteDialog.albumName;
				closeDeleteDialog();
				await refreshAlbums();
				adminToast.success({
					title: $t('admin.deleteAlbum'),
					description: deletedName,
				});
			} else {
				const errorData = await response.json().catch(() => ({ error: 'Failed to delete album' }));
				error = errorData.error || errorData.message || 'Failed to delete album';
				adminToast.error({
					title: $t('admin.deleteError'),
					description: error,
				});
				// Update isDeleting by creating a new object
				deleteDialog = {
					...deleteDialog,
					isDeleting: false,
				};
			}
		} catch (err) {
			logger.error('Failed to delete album:', err);
			error = handleError(err, 'Failed to delete album');
			adminToast.error({ title: $t('admin.deleteError'), description: error });
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
	<title>{$t('admin.albumsManagement')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-7xl mx-auto px-4">
		<div class="flex items-center justify-between mb-6">
			<div>
					<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.albumsManagement')}</h1>
					<p class="text-(--color-surface-600-400) mt-2">{$t('admin.manageAlbumsDescription')}</p>
			</div>
			<div class="flex items-center gap-3">
				<a
					href="/albums/new"
					class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) text-sm font-medium"
				>
					+ {$t('admin.createAlbum')}
				</a>
			</div>
		</div>

		{#if error}
			<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
		{/if}

		<!-- Stats Overview -->
		<div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-orange-600 tabular-nums">
						{albums.reduce((total, album) => total + (album.photoCount || 0), 0).toLocaleString()}
					</div>
					<div class="text-sm text-(--color-surface-600-400)">{$t('admin.albumsListStatPhotosLabel')}</div>
				</div>
			</div>
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-(--color-primary-600) tabular-nums">{albums.length.toLocaleString()}</div>
					<div class="text-sm text-(--color-surface-600-400)">{$t('admin.albumsListStatAlbumsLabel')}</div>
					<div class="mt-0.5 text-xs text-(--color-surface-500-400)">{$t('admin.albumsListStatAlbumsSub')}</div>
				</div>
			</div>
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600 tabular-nums">
						{albums.filter((a) => a.isPublished !== false).length.toLocaleString()}
					</div>
					<div class="text-sm text-(--color-surface-600-400)">{$t('admin.albumsListStatPublishedLabel')}</div>
				</div>
			</div>
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-(--color-primary-600) tabular-nums">
						{albums.filter((a) => a.isPublic === true).length.toLocaleString()}
					</div>
					<div class="text-sm text-(--color-surface-600-400)">{$t('admin.albumsListStatPublicLabel')}</div>
				</div>
			</div>
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
				<div class="text-center">
					<div
						class="text-2xl font-bold tabular-nums {albums.filter((a) => a.isFeatured).length === 0 &&
						albums.some((a) => a.isPublished !== false)
							? 'text-red-600'
							: 'text-purple-600'}"
					>
						{albums.filter((a) => a.isFeatured).length.toLocaleString()}
					</div>
					<div
						class="text-sm {albums.filter((a) => a.isFeatured).length === 0 &&
						albums.some((a) => a.isPublished !== false)
							? 'text-red-600 font-medium'
							: 'text-(--color-surface-600-400)'}"
					>
						{$t('admin.albumsListStatFeaturedLabel')}
					</div>
					{#if albums.filter((a) => a.isFeatured).length === 0 && albums.some((a) => a.isPublished !== false)}
						<div class="mt-0.5 text-xs font-medium text-red-600">{$t('admin.dashboardStatFeaturedHint')}</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Search, status filter, sort -->
		<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder={$t('admin.searchAlbumsPlaceholder')}
				class="w-full min-w-0 flex-1 px-4 py-2 border border-surface-300-700 rounded-md focus:outline-none focus:ring-2 focus:ring-(--color-primary-500) sm:max-w-md"
			/>
			<div class="flex flex-wrap items-center gap-2 sm:gap-3">
				<div class="flex items-center gap-1.5">
					<span class="text-sm font-medium text-(--color-surface-600-400) shrink-0" id="album-status-lbl"
						>{$t('admin.albumsListFilterLabel')}</span
					>
					<select
						bind:value={statusFilter}
						aria-labelledby="album-status-lbl"
						class="rounded-md border border-surface-300-700 bg-(--color-surface-50-950) px-3 py-2 text-sm text-(--color-surface-900-100) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)"
					>
						<option value="all">{$t('admin.albumsListFilterAll')}</option>
						<option value="published">{$t('admin.albumsListFilterPublished')}</option>
						<option value="draft">{$t('admin.albumsListFilterDraft')}</option>
						<option value="private">{$t('admin.albumsListFilterPrivate')}</option>
					</select>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="text-sm font-medium text-(--color-surface-600-400) shrink-0" id="album-sort-lbl"
						>{$t('admin.albumsListSortLabel')}</span
					>
					<select
						bind:value={sortOption}
						aria-labelledby="album-sort-lbl"
						class="rounded-md border border-surface-300-700 bg-(--color-surface-50-950) px-3 py-2 text-sm text-(--color-surface-900-100) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)"
					>
						<option value="manual">{$t('admin.albumsListSortManual')}</option>
						<option value="name">{$t('admin.albumsListSortName')}</option>
						<option value="date">{$t('admin.albumsListSortDate')}</option>
					</select>
				</div>
			</div>
		</div>

		{#if $pd.albumsLoadError}
			<div class="text-center py-8">
				<p class="text-red-600">{$pd.albumsLoadError}</p>
			</div>
		{:else if albums.length === 0}
			<div class="text-center py-12 card preset-outlined-surface-200-800 bg-surface-50-950">
				<div class="text-(--color-surface-400-600) text-6xl mb-4">📁</div>
				<h3 class="text-xl font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.noAlbumsFound')}</h3>
				<p class="text-(--color-surface-600-400) mb-6">
					{$t('admin.getStartedByCreatingFirstAlbum')}
				</p>
				<a
					href="/albums/new"
					class="{adminBtnPrimarySm} px-6 py-3 {adminRingPrimary}"
				>
					{$t('admin.createAlbum')}
				</a>
			</div>
		{:else if getDisplayAlbums().length === 0}
			<div class="text-center py-12 card preset-outlined-surface-200-800 bg-surface-50-950">
				<div class="text-(--color-surface-400-600) text-6xl mb-4">🔎</div>
				<h3 class="text-xl font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.albumsListNoResultsTitle')}</h3>
				<p class="text-(--color-surface-600-400) mb-6">{$t('admin.albumsListNoMatches')}</p>
			</div>
		{:else}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
				{#key albumsKey}
				<AlbumTree
					albums={getDisplayAlbums().map((a) => ({
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
						childAlbumCount: a.childAlbumCount ?? 0,
						updatedAt: a.updatedAt,
						isPublic: a.isPublic !== undefined ? a.isPublic : false,
						isPublished: a.isPublished !== undefined ? a.isPublished : true,
						isFeatured: a.isFeatured,
						allowedGroups: a.allowedGroups ?? [],
						allowedUsers: a.allowedUsers ?? []
					}))}
					onReorder={reorderEnabled ? handleReorder : undefined}
					onOpen={handleOpen}
					renderActions={renderAlbumActions}
					clientSortBy={sortOption}
					showAccordion={true}
					expandAllByDefault={false}
				/>
				{/key}
			</div>
		{/if}
	</div>
</div>

<!-- Cover Photo Modal -->
{#if coverPhotoModal.isOpen}
	<div class="fixed inset-0 bg-[color-mix(in_oklab,var(--color-surface-950)_55%,transparent)] overflow-y-auto h-full w-full z-50">
		<div class="relative top-10 mx-auto p-5 border w-11/12 md:w-5/6 lg:w-4/5 xl:w-3/4 shadow-lg rounded-md bg-(--color-surface-50-950) max-w-6xl">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-medium text-(--color-surface-950-50)">
					{$t('admin.selectCoverPhoto')} - {coverPhotoModal.album ? getAlbumName(coverPhotoModal.album) : ''}
				</h3>
				<button 
					onclick={closeCoverPhotoModal} 
					class="text-(--color-surface-400-600) hover:text-(--color-surface-600-400)"
					aria-label="Close modal"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			{#if coverPhotoModal.loading}
					<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-(--color-primary-500)"></div>
					<p class="mt-2 text-(--color-surface-600-400)">{$t('admin.loadingPhotos')}</p>
				</div>
			{:else if coverPhotoModal.totalPhotos === 0}
				<div class="text-center py-8">
					<p class="text-(--color-surface-600-400)">{$t('admin.noPhotosAvailable')}</p>
				</div>
			{:else}
				<div class="max-h-[70vh] overflow-y-auto">
					<div class="mb-4 text-sm text-(--color-surface-600-400)">
						{$t('admin.showingPhotosRange')
							.replace(
								'{from}',
								String((coverPhotoModal.currentPage - 1) * coverPhotoModal.photosPerPage + 1)
							)
							.replace(
								'{to}',
								String(
									Math.min(
										coverPhotoModal.currentPage * coverPhotoModal.photosPerPage,
										coverPhotoModal.totalPhotos
									)
								)
							)
							.replace('{total}', String(coverPhotoModal.totalPhotos))}
					</div>

					<div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-6">
						{#each getPaginatedPhotos() as photo}
							{@const isCurrentCover = coverPhotoModal.album?.coverPhotoId === photo._id}
							<button
								type="button"
								class="relative cursor-pointer group {isCurrentCover
									? 'ring-4 ring-(--color-primary-500) ring-opacity-75'
									: ''}"
								onclick={() => setCoverPhoto(photo._id)}
								aria-label={$t('admin.setAsCoverPhoto')}
							>
								<img
									src={photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
									alt={getPhotoTitle(photo) || photo.filename || $t('admin.photoFallbackAlt')}
									class="w-full h-20 object-cover rounded-lg hover:opacity-75 transition-opacity {isCurrentCover
										? 'ring-2 ring-(--color-primary-500)'
										: ''}"
									style="image-orientation: from-image;"
								/>
								{#if isCurrentCover}
									<div
										class="absolute top-1 right-1 bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)]0 text-white text-xs px-1.5 py-0.5 rounded-full font-medium"
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
								onclick={() => goToPage(coverPhotoModal.currentPage - 1)}
								disabled={coverPhotoModal.currentPage === 1}
								class="px-3 py-1 text-sm font-medium text-(--color-surface-600-400) bg-(--color-surface-100-900) rounded-md hover:bg-(--color-surface-200-800) disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{$t('admin.previous')}
							</button>
							<span class="text-sm text-(--color-surface-600-400)">
								{$t('admin.pageOf')
									.replace('{page}', String(coverPhotoModal.currentPage))
									.replace('{total}', String(getTotalPages()))}
							</span>
							<button
								onclick={() => goToPage(coverPhotoModal.currentPage + 1)}
								disabled={coverPhotoModal.currentPage === getTotalPages()}
								class="px-3 py-1 text-sm font-medium text-(--color-surface-600-400) bg-(--color-surface-100-900) rounded-md hover:bg-(--color-surface-200-800) disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{$t('admin.next')}
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<div class="mt-6 flex justify-end">
				<button
					onclick={closeCoverPhotoModal}
					class="px-4 py-2 text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-100-900) rounded-md hover:bg-(--color-surface-200-800)"
				>
					{$t('admin.close')}
				</button>
			</div>
		</div>
	</div>
{/if}

<AdminConfirmDialog
	open={deleteDialog.isOpen}
	title={$t('admin.deleteAlbum')}
	message={$t('admin.confirmDeleteAlbum').replace('{name}', deleteDialog.albumName)}
	confirmText={deleteDialog.isDeleting ? $t('admin.deleting') : $t('admin.delete')}
	cancelText={$t('admin.cancel')}
	variant="danger"
	confirmDisabled={deleteDialog.isDeleting}
	onOpenChange={(o) => {
		if (!o) closeDeleteDialog();
	}}
	onConfirm={confirmDelete}
/>
