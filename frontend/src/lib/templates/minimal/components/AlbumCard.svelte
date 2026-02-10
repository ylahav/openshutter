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
		class="group relative bg-white overflow-hidden border border-black cursor-pointer hover:border-gray-600 transition-all duration-200 flex flex-col {className}"
	>
		<!-- Cover Image -->
		<div class="relative aspect-[3/2] bg-gray-100 overflow-hidden shrink-0">
			{#if !coverImageLoading && coverImageUrl}
				<img
					src={coverImageUrl}
					alt={displayName}
					class="w-full h-full transition-opacity duration-300 {coverImageUrl.includes('/logos/')
						? 'object-contain bg-white p-4'
						: 'object-contain bg-black/5 group-hover:opacity-90'}"
				/>
			{/if}

			{#if coverImageLoading}
				<div class="absolute inset-0 flex items-center justify-center bg-gray-100">
					<div class="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
				</div>
			{/if}

			{#if !coverImageUrl && !coverImageLoading}
				<div class="absolute inset-0 flex items-center justify-center bg-gray-100">
					<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1"
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				</div>
			{/if}
		</div>

		<!-- Content -->
		<div class="p-4 bg-white flex-1 flex flex-col">
			<h3 class="text-lg font-normal text-black mb-2 line-clamp-1">
				{displayName}
			</h3>

			<div class="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed flex-1">
				{@html displayDesc || ''}
			</div>

			<div class="flex items-center justify-between pt-3 border-t border-gray-200 mt-auto">
				<div class="flex items-center text-xs text-gray-500">
					{#if typeof album.photoCount === 'number' && album.photoCount > 0}
						<span>{album.photoCount} photos</span>
					{/if}
					{#if album.childAlbumCount && album.childAlbumCount > 0}
						{#if typeof album.photoCount === 'number' && album.photoCount > 0}
							<span class="mx-2">•</span>
						{/if}
						<span>{album.childAlbumCount} albums</span>
					{/if}
					{#if (!album.photoCount || album.photoCount === 0) && (!album.childAlbumCount || album.childAlbumCount === 0)}
						<span>Empty</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
</a>
