<!-- frontend/src/lib/page-builder/modules/RichText/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import MultiLangHTML from '$lib/components/MultiLangHTML.svelte';

	export let config: any = {};
	export let data: any = null;
	export let templateConfig: Record<string, any> = {};

	$: titleText = config?.title ? MultiLangUtils.getTextValue(config.title, $currentLanguage) : '';
	$: body = config?.body ?? '';
	$: background = config?.background ?? 'white';
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
