<script lang="ts" module>
	export interface VisitorLogoutButtonProps {
		className?: string;
		/** Run before logout (e.g. close mobile menu). */
		beforeLogout?: () => void | Promise<void>;
		label?: string;
		icon?: string;
		style?: string;
	}
</script>

<script lang="ts">
	import { t } from '$stores/i18n';
	import { logout } from '$lib/stores/auth';

	let {
		className = '',
		beforeLogout,
		label,
		icon,
		style: inlineStyle
	}: VisitorLogoutButtonProps = $props();

	async function handleClick() {
		if (beforeLogout) await beforeLogout();
		await logout();
	}
</script>

<button
	type="button"
	class={className}
	style={inlineStyle}
	data-auth-action="sign-out"
	onclick={handleClick}
>
	{#if icon}
		<span class="icon-{icon}" aria-hidden="true"></span>
	{/if}
	{label ?? $t('header.logout')}
</button>
