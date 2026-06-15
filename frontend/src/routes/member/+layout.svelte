<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ForcePasswordChangeModal from '$lib/components/ForcePasswordChangeModal.svelte';

	let { data, children }: { data: { user?: { forcePasswordChange?: boolean } }; children: import('svelte').Snippet } = $props();
</script>

{#if data.user?.forcePasswordChange}
	<ForcePasswordChangeModal onSuccess={() => invalidateAll()} />
{/if}

{@render children?.()}
