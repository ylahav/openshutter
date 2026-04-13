<!-- frontend/src/lib/page-builder/modules/LanguageSelector/Layout.svelte -->
<script lang="ts">
	import LanguageSelector from '$components/ui/language-selector/LanguageSelector.svelte';

	export let config: any = {};

	$: variant = config?.variant === 'flags' ? 'flags' : 'dropdown';
	$: showFlags = config?.showFlags !== false;
	$: showNativeNames = config?.showNativeNames !== false;
	$: compact = config?.compact ?? false;
	$: className = config?.className || '';
</script>

<LanguageSelector {variant} {showFlags} {showNativeNames} {compact} {className} />
