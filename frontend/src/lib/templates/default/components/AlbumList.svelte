<script lang="ts">
	import AlbumCard from './AlbumCard.svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

	interface TemplateAlbum {
		_id: string;
		name?: any;
		description?: any;
		alias?: string;
		isFeatured?: boolean;
		photoCount?: number;
	}

	export let albums: TemplateAlbum[] = [];
	export let loading = false;
	export let error: string | null = null;
	export let title = 'Albums';
	export let subtitle = 'Explore our photo collections';
	export let showFeatured = false;

	$: filteredAlbums = showFeatured ? albums.filter((album) => !!album.isFeatured) : albums;
</script>

{#if loading}
	<div class="py-12">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
				<p class="mt-4 text-gray-600">Loading...</p>
			</div>
		</div>
	</div>
{:else if error}
	<div class="py-12">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center">
				<div class="p-4 bg-red-50 border border-red-200 rounded-md">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">Error</h3>
							<div class="mt-2 text-sm text-red-700">{error}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<section class="py-12 bg-gray-50">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<!-- Header -->
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
				<p class="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
			</div>

			<!-- Albums Grid -->
			{#if filteredAlbums.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{#each filteredAlbums as album}
						<AlbumCard {album} className="h-full" />
					{/each}
				</div>
			{:else}
				<div class="text-center py-12">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">
						{showFeatured ? 'No featured albums' : 'No albums available'}
					</h3>
					<p class="mt-1 text-sm text-gray-500">
						{showFeatured
							? 'No albums have been marked as featured yet.'
							: 'Check back later for new albums.'}
					</p>
				</div>
			{/if}
		</div>
	</section>
{/if}
