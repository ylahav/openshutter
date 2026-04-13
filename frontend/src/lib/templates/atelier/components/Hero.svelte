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
	class="a-hero relative min-h-[420px] h-[68vh] max-h-[820px] flex items-end overflow-hidden transition-colors duration-300"
	aria-labelledby="atelier-hero-title"
>
	<div class="absolute inset-0 z-0" style="background: var(--tp-hero-strip-bg);"></div>
	<div class="atelier-hero-noise absolute inset-0 z-[1] opacity-[0.04] pointer-events-none" aria-hidden="true"></div>
	<div
		class="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(44,31,20,0.2)_0%,rgba(44,31,20,0.7)_100%)]"
		aria-hidden="true"
	></div>
	<div
		class="absolute bottom-0 left-0 right-0 h-[60%] z-[1] pointer-events-none bg-gradient-to-t from-[rgba(44,31,20,0.85)] to-transparent"
		aria-hidden="true"
	></div>

	<div class="relative z-[2] w-full max-w-[960px] mx-auto px-8 md:px-12 pb-12 md:pb-[52px] text-center hero-inner">
		<p class="text-[9px] uppercase tracking-[0.32em] mb-3.5 opacity-80" style="color: color-mix(in srgb, var(--os-primary) 75%, #faf6ef);">
			{eyebrow}
		</p>
		<h1
			id="atelier-hero-title"
			class="text-[clamp(2.25rem,6vw,4rem)] font-light leading-[1.15] mb-4 tracking-[0.06em] text-[color:var(--tp-canvas)]"
			style="font-family: var(--os-font-heading);"
		>
			{title}
		</h1>
		<div class="w-12 h-px mx-auto mb-4 opacity-70" style="background: var(--os-primary);"></div>
		<p class="text-[11px] uppercase tracking-[0.22em] text-white/50">
			{heroTagline}
		</p>
	</div>
</section>

<style>
	.atelier-hero-noise {
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
