<!-- frontend/src/lib/page-builder/modules/UserGreeting/Layout.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth';

	let { config = {} }: { config?: Record<string, unknown> } = $props();

	const greeting = $derived((config?.greeting as string) || 'Hello');
	const showEmail = $derived(config?.showEmail ?? false);
	const className = $derived((config?.className as string) || '');
	const user = $derived($auth.user);
	const authenticated = $derived($auth.authenticated);
	const displayName = $derived(user?.name || (showEmail ? user?.email : null) || 'User');
</script>

{#if authenticated && user}
	<span class={`pb-userGreeting ${className || 'pb-userGreeting--muted'}`.trim()}>
		{greeting}, {displayName}
	</span>
{/if}

<style lang="scss">
	.pb-userGreeting {
		display: inline;
	}
	.pb-userGreeting--muted {
		color: var(--tp-fg-muted);
	}
</style>
