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
	});

	$: isHeroVisible =
		($siteConfigData?.template as TemplateHeroCfg | undefined)?.componentsConfig?.hero?.visible !== false;

	$: introHtml = $siteConfigData?.description
		? MultiLangUtils.getHTMLValue($siteConfigData.description, $currentLanguage)
		: '';

	$: introPlain = introHtml.replace(/<[^>]*>/g, '').trim();

	type LangVal = string | Record<string, string> | undefined;
	$: tmpl = ($siteConfigData?.template ?? {}) as { heroQuote?: LangVal };
	$: heroQuoteText = (() => {
		const q = tmpl.heroQuote;
		if (q === undefined || q === null) return $t('hero.atelierIntroQuote');
		const s = MultiLangUtils.getTextValue(q, $currentLanguage);
		return s && s.trim() !== '' ? s : $t('hero.atelierIntroQuote');
	})();
</script>

<div class="tpl-page">
	{#if isHeroVisible}
		<Hero />
	{/if}

	<div class="a-intro">
		<p class="a-intro__text">
			“{heroQuoteText}”
		</p>
		<div class="a-intro__rule"></div>
		{#if introPlain && introPlain !== heroQuoteText.replace(/\s+/g, ' ').trim()}
			<div class="a-bio">
				{@html introHtml}
			</div>
		{/if}
	</div>

	<AlbumList albums={rootAlbums} {loading} {error} />

	<div class="a-cta">
		<p class="a-cta__quote">
			“{$t('hero.atelierCtaQuote')}”
		</p>
		<p class="a-cta__attr">
			— {$t('hero.atelierCtaAttr')}
		</p>
		<a href="/albums" class="a-cta__btn">
			{$t('hero.browseAllAlbums')}
		</a>
	</div>
</div>
