<script lang="ts">
	/** Renders one site-config panel when it is the active tab. */
	export let tabId: string;
	export let activeTab: string;
</script>

{#if activeTab === tabId}
	<div class="block" role="tabpanel">
		<slot />
	</div>
{/if}
