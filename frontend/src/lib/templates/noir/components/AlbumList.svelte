<script lang="ts">
	import AlbumCard from './AlbumCard.svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
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

	$: filteredAlbums = albums;
	$: countLabel = filteredAlbums.length === 1 ? '1 collection' : `${filteredAlbums.length} collections`;
</script>

{#if loading}
	<div class="py-16 px-8">
		<div class="text-center">
			<div
				class="w-8 h-8 rounded-full animate-spin mx-auto border border-[color:color-mix(in_srgb,var(--tp-fg)_18%,transparent)] border-t-[color:var(--tp-fg)]"
			></div>
			<p
				class="mt-4 text-[10px] uppercase tracking-[0.2em] transition-colors"
				style="font-family: var(--os-font-body); color: var(--tp-fg-muted);"
			>
				{$t('loading.loading')}
			</p>
		</div>
	</div>
{:else if error}
	<div class="py-16 px-8">
		<p class="text-center text-sm text-red-400/90" style="font-family: var(--os-font-body);">{error}</p>
	</div>
{:else}
	<div class="section-header flex items-baseline justify-between px-8 pt-12 pb-4">
		<span
			class="text-[9px] uppercase tracking-[0.28em] transition-colors"
			style="font-family: var(--os-font-body); color: var(--tp-fg-muted);"
		>
			albums
		</span>
		<div class="flex items-baseline gap-6">
			<span
				class="text-[9px] uppercase tracking-[0.18em] transition-colors"
				style="font-family: var(--os-font-body); color: var(--tp-fg-subtle);"
			>
				{countLabel}
			</span>
			<a
				href="/albums"
				class="text-[9px] uppercase tracking-[0.18em] no-underline transition-colors hover:opacity-90"
				style="font-family: var(--os-font-body); color: var(--tp-fg-subtle);"
			>
				{$t('hero.browseAllAlbums')} →
			</a>
		</div>
	</div>

	{#if filteredAlbums.length > 0}
		<div class="album-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5 px-0.5 pb-0.5">
			{#each filteredAlbums as album, i}
				<AlbumCard {album} fadeIndex={i} />
			{/each}
		</div>
	{:else}
		<div class="px-8 py-20 text-center">
			<p
				class="text-[10px] uppercase tracking-[0.2em] transition-colors"
				style="font-family: var(--os-font-body); color: var(--tp-fg-subtle);"
			>
				{MultiLangUtils.getTextValue(
					{ en: 'No albums yet', he: 'אין אלבומים עדיין' },
					$currentLanguage
				)}
			</p>
		</div>
	{/if}
{/if}
