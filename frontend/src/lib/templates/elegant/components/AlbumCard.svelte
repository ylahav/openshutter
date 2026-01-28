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
		class="group relative bg-white overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-500 cursor-pointer flex flex-col transform hover:-translate-y-2 {className}"
	>
		<!-- Cover Image -->
		<div class="relative aspect-[4/3] bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden flex-shrink-0">
			{#if !coverImageLoading && coverImageUrl}
				<img
					src={coverImageUrl}
					alt={displayName}
					class="w-full h-full transition-transform duration-700 ease-out {coverImageUrl.includes('/logos/')
						? 'object-contain bg-white p-4'
						: 'object-cover group-hover:scale-110'}"
				/>
			{/if}

			{#if coverImageLoading}
				<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
					<div class="text-center">
						<div class="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
						<p class="text-xs text-purple-600 font-light">Loading...</p>
					</div>
				</div>
			{/if}

			{#if !coverImageUrl && !coverImageLoading}
				<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
					<div class="text-center">
						<svg class="w-16 h-16 text-purple-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<p class="text-xs text-purple-400 font-light">No cover image</p>
					</div>
				</div>
			{/if}

			<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

			<div class="absolute inset-0 bg-purple-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
				<div class="transform scale-90 group-hover:scale-100 transition-transform duration-500 border-2 border-white/40 rounded-full px-8 py-3 text-white font-medium bg-white/20 backdrop-blur-sm">
					View Album →
				</div>
			</div>
		</div>

		<!-- Content -->
		<div class="p-6 bg-white flex-1 flex flex-col">
			<h3 class="text-xl font-serif text-gray-900 mb-3 transition-colors duration-200 line-clamp-1 group-hover:text-purple-700" style="font-family: 'Playfair Display', serif;">
				{displayName}
			</h3>

			<div class="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed flex-1 font-light">
				{@html displayDesc || 'No description available'}
			</div>

			<div class="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
				<div class="flex items-center text-sm text-gray-500">
					{#if typeof album.photoCount === 'number' && album.photoCount > 0}
						<svg class="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
						<svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
						<span class="text-gray-400 text-sm font-light">Empty album</span>
					{/if}
				</div>

				{#if album.createdAt}
					<div class="text-xs text-gray-400 font-light">
						{new Date(album.createdAt).toLocaleDateString()}
					</div>
				{/if}
			</div>
		</div>
	</div>
</a>
