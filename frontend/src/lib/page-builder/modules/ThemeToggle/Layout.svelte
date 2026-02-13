<!-- frontend/src/lib/page-builder/modules/ThemeToggle/Layout.svelte -->
<script lang="ts">
	import ThemeToggle from '$components/ThemeToggle.svelte';

	export let config: any = {};
	export let data: any = null;
	export let templateConfig: Record<string, any> = {};
</script>

<ThemeToggle />
