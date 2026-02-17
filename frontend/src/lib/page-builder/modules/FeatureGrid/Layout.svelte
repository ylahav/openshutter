<!-- frontend/src/lib/page-builder/modules/FeatureGrid/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import IconRenderer from '$lib/components/IconRenderer.svelte';

	export let config: any = {};
	export let data: any = null;
	export let templateConfig: Record<string, any> = {};

	$: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage) || '';
	$: subtitleText = config?.subtitle ? MultiLangUtils.getTextValue(config.subtitle, $currentLanguage) : '';
	$: features = Array.isArray(config?.features) ? config.features : [];
</script>

<section class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
	<div class="max-w-6xl mx-auto">
		<div class="text-center mb-16">
			<h2 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">{titleText}</h2>
			{#if subtitleText}
				<p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{subtitleText}</p>
			{/if}
		</div>

		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
			{#each features as feature}
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 p-8 hover:shadow-lg dark:hover:shadow-gray-900/70 transition-shadow">
					{#if feature.icon}
						<div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
							<IconRenderer icon={feature.icon} />
						</div>
					{/if}
					<h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
						{MultiLangUtils.getTextValue(feature.title, $currentLanguage) || ''}
					</h3>
					<div class="text-gray-600 dark:text-gray-300 leading-relaxed prose prose-sm max-w-none">
						{@html MultiLangUtils.getHTMLValue(feature.description, $currentLanguage) || ''}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
