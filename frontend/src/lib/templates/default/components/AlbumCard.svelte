<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { logger } from '$lib/utils/logger';

	interface TemplateAlbum {
		_id: string;
		name?: any;
		description?: any;
		alias?: string;
		photoCount?: number;
		childAlbumCount?: number;
		createdAt?: string | Date;
	}

	export let album: TemplateAlbum;
	export let className = '';

	let coverImageUrl: string | null = null;
	let coverImageLoading = true;

	$: displayName = MultiLangUtils.getTextValue(album.name, $currentLanguage);
	$: displayDesc = MultiLangUtils.getHTMLValue(album.description, $currentLanguage);

	onMount(async () => {
		try {
			const res = await fetch(`/api/albums/${album._id}/cover-image`);
			if (res.ok) {
				const data = await res.json();
				coverImageUrl = data.url || null;
			}
		} catch (err) {
			logger.error('Failed to fetch cover image:', err);
		} finally {
			coverImageLoading = false;
		}
	});
</script>

<a href={`/albums/${album.alias || album._id}`}>
		<div
		class="group relative bg-background overflow-hidden border border-border cursor-pointer hover:shadow-lg transition-shadow duration-300 h-80 flex flex-col {className}"
	>
		<!-- Cover Image -->
		<div class="relative aspect-[3/2] bg-linear-to-b from-muted to-muted/70 overflow-hidden shrink-0">
			{#if !coverImageLoading && coverImageUrl}
				<img
					src={coverImageUrl}
					alt={displayName}
					class="w-full h-full transition-transform duration-700 ease-out {coverImageUrl.includes('/logos/')
						? 'object-contain bg-muted p-4'
						: 'object-contain bg-black/5 group-hover:scale-110'}"
				/>
			{/if}

			{#if coverImageLoading}
				<div class="absolute inset-0 flex items-center justify-center bg-linear-to-b from-muted to-muted/70">
					<div class="text-center">
						<div class="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
						<p class="text-xs text-muted-foreground">Loading...</p>
					</div>
				</div>
			{/if}

			{#if !coverImageUrl && !coverImageLoading}
				<div class="absolute inset-0 flex items-center justify-center bg-linear-to-b from-muted to-muted/70">
					<div class="text-center">
						<svg class="w-16 h-16 text-muted-foreground mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
						<p class="text-xs text-muted-foreground">No cover image</p>
					</div>
				</div>
			{/if}

			<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

			<div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
				<div class="transform scale-90 group-hover:scale-100 transition-transform duration-300 border border-white/30 rounded-full px-6 py-3 text-white font-semibold bg-white/30">
					View Album →
				</div>
			</div>
		</div>

		<!-- Content -->
		<div class="p-6 bg-background flex-1 flex flex-col">
			<h3 class="text-xl font-bold text-foreground mb-3 transition-colors duration-200 line-clamp-1 group-hover:text-primary">
				{displayName}
			</h3>

			<div class="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
				{@html displayDesc || 'No description available'}
			</div>

			<div class="flex items-center justify-between pt-4 border-t border-border mt-auto">
				<div class="flex items-center text-sm text-muted-foreground">
					{#if typeof album.photoCount === 'number' && album.photoCount > 0}
						<svg class="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<span class="font-medium">{album.photoCount} photos</span>
					{/if}
					{#if album.childAlbumCount && album.childAlbumCount > 0}
						{#if typeof album.photoCount === 'number' && album.photoCount > 0}
							<span class="mx-2">•</span>
						{/if}
						<svg class="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
							/>
						</svg>
						<span class="font-medium">{album.childAlbumCount} albums</span>
					{/if}
					{#if (!album.photoCount || album.photoCount === 0) && (!album.childAlbumCount || album.childAlbumCount === 0)}
						<span class="text-muted-foreground text-sm">Empty album</span>
					{/if}
				</div>

				{#if album.createdAt}
					<div class="text-xs text-muted-foreground">
						{new Date(album.createdAt).toLocaleDateString()}
					</div>
				{/if}
			</div>
		</div>
	</div>
</a>
