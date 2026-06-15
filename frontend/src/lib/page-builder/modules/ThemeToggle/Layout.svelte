<!-- frontend/src/lib/page-builder/modules/ThemeToggle/Layout.svelte -->
<script lang="ts">
	import ThemeToggle from '$pageBuilder/primitives/theme-toggle/ThemeToggle.svelte';

	let { variant = 'icons' }: { variant?: 'icons' | 'text' | 'both' } = $props();
</script>

<div class="pb-themeToggleModule">
	<ThemeToggle {variant} />
</div>
