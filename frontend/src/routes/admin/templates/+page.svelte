<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';
	import { t } from '$stores/i18n';
	import { handleAuthError } from '$lib/utils/auth-error-handler';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { applyThemeById } from '$lib/services/apply-theme';

	interface Theme {
		_id: string;
		name: string;
		description?: string;
		baseTemplate: string;
		basePalette?: string;
		customColors?: Record<string, string>;
		customFonts?: Record<string, string>;
		customLayout?: Record<string, unknown>;
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
	let previewTemplate: string | null = null;
	let previewThemeId: string | null = null;

	const BASE_TEMPLATE_PREVIEW: Record<
		string,
		{
			colors: { primary: string; secondary: string; accent: string; background: string };
			label: string;
		}
	> = {
		minimal: {
			colors: { primary: '#111111', secondary: '#9CA3AF', accent: '#111111', background: '#FFFFFF' },
			label: 'Clean monochrome'
		},
		modern: {
			colors: { primary: '#2563EB', secondary: '#334155', accent: '#22D3EE', background: '#0F172A' },
			label: 'Bold contrast'
		},
		elegant: {
			colors: { primary: '#7C3AED', secondary: '#C4B5FD', accent: '#F59E0B', background: '#1F1437' },
			label: 'Luxury serif'
		},
		default: {
			colors: { primary: '#3B82F6', secondary: '#6B7280', accent: '#F59E0B', background: '#FFFFFF' },
			label: 'Balanced classic'
		}
	};

	$: frontendTemplate = $siteConfigData?.template?.frontendTemplate || $siteConfigData?.template?.activeTemplate || 'modern';
	$: liveThemeId = $siteConfigData?.template?.activeThemeId;
	/** Resolved preset name from DB for the default public theme */
	$: defaultPublicThemeLabel =
		liveThemeId && themes.length > 0
			? themes.find((t) => t._id === liveThemeId)?.name ?? '—'
			: '—';

	onMount(async () => {
		await siteConfig.load();
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
			error = handleError(err, $t('admin.errorLoadingTemplates'));
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
			message = $t('admin.themeCreatedSuccessfully');
			if (newTheme) themes = [newTheme, ...themes];
			try {
				await loadThemes();
			} catch {
				// Keep optimistically added theme if reload fails
			}
			if (themeId) goto(`/admin/templates/overrides?themeId=${themeId}`);
		} catch (err) {
			error = handleError(err, $t('admin.failedToCreateTheme'));
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
			message = $t('admin.themeDuplicated');
			await loadThemes();
			const newId = result.data?._id ?? result?._id;
			if (newId) goto(`/admin/templates/overrides?themeId=${newId}`);
		} catch (err) {
			error = handleError(err, $t('admin.failedToDuplicateTheme'));
		}
	}

	async function applyTheme(themeId: string) {
		try {
			const result = await applyThemeById(themeId);
			if (!result.ok) {
				error = result.error;
				return;
			}
			previewTemplate = null;
			previewThemeId = null;
			applyThemeId = null;
			message = $t('admin.themeApplied').replace('{name}', result.themeName);
			setTimeout(() => {
				message = '';
				window.location.reload();
			}, 600);
		} catch (err) {
			error = handleError(err, $t('admin.failedToApplyTheme'));
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
			message = $t('admin.themeDeleted');
			await loadThemes();
			setTimeout(() => (message = ''), 3000);
		} catch (err) {
			error = handleError(err, $t('admin.failedToDeleteTheme'));
		}
	}

	function getColor(theme: Theme, key: string): string {
		const fallback = BASE_TEMPLATE_PREVIEW[theme.baseTemplate]?.colors as Record<string, string> | undefined;
		return theme.customColors?.[key] || fallback?.[key] || '#999';
	}

	function getTemplateStyleLabel(theme: Theme): string {
		return BASE_TEMPLATE_PREVIEW[theme.baseTemplate]?.label || 'Custom style';
	}

	function previewTheme(theme: Theme): void {
		previewTemplate = theme.baseTemplate;
		previewThemeId = theme._id;
		message = `Previewing ${theme.name}. Use Set as default or Apply Preview to save, or Revert Preview to discard.`;
		error = '';
	}

	function clearPreview(): void {
		previewTemplate = null;
		previewThemeId = null;
		message = 'Preview cleared.';
	}

	function openApplyPreview(): void {
		if (previewThemeId) applyThemeId = previewThemeId;
	}

</script>

<svelte:head>
	<title>{$t('admin.templateManagement')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-5xl mx-auto px-4">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-[var(--color-surface-950-50)]">{$t('admin.templates')}</h1>
					<p id="templates-preview-help" class="text-sm text-[var(--color-surface-600-400)] mt-2 max-w-2xl">
						{$t('admin.previewCurrentPageHelp')}
					</p>
					<div class="mt-3 text-sm space-y-1 rounded-lg border border-surface-200-800 bg-[var(--color-surface-50-950)] px-3 py-2 max-w-xl">
						<p class="font-medium text-[var(--color-surface-900-100)]">{$t('admin.templatesDefaultsHeading')}</p>
						<p>
							<span class="text-[var(--color-surface-600-400)]">{$t('admin.templatesDefaultPublic')}:</span>
							<span class="ml-1 font-medium text-[var(--color-surface-950-50)]">{defaultPublicThemeLabel}</span>
							<span class="text-[var(--color-surface-600-400)]"> · {$t('admin.templatesDefaultPack')}</span>
							<span class="font-mono text-[var(--color-surface-900-100)]">{frontendTemplate}</span>
						</p>
					</div>
					{#if previewTemplate}
						<p class="mt-1 text-xs text-amber-700">
							Preview mode: <span class="font-semibold">{previewTemplate}</span> (not saved yet)
						</p>
					{/if}
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						on:click={() => (showCreateModal = true)}
						class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
					>
						+ {$t('admin.createNewTheme')}
					</button>
					<a
						href="/admin/templates/overrides"
						class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
					>
						{$t('admin.themeBuilder')}
					</a>
					{#if previewTemplate && previewThemeId}
						<button
							type="button"
							on:click={openApplyPreview}
							class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
							title={$t('admin.applyPreview')}
						>
							{$t('admin.applyPreview')}
						</button>
					{/if}
					{#if previewTemplate}
						<button
							type="button"
							on:click={clearPreview}
							class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
							title={$t('admin.revertPreview')}
						>
							{$t('admin.revertPreview')}
						</button>
					{/if}
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
					<p class="mt-2 text-[var(--color-surface-600-400)]">{$t('admin.loadingTemplates')}</p>
				</div>
			{:else if themes.length === 0}
				<div class="text-center py-8 border-2 border-dashed border-surface-200-800 rounded-lg">
					<p class="text-[var(--color-surface-600-400)] mb-4">{$t('admin.noTemplatesYetRestartBackend')}</p>
					<button
						type="button"
						on:click={() => (showCreateModal = true)}
						class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						{$t('admin.createYourFirstTheme')}
					</button>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each themes as theme}
						<div class="border border-surface-200-800 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
							<div class="h-24 flex items-center justify-center gap-1 p-2" style="background: {getColor(theme, 'background')};">
								<span class="w-6 h-6 rounded-full border border-surface-300-700" style="background: {getColor(theme, 'primary')}"></span>
								<span class="w-6 h-6 rounded-full border border-surface-300-700" style="background: {getColor(theme, 'secondary')}"></span>
								<span class="w-6 h-6 rounded-full border border-surface-300-700" style="background: {getColor(theme, 'accent')}"></span>
							</div>
							<div class="p-4">
								<div class="flex items-center gap-2">
									<h3 class="font-semibold text-[var(--color-surface-950-50)]">{theme.name}</h3>
									{#if liveThemeId ? liveThemeId === theme._id : theme.baseTemplate === frontendTemplate}
										<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
											{$t('admin.defaultThemeBadge')}
										</span>
									{/if}
									{#if previewTemplate === theme.baseTemplate}
										<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
											Previewing
										</span>
									{/if}
								</div>
								<p class="text-xs text-[var(--color-surface-600-400)] mt-1">
									{$t('admin.baseTemplateLabel')}: {theme.baseTemplate}{' '}
									{theme.basePalette ? `· ${theme.basePalette}` : ''}{' '}
									{theme.isBuiltIn ? `· ${$t('admin.builtIn')}` : ''}
								</p>
								<p class="text-xs text-[var(--color-surface-600-400)] mt-1">{getTemplateStyleLabel(theme)}</p>
								<div class="flex flex-wrap gap-2 mt-3">
									<a
										href="/admin/templates/overrides?themeId={theme._id}"
										class="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
									>
										{$t('admin.edit')}
									</a>
									<button
										type="button"
										on:click={() => (applyThemeId = theme._id)}
										class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
									>
										{$t('admin.setAsDefaultTheme')}
									</button>
									<button
										type="button"
										on:click={() => previewTheme(theme)}
										class="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
										title={$t('admin.previewCurrentPageTitle')}
										aria-label={$t('admin.previewCurrentPageTitle')}
										aria-describedby="templates-preview-help"
									>
										{$t('admin.previewThemeAction')}
									</button>
									<button
										type="button"
										on:click={() => { duplicateThemeId = theme._id; duplicateName = `${theme.name} (copy)`; }}
										class="text-xs px-2 py-1 bg-[var(--color-surface-100-900)] text-[var(--color-surface-800-200)] rounded hover:bg-[var(--color-surface-200-800)]"
									>
										{$t('admin.duplicate')}
									</button>
									<button
										type="button"
										on:click={() => (deleteThemeId = theme._id)}
										class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
									>
										{$t('admin.remove')}
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
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl max-w-md w-full p-6">
			<h2 id="create-theme-title" class="text-lg font-semibold text-[var(--color-surface-950-50)] mb-4">
				{$t('admin.createNewTheme')}
			</h2>
			<div class="space-y-4">
				<div>
					<label for="theme-name" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-1">
						{$t('admin.themeName')}
					</label>
					<input
						id="theme-name"
						type="text"
						bind:value={createName}
						placeholder={$t('admin.themeNamePlaceholder')}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="theme-base" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-1">
						{$t('admin.baseTheme')}
					</label>
					<select
						id="theme-base"
						bind:value={createBaseTemplate}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-indigo-500"
					>
						<option value="default">{$t('admin.baseThemeDefault')}</option>
						<option value="minimal">{$t('admin.baseThemeMinimal')}</option>
						<option value="modern">{$t('admin.baseThemeModern')}</option>
						<option value="elegant">{$t('admin.baseThemeElegant')}</option>
					</select>
				</div>
				<div>
					<label for="theme-palette" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-1">
						{$t('admin.basePalette')}
					</label>
					<select
						id="theme-palette"
						bind:value={createBasePalette}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-indigo-500"
					>
						<option value="light">{$t('admin.basePaletteLight')}</option>
						<option value="dark">{$t('admin.basePaletteDark')}</option>
						<option value="highContrast">{$t('admin.basePaletteHighContrast')}</option>
						<option value="muted">{$t('admin.basePaletteMuted')}</option>
					</select>
				</div>
			</div>
			<div class="flex justify-end gap-2 mt-6">
				<button
					type="button"
					on:click={() => (showCreateModal = false)}
					class="px-4 py-2 text-[var(--color-surface-800-200)] hover:bg-[var(--color-surface-100-900)] rounded-md"
					>
						{$t('admin.cancel')}
					</button>
				<button
					type="button"
					on:click={createTheme}
					disabled={!createName.trim() || createSubmitting}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
				>
					{createSubmitting ? $t('admin.creatingTheme') : $t('admin.create')}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Duplicate modal -->
{#if duplicateThemeId}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="duplicate-theme-title">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl max-w-md w-full p-6">
			<h2 id="duplicate-theme-title" class="text-lg font-semibold text-[var(--color-surface-950-50)] mb-4">
				{$t('admin.duplicateTheme')}
			</h2>
			<div class="mb-4">
				<label for="duplicate-name" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-1">
					{$t('admin.newThemeName')}
				</label>
				<input
					id="duplicate-name"
					type="text"
					bind:value={duplicateName}
					class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-indigo-500"
				/>
			</div>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					on:click={() => { duplicateThemeId = null; duplicateName = ''; }}
					class="px-4 py-2 text-[var(--color-surface-800-200)] hover:bg-[var(--color-surface-100-900)] rounded-md"
				>
					{$t('admin.cancel')}
				</button>
				<button
					type="button"
					on:click={() => duplicateTheme(duplicateThemeId!, duplicateName)}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
				>
					{$t('admin.duplicate')}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Apply confirm -->
{#if applyThemeId}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="apply-theme-title">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl max-w-md w-full p-6">
			<h2 id="apply-theme-title" class="text-lg font-semibold text-[var(--color-surface-950-50)] mb-4">
				{$t('admin.setDefaultThemeQuestion')}
			</h2>
			<p class="text-[var(--color-surface-600-400)] mb-4">
				{$t('admin.setDefaultThemeDescription')}
			</p>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					on:click={() => (applyThemeId = null)}
					class="px-4 py-2 text-[var(--color-surface-800-200)] hover:bg-[var(--color-surface-100-900)] rounded-md"
				>
					{$t('admin.cancel')}
				</button>
				<button
					type="button"
					on:click={() => applyTheme(applyThemeId!)}
					class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
				>
					{$t('admin.setAsDefaultTheme')}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete confirm -->
{#if deleteThemeId}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-theme-title">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl max-w-md w-full p-6">
			<h2 id="delete-theme-title" class="text-lg font-semibold text-[var(--color-surface-950-50)] mb-4">
				{$t('admin.removeThemeQuestion')}
			</h2>
			<p class="text-[var(--color-surface-600-400)] mb-4">
				{$t('admin.removeThemeDescription')}
			</p>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					on:click={() => (deleteThemeId = null)}
					class="px-4 py-2 text-[var(--color-surface-800-200)] hover:bg-[var(--color-surface-100-900)] rounded-md"
				>
					{$t('admin.cancel')}
				</button>
				<button
					type="button"
					on:click={() => deleteTheme(deleteThemeId!)}
					class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
				>
					{$t('admin.delete')}
				</button>
			</div>
		</div>
	</div>
{/if}
