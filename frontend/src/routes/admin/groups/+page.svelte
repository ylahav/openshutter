<script lang="ts">
	import { onMount } from 'svelte';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';

	export let data; // From +layout.server.ts, contains user info

	interface Group {
		_id: string;
		alias: string;
		name: MultiLangText | string;
		createdAt?: string;
		updatedAt?: string;
	}

	let groups: Group[] = [];
	let loading = true;
	let saving = false;
	let deleting = false;
	let message = '';
	let error = '';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let editingGroup: Group | null = null;
	let groupToDelete: Group | null = null;

	// Form state
	let formData = {
		alias: '',
		name: { en: '', he: '' } as MultiLangText
	};

	onMount(async () => {
		await loadGroups();
	});

	async function loadGroups() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/admin/groups');
			if (!response.ok) {
				throw new Error('Failed to load groups');
			}
			const result = await response.json();
			groups = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
		} catch (err) {
			console.error('Error loading groups:', err);
			error = `Failed to load groups: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			alias: '',
			name: { en: '', he: '' }
		};
	}

	function openCreateDialog() {
		resetForm();
		showCreateDialog = true;
		error = '';
	}

	function openEditDialog(group: Group) {
		editingGroup = group;
		const nameField = typeof group.name === 'string' ? { en: group.name, he: '' } : group.name || { en: '', he: '' };
		formData = {
			alias: group.alias,
			name: nameField
		};
		showEditDialog = true;
		error = '';
	}

	function openDeleteDialog(group: Group) {
		groupToDelete = group;
		showDeleteDialog = true;
	}

	function getGroupName(group: Group): string {
		const nameField = typeof group.name === 'string' ? group.name : group.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || group.alias;
	}

	async function handleCreate() {
		saving = true;
		error = '';
		message = '';

		try {
			console.log('Creating group with data:', formData);
			const response = await fetch('/api/admin/groups', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			const responseData = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			console.log('Response status:', response.status, 'Response data:', responseData);

			if (!response.ok) {
				const errorMessage = responseData?.message || `HTTP ${response.status}: Failed to create group`;
				throw new Error(errorMessage);
			}

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const newGroup = responseData.data || responseData;
			groups = [...groups, newGroup];
			message = 'Group created successfully!';
			showCreateDialog = false;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error creating group:', err);
			error = `Failed to create group: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			saving = false;
		}
	}

	async function handleEdit() {
		if (!editingGroup) return;

		saving = true;
		error = '';
		message = '';

		try {
			console.log('Updating group:', editingGroup._id, 'with data:', formData);
			const response = await fetch(`/api/admin/groups/${editingGroup._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: formData.name
					// Note: alias is immutable, so we don't send it
				})
			});

			const responseData = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			console.log('Response status:', response.status, 'Response data:', responseData);

			if (!response.ok) {
				const errorMessage = responseData?.message || `HTTP ${response.status}: Failed to update group`;
				throw new Error(errorMessage);
			}

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const updatedGroup = responseData.data || responseData;
			groups = groups.map((g) => (g._id === editingGroup._id ? updatedGroup : g));
			message = 'Group updated successfully!';
			showEditDialog = false;
			editingGroup = null;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error updating group:', err);
			error = `Failed to update group: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!groupToDelete) return;

		deleting = true;
		error = '';
		message = '';

		try {
			const response = await fetch(`/api/admin/groups/${groupToDelete._id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to delete group');
			}

			groups = groups.filter((g) => g._id !== groupToDelete._id);
			message = 'Group deleted successfully!';
			showDeleteDialog = false;
			groupToDelete = null;

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error deleting group:', err);
			error = `Failed to delete group: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Groups Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Groups Management</h1>
					<p class="text-gray-600 mt-2">Define and manage user groups for access control</p>
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

			<!-- Create Group Form -->
			<div class="bg-gray-50 rounded-lg p-4 mb-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-3">Create New Group</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Alias *
						</label>
						<input
							type="text"
							bind:value={formData.alias}
							placeholder="e.g., family, friends, team"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<p class="mt-1 text-xs text-gray-500">Unique identifier (lowercase, no spaces)</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Name *
						</label>
						<MultiLangInput bind:value={formData.name} />
					</div>
					<div>
						<button
							type="button"
							on:click={handleCreate}
							disabled={saving || !formData.alias.trim()}
							class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
						>
							{#if saving}
								Creating...
							{:else}
								Create Group
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- Groups List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading groups...</p>
				</div>
			{:else if groups.length === 0}
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
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">No groups found</h3>
					<p class="text-gray-600">Start by creating your first group.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each groups as group}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1">
									<h3 class="font-semibold text-gray-900 mb-1">{getGroupName(group)}</h3>
									<p class="text-sm text-gray-500">Alias: <code class="bg-gray-100 px-1 rounded">{group.alias}</code></p>
								</div>

								<div class="flex space-x-1">
									<button
										type="button"
										on:click={() => openEditDialog(group)}
										class="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
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
										class="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
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

<!-- Edit Dialog -->
{#if showEditDialog && editingGroup}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit Group</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Alias
					</label>
					<input
						type="text"
						value={formData.alias}
						disabled
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600"
					/>
					<p class="mt-1 text-xs text-gray-500">Alias cannot be changed</p>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Name *
					</label>
					<MultiLangInput bind:value={formData.name} />
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showEditDialog = false;
							editingGroup = null;
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
							Update Group
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && groupToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Delete Group</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-gray-600">
					Are you sure you want to delete <strong>{getGroupName(groupToDelete)}</strong> ({groupToDelete.alias})? This
					action cannot be undone.
				</p>
				<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
					<p class="text-sm text-yellow-800">
						⚠️ Make sure no users or albums are assigned to this group before deleting.
					</p>
				</div>
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							showDeleteDialog = false;
							groupToDelete = null;
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
							Delete Group
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

