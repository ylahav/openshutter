<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

	export let data: Record<string, unknown> = {};
	export let compact = false;
	export let showTitle = true;
	export let showSubtitle = true;
	export let align: 'left' | 'center' = 'center';

	$: page = (data?.page as { title?: unknown; subtitle?: unknown } | undefined) ?? undefined;
	$: titleText = page?.title != null ? MultiLangUtils.getTextValue(page.title as any, $currentLanguage) : '';
	$: subtitleText = page?.subtitle != null ? MultiLangUtils.getTextValue(page.subtitle as any, $currentLanguage) : '';
	$: hasAny = (showTitle && !!titleText) || (showSubtitle && !!subtitleText);
</script>

{#if hasAny}
	<div class="{compact ? 'py-2' : 'py-8'} {align === 'center' ? 'text-center' : 'text-left'} border-b border-gray-200 dark:border-gray-700">
		{#if showTitle && titleText}
			<h1 class="text-3xl @md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-3">{titleText}</h1>
		{/if}
		{#if showSubtitle && subtitleText}
			<h2 class="text-lg @md:text-2xl font-semibold text-gray-700 dark:text-gray-300">{subtitleText}</h2>
		{/if}
	</div>
{/if}
