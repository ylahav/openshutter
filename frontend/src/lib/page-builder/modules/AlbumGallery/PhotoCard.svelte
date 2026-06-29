<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getPhotoUrl } from '$lib/utils/photoUrl';

	let {
		photo,
		coverAspectClass = 'pb-albumGallery__aspect pb-albumGallery__aspect--video',
		cardFieldOrder = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'] as Array<
			'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge'
		>,
		showTitle = true,
		showCover = true,
		showDescription = true,
		descriptionLines = 2,
		showFeaturedBadge = true,
		presentation = 'full' as 'full' | 'tile' | 'masonry',
		captionPlacement = 'none' as 'overlay' | 'below' | 'none',
		onopen
	}: {
		photo: any;
		coverAspectClass?: string;
		cardFieldOrder?: Array<'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge'>;
		showTitle?: boolean;
		showCover?: boolean;
		showDescription?: boolean;
		descriptionLines?: number;
		showFeaturedBadge?: boolean;
		presentation?: 'full' | 'tile' | 'masonry';
		captionPlacement?: 'overlay' | 'below' | 'none';
		onopen?: () => void;
	} = $props();

	function resolveTitle(v: unknown): string {
		if (typeof v === 'string') return v;
		if (v && typeof v === 'object')
			return MultiLangUtils.getTextValue(v as Record<string, string>, $currentLanguage) || '';
		return '';
	}

	function resolveDescriptionHtml(v: unknown): string {
		if (typeof v === 'string') return v;
		if (v && typeof v === 'object') {
			const html = MultiLangUtils.getHTMLValue(v as Record<string, string>, $currentLanguage);
			if (html) return html;
			return MultiLangUtils.getTextValue(v as Record<string, string>, $currentLanguage) || '';
		}
		return '';
	}

	const photoTitle = $derived(
		resolveTitle(photo?.title) ||
			resolveTitle(photo?.name) ||
			(typeof photo?.originalName === 'string' ? photo.originalName : '') ||
			(typeof photo?.filename === 'string' ? photo.filename : '') ||
			'Photo'
	);

	const photoUrl = $derived(
		(typeof photo?.coverUrl === 'string' && photo.coverUrl) ||
			(typeof photo?.thumbnailUrl === 'string' && photo.thumbnailUrl) ||
			(typeof photo?.previewUrl === 'string' && photo.previewUrl) ||
			(typeof photo?.url === 'string' && photo.url) ||
			(typeof photo?.imageUrl === 'string' && photo.imageUrl) ||
			getPhotoUrl(photo ?? {}, { preferThumbnail: true, fallback: '' })
	);

	const captionTitle = $derived(
		cardFieldOrder.includes('title') && showTitle ? photoTitle : ''
	);
	const captionDescriptionHtml = $derived(
		cardFieldOrder.includes('description') && showDescription && photo?.description
			? resolveDescriptionHtml(photo.description)
			: ''
	);
	const captionDescriptionText = $derived(
		captionDescriptionHtml.replace(/<[^>]*>/g, '').trim()
	);
	const hasCaption = $derived(
		captionPlacement !== 'none' &&
			(Boolean(captionTitle) || Boolean(captionDescriptionText))
	);

	function handleOpen() {
		onopen?.();
	}
</script>

{#if presentation === 'tile'}
	<button
		type="button"
		onclick={handleOpen}
		class={`pb-photoCard pb-photoCard--tile${hasCaption && captionPlacement === 'overlay' ? ' pb-photoCard--overlayCap' : ''}${hasCaption && captionPlacement === 'below' ? ' pb-photoCard--belowCap' : ''}`}
		aria-label={photoTitle}
	>
		<div class="pb-photoCard__tileFrame {coverAspectClass}">
			{#if photoUrl}
				<img src={photoUrl} alt="" class="pb-photoCard__tileImg" />
			{:else}
				<div class="pb-photoCard__tileFallback">No image</div>
			{/if}
			{#if hasCaption && captionPlacement === 'overlay'}
				<div class="pb-photoCard__caption pb-photoCard__caption--overlay">
					{#if captionTitle}
						<span class="pb-photoCard__captionTitle">{captionTitle}</span>
					{/if}
					{#if captionDescriptionText}
						<span
							class="pb-photoCard__captionDesc"
							style="-webkit-line-clamp:{descriptionLines};line-clamp:{descriptionLines}"
						>{@html captionDescriptionHtml}</span>
					{/if}
				</div>
			{/if}
		</div>
		{#if hasCaption && captionPlacement === 'below'}
			<div class="pb-photoCard__caption pb-photoCard__caption--below">
				{#if captionTitle}
					<span class="pb-photoCard__captionTitle">{captionTitle}</span>
				{/if}
				{#if captionDescriptionText}
					<span
						class="pb-photoCard__captionDesc"
						style="-webkit-line-clamp:{descriptionLines};line-clamp:{descriptionLines}"
					>{@html captionDescriptionHtml}</span>
				{/if}
			</div>
		{/if}
	</button>
{:else if presentation === 'masonry'}
	<button
		type="button"
		onclick={handleOpen}
		class={`pb-photoCard pb-photoCard--masonry${hasCaption && captionPlacement === 'overlay' ? ' pb-photoCard--overlayCap' : ''}${hasCaption && captionPlacement === 'below' ? ' pb-photoCard--belowCap' : ''}`}
		aria-label={photoTitle}
	>
		{#if photoUrl}
			<img src={photoUrl} alt="" class="pb-photoCard__masonryImg" />
		{:else}
			<div class="pb-photoCard__masonryFallback">No image</div>
		{/if}
		{#if hasCaption && captionPlacement === 'overlay'}
			<div class="pb-photoCard__caption pb-photoCard__caption--overlay">
				{#if captionTitle}
					<span class="pb-photoCard__captionTitle">{captionTitle}</span>
				{/if}
				{#if captionDescriptionText}
					<span
						class="pb-photoCard__captionDesc"
						style="-webkit-line-clamp:{descriptionLines};line-clamp:{descriptionLines}"
					>{@html captionDescriptionHtml}</span>
				{/if}
			</div>
		{/if}
		{#if hasCaption && captionPlacement === 'below'}
			<div class="pb-photoCard__caption pb-photoCard__caption--below">
				{#if captionTitle}
					<span class="pb-photoCard__captionTitle">{captionTitle}</span>
				{/if}
				{#if captionDescriptionText}
					<span
						class="pb-photoCard__captionDesc"
						style="-webkit-line-clamp:{descriptionLines};line-clamp:{descriptionLines}"
					>{@html captionDescriptionHtml}</span>
				{/if}
			</div>
		{/if}
	</button>
{:else}
	<button type="button" onclick={handleOpen} class="pb-photoCard">
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
