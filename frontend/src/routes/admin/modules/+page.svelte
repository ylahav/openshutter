<!--
  /admin/modules — manage reusable named module instances stored at
  site_config.template.moduleInstances[type][name].props. Placements opt in via
  module.props.instanceRef; PageBuilderGrid merges instance props beneath
  placement-level props at render time (see lib/page-builder/module-instances.ts).
  Sibling registries menuInstances / layoutShellInstances are managed elsewhere.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { siteConfig as siteConfigStore } from '$stores/siteConfig';
	import { adminToast } from '$lib/admin/adminToast';
	import { handleApiErrorResponse, handleError } from '$lib/utils/errorHandler';
	import { logger } from '$lib/utils/logger';
	import {
		adminBtnPrimary,
		adminBtnPrimarySm,
		adminInputSmClass,
		adminSelectSmClass
	} from '$lib/admin/admin-cerberus';
	import AdminConfirmDialog from '$lib/components/admin/AdminConfirmDialog.svelte';
	import ModulePropsForm from '$lib/components/ModulePropsForm.svelte';
	import { PAGE_MODULE_TYPES } from '$lib/page-builder/module-types';
	import type { SiteConfig } from '$lib/types/site-config';
	import { t } from '$stores/i18n';
	import { get } from 'svelte/store';

	/**
	 * Module types that have their own dedicated instance system or that don't
	 * accept user-editable props worth reusing. Hidden from the picker here.
	 */
	const EXCLUDED = new Set<string>(['menu', 'layoutShell', 'divider', 'pageTitle']);

	const VALID_NAME = /^[A-Za-z0-9_-]{1,40}$/;

	type InstanceEntry = { props: Record<string, unknown> };
	type InstancesMap = Record<string, Record<string, InstanceEntry>>;

	let loading = $state(true);
	let saving = $state(false);
	let config = $state<SiteConfig | null>(null);
	let instances = $state<InstancesMap>({});

	let showCreateDialog = $state(false);
	let showEditDialog = $state(false);
	let createType = $state('');
	let createName = $state('');
	let createError = $state('');

	let editType = $state('');
	let editName = $state('');
	let editProps = $state<Record<string, any>>({});

	let confirmDelete = $state<{ type: string; name: string } | null>(null);

	const availableTypes = $derived(
		(PAGE_MODULE_TYPES as readonly { type: string; label: string }[])
			.filter((m) => !EXCLUDED.has(m.type))
			.slice()
			.sort((a, b) => a.label.localeCompare(b.label))
	);

	const typeLabel = (type: string): string => {
		const found = (PAGE_MODULE_TYPES as readonly { type: string; label: string }[]).find(
			(m) => m.type === type
		);
		return found?.label ?? type;
	};

	const groupedInstances = $derived(
		Object.entries(instances)
			.filter(([type]) => !EXCLUDED.has(type))
			.map(([type, byName]) => ({
				type,
				label: typeLabel(type),
				entries: Object.entries(byName)
					.map(([name, entry]) => ({ name, entry }))
					.sort((a, b) => a.name.localeCompare(b.name))
			}))
			.filter((g) => g.entries.length > 0)
			.sort((a, b) => a.label.localeCompare(b.label))
	);

	const totalInstances = $derived(groupedInstances.reduce((n, g) => n + g.entries.length, 0));

	async function loadConfig() {
		loading = true;
		try {
			const response = await fetch('/api/admin/site-config');
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			const data = result?.success ? result.data : result;
			config = data as SiteConfig;
			const raw = (data?.template?.moduleInstances ?? {}) as InstancesMap;
			instances = normalizeInstances(raw);
		} catch (err) {
			logger.error('Failed to load site config for /admin/modules:', err);
			adminToast.error({ title: handleError(err, 'Failed to load module instances') });
		} finally {
			loading = false;
		}
	}

	function normalizeInstances(raw: InstancesMap): InstancesMap {
		const out: InstancesMap = {};
		for (const [type, byName] of Object.entries(raw || {})) {
			if (!byName || typeof byName !== 'object') continue;
			out[type] = {};
			for (const [name, entry] of Object.entries(byName)) {
				const props =
					entry && typeof entry === 'object' && entry !== null && 'props' in entry
						? ((entry as { props?: Record<string, unknown> }).props ?? {})
						: {};
				out[type][name] = { props };
			}
		}
		return out;
	}

	async function persistInstances(next: InstancesMap) {
		saving = true;
		try {
			const payload = { template: { moduleInstances: next } };
			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			const data = result?.success ? result.data : result;
			config = data as SiteConfig;
			instances = normalizeInstances(
				(data?.template?.moduleInstances ?? {}) as InstancesMap
			);
			// Refresh the live store so PageBuilderGrid resolution sees fresh values.
			await siteConfigStore.load();
			adminToast.success({ title: get(t)('admin.configurationSaved') });
		} catch (err) {
			logger.error('Failed to save module instances:', err);
			adminToast.error({ title: handleError(err, 'Failed to save module instances') });
			throw err;
		} finally {
			saving = false;
		}
	}

	function openCreate() {
		createType = '';
		createName = '';
		createError = '';
		showCreateDialog = true;
	}

	async function handleCreate() {
		const name = createName.trim();
		const type = createType.trim();
		if (!type) {
			createError = 'Pick a module type.';
			return;
		}
		if (!VALID_NAME.test(name)) {
			createError = 'Name must be 1–40 chars: letters, digits, hyphen, underscore.';
			return;
		}
		if (instances[type]?.[name]) {
			createError = `An instance named "${name}" already exists for ${typeLabel(type)}.`;
			return;
		}
		const cloned: InstancesMap = structuredClone($state.snapshot(instances));
		const next: InstancesMap = {
			...cloned,
			[type]: { ...(cloned[type] || {}), [name]: { props: {} } }
		};
		try {
			await persistInstances(next);
			showCreateDialog = false;
			openEdit(type, name);
		} catch {
			/* toast already shown */
		}
	}

	function openEdit(type: string, name: string) {
		const entry = instances[type]?.[name];
		if (!entry) return;
		editType = type;
		editName = name;
		// Deep-clone so the dialog can edit without mutating live state until save.
		editProps = JSON.parse(JSON.stringify(entry.props ?? {}));
		showEditDialog = true;
	}

	async function handleSaveEdit() {
		// Deep-snapshot via structuredClone — strips Svelte 5 `$state` proxies and
		// guarantees no shared references between sibling instances when serialized.
		// `$state.snapshot` on editProps protects against any inner proxy too.
		const snapshotProps = structuredClone($state.snapshot(editProps));
		const cloned: InstancesMap = structuredClone($state.snapshot(instances));
		const next: InstancesMap = {
			...cloned,
			[editType]: {
				...(cloned[editType] || {}),
				[editName]: { props: snapshotProps }
			}
		};
		try {
			await persistInstances(next);
			showEditDialog = false;
		} catch {
			/* toast shown */
		}
	}

	async function handleDuplicate(type: string, name: string) {
		const base = instances[type]?.[name];
		if (!base) return;
		let candidate = `${name}_copy`;
		let n = 2;
		while (instances[type]?.[candidate]) {
			candidate = `${name}_copy${n++}`;
		}
		const cloned: InstancesMap = structuredClone($state.snapshot(instances));
		const baseSnapshot = structuredClone($state.snapshot(base));
		const next: InstancesMap = {
			...cloned,
			[type]: {
				...(cloned[type] || {}),
				[candidate]: { props: (baseSnapshot.props ?? {}) as Record<string, unknown> }
			}
		};
		await persistInstances(next).catch(() => undefined);
	}

	async function handleDeleteConfirmed() {
		if (!confirmDelete) return;
		const { type, name } = confirmDelete;
		const cloned: InstancesMap = structuredClone($state.snapshot(instances));
		const nextByName = { ...(cloned[type] || {}) };
		delete nextByName[name];
		const next: InstancesMap = { ...cloned };
		if (Object.keys(nextByName).length > 0) next[type] = nextByName;
		else delete next[type];
		confirmDelete = null;
		await persistInstances(next).catch(() => undefined);
	}

	function handleEditPropsChange(updated: Record<string, any>) {
		editProps = { ...updated };
	}

	onMount(() => {
		loadConfig();
	});
</script>

<svelte:head>
	<title>{$t('admin.moduleInstancesTitle')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-6 lg:py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="mb-6 flex items-start justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold text-(--color-surface-950-50)">
					{$t('admin.moduleInstancesTitle')}
				</h1>
				<p class="mt-1 text-sm text-(--color-surface-600-400) max-w-2xl">
					{$t('admin.moduleInstancesDescription')}
				</p>
			</div>
			<button
				type="button"
				class={adminBtnPrimary}
				disabled={loading || saving}
				onclick={openCreate}
			>
				{$t('admin.moduleInstancesNew')}
			</button>
		</div>

		{#if loading}
			<div class="min-h-[30vh] flex items-center justify-center text-sm text-(--color-surface-600-400)">
				Loading…
			</div>
		{:else if totalInstances === 0}
			<div
				class="card preset-outlined-surface-200-800 bg-(--color-surface-50-950) p-10 text-center"
			>
				<p class="text-(--color-surface-800-200) font-medium">
					{$t('admin.moduleInstancesEmptyTitle')}
				</p>
				<p class="mt-2 text-sm text-(--color-surface-600-400) max-w-md mx-auto">
					{$t('admin.moduleInstancesEmptyBody')}
				</p>
				<button type="button" class="{adminBtnPrimarySm} mt-4" onclick={openCreate}>
					{$t('admin.moduleInstancesNew')}
				</button>
			</div>
		{:else}
			<div class="space-y-6">
				{#each groupedInstances as group (group.type)}
					<section class="card preset-outlined-surface-200-800 bg-(--color-surface-50-950) p-4">
						<div class="mb-3 flex items-center justify-between gap-3">
							<h2 class="text-base font-semibold text-(--color-surface-950-50)">
								{group.label}
								<span class="ml-2 text-xs font-normal text-(--color-surface-600-400)">
									({group.entries.length})
								</span>
							</h2>
							<span class="text-[11px] text-(--color-surface-600-400) font-mono">{group.type}</span>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{#each group.entries as { name, entry } (name)}
								<div
									class="rounded-md border border-surface-200-800 bg-(--color-surface-50-950) p-3 flex flex-col gap-2"
								>
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0">
											<p class="text-sm font-medium text-(--color-surface-950-50) truncate">
												{name}
											</p>
											<p class="text-[11px] text-(--color-surface-600-400) font-mono truncate">
												instanceRef: "{name}"
											</p>
										</div>
									</div>
									<p class="text-xs text-(--color-surface-700-300) line-clamp-2">
										{Object.keys(entry.props ?? {}).length} prop{Object.keys(entry.props ?? {}).length === 1 ? '' : 's'}
									</p>
									<div class="flex gap-2 pt-1">
										<button
											type="button"
											class="text-xs text-(--color-primary-600) hover:text-(--color-primary-800) font-medium"
											onclick={() => openEdit(group.type, name)}
										>
											Edit
										</button>
										<button
											type="button"
											class="text-xs text-(--color-surface-700-300) hover:text-(--color-surface-900-100)"
											onclick={() => handleDuplicate(group.type, name)}
											disabled={saving}
										>
											Duplicate
										</button>
										<button
											type="button"
											class="text-xs text-red-600 hover:text-red-800 ml-auto"
											onclick={() => (confirmDelete = { type: group.type, name })}
											disabled={saving}
										>
											Delete
										</button>
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Create dialog -->
{#if showCreateDialog}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-70">
		<div
			class="card preset-outlined-surface-200-800 bg-(--color-surface-50-950) shadow-xl w-full max-w-md p-6"
		>
			<h2 class="text-lg font-bold text-(--color-surface-950-50) mb-4">
				{$t('admin.moduleInstancesNew')}
			</h2>
			<div class="space-y-4">
				<div>
					<label
						for="mi-create-type"
						class="block text-sm font-medium text-(--color-surface-800-200) mb-1"
					>
						Module type
					</label>
					<select
						id="mi-create-type"
						class={adminSelectSmClass}
						bind:value={createType}
					>
						<option value="">— pick a type —</option>
						{#each availableTypes as t (t.type)}
							<option value={t.type}>{t.label} ({t.type})</option>
						{/each}
					</select>
				</div>
				<div>
					<label
						for="mi-create-name"
						class="block text-sm font-medium text-(--color-surface-800-200) mb-1"
					>
						Instance name
					</label>
					<input
						id="mi-create-name"
						class={adminInputSmClass}
						placeholder="e.g. hero_home"
						bind:value={createName}
					/>
					<p class="mt-1 text-[11px] text-(--color-surface-600-400)">
						Letters, digits, hyphen, underscore. 1–40 chars.
					</p>
				</div>
				{#if createError}
					<div class="rounded bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
						{createError}
					</div>
				{/if}
			</div>
			<div class="mt-6 flex justify-end gap-2">
				<button
					type="button"
					class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					onclick={() => (showCreateDialog = false)}
					disabled={saving}
				>
					Cancel
				</button>
				<button
					type="button"
					class="{adminBtnPrimarySm} disabled:opacity-50"
					onclick={handleCreate}
					disabled={saving}
				>
					{saving ? 'Creating…' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Edit dialog -->
{#if showEditDialog}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-70">
		<div
			class="card preset-outlined-surface-200-800 bg-(--color-surface-50-950) shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto"
		>
			<div class="mb-4 flex items-start justify-between gap-3">
				<div>
					<h2 class="text-lg font-bold text-(--color-surface-950-50)">
						{editName}
						<span class="ml-1 text-sm font-normal text-(--color-surface-600-400)">
							({typeLabel(editType)})
						</span>
					</h2>
					<p class="text-[11px] text-(--color-surface-600-400) font-mono">
						template.moduleInstances.{editType}.{editName}
					</p>
				</div>
			</div>

			{#key editType + ':' + editName}
				<ModulePropsForm
					moduleType={editType}
					props={editProps}
					onChange={handleEditPropsChange}
					showPlacementInGrid={false}
				/>
			{/key}

			<div class="mt-6 flex justify-end gap-2">
				<button
					type="button"
					class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					onclick={() => (showEditDialog = false)}
					disabled={saving}
				>
					Cancel
				</button>
				<button
					type="button"
					class="{adminBtnPrimarySm} disabled:opacity-50"
					onclick={handleSaveEdit}
					disabled={saving}
				>
					{saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}

<AdminConfirmDialog
	open={confirmDelete !== null}
	title="Delete module instance"
	message={confirmDelete
		? `Delete "${confirmDelete.name}" (${typeLabel(confirmDelete.type)})? Placements that reference it will fall back to their inline props.`
		: ''}
	confirmText="Delete"
	variant="danger"
	onConfirm={handleDeleteConfirmed}
	onOpenChange={(open) => {
		if (!open) confirmDelete = null;
	}}
/>
