<script lang="ts">
	import { t } from '$stores/i18n';
	import { siteConfig } from '$stores/siteConfig';
	import RowColumnLayoutBuilder from '$lib/page-builder/RowColumnLayoutBuilder.svelte';
	import ModulePropsForm from '$lib/components/ModulePropsForm.svelte';
	import {
		HEADER_MODULE_OPTIONS,
		FOOTER_MODULE_OPTIONS
	} from '$lib/page-builder/header-footer-module-options';
	import type { PageModuleData } from '$lib/types/page-builder';
	import { adminToast } from '$lib/admin/adminToast';
	import {
		adminBtnPrimarySm,
		adminBtnSecondary,
		adminRingPrimary
	} from '$lib/admin/admin-cerberus';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { logger } from '$lib/utils/logger';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	type ChromeSlot = 'header' | 'footer';

	let headerModules = $state<PageModuleData[]>(cloneModules(data.headerModules));
	let footerModules = $state<PageModuleData[]>(cloneModules(data.footerModules));
	/** Last persisted snapshot (initial load or last successful save). Drives dirty-state and Discard. */
	let savedHeaderModules = $state<PageModuleData[]>(cloneModules(data.headerModules));
	let savedFooterModules = $state<PageModuleData[]>(cloneModules(data.footerModules));
	let saving = $state(false);
	let editing = $state<{ slot: ChromeSlot; module: PageModuleData } | null>(null);
	let editingPropsDraft = $state<Record<string, unknown>>({});
	let editingTypeDraft = $state<string>('');

	const headerDirty = $derived(JSON.stringify(headerModules) !== JSON.stringify(savedHeaderModules));
	const footerDirty = $derived(JSON.stringify(footerModules) !== JSON.stringify(savedFooterModules));
	const isDirty = $derived(headerDirty || footerDirty);

	const headerRowStructure = $derived(buildRowStructure(headerModules));
	const footerRowStructure = $derived(buildRowStructure(footerModules));

	function cloneModules(list: PageModuleData[] | undefined): PageModuleData[] {
		if (!Array.isArray(list)) return [];
		return list.map((m) => ({ ...m, props: m.props ? structuredClone(m.props) : {} }));
	}

	/**
	 * RowColumnLayoutBuilder expects a `rowOrder -> proportions[]` map. Page editor reads
	 * proportions from columnProportion on persisted modules; for chrome we have no separate
	 * grid record, so each row's column count is inferred from the max `columnIndex + colSpan`
	 * present in that row (or any existing module's recorded proportions).
	 */
	function buildRowStructure(list: PageModuleData[]): Map<number, number[]> {
		const map = new Map<number, number[]>();
		const rowOrders = new Set<number>();
		for (const m of list) {
			if (typeof m.rowOrder === 'number') rowOrders.add(m.rowOrder);
		}
		if (rowOrders.size === 0) {
			map.set(0, [1]);
			return map;
		}
		const sortedRows = [...rowOrders].sort((a, b) => a - b);
		for (const r of sortedRows) {
			const rowMods = list
				.filter((m) => m.rowOrder === r)
				.sort((a, b) => (a.columnIndex ?? 0) - (b.columnIndex ?? 0));
			const maxColEnd = Math.max(
				1,
				...rowMods.map((m) => (m.columnIndex ?? 0) + (m.colSpan ?? 1))
			);
			const proportions: number[] = [];
			let cursor = 0;
			for (const m of rowMods) {
				const colIdx = m.columnIndex ?? 0;
				while (cursor < colIdx) {
					proportions.push(1);
					cursor += 1;
				}
				const span = m.colSpan ?? 1;
				const prop = m.columnProportion ?? span;
				const perCol = span > 0 ? prop / span : 1;
				for (let i = 0; i < span; i++) proportions.push(perCol);
				cursor += span;
			}
			while (cursor < maxColEnd) {
				proportions.push(1);
				cursor += 1;
			}
			map.set(r, proportions);
		}
		return map;
	}

	function makeId(prefix: string): string {
		return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	}

	function getList(slot: ChromeSlot): PageModuleData[] {
		return slot === 'header' ? headerModules : footerModules;
	}

	function setList(slot: ChromeSlot, next: PageModuleData[]): void {
		if (slot === 'header') headerModules = next;
		else footerModules = next;
	}

	function isCellInside(
		row: number,
		col: number,
		target: { rowOrder: number; columnIndex: number; rowSpan?: number; colSpan?: number }
	): boolean {
		const rs = target.rowSpan ?? 1;
		const cs = target.colSpan ?? 1;
		return (
			row >= target.rowOrder &&
			row < target.rowOrder + rs &&
			col >= target.columnIndex &&
			col < target.columnIndex + cs
		);
	}

	function makeAssignHandler(slot: ChromeSlot) {
		return async (
			rowOrder: number,
			columnIndex: number,
			moduleType: string,
			props: Record<string, unknown>,
			rowSpan: number = 1,
			colSpan: number = 1
		) => {
			const current = getList(slot);
			const structure = slot === 'header' ? headerRowStructure : footerRowStructure;
			let columnProportion = 1;
			const row = structure.get(rowOrder);
			if (row) {
				columnProportion = row
					.slice(columnIndex, columnIndex + colSpan)
					.reduce((sum, p) => sum + (p || 1), 0);
			}
			const filtered = current.filter((m) => {
				if (m.rowOrder === undefined || m.columnIndex === undefined) return true;
				return !isCellInside(m.rowOrder, m.columnIndex, {
					rowOrder,
					columnIndex,
					rowSpan,
					colSpan
				});
			});
			const newModule: PageModuleData = {
				_id: makeId(slot),
				pageId: '',
				type: moduleType,
				rowOrder,
				columnIndex,
				columnProportion,
				rowSpan: rowSpan > 1 ? rowSpan : undefined,
				colSpan: colSpan > 1 ? colSpan : undefined,
				props: props ?? {}
			};
			setList(slot, [...filtered, newModule]);
		};
	}

	function makeRemoveHandler(slot: ChromeSlot) {
		return async (moduleId: string) => {
			setList(
				slot,
				getList(slot).filter((m) => m._id !== moduleId)
			);
		};
	}

	function makeEditHandler(slot: ChromeSlot) {
		return (module: PageModuleData) => {
			editing = { slot, module };
			editingTypeDraft = module.type;
			editingPropsDraft = module.props ? structuredClone(module.props) : {};
		};
	}

	function makeMoveRowHandler(slot: ChromeSlot) {
		return async (fromRowOrder: number, toRowOrder: number) => {
			if (fromRowOrder === toRowOrder) return;
			setList(
				slot,
				getList(slot).map((m) => {
					const r = m.rowOrder ?? 0;
					if (r === fromRowOrder) return { ...m, rowOrder: toRowOrder };
					if (r === toRowOrder) return { ...m, rowOrder: fromRowOrder };
					return m;
				})
			);
		};
	}

	function makeInsertRowHandler(slot: ChromeSlot) {
		return async (atRowOrder: number) => {
			setList(
				slot,
				getList(slot).map((m) => {
					const r = m.rowOrder ?? 0;
					return r >= atRowOrder ? { ...m, rowOrder: r + 1 } : m;
				})
			);
		};
	}

	function makeDeleteRowHandler(slot: ChromeSlot) {
		return async (rowOrder: number) => {
			const list = getList(slot);
			const remaining = list
				.filter((m) => (m.rowOrder ?? 0) !== rowOrder)
				.map((m) => {
					const r = m.rowOrder ?? 0;
					return r > rowOrder ? { ...m, rowOrder: r - 1 } : m;
				});
			setList(slot, remaining);
		};
	}

	function makeRemoveEmptyColumnHandler(slot: ChromeSlot) {
		return async (columnIndex: number) => {
			const list = getList(slot);
			const occupied = list.some((m) => {
				if (m.columnIndex === undefined) return false;
				const span = m.colSpan ?? 1;
				return m.columnIndex <= columnIndex && columnIndex < m.columnIndex + span;
			});
			if (occupied) {
				adminToast.error({
					title: $t('admin.headerFooterCannotRemoveOccupiedColumn')
				});
				return;
			}
			setList(
				slot,
				list.map((m) => {
					if (m.columnIndex === undefined) return m;
					if (m.columnIndex > columnIndex) {
						return { ...m, columnIndex: m.columnIndex - 1 };
					}
					return m;
				})
			);
		};
	}

	const headerHandlers = {
		assign: makeAssignHandler('header'),
		remove: makeRemoveHandler('header'),
		edit: makeEditHandler('header'),
		moveRow: makeMoveRowHandler('header'),
		insertRow: makeInsertRowHandler('header'),
		deleteRow: makeDeleteRowHandler('header'),
		removeEmptyColumn: makeRemoveEmptyColumnHandler('header')
	};

	const footerHandlers = {
		assign: makeAssignHandler('footer'),
		remove: makeRemoveHandler('footer'),
		edit: makeEditHandler('footer'),
		moveRow: makeMoveRowHandler('footer'),
		insertRow: makeInsertRowHandler('footer'),
		deleteRow: makeDeleteRowHandler('footer'),
		removeEmptyColumn: makeRemoveEmptyColumnHandler('footer')
	};

	function closeEditDialog() {
		editing = null;
		editingPropsDraft = {};
		editingTypeDraft = '';
	}

	function saveEditDialog() {
		if (!editing) return;
		const { slot, module } = editing;
		const nextProps = structuredClone(editingPropsDraft);
		setList(
			slot,
			getList(slot).map((m) =>
				m._id === module._id ? { ...m, type: editingTypeDraft || m.type, props: nextProps } : m
			)
		);
		closeEditDialog();
	}

	async function saveAll() {
		if (saving) return;
		saving = true;
		try {
			const payload = {
				template: {
					headerModules: serializeForApi(headerModules),
					footerModules: serializeForApi(footerModules)
				}
			};
			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload)
			});
			if (!response.ok) await handleApiErrorResponse(response);
			adminToast.success({ title: $t('admin.headerFooterSaved') });
			await siteConfig.load();
			savedHeaderModules = cloneModules(headerModules);
			savedFooterModules = cloneModules(footerModules);
		} catch (err) {
			logger.error('Error saving header/footer modules:', err);
			adminToast.error({
				title: handleError(err, $t('admin.headerFooterSaveFailed'))
			});
		} finally {
			saving = false;
		}
	}

	/**
	 * `_id` and `pageId` on chrome modules are local-only conveniences for the editor's
	 * row/column model — `PageRenderer` keys by index, not `_id` — so don't persist them.
	 */
	function serializeForApi(list: PageModuleData[]): Array<Omit<PageModuleData, '_id' | 'pageId'>> {
		return list.map(({ _id: _omitId, pageId: _omitPageId, ...rest }) => ({ ...rest }));
	}

	function discardChanges() {
		if (!isDirty) return;
		headerModules = cloneModules(savedHeaderModules);
		footerModules = cloneModules(savedFooterModules);
	}
</script>

<svelte:head>
	<title>{$t('admin.headerFooterPageTitle')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-5xl mx-auto px-4 space-y-6">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="min-w-0 flex-1">
					<h1 class="text-2xl font-bold text-(--color-surface-950-50)">
						{$t('admin.headerFooterPageTitle')}
					</h1>
					<p class="mt-2 text-sm text-(--color-surface-600-400) max-w-2xl">
						{$t('admin.headerFooterIntro')}
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onclick={discardChanges}
						disabled={!isDirty || saving}
						class="{adminBtnSecondary} text-sm disabled:opacity-50"
					>
						{$t('admin.headerFooterDiscard')}
					</button>
					<button
						type="button"
						onclick={saveAll}
						disabled={!isDirty || saving}
						class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
					>
						{saving ? $t('admin.saving') : $t('admin.headerFooterSave')}
					</button>
				</div>
			</div>
			{#if data.loadError}
				<div class="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{data.loadError}</div>
			{/if}
		</div>

		<section
			class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 space-y-4"
			aria-labelledby="header-section-heading"
		>
			<div>
				<h2
					id="header-section-heading"
					class="text-lg font-semibold text-(--color-surface-950-50)"
				>
					{$t('admin.headerModulesHeading')}
				</h2>
				<p class="text-sm text-(--color-surface-600-400) mt-1">
					{$t('admin.headerModulesDescription')}
				</p>
			</div>
			{#if headerModules.length === 0}
				<p
					class="text-sm text-(--color-surface-600-400) py-3 px-4 border border-dashed border-surface-300-700 rounded-md bg-(--color-surface-50-950)"
				>
					{$t('admin.headerModulesEmpty')}
				</p>
			{/if}
			<RowColumnLayoutBuilder
				modules={headerModules}
				rowStructure={headerRowStructure}
				onAssignModule={headerHandlers.assign}
				onRemoveModule={headerHandlers.remove}
				onEditModule={headerHandlers.edit}
				onMoveRow={headerHandlers.moveRow}
				onInsertRow={headerHandlers.insertRow}
				onDeleteRow={headerHandlers.deleteRow}
				onRemoveEmptyColumn={headerHandlers.removeEmptyColumn}
				availableModuleTypes={HEADER_MODULE_OPTIONS.map((m) => ({ value: m.type, label: m.label }))}
			/>
		</section>

		<section
			class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 space-y-4"
			aria-labelledby="footer-section-heading"
		>
			<div>
				<h2
					id="footer-section-heading"
					class="text-lg font-semibold text-(--color-surface-950-50)"
				>
					{$t('admin.footerModulesHeading')}
				</h2>
				<p class="text-sm text-(--color-surface-600-400) mt-1">
					{$t('admin.footerModulesDescription')}
				</p>
			</div>
			{#if footerModules.length === 0}
				<p
					class="text-sm text-(--color-surface-600-400) py-3 px-4 border border-dashed border-surface-300-700 rounded-md bg-(--color-surface-50-950)"
				>
					{$t('admin.footerModulesEmpty')}
				</p>
			{/if}
			<RowColumnLayoutBuilder
				modules={footerModules}
				rowStructure={footerRowStructure}
				onAssignModule={footerHandlers.assign}
				onRemoveModule={footerHandlers.remove}
				onEditModule={footerHandlers.edit}
				onMoveRow={footerHandlers.moveRow}
				onInsertRow={footerHandlers.insertRow}
				onDeleteRow={footerHandlers.deleteRow}
				onRemoveEmptyColumn={footerHandlers.removeEmptyColumn}
				availableModuleTypes={FOOTER_MODULE_OPTIONS.map((m) => ({ value: m.type, label: m.label }))}
			/>
		</section>
	</div>
</div>

{#if editing}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-70 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="hf-edit-title"
	>
		<div
			class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden"
		>
			<h2 id="hf-edit-title" class="text-xl font-bold text-(--color-surface-950-50) mb-4">
				{$t('admin.headerFooterEditModuleTitle')}
			</h2>
			<div class="space-y-4">
				<div>
					<label
						for="hf-module-type"
						class="block text-sm font-medium text-(--color-surface-800-200) mb-2"
					>
						{$t('admin.headerFooterModuleTypeLabel')}
					</label>
					<select
						id="hf-module-type"
						bind:value={editingTypeDraft}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) text-sm"
					>
						{#each (editing.slot === 'header' ? HEADER_MODULE_OPTIONS : FOOTER_MODULE_OPTIONS) as opt}
							<option value={opt.type}>{opt.label}</option>
						{/each}
					</select>
				</div>
				<ModulePropsForm
					moduleType={editingTypeDraft}
					bind:props={editingPropsDraft}
					showPlacementInGrid={true}
				/>
			</div>
			<div class="flex justify-end gap-2 mt-6">
				<button
					type="button"
					onclick={closeEditDialog}
					class="{adminBtnSecondary} text-sm"
				>
					{$t('admin.cancel')}
				</button>
				<button
					type="button"
					onclick={saveEditDialog}
					class="{adminBtnPrimarySm} {adminRingPrimary}"
				>
					{$t('admin.headerFooterEditApply')}
				</button>
			</div>
		</div>
	</div>
{/if}
