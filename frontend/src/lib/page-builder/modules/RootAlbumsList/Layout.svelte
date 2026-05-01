<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { logger } from '$lib/utils/logger';
	import './_styles.scss';

	type RootAlbum = {
		_id?: string;
		alias?: string;
		name?: string | Record<string, string>;
		title?: string | Record<string, string>;
	};

	type RootAlbumsListConfig = {
		title?: string | Record<string, string>;
		limit?: number;
	};

	export let config: RootAlbumsListConfig = {};

	let albums: RootAlbum[] = [];
	let isLoading = true;

	$: titleText = config?.title ? MultiLangUtils.getTextValue(config.title, $currentLanguage) : '';
	$: maxItems = Math.min(100, Math.max(1, Number(config?.limit) || 50));
	$: visibleAlbums = albums.slice(0, maxItems);

	const toDisplayName = (album: RootAlbum): string => {
		const byName = MultiLangUtils.getTextValue(album?.name, $currentLanguage)?.trim();
		if (byName) return byName;
		const byTitle = MultiLangUtils.getTextValue(album?.title, $currentLanguage)?.trim();
		return byTitle || '';
	};

	onMount(async () => {
		try {
			const response = await fetch('/api/albums?parentId=root');
			if (!response.ok) return;
			const payload = await response.json();
			albums = Array.isArray(payload) ? payload : [];
		} catch (error) {
			logger.error('RootAlbumsList: failed to fetch root albums', error);
			albums = [];
		} finally {
			isLoading = false;
		}
	});
</script>

<section class="pb-rootAlbumsList" aria-busy={isLoading}>
	{#if titleText}
		<h2 class="pb-rootAlbumsList__title">{titleText}</h2>
	{/if}

	{#if visibleAlbums.length > 0}
		<ul class="pb-rootAlbumsList__list">
			{#each visibleAlbums as album, index (album._id || album.alias || `album-${index}`)}
				{@const albumName = toDisplayName(album)}
				{#if albumName}
					<li class="pb-rootAlbumsList__item">{albumName}</li>
				{/if}
			{/each}
		</ul>
	{/if}
</section>
