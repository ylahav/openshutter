<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getAlbumName } from '$lib/utils/albumUtils';

	export let album: any;
	export let href: string = '#';
	export let coverUrl: string = '';
	export let coverAspectClass: string = 'aspect-video';
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

	$: isRowLayout = layout === 'row' && showCover;
	$: bodyFields = isRowLayout ? cardFieldOrder.filter((f) => f !== 'cover') : cardFieldOrder;
</script>

{#snippet albumFields(fields: typeof cardFieldOrder, coverMb: boolean)}
	{#each fields as field}
		{#if field === 'title' && showTitle}
			<h3
				class="text-lg @sm:text-xl font-semibold text-[color:var(--tp-fg)] {coverMb
					? 'mb-3'
					: ''} group-hover:text-[color:var(--os-primary)] transition-colors break-words"
			>
				{getAlbumName(album)}
			</h3>
		{:else if field === 'cover' && showCover}
			<div
				class="{coverAspectClass} {coverMb ? 'mb-3' : ''} bg-linear-to-b from-[color:var(--tp-surface-2)] to-[color:var(--tp-surface-3)] flex items-center justify-center overflow-hidden"
			>
				{#if coverUrl}
					<img src={coverUrl} alt={getAlbumName(album)} class="w-full h-full object-cover" />
				{:else}
					<div class="text-[color:var(--tp-fg-subtle)] text-xl">No cover</div>
				{/if}
			</div>
		{:else if field === 'description' && showDescription && album.description}
			<div class="text-[color:var(--tp-fg-muted)] text-sm {coverMb ? 'mb-3' : ''}">
				<div
					class="prose prose-sm max-w-none"
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
			<div class="text-sm text-[color:var(--tp-fg-subtle)] {coverMb ? 'mb-2' : ''}">
				{album.photoCount || 0} photos
			</div>
		{:else if field === 'featuredBadge' && showFeaturedBadge && album.isFeatured}
			<div class="{coverMb ? 'mb-2' : ''}">
				<span
					class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[color:color-mix(in_srgb,var(--os-primary)_22%,var(--tp-surface-2))] text-[color:var(--tp-fg)]"
				>
					⭐ Featured
				</span>
			</div>
		{/if}
	{/each}
{/snippet}

{#if isRowLayout}
	<a
		{href}
		class="group flex min-w-0 max-w-full flex-row items-stretch overflow-hidden rounded-xl border border-[color:var(--tp-border)] bg-[color:var(--tp-surface-1)] transition-all duration-300 hover:shadow-[0_12px_40px_color-mix(in_srgb,var(--tp-fg)_12%,transparent)]"
	>
		<div
			class="shrink-0 border-r border-[color:var(--tp-border)] bg-linear-to-b from-[color:var(--tp-surface-2)] to-[color:var(--tp-surface-3)] w-[min(40%,240px)] sm:w-44 md:w-52"
		>
			<div class="{coverAspectClass} h-full w-full min-h-[7.5rem]">
				{#if coverUrl}
					<img src={coverUrl} alt={getAlbumName(album)} class="h-full w-full object-cover" />
				{:else}
					<div class="flex h-full min-h-[7.5rem] items-center justify-center text-[color:var(--tp-fg-subtle)] text-sm">
						No cover
					</div>
				{/if}
			</div>
		</div>
		<div
			class="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4 @sm:p-6"
		>
			{@render albumFields(bodyFields, false)}
		</div>
	</a>
{:else}
	<a
		{href}
		class="group block min-w-0 max-w-full overflow-hidden rounded-xl border border-[color:var(--tp-border)] bg-[color:var(--tp-surface-1)] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_12px_40px_color-mix(in_srgb,var(--tp-fg)_12%,transparent)]"
	>
		<div class="p-4 @sm:p-6">
			{@render albumFields(cardFieldOrder, true)}
		</div>
	</a>
{/if}
