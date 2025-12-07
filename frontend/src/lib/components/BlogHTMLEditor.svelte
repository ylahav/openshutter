<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import type { MultiLangHTML } from '$lib/types/multi-lang';
	import MultiLangHTMLEditor from './MultiLangHTMLEditor.svelte';

	export let value: MultiLangHTML = {};
	export let onChange: ((value: MultiLangHTML) => void) | undefined = undefined;
	export let placeholder = '';
	export let className = '';
</script>

<!-- BlogHTMLEditor is a wrapper around MultiLangHTMLEditor for blog-specific use -->
<MultiLangHTMLEditor
	bind:value={value}
	onChange={onChange}
	{placeholder}
	height={300}
	showLanguageTabs={true}
	className={className}
/>
