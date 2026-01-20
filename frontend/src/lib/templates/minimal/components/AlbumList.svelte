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
	<div class="py-16">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center">
				<div class="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
				<p class="mt-4 text-sm text-gray-600">Loading...</p>
			</div>
		</div>
	</div>
{:else if error}
	<div class="py-16">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center">
				<p class="text-sm text-black">{error}</p>
			</div>
		</div>
	</div>
{:else}
	<section class="py-16 bg-white">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<!-- Header -->
			<div class="text-center mb-12">
				<h2 class="text-3xl font-light text-black mb-2 tracking-tight">{title}</h2>
				<p class="text-sm text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
			</div>

			<!-- Albums Grid -->
			{#if filteredAlbums.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{#each filteredAlbums as album}
						<AlbumCard {album} className="h-full" />
					{/each}
				</div>
			{:else}
				<div class="text-center py-16">
					<p class="text-sm text-gray-600">
						{showFeatured ? 'No featured albums' : 'No albums available'}
					</p>
				</div>
			{/if}
		</div>
	</section>
{/if}
