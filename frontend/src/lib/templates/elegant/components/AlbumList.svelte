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
	<div class="py-20">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center">
				<div class="w-10 h-10 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
				<p class="mt-4 text-sm text-gray-600 font-light">Loading...</p>
			</div>
		</div>
	</div>
{:else if error}
	<div class="py-20">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center">
				<div class="p-6 bg-red-50 border border-red-200 rounded-xl">
					<div class="text-sm text-red-700 font-light">{error}</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<section class="py-20 bg-gradient-to-b from-white to-purple-50/30">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<!-- Header -->
			<div class="text-center mb-16">
				<h2 class="text-4xl md:text-5xl font-serif text-gray-900 mb-4 tracking-wide" style="font-family: 'Playfair Display', serif;">
					{title}
				</h2>
				<p class="text-lg text-gray-600 max-w-2xl mx-auto font-light">{subtitle}</p>
			</div>

			<!-- Albums Grid -->
			{#if filteredAlbums.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
					{#each filteredAlbums as album}
						<AlbumCard {album} className="h-full" />
					{/each}
				</div>
			{:else}
				<div class="text-center py-20">
					<svg class="mx-auto h-16 w-16 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
					<h3 class="mt-4 text-lg font-serif text-gray-900" style="font-family: 'Playfair Display', serif;">
						{showFeatured ? 'No featured albums' : 'No albums available'}
					</h3>
					<p class="mt-2 text-sm text-gray-500 font-light">
						{showFeatured
							? 'No albums have been marked as featured yet.'
							: 'Check back later for new albums.'}
					</p>
				</div>
			{/if}
		</div>
	</section>
{/if}
