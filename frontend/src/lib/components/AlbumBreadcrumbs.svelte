<script lang="ts">
  import { onMount } from 'svelte';
  import { currentLanguage } from '$stores/language';
  import { MultiLangUtils } from '$utils/multiLang';
  import { logger } from '$lib/utils/logger';

  interface TemplateAlbum {
    _id: string;
    alias?: string;
    name: any;
    parentAlbumId?: string;
  }

  interface BreadcrumbItem {
    _id: string;
    name: string | Record<string, string>;
    href: string;
  }

  export let album: TemplateAlbum | undefined = undefined;
  export let albumId: string | undefined = undefined;
  export let role: 'admin' | 'owner' | 'public' = 'public';
  export let currentPage: 'view' | 'edit' | undefined = undefined;

  let breadcrumbs: BreadcrumbItem[] = [];
  let loading = true;
  let currentAlbum: TemplateAlbum | null = null;

  function getBasePathAndRootName() {
    if (role === 'admin') {
      return { basePath: '/admin/albums', rootName: 'Albums Management' };
    }
    if (role === 'owner') {
      return { basePath: '/owner/albums', rootName: 'My Albums' };
    }
    return { basePath: '/albums', rootName: 'Albums' };
  }

  async function loadAlbum() {
    if (album) {
      currentAlbum = album;
      return;
    }
    
    if (albumId) {
      try {
        const res = await fetch(`/api/albums/${albumId}`);
        if (res.ok) {
          const data = await res.json();
          currentAlbum = data;
        }
      } catch (err) {
        logger.error('Failed to fetch album:', err);
      }
    }
  }

  async function buildBreadcrumbs() {
    try {
      loading = true;
      await loadAlbum();
      
      if (!currentAlbum) {
        breadcrumbs = [];
        return;
      }

      const items: BreadcrumbItem[] = [];

      const { basePath, rootName } = getBasePathAndRootName();

      // Root
      items.push({
        _id: 'root',
        name: rootName,
        href: basePath,
      });

      // Parent chain - build full path
      const parentChain: TemplateAlbum[] = [];
      let currentParentId = currentAlbum.parentAlbumId;

      while (currentParentId) {
        try {
          const res = await fetch(`/api/albums/${currentParentId}`);
          if (!res.ok) break;
          const parent = await res.json();
          if (!parent) break;
          parentChain.push(parent);
          currentParentId = parent.parentAlbumId;
        } catch (err) {
          logger.error('Failed to fetch parent album:', err);
          break;
        }
      }

      // Add all parents in order (root -> ... -> parent -> current)
      parentChain
        .reverse()
        .forEach((parent) => {
          const parentHref =
            role === 'public' ? `${basePath}/${parent.alias || parent._id}` : `${basePath}/${parent._id}`;
          items.push({
            _id: parent._id,
            name: parent.name,
            href: parentHref,
          });
        });

      // Current album
      const currentHref =
        role === 'public'
          ? `${basePath}/${currentAlbum.alias || currentAlbum._id}`
          : `${basePath}/${currentAlbum._id}${currentPage === 'edit' ? '/edit' : ''}`;

      items.push({
        _id: currentAlbum._id,
        name: currentAlbum.name,
        href: currentHref,
      });

      breadcrumbs = items;
    } catch (err) {
      logger.error('Failed to build breadcrumbs:', err);
      const { basePath, rootName } = getBasePathAndRootName();
      
      if (currentAlbum) {
        const currentHref =
          role === 'public'
            ? `${basePath}/${currentAlbum.alias || currentAlbum._id}`
            : `${basePath}/${currentAlbum._id}${currentPage === 'edit' ? '/edit' : ''}`;

        breadcrumbs = [
          {
            _id: 'root',
            name: rootName,
            href: basePath,
          },
          {
            _id: currentAlbum._id,
            name: currentAlbum.name,
            href: currentHref,
          },
        ];
      } else {
        breadcrumbs = [];
      }
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    buildBreadcrumbs();
  });
</script>

{#if loading}
  <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-4">
    <span>Loading...</span>
  </nav>
{:else}
  <nav class="flex items-center space-x-2 text-sm mb-2" aria-label="Breadcrumb">
    {#each breadcrumbs as item, index}
      {@const isLast = index === breadcrumbs.length - 1}
      {@const displayName =
        typeof item.name === 'string'
          ? item.name
          : MultiLangUtils.getTextValue(item.name, $currentLanguage)}

      <div class="flex items-center space-x-2">
        {#if index > 0}
          <svg
            class="w-4 h-4 text-gray-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        {/if}

        {#if isLast}
          <span class="text-gray-900 font-semibold">{displayName}</span>
        {:else}
          <a
            href={item.href}
            class="text-gray-600 hover:text-gray-900 transition-colors hover:underline"
          >
            {displayName}
          </a>
        {/if}
      </div>
    {/each}
  </nav>
{/if}
