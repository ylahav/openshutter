<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError } from '$lib/utils/errorHandler';

	interface Photo {
		_id: string;
		filename: string;
		title?: string | { [key: string]: string };
		uploadedAt?: string;
		size?: number;
		storage?: {
			url?: string;
			thumbnailPath?: string;
		};
	}

	let photos: Photo[] = [];
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		await loadPhotos();
	});

	async function loadPhotos() {
		try {
			loading = true;
			// TODO: Implement API endpoint for fetching photos
			// For now, this is a placeholder
			photos = [];
		} catch (err) {
			logger.error('Failed to load photos:', err);
			error = handleError(err, 'Failed to load photos');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Photos - OpenShutter</title>
</svelte:head>

<Header />

<main class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h2 class="text-3xl font-bold text-gray-900 mb-2">Your Photos</h2>
				<p class="text-lg text-gray-600">Browse and organize your photo collection</p>
			</div>
			<button
				on:click={() => goto('/photos/upload')}
				class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
			>
				Upload Photos
			</button>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				<p class="ml-4 text-gray-600">Loading photos...</p>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-md p-4">
				<p class="text-red-800">{error}</p>
			</div>
		{:else if photos.length === 0}
			<div class="bg-white rounded-lg shadow p-6">
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
					<p class="mt-1 text-sm text-gray-500">
						Start building your photo collection by uploading some images.
					</p>
					<div class="mt-6">
						<button
							on:click={() => goto('/photos/upload')}
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							Upload Your First Photo
						</button>
					</div>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{#each photos as photo}
					<div class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
						<div class="aspect-w-1 aspect-h-1 bg-gray-200 rounded-t-lg">
							{#if photo.storage?.thumbnailPath}
								<img
									src={photo.storage.thumbnailPath}
									alt={typeof photo.title === 'string' ? photo.title : photo.filename}
									class="w-full h-48 object-cover rounded-t-lg"
								/>
							{:else}
								<div class="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
									<svg
										class="w-12 h-12 text-gray-400"
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
								</div>
							{/if}
						</div>
						<div class="p-4">
							<h3 class="text-sm font-medium text-gray-900 mb-1 truncate">
								{typeof photo.title === 'string'
									? photo.title
									: photo.title?.en || photo.filename || 'Untitled'}
							</h3>
							<p class="text-xs text-gray-500 mb-2">
								{photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleDateString() : 'Unknown date'}
							</p>
							<div class="flex justify-between items-center">
								<span class="text-xs text-gray-500">
									{photo.size ? `${(photo.size / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
								</span>
								<button
									on:click={() => goto(`/photos/${photo._id}`)}
									class="text-blue-600 hover:text-blue-700 text-xs font-medium"
								>
									View →
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</main>

<Footer />
