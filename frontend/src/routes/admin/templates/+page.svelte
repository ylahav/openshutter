<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';
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

	import type { PageData } from './$types';
	import { routePageData } from '$lib/admin/routePageData';

	let { data }: { data: PageData } = $props();

	const pd = routePageData<PageData>();

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

	let themes = $state<Theme[]>([]);
	$effect(() => {
		themes = ($pd.themes ?? []) as Theme[];
	});

	let loading = $state(false);
	let showCreateModal = $state(false);
	let createSubmitting = $state(false);
	let createName = $state('');
	let createBaseTemplate = $state('noir');
	let createBasePalette = $state('light');
	let duplicateName = $state('');
	let duplicateThemeId: string | null = $state(null);
	let deleteThemeId: string | null = $state(null);
	let applyThemeId: string | null = $state(null);
	let previewTemplate: string | null = $state(null);
	let previewThemeId: string | null = $state(null);

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

const frontendTemplate = $derived($siteConfigData?.template?.frontendTemplate || $siteConfigData?.template?.activeTemplate || 'noir');
	const liveThemeId = $derived( $siteConfigData?.template?.activeThemeId);
	/** Resolved preset name from DB for the default public theme */
const defaultPublicThemeLabel = $derived(liveThemeId && themes.length > 0
			? themes.find((t) => t._id === liveThemeId)?.name ?? '—'
			: '—');

	onMount(async () => {
		await siteConfig.load();
	});

	async function refreshThemes() {
		await invalidate('admin:templates');
	}

	async function loadThemes() {
		await refreshThemes();
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
			const themeId = newTheme?._id;
			showCreateModal = false;
			createName = '';
			createBaseTemplate = 'noir';
			createBasePalette = 'light';
			adminToast.success({ title: $t('admin.themeCreatedSuccessfully') });
			if (newTheme) themes = [newTheme, ...themes];
			try {
				await loadThemes();
			} catch {
				// Keep optimistically added theme if reload fails
			}
			if (themeId) goto(`/admin/templates/overrides?themeId=${themeId}`);
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
			const newId = result.data?._id ?? result?._id;
			if (newId) goto(`/admin/templates/overrides?themeId=${newId}`);
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

	function previewTheme(theme: Theme): void {
		previewTemplate = theme.baseTemplate;
		previewThemeId = theme._id;
		adminToast.info({ title: $t('admin.templatesPreviewModeOn').replace('{name}', theme.name) });
	}

	function clearPreview(): void {
		previewTemplate = null;
		previewThemeId = null;
		adminToast.info({ title: $t('admin.templatesPreviewCleared') });
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
					<a href="/admin/templates/overrides" class="{adminBtnPrimarySm} {adminRingPrimary} shrink-0 text-center no-underline">
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
							onclick={clearPreview}
							class="{adminBtnSecondary} text-sm shrink-0"
							title={$t('admin.revertPreview')}
						>
							{$t('admin.revertPreview')}
						</button>
					{/if}
				</div>
			</div>

			{#if $pd.themesLoadError}
				<div class="text-center py-12">
					<p class="text-red-600">{$pd.themesLoadError}</p>
				</div>
			{:else if themes.length === 0}
				<div class="text-center py-8 border-2 border-dashed border-surface-200-800 rounded-lg">
					<p class="text-(--color-surface-600-400) mb-4">{$t('admin.noTemplatesYetRestartBackend')}</p>
					<button
						type="button"
						onclick={() => (showCreateModal = true)}
						class="{adminBtnPrimarySm} {adminRingPrimary}"
					>
						{$t('admin.createYourFirstTheme')}
					</button>
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
									{#if liveThemeId ? liveThemeId === theme._id : theme.baseTemplate === frontendTemplate}
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
										href="/admin/templates/overrides?themeId={theme._id}"
										class="{adminBtnSmSecondary} no-underline shrink-0"
									>
										{$t('admin.edit')}
									</a>
									<button
										type="button"
										onclick={() => (applyThemeId = theme._id)}
										class="{adminBtnSmPrimary} {adminRingPrimary} shrink-0"
									>
										{$t('admin.setAsDefaultTheme')}
									</button>
									<button
										type="button"
										onclick={() => previewTheme(theme)}
										class="{adminBtnSmSecondary} shrink-0"
										title={$t('admin.previewCurrentPageTitle')}
										aria-label={$t('admin.previewCurrentPageTitle')}
										aria-describedby="templates-preview-help"
									>
										{$t('admin.previewThemeAction')}
									</button>
									<button
										type="button"
										onclick={() => { duplicateThemeId = theme._id; duplicateName = `${theme.name} (copy)`; }}
										class="{adminBtnSmSecondary} shrink-0"
									>
										{$t('admin.duplicate')}
									</button>
									<button
										type="button"
										onclick={() => (deleteThemeId = theme._id)}
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
					onclick={() => { duplicateThemeId = null; duplicateName = ''; }}
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
