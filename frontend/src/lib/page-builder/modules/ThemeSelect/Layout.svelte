<!-- frontend/src/lib/page-builder/modules/ThemeSelect/Layout.svelte -->
<script lang="ts">
	import TemplateSelector from '$lib/components/TemplateSelector.svelte';

	export let config: any = {};
	export let data: any = null;
	export let templateConfig: Record<string, any> = {};

	$: compact = config?.compact ?? false;
	$: className = config?.className || '';
</script>

<TemplateSelector {compact} {className} />
