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
	class="transition-colors duration-300 px-7 py-10"
	style="background: var(--tp-footer-strip-bg); font-family: var(--os-font-body);"
>
	<div class="max-w-[var(--os-max-width)] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
		<div>
			<div
				class="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-extrabold text-white mb-3"
				style="font-family: var(--os-font-heading); background: color-mix(in srgb, var(--os-primary) 85%, #0f172a);"
			>
				{productName.slice(0, 2).toUpperCase()}
			</div>
			<div class="text-[15px] font-bold text-slate-100 mb-1" style="font-family: var(--os-font-heading);">
				{productName}
			</div>
			<p class="text-[12px] text-slate-500">OpenShutter</p>
		</div>

		<div>
			<div class="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium mb-3">Navigate</div>
			<Menu
				config={$headerConfig}
				itemClass="block py-1.5 text-[13px] no-underline text-slate-500 hover:text-slate-300 transition-colors"
				activeItemClass="text-slate-200"
				containerClass="flex flex-col gap-0"
				orientation="vertical"
				showActiveIndicator={false}
				showAuthButtons={false}
			/>
		</div>

		{#if entries.length > 0}
			<div>
				<div class="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium mb-3">Connect</div>
				<div class="flex flex-col gap-2">
					{#each entries as [key, url]}
						<a
							href={String(url)}
							target="_blank"
							rel="noopener noreferrer"
							class="text-[13px] text-slate-500 hover:text-slate-300 no-underline transition-colors"
						>
							{key}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<div
		class="max-w-[var(--os-max-width)] mx-auto mt-8 pt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06]"
	>
		<span class="text-[11px] text-slate-600">
			© {year}
			{productName} · OpenShutter
		</span>
	</div>
</footer>
