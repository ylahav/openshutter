<script lang="ts">
	import './styles/styles.scss';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import type { PageData } from '$lib/types/page-builder';

	export let page: PageData | null = null;
	export let error: string | null = null;
</script>

<div class="min-h-screen w-full bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)] px-8 py-16">
	{#if error}
		<div class="max-w-md mx-auto text-center py-20">
			<p class="text-[9px] uppercase tracking-[0.28em] text-[color:var(--tp-fg-subtle)] mb-4">error</p>
			<p class="text-sm text-[color:var(--tp-fg-muted)] mb-10">{error}</p>
			<button
				type="button"
				class="text-[10px] uppercase tracking-[0.22em] border border-[color:var(--tp-border)] px-5 py-3 bg-[color:var(--tp-surface-1)] text-[color:var(--tp-fg)] cursor-pointer"
				on:click={() => goto('/')}
			>
				home
			</button>
		</div>
	{:else if page}
		<article class="max-w-3xl mx-auto">
			<p class="text-[9px] uppercase tracking-[0.28em] text-[color:var(--tp-fg-subtle)] mb-4">page</p>
			<h1 class="text-[clamp(1.5rem,4vw,2rem)] font-normal lowercase tracking-tight mb-6 gal-title">
				{MultiLangUtils.getTextValue(page.title, $currentLanguage) || ''}
			</h1>
			<div class="w-px h-8 mb-8" style="background: var(--tp-fg-muted);"></div>
			{#if page.subtitle}
				<p class="text-[13px] text-[color:var(--tp-fg-muted)] mb-10 leading-relaxed">
					{MultiLangUtils.getTextValue(page.subtitle, $currentLanguage)}
				</p>
			{/if}
			{#if page.introText}
				<div class="text-sm text-[color:var(--tp-fg-muted)] mb-8 leading-relaxed">
					{@html MultiLangUtils.getHTMLValue(page.introText, $currentLanguage)}
				</div>
			{/if}
			{#if page.content}
				<div class="text-sm text-[color:var(--tp-fg)] leading-relaxed space-y-4">
					{@html MultiLangUtils.getHTMLValue(page.content, $currentLanguage)}
				</div>
			{/if}
		</article>
	{/if}
</div>
