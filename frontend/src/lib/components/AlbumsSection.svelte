<script lang="ts">
  import { onMount } from 'svelte';
  import { currentLanguage } from '$stores/language';
  import { MultiLangUtils } from '$utils/multiLang';
  import { logger } from '$lib/utils/logger';
  import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

  interface TemplateAlbum {
    _id: string;
    name?: any;
    description?: any;
    alias?: string;
    level?: number;
    isFeatured?: boolean;
    photoCount?: number;
    childAlbumCount?: number;
  }

  let albums: TemplateAlbum[] = [];
  let isLoading = true;
  let coverImages: Record<string, string> = {};
  let coverImagesLoading = false;

  // In SvelteKit we don't have auth wired yet; assume public view
  const isLoggedIn = false;

  async function fetchAlbums() {
    try {
      isLoading = true;
      // Fetch only root albums (level 0)
      const res = await fetch('/api/albums?level=0');
      if (!res.ok) {
        await handleApiErrorResponse(res);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        const rootAlbums = data.filter((album: TemplateAlbum) => album.level === 0);
        albums = rootAlbums;
      } else {
        logger.error('API returned unexpected format:', data);
        albums = [];
      }
    } catch (err) {
      logger.error('Failed to fetch albums:', err);
      albums = [];
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchAlbums();
  });
</script>

{#if isLoading}
  <section class="py-16 bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading albums...</p>
      </div>
    </div>
  </section>
{:else}
  <section class="py-16 bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {#if albums.length === 0}
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No albums available</h3>
          <p class="mt-1 text-sm text-gray-500">
            {isLoggedIn
              ? 'Create your first album to get started'
              : 'Check back later for new public albums'}
          </p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {#each albums as album}
            <div class="card hover:shadow-xl transition-all duration-300 group">
              <div class="aspect-[16/9] bg-gray-200 rounded-t-lg overflow-hidden">
                {#if coverImages[album._id]}
                  <img
                    src={coverImages[album._id]}
                    alt={MultiLangUtils.getTextValue(album.name, $currentLanguage)}
                    class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                {:else if coverImagesLoading}
                  <div class="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                {:else}
                  <div
                    class="w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
                  >
                    <svg class="w-16 h-16 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </div>
                {/if}
              </div>

              <div class="card-body">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {MultiLangUtils.getTextValue(album.name, $currentLanguage)}
                  </h3>
                  {#if album.isFeatured}
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                    >
                      Featured
                    </span>
                  {/if}
                </div>

                {#if album.description}
                  <p class="text-gray-600 mb-4 line-clamp-2">
                    {@html MultiLangUtils.getHTMLValue(album.description, $currentLanguage) ||
                      'No description available'}
                  </p>
                {:else}
                  <p class="text-gray-600 mb-4 line-clamp-2">No description available</p>
                {/if}

                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500">
                    {#if album.photoCount && album.photoCount > 0}
                      {album.photoCount} photos
                    {/if}
                    {#if album.photoCount && album.photoCount > 0 && album.childAlbumCount && album.childAlbumCount > 0}
                      • 
                    {/if}
                    {#if album.childAlbumCount && album.childAlbumCount > 0}
                      {album.childAlbumCount} {album.childAlbumCount === 1 ? 'album' : 'albums'}
                    {/if}
                  </span>
                  <a
                    href={`/albums/${album.alias ?? album._id}`}
                    class="text-primary-600 hover:text-primary-700 font-medium text-sm group-hover:underline"
                  >
                    View Album →
                  </a>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}
