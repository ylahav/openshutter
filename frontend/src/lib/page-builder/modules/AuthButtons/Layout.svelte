<!-- frontend/src/lib/page-builder/modules/AuthButtons/Layout.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import VisitorSignInLink from '$lib/components/auth/VisitorSignInLink.svelte';
	import VisitorLogoutButton from '$lib/components/auth/VisitorLogoutButton.svelte';

	let { config = {} }: { config?: Record<string, unknown> } = $props();

	const loginLabel = $derived((config?.loginLabel as string) || 'Login');
	const logoutLabel = $derived((config?.logoutLabel as string) || 'Logout');
	const loginUrl = $derived((config?.loginUrl as string) || '/login');
	const buttonClass = $derived((config?.buttonClass as string) || 'auth-btn');
	const loginButtonClass = $derived(
		(config?.loginButtonClass as string) || `${buttonClass} auth-btn--login`
	);
	const logoutButtonClass = $derived(
		(config?.logoutButtonClass as string) || `${buttonClass} auth-btn--logout`
	);
	const containerClass = $derived((config?.containerClass as string) || 'auth-btns');
	const authenticated = $derived($auth.authenticated);
</script>

<div class="pb-authButtons">
	<div class={containerClass}>
		{#if authenticated}
			<VisitorLogoutButton className={logoutButtonClass} label={logoutLabel} />
		{:else}
			<VisitorSignInLink href={loginUrl} className={loginButtonClass} label={loginLabel} />
		{/if}
	</div>
</div>
