<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { siteConfigData } from '$stores/siteConfig';
	import { logger } from '$lib/utils/logger';
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
			if (!response.ok) {
				throw new Error('Failed to fetch albums');
			}
			const albums = await response.json();
			if (Array.isArray(albums)) {
				rootAlbums = albums;
			} else {
				error = 'Failed to fetch albums';
			}
		} catch (err) {
			logger.error('Failed to fetch albums:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch albums';
		} finally {
			loading = false;
		}
	}

	$: isHeroVisible =
		($siteConfigData?.template as TemplateHeroCfg | undefined)?.componentsConfig?.hero?.visible !==
		false;

	$: aboutPlain = $siteConfigData?.description
		? MultiLangUtils.getHTMLValue($siteConfigData.description, $currentLanguage).replace(/<[^>]*>/g, '').trim()
		: '';

</script>

<!-- Noir: colors/fonts from site_config.template (ThemeColorApplier --tp-* / --os-font-*) -->
<div
	class="min-h-screen w-full antialiased selection:bg-black/10 dark:selection:bg-white/10 cursor-crosshair transition-colors duration-300 bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]"
>
	{#if isHeroVisible}
		<Hero />
	{/if}

	<AlbumList albums={rootAlbums} {loading} {error} />

	{#if aboutPlain}
		<div
			class="about-strip px-8 py-16 max-w-[560px] border-t mt-0.5 transition-colors duration-300"
			style="border-color: var(--tp-border);"
		>
			<p
				class="text-[15px] leading-[1.8] mb-6 font-light transition-colors duration-300"
				style="font-family: var(--os-font-heading, ui-sans-serif, system-ui); color: var(--tp-fg-muted);"
			>
				{aboutPlain}
			</p>
			<a href="/about" class="about-lnk">about the photographer</a>
		</div>
	{/if}
</div>
