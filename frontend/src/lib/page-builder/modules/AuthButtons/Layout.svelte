<!-- frontend/src/lib/page-builder/modules/AuthButtons/Layout.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import VisitorSignInLink from '$lib/components/auth/VisitorSignInLink.svelte';
	import VisitorLogoutButton from '$lib/components/auth/VisitorLogoutButton.svelte';

	export let config: any = {};

	$: loginLabel = config?.loginLabel || 'Login';
	$: logoutLabel = config?.logoutLabel || 'Logout';
	$: loginUrl = config?.loginUrl || '/login';
	$: buttonClass = config?.buttonClass || 'auth-btn';
	$: loginButtonClass = config?.loginButtonClass || `${buttonClass} auth-btn--login`;
	$: logoutButtonClass = config?.logoutButtonClass || `${buttonClass} auth-btn--logout`;
	$: containerClass = config?.containerClass || 'auth-btns';
	$: authenticated = $auth.authenticated;
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
