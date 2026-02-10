<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';
	import { useCrudLoader } from '$lib/composables/useCrudLoader';
	import { useCrudOperations } from '$lib/composables/useCrudOperations';
	import { useDialogManager } from '$lib/composables/useDialogManager';
	import { normalizeMultiLangText } from '$lib/utils/multiLangHelpers';
	import type { PageData } from './$types';

	// svelte-ignore export_let_unused - Required by SvelteKit page component
	export let data: PageData;

	interface Person {
		_id: string;
		firstName: MultiLangText;
		lastName: MultiLangText;
		fullName: MultiLangText;
		nickname?: MultiLangText;
		birthDate?: string;
		description?: MultiLangText;
		tags?: string[] | Array<{ _id: string; name: string }>;
		isActive?: boolean;
		profileImage?: {
			url: string;
			storageProvider: string;
			fileId: string;
		};
		faceRecognition?: {
			descriptor?: number[];
			extractedAt?: string;
			modelVersion?: string;
		};
	}

	// Use CRUD composables
	const crudLoader = useCrudLoader<Person>('/api/admin/people', {
		searchParam: 'search',
		searchValue: () => searchTerm
	});
	const crudOps = useCrudOperations<Person>('/api/admin/people', {
		createSuccessMessage: 'Person created successfully!',
		updateSuccessMessage: 'Person updated successfully!',
		deleteSuccessMessage: 'Person deleted successfully!',
		transformPayload: (data: any) => {
			const tagsArray = data.tags
				? (typeof data.tags === 'string'
					? data.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
					: data.tags)
				: [];
			return {
				firstName: MultiLangUtils.clean(data.firstName),
				lastName: MultiLangUtils.clean(data.lastName),
				nickname: MultiLangUtils.clean(data.nickname),
				birthDate: data.birthDate || undefined,
				description: MultiLangUtils.clean(data.description),
				tags: tagsArray,
				isActive: data.isActive
			};
		},
		onCreateSuccess: (newPerson) => {
			crudLoader.items.update(items => [...items, newPerson]);
			dialogs.closeAll();
			resetForm();
		},
		onUpdateSuccess: (updatedPerson) => {
			const currentEditingPerson = editingPerson;
			if (currentEditingPerson) {
				crudLoader.items.update(items => 
					items.map(p => p._id === currentEditingPerson._id ? updatedPerson : p)
				);
			}
			dialogs.closeAll();
			editingPerson = null;
			resetForm();
		},
		onDeleteSuccess: () => {
			const currentPersonToDelete = personToDelete;
			if (currentPersonToDelete) {
				crudLoader.items.update(items => 
					items.filter(p => p._id !== currentPersonToDelete._id)
				);
			}
			dialogs.closeAll();
			personToDelete = null;
		}
	});
	const dialogs = useDialogManager();

	// Reactive stores from composables
	let people: Person[] = [];
	let loading = false;
	let saving = false;
	let message = '';
	let error = '';
	let searchTerm = '';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let editingPerson: Person | null = null;
	let personToDelete: Person | null = null;

	// Subscribe to stores
	crudLoader.items.subscribe(value => people = value);
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
		await crudLoader.loadItems();
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
			tags: Array.isArray(person.tags)
				? person.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name)).join(', ')
				: '',
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
		return MultiLangUtils.getTextValue(person.fullName, $currentLanguage) ||
			MultiLangUtils.getTextValue(person.firstName, $currentLanguage) + ' ' +
			MultiLangUtils.getTextValue(person.lastName, $currentLanguage) ||
			'Unknown Person';
	}

	function formatDate(dateString: string): string {
		if (!dateString) return '';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
		} catch {
			return dateString;
		}
	}
</script>

<svelte:head>
	<title>People Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">People Management</h1>
					<p class="text-gray-600 mt-2">Manage people who appear in your photos</p>
				</div>
				<a
					href="/admin"
					class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
				>
					← Back to Admin
				</a>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}

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
							on:input={() => crudLoader.loadItems()}
							class="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
						/>
						<svg
							class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
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

				<button
					type="button"
					on:click={openCreateDialog}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
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

			<!-- People List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading people...</p>
				</div>
			{:else if people.length === 0}
				<div class="text-center py-8">
					<svg
						class="h-12 w-12 text-gray-400 mx-auto mb-4"
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
					<h3 class="text-lg font-semibold text-gray-900 mb-2">No people found</h3>
					<p class="text-gray-600">Start by adding your first person.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each people as person}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<div class="flex items-start justify-between mb-4">
								<div class="flex items-center space-x-3">
									{#if person.profileImage?.url}
										<img
											src={person.profileImage.url}
											alt={getPersonDisplayName(person)}
											class="w-10 h-10 rounded-full object-cover"
										/>
									{:else}
										<div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
											<svg
												class="h-5 w-5 text-blue-600"
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
										</div>
									{/if}
									<div>
										<h3 class="font-semibold text-gray-900">
											{getPersonDisplayName(person)}
										</h3>
										{#if person.nickname && MultiLangUtils.getTextValue(person.nickname, $currentLanguage)}
											<p class="text-sm text-gray-600">
												"{MultiLangUtils.getTextValue(person.nickname, $currentLanguage)}"
											</p>
										{/if}
									</div>
								</div>

								<div class="flex space-x-1">
									<button
										type="button"
										on:click={() => openEditDialog(person)}
										class="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
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
										class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
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

							{#if person.description && MultiLangUtils.getTextValue(person.description, $currentLanguage)}
								<p class="text-sm text-gray-600 mb-3">
									{MultiLangUtils.getTextValue(person.description, $currentLanguage)}
								</p>
							{/if}

							{#if person.birthDate}
								<p class="text-sm text-gray-500 mb-3">Born: {formatDate(person.birthDate)}</p>
							{/if}

							{#if person.tags && person.tags.length > 0}
								<div class="flex flex-wrap gap-1">
									{#each person.tags as tag}
										<span
											class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
										>
											{typeof tag === 'string' ? tag : tag.name}
										</span>
									{/each}
								</div>
							{/if}

							{#if person.faceRecognition?.descriptor}
								<div class="mt-3 pt-3 border-t border-gray-200">
									<span
										class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
									>
										Face Recognition Enabled
									</span>
								</div>
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
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Add New Person</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<span class="block text-sm font-medium text-gray-700 mb-2">
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
						<span class="block text-sm font-medium text-gray-700 mb-2">
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
					<span class="block text-sm font-medium text-gray-700 mb-2">
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
					<label for="birth-date-create" class="block text-sm font-medium text-gray-700 mb-2">
						Birth Date
					</label>
					<input
						type="date"
						id="birth-date-create"
						bind:value={formData.birthDate}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
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
					<label for="tags-create" class="block text-sm font-medium text-gray-700 mb-2">
						Tags (comma-separated)
					</label>
					<input
						type="text"
						id="tags-create"
						bind:value={formData.tags}
						placeholder="family, friend, colleague"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							resetForm();
						}}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={saving}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
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
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit Person</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<span class="block text-sm font-medium text-gray-700 mb-2">
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
						<span class="block text-sm font-medium text-gray-700 mb-2">
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
					<span class="block text-sm font-medium text-gray-700 mb-2">
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
					<label for="birth-date-create" class="block text-sm font-medium text-gray-700 mb-2">
						Birth Date
					</label>
					<input
						type="date"
						id="birth-date-create"
						bind:value={formData.birthDate}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
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
					<label for="tags-create" class="block text-sm font-medium text-gray-700 mb-2">
						Tags (comma-separated)
					</label>
					<input
						type="text"
						id="tags-create"
						bind:value={formData.tags}
						placeholder="family, friend, colleague"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
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
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Delete Person</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-gray-600">
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
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
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
