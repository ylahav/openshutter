<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';
	import HeroModule from './modules/HeroModule.svelte';
	import RichTextModule from './modules/RichTextModule.svelte';
	import FeatureGridModule from './modules/FeatureGridModule.svelte';
	import AlbumGalleryModule from './modules/AlbumGalleryModule.svelte';
	import CtaModule from './modules/CtaModule.svelte';

	export let page: PageData | null = null;
	export let modules: PageModuleData[] = [];

	$: titleText = page?.title ? MultiLangUtils.getTextValue(page.title, $currentLanguage) : '';
	$: subtitleText = page?.subtitle ? MultiLangUtils.getTextValue(page.subtitle, $currentLanguage) : '';

	const moduleMap: Record<string, any> = {
		hero: HeroModule,
		richText: RichTextModule,
		featureGrid: FeatureGridModule,
		albumsGrid: AlbumGalleryModule,
		albumGallery: AlbumGalleryModule, // Backward compatibility
		cta: CtaModule
	};

	// Build rows from modules
	interface RowData {
		rowOrder: number;
		columns: Array<{
			columnIndex: number;
			proportion: number;
			module?: PageModuleData;
		}>;
	}

	$: rows = buildRows(modules);

	function buildRows(moduleList: PageModuleData[]): RowData[] {
		const rowMap = new Map<number, RowData>();
		
		// Group modules by rowOrder
		moduleList.forEach((module) => {
			// Support both new (row/column) and legacy (zone) structure
			if (module.rowOrder !== undefined && module.columnIndex !== undefined) {
				if (!rowMap.has(module.rowOrder)) {
					rowMap.set(module.rowOrder, {
						rowOrder: module.rowOrder,
						columns: []
					});
				}
				
				const row = rowMap.get(module.rowOrder)!;
				row.columns.push({
					columnIndex: module.columnIndex,
					proportion: module.columnProportion || 1,
					module
				});
			} else if (module.zone) {
				// Legacy zone-based: treat as single-column rows
				const rowOrder = module.order || 0;
				if (!rowMap.has(rowOrder)) {
					rowMap.set(rowOrder, {
						rowOrder,
						columns: []
					});
				}
				const row = rowMap.get(rowOrder)!;
				row.columns.push({
					columnIndex: 0,
					proportion: 1,
					module
				});
			}
		});
		
		// Sort columns within each row
		rowMap.forEach((row) => {
			row.columns.sort((a, b) => a.columnIndex - b.columnIndex);
		});
		
		return Array.from(rowMap.values()).sort((a, b) => a.rowOrder - b.rowOrder);
	}
</script>

{#if !page}
	<div class="min-h-screen flex items-center justify-center text-gray-500">Page not found.</div>
{:else}
	<div class="min-h-screen bg-white">
		{#if titleText || subtitleText}
			<div class="max-w-4xl mx-auto px-4 py-12 text-center border-b border-gray-200">
				{#if titleText}
					<h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{titleText}</h1>
				{/if}
				{#if subtitleText}
					<h2 class="text-xl md:text-2xl font-semibold text-gray-700">{subtitleText}</h2>
				{/if}
			</div>
		{/if}

		{#if rows.length === 0}
			<div class="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
				No modules configured for this page yet.
			</div>
		{:else}
			{#each rows as row (row.rowOrder)}
				{@const totalProportion = row.columns.reduce((sum, col) => sum + col.proportion, 0)}
				<div class="flex gap-4 px-4 py-6">
					{#each row.columns as col (col.columnIndex)}
						<div
							class="flex-1"
							style="flex: {col.proportion}"
						>
							{#if col.module}
								{#if moduleMap[col.module.type]}
									<svelte:component this={moduleMap[col.module.type]} {...col.module.props} />
								{:else}
									<div class="max-w-4xl mx-auto px-4 py-6 text-sm text-gray-500">
										Unknown module type: {col.module.type}
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
{/if}
