<!-- frontend/src/lib/page-builder/modules/Hero/Layout.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getPhotoFullUrl } from '$lib/utils/photoUrl';
	import { normalizeTemplatePackId } from '$lib/template-packs/ids';

	export let config: any = {};

	/** Matches pack hero hooks (`a-hero` / `s-hero` / `n-hero`) without applying pack SCSS that conflicts with this layout. */
	$: heroPack = normalizeTemplatePackId(
		$siteConfigData?.template?.frontendTemplate ??
			$siteConfigData?.template?.activeTemplate ??
			'atelier'
	);

	$: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage);
	$: subtitleText = MultiLangUtils.getTextValue(config?.subtitle, $currentLanguage);
    $: ctaLabelText = MultiLangUtils.getTextValue(config?.ctaLabel, $currentLanguage);
    $: showCta = config?.showCta !== false;

	$: backgroundStyle = config?.backgroundStyle ?? 'light';
	$: backgroundImageUrl = config?.backgroundImage;

	let galleryLeadingUrl: string | null = null;

	/** Resolve API photo JSON to a browser-loadable URL (handles relative paths → /api/storage/serve/…). */
	function urlFromGalleryLeadingPhoto(photo: unknown): string | null {
		if (!photo || typeof photo !== 'object') return null;
		const url = getPhotoFullUrl(photo as { storage?: { url?: string; path?: string; thumbnailPath?: string; provider?: string; thumbnails?: Record<string, string> }; url?: string });
		return url && url !== '/placeholder.jpg' ? url : null;
	}

	$: if (backgroundStyle !== 'galleryLeading') {
		galleryLeadingUrl = null;
	} else if (browser) {
		const styleWhenQueued = backgroundStyle;
		(async () => {
			try {
				const res = await fetch('/api/photos/gallery-leading?limit=1');
				if (styleWhenQueued !== backgroundStyle) return;
				if (!res.ok) {
					galleryLeadingUrl = null;
					return;
				}
				const data = await res.json();
				const list = Array.isArray(data) ? data : data?.data || [];
				const photo = list[0];
				const url = urlFromGalleryLeadingPhoto(photo);
				if (styleWhenQueued !== backgroundStyle) return;
				galleryLeadingUrl = url;
			} catch {
				galleryLeadingUrl = null;
			}
		})();
	}

	$: effectiveBackgroundImage =
		backgroundStyle === 'galleryLeading'
			? galleryLeadingUrl
			: backgroundStyle === 'image'
				? backgroundImageUrl
				: null;

</script>

<section
	data-hero-pack={heroPack}
	class={`relative overflow-hidden ${
		backgroundStyle === 'dark'
			? 'bg-[color:var(--tp-hero-strip-bg)] text-[color:var(--tp-fg)]'
			: backgroundStyle === 'image' || backgroundStyle === 'galleryLeading'
				? 'text-[color:var(--tp-fg)]'
				: 'bg-[color:var(--tp-surface-2)] text-[color:var(--tp-fg)]'
	}`}
>
	{#if effectiveBackgroundImage}
		<div class="relative w-full max-w-full">
			<div class="relative isolate w-full max-w-full">
				<img
					src={effectiveBackgroundImage}
					alt={titleText || 'Hero background'}
					class="mx-auto block h-auto w-full max-w-full max-h-[50vh] object-contain object-center"
				/>
				<div class="pointer-events-none absolute inset-0 bg-[color:var(--tp-overlay-scrim)]"></div>
			</div>

			<div class="absolute inset-0 flex items-center">
				<div class="relative w-full py-16 @md:py-24">
					{#if titleText}
						<h1 class="mb-4 text-3xl font-bold @md:text-5xl">
							{titleText}
						</h1>
					{/if}
					{#if subtitleText}
						<p class="mb-6 text-base text-[color:var(--tp-fg-muted)] @md:text-xl">
							{subtitleText}
						</p>
					{/if}
					{#if showCta && ctaLabelText && config?.ctaUrl}
						<a
							href={config.ctaUrl}
							class="inline-flex items-center rounded-full bg-[color:var(--os-primary)] px-6 py-3 text-sm font-semibold text-[color:var(--tp-on-brand)] hover:opacity-90"
						>
							{ctaLabelText}
						</a>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<!-- No background image - normal layout -->
		<div class="relative w-full py-16 @md:py-24">
			{#if titleText}
				<h1 class="mb-4 text-3xl font-bold @md:text-5xl">
					{titleText}
				</h1>
			{/if}
			{#if subtitleText}
				<p class="mb-6 text-base text-[color:var(--tp-fg-muted)] @md:text-xl">
					{subtitleText}
				</p>
			{/if}
			{#if showCta && ctaLabelText && config?.ctaUrl}
				<a
					href={config.ctaUrl}
					class="inline-flex items-center rounded-full bg-[color:var(--os-primary)] px-6 py-3 text-sm font-semibold text-[color:var(--tp-on-brand)] hover:opacity-90"
				>
					{ctaLabelText}
				</a>
			{/if}
		</div>
	{/if}
</section>
