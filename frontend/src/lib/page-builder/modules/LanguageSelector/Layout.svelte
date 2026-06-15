<!-- frontend/src/lib/page-builder/modules/LanguageSelector/Layout.svelte -->
<script lang="ts">
	import LanguageSelector from '$pageBuilder/primitives/language-selector/LanguageSelector.svelte';

	let { config = {} }: { config?: Record<string, unknown> } = $props();

	const variant = $derived(config?.variant === 'flags' ? 'flags' : 'dropdown');
	const showFlags = $derived(config?.showFlags !== false);
	const showNativeNames = $derived(config?.showNativeNames !== false);
	const compact = $derived(config?.compact ?? false);
	const className = $derived((config?.className as string) || '');
</script>

<div class="pb-languageSelectorModule">
	<LanguageSelector {variant} {showFlags} {showNativeNames} {compact} {className} />
</div>
