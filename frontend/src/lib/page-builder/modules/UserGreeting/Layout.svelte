<!-- frontend/src/lib/page-builder/modules/UserGreeting/Layout.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth';

	export let config: any = {};

	$: greeting = config?.greeting || 'Hello';
	$: showEmail = config?.showEmail ?? false;
	$: className = config?.className || '';
	$: user = $auth.user;
	$: authenticated = $auth.authenticated;

	$: displayName = user?.name || (showEmail ? user?.email : null) || 'User';
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
