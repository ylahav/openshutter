<!-- frontend/src/lib/page-builder/modules/Cta/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';

	type CtaLayoutConfig = {
		title?: string | Record<string, string>;
		description?: string | Record<string, string>;
		primaryLabel?: string | Record<string, string>;
		primaryHref?: string;
		secondaryLabel?: string | Record<string, string>;
		secondaryHref?: string;
	};

	export let config: CtaLayoutConfig = {};

	$: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage) || '';
	$: descriptionText = config?.description ? MultiLangUtils.getTextValue(config.description, $currentLanguage) : '';
	$: primaryLabel = MultiLangUtils.getTextValue(config?.primaryLabel, $currentLanguage) || 'Get Started';
	$: primaryHref = typeof config?.primaryHref === 'string' && config.primaryHref.trim() ? config.primaryHref : '/';
	$: secondaryLabel = MultiLangUtils.getTextValue(config?.secondaryLabel, $currentLanguage) || '';
	$: secondaryHref = typeof config?.secondaryHref === 'string' && config.secondaryHref.trim() ? config.secondaryHref : '';
</script>

<section
	class="py-20 text-[color:var(--tp-on-brand)]"
	style="background: linear-gradient(180deg, var(--tp-brand) 0%, color-mix(in srgb, var(--tp-brand) 72%, var(--tp-surface-3)) 100%);"
>
	<div class="w-full text-center">
		<h2 class="text-4xl font-bold mb-6">{titleText}</h2>
		{#if descriptionText}
			<p class="text-xl text-[color:color-mix(in_srgb,var(--tp-on-brand)_88%,transparent)] mb-8">
				{descriptionText}
			</p>
		{/if}
		<div class="flex flex-col @sm:flex-row gap-4 justify-center">
			<a
				href={primaryHref}
				class="inline-flex items-center justify-center px-8 py-4 rounded-lg transition-colors font-semibold text-lg bg-[color:var(--tp-surface-1)] text-[color:var(--tp-brand)] hover:opacity-95"
			>
				{primaryLabel}
			</a>
			{#if secondaryLabel && secondaryHref}
				<a
					href={secondaryHref}
					class="inline-flex items-center justify-center px-8 py-4 rounded-lg transition-colors font-semibold text-lg border-2 border-[color:var(--tp-on-brand)] text-[color:var(--tp-on-brand)] bg-transparent hover:bg-[color:color-mix(in_srgb,var(--tp-on-brand)_14%,transparent)]"
				>
					{secondaryLabel}
				</a>
			{/if}
		</div>
	</div>
</section>
