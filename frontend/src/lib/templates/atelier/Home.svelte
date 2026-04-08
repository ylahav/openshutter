<script lang="ts">
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

<div
	class="min-h-screen w-full antialiased transition-colors duration-300 bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]"
>
	{#if isHeroVisible}
		<Hero />
	{/if}

	<div class="max-w-[540px] mx-auto px-8 pt-14 text-center">
		<p
			class="text-lg md:text-[18px] font-light italic leading-[1.85]"
			style="font-family: var(--os-font-heading); color: var(--tp-fg-muted);"
		>
			“{heroQuoteText}”
		</p>
		<div class="w-9 h-px mx-auto my-6" style="background: var(--os-primary);"></div>
		{#if introPlain && introPlain !== heroQuoteText.replace(/\s+/g, ' ').trim()}
			<div
				class="text-base md:text-[15px] font-light leading-relaxed mt-2"
				style="font-family: var(--os-font-body); color: var(--tp-fg-muted);"
			>
				{@html introHtml}
			</div>
		{/if}
	</div>

	<AlbumList albums={rootAlbums} {loading} {error} />

	<div
		class="border-y my-12 py-14 px-8 text-center transition-colors"
		style="background: var(--tp-surface-2); border-color: var(--tp-border);"
	>
		<p
			class="text-xl font-light italic leading-relaxed max-w-[480px] mx-auto mb-6"
			style="font-family: var(--os-font-heading); color: var(--tp-fg-muted);"
		>
			“{$t('hero.atelierCtaQuote')}”
		</p>
		<p class="text-[10px] uppercase tracking-[0.18em] mb-7" style="color: var(--tp-fg-muted);">
			— {$t('hero.atelierCtaAttr')}
		</p>
		<a
			href="/albums"
			class="inline-block text-[10px] uppercase tracking-[0.22em] px-7 py-2.5 border no-underline transition-colors hover:bg-[color:var(--tp-fg)] hover:text-[color:var(--tp-canvas)] hover:border-[color:var(--tp-fg)]"
			style="color: var(--tp-fg-muted); border-color: var(--tp-fg-muted);"
		>
			{$t('hero.browseAllAlbums')}
		</a>
	</div>
</div>
