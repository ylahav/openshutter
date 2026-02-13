<!-- frontend/src/lib/page-builder/modules/LanguageSelector/Layout.svelte -->
<script lang="ts">
	import LanguageSelector from '$components/LanguageSelector.svelte';

	export let config: any = {};
	export let data: any = null;
	export let templateConfig: Record<string, any> = {};

	$: showFlags = config?.showFlags !== false;
	$: showNativeNames = config?.showNativeNames !== false;
	$: compact = config?.compact ?? false;
	$: className = config?.className || '';
</script>

<LanguageSelector {showFlags} {showNativeNames} {compact} {className} />
