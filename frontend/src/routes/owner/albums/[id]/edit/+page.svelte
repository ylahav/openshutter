<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { canEditAlbum } from '$lib/access-control';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		description?: string | { en?: string; he?: string };
		isPublic: boolean;
		isFeatured: boolean;
		showExifData?: boolean;
		order: number;
		createdBy?: string;
		allowedUsers?: string[];
		allowedGroups?: string[];
	}

	interface Group {
		_id: string;
		alias: string;
		name?: Record<string, string>;
	}

	interface User {
		_id: string;
		username?: string;
		name?: Record<string, string>;
	}

	let album: Album | null = null;
	let loading = true;
	let saving = false;
	let error: string | null = null;
	let albumId = $page.params.id;

	let groups: Group[] = [];
	let users: User[] = [];
	let loadingGroups = false;
	let loadingUsers = false;
	let showGroupsDropdown = false;
	let showUsersDropdown = false;
	let groupSearch = '';
	let userSearch = '';

	let formData = {
		name: {} as { en?: string; he?: string },
		description: {} as { en?: string; he?: string },
		isPublic: false,
		isFeatured: false,
		showExifData: true,
		order: 0,
		allowedUsers: [] as string[],
		allowedGroups: [] as string[]
	};

	$: filteredGroups = groups.filter(
		(g) =>
			!groupSearch.trim() ||
			(g.alias || '').toLowerCase().includes(groupSearch.toLowerCase()) ||
			(typeof g.name === 'object' && Object.values(g.name || {}).some((v) => (v || '').toLowerCase().includes(groupSearch.toLowerCase())))
	);
	$: filteredUsers = users.filter(
		(u) =>
			!userSearch.trim() ||
			(u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
			(typeof u.name === 'object' && Object.values(u.name || {}).some((v) => (v || '').toLowerCase().includes(userSearch.toLowerCase())))
	);

	function getGroupLabel(g: Group): string {
		const n = g.name;
		if (n && typeof n === 'object') return (n.en || n.he || g.alias) || '';
		return g.alias || '';
	}
	function getUserLabel(u: User): string {
		const n = u.name;
		if (n && typeof n === 'object') return (n.en || n.he || u.username) || u._id || '';
		return (u.username as string) || u._id || '';
	}
	function toggleGroup(alias: string) {
		if (formData.allowedGroups.includes(alias)) {
			formData.allowedGroups = formData.allowedGroups.filter((a) => a !== alias);
		} else {
			formData.allowedGroups = [...formData.allowedGroups, alias];
		}
		formData = formData;
	}
	function toggleUser(userId: string) {
		if (formData.allowedUsers.includes(userId)) {
			formData.allowedUsers = formData.allowedUsers.filter((id) => id !== userId);
		} else {
			formData.allowedUsers = [...formData.allowedUsers, userId];
		}
		formData = formData;
	}

	onMount(async () => {
		await fetchAlbum();
		loadGroupsAndUsers();
	});

	async function loadGroupsAndUsers() {
		loadingGroups = true;
		loadingUsers = true;
		try {
			const [groupsRes, usersRes] = await Promise.all([
				fetch('/api/admin/groups', { credentials: 'include' }),
				fetch('/api/admin/users?limit=500', { credentials: 'include' })
			]);
			if (groupsRes.ok) {
				const g = await groupsRes.json();
				groups = Array.isArray(g.data) ? g.data : [];
			}
			if (usersRes.ok) {
				const u = await usersRes.json();
				users = Array.isArray(u.data) ? u.data : [];
			}
		} catch (e) {
			logger.error('Failed to load groups/users:', e);
		} finally {
			loadingGroups = false;
			loadingUsers = false;
		}
	}

	async function fetchAlbum() {
		try {
			loading = true;
			const res = await fetch(`/api/albums/${albumId}`, { credentials: 'include' });
			if (!res.ok) {
				await handleApiErrorResponse(res);
			}
			const result = await res.json();
			const a = result.data || result;
			if (!canEditAlbum(a, data.user)) {
				error = 'Forbidden';
				return;
			}
			album = a;
			formData = {
				name:
					typeof a.name === 'string' ? { en: a.name } : (a.name || {}) as { en?: string; he?: string },
				description:
					typeof a.description === 'string'
						? { en: a.description }
						: (a.description || {}) as { en?: string; he?: string },
				isPublic: a.isPublic || false,
				isFeatured: a.isFeatured || false,
				showExifData: a.showExifData !== undefined ? a.showExifData : true,
				order: a.order || 0,
				allowedUsers: (a.allowedUsers || []).map((id: string) => String(id)),
				allowedGroups: (a.allowedGroups || []).map((alias: string) => String(alias))
			};
		} catch (e) {
			logger.error('Failed to fetch album:', e);
			error = handleError(e, 'Failed to fetch album');
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		try {
			saving = true;
			error = null;
			const res = await fetch(`/api/albums/${albumId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					...formData,
					name: MultiLangUtils.clean(formData.name),
					description: MultiLangUtils.clean(formData.description),
					allowedUsers: formData.allowedUsers,
					allowedGroups: formData.allowedGroups
				})
			});
			if (!res.ok) {
				await handleApiErrorResponse(res);
			}
			const result = await res.json();
			if (result.success !== true && !result.data) {
				throw new Error(result.error || 'Failed to update album');
			}
			goto('/owner/albums');
		} catch (e) {
			logger.error('Failed to update album:', e);
			error = handleError(e, 'Failed to update album');
		} finally {
			saving = false;
		}
	}

	function handleInputChange(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const { name, type } = target;
		const value = type === 'checkbox' ? target.checked : type === 'number' ? parseInt(target.value) || 0 : target.value;
		formData = { ...formData, [name]: value };
	}
</script>

<svelte:head>
	<title>Edit Album - Owner</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else if error || !album}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="text-red-600 text-xl mb-4">⚠️</div>
			<p class="text-gray-600">{error || 'Album not found'}</p>
			<button
				on:click={() => goto('/owner/albums')}
				class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
			>
				Back
			</button>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-3xl mx-auto px-4">
			<div class="mb-6">
				<button
					on:click={() => goto('/owner/albums')}
					class="text-blue-600 hover:text-blue-800 mb-4"
				>
					← Back to Albums
				</button>
				<h1 class="text-2xl font-bold text-gray-900">Edit Album</h1>
			</div>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
					<p class="text-red-800">{error}</p>
				</div>
			{/if}

			<form on:submit={handleSubmit} class="space-y-6 bg-white border rounded p-6">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Album Name</label>
					<MultiLangInput
						bind:value={formData.name}
						placeholder="Enter album name..."
						required
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
					<MultiLangHTMLEditor
						bind:value={formData.description}
						placeholder="Enter album description..."
						height={200}
					/>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="isPublic"
							checked={formData.isPublic}
							on:change={handleInputChange}
							class="h-4 w-4 text-blue-600"
						/>
						Public
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="isFeatured"
							checked={formData.isFeatured}
							on:change={handleInputChange}
							class="h-4 w-4 text-blue-600"
						/>
						Featured
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="showExifData"
							checked={formData.showExifData}
							on:change={handleInputChange}
							class="h-4 w-4 text-blue-600"
						/>
						Show EXIF
					</label>
				</div>
				<!-- Restrict access (when private) -->
				<div class="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Restrict access (when album is private)</h3>
					<p class="text-xs text-gray-500 mb-4">
						Add groups or users who can access this album. Leave empty to allow all logged-in users. Only applies when "Public" is unchecked.
					</p>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="relative">
							<span class="block text-sm font-medium text-gray-700 mb-2">Groups</span>
							<div class="flex flex-wrap gap-2 mb-2 min-h-8">
								{#each formData.allowedGroups as alias}
									{@const g = groups.find((x) => x.alias === alias)}
									<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm">
										{g ? getGroupLabel(g) : alias}
										<button
											type="button"
											on:click={() => {
												formData.allowedGroups = formData.allowedGroups.filter((a) => a !== alias);
												formData = formData;
											}}
											class="ml-0.5 hover:text-blue-900 focus:outline-none"
											aria-label="Remove"
										>×</button>
									</span>
								{/each}
							</div>
							{#if loadingGroups}
								<p class="text-sm text-gray-500">Loading groups...</p>
							{:else if groups.length === 0}
								<p class="text-sm text-gray-500">No groups. Create groups in Admin → Groups.</p>
							{:else}
								<div class="relative">
									<button
										type="button"
										on:click={() => {
											showGroupsDropdown = !showGroupsDropdown;
											if (showGroupsDropdown) showUsersDropdown = false;
											groupSearch = '';
										}}
										class="w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
									>
										+ Add groups
									</button>
									{#if showGroupsDropdown}
										<div class="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg max-h-56 overflow-hidden">
											<div class="p-2 border-b border-gray-200 sticky top-0 bg-white">
												<input
													type="text"
													bind:value={groupSearch}
													placeholder="Search groups..."
													class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
												/>
											</div>
											<div class="overflow-y-auto max-h-44 p-1">
												{#each filteredGroups as group}
													<button
														type="button"
														role="option"
														aria-selected={formData.allowedGroups.includes(group.alias)}
														on:click={() => toggleGroup(group.alias)}
														class="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 {formData.allowedGroups.includes(group.alias) ? 'bg-blue-50 text-blue-800' : 'text-gray-700'}"
													>
														{getGroupLabel(group)}
														{#if formData.allowedGroups.includes(group.alias)}
															<span class="ml-1 text-blue-600">✓</span>
														{/if}
													</button>
												{/each}
												{#if filteredGroups.length === 0}
													<p class="px-2 py-2 text-sm text-gray-500">No groups match.</p>
												{/if}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
						<div class="relative">
							<span class="block text-sm font-medium text-gray-700 mb-2">Users</span>
							<div class="flex flex-wrap gap-2 mb-2 min-h-8">
								{#each formData.allowedUsers as uid}
									{@const u = users.find((x) => x._id === uid)}
									<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-800 text-sm">
										{u ? getUserLabel(u) : uid}
										<button
											type="button"
											on:click={() => {
												formData.allowedUsers = formData.allowedUsers.filter((id) => id !== uid);
												formData = formData;
											}}
											class="ml-0.5 hover:text-green-900 focus:outline-none"
											aria-label="Remove"
										>×</button>
									</span>
								{/each}
							</div>
							{#if loadingUsers}
								<p class="text-sm text-gray-500">Loading users...</p>
							{:else if users.length === 0}
								<p class="text-sm text-gray-500">No users.</p>
							{:else}
								<div class="relative">
									<button
										type="button"
										on:click={() => {
											showUsersDropdown = !showUsersDropdown;
											if (showUsersDropdown) showGroupsDropdown = false;
											userSearch = '';
										}}
										class="w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
									>
										+ Add users
									</button>
									{#if showUsersDropdown}
										<div class="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg max-h-56 overflow-hidden">
											<div class="p-2 border-b border-gray-200 sticky top-0 bg-white">
												<input
													type="text"
													bind:value={userSearch}
													placeholder="Search users..."
													class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
												/>
											</div>
											<div class="overflow-y-auto max-h-44 p-1">
												{#each filteredUsers as user}
													<button
														type="button"
														role="option"
														aria-selected={formData.allowedUsers.includes(user._id)}
														on:click={() => toggleUser(user._id)}
														class="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 {formData.allowedUsers.includes(user._id) ? 'bg-green-50 text-green-800' : 'text-gray-700'}"
													>
														{getUserLabel(user)}
														{#if formData.allowedUsers.includes(user._id)}
															<span class="ml-1 text-green-600">✓</span>
														{/if}
													</button>
												{/each}
												{#if filteredUsers.length === 0}
													<p class="px-2 py-2 text-sm text-gray-500">No users match.</p>
												{/if}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
					<input
						type="number"
						name="order"
						bind:value={formData.order}
						on:change={handleInputChange}
						class="w-full border rounded px-3 py-2"
					/>
				</div>
				<div class="flex justify-between gap-2">
					<button
						type="button"
						on:click={() => goto(`/admin/photos/upload?albumId=${albumId}&returnTo=/owner/albums`)}
						class="px-4 py-2 border rounded hover:bg-gray-50"
					>
						Add Photos
					</button>
					<div class="flex gap-2">
						<button
							type="button"
							on:click={() => goto('/owner/albums')}
							class="px-4 py-2 border rounded hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving}
							class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
						>
							{saving ? 'Saving...' : 'Save'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
