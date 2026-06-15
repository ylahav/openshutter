<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

	let {
		value,
		fallback = ''
	}: {
		value: string | { [key: string]: string } | undefined | null;
		fallback?: string;
	} = $props();

const text = $derived(value ? MultiLangUtils.getTextValue(value, $currentLanguage) || fallback : fallback);</script>

{text}

