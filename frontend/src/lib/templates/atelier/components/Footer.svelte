<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { getProductName } from '$lib/utils/productName';
	import Menu from '$components/Menu.svelte';
	import { derived } from 'svelte/store';

	const year = new Date().getFullYear();
	const headerConfig = derived(siteConfigData, ($config) => $config?.template?.headerConfig ?? {});

	$: productName = getProductName($siteConfigData ?? null, $currentLanguage);
	$: social = $siteConfigData?.contact?.socialMedia ?? {};
	$: entries = Object.entries(social).filter(([, v]) => typeof v === 'string' && String(v).trim());
</script>

<footer
	class="px-8 pt-10 pb-8 text-center transition-colors duration-300"
	style="background: var(--tp-footer-strip-bg); font-family: var(--os-font-body);"
>
	<div
		class="text-lg tracking-[0.12em] mb-1.5 text-[color:var(--tp-canvas)]"
		style="font-family: var(--os-font-heading);"
	>
		{productName}
	</div>
	<p class="text-[9px] uppercase tracking-[0.26em] mb-5 text-[color:color-mix(in_srgb,var(--tp-canvas)_30%,transparent)]">
		OpenShutter
	</p>
	<div class="w-8 h-px mx-auto mb-5 opacity-40" style="background: var(--os-primary);"></div>

	<div class="flex flex-wrap justify-center gap-6 mb-6">
		<Menu
			config={$headerConfig}
			itemClass="text-[9px] uppercase tracking-[0.2em] no-underline text-[color:color-mix(in_srgb,var(--tp-canvas)_30%,transparent)] hover:text-[color:var(--tp-canvas)] transition-colors"
			activeItemClass="!text-[color:var(--os-primary)]"
			containerClass="flex flex-wrap justify-center gap-6"
			showActiveIndicator={false}
			showAuthButtons={false}
		/>
		{#each entries as [key, url]}
			<a
				href={String(url)}
				target="_blank"
				rel="noopener noreferrer"
				class="text-[9px] uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--tp-canvas)_30%,transparent)] hover:text-[color:var(--tp-canvas)] no-underline transition-colors"
			>
				{key}
			</a>
		{/each}
	</div>

	<p class="text-[10px] tracking-[0.1em] text-[color:color-mix(in_srgb,var(--tp-canvas)_20%,transparent)]">
		© {year}
		{productName}
	</p>
</footer>
