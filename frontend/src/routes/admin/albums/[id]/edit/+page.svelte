<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { getPhotoUrl } from '$lib/utils/photoUrl';
	import { getPhotoTitle } from '$lib/utils/photoUtils';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		alias: string;
		description?: string | { en?: string; he?: string };
		isPublic: boolean;
		isFeatured: boolean;
		showExifData?: boolean;
		order: number;
		storageProvider: string;
		photoCount: number;
		level: number;
		parentPath?: string;
		coverPhotoId?: string;
		createdAt: string | Date;
		updatedAt: string | Date;
		createdBy?: string;
		tags?: string[];
		people?: string[];
		location?: string | null;
		allowedUsers?: string[];
		allowedGroups?: string[];
	}

	interface Photo {
		_id: string;
		title?: string | { en?: string; he?: string };
		filename: string;
		url?: string;
		storage?: { url?: string; path?: string; thumbnailPath?: string; thumbnails?: Record<string, string> };
		sourceAlbumId?: string;
		sourceAlbumName?: string;
	}

	interface Group {
		_id: string;
		alias: string;
		name: string | { en?: string; he?: string };
	}

	interface User {
		_id: string;
		username: string;
		name: string | { en?: string; he?: string };
	}

	const albumId: string = $page.params.id || '';
	let album: Album | null = null;
	let loading = true;
	let saving = false;
	let error = '';
	let notification = { show: false, message: '', type: 'success' as 'success' | 'error' };

	let formData = {
		name: {} as Record<string, string>,
		description: {} as Record<string, string>,
		isPublic: false,
		isFeatured: false,
		showExifData: true,
		order: 0,
		tags: [] as string[],
		people: [] as string[],
		location: null as string | null,
		allowedUsers: [] as string[],
		allowedGroups: [] as string[],
	};

	let groups: Group[] = [];
	let users: User[] = [];
	let loadingGroups = false;
	let loadingUsers = false;
	let showGroupsDropdown = false;
	let showUsersDropdown = false;
	let groupSearch = '';
	let userSearch = '';
	let groupsAccessRef: HTMLDivElement | null = null;
	let usersAccessRef: HTMLDivElement | null = null;

	// Cover / leading photo modal
	let coverPhotoModal: {
		isOpen: boolean;
		photos: Photo[];
		loading: boolean;
		currentPage: number;
		photosPerPage: number;
		totalPhotos: number;
		fromSubAlbums: boolean;
	} = {
		isOpen: false,
		photos: [],
		loading: false,
		currentPage: 1,
		photosPerPage: 24,
		totalPhotos: 0,
		fromSubAlbums: false,
	};

	$: filteredGroups = groupSearch.trim()
		? groups.filter(
				(g) =>
					g.alias.toLowerCase().includes(groupSearch.toLowerCase()) ||
					getGroupLabel(g).toLowerCase().includes(groupSearch.toLowerCase())
			)
		: groups;
	$: filteredUsers = userSearch.trim()
		? users.filter(
				(u) =>
					u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
					getUserLabel(u).toLowerCase().includes(userSearch.toLowerCase())
			)
		: users;

	async function loadAlbum() {
		try {
			loading = true;
			error = '';
			const response = await fetch(`/api/admin/albums/${albumId}?t=${Date.now()}`, {
				cache: 'no-store',
			});
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			album = result.data || result;
			logger.debug('Album loaded:', album);

			// Initialize form data
			if (album) {
				formData.name =
					typeof album.name === 'string' ? { en: album.name } : album.name || {};
				formData.description =
					typeof album.description === 'string'
						? { en: album.description }
						: album.description || {};
				formData.isPublic = album.isPublic || false;
				formData.isFeatured = album.isFeatured || false;
				formData.showExifData = album.showExifData !== undefined ? album.showExifData : true;
				formData.order = album.order || 0;
				// Convert ObjectIds to strings if needed
				formData.tags =
					album.tags?.map((tag: string | { _id?: { toString(): string }; toString(): string }) =>
						typeof tag === 'string' ? tag : tag._id?.toString() || tag.toString()
					) || [];
				formData.people =
					album.people?.map((person: string | { _id?: { toString(): string }; toString(): string }) =>
						typeof person === 'string' ? person : person._id?.toString() || person.toString()
					) || [];
				formData.location =
					album.location
						? typeof album.location === 'string'
							? album.location
							: (album.location && typeof album.location === 'object' && '_id' in album.location)
								? (album.location as { _id: { toString(): string } })._id.toString()
								: String(album.location)
						: null;
				formData.allowedUsers = album.allowedUsers?.map((id: string) => String(id)) || [];
				formData.allowedGroups = album.allowedGroups?.map((a: string) => String(a)) || [];
			}
		} catch (err) {
			logger.error('Failed to fetch album:', err);
			error = handleError(err, 'Failed to load album');
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!album) return;

		try {
			saving = true;
			error = '';

			const updateData = {
				name: MultiLangUtils.clean(formData.name),
				description: MultiLangUtils.clean(formData.description),
				isPublic: formData.isPublic,
				isFeatured: formData.isFeatured,
				showExifData: formData.showExifData,
				order: formData.order,
				tags: formData.tags,
				people: formData.people,
				location: formData.location,
				allowedUsers: formData.allowedUsers,
				allowedGroups: formData.allowedGroups,
			};

			const response = await fetch(`/api/admin/albums/${albumId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updateData),
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const updatedAlbum = await response.json();
			logger.debug('Album updated:', updatedAlbum);

			notification = {
				show: true,
				message: 'Album updated successfully',
				type: 'success',
			};

			// Redirect after a short delay
			setTimeout(() => {
				goto(`/admin/albums/${albumId}`);
			}, 1000);
		} catch (err) {
			logger.error('Failed to update album:', err);
			error = handleError(err, 'Failed to update album');
			notification = {
				show: true,
				message: error,
				type: 'error',
			};
		} finally {
			saving = false;
		}
	}

	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const { name, type, value } = target;
		if (type === 'checkbox') {
			formData = { ...formData, [name]: target.checked };
		} else if (type === 'number') {
			formData = { ...formData, [name]: parseInt(value) || 0 };
		} else {
			formData = { ...formData, [name]: value };
		}
	}

	function getGroupLabel(g: Group): string {
		const n = typeof g.name === 'string' ? g.name : g.name?.en || g.name?.he;
		return n ? `${n} (${g.alias})` : g.alias;
	}

	function getUserLabel(u: User): string {
		const n = typeof u.name === 'string' ? u.name : u.name?.en || u.name?.he;
		return n ? `${n} (${u.username})` : u.username;
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			showGroupsDropdown = false;
			showUsersDropdown = false;
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (!showGroupsDropdown && !showUsersDropdown) return;
		const target = e.target as Node;
		const inGroups = groupsAccessRef && groupsAccessRef.contains(target);
		const inUsers = usersAccessRef && usersAccessRef.contains(target);
		if (!inGroups && !inUsers) {
			showGroupsDropdown = false;
			showUsersDropdown = false;
		}
	}

	async function openCoverPhotoModal() {
		if (!album) return;
		coverPhotoModal = {
			isOpen: true,
			photos: [],
			loading: true,
			currentPage: 1,
			photosPerPage: 24,
			totalPhotos: 0,
			fromSubAlbums: false,
		};
		try {
			let response = await fetch(`/api/admin/albums/${album._id}/photos`);
			if (response.ok) {
				const result = await response.json();
				if (result.success && Array.isArray(result.data)) {
					coverPhotoModal.photos = result.data;
					coverPhotoModal.totalPhotos = result.data.length;
					coverPhotoModal.fromSubAlbums = result.fromSubAlbums === true;
				}
			}
			// If album has no photos, fetch photos from sub-albums so user can pick one as leading
			if (coverPhotoModal.totalPhotos === 0) {
				response = await fetch(`/api/admin/albums/${album._id}/photos?includeSubAlbums=1`);
				if (response.ok) {
					const result = await response.json();
					if (result.success && Array.isArray(result.data) && result.data.length > 0) {
						coverPhotoModal.photos = result.data;
						coverPhotoModal.totalPhotos = result.data.length;
						coverPhotoModal.fromSubAlbums = true;
					}
				}
			}
		} catch (err) {
			logger.error('Failed to load album photos:', err);
		} finally {
			coverPhotoModal.loading = false;
		}
	}

	function closeCoverPhotoModal() {
		coverPhotoModal = {
			isOpen: false,
			photos: [],
			loading: false,
			currentPage: 1,
			photosPerPage: 24,
			totalPhotos: 0,
			fromSubAlbums: false,
		};
	}

	async function setCoverPhoto(photoId: string) {
		if (!album) return;
		try {
			const response = await fetch(`/api/admin/albums/${album._id}/cover-photo`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ coverPhotoId: photoId }),
			});
			if (!response.ok) {
				await handleApiErrorResponse(response);
			} else {
				album = { ...album, coverPhotoId: photoId };
				notification = { show: true, message: 'Leading photo updated', type: 'success' };
				closeCoverPhotoModal();
			}
		} catch (err) {
			logger.error('Failed to set cover photo:', err);
			notification = { show: true, message: handleError(err, 'Failed to set leading photo'), type: 'error' };
		}
	}

	function getPaginatedPhotos(): Photo[] {
		const startIndex = (coverPhotoModal.currentPage - 1) * coverPhotoModal.photosPerPage;
		const endIndex = startIndex + coverPhotoModal.photosPerPage;
		return coverPhotoModal.photos.slice(startIndex, endIndex);
	}

	function getTotalPages(): number {
		return Math.ceil(coverPhotoModal.totalPhotos / coverPhotoModal.photosPerPage) || 1;
	}

	function goToPage(page: number) {
		coverPhotoModal.currentPage = page;
		coverPhotoModal = coverPhotoModal;
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('click', handleClickOutside);
		(async () => {
			await loadAlbum();
			// Load groups and users for access control
			loadingGroups = true;
			loadingUsers = true;
			try {
				const [groupsRes, usersRes] = await Promise.all([
					fetch('/api/admin/groups', { cache: 'no-store' }),
					fetch('/api/admin/users?limit=500', { cache: 'no-store' }),
				]);
				if (groupsRes.ok) {
					const g = await groupsRes.json();
					groups = g.data || g || [];
				}
				if (usersRes.ok) {
					const u = await usersRes.json();
					users = Array.isArray(u.data) ? u.data : [];
				}
			} catch (_) {
				// non-blocking
			} finally {
				loadingGroups = false;
				loadingUsers = false;
			}
		})();
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<svelte:head>
	<title>
		{album
			? `${MultiLangUtils.getTextValue(album.name, $currentLanguage)} - Edit Album`
			: 'Edit Album'}
		- Admin
	</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if loading}
			<div class="text-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
				<p class="mt-4 text-gray-600">Loading album...</p>
			</div>
		{:else if error && !album}
			<div class="text-center py-12">
				<h1 class="text-2xl font-bold text-gray-900 mb-4">Error</h1>
				<p class="text-gray-600 mb-4">{error}</p>
				<a href="/admin/albums" class="btn-primary">Back to Albums</a>
			</div>
		{:else if album}
			<!-- Breadcrumbs -->
			<AlbumBreadcrumbs album={album} role="admin" currentPage="edit" />

			<!-- Header -->
			<div class="flex items-center justify-between mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Edit Album</h1>
					<p class="mt-2 text-gray-600">
						{MultiLangUtils.getTextValue(album.name, $currentLanguage)}
					</p>
				</div>
				<div>
					<a
						href="/albums/new?parentAlbumId={albumId}"
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium inline-flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Create Sub-Album
					</a>
				</div>
			</div>

			<!-- Form -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200">
				<form on:submit={handleSubmit} class="p-6 space-y-6">
					<!-- Album Info -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<span class="block text-sm font-medium text-gray-700 mb-2">
								Album Name
							</span>
							<MultiLangInput
								value={formData.name}
								onChange={(value) => {
									formData = { ...formData, name: value };
								}}
								placeholder="Enter album name..."
								required
							/>
						</div>

						<div>
							<label for="alias" class="block text-sm font-medium text-gray-700 mb-2">
								URL Alias
							</label>
							<input
								type="text"
								id="alias"
								value={album.alias}
								class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
								disabled
							/>
							<p class="text-xs text-gray-500 mt-1">URL alias cannot be changed</p>
						</div>
					</div>

					<!-- Description -->
					<div>
						<span class="block text-sm font-medium text-gray-700 mb-2">
							Description
						</span>
						<MultiLangHTMLEditor
							value={formData.description}
							onChange={(value) => {
								formData = { ...formData, description: value };
							}}
							placeholder="Enter album description..."
							height={240}
						/>
					</div>

					<!-- Album Details -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<label for="order" class="block text-sm font-medium text-gray-700 mb-2">
								Display Order
							</label>
							<input
								type="number"
								id="order"
								name="order"
								value={formData.order}
								on:input={handleInputChange}
								min="0"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>

						<div>
							<label for="storage-provider" class="block text-sm font-medium text-gray-700 mb-2">
								Storage Provider
							</label>
							<input
								type="text"
								id="storage-provider"
								value={album.storageProvider}
								class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
								disabled
							/>
						</div>

						<div>
							<label for="photo-count" class="block text-sm font-medium text-gray-700 mb-2">
								Photo Count
							</label>
							<input
								type="text"
								id="photo-count"
								value={album.photoCount}
								class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
								disabled
							/>
						</div>
					</div>

					<!-- Leading / cover photo -->
					<div class="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
						<h3 class="text-sm font-medium text-gray-700 mb-2">Leading photo</h3>
						<p class="text-xs text-gray-500 mb-3">
							The leading photo is shown as the album cover in the gallery. Select a photo from this album.
						</p>
						<button
							type="button"
							on:click={openCoverPhotoModal}
							class="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
						>
							{album.coverPhotoId ? 'Change leading photo' : 'Select leading photo'}
						</button>
					</div>

					<!-- Status Toggles -->
					<div class="flex flex-wrap gap-6">
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isPublic"
								name="isPublic"
								checked={formData.isPublic}
								on:change={handleInputChange}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isPublic" class="ml-2 block text-sm text-gray-700">
								Public (visible to visitors)
							</label>
						</div>
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isFeatured"
								name="isFeatured"
								checked={formData.isFeatured}
								on:change={handleInputChange}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isFeatured" class="ml-2 block text-sm text-gray-700">
								Featured (highlighted on homepage)
							</label>
						</div>
						<div class="flex items-center">
							<input
								type="checkbox"
								id="showExifData"
								name="showExifData"
								checked={formData.showExifData}
								on:change={handleInputChange}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="showExifData" class="ml-2 block text-sm text-gray-700">
								Show EXIF data in photo viewer
							</label>
						</div>
					</div>

					<!-- Access (when private) -->
					<div class="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
						<h3 class="text-sm font-medium text-gray-700 mb-2">Restrict access (when album is private)</h3>
						<p class="text-xs text-gray-500 mb-4">
							Add groups or users who can access this album. Leave empty to allow all logged-in users. Only applies when "Public" is unchecked.
						</p>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<!-- Groups: chips + searchable dropdown -->
							<div class="relative" bind:this={groupsAccessRef}>
								<span class="block text-sm font-medium text-gray-700 mb-2">Groups</span>
								<div class="flex flex-wrap gap-2 mb-2 min-h-8">
									{#each formData.allowedGroups as alias}
										{@const g = groups.find((x) => x.alias === alias)}
										<span
											class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm"
										>
											{g ? getGroupLabel(g) : alias}
											<button
												type="button"
												on:click={() => {
													formData.allowedGroups = formData.allowedGroups.filter((a) => a !== alias);
													formData = formData;
												}}
												class="ml-0.5 hover:text-blue-900 focus:outline-none"
												aria-label="Remove"
											>
												×
											</button>
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
											class="w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										>
											+ Add groups
										</button>
										{#if showGroupsDropdown}
											<div
												class="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg max-h-56 overflow-hidden"
												role="listbox"
											>
												<div class="p-2 border-b border-gray-200 sticky top-0 bg-white">
													<input
														type="text"
														bind:value={groupSearch}
														placeholder="Search groups..."
														class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
													/>
												</div>
												<div class="overflow-y-auto max-h-44 p-1">
													{#each filteredGroups as group}
														<button
															type="button"
															role="option"
															aria-selected={formData.allowedGroups.includes(group.alias)}
															on:click={() => toggleGroup(group.alias)}
															class="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 {formData.allowedGroups.includes(group.alias)
																? 'bg-blue-50 text-blue-800'
																: 'text-gray-700'}"
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
							<!-- Users: chips + searchable dropdown -->
							<div class="relative" bind:this={usersAccessRef}>
								<span class="block text-sm font-medium text-gray-700 mb-2">Users</span>
								<div class="flex flex-wrap gap-2 mb-2 min-h-8">
									{#each formData.allowedUsers as uid}
										{@const u = users.find((x) => x._id === uid)}
										<span
											class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-800 text-sm"
										>
											{u ? getUserLabel(u) : uid}
											<button
												type="button"
												on:click={() => {
													formData.allowedUsers = formData.allowedUsers.filter((id) => id !== uid);
													formData = formData;
												}}
												class="ml-0.5 hover:text-green-900 focus:outline-none"
												aria-label="Remove"
											>
												×
											</button>
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
											class="w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										>
											+ Add users
										</button>
										{#if showUsersDropdown}
											<div
												class="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg max-h-56 overflow-hidden"
												role="listbox"
											>
												<div class="p-2 border-b border-gray-200 sticky top-0 bg-white">
													<input
														type="text"
														bind:value={userSearch}
														placeholder="Search users..."
														class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
													/>
												</div>
												<div class="overflow-y-auto max-h-44 p-1">
													{#each filteredUsers as user}
														<button
															type="button"
															role="option"
															aria-selected={formData.allowedUsers.includes(user._id)}
															on:click={() => toggleUser(user._id)}
															class="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 {formData.allowedUsers.includes(user._id)
																? 'bg-green-50 text-green-800'
																: 'text-gray-700'}"
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

					<!-- Read-only Information -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="text-sm font-medium text-gray-700 mb-3">Album Information</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-medium text-gray-700">Created:</span>
								<span class="ml-2 text-gray-600">
									{new Date(album.createdAt).toLocaleDateString()}
								</span>
							</div>
							<div>
								<span class="font-medium text-gray-700">Last Updated:</span>
								<span class="ml-2 text-gray-600">
									{new Date(album.updatedAt).toLocaleDateString()}
								</span>
							</div>
							<div>
								<span class="font-medium text-gray-700">Level:</span>
								<span class="ml-2 text-gray-600">{album.level}</span>
							</div>
							{#if album.parentPath}
								<div class="md:col-span-2">
									<span class="font-medium text-gray-700">Parent Path:</span>
									<span class="ml-2 text-gray-600">{album.parentPath}</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Error Message -->
					{#if error}
						<div class="bg-red-50 border border-red-200 rounded-md p-4">
							<p class="text-sm text-red-600">{error}</p>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
						<a
							href="/admin/albums/{albumId}"
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							Cancel
						</a>
						<button
							type="submit"
							disabled={saving}
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>

<!-- Select leading photo modal -->
{#if coverPhotoModal.isOpen && album}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-10 mx-auto p-5 border w-11/12 md:w-5/6 lg:w-4/5 xl:w-3/4 shadow-lg rounded-md bg-white max-w-6xl">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-medium text-gray-900">
					Select leading photo – {getAlbumName(album)}
				</h3>
				<button
					type="button"
					on:click={closeCoverPhotoModal}
					class="text-gray-400 hover:text-gray-600"
					aria-label="Close modal"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			{#if coverPhotoModal.loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
					<p class="mt-2 text-gray-600">Loading photos...</p>
				</div>
			{:else if coverPhotoModal.totalPhotos === 0}
				<div class="text-center py-8">
					<p class="text-gray-600">No photos in this album or in sub-albums. Add photos first, then choose a leading photo.</p>
				</div>
			{:else}
				<div class="max-h-[70vh] overflow-y-auto">
					{#if coverPhotoModal.fromSubAlbums}
						<p class="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
							This album has no photos. Showing photos from sub-albums. You can choose one as the leading photo.
						</p>
					{/if}
					<div class="mb-4 text-sm text-gray-600">
						Showing {((coverPhotoModal.currentPage - 1) * coverPhotoModal.photosPerPage) + 1}–{Math.min(
							coverPhotoModal.currentPage * coverPhotoModal.photosPerPage,
							coverPhotoModal.totalPhotos,
						)} of {coverPhotoModal.totalPhotos} photos
					</div>

					<div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-6">
						{#each getPaginatedPhotos() as photo}
							{@const isCurrentCover = album?.coverPhotoId === photo._id}
							<button
								type="button"
								class="relative cursor-pointer group text-left {isCurrentCover ? 'ring-4 ring-purple-500 ring-opacity-75' : ''}"
								on:click={() => setCoverPhoto(photo._id)}
								aria-label="Set as leading photo"
							>
								<img
									src={getPhotoUrl(photo, { fallback: '' }) || photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
									alt={getPhotoTitle(photo) || photo.filename || 'Photo'}
									class="w-full h-20 object-cover rounded-lg hover:opacity-75 transition-opacity {isCurrentCover ? 'ring-2 ring-purple-500' : ''}"
									style="image-orientation: from-image;"
								/>
								{#if isCurrentCover}
									<div class="absolute top-1 right-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
										✓
									</div>
								{/if}
								{#if coverPhotoModal.fromSubAlbums && photo.sourceAlbumName}
									<p class="mt-0.5 text-xs text-gray-500 truncate" title="From: {photo.sourceAlbumName}">From: {photo.sourceAlbumName}</p>
								{/if}
							</button>
						{/each}
					</div>

					{#if getTotalPages() > 1}
						<div class="flex items-center justify-center space-x-2 mt-4">
							<button
								type="button"
								on:click={() => goToPage(coverPhotoModal.currentPage - 1)}
								disabled={coverPhotoModal.currentPage === 1}
								class="px-3 py-1 text-sm font-medium text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Previous
							</button>
							<span class="text-sm text-gray-600">
								Page {coverPhotoModal.currentPage} of {getTotalPages()}
							</span>
							<button
								type="button"
								on:click={() => goToPage(coverPhotoModal.currentPage + 1)}
								disabled={coverPhotoModal.currentPage === getTotalPages()}
								class="px-3 py-1 text-sm font-medium text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Next
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<div class="mt-6 flex justify-end">
				<button
					type="button"
					on:click={closeCoverPhotoModal}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<NotificationDialog
	isOpen={notification.show}
	message={notification.message}
	type={notification.type}
	onClose={() => {
		notification.show = false;
	}}
/>
