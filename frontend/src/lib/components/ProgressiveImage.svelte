<script lang="ts">
	import { onMount } from 'svelte';

	interface TemplatePhoto {
		_id: string;
		title?: any;
		storage?: {
			url?: string;
			thumbnailPath?: string;
			path?: string;
		};
		url?: string;
		dimensions?: {
			width: number;
			height: number;
		};
		size?: number;
	}

	export let photo: TemplatePhoto;
	export let alt: string;
	export let width: number;
	export let height: number;
	export let className = '';
	export let sizes: string | undefined = undefined;
	export let priority = false;
	export let loading: 'lazy' | 'eager' = 'lazy';
	export let fetchPriority: 'high' | 'low' | 'auto' = 'auto';
	export let style: string | undefined = undefined;
	export let onClick: (() => void) | undefined = undefined;
	export let useOptimalDimensions = true;

	let imageLoaded = false;
	let imageError = false;
	let optimalDimensions = { width, height };
	let loadStartTime = 0;

	$: if (useOptimalDimensions && photo.dimensions) {
		const { width: photoWidth, height: photoHeight } = photo.dimensions;
		const aspectRatio = photoWidth / photoHeight;
		const containerAspectRatio = width / height;

		let optimalWidth = width;
		let optimalHeight = height;

		if (aspectRatio > containerAspectRatio) {
			optimalHeight = Math.round(width / aspectRatio);
		} else {
			optimalWidth = Math.round(height * aspectRatio);
		}

		optimalDimensions = { width: optimalWidth, height: optimalHeight };
	} else {
		optimalDimensions = { width, height };
	}

	function generateBlurDataURL(w: number, h: number) {
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d');
		if (ctx) {
			const gradient = ctx.createLinearGradient(0, 0, w, h);
			gradient.addColorStop(0, '#f3f4f6');
			gradient.addColorStop(1, '#e5e7eb');
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, w, h);
		}
		return canvas.toDataURL('image/jpeg', 0.1);
	}

	let blurDataURL = '';

	$: blurDataURL = generateBlurDataURL(optimalDimensions.width, optimalDimensions.height);

	function handleImageLoad() {
		imageLoaded = true;
		// TODO: Track performance metrics if needed
	}

	function handleImageError() {
		imageError = true;
		imageLoaded = true;
	}

	function handleImageStart() {
		loadStartTime = performance.now();
	}

	$: imageSrc = photo.storage?.thumbnailPath || photo.storage?.url || photo.url || '/placeholder.jpg';
</script>

<div
	class="relative overflow-hidden {className}"
	style={style}
	on:click={onClick}
	role={onClick ? 'button' : undefined}
	tabindex={onClick ? 0 : undefined}
>
	<!-- Blur placeholder -->
	{#if !imageLoaded && !imageError && blurDataURL}
		<div class="absolute inset-0">
			<img
				src={blurDataURL}
				alt=""
				width={optimalDimensions.width}
				height={optimalDimensions.height}
				class="w-full h-full object-cover filter blur-sm scale-110"
				sizes={sizes}
				loading={priority ? 'eager' : 'lazy'}
				decoding="async"
				fetchpriority={fetchPriority}
			/>
		</div>
	{/if}

	<!-- Loading spinner -->
	{#if !imageLoaded && !imageError}
		<div class="absolute inset-0 flex items-center justify-center bg-gray-100">
			<div class="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
		</div>
	{/if}

	<!-- Main image -->
	<img
		src={imageSrc}
		alt={alt}
		width={optimalDimensions.width}
		height={optimalDimensions.height}
		class="w-full h-full object-cover transition-opacity duration-500 {imageLoaded
			? 'opacity-100'
			: 'opacity-0'}"
		sizes={sizes}
		loading={loading}
		fetchpriority={fetchPriority}
		decoding="async"
		on:load={handleImageLoad}
		on:error={handleImageError}
		on:loadstart={handleImageStart}
	/>

	<!-- Error fallback -->
	{#if imageError}
		<div class="absolute inset-0 flex items-center justify-center bg-gray-100">
			<div class="text-center text-gray-500">
				<svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<p class="text-sm">Failed to load</p>
			</div>
		</div>
	{/if}
</div>
