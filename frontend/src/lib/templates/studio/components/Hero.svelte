<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';

	export let collectionsCount = 0;
	export let photosCount = 0;

	$: config = $siteConfigData;
	$: lang = $currentLanguage;

	$: titleRaw = config?.title ? MultiLangUtils.getTextValue(config.title, lang) : $t('hero.defaultTitle');
	$: descriptionPlain = config?.description
		? MultiLangUtils.getHTMLValue(config.description, lang).replace(/<[^>]*>/g, '').trim()
		: $t('hero.defaultSubtitle');

	$: titleParts = (() => {
		const words = titleRaw.trim().split(/\s+/).filter(Boolean);
		if (words.length < 2) return { head: titleRaw, accent: '' };
		return { head: words.slice(0, -1).join(' '), accent: words[words.length - 1] };
	})();

	const grad = (a: string, b: string) => `linear-gradient(135deg, ${a}, ${b})`;
</script>

<section
	class="relative overflow-hidden transition-colors duration-300"
	style="background: var(--tp-hero-strip-bg);"
	aria-labelledby="studio-hero-title"
>
	<div
		class="pointer-events-none absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full opacity-90"
		style="background: radial-gradient(circle, color-mix(in srgb, var(--os-primary) 25%, transparent) 0%, transparent 70%);"
		aria-hidden="true"
	></div>
	<div
		class="pointer-events-none absolute -bottom-28 left-[30%] w-80 h-80 rounded-full opacity-80"
		style="background: radial-gradient(circle, color-mix(in srgb, var(--os-primary) 12%, transparent) 0%, transparent 70%);"
		aria-hidden="true"
	></div>

	<div
		class="relative z-[2] max-w-[var(--os-max-width)] mx-auto px-7 py-16 md:py-[72px] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
	>
		<div class="hero-content space-y-5">
			<div
				class="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] px-3 py-1.5 rounded-full border w-fit"
				style="font-family: var(--os-font-body);
					background: color-mix(in srgb, var(--os-primary) 10%, transparent);
					border-color: color-mix(in srgb, var(--os-primary) 25%, transparent);
					color: var(--os-primary);"
			>
				{$t('albums.gallerySubtitle')}
			</div>

			<h1
				id="studio-hero-title"
				class="text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.1] tracking-tight text-white"
				style="font-family: var(--os-font-heading);"
			>
				{titleParts.head}
				{#if titleParts.accent}
					<br />
					<span style="color: color-mix(in srgb, var(--os-primary) 70%, #93c5fd);">{titleParts.accent}</span>
				{/if}
			</h1>

			<p class="text-[15px] leading-relaxed max-w-[420px] text-slate-400">
				{descriptionPlain}
			</p>

			<div class="flex flex-wrap items-center gap-3 pt-1">
				<a
					href="/albums"
					class="inline-flex items-center justify-center text-[14px] font-medium px-6 py-2.5 rounded-lg text-white no-underline transition-colors hover:opacity-90"
					style="background: var(--os-primary); font-family: var(--os-font-body);"
				>
					{$t('hero.browseAlbums')} →
				</a>
				<a
					href="/gallery"
					class="text-[13px] no-underline transition-colors text-slate-500 hover:text-slate-300"
				>
					{$t('hero.cta')} ↗
				</a>
			</div>

			{#if collectionsCount > 0 || photosCount > 0}
				<div
					class="flex flex-wrap gap-8 mt-10 pt-7 border-t border-white/[0.08]"
				>
					{#if collectionsCount > 0}
						<div>
							<div class="text-[22px] font-bold text-white" style="font-family: var(--os-font-heading);">
								{collectionsCount}
							</div>
							<div class="text-[11px] text-slate-500 mt-0.5">{$t('albums.galleryTitle')}</div>
						</div>
					{/if}
					{#if photosCount > 0}
						<div>
							<div class="text-[22px] font-bold text-white" style="font-family: var(--os-font-heading);">
								{photosCount}
							</div>
							<div class="text-[11px] text-slate-500 mt-0.5">{$t('search.photos')}</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="grid grid-cols-2 grid-rows-2 gap-2 min-h-[280px]" aria-hidden="true">
			<div class="rounded-[10px] overflow-hidden row-span-2">
				<div
					class="w-full h-full min-h-[200px] transition-transform duration-500 hover:scale-[1.04]"
					style="background: {grad(
						'color-mix(in srgb, var(--os-primary) 35%, #0f172a)',
						'var(--os-primary)'
					)};"
				></div>
			</div>
			<div class="rounded-[10px] overflow-hidden">
				<div
					class="w-full h-full min-h-[120px] aspect-[4/3] transition-transform duration-500 hover:scale-[1.04]"
					style="background: {grad(
						'color-mix(in srgb, var(--os-secondary) 45%, #0f172a)',
						'var(--os-secondary)'
					)};"
				></div>
			</div>
			<div class="rounded-[10px] overflow-hidden">
				<div
					class="w-full h-full min-h-[120px] aspect-[4/3] transition-transform duration-500 hover:scale-[1.04]"
					style="background: {grad(
						'color-mix(in srgb, var(--os-accent) 40%, #0f172a)',
						'var(--os-accent)'
					)};"
				></div>
			</div>
		</div>
	</div>
</section>

<style>
	.hero-content > :global(*) {
		opacity: 0;
		transform: translateY(12px);
		animation: studio-fade-up 0.7s ease forwards;
	}
	.hero-content > :global(*:nth-child(1)) {
		animation-delay: 0.1s;
	}
	.hero-content > :global(*:nth-child(2)) {
		animation-delay: 0.25s;
	}
	.hero-content > :global(*:nth-child(3)) {
		animation-delay: 0.4s;
	}
	.hero-content > :global(*:nth-child(4)) {
		animation-delay: 0.5s;
	}
	.hero-content > :global(*:nth-child(5)) {
		animation-delay: 0.6s;
	}
	@keyframes studio-fade-up {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
