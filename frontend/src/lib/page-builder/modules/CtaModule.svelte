<!-- frontend/src/lib/page-builder/modules/CtaModule.svelte -->
<script lang="ts">
	import Layout from './Cta/Layout.svelte';

	type CtaProps = {
		title?: string | Record<string, string>;
		description?: string | Record<string, string>;
		primaryLabel?: string | Record<string, string>;
		primaryHref?: string;
		secondaryLabel?: string | Record<string, string>;
		secondaryHref?: string;
	};

	type LegacyCtaProps = {
		config?: CtaProps;
	} & CtaProps;

	let {
		title = '',
		description = undefined,
		primaryLabel = 'Get Started',
		primaryHref = '/',
		secondaryLabel = undefined,
		secondaryHref = undefined,
		props,
		data,
		compact,
		...rest
	}: {
		title?: CtaProps['title'];
		description?: CtaProps['description'];
		primaryLabel?: CtaProps['primaryLabel'];
		primaryHref?: CtaProps['primaryHref'];
		secondaryLabel?: CtaProps['secondaryLabel'];
		secondaryHref?: CtaProps['secondaryHref'];
		props?: LegacyCtaProps;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by((): CtaProps => {
		if (props !== undefined) {
			return (props.config ??
				(props && typeof props === 'object' ? props : undefined) ?? {
					title,
					description,
					primaryLabel,
					primaryHref,
					secondaryLabel,
					secondaryHref
				}) as CtaProps;
		}
		const spread = rest as CtaProps;
		if (
			spread.title !== undefined ||
			spread.description !== undefined ||
			spread.primaryLabel !== undefined ||
			spread.primaryHref !== undefined
		) {
			return spread;
		}
		return { title, description, primaryLabel, primaryHref, secondaryLabel, secondaryHref };
	});
</script>

<Layout config={config} />
