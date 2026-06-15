<script lang="ts">
	import Layout from './RootAlbumsList/Layout.svelte';

	type RootAlbumsListProps = {
		title?: string | Record<string, string>;
		limit?: number;
	};

	type LegacyRootAlbumsListProps = {
		config?: RootAlbumsListProps;
	} & RootAlbumsListProps;

	let {
		title = undefined,
		limit = undefined,
		props,
		data,
		compact,
		...rest
	}: {
		title?: RootAlbumsListProps['title'];
		limit?: RootAlbumsListProps['limit'];
		props?: LegacyRootAlbumsListProps;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by((): RootAlbumsListProps => {
		if (props !== undefined) {
			return (props.config ??
				(props && typeof props === 'object' ? props : undefined) ?? {
					title,
					limit
				}) as RootAlbumsListProps;
		}
		const spread = rest as RootAlbumsListProps;
		if (spread.title !== undefined || spread.limit !== undefined) {
			return spread;
		}
		return { title, limit };
	});
</script>

<Layout {config} />
