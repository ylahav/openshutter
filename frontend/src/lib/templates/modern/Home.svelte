<script lang="ts">
	import type { PageData } from '../../../routes/$types';
	import HomeHero from '$components/HomeHero.svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

	export let data: PageData;
</script>

<!-- Modern template home layout -->
<HomeHero />

<section class="bg-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h2 class="text-2xl font-semibold text-gray-900">Featured Albums</h2>
				<p class="mt-1 text-sm text-gray-500">Root-level public albums from your gallery.</p>
			</div>
			<a href="/albums" class="text-sm font-medium text-primary-600 hover:text-primary-700">
				View all
			</a>
		</div>

		{#if data.albumsError}
			<div class="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">
				Failed to load albums: {data.albumsError}
			</div>
		{:else if !data.rootAlbums || data.rootAlbums.length === 0}
			<div class="bg-gray-50 text-gray-600 px-4 py-3 rounded-md text-sm">
				No albums available yet.
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each data.rootAlbums as album}
					<a
						href={`/albums/${album.alias ?? album._id}`}
						class="group rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col"
					>
						<div class="aspect-[4/3] bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
							Album cover
						</div>
						<div class="p-4 flex-1 flex flex-col">
							<h3 class="text-base font-semibold text-gray-900 group-hover:text-primary-600 truncate">
								{#if album.name}
									{MultiLangUtils.getTextValue(album.name, $currentLanguage)}
								{:else}
									Untitled album
								{/if}
							</h3>
							{#if album.description}
								<p class="mt-1 text-xs text-gray-500 line-clamp-2">
									{MultiLangUtils.getTextValue(album.description, $currentLanguage)}
								</p>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>

