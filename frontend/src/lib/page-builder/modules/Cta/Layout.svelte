<!-- frontend/src/lib/page-builder/modules/Cta/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';

	export let config: any = {};
	export let data: any = null;
	export let templateConfig: Record<string, any> = {};

	$: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage) || '';
	$: descriptionText = config?.description ? MultiLangUtils.getTextValue(config.description, $currentLanguage) : '';
	$: primaryLabel = config?.primaryLabel ?? 'Get Started';
	$: primaryHref = config?.primaryHref ?? '/';
	$: secondaryLabel = config?.secondaryLabel;
	$: secondaryHref = config?.secondaryHref;
</script>

<section class="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-blue-600 to-indigo-700">
	<div class="max-w-4xl mx-auto text-center">
		<h2 class="text-4xl font-bold text-white mb-6">{titleText}</h2>
		{#if descriptionText}
			<p class="text-xl text-blue-100 mb-8">{descriptionText}</p>
		{/if}
		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<a
				href={primaryHref}
				class="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
			>
				{primaryLabel}
			</a>
			{#if secondaryLabel && secondaryHref}
				<a
					href={secondaryHref}
					class="inline-flex items-center justify-center px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-semibold text-lg"
				>
					{secondaryLabel}
				</a>
			{/if}
		</div>
	</div>
</section>
