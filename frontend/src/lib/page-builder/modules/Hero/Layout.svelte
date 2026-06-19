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

	let { config = {} }: { config?: Record<string, unknown> } = $props();

	const heroPack = $derived(
		normalizeTemplatePackId(
			$activeTemplate ??
				$siteConfigData?.template?.frontendTemplate ??
				$siteConfigData?.template?.activeTemplate
		) as TemplatePackId
	);

	const n = $derived(normalizeHeroModuleConfig(config as Record<string, unknown>));

	const titleText = $derived(MultiLangUtils.getTextValue(n.title, $currentLanguage));
	const subtitleText = $derived(MultiLangUtils.getTextValue(n.subtitle, $currentLanguage));
	const descriptionText = $derived(MultiLangUtils.getTextValue(n.description, $currentLanguage));
	const btn1Label = $derived(MultiLangUtils.getTextValue(n.buttonLabel ?? n.ctaLabel, $currentLanguage));
	const btn1Url = $derived(String(n.buttonUrl ?? n.ctaUrl ?? '').trim());
	const btn2Label = $derived(MultiLangUtils.getTextValue(n.button2Label, $currentLanguage));
	const btn2Url = $derived(String(n.button2Url ?? '').trim());

	const bgSrc = $derived(typeof n.backgroundImage === 'string' ? n.backgroundImage.trim() : '');

	const order = $derived(n.contentMediaOrder as HeroContentMediaOrder);
	const mediaSource = $derived(normalizeHeroMediaSource(n.mediaSource));
	const mediaMax = $derived(heroGalleryLeadingMediaLimit(n as Record<string, unknown>));
	const arrangement = $derived(n.mediaArrangement as HeroMediaArrangement);

	const uploadUrls = $derived(parseUrlList(n.mediaImages).slice(0, mediaMax));

	let galleryUrls = $state<string[]>([]);
	/** Plain counter for stale fetch cancellation — not reactive (must not live in $state). */
	let galleryFetchGen = 0;

	const hasPrefetched = $derived(
		mediaSource === 'galleryLeading' &&
			Array.isArray(n.prefetchedGalleryLeadingUrls) &&
			n.prefetchedGalleryLeadingUrls.length > 0
	);

	$effect(() => {
		if (mediaSource !== 'galleryLeading') {
			galleryUrls = [];
			return;
		}
		if (hasPrefetched) {
			const prefetched = n.prefetchedGalleryLeadingUrls as string[];
			if (galleryUrls.join('\0') !== prefetched.join('\0')) {
				galleryUrls = [...prefetched];
			}
			return;
		}
		if (browser && mediaMax > 0) {
			const gen = ++galleryFetchGen;
			const lim = mediaMax;
			void (async () => {
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
	});

	const mediaUrls = $derived(
		mediaSource === 'galleryLeading' ? galleryUrls.slice(0, mediaMax) : uploadUrls
	);

	const showContent = $derived(
		order !== 'media-only' &&
			!!(
				titleText ||
				subtitleText ||
				descriptionText ||
				(btn1Label && btn1Url) ||
				(btn2Label && btn2Url)
			)
	);
	const showMedia = $derived(order !== 'content-only' && mediaUrls.length > 0);

	const hasAnything = $derived(!!(bgSrc || showContent || showMedia));

	let slideIndex = $state(0);
	let slideshowTimer: ReturnType<typeof setInterval> | null = $state(null);

	function clearTimer() {
		if (slideshowTimer) {
			clearInterval(slideshowTimer);
			slideshowTimer = null;
		}
	}

	const carouselActive = $derived(
		showMedia && arrangement === 'carousel' && mediaUrls.length > 1
	);

	const carouselMs = $derived(Math.max(3000, Number(n.carouselIntervalMs ?? n.slideshowIntervalMs) || 5000));

	$effect(() => {
		if (browser && carouselActive) {
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
	});

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
									onclick={() => goSlide(i)}
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
