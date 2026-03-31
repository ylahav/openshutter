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

	export let title: NonNullable<CtaProps['title']> = '';
	export let description: CtaProps['description'] = undefined;
	export let primaryLabel: NonNullable<CtaProps['primaryLabel']> = 'Get Started';
	export let primaryHref: NonNullable<CtaProps['primaryHref']> = '/';
	export let secondaryLabel: CtaProps['secondaryLabel'] = undefined;
	export let secondaryHref: CtaProps['secondaryHref'] = undefined;

	// Temporary migration fallback for legacy nested props.config payloads
	export let props: LegacyCtaProps | undefined = undefined;
	$: config = (props?.config ??
		(props && typeof props === 'object' ? props : undefined) ?? {
			title,
			description,
			primaryLabel,
			primaryHref,
			secondaryLabel,
			secondaryHref
		}) satisfies CtaProps;
	const data = null;
	const templateConfig = {};
</script>

<Layout config={config} {data} {templateConfig} />
