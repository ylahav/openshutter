<!-- frontend/src/lib/page-builder/modules/PersonBioModule.svelte -->
<script lang="ts">
	import Layout from './PersonBio/Layout.svelte';

	type PersonBioProps = {
		name?: string | Record<string, string>;
		portraitImage?: string;
		paragraphs?: Array<string | Record<string, string>>;
	};

	type LegacyPersonBioProps = {
		config?: PersonBioProps;
	} & PersonBioProps;

	let {
		name = undefined,
		portraitImage = undefined,
		paragraphs = undefined,
		props,
		data,
		compact,
		...rest
	}: {
		name?: PersonBioProps['name'];
		portraitImage?: PersonBioProps['portraitImage'];
		paragraphs?: PersonBioProps['paragraphs'];
		props?: LegacyPersonBioProps;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by((): PersonBioProps => {
		if (props !== undefined) {
			return (props.config ??
				(props && typeof props === 'object' ? props : undefined) ?? {
					name,
					portraitImage,
					paragraphs
				}) as PersonBioProps;
		}
		const spread = rest as PersonBioProps;
		if (
			spread.name !== undefined ||
			spread.portraitImage !== undefined ||
			spread.paragraphs !== undefined
		) {
			return spread;
		}
		return { name, portraitImage, paragraphs };
	});
</script>

<Layout config={config} />
