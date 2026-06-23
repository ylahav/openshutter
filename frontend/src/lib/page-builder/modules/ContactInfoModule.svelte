<!-- frontend/src/lib/page-builder/modules/ContactInfoModule.svelte -->
<script lang="ts">
	import Layout from './ContactInfo/Layout.svelte';

	type ContactInfoLink = {
		label?: string | Record<string, string>;
		href?: string;
		icon?: string;
	};

	type ContactInfoProps = {
		name?: string | Record<string, string>;
		email?: string;
		links?: ContactInfoLink[];
	};

	type LegacyContactInfoProps = {
		config?: ContactInfoProps;
	} & ContactInfoProps;

	let {
		name = undefined,
		email = undefined,
		links = undefined,
		props,
		data,
		compact,
		...rest
	}: {
		name?: ContactInfoProps['name'];
		email?: ContactInfoProps['email'];
		links?: ContactInfoProps['links'];
		props?: LegacyContactInfoProps;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by((): ContactInfoProps => {
		if (props !== undefined) {
			return (props.config ??
				(props && typeof props === 'object' ? props : undefined) ?? {
					name,
					email,
					links
				}) as ContactInfoProps;
		}
		const spread = rest as ContactInfoProps;
		if (spread.name !== undefined || spread.email !== undefined || spread.links !== undefined) {
			return spread;
		}
		return { name, email, links };
	});
</script>

<Layout config={config} />
