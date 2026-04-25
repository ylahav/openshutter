<!-- frontend/src/lib/page-builder/modules/RichText/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { activeTemplate } from '$stores/template';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getProductName } from '$lib/utils/productName';
	import { stripInlineColorFromHtml } from '$lib/utils/strip-inline-color-from-html';

	export let config: any = {};
	export let compact: boolean = false;

	$: titleText = config?.title ? MultiLangUtils.getTextValue(config.title, $currentLanguage) : '';
	$: rawBody = config?.body ?? '';
	$: bodyStr = typeof rawBody === 'string' ? rawBody : MultiLangUtils.getHTMLValue(rawBody, $currentLanguage) || '';
	$: bodyHtml = bodyStr.replace(/\{\{productName\}\}/g, getProductName($siteConfigData ?? null, $currentLanguage));
	$: bodyHtmlForRender =
		String($activeTemplate ?? '').toLowerCase() === 'noir' ? stripInlineColorFromHtml(bodyHtml) : bodyHtml;
	$: background = config?.background ?? 'white';
	$: rootClass = `pb-richText ${compact ? 'pb-richText--compact' : 'pb-richText--regular'} ${
		background === 'gray'
			? 'pb-richText--gray'
			: background === 'transparent'
				? 'pb-richText--transparent'
				: 'pb-richText--white'
	}`;
</script>

{#if compact}
	<div class={rootClass}>
		{#if titleText}
			<h2 class="pb-richText__title">{titleText}</h2>
		{/if}
		<div class="pb-richText__body">
			{#if bodyHtmlForRender}
				{@html bodyHtmlForRender}
			{/if}
		</div>
	</div>
{:else}
	<section class={rootClass}>
		<div class="pb-richText__inner">
			{#if titleText}
				<h2 class="pb-richText__title">{titleText}</h2>
			{/if}
			<div class="pb-richText__body">
				{#if bodyHtmlForRender}
					{@html bodyHtmlForRender}
				{/if}
			</div>
		</div>
	</section>
{/if}

<style lang="scss">
	.pb-richText {
		width: 100%;
	}

	.pb-richText--compact {
		padding-block: 0.25rem;
	}

	.pb-richText--regular {
		padding-block: 4rem;
	}

	.pb-richText--white {
		background: var(--tp-surface-1);
	}

	.pb-richText--gray {
		background: var(--tp-surface-2);
	}

	.pb-richText--transparent {
		background: transparent;
	}

	.pb-richText__inner {
		width: 100%;
	}

	.pb-richText__title {
		margin: 0 0 1.5rem;
		font-size: clamp(1.5rem, 3vw, 1.875rem);
		font-weight: 700;
		line-height: 1.25;
		color: var(--tp-fg);
	}

	.pb-richText__body {
		color: var(--tp-fg-muted);
		font-size: 1.125rem;
		line-height: 1.75;
	}

	.pb-richText__body :global(a) {
		color: var(--os-primary);
	}

	.pb-richText__body :global(p:first-child) {
		margin-top: 0;
	}

	.pb-richText__body :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
