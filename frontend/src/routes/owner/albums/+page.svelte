<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import AlbumTree from '$lib/components/AlbumTree.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { canCreateAlbums } from '$lib/access-control';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		alias: string;
		parentAlbumId?: string | null;
		level: number;
		order: number;
		childAlbumCount?: number;
		photoCount?: number;
		isPublic?: boolean;
		isFeatured?: boolean;
	}

	let albums: Album[] = [];
	let loading = true;
	let error: string | null = null;

	const isAdmin = data.user?.role === 'admin';
	const isOwner = data.user?.role === 'owner';

	onMount(async () => {
		await fetchAlbums();
	});

	async function fetchAlbums() {
		try {
			loading = true;
			const response = await fetch('/api/albums?mine=true', { credentials: 'include' });
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			// API may return array directly or { data: array }
			albums = Array.isArray(result) ? result : (result.data || []);
		} catch (err) {
			logger.error('Failed to fetch albums:', err);
			error = handleError(err, 'Failed to fetch albums');
		} finally {
			loading = false;
		}
	}

	async function handleReorder(
		updates: Array<{ id: string; parentAlbumId: string | null; order: number }>
	) {
		try {
			const response = await fetch('/api/admin/albums/reorder', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ updates })
			});
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			await fetchAlbums();
		} catch (err) {
			logger.error('Failed to reorder albums:', err);
		}
	}

	function handleOpen(node: any) {
		goto(`/owner/albums/${node._id}`);
	}
</script>

<svelte:head>
	<title>{isAdmin ? 'Albums Management' : 'My Albums'} - Owner</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="text-red-600 text-xl mb-4">⚠️</div>
			<p class="text-gray-600">{error}</p>
			<button
				on:click={fetchAlbums}
				class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
			>
				Try Again
			</button>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-6xl mx-auto px-4">
			<!-- Header -->
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">
						{isAdmin ? 'Albums Management' : 'My Albums'}
					</h1>
					<p class="text-gray-600 mt-2">
						{isAdmin ? 'Create and edit albums' : 'Create and edit your albums'}
					</p>
				</div>
				<div class="flex space-x-3">
					<button
						on:click={() => goto(isAdmin ? '/admin' : '/owner')}
						class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Back
					</button>
					{#if canCreateAlbums(data.user)}
						<button
							on:click={() => goto('/albums/new')}
							class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 6v6m0 0v6m0-6h6m-6 0H6"
								/>
							</svg>
							Create New Album
						</button>
					{/if}
				</div>
			</div>

			<!-- Albums Grid -->
			{#if albums.length === 0}
				<div class="text-center py-12">
					<div class="text-gray-400 text-6xl mb-4">📁</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-2">No albums yet</h3>
					<p class="text-gray-600 mb-6">Get started by creating your first album</p>
					{#if canCreateAlbums(data.user)}
						<button
							on:click={() => goto('/albums/new')}
							class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 6v6m0 0v6m0-6h6m-6 0H6"
								/>
							</svg>
							Create Album
						</button>
					{/if}
				</div>
			{:else}
				<AlbumTree
					albums={albums.map((a) => ({
						_id: a._id,
						name:
							typeof a.name === 'string'
								? a.name
								: MultiLangUtils.getTextValue(a.name, $currentLanguage) || '(No name)',
						alias: a.alias,
						parentAlbumId: a.parentAlbumId ?? null,
						level: a.level,
						order: a.order,
						childAlbumCount: a.childAlbumCount,
						photoCount: a.photoCount,
						isPublic: a.isPublic,
						isFeatured: a.isFeatured
					}))}
					onReorder={handleReorder}
					onOpen={handleOpen}
					showAccordion={true}
				/>
			{/if}
		</div>
	</div>
{/if}
