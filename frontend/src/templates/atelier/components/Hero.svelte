<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';

	type LangVal = string | Record<string, string> | undefined;

	$: config = $siteConfigData;
	$: lang = $currentLanguage;
	$: tmpl = (config?.template ?? {}) as {
		heroTitle?: LangVal;
		heroSub?: LangVal;
		heroEyebrow?: LangVal;
	};

	function pickText(field: LangVal | undefined, fallback: string): string {
		if (field === undefined || field === null) return fallback;
		const s = MultiLangUtils.getTextValue(field, lang);
		return s && s.trim() !== '' ? s : fallback;
	}

	$: title = pickText(
		tmpl.heroTitle,
		config?.title ? MultiLangUtils.getTextValue(config.title, lang) : $t('hero.defaultTitle')
	);

	$: heroTagline = pickText(tmpl.heroSub, $t('hero.atelierHeroSub'));

	$: eyebrow = pickText(tmpl.heroEyebrow, $t('hero.atelierEyebrow'));
</script>

<section
	class="a-hero"
	aria-labelledby="atelier-hero-title"
>
	<div class="a-hero__vignette" aria-hidden="true"></div>
	<div class="atelier-hero-noise" aria-hidden="true"></div>
	<div class="a-hero__gradient" aria-hidden="true"></div>

	<div class="a-hero__content hero-inner">
		<p class="a-hero__eyebrow">
			{eyebrow}
			yoyo
		</p>
		<h1 id="atelier-hero-title" class="a-hero__title">
			{title}
			kuku
		</h1>
		<div class="a-hero__rule"></div>
		<p class="a-hero__sub">
			{heroTagline}
		</p>
	</div>
</section>

<style>
	.atelier-hero-noise {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
		opacity: 0.04;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		background-size: 200px;
	}
	.hero-inner > :global(*) {
		opacity: 0;
		animation: atelier-reveal 1s ease forwards;
	}
	.hero-inner > :global(*:nth-child(1)) {
		animation-delay: 0.2s;
	}
	.hero-inner > :global(*:nth-child(2)) {
		animation-delay: 0.45s;
	}
	.hero-inner > :global(*:nth-child(3)) {
		animation-delay: 0.6s;
	}
	.hero-inner > :global(*:nth-child(4)) {
		animation-delay: 0.75s;
	}
	@keyframes atelier-reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.hero-inner > :global(*) {
		transform: translateY(12px);
	}
</style>
