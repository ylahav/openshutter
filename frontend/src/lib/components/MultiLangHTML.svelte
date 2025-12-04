<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

	export let value: string | { [key: string]: string } | undefined | null;
	export let fallback: string = '';

	$: html = value ? MultiLangUtils.getHTMLValue(value, $currentLanguage) || fallback : fallback;
</script>

{#if html && html.trim()}
	{@html html}
{/if}

