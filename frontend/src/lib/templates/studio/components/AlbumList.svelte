<script lang="ts">
	import AlbumCard from './AlbumCard.svelte';
	import { t } from '$stores/i18n';

	interface TemplateAlbum {
		_id: string;
		name?: any;
		description?: any;
		alias?: string;
		isFeatured?: boolean;
		photoCount?: number;
	}

	export let albums: TemplateAlbum[] = [];
	export let loading = false;
	export let error: string | null = null;
	export let pageContext: 'home' | 'gallery' = 'home';

	$: filteredAlbums = albums;
</script>

{#if loading}
	<div class="py-16 px-7">
		<div class="text-center">
			<div
				class="w-9 h-9 rounded-full animate-spin mx-auto border-2 border-[color:var(--tp-border)] border-t-[color:var(--os-primary)]"
			></div>
			<p class="mt-4 text-[13px] font-medium" style="color: var(--tp-fg-muted);">
				{$t('loading.loading')}
			</p>
		</div>
	</div>
{:else if error}
	<div class="py-16 px-7">
		<p class="text-center text-sm text-red-500/90">{error}</p>
	</div>
{:else}
	<div class="max-w-[var(--os-max-width)] mx-auto px-7 py-12">
		<div class="flex flex-wrap items-end justify-between gap-4 mb-6">
			<div>
				<h2 class="text-[22px] font-bold tracking-tight" style="font-family: var(--os-font-heading); color: var(--tp-fg);">
					{pageContext === 'gallery' ? $t('navigation.albums') : $t('admin.featuredAlbums')}
				</h2>
				<p class="text-[13px] mt-1" style="color: var(--tp-fg-muted);">
					{pageContext === 'gallery'
						? $t('albums.browsePhotoCollections')
						: $t('albums.rootLevelAlbumsDescription')}
				</p>
			</div>
			{#if pageContext !== 'gallery'}
				<a
					href="/albums"
					class="text-[13px] font-medium no-underline transition-opacity hover:opacity-80"
					style="color: var(--os-primary);"
				>
					{$t('hero.browseAllAlbums')} →
				</a>
			{/if}
		</div>

		{#if filteredAlbums.length > 0}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each filteredAlbums as album, i}
					<AlbumCard {album} fadeIndex={i} />
				{/each}
			</div>
		{:else}
			<p class="text-[13px] text-center py-16" style="color: var(--tp-fg-muted);">
				{$t('albums.noAlbumsText')}
			</p>
		{/if}
	</div>
{/if}
