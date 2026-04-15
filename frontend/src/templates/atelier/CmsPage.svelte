<script lang="ts">
	import './styles.scss';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import type { PageData } from '$lib/types/page-builder';

	export let page: PageData | null = null;
	export let error: string | null = null;
</script>

<div
	class="min-h-screen w-full bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]"
>
	{#if error}
		<div class="max-w-[960px] mx-auto px-8 py-24 text-center">
			<p class="text-[13px] uppercase tracking-[0.2em] text-[color:var(--tp-fg-muted)] mb-4">error</p>
			<p class="text-sm text-[color:var(--tp-fg-muted)] mb-10">{error}</p>
			<button
				type="button"
				class="text-[9px] uppercase tracking-[0.22em] border border-[color:var(--tp-border)] px-6 py-3 bg-transparent text-[color:var(--tp-fg)] cursor-pointer"
				on:click={() => goto('/')}
			>
				← home
			</button>
		</div>
	{:else if page}
		<article class="max-w-[960px] mx-auto px-8 py-16">
			<h1
				class="text-[28px] font-normal tracking-[0.08em] text-center mb-3"
				style="font-family: var(--os-font-heading); color: var(--tp-fg);"
			>
				{MultiLangUtils.getTextValue(page.title, $currentLanguage) || ''}
			</h1>
			<div class="w-9 h-px mx-auto mb-8" style="background: var(--os-primary);"></div>
			{#if page.subtitle}
				<p
					class="text-sm italic text-center max-w-2xl mx-auto mb-10 leading-relaxed"
					style="font-family: var(--os-font-heading); color: var(--tp-fg-muted);"
				>
					{MultiLangUtils.getTextValue(page.subtitle, $currentLanguage)}
				</p>
			{/if}
			{#if page.introText}
				<div
					class="prose prose-invert max-w-none mb-8 text-[15px] leading-relaxed"
					style="color: var(--tp-fg-muted);"
				>
					{@html MultiLangUtils.getHTMLValue(page.introText, $currentLanguage)}
				</div>
			{/if}
			{#if page.content}
				<div
					class="prose prose-invert max-w-none text-[15px] leading-relaxed"
					style="color: var(--tp-fg);"
				>
					{@html MultiLangUtils.getHTMLValue(page.content, $currentLanguage)}
				</div>
			{/if}
		</article>
	{/if}
</div>
