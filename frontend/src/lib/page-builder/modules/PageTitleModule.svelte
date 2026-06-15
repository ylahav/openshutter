<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

	let {
		data = {},
		compact = false,
		showTitle = true,
		showSubtitle = true,
		align = 'center'
	}: {
		data?: Record<string, unknown>;
		compact?: boolean;
		showTitle?: boolean;
		showSubtitle?: boolean;
		align?: 'left' | 'center';
	} = $props();

	const page = $derived((data?.page as { title?: unknown; subtitle?: unknown } | undefined) ?? undefined);
	const titleText = $derived(
		page?.title != null ? MultiLangUtils.getTextValue(page.title as any, $currentLanguage) : ''
	);
	const subtitleText = $derived(
		page?.subtitle != null ? MultiLangUtils.getTextValue(page.subtitle as any, $currentLanguage) : ''
	);
	const hasAny = $derived((showTitle && !!titleText) || (showSubtitle && !!subtitleText));
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
