<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

	let {
		value: string | { [key: string]: string } | undefined | null,
		fallback = ''
	}: {
		value: string | { [key: string]: string } | undefined | null;
		fallback?: string;
	} = $props();

const html = $derived(value ? MultiLangUtils.getHTMLValue(value, $currentLanguage) || fallback : fallback);</script>

{#if html && html.trim()}
	{@html html}
{/if}

