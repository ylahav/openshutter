<script lang="ts" module>
	export interface VisitorSignInLinkProps {
		href?: string;
		className?: string;
		/** Override default translated label (e.g. from menu config). */
		label?: string;
		icon?: string;
		external?: boolean;
		style?: string;
		/** e.g. close mobile menu before following /login */
		onBeforeNavigate?: () => void;
	}
</script>

<script lang="ts">
	import { t } from '$stores/i18n';

	let {
		href = '/login',
		className = '',
		label,
		icon,
		external = false,
		style: inlineStyle,
		onBeforeNavigate
	}: VisitorSignInLinkProps = $props();

	function handleClick() {
		onBeforeNavigate?.();
	}
</script>

<a
	{href}
	class={className}
	style={inlineStyle}
	data-auth-action="sign-in"
	target={external ? '_blank' : undefined}
	rel={external ? 'noopener noreferrer' : undefined}
	onclick={handleClick}
>
	{#if icon}
		<span class="icon-{icon}" aria-hidden="true"></span>
	{/if}
	{label ?? $t('auth.signIn')}
</a>
