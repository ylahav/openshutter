<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { getProductName } from '$lib/utils/productName';

	export let config: any = {};

	$: title = getProductName($siteConfigData ?? null, $currentLanguage);
	$: linkToHome = config?.showAsLink !== false;
</script>

<span class="pb-siteTitle">
	{#if linkToHome}
		<!-- Global `a { font-family: … }` targets links; inherit so this stays heading/title typography. -->
		<a
			href="/"
			class="pb-siteTitle__link"
		>{title}</a>
	{:else}
		{title}
	{/if}
</span>

<style lang="scss">
	.pb-siteTitle {
		color: var(--tp-fg);
		font-family: var(--os-font-heading, inherit);
		font-size: 1.125rem;
		font-weight: 600;
	}

	.pb-siteTitle__link {
		color: inherit;
		font: inherit;
		text-decoration: none;
		transition: opacity 0.2s ease;
	}

	.pb-siteTitle__link:hover {
		opacity: 0.8;
	}

	.pb-siteTitle__link:visited {
		color: inherit;
	}

	.pb-siteTitle__link:focus-visible {
		border-radius: 0.125rem;
		outline: 2px solid var(--os-primary);
		outline-offset: 2px;
	}
</style>
