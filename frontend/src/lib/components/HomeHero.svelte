<script lang="ts">
  import { onMount } from 'svelte';
  import { MultiLangUtils } from '$utils/multiLang';
  import { siteConfigData } from '$stores/siteConfig';
  import { currentLanguage } from '$stores/language';
  import { t } from '$stores/i18n';

  interface TemplatePhoto {
    _id: string;
    title?: any;
    storage?: {
      url?: string;
      thumbnailPath?: string;
    };
    url?: string;
  }

  let photos: TemplatePhoto[] = [];
  let loading = true;
  let currentPhotoIndex = 0;

  $: config = $siteConfigData;
  $: lang = $currentLanguage;

  const ROTATION_INTERVAL = 8000;

  onMount(async () => {
    try {
      const res = await fetch('/api/photos/gallery-leading?limit=5');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];
        if (Array.isArray(list)) {
          photos = list;
        }
      }
    } catch (err) {
      console.error('Failed to fetch gallery-leading photos:', err);
    } finally {
      loading = false;
    }
  });

  $: if (photos.length > 1) {
    const interval = setInterval(() => {
      currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
    }, ROTATION_INTERVAL);
  }

  $: currentPhoto = photos[currentPhotoIndex];
  $: backgroundImageUrl =
    currentPhoto?.storage?.url || currentPhoto?.storage?.thumbnailPath || currentPhoto?.url || null;

  $: title = config?.title
    ? MultiLangUtils.getTextValue(config.title, lang)
    : 'OpenShutter Gallery';
  $: description = config?.description
    ? MultiLangUtils.getHTMLValue(config.description, lang)
    : 'A modern photo gallery platform for showcasing your memories with style.';
</script>

{#if loading && photos.length === 0}
  <!-- Simple loading state, let the rest of the page render -->
  <section class="relative overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-600 text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
        {title}
      </h1>
      <p class="mt-3 text-lg sm:text-xl text-blue-100 max-w-xl">
        {@html description}
      </p>
    </div>
  </section>
{:else}
  <section class="relative min-h-[60vh] flex items-center overflow-hidden bg-gray-900 text-white">
    {#if backgroundImageUrl}
      <div class="absolute inset-0">
        <!-- Use a normal img to avoid Next.js-specific Image component -->
        <img
          src={backgroundImageUrl}
          alt="Hero background"
          class="w-full h-full object-cover transition-all duration-1000 ease-in-out"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/40"></div>
      </div>
    {/if}

    <div class="relative z-10 max-w-4xl mx-auto px-6 py-16">
      <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-lg">
        {title}
      </h1>

      <p class="mt-3 text-lg sm:text-xl text-blue-100 max-w-xl drop-shadow">
        {@html description}
      </p>

      <div class="mt-8 flex flex-wrap gap-4">
        <a
          href="/albums"
          class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm bg-white text-primary-600 hover:bg-blue-50"
        >
          {$t('hero.browseAlbums')}
        </a>
        <a
          href="/search"
          class="inline-flex items-center justify-center px-6 py-3 border border-white/40 text-base font-medium rounded-md text-white hover:bg-white/10"
        >
          {$t('hero.searchPhotos')}
        </a>
      </div>
    </div>
  </section>
{/if}
