<script lang="ts">
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { PageModuleData } from '$lib/types/page-builder';
	import type { ModulePlacement } from '$lib/page-builder/module-cell-placement';
	import { omitPlacement, placementCellStyle, placementGridCellClassNames } from '$lib/page-builder/module-cell-placement';
	import { resolveModuleProps } from '$lib/page-builder/module-instances';
	import {
		hardenGridFrTracks,
		shellGridTemplateColumns
	} from '$lib/page-builder/normalize-grid-template-columns';
	import { activeTemplate } from '$stores/template';
	import { siteConfigData } from '$stores/siteConfig';
	import { applyPackClassPrefix, packClassPrefixFor } from '$lib/template/packs/class-prefix';

	let {
		modules = [],
		layout,
		gridTemplateColumns = undefined,
		rowTemplateColumnsByRow = undefined,
		cellPlacementByCell = undefined,
		compact = false,
		pageContext = {}
	}: {
		modules?: PageModuleData[];
		layout: { gridRows: number; gridColumns: number };
		gridTemplateColumns?: string;
		rowTemplateColumnsByRow?: Record<string, string>;
		cellPlacementByCell?: Record<string, ModulePlacement>;
		compact?: boolean;
		pageContext?: Record<string, unknown>;
	} = $props();

	const moduleMapStore = getContext<Writable<Record<string, unknown>> | undefined>('pbModuleMap');
	const moduleMap = $derived($moduleMapStore);
	const pageAliasPrefixes = $derived($siteConfigData?.template?.pageAliasPrefixes);

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

	/**
	 * When the page layout declares more columns than any row has placed modules,
	 * pad the row with empty cells so the flex renderer (`!hasSpanning` branch)
	 * keeps the explicit grid width — otherwise a 2-column row with a single placed
	 * module collapses to one full-width cell.
	 */
	function padRowsToGridColumns(rs: RowData[], gridColumns: number): RowData[] {
		if (!Number.isFinite(gridColumns) || gridColumns <= 1) return rs;
		return rs.map((row) => {
			// Preserve full-width semantics for a row that contains a single layoutShell module —
			// it has its own dedicated render branch and should not be reflowed into a multi-cell row.
			if (isSingleLayoutShellRow(row)) return row;
			const present = new Set(row.columns.map((c) => c.columnIndex));
			const columns = [...row.columns];
			for (let i = 0; i < gridColumns; i++) {
				if (!present.has(i)) {
					columns.push({ columnIndex: i, proportion: 1, module: undefined });
				}
			}
			columns.sort((a, b) => a.columnIndex - b.columnIndex);
			return { ...row, columns };
		});
	}

	const gridCols = $derived(
		layout?.gridColumns ?? Math.max(1, ...modules.map((m) => (m.columnIndex ?? 0) + (m.colSpan ?? 1)))
	);
	const rows = $derived(padRowsToGridColumns(buildRows(modules), gridCols));
	const gridRows = $derived(
		layout?.gridRows ?? Math.max(1, ...modules.map((m) => (m.rowOrder ?? 0) + (m.rowSpan ?? 1)))
	);
	const hasSpanning = $derived(
		modules.some((m) => Number(m.rowSpan ?? 1) > 1 || Number(m.colSpan ?? 1) > 1)
	);
	const spanningRenderModules = $derived(
		modules.map((m) => ({
			module: m,
			rowOrder: m.rowOrder ?? m.order ?? 0,
			columnIndex: m.columnIndex ?? 0,
			rowSpan: m.rowSpan ?? 1,
			colSpan: m.colSpan ?? 1
		}))
	);

	const contentMax = $derived(
		compact ? 'w-full' : 'w-full max-w-(--os-max-width) mx-auto px-(--os-padding) box-border'
	);
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

	function templateColumnsFromModuleProportions(rowOrder: number): string | undefined {
		const rowMods = modules
			.filter((m) => Number(m.rowOrder ?? 0) === rowOrder)
			.sort((a, b) => Number(a.columnIndex ?? 0) - Number(b.columnIndex ?? 0));
		if (rowMods.length < 2) return undefined;
		const props = rowMods.map((m) => {
			const p = Number(m.columnProportion ?? 1);
			return Number.isFinite(p) && p > 0 ? p : 1;
		});
		if (props.every((p) => p === props[0])) return undefined;
		return props.map((p) => `${p}fr`).join(' ');
	}

	function rowTemplateFor(row: RowData): string | undefined {
		const perRow = rowTemplateColumnsByRow?.[String(row.rowOrder)]?.trim();
		if (perRow) return shellGridTemplateColumns(perRow);
		const gt = gridTemplateColumns?.trim();
		if (gt) return shellGridTemplateColumns(gt);
		const derived = templateColumnsFromModuleProportions(row.rowOrder);
		return derived ? hardenGridFrTracks(derived) : undefined;
	}

	const spanningGridTemplateColumns = $derived(
		gridRows !== 1
			? `repeat(${gridCols}, minmax(0, 1fr))`
			: (() => {
					const t = rowTemplateColumnsByRow?.['0']?.trim() || gridTemplateColumns?.trim();
					if (t) return shellGridTemplateColumns(t);
					const derived = templateColumnsFromModuleProportions(0);
					return derived ? hardenGridFrTracks(derived) : `repeat(${gridCols}, minmax(0, 1fr))`;
				})()
	);

	function wrapperClassName(m: PageModuleData | undefined, pack: string): string {
		if (m?.type === 'loginForm') return '';

		const skipPrefix = m?.props?.classNameNoPackPrefix === true;
		const prefix = skipPrefix ? '' : packClassPrefixFor(pack, pageAliasPrefixes);

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

	function gridShellCellWrapperClass(
		m: PageModuleData | undefined,
		pack: string,
		placement: ModulePlacement | undefined
	): string {
		return [
			'pbModuleCell',
			'pbModuleCell--shellGrid',
			placementGridCellClassNames(placement),
			wrapperClassName(m, pack)
		]
			.filter(Boolean)
			.join(' ');
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
		style="display: grid; grid-template-columns: {spanningGridTemplateColumns}; grid-template-rows: repeat({gridRows}, auto);"
	>
		{#each spanningRenderModules as placed, idx (placed.module._id ?? `${placed.module.type}-${placed.rowOrder}-${placed.columnIndex}-${idx}`)}
			<div
				class={gridShellCellWrapperClass(
					placed.module,
					$activeTemplate,
					effectivePlacement(placed.rowOrder, placed.columnIndex, placed.module)
				)}
				style="grid-column: {placed.columnIndex + 1} / span {placed.colSpan}; grid-row: {placed.rowOrder + 1} / span {placed.rowSpan};"
			>
				{#if moduleMap[placed.module.type]}
					{@const Mod = moduleMap[placed.module.type]}
					{@const resolvedSpan = resolveModuleProps($siteConfigData, placed.module.type, placed.module.props as Record<string, unknown>) ?? placed.module.props}
					<Mod
						{...omitPlacement(resolvedSpan)}
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
					{@const Mod = moduleMap[shellCol.module.type]}
					{@const resolvedShell = resolveModuleProps($siteConfigData, shellCol.module.type, shellCol.module.props as Record<string, unknown>) ?? shellCol.module.props}
					<Mod
						{...omitPlacement(resolvedShell)}
						className={wrapperClassName(shellCol.module, $activeTemplate)}
						data={pageContext}
						{compact}
					/>
				{:else}
					<div class="py-4 text-sm opacity-60">Unknown module type: {shellCol.module.type}</div>
				{/if}
			{/if}
		{:else}
			{@const rowTemplateColumns = rowTemplateFor(row)}
			<div
				class="{rowTemplateColumns ? 'grid' : 'flex'} gap-4 px-4 {compact ? 'py-2' : 'py-6'}"
				data-pb-shell-row={rowTemplateColumns ? 'grid' : undefined}
				style={rowTemplateColumns ? `grid-template-columns: ${rowTemplateColumns}` : undefined}
			>
				{#each row.columns as col (col.columnIndex)}
					<div
						class={rowTemplateColumns
							? gridShellCellWrapperClass(
									col.module,
									$activeTemplate,
									effectivePlacement(row.rowOrder, col.columnIndex, col.module)
								)
							: cellWrapperClass(col.module, $activeTemplate)}
						style={rowTemplateColumns
							? undefined
							: `${placementCellStyle(effectivePlacement(row.rowOrder, col.columnIndex, col.module))}flex: ${col.proportion};`}
					>
						{#if col.module}
							{#if moduleMap[col.module.type]}
								{@const Mod = moduleMap[col.module.type]}
								{@const resolvedFlex = resolveModuleProps($siteConfigData, col.module.type, col.module.props as Record<string, unknown>) ?? col.module.props}
								<Mod
									{...omitPlacement(resolvedFlex)}
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
