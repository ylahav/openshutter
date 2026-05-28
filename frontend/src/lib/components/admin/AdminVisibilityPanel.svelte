<script lang="ts">
	/** Renders slot content only when `activeId` matches `panelId` (Svelte 5–safe tab panels). */
	export let panelId: string;
	export let activeId: string;
</script>

{#if activeId === panelId}
	<div role="tabpanel">
		<slot />
	</div>
{/if}
