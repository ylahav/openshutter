<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ForcePasswordChangeModal from '$lib/components/ForcePasswordChangeModal.svelte';

	export let data: { user?: { forcePasswordChange?: boolean } };
</script>

{#if data.user?.forcePasswordChange}
	<ForcePasswordChangeModal onSuccess={() => invalidateAll()} />
{/if}

<slot />
