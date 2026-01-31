<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { MultiLangUtils } from '$utils/multiLang';
	import { logger } from '$lib/utils/logger';

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

	const ROTATION_INTERVAL = 10000;

	onMount(async () => {
		try {
			const res = await fetch('/api/photos/gallery-leading?limit=3');
			if (res.ok) {
				const data = await res.json();
				const list = Array.isArray(data) ? data : data.data || [];
				if (Array.isArray(list)) {
					photos = list;
				}
			}
		} catch (err) {
			logger.error('Failed to fetch gallery photos:', err);
		} finally {
			loading = false;
		}
	});

	let intervalId: ReturnType<typeof setInterval> | null = null;

	$: if (photos.length > 1) {
		if (intervalId) clearInterval(intervalId);
		intervalId = setInterval(() => {
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
		? MultiLangUtils.getHTMLValue(config.description, lang).replace(/<[^>]*>/g, '')
		: 'A beautiful photo gallery showcasing amazing moments';
</script>

{#if !loading && !backgroundImageUrl}
	<!-- Hide hero if no background image -->
{:else}
	<section class="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-linear-to-b from-purple-900 via-purple-800 to-indigo-900">
		{#if backgroundImageUrl}
			<div class="absolute inset-0">
				<img
					src={backgroundImageUrl}
					alt="Hero background"
					class="w-full h-full object-cover opacity-30 transition-opacity duration-1000 ease-in-out"
				/>
				<div class="absolute inset-0 bg-gradient-to-b from-purple-900/60 via-purple-800/50 to-indigo-900/60"></div>
			</div>
		{/if}

		{#if loading}
			<div class="absolute inset-0 flex items-center justify-center bg-purple-900/50">
				<div class="text-center text-white">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
					<p class="text-lg font-light">Loading...</p>
				</div>
			</div>
		{/if}

		<div class="relative z-10 max-w-5xl mx-auto px-6 text-center text-white">
			<h1 class="text-5xl md:text-7xl font-serif mb-6 leading-tight tracking-wide" style="font-family: 'Playfair Display', serif;">
				{title}
			</h1>

			<p class="text-xl md:text-2xl mb-10 text-white/95 max-w-3xl mx-auto leading-relaxed font-light">
				{description}
			</p>

			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a
					href="/albums"
					class="inline-flex items-center px-10 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-full hover:bg-white/20 transition-all duration-300 shadow-lg border border-white/20 hover:border-white/40"
				>
					<span class="mr-2">Explore Gallery</span>
					<svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</div>

			{#if photos.length > 1}
				<div class="flex justify-center mt-16 space-x-3">
					{#each photos as _, index}
						<button
							on:click={() => (currentPhotoIndex = index)}
							class="w-3 h-3 rounded-full transition-all duration-500 {index === currentPhotoIndex
								? 'bg-white w-8'
								: 'bg-white/40 hover:bg-white/60'}"
						></button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="absolute bottom-12 left-1/2 transform -translate-x-1/2">
			<div class="w-px h-16 bg-white/30">
				<div class="w-px h-8 bg-white animate-pulse"></div>
			</div>
		</div>
	</section>
{/if}
