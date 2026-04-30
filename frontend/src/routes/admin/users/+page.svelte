<script lang="ts">
	import { onMount } from 'svelte';
	import { useCrudLoader } from '$lib/composables/useCrudLoader';
	import { useCrudOperations } from '$lib/composables/useCrudOperations';
	import { useDialogManager } from '$lib/composables/useDialogManager';
	import { normalizeMultiLangText } from '$lib/utils/multiLangHelpers';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
	import { ROLE_OPTIONS } from '$lib/constants/roles';
	import { t } from '$stores/i18n';
	import { get } from 'svelte/store';
	import type { PageData } from './$types';
	import type { User, Group, OwnerDomain, UserFormData } from './types';
	import UserFilters from './components/UserFilters.svelte';
	import UserTable from './components/UserTable.svelte';
	import UserForm from './components/UserForm.svelte';
	import OwnerDomainsSection from './components/OwnerDomainsSection.svelte';

	// svelte-ignore export_let_unused - Required by SvelteKit page component
	export let data: PageData;

	const ROLES = ROLE_OPTIONS;

	const STORAGE_PROVIDERS = [
		{ id: 'local', name: 'Local Storage' },
		{ id: 'google-drive', name: 'Google Drive' },
		{ id: 'aws-s3', name: 'AWS S3' },
		{ id: 'backblaze', name: 'Backblaze' },
		{ id: 'wasabi', name: 'Wasabi' }
	];

	// Use CRUD composables for users
	const crudLoader = useCrudLoader<User>('/api/admin/users', {
		searchParam: 'search',
		searchValue: () => searchTerm,
		filterParams: {
			role: () => roleFilter,
			blocked: () => blockedFilter
		}
	});
	/** Payload sent to create/update user API (User fields + optional password). */
	type UserPayload = Partial<Omit<User, '_id' | 'createdAt' | 'updatedAt'>> & { password?: string };

	const crudOps = useCrudOperations<User>('/api/admin/users', {
		createSuccessMessage: get(t)('admin.userCreatedSuccessfully'),
		updateSuccessMessage: get(t)('admin.userUpdatedSuccessfully'),
		deleteSuccessMessage: get(t)('admin.userDeletedSuccessfully'),
		transformPayload: (data: UserPayload & Record<string, unknown>): UserPayload => {
			const payload = { ...data } as UserPayload & Record<string, unknown>;
			// Only include password if it's been set (for updates: omit when empty so backend keeps current)
			const p = payload.password;
			if (p == null || (typeof p === 'string' && p.trim() === '')) {
				delete payload.password;
			}
			delete payload.storageUseAdminConfig;
			if (payload.role !== 'owner') {
				delete payload.useDedicatedStorage;
			}
			return payload as UserPayload;
		},
		onCreateSuccess: (newUser) => {
			crudLoader.items.update((items) => [...items, newUser]);
			if (newUser.role === 'owner') {
				crudOps.message.set(get(t)('admin.ownerCreatedNextSteps'));
				openEditDialog(newUser);
			} else {
				dialogs.closeAll();
				resetForm();
			}
		},
		onUpdateSuccess: (updatedUser) => {
			const currentEditingUser = editingUser;
			if (currentEditingUser) {
				crudLoader.items.update(items => 
					items.map(u => u._id === currentEditingUser._id ? updatedUser : u)
				);
			}
			dialogs.closeAll();
			editingUser = null;
			resetForm();
		},
		onDeleteSuccess: () => {
			const currentUserToDelete = userToDelete;
			if (currentUserToDelete) {
				crudLoader.items.update(items => 
					items.filter(u => u._id !== currentUserToDelete._id)
				);
			}
			dialogs.closeAll();
			userToDelete = null;
		}
	});
	const dialogs = useDialogManager();

	// Reactive stores from composables
	let users: User[] = [];
	let groups: Group[] = [];
	let loading = false;
	let loadingGroups = false;
	let loadingOwnerDomains = false;
	let saving = false;
	let message = '';
	let error = '';
	let searchTerm = '';
	let roleFilter = 'all';
	let blockedFilter = 'all';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let editingUser: User | null = null;
	let userToDelete: User | null = null;

	let ownerDomains: OwnerDomain[] = [];
	let ownerDomainsError = '';
	let newOwnerDomainHostname = '';

	// Subscribe to stores
	crudLoader.items.subscribe(value => users = value);
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
	let formData: UserFormData = {
		name: { en: '', he: '' },
		username: '',
		password: '',
		role: 'guest',
		preferredLanguage: 'en',
		groupAliases: [],
		blocked: false,
		forcePasswordChange: true,
		allowedStorageProviders: ['local'],
		useDedicatedStorage: false,
		storageUseAdminConfig: true
	};

	let showPassword = false;

	onMount(async () => {
		await Promise.all([crudLoader.loadItems(), loadGroups()]);
	});

	async function loadGroups() {
		loadingGroups = true;
		try {
			const response = await fetch('/api/admin/groups');
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			groups = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
		} catch (err) {
			logger.error('Error loading groups:', err);
		} finally {
			loadingGroups = false;
		}
	}

	function resetForm() {
		formData = {
			name: { en: '', he: '' },
			username: '',
			password: '',
			role: 'guest',
			preferredLanguage: 'en',
			groupAliases: [],
			blocked: false,
			forcePasswordChange: true,
			allowedStorageProviders: ['local'],
			useDedicatedStorage: false,
			storageUseAdminConfig: true
		};
		showPassword = false;
		ownerDomains = [];
		ownerDomainsError = '';
		newOwnerDomainHostname = '';
	}

	function openCreateDialog() {
		resetForm();
		dialogs.openCreate();
		crudOps.error.set('');
	}

	function openEditDialog(user: User) {
		editingUser = user;
		const prefLang = user.preferredLanguage && SUPPORTED_LANGUAGES.some((l) => l.code === user.preferredLanguage)
			? user.preferredLanguage
			: 'en';
		const storage = user.storageConfig ?? {};
		formData = {
			name: normalizeMultiLangText(user.name),
			username: user.username || '',
			password: '', // Don't populate password
			role: user.role || 'guest',
			preferredLanguage: prefLang,
			groupAliases: user.groupAliases || [],
			blocked: user.blocked || false,
			forcePasswordChange: user.forcePasswordChange ?? false,
			allowedStorageProviders: user.allowedStorageProviders || ['local'],
			useDedicatedStorage: user.useDedicatedStorage === true,
			storageUseAdminConfig: storage.useAdminConfig !== false
		};
		showPassword = false;
		ownerDomains = [];
		ownerDomainsError = '';
		newOwnerDomainHostname = '';

		if (user.role === 'owner') {
			loadOwnerDomains(user._id).catch((err) => {
				logger.error('Failed to load owner domains', err);
			});
		}
		dialogs.openEdit();
		crudOps.error.set('');
	}

	async function loadOwnerDomains(ownerId: string) {
		loadingOwnerDomains = true;
		ownerDomainsError = '';
		try {
			const response = await fetch(`/api/admin/owner-domains?ownerId=${encodeURIComponent(ownerId)}`);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			const data = result.data ?? result;
			ownerDomains = Array.isArray(data) ? data : Array.isArray(result.data) ? result.data : [];
		} catch (err) {
			logger.error('Error loading owner domains:', err);
			ownerDomainsError = handleError(err, get(t)('admin.failedToLoadOwnerDomains'));
		} finally {
			loadingOwnerDomains = false;
		}
	}

	async function addOwnerDomain() {
		if (!editingUser || !newOwnerDomainHostname.trim()) return;
		try {
			const response = await fetch('/api/admin/owner-domains', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					hostname: newOwnerDomainHostname.trim(),
					ownerId: editingUser._id,
					active: true,
					isPrimary: ownerDomains.length === 0,
				}),
			});
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			const domain = result.data ?? result;
			ownerDomains = [...ownerDomains, domain];
			newOwnerDomainHostname = '';
		} catch (err) {
			logger.error('Error adding owner domain:', err);
			ownerDomainsError = handleError(err, get(t)('admin.failedToAddOwnerDomain'));
		}
	}

	async function updateOwnerDomain(domain: OwnerDomain, changes: Partial<OwnerDomain>) {
		try {
			const response = await fetch(`/api/admin/owner-domains/${encodeURIComponent(domain.id)}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					hostname: changes.hostname ?? domain.hostname,
					active: changes.active ?? domain.active,
					isPrimary: changes.isPrimary ?? domain.isPrimary,
				}),
			});
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			const updated = result.data ?? result;
			ownerDomains = ownerDomains.map((d) => (d.id === domain.id ? updated : d));
		} catch (err) {
			logger.error('Error updating owner domain:', err);
			ownerDomainsError = handleError(err, get(t)('admin.failedToUpdateOwnerDomain'));
		}
	}

	async function deleteOwnerDomain(domain: OwnerDomain) {
		if (!confirm(get(t)('admin.confirmRemoveOwnerDomain').replace('{hostname}', domain.hostname))) return;
		try {
			const response = await fetch(`/api/admin/owner-domains/${encodeURIComponent(domain.id)}`, {
				method: 'DELETE',
			});
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			ownerDomains = ownerDomains.filter((d) => d.id !== domain.id);
		} catch (err) {
			logger.error('Error deleting owner domain:', err);
			ownerDomainsError = handleError(err, get(t)('admin.failedToDeleteOwnerDomain'));
		}
	}

	function openDeleteDialog(user: User) {
		userToDelete = user;
		dialogs.openDelete();
		crudOps.error.set('');
	}

	function getUserName(user: User): string {
		const nameField = typeof user.name === 'string' ? user.name : user.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || user.username || get(t)('admin.noNameFallback');
	}

	function toggleGroup(groupAlias: string) {
		if (formData.groupAliases.includes(groupAlias)) {
			formData.groupAliases = formData.groupAliases.filter((g) => g !== groupAlias);
		} else {
			formData.groupAliases = [...formData.groupAliases, groupAlias];
		}
	}

	function toggleStorageProvider(providerId: string) {
		if (formData.allowedStorageProviders.includes(providerId)) {
			formData.allowedStorageProviders = formData.allowedStorageProviders.filter((p) => p !== providerId);
		} else {
			formData.allowedStorageProviders = [...formData.allowedStorageProviders, providerId];
		}
		// Ensure at least one provider is selected
		if (formData.allowedStorageProviders.length === 0) {
			formData.allowedStorageProviders = ['local'];
		}
	}

	async function handleCreate() {
		const newUser = await crudOps.create(formData as unknown as Partial<User> & Record<string, unknown>);
		if (newUser) {
			// Success handled by onCreateSuccess callback
		}
	}

	async function handleEdit() {
		if (!editingUser) return;
		const currentEditingUser = editingUser;
		const payload = {
			...formData,
			storageConfig: {
				useAdminConfig: formData.storageUseAdminConfig,
				googleDrive:
					formData.useDedicatedStorage || formData.storageUseAdminConfig
						? undefined
						: (currentEditingUser.storageConfig?.googleDrive ?? undefined),
			},
		};
		const updatedUser = await crudOps.update(currentEditingUser._id, payload);
		if (updatedUser) {
			// Success handled by onUpdateSuccess callback
		}
	}

	async function handleDelete() {
		if (!userToDelete) return;
		const currentUserToDelete = userToDelete;
		const success = await crudOps.remove(currentUserToDelete._id);
		if (success) {
			// Success handled by onDeleteSuccess callback
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.usersManagement')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.usersManagement')}</h1>
				<p class="text-(--color-surface-600-400) mt-2">{$t('admin.manageUsersRoles')}</p>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			<!-- Search and Filters -->
			<UserFilters
				bind:searchTerm
				bind:roleFilter
				bind:blockedFilter
				roles={ROLES}
				onFilterChange={() => crudLoader.loadItems()}
				onAddUser={openCreateDialog}
			/>

			<!-- Users List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-(--color-primary-600)"></div>
					<p class="mt-2 text-(--color-surface-600-400)">{$t('admin.loadingUsers')}</p>
				</div>
			{:else if users.length === 0}
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
							d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.noUsersFound')}</h3>
					<p class="text-(--color-surface-600-400)">{$t('admin.startByAddingFirstUser')}</p>
				</div>
			{:else}
				<UserTable
					users={users}
					groups={groups}
					onEdit={openEditDialog}
					onDelete={openDeleteDialog}
				/>
			{/if}
		</div>
	</div>
</div>

<!-- Create Dialog -->
{#if showCreateDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">{$t('admin.addNewUser')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<UserForm
					bind:formData
					bind:showPassword
					mode="create"
					groups={groups}
					loadingGroups={loadingGroups}
					roles={ROLES}
					supportedLanguages={SUPPORTED_LANGUAGES}
					storageProviders={STORAGE_PROVIDERS}
					onToggleGroup={toggleGroup}
					onToggleStorageProvider={toggleStorageProvider}
				/>
				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							resetForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						{$t('admin.cancel')}
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={saving || !formData.username.trim()}
						class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							{$t('admin.creatingUser')}
						{:else}
							{$t('admin.createUser')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Dialog -->
{#if showEditDialog && editingUser}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">{$t('admin.editUser')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<UserForm
					bind:formData
					bind:showPassword
					mode="edit"
					groups={groups}
					loadingGroups={loadingGroups}
					roles={ROLES}
					supportedLanguages={SUPPORTED_LANGUAGES}
					storageProviders={STORAGE_PROVIDERS}
					onToggleGroup={toggleGroup}
					onToggleStorageProvider={toggleStorageProvider}
					onRoleChange={() => {
						if (formData.role === 'owner' && editingUser) {
							loadOwnerDomains(editingUser._id).catch((err) => logger.error('Failed to load owner domains', err));
						} else {
							ownerDomains = [];
						}
					}}
				>
					<OwnerDomainsSection
						slot="extra"
						role={formData.role}
						ownerDomains={ownerDomains}
						loadingOwnerDomains={loadingOwnerDomains}
						ownerDomainsError={ownerDomainsError}
						bind:newOwnerDomainHostname
						onAddDomain={addOwnerDomain}
						onUpdateDomain={updateOwnerDomain}
						onDeleteDomain={deleteOwnerDomain}
					/>
				</UserForm>
				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							editingUser = null;
							resetForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						{$t('admin.cancel')}
					</button>
					<button
						type="button"
						data-testid="admin-users-save-edit"
						on:click={handleEdit}
						disabled={saving}
						class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							{$t('admin.updatingUser')}
						{:else}
							{$t('admin.updateUser')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && userToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">{$t('admin.deleteUser')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-(--color-surface-600-400)">
					{$t('admin.confirmDeleteUser')
						.replace('{name}', getUserName(userToDelete))
						.replace('{username}', userToDelete.username)}
				</p>
				{#if userToDelete.role === 'admin' && !userToDelete.blocked}
					<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
						<p class="text-sm text-yellow-800">
							{$t('admin.activeAdminDeleteWarning')}
						</p>
					</div>
				{/if}
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							userToDelete = null;
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						{$t('admin.cancel')}
					</button>
					<button
						type="button"
						on:click={handleDelete}
						disabled={saving}
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							{$t('admin.deletingUser')}
						{:else}
							{$t('admin.deleteUser')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
