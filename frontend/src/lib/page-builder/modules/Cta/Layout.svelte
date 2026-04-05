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

<section class="py-20 bg-linear-to-b from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900">
	<div class="w-full text-center">
		<h2 class="text-4xl font-bold text-white mb-6">{titleText}</h2>
		{#if descriptionText}
			<p class="text-xl text-blue-100 dark:text-blue-200 mb-8">{descriptionText}</p>
		{/if}
		<div class="flex flex-col @sm:flex-row gap-4 justify-center">
			<a
				href={primaryHref}
				class="inline-flex items-center justify-center px-8 py-4 bg-white dark:bg-gray-100 text-blue-600 dark:text-blue-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-200 transition-colors font-semibold text-lg"
			>
				{primaryLabel}
			</a>
			{#if secondaryLabel && secondaryHref}
				<a
					href={secondaryHref}
					class="inline-flex items-center justify-center px-8 py-4 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors font-semibold text-lg"
				>
					{secondaryLabel}
				</a>
			{/if}
		</div>
	</div>
</section>
