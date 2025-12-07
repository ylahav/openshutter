<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { MultiLangUtils } from '$utils/multiLang';

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
			console.error('Failed to fetch gallery photos:', err);
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

	$: isRTL = lang === 'he' || lang === 'ar';
	$: arrowPath = isRTL ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7';
</script>

{#if !loading && !backgroundImageUrl}
	<!-- Hide hero if no background image -->
{:else}
	<section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-primary/80">
		{#if backgroundImageUrl}
			<div class="absolute inset-0">
				<img
					src={backgroundImageUrl}
					alt="Hero background"
					class="w-full h-full object-cover transition-all duration-1000 ease-in-out"
				/>
			</div>
		{/if}

		{#if loading}
			<div class="absolute inset-0 flex items-center justify-center bg-background/50">
				<div class="text-center text-foreground">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
					<p class="text-lg">Loading...</p>
				</div>
			</div>
		{/if}

		<div class="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
			<h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">{title}</h1>

			<p class="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">
				{description}
			</p>

			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a
					href="/albums"
					class="inline-flex items-center px-8 py-4 bg-background text-foreground font-semibold rounded-lg hover:bg-muted transition-colors duration-300 shadow-lg"
				>
					<span class="mr-2">Explore Gallery</span>
					<svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={arrowPath} />
					</svg>
				</a>
			</div>

			{#if photos.length > 1}
				<div class="flex justify-center mt-12 space-x-2">
					{#each photos as _, index}
						<button
							on:click={() => (currentPhotoIndex = index)}
							class="w-3 h-3 rounded-full transition-all duration-300 {index === currentPhotoIndex
								? 'bg-white'
								: 'bg-white/50 hover:bg-white/75'}"
						></button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="absolute bottom-8 left-1/2 transform -translate-x-1/2">
			<div class="w-px h-12 bg-white/50">
				<div class="w-px h-6 bg-white animate-pulse"></div>
			</div>
		</div>
	</section>
{/if}
