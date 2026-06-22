<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { logger } from '$lib/utils/logger';
	import { handleError } from '$lib/utils/errorHandler';
	import { t } from '$stores/i18n';
	import {
		adminBtnPrimarySm,
		adminBtnSecondary,
		adminRingPrimary,
		adminInputClass,
		adminSelectClass,
		adminLabelClass
	} from '$lib/admin/admin-cerberus';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	interface AlbumFormData {
		name: string;
		alias: string;
		description: string;
		isPublic: boolean;
		isFeatured: boolean;
		storageProvider: string;
		parentAlbumId: string;
	}

	interface AlbumOption {
		_id: string;
		name: string | { en?: string; he?: string };
		alias: string;
		level: number;
		storagePath: string;
	}

	interface StorageOption {
		id: string;
		name: string;
		type: string;
		isEnabled: boolean;
	}

	let formData: AlbumFormData = $state({
		name: '',
		alias: '',
		description: '',
		isPublic: false,
		isFeatured: false,
		storageProvider: 'local',
		parentAlbumId: ''
	});

	let parentAlbums: AlbumOption[] = $state([]);
	let storageOptions: StorageOption[] = $state([]);
	let loadingStorageOptions = $state(true);
	let isLoading = $state(false);
	let error = $state('');
	let success = $state('');
	let storageOptionsError = $state('');

	onMount(async () => {
		const parentAlbumId = $page.url.searchParams.get('parentAlbumId');
		if (parentAlbumId) {
			formData.parentAlbumId = parentAlbumId;
		}

		await loadParentAlbums();
		await loadStorageOptions();

		if (parentAlbumId) {
			await loadParentAlbumStorageProvider(parentAlbumId);
		}
	});

	async function loadParentAlbums() {
		try {
			const response = await fetch('/api/albums/hierarchy?includePrivate=true');
			if (response.ok) {
				const result = await response.json();
				const albumsData = result.success ? result.data : result.data || result;
				if (albumsData && Array.isArray(albumsData)) {
					const flattenAlbums = (albums: any[]): AlbumOption[] => {
						let out: AlbumOption[] = [];
						for (const album of albums) {
							out.push({
								_id: album._id,
								name: album.name,
								alias: album.alias,
								level: album.level,
								storagePath: album.storagePath
							});
							if (album.children && album.children.length > 0) {
								out = out.concat(flattenAlbums(album.children));
							}
						}
						return out;
					};
					parentAlbums = flattenAlbums(albumsData);
				}
			}
		} catch (err) {
			logger.error('Failed to load parent albums:', err);
		}
	}

	async function loadStorageOptions() {
		try {
			loadingStorageOptions = true;
			const userRole = data?.user?.role || 'guest';
			const apiEndpoint =
				userRole === 'owner' ? '/api/owner/storage-options' : '/api/admin/storage-options';

			const response = await fetch(apiEndpoint);
			const result = await response.json();

			if (result.success && result.data) {
				storageOptions = result.data;
				if (result.data.length > 0) {
					const parentAlbumId = $page.url.searchParams.get('parentAlbumId');
					if (!parentAlbumId) {
						formData.storageProvider = result.data[0].id;
					}
					storageOptionsError = '';
				} else {
					storageOptions = [];
					storageOptionsError = $t('admin.noStorageProvidersHint');
				}
			} else {
				logger.error('Failed to load storage options:', result.error);
				storageOptions = [];
				storageOptionsError = handleError(result.error, $t('admin.failedToLoadStorageOptions'));
			}
		} catch (err) {
			logger.error('Error loading storage options:', err);
			storageOptions = [];
			storageOptionsError = handleError(err, $t('admin.failedToLoadStorageOptions'));
		} finally {
			loadingStorageOptions = false;
		}
	}

	async function loadParentAlbumStorageProvider(parentAlbumId: string) {
		try {
			const userRole = data?.user?.role || 'guest';
			const apiEndpoint =
				userRole === 'admin'
					? `/api/admin/albums/${parentAlbumId}`
					: `/api/albums/${parentAlbumId}`;

			const response = await fetch(apiEndpoint);
			if (response.ok) {
				const result = await response.json();
				const parentAlbum = result.data || result;

				if (parentAlbum.storageProvider) {
					const isProviderAvailable = storageOptions.some(
						(option) => option.id === parentAlbum.storageProvider
					);

					if (isProviderAvailable) {
						formData.storageProvider = parentAlbum.storageProvider;
					}
				}
			}
		} catch (err) {
			logger.error('[loadParentAlbumStorageProvider] Error loading parent album:', err);
		}
	}

	function generateAlias(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}

	function handleNameChange(name: string) {
		formData.name = name;
		formData.alias = generateAlias(name);
	}

	function getParentDisplayName(album: AlbumOption): string {
		const indent = '  '.repeat(album.level);
		return `${indent}${getAlbumName(album)} (${album.storagePath})`;
	}

	function getStoragePathPreview(): string {
		if (!formData.parentAlbumId) {
			return `/${formData.alias}`;
		}
		const parent = parentAlbums.find((a) => a._id === formData.parentAlbumId);
		if (parent) {
			return `${parent.storagePath}/${formData.alias}`;
		}
		return `/${formData.alias}`;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		success = '';

		if (!formData.name || !formData.alias) {
			error = $t('admin.albumNameAliasRequired');
			return;
		}

		isLoading = true;

		try {
			const response = await fetch('/api/albums', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			const result = await response.json().catch(() => ({}));

			if (!response.ok) {
				error = result.error || result.message || $t('admin.failedToCreateAlbum');
				return;
			}

			if (result.success && result.data) {
				success = $t('admin.albumCreatedSuccessfully');
				setTimeout(() => {
					const userRole = data?.user?.role;
					const dest = userRole === 'admin' ? '/admin/albums' : '/owner/albums';
					goto(dest);
				}, 1500);
			} else {
				error = result.error || $t('admin.failedToCreateAlbum');
			}
		} catch (err) {
			logger.error('Failed to create album:', err);
			error = handleError(err, $t('admin.failedToCreateAlbum'));
		} finally {
			isLoading = false;
		}
	}

	const backHref = $derived(data?.user?.role === 'admin' ? '/admin/albums' : '/owner/albums');
</script>

<svelte:head>
	<title>{$t('admin.createNewAlbum')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-(--color-surface-950-50)">
					{$t('admin.createNewAlbum')}
				</h1>
				<p class="mt-2 text-(--color-surface-600-400)">
					{$t('admin.createAlbumLongDescription')}
				</p>
			</div>
			<a href={backHref} class="{adminBtnSecondary} {adminRingPrimary}">
				{$t('albums.backToAlbums')}
			</a>
		</div>

		<!-- Error/Success Messages -->
		{#if error}
			<div
				class="mb-6 rounded-md border border-[color-mix(in_oklab,var(--color-error-500)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-error-500)_10%,transparent)] p-4"
				role="alert"
			>
				<h3 class="text-sm font-medium text-(--color-error-700-300)">
					{$t('admin.errorTitle')}
				</h3>
				<div class="mt-1 text-sm text-(--color-error-700-300)">{error}</div>
			</div>
		{/if}

		{#if success}
			<div
				class="mb-6 rounded-md border border-[color-mix(in_oklab,var(--color-success-500)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-success-500)_10%,transparent)] p-4"
				role="status"
			>
				<h3 class="text-sm font-medium text-(--color-success-700-300)">
					{$t('admin.successTitle')}
				</h3>
				<div class="mt-1 text-sm text-(--color-success-700-300)">{success}</div>
			</div>
		{/if}

		<!-- Album Creation Form -->
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit(e);
				}}
				class="space-y-6"
			>
				<!-- Basic Information -->
				<div>
					<h3 class="mb-4 text-lg font-medium text-(--color-surface-950-50)">
						{$t('owner.basicInformation')}
					</h3>
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<label for="name" class="{adminLabelClass} mb-2 block text-sm font-medium text-(--color-surface-800-200)">
								{$t('admin.albumName')} *
							</label>
							<input
								type="text"
								id="name"
								bind:value={formData.name}
								oninput={(e) => handleNameChange(e.currentTarget.value)}
								class={adminInputClass}
								placeholder={$t('admin.enterAlbumName')}
								required
							/>
						</div>
						<div>
							<label for="alias" class="{adminLabelClass} mb-2 block text-sm font-medium text-(--color-surface-800-200)">
								{$t('admin.albumAlias')} *
							</label>
							<input
								type="text"
								id="alias"
								bind:value={formData.alias}
								class={adminInputClass}
								placeholder={$t('admin.aliasUnique')}
								required
							/>
							<p class="mt-1 text-xs text-(--color-surface-600-400)">
								{$t('admin.albumAliasHelp')}
							</p>
						</div>
					</div>
					<div class="mt-4">
						<label for="description" class="{adminLabelClass} mb-2 block text-sm font-medium text-(--color-surface-800-200)">
							{$t('admin.description')}
						</label>
						<textarea
							id="description"
							bind:value={formData.description}
							class="textarea w-full"
							rows="3"
							placeholder={$t('admin.enterDescription')}
						></textarea>
					</div>
				</div>

				<!-- Storage Configuration -->
				<div>
					<h3 class="mb-4 text-lg font-medium text-(--color-surface-950-50)">
						{$t('admin.storageSettings')}
					</h3>
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<label for="storageProvider" class="{adminLabelClass} mb-2 block text-sm font-medium text-(--color-surface-800-200)">
								{$t('admin.storageProvider')} *
							</label>
							{#if loadingStorageOptions}
								<div
									class="flex w-full items-center rounded-md border border-surface-300-700 bg-surface-100-900 px-3 py-2 text-sm text-(--color-surface-600-400)"
								>
									<svg
										class="-ml-1 mr-3 h-5 w-5 animate-spin text-(--color-surface-500)"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									{$t('admin.loadingStorageConfiguration')}
								</div>
							{:else if storageOptions.length === 0}
								<div
									class="w-full rounded-md border border-[color-mix(in_oklab,#d97706_35%,transparent)] bg-[color-mix(in_oklab,#d97706_10%,transparent)] px-3 py-2 text-amber-950 dark:text-amber-100"
								>
									<p class="text-sm font-medium">
										{$t('admin.noStorageProviders')}
									</p>
									<p class="mt-1 text-xs">
										{storageOptionsError || $t('admin.noStorageProvidersHint')}
									</p>
									<a
										href="/admin/storage"
										class="mt-2 inline-block text-xs underline hover:no-underline"
									>
										{$t('admin.goToStorageSettings')} →
									</a>
								</div>
							{:else}
								<select
									id="storageProvider"
									bind:value={formData.storageProvider}
									class={adminSelectClass}
									required
								>
									{#each storageOptions as option}
										<option value={option.id}>{option.name}</option>
									{/each}
								</select>
							{/if}
							{#if storageOptions.length > 0}
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									{$t('admin.storageProviderHelp')}
								</p>
							{/if}
						</div>
						<div>
							<label for="parentAlbumId" class="{adminLabelClass} mb-2 block text-sm font-medium text-(--color-surface-800-200)">
								{$t('admin.parentAlbum')}
							</label>
							<select
								id="parentAlbumId"
								bind:value={formData.parentAlbumId}
								class={adminSelectClass}
							>
								<option value="">{`-- ${$t('admin.noParentAlbum')} --`}</option>
								{#each parentAlbums as album}
									<option value={album._id}>{getParentDisplayName(album)}</option>
								{/each}
							</select>
							<p class="mt-1 text-xs text-(--color-surface-600-400)">
								{$t('admin.parentAlbumHelp')}
							</p>
						</div>
					</div>
				</div>

				<!-- Folder Structure Preview -->
				{#if formData.parentAlbumId}
					<div
						class="rounded-lg border border-[color-mix(in_oklab,var(--color-primary-500)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-primary-500)_8%,transparent)] p-4"
					>
						<h4 class="mb-2 text-sm font-medium text-(--color-primary-900)">
							📁 {$t('admin.folderStructurePreview')}
						</h4>
						<div class="text-sm text-(--color-surface-800-200)">
							<p><strong>{$t('admin.storagePath')}:</strong></p>
							<div
								class="mt-1 rounded border border-surface-300-700 bg-surface-50-950 p-2 font-mono"
							>
								{getStoragePathPreview()}
							</div>
						</div>
					</div>
				{/if}

				<!-- Album Settings -->
				<div>
					<h3 class="mb-4 text-lg font-medium text-(--color-surface-950-50)">
						{$t('admin.albumSettings')}
					</h3>
					<div class="space-y-4">
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isPublic"
								bind:checked={formData.isPublic}
								class="checkbox"
							/>
							<label
								for="isPublic"
								class="ml-2 block text-sm text-(--color-surface-900-100)"
							>
								{$t('admin.publicAlbum')}
							</label>
							<p class="ml-2 text-sm text-(--color-surface-600-400)">
								{$t('admin.publicAlbumHelp')}
							</p>
						</div>
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isFeatured"
								bind:checked={formData.isFeatured}
								class="checkbox"
							/>
							<label
								for="isFeatured"
								class="ml-2 block text-sm text-(--color-surface-900-100)"
							>
								{$t('admin.featuredAlbum')}
							</label>
							<p class="ml-2 text-sm text-(--color-surface-600-400)">
								{$t('admin.featuredAlbumHelp')}
							</p>
						</div>
					</div>
				</div>

				<!-- Submit Button -->
				<div class="flex justify-end gap-3">
					<a href={backHref} class="{adminBtnSecondary} {adminRingPrimary}">
						{$t('admin.cancel')}
					</a>
					<button
						type="submit"
						disabled={isLoading}
						class="{adminBtnPrimarySm} {adminRingPrimary} disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isLoading ? $t('admin.creating') : $t('admin.createAlbum')}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
