<!-- frontend/src/lib/page-builder/modules/ContactInfo/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';

	type ContactInfoLink = {
		label?: string | Record<string, string>;
		href?: string;
		icon?: string;
	};

	type ContactInfoConfig = {
		name?: string | Record<string, string>;
		email?: string;
		links?: ContactInfoLink[];
	};

	let { config = {} }: { config?: ContactInfoConfig } = $props();

	const nameText = $derived(MultiLangUtils.getTextValue(config?.name, $currentLanguage) || '');
	const email = $derived(
		typeof config?.email === 'string' && config.email.trim() ? config.email.trim() : ''
	);
	const links = $derived(Array.isArray(config?.links) ? config.links : []);

	function linkLabel(l: ContactInfoLink): string {
		return MultiLangUtils.getTextValue(l?.label, $currentLanguage) || '';
	}

	function linkIcon(l: ContactInfoLink): string {
		return typeof l?.icon === 'string' && l.icon ? l.icon : '↗';
	}
</script>

<aside class="pb-contactInfo">
	<div class="pb-contactInfo__card">
		{#if nameText}
			<div class="pb-contactInfo__title">{nameText}</div>
		{/if}
		{#if email}
			<a href={`mailto:${email}`} class="pb-contactInfo__link">
				<span class="pb-contactInfo__icon" aria-hidden="true">✉</span>
				<span>{email}</span>
			</a>
		{/if}
		{#each links as l, i (i)}
			{@const label = linkLabel(l)}
			{#if l?.href && label}
				<a href={l.href} class="pb-contactInfo__link">
					<span class="pb-contactInfo__icon" aria-hidden="true">{linkIcon(l)}</span>
					<span>{label}</span>
				</a>
			{/if}
		{/each}
	</div>
</aside>

<style lang="scss">
	.pb-contactInfo__card {
		border-radius: 12px;
		padding: 24px;
		border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
	}

	.pb-contactInfo__title {
		font-weight: 700;
		font-size: 15px;
		margin-bottom: 16px;
	}

	.pb-contactInfo__link {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		margin-bottom: 10px;
		text-decoration: none;
		color: inherit;
		opacity: 0.85;
		transition: opacity 0.15s, color 0.15s;

		&:hover {
			opacity: 1;
		}
	}

	.pb-contactInfo__icon {
		display: inline-flex;
		min-width: 14px;
	}
</style>
