<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { getProductName } from '$lib/utils/productName';

	export let config: any = {};

	$: title = getProductName($siteConfigData ?? null, $currentLanguage);
	$: linkToHome = config?.showAsLink !== false;
</script>

<span
	class="font-semibold text-lg text-[color:var(--tp-fg)]"
	style="font-family: var(--os-font-heading, inherit);"
>
	{#if linkToHome}
		<!-- Global `a { font-family: … }` targets links; inherit so this stays heading/title typography. -->
		<a
			href="/"
			class="text-inherit no-underline decoration-transparent hover:opacity-80 transition-opacity visited:text-[color:var(--tp-fg)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--os-primary)]"
			style="font-family: inherit; font-size: inherit; font-weight: inherit; color: inherit;"
		>{title}</a>
	{:else}
		{title}
	{/if}
</span>
