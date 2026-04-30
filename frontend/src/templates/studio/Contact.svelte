<script lang="ts">
	import './styles/styles.scss';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import type { PageData } from '$lib/types/page-builder';

	export let page: PageData | null = null;
</script>

<div
	class="min-h-screen w-full bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)] pt-24 pb-16"
>
	{#if page}
		<article class="max-w-(--os-max-width) mx-auto px-7">
			<h1
				class="text-3xl md:text-4xl font-extralight tracking-tight mb-4"
				style="font-family: var(--os-font-heading); color: var(--tp-fg);"
			>
				{MultiLangUtils.getTextValue(page.title, $currentLanguage) || ''}
			</h1>
			{#if page.subtitle}
				<p class="text-[15px] mb-10" style="color: var(--tp-fg-muted);">
					{MultiLangUtils.getTextValue(page.subtitle, $currentLanguage)}
				</p>
			{/if}
			{#if page.introText}
				<div class="prose prose-invert max-w-none mb-8 text-[15px] leading-relaxed" style="color: var(--tp-fg-muted);">
					{@html MultiLangUtils.getHTMLValue(page.introText, $currentLanguage)}
				</div>
			{/if}
			{#if page.content}
				<div class="prose prose-invert max-w-none text-[15px] leading-relaxed rounded-2xl border p-8 md:p-10 bg-[color:var(--tp-surface-1)] border-[color:var(--tp-border)]" style="color: var(--tp-fg);">
					{@html MultiLangUtils.getHTMLValue(page.content, $currentLanguage)}
				</div>
			{/if}
		</article>
	{/if}
</div>
