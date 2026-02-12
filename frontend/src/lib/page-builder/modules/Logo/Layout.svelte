<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';

	export let config: any = {};
	export let templateConfig: Record<string, any> = {};

	$: logo = $siteConfigData?.logo ?? '';
	$: title = $siteConfigData?.title ? MultiLangUtils.getTextValue($siteConfigData.title, $currentLanguage) : 'OpenShutter';
	$: size = config?.size ?? 'md';
	$: showFallback = config?.fallbackIcon !== false;

	$: sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
</script>

<div class="flex items-center shrink-0">
	{#if logo}
		<img src={logo} alt={title} class="{sizeClass} object-contain" />
	{:else if showFallback}
		<div class="{sizeClass} rounded-lg flex items-center justify-center shadow-lg" style="background: var(--os-primary, #3B82F6);">
			<svg class="w-1/2 h-1/2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
			</svg>
		</div>
	{/if}
</div>
