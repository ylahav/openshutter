<script lang="ts">
	import { onMount } from 'svelte';
	import type { SiteConfig } from '$lib/types/site-config';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { t } from '$stores/i18n';
	import { TEMPLATE_PACK_IDS } from '$lib/template-packs/ids';
	import { packClassPrefixFor } from '$lib/template/packs/class-prefix';

	interface TemplateListRow {
		templateName: string;
		displayName?: string;
		pageAliasPrefix?: string;
		visibility?: Record<string, boolean | undefined>;
	}

	interface TemplateComponentVisibility {
		hero: boolean;
		languageSelector: boolean;
		authButtons: boolean;
		footerMenu: boolean;
		statistics: boolean;
		promotion: boolean;
	}

	let loading = true;
	let saving = false;
	let message: string | null = null;
	let error: string | null = null;
	/** Effective public-site template key (matches backend merge rules). */
	let activeTemplate = 'noir';
	let templateSectionSnapshot: SiteConfig['template'] | undefined = undefined;
	let localVisibility: TemplateComponentVisibility = {
		hero: true,
		languageSelector: true,
		authButtons: true,
		footerMenu: true,
		statistics: true,
		promotion: true
	};

	let templatesList: TemplateListRow[] = [];
	let localPageAliasPrefixes: Record<string, string> = {
		noir: 'n',
		studio: 's',
		atelier: 'a'
	};

	const PREFIX_SAVE = /^[a-z0-9]{1,12}$/;

	function mergeDisplayPrefixes(
		saved: Record<string, string> | undefined,
		templates: TemplateListRow[]
	): Record<string, string> {
		const out: Record<string, string> = {};
		for (const id of TEMPLATE_PACK_IDS) {
			const s = saved?.[id]?.trim().toLowerCase();
			const api = templates.find((t) => t.templateName === id)?.pageAliasPrefix?.trim().toLowerCase();
			out[id] =
				s && PREFIX_SAVE.test(s)
					? s
					: api && PREFIX_SAVE.test(api)
						? api
						: packClassPrefixFor(id);
		}
		return out;
	}

	function normalizedPageAliasPrefixesForSave(p: Record<string, string>): Record<string, string> {
		const out: Record<string, string> = {};
		for (const id of TEMPLATE_PACK_IDS) {
			const raw = String(p[id] ?? '').trim().toLowerCase();
			const def = packClassPrefixFor(id);
			if (raw && PREFIX_SAVE.test(raw) && raw !== def) out[id] = raw;
		}
		return out;
	}

	function defaultsFromTemplateVisibility(
		v: Record<string, boolean | undefined> | undefined
	): TemplateComponentVisibility {
		return {
			hero: v?.hero ?? true,
			languageSelector: v?.languageSelector ?? true,
			authButtons: v?.authButtons ?? true,
			footerMenu: v?.footerMenu ?? true,
			statistics: v?.statistics ?? true,
			promotion: v?.promotion ?? true
		};
	}

	function mergeVisibility(
		defaults: TemplateComponentVisibility,
		overrides: Partial<TemplateComponentVisibility> | undefined
	): TemplateComponentVisibility {
		if (!overrides) return defaults;
		return {
			hero: overrides.hero !== undefined ? overrides.hero : defaults.hero,
			languageSelector:
				overrides.languageSelector !== undefined ? overrides.languageSelector : defaults.languageSelector,
			authButtons: overrides.authButtons !== undefined ? overrides.authButtons : defaults.authButtons,
			footerMenu: overrides.footerMenu !== undefined ? overrides.footerMenu : defaults.footerMenu,
			statistics: overrides.statistics !== undefined ? overrides.statistics : defaults.statistics,
			promotion: overrides.promotion !== undefined ? overrides.promotion : defaults.promotion
		};
	}

	/** Flat `admin.templateConfig*` keys — reactive so language switches update labels. */
	$: componentLabels = {
		hero: $t('admin.templateConfigHeroLabel'),
		languageSelector: $t('admin.templateConfigLanguageSelectorLabel'),
		authButtons: $t('admin.templateConfigAuthButtonsLabel'),
		footerMenu: $t('admin.templateConfigFooterMenuLabel'),
		statistics: $t('admin.templateConfigStatisticsLabel'),
		promotion: $t('admin.templateConfigPromotionLabel')
	};

	$: componentDescriptions = {
		hero: $t('admin.templateConfigHeroDescription'),
		languageSelector: $t('admin.templateConfigLanguageSelectorDescription'),
		authButtons: $t('admin.templateConfigAuthButtonsDescription'),
		footerMenu: $t('admin.templateConfigFooterMenuDescription'),
		statistics: $t('admin.templateConfigStatisticsDescription'),
		promotion: $t('admin.templateConfigPromotionDescription')
	};

	onMount(async () => {
		await loadConfig();
	});

	async function loadConfig() {
		try {
			loading = true;
			const [cfgRes, tplRes] = await Promise.all([
				fetch('/api/admin/site-config'),
				fetch('/api/admin/templates', { cache: 'no-store' })
			]);
			if (!cfgRes.ok) {
				error = 'Failed to load site configuration';
				return;
			}
			const result = await cfgRes.json();
			if (!result.success || !result.data) {
				error = result.error || 'Failed to load site configuration';
				return;
			}
			const config = result.data as SiteConfig;
			templateSectionSnapshot = config.template ? { ...config.template } : undefined;
			activeTemplate =
				config.template?.frontendTemplate || config.template?.activeTemplate || 'noir';

			let templates: TemplateListRow[] = [];
			if (tplRes.ok) {
				const tplJson = await tplRes.json();
				if (tplJson?.success && Array.isArray(tplJson.data)) {
					templates = tplJson.data as TemplateListRow[];
				}
			}
			templatesList = templates;
			localPageAliasPrefixes = mergeDisplayPrefixes(config.template?.pageAliasPrefixes, templates);
			const base = templates.find((t) => t.templateName === activeTemplate);
			const defaults = defaultsFromTemplateVisibility(base?.visibility);
			localVisibility = mergeVisibility(defaults, config.template?.componentVisibility);
		} catch (err) {
			logger.error('Failed to load config:', err);
			error = handleError(err, 'Failed to load template configuration');
		} finally {
			loading = false;
		}
	}

	function handleVisibilityChange(component: keyof TemplateComponentVisibility, value: boolean) {
		localVisibility = {
			...localVisibility,
			[component]: value
		};
	}

	function handlePageAliasPrefixChange(packId: (typeof TEMPLATE_PACK_IDS)[number], value: string) {
		localPageAliasPrefixes = { ...localPageAliasPrefixes, [packId]: value };
	}

	function buildTemplatePayload(
		visibility: TemplateComponentVisibility,
		opts?: { pageAliasPrefixesForSave?: Record<string, string> }
	) {
		const prev = templateSectionSnapshot || {};
		const fe = prev.frontendTemplate || prev.activeTemplate || activeTemplate;
		const ac = prev.activeTemplate || activeTemplate;
		const prefixSource = opts?.pageAliasPrefixesForSave ?? localPageAliasPrefixes;
		return {
			...prev,
			frontendTemplate: fe,
			activeTemplate: ac,
			componentVisibility: visibility,
			pageAliasPrefixes: normalizedPageAliasPrefixesForSave(prefixSource)
		};
	}

	async function handleSave() {
		try {
			saving = true;
			message = null;
			error = null;

			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					template: buildTemplatePayload(localVisibility)
				})
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			if (result.success) {
				message = 'Template configuration saved successfully!';
				if (result.data?.template) {
					templateSectionSnapshot = { ...result.data.template };
					localPageAliasPrefixes = mergeDisplayPrefixes(
						result.data.template.pageAliasPrefixes,
						templatesList
					);
				}
			} else {
				throw new Error(result.error || 'Failed to save template configuration');
			}
		} catch (err) {
			logger.error('Error saving template configuration:', err);
			error = 'Failed to save template configuration';
		} finally {
			saving = false;
		}
	}

	async function handleReset() {
		try {
			saving = true;
			message = null;
			error = null;

			const tplRes = await fetch('/api/admin/templates', { cache: 'no-store' });
			let templates: TemplateListRow[] = [];
			if (tplRes.ok) {
				const tplJson = await tplRes.json();
				if (tplJson?.success && Array.isArray(tplJson.data)) {
					templates = tplJson.data as TemplateListRow[];
				}
			}
			const base = templates.find((t) => t.templateName === activeTemplate);
			const resetVisibility = defaultsFromTemplateVisibility(base?.visibility);

			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					template: buildTemplatePayload(resetVisibility, { pageAliasPrefixesForSave: {} })
				})
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			if (result.success) {
				message = 'Template configuration reset to defaults!';
				localVisibility = resetVisibility;
				if (result.data?.template) {
					templateSectionSnapshot = { ...result.data.template };
				}
				localPageAliasPrefixes = mergeDisplayPrefixes(result.data?.template?.pageAliasPrefixes, templates);
				templatesList = templates;
			} else {
				throw new Error(result.error || 'Failed to reset template configuration');
			}
		} catch (err) {
			logger.error('Error resetting template configuration:', err);
			error = handleError(err, 'Failed to reset template configuration');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.sidebarNavTemplateLayout')} - {$t('navigation.admin')}</title>
</svelte:head>

{#if loading}
	<div class="py-8">
		<div class="max-w-4xl mx-auto px-4">
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
				<div class="animate-pulse">
					<div class="h-8 bg-(--color-surface-200-800) rounded w-1/3 mb-4"></div>
					<div class="space-y-4">
						{#each [1, 2, 3, 4, 5, 6] as i}
							<div class="h-16 bg-(--color-surface-200-800) rounded"></div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="py-8">
		<div class="max-w-4xl mx-auto px-4">
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950">
				<!-- Header -->
				<div class="px-6 py-4 border-b border-surface-200-800">
					<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.sidebarNavTemplateLayout')}</h1>
					<p class="text-(--color-surface-600-400) mt-1">{$t('admin.templateConfigSubtitle')}</p>
				</div>

				<!-- Content -->
				<div class="p-6">
					{#if error}
						<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
							<p class="text-red-800">{error}</p>
						</div>
					{/if}

					{#if message}
						<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
							<p class="text-green-800">{message}</p>
						</div>
					{/if}

					<!-- Current Template Info -->
					<div class="mb-8 p-4 bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] border border-[color-mix(in_oklab,var(--color-primary-500)_18%,transparent)] rounded-md">
						<h3 class="text-lg font-semibold text-(--color-primary-900) mb-2">{$t('admin.templateConfigCurrentTemplate')}</h3>
						<p class="text-(--color-primary-800)">
							<span class="font-medium">{$t('admin.templateConfigActiveTemplate')}</span> {activeTemplate}
						</p>
						<p class="text-(--color-primary-800) text-sm mt-1">
							{$t('admin.templateConfigCurrentDescription')}
						</p>
					</div>

					<!-- Component Visibility Settings -->
					<div class="space-y-6 mb-8">
						<h3 class="text-lg font-semibold text-(--color-surface-950-50)">{$t('admin.templateConfigComponentVisibility')}</h3>

						{#each Object.entries(componentLabels) as [component, label]}
							<div class="flex items-start space-x-4 p-4 border border-surface-200-800 rounded-lg">
								<div class="shrink-0">
									<input
										type="checkbox"
										id={component}
										checked={localVisibility[component as keyof TemplateComponentVisibility]}
										on:change={(e) =>
											handleVisibilityChange(
												component as keyof TemplateComponentVisibility,
												e.currentTarget.checked
											)}
										class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<label for={component} class="text-sm font-medium text-(--color-surface-950-50) cursor-pointer">
										{label}
									</label>
									<p class="text-sm text-(--color-surface-600-400) mt-1">
										{componentDescriptions[component as keyof typeof componentDescriptions]}
									</p>
								</div>
								<div class="shrink-0 self-start">
									{#if !localVisibility[component as keyof TemplateComponentVisibility]}
										<span
											class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
										>
											{$t('admin.templateConfigHidden')}
										</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					<details class="mb-8 rounded-lg border border-surface-200-800 border-dashed bg-(--color-surface-50-950)">
						<summary
							class="cursor-pointer select-none list-none px-4 py-3 text-sm font-medium text-(--color-surface-800-200) hover:bg-(--color-surface-100-900) rounded-lg [&::-webkit-details-marker]:hidden"
						>
							{$t('admin.templateConfigPageAliasesAdvancedSummary')}
						</summary>
						<div class="space-y-4 border-t border-surface-200-800 px-4 pb-4 pt-4">
							<h3 class="text-base font-semibold text-(--color-surface-950-50)">
								{$t('admin.templateConfigPageAliasesTitle')}
							</h3>
							<p class="text-sm text-(--color-surface-600-400)">
								{$t('admin.templateConfigPageAliasesDescription')}
							</p>
							<div class="space-y-3">
								{#each TEMPLATE_PACK_IDS as packId}
									{@const row = templatesList.find((t) => t.templateName === packId)}
									<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 border border-surface-200-800 rounded-lg bg-(--color-surface-50-950)">
										<label class="text-sm font-medium text-(--color-surface-950-50) shrink-0 min-w-32" for={`prefix-${packId}`}>
											{row?.displayName ?? packId}
										</label>
										<input
											id={`prefix-${packId}`}
											type="text"
											autocomplete="off"
											class="max-w-xs font-mono text-sm px-3 py-2 border border-surface-300-700 rounded-md bg-(--color-surface-50-950) text-(--color-surface-950-50) focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
											value={localPageAliasPrefixes[packId] ?? ''}
											on:input={(e) =>
												handlePageAliasPrefixChange(packId, e.currentTarget.value)}
										/>
										<p class="text-xs text-(--color-surface-600-400) sm:flex-1">
											{$t('admin.templateConfigPageAliasHint')}
										</p>
									</div>
								{/each}
							</div>
						</div>
					</details>

					<!-- Action Buttons -->
					<div class="mt-8 flex items-center justify-between">
						<button
							on:click={handleReset}
							disabled={saving}
							class="px-4 py-2 text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) border border-surface-300-700 rounded-md hover:bg-(--color-surface-50-950) disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{$t('admin.templateConfigResetToDefaults')}
						</button>

						<button
							on:click={handleSave}
							disabled={saving}
							class="px-6 py-2 text-sm font-medium text-white bg-(--color-primary-600) border border-transparent rounded-md hover:bg-(--color-primary-700) disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? $t('admin.templateConfigSaving') : $t('admin.templateConfigSaveConfiguration')}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
