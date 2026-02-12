<!-- frontend/src/lib/page-builder/modules/Hero/Layout.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { currentLanguage } from '$stores/language';
    import { MultiLangUtils } from '$lib/utils/multiLang';

    export let config: any = {};
    export let data: any = null;
    export let templateConfig: Record<string, any> = {};

    $: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage);
    $: subtitleText = MultiLangUtils.getTextValue(config?.subtitle, $currentLanguage);
    $: ctaLabelText = MultiLangUtils.getTextValue(config?.ctaLabel, $currentLanguage);

    $: backgroundStyle = config?.backgroundStyle ?? 'light';
    $: backgroundImageUrl = config?.backgroundImage;

    let galleryLeadingUrl: string | null = null;
    let imageAspectRatio: number | null = null;
    let imageLoaded = false;

    onMount(() => {
        if (config?.backgroundStyle === 'galleryLeading') {
            fetch('/api/photos/gallery-leading?limit=1')
                .then((res) => res.ok ? res.json() : null)
                .then((data) => {
                    const list = Array.isArray(data) ? data : data?.data || [];
                    const photo = list[0];
                    const url = photo?.storage?.url || photo?.storage?.thumbnailPath || photo?.url || null;
                    if (url) galleryLeadingUrl = url;
                })
                .catch(() => { galleryLeadingUrl = null; });
        }
    });

    $: if (backgroundStyle !== 'galleryLeading') galleryLeadingUrl = null;

    $: effectiveBackgroundImage = backgroundStyle === 'galleryLeading'
        ? galleryLeadingUrl
        : backgroundStyle === 'image'
        ? backgroundImageUrl
        : null;

    function handleImageLoad(event: Event) {
        const img = event.target as HTMLImageElement;
        if (img.naturalWidth && img.naturalHeight) {
            imageAspectRatio = img.naturalHeight / img.naturalWidth;
            imageLoaded = true;
        }
    }

    function handleImageError() {
        imageAspectRatio = null;
        imageLoaded = true;
    }

    // Reset aspect ratio when image changes
    $: if (effectiveBackgroundImage) {
        imageLoaded = false;
        imageAspectRatio = null;
    }
</script>
  
  <section
    class={`relative overflow-hidden ${
      backgroundStyle === 'dark'
        ? 'bg-gray-900 text-white'
        : (backgroundStyle === 'image' || backgroundStyle === 'galleryLeading')
        ? 'text-white'
        : 'bg-gray-50 text-gray-900'
    }`}
  >
    {#if effectiveBackgroundImage}
      <!-- Aspect ratio container for background image -->
      <div 
        class="relative w-full"
        style={imageAspectRatio 
          ? `padding-bottom: ${imageAspectRatio * 100}%;` 
          : 'min-height: 60vh;'}
      >
        <div class="absolute inset-0">
          <img
            src={effectiveBackgroundImage}
            alt={titleText || 'Hero background'}
            class="w-full h-full object-cover"
            on:load={handleImageLoad}
            on:error={handleImageError}
          />
          <div class="absolute inset-0 bg-black/40"></div>
        </div>
        
        <!-- Content overlay -->
        <div class="absolute inset-0 flex items-center">
          <div class="relative w-full max-w-5xl mx-auto px-4 py-16 md:py-24">
            {#if titleText}
              <h1 class="text-3xl md:text-5xl font-bold mb-4">
                {titleText}
              </h1>
            {/if}
            {#if subtitleText}
              <p class="text-base md:text-xl mb-6 {backgroundStyle === 'dark' || backgroundStyle === 'image' || backgroundStyle === 'galleryLeading' ? 'text-gray-200' : 'text-gray-600'}">
                {subtitleText}
              </p>
            {/if}
            {#if ctaLabelText && config?.ctaUrl}
              <a
                href={config.ctaUrl}
                class="inline-flex items-center px-6 py-3 rounded-full bg-primary-600 text-white hover:bg-primary-700 text-sm font-semibold"
              >
                {ctaLabelText}
              </a>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <!-- No background image - normal layout -->
      <div class="relative max-w-5xl mx-auto px-4 py-16 md:py-24">
        {#if titleText}
          <h1 class="text-3xl md:text-5xl font-bold mb-4">
            {titleText}
          </h1>
        {/if}
        {#if subtitleText}
          <p class="text-base md:text-xl mb-6 {backgroundStyle === 'dark' || backgroundStyle === 'image' || backgroundStyle === 'galleryLeading' ? 'text-gray-200' : 'text-gray-600'}">
            {subtitleText}
          </p>
        {/if}
        {#if ctaLabelText && config?.ctaUrl}
          <a
            href={config.ctaUrl}
            class="inline-flex items-center px-6 py-3 rounded-full bg-primary-600 text-white hover:bg-primary-700 text-sm font-semibold"
          >
            {ctaLabelText}
          </a>
        {/if}
      </div>
    {/if}
  </section>
