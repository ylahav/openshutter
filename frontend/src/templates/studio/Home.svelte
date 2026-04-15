<script lang="ts">
	import './styles.scss';
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { siteConfigData } from '$stores/siteConfig';
	import { logger } from '$lib/utils/logger';
	import { t } from '$stores/i18n';
	import Hero from './components/Hero.svelte';
	import AlbumList from './components/AlbumList.svelte';

	type TemplateHeroCfg = { componentsConfig?: { hero?: { visible?: boolean } } };

	let rootAlbums: any[] = [];
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		await fetchRootAlbums();
	});

	async function fetchRootAlbums() {
		try {
			loading = true;
			const response = await fetch('/api/albums?parentId=root');
			if (!response.ok) throw new Error('Failed to fetch albums');
			const albums = await response.json();
			rootAlbums = Array.isArray(albums) ? albums : [];
		} catch (err) {
			logger.error('Failed to fetch albums:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch albums';
		} finally {
			loading = false;
		}
	}

	$: isHeroVisible =
		($siteConfigData?.template as TemplateHeroCfg | undefined)?.componentsConfig?.hero?.visible !== false;

	$: aboutPlain = $siteConfigData?.description
		? MultiLangUtils.getHTMLValue($siteConfigData.description, $currentLanguage).replace(/<[^>]*>/g, '').trim()
		: '';

	$: collectionsCount = rootAlbums.length;
	$: photosCount = rootAlbums.reduce((sum, a) => sum + (typeof a.photoCount === 'number' ? a.photoCount : 0), 0);
</script>

<div
	class="min-h-screen w-full antialiased transition-colors duration-300 bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]"
>
	{#if isHeroVisible}
		<Hero {collectionsCount} {photosCount} />
	{/if}

	<AlbumList albums={rootAlbums} {loading} {error} />

	{#if aboutPlain}
		<div
			class="max-w-[var(--os-max-width)] mx-auto px-7 pb-14 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center rounded-2xl border p-10 md:px-12 bg-[color:var(--tp-surface-1)] border-[color:var(--tp-border)]"
		>
			<p class="text-[15px] leading-relaxed max-w-[560px]" style="color: var(--tp-fg-muted);">
				{aboutPlain}
			</p>
			<a
				href="/albums"
				class="inline-flex items-center justify-center self-start lg:self-center text-[13px] font-medium px-5 py-2.5 rounded-lg text-white no-underline whitespace-nowrap transition-opacity hover:opacity-90"
				style="background: var(--os-primary); font-family: var(--os-font-body);"
			>
				{$t('hero.browseAllAlbums')} →
			</a>
		</div>
	{/if}
</div>
