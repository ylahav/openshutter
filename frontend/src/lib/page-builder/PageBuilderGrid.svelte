<script lang="ts">
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { PageModuleData } from '$lib/types/page-builder';
	import type { ModulePlacement } from '$lib/page-builder/module-cell-placement';
	import { omitPlacement, placementFlexClasses } from '$lib/page-builder/module-cell-placement';
	import { activeTemplate } from '$stores/template';
	import { applyPackClassPrefix, packClassPrefixFor } from '$lib/template/packs/class-prefix';

	/** Modules already normalized (e.g. albumGallery → albumView). */
	export let modules: PageModuleData[] = [];
	export let layout: { gridRows: number; gridColumns: number };
	export let compact = false;
	/** Route / page context passed to every block (alias, params). */
	export let pageContext: Record<string, unknown> = {};

	const moduleMapStore = getContext<Writable<Record<string, any>> | undefined>('pbModuleMap');
	$: moduleMap = $moduleMapStore;

	if (!moduleMapStore) {
		console.error('[PageBuilderGrid] Missing pbModuleMap context');
	}

	interface RowData {
		rowOrder: number;
		columns: Array<{
			columnIndex: number;
			proportion: number;
			module?: PageModuleData;
		}>;
	}

	function buildRows(moduleList: PageModuleData[]): RowData[] {
		const rowMap = new Map<number, RowData>();

		moduleList.forEach((module) => {
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
				const rowOrder = module.order || 0;
				if (!rowMap.has(rowOrder)) {
					rowMap.set(rowOrder, { rowOrder, columns: [] });
				}
				rowMap.get(rowOrder)!.columns.push({
					columnIndex: 0,
					proportion: 1,
					module
				});
			}
		});

		rowMap.forEach((row) => row.columns.sort((a, b) => a.columnIndex - b.columnIndex));
		return Array.from(rowMap.values()).sort((a, b) => a.rowOrder - b.rowOrder);
	}

	$: rows = buildRows(modules);
	$: gridCols = layout?.gridColumns ?? Math.max(1, ...modules.map((m) => (m.columnIndex ?? 0) + (m.colSpan ?? 1)));
	$: gridRows = layout?.gridRows ?? Math.max(1, ...modules.map((m) => (m.rowOrder ?? 0) + (m.rowSpan ?? 1)));
	$: hasSpanning = modules.some((m) => (m.rowSpan ?? 1) > 1 || (m.colSpan ?? 1) > 1);

	$: contentMax = compact
		? 'w-full'
		: 'w-full max-w-(--os-max-width) mx-auto px-(--os-padding) box-border';
	const contentGap = 'gap-(--os-gap)';

	function cellPlacement(m: PageModuleData | undefined): ModulePlacement | undefined {
		return m?.props?.placement as ModulePlacement | undefined;
	}

	function wrapperClassName(m: PageModuleData | undefined, pack: string): string {
		const skipPrefix = m?.props?.classNameNoPackPrefix === true;
		const prefix = skipPrefix ? '' : packClassPrefixFor(pack);

		const raw = m?.props?.className;
		let base = typeof raw === 'string' ? raw.trim() : '';
		if (prefix && base) base = applyPackClassPrefix(base, prefix);

		const byPack = m?.props?.wrapperClassByPack ?? m?.props?.classNameByPack;
		let extra = '';
		if (byPack && typeof byPack === 'object' && !Array.isArray(byPack) && pack in byPack) {
			const v = (byPack as Record<string, unknown>)[pack];
			extra = typeof v === 'string' ? v.trim() : '';
		}
		if (prefix && extra) extra = applyPackClassPrefix(extra, prefix);

		return [base, extra].filter(Boolean).join(' ');
	}
</script>

{#if !moduleMapStore || !moduleMap}
	<div class="p-4 text-sm text-red-500">Page builder misconfigured (no module map).</div>
{:else if rows.length === 0}
	<div class="{compact ? 'w-full px-0' : contentMax} {compact ? 'py-2' : 'py-8'} text-center text-sm opacity-60">
		No blocks in this layout region.
	</div>
{:else if hasSpanning}
	<div
		class="{compact ? 'w-full' : contentMax} {compact ? 'py-2' : 'py-6'} {contentGap}"
		style="display: grid; grid-template-columns: repeat({gridCols}, 1fr); grid-template-rows: repeat({gridRows}, auto);"
	>
		{#each modules.filter((m) => m.rowOrder !== undefined && m.columnIndex !== undefined) as module, idx (module._id ?? `${module.type}-${module.rowOrder ?? 'r'}-${module.columnIndex ?? 'c'}-${idx}`)}
			<div
				class="{placementFlexClasses(cellPlacement(module))} {wrapperClassName(module, $activeTemplate)}"
				style="grid-column: {module.columnIndex! + 1} / span {module.colSpan ?? 1}; grid-row: {module.rowOrder! + 1} / span {module.rowSpan ?? 1}"
			>
				{#if moduleMap[module.type]}
					<svelte:component
						this={moduleMap[module.type]}
						{...omitPlacement(module.props)}
						data={pageContext}
						{compact}
					/>
				{:else}
					<div class="p-4 text-sm opacity-60">Unknown module: {module.type}</div>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	{#each rows as row (row.rowOrder)}
		<div class="flex gap-4 px-4 {compact ? 'py-2' : 'py-6'}">
			{#each row.columns as col (col.columnIndex)}
				<div
					class="flex-1 {placementFlexClasses(cellPlacement(col.module))} {wrapperClassName(col.module, $activeTemplate)}"
					style="flex: {col.proportion}"
				>
					{#if col.module}
						{#if moduleMap[col.module.type]}
							<svelte:component
								this={moduleMap[col.module.type]}
								{...omitPlacement(col.module.props)}
								data={pageContext}
								{compact}
							/>
						{:else}
							<div class="py-4 text-sm opacity-60">Unknown module type: {col.module.type}</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	{/each}
{/if}
