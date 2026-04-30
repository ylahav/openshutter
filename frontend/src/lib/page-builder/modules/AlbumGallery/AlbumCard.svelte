<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import type { AlbumCardVisualVariant } from './card-layout';

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
		'featuredBadge',
	];
	export let showTitle = true;
	export let showCover = true;
	export let showDescription = true;
	export let descriptionLines = 2;
	export let showPhotoCount = true;
	export let showFeaturedBadge = true;
	/** Visual preset (see AlbumGallery `albumCard` / `albumCardVariant`). */
	export let variant: AlbumCardVisualVariant = 'roundedCard';
	/** 1-based index for editorial list rows (01, 02, …). */
	export let editorialIndex: number | undefined = undefined;
	/** @deprecated use `variant="bareSquare"` */
	export let noirStackCard = false;

	$: effectiveVariant = (noirStackCard ? 'bareSquare' : variant) as AlbumCardVisualVariant;

	$: isSimpleRowLayout = effectiveVariant === 'roundedCard' && layout === 'row';

	$: bodyFieldsRow = isSimpleRowLayout ? cardFieldOrder.filter((f) => f !== 'cover') : cardFieldOrder;
	$: overlayFields = cardFieldOrder.filter((f) => f !== 'cover');

	$: photoCountLabel = (() => {
		const n = Number(album?.photoCount) || 0;
		return `${n} ${n === 1 ? 'photograph' : 'photographs'}`;
	})();
</script>

{#snippet albumFields(fields: typeof cardFieldOrder, coverMb: boolean)}
	{#each fields as field}
		{#if field === 'title' && showTitle}
			<h3 class="pb-albumCard__title {coverMb ? 'pb-albumCard__title--withMargin' : ''}">
				{getAlbumName(album)}
			</h3>
		{:else if field === 'cover' && showCover}
			<div class="pb-albumCard__cover {coverAspectClass} {coverMb ? 'pb-albumCard__cover--withMargin' : ''}">
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
				<span class="pb-albumCard__badge">⭐ Featured</span>
			</div>
		{/if}
	{/each}
{/snippet}

{#if effectiveVariant === 'compactList'}
	<a {href} class="pb-albumCard pb-albumCard--compact">
		{#if showCover}
			<div class="pb-albumCard__compactThumb">
				{#if coverUrl}
					<img src={coverUrl} alt="" class="pb-albumCard__compactImg" />
				{:else}
					<div class="pb-albumCard__compactFallback"></div>
				{/if}
			</div>
		{/if}
		<div class="pb-albumCard__compactBody">
			{#if showTitle}
				<h3 class="pb-albumCard__compactTitle">{getAlbumName(album)}</h3>
			{/if}
			{#if showPhotoCount}
				<span class="pb-albumCard__compactMeta">{album.photoCount || 0} photos</span>
			{/if}
		</div>
	</a>
{:else if effectiveVariant === 'bareSquare'}
	<a {href} class="ac pb-albumCard pb-albumCard--noirStack">
		<div class="pb-albumCard__noirStackInner">
			{#if showCover}
				<div class="pb-albumCard__noirStackCover">
					{#if coverUrl}
						<img src={coverUrl} alt={getAlbumName(album)} class="pb-albumCard__coverImage" />
					{:else}
						<div class="pb-albumCard__noirStackFallback">No cover</div>
					{/if}
				</div>
			{/if}
			<div class="ac-ov pb-albumCard__noirStackOverlay" aria-hidden="true"></div>
			<div class="ac-info pb-albumCard__noirStackInfo">
				{#each overlayFields as field}
					{#if field === 'title' && showTitle}
						<h3 class="pb-albumCard__title pb-albumCard__title--noirStack">{getAlbumName(album)}</h3>
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
							<span class="pb-albumCard__badge">⭐ Featured</span>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</a>
{:else if effectiveVariant === 'portraitGrid'}
	<a {href} class="ac pb-albumCard pb-albumCard--portraitGrid">
		<div class="pb-albumCard__portraitInner">
			{#if showCover}
				<div class="pb-albumCard__portraitCover">
					{#if coverUrl}
						<img src={coverUrl} alt={getAlbumName(album)} class="pb-albumCard__coverImage" />
					{:else}
						<div class="pb-albumCard__portraitFallback">No cover</div>
					{/if}
				</div>
			{/if}
			<div class="pb-albumCard__portraitOverlay" aria-hidden="true"></div>
			<div class="pb-albumCard__portraitInfo">
				{#each overlayFields as field}
					{#if field === 'title' && showTitle}
						<h3 class="pb-albumCard__portraitTitle">{getAlbumName(album)}</h3>
					{:else if field === 'photoCount' && showPhotoCount}
						<div class="pb-albumCard__portraitMeta">{album.photoCount || 0} photos</div>
					{/if}
				{/each}
			</div>
		</div>
	</a>
{:else if effectiveVariant === 'permanentOverlay'}
	<a {href} class="ac ac--permanent pb-albumCard pb-albumCard--permanentOverlay">
		<div class="pb-albumCard__permanentInner">
			{#if showCover}
				<div class="pb-albumCard__permanentCover">
					{#if coverUrl}
						<img src={coverUrl} alt={getAlbumName(album)} class="pb-albumCard__coverImage" />
					{:else}
						<div class="pb-albumCard__permanentFallback">No cover</div>
					{/if}
				</div>
			{/if}
			<div class="ac-ov ac-ov--always pb-albumCard__permanentShade" aria-hidden="true"></div>
			{#if showPhotoCount}
				<span class="ac-badge pb-albumCard__permanentCountBadge">{album.photoCount ?? 0}</span>
			{:else if showFeaturedBadge && album.isFeatured}
				<span class="pb-albumCard__permanentStarBadge">★</span>
			{/if}
			<div class="ac-info ac-info--always pb-albumCard__permanentInfo">
				{#each overlayFields.filter((f) => !(f === 'photoCount' && showPhotoCount)) as field}
					{#if field === 'title' && showTitle}
						<h3 class="pb-albumCard__permanentTitle">{getAlbumName(album)}</h3>
					{:else if field === 'photoCount' && showPhotoCount}
						<div class="pb-albumCard__permanentMeta">{album.photoCount || 0} photos</div>
					{:else if field === 'description' && showDescription && album.description}
						<div class="pb-albumCard__permanentDesc">
							{MultiLangUtils.getTextValue(album.description as Record<string, string>, $currentLanguage) ||
								''}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</a>
{:else if effectiveVariant === 'editorialList'}
	<a {href} class="pb-albumCard pb-albumCard--editorial">
		<div class="pb-albumCard__editorialThumb">
			<div class="{coverAspectClass} pb-albumCard__editorialAspect">
				{#if coverUrl}
					<img src={coverUrl} alt="" class="pb-albumCard__coverImage" />
				{:else}
					<div class="pb-albumCard__rowFallback">No cover</div>
				{/if}
			</div>
		</div>
		<div class="pb-albumCard__editorialMain">
			{#if editorialIndex != null}
				<span class="pb-albumCard__editorialNum">{String(editorialIndex).padStart(2, '0')}</span>
			{/if}
			{#if showTitle}
				<h3 class="pb-albumCard__editorialTitle">{getAlbumName(album)}</h3>
			{/if}
			{#if showDescription && album.description}
				<div
					class="pb-albumCard__editorialDesc"
					style="display:-webkit-box;-webkit-line-clamp:{descriptionLines};-webkit-box-orient:vertical;overflow:hidden;"
				>
					{@html (() => {
						if (typeof album.description === 'string') return album.description;
						const html = MultiLangUtils.getHTMLValue(album.description as Record<string, string>, $currentLanguage);
						if (html) return html;
						return MultiLangUtils.getTextValue(album.description as Record<string, string>, $currentLanguage) || '';
					})()}
				</div>
			{/if}
		</div>
		<div class="pb-albumCard__editorialAside">
			{#if showPhotoCount}
				<span class="pb-albumCard__editorialCountLabel">{photoCountLabel}</span>
			{/if}
		</div>
	</a>
{:else if effectiveVariant === 'roundedCard' && layout === 'stack'}
	<a {href} class="pb-albumCard pb-albumCard--stack pb-albumCard--roundedStack">
		<div class="pb-albumCard__roundedThumb">
			<div class="{coverAspectClass} pb-albumCard__roundedAspect">
				{#if showCover && coverUrl}
					<img src={coverUrl} alt={getAlbumName(album)} class="pb-albumCard__coverImage" />
				{:else if showCover}
					<div class="pb-albumCard__coverFallback">No cover</div>
				{/if}
				{#if showPhotoCount}
					<span class="pb-albumCard__thumbBadge">{album.photoCount || 0} photos</span>
				{/if}
			</div>
		</div>
		<div class="pb-albumCard__body pb-albumCard__roundedBody">
			{#each cardFieldOrder.filter((f) => f !== 'cover' && f !== 'photoCount') as field}
				{#if field === 'title' && showTitle}
					<h3 class="pb-albumCard__title pb-albumCard__title--withMargin">{getAlbumName(album)}</h3>
				{:else if field === 'description' && showDescription && album.description}
					<div class="pb-albumCard__description pb-albumCard__description--withMargin">
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
				{:else if field === 'featuredBadge' && showFeaturedBadge && album.isFeatured}
					<div class="pb-albumCard__badgeWrap--withMargin">
						<span class="pb-albumCard__badge">⭐ Featured</span>
					</div>
				{/if}
			{/each}
		</div>
	</a>
{:else if isSimpleRowLayout}
	<a {href} class="pb-albumCard pb-albumCard--row">
		<div class="pb-albumCard__rowMedia">
			<div class="{coverAspectClass} pb-albumCard__rowAspect">
				{#if coverUrl}
					<img src={coverUrl} alt={getAlbumName(album)} class="pb-albumCard__coverImage" />
				{:else}
					<div class="pb-albumCard__rowFallback">No cover</div>
				{/if}
			</div>
		</div>
		<div class="pb-albumCard__rowBody">
			{@render albumFields(bodyFieldsRow, false)}
		</div>
	</a>
{:else}
	<a {href} class="pb-albumCard pb-albumCard--stack">
		<div class="pb-albumCard__body">
			{@render albumFields(cardFieldOrder, true)}
		</div>
	</a>
{/if}
