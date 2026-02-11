<!-- frontend/src/lib/page-builder/modules/CtaModule.svelte -->
<script lang="ts">
	import Layout from './Cta/Layout.svelte';

	export let title: string | Record<string, string> = '';
	export let description: string | Record<string, string> | undefined;
	export let primaryLabel = 'Get Started';
	export let primaryHref = '/';
	export let secondaryLabel: string | undefined;
	export let secondaryHref: string | undefined;

	// Support legacy: props or props.config; otherwise use individual props from spread
	export let props: any = undefined;
	$: config = props?.config ?? (props && typeof props === 'object' ? props : null) ?? {
		title, description, primaryLabel, primaryHref, secondaryLabel, secondaryHref
	};
	const data = null;
	const templateConfig = {};
</script>

<Layout config={config} {data} {templateConfig} />
