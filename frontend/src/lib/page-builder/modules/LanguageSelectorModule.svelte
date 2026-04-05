<!-- frontend/src/lib/page-builder/modules/LanguageSelectorModule.svelte -->
<script lang="ts">
	import Layout from './LanguageSelector/Layout.svelte';

	export let props: any = undefined;
</script>

<Layout config={props || {}} />
