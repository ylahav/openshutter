<!-- frontend/src/lib/page-builder/modules/RichText/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getProductName } from '$lib/utils/productName';

	export let config: any = {};
	// svelte-ignore export_let_unused - kept for module layout API consistency
	export let data: any = null;
	// svelte-ignore export_let_unused - kept for module layout API consistency
	export let templateConfig: Record<string, any> = {};
	export let compact: boolean = false;

	$: titleText = config?.title ? MultiLangUtils.getTextValue(config.title, $currentLanguage) : '';
	$: rawBody = config?.body ?? '';
	$: bodyStr = typeof rawBody === 'string' ? rawBody : MultiLangUtils.getHTMLValue(rawBody, $currentLanguage) || '';
	$: bodyHtml = bodyStr.replace(/\{\{productName\}\}/g, getProductName($siteConfigData ?? null, $currentLanguage));
	$: background = config?.background ?? 'white';
	$: paddingClass = compact ? 'py-1' : 'py-16';
</script>

<section class={paddingClass + " " + (background === 'gray' ? 'bg-gray-50 dark:bg-gray-800/50' : background === 'transparent' ? 'bg-transparent' : 'bg-white dark:bg-gray-900')}>
	<div class="w-full">
		{#if titleText}
			<h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">{titleText}</h2>
		{/if}
		<div class="prose prose-lg max-w-none text-gray-700 dark:text-gray-300">
			{#if bodyHtml}
				{@html bodyHtml}
			{/if}
		</div>
	</div>
</section>
