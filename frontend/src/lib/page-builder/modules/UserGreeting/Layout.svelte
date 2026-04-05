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
	<span class="{className || 'text-gray-700 dark:text-gray-300'}">
		{greeting}, {displayName}
	</span>
{/if}
