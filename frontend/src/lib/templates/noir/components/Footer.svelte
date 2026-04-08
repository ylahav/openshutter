<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { getProductName } from '$lib/utils/productName';

	const year = new Date().getFullYear();
	$: productName = getProductName($siteConfigData ?? null, $currentLanguage);
	$: social = $siteConfigData?.contact?.socialMedia ?? {};
	$: entries = Object.entries(social).filter(([, v]) => typeof v === 'string' && String(v).trim());
</script>

<footer
	class="border-t mt-0.5 px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[9px] uppercase tracking-[0.18em] transition-colors duration-300"
	style="font-family: var(--os-font-body); border-color: var(--tp-border); color: var(--tp-fg-subtle);"
>
	<span class="footer-copy">
		© {year}
		{productName.toLowerCase()} · openshutter
	</span>
	{#if entries.length > 0}
		<div class="footer-links flex flex-wrap gap-5">
			{#each entries as [key, url]}
				<a
					href={String(url)}
					target="_blank"
					rel="noopener noreferrer"
					class="transition-colors no-underline hover:opacity-90"
					style="color: var(--tp-fg-subtle);"
				>
					{key}
				</a>
			{/each}
		</div>
	{/if}
</footer>
