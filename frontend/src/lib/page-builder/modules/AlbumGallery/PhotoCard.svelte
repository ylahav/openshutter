<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getPhotoUrl } from '$lib/utils/photoUrl';

	const dispatch = createEventDispatcher<{ open: undefined }>();

	export let photo: any;
	export let coverAspectClass: string = 'pb-albumGallery__aspect pb-albumGallery__aspect--video';
	export let cardFieldOrder: Array<'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge'> = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
	export let showTitle = true;
	export let showCover = true;
	export let showDescription = true;
	export let descriptionLines = 2;
	export let showFeaturedBadge = true;

	function resolveTitle(v: unknown): string {
		if (typeof v === 'string') return v;
		if (v && typeof v === 'object') return MultiLangUtils.getTextValue(v as Record<string, string>, $currentLanguage) || '';
		return '';
	}

	$: photoTitle =
		resolveTitle(photo?.title) ||
		resolveTitle(photo?.name) ||
		(typeof photo?.originalName === 'string' ? photo.originalName : '') ||
		(typeof photo?.filename === 'string' ? photo.filename : '') ||
		'Photo';

	$: photoUrl =
		(typeof photo?.coverUrl === 'string' && photo.coverUrl) ||
		(typeof photo?.thumbnailUrl === 'string' && photo.thumbnailUrl) ||
		(typeof photo?.previewUrl === 'string' && photo.previewUrl) ||
		(typeof photo?.url === 'string' && photo.url) ||
		(typeof photo?.imageUrl === 'string' && photo.imageUrl) ||
		getPhotoUrl(photo ?? {}, { preferThumbnail: true, fallback: '' });
</script>

<button
	type="button"
	on:click={() => dispatch('open')}
	class="pb-photoCard"
>
	<div class="pb-photoCard__body">
		{#each cardFieldOrder as field}
			{#if field === 'title' && showTitle}
				<h3 class="pb-photoCard__title">
					{photoTitle}
				</h3>
			{:else if field === 'cover' && showCover}
				<div class="pb-photoCard__cover {coverAspectClass}">
					{#if photoUrl}
						<img src={photoUrl} alt={photoTitle} class="pb-photoCard__coverImage" />
					{:else}
						<div class="pb-photoCard__coverFallback">No image</div>
					{/if}
				</div>
			{:else if field === 'description' && showDescription && photo?.description}
				<div class="pb-photoCard__description">
					<div
						class="pb-photoCard__descriptionProse"
						style="display:-webkit-box;-webkit-line-clamp:{descriptionLines};-webkit-box-orient:vertical;overflow:hidden;"
					>
						{@html (() => {
							if (typeof photo.description === 'string') return photo.description;
							const html = MultiLangUtils.getHTMLValue(photo.description as Record<string, string>, $currentLanguage);
							if (html) return html;
							return MultiLangUtils.getTextValue(photo.description as Record<string, string>, $currentLanguage) || '';
						})()}
					</div>
				</div>
			{:else if field === 'featuredBadge' && showFeaturedBadge && photo?.isFeatured}
				<div class="pb-photoCard__badgeWrap">
					<span class="pb-photoCard__badge">
						⭐ Featured
					</span>
				</div>
			{/if}
		{/each}
	</div>
</button>

<style lang="scss">
	.pb-photoCard {
		width: 100%;
		min-width: 0;
		max-width: 100%;
		text-align: left;
		background: var(--tp-surface-1);
		border: 1px solid var(--tp-border);
		border-radius: 0.75rem;
		overflow: hidden;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
	}
	.pb-photoCard:hover {
		transform: translateY(-0.25rem);
		box-shadow: 0 12px 40px color-mix(in srgb, var(--tp-fg) 12%, transparent);
	}
	.pb-photoCard:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--os-primary) 45%, transparent);
	}
	.pb-photoCard__body {
		padding: 1rem;
	}
	@media (min-width: 640px) {
		.pb-photoCard__body {
			padding: 1.5rem;
		}
	}
	.pb-photoCard__title {
		margin: 0 0 0.75rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--tp-fg);
		transition: color 0.2s ease;
		overflow-wrap: anywhere;
	}
	@media (min-width: 640px) {
		.pb-photoCard__title {
			font-size: 1.25rem;
		}
	}
	.pb-photoCard:hover .pb-photoCard__title {
		color: var(--os-primary);
	}
	.pb-photoCard__cover {
		margin-bottom: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: linear-gradient(to bottom, var(--tp-surface-2), var(--tp-surface-3));
	}
	.pb-photoCard__coverImage {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.pb-photoCard__coverFallback {
		font-size: 1.25rem;
		color: var(--tp-fg-subtle);
	}
	.pb-photoCard__description {
		margin-bottom: 0.75rem;
		font-size: 0.875rem;
		color: var(--tp-fg-muted);
	}
	.pb-photoCard__descriptionProse {
		max-width: none;
	}
	.pb-photoCard__badgeWrap {
		margin-bottom: 0.5rem;
	}
	.pb-photoCard__badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		background: color-mix(in srgb, var(--os-primary) 22%, var(--tp-surface-2));
		color: var(--tp-fg);
	}
</style>
