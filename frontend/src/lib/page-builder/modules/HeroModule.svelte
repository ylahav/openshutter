<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import MultiLangHTML from '$lib/components/MultiLangHTML.svelte';

	export let title: string | Record<string, string> = '';
	export let highlight: string | Record<string, string> | undefined;
	export let description: string | Record<string, string> = '';
	export let icon: string | undefined;

	$: titleText = MultiLangUtils.getTextValue(title, $currentLanguage) || '';
	$: highlightText = highlight ? MultiLangUtils.getTextValue(highlight, $currentLanguage) : '';
</script>

<section class="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
	<div class="max-w-4xl mx-auto text-center">
		{#if icon}
			<div class="mb-8">
				<div class="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg mb-6 text-4xl text-white">
					{icon}
				</div>
			</div>
		{/if}
		<h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
			{titleText}
			{#if highlightText}
				<span class="text-blue-600"> {highlightText}</span>
			{/if}
		</h1>
		{#if description}
			<p class="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
				<MultiLangHTML value={description} />
			</p>
		{/if}
	</div>
</section>
