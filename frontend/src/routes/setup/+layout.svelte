<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<!-- Override the default layout to hide header/footer for setup page -->
{@render children?.()}
