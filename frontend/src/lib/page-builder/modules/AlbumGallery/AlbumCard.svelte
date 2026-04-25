<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getAlbumName } from '$lib/utils/albumUtils';

	export let album: any;
	export let href: string = '#';
	export let coverUrl: string = '';
	export let coverAspectClass: string = 'pb-albumGallery__aspect pb-albumGallery__aspect--video';
	export let layout: 'stack' | 'row' = 'stack';
	export let cardFieldOrder: Array<'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge'> = [
		'cover',
		'title',
		'description',
		'photoCount',
		'featuredBadge'
	];
	export let showTitle = true;
	export let showCover = true;
	export let showDescription = true;
	export let descriptionLines = 2;
	export let showPhotoCount = true;
	export let showFeaturedBadge = true;
	/** Noir pack + stack layout: square card, `div.ac-ov`, `div.ac-info`, no `aspect-video` wrapper. */
	export let noirStackCard = false;

	$: isRowLayout = layout === 'row' && showCover;
	$: bodyFields = isRowLayout ? cardFieldOrder.filter((f) => f !== 'cover') : cardFieldOrder;
	$: noirInfoFields = cardFieldOrder.filter((f) => f !== 'cover');
</script>

{#snippet albumFields(fields: typeof cardFieldOrder, coverMb: boolean)}
	{#each fields as field}
		{#if field === 'title' && showTitle}
			<h3
				class="pb-albumCard__title {coverMb ? 'pb-albumCard__title--withMargin' : ''}"
			>
				{getAlbumName(album)}
			</h3>
		{:else if field === 'cover' && showCover}
			<div
				class="pb-albumCard__cover {coverAspectClass} {coverMb ? 'pb-albumCard__cover--withMargin' : ''}"
			>
				{#if coverUrl}
					<img src={coverUrl} alt={getAlbumName(album)} class="pb-albumCard__coverImage" />
				{:else}
					<div class="pb-albumCard__coverFallback">No cover</div>
				{/if}
			</div>
		{:else if field === 'description' && showDescription && album.description}
			<div class="pb-albumCard__description {coverMb ? 'pb-albumCard__description--withMargin' : ''}">
				<div
					class="pb-albumCard__descriptionProse"
					style="display:-webkit-box;-webkit-line-clamp:{descriptionLines};-webkit-box-orient:vertical;overflow:hidden;"
				>
					{@html (() => {
						if (typeof album.description === 'string') return album.description;
						const html = MultiLangUtils.getHTMLValue(album.description as Record<string, string>, $currentLanguage);
						if (html) return html;
						return MultiLangUtils.getTextValue(album.description as Record<string, string>, $currentLanguage) || '';
					})()}
				</div>
			</div>
		{:else if field === 'photoCount' && showPhotoCount}
			<div class="pb-albumCard__photoCount {coverMb ? 'pb-albumCard__photoCount--withMargin' : ''}">
				{album.photoCount || 0} photos
			</div>
		{:else if field === 'featuredBadge' && showFeaturedBadge && album.isFeatured}
			<div class="{coverMb ? 'pb-albumCard__badgeWrap--withMargin' : ''}">
				<span class="pb-albumCard__badge">
					⭐ Featured
				</span>
			</div>
		{/if}
	{/each}
{/snippet}

{#if isRowLayout}
	<a
		{href}
		class="pb-albumCard pb-albumCard--row"
	>
		<div class="pb-albumCard__rowMedia">
			<div class="{coverAspectClass} pb-albumCard__rowAspect">
				{#if coverUrl}
					<img src={coverUrl} alt={getAlbumName(album)} class="pb-albumCard__coverImage" />
				{:else}
					<div class="pb-albumCard__rowFallback">
						No cover
					</div>
				{/if}
			</div>
		</div>
		<div class="pb-albumCard__rowBody">
			{@render albumFields(bodyFields, false)}
		</div>
	</a>
{:else if noirStackCard}
	<a
		{href}
		class="ac pb-albumCard pb-albumCard--noirStack"
	>
		<div class="pb-albumCard__noirStackInner">
			{#if showCover}
				<div class="pb-albumCard__noirStackCover">
					{#if coverUrl}
						<img src={coverUrl} alt={getAlbumName(album)} class="pb-albumCard__coverImage" />
					{:else}
						<div class="pb-albumCard__noirStackFallback">
							No cover
						</div>
					{/if}
				</div>
			{/if}
			<div class="ac-ov pb-albumCard__noirStackOverlay" aria-hidden="true"></div>
			<div class="ac-info pb-albumCard__noirStackInfo">
				{#each noirInfoFields as field}
					{#if field === 'title' && showTitle}
						<h3 class="pb-albumCard__title pb-albumCard__title--noirStack">
							{getAlbumName(album)}
						</h3>
					{:else if field === 'description' && showDescription && album.description}
						<div class="pb-albumCard__description pb-albumCard__description--noirStack">
							<div
								class="pb-albumCard__descriptionProse"
								style="display:-webkit-box;-webkit-line-clamp:{descriptionLines};-webkit-box-orient:vertical;overflow:hidden;"
							>
								{@html (() => {
									if (typeof album.description === 'string') return album.description;
									const html = MultiLangUtils.getHTMLValue(
										album.description as Record<string, string>,
										$currentLanguage
									);
									if (html) return html;
									return (
										MultiLangUtils.getTextValue(album.description as Record<string, string>, $currentLanguage) ||
										''
									);
								})()}
							</div>
						</div>
					{:else if field === 'photoCount' && showPhotoCount}
						<div class="pb-albumCard__photoCount pb-albumCard__photoCount--noirStack">
							{album.photoCount || 0} photos
						</div>
					{:else if field === 'featuredBadge' && showFeaturedBadge && album.isFeatured}
						<div class="pb-albumCard__badgeWrap pb-albumCard__badgeWrap--noirStack">
							<span class="pb-albumCard__badge">
								⭐ Featured
							</span>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</a>
{:else}
	<a
		{href}
		class="pb-albumCard pb-albumCard--stack"
	>
		<div class="pb-albumCard__body">
			{@render albumFields(cardFieldOrder, true)}
		</div>
	</a>
{/if}

<style lang="scss">
	.pb-albumCard {
		display: block;
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		background: var(--tp-surface-1);
		border: 1px solid var(--tp-border);
		border-radius: 0.75rem;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		text-decoration: none;
	}
	.pb-albumCard:hover {
		box-shadow: 0 12px 40px color-mix(in srgb, var(--tp-fg) 12%, transparent);
	}
	.pb-albumCard--stack:hover {
		transform: translateY(-0.25rem);
	}
	.pb-albumCard--row {
		display: flex;
		flex-direction: row;
		align-items: stretch;
	}
	.pb-albumCard--noirStack {
		position: relative;
		aspect-ratio: 1 / 1;
		width: 100%;
		cursor: pointer;
		overflow: hidden;
	}
	.pb-albumCard__noirStackInner {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 0;
	}
	.pb-albumCard__noirStackCover {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		background: linear-gradient(to bottom, var(--tp-surface-2), var(--tp-surface-3));
	}
	.pb-albumCard__noirStackFallback {
		display: flex;
		height: 100%;
		align-items: center;
		justify-content: center;
		color: var(--tp-fg-subtle);
		font-size: 0.875rem;
	}
	.pb-albumCard__noirStackOverlay {
		pointer-events: none;
		position: absolute;
		inset: 0;
		z-index: 1;
	}
	.pb-albumCard__noirStackInfo {
		pointer-events: none;
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		z-index: 2;
	}
	.pb-albumCard__body {
		padding: 1rem;
	}
	@media (min-width: 640px) {
		.pb-albumCard__body {
			padding: 1.5rem;
		}
	}
	.pb-albumCard__title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--tp-fg);
		transition: color 0.2s ease;
		overflow-wrap: anywhere;
	}
	@media (min-width: 640px) {
		.pb-albumCard__title {
			font-size: 1.25rem;
		}
	}
	.pb-albumCard:hover .pb-albumCard__title {
		color: var(--os-primary);
	}
	.pb-albumCard__title--withMargin { margin-bottom: 0.75rem; }
	.pb-albumCard__title--noirStack {
		margin: 0;
	}
	.pb-albumCard__cover {
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: linear-gradient(to bottom, var(--tp-surface-2), var(--tp-surface-3));
	}
	.pb-albumCard__cover--withMargin { margin-bottom: 0.75rem; }
	.pb-albumCard__coverImage {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.pb-albumCard__coverFallback {
		color: var(--tp-fg-subtle);
		font-size: 1.25rem;
	}
	.pb-albumCard__description {
		color: var(--tp-fg-muted);
		font-size: 0.875rem;
	}
	.pb-albumCard__description--withMargin { margin-bottom: 0.75rem; }
	.pb-albumCard__description--noirStack {
		margin-top: 0.5rem;
	}
	.pb-albumCard__descriptionProse { max-width: none; }
	.pb-albumCard__photoCount {
		font-size: 0.875rem;
		color: var(--tp-fg-subtle);
	}
	.pb-albumCard__photoCount--withMargin { margin-bottom: 0.5rem; }
	.pb-albumCard__photoCount--noirStack { margin-top: 0.25rem; }
	.pb-albumCard__badgeWrap--withMargin { margin-bottom: 0.5rem; }
	.pb-albumCard__badgeWrap--noirStack { margin-top: 0.5rem; }
	.pb-albumCard__badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		background: color-mix(in srgb, var(--os-primary) 22%, var(--tp-surface-2));
		color: var(--tp-fg);
	}
	.pb-albumCard__rowMedia {
		flex-shrink: 0;
		width: min(40%, 240px);
		border-inline-end: 1px solid var(--tp-border);
		background: linear-gradient(to bottom, var(--tp-surface-2), var(--tp-surface-3));
	}
	@media (min-width: 640px) { .pb-albumCard__rowMedia { width: 11rem; } }
	@media (min-width: 768px) { .pb-albumCard__rowMedia { width: 13rem; } }
	.pb-albumCard__rowAspect {
		height: 100%;
		width: 100%;
		min-height: 7.5rem;
	}
	.pb-albumCard__rowFallback {
		display: flex;
		height: 100%;
		min-height: 7.5rem;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		color: var(--tp-fg-subtle);
	}
	.pb-albumCard__rowBody {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		justify-content: center;
		gap: 0.25rem;
		padding: 1rem;
	}
	@media (min-width: 640px) {
		.pb-albumCard__rowBody {
			padding: 1.5rem;
		}
	}
</style>
