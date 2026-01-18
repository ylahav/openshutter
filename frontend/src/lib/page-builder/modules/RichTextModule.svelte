<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import MultiLangHTML from '$lib/components/MultiLangHTML.svelte';

	export let title: string | Record<string, string> | undefined;
	export let body: string | Record<string, string> = '';
	export let background: 'white' | 'gray' = 'white';

	$: titleText = title ? MultiLangUtils.getTextValue(title, $currentLanguage) : '';
</script>

<section class={"py-16 px-4 sm:px-6 lg:px-8 " + (background === 'gray' ? 'bg-gray-50' : 'bg-white')}>
	<div class="max-w-4xl mx-auto">
		{#if titleText}
			<h2 class="text-3xl font-bold text-gray-900 mb-6">{titleText}</h2>
		{/if}
		<div class="prose prose-lg max-w-none text-gray-700">
			<MultiLangHTML value={body} />
		</div>
	</div>
</section>
