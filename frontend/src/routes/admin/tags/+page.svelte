<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';
	import { useCrudLoader } from '$lib/composables/useCrudLoader';
	import { useCrudOperations } from '$lib/composables/useCrudOperations';
	import { useDialogManager } from '$lib/composables/useDialogManager';
	import { normalizeMultiLangText } from '$lib/utils/multiLangHelpers';
	import { t } from '$stores/i18n';
	import type { PageData } from './$types';

	// svelte-ignore export_let_unused - Required by SvelteKit page component
	export let data: PageData;

	// Provide a safe default in case reactive assignment hasn't run yet.
	// Otherwise, calling translate(...) during initialization can throw.
	let translate: (key: string, fallback?: string) => string = (key, fallback) => fallback || key;
	$: translate = $t;

	interface Tag {
		_id: string;
		name: string | MultiLangText;
		description?: string | MultiLangText;
		color?: string;
		category?: string;
		isActive?: boolean;
		usageCount?: number;
	}

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

	// Use CRUD composables
	const crudLoader = useCrudLoader<Tag>('/api/admin/tags', {
		searchParam: 'search',
		searchValue: () => searchTerm,
		filterParams: {
			category: () => categoryFilter
		}
	});
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
				name: MultiLangUtils.clean(rawName),
				description: MultiLangUtils.clean(rawDescription),
				color: data.color,
				category: data.category,
				isActive: data.isActive
			};
		},
		onCreateSuccess: (newTag) => {
			crudLoader.items.update(items => [...items, newTag]);
			dialogs.closeAll();
			resetForm();
		},
		onUpdateSuccess: (updatedTag) => {
			const currentEditingTag = editingTag;
			if (currentEditingTag) {
				crudLoader.items.update(items => 
					items.map(t => t._id === currentEditingTag._id ? updatedTag : t)
				);
			}
			dialogs.closeAll();
			editingTag = null;
			resetForm();
		},
		onDeleteSuccess: () => {
			const currentTagToDelete = tagToDelete;
			if (currentTagToDelete) {
				crudLoader.items.update(items => 
					items.filter(t => t._id !== currentTagToDelete._id)
				);
			}
			dialogs.closeAll();
			tagToDelete = null;
		}
	});
	const dialogs = useDialogManager();

	// Reactive stores from composables
	let tags: Tag[] = [];
	let loading = false;
	let saving = false;
	let message = '';
	let error = '';
	let searchTerm = '';
	let categoryFilter = 'all';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let editingTag: Tag | null = null;
	let tagToDelete: Tag | null = null;
	let feedbackStatsLoading = false;
	let feedbackStatsError = '';
	let feedbackStats: {
		total: number;
		bySource: Record<string, number>;
		byAction: Record<string, number>;
		bySourceAction: Record<string, Record<string, number>>;
	} = {
		total: 0,
		bySource: {},
		byAction: {},
		bySourceAction: {}
	};

	// Subscribe to stores
	crudLoader.items.subscribe(value => tags = value);
	crudLoader.loading.subscribe(value => loading = value);
	crudLoader.error.subscribe(value => {
		if (value) error = value;
	});
	crudOps.saving.subscribe(value => saving = value);
	crudOps.error.subscribe(value => {
		if (value) error = value;
	});
	crudOps.message.subscribe(value => message = value);
	dialogs.showCreate.subscribe(value => showCreateDialog = value);
	dialogs.showEdit.subscribe(value => showEditDialog = value);
	dialogs.showDelete.subscribe(value => showDeleteDialog = value);

	// Form state
	let formData = {
		name: { en: '', he: '' } as MultiLangText,
		description: { en: '', he: '' } as MultiLangText,
		color: '#3B82F6',
		category: 'general',
		isActive: true
	};

	onMount(async () => {
		await Promise.all([crudLoader.loadItems(), loadFeedbackStats()]);
	});

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

	function openCreateDialog() {
		resetForm();
		dialogs.openCreate();
		crudOps.error.set('');
	}

	function openEditDialog(tag: Tag) {
		editingTag = tag;
		formData = {
			name: normalizeMultiLangText(tag.name),
			description: normalizeMultiLangText(tag.description),
			color: tag.color || '#3B82F6',
			category: tag.category || 'general',
			isActive: tag.isActive !== undefined ? tag.isActive : true
		};
		dialogs.openEdit();
		crudOps.error.set('');
	}

	function openDeleteDialog(tag: Tag) {
		tagToDelete = tag;
		dialogs.openDelete();
		crudOps.error.set('');
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

	function getTagDescription(tag: Tag): string {
		if (!tag.description) return '';
		if (typeof tag.description === 'string') return tag.description;
		return MultiLangUtils.getTextValue(tag.description) || '';
	}
</script>

<svelte:head>
	<title>{$t('admin.tagsManagement')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-[var(--color-surface-950-50)]">{$t('admin.tagsManagement')}</h1>
				<p class="text-[var(--color-surface-600-400)] mt-2">{$t('admin.manageTagsStructuredData')}</p>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			<div class="mb-6 p-4 rounded-md border border-surface-200-800 bg-[var(--color-surface-50-950)]">
				<div class="flex items-center justify-between gap-3">
					<div>
						<h2 class="text-sm font-semibold text-[var(--color-surface-950-50)]">{$t('admin.tagsFeedbackSignalsTitle')}</h2>
						<p class="text-xs text-[var(--color-surface-600-400)] mt-1">{$t('admin.tagsFeedbackSignalsSubtitle')}</p>
					</div>
					<button
						type="button"
						on:click={loadFeedbackStats}
						class="px-3 py-1.5 text-xs font-medium text-[var(--color-surface-800-200)] bg-[var(--color-surface-50-950)] border border-surface-300-700 rounded hover:bg-[var(--color-surface-100-900)]"
					>
						{$t('admin.tagsFeedbackSignalsRefresh')}
					</button>
				</div>

				{#if feedbackStatsLoading}
					<p class="mt-3 text-xs text-[var(--color-surface-600-400)]">{$t('admin.tagsFeedbackSignalsLoading')}</p>
				{:else if feedbackStatsError}
					<p class="mt-3 text-xs text-red-600">{feedbackStatsError}</p>
				{:else}
					<div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
						<div class="p-3 bg-[var(--color-surface-50-950)] border border-surface-200-800 rounded">
							<p class="text-xs text-[var(--color-surface-600-400)]">{$t('admin.tagsFeedbackSignalsTotalEvents')}</p>
							<p class="text-xl font-semibold text-[var(--color-surface-950-50)]">{feedbackStats.total || 0}</p>
						</div>
						<div class="p-3 bg-[var(--color-surface-50-950)] border border-surface-200-800 rounded">
							<p class="text-xs text-[var(--color-surface-600-400)]">{$t('admin.tagsFeedbackSignalsBySource')}</p>
							<p class="text-sm text-[var(--color-surface-900-100)]">{$t('admin.tagsFeedbackSignalsAI')}: {feedbackStats.bySource.ai || 0}</p>
							<p class="text-sm text-[var(--color-surface-900-100)]">{$t('admin.tagsFeedbackSignalsContext')}: {feedbackStats.bySource.context || 0}</p>
							<p class="text-sm text-[var(--color-surface-900-100)]">{$t('admin.tagsFeedbackSignalsManual')}: {feedbackStats.bySource.manual || 0}</p>
						</div>
						<div class="p-3 bg-[var(--color-surface-50-950)] border border-surface-200-800 rounded">
							<p class="text-xs text-[var(--color-surface-600-400)]">{$t('admin.tagsFeedbackSignalsByAction')}</p>
							<p class="text-sm text-[var(--color-surface-900-100)]">{$t('admin.tagsFeedbackSignalsApplied')}: {feedbackStats.byAction.applied || 0}</p>
							<p class="text-sm text-[var(--color-surface-900-100)]">{$t('admin.tagsFeedbackSignalsDismissed')}: {feedbackStats.byAction.dismissed || 0}</p>
							<p class="text-sm text-[var(--color-surface-900-100)]">{$t('admin.tagsFeedbackSignalsRemoved')}: {feedbackStats.byAction.removed || 0}</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Search and Filters -->
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center space-x-4">
					<div class="relative">
						<input
							type="text"
							placeholder={$t('admin.searchTagsPlaceholder')}
							bind:value={searchTerm}
							on:input={() => crudLoader.loadItems()}
							class="pl-10 pr-4 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] w-64"
						/>
						<svg
							class="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-surface-400-600)] h-4 w-4"
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
						on:change={() => crudLoader.loadItems()}
						class="px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
					>
						<option value="all">{$t('admin.allCategories')}</option>
						{#each TAG_CATEGORIES as cat}
							<option value={cat.value}>{$t(cat.labelKey)}</option>
						{/each}
					</select>
				</div>

				<button
					type="button"
					on:click={openCreateDialog}
					class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] text-sm font-medium flex items-center gap-2"
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

			<!-- Tags List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary-600)]"></div>
					<p class="mt-2 text-[var(--color-surface-600-400)]">{$t('admin.loadingTags')}</p>
				</div>
			{:else if tags.length === 0}
				<div class="text-center py-8">
					<svg
						class="h-12 w-12 text-[var(--color-surface-400-600)] mx-auto mb-4"
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
					<h3 class="text-lg font-semibold text-[var(--color-surface-950-50)] mb-2">{$t('admin.noTagsFound')}</h3>
					<p class="text-[var(--color-surface-600-400)]">{$t('admin.startByAddingFirstTag')}</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each tags as tag}
						<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center space-x-2 flex-1">
									<div
										class="w-4 h-4 rounded-full border border-surface-300-700"
										style="background-color: {tag.color || '#3B82F6'}"
									></div>
									<h3 class="font-semibold text-[var(--color-surface-950-50)]">{getTagName(tag)}</h3>
								</div>

								<div class="flex space-x-1">
									<button
										type="button"
										on:click={() => openEditDialog(tag)}
										class="p-1 text-[var(--color-surface-600-400)] hover:text-[var(--color-primary-600)] hover:bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] rounded"
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
										on:click={() => openDeleteDialog(tag)}
										class="p-1 text-[var(--color-surface-600-400)] hover:text-red-600 hover:bg-red-50 rounded"
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
								<p class="text-sm text-[var(--color-surface-600-400)] mb-2">{getTagDescription(tag)}</p>
							{/if}

							<div class="flex items-center justify-between mt-3">
								<span
									class="px-2 py-1 text-xs font-medium rounded bg-[var(--color-surface-100-900)] text-[var(--color-surface-900-100)]"
								>
									{getCategoryLabel(tag.category || 'general')}
								</span>
								{#if tag.usageCount !== undefined}
									<span class="text-xs text-[var(--color-surface-600-400)]">
										{$t('admin.tagsUsedLabel')} {tag.usageCount}
										{tag.usageCount === 1 ? $t('admin.tagsTimeSingular') : $t('admin.tagsTimePlural')}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create Dialog -->
{#if showCreateDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-[var(--color-surface-950-50)] mb-4">{$t('admin.tagsAddNewTagTitle')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<p class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						{$t('admin.tagsTagNameLabel')}
					</p>
					<MultiLangInput
						bind:value={formData.name}
						placeholder={$t('admin.tagsTagNamePlaceholder')}
						required
					/>
				</div>

				<div>
					<p class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						{$t('admin.tagsDescriptionLabel')}
					</p>
					<MultiLangInput
						bind:value={formData.description}
						placeholder={$t('admin.tagsDescriptionPlaceholder')}
					/>
				</div>

				<div>
					<label for="tag-category" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						{$t('admin.tagsCategoryLabel')}
					</label>
					<select
						id="tag-category"
						bind:value={formData.category}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
					>
						{#each TAG_CATEGORIES as cat}
							<option value={cat.value}>{$t(cat.labelKey)}</option>
						{/each}
					</select>
				</div>

				<div>
					<p class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
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
							class="flex-1 px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						/>
					</div>
					<div class="flex flex-wrap gap-2 mt-2">
						{#each COLOR_PRESETS as preset}
							<button
								type="button"
								on:click={() => (formData.color = preset)}
								class="w-8 h-8 rounded border-2 {formData.color === preset
									? 'border-[var(--color-surface-800)]'
									: 'border-surface-300-700'} hover:border-[var(--color-surface-500)]"
								style="background-color: {preset}"
								aria-label={`${$t('admin.tagsSelectColorAriaLabel')} ${preset}`}
							></button>
						{/each}
					</div>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							resetForm();
						}}
						class="px-4 py-2 bg-[var(--color-surface-200-800)] text-[var(--color-surface-800-200)] rounded-md hover:bg-[var(--color-surface-300-700)] text-sm font-medium"
					>
						{$t('admin.tagsCancelButton')}
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={saving || MultiLangUtils.getLanguagesWithContent(formData.name).length === 0}
						class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							{$t('admin.tagsCreatingButton')}
						{:else}
							{$t('admin.tagsCreateTagButton')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Dialog -->
{#if showEditDialog && editingTag}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-[var(--color-surface-950-50)] mb-4">{$t('admin.tagsEditTagTitle')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<p class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						{$t('admin.tagsTagNameLabel')}
					</p>
					<MultiLangInput
						bind:value={formData.name}
						placeholder={$t('admin.tagsTagNamePlaceholder')}
						required
					/>
				</div>

				<div>
					<p class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						{$t('admin.tagsDescriptionLabel')}
					</p>
					<MultiLangInput
						bind:value={formData.description}
						placeholder={$t('admin.tagsDescriptionPlaceholder')}
					/>
				</div>

				<div>
					<p class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						{$t('admin.tagsCategoryLabel')}
					</p>
					<select
						bind:value={formData.category}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
					>
						{#each TAG_CATEGORIES as cat}
							<option value={cat.value}>{$t(cat.labelKey)}</option>
						{/each}
					</select>
				</div>

				<div>
					<p class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
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
							class="flex-1 px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						/>
					</div>
					<div class="flex flex-wrap gap-2 mt-2">
						{#each COLOR_PRESETS as preset}
							<button
								type="button"
								on:click={() => (formData.color = preset)}
								class="w-8 h-8 rounded border-2 {formData.color === preset
									? 'border-[var(--color-surface-800)]'
									: 'border-surface-300-700'} hover:border-[var(--color-surface-500)]"
								style="background-color: {preset}"
								aria-label={`${$t('admin.tagsSelectColorAriaLabel')} ${preset}`}
							></button>
						{/each}
					</div>
				</div>

				<div class="flex items-center">
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.isActive}
							class="sr-only peer"
						/>
						<div
							class="w-11 h-6 bg-[var(--color-surface-200-800)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[color-mix(in_oklab,var(--color-primary-500)_35%,transparent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface-50-950)] after:border-surface-300-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-600)]"
						></div>
						<span class="ml-3 text-sm font-medium text-[var(--color-surface-800-200)]">
							{$t('admin.tagsActiveLabel')}
						</span>
					</label>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							editingTag = null;
							resetForm();
						}}
						class="px-4 py-2 bg-[var(--color-surface-200-800)] text-[var(--color-surface-800-200)] rounded-md hover:bg-[var(--color-surface-300-700)] text-sm font-medium"
					>
						{$t('admin.tagsCancelButton')}
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving || MultiLangUtils.getLanguagesWithContent(formData.name).length === 0}
						class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							{$t('admin.tagsUpdatingButton')}
						{:else}
							{$t('admin.tagsUpdateTagButton')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && tagToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-[var(--color-surface-950-50)] mb-4">{$t('admin.tagsDeleteTagTitle')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-[var(--color-surface-600-400)]">
					{$t('admin.tagsDeleteConfirmPrefix')}
					<strong>{tagToDelete.name}</strong>
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
						on:click={() => {
							dialogs.closeAll();
							tagToDelete = null;
						}}
						class="px-4 py-2 bg-[var(--color-surface-200-800)] text-[var(--color-surface-800-200)] rounded-md hover:bg-[var(--color-surface-300-700)] text-sm font-medium"
					>
						{$t('admin.tagsCancelButton')}
					</button>
					<button
						type="button"
						on:click={handleDelete}
						disabled={saving}
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							{$t('admin.tagsDeletingButton')}
						{:else}
							{$t('admin.tagsDeleteButton')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
