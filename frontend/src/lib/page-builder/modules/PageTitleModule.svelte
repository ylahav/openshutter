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
	<div
		class="pb-pageTitle {compact ? 'pb-pageTitle--compact' : ''} {align === 'center' ? 'pb-pageTitle--center' : 'pb-pageTitle--left'}"
	>
		{#if showTitle && titleText}
			<h1 class="pb-pageTitle__title">{titleText}</h1>
		{/if}
		{#if showSubtitle && subtitleText}
			<h2 class="pb-pageTitle__subtitle">{subtitleText}</h2>
		{/if}
	</div>
{/if}
