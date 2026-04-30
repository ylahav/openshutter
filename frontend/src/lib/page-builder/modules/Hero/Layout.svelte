<!-- frontend/src/lib/page-builder/modules/Hero/Layout.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { activeTemplate } from '$stores/template';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { normalizeTemplatePackId, type TemplatePackId } from '$lib/template/packs/ids';
	import {
		defaultHeroLayoutForPack,
		galleryLeadingFetchLimit,
		normalizeHeroLayout,
		normalizeHeroSplitLead,
		parseHeroImageList,
		parseHeroStats
	} from './hero-layout';
	import { urlFromGalleryLeadingPhoto } from './gallery-leading-urls';
	import { logger } from '$lib/utils/logger';
	import './_styles.scss';

	export let config: any = {};
	const templateHeroStyleLoaders = import.meta.glob('/src/templates/*/styles/_hero.scss');
	const loadedTemplateHeroStyles = new Set<string>();

	/** Resolved visitor pack — prefer store (matches PageRenderer / pack SCSS). */
	$: heroPack = normalizeTemplatePackId(
		$activeTemplate ??
			$siteConfigData?.template?.frontendTemplate ??
			$siteConfigData?.template?.activeTemplate
	) as TemplatePackId;
	$: isNoir = heroPack === 'noir';

	$: templateHero = ($siteConfigData?.template as Record<string, unknown> | undefined)?.hero as
		| { layout?: string }
		| undefined;
	$: themeHeroLayout = normalizeHeroLayout(templateHero?.layout);
	$: moduleHeroLayout = normalizeHeroLayout(config?.heroLayout ?? config?.layoutVariant);
	$: resolvedLayout =
		moduleHeroLayout ?? themeHeroLayout ?? defaultHeroLayoutForPack(heroPack);

	$: splitLead =
		resolvedLayout === 'split' ? normalizeHeroSplitLead(config?.heroSplitLead) : 'media';

	$: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage);
	$: subtitleText = MultiLangUtils.getTextValue(config?.subtitle, $currentLanguage);
	$: ctaLabelText = MultiLangUtils.getTextValue(config?.ctaLabel, $currentLanguage);
	/** Noir omits CTA unless explicitly enabled (`showCta: true`). */
	$: showCta = isNoir ? config?.showCta === true : config?.showCta !== false;

	$: backgroundStyle = config?.backgroundStyle ?? 'light';
	$: backgroundImageUrl = config?.backgroundImage;

	$: hasImageBackground =
		backgroundStyle === 'image' || backgroundStyle === 'galleryLeading';

	$: extraImages = parseHeroImageList(config as Record<string, unknown>);

	let galleryLeadingUrls: string[] = [];
	let galleryLeadingFetchGen = 0;

	$: galleryLeadingLimit = galleryLeadingFetchLimit({
		backgroundStyle,
		resolvedLayout,
		configLimit: config?.heroGalleryLeadingLimit
	});

	$: hasPrefetchedGalleryLeading =
		backgroundStyle === 'galleryLeading' &&
		Array.isArray(config?.prefetchedGalleryLeadingUrls) &&
		config.prefetchedGalleryLeadingUrls.length > 0;

	/** WARN so logs appear even when logger minLevel is WARN (production). Search: "gallery-leading". */
	let lastGalleryLeadingDiagnosticKey = '';
	$: if (browser) {
		const key = `${backgroundStyle}|${resolvedLayout}|${extraImages.length}`;
		if (key !== lastGalleryLeadingDiagnosticKey) {
			lastGalleryLeadingDiagnosticKey = key;
			logger.warn('[Hero] gallery-leading diagnostic', {
				backgroundStyle,
				resolvedLayout,
				extraImageUrlCount: extraImages.length,
				hasPrefetchedUrls: hasPrefetchedGalleryLeading,
				willFetchGalleryLeadingApi:
					backgroundStyle === 'galleryLeading' &&
					galleryLeadingLimit > 0 &&
					!hasPrefetchedGalleryLeading,
				apiLimit: galleryLeadingLimit,
				hint:
					backgroundStyle !== 'galleryLeading'
						? 'Set hero Background style to "Gallery leading" (empty Extra URLs is not enough).'
						: undefined
			});
		}
	}

	$: if (backgroundStyle !== 'galleryLeading') {
		galleryLeadingUrls = [];
		galleryLeadingFetchGen += 1;
	} else if (hasPrefetchedGalleryLeading) {
		galleryLeadingUrls = [...(config.prefetchedGalleryLeadingUrls as string[])];
		galleryLeadingFetchGen += 1;
	} else if (browser && galleryLeadingLimit > 0) {
		const gen = ++galleryLeadingFetchGen;
		const lim = galleryLeadingLimit;
		const styleWhenQueued = backgroundStyle;
		const layoutWhenQueued = resolvedLayout;
		logger.warn('[Hero] gallery-leading: browser fetch starting', {
			url: `/api/photos/gallery-leading?limit=${lim}`,
			limit: lim,
			layout: layoutWhenQueued
		});
		(async () => {
			try {
				const res = await fetch(`/api/photos/gallery-leading?limit=${lim}`);
				if (gen !== galleryLeadingFetchGen) return;
				if (styleWhenQueued !== backgroundStyle) return;
				if (!res.ok) {
					logger.warn('[Hero] gallery-leading: HTTP error', { status: res.status });
					galleryLeadingUrls = [];
					return;
				}
				const data = await res.json();
				const list = Array.isArray(data) ? data : data?.data || [];
				const urls = list
					.map((p: unknown) => urlFromGalleryLeadingPhoto(p))
					.filter((u: string | null): u is string => Boolean(u));
				if (gen !== galleryLeadingFetchGen) return;
				if (styleWhenQueued !== backgroundStyle) return;
				galleryLeadingUrls = urls;
				logger.warn('[Hero] gallery-leading: browser fetch done', {
					rawCount: list.length,
					resolvedUrlCount: urls.length
				});
			} catch (e) {
				if (gen !== galleryLeadingFetchGen) return;
				logger.warn('[Hero] gallery-leading: fetch failed', e);
				galleryLeadingUrls = [];
			}
		})();
	} else if (browser && backgroundStyle === 'galleryLeading' && galleryLeadingLimit <= 0) {
		logger.warn('[Hero] gallery-leading: fetch skipped (limit<=0; unexpected for galleryLeading)');
	}

	$: effectiveBackgroundImage =
		backgroundStyle === 'galleryLeading'
			? galleryLeadingUrls[0] ?? null
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
	 * Full-bleed layout: Noir full-viewport image hero unless `fullViewportHero: false`.
	 * Other packs need `fullViewportHero: true` for full viewport.
	 */
	$: useFullViewportImageHero =
		resolvedLayout === 'fullbleed' &&
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
		resolvedLayout === 'fullbleed' &&
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
	$: fullViewportClass =
		resolvedLayout === 'fullbleed' && effectiveBackgroundImage && useFullViewportImageHero
			? 'pb-hero--fullViewport'
			: '';

	$: heroStats = parseHeroStats(config as Record<string, unknown>);

	$: slideshowImages = (() => {
		if (backgroundStyle === 'galleryLeading' && resolvedLayout === 'slideshow') {
			return galleryLeadingUrls.length > 0 ? [...galleryLeadingUrls] : [];
		}
		const base: string[] = [];
		if (effectiveBackgroundImage) base.push(effectiveBackgroundImage);
		base.push(...extraImages);
		return [...new Set(base.filter(Boolean))];
	})();

	$: mosaicImages = (() => {
		if (backgroundStyle === 'galleryLeading' && resolvedLayout === 'mosaic') {
			if (galleryLeadingUrls.length > 0) {
				return galleryLeadingUrls.slice(0, Math.min(4, galleryLeadingUrls.length));
			}
			return [];
		}
		if (extraImages.length >= 2) return extraImages.slice(0, 4);
		if (effectiveBackgroundImage && extraImages.length === 1)
			return [effectiveBackgroundImage, extraImages[0]!];
		if (effectiveBackgroundImage) return [effectiveBackgroundImage];
		return [];
	})();

	$: filmstripMetaText = String(config?.filmstripMeta ?? '').trim() || subtitleText || '';

	let slideIndex = 0;
	let slideshowTimer: ReturnType<typeof setInterval> | null = null;

	function clearSlideshowTimer() {
		if (slideshowTimer) {
			clearInterval(slideshowTimer);
			slideshowTimer = null;
		}
	}

	$: if (browser && resolvedLayout === 'slideshow' && slideshowImages.length > 1) {
		clearSlideshowTimer();
		const n = slideshowImages.length;
		slideIndex = Math.min(slideIndex, n - 1);
		const interval = Math.max(3000, Number(config?.slideshowIntervalMs) || 5000);
		slideshowTimer = setInterval(() => {
			slideIndex = (slideIndex + 1) % n;
		}, interval);
	} else {
		clearSlideshowTimer();
		slideIndex = 0;
	}

	onDestroy(() => clearSlideshowTimer());

	function goSlide(i: number) {
		slideIndex = ((i % slideshowImages.length) + slideshowImages.length) % slideshowImages.length;
	}

	$: if (browser) {
		const templateId = String($activeTemplate || '').trim().toLowerCase();
		const stylePath = `/src/templates/${templateId}/styles/_hero.scss`;
		if (templateId && !loadedTemplateHeroStyles.has(stylePath)) {
			const loader = templateHeroStyleLoaders[stylePath];
			if (loader) {
				void loader();
				loadedTemplateHeroStyles.add(stylePath);
			}
		}
	}

	function heroSplitCssToken(raw: unknown): string | null {
		if (raw === undefined || raw === null) return null;
		const s = String(raw).trim();
		return s.length ? s : null;
	}

	/** CSS variables for split layout sizing (see `heroSplit*` module props). */
	$: splitHeroSectionStyle = (() => {
		if (resolvedLayout !== 'split') return undefined;
		const parts: string[] = [];
		const cols = heroSplitCssToken(config?.heroSplitGridColumns);
		const minH = heroSplitCssToken(config?.heroSplitMinHeight);
		const mediaMin = heroSplitCssToken(config?.heroSplitMediaMinHeight);
		if (cols) parts.push(`--pb-hero-split-cols: ${cols}`);
		if (minH) parts.push(`--pb-hero-split-min-h: ${minH}`);
		if (mediaMin) parts.push(`--pb-hero-split-media-min-h: ${mediaMin}`);
		return parts.length ? parts.join('; ') : undefined;
	})();
</script>

<section
	data-hero-pack={heroPack}
	data-hero-layout={resolvedLayout}
	class={`pb-hero pb-hero--layout-${resolvedLayout} ${toneClass} ${fullViewportClass}`.trim()}
	style={splitHeroSectionStyle}
>
	{#if resolvedLayout === 'slideshow' && slideshowImages.length > 0}
		<div class="pb-hero__slideshow">
			{#each slideshowImages as url, i (url + i)}
				<img
					src={url}
					alt={titleText ? `${titleText} — slide ${i + 1}` : `Hero slide ${i + 1}`}
					class="pb-hero__slideshowSlide"
					class:pb-hero__slideshowSlide--active={i === slideIndex}
					loading={i === 0 ? 'eager' : 'lazy'}
					decoding="async"
				/>
			{/each}
			<div class="pb-hero__slideshowOverlay"></div>
			<div class="pb-hero__contentWrap pb-hero__contentWrap--full pb-hero__contentWrap--slideshow">
				<div class="pb-hero__headlineRow">
					{#if titleText}
						<h1 class="pb-hero__title pb-hero__title--reset">{titleText}</h1>
					{/if}
					{#if showHeroRule && titleText && subtitleText}
						<div class="hero-rule" aria-hidden="true"></div>
					{/if}
					{#if subtitleText}
						<p class="pb-hero__subtitle pb-hero__subtitle--reset">{subtitleText}</p>
					{/if}
				</div>
				{#if showCta && ctaLabelText && config?.ctaUrl}
					<div class="pb-hero__ctaRow">
						<a href={config.ctaUrl} class="pb-hero__cta">{ctaLabelText}</a>
					</div>
				{/if}
			</div>
			{#if slideshowImages.length > 1}
				<div class="pb-hero__slideshowDots" role="group" aria-label="Hero slides">
					{#each slideshowImages as _, i}
						<button
							type="button"
							class="pb-hero__slideshowDot"
							class:pb-hero__slideshowDot--active={i === slideIndex}
							aria-current={i === slideIndex ? 'true' : undefined}
							aria-label={`Slide ${i + 1}`}
							on:click={() => goSlide(i)}
						></button>
					{/each}
				</div>
			{/if}
		</div>
	{:else if resolvedLayout === 'mosaic' && mosaicImages.length > 0}
		<div class="pb-hero__mosaic" style="--pb-hero-mosaic-n: {mosaicImages.length}">
			{#each mosaicImages as url, i (url + i)}
				<div class="pb-hero__mosaicCell">
					<img src={url} alt="" class="pb-hero__mosaicImg" loading="lazy" decoding="async" />
				</div>
			{/each}
		</div>
		{#if titleText || subtitleText || (showCta && ctaLabelText && config?.ctaUrl)}
			<div class="pb-hero__mosaicBelow">
				{#if titleText}
					<h1 class="pb-hero__title">{titleText}</h1>
				{/if}
				{#if subtitleText}
					<p class="pb-hero__subtitle">{subtitleText}</p>
				{/if}
				{#if showCta && ctaLabelText && config?.ctaUrl}
					<a href={config.ctaUrl} class="pb-hero__cta">{ctaLabelText}</a>
				{/if}
			</div>
		{/if}
	{:else if resolvedLayout === 'split' && effectiveBackgroundImage}
		<div
			class="pb-hero__split{splitLead === 'copy' ? ' pb-hero__split--copy-first' : ''}"
			data-hero-split-lead={splitLead}
		>
			<div class="pb-hero__splitMedia">
				<img
					src={effectiveBackgroundImage}
					alt={titleText || 'Hero'}
					class={`pb-hero__bgImage ${imgObjectClass}`}
					loading="lazy"
					decoding="async"
				/>
			</div>
			<div class="pb-hero__splitBody">
				{#if titleText}
					<h1 class="pb-hero__title">{titleText}</h1>
				{/if}
				{#if subtitleText}
					<p class="pb-hero__subtitle">{subtitleText}</p>
				{/if}
				{#if showCta && ctaLabelText && config?.ctaUrl}
					<a href={config.ctaUrl} class="pb-hero__cta">{ctaLabelText}</a>
				{/if}
				{#if heroStats.length > 0}
					<ul class="pb-hero__stats">
						{#each heroStats as s}
							<li class="pb-hero__stat">
								<span class="pb-hero__statValue">{s.value}</span>
								<span class="pb-hero__statLabel">{s.label}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{:else if resolvedLayout === 'minimal' && effectiveBackgroundImage}
		<div class="pb-hero__minimal">
			<div class="pb-hero__minimalCopy">
				{#if titleText}
					<h1 class="pb-hero__title">{titleText}</h1>
				{/if}
				{#if subtitleText}
					<p class="pb-hero__subtitle">{subtitleText}</p>
				{/if}
				{#if showCta && ctaLabelText && config?.ctaUrl}
					<a href={config.ctaUrl} class="pb-hero__cta">{ctaLabelText}</a>
				{/if}
			</div>
			<div class="pb-hero__minimalFrame">
				<img
					src={effectiveBackgroundImage}
					alt=""
					class={`pb-hero__minimalImg ${imgObjectClass}`}
					loading="lazy"
					decoding="async"
				/>
			</div>
		</div>
	{:else if resolvedLayout === 'portrait' && effectiveBackgroundImage}
		<div class="pb-hero__portrait">
			<div class="pb-hero__portraitFigure">
				<img
					src={effectiveBackgroundImage}
					alt={titleText || 'Hero'}
					class={`pb-hero__portraitImg ${imgObjectClass}`}
					loading="lazy"
					decoding="async"
				/>
			</div>
			<div class="pb-hero__portraitCopy">
				{#if titleText}
					<h1 class="pb-hero__title">{titleText}</h1>
				{/if}
				{#if subtitleText}
					<p class="pb-hero__subtitle">{subtitleText}</p>
				{/if}
				{#if showCta && ctaLabelText && config?.ctaUrl}
					<a href={config.ctaUrl} class="pb-hero__cta">{ctaLabelText}</a>
				{/if}
			</div>
		</div>
	{:else if resolvedLayout === 'filmstrip' && effectiveBackgroundImage}
		<div class="pb-hero__filmstrip">
			<div class="pb-hero__filmstripStrip">
				<img
					src={effectiveBackgroundImage}
					alt=""
					class={`pb-hero__filmstripImg ${imgObjectClass}`}
					loading="lazy"
					decoding="async"
				/>
			</div>
			<div class="pb-hero__filmstripBar">
				{#if titleText}
					<h1 class="pb-hero__filmstripTitle">{titleText}</h1>
				{/if}
				{#if filmstripMetaText}
					<p class="pb-hero__filmstripMeta">{filmstripMetaText}</p>
				{/if}
			</div>
			{#if showCta && ctaLabelText && config?.ctaUrl}
				<div class="pb-hero__filmstripCta">
					<a href={config.ctaUrl} class="pb-hero__cta">{ctaLabelText}</a>
				</div>
			{/if}
		</div>
	{:else if (resolvedLayout === 'stacked' || resolvedLayout === 'editorial') && effectiveBackgroundImage}
		<div class="pb-hero__stacked">
			<div
				class="pb-hero__stackedMedia"
				class:pb-hero__stackedMedia--editorial={resolvedLayout === 'editorial'}
			>
				<img
					src={effectiveBackgroundImage}
					alt={titleText || 'Hero background'}
					class={`pb-hero__stackedImg ${imgObjectClass}`}
					loading="lazy"
					decoding="async"
				/>
			</div>
			<div
				class="pb-hero__stackedBody"
				class:pb-hero__stackedBody--editorial={resolvedLayout === 'editorial'}
			>
				{#if resolvedLayout === 'editorial'}
					{#if titleText}
						<h1 class="pb-hero__title pb-hero__title--editorial">{titleText}</h1>
					{/if}
					<div class="pb-hero__editorialRule" aria-hidden="true"></div>
					{#if subtitleText}
						<p class="pb-hero__subtitle pb-hero__subtitle--editorial">{subtitleText}</p>
					{/if}
				{:else if isNoir && showHeroRule && titleText && subtitleText}
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
						<p class="pb-hero__subtitle">{subtitleText}</p>
					{/if}
				{/if}
				{#if showCta && ctaLabelText && config?.ctaUrl}
					<a href={config.ctaUrl} class="pb-hero__cta">{ctaLabelText}</a>
				{/if}
			</div>
		</div>
	{:else if effectiveBackgroundImage && resolvedLayout === 'fullbleed' && useFullViewportImageHero}
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
						<p class="pb-hero__subtitle pb-hero__subtitle--reset">{subtitleText}</p>
					{/if}
				</div>
				{#if showCta && ctaLabelText && config?.ctaUrl}
					<div class="pb-hero__ctaRow">
						<a href={config.ctaUrl} class="pb-hero__cta">{ctaLabelText}</a>
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
		<!-- Short full-bleed fallback, legacy strip, or non-full-bleed image -->
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
							<p class="pb-hero__subtitle">{subtitleText}</p>
						{/if}
					{/if}
					{#if showCta && ctaLabelText && config?.ctaUrl}
						<a href={config.ctaUrl} class="pb-hero__cta">{ctaLabelText}</a>
					{/if}
				</div>
			</div>
		</div>
	{:else}
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
					<p class="pb-hero__subtitle">{subtitleText}</p>
				{/if}
			{/if}
			{#if showCta && ctaLabelText && config?.ctaUrl}
				<a href={config.ctaUrl} class="pb-hero__cta">{ctaLabelText}</a>
			{/if}
		</div>
	{/if}
</section>
