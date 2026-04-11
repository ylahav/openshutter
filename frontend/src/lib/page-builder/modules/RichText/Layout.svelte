<!-- frontend/src/lib/page-builder/modules/RichText/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getProductName } from '$lib/utils/productName';

	export let config: any = {};
	export let compact: boolean = false;

	$: titleText = config?.title ? MultiLangUtils.getTextValue(config.title, $currentLanguage) : '';
	$: rawBody = config?.body ?? '';
	$: bodyStr = typeof rawBody === 'string' ? rawBody : MultiLangUtils.getHTMLValue(rawBody, $currentLanguage) || '';
	$: bodyHtml = bodyStr.replace(/\{\{productName\}\}/g, getProductName($siteConfigData ?? null, $currentLanguage));
	$: background = config?.background ?? 'white';
	$: paddingClass = compact ? 'py-1' : 'py-16';
</script>

<section
	class="{paddingClass} {background === 'gray'
		? 'bg-[color:var(--tp-surface-2)]'
		: background === 'transparent'
			? 'bg-transparent'
			: 'bg-[color:var(--tp-surface-1)]'}"
>
	<div class="w-full">
		{#if titleText}
			<h2 class="text-3xl font-bold text-[color:var(--tp-fg)] mb-6">{titleText}</h2>
		{/if}
		<div
			class="prose prose-lg max-w-none text-[color:var(--tp-fg-muted)] [&_a]:text-[color:var(--os-primary)]"
		>
			{#if bodyHtml}
				{@html bodyHtml}
			{/if}
		</div>
	</div>
</section>
