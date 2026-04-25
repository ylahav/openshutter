<!-- frontend/src/lib/page-builder/modules/Hero/Layout.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { activeTemplate } from '$stores/template';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getPhotoFullUrl } from '$lib/utils/photoUrl';
	import { normalizeTemplatePackId, type TemplatePackId } from '$lib/template/packs/ids';

	export let config: any = {};

	/** Resolved visitor pack — prefer store (matches PageRenderer / pack SCSS). */
	$: heroPack = normalizeTemplatePackId(
		$activeTemplate ??
			$siteConfigData?.template?.frontendTemplate ??
			$siteConfigData?.template?.activeTemplate
	) as TemplatePackId;
	$: isNoir = heroPack === 'noir';

	$: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage);
	$: subtitleText = MultiLangUtils.getTextValue(config?.subtitle, $currentLanguage);
	$: ctaLabelText = MultiLangUtils.getTextValue(config?.ctaLabel, $currentLanguage);
	/** Noir omits CTA unless explicitly enabled (`showCta: true`). */
	$: showCta = isNoir ? config?.showCta === true : config?.showCta !== false;

	$: backgroundStyle = config?.backgroundStyle ?? 'light';
	$: backgroundImageUrl = config?.backgroundImage;

	$: hasImageBackground =
		backgroundStyle === 'image' || backgroundStyle === 'galleryLeading';

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

	/** Explicit `contain` | `cover`, or pack default: Noir + image hero → cover. */
	$: imageFit =
		config?.imageFit === 'cover' || config?.imageFit === 'contain'
			? config.imageFit
			: isNoir && hasImageBackground
				? 'cover'
				: 'contain';

	/**
	 * Noir full-viewport image hero (100svh) — opt out with `fullViewportHero: false` in module props.
	 * Other packs keep the shorter strip unless `fullViewportHero: true`.
	 */
	$: useFullViewportImageHero =
		!!effectiveBackgroundImage &&
		(isNoir ? config?.fullViewportHero !== false : config?.fullViewportHero === true);

	$: showHeroRule =
		config?.showHeroRule === true ||
		(isNoir && config?.showHeroRule !== false && !!(titleText && subtitleText));

	$: scrollHintHref = String(config?.scrollHintHref ?? '/albums').trim() || '/albums';
	$: scrollHintLabelText = MultiLangUtils.getTextValue(
		config?.scrollHintLabel ?? { en: 'Scroll', he: 'גלילה' },
		$currentLanguage
	);

	$: showScrollHint =
		!!effectiveBackgroundImage &&
		useFullViewportImageHero &&
		(config?.showScrollHint === true || (isNoir && config?.showScrollHint !== false));

	function onScrollHintClick(e: MouseEvent) {
		if (!browser) return;
		const href = scrollHintHref;
		if (href.startsWith('#')) {
			e.preventDefault();
			document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
		}
	}

	$: imgObjectClass = imageFit === 'cover' ? 'pb-hero__bgImage--cover' : 'pb-hero__bgImage--contain';
	$: toneClass =
		backgroundStyle === 'dark'
			? 'pb-hero--dark'
			: backgroundStyle === 'image' || backgroundStyle === 'galleryLeading'
				? 'pb-hero--image'
				: 'pb-hero--light';
	$: fullViewportClass = effectiveBackgroundImage && useFullViewportImageHero ? 'pb-hero--fullViewport' : '';
</script>

<section
	data-hero-pack={heroPack}
	class={`pb-hero ${toneClass} ${fullViewportClass}`}
>
	{#if effectiveBackgroundImage && useFullViewportImageHero}
		<!-- Full-viewport image hero (default Noir + image; any pack with fullViewportHero: true) -->
		<div class="pb-hero__imageFull">
			<img
				src={effectiveBackgroundImage}
				alt={titleText || 'Hero background'}
				class={`pb-hero__bgImage ${imgObjectClass}`}
				loading="eager"
				decoding="async"
			/>
			<div class="pb-hero__overlay"></div>
			<div class="pb-hero__contentWrap pb-hero__contentWrap--full">
				<div class="pb-hero__headlineRow">
					{#if titleText}
						<h1 class="pb-hero__title pb-hero__title--reset">{titleText}</h1>
					{/if}
					{#if showHeroRule && titleText && subtitleText}
						<div class="hero-rule" aria-hidden="true"></div>
					{/if}
					{#if subtitleText}
						<p class="pb-hero__subtitle pb-hero__subtitle--reset">
							{subtitleText}
						</p>
					{/if}
				</div>
				{#if showCta && ctaLabelText && config?.ctaUrl}
					<div class="pb-hero__ctaRow">
						<a
							href={config.ctaUrl}
							class="pb-hero__cta"
						>
							{ctaLabelText}
						</a>
					</div>
				{/if}
			</div>
			{#if showScrollHint}
				<a
					href={scrollHintHref}
					class="pb-hero__scrollHint hero-scroll"
					on:click={onScrollHintClick}
				>
					<span class="pb-hero__scrollHintLabel hero-scroll__label">{scrollHintLabelText}</span>
				</a>
			{/if}
		</div>
	{:else if effectiveBackgroundImage}
		<!-- Partial-height image strip (non-Noir default, or Noir with fullViewportHero: false) -->
		<div class="pb-hero__imageStrip">
			<div class="pb-hero__imageStripInner">
				<img
					src={effectiveBackgroundImage}
					alt={titleText || 'Hero background'}
					class={`pb-hero__bgImage pb-hero__bgImage--strip ${imgObjectClass}`}
					loading="lazy"
					decoding="async"
				/>
				<div class="pb-hero__overlay"></div>
			</div>

			<div class="pb-hero__imageStripContent">
				<div class="pb-hero__contentWrap pb-hero__contentWrap--strip">
					{#if isNoir && showHeroRule && titleText && subtitleText}
						<div class="pb-hero__headlineRow">
							<h1 class="pb-hero__title pb-hero__title--reset">{titleText}</h1>
							<div class="hero-rule" aria-hidden="true"></div>
							<p class="pb-hero__subtitle pb-hero__subtitle--reset">{subtitleText}</p>
						</div>
					{:else}
						{#if titleText}
							<h1 class="pb-hero__title">{titleText}</h1>
						{/if}
						{#if subtitleText}
							<p class="pb-hero__subtitle">
								{subtitleText}
							</p>
						{/if}
					{/if}
					{#if showCta && ctaLabelText && config?.ctaUrl}
						<a
							href={config.ctaUrl}
							class="pb-hero__cta"
						>
							{ctaLabelText}
						</a>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<!-- No background image -->
		<div class="pb-hero__contentWrap pb-hero__contentWrap--plain">
			{#if isNoir && showHeroRule && titleText && subtitleText}
				<div class="pb-hero__headlineRow">
					<h1 class="pb-hero__title pb-hero__title--reset">{titleText}</h1>
					<div class="hero-rule" aria-hidden="true"></div>
					<p class="pb-hero__subtitle pb-hero__subtitle--reset">{subtitleText}</p>
				</div>
			{:else}
				{#if titleText}
					<h1 class="pb-hero__title">{titleText}</h1>
				{/if}
				{#if subtitleText}
					<p class="pb-hero__subtitle">
						{subtitleText}
					</p>
				{/if}
			{/if}
			{#if showCta && ctaLabelText && config?.ctaUrl}
				<a
					href={config.ctaUrl}
					class="pb-hero__cta"
				>
					{ctaLabelText}
				</a>
			{/if}
		</div>
	{/if}
</section>

<style lang="scss">
	.pb-hero {
		position: relative;
		overflow: hidden;
		color: var(--tp-fg);
	}
	.pb-hero--light { background: var(--tp-surface-2); }
	.pb-hero--dark { background: var(--tp-hero-strip-bg); }
	.pb-hero--image { background: transparent; }
	.pb-hero--fullViewport { min-height: 100svh; }

	.pb-hero__imageFull,
	.pb-hero__imageStrip,
	.pb-hero__imageStripInner { position: relative; width: 100%; }
	.pb-hero__imageFull { min-height: 100svh; isolation: isolate; }
	.pb-hero__imageStripInner { isolation: isolate; }

	.pb-hero__bgImage { position: absolute; inset: 0; width: 100%; height: 100%; object-position: center; }
	.pb-hero__bgImage--cover { object-fit: cover; }
	.pb-hero__bgImage--contain { object-fit: contain; }
	.pb-hero__bgImage--strip {
		position: static;
		display: block;
		margin: 0 auto;
		height: auto;
		max-width: 100%;
		max-height: 50vh;
	}

	.pb-hero__overlay { pointer-events: none; position: absolute; inset: 0; background: var(--tp-overlay-scrim); }
	.pb-hero__imageStripContent { position: absolute; inset: 0; display: flex; align-items: center; }

	.pb-hero__contentWrap { position: relative; width: 100%; text-align: center; padding: 4rem 1rem; }
	.pb-hero__contentWrap--full {
		z-index: 10;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.pb-hero__headlineRow {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 1rem 1.5rem;
		max-width: 56rem;
		margin: 0 auto;
	}
	.pb-hero__title {
		margin: 0 0 1rem;
		font-size: clamp(1.875rem, 5vw, 3rem);
		font-weight: 700;
	}
	.pb-hero__title--reset { margin: 0; }
	.pb-hero__subtitle {
		margin: 0 0 1.5rem;
		color: var(--tp-fg-muted);
		font-size: clamp(1rem, 2.2vw, 1.25rem);
	}
	.pb-hero__subtitle--reset { margin: 0; max-width: 36rem; }
	.pb-hero__ctaRow { margin-top: 2.5rem; }
	.pb-hero__cta {
		display: inline-flex;
		align-items: center;
		border-radius: 999px;
		background: var(--os-primary);
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--tp-on-brand);
		text-decoration: none;
	}
	.pb-hero__cta:hover { opacity: 0.9; }

	.pb-hero__scrollHint {
		pointer-events: auto;
		position: absolute;
		bottom: 1.5rem;
		left: 50%;
		z-index: 10;
		transform: translateX(-50%);
		user-select: none;
	}
	.pb-hero__scrollHintLabel {
		display: inline;
	}

	@media (min-width: 768px) {
		.pb-hero__contentWrap { padding-inline: 2rem; padding-block: 6rem; }
	}
</style>
