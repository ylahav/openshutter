<script lang="ts">
	import { tick } from 'svelte';
	import type { PageModuleData } from '$lib/types/page-builder';
	import AlertModal from '$lib/components/AlertModal.svelte';
	import { logger } from '$lib/utils/logger';

	export let modules: PageModuleData[] = [];
	export let rowStructure: Map<number, number[]> = new Map(); // rowOrder -> proportions[]
	export let onAddRow: (columns: number[]) => Promise<void>;
	export let onDeleteRow: (rowOrder: number) => Promise<void>;
	export let onReorderRow: (rowOrder: number, direction: 'up' | 'down') => Promise<void>;
	export let onAssignModule: (rowOrder: number, columnIndex: number, moduleType: string, props: Record<string, any>) => Promise<void>;
	export let onRemoveModule: (moduleId: string) => Promise<void>;
	export let onEditModule: (module: PageModuleData) => void;
	export let availableModuleTypes: Array<{ value: string; label: string }> = [];

	interface RowData {
		rowOrder: number;
		columns: Array<{
			columnIndex: number;
			proportion: number;
			module?: PageModuleData;
		}>;
	}

	let showAddRowDialog = false;
	let newRowColumns = '1,1,1';
	let addingRow = false;
	
	// Alert modal state
	let showErrorModal = false;
	let errorModalTitle = '';
	let errorModalMessage = '';

	$: rows = buildRows(modules, rowStructure);

	function buildRows(moduleList: PageModuleData[], structure: Map<number, number[]>): RowData[] {
		const rowMap = new Map<number, RowData>();
		
		// First, add rows from structure (even if they have no modules yet)
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
		
		// Then, add modules to their respective rows/columns
		moduleList.forEach((module) => {
			if (module.rowOrder === undefined || module.columnIndex === undefined) return;
			
			if (!rowMap.has(module.rowOrder)) {
				// Row not in structure, create it from module data
				rowMap.set(module.rowOrder, {
					rowOrder: module.rowOrder,
					columns: []
				});
			}
			
			const row = rowMap.get(module.rowOrder)!;
			
			// Find or create the column
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
		
		// Sort columns within each row
		rowMap.forEach((row) => {
			row.columns.sort((a, b) => a.columnIndex - b.columnIndex);
		});
		
		return Array.from(rowMap.values()).sort((a, b) => a.rowOrder - b.rowOrder);
	}

	function parseProportions(input: string): number[] {
		return input
			.split(',')
			.map((s) => parseInt(s.trim(), 10))
			.filter((n) => !isNaN(n) && n > 0);
	}

	async function showError(title: string, message: string) {
		errorModalTitle = title;
		errorModalMessage = message;
		showErrorModal = false; // Reset first to ensure reactivity
		await tick(); // Wait for reactivity
		showErrorModal = true;
	}

	async function handleAddRow() {
		const proportions = parseProportions(newRowColumns);
		if (proportions.length === 0) {
			await showError('Invalid Proportions', 'Please enter valid proportions (e.g., 1,2,3)');
			return;
		}
		addingRow = true;
		try {
			await onAddRow(proportions);
			showAddRowDialog = false;
			newRowColumns = '1,1,1';
		} catch (err) {
			logger.error('Failed to add row:', err);
		} finally {
			addingRow = false;
		}
	}

	async function handleAssignModule(rowOrder: number, columnIndex: number, moduleType: string) {
		if (!moduleType) return;
		await onAssignModule(rowOrder, columnIndex, moduleType, {});
	}

	function getColumnWidth(proportion: number, totalProportion: number): string {
		const percentage = (proportion / totalProportion) * 100;
		return `${percentage}%`;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900">Page Layout (Rows & Columns)</h3>
		<button
			type="button"
			on:click={() => { showAddRowDialog = true; }}
			class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
		>
			+ Add Row
		</button>
	</div>

	{#if rows.length === 0}
		<div class="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
			<p class="mb-2">No rows yet.</p>
			<p class="text-sm">Click "Add Row" to start building your page layout.</p>
		</div>
	{:else}
		{#each rows as row, index (row.rowOrder)}
			{@const totalProportion = row.columns.reduce((sum, col) => sum + col.proportion, 0)}
			{@const isFirst = index === 0}
			{@const isLast = index === rows.length - 1}
			<div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-3">
						<h4 class="text-sm font-medium text-gray-700">Row {row.rowOrder + 1}</h4>
						{#if rows.length > 1}
							<div class="flex items-center gap-1">
								<button
									type="button"
									on:click={() => onReorderRow(row.rowOrder, 'up')}
									disabled={isFirst}
									class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
									title="Move up"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
									</svg>
								</button>
								<button
									type="button"
									on:click={() => onReorderRow(row.rowOrder, 'down')}
									disabled={isLast}
									class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
									title="Move down"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
							</div>
						{/if}
					</div>
					<button
						type="button"
						on:click={() => onDeleteRow(row.rowOrder)}
						class="text-sm text-red-600 hover:text-red-800"
					>
						Delete Row
					</button>
				</div>

				<div class="flex gap-2">
					{#each row.columns as col, colIdx (col.columnIndex)}
						<div
							class="border border-gray-300 rounded p-3 bg-white flex-1"
							style="flex: {col.proportion}"
						>
							<div class="flex items-center justify-between mb-2">
								<span class="text-xs text-gray-500">
									Col {col.columnIndex + 1} ({col.proportion}/{totalProportion})
								</span>
							</div>

							{#if col.module && !col.module.props?._placeholder}
								<div class="space-y-2">
									<div class="p-2 bg-blue-50 rounded border border-blue-200">
										<p class="text-sm font-medium text-gray-900">{col.module.type}</p>
										<div class="flex gap-2 mt-2">
											<button
												type="button"
												on:click={() => onEditModule(col.module!)}
												class="text-xs text-blue-600 hover:text-blue-800"
											>
												Edit
											</button>
											<button
												type="button"
												on:click={() => onRemoveModule(col.module!._id)}
												class="text-xs text-red-600 hover:text-red-800"
											>
												Remove
											</button>
										</div>
									</div>
								</div>
							{:else}
								<select
									class="w-full text-sm border border-gray-300 rounded px-2 py-1"
									on:change={(e) => {
										const moduleType = e.currentTarget.value;
										if (moduleType) {
											handleAssignModule(row.rowOrder, col.columnIndex, moduleType);
										}
									}}
								>
									<option value="">Select module...</option>
									{#each availableModuleTypes as moduleType}
										<option value={moduleType.value}>{moduleType.label}</option>
									{/each}
								</select>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

<!-- Add Row Dialog -->
{#if showAddRowDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Add New Row</h3>
			
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Column Proportions (comma-separated)
					</label>
					<input
						type="text"
						bind:value={newRowColumns}
						placeholder="1,2,3"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
					<p class="mt-1 text-xs text-gray-500">
						Enter proportions for each column. Example: "1,2,3" creates 3 columns with widths 1/6, 1/3, and 1/2.
					</p>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						on:click={() => { showAddRowDialog = false; newRowColumns = '1,1,1'; }}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleAddRow}
						disabled={addingRow}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{addingRow ? 'Adding...' : 'Add Row'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Error Modal -->
<AlertModal
	isOpen={showErrorModal}
	title={errorModalTitle}
	message={errorModalMessage}
	variant="warning"
	onClose={() => {
		showErrorModal = false;
	}}
/>
