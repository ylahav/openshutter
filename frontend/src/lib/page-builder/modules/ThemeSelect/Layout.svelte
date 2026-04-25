<!-- frontend/src/lib/page-builder/modules/ThemeSelect/Layout.svelte -->
<script lang="ts">
	import TemplateSelector from '$components/ui/template-selector/TemplateSelector.svelte';

	export let config: any = {};

	$: compact = config?.compact ?? false;
	$: className = config?.className || '';
</script>

<div class="pb-themeSelectModule">
	<TemplateSelector {compact} {className} />
</div>
