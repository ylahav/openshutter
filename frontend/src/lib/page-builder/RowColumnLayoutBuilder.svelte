<script lang="ts">
	import type { PageModuleData } from '$lib/types/page-builder';

	export let modules: PageModuleData[] = [];
	export let rowStructure: Map<number, number[]> = new Map(); // rowOrder -> proportions[]
	export let onAssignModule: (rowOrder: number, columnIndex: number, moduleType: string, props: Record<string, any>, rowSpan?: number, colSpan?: number) => Promise<void>;
	export let onRemoveModule: (moduleId: string) => Promise<void>;
	export let onEditModule: (module: PageModuleData) => void;
	export let availableModuleTypes: Array<{ value: string; label: string }> = [];
export let onMoveRow: (fromRowOrder: number, toRowOrder: number) => Promise<void>;
export let onInsertRow: (atRowOrder: number) => Promise<void>;
export let onDeleteRow: (rowOrder: number) => Promise<void>;

	interface RowData {
		rowOrder: number;
		columns: Array<{
			columnIndex: number;
			proportion: number;
			module?: PageModuleData;
		}>;
	}

	// Selected cells: Set of "rowOrder:columnIndex"
	let selectedCells = new Set<string>();

	$: rows = buildRows(modules, rowStructure);

	function buildRows(moduleList: PageModuleData[], structure: Map<number, number[]>): RowData[] {
		const rowMap = new Map<number, RowData>();

		structure.forEach((proportions, rowOrder) => {
			rowMap.set(rowOrder, {
				rowOrder,
				columns: proportions.map((prop, idx) => ({
					columnIndex: idx,
					proportion: prop,
					module: undefined
				}))
			});
		});

		moduleList.forEach((module) => {
			if (module.rowOrder === undefined || module.columnIndex === undefined) return;

			if (!rowMap.has(module.rowOrder)) {
				rowMap.set(module.rowOrder, {
					rowOrder: module.rowOrder,
					columns: []
				});
			}

			const row = rowMap.get(module.rowOrder)!;
			let column = row.columns.find((col) => col.columnIndex === module.columnIndex);
			if (!column) {
				column = {
					columnIndex: module.columnIndex,
					proportion: module.columnProportion || 1,
					module
				};
				row.columns.push(column);
			} else {
				column.module = module;
				if (module.columnProportion) {
					column.proportion = module.columnProportion;
				}
			}
		});

		rowMap.forEach((row) => {
			row.columns.sort((a, b) => a.columnIndex - b.columnIndex);
		});

		return Array.from(rowMap.values()).sort((a, b) => a.rowOrder - b.rowOrder);
	}

	function cellKey(rowOrder: number, columnIndex: number): string {
		return `${rowOrder}:${columnIndex}`;
	}

	function toggleCell(rowOrder: number, columnIndex: number) {
		const key = cellKey(rowOrder, columnIndex);
		const next = new Set(selectedCells);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		selectedCells = next;
	}

	function selectRow(rowOrder: number) {
		const row = rows.find((r) => r.rowOrder === rowOrder);
		if (!row) return;
		const next = new Set(selectedCells);
		for (const col of row.columns) {
			const key = cellKey(rowOrder, col.columnIndex);
			next.add(key);
		}
		selectedCells = next;
	}

	function selectAll() {
		const next = new Set<string>();
		for (const row of rows) {
			for (const col of row.columns) {
				next.add(cellKey(row.rowOrder, col.columnIndex));
			}
		}
		selectedCells = next;
	}

	function clearSelection() {
		selectedCells = new Set();
	}

	/** Check if cell (r,c) is covered by a module (but not the origin) */
	function isCellCovered(r: number, c: number): PageModuleData | null {
		for (const m of modules) {
			if (m.rowOrder === undefined || m.columnIndex === undefined) continue;
			const rs = m.rowSpan ?? 1;
			const cs = m.colSpan ?? 1;
			const inSpan = r >= m.rowOrder && r < m.rowOrder + rs && c >= m.columnIndex && c < m.columnIndex + cs;
			const isOrigin = r === m.rowOrder && c === m.columnIndex;
			if (inSpan && !isOrigin) return m;
		}
		return null;
	}

	/** Get module at cell (r,c) - only if it's the origin of that module */
	function getModuleAt(r: number, c: number): PageModuleData | null {
		return modules.find((m) => m.rowOrder === r && m.columnIndex === c) ?? null;
	}

	function getModuleInstanceName(module: PageModuleData): string {
		const props = (module?.props || {}) as Record<string, unknown>;
		return String(props.instanceRef ?? props.presetKey ?? '').trim();
	}

	$: selectedCount = selectedCells.size;
	$: selectedCellsArray = Array.from(selectedCells).map((key) => {
		const [r, c] = key.split(':').map(Number);
		return { rowOrder: r, columnIndex: c };
	});

	/** Bounding rect of selection: minRow, minCol, rowSpan, colSpan */
	$: selectionBounds = (() => {
		if (selectedCellsArray.length === 0) return null;
		const minRow = Math.min(...selectedCellsArray.map((c) => c.rowOrder));
		const maxRow = Math.max(...selectedCellsArray.map((c) => c.rowOrder));
		const minCol = Math.min(...selectedCellsArray.map((c) => c.columnIndex));
		const maxCol = Math.max(...selectedCellsArray.map((c) => c.columnIndex));
		return { rowOrder: minRow, columnIndex: minCol, rowSpan: maxRow - minRow + 1, colSpan: maxCol - minCol + 1 };
	})();

	let assignSelectEl: HTMLSelectElement;

	async function handleAssignToSelected(moduleType: string) {
		if (!moduleType || !selectionBounds) return;
		// Create ONE module for the selection (merged)
		await onAssignModule(
			selectionBounds.rowOrder,
			selectionBounds.columnIndex,
			moduleType,
			{},
			selectionBounds.rowSpan,
			selectionBounds.colSpan
		);
		clearSelection();
		if (assignSelectEl) assignSelectEl.value = '';
	}
</script>

<div class="space-y-4">
	{#if rows.length === 0}
		<div class="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
			<p>No grid yet. Set grid dimensions and click "Initialize Grid".</p>
		</div>
	{:else}
		{@const colCount = rows[0]?.columns.length ?? 1}
		<!-- Grid with CSS Grid for spanning support -->
		<div class="overflow-x-auto border-2 border-border rounded-lg">
			<div
				class="gap-2 p-2 bg-background min-w-max"
				style="display: grid; grid-template-columns: minmax(10rem, 12rem) repeat({colCount}, minmax(8rem, 1fr)); grid-template-rows: repeat({rows.length}, minmax(80px, auto));"
			>
				{#each rows as row (row.rowOrder)}
				{@const rowIdx = rows.findIndex((r) => r.rowOrder === row.rowOrder)}
				<div
					class="sticky left-0 z-10 flex flex-col justify-center gap-1 rounded-md border border-border bg-muted px-2 py-2"
					style="grid-column: 1; grid-row: {row.rowOrder + 1}"
				>
					<div class="text-[11px] font-semibold text-foreground leading-tight">
						Row {rowIdx + 1}
					</div>
					<div class="text-[10px] text-muted-foreground leading-tight">
						Band · grid row {rowIdx + 1} of {rows.length}
					</div>
					<div class="mt-1 flex flex-wrap gap-1">
						<button
							type="button"
							class="px-1.5 py-0.5 text-[11px] rounded border bg-background text-foreground border-border hover:bg-muted disabled:opacity-50"
							disabled={rowIdx === 0}
							on:click={() => onMoveRow(row.rowOrder, rows[rowIdx - 1]!.rowOrder)}
						>
							↑
						</button>
						<button
							type="button"
							class="px-1.5 py-0.5 text-[11px] rounded border bg-background text-foreground border-border hover:bg-muted disabled:opacity-50"
							disabled={rowIdx >= rows.length - 1}
							on:click={() => onMoveRow(row.rowOrder, rows[rowIdx + 1]!.rowOrder)}
						>
							↓
						</button>
						<button
							type="button"
							class="px-1.5 py-0.5 text-[11px] rounded border bg-background text-foreground border-border hover:bg-muted"
							on:click={() => onInsertRow(row.rowOrder)}
						>
							+↑
						</button>
						<button
							type="button"
							class="px-1.5 py-0.5 text-[11px] rounded border bg-background text-foreground border-border hover:bg-muted"
							on:click={() => onInsertRow(row.rowOrder + 1)}
						>
							+↓
						</button>
						<button
							type="button"
							class="px-1.5 py-0.5 text-[11px] rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
							disabled={rows.length <= 1}
							on:click={() => onDeleteRow(row.rowOrder)}
						>
							🗑
						</button>
					</div>
				</div>
				{#each row.columns as col (col.columnIndex)}
					{@const covered = isCellCovered(row.rowOrder, col.columnIndex)}
					{@const mod = getModuleAt(row.rowOrder, col.columnIndex)}
					{@const key = cellKey(row.rowOrder, col.columnIndex)}
					{@const selected = selectedCells.has(key)}
					{#if covered}
						<!-- Covered cell - placeholder, not rendered (spanned by module) -->
					{:else if mod && !mod.props?._placeholder}
						{@const instanceName = getModuleInstanceName(mod)}
						<div
							class="border border-primary/30 rounded-lg p-3 bg-primary/5"
							style="grid-column: {col.columnIndex + 2} / span {mod.colSpan ?? 1}; grid-row: {row.rowOrder + 1} / span {mod.rowSpan ?? 1}"
						>
							<div class="flex flex-col h-full">
								<p class="text-sm font-medium text-foreground">{mod.type}</p>
								{#if instanceName}
									<p class="text-xs text-muted-foreground mt-1">Instance: {instanceName}</p>
								{/if}
								{#if (mod.rowSpan ?? 1) > 1 || (mod.colSpan ?? 1) > 1}
									<p class="text-xs text-muted-foreground mt-1">{mod.rowSpan ?? 1}×{mod.colSpan ?? 1} span</p>
								{/if}
								<div class="flex gap-2 mt-2">
									<button
										type="button"
										class="text-xs text-primary hover:opacity-80"
										on:click={() => onEditModule(mod)}
									>
										Edit
									</button>
									<button
										type="button"
										class="text-xs text-destructive hover:opacity-80"
										on:click={() => onRemoveModule(mod._id)}
									>
										Remove
									</button>
								</div>
							</div>
						</div>
					{:else}
						<div
							class="border rounded-lg p-3 min-h-[80px] cursor-pointer transition-colors
								{selected ? 'ring-2 ring-ring bg-accent border-primary' : 'border-border bg-background hover:bg-muted'}"
							style="grid-column: {col.columnIndex + 2}; grid-row: {row.rowOrder + 1}"
							role="button"
							tabindex="0"
							on:click={() => toggleCell(row.rowOrder, col.columnIndex)}
							on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCell(row.rowOrder, col.columnIndex); } }}
						>
							<span class="text-xs text-muted-foreground">
								{selected ? 'Selected' : 'Click to select'}
							</span>
						</div>
					{/if}
				{/each}
				{/each}
			</div>
		</div>

		<!-- Selection toolbar -->
		<div class="flex flex-wrap items-center gap-3 border-t border-border pt-4">
			<button
				type="button"
				on:click={selectAll}
				class="text-sm text-muted-foreground hover:text-foreground"
			>
				Select all
			</button>
			{#if selectedCount > 0}
				<span class="text-sm text-muted-foreground">
					{selectedCount} cell{selectedCount !== 1 ? 's' : ''} → 1 module
					{#if selectionBounds && (selectionBounds.rowSpan > 1 || selectionBounds.colSpan > 1)}
						({selectionBounds.rowSpan}×{selectionBounds.colSpan})
					{/if}
				</span>
				<select
					bind:this={assignSelectEl}
					class="text-sm border border-border rounded px-3 py-1.5 bg-background"
					on:change={(e) => {
						const v = e.currentTarget.value;
						if (v) handleAssignToSelected(v);
					}}
				>
					<option value="">Assign module...</option>
					{#each availableModuleTypes as mt}
						<option value={mt.value}>{mt.label}</option>
					{/each}
				</select>
				<button
					type="button"
					on:click={clearSelection}
					class="text-sm text-muted-foreground hover:text-foreground"
				>
					Clear selection
				</button>
			{/if}
		</div>
	{/if}
</div>
