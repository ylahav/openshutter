<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
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
	type PackId = 'noir' | 'studio' | 'atelier';
	type TabId = 'default' | PackId;
	type ByPackMap = Partial<Record<PackId, PageModuleData[]>>;

	const PACK_IDS: PackId[] = ['atelier', 'studio', 'noir'];
	const TAB_IDS: TabId[] = ['default', ...PACK_IDS];

	function normalizeTab(value: string | null | undefined): TabId {
		const v = String(value ?? '').trim().toLowerCase();
		return (TAB_IDS as string[]).includes(v) ? (v as TabId) : 'default';
	}

	let activeTab = $state<TabId>(normalizeTab($page.url.searchParams.get('pack')));

	$effect(() => {
		const fromUrl = normalizeTab($page.url.searchParams.get('pack'));
		if (fromUrl !== activeTab) activeTab = fromUrl;
	});

	let headerModules = $state<PageModuleData[]>(cloneModules(data.headerModules));
	let footerModules = $state<PageModuleData[]>(cloneModules(data.footerModules));
	let headerByPack = $state<ByPackMap>(cloneByPack(data.headerModulesByPack));
	let footerByPack = $state<ByPackMap>(cloneByPack(data.footerModulesByPack));

	let savedHeaderModules = $state<PageModuleData[]>(cloneModules(data.headerModules));
	let savedFooterModules = $state<PageModuleData[]>(cloneModules(data.footerModules));
	let savedHeaderByPack = $state<ByPackMap>(cloneByPack(data.headerModulesByPack));
	let savedFooterByPack = $state<ByPackMap>(cloneByPack(data.footerModulesByPack));

	let saving = $state(false);
	let editing = $state<{ slot: ChromeSlot; module: PageModuleData } | null>(null);
	let editingPropsDraft = $state<Record<string, unknown>>({});
	let editingTypeDraft = $state<string>('');

	let headerGrid = $state(inferGridDims(activeHeaderList()));
	let footerGrid = $state(inferGridDims(activeFooterList()));
	let headerRowStructure = $state<Map<number, number[]>>(buildEqualRowStructure(headerGrid));
	let footerRowStructure = $state<Map<number, number[]>>(buildEqualRowStructure(footerGrid));

	/**
	 * Rebuild the grid scratch state whenever the active tab changes. Without this, switching tabs
	 * keeps stale row counts from the previous tab and the builder shows the wrong number of rows.
	 */
	let lastTabForGrid = activeTab;
	$effect(() => {
		if (activeTab === lastTabForGrid) return;
		lastTabForGrid = activeTab;
		headerGrid = inferGridDims(activeHeaderList());
		footerGrid = inferGridDims(activeFooterList());
		headerRowStructure = buildEqualRowStructure(headerGrid);
		footerRowStructure = buildEqualRowStructure(footerGrid);
	});

	const headerOverridden = $derived(
		activeTab !== 'default' && Array.isArray(headerByPack[activeTab as PackId])
	);
	const footerOverridden = $derived(
		activeTab !== 'default' && Array.isArray(footerByPack[activeTab as PackId])
	);

	const headerDirty = $derived(
		JSON.stringify(headerModules) !== JSON.stringify(savedHeaderModules) ||
			JSON.stringify(headerByPack) !== JSON.stringify(savedHeaderByPack)
	);
	const footerDirty = $derived(
		JSON.stringify(footerModules) !== JSON.stringify(savedFooterModules) ||
			JSON.stringify(footerByPack) !== JSON.stringify(savedFooterByPack)
	);
	const isDirty = $derived(headerDirty || footerDirty);

	function cloneModules(list: PageModuleData[] | undefined | null): PageModuleData[] {
		if (!Array.isArray(list)) return [];
		return list.map((m) => ({ ...m, props: m.props ? $state.snapshot(m.props) : {} }));
	}

	function cloneByPack(map: ByPackMap | undefined | null): ByPackMap {
		if (!map || typeof map !== 'object') return {};
		const out: ByPackMap = {};
		for (const pack of PACK_IDS) {
			const v = map[pack];
			if (Array.isArray(v)) out[pack] = cloneModules(v);
		}
		return out;
	}

	function activeHeaderList(): PageModuleData[] {
		if (activeTab === 'default') return headerModules;
		const v = headerByPack[activeTab as PackId];
		return Array.isArray(v) ? v : [];
	}

	function activeFooterList(): PageModuleData[] {
		if (activeTab === 'default') return footerModules;
		const v = footerByPack[activeTab as PackId];
		return Array.isArray(v) ? v : [];
	}

	function inferGridDims(list: PageModuleData[] | undefined): { rows: number; cols: number } {
		if (!Array.isArray(list) || list.length === 0) return { rows: 1, cols: 1 };
		let maxRow = 0;
		let maxCol = 0;
		for (const m of list) {
			if (m.rowOrder !== undefined && m.columnIndex !== undefined) {
				maxRow = Math.max(maxRow, (m.rowOrder ?? 0) + (m.rowSpan ?? 1));
				maxCol = Math.max(maxCol, (m.columnIndex ?? 0) + (m.colSpan ?? 1));
			}
		}
		return { rows: Math.max(1, maxRow), cols: Math.max(1, maxCol) };
	}

	function buildEqualRowStructure(grid: { rows: number; cols: number }): Map<number, number[]> {
		const map = new Map<number, number[]>();
		const cols = Math.max(1, Number(grid.cols) || 1);
		const rows = Math.max(1, Number(grid.rows) || 1);
		for (let r = 0; r < rows; r++) map.set(r, Array(cols).fill(1));
		return map;
	}

	function applyGrid(slot: ChromeSlot) {
		if (slot === 'header') headerRowStructure = buildEqualRowStructure(headerGrid);
		else footerRowStructure = buildEqualRowStructure(footerGrid);
	}

	function makeId(prefix: string): string {
		return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	}

	function getList(slot: ChromeSlot): PageModuleData[] {
		return slot === 'header' ? activeHeaderList() : activeFooterList();
	}

	function setList(slot: ChromeSlot, next: PageModuleData[]): void {
		if (activeTab === 'default') {
			if (slot === 'header') headerModules = next;
			else footerModules = next;
			return;
		}
		const pack = activeTab as PackId;
		if (slot === 'header') {
			headerByPack = { ...headerByPack, [pack]: next };
		} else {
			footerByPack = { ...footerByPack, [pack]: next };
		}
	}

	function switchTab(tab: TabId): void {
		const params = new URLSearchParams($page.url.searchParams);
		if (tab === 'default') params.delete('pack');
		else params.set('pack', tab);
		const qs = params.toString();
		const url = qs ? `?${qs}` : $page.url.pathname;
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function overrideDefault(): void {
		if (activeTab === 'default') return;
		const pack = activeTab as PackId;
		// "Override default" intentionally seeds an empty array — the cascade renders `[]` as "no chrome
		// for this pack". Authors then add modules; the builder picks up the new empty grid below.
		headerByPack = { ...headerByPack, [pack]: [] };
		footerByPack = { ...footerByPack, [pack]: [] };
		headerGrid = { rows: 1, cols: 1 };
		footerGrid = { rows: 1, cols: 1 };
		headerRowStructure = buildEqualRowStructure(headerGrid);
		footerRowStructure = buildEqualRowStructure(footerGrid);
	}

	function revertToInherit(): void {
		if (activeTab === 'default') return;
		const pack = activeTab as PackId;
		const nextHeader: ByPackMap = { ...headerByPack };
		const nextFooter: ByPackMap = { ...footerByPack };
		delete nextHeader[pack];
		delete nextFooter[pack];
		headerByPack = nextHeader;
		footerByPack = nextFooter;
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
			editingPropsDraft = module.props ? $state.snapshot(module.props) : {};
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
			if (slot === 'header') headerGrid = { ...headerGrid, rows: headerGrid.rows + 1 };
			else footerGrid = { ...footerGrid, rows: footerGrid.rows + 1 };
			applyGrid(slot);
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
			const grid = slot === 'header' ? headerGrid : footerGrid;
			const nextRows = Math.max(1, grid.rows - 1);
			if (slot === 'header') headerGrid = { ...headerGrid, rows: nextRows };
			else footerGrid = { ...footerGrid, rows: nextRows };
			applyGrid(slot);
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
		const nextProps = $state.snapshot(editingPropsDraft);
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
			const templatePayload: Record<string, unknown> = {};
			if (activeTab === 'default') {
				templatePayload.headerModules = serializeForApi(headerModules);
				templatePayload.footerModules = serializeForApi(footerModules);
			} else {
				/**
				 * Send the full pack maps so `replaceWhole` semantics on the backend don't wipe other
				 * packs' overrides. A revert-to-inherit removes the key from the local map; that absence
				 * propagates here.
				 */
				templatePayload.headerModulesByPack = serializeByPackForApi(headerByPack);
				templatePayload.footerModulesByPack = serializeByPackForApi(footerByPack);
			}
			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ template: templatePayload })
			});
			if (!response.ok) await handleApiErrorResponse(response);
			adminToast.success({ title: $t('admin.headerFooterSaved') });
			await siteConfig.load();
			savedHeaderModules = cloneModules(headerModules);
			savedFooterModules = cloneModules(footerModules);
			savedHeaderByPack = cloneByPack(headerByPack);
			savedFooterByPack = cloneByPack(footerByPack);
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

	function serializeByPackForApi(
		map: ByPackMap
	): Partial<Record<PackId, Array<Omit<PageModuleData, '_id' | 'pageId'>>>> {
		const out: Partial<Record<PackId, Array<Omit<PageModuleData, '_id' | 'pageId'>>>> = {};
		for (const pack of PACK_IDS) {
			const v = map[pack];
			if (Array.isArray(v)) out[pack] = serializeForApi(v);
		}
		return out;
	}

	function discardChanges() {
		if (!isDirty) return;
		headerModules = cloneModules(savedHeaderModules);
		footerModules = cloneModules(savedFooterModules);
		headerByPack = cloneByPack(savedHeaderByPack);
		footerByPack = cloneByPack(savedFooterByPack);
		headerGrid = inferGridDims(activeHeaderList());
		footerGrid = inferGridDims(activeFooterList());
		headerRowStructure = buildEqualRowStructure(headerGrid);
		footerRowStructure = buildEqualRowStructure(footerGrid);
	}

	function tabLabel(tab: TabId): string {
		if (tab === 'default') return $t('admin.headerFooterTabDefault');
		if (tab === 'atelier') return $t('admin.headerFooterTabAtelier');
		if (tab === 'studio') return $t('admin.headerFooterTabStudio');
		return $t('admin.headerFooterTabNoir');
	}

	const showOverrideEmptyState = $derived(
		activeTab !== 'default' && !headerOverridden && !footerOverridden
	);
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
					<a
						href="/admin/templates"
						class="{adminBtnSecondary} text-sm shrink-0 inline-flex items-center justify-center no-underline"
					>
						{$t('admin.backToTemplates')}
					</a>
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

			<div
				class="mt-5 flex flex-wrap items-center gap-1 border-b border-surface-200-800"
				role="tablist"
				aria-label={$t('admin.headerFooterTabsAriaLabel')}
			>
				{#each TAB_IDS as tab}
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === tab}
						onclick={() => switchTab(tab)}
						class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors {activeTab === tab
							? 'border-(--color-primary-500) text-(--color-primary-700)'
							: 'border-transparent text-(--color-surface-600-400) hover:text-(--color-surface-900-100)'}"
					>
						{tabLabel(tab)}
					</button>
				{/each}
			</div>

			{#if activeTab !== 'default'}
				<p class="mt-3 text-sm text-(--color-surface-600-400)">
					{$t('admin.headerFooterPackIntro')}
				</p>
			{/if}
		</div>

		{#if showOverrideEmptyState}
			<div
				class="card preset-outlined-surface-200-800 bg-surface-50-950 p-8 text-center space-y-4"
			>
				<div>
					<h2 class="text-lg font-semibold text-(--color-surface-950-50)">
						{$t('admin.headerFooterInheritTitle')}
					</h2>
					<p class="mt-2 text-sm text-(--color-surface-600-400) max-w-xl mx-auto">
						{$t('admin.headerFooterInheritBody')}
					</p>
				</div>
				<button
					type="button"
					onclick={overrideDefault}
					class="{adminBtnPrimarySm} {adminRingPrimary}"
				>
					{$t('admin.headerFooterOverrideDefault')}
				</button>
			</div>
		{:else}
			{#if activeTab !== 'default'}
				<div
					class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4 flex flex-wrap items-center justify-between gap-3"
				>
					<p class="text-sm text-(--color-surface-700-300)">
						{$t('admin.headerFooterOverrideActive')}
					</p>
					<button
						type="button"
						onclick={revertToInherit}
						class="{adminBtnSecondary} text-sm"
					>
						{$t('admin.headerFooterRevertToInherit')}
					</button>
				</div>
			{/if}

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
				<div class="flex flex-wrap items-center gap-4 text-sm">
					<label class="flex items-center gap-2">
						<span class="text-(--color-surface-700-300)">Rows</span>
						<input
							type="number"
							min="1"
							bind:value={headerGrid.rows}
							onchange={() => applyGrid('header')}
							class="w-20 rounded border border-surface-300-700 bg-surface-50-950 px-2 py-1"
						/>
					</label>
					<label class="flex items-center gap-2">
						<span class="text-(--color-surface-700-300)">Columns</span>
						<input
							type="number"
							min="1"
							bind:value={headerGrid.cols}
							onchange={() => applyGrid('header')}
							class="w-20 rounded border border-surface-300-700 bg-surface-50-950 px-2 py-1"
						/>
					</label>
				</div>
				{#if activeHeaderList().length === 0}
					<p
						class="text-sm text-(--color-surface-600-400) py-3 px-4 border border-dashed border-surface-300-700 rounded-md bg-(--color-surface-50-950)"
					>
						{activeTab === 'default'
							? $t('admin.headerModulesEmpty')
							: $t('admin.headerFooterPackEmptyOverride')}
					</p>
				{/if}
				<RowColumnLayoutBuilder
					modules={activeHeaderList()}
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
				<div class="flex flex-wrap items-center gap-4 text-sm">
					<label class="flex items-center gap-2">
						<span class="text-(--color-surface-700-300)">Rows</span>
						<input
							type="number"
							min="1"
							bind:value={footerGrid.rows}
							onchange={() => applyGrid('footer')}
							class="w-20 rounded border border-surface-300-700 bg-surface-50-950 px-2 py-1"
						/>
					</label>
					<label class="flex items-center gap-2">
						<span class="text-(--color-surface-700-300)">Columns</span>
						<input
							type="number"
							min="1"
							bind:value={footerGrid.cols}
							onchange={() => applyGrid('footer')}
							class="w-20 rounded border border-surface-300-700 bg-surface-50-950 px-2 py-1"
						/>
					</label>
				</div>
				{#if activeFooterList().length === 0}
					<p
						class="text-sm text-(--color-surface-600-400) py-3 px-4 border border-dashed border-surface-300-700 rounded-md bg-(--color-surface-50-950)"
					>
						{activeTab === 'default'
							? $t('admin.footerModulesEmpty')
							: $t('admin.headerFooterPackEmptyOverride')}
					</p>
				{/if}
				<RowColumnLayoutBuilder
					modules={activeFooterList()}
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
		{/if}
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
