<!-- frontend/src/lib/page-builder/modules/ThemeToggle/Layout.svelte -->
<script lang="ts">
	import ThemeToggle from '$pageBuilder/primitives/theme-toggle/ThemeToggle.svelte';

	export let variant: 'icons' | 'text' = 'icons';
</script>

<div class="pb-themeToggleModule">
	<ThemeToggle {variant} />
</div>
