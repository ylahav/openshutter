<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import AdminAppChrome from '$lib/components/AdminAppChrome.svelte';
	import ForcePasswordChangeModal from '$lib/components/ForcePasswordChangeModal.svelte';

	let {
		data,
		children
	}: {
		data: { user?: { forcePasswordChange?: boolean } };
		children: Snippet;
	} = $props();
</script>

{#if data.user?.forcePasswordChange}
	<ForcePasswordChangeModal onSuccess={() => invalidateAll()} />
{/if}

<AdminAppChrome>
	{@render children()}
</AdminAppChrome>
