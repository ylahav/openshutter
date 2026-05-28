<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';
	import { t } from '$stores/i18n';
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
	import PersonFaceCrop from '$lib/components/admin/PersonFaceCrop.svelte';
	import type { PageData } from './$types';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimarySm, adminRingPrimary } from '$lib/admin/admin-cerberus';

	// svelte-ignore export_let_unused - Required by SvelteKit page component
	export let data: PageData;

	let translate: (key: string, fallback?: string) => string = (key, fallback) => fallback || key;
	$: translate = $t;

	interface Person {
		_id: string;
		firstName: MultiLangText;
		lastName: MultiLangText;
		fullName: MultiLangText;
		nickname?: MultiLangText;
		birthDate?: string;
		description?: MultiLangText;
		tags?: string[] | Array<{ _id: string; name: string }>;
		photoCount?: number;
		isActive?: boolean;
		profileImage?: {
			url: string;
			storageProvider: string;
			fileId: string;
		};
		faceAvatarFromPhoto?: {
			imageUrl: string;
			box?: { x: number; y: number; width: number; height: number };
			sourceWidth: number;
			sourceHeight: number;
			rotation?: number;
		};
		faceRecognition?: {
			descriptor?: number[];
			extractedAt?: string;
			modelVersion?: string;
		};
	}

	// Use CRUD composables
	const { items, loading, error: listLoadError, loadItems } = useCrudLoader<Person>(
		'/api/admin/people',
		{
			searchParam: 'search',
			searchValue: () => searchTerm,
			initialItems: data.initialItems,
			initialLoadError: data.listLoadError,
		},
	);
	/** Form/payload shape for create/update person (tags can be string or array). */
	type PersonFormData = Partial<Omit<Person, '_id'>> & { tags?: string | string[] | Array<{ _id: string; name: string }> };
	/** Payload sent to API (tags normalized to string[]). */
	type PersonPayload = Partial<Omit<Person, '_id' | 'fullName'>> & { tags: string[] };

	const crudOps = useCrudOperations<Person>('/api/admin/people', {
		createSuccessMessage: $t('admin.personCreatedSuccessfully'),
		updateSuccessMessage: $t('admin.personUpdatedSuccessfully'),
		deleteSuccessMessage: $t('admin.personDeletedSuccessfully'),
		transformPayload: (data: PersonFormData): PersonPayload => {
			let tagsArray: string[] = [];
			if (data.tags) {
				if (typeof data.tags === 'string') {
					tagsArray = data.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
				} else {
					const arr = data.tags as Array<string | { _id: string; name: string }>;
					tagsArray = arr.map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean);
				}
			}
			return {
				firstName: MultiLangUtils.clean(data.firstName ?? {}),
				lastName: MultiLangUtils.clean(data.lastName ?? {}),
				nickname: MultiLangUtils.clean(data.nickname ?? {}),
				birthDate: data.birthDate || undefined,
				description: MultiLangUtils.clean(data.description ?? {}),
				tags: tagsArray,
				isActive: data.isActive
			};
		},
		onCreateSuccess: (newPerson) => {
			items.update((list) => [...list, newPerson]);
			dialogs.closeAll();
			resetForm();
		},
		onUpdateSuccess: (updatedPerson) => {
			const currentEditingPerson = editingPerson;
			if (currentEditingPerson) {
				items.update((list) =>
					list.map((p) => (p._id === currentEditingPerson._id ? updatedPerson : p)),
				);
			}
			dialogs.closeAll();
			editingPerson = null;
			resetForm();
		},
		onDeleteSuccess: () => {
			const currentPersonToDelete = personToDelete;
			if (currentPersonToDelete) {
				items.update((list) => list.filter((p) => p._id !== currentPersonToDelete._id));
			}
			dialogs.closeAll();
			personToDelete = null;
		}
	});
	const dialogs = useDialogManager();

	let saving = false;
	let error = '';
	let searchTerm = '';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let editingPerson: Person | null = null;
	let personToDelete: Person | null = null;
	let importExportBusy = false;

	crudOps.saving.subscribe(value => saving = value);
	crudOps.error.subscribe(value => {
		if (value) error = value;
	});
	crudOps.message.subscribe((value) => {
		if (!value) return;
		adminToast.success({ title: value });
	});
	dialogs.showCreate.subscribe(value => showCreateDialog = value);
	dialogs.showEdit.subscribe(value => showEditDialog = value);
	dialogs.showDelete.subscribe(value => showDeleteDialog = value);

	// Form state
	let formData = {
		firstName: {} as MultiLangText,
		lastName: {} as MultiLangText,
		nickname: {} as MultiLangText,
		birthDate: '',
		description: {} as MultiLangText,
		tags: '',
		isActive: true
	};

	$: defaultLang = $currentLanguage;

	onMount(async () => {
		if (data.listLoadError) return;
		await loadItems(data.initialItems !== undefined ? { background: true } : undefined);
	});

	function resetForm() {
		formData = {
			firstName: {},
			lastName: {},
			nickname: {},
			birthDate: '',
			description: {},
			tags: '',
			isActive: true
		};
	}

	function openCreateDialog() {
		resetForm();
		dialogs.openCreate();
		crudOps.error.set('');
	}

	function openEditDialog(person: Person) {
		editingPerson = person;
		formData = {
			firstName: normalizeMultiLangText(person.firstName),
			lastName: normalizeMultiLangText(person.lastName),
			nickname: normalizeMultiLangText(person.nickname),
			birthDate: person.birthDate
				? new Date(person.birthDate).toISOString().split('T')[0]
				: '',
			description: normalizeMultiLangText(person.description),
			tags: personTagNamesForForm(person),
			isActive: person.isActive !== undefined ? person.isActive : true
		};
		dialogs.openEdit();
		crudOps.error.set('');
	}

	function openDeleteDialog(person: Person) {
		personToDelete = person;
		dialogs.openDelete();
		crudOps.error.set('');
	}

	async function handleCreate() {
		const newPerson = await crudOps.create(formData);
		if (newPerson) {
			// Success handled by onCreateSuccess callback
		}
	}

	async function handleEdit() {
		if (!editingPerson) return;
		const currentEditingPerson = editingPerson;
		const updatedPerson = await crudOps.update(currentEditingPerson._id, formData);
		if (updatedPerson) {
			// Success handled by onUpdateSuccess callback
		}
	}

	async function handleDelete() {
		if (!personToDelete) return;
		const currentPersonToDelete = personToDelete;
		const success = await crudOps.remove(currentPersonToDelete._id);
		if (success) {
			// Success handled by onDeleteSuccess callback
		}
	}

	function getPersonDisplayName(person: Person): string {
		const fullName =
			MultiLangUtils.getTextValue(person.fullName, $currentLanguage) ||
			[
				MultiLangUtils.getTextValue(person.firstName, $currentLanguage),
				MultiLangUtils.getTextValue(person.lastName, $currentLanguage)
			]
				.filter(Boolean)
				.join(' ');
		return fullName || $t('admin.unknownPerson');
	}

	function hasFaceDescriptor(person: Person): boolean {
		const d = person.faceRecognition?.descriptor;
		return Array.isArray(d) && d.length > 0;
	}

	function tagChipLabel(tag: string | { _id: string; name: string }): string {
		if (typeof tag === 'string') {
			if (/^[a-f0-9]{24}$/i.test(tag.trim())) return '';
			return tag.trim();
		}
		const n = (tag.name || '').trim();
		if (n) return n;
		return '';
	}

	function personTagNamesForForm(person: Person): string {
		if (!Array.isArray(person.tags)) return '';
		return person.tags
			.map((tag) => {
				if (typeof tag === 'string') return tag.trim();
				const n = (tag.name || '').trim();
				if (n) return n;
				return '';
			})
			.filter(Boolean)
			.join(', ');
	}

	function personPhotoCountLine(person: Person): string {
		const c = person.photoCount ?? 0;
		return translate('admin.personPhotoCount').replace('{count}', String(c));
	}

	function personBornLine(person: Person): string {
		if (!person.birthDate) return '';
		return translate('admin.personBorn').replace('{date}', formatDate(person.birthDate));
	}

	function formatDate(dateString: string): string {
		if (!dateString) return '';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString($currentLanguage === 'he' ? 'he-IL' : 'en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	}

	function personVisibleTagsForChips(person: Person): Array<string | { _id: string; name: string }> {
		if (!Array.isArray(person.tags)) return [];
		return person.tags.filter((tag) => {
			if (typeof tag === 'string') {
				const s = tag.trim();
				return s.length > 0 && !/^[a-f0-9]{24}$/i.test(s);
			}
			return !!tag._id;
		});
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

	function tagDisplayName(tag: Record<string, unknown>): string {
		const n = tag.name;
		if (typeof n === 'string') return n;
		if (n && typeof n === 'object') {
			const o = n as Record<string, string>;
			return (o.en || o.he || '').trim();
		}
		return '';
	}

	async function buildTagIdToNameMap(): Promise<Map<string, string>> {
		const list = await fetchAdminPaginatedList('/api/admin/tags');
		const map = new Map<string, string>();
		for (const raw of list) {
			if (!raw || typeof raw !== 'object') continue;
			const tag = raw as Record<string, unknown>;
			const id = String(tag._id ?? '');
			if (!id) continue;
			const label = tagDisplayName(tag);
			map.set(id, label || id);
		}
		return map;
	}

	async function handlePeopleExport() {
		importExportBusy = true;
		crudOps.error.set('');
		try {
			const [rows, tagMap] = await Promise.all([
				fetchAdminPaginatedList('/api/admin/people'),
				buildTagIdToNameMap()
			]);
			const items = rows.map((raw) => {
				const row = raw as Record<string, unknown>;
				const {
					_id,
					fullName,
					profileImage,
					faceRecognition,
					faceAvatarFromPhoto,
					createdBy,
					createdAt,
					updatedAt,
					tags: tagIds,
					...rest
				} = row;
				void _id;
				void fullName;
				void profileImage;
				void faceRecognition;
				void faceAvatarFromPhoto;
				void createdBy;
				void createdAt;
				void updatedAt;
				const ids = Array.isArray(tagIds) ? tagIds : [];
				const tags = ids
					.map((tid) => {
						if (typeof tid === 'string') {
							return tagMap.get(tid) || tid;
						}
						if (tid && typeof tid === 'object') {
							const o = tid as { _id?: unknown; name?: string };
							const name = (o.name || '').trim();
							if (name) return name;
							const id = String(o._id ?? '');
							return id ? tagMap.get(id) || id : '';
						}
						return String(tid ?? '');
					})
					.filter(Boolean);
				return { ...rest, tags };
			});
			downloadJson(`openshutter-people-${new Date().toISOString().slice(0, 10)}.json`, {
				schema: 'openshutter.admin.people/v1',
				exportedAt: new Date().toISOString(),
				items
			});
		} catch (err) {
			crudOps.error.set(handleError(err, translate('admin.collectionExportFailed')));
		} finally {
			importExportBusy = false;
		}
	}

	async function handlePeopleImport(file: File) {
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
				const tagsRaw = o.tags;
				const tags: string[] = [];
				if (Array.isArray(tagsRaw)) {
					for (const x of tagsRaw) {
						if (typeof x === 'string' && x.trim()) tags.push(x.trim());
						else if (x && typeof x === 'object' && 'name' in (x as object)) {
							const nm = String((x as { name?: string }).name || '').trim();
							if (nm) tags.push(nm);
						}
					}
				}
				const payload = {
					firstName: (o.firstName as Person['firstName']) ?? {},
					lastName: (o.lastName as Person['lastName']) ?? {},
					nickname: (o.nickname as Person['nickname']) ?? {},
					birthDate: typeof o.birthDate === 'string' ? o.birthDate : undefined,
					description: (o.description as Person['description']) ?? {},
					tags,
					isActive: o.isActive !== false
				};
				const fn = payload.firstName && typeof payload.firstName === 'object' ? payload.firstName : {};
				const ln = payload.lastName && typeof payload.lastName === 'object' ? payload.lastName : {};
				const anyFirst = Object.values(fn).some((v) => typeof v === 'string' && v.trim());
				const anyLast = Object.values(ln).some((v) => typeof v === 'string' && v.trim());
				if (!anyFirst || !anyLast) {
					failed++;
					failureLines.push(`#${i + 1}: first/last name required`);
					continue;
				}
				try {
					await adminPostJson('/api/admin/people', payload);
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
	<title>{$t('admin.peopleManagement')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.peopleManagement')}</h1>
				<p class="text-(--color-surface-600-400) mt-2">{$t('admin.managePeopleStructuredData')}</p>
			</div>

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			<!-- Search and Actions -->
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center space-x-4">
					<div class="relative">
						<input
							type="text"
							placeholder="Search people..."
							bind:value={searchTerm}
							on:input={() => loadItems()}
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
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<CollectionImportExportButtons
						exportLabel={$t('admin.collectionExportJson')}
						importLabel={$t('admin.collectionImportJson')}
						busy={importExportBusy}
						onExport={handlePeopleExport}
						onImportFile={handlePeopleImport}
					/>
					<button
						type="button"
						on:click={openCreateDialog}
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
						Add Person
					</button>
				</div>
			</div>

			<!-- People List -->
			{#if $loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-(--color-primary-600)"></div>
					<p class="mt-2 text-(--color-surface-600-400)">Loading people...</p>
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
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-2">No people found</h3>
					<p class="text-(--color-surface-600-400)">Start by adding your first person.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each $items as person}
						{@const tagChips = personVisibleTagsForChips(person)}
						<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-5 flex flex-col h-full min-h-[140px]">
							<div class="flex gap-4 items-start">
								<!-- Face / profile photo -->
								<div class="shrink-0 w-20 h-20 sm:w-24 sm:h-24">
									{#if person.profileImage?.url}
										<img
											src={person.profileImage.url}
											alt={getPersonDisplayName(person)}
											class="h-full w-full rounded-2xl object-cover ring-1 ring-surface-200-800 shadow-sm"
										/>
									{:else if person.faceAvatarFromPhoto?.imageUrl}
										<PersonFaceCrop avatar={person.faceAvatarFromPhoto} alt={getPersonDisplayName(person)} />
									{:else}
										<div
											class="flex h-full w-full items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--color-primary-500)_18%,transparent)] ring-1 ring-surface-200-800"
											aria-hidden="true"
										>
											<svg
												class="h-10 w-10 sm:h-12 sm:w-12 text-(--color-primary-600)"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="1.5"
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
										</div>
									{/if}
								</div>

								<div class="flex-1 min-w-0 flex flex-col gap-1">
									<div class="flex items-start justify-between gap-2">
										<h3 class="font-semibold text-(--color-surface-950-50) text-base leading-snug truncate pe-1">
											{getPersonDisplayName(person)}
										</h3>
										<div class="flex shrink-0 items-center gap-0.5 -mt-0.5 -me-1">
											<button
												type="button"
												on:click={() => openEditDialog(person)}
												class="p-2 text-(--color-surface-600-400) hover:text-(--color-primary-600) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] rounded-md"
												aria-label="Edit person"
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
												on:click={() => openDeleteDialog(person)}
												class="p-2 text-(--color-surface-600-400) hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
												aria-label="Delete person"
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
									{#if person.nickname && MultiLangUtils.getTextValue(person.nickname, $currentLanguage)}
										<p class="text-sm text-(--color-surface-600-400) -mt-0.5 truncate">
											"{MultiLangUtils.getTextValue(person.nickname, $currentLanguage)}"
										</p>
									{/if}
									<p class="text-sm text-(--color-surface-600-400) min-h-5">
										{#if person.birthDate}
											{personBornLine(person)}
										{/if}
									</p>
									<p class="text-sm text-(--color-surface-600-400)">{personPhotoCountLine(person)}</p>
									{#if !hasFaceDescriptor(person)}
										<span
											class="inline-flex self-start items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 mt-0.5"
										>
											{translate('admin.personFaceRecognitionDisabled')}
										</span>
									{/if}
									{#if tagChips.length > 0}
										<div class="flex flex-wrap gap-1 pt-1">
											{#each tagChips as tag}
												{@const label = tagChipLabel(tag)}
												<span
													class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-(--color-surface-100-900) text-(--color-surface-900-100)"
												>
													{label || translate('admin.personUnknownTag')}
												</span>
											{/each}
										</div>
									{/if}
								</div>
							</div>

							{#if person.description && MultiLangUtils.getTextValue(person.description, $currentLanguage)}
								<p class="text-sm text-(--color-surface-600-400) mt-3 pt-3 border-t border-surface-200-800 line-clamp-3">
									{MultiLangUtils.getTextValue(person.description, $currentLanguage)}
								</p>
							{/if}
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
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">Add New Person</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							First Name *
						</span>
						<MultiLangInput
							value={formData.firstName}
							onChange={(value) => (formData.firstName = value)}
							placeholder="John"
							required={true}
							defaultLanguage={defaultLang}
						/>
					</div>
					<div>
						<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Last Name *
						</span>
						<MultiLangInput
							value={formData.lastName}
							onChange={(value) => (formData.lastName = value)}
							placeholder="Doe"
							required={true}
							defaultLanguage={defaultLang}
						/>
					</div>
				</div>

				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Nickname
					</span>
					<MultiLangInput
						value={formData.nickname}
						onChange={(value) => (formData.nickname = value)}
						placeholder="Johnny"
						defaultLanguage={defaultLang}
					/>
				</div>

				<div>
					<label for="birth-date-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Birth Date
					</label>
					<input
						type="date"
						id="birth-date-create"
						bind:value={formData.birthDate}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
				</div>

				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Description
					</span>
					<MultiLangInput
						value={formData.description}
						onChange={(value) => (formData.description = value)}
						placeholder="Brief description..."
						multiline={true}
						rows={3}
						defaultLanguage={defaultLang}
					/>
				</div>

				<div>
					<label for="tags-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Tags (comma-separated)
					</label>
					<input
						type="text"
						id="tags-create"
						bind:value={formData.tags}
						placeholder="family, friend, colleague"
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							resetForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={saving}
						class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
					>
						{#if saving}
							Creating...
						{:else}
							Create Person
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Dialog -->
{#if showEditDialog && editingPerson}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">Edit Person</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							First Name *
						</span>
						<MultiLangInput
							value={formData.firstName}
							onChange={(value) => (formData.firstName = value)}
							placeholder="John"
							required={true}
							defaultLanguage={defaultLang}
						/>
					</div>
					<div>
						<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Last Name *
						</span>
						<MultiLangInput
							value={formData.lastName}
							onChange={(value) => (formData.lastName = value)}
							placeholder="Doe"
							required={true}
							defaultLanguage={defaultLang}
						/>
					</div>
				</div>

				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Nickname
					</span>
					<MultiLangInput
						value={formData.nickname}
						onChange={(value) => (formData.nickname = value)}
						placeholder="Johnny"
						defaultLanguage={defaultLang}
					/>
				</div>

				<div>
					<label for="birth-date-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Birth Date
					</label>
					<input
						type="date"
						id="birth-date-create"
						bind:value={formData.birthDate}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
				</div>

				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Description
					</span>
					<MultiLangInput
						value={formData.description}
						onChange={(value) => (formData.description = value)}
						placeholder="Brief description..."
						multiline={true}
						rows={3}
						defaultLanguage={defaultLang}
					/>
				</div>

				<div>
					<label for="tags-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Tags (comma-separated)
					</label>
					<input
						type="text"
						id="tags-create"
						bind:value={formData.tags}
						placeholder="family, friend, colleague"
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							editingPerson = null;
							resetForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving}
						class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
					>
						{#if saving}
							Updating...
						{:else}
							Update Person
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && personToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">Delete Person</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-(--color-surface-600-400)">
					Are you sure you want to delete <strong>{getPersonDisplayName(personToDelete)}</strong>?
					This action cannot be undone.
				</p>
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							personToDelete = null;
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleDelete}
						disabled={saving}
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Deleting...
						{:else}
							Delete Person
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
