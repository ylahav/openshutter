<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { logger } from '$lib/utils/logger';
	import { t } from '$stores/i18n';

	interface TemplateAlbum {
		_id: string;
		name?: any;
		description?: any;
		alias?: string;
		photoCount?: number;
	}

	export let albums: TemplateAlbum[] = [];
	export let loading = false;
	export let error: string | null = null;
	/** `gallery` = full /albums page (different heading, no “browse all” link). */
	export let pageContext: 'home' | 'gallery' = 'home';

	const thumbBg = [
		'color-mix(in srgb, var(--os-primary) 25%, #2c1f14)',
		'color-mix(in srgb, var(--os-secondary) 30%, #1a2518)',
		'color-mix(in srgb, var(--os-accent) 22%, #2a1f35)'
	];

	let coverUrls: Record<string, string | null> = {};
	let coverFetchKey = '';

	$: filtered = albums;

	$: {
		const key = albums.map((a) => a._id).join(',');
		if (key && key !== coverFetchKey) {
			coverFetchKey = key;
			void fetchCoversFor(albums);
		}
	}

	async function fetchCoversFor(list: TemplateAlbum[]) {
		const next = { ...coverUrls };
		for (const a of list) {
			if (next[a._id] !== undefined) continue;
			next[a._id] = null;
			try {
				const res = await fetch(`/api/albums/${a._id}/cover-image`);
				if (res.ok) {
					const data = await res.json();
					next[a._id] = data.url || null;
				}
			} catch (e) {
				logger.error('atelier cover fetch', e);
			}
		}
		coverUrls = next;
	}

	function padNum(n: number): string {
		return String(n).padStart(2, '0');
	}
</script>

{#if loading}
	<div class="tpl-loading">
		<div class="tpl-loading__spinner"></div>
		<p class="tpl-loading__label">
			{$t('loading.loading')}
		</p>
	</div>
{:else if error}
	<p class="tpl-error">{error}</p>
{:else}
	<div class="a-section">
		<div class="a-section__header">
			<h2 class="a-section__title">
				{pageContext === 'gallery' ? $t('navigation.albums') : $t('admin.featuredAlbums')}
			</h2>
			<div class="a-section__rule"></div>
			<p class="a-section__sub">
				{pageContext === 'gallery'
					? $t('albums.browsePhotoCollections')
					: $t('albums.rootLevelAlbumsDescription')}
			</p>
		</div>

		{#if filtered.length > 0}
			<div class="a-album-list">
				{#each filtered as album, i}
					<a
						href={`/albums/${album.alias || album._id}`}
						class="a-album-item a-reveal"
						style="animation-delay: {0.05 + i * 0.1}s"
					>
						<div class="a-album-item__thumb">
							<div
								class="a-album-item__thumb-inner"
								style="background: {thumbBg[i % 3]};"
							>
								{#if coverUrls[album._id]}
									<img src={coverUrls[album._id]!} alt="" />
								{/if}
							</div>
						</div>
						<div class="a-album-item__body">
							<div class="a-album-item__num">
								{padNum(i + 1)}
							</div>
							<h3 class="a-album-item__title">
								{MultiLangUtils.getTextValue(album.name, $currentLanguage)}
							</h3>
							{#if album.description}
								<p class="a-album-item__desc">
									{MultiLangUtils.getHTMLValue(album.description, $currentLanguage).replace(/<[^>]*>/g, '')}
								</p>
							{/if}
							<div class="a-album-item__meta">
								{#if typeof album.photoCount === 'number' && album.photoCount > 0}
									<span>{album.photoCount} {$t('albums.photos')}</span>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<p class="a-bio" style="text-align: center; margin-bottom: 0;">
				{$t('albums.noAlbumsText')}
			</p>
		{/if}
	</div>
{/if}
