<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';
	import { handleAuthError } from '$lib/utils/auth-error-handler';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface Theme {
		_id: string;
		name: string;
		description?: string;
		baseTemplate: string;
		basePalette?: string;
		customColors?: Record<string, string>;
		customFonts?: Record<string, string>;
		customLayout?: Record<string, string>;
		pageModules?: Record<string, any[]>;
		pageLayout?: Record<string, { gridRows?: number; gridColumns?: number }>;
		isPublished?: boolean;
		isBuiltIn?: boolean;
		createdAt?: string;
		updatedAt?: string;
	}

	let themes: Theme[] = [];
	let loading = true;
	let message = '';
	let error = '';
	let showCreateModal = false;
	let createSubmitting = false;
	let createName = '';
	let createBaseTemplate = 'modern';
	let createBasePalette = 'light';
	let duplicateName = '';
	let duplicateThemeId: string | null = null;
	let deleteThemeId: string | null = null;
	let applyThemeId: string | null = null;

	$: frontendTemplate = $siteConfigData?.template?.frontendTemplate || $siteConfigData?.template?.activeTemplate || 'modern';

	onMount(async () => {
		await loadThemes();
	});

	async function loadThemes() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/admin/themes', { credentials: 'include' });
			if (!response.ok) {
				handleAuthError({ error: '', status: response.status }, $page.url.pathname);
				const text = await response.text();
				let errMsg = `Failed to load themes (${response.status})`;
				try {
					const err = JSON.parse(text);
					errMsg = err.error || err.message || errMsg;
				} catch {
					if (text) errMsg = text.slice(0, 200);
				}
				throw new Error(errMsg);
			}
			const result = await response.json();
			const raw = Array.isArray(result) ? result : (result.data || []);
			// Sort: built-in first (default, modern, elegant, minimal), then custom by date
			const order = ['default', 'modern', 'elegant', 'minimal'];
			themes = [...raw].sort((a, b) => {
				const aIdx = a.isBuiltIn ? order.indexOf(a.baseTemplate) : -1;
				const bIdx = b.isBuiltIn ? order.indexOf(b.baseTemplate) : -1;
				if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
				if (aIdx >= 0) return -1;
				if (bIdx >= 0) return 1;
				return (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
			});
		} catch (err) {
			if (handleAuthError(err, $page.url.pathname)) return;
			error = handleError(err, 'Failed to load themes');
		} finally {
			loading = false;
		}
	}

	async function createTheme() {
		if (!createName.trim()) return;
		createSubmitting = true;
		error = '';
		try {
			const response = await fetch('/api/admin/themes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					name: createName.trim(),
					baseTemplate: createBaseTemplate,
					basePalette: createBasePalette
				})
			});
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			logger.debug('Create theme result:', result);
			const newTheme = result.data ?? result;
			const themeId = newTheme?._id;
			showCreateModal = false;
			createName = '';
			createBaseTemplate = 'modern';
			createBasePalette = 'light';
			message = 'Theme created successfully!';
			if (newTheme) themes = [newTheme, ...themes];
			try {
				await loadThemes();
			} catch {
				// Keep optimistically added theme if reload fails
			}
			if (themeId) goto(`/admin/templates/overrides?themeId=${themeId}`);
		} catch (err) {
			error = handleError(err, 'Failed to create theme');
		} finally {
			createSubmitting = false;
		}
	}

	async function duplicateTheme(themeId: string, name?: string) {
		try {
			const response = await fetch(`/api/admin/themes/${themeId}/duplicate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ name: name || undefined })
			});
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			duplicateThemeId = null;
			duplicateName = '';
			message = 'Theme duplicated!';
			await loadThemes();
			const newId = result.data?._id ?? result?._id;
			if (newId) goto(`/admin/templates/overrides?themeId=${newId}`);
		} catch (err) {
			error = handleError(err, 'Failed to duplicate theme');
		}
	}

	async function applyTheme(themeId: string) {
		try {
			// Fetch the full theme to ensure we have pageModules and pageLayout
			const themeRes = await fetch(`/api/admin/themes/${themeId}`, { credentials: 'include' });
			if (!themeRes.ok) {
				await handleApiErrorResponse(themeRes);
				return;
			}
			const themeResult = await themeRes.json();
			const theme = themeResult.data || themeResult;
			
			if (!theme) {
				error = 'Theme not found';
				return;
			}

			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					template: {
						frontendTemplate: theme.baseTemplate,
						activeTemplate: theme.baseTemplate,
						customColors: theme.customColors || {},
						customFonts: theme.customFonts || {},
						customLayout: theme.customLayout || {},
						pageModules: theme.pageModules || {},
						pageLayout: theme.pageLayout || {}
					}
				})
			});
			if (!response.ok) await handleApiErrorResponse(response);
			applyThemeId = null;
			message = `Theme "${theme.name}" applied!`;
			await siteConfig.load();
			// Reload after a short delay to ensure siteConfig is updated
			setTimeout(() => {
				message = '';
				// If we're not on the admin page, reload to see changes
				if (!window.location.pathname.startsWith('/admin')) {
					window.location.reload();
				}
			}, 1000);
		} catch (err) {
			error = handleError(err, 'Failed to apply theme');
		}
	}

	async function deleteTheme(themeId: string) {
		try {
			const response = await fetch(`/api/admin/themes/${themeId}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			if (!response.ok) await handleApiErrorResponse(response);
			deleteThemeId = null;
			message = 'Theme deleted.';
			await loadThemes();
			setTimeout(() => (message = ''), 3000);
		} catch (err) {
			error = handleError(err, 'Failed to delete theme');
		}
	}

	function getColor(theme: Theme, key: string): string {
		return theme.customColors?.[key] || '#999';
	}
</script>

<svelte:head>
	<title>Themes - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-5xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Themes</h1>
					<p class="text-gray-600 mt-1">
						Manage and apply themes. All themes (built-in and custom) are in one place.
					</p>
					<p class="mt-2 text-sm">
						<span class="font-medium text-gray-700">Active template:</span>
						<span class="ml-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-medium">{frontendTemplate}</span>
					</p>
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						on:click={() => (showCreateModal = true)}
						class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
					>
						+ Create new theme
					</button>
					<a
						href="/admin/templates/overrides"
						class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
					>
						Theme Builder
					</a>
					<a
						href="/admin"
						class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
					>
						← Back to Admin
					</a>
				</div>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}
			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			{#if loading}
				<div class="text-center py-12">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
					<p class="mt-2 text-gray-600">Loading themes...</p>
				</div>
			{:else if themes.length === 0}
				<div class="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
					<p class="text-gray-600 mb-4">No themes yet. Restart the backend to seed built-in themes.</p>
					<button
						type="button"
						on:click={() => (showCreateModal = true)}
						class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						Create your first theme
					</button>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each themes as theme}
						<div class="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
							<div class="h-24 flex items-center justify-center gap-1 p-2" style="background: {getColor(theme, 'background')};">
								<span class="w-6 h-6 rounded-full border border-gray-300" style="background: {getColor(theme, 'primary')}"></span>
								<span class="w-6 h-6 rounded-full border border-gray-300" style="background: {getColor(theme, 'secondary')}"></span>
								<span class="w-6 h-6 rounded-full border border-gray-300" style="background: {getColor(theme, 'accent')}"></span>
							</div>
							<div class="p-4">
								<div class="flex items-center gap-2">
									<h3 class="font-semibold text-gray-900">{theme.name}</h3>
									{#if theme.baseTemplate === frontendTemplate}
										<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>
									{/if}
								</div>
								<p class="text-xs text-gray-500 mt-1">Base: {theme.baseTemplate} {theme.basePalette ? `· ${theme.basePalette}` : ''} {theme.isBuiltIn ? '· Built-in' : ''}</p>
								<div class="flex flex-wrap gap-2 mt-3">
									<a
										href="/admin/templates/overrides?themeId={theme._id}"
										class="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
									>
										Edit
									</a>
									<button
										type="button"
										on:click={() => (applyThemeId = theme._id)}
										class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
									>
										Apply
									</button>
									<button
										type="button"
										on:click={() => { duplicateThemeId = theme._id; duplicateName = `${theme.name} (copy)`; }}
										class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
									>
										Duplicate
									</button>
									<button
										type="button"
										on:click={() => (deleteThemeId = theme._id)}
										class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
									>
										Remove
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

<!-- Create modal -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-theme-title">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<h2 id="create-theme-title" class="text-lg font-semibold text-gray-900 mb-4">Create new theme</h2>
			<div class="space-y-4">
				<div>
					<label for="theme-name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
					<input
						id="theme-name"
						type="text"
						bind:value={createName}
						placeholder="My theme"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="theme-base" class="block text-sm font-medium text-gray-700 mb-1">Base theme</label>
					<select
						id="theme-base"
						bind:value={createBaseTemplate}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
					>
						<option value="default">Default</option>
						<option value="minimal">Minimal</option>
						<option value="modern">Modern</option>
						<option value="elegant">Elegant</option>
					</select>
				</div>
				<div>
					<label for="theme-palette" class="block text-sm font-medium text-gray-700 mb-1">Base palette</label>
					<select
						id="theme-palette"
						bind:value={createBasePalette}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
					>
						<option value="light">Light</option>
						<option value="dark">Dark</option>
						<option value="highContrast">High contrast</option>
						<option value="muted">Muted</option>
					</select>
				</div>
			</div>
			<div class="flex justify-end gap-2 mt-6">
				<button
					type="button"
					on:click={() => (showCreateModal = false)}
					class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={createTheme}
					disabled={!createName.trim() || createSubmitting}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
				>
					{createSubmitting ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Duplicate modal -->
{#if duplicateThemeId}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="duplicate-theme-title">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<h2 id="duplicate-theme-title" class="text-lg font-semibold text-gray-900 mb-4">Duplicate theme</h2>
			<div class="mb-4">
				<label for="duplicate-name" class="block text-sm font-medium text-gray-700 mb-1">New theme name</label>
				<input
					id="duplicate-name"
					type="text"
					bind:value={duplicateName}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
				/>
			</div>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					on:click={() => { duplicateThemeId = null; duplicateName = ''; }}
					class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={() => duplicateTheme(duplicateThemeId!, duplicateName)}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				>
					Duplicate
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Apply confirm -->
{#if applyThemeId}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="apply-theme-title">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<h2 id="apply-theme-title" class="text-lg font-semibold text-gray-900 mb-4">Apply theme?</h2>
			<p class="text-gray-600 mb-4">
				This will replace the current site theme with this theme's design.
			</p>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					on:click={() => (applyThemeId = null)}
					class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={() => applyTheme(applyThemeId!)}
					class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
				>
					Apply
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete confirm -->
{#if deleteThemeId}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-theme-title">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<h2 id="delete-theme-title" class="text-lg font-semibold text-gray-900 mb-4">Remove theme?</h2>
			<p class="text-gray-600 mb-4">
				This will permanently remove the theme. Built-in themes can be re-seeded by restarting the backend.
			</p>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					on:click={() => (deleteThemeId = null)}
					class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={() => deleteTheme(deleteThemeId!)}
					class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}
