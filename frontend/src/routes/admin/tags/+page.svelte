<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';
	import { useCrudOperations } from '$lib/composables/useCrudOperations';
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
	import { t } from '$stores/i18n';
	import type { PageData } from './$types';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimarySm, adminRingPrimary } from '$lib/admin/admin-cerberus';
	import AdminCrudDialog from '$lib/components/admin/AdminCrudDialog.svelte';

	let { data }: { data: PageData } = $props();

	interface Tag {
		_id: string;
		name: string | MultiLangText;
		description?: string | MultiLangText;
		color?: string;
		category?: string;
		isActive?: boolean;
		usageCount?: number;
	}

	const tags = $derived((data.tags ?? []) as Tag[]);

	let searchTerm = $state(data.filters?.search ?? '');
	let categoryFilter = $state(data.filters?.category ?? 'all');

	async function refreshTags() {
		await invalidate('admin:tags');
	}

	async function applyFilters() {
		const params = new URLSearchParams();
		if (searchTerm.trim()) params.set('search', searchTerm.trim());
		if (categoryFilter !== 'all') params.set('category', categoryFilter);
		const query = params.toString();
		await goto(query ? `/admin/tags?${query}` : '/admin/tags', {
			keepFocus: true,
			noScroll: true,
			invalidateAll: true
		});
	}
	// Otherwise, calling translate(...) during initialization can throw.
	const translate = $derived($t);
	const TAG_CATEGORIES = [
		{ value: 'general', labelKey: 'admin.tagsCategoryGeneral' },
		{ value: 'location', labelKey: 'admin.tagsCategoryLocation' },
		{ value: 'event', labelKey: 'admin.tagsCategoryEvent' },
		{ value: 'object', labelKey: 'admin.tagsCategoryObject' },
		{ value: 'mood', labelKey: 'admin.tagsCategoryMood' },
		{ value: 'technical', labelKey: 'admin.tagsCategoryTechnical' },
		{ value: 'custom', labelKey: 'admin.tagsCategoryCustom' }
	];

	const COLOR_PRESETS = [
		'#3B82F6',
		'#EF4444',
		'#10B981',
		'#F59E0B',
		'#8B5CF6',
		'#EC4899',
		'#06B6D4',
		'#84CC16',
		'#F97316',
		'#6366F1'
	];

	/** List-indicator colour by category (not tag.color), so rows are visually distinct. */
	const CATEGORY_INDICATOR_COLORS: Record<string, string> = {
		general: '#64748b',
		location: '#0d9488',
		event: '#c026d3',
		object: '#ea580c',
		mood: '#7c3aed',
		technical: '#2563eb',
		custom: '#525252'
	};

	/** Title-case words for Latin tag names; leave RTL/CJK/Cyrillic unchanged. */
	function normalizeTagLabelLatin(raw: string): string {
		const s = raw.trim();
		if (!s) return s;
		if (/[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]/.test(s)) {
			return s;
		}
		return s
			.split(/(\s+)/)
			.map((part) => {
				if (/^\s+$/.test(part) || part === '') return part;
				return part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase();
			})
			.join('');
	}

	function normalizeNamePayloadForStorage(name: MultiLangText): MultiLangText {
		const cleaned = MultiLangUtils.clean(name) as MultiLangText;
		const rec = cleaned as Record<string, string | undefined>;
		for (const key of Object.keys(rec)) {
			const v = rec[key];
			if (typeof v === 'string' && v.trim()) {
				rec[key] = normalizeTagLabelLatin(v);
			}
		}
		return cleaned;
	}

	let feedbackAdvancedOpen = $state(false);
	let feedbackTelemetryLoadStarted = $state(false);

	/** Payload sent to create/update tag API. */
	type TagPayload = Pick<Partial<Tag>, 'name' | 'description' | 'color' | 'category' | 'isActive'>;

	const crudOps = useCrudOperations<Tag>('/api/admin/tags', {
		createSuccessMessage: translate('admin.tagsCreatedSuccessfully', 'Tag created successfully!'),
		updateSuccessMessage: translate('admin.tagsUpdatedSuccessfully', 'Tag updated successfully!'),
		deleteSuccessMessage: translate('admin.tagsDeletedSuccessfully', 'Tag deleted successfully!'),
		transformPayload: (data: Partial<Tag>): TagPayload => {
			const rawName = data.name && typeof data.name === 'object' ? data.name : {};
			const rawDescription = data.description && typeof data.description === 'object' ? data.description : {};
			return {
				name: normalizeNamePayloadForStorage(rawName as MultiLangText),
				description: MultiLangUtils.clean(rawDescription),
				color: data.color,
				category: data.category,
				isActive: data.isActive
			};
		},
		onCreateSuccess: async () => {
			closeAllDialogs();
			resetForm();
			await refreshTags();
		},
		onUpdateSuccess: async () => {
			closeAllDialogs();
			editingTag = null;
			resetForm();
			await refreshTags();
		},
		onDeleteSuccess: async () => {
			closeAllDialogs();
			tagToDelete = null;
			await refreshTags();
		}
	});
	const crudSaving = crudOps.saving;
	const crudError = crudOps.error;
	const crudMessage = crudOps.message;
	let error = $state('');
	let editingTag: Tag | null = $state(null);
	let tagToDelete: Tag | null = $state(null);
	let createDialog: AdminCrudDialog | undefined;
	let editDialog: AdminCrudDialog | undefined;
	let deleteDialog: AdminCrudDialog | undefined;

	function closeAllDialogs() {
		createDialog?.close();
		editDialog?.close();
		deleteDialog?.close();
	}
	let feedbackStatsLoading = $state(false);
	let feedbackStatsError = $state('');
	let feedbackStats: {
		total: number;
		bySource: Record<string, number>;
		byAction: Record<string, number>;
		bySourceAction: Record<string, Record<string, number>>;
	} = $state({
		total: 0,
		bySource: {},
		byAction: {},
		bySourceAction: {}
	});

	let importExportBusy = $state(false);

$effect(() => { if ($crudError) error = $crudError; });
$effect(() => { if ($crudMessage) adminToast.success({ title: $crudMessage }); });

	// Form state
	let formData = $state({
		name: { en: '', he: '' } as MultiLangText,
		description: { en: '', he: '' } as MultiLangText,
		color: '#3B82F6',
		category: 'general',
		isActive: true
	});

	onMount(async () => {
		searchTerm = data.filters?.search ?? '';
		categoryFilter = data.filters?.category ?? 'all';
	});

$effect(() => { if (feedbackAdvancedOpen && !feedbackTelemetryLoadStarted) {
		feedbackTelemetryLoadStarted = true;
		void loadFeedbackStats();
	} });

	async function loadFeedbackStats() {
		try {
			feedbackStatsLoading = true;
			feedbackStatsError = '';
			const response = await fetch('/api/admin/tags/feedback/stats', { credentials: 'include' });
			if (!response.ok) {
				const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
				throw new Error(payload.error || `HTTP ${response.status}`);
			}
			const result = await response.json();
			feedbackStats = result.data || {
				total: 0,
				bySource: {},
				byAction: {},
				bySourceAction: {}
	};
		} catch (err) {
			feedbackStatsError = err instanceof Error ? err.message : translate('admin.tagsFeedbackSignalsLoadError', 'Failed to load feedback stats');
		} finally {
			feedbackStatsLoading = false;
		}
	}

	function resetForm() {
		formData = {
			name: { en: '', he: '' } as MultiLangText,
			description: { en: '', he: '' } as MultiLangText,
			color: '#3B82F6',
			category: 'general',
			isActive: true
		};
	}

	async function openCreateDialog() {
		resetForm();
		crudError.set('');
		await tick();
		createDialog?.open();
	}

	async function openEditDialog(tag: Tag) {
		editingTag = tag;
		formData = {
			name: normalizeMultiLangText(tag.name),
			description: normalizeMultiLangText(tag.description),
			color: tag.color || '#3B82F6',
			category: tag.category || 'general',
			isActive: tag.isActive !== undefined ? tag.isActive : true
	};
		crudError.set('');
		await tick();
		editDialog?.open();
	}

	async function openDeleteDialog(tag: Tag) {
		tagToDelete = tag;
		crudError.set('');
		await tick();
		deleteDialog?.open();
	}

	async function handleCreate() {
		const newTag = await crudOps.create(formData);
		if (newTag) {
			// Success handled by onCreateSuccess callback
		}
	}

	async function handleEdit() {
		if (!editingTag) return;
		const currentEditingTag = editingTag;
		const updatedTag = await crudOps.update(currentEditingTag._id, formData);
		if (updatedTag) {
			// Success handled by onUpdateSuccess callback
		}
	}

	async function handleDelete() {
		if (!tagToDelete) return;
		const currentTagToDelete = tagToDelete;
		const success = await crudOps.remove(currentTagToDelete._id);
		if (success) {
			// Success handled by onDeleteSuccess callback
		}
	}

	function getCategoryLabel(category: string): string {
		const cat = TAG_CATEGORIES.find((c) => c.value === category);
		return (cat?.labelKey ? translate(cat.labelKey) : undefined) || category;
	}

	function getTimeLabel(count: number): string {
		return translate(count === 1 ? 'admin.tagsTimeSingular' : 'admin.tagsTimePlural');
	}

	function getPhotoLabel(count: number): string {
		return translate(count === 1 ? 'admin.tagsPhotoSingular' : 'admin.tagsPhotoPlural');
	}

	function getTagName(tag: Tag): string {
		if (typeof tag.name === 'string') return tag.name;
		return MultiLangUtils.getTextValue(tag.name) || tag._id;
	}

	function getCategoryIndicatorColor(category: string | undefined): string {
		return CATEGORY_INDICATOR_COLORS[category || 'general'] ?? CATEGORY_INDICATOR_COLORS.general;
	}

	/** Same as {@link normalizeTagLabelLatin}; used for list card display. */
	function formatTagDisplayLabel(raw: string): string {
		return normalizeTagLabelLatin(raw);
	}

	function getTagDisplayName(tag: Tag): string {
		return formatTagDisplayLabel(getTagName(tag));
	}

	function isTagUnused(tag: Tag): boolean {
		return tag.usageCount === 0;
	}

	function getTagDescription(tag: Tag): string {
		if (!tag.description) return '';
		if (typeof tag.description === 'string') return tag.description;
		return MultiLangUtils.getTextValue(tag.description) || '';
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
		const text = applyTemplateVars(template, { created, failed });
		crudMessage.set(text);
	}

	async function handleTagsExport() {
		importExportBusy = true;
		crudError.set('');
		try {
			const rows = await fetchAdminPaginatedList('/api/admin/tags');
			const items = rows.map((raw) => {
				const row = raw as Record<string, unknown>;
				const { _id, usageCount, createdBy, createdAt, updatedAt, ...rest } = row;
				void _id;
				void usageCount;
				void createdBy;
				void createdAt;
				void updatedAt;
				return rest;
			});
			downloadJson(`openshutter-tags-${new Date().toISOString().slice(0, 10)}.json`, {
				schema: 'openshutter.admin.tags/v1',
				exportedAt: new Date().toISOString(),
				items
			});
		} catch (err) {
			crudError.set(handleError(err, translate('admin.collectionExportFailed')));
		} finally {
			importExportBusy = false;
		}
	}

	async function handleTagsImport(file: File) {
		importExportBusy = true;
		crudError.set('');
		let created = $state(0);
		let failed = $state(0);
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
				const payload = {
					name: o.name,
					description: o.description ?? {},
					color: typeof o.color === 'string' ? o.color : undefined,
					category: typeof o.category === 'string' ? o.category : undefined
	};
				if (payload.name == null) {
					failed++;
					failureLines.push(`#${i + 1}: ${translate('admin.tagsTagNameLabel')}`);
					continue;
				}
				try {
					await adminPostJson('/api/admin/tags', payload);
					created++;
				} catch (e) {
					failed++;
					failureLines.push(`#${i + 1}: ${handleError(e, 'Error')}`);
				}
			}
			await refreshTags();
			setImportSummaryMessage(created, failed);
			if (failureLines.length) {
				crudError.set(failureLines.slice(0, 8).join(' · '));
			}
		} catch (err) {
			crudError.set(importFileErrorMessage(err));
		} finally {
			importExportBusy = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.tagsManagement')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.tagsManagement')}</h1>
				<p class="text-(--color-surface-600-400) mt-2">{$t('admin.manageTagsStructuredData')}</p>
			</div>

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			<!-- Search and Filters -->
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center space-x-4">
					<div class="relative">
						<input
							type="text"
							placeholder={$t('admin.searchTagsPlaceholder')}
							bind:value={searchTerm}
							oninput={() => applyFilters()}
							class="pl-10 pr-4 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) w-64"
						/>
						<svg
							class="absolute left-3 top-1/2 transform -translate-y-1/2 text-(--color-surface-400-600) h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>

					<select
						bind:value={categoryFilter}
						onchange={() => applyFilters()}
						class="px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					>
						<option value="all">{$t('admin.allCategories')}</option>
						{#each TAG_CATEGORIES as cat}
							<option value={cat.value}>{$t(cat.labelKey)}</option>
						{/each}
					</select>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<CollectionImportExportButtons
						exportLabel={$t('admin.collectionExportJson')}
						importLabel={$t('admin.collectionImportJson')}
						busy={importExportBusy}
						onExport={handleTagsExport}
						onImportFile={handleTagsImport}
					/>
					<button
						type="button"
						data-open-dialog="admin-tags-create"
						onclick={openCreateDialog}
						class="{adminBtnPrimarySm} {adminRingPrimary} flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						{$t('admin.addTag')}
					</button>
				</div>
			</div>

			<!-- Tags List -->
			{#if data.tagsLoadError}
				<div class="text-center py-8">
					<p class="text-red-600">{data.tagsLoadError}</p>
				</div>
			{:else if tags.length === 0}
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
							d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.noTagsFound')}</h3>
					<p class="text-(--color-surface-600-400)">{$t('admin.startByAddingFirstTag')}</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each tags as tag}
						<div
							class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4 {isTagUnused(tag)
								? 'border border-dashed border-amber-300/90 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/25'
								: ''}"
						>
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center space-x-2 flex-1 min-w-0">
									<div
										class="w-4 h-4 shrink-0 rounded-full border border-surface-400/40 ring-1 ring-black/5 dark:ring-white/10"
										style="background-color: {getCategoryIndicatorColor(tag.category)}"
										title={getCategoryLabel(tag.category || 'general')}
										aria-hidden="true"
									></div>
									<h3 class="font-semibold text-(--color-surface-950-50) truncate">
										{getTagDisplayName(tag)}
									</h3>
									{#if isTagUnused(tag)}
										<span
											class="shrink-0 rounded-full border border-amber-400/70 bg-amber-100/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
										>
											{$t('admin.tagsUnusedBadge')}
										</span>
									{/if}
								</div>

								<div class="flex space-x-1">
									<button
										type="button"
										onclick={() => openEditDialog(tag)}
										class="p-1 text-(--color-surface-600-400) hover:text-(--color-primary-600) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] rounded"
										aria-label="Edit tag"
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
										onclick={() => openDeleteDialog(tag)}
										class="p-1 text-(--color-surface-600-400) hover:text-red-600 hover:bg-red-50 rounded"
										aria-label={$t('admin.tagsDeleteAriaLabel')}
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

							{#if getTagDescription(tag)}
								<p class="text-sm text-(--color-surface-600-400) mb-2">{getTagDescription(tag)}</p>
							{/if}

							<div class="flex items-center justify-between mt-3">
								<span
									class="px-2 py-1 text-xs font-medium rounded bg-(--color-surface-100-900) text-(--color-surface-900-100)"
								>
									{getCategoryLabel(tag.category || 'general')}
								</span>
								{#if tag.usageCount !== undefined}
									<span
										class="text-xs {isTagUnused(tag)
											? 'font-medium text-amber-800 dark:text-amber-200'
											: 'text-(--color-surface-600-400)'}"
									>
										{$t('admin.tagsUsedLabel')} {tag.usageCount}
										{tag.usageCount === 1 ? $t('admin.tagsTimeSingular') : $t('admin.tagsTimePlural')}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<details class="mt-8 border-t border-(--color-surface-200-700) pt-4" bind:open={feedbackAdvancedOpen}>
				<summary
					class="cursor-pointer list-none text-sm font-medium text-(--color-surface-700-300) hover:text-(--color-surface-950-50) [&::-webkit-details-marker]:hidden"
				>
					<span class="inline-flex items-center gap-2">
						<svg class="h-4 w-4 text-(--color-surface-500-400)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
							/>
						</svg>
						{$t('admin.tagsAdvancedTelemetrySummary')}
					</span>
				</summary>
				<p class="mt-2 text-xs text-(--color-surface-600-400) max-w-2xl">
					{$t('admin.tagsAdvancedTelemetryHelp')}
				</p>
				<div class="mt-4 p-4 rounded-md border border-surface-200-800 bg-(--color-surface-50-950)">
					<div class="flex items-center justify-between gap-3">
						<div>
							<h2 class="text-sm font-semibold text-(--color-surface-950-50)">{$t('admin.tagsFeedbackSignalsTitle')}</h2>
							<p class="text-xs text-(--color-surface-600-400) mt-1">{$t('admin.tagsFeedbackSignalsSubtitle')}</p>
						</div>
						<button
							type="button"
							onclick={loadFeedbackStats}
							class="px-3 py-1.5 text-xs font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) border border-surface-300-700 rounded hover:bg-(--color-surface-100-900)"
						>
							{$t('admin.tagsFeedbackSignalsRefresh')}
						</button>
					</div>

					{#if feedbackStatsLoading}
						<p class="mt-3 text-xs text-(--color-surface-600-400)">{$t('admin.tagsFeedbackSignalsLoading')}</p>
					{:else if feedbackStatsError}
						<p class="mt-3 text-xs text-red-600">{feedbackStatsError}</p>
					{:else}
						<div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
							<div class="p-3 bg-(--color-surface-50-950) border border-surface-200-800 rounded">
								<p class="text-xs text-(--color-surface-600-400)">{$t('admin.tagsFeedbackSignalsTotalEvents')}</p>
								<p class="text-xl font-semibold text-(--color-surface-950-50)">{feedbackStats.total || 0}</p>
							</div>
							<div class="p-3 bg-(--color-surface-50-950) border border-surface-200-800 rounded">
								<p class="text-xs text-(--color-surface-600-400)">{$t('admin.tagsFeedbackSignalsBySource')}</p>
								<p class="text-sm text-(--color-surface-900-100)">{$t('admin.tagsFeedbackSignalsAI')}: {feedbackStats.bySource.ai || 0}</p>
								<p class="text-sm text-(--color-surface-900-100)">{$t('admin.tagsFeedbackSignalsContext')}: {feedbackStats.bySource.context || 0}</p>
								<p class="text-sm text-(--color-surface-900-100)">{$t('admin.tagsFeedbackSignalsManual')}: {feedbackStats.bySource.manual || 0}</p>
							</div>
							<div class="p-3 bg-(--color-surface-50-950) border border-surface-200-800 rounded">
								<p class="text-xs text-(--color-surface-600-400)">{$t('admin.tagsFeedbackSignalsByAction')}</p>
								<p class="text-sm text-(--color-surface-900-100)">{$t('admin.tagsFeedbackSignalsApplied')}: {feedbackStats.byAction.applied || 0}</p>
								<p class="text-sm text-(--color-surface-900-100)">{$t('admin.tagsFeedbackSignalsDismissed')}: {feedbackStats.byAction.dismissed || 0}</p>
								<p class="text-sm text-(--color-surface-900-100)">{$t('admin.tagsFeedbackSignalsRemoved')}: {feedbackStats.byAction.removed || 0}</p>
							</div>
						</div>
					{/if}
				</div>
			</details>
		</div>
	</div>
</div>

<!-- Create Dialog -->
<AdminCrudDialog
	bind:this={createDialog}
	dialogId="admin-tags-create"
	title={$t('admin.tagsAddNewTagTitle')}
>
	{#if error}
		<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
	{/if}

	<div class="space-y-4">
		<div>
			<p class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
				{$t('admin.tagsTagNameLabel')}
			</p>
			<MultiLangInput
				bind:value={formData.name}
				placeholder={$t('admin.tagsTagNamePlaceholder')}
				required
			/>
		</div>

		<div>
			<p class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
				{$t('admin.tagsDescriptionLabel')}
			</p>
			<MultiLangInput
				bind:value={formData.description}
				placeholder={$t('admin.tagsDescriptionPlaceholder')}
			/>
		</div>

		<div>
			<label for="tag-category" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
				{$t('admin.tagsCategoryLabel')}
			</label>
			<select
				id="tag-category"
				bind:value={formData.category}
				class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
			>
				{#each TAG_CATEGORIES as cat}
					<option value={cat.value}>{$t(cat.labelKey)}</option>
				{/each}
			</select>
		</div>

		<div>
			<p class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
				{$t('admin.tagsColorLabel')}
			</p>
			<div class="flex items-center gap-3">
				<input
					type="color"
					bind:value={formData.color}
					class="w-16 h-10 border border-surface-300-700 rounded cursor-pointer"
				/>
				<input
					type="text"
					bind:value={formData.color}
					placeholder="#3B82F6"
					class="flex-1 px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
				/>
			</div>
			<div class="flex flex-wrap gap-2 mt-2">
				{#each COLOR_PRESETS as preset}
					<button
						type="button"
						onclick={() => (formData.color = preset)}
						class="w-8 h-8 rounded border-2 {formData.color === preset
							? 'border-(--color-surface-800)'
							: 'border-surface-300-700'} hover:border-(--color-surface-500)"
						style="background-color: {preset}"
						aria-label={`${$t('admin.tagsSelectColorAriaLabel')} ${preset}`}
					></button>
				{/each}
			</div>
		</div>

		<div class="flex justify-end space-x-2 pt-4">
			<button
				type="button"
				onclick={() => {
					closeAllDialogs();
					resetForm();
				}}
				class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
			>
				{$t('admin.tagsCancelButton')}
			</button>
			<button
				type="button"
				onclick={handleCreate}
				disabled={$crudSaving || MultiLangUtils.getLanguagesWithContent(formData.name).length === 0}
				class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
			>
				{#if $crudSaving}
					{$t('admin.tagsCreatingButton')}
				{:else}
					{$t('admin.tagsCreateTagButton')}
				{/if}
			</button>
		</div>
	</div>
</AdminCrudDialog>

<!-- Edit Dialog -->
<AdminCrudDialog bind:this={editDialog} title={$t('admin.tagsEditTagTitle')}>
	{#if error}
		<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
	{/if}

	<div class="space-y-4">
		<div>
			<p class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
				{$t('admin.tagsTagNameLabel')}
			</p>
			<MultiLangInput
				bind:value={formData.name}
				placeholder={$t('admin.tagsTagNamePlaceholder')}
				required
			/>
		</div>

		<div>
			<p class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
				{$t('admin.tagsDescriptionLabel')}
			</p>
			<MultiLangInput
				bind:value={formData.description}
				placeholder={$t('admin.tagsDescriptionPlaceholder')}
			/>
		</div>

		<div>
			<p class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
				{$t('admin.tagsCategoryLabel')}
			</p>
			<select
				bind:value={formData.category}
				class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
			>
				{#each TAG_CATEGORIES as cat}
					<option value={cat.value}>{$t(cat.labelKey)}</option>
				{/each}
			</select>
		</div>

		<div>
			<p class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
				{$t('admin.tagsColorLabel')}
			</p>
			<div class="flex items-center gap-3">
				<input
					type="color"
					bind:value={formData.color}
					class="w-16 h-10 border border-surface-300-700 rounded cursor-pointer"
				/>
				<input
					type="text"
					bind:value={formData.color}
					placeholder="#3B82F6"
					class="flex-1 px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
				/>
			</div>
			<div class="flex flex-wrap gap-2 mt-2">
				{#each COLOR_PRESETS as preset}
					<button
						type="button"
						onclick={() => (formData.color = preset)}
						class="w-8 h-8 rounded border-2 {formData.color === preset
							? 'border-(--color-surface-800)'
							: 'border-surface-300-700'} hover:border-(--color-surface-500)"
						style="background-color: {preset}"
						aria-label={`${$t('admin.tagsSelectColorAriaLabel')} ${preset}`}
					></button>
				{/each}
			</div>
		</div>

		<div class="flex items-center">
			<label class="relative inline-flex items-center cursor-pointer">
				<input type="checkbox" bind:checked={formData.isActive} class="sr-only peer" />
				<div
					class="w-11 h-6 bg-(--color-surface-200-800) peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[color-mix(in_oklab,var(--color-primary-500)_35%,transparent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-(--color-surface-50-950) after:border-surface-300-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-(--color-primary-600)"
				></div>
				<span class="ml-3 text-sm font-medium text-(--color-surface-800-200)">
					{$t('admin.tagsActiveLabel')}
				</span>
			</label>
		</div>

		<div class="flex justify-end space-x-2 pt-4">
			<button
				type="button"
				onclick={() => {
					closeAllDialogs();
					editingTag = null;
					resetForm();
				}}
				class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
			>
				{$t('admin.tagsCancelButton')}
			</button>
			<button
				type="button"
				onclick={handleEdit}
				disabled={$crudSaving || MultiLangUtils.getLanguagesWithContent(formData.name).length === 0}
				class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
			>
				{#if $crudSaving}
					{$t('admin.tagsUpdatingButton')}
				{:else}
					{$t('admin.tagsUpdateTagButton')}
				{/if}
			</button>
		</div>
	</div>
</AdminCrudDialog>

<!-- Delete Dialog -->
<AdminCrudDialog bind:this={deleteDialog} title={$t('admin.tagsDeleteTagTitle')}>
	{#if error}
		<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
	{/if}

	{#if tagToDelete}
		<div class="space-y-4">
			<p class="text-(--color-surface-600-400)">
				{$t('admin.tagsDeleteConfirmPrefix')}
				<strong>{getTagDisplayName(tagToDelete)}</strong>
				{$t('admin.tagsDeleteConfirmSuffix')}
			</p>
			{#if tagToDelete.usageCount && tagToDelete.usageCount > 0}
				<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
					<p class="text-sm text-yellow-800">
						{$t('admin.tagsDeleteUsedWarningPrefix')} {tagToDelete.usageCount}
						{' '}{tagToDelete.usageCount === 1 ? $t('admin.tagsPhotoSingular') : $t('admin.tagsPhotoPlural')}{$t('admin.tagsDeleteUsedWarningSuffix')}
					</p>
				</div>
			{/if}
			<div class="flex justify-end space-x-2">
				<button
					type="button"
					onclick={() => {
						closeAllDialogs();
						tagToDelete = null;
					}}
					class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
				>
					{$t('admin.tagsCancelButton')}
				</button>
				<button
					type="button"
					onclick={handleDelete}
					disabled={$crudSaving}
					class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
				>
					{#if $crudSaving}
						{$t('admin.tagsDeletingButton')}
					{:else}
						{$t('admin.tagsDeleteButton')}
					{/if}
				</button>
			</div>
		</div>
	{/if}
</AdminCrudDialog>
