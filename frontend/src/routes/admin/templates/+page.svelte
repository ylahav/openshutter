<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateAdmin } from '$lib/admin/adminNavigate';
	import { page } from '$app/stores';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';
	import type { SiteConfig } from '$lib/types/site-config';
	import { t } from '$stores/i18n';
	import { handleAuthError } from '$lib/utils/auth-error-handler';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { adminToast } from '$lib/admin/adminToast';
	import { applyThemeById } from '$lib/services/apply-theme';
	import ThemePackPreviewThumb from '$lib/components/admin/ThemePackPreviewThumb.svelte';
	import {
		adminBadgeCaution,
		adminBadgePrimary,
		adminBtnDanger,
		adminBtnPrimarySm,
		adminBtnSecondary,
		adminBtnSmDanger,
		adminBtnSmPrimary,
		adminBtnSmSecondary,
		adminInputSmClass,
		adminLabelClass,
		adminLabelTextClass,
		adminRingPrimary,
		adminSelectSmClass
	} from '$lib/admin/admin-cerberus';
	import { normalizeThemeList, type ThemeListItem } from '$lib/admin/theme-list';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	interface Theme extends ThemeListItem {
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

	function asId(value: unknown): string {
		return value == null ? '' : String(value);
	}

	let themes = $state<Theme[]>([]);
	let loading = $state(false);
	let themesLoadError = $state('');
	let showCreateModal = $state(false);
	let createSubmitting = $state(false);
	let createName = $state('');
	let createBaseTemplate = $state('noir');
	let createBasePalette = $state('light');
	let duplicateName = $state('');
	let duplicateThemeId = $state<string | null>(null);
	let deleteThemeId = $state<string | null>(null);
	let applyThemeId = $state<string | null>(null);
	let previewTemplate = $state<string | null>(null);
	let previewThemeId = $state<string | null>(null);
	let seedingBuiltIn = $state(false);
	let seedAttempted = $state(false);

	const THEME_PREVIEW_BACKUP_KEY = 'openshutter-admin-theme-preview-backup';

	const BASE_TEMPLATE_PREVIEW: Record<
		string,
		{
			label: string;
		}
	> = {
		noir: {
			label: 'Cinematic mono'
		},
		studio: {
			label: 'Editorial blue'
		},
		atelier: {
			label: 'Warm editorial'
		}
	};

	const frontendTemplate = $derived(
		$siteConfigData?.template?.frontendTemplate || $siteConfigData?.template?.activeTemplate || 'noir',
	);
	const liveThemeId = $derived(asId($siteConfigData?.template?.activeThemeId));
	/** Resolved preset name from DB for the default public theme */
	const defaultPublicThemeLabel = $derived(
		liveThemeId && themes.length > 0
			? themes.find((t) => asId(t._id) === liveThemeId)?.name ?? '—'
			: '—',
	);

	onMount(() => {
		themes = normalizeThemeList(data.initialThemes ?? []) as Theme[];
		themesLoadError = data.themesLoadError ?? '';
		void siteConfig.load();
		const hasPreload = themes.length > 0 || Boolean(themesLoadError);
		void loadThemes({ background: hasPreload });
	});

	async function loadThemes(opts?: { background?: boolean }) {
		if (!opts?.background) loading = true;
		if (!opts?.background) themesLoadError = '';

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000);

		try {
			const response = await fetch('/api/admin/themes', {
				credentials: 'include',
				signal: controller.signal,
			});
			if (!response.ok) {
				if (handleAuthError({ error: '', status: response.status }, $page.url.pathname)) {
					return;
				}
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
			const raw = Array.isArray(result) ? result : (result as { data?: unknown[] })?.data ?? [];
			themes = normalizeThemeList(raw) as Theme[];
			themesLoadError = '';
			if (themes.length === 0 && !seedAttempted) {
				seedAttempted = true;
				await seedBuiltInThemes();
			}
		} catch (err) {
			if (handleAuthError(err, $page.url.pathname)) {
				return;
			}
			themesLoadError =
				err instanceof Error && err.name === 'AbortError'
					? 'Timed out while loading templates. Check that the backend is running.'
					: handleError(err, $t('admin.errorLoadingTemplates'));
			adminToast.error({ title: themesLoadError });
		} finally {
			clearTimeout(timeoutId);
			loading = false;
		}
	}

	async function seedBuiltInThemes(): Promise<boolean> {
		seedingBuiltIn = true;
		try {
			const response = await fetch('/api/admin/themes/seed', {
				method: 'POST',
				credentials: 'include',
			});
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				const msg =
					(typeof body === 'object' && body && 'error' in body
						? String((body as { error?: string }).error)
						: null) || `Failed to seed themes (${response.status})`;
				themesLoadError = msg;
				adminToast.error({ title: msg });
				return false;
			}
			const result = await response.json();
			const raw = Array.isArray(result) ? result : (result as { data?: unknown[] })?.data ?? [];
			themes = normalizeThemeList(raw) as Theme[];
			if (themes.length > 0) {
				themesLoadError = '';
				adminToast.success({ title: $t('admin.builtInThemesSeeded') });
				return true;
			}
			return false;
		} catch (err) {
			themesLoadError = handleError(err, $t('admin.failedToSeedThemes'));
			adminToast.error({ title: themesLoadError });
			return false;
		} finally {
			seedingBuiltIn = false;
		}
	}

	async function createTheme() {
		if (!createName.trim()) return;
		createSubmitting = true;
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
			const themeId = asId(newTheme?._id);
			showCreateModal = false;
			createName = '';
			createBaseTemplate = 'noir';
			createBasePalette = 'light';
			adminToast.success({ title: $t('admin.themeCreatedSuccessfully') });
			if (newTheme) themes = [newTheme as Theme, ...themes];
			try {
				await loadThemes();
			} catch {
				// Keep optimistically added theme if reload fails
			}
			if (themeId) navigateAdmin(`/admin/templates/overrides?themeId=${encodeURIComponent(themeId)}`);
		} catch (err) {
			adminToast.error({ title: handleError(err, $t('admin.failedToCreateTheme')) });
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
			adminToast.success({ title: $t('admin.themeDuplicated') });
			await loadThemes();
			const newId = asId(result.data?._id ?? result?._id);
			if (newId) navigateAdmin(`/admin/templates/overrides?themeId=${encodeURIComponent(newId)}`);
		} catch (err) {
			adminToast.error({ title: handleError(err, $t('admin.failedToDuplicateTheme')) });
		}
	}

	async function applyTheme(themeId: string) {
		try {
			const result = await applyThemeById(themeId);
			if (!result.ok) {
				adminToast.error({ title: result.error });
				return;
			}
			previewTemplate = null;
			previewThemeId = null;
			applyThemeId = null;
			try {
				sessionStorage.removeItem(THEME_PREVIEW_BACKUP_KEY);
			} catch {
				/* ignore */
			}
			adminToast.success({ title: $t('admin.themeApplied').replace('{name}', result.themeName) });
			setTimeout(() => {
				window.location.reload();
			}, 600);
		} catch (err) {
			adminToast.error({ title: handleError(err, $t('admin.failedToApplyTheme')) });
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
			adminToast.success({ title: $t('admin.themeDeleted') });
			await loadThemes();
		} catch (err) {
			adminToast.error({ title: handleError(err, $t('admin.failedToDeleteTheme')) });
		}
	}

	function getTemplateStyleLabel(theme: Theme): string {
		return BASE_TEMPLATE_PREVIEW[theme.baseTemplate]?.label || 'Custom style';
	}

	async function previewTheme(theme: Theme): Promise<void> {
		try {
			if (!previewThemeId) {
				const cfg = $siteConfigData;
				if (cfg?.template) {
					sessionStorage.setItem(
						THEME_PREVIEW_BACKUP_KEY,
						JSON.stringify(cfg.template),
					);
				}
			}
			const result = await applyThemeById(asId(theme._id));
			if (!result.ok) {
				adminToast.error({ title: result.error });
				return;
			}
			previewTemplate = theme.baseTemplate;
			previewThemeId = asId(theme._id);
			adminToast.info({
				title: $t('admin.templatesPreviewModeOn').replace('{name}', theme.name),
			});
		} catch (err) {
			adminToast.error({ title: handleError(err, $t('admin.failedToApplyTheme')) });
		}
	}

	async function clearPreview(): Promise<void> {
		try {
			const raw = sessionStorage.getItem(THEME_PREVIEW_BACKUP_KEY);
			if (raw) {
				const template = JSON.parse(raw) as SiteConfig['template'];
				const response = await fetch('/api/admin/site-config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ template }),
				});
				if (!response.ok) await handleApiErrorResponse(response);
				sessionStorage.removeItem(THEME_PREVIEW_BACKUP_KEY);
				await siteConfig.load();
			}
			previewTemplate = null;
			previewThemeId = null;
			adminToast.info({ title: $t('admin.templatesPreviewCleared') });
		} catch (err) {
			adminToast.error({ title: handleError(err, $t('admin.failedToApplyTheme')) });
		}
	}

	function openApplyPreview(): void {
		const id = previewThemeId;
		if (id) applyThemeId = id;
	}

</script>

<svelte:head>
	<title>{$t('admin.templateManagement')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-5xl mx-auto px-4">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<div class="flex flex-col gap-6 mb-6 lg:flex-row lg:items-start lg:justify-between">
				<div class="min-w-0 flex-1">
					<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.templates')}</h1>
					<div class="mt-3 text-sm space-y-1 rounded-lg border border-surface-200-800 bg-(--color-surface-50-950) px-3 py-2 max-w-xl">
						<p class="font-medium text-(--color-surface-900-100)">{$t('admin.templatesDefaultsHeading')}</p>
						<p>
							<span class="text-(--color-surface-600-400)">{$t('admin.templatesDefaultPublic')}:</span>
							<span class="ml-1 font-medium text-(--color-surface-950-50)">{defaultPublicThemeLabel}</span>
							<span class="text-(--color-surface-600-400)"> · {$t('admin.templatesDefaultPack')}</span>
							<span class="font-mono text-(--color-surface-900-100)">{frontendTemplate}</span>
						</p>
					</div>
					<p
						id="templates-preview-help"
						class="mt-2 text-xs text-(--color-surface-600-400) max-w-xl leading-snug"
					>
						{$t('admin.templatesPreviewHint')}
					</p>
					{#if previewTemplate}
						<p
							class="mt-2 max-w-xl rounded-md border border-[color-mix(in_oklab,#d97706_28%,transparent)] bg-[color-mix(in_oklab,#d97706_8%,transparent)] px-2 py-1.5 text-xs text-amber-950 dark:text-amber-100"
						>
							{$t('admin.templatesPreviewModeBanner').replace('{pack}', previewTemplate)}
						</p>
					{/if}
				</div>
				<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
					<button
						type="button"
						onclick={() => (showCreateModal = true)}
						class="{adminBtnSecondary} text-sm shrink-0"
					>
						+ {$t('admin.createNewTheme')}
					</button>
					<a href="/admin/templates/overrides" onclick={(e) => navigateAdmin('/admin/templates/overrides', e)} class="{adminBtnPrimarySm} {adminRingPrimary} shrink-0 text-center no-underline">
						{$t('admin.themeBuilder')}
					</a>
					{#if previewTemplate && previewThemeId}
						<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
							<button
								type="button"
								onclick={openApplyPreview}
								class="{adminBtnPrimarySm} {adminRingPrimary} shrink-0"
								title={$t('admin.applyPreview')}
							>
								{$t('admin.applyPreview')}
							</button>
						</div>
					{/if}
					{#if previewTemplate}
						<button
							type="button"
							onclick={() => void clearPreview()}
							class="{adminBtnSecondary} text-sm shrink-0"
							title={$t('admin.revertPreview')}
						>
							{$t('admin.revertPreview')}
						</button>
					{/if}
				</div>
			</div>

			{#if themesLoadError && !loading}
				<div
					class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
					role="alert"
				>
					{themesLoadError}
					<button
						type="button"
						class="{adminBtnSecondary} mt-3 text-sm"
						onclick={() => loadThemes()}
					>
						{$t('admin.dashboardRetry')}
					</button>
				</div>
			{/if}

			{#if loading}
				<div class="text-center py-12">
					<div
						class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-(--color-primary-600)"
					></div>
					<p class="mt-2 text-(--color-surface-600-400)">{$t('admin.loadingTemplates')}</p>
				</div>
			{:else if themes.length === 0 && !themesLoadError}
				<div class="text-center py-8 border-2 border-dashed border-surface-200-800 rounded-lg">
					<p class="text-(--color-surface-600-400) mb-4">{$t('admin.noTemplatesYetHint')}</p>
					<div class="flex flex-col sm:flex-row gap-2 justify-center">
						<button
							type="button"
							onclick={() => void seedBuiltInThemes()}
							disabled={seedingBuiltIn}
							class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
						>
							{seedingBuiltIn ? $t('admin.seedingBuiltInThemes') : $t('admin.seedBuiltInThemes')}
						</button>
						<button
							type="button"
							onclick={() => (showCreateModal = true)}
							class="{adminBtnSecondary}"
						>
							{$t('admin.createYourFirstTheme')}
						</button>
					</div>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each themes as theme}
						{@const packId = String(theme.baseTemplate || 'noir').toLowerCase()}
						<div class="border border-surface-200-800 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
							<ThemePackPreviewThumb {packId} />
							<div class="p-4">
								<div class="flex items-center gap-2">
									<h3 class="font-semibold text-(--color-surface-950-50)">{theme.name}</h3>
									{#if liveThemeId ? liveThemeId === asId(theme._id) : theme.baseTemplate === frontendTemplate}
										<span class={adminBadgePrimary}>
											{$t('admin.defaultThemeBadge')}
										</span>
									{/if}
									{#if previewTemplate === theme.baseTemplate}
										<span class={adminBadgeCaution}>
											{$t('admin.templatesPreviewingBadge')}
										</span>
									{/if}
								</div>
								<p class="text-xs text-(--color-surface-600-400) mt-1">
									{$t('admin.baseTemplateLabel')}: {theme.baseTemplate}{' '}
									{theme.basePalette ? `· ${theme.basePalette}` : ''}{' '}
									{theme.isBuiltIn ? `· ${$t('admin.builtIn')}` : ''}
								</p>
								<p class="text-xs text-(--color-surface-600-400) mt-1">{getTemplateStyleLabel(theme)}</p>
								<div class="flex flex-wrap gap-2 mt-3">
									<a
										href={`/admin/templates/overrides?themeId=${encodeURIComponent(asId(theme._id))}`}
										onclick={(e) => navigateAdmin(`/admin/templates/overrides?themeId=${encodeURIComponent(asId(theme._id))}`, e)}
										class="{adminBtnSmSecondary} no-underline shrink-0"
									>
										{$t('admin.edit')}
									</a>
									<button
										type="button"
										onclick={() => (applyThemeId = asId(theme._id))}
										class="{adminBtnSmPrimary} {adminRingPrimary} shrink-0"
									>
										{$t('admin.setAsDefaultTheme')}
									</button>
									<button
										type="button"
										onclick={() => void previewTheme(theme)}
										class="{adminBtnSmSecondary} shrink-0"
										title={$t('admin.previewCurrentPageTitle')}
										aria-label={$t('admin.previewCurrentPageTitle')}
										aria-describedby="templates-preview-help"
									>
										{$t('admin.previewThemeAction')}
									</button>
									<button
										type="button"
										onclick={() => {
											duplicateThemeId = asId(theme._id);
											duplicateName = `${theme.name} (copy)`;
										}}
										class="{adminBtnSmSecondary} shrink-0"
									>
										{$t('admin.duplicate')}
									</button>
									<button
										type="button"
										onclick={() => (deleteThemeId = asId(theme._id))}
										class="{adminBtnSmDanger} shrink-0"
									>
										{$t('admin.delete')}
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
			<h2 id="create-theme-title" class="text-lg font-semibold text-(--color-surface-950-50) mb-4">
				{$t('admin.createNewTheme')}
			</h2>
			<div class="space-y-4">
				<div>
					<label for="theme-name" class="{adminLabelClass}">
						<span class="{adminLabelTextClass}">{$t('admin.themeName')}</span>
					</label>
					<input
						id="theme-name"
						type="text"
						bind:value={createName}
						placeholder={$t('admin.themeNamePlaceholder')}
						class="{adminInputSmClass} {adminRingPrimary}"
					/>
				</div>
				<div>
					<label for="theme-base" class="{adminLabelClass}">
						<span class="{adminLabelTextClass}">{$t('admin.baseTheme')}</span>
					</label>
					<select
						id="theme-base"
						bind:value={createBaseTemplate}
						class="{adminSelectSmClass} {adminRingPrimary}"
					>
						<option value="noir">{$t('admin.baseThemeNoir')}</option>
						<option value="studio">{$t('admin.baseThemeStudio')}</option>
						<option value="atelier">{$t('admin.baseThemeAtelier')}</option>
					</select>
				</div>
				<div>
					<label for="theme-palette" class="{adminLabelClass}">
						<span class="{adminLabelTextClass}">{$t('admin.basePalette')}</span>
					</label>
					<select
						id="theme-palette"
						bind:value={createBasePalette}
						class="{adminSelectSmClass} {adminRingPrimary}"
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
					onclick={() => (showCreateModal = false)}
					class="{adminBtnSecondary}"
					>
						{$t('admin.cancel')}
					</button>
				<button
					type="button"
					onclick={createTheme}
					disabled={!createName.trim() || createSubmitting}
					class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
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
			<h2 id="duplicate-theme-title" class="text-lg font-semibold text-(--color-surface-950-50) mb-4">
				{$t('admin.duplicateTheme')}
			</h2>
			<div class="mb-4">
				<label for="duplicate-name" class="{adminLabelClass}">
					<span class="{adminLabelTextClass}">{$t('admin.newThemeName')}</span>
				</label>
				<input
					id="duplicate-name"
					type="text"
					bind:value={duplicateName}
					class="{adminInputSmClass} {adminRingPrimary}"
				/>
			</div>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					onclick={() => {
						duplicateThemeId = null;
						duplicateName = '';
					}}
					class="{adminBtnSecondary}"
				>
					{$t('admin.cancel')}
				</button>
				<button
					type="button"
					onclick={() => duplicateTheme(duplicateThemeId!, duplicateName)}
					class="{adminBtnPrimarySm} {adminRingPrimary}"
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
			<h2 id="apply-theme-title" class="text-lg font-semibold text-(--color-surface-950-50) mb-4">
				{$t('admin.setDefaultThemeQuestion')}
			</h2>
			<p class="text-(--color-surface-600-400) mb-4">
				{$t('admin.setDefaultThemeDescription')}
			</p>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					onclick={() => (applyThemeId = null)}
					class="{adminBtnSecondary}"
				>
					{$t('admin.cancel')}
				</button>
				<button
					type="button"
					onclick={() => applyTheme(applyThemeId!)}
					class="{adminBtnPrimarySm} {adminRingPrimary}"
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
			<h2 id="delete-theme-title" class="text-lg font-semibold text-(--color-surface-950-50) mb-4">
				{$t('admin.deleteThemeQuestion')}
			</h2>
			<p class="text-(--color-surface-600-400) mb-4">
				{$t('admin.deleteThemeDescription')}
			</p>
			<div class="flex justify-end gap-2">
				<button type="button" onclick={() => (deleteThemeId = null)} class="{adminBtnSecondary}">
					{$t('admin.cancel')}
				</button>
				<button type="button" onclick={() => deleteTheme(deleteThemeId!)} class="{adminBtnDanger}">
					{$t('admin.delete')}
				</button>
			</div>
		</div>
	</div>
{/if}
