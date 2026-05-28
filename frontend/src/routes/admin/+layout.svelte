<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate, invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import AdminAppChrome from '$lib/components/AdminAppChrome.svelte';
	import ForcePasswordChangeModal from '$lib/components/ForcePasswordChangeModal.svelte';
	import { unregisterPublicServiceWorkers } from '$lib/pwa/pwa-install';
	import { adminFullPageNavigate } from '$lib/admin/adminFullPageNavigate';

	export let data: { user?: { forcePasswordChange?: boolean }; navKey: string };

	beforeNavigate(adminFullPageNavigate);

	onMount(() => {
		if (!browser) return;
		void unregisterPublicServiceWorkers();
	});
</script>

{#if data.user?.forcePasswordChange}
	<ForcePasswordChangeModal onSuccess={() => invalidateAll()} />
{/if}

<AdminAppChrome>
	{#key data.navKey}
		<slot />
	{/key}
</AdminAppChrome>
