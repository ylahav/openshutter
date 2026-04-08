<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

	$: config = $siteConfigData;
	$: lang = $currentLanguage;

	type TemplateCfg = {
		heroTitle?: unknown;
		heroSub?: unknown;
		heroSubtitle?: unknown;
	};

	$: tpl = (config?.template ?? {}) as TemplateCfg;
	$: titleFromTemplate = (() => {
		const raw = tpl.heroTitle;
		if (raw == null || raw === '') return '';
		if (typeof raw === 'object') return MultiLangUtils.getTextValue(raw as any, lang);
		return String(raw);
	})();
	$: subFromTemplate = (() => {
		const raw = tpl.heroSub ?? tpl.heroSubtitle;
		if (raw == null || raw === '') return '';
		if (typeof raw === 'object') return MultiLangUtils.getTextValue(raw as any, lang);
		return String(raw);
	})();

	$: title =
		titleFromTemplate ||
		(config?.title ? MultiLangUtils.getTextValue(config.title, lang) : 'Photography');
	$: tagline = config?.description
		? MultiLangUtils.getHTMLValue(config.description, lang).replace(/<[^>]*>/g, '').trim()
		: '';
	$: subtitle = subFromTemplate
		? subFromTemplate
		: tagline.length > 0
			? tagline
					.split(/[·•|,\n]/)
					.map((s) => s.trim())
					.filter(Boolean)
					.slice(0, 4)
					.join(' · ')
			: 'collections · moments · light';

	const surfaceCycle = [
		'var(--tp-surface-2)',
		'var(--tp-surface-3)',
		'var(--tp-surface-1)'
	] as const;
</script>

<section
	class="hero relative min-h-screen flex flex-col items-center justify-center overflow-hidden transition-colors duration-300"
	style="color: var(--tp-fg);"
>
	<div
		class="hero-bg absolute inset-0 grid grid-cols-6 grid-rows-4 gap-0.5 pointer-events-none transition-opacity duration-300"
		style="opacity: var(--tp-hero-grid-opacity, 0.18);"
		aria-hidden="true"
	>
		{#each Array(24) as _, i}
			<div
				class="hero-bg-cell animate-[noir-flicker_8s_ease-in-out_infinite]"
				style="background: {surfaceCycle[i % 3]}; animation-delay: -{((i * 0.37) % 8)}s;"
			></div>
		{/each}
	</div>

	<div class="hero-content relative z-[2] text-center px-6">
		<h1
			class="hero-title font-extralight text-[clamp(2.625rem,8vw,6rem)] tracking-tight leading-none mb-5 transition-colors duration-300"
			style="font-family: var(--os-font-heading, ui-sans-serif, system-ui); color: var(--tp-fg);"
		>
			{title}
		</h1>
		<div
			class="w-px h-12 mx-auto mb-5 transition-colors duration-300"
			style="background: var(--tp-fg-muted);"
			aria-hidden="true"
		></div>
		<p
			class="text-[10px] uppercase tracking-[0.28em] max-w-xl mx-auto transition-colors duration-300"
			style="font-family: var(--os-font-body, ui-monospace, monospace); color: var(--tp-fg-muted);"
		>
			{subtitle}
		</p>
	</div>

	<div
		class="hero-scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.22em] transition-colors duration-300"
		style="font-family: var(--os-font-body, ui-monospace, monospace); color: var(--tp-fg-subtle);"
		aria-hidden="true"
	>
		scroll
	</div>
</section>

<style>
	@keyframes noir-flicker {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}
	@keyframes noir-pulse-scroll {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.8;
		}
	}
	.hero-scroll-hint {
		animation: noir-pulse-scroll 2s ease-in-out infinite;
	}
</style>
