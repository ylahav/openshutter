<script lang="ts">
	import { onMount } from 'svelte';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface Group {
		_id: string;
		alias: string;
		name: MultiLangText | string;
	}

	interface User {
		_id: string;
		name: MultiLangText | string;
		username: string;
		role: 'admin' | 'owner' | 'guest';
		groupAliases?: string[];
		blocked?: boolean;
		allowedStorageProviders?: string[];
		createdAt?: string;
		updatedAt?: string;
	}

	const ROLES = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'owner', label: 'Owner' },
		{ value: 'guest', label: 'Guest' }
	];

	const STORAGE_PROVIDERS = [
		{ id: 'local', name: 'Local Storage' },
		{ id: 'google-drive', name: 'Google Drive' },
		{ id: 'aws-s3', name: 'AWS S3' },
		{ id: 'backblaze', name: 'Backblaze' },
		{ id: 'wasabi', name: 'Wasabi' }
	];

	let users: User[] = [];
	let groups: Group[] = [];
	let loading = true;
	let loadingGroups = false;
	let saving = false;
	let deleting = false;
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

	// Form state
	let formData = {
		name: { en: '', he: '' } as MultiLangText,
		username: '',
		password: '',
		role: 'guest' as 'admin' | 'owner' | 'guest',
		groupAliases: [] as string[],
		blocked: false,
		allowedStorageProviders: ['local'] as string[]
	};

	let showPassword = false;

	onMount(async () => {
		await Promise.all([loadUsers(), loadGroups()]);
	});

	async function loadUsers() {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams();
			if (searchTerm) params.append('search', searchTerm);
			if (roleFilter !== 'all') params.append('role', roleFilter);
			if (blockedFilter !== 'all') params.append('blocked', blockedFilter);

			const response = await fetch(`/api/admin/users?${params.toString()}`);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			users = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
		} catch (err) {
			logger.error('Error loading users:', err);
			error = handleError(err, 'Failed to load users');
		} finally {
			loading = false;
		}
	}

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
			groupAliases: [],
			blocked: false,
			allowedStorageProviders: ['local']
		};
		showPassword = false;
	}

	function openCreateDialog() {
		resetForm();
		showCreateDialog = true;
		error = '';
	}

	function openEditDialog(user: User) {
		editingUser = user;
		const nameField = typeof user.name === 'string' ? { en: user.name, he: '' } : user.name || { en: '', he: '' };
		formData = {
			name: nameField,
			username: user.username || '',
			password: '', // Don't populate password
			role: user.role || 'guest',
			groupAliases: user.groupAliases || [],
			blocked: user.blocked || false,
			allowedStorageProviders: user.allowedStorageProviders || ['local']
		};
		showPassword = false;
		showEditDialog = true;
		error = '';
	}

	function openDeleteDialog(user: User) {
		userToDelete = user;
		showDeleteDialog = true;
	}

	function getUserName(user: User): string {
		const nameField = typeof user.name === 'string' ? user.name : user.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || user.username || '(No name)';
	}

	function getGroupName(group: Group): string {
		const nameField = typeof group.name === 'string' ? group.name : group.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || group.alias;
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
		saving = true;
		error = '';
		message = '';

		try {
			logger.debug('Creating user with data:', { ...formData, password: '***' });
			const response = await fetch('/api/admin/users', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const responseData = await response.json();
			logger.debug('Response status:', response.status, 'Response data:', responseData);

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const newUser = responseData.data || responseData;
			users = [...users, newUser];
			message = 'User created successfully!';
			showCreateDialog = false;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			logger.error('Error creating user:', err);
			error = handleError(err, 'Failed to create user');
		} finally {
			saving = false;
		}
	}

	async function handleEdit() {
		if (!editingUser) return;

		saving = true;
		error = '';
		message = '';

		try {
			logger.debug('Updating user:', editingUser._id, 'with data:', { ...formData, password: formData.password ? '***' : '(unchanged)' });
			const payload: any = { ...formData };
			// Only include password if it's been set
			if (!payload.password || payload.password.trim() === '') {
				delete payload.password;
			}

			const response = await fetch(`/api/admin/users/${editingUser._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const responseData = await response.json();
			logger.debug('Response status:', response.status, 'Response data:', responseData);

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const updatedUser = responseData.data || responseData;
			users = users.map((u) => (u._id === editingUser._id ? updatedUser : u));
			message = 'User updated successfully!';
			showEditDialog = false;
			editingUser = null;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			logger.error('Error updating user:', err);
			error = handleError(err, 'Failed to update user');
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!userToDelete) return;

		deleting = true;
		error = '';
		message = '';

		try {
			const response = await fetch(`/api/admin/users/${userToDelete._id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			users = users.filter((u) => u._id !== userToDelete._id);
			message = 'User deleted successfully!';
			showDeleteDialog = false;
			userToDelete = null;

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			logger.error('Error deleting user:', err);
			error = handleError(err, 'Failed to delete user');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Users Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Users Management</h1>
					<p class="text-gray-600 mt-2">Manage user accounts, roles, and permissions</p>
				</div>
				<a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
					← Back to Admin
				</a>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			<!-- Search and Filters -->
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center space-x-4">
					<div class="relative">
						<input
							type="text"
							placeholder="Search users..."
							bind:value={searchTerm}
							on:input={() => loadUsers()}
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

					<select
						bind:value={roleFilter}
						on:change={() => loadUsers()}
						class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">All Roles</option>
						{#each ROLES as role}
							<option value={role.value}>{role.label}</option>
						{/each}
					</select>

					<select
						bind:value={blockedFilter}
						on:change={() => loadUsers()}
						class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">All Status</option>
						<option value="false">Active</option>
						<option value="true">Blocked</option>
					</select>
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
					Add User
				</button>
			</div>

			<!-- Users List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading users...</p>
				</div>
			{:else if users.length === 0}
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
							d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
					<p class="text-gray-600">Start by adding your first user.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									User
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Role
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Groups
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each users as user}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div>
											<div class="text-sm font-medium text-gray-900">{getUserName(user)}</div>
											<div class="text-sm text-gray-500">{user.username}</div>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class="px-2 py-1 text-xs font-medium rounded {user.role === 'admin'
												? 'bg-purple-100 text-purple-800'
												: user.role === 'owner'
													? 'bg-blue-100 text-blue-800'
													: 'bg-gray-100 text-gray-800'}"
										>
											{user.role}
										</span>
									</td>
									<td class="px-6 py-4">
										<div class="flex flex-wrap gap-1">
											{#if user.groupAliases && user.groupAliases.length > 0}
												{#each user.groupAliases as alias}
													{@const group = groups.find((g) => g.alias === alias)}
													<span class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
														{group ? getGroupName(group) : alias}
													</span>
												{/each}
											{:else}
												<span class="text-xs text-gray-400">None</span>
											{/if}
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										{#if user.blocked}
											<span class="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
												Blocked
											</span>
										{:else}
											<span class="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
												Active
											</span>
										{/if}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<button
											type="button"
											on:click={() => openEditDialog(user)}
											class="text-blue-600 hover:text-blue-900 mr-4"
										>
											Edit
										</button>
										<button
											type="button"
											on:click={() => openDeleteDialog(user)}
											class="text-red-600 hover:text-red-900"
										>
											Delete
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create Dialog -->
{#if showCreateDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Add New User</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Name *
					</label>
					<MultiLangInput bind:value={formData.name} />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Username *
					</label>
					<input
						type="text"
						bind:value={formData.username}
						placeholder="username@example.com"
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Password *
					</label>
					<div class="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							bind:value={formData.password}
							placeholder="At least 6 characters"
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<button
							type="button"
							on:click={() => (showPassword = !showPassword)}
							class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							{#if showPassword}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
									/>
								</svg>
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Role *
					</label>
					<select
						bind:value={formData.role}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						{#each ROLES as role}
							<option value={role.value}>{role.label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Groups
					</label>
					<div class="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
						{#if loadingGroups}
							<p class="text-sm text-gray-500">Loading groups...</p>
						{:else if groups.length === 0}
							<p class="text-sm text-gray-500">No groups available</p>
						{:else}
							<div class="space-y-2">
								{#each groups as group}
									<label class="flex items-center">
										<input
											type="checkbox"
											checked={formData.groupAliases.includes(group.alias)}
											on:change={() => toggleGroup(group.alias)}
											class="mr-2"
										/>
										<span class="text-sm text-gray-700">{getGroupName(group)}</span>
										<span class="ml-2 text-xs text-gray-500">({group.alias})</span>
									</label>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Allowed Storage Providers
					</label>
					<div class="border border-gray-300 rounded-md p-3">
						<div class="space-y-2">
							{#each STORAGE_PROVIDERS as provider}
								<label class="flex items-center">
									<input
										type="checkbox"
										checked={formData.allowedStorageProviders.includes(provider.id)}
										on:change={() => toggleStorageProvider(provider.id)}
										class="mr-2"
									/>
									<span class="text-sm text-gray-700">{provider.name}</span>
								</label>
							{/each}
						</div>
					</div>
				</div>

				<div class="flex items-center">
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.blocked}
							class="sr-only peer"
						/>
						<div
							class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"
						></div>
						<span class="ml-3 text-sm font-medium text-gray-700">
							Blocked
						</span>
					</label>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showCreateDialog = false;
							resetForm();
						}}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={saving || !formData.username.trim() || !formData.password.trim()}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Creating...
						{:else}
							Create User
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
		<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit User</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Name *
					</label>
					<MultiLangInput bind:value={formData.name} />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Username
					</label>
					<input
						type="text"
						value={formData.username}
						disabled
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600"
					/>
					<p class="mt-1 text-xs text-gray-500">Username cannot be changed</p>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						New Password (leave blank to keep current)
					</label>
					<div class="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							bind:value={formData.password}
							placeholder="Leave blank to keep current password"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<button
							type="button"
							on:click={() => (showPassword = !showPassword)}
							class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							{#if showPassword}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
									/>
								</svg>
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Role *
					</label>
					<select
						bind:value={formData.role}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						{#each ROLES as role}
							<option value={role.value}>{role.label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Groups
					</label>
					<div class="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
						{#if loadingGroups}
							<p class="text-sm text-gray-500">Loading groups...</p>
						{:else if groups.length === 0}
							<p class="text-sm text-gray-500">No groups available</p>
						{:else}
							<div class="space-y-2">
								{#each groups as group}
									<label class="flex items-center">
										<input
											type="checkbox"
											checked={formData.groupAliases.includes(group.alias)}
											on:change={() => toggleGroup(group.alias)}
											class="mr-2"
										/>
										<span class="text-sm text-gray-700">{getGroupName(group)}</span>
										<span class="ml-2 text-xs text-gray-500">({group.alias})</span>
									</label>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Allowed Storage Providers
					</label>
					<div class="border border-gray-300 rounded-md p-3">
						<div class="space-y-2">
							{#each STORAGE_PROVIDERS as provider}
								<label class="flex items-center">
									<input
										type="checkbox"
										checked={formData.allowedStorageProviders.includes(provider.id)}
										on:change={() => toggleStorageProvider(provider.id)}
										class="mr-2"
									/>
									<span class="text-sm text-gray-700">{provider.name}</span>
								</label>
							{/each}
						</div>
					</div>
				</div>

				<div class="flex items-center">
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.blocked}
							class="sr-only peer"
						/>
						<div
							class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"
						></div>
						<span class="ml-3 text-sm font-medium text-gray-700">
							Blocked
						</span>
					</label>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showEditDialog = false;
							editingUser = null;
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
							Update User
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
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Delete User</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-gray-600">
					Are you sure you want to delete <strong>{getUserName(userToDelete)}</strong> ({userToDelete.username})? This
					action cannot be undone.
				</p>
				{#if userToDelete.role === 'admin' && !userToDelete.blocked}
					<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
						<p class="text-sm text-yellow-800">
							⚠️ This is an active admin user. Make sure there are other active admins before deleting.
						</p>
					</div>
				{/if}
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							showDeleteDialog = false;
							userToDelete = null;
						}}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleDelete}
						disabled={deleting}
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if deleting}
							Deleting...
						{:else}
							Delete User
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
