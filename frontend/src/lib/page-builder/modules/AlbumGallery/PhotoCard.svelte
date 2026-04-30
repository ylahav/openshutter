<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getPhotoUrl } from '$lib/utils/photoUrl';

	const dispatch = createEventDispatcher<{ open: undefined }>();

	export let photo: any;
	export let coverAspectClass: string = 'pb-albumGallery__aspect pb-albumGallery__aspect--video';
	export let cardFieldOrder: Array<'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge'> = [
		'cover',
		'title',
		'description',
		'photoCount',
		'featuredBadge',
	];
	export let showTitle = true;
	export let showCover = true;
	export let showDescription = true;
	export let descriptionLines = 2;
	export let showFeaturedBadge = true;
	/** `tile` = cropped cell; `masonry` = natural image height; `full` = titled card. */
	export let presentation: 'full' | 'tile' | 'masonry' = 'full';

	function resolveTitle(v: unknown): string {
		if (typeof v === 'string') return v;
		if (v && typeof v === 'object')
			return MultiLangUtils.getTextValue(v as Record<string, string>, $currentLanguage) || '';
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

{#if presentation === 'tile'}
	<button
		type="button"
		on:click={() => dispatch('open')}
		class="pb-photoCard pb-photoCard--tile"
		aria-label={photoTitle}
	>
		<div class="pb-photoCard__tileFrame {coverAspectClass}">
			{#if photoUrl}
				<img src={photoUrl} alt="" class="pb-photoCard__tileImg" />
			{:else}
				<div class="pb-photoCard__tileFallback">No image</div>
			{/if}
		</div>
	</button>
{:else if presentation === 'masonry'}
	<button
		type="button"
		on:click={() => dispatch('open')}
		class="pb-photoCard pb-photoCard--masonry"
		aria-label={photoTitle}
	>
		{#if photoUrl}
			<img src={photoUrl} alt="" class="pb-photoCard__masonryImg" />
		{:else}
			<div class="pb-photoCard__masonryFallback">No image</div>
		{/if}
	</button>
{:else}
	<button type="button" on:click={() => dispatch('open')} class="pb-photoCard">
		<div class="pb-photoCard__body">
			{#each cardFieldOrder as field}
				{#if field === 'title' && showTitle}
					<h3 class="pb-photoCard__title">{photoTitle}</h3>
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
								const html = MultiLangUtils.getHTMLValue(
									photo.description as Record<string, string>,
									$currentLanguage
								);
								if (html) return html;
								return (
									MultiLangUtils.getTextValue(photo.description as Record<string, string>, $currentLanguage) ||
									''
								);
							})()}
						</div>
					</div>
				{:else if field === 'featuredBadge' && showFeaturedBadge && photo?.isFeatured}
					<div class="pb-photoCard__badgeWrap">
						<span class="pb-photoCard__badge">⭐ Featured</span>
					</div>
				{/if}
			{/each}
		</div>
	</button>
{/if}
