<script lang="ts">
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { PageModuleData } from '$lib/types/page-builder';
	import type { ModulePlacement } from '$lib/page-builder/module-cell-placement';
	import { omitPlacement, placementCellStyle } from '$lib/page-builder/module-cell-placement';
	import { activeTemplate } from '$stores/template';
	import { applyPackClassPrefix, packClassPrefixFor } from '$lib/template/packs/class-prefix';

	/** Modules already normalized (e.g. albumGallery → albumView). */
	export let modules: PageModuleData[] = [];
	export let layout: { gridRows: number; gridColumns: number };
	/** When set (e.g. `auto auto 1fr auto auto`), non-spanning rows use CSS grid instead of equal flex columns — no inline `flex` on cells. */
	export let gridTemplateColumns: string | undefined = undefined;
	/** Optional per-row grid templates, e.g. `{ "0": "1fr 3fr 1fr", "1": "auto 1fr auto" }`. */
	export let rowTemplateColumnsByRow: Record<string, string> | undefined = undefined;
	/**
	 * Optional per-cell placement overrides by `row:col` key.
	 * Example: `{ "0:0": { horizontal: "start", vertical: "center" } }`.
	 */
	export let cellPlacementByCell: Record<string, ModulePlacement> | undefined = undefined;
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

function isSingleLayoutShellRow(row: RowData): boolean {
	if (row.columns.length !== 1) return false;
	const module = row.columns[0]?.module;
	return module?.type === 'layoutShell';
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
	$: spanningRenderModules = modules.map((m) => ({
		module: m,
		rowOrder: m.rowOrder ?? m.order ?? 0,
		columnIndex: m.columnIndex ?? 0,
		rowSpan: m.rowSpan ?? 1,
		colSpan: m.colSpan ?? 1
	}));

	$: contentMax = compact
		? 'w-full'
		: 'w-full max-w-(--os-max-width) mx-auto px-(--os-padding) box-border';
	const contentGap = 'gap-(--os-gap)';

	function cellPlacement(m: PageModuleData | undefined): ModulePlacement | undefined {
		return m?.props?.placement as ModulePlacement | undefined;
	}

	function effectivePlacement(
		rowOrder: number,
		columnIndex: number,
		m: PageModuleData | undefined
	): ModulePlacement | undefined {
		const key = `${rowOrder}:${columnIndex}`;
		const override = cellPlacementByCell?.[key];
		if (!override) return cellPlacement(m);
		return {
			...(cellPlacement(m) || {}),
			...override
		};
	}

	function rowTemplateFor(rowOrder: number): string | undefined {
		const perRow = rowTemplateColumnsByRow?.[String(rowOrder)]?.trim();
		return perRow || gridTemplateColumns;
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

	function cellWrapperClass(m: PageModuleData | undefined, pack: string): string {
		return ['pbModuleCell', wrapperClassName(m, pack)].filter(Boolean).join(' ');
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
		{#each spanningRenderModules as placed, idx (placed.module._id ?? `${placed.module.type}-${placed.rowOrder}-${placed.columnIndex}-${idx}`)}
			<div
				class={cellWrapperClass(placed.module, $activeTemplate)}
				style="{placementCellStyle(effectivePlacement(placed.rowOrder, placed.columnIndex, placed.module))}grid-column: {placed.columnIndex + 1} / span {placed.colSpan}; grid-row: {placed.rowOrder + 1} / span {placed.rowSpan};"
			>
				{#if moduleMap[placed.module.type]}
					<svelte:component
						this={moduleMap[placed.module.type]}
						{...omitPlacement(placed.module.props)}
						data={pageContext}
						{compact}
					/>
				{:else}
					<div class="p-4 text-sm opacity-60">Unknown module: {placed.module.type}</div>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	{#each rows as row (row.rowOrder)}
		{#if isSingleLayoutShellRow(row)}
			{@const shellCol = row.columns[0]}
			{#if shellCol?.module}
				{#if moduleMap[shellCol.module.type]}
					<svelte:component
						this={moduleMap[shellCol.module.type]}
						{...omitPlacement(shellCol.module.props)}
						className={wrapperClassName(shellCol.module, $activeTemplate)}
						data={pageContext}
						{compact}
					/>
				{:else}
					<div class="py-4 text-sm opacity-60">Unknown module type: {shellCol.module.type}</div>
				{/if}
			{/if}
		{:else}
			{@const rowTemplateColumns = rowTemplateFor(row.rowOrder)}
			<div
				class="{rowTemplateColumns ? 'grid' : 'flex'} gap-4 px-4 {compact ? 'py-2' : 'py-6'}"
				data-pb-shell-row={rowTemplateColumns ? 'grid' : undefined}
				style={rowTemplateColumns
					? `grid-template-columns: var(--pb-shell-cols, ${rowTemplateColumns})`
					: undefined}
			>
				{#each row.columns as col (col.columnIndex)}
					<div
						class={cellWrapperClass(col.module, $activeTemplate)}
						style={rowTemplateColumns
							? placementCellStyle(effectivePlacement(row.rowOrder, col.columnIndex, col.module))
							: `${placementCellStyle(effectivePlacement(row.rowOrder, col.columnIndex, col.module))}flex: ${col.proportion};`}
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
		{/if}
	{/each}
{/if}
