<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { getProductName } from '$lib/utils/productName';

	export let config: any = {};
	export let templateConfig: Record<string, any> = {};

	$: title = getProductName($siteConfigData ?? null, $currentLanguage);
	$: linkToHome = config?.showAsLink !== false;
</script>

<span class="font-semibold text-lg text-gray-900 dark:text-gray-100" style="font-family: var(--os-font-heading, inherit);">
	{#if linkToHome}
		<a href="/" class="hover:opacity-80 transition-opacity">{title}</a>
	{:else}
		{title}
	{/if}
</span>
