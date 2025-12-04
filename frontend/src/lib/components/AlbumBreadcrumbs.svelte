<script lang="ts">
  import { onMount } from 'svelte';
  import { currentLanguage } from '$stores/language';
  import { MultiLangUtils } from '$utils/multiLang';

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

  export let album: TemplateAlbum;
  export let role: 'admin' | 'owner' | 'public' = 'public';
  export let currentPage: 'view' | 'edit' | undefined = undefined;

  let breadcrumbs: BreadcrumbItem[] = [];
  let loading = true;

  function getBasePathAndRootName() {
    if (role === 'admin') {
      return { basePath: '/admin/albums', rootName: 'Albums Management' };
    }
    if (role === 'owner') {
      return { basePath: '/owner/albums', rootName: 'My Albums' };
    }
    return { basePath: '/albums', rootName: 'Albums' };
  }

  async function buildBreadcrumbs() {
    try {
      loading = true;
      const items: BreadcrumbItem[] = [];

      const { basePath, rootName } = getBasePathAndRootName();

      // Root
      items.push({
        _id: 'root',
        name: rootName,
        href: basePath,
      });

      // Parent chain
      const parentChain: TemplateAlbum[] = [];
      let currentParentId = (album as any).parentAlbumId;

      while (currentParentId) {
        try {
          const res = await fetch(`/api/albums/${currentParentId}`);
          if (!res.ok) break;
          const parent = await res.json();
          if (!parent) break;
          parentChain.push(parent);
          currentParentId = (parent as any).parentAlbumId;
        } catch (err) {
          console.error('Failed to fetch parent album:', err);
          break;
        }
      }

      parentChain
        .reverse()
        .forEach((parent) => {
          const parentHref =
            role === 'public' ? `${basePath}/${parent.alias}` : `${basePath}/${parent._id}`;
          items.push({
            _id: parent._id,
            name: parent.name,
            href: parentHref,
          });
        });

      // Current album
      const currentHref =
        role === 'public'
          ? `${basePath}/${album.alias}`
          : `${basePath}/${album._id}${currentPage === 'edit' ? '/edit' : ''}`;

      items.push({
        _id: album._id,
        name: album.name,
        href: currentHref,
      });

      breadcrumbs = items;
    } catch (err) {
      console.error('Failed to build breadcrumbs:', err);
      const { basePath, rootName } = getBasePathAndRootName();
      const currentHref =
        role === 'public'
          ? `${basePath}/${album.alias}`
          : `${basePath}/${album._id}${currentPage === 'edit' ? '/edit' : ''}`;

      breadcrumbs = [
        {
          _id: 'root',
          name: rootName,
          href: basePath,
        },
        {
          _id: album._id,
          name: album.name,
          href: currentHref,
        },
      ];
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
            class="w-4 h-4 text-gray-400 flex-shrink-0"
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

