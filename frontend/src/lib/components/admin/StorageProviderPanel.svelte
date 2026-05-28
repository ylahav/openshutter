<script lang="ts">
	/** Shows one storage provider panel when it is the active tab. */
	export let tabId: string;
	export let activeTab: string;
</script>

{#if activeTab === tabId}
	<div role="tabpanel">
		<slot />
	</div>
{/if}
