<!-- frontend/src/lib/page-builder/modules/AuthButtons/Layout.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import VisitorSignInLink from '$lib/components/auth/VisitorSignInLink.svelte';
	import VisitorLogoutButton from '$lib/components/auth/VisitorLogoutButton.svelte';

	export let config: any = {};

	$: loginLabel = config?.loginLabel || 'Login';
	$: logoutLabel = config?.logoutLabel || 'Logout';
	$: loginUrl = config?.loginUrl || '/login';
	$: buttonClass = config?.buttonClass || 'px-4 py-2 rounded-md font-medium transition-colors';
	$: loginButtonClass =
		config?.loginButtonClass ||
		`${buttonClass} bg-[color:var(--os-primary)] text-[color:var(--tp-on-brand)] hover:opacity-90 border border-transparent`;
	$: logoutButtonClass =
		config?.logoutButtonClass ||
		`${buttonClass} border border-[color:var(--tp-border)] bg-[color:var(--tp-surface-2)] text-[color:var(--tp-fg)] hover:bg-[color:var(--tp-surface-3)]`;
	$: containerClass = config?.containerClass || 'flex items-center gap-2';
	$: authenticated = $auth.authenticated;
</script>

<div class={containerClass}>
	{#if authenticated}
		<VisitorLogoutButton className={logoutButtonClass} label={logoutLabel} />
	{:else}
		<VisitorSignInLink href={loginUrl} className={loginButtonClass} label={loginLabel} />
	{/if}
</div>
