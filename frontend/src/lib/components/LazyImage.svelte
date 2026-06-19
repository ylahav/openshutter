<script lang="ts">
	import { onMount } from 'svelte';

	let {
		src: string,
		alt: string,
		width = undefined,
		height = undefined,
		className = $bindable(''),
		imageClassName = $bindable(''),
		priority = $bindable(false),
		sizes = undefined,
		style = undefined,
		fill = $bindable(false),
		quality = $bindable(75),
		placeholder = 'empty',
		blurDataURL = undefined,
		fetchPriority = 'auto',
		loading = undefined,
		unoptimized = $bindable(false)
	}: {
		src: string;
		alt: string;
		width?: number | undefined;
		height?: number | undefined;
		className?: unknown;
		imageClassName?: unknown;
		priority?: unknown;
		sizes?: string | undefined;
		style?: string | undefined;
		fill?: unknown;
		quality?: unknown;
		placeholder?: 'blur' | 'empty';
		blurDataURL?: string | undefined;
		fetchPriority?: 'high' | 'low' | 'auto';
		loading?: 'eager' | 'lazy' | undefined;
		unoptimized?: unknown;
	} = $props();

	let isLoaded = $state(false);
	let isInView = $state(priority);
	let imgRef: HTMLDivElement | null = null;

	onMount(() => {
		if (priority) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					isInView = true;
					observer.disconnect();
				}
			},
			{
				threshold: 0.1,
				rootMargin: '50px'
			}
		);

		if (imgRef) {
			observer.observe(imgRef);
		}

		return () => observer.disconnect();
	});

	function handleLoad() {
		isLoaded = true;
	}
</script>

<div bind:this={imgRef} class="relative {className}" style={style}>
	{#if !isInView}
		<div class="bg-gray-200 animate-pulse rounded flex items-center justify-center">
			{#if width && height}
				<div style="width: {width}px; height: {height}px;" class="flex items-center justify-center">
					<svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{:else}
				<div class="w-full h-full flex items-center justify-center">
					<svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{/if}
		</div>
	{:else}
		<img
			src={src}
			alt={alt}
			width={width}
			height={height}
			sizes={sizes}
			loading={loading ?? (priority ? 'eager' : 'lazy')}
			fetchpriority={fetchPriority}
			decoding="async"
			onload={handleLoad}
			class="transition-opacity duration-300 {isLoaded ? 'opacity-100' : 'opacity-0'} {imageClassName} {fill
				? 'absolute inset-0 w-full h-full object-cover'
				: ''}"
		/>
	{/if}
</div>
