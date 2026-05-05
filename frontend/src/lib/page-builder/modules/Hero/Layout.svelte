<!-- Simplified hero: background img + optional content + optional media grid/carousel. -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { activeTemplate } from '$stores/template';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { normalizeTemplatePackId, type TemplatePackId } from '$lib/template/packs/ids';
	import {
		normalizeHeroModuleConfig,
		normalizeHeroMediaSource,
		heroGalleryLeadingMediaLimit,
		parseUrlList,
		type HeroContentMediaOrder,
		type HeroMediaArrangement
	} from './hero-layout';
	import { urlFromGalleryLeadingPhoto } from './gallery-leading-urls';
	import { logger } from '$lib/utils/logger';

	export let config: any = {};

	$: heroPack = normalizeTemplatePackId(
		$activeTemplate ??
			$siteConfigData?.template?.frontendTemplate ??
			$siteConfigData?.template?.activeTemplate
	) as TemplatePackId;

	$: n = normalizeHeroModuleConfig(config as Record<string, unknown>);

	$: titleText = MultiLangUtils.getTextValue(n.title, $currentLanguage);
	$: subtitleText = MultiLangUtils.getTextValue(n.subtitle, $currentLanguage);
	$: descriptionText = MultiLangUtils.getTextValue(n.description, $currentLanguage);
	$: btn1Label = MultiLangUtils.getTextValue(n.buttonLabel ?? n.ctaLabel, $currentLanguage);
	$: btn1Url = String(n.buttonUrl ?? n.ctaUrl ?? '').trim();
	$: btn2Label = MultiLangUtils.getTextValue(n.button2Label, $currentLanguage);
	$: btn2Url = String(n.button2Url ?? '').trim();

	$: bgSrc = typeof n.backgroundImage === 'string' ? n.backgroundImage.trim() : '';

	$: order = n.contentMediaOrder as HeroContentMediaOrder;
	$: mediaSource = normalizeHeroMediaSource(n.mediaSource);
	$: mediaMax = heroGalleryLeadingMediaLimit(n as Record<string, unknown>);
	$: arrangement = n.mediaArrangement as HeroMediaArrangement;

	$: uploadUrls = parseUrlList(n.mediaImages).slice(0, mediaMax);

	let galleryUrls: string[] = [];
	let galleryFetchGen = 0;

	$: hasPrefetched =
		mediaSource === 'galleryLeading' &&
		Array.isArray(n.prefetchedGalleryLeadingUrls) &&
		n.prefetchedGalleryLeadingUrls.length > 0;

	$: if (mediaSource !== 'galleryLeading') {
		galleryUrls = [];
		galleryFetchGen += 1;
	} else if (hasPrefetched) {
		galleryUrls = [...(n.prefetchedGalleryLeadingUrls as string[])];
		galleryFetchGen += 1;
	} else if (browser && mediaMax > 0) {
		const gen = ++galleryFetchGen;
		const lim = mediaMax;
		(async () => {
			try {
				const res = await fetch(`/api/photos/gallery-leading?limit=${lim}`);
				if (gen !== galleryFetchGen) return;
				if (!res.ok) {
					galleryUrls = [];
					return;
				}
				const data = await res.json();
				const list = Array.isArray(data) ? data : data?.data || [];
				const urls = list
					.map((p: unknown) => urlFromGalleryLeadingPhoto(p))
					.filter((u: string | null): u is string => Boolean(u));
				if (gen !== galleryFetchGen) return;
				galleryUrls = urls;
			} catch (e) {
				if (gen !== galleryFetchGen) return;
				logger.warn('[Hero] gallery-leading fetch failed', e);
				galleryUrls = [];
			}
		})();
	}

	$: mediaUrls =
		mediaSource === 'galleryLeading' ? galleryUrls.slice(0, mediaMax) : uploadUrls;

	$: showContent =
		order !== 'media-only' &&
		!!(
			titleText ||
			subtitleText ||
			descriptionText ||
			(btn1Label && btn1Url) ||
			(btn2Label && btn2Url)
		);
	$: showMedia = order !== 'content-only' && mediaUrls.length > 0;

	$: hasAnything = !!(bgSrc || showContent || showMedia);

	/* --- Carousel --- */
	let slideIndex = 0;
	let slideshowTimer: ReturnType<typeof setInterval> | null = null;

	function clearTimer() {
		if (slideshowTimer) {
			clearInterval(slideshowTimer);
			slideshowTimer = null;
		}
	}

	$: carouselActive =
		showMedia && arrangement === 'carousel' && mediaUrls.length > 1;

	$: carouselMs = Math.max(3000, Number(n.carouselIntervalMs ?? n.slideshowIntervalMs) || 5000);

	$: if (browser && carouselActive) {
		clearTimer();
		const nSlides = mediaUrls.length;
		slideIndex = Math.min(slideIndex, nSlides - 1);
		slideshowTimer = setInterval(() => {
			slideIndex = (slideIndex + 1) % nSlides;
		}, carouselMs);
	} else {
		clearTimer();
		slideIndex = 0;
	}

	onDestroy(() => clearTimer());

	function goSlide(i: number) {
		const nSlides = mediaUrls.length;
		slideIndex = ((i % nSlides) + nSlides) % nSlides;
	}
</script>

{#if hasAnything}
	<section
		class="hero"
		class:hero--has-bg={!!bgSrc}
		data-hero-pack={heroPack}
		data-hero-layout={String(n.heroLayout ?? n.layoutVariant ?? '').trim().toLowerCase() || undefined}
		data-content-media-order={order}
		data-media-arrangement={arrangement}
		data-media-source={mediaSource}
	>
		{#if bgSrc}
			<img class="hero-img" src={bgSrc} alt="" loading="eager" decoding="async" />
		{/if}

		<div class="hero-inner">
			{#if showContent}
				<div class="hero-content">
					{#if titleText}
						<h1 class="hero-title">{titleText}</h1>
					{/if}
					{#if subtitleText}
						<p class="hero-subtitle">{subtitleText}</p>
					{/if}
					{#if descriptionText}
						<p class="hero-description">{descriptionText}</p>
					{/if}
					{#if (btn1Label && btn1Url) || (btn2Label && btn2Url)}
						<div class="hero-actions">
							{#if btn1Label && btn1Url}
								<a class="hero-btn hero-btn--primary" href={btn1Url}>{btn1Label}</a>
							{/if}
							{#if btn2Label && btn2Url}
								<a class="hero-btn hero-btn--secondary" href={btn2Url}>{btn2Label}</a>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			{#if showMedia}
				<div
					class="hero-media"
					class:hero-media--square={arrangement === 'square'}
					class:hero-media--masonry={arrangement === 'masonry'}
					class:hero-media--carousel={arrangement === 'carousel'}
				>
					{#if arrangement === 'carousel' && mediaUrls.length > 1}
						<div class="hero-media__carousel">
							{#each mediaUrls as url, i (url + i)}
								<img
									src={url}
									alt=""
									class="hero-media__img"
									class:hero-media__img--active={i === slideIndex}
									loading={i === 0 ? 'eager' : 'lazy'}
									decoding="async"
								/>
							{/each}
						</div>
						<div class="hero-media__dots" role="group" aria-label="Hero photos">
							{#each mediaUrls as _, i}
								<button
									type="button"
									class="hero-media__dot"
									class:hero-media__dot--active={i === slideIndex}
									aria-label={`Photo ${i + 1}`}
									on:click={() => goSlide(i)}
								></button>
							{/each}
						</div>
					{:else}
						{#each mediaUrls as url, i (url + i)}
							<img
								src={url}
								alt=""
								class="hero-media__img"
								loading={i === 0 ? 'eager' : 'lazy'}
								decoding="async"
							/>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</section>
{/if}
