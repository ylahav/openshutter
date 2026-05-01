<script lang="ts">
	import Layout from './RootAlbumsList/Layout.svelte';

	type RootAlbumsListProps = {
		title?: string | Record<string, string>;
		limit?: number;
	};

	type LegacyRootAlbumsListProps = {
		config?: RootAlbumsListProps;
	} & RootAlbumsListProps;

	export let title: RootAlbumsListProps['title'] = undefined;
	export let limit: RootAlbumsListProps['limit'] = undefined;

	// Temporary migration fallback for legacy nested props.config payloads
	export let props: LegacyRootAlbumsListProps | undefined = undefined;
	$: config = (props?.config ??
		(props && typeof props === 'object' ? props : undefined) ?? {
			title,
			limit
		}) satisfies RootAlbumsListProps;
</script>

<Layout {config} />
