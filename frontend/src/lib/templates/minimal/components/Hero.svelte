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

	const ROTATION_INTERVAL = 8000;

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
	<section class="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-black">
		{#if backgroundImageUrl}
			<div class="absolute inset-0">
				<img
					src={backgroundImageUrl}
					alt="Hero background"
					class="w-full h-full object-cover opacity-40"
				/>
			</div>
		{/if}

		{#if loading}
			<div class="absolute inset-0 flex items-center justify-center bg-black/50">
				<div class="text-center text-white">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
					<p class="text-lg">Loading...</p>
				</div>
			</div>
		{/if}

		<div class="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
			<h1 class="text-4xl md:text-6xl font-light mb-4 leading-tight tracking-tight">{title}</h1>

			<p class="text-lg md:text-xl mb-8 text-white/90 max-w-2xl mx-auto font-light">
				{description}
			</p>

			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a
					href="/albums"
					class="inline-flex items-center px-8 py-3 bg-white text-black font-normal hover:bg-gray-100 transition-colors duration-200"
				>
					Explore Gallery
				</a>
			</div>

			{#if photos.length > 1}
				<div class="flex justify-center mt-12 space-x-2">
					{#each photos as _, index}
						<button
							on:click={() => (currentPhotoIndex = index)}
							class="w-2 h-2 rounded-full transition-all duration-300 {index === currentPhotoIndex
								? 'bg-white'
								: 'bg-white/30 hover:bg-white/50'}"
						></button>
					{/each}
				</div>
			{/if}
		</div>
	</section>
{/if}
