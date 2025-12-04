<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

	export let value: string | { [key: string]: string } | undefined | null;
	export let fallback: string = '';

	$: text = value ? MultiLangUtils.getTextValue(value, $currentLanguage) || fallback : fallback;
</script>

{text}

