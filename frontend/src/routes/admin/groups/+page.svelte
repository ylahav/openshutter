<script lang="ts">
	import { onMount } from 'svelte';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';
	import { useCrudLoader } from '$lib/composables/useCrudLoader';
	import { useCrudOperations } from '$lib/composables/useCrudOperations';
	import { useDialogManager } from '$lib/composables/useDialogManager';
	import { normalizeMultiLangText } from '$lib/utils/multiLangHelpers';
	import { handleError } from '$lib/utils/errorHandler';
	import {
		adminPostJson,
		applyTemplateVars,
		downloadJson,
		fetchAdminPaginatedList,
		parseImportItems
	} from '$lib/utils/collectionImportExport';
	import CollectionImportExportButtons from '$lib/components/admin/CollectionImportExportButtons.svelte';
	import { displayGroupAlias } from '$lib/utils/owner-groups';
	import { t } from '$stores/i18n';
	import type { PageData } from './$types';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimarySm, adminRingPrimary } from '$lib/admin/admin-cerberus';

	// svelte-ignore export_let_unused - Required by SvelteKit page component
	export let data: PageData;

	let translate: (key: string, fallback?: string) => string = (key, fallback) => fallback || key;
	$: translate = $t;

	interface Group {
		_id: string;
		alias: string;
		name: MultiLangText | string;
		createdAt?: string;
		updatedAt?: string;
		memberCount?: number;
		albumUsageCount?: number;
	}

	// Use CRUD composables
	const { items, loading, error: listLoadError, loadItems } = useCrudLoader<Group>(
		'/api/admin/groups',
		{
			initialItems: data.initialItems,
			initialLoadError: data.listLoadError,
		},
	);
	const crudOps = useCrudOperations<Group>('/api/admin/groups', {
		createSuccessMessage: $t('admin.groupsCreatedSuccessfully'),
		updateSuccessMessage: $t('admin.groupsUpdatedSuccessfully'),
		deleteSuccessMessage: $t('admin.groupsDeletedSuccessfully'),
		onCreateSuccess: (newGroup) => {
			items.update((list) => [...list, newGroup]);
			dialogs.closeAll();
			resetForm();
		},
		onUpdateSuccess: (updatedGroup) => {
			const currentEditingGroup = editingGroup;
			if (currentEditingGroup) {
				items.update((list) =>
					list.map((g) => (g._id === currentEditingGroup._id ? updatedGroup : g)),
				);
			}
			dialogs.closeAll();
			editingGroup = null;
			resetForm();
		},
		onDeleteSuccess: () => {
			const currentGroupToDelete = groupToDelete;
			if (currentGroupToDelete) {
				items.update((list) => list.filter((g) => g._id !== currentGroupToDelete._id));
			}
			dialogs.closeAll();
			groupToDelete = null;
		}
	});
	const dialogs = useDialogManager();

	let error = '';
	crudOps.error.subscribe(value => {
		if (value) error = value;
	});
	crudOps.message.subscribe((value) => {
		if (!value) return;
		adminToast.success({ title: value });
	});
	// Local state
	let editingGroup: Group | null = null;
	let groupToDelete: Group | null = null;
	let deleting = false;
	let importExportBusy = false;

	// Form state
	let formData = {
		alias: '',
		name: { en: '', he: '' } as MultiLangText
	};

	onMount(async () => {
		if (data.listLoadError) return;
		await loadItems(data.initialItems !== undefined ? { background: true } : undefined);
	});

	function resetForm() {
		formData = {
			alias: '',
			name: { en: '', he: '' }
		};
	}

	function openCreateDialog() {
		resetForm();
		dialogs.openCreate();
		crudOps.error.set('');
	}

	function openEditDialog(group: Group) {
		editingGroup = group;
		formData = {
			alias: group.alias,
			name: normalizeMultiLangText(group.name)
		};
		dialogs.openEdit();
		crudOps.error.set('');
	}

	function openDeleteDialog(group: Group) {
		groupToDelete = group;
		dialogs.openDelete();
		crudOps.error.set('');
	}

	function getGroupName(group: Group): string {
		const nameField = typeof group.name === 'string' ? group.name : group.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || displayGroupAlias(group.alias);
	}

	function memberCountLabel(group: Group): string {
		const n = group.memberCount ?? 0;
		if (n === 1) return translate('admin.groupsMemberCountOne');
		return translate('admin.groupsMemberCount').replace('{count}', String(n));
	}

	function albumUsageLabel(group: Group): string {
		const n = group.albumUsageCount ?? 0;
		if (n === 0) return translate('admin.groupsAlbumUsageNone');
		if (n === 1) return translate('admin.groupsAlbumUsageOne');
		return translate('admin.groupsAlbumUsage').replace('{count}', String(n));
	}

	function isGroupAlbumUnused(group: Group): boolean {
		return (group.albumUsageCount ?? 0) === 0;
	}

	async function handleCreate() {
		const newGroup = await crudOps.create(formData);
		if (newGroup) {
			// Success handled by onCreateSuccess callback
		}
	}

	async function handleEdit() {
		if (!editingGroup) return;
		const currentEditingGroup = editingGroup;
		const updatedGroup = await crudOps.update(currentEditingGroup._id, {
			name: formData.name
			// Note: alias is immutable, so we don't send it
		});
		if (updatedGroup) {
			// Success handled by onUpdateSuccess callback
		}
	}

	async function handleDelete() {
		if (!groupToDelete) return;
		const currentGroupToDelete = groupToDelete;
		const success = await crudOps.remove(currentGroupToDelete._id);
		if (success) {
			// Success handled by onDeleteSuccess callback
		}
	}

	function importFileErrorMessage(err: unknown): string {
		if (err instanceof Error && err.message === 'INVALID_JSON') {
			return translate('admin.collectionImportInvalidJson');
		}
		if (err instanceof Error && err.message === 'INVALID_SHAPE') {
			return translate('admin.collectionImportInvalidEnvelope');
		}
		return handleError(err, translate('admin.collectionImportReadError'));
	}

	function setImportSummaryMessage(created: number, failed: number) {
		const template = translate('admin.collectionImportResult');
		crudOps.message.set(applyTemplateVars(template, { created, failed }));
	}

	async function handleGroupsExport() {
		importExportBusy = true;
		crudOps.error.set('');
		try {
			const rows = await fetchAdminPaginatedList('/api/admin/groups');
			const items = rows.map((raw) => {
				const row = raw as Record<string, unknown>;
				const { _id, createdAt, updatedAt, ...rest } = row;
				void _id;
				void createdAt;
				void updatedAt;
				return rest;
			});
			downloadJson(`openshutter-groups-${new Date().toISOString().slice(0, 10)}.json`, {
				schema: 'openshutter.admin.groups/v1',
				exportedAt: new Date().toISOString(),
				items
			});
		} catch (err) {
			crudOps.error.set(handleError(err, translate('admin.collectionExportFailed')));
		} finally {
			importExportBusy = false;
		}
	}

	async function handleGroupsImport(file: File) {
		importExportBusy = true;
		crudOps.error.set('');
		let created = 0;
		let failed = 0;
		const failureLines: string[] = [];
		try {
			const list = parseImportItems(await file.text());
			for (let i = 0; i < list.length; i++) {
				const raw = list[i];
				if (!raw || typeof raw !== 'object') {
					failed++;
					continue;
				}
				const o = raw as Record<string, unknown>;
				const alias = String(o.alias || '')
					.trim()
					.toLowerCase();
				const payload = { alias, name: o.name };
				const name = o.name;
				const hasName =
					typeof name === 'string'
						? !!name.trim()
						: name &&
								typeof name === 'object' &&
								Object.values(name as Record<string, unknown>).some(
									(v) => typeof v === 'string' && (v as string).trim()
								);
				if (!alias || !hasName) {
					failed++;
					failureLines.push(`#${i + 1}: alias and name required`);
					continue;
				}
				try {
					await adminPostJson('/api/admin/groups', payload);
					created++;
				} catch (e) {
					failed++;
					failureLines.push(`#${i + 1}: ${handleError(e, 'Error')}`);
				}
			}
			await loadItems();
			setImportSummaryMessage(created, failed);
			if (failureLines.length) {
				crudOps.error.set(failureLines.slice(0, 8).join(' · '));
			}
		} catch (err) {
			crudOps.error.set(importFileErrorMessage(err));
		} finally {
			importExportBusy = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.groupsManagement')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.groupsManagement')}</h1>
					<p class="text-(--color-surface-600-400) mt-2">{$t('admin.defineUserGroups')}</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<CollectionImportExportButtons
						exportLabel={$t('admin.collectionExportJson')}
						importLabel={$t('admin.collectionImportJson')}
						busy={importExportBusy}
						onExport={handleGroupsExport}
						onImportFile={handleGroupsImport}
					/>
					<button
						type="button"
						on:click={openCreateDialog}
						class="{adminBtnPrimarySm} {adminRingPrimary} flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						{$t('admin.groupsAddGroup')}
					</button>
				</div>
			</div>

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			<!-- Groups List -->
			{#if $loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-(--color-primary-600)"></div>
					<p class="mt-2 text-(--color-surface-600-400)">{$t('admin.groupsLoading')}</p>
				</div>
			{:else if $items.length === 0}
				<div class="text-center py-8">
					<svg
						class="h-12 w-12 text-(--color-surface-400-600) mx-auto mb-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.groupsNoGroupsTitle')}</h3>
					<p class="text-(--color-surface-600-400)">{$t('admin.groupsNoGroupsHint')}</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each $items as group}
						<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4 flex flex-col">
							<div class="flex items-start justify-between gap-2 mb-2">
								<div class="min-w-0 flex-1">
									<h3 class="font-semibold text-(--color-surface-950-50) mb-1 wrap-break-word leading-snug">
										{getGroupName(group)}
									</h3>
									<p class="text-sm text-(--color-surface-600-400)">
										{$t('admin.groupsCardAliasLabel')}:
										<code class="bg-(--color-surface-100-900) px-1 rounded text-xs">{displayGroupAlias(group.alias)}</code>
									</p>
									<p class="text-sm text-(--color-surface-600-400) mt-1">{memberCountLabel(group)}</p>
									<p class="text-sm mt-0.5 flex flex-wrap items-center gap-2 text-(--color-surface-600-400)">
										{#if isGroupAlbumUnused(group)}
											<span
												class="inline-flex shrink-0 items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100"
											>
												{$t('admin.tagsUnusedBadge')}
											</span>
										{/if}
										<span>{albumUsageLabel(group)}</span>
									</p>
								</div>

								<div class="flex shrink-0 space-x-1">
									<button
										type="button"
										on:click={() => openEditDialog(group)}
										class="p-1 text-(--color-surface-600-400) hover:text-(--color-primary-600) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] rounded"
										aria-label={$t('admin.groupsEditDialogTitle')}
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
									<button
										type="button"
										on:click={() => openDeleteDialog(group)}
										class="p-1 text-(--color-surface-600-400) hover:text-red-600 hover:bg-red-50 rounded"
										aria-label={$t('admin.groupsDeleteDialogTitle')}
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create Dialog -->
{#if $dialogs.showCreate}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">{$t('admin.groupsCreateDialogTitle')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="alias-create-modal" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.groupsAliasLabel')} *
					</label>
					<input
						type="text"
						id="alias-create-modal"
						bind:value={formData.alias}
						placeholder={$t('admin.groupsAliasPlaceholder')}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
					<p class="mt-1 text-xs text-(--color-surface-600-400)">{$t('admin.groupsAliasHint')}</p>
				</div>
				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.groupsNameLabel')} *
					</span>
					<MultiLangInput bind:value={formData.name} />
				</div>
				<div class="flex justify-end gap-2 pt-2">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							resetForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						{$t('admin.groupsCancel')}
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={$crudOps.saving || !formData.alias.trim()}
						class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
					>
						{#if $crudOps.saving}
							{$t('admin.groupsCreating')}
						{:else}
							{$t('admin.groupsCreateButton')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Dialog -->
{#if $dialogs.showEdit && editingGroup}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">{$t('admin.groupsEditDialogTitle')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="alias-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.groupsAliasLabel')}
					</label>
					<input
						type="text"
						id="alias-edit"
						value={displayGroupAlias(formData.alias)}
						disabled
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm bg-(--color-surface-100-900) text-(--color-surface-600-400)"
					/>
					<p class="mt-1 text-xs text-(--color-surface-600-400)">{$t('admin.groupsAliasImmutableHint')}</p>
				</div>

				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.groupsNameLabel')} *
					</span>
					<MultiLangInput bind:value={formData.name} />
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							editingGroup = null;
							resetForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						{$t('admin.groupsCancel')}
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={$crudOps.saving}
						class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
					>
						{#if $crudOps.saving}
							{$t('admin.groupsUpdating')}
						{:else}
							{$t('admin.groupsUpdateButton')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if $dialogs.showDelete && groupToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">{$t('admin.groupsDeleteDialogTitle')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-(--color-surface-600-400)">
					{applyTemplateVars($t('admin.groupsDeleteConfirm'), {
						name: getGroupName(groupToDelete),
						alias: displayGroupAlias(groupToDelete.alias)
					})}
				</p>
				<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
					<p class="text-sm text-yellow-800">
						{$t('admin.groupsDeleteWarning')}
					</p>
				</div>
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							groupToDelete = null;
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						{$t('admin.groupsCancel')}
					</button>
					<button
						type="button"
						on:click={handleDelete}
						disabled={$crudOps.saving}
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if $crudOps.saving}
							{$t('admin.groupsDeleting')}
						{:else}
							{$t('admin.groupsDeleteButton')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
