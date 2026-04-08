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
	<div class="py-20 px-8 text-center">
		<div
			class="w-8 h-8 rounded-full animate-spin mx-auto border-2 border-[color:var(--tp-border)] border-t-[color:var(--os-primary)]"
		></div>
		<p class="mt-4 text-[11px] uppercase tracking-[0.2em]" style="color: var(--tp-fg-muted);">
			{$t('loading.loading')}
		</p>
	</div>
{:else if error}
	<p class="py-16 text-center text-sm text-red-500/90 px-8">{error}</p>
{:else}
	<div class="max-w-[960px] mx-auto px-8 py-12">
		<div class="text-center mb-9">
			<h2 class="text-2xl tracking-[0.08em] mb-2.5" style="font-family: var(--os-font-heading); color: var(--tp-fg);">
				{$t('admin.featuredAlbums')}
			</h2>
			<div class="w-9 h-px mx-auto mb-2.5" style="background: var(--os-primary);"></div>
			<p class="text-[10px] uppercase tracking-[0.22em]" style="color: var(--tp-fg-muted);">
				{$t('albums.rootLevelAlbumsDescription')}
			</p>
		</div>

		{#if filtered.length > 0}
			<div class="flex flex-col">
				{#each filtered as album, i}
					<a
						href={`/albums/${album.alias || album._id}`}
						class="group grid grid-cols-1 md:grid-cols-[160px_1fr] gap-7 py-7 border-b transition-colors first:border-t border-[color:var(--tp-border)] no-underline opacity-0 translate-y-5 animate-[atelier-reveal_0.8s_ease_forwards]"
						style="animation-delay: {0.05 + i * 0.1}s;"
					>
						<div class="overflow-hidden rounded-sm">
							<div
								class="aspect-[4/3] transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.03]"
								style="background: {thumbBg[i % 3]};"
							>
								{#if coverUrls[album._id]}
									<img
										src={coverUrls[album._id]!}
										alt=""
										class="w-full h-full object-cover"
									/>
								{/if}
							</div>
						</div>
						<div class="pt-1">
							<div class="text-[10px] tracking-[0.2em] mb-2" style="color: var(--os-primary);">
								{padNum(i + 1)}
							</div>
							<h3
								class="text-xl tracking-[0.04em] mb-2 transition-colors group-hover:text-[color:var(--os-primary)]"
								style="font-family: var(--os-font-heading); color: var(--tp-fg);"
							>
								{MultiLangUtils.getTextValue(album.name, $currentLanguage)}
							</h3>
							{#if album.description}
								<p class="text-[13px] leading-relaxed mb-3 line-clamp-4" style="color: var(--tp-fg-muted);">
									{MultiLangUtils.getHTMLValue(album.description, $currentLanguage).replace(/<[^>]*>/g, '')}
								</p>
							{/if}
							<div class="flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.16em]" style="color: var(--tp-fg-muted);">
								{#if typeof album.photoCount === 'number' && album.photoCount > 0}
									<span>{album.photoCount} {$t('albums.photos')}</span>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<p class="text-center py-16 text-[13px]" style="color: var(--tp-fg-muted);">
				{$t('albums.noAlbumsText')}
			</p>
		{/if}
	</div>
{/if}

<style>
	@keyframes atelier-reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
