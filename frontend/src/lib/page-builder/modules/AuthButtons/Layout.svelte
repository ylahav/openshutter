<!-- frontend/src/lib/page-builder/modules/AuthButtons/Layout.svelte -->
<script lang="ts">
	import { auth, logout } from '$lib/stores/auth';

	export let config: any = {};
	export let data: any = null;
	export let templateConfig: Record<string, any> = {};

	$: loginLabel = config?.loginLabel || 'Login';
	$: logoutLabel = config?.logoutLabel || 'Logout';
	$: loginUrl = config?.loginUrl || '/login';
	$: buttonClass = config?.buttonClass || 'px-4 py-2 rounded-md font-medium transition-colors';
	$: loginButtonClass = config?.loginButtonClass || `${buttonClass} bg-blue-600 text-white hover:bg-blue-700`;
	$: logoutButtonClass = config?.logoutButtonClass || `${buttonClass} bg-gray-600 text-white hover:bg-gray-700`;
	$: containerClass = config?.containerClass || 'flex items-center gap-2';
	$: authenticated = $auth.authenticated;

	async function handleLogout() {
		await logout();
	}
</script>

<div class={containerClass}>
	{#if authenticated}
		<button
			type="button"
			on:click={handleLogout}
			class={logoutButtonClass}
		>
			{logoutLabel}
		</button>
	{:else}
		<a
			href={loginUrl}
			class={loginButtonClass}
		>
			{loginLabel}
		</a>
	{/if}
</div>
