<!-- frontend/src/lib/page-builder/modules/LanguageSelectorModule.svelte -->
<script lang="ts">
	import Layout from './LanguageSelector/Layout.svelte';

	export let props: any = undefined;
	const data = null;
	const templateConfig = {};
</script>

<Layout config={props || {}} {data} {templateConfig} />
