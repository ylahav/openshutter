<!-- frontend/src/lib/page-builder/modules/ThemeSelect/Layout.svelte -->
<script lang="ts">
	import TemplateSelector from '$pageBuilder/primitives/template-selector/TemplateSelector.svelte';

	let { config = {} }: { config?: Record<string, unknown> } = $props();

	const compact = $derived(config?.compact ?? false);
	const className = $derived((config?.className as string) || '');
</script>

<div class="pb-themeSelectModule">
	<TemplateSelector {compact} {className} />
</div>
