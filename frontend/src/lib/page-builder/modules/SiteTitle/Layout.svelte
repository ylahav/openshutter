<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';

	export let config: any = {};
	export let templateConfig: Record<string, any> = {};

	$: title = $siteConfigData?.title ? MultiLangUtils.getTextValue($siteConfigData.title, $currentLanguage) : 'OpenShutter';
	$: linkToHome = config?.showAsLink !== false;
</script>

<span class="font-semibold text-lg" style="font-family: var(--os-font-heading, inherit);">
	{#if linkToHome}
		<a href="/" class="hover:opacity-80 transition-opacity">{title}</a>
	{:else}
		{title}
	{/if}
</span>
