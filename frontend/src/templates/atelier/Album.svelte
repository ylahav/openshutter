<script lang="ts">
	import './styles/styles.scss';
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
import MultiLangText from '$lib/components/MultiLangText.svelte';
import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
import AlbumCollaborationPanel from '$lib/components/AlbumCollaborationPanel.svelte';
import { getPhotoUrl, getPhotoRotationStyle } from '$lib/utils/photoUrl';
import { logger } from '$lib/utils/logger';
import { albumSlugFromRouteParams } from '$lib/utils/album-route-params';
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

	let alias = $state(albumSlugFromRouteParams($page.params) ?? '');
	let albumData: AlbumData | null  = $state(null);
	let loading = $state(true);
	let error: string | null  = $state(null);
	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);
	let loadingMore = $state(false);
	let isInitialLoad = $state(true);
	let photoLoaded: Record<string, boolean> = $state({});

const collabVis = $derived(resolveCollaborationVisibility($siteConfigData?.features));
	const isAuthed = $derived($auth.authenticated && !!$auth.user);
const canModerateAlbum = $derived(isAuthed &&
		$auth.user &&
		albumData &&
		($auth.user.role === 'admin' || $auth.user.id === albumData.album.createdBy));
const showCollabPanel = $derived(!!albumData && anyCollaborationSectionVisible(collabVis, isAuthed, !!canModerateAlbum));
	let subAlbumCoverImages: Record<string, string>  = $state({});

	// React to route parameter changes
	afterNavigate(({ to, from }) => {
		if (!browser) return;
		
		const newAlias = albumSlugFromRouteParams(to?.params);
		const oldAlias = albumSlugFromRouteParams(from?.params);
		
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

	async function fetchAlbumData() {
		if (!alias || !browser) return;
		try {
			loading = true;
			error = null;
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
const showAlbumShare = $derived($siteConfigData?.features?.enableSharing !== false && $siteConfigData?.features?.sharingOnAlbum !== false);
	const showPhotoShare = $derived($siteConfigData?.features?.enableSharing !== false && $siteConfigData?.features?.sharingOnPhoto !== false);

const hasMorePhotos = $derived(albumData?.photos && (
		(albumData.pagination && albumData.pagination.page < albumData.pagination.pages) ||
		((albumData.pagination?.total ?? albumData.album?.photoCount ?? albumData.photos.length) > albumData.photos.length)
	));
const totalPhotoCount = $derived(albumData?.pagination?.total ?? albumData?.album?.photoCount ?? albumData?.photos?.length ?? 0);
	const remainingCount = $derived(albumData?.photos ? Math.max(0, totalPhotoCount - albumData.photos.length) : 0);
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-(--tp-canvas)">
		<div class="text-center [font-family:var(--os-font-body)]">
			<div
				class="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4 border-(--tp-border) border-t-(--tp-fg)"
			></div>
			<p class="text-[10px] uppercase tracking-[0.2em] text-(--tp-fg-muted)">{$t('albums.loadingAlbum')}</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen flex items-center justify-center bg-(--tp-canvas)">
		<div class="text-center [font-family:var(--os-font-body)]">
			<p class="text-sm text-red-400/90 font-light">{error}</p>
		</div>
	</div>
{:else if albumData}
	<div class="min-h-screen w-full pt-24 pb-12 bg-(--tp-canvas) text-(--tp-fg) [font-family:var(--os-font-body)]">
		<div class="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 text-center">
			<a
				href="/albums"
				class="inline-block text-[10px] uppercase tracking-[0.18em] no-underline mb-5 transition-colors text-(--tp-fg-muted) hover:text-(--tp-fg)"
			>
				← {$t('navigation.albums')}
			</a>

			{#if albumData.album}
				<div class="pb-6 mb-6 text-start border-b border-(--tp-border)">
					<AlbumBreadcrumbs albumId={albumData.album._id} />
				</div>
			{/if}

			<h1
				class="text-[28px] md:text-3xl font-normal tracking-[0.08em] text-(--tp-fg)"
				style="font-family: var(--os-font-heading);"
			>
				{MultiLangUtils.getTextValue(albumData.album.name, $currentLanguage)}
			</h1>
			<div class="w-9 h-px mx-auto my-2.5" style="background: var(--os-primary);"></div>
			{#if albumData.album.description}
				<div
					class="prose prose-lg max-w-xl mx-auto mb-6 text-center italic text-sm leading-relaxed [&_*]:!text-(--tp-fg-muted) [&_a]:!text-(--tp-fg)"
					style="font-family: var(--os-font-heading);"
				>
					{@html MultiLangUtils.getHTMLValue(albumData.album.description, $currentLanguage)}
				</div>
			{/if}
			{#if showAlbumShare}
				<div class="flex flex-col items-center gap-2">
					<p class="text-[9px] uppercase tracking-[0.22em] text-(--tp-fg-subtle)">Share album</p>
					<SocialShareButtons
						title={MultiLangUtils.getTextValue(albumData.album.name, $currentLanguage)}
						size="sm"
					/>
				</div>
			{/if}
		</div>

		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

		<!-- Sub-albums -->
		{#if albumData.subAlbums && albumData.subAlbums.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-(--tp-border)">
				<h2
					class="text-xl font-extralight mb-6 tracking-tight text-(--tp-fg)"
					style="font-family: var(--os-font-heading);"
				>
					Sub-albums
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-0.5">
					{#each albumData.subAlbums as subAlbum}
						{@const coverImageUrl = subAlbumCoverImages[subAlbum._id]}
						<a
							href={`/albums/${subAlbum.alias || subAlbum._id}`}
							class="group overflow-hidden border transition-all duration-300 bg-(--tp-surface-1) border-(--tp-border) hover:border-(--tp-fg-muted)"
						>
							<div
								class="aspect-square bg-gradient-to-b relative overflow-hidden from-(--tp-surface-2) to-(--tp-surface-3)"
							>
								{#if coverImageUrl}
									<img
										src={coverImageUrl}
										alt=""
										class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
									/>
								{:else}
									<div class="absolute inset-0 flex items-center justify-center text-(--tp-fg-subtle)">
										<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</div>
								{/if}
							</div>
							<div class="p-5">
								<h3 class="text-sm uppercase tracking-[0.12em] mb-2 text-(--tp-fg)">
									{MultiLangUtils.getTextValue(subAlbum.name, $currentLanguage)}
								</h3>
								<p class="text-xs font-light text-(--tp-fg-muted)">
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

		<!-- Photos Grid -->
		{#if albumData.photos && albumData.photos.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-(--tp-border)">
				<h2
					class="text-xl font-extralight mb-6 tracking-tight text-(--tp-fg)"
					style="font-family: var(--os-font-heading);"
				>
					Photos
				</h2>
				<div class="columns-1 sm:columns-2 lg:columns-3 gap-6">
					{#each albumData.photos as photo, index}
						{@const photoWidth = photo.dimensions?.width || photo.metadata?.width}
						{@const photoHeight = photo.dimensions?.height || photo.metadata?.height}
						{@const hasDimensions = photoWidth && photoHeight && photoWidth > 0 && photoHeight > 0}
						{@const aspectRatio = hasDimensions ? photoWidth / photoHeight : 1}
						<div
							class="rounded-lg transition-all duration-300 p-5 border mb-6 break-inside-avoid bg-(--tp-surface-1) border-(--tp-border) hover:border-(--tp-fg-muted)"
						>
							<button
								onclick={() => openLightbox(index)}
								class="w-full mb-4"
							>
								<div
									class="bg-gradient-to-b relative overflow-hidden rounded-lg from-(--tp-surface-2) to-(--tp-surface-3)"
									style={hasDimensions && aspectRatio < 1
										? `width: 100%; max-height: 600px; aspect-ratio: ${aspectRatio};` 
										: hasDimensions
										? `width: 100%; padding-bottom: ${(1 / aspectRatio) * 100}%;`
										: 'width: 100%; padding-bottom: 100%;'}
								>
									{#if !photoLoaded[photo._id]}
										<div
											class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 rounded-lg"
											aria-live="polite"
											aria-busy="true"
										>
											<div
												class="animate-spin rounded-full h-10 w-10 border-2 mb-2 border-(--tp-border) border-t-(--tp-fg)"
											></div>
											<span class="text-xs text-(--tp-fg-muted)">Loading photo…</span>
										</div>
									{/if}
									<img
										src={getPhotoUrl(photo)}
										alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
										class={hasDimensions && aspectRatio < 1 
											? "w-full h-full object-cover hover:scale-110 transition-all duration-300 " + (photoLoaded[photo._id] ? 'opacity-100' : 'opacity-30')
											: "absolute inset-0 w-full h-full object-cover hover:scale-110 transition-all duration-300 " + (photoLoaded[photo._id] ? 'opacity-100' : 'opacity-30')}
										style="image-orientation: from-image; {getPhotoRotationStyle(photo)}"
										onload={() => { photoLoaded = { ...photoLoaded, [photo._id]: true }; }}
										onerror={() => { photoLoaded = { ...photoLoaded, [photo._id]: true }; }}
									/>
								</div>
							</button>
							
							<!-- Photo metadata below the image -->
							<div class="px-1">
								{#if photo.title}
									<h3 class="text-sm mb-1 uppercase tracking-[0.08em] text-(--tp-fg)">
										<MultiLangText value={photo.title} fallback={`Photo ${index + 1}`} />
									</h3>
								{/if}
								{#if photo.description}
									<p class="text-xs mb-2 line-clamp-2 font-light text-(--tp-fg-muted)">
										{@html (typeof photo.description === 'string' ? photo.description : MultiLangUtils.getHTMLValue(photo.description, $currentLanguage) || '').replace(/<[^>]*>/g, '')}
									</p>
								{/if}
								
								{#if photo.location || (photo.tags && photo.tags.length > 0) || (photo.people && photo.people.length > 0)}
									<div class="flex flex-wrap gap-2 text-xs font-light text-(--tp-fg-muted)">
										{#if photo.location}
											<span class="flex items-center gap-1">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
												</svg>
												{#if typeof photo.location === 'string'}
													{photo.location}
												{:else}
													<MultiLangText value={(photo.location as { _id: string; name: any }).name} />
												{/if}
											</span>
										{/if}
										
										{#if photo.tags && photo.tags.length > 0}
											<span class="flex items-center gap-1 flex-wrap">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
												</svg>
												{#each photo.tags.slice(0, 3) as tag}
													<span>
														{#if typeof tag === 'string'}
															{tag}
														{:else}
															<MultiLangText value={tag.name} />
														{/if}
													</span>
													{#if tag !== photo.tags[photo.tags.length - 1] && photo.tags.indexOf(tag) < 2}
														<span>,</span>
													{/if}
												{/each}
												{#if photo.tags.length > 3}
													<span>+{photo.tags.length - 3}</span>
												{/if}
											</span>
										{/if}
										
										{#if photo.people && photo.people.length > 0}
											<span class="flex items-center gap-1 flex-wrap">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
												</svg>
												{#each photo.people.slice(0, 2) as person}
													<span>
														{#if typeof person === 'string'}
															{person}
														{:else}
															<MultiLangText value={(person as { _id: string; fullName?: any; firstName?: any }).fullName || (person as { _id: string; fullName?: any; firstName?: any }).firstName} />
														{/if}
													</span>
													{#if person !== photo.people[photo.people.length - 1] && photo.people.indexOf(person) < 1}
														<span>,</span>
													{/if}
												{/each}
												{#if photo.people.length > 2}
													<span>+{photo.people.length - 2}</span>
												{/if}
											</span>
										{/if}
									</div>
								{/if}
								{#if showPhotoShare && typeof window !== 'undefined'}
									<div class="mt-3 pt-3 border-t border-(--tp-border)">
										<p class="text-[9px] uppercase tracking-wider mb-1 text-(--tp-fg-muted)">Share this photo</p>
										<SocialShareButtons
											url={typeof window !== 'undefined' ? `${window.location.origin}${$page.url.pathname}#p=${index}` : undefined}
											title={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
											size="sm"
										/>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
				{#if hasMorePhotos}
					<div class="text-center mt-10">
						<button
							onclick={loadMorePhotos}
							disabled={loadingMore}
							class="px-6 py-3 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-[10px] uppercase tracking-[0.18em] bg-(--tp-fg) text-(--tp-canvas) hover:opacity-90 [font-family:var(--os-font-body)]"
						>
							{loadingMore ? $t('search.loading') : `${$t('search.loadMore')} (${remainingCount} ${$t('albums.remaining')})`}
						</button>
					</div>
				{/if}
			</div>
		{:else}
			{#if !albumData.subAlbums || albumData.subAlbums.length === 0}
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-(--tp-border)">
					<p class="text-sm text-center font-light text-(--tp-fg-muted)">No photos in this album yet.</p>
				</div>
			{/if}
		{/if}
	</div>
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
			onclose={() => (lightboxOpen = false)}
		/>
	{/if}
{/if}
