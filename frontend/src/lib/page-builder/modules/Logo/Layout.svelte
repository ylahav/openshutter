<script lang="ts">
	import { browser } from '$app/environment';
	import { publicSiteLogo, siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { activeTemplate } from '$stores/template';
	import { getProductName } from '$lib/utils/productName';
	import './_styles.scss';

	export let config: any = {};

	const templateLogoStyleLoaders = import.meta.glob('/src/templates/*/styles/_logo.scss');
	const loadedTemplateLogoStyles = new Set<string>();

	$: logo = $publicSiteLogo;
	$: title = getProductName($siteConfigData ?? null, $currentLanguage);
	$: size = config?.size ?? 'md';
	$: showFallback = config?.fallbackIcon !== false;
	$: linkToHome = config?.linkToHome !== false;
	$: showSiteTitle = config?.showSiteTitle === true;
	$: titlePosition =
		config?.titlePosition === 'above' ||
		config?.titlePosition === 'below' ||
		config?.titlePosition === 'left' ||
		config?.titlePosition === 'right'
			? config.titlePosition
			: 'right';

	$: sizeClass =
		size === 'sm'
			? 'pb-logo__media--sm'
			: size === 'lg'
				? 'pb-logo__media--lg'
				: 'pb-logo__media--md';

	$: brandInlineStyle =
		titlePosition === 'above' || titlePosition === 'below'
			? 'display:inline-flex;align-items:center;flex-wrap:nowrap;gap:0.5rem;flex-direction:column;'
			: 'display:inline-flex;align-items:center;flex-wrap:nowrap;gap:0.5rem;flex-direction:row;';

	$: if (browser) {
		const templateId = String($activeTemplate || '').trim().toLowerCase();
		const stylePath = `/src/templates/${templateId}/styles/_logo.scss`;
		if (templateId && !loadedTemplateLogoStyles.has(stylePath)) {
			const loader = templateLogoStyleLoaders[stylePath];
			if (loader) {
				void loader();
				loadedTemplateLogoStyles.add(stylePath);
			}
		}
	}
</script>

<div class={`pb-logo pb-logo--title-${titlePosition}`.trim()}>
	{#if linkToHome}
		<a
			href="/"
			aria-label={title}
			class={`pb-logo__link pb-logo__brand pb-logo__brand--${titlePosition}`.trim()}
			style={brandInlineStyle}
		>
			{#if showSiteTitle && (titlePosition === 'left' || titlePosition === 'above')}
				<span class="pb-logo__title">{title}</span>
			{/if}
			{#if logo}
				<img src={logo} alt={title} class="pb-logo__media {sizeClass}" />
			{:else if showFallback}
				<div class="pb-logo__fallback {sizeClass}" style="background: var(--os-primary, #3B82F6);">
					<svg class="pb-logo__fallbackIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
					</svg>
				</div>
			{/if}
			{#if showSiteTitle && titlePosition !== 'left' && titlePosition !== 'above'}
				<span class="pb-logo__title">{title}</span>
			{/if}
		</a>
	{:else}
		<div class={`pb-logo__brand pb-logo__brand--${titlePosition}`.trim()} style={brandInlineStyle}>
			{#if showSiteTitle && (titlePosition === 'left' || titlePosition === 'above')}
				<span class="pb-logo__title">{title}</span>
			{/if}
			{#if logo}
				<img src={logo} alt={title} class="pb-logo__media {sizeClass}" />
			{:else if showFallback}
				<div class="pb-logo__fallback {sizeClass}" style="background: var(--os-primary, #3B82F6);">
					<svg class="pb-logo__fallbackIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
					</svg>
				</div>
			{/if}
			{#if showSiteTitle && titlePosition !== 'left' && titlePosition !== 'above'}
				<span class="pb-logo__title">{title}</span>
			{/if}
		</div>
	{/if}
</div>
