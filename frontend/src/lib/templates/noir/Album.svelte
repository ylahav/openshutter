<script lang="ts">
	import './styles.scss';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { auth, loadSession } from '$lib/stores/auth';
	import {
	anyCollaborationSectionVisible,
	resolveCollaborationVisibility,
	showCollabServiceForViewer,
	} from '$lib/utils/collaboration-visibility';
	import { t } from '$stores/i18n';
	import { MultiLangUtils } from '$utils/multiLang';
	import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import AlbumCollaborationPanel from '$lib/components/AlbumCollaborationPanel.svelte';
	import { getPhotoUrl, getPhotoRotationStyle } from '$lib/utils/photoUrl';
	import { logger } from '$lib/utils/logger';
	import SocialShareButtons from '$lib/components/SocialShareButtons.svelte';

	interface AlbumData {
		album: {
			_id: string;
			name: any;
			description?: any;
			alias: string;
			photoCount?: number;
			createdBy?: string | null;
		};
		subAlbums: any[];
		photos: any[];
		pagination?: {
			page: number;
			limit: number;
			total: number;
			pages: number;
		};
	}

	let alias = $page.params.alias || $page.params.id;
	let albumData: AlbumData | null = null;
	let loading = true;
	let error: string | null = null;
	let lightboxOpen = false;
	let lightboxIndex = 0;
	let loadingMore = false;
	let isInitialLoad = true;
	let photoLoaded: Record<string, boolean> = {};

	$: collabVis = resolveCollaborationVisibility($siteConfigData?.features);
	$: isAuthed = $auth.authenticated && !!$auth.user;
	$: canModerateAlbum =
		isAuthed &&
		$auth.user &&
		albumData &&
		($auth.user.role === 'admin' || $auth.user.id === albumData.album.createdBy);
	$: showCollabPanel =
		!!albumData && anyCollaborationSectionVisible(collabVis, isAuthed, !!canModerateAlbum);
	let subAlbumCoverImages: Record<string, string> = {};
	let albumHeroCover: string | null = null;

	// React to route parameter changes
	afterNavigate(({ to, from }) => {
		if (!browser) return;
		
		const newAlias = to?.params?.alias || to?.params?.id;
		const oldAlias = from?.params?.alias || from?.params?.id;
		
		// Only fetch if the alias actually changed (not on initial load)
		if (newAlias && newAlias !== oldAlias) {
			alias = newAlias;
			fetchAlbumData();
		} else if (isInitialLoad && newAlias) {
			// Handle initial load
			alias = newAlias;
			fetchAlbumData();
			isInitialLoad = false;
		}
	});

	onMount(async () => {
		if (alias && isInitialLoad) {
			await fetchAlbumData();
			isInitialLoad = false;
		}
	});

	async function fetchAlbumCover(albumId: string) {
		try {
			const res = await fetch(`/api/albums/${albumId}/cover-image`, { credentials: 'include' });
			if (!res.ok) {
				albumHeroCover = null;
				return;
			}
			const data = await res.json().catch(() => ({}));
			albumHeroCover = data?.url ?? null;
		} catch {
			albumHeroCover = null;
		}
	}

	async function fetchAlbumData() {
		if (!alias || !browser) return;
		try {
			loading = true;
			error = null;
			albumHeroCover = null;
			const res = await fetch(`/api/albums/${encodeURIComponent(alias)}/data?page=1&limit=50&t=${Date.now()}`, {
				cache: 'no-store',
				credentials: 'include',
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (res.status === 403) {
					throw new Error('Access denied. This album is private. Sign in to view it if you have access.');
				}
				throw new Error(data?.error || 'Album not found');
			}
			albumData = data;
			if (data?.album?._id) {
				fetchAlbumCover(data.album._id);
			}
			// Ensure pagination exists so "Load more" shows when there are more photos
			if (albumData && albumData.photos) {
				const limit = 50;
				if (!albumData.pagination || typeof albumData.pagination.pages !== 'number') {
					const total = albumData.album?.photoCount ?? albumData.photos.length;
					albumData.pagination = {
						page: 1,
						limit,
						total: typeof total === 'number' ? total : albumData.photos.length,
						pages: Math.max(1, Math.ceil((typeof total === 'number' ? total : albumData.photos.length) / limit)),
					};
				}
			}
			logger.debug('Album data loaded:', albumData);
			// Open lightbox at photo from hash (#p=index) when sharing a single photo
			if (browser && data?.photos?.length) {
				const m = window.location.hash.match(/^#p=(\d+)$/);
				if (m) {
					const idx = parseInt(m[1], 10);
					if (idx >= 0 && idx < data.photos.length) {
						lightboxIndex = idx;
						lightboxOpen = true;
					}
				}
			}
			if (data?.subAlbums?.length) {
				fetchSubAlbumCoverImages(data.subAlbums.map((a: { _id: string }) => a._id));
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch album';
			albumData = null;
		} finally {
			loading = false;
		}
	}

	function openLightbox(index: number) {
		lightboxIndex = index;
		lightboxOpen = true;
	}

	async function loadMorePhotos() {
		if (!albumData || !albumData.pagination || loadingMore || !albumData.album) return;
		const albumId = albumData.album._id;
		const pagination = albumData.pagination;
		const nextPage = pagination.page + 1;
		if (nextPage > pagination.pages) return;

		try {
			loadingMore = true;
			const res = await fetch(
				`/api/albums/${albumId}/data?page=${nextPage}&limit=50&t=${Date.now()}`,
				{ cache: 'no-store', credentials: 'include' }
			);
			if (res.ok && albumData) {
				const result = await res.json().catch(() => ({}));
				const newPhotos = result.photos || [];
				const nextPagination = result.pagination || { ...pagination, page: nextPage };
				albumData = {
					...albumData,
					photos: [...albumData.photos, ...newPhotos],
					pagination: nextPagination,
				};
			}
		} finally {
			loadingMore = false;
		}
	}

	async function fetchSubAlbumCoverImages(albumIds: string[]) {
		if (albumIds.length === 0) return;
		try {
			const response = await fetch('/api/albums/cover-images', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ albumIds })
			});
			if (response.ok) {
				const result = await response.json();
				const data = result.success ? result.data : result;
				if (data && typeof data === 'object') {
					subAlbumCoverImages = { ...subAlbumCoverImages, ...data };
				}
			}
		} catch (err) {
			logger.error('Failed to fetch sub-album cover images:', err);
		}
	}

	// Photo URL function is now imported from shared utility
	$: showAlbumShare = $siteConfigData?.features?.enableSharing !== false && $siteConfigData?.features?.sharingOnAlbum !== false;
	$: hasMorePhotos = albumData?.photos && (
		(albumData.pagination && albumData.pagination.page < albumData.pagination.pages) ||
		((albumData.pagination?.total ?? albumData.album?.photoCount ?? albumData.photos.length) > albumData.photos.length)
	);
	$: totalPhotoCount = albumData?.pagination?.total ?? albumData?.album?.photoCount ?? albumData?.photos?.length ?? 0;
	$: remainingCount = albumData?.photos ? Math.max(0, totalPhotoCount - albumData.photos.length) : 0;
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-[color:var(--tp-canvas)]">
		<div class="text-center [font-family:var(--os-font-body)]">
			<div
				class="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4 border-[color:var(--tp-border)] border-t-[color:var(--tp-fg)]"
			></div>
			<p class="text-[10px] uppercase tracking-[0.2em] text-[color:var(--tp-fg-muted)]">{$t('albums.loadingAlbum')}</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen flex items-center justify-center bg-[color:var(--tp-canvas)]">
		<div class="text-center [font-family:var(--os-font-body)]">
			<p class="text-sm text-red-400/90 font-light">{error}</p>
		</div>
	</div>
{:else if albumData}
	<div class="min-h-screen w-full bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]">
		<div class="alb-hero">
			{#if albumHeroCover}
				<img
					src={albumHeroCover}
					alt=""
					class="alb-hero-img"
				/>
				<div class="alb-ov" aria-hidden="true"></div>
			{:else}
				<div
					class="absolute inset-0"
					style="background: linear-gradient(to top, color-mix(in srgb, var(--tp-surface-2) 90%, transparent), var(--tp-surface-3)); opacity: .9;"
					aria-hidden="true"
				></div>
			{/if}
			<div class="alb-content">
				<a class="alb-back" href="/albums">← albums</a>
				<h1 class="alb-title">
					{MultiLangUtils.getTextValue(albumData.album.name, $currentLanguage)}
				</h1>
				{#if albumData.album.description}
					<p class="alb-desc">
						{@html MultiLangUtils.getHTMLValue(albumData.album.description, $currentLanguage).replace(/<[^>]*>/g, '')}
					</p>
				{/if}
			</div>
		</div>

		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
			<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-6 border-b border-[color:var(--tp-border)] pb-6">
				{#if albumData.album}
					<div class="flex-1 min-w-0">
						<AlbumBreadcrumbs albumId={albumData.album._id} />
					</div>
				{/if}
				{#if showAlbumShare}
					<div class="md:text-end shrink-0">
						<p class="text-[9px] uppercase tracking-[0.22em] mb-1 text-[color:var(--tp-fg-subtle)]">Share album</p>
						<SocialShareButtons
							title={MultiLangUtils.getTextValue(albumData.album.name, $currentLanguage)}
							size="sm"
						/>
					</div>
				{/if}
			</div>
			{#if albumData.album.description}
				<div
					class="prose prose-lg max-w-4xl mt-8 [&_*]:!text-[color:var(--tp-fg-muted)] [&_a]:!text-[color:var(--tp-fg)]"
				>
					{@html MultiLangUtils.getHTMLValue(albumData.album.description, $currentLanguage)}
				</div>
			{/if}
		</div>

		<!-- Sub-albums -->
		{#if albumData.subAlbums && albumData.subAlbums.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[color:var(--tp-border)]">
				<h2
					class="text-xl font-extralight mb-6 tracking-tight text-[color:var(--tp-fg)]"
					style="font-family: var(--os-font-heading);"
				>
					Sub-albums
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-0.5">
					{#each albumData.subAlbums as subAlbum}
						{@const coverImageUrl = subAlbumCoverImages[subAlbum._id]}
						<a
							href={`/albums/${subAlbum.alias || subAlbum._id}`}
							class="group overflow-hidden border transition-all duration-300 bg-[color:var(--tp-surface-1)] border-[color:var(--tp-border)] hover:border-[color:var(--tp-fg-muted)]"
						>
							<div
								class="aspect-square bg-gradient-to-b relative overflow-hidden from-[color:var(--tp-surface-2)] to-[color:var(--tp-surface-3)]"
							>
								{#if coverImageUrl}
									<img
										src={coverImageUrl}
										alt=""
										class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
									/>
								{:else}
									<div class="absolute inset-0 flex items-center justify-center text-[color:var(--tp-fg-subtle)]">
										<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</div>
								{/if}
							</div>
							<div class="p-5">
								<h3 class="text-sm uppercase tracking-[0.12em] mb-2 text-[color:var(--tp-fg)]">
									{MultiLangUtils.getTextValue(subAlbum.name, $currentLanguage)}
								</h3>
								<p class="text-xs font-light text-[color:var(--tp-fg-muted)]">
									{#if subAlbum.photoCount && subAlbum.photoCount > 0}
										{subAlbum.photoCount} photos
									{/if}
									{#if subAlbum.photoCount && subAlbum.photoCount > 0 && subAlbum.childAlbumCount && subAlbum.childAlbumCount > 0}
										• 
									{/if}
									{#if subAlbum.childAlbumCount && subAlbum.childAlbumCount > 0}
										{subAlbum.childAlbumCount} {subAlbum.childAlbumCount === 1 ? 'album' : 'albums'}
									{/if}
								</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Photos Grid (noir reference classes) -->
		{#if albumData.photos && albumData.photos.length > 0}
			<div class="max-w-7xl mx-auto border-t border-[color:var(--tp-border)]">
				<div class="photos-hdr">
					<span class="photos-count">{String(totalPhotoCount).padStart(2, '0')} photographs</span>
				</div>
				<div class="photo-grid">
					{#each albumData.photos as photo, index}
						<button type="button" on:click={() => openLightbox(index)} class="ph-card group">
							{#if !photoLoaded[photo._id]}
								<div
									class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10"
									aria-live="polite"
									aria-busy="true"
								>
									<div
										class="animate-spin rounded-full h-8 w-8 border-2 mb-2 border-[color:var(--tp-border)] border-t-[color:var(--tp-fg)]"
									></div>
								</div>
							{/if}
							<img
								src={getPhotoUrl(photo)}
								alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
								style="image-orientation: from-image; {getPhotoRotationStyle(photo)}"
								on:load={() => { photoLoaded = { ...photoLoaded, [photo._id]: true }; }}
								on:error={() => { photoLoaded = { ...photoLoaded, [photo._id]: true }; }}
							/>
						</button>
					{/each}
				</div>
				{#if hasMorePhotos}
					<div class="text-center mt-10">
						<button
							on:click={loadMorePhotos}
							disabled={loadingMore}
							class="px-6 py-3 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-[10px] uppercase tracking-[0.18em] bg-[color:var(--tp-fg)] text-[color:var(--tp-canvas)] hover:opacity-90 [font-family:var(--os-font-body)]"
						>
							{loadingMore ? $t('search.loading') : `${$t('search.loadMore')} (${remainingCount} ${$t('albums.remaining')})`}
						</button>
					</div>
				{/if}
			</div>
		{:else}
			{#if !albumData.subAlbums || albumData.subAlbums.length === 0}
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[color:var(--tp-border)]">
					<p class="text-sm text-center font-light text-[color:var(--tp-fg-muted)]">No photos in this album yet.</p>
				</div>
			{/if}
		{/if}
	</div>

	{#if showCollabPanel}
		<AlbumCollaborationPanel
			albumId={albumData.album._id}
			albumCreatorId={String(albumData.album.createdBy ?? '')}
			albumAlias={albumData.album.alias}
			showActivity={showCollabServiceForViewer(collabVis, 'activity', isAuthed, !!canModerateAlbum)}
			showTasks={showCollabServiceForViewer(collabVis, 'tasks', isAuthed, !!canModerateAlbum)}
			showComments={showCollabServiceForViewer(collabVis, 'comments', isAuthed, !!canModerateAlbum)}
		/>
	{/if}

	<!-- Photo Lightbox -->
	{#if lightboxOpen && albumData.photos}
		<PhotoLightbox
			photos={albumData.photos}
			initialIndex={lightboxIndex}
			albumCollaboration={showCollabServiceForViewer(collabVis, 'comments', isAuthed, !!canModerateAlbum)
				? {
						albumId: albumData.album._id,
						albumCreatorId: String(albumData.album.createdBy ?? ''),
						albumAlias: albumData.album.alias,
					}
				: undefined}
			on:close={() => (lightboxOpen = false)}
		/>
	{/if}
{/if}
