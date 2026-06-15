<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import type { SiteConfig } from '$lib/types/site-config';
	import { adminToast } from '$lib/admin/adminToast';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
	import { ROLE_OPTIONS } from '$lib/constants/roles';
	import { siteConfig } from '$stores/siteConfig';
	import { Switch, Tabs } from '@skeletonlabs/skeleton-svelte';
	import { t } from '$stores/i18n';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { EXIF_DISPLAY_FIELDS } from '$lib/constants/exif-fields';
	import { IPTC_XMP_DISPLAY_FIELDS } from '$lib/constants/iptc-xmp-fields';
	import { resolveCollaborationVisibility } from '$lib/utils/collaboration-visibility';
	import { MultiLangUtils } from '$utils/multiLang';
	import AdminBrandingDropzone from '$lib/components/admin/AdminBrandingDropzone.svelte';
	import { browser } from '$app/environment';
	import {
		adminBtnPrimary,
		adminBtnPrimarySm,
		adminInputSmClass,
		adminSelectSmClass,
	} from '$lib/admin/admin-cerberus';
	import AdminConfirmDialog from '$lib/components/admin/AdminConfirmDialog.svelte';

	let config = $state<SiteConfig | null>(null);
	let descriptionValue = $state<any>({});
	let loading = $state(true);
	let saving = $state(false);
	let message = $state('');
	let activeTab = $state('basic');
	let availableLanguages = $state<Array<{ code: string; name: string; flag: string }>>([]);

	interface MenuItem {
		labelKey?: string;
		label?: string;
		href: string;
		external?: boolean;
		roles?: string[]; // Array of allowed roles: 'admin', 'owner', 'guest'
		showWhen?: 'always' | 'loggedIn' | 'loggedOut';
		type?: 'link' | 'login' | 'logout';
	}
	let menuItems = $state<MenuItem[]>([]);
	let navigationClearDialogOpen = $state(false);

	function openNavigationClearDialog() {
		navigationClearDialogOpen = true;
	}

	function closeNavigationClearDialog() {
		navigationClearDialogOpen = false;
	}

	function confirmClearNavigationMenu() {
		menuItems = [];
		closeNavigationClearDialog();
	}

	type SiteConfigTab = { id: string; labelKey: string };

	const CONFIG_TAB_GROUPS: { titleKey: string; tabs: SiteConfigTab[] }[] = [
		{
			titleKey: 'admin.siteConfigNavGroupIdentity',
			tabs: [
				{ id: 'basic', labelKey: 'admin.basicSettings' },
				{ id: 'languages', labelKey: 'admin.languageSettings' },
				{ id: 'branding', labelKey: 'admin.branding' },
			],
		},
		{
			titleKey: 'admin.siteConfigNavGroupDiscovery',
			tabs: [
				{ id: 'seo', labelKey: 'admin.seoSettings' },
				{ id: 'sharing', labelKey: 'admin.sharing' },
			],
		},
		{
			titleKey: 'admin.siteConfigNavGroupCommunication',
			tabs: [
				{ id: 'contact', labelKey: 'admin.contactTitle' },
				{ id: 'email', labelKey: 'admin.email' },
			],
		},
		{
			titleKey: 'admin.siteConfigNavGroupTechnical',
			tabs: [
				{ id: 'navigation', labelKey: 'admin.navigation' },
				{ id: 'exifMetadata', labelKey: 'admin.exifMetadata' },
				{ id: 'iptcXmpMetadata', labelKey: 'admin.iptcXmpMetadata' },
				{ id: 'home', labelKey: 'admin.services' },
			],
		},
	];

	function flattenSiteConfigTabs(): SiteConfigTab[] {
		return CONFIG_TAB_GROUPS.flatMap((g) => g.tabs);
	}

	let baselineSerialized = $state('');
	type BaselineClone = {
		config: SiteConfig;
		descriptionValue: Record<string, unknown>;
		menuItems: MenuItem[];
	};
	let baselineState = $state<BaselineClone | null>(null);

	let unsavedTabSwitchDialogOpen = $state(false);
	let pendingTabId = $state<string | null>(null);

	function sortKeysDeep(v: unknown): unknown {
		if (v === null || typeof v !== 'object') return v;
		if (Array.isArray(v)) return v.map(sortKeysDeep);
		const o = v as Record<string, unknown>;
		const sorted: Record<string, unknown> = {};
		for (const k of Object.keys(o).sort()) {
			sorted[k] = sortKeysDeep(o[k]);
		}
		return sorted;
	}

	function stableSerializePayload(obj: unknown): string {
		return JSON.stringify(sortKeysDeep(obj));
	}

	function getSavePayload(): Record<string, unknown> | null {
		if (!config) return null;
		return {
			title: config.title,
			description: descriptionValue,
			logo: config.logo,
			favicon: config.favicon,
			languages: config.languages,
			seo: config.seo,
			theme: config.theme,
			contact: config.contact,
			homePage: config.homePage,
			features: config.features,
			exifMetadata: config.exifMetadata,
			iptcXmpMetadata: config.iptcXmpMetadata,
			mail: config.mail,
			welcomeEmail: config.welcomeEmail,
			template: {
				...(config.template || {}),
				headerConfig: {
					...(config.template?.headerConfig || {}),
					menu: menuItems.length > 0 ? menuItems : [],
				},
			},
		};
	}

	function captureBaseline() {
		if (!config) return;
		try {
			baselineState = {
				config: structuredClone(config) as SiteConfig,
				descriptionValue: structuredClone(descriptionValue) as Record<string, unknown>,
				menuItems: structuredClone(menuItems),
			};
		} catch {
			baselineState = {
				config: JSON.parse(JSON.stringify(config)) as SiteConfig,
				descriptionValue: JSON.parse(JSON.stringify(descriptionValue)),
				menuItems: JSON.parse(JSON.stringify(menuItems)),
			};
		}
		const payload = getSavePayload();
		baselineSerialized = payload ? stableSerializePayload(payload) : '';
	}

	function discardToBaseline() {
		if (!baselineState) return;
		try {
			config = structuredClone(baselineState.config) as SiteConfig;
			descriptionValue = structuredClone(baselineState.descriptionValue);
			menuItems = structuredClone(baselineState.menuItems);
		} catch {
			config = JSON.parse(JSON.stringify(baselineState.config)) as SiteConfig;
			descriptionValue = JSON.parse(JSON.stringify(baselineState.descriptionValue));
			menuItems = JSON.parse(JSON.stringify(baselineState.menuItems));
		}
	}

	const isDirty = $derived(
		!!config &&
			!!baselineState &&
			(() => {
				const p = getSavePayload();
				return !!(p && stableSerializePayload(p) !== baselineSerialized);
			})()
	);

	function requestTabChange(next: string) {
		if (next === activeTab) return;
		if (!isDirty) {
			activeTab = next;
			return;
		}
		pendingTabId = next;
		unsavedTabSwitchDialogOpen = true;
	}

	function confirmDiscardAndSwitchTab() {
		discardToBaseline();
		if (pendingTabId) activeTab = pendingTabId;
		pendingTabId = null;
		unsavedTabSwitchDialogOpen = false;
		captureBaseline();
	}

	function closeUnsavedTabSwitchDialog() {
		unsavedTabSwitchDialogOpen = false;
		pendingTabId = null;
	}

	function stripHtmlForPreview(html: string): string {
		if (!html) return '';
		const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
		return stripped.length > 180 ? `${stripped.slice(0, 177)}…` : stripped;
	}

	const previewLang = $derived(config?.languages?.defaultLanguage || 'en');
	const seoPreviewTitle = $derived(
		String(
			MultiLangUtils.getValue(config?.seo?.metaTitle || {}, previewLang) ||
				MultiLangUtils.getValue(config?.title || {}, previewLang) ||
				''
		).trim()
	);
	const seoPreviewDescRaw = $derived(
		MultiLangUtils.getValue(config?.seo?.metaDescription || {}, previewLang)
	);
	const seoPreviewDesc = $derived(
		typeof seoPreviewDescRaw === 'string' ? stripHtmlForPreview(seoPreviewDescRaw) : ''
	);
	const seoPreviewHost = $derived($page.url.hostname || 'example.com');

	// Test email modal
	let showTestMailModal = $state(false);
	let testTo = $state('');
	let testSubject = $state('Test email');
	let testBody = $state('This is a test email.');
	let testMailResult = $state<'idle' | 'sending' | { success: true } | { success: false; error: string }>(
		'idle'
	);

	function normalizeWelcomeEmailMultiLang(data: any) {
		const welcomeEmail = data?.welcomeEmail || {};
		const normalizeField = (value: unknown) => {
			if (typeof value === 'string') {
				const trimmed = value.trim();
				return trimmed ? { en: trimmed } : {};
			}
			if (value && typeof value === 'object') return value as Record<string, string>;
			return {};
		};
		return {
			...welcomeEmail,
			subject: normalizeField(welcomeEmail.subject),
			body: normalizeField(welcomeEmail.body)
		};
	}

	type CollabService = 'comments' | 'tasks' | 'activity';
	type CollabAudience = 'public' | 'authenticated';

	function setCollabFlag(service: CollabService, audience: CollabAudience, value: boolean) {
		if (!config) return;
		const prev = config.features?.collaboration || {};
		const svcPrev = prev[service] || {};
		config = {
			...config,
			features: {
				...config.features,
				collaboration: {
					...prev,
					[service]: {
						...svcPrev,
						[audience]: value,
					},
				},
			},
		} as SiteConfig;
		syncEnableCommentsLegacy();
	}

	function setCollabServiceEnabled(service: CollabService, enabled: boolean) {
		if (!config) return;
		const prev = config.features?.collaboration || {};
		const svcPrev = prev[service] || {};
		config = {
			...config,
			features: {
				...config.features,
				collaboration: {
					...prev,
					[service]: {
						...svcPrev,
						enabled,
					},
				},
			},
		} as SiteConfig;
		syncEnableCommentsLegacy();
	}

	function syncEnableCommentsLegacy() {
		if (!config?.features?.collaboration) return;
		const vis = resolveCollaborationVisibility(config.features);
		const anyOn =
			(vis.comments.enabled && (vis.comments.public || vis.comments.authenticated)) ||
			(vis.tasks.enabled && (vis.tasks.public || vis.tasks.authenticated)) ||
			(vis.activity.enabled && (vis.activity.public || vis.activity.authenticated));
		config.features.enableComments = anyOn;
	}

	const collabVisAdmin = $derived(config ? resolveCollaborationVisibility(config.features) : null);

	onMount(async () => {
		await Promise.all([loadConfig(), loadAvailableLanguages()]);
		const tab = get(page).url.searchParams.get('tab');
		if (tab === 'template') {
			activeTab = 'basic';
			goto('/admin/site-config', { replaceState: true });
		} else if (tab && flattenSiteConfigTabs().some((t) => t.id === tab)) {
			activeTab = tab;
		}
	});

	onMount(() => {
		function beforeUnload(e: BeforeUnloadEvent) {
			if (!browser || !config || !baselineState) return;
			const p = getSavePayload();
			if (!p || stableSerializePayload(p) === baselineSerialized) return;
			e.preventDefault();
			e.returnValue = '';
		}
		window.addEventListener('beforeunload', beforeUnload);
		return () => window.removeEventListener('beforeunload', beforeUnload);
	});

	async function loadConfig() {
		try {
			const response = await fetch('/api/admin/site-config');
			const result = await response.json().catch(() => ({}));

			if (!response.ok) {
				const serverMessage = result?.error || result?.message || `HTTP ${response.status}`;
				message = serverMessage;
				return;
			}

			// Handle the response format: { success: true, data: config } or direct config
			const data = result.success ? result.data : result;

			if (!data) {
				message = result?.error || 'No configuration data received';
				return;
			}

			// Ensure socialMedia object is properly initialized
			if (data.contact && (!data.contact.socialMedia || typeof data.contact.socialMedia !== 'object')) {
				data.contact.socialMedia = {
					facebook: '',
					instagram: '',
					flickr: '',
					twitter: '',
					linkedin: ''
				};
			}
			if (data.seo && Array.isArray((data.seo as { metaKeywords?: unknown }).metaKeywords)) {
				const def = data.languages?.defaultLanguage || 'en';
				const arr = (data.seo as { metaKeywords: string[] }).metaKeywords;
				(data.seo as SiteConfig['seo']).metaKeywords = {
					[def]: arr.map((k) => String(k).trim()).filter((k) => k.length > 0).join(', ')
				};
			}
			data.welcomeEmail = normalizeWelcomeEmailMultiLang(data);
			config = data;
			descriptionValue = data.description || {};

			// Initialize menu items from config
			menuItems = data.template?.headerConfig?.menu || [];
			captureBaseline();
		} catch (error) {
			logger.error('Error loading site config:', error);
			message = error instanceof Error ? error.message : 'Failed to load configuration';
		} finally {
			loading = false;
		}
	}

	async function loadAvailableLanguages() {
		try {
			const response = await fetch('/api/admin/languages');
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					availableLanguages = data.data;
				} else {
					// Fallback to default languages
					availableLanguages = SUPPORTED_LANGUAGES.map((lang) => ({
						code: lang.code,
						name: lang.name,
						flag: lang.flag || ''
					}));
				}
			} else {
				// Fallback to default languages
				availableLanguages = SUPPORTED_LANGUAGES.map((lang) => ({
					code: lang.code,
					name: lang.name,
					flag: lang.flag || ''
				}));
			}
		} catch (error) {
			logger.error('Error loading available languages:', error);
			// Fallback to default languages
			availableLanguages = SUPPORTED_LANGUAGES.map((lang) => ({
				code: lang.code,
				name: lang.name,
				flag: lang.flag || ''
			}));
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!config) return;

		saving = true;
		message = '';

		try {
			const payload = getSavePayload();
			if (!payload) return;

			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			const data = result?.success ? result.data : result;
			data.welcomeEmail = normalizeWelcomeEmailMultiLang(data);
			config = data;
			descriptionValue = data.description || {};
			// Reload menu items from saved config
			menuItems = data.template?.headerConfig?.menu || [];
			adminToast.success({
				title: get(t)('admin.configurationSaved'),
				description: get(t)('admin.configurationSavedMessage'),
			});

			// Refresh the site config store so Header and Menu components pick up the changes
			await siteConfig.load();
			
			// Give the store a moment to update, then reload to ensure all components pick up changes
			// The reload ensures Header components on other pages also get the updated config
			setTimeout(() => {
				if (typeof window !== 'undefined') {
					window.location.reload();
				}
			}, 500);
		} catch (error) {
			logger.error('Error saving site config:', error);
			const errMsg = handleError(error, 'Failed to save configuration');
			adminToast.error({
				title: get(t)('admin.saveFailed'),
				description: errMsg,
			});
		} finally {
			saving = false;
		}
	}

	function updateConfig(field: string, value: any) {
		if (!config) return;
		config = { ...config, [field]: value } as SiteConfig;
	}

	function updateLanguages(activeLanguages: string[], defaultLanguage: string) {
		if (!config) return;
		config = {
			...config,
			languages: {
				...config.languages,
				activeLanguages,
				defaultLanguage
			}
		} as SiteConfig;
	}

	function openTestMailModal() {
		testTo = '';
		testSubject = 'Test email';
		testBody = 'This is a test email.';
		testMailResult = 'idle';
		showTestMailModal = true;
	}

	function closeTestMailModal() {
		showTestMailModal = false;
		testMailResult = 'idle';
	}

	async function sendTestEmail(e: SubmitEvent) {
		e.preventDefault();
		if (!testTo.trim()) return;
		testMailResult = 'sending';
		try {
			const response = await fetch('/api/admin/site-config/test-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ to: testTo.trim(), subject: testSubject, body: testBody }),
			});
			const result = await response.json();
			if (result.success) {
				testMailResult = { success: true };
				adminToast.success({ title: 'Email sent successfully', description: 'Check the recipient inbox.' });
			} else {
				testMailResult = { success: false, error: result.error || 'Failed to send' };
			}
		} catch (err) {
			logger.error('Send test email error:', err);
			testMailResult = { success: false, error: handleError(err, 'Failed to send test email') };
		}
	}

	async function handleFileUpload(
		file: File,
		type: 'logo' | 'favicon' | 'whiteLabelLogo' | 'whiteLabelFavicon'
	) {
		if (!config) return;

		// Validate file size (5MB limit)
		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			adminToast.error({ title: 'File size must be less than 5MB' });
			return;
		}

		// Validate file type
		const allowedTypes =
			type === 'logo' || type === 'whiteLabelLogo'
				? ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
				: ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/jpeg'];
		
		if (!allowedTypes.includes(file.type)) {
			adminToast.error({
				title: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
			});
			return;
		}

		try {
			// Create FormData
			const formData = new FormData();
			formData.append('file', file);

			// Upload file
			const response = await fetch('/api/admin/site-config/upload-asset', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			
			// Update config with the uploaded URL
			if (type === 'logo') {
				config = { ...config, logo: result.url } as SiteConfig;
			} else if (type === 'favicon') {
				config = { ...config, favicon: result.url } as SiteConfig;
			} else if (type === 'whiteLabelLogo') {
				config = {
					...config,
					whiteLabel: { ...(config.whiteLabel || {}), logo: result.url }
				} as SiteConfig;
			} else {
				config = {
					...config,
					whiteLabel: { ...(config.whiteLabel || {}), favicon: result.url }
				} as SiteConfig;
			}

			const labelKey =
				type === 'logo' || type === 'whiteLabelLogo' ? 'Logo' : 'Favicon';
			adminToast.success({ title: `${labelKey} uploaded successfully.` });
		} catch (error) {
			logger.error(`Failed to upload ${type}:`, error);
			adminToast.error({ title: handleError(error, `Failed to upload ${type}`) });
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.siteConfiguration')} - {$t('navigation.admin')}</title>
</svelte:head>

{#if loading}
	<div class="min-h-[50vh] flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary-600) mx-auto"></div>
			<p class="mt-4 text-(--color-surface-600-400)">Loading configuration...</p>
		</div>
	</div>
{:else if !config}
	<div class="min-h-[50vh] flex items-center justify-center">
		<div class="text-center max-w-md px-4">
			<p class="text-red-600 font-medium">Failed to load configuration</p>
			{#if message}
				<p class="mt-2 text-sm text-(--color-surface-600-400)">{message}</p>
			{/if}
		</div>
	</div>
{:else}
	<div class="py-6 lg:py-8">
		<div class="max-w-6xl mx-auto px-4">
			<div class="mb-4">
				<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.siteConfiguration')}</h1>
			</div>

			{#if isDirty}
				<div
					class="mb-4 flex items-start gap-3 rounded-lg border border-amber-400/70 bg-[color-mix(in_oklab,var(--color-warning-500)_14%,transparent)] px-4 py-3 text-sm text-(--color-surface-900-100)"
					role="status"
				>
					<svg
						class="h-5 w-5 shrink-0 text-amber-800 dark:text-amber-200 mt-0.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					<p class="leading-snug">{$t('admin.siteConfigUnsavedBanner')}</p>
				</div>
			{/if}

			{#if message}
				<div
					class="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 shadow-sm dark:border-red-800/80 dark:bg-red-950/40 dark:text-red-100"
					role="alert"
				>
					<div class="flex items-start gap-3">
						<svg
							class="mt-0.5 h-6 w-6 shrink-0 text-red-600 dark:text-red-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div>
							<h3 class="text-lg font-semibold">Error</h3>
							<p class="text-sm text-red-700 dark:text-red-200">{message}</p>
						</div>
					</div>
				</div>
			{/if}

			<form onsubmit={(e) => {
				e.preventDefault();
				handleSubmit(e);
			}} class="flex flex-col lg:flex-row gap-6">
				<Tabs
					class="flex min-w-0 flex-col gap-6 lg:flex-row w-full"
					value={activeTab}
					onValueChange={(d) => requestTabChange(d.value)}
					orientation="vertical"
				>
					<!-- Sidebar nav: dropdown on small screens, vertical list on lg+ -->
					<aside class="lg:w-56 shrink-0">
						<div class="card preset-outlined-surface-200-800 bg-surface-50-950 overflow-hidden">
							<label for="site-config-tab-select" class="sr-only">
								{$t('admin.configurationSection')}
							</label>
							<select
								id="site-config-tab-select"
								class="select lg:hidden w-full py-3 px-4 text-sm font-medium border-0 border-b border-surface-200-800 rounded-t-lg"
								value={activeTab}
								onchange={(e) =>
									requestTabChange((e.currentTarget as HTMLSelectElement).value)}
							>
								{#each CONFIG_TAB_GROUPS as group}
									<optgroup label={$t(group.titleKey)}>
										{#each group.tabs as tab}
											<option value={tab.id}>{$t(tab.labelKey)}</option>
										{/each}
									</optgroup>
								{/each}
							</select>
							<Tabs.List
								class="hidden lg:flex flex-col py-1 w-full gap-0"
								aria-label={$t('admin.configurationSections')}
							>
								{#each CONFIG_TAB_GROUPS as group}
									<div class="pt-3 first:pt-0 border-t border-surface-200-800 first:border-t-0">
										<p
											class="px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-(--color-surface-500-500)"
										>
											{$t(group.titleKey)}
										</p>
										<div class="flex flex-col">
											{#each group.tabs as tab}
												<Tabs.Trigger
													value={tab.id}
													class="w-full text-left py-2 px-4 text-sm font-medium border-l-2 border-transparent text-(--color-surface-600-400) hover:bg-(--color-surface-50-950) data-selected:bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] data-selected:text-(--color-primary-700) data-selected:border-(--color-primary-600) rounded-none"
												>
													{$t(tab.labelKey)}
												</Tabs.Trigger>
											{/each}
										</div>
									</div>
								{/each}
								<Tabs.Indicator />
							</Tabs.List>
						</div>
					</aside>

					<!-- Tab content -->
					<div class="min-w-0 flex-1 card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
						<Tabs.Content value="basic">
						<div class="grid grid-cols-1 gap-6">
							<div>
								<label for="site-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.siteTitle')}
								</label>
								<MultiLangInput
									id="site-title"
									value={config.title || {}}
									onChange={(value) => updateConfig('title', value)}
									placeholder={$t('admin.enterSiteTitlePlaceholder')}
									required={true}
									maxLength={100}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
							</div>

							<div>
								<label for="site-description" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.siteDescription')}
								</label>
								<MultiLangHTMLEditor
									id="site-description"
									value={descriptionValue}
									onChange={(value) => {
										descriptionValue = value;
									}}
									placeholder={$t('admin.enterSiteDescriptionPlaceholder')}
									height={150}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
							</div>
						</div>
						</Tabs.Content>
						<Tabs.Content value="languages">
						<div class="space-y-4">
							<fieldset class="space-y-2">
								<legend class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.activeLanguages')}
								</legend>
								<p class="text-sm text-(--color-surface-600-400) mb-3">
									{$t('admin.selectLanguagesDescription')}
								</p>
								<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
									{#each availableLanguages as lang}
										{@const isActive = config?.languages?.activeLanguages?.includes(lang.code) || false}
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												type="checkbox"
												checked={isActive}
												onchange={(e) => {
													if (!config) return;
													const currentLanguages = config.languages?.activeLanguages || [];
													const newLanguages = e.currentTarget.checked
														? [...currentLanguages, lang.code]
														: currentLanguages.filter((l: string) => l !== lang.code);
													updateLanguages(
														newLanguages,
														config.languages?.defaultLanguage || 'en'
													);
												}}
												class="rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
											/>
											<span class="text-lg">{lang.flag}</span>
											<span class="text-sm text-(--color-surface-800-200)">{lang.name}</span>
										</label>
									{/each}
								</div>
							</fieldset>
							<div>
								<label for="defaultLanguage" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">
									{$t('admin.defaultLanguage')}
								</label>
								<select
									id="defaultLanguage"
									value={config?.languages?.defaultLanguage || 'en'}
									onchange={(e) => {
										if (!config) return;
										updateLanguages(
											config.languages?.activeLanguages || ['en'],
											e.currentTarget.value
										);
									}}
									class={adminSelectSmClass}
								>
									{#each (config?.languages?.activeLanguages || ['en']) as langCode}
										{@const lang = availableLanguages.find((l) => l.code === langCode)}
										<option value={langCode}>{lang?.name || langCode}</option>
									{/each}
								</select>
								<p class="text-xs text-(--color-surface-600-400) mt-1">
									{$t('admin.defaultLanguageDescription')}
								</p>
							</div>
						</div>
						</Tabs.Content>
						<Tabs.Content value="branding">
						<div class="grid grid-cols-1 gap-6">
							<!-- Logo -->
							<div>
								<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.logo')}
								</span>
								<AdminBrandingDropzone
									accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
									previewUrl={config.logo}
									previewVariant="logo"
									hint={$t('admin.brandingDropzoneHint')}
									formatsHint={$t('admin.brandingDropzoneFormatsLogo')}
									onFile={(f) => handleFileUpload(f, 'logo')}
								/>
								<p class="mt-2 text-xs text-(--color-surface-600-400)">
									{$t('admin.brandingLogoHelp')}
								</p>
								{#if config.logo}
									<div class="mt-3">
										<label for="logo-url" class="block text-xs text-(--color-surface-600-400) mb-2">{$t('admin.brandingCurrentLogoUrl')}</label>
										<input
											id="logo-url"
											type="text"
											value={config.logo}
											oninput={(e) => updateConfig('logo', e.currentTarget.value)}
											placeholder="/api/storage/serve/..."
											class={adminInputSmClass}
										/>
									</div>
								{/if}
							</div>

							<!-- Favicon -->
							<div>
								<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.favicon')}
								</span>
								<AdminBrandingDropzone
									accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg"
									previewUrl={config.favicon}
									previewVariant="favicon"
									hint={$t('admin.brandingDropzoneHint')}
									formatsHint={$t('admin.brandingDropzoneFormatsFavicon')}
									onFile={(f) => handleFileUpload(f, 'favicon')}
								/>
								<p class="mt-2 text-xs text-(--color-surface-600-400)">
									{$t('admin.brandingFaviconHelp')}
								</p>
								{#if config.favicon}
									<div class="mt-3">
										<label for="favicon-url" class="block text-xs text-(--color-surface-600-400) mb-2">{$t('admin.brandingCurrentFaviconUrl')}</label>
										<input
											id="favicon-url"
											type="text"
											value={config.favicon}
											oninput={(e) => updateConfig('favicon', e.currentTarget.value)}
											placeholder="/api/storage/serve/..."
											class={adminInputSmClass}
										/>
									</div>
								{/if}
							</div>

							<!-- White-label -->
							<div class="border-t border-surface-200-800 pt-6 mt-6">
								<h3 class="text-sm font-medium text-(--color-surface-950-50) mb-3">{$t('admin.whiteLabelSectionTitle')}</h3>
								<p class="text-xs text-(--color-surface-600-400) mb-4">
									{$t('admin.whiteLabelSectionHelp')}
								</p>
								<div class="space-y-4">
									<div>
										<label for="wl-product-name" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
											{$t('admin.whiteLabelProductName')}
										</label>
										<MultiLangInput
											id="wl-product-name"
											value={config.whiteLabel?.productName || {}}
											onChange={(value) => {
												if (!config) return;
												config = {
													...config,
													whiteLabel: { ...(config.whiteLabel || {}), productName: value }
												} as SiteConfig;
											}}
											placeholder={$t('admin.whiteLabelProductNamePlaceholder')}
											showLanguageTabs={true}
											defaultLanguage={config.languages?.defaultLanguage || 'en'}
										/>
										<p class="mt-1 text-xs text-(--color-surface-600-400)">{$t('admin.whiteLabelProductNameHelp')}</p>
									</div>
									<p class="text-xs text-(--color-surface-600-400)">{$t('admin.whiteLabelAssetsHelp')}</p>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div class="space-y-2">
											<label for="wl-logo-url" class="block text-sm font-medium text-(--color-surface-800-200)"
												>{$t('admin.whiteLabelLogoUrl')}</label
											>
											<input
												id="wl-logo-url"
												type="text"
												value={config?.whiteLabel?.logo ?? ''}
												oninput={(e) =>
													config &&
													updateConfig('whiteLabel', {
														...(config.whiteLabel || {}),
														logo: e.currentTarget.value || undefined
													})}
												placeholder="/api/storage/serve/..."
												class={adminInputSmClass}
											/>
											<AdminBrandingDropzone
												accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
												previewUrl={config?.whiteLabel?.logo}
												previewVariant="logo"
												hint={$t('admin.brandingDropzoneHint')}
												formatsHint={$t('admin.brandingDropzoneFormatsLogo')}
												onFile={(f) => handleFileUpload(f, 'whiteLabelLogo')}
											/>
										</div>
										<div class="space-y-2">
											<label for="wl-favicon-url" class="block text-sm font-medium text-(--color-surface-800-200)"
												>{$t('admin.whiteLabelFaviconUrl')}</label
											>
											<input
												id="wl-favicon-url"
												type="text"
												value={config?.whiteLabel?.favicon ?? ''}
												oninput={(e) =>
													config &&
													updateConfig('whiteLabel', {
														...(config.whiteLabel || {}),
														favicon: e.currentTarget.value || undefined
													})}
												placeholder="/api/storage/serve/..."
												class={adminInputSmClass}
											/>
											<AdminBrandingDropzone
												accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg"
												previewUrl={config?.whiteLabel?.favicon}
												previewVariant="favicon"
												hint={$t('admin.brandingDropzoneHint')}
												formatsHint={$t('admin.brandingDropzoneFormatsFavicon')}
												onFile={(f) => handleFileUpload(f, 'whiteLabelFavicon')}
											/>
										</div>
									</div>
									<label class="flex items-center gap-2">
										<input
											type="checkbox"
											checked={config?.whiteLabel?.hideOpenShutterBranding ?? false}
											onchange={(e) => config && updateConfig('whiteLabel', { ...(config.whiteLabel || {}), hideOpenShutterBranding: e.currentTarget.checked })}
											class="rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
										/>
										<span class="text-sm text-(--color-surface-800-200)">{$t('admin.whiteLabelHideOpenShutter')}</span>
									</label>
									<div>
										<label for="terms-url" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">{$t('admin.whiteLabelTermsUrl')}</label>
										<input
											id="terms-url"
											type="url"
											value={config?.whiteLabel?.termsOfServiceUrl ?? ''}
											oninput={(e) => config && updateConfig('whiteLabel', { ...(config.whiteLabel || {}), termsOfServiceUrl: e.currentTarget.value || undefined })}
											placeholder="https://..."
											class={adminInputSmClass}
										/>
									</div>
									<div>
										<label for="privacy-url" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">{$t('admin.whiteLabelPrivacyUrl')}</label>
										<input
											id="privacy-url"
											type="url"
											value={config?.whiteLabel?.privacyPolicyUrl ?? ''}
											oninput={(e) => config && updateConfig('whiteLabel', { ...(config.whiteLabel || {}), privacyPolicyUrl: e.currentTarget.value || undefined })}
											placeholder="https://..."
											class={adminInputSmClass}
										/>
									</div>
								</div>
							</div>
						</div>
						</Tabs.Content>
						<Tabs.Content value="seo">
						<div class="grid grid-cols-1 gap-6">
							<!-- Meta Title -->
							<div>
								<label for="meta-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.metaTitle')}
								</label>
								<MultiLangInput
									id="meta-title"
									value={config.seo?.metaTitle || {}}
									onChange={(value) => {
										if (!config) return;
										config = {
											...(config),
											seo: {
												...config.seo,
												metaTitle: value
											}
										} as SiteConfig;
									}}
									placeholder={$t('admin.seoMetaTitleInputPlaceholder')}
									maxLength={60}
									recommendedMinLength={50}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									{$t('admin.seoMetaTitleHelp')}
								</p>
							</div>

							<!-- Meta Description -->
							<div>
								<label for="meta-description" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.metaDescription')}
								</label>
								<MultiLangInput
									id="meta-description"
									value={config.seo?.metaDescription || {}}
onChange={(value) => {
										if (!config) return;
										config = {
											...(config),
											seo: {
												...config.seo,
												metaDescription: value
											}
										} as SiteConfig;
									}}
									placeholder={$t('admin.seoMetaDescriptionInputPlaceholder')}
									maxLength={160}
									multiline={true}
									rows={3}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									{$t('admin.seoMetaDescriptionHelp')}
								</p>
							</div>

							<div
								class="rounded-lg border border-surface-200-800 bg-(--color-surface-50-950) p-4 shadow-sm"
							>
								<p
									class="text-xs font-semibold uppercase tracking-wide text-(--color-surface-500-500) mb-3"
								>
									{$t('admin.seoSearchPreviewTitle')}
								</p>
								<div class="max-w-xl space-y-1 font-[Arial,Helvetica,sans-serif]">
									<p
										class="text-[1.125rem] leading-snug text-[#1a0dab] dark:text-[#8ab4f8] line-clamp-2"
									>
										{seoPreviewTitle || $t('admin.seoSearchPreviewTitlePlaceholder')}
									</p>
									<p class="text-sm text-[#006621] dark:text-[#81c995]">
										https://{seoPreviewHost}
									</p>
									<p class="text-sm leading-snug text-(--color-surface-600-400) line-clamp-2">
										{seoPreviewDesc || $t('admin.seoSearchPreviewDescriptionFallback')}
									</p>
								</div>
							</div>

							<!-- Meta Keywords -->
							<div>
								<label for="meta-keywords" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.metaKeywords')}
								</label>
								<MultiLangInput
									id="meta-keywords"
									value={config.seo?.metaKeywords || {}}
									onChange={(value) => {
										if (!config) return;
										config = {
											...(config),
											seo: {
												...config.seo,
												metaKeywords: value
											}
										} as SiteConfig;
									}}
									placeholder={$t('admin.metaKeywordsPlaceholder')}
								/>
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									{$t('admin.metaKeywordsHelp')}
								</p>
							</div>

							<!-- OG Image -->
							<div>
								<label for="og-image" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.ogImageUrlLabel')}
								</label>
								<input
									id="og-image"
									type="text"
									value={config.seo?.ogImage || ''}
oninput={(e) => {
												if (!config) return;
												config = {
													...(config),
													seo: {
														...config.seo,
														ogImage: e.currentTarget.value
											}
										} as SiteConfig;
									}}
									placeholder={$t('admin.ogImageUrlPlaceholder')}
									class={adminInputSmClass}
								/>
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									{$t('admin.ogImageHelp')}
								</p>
								{#if config.seo?.ogImage}
									<div class="mt-3">
										<p class="text-xs text-(--color-surface-600-400) mb-2">{$t('admin.seoOgPreviewLabel')}</p>
										<img
											src={config.seo.ogImage}
											alt={$t('admin.seoOgPreviewAlt')}
											class="max-w-md h-32 object-contain border border-surface-200-800 rounded p-2 bg-(--color-surface-50-950)"
											onerror={(e) => {
												(e.currentTarget as HTMLImageElement).style.display = 'none';
											}}
										/>
									</div>
								{/if}
							</div>
						</div>
						</Tabs.Content>
						<Tabs.Content value="contact">
						<div class="grid grid-cols-1 gap-6">
							<!-- Email -->
							<div>
								<label for="contact-email" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.contactEmail')}
								</label>
								<input
									id="contact-email"
									type="email"
									value={config.contact?.email || ''}
									oninput={(e) => {
										if (!config) return;
										config = {
											...(config),
											contact: {
												...config.contact,
												email: e.currentTarget.value
											}
										} as SiteConfig;
									}}
									placeholder="contact@example.com"
									class={adminInputSmClass}
								/>
							</div>

							<!-- Phone -->
							<div>
								<label for="contact-phone" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.contactPhone')}
								</label>
								<input
									id="contact-phone"
									type="tel"
									value={config.contact?.phone || ''}
									oninput={(e) => {
										if (!config) return;
										config = {
											...(config),
											contact: {
												...config.contact,
												phone: e.currentTarget.value
											}
										} as SiteConfig;
									}}
									placeholder="+1 (555) 123-4567"
									class={adminInputSmClass}
								/>
							</div>

							<!-- Address -->
							<div>
								<label for="contact-address" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.contactAddress')}
								</label>
								<MultiLangInput
									id="contact-address"
									value={config.contact?.address || {}}
									onChange={(value) => {
										if (!config) return;
										config = {
											...(config),
											contact: {
												...config.contact,
												address: value
											}
										} as SiteConfig;
									}}
									placeholder={$t('admin.contactAddressPlaceholder')}
									multiline={true}
									rows={3}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
							</div>

							<!-- Social Media -->
							<div class="border-t border-surface-200-800 pt-6">
								<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-4">{$t('admin.contactSocialMedia')}</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<!-- Facebook -->
									<div>
										<label for="social-facebook" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
											{$t('admin.contactFacebookUrl')}
										</label>
										<input
											id="social-facebook"
											type="text"
											value={config.contact?.socialMedia?.facebook || ''}
											oninput={(e) => {
												if (!config) return;
												config = {
													...(config),
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															facebook: e.currentTarget.value
														}
													}
												} as SiteConfig;
											}}
											placeholder="https://facebook.com/yourpage"
											class={adminInputSmClass}
										/>
									</div>

									<!-- Instagram -->
									<div>
										<label for="social-instagram" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
											{$t('admin.contactInstagramUrl')}
										</label>
										<input
											id="social-instagram"
											type="text"
											value={config.contact?.socialMedia?.instagram || ''}
											oninput={(e) => {
												if (!config) return;
												config = {
													...(config),
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															instagram: e.currentTarget.value
														}
													}
												} as SiteConfig;
											}}
											placeholder="https://instagram.com/yourprofile"
											class={adminInputSmClass}
										/>
									</div>

									<!-- Flickr -->
									<div>
										<label for="social-flickr" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
											Flickr
										</label>
										<input
											id="social-flickr"
											type="text"
											value={config.contact?.socialMedia?.flickr || ''}
											oninput={(e) => {
												if (!config) return;
												config = {
													...(config),
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															flickr: e.currentTarget.value
														}
													}
												} as SiteConfig;
											}}
											placeholder="https://flickr.com/photos/yourprofile"
											class={adminInputSmClass}
										/>
									</div>

									<!-- Twitter -->
									<div>
										<label for="social-twitter" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
											{$t('admin.contactTwitterUrl')}
										</label>
										<input
											id="social-twitter"
											type="text"
											value={config.contact?.socialMedia?.twitter || ''}
											oninput={(e) => {
												if (!config) return;
												config = {
													...(config),
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															twitter: e.currentTarget.value
														}
													}
												} as SiteConfig;
											}}
											placeholder="https://twitter.com/yourhandle"
											class={adminInputSmClass}
										/>
									</div>

									<!-- LinkedIn -->
									<div>
										<label for="social-linkedin" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
											{$t('admin.contactLinkedinUrl')}
										</label>
										<input
											id="social-linkedin"
											type="text"
											value={config.contact?.socialMedia?.linkedin || ''}
											oninput={(e) => {
												if (!config) return;
												config = {
													...(config),
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															linkedin: e.currentTarget.value
														}
													}
												} as SiteConfig;
											}}
											placeholder="https://linkedin.com/company/yourcompany"
											class={adminInputSmClass}
										/>
									</div>
								</div>
							</div>
						</div>
						</Tabs.Content>
						<Tabs.Content value="home">
						<div class="grid grid-cols-1 gap-6">
							<!-- Contact Title -->
							<div>
								<label for="home-contact-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('admin.contactSectionTitle')}
								</label>
								<MultiLangInput
									id="home-contact-title"
									value={config.homePage?.contactTitle || {}}
									onChange={(value) => {
										if (!config) return;
										config = {
											...(config),
											homePage: {
												...config.homePage,
												contactTitle: value
											}
										} as SiteConfig;
									}}
									placeholder={$t('admin.contactSectionTitlePlaceholder')}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
							</div>

							<!-- Services -->
							<div class="border-t border-surface-200-800 pt-6">
								<div class="flex items-center justify-between mb-4">
									<h3 class="text-lg font-semibold text-(--color-surface-950-50)">Services</h3>
									<button
										type="button"
										onclick={() => {
											if (!config) return;
											const services = config.homePage?.services || [];
											config = {
												...(config),
												homePage: {
													...config.homePage,
													services: [
														...services,
														{
															number: String(services.length + 1),
															title: {},
															description: {}
														}
													]
												}
											} as SiteConfig;
										}}
										class={adminBtnPrimarySm}
									>
										+ Add Service
									</button>
								</div>

								{#if config.homePage?.services && config.homePage.services.length > 0}
									<div class="space-y-4">
										{#each config.homePage.services as service, index}
											<div class="border border-surface-200-800 rounded-lg p-4 bg-(--color-surface-50-950)">
												<div class="flex items-start justify-between mb-4">
													<h4 class="text-sm font-semibold text-(--color-surface-950-50)">Service #{index + 1}</h4>
													<button
														type="button"
onclick={() => {
															if (!config) return;
															const services = config.homePage?.services || [];
															config = {
																...(config),
																homePage: {
																	...config.homePage,
																	services: services.filter((_, i) => i !== index)
																}
															} as SiteConfig;
														}}
														class="text-red-600 hover:text-red-800 text-sm font-medium"
													>
														Remove
													</button>
												</div>

												<div class="grid grid-cols-1 gap-4">
													<!-- Service Number -->
													<div>
														<label for="service-number-{index}" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
															Service Number
														</label>
														<input
															id="service-number-{index}"
															type="text"
															value={service.number || ''}
															oninput={(e) => {
																if (!config) return;
																const services = config.homePage?.services || [];
																services[index] = {
																	...services[index],
																	number: e.currentTarget.value
																};
																config = {
																	...(config),
																	homePage: {
																		...config.homePage,
																		services: [...services]
																	}
																} as SiteConfig;
															}}
															placeholder="01"
															class={adminInputSmClass}
														/>
													</div>

													<!-- Service Title -->
													<div>
														<label for="service-title-{index}" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
															Service Title
														</label>
														<MultiLangInput
															id="service-title-{index}"
															value={service.title || {}}
															onChange={(value) => {
																if (!config) return;
																const services = config.homePage?.services || [];
																services[index] = {
																	...services[index],
																	title: value
																};
																config = {
																	...(config),
																	homePage: {
																		...config.homePage,
																		services: [...services]
																	}
																} as SiteConfig;
															}}
															placeholder="Enter service title..."
															showLanguageTabs={true}
															defaultLanguage={config.languages?.defaultLanguage || 'en'}
														/>
													</div>

													<!-- Service Description -->
													<div>
														<label for="service-desc-{index}" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
															Service Description
														</label>
														<MultiLangHTMLEditor
															id="service-desc-{index}"
															value={service.description || {}}
															onChange={(value) => {
																if (!config) return;
																const services = config.homePage?.services || [];
																services[index] = {
																	...services[index],
																	description: value
																};
																config = {
																	...(config),
																	homePage: {
																		...config.homePage,
																		services: [...services]
																	}
																} as SiteConfig;
															}}
															placeholder="Enter service description..."
															height={120}
															showLanguageTabs={true}
															defaultLanguage={config.languages?.defaultLanguage || 'en'}
														/>
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="text-center py-8 border border-surface-200-800 rounded-lg bg-(--color-surface-50-950)">
										<p class="text-(--color-surface-600-400) mb-4">No services added yet.</p>
										<button
											type="button"
											onclick={() => {
											if (!config) return;
											config = {
												...(config),
												homePage: {
													...config.homePage,
													services: [
														{
															number: '01',
															title: {},
															description: {}
														}
													]
												}
											} as SiteConfig;
										}}
											class={adminBtnPrimarySm}
										>
											Add First Service
										</button>
									</div>
								{/if}
							</div>
						</div>
						</Tabs.Content>
						<Tabs.Content value="navigation">
						<div class="space-y-6">
							<div>
								<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.navigationMenuTitle')}</h3>
								<p class="text-sm text-(--color-surface-600-400) mb-4">
									{$t('admin.navigationMenuHelp')}
								</p>
							</div>

							{#if menuItems.length > 0}
								<div class="space-y-3">
									{#each menuItems as item, index}
										<div class="border border-surface-200-800 rounded-lg p-4 bg-(--color-surface-50-950)">
											<div class="flex items-start justify-between mb-3">
												<span class="text-sm font-medium text-(--color-surface-800-200)">{$t('admin.navigationMenuItemLabel', 'Menu Item')} #{index + 1}</span>
												<div class="flex gap-2">
													{#if index > 0}
														<button
															type="button"
															onclick={() => {
																const newItems = [...menuItems];
																[newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
																menuItems = newItems;
															}}
															class="text-(--color-surface-600-400) hover:text-(--color-surface-950-50) text-sm"
															title={$t('admin.navigationMoveUp')}
														>
															↑
														</button>
													{/if}
													{#if index < menuItems.length - 1}
														<button
															type="button"
															onclick={() => {
																const newItems = [...menuItems];
																[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
																menuItems = newItems;
															}}
															class="text-(--color-surface-600-400) hover:text-(--color-surface-950-50) text-sm"
															title={$t('admin.navigationMoveDown')}
														>
															↓
														</button>
													{/if}
													<button
														type="button"
														onclick={() => {
															menuItems = menuItems.filter((_, i) => i !== index);
														}}
														class="text-red-600 hover:text-red-800 text-sm font-medium"
													>
														{$t('admin.remove')}
													</button>
												</div>
											</div>
											
											<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<label for="menu-labelKey-{index}" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">
														{$t('admin.navigationTranslationKeyOptional')}
													</label>
													<input
														id="menu-labelKey-{index}"
														type="text"
														value={item.labelKey || ''}
														oninput={(e) => {
															menuItems[index] = { ...menuItems[index], labelKey: e.currentTarget.value || undefined };
															menuItems = [...menuItems];
														}}
														placeholder="navigation.home"
														class={adminInputSmClass}
													/>
													<p class="mt-1 text-xs text-(--color-surface-600-400)">
														{$t('admin.navigationTranslationKeyHelp')}
													</p>
												</div>
												
												<div>
													<label for="menu-label-{index}" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">
														{$t('admin.navigationDirectLabelOptional')}
													</label>
													<input
														id="menu-label-{index}"
														type="text"
														value={item.label || ''}
														oninput={(e) => {
															menuItems[index] = { ...menuItems[index], label: e.currentTarget.value || undefined };
															menuItems = [...menuItems];
														}}
														placeholder="About"
														class={adminInputSmClass}
													/>
													<p class="mt-1 text-xs text-(--color-surface-600-400)">
														{$t('admin.navigationDirectLabelHelp')}
													</p>
												</div>
												
												<div>
													<label for="menu-type-{index}" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">
														{$t('admin.navigationType')}
													</label>
													<select
														id="menu-type-{index}"
														value={item.type ?? 'link'}
														onchange={(e) => {
															const v = e.currentTarget.value as 'link' | 'login' | 'logout';
															menuItems[index] = {
																...menuItems[index],
																type: v,
																href: v === 'login' ? '/login' : v === 'logout' ? '#' : (menuItems[index].href || ''),
																showWhen: v === 'login' ? 'loggedOut' : v === 'logout' ? 'loggedIn' : (menuItems[index].showWhen ?? 'always')
															};
															menuItems = [...menuItems];
														}}
														class={adminSelectSmClass}
													>
														<option value="link">{$t('admin.navigationTypeLink')}</option>
														<option value="login">{$t('admin.navigationTypeLogin')}</option>
														<option value="logout">{$t('admin.navigationTypeLogout')}</option>
													</select>
													<p class="mt-1 text-xs text-(--color-surface-600-400)">{$t('admin.navigationTypeHelp')}</p>
												</div>

												<div>
													<label for="menu-showWhen-{index}" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">
														{$t('admin.navigationShowWhen')}
													</label>
													<select
														id="menu-showWhen-{index}"
														value={item.showWhen ?? 'always'}
														onchange={(e) => {
															menuItems[index] = { ...menuItems[index], showWhen: e.currentTarget.value as 'always' | 'loggedIn' | 'loggedOut' };
															menuItems = [...menuItems];
														}}
														class={adminSelectSmClass}
													>
														<option value="always">{$t('admin.navigationShowWhenAlways')}</option>
														<option value="loggedIn">{$t('admin.navigationShowWhenLoggedIn')}</option>
														<option value="loggedOut">{$t('admin.navigationShowWhenLoggedOut')}</option>
													</select>
													<p class="mt-1 text-xs text-(--color-surface-600-400)">{$t('admin.navigationShowWhenHelp')}</p>
												</div>

												<div>
													<label for="menu-href-{index}" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">
														{$t('admin.navigationLinkUrl')} <span class="text-red-500">*</span>
													</label>
													<input
														id="menu-href-{index}"
														type="text"
														value={item.href}
														disabled={item.type === 'logout'}
														oninput={(e) => {
															menuItems[index] = { ...menuItems[index], href: e.currentTarget.value };
															menuItems = [...menuItems];
														}}
														placeholder={item.type === 'login' ? '/login' : item.type === 'logout' ? '—' : '/about'}
														required={item.type !== 'logout'}
														class={`${adminInputSmClass} disabled:bg-(--color-surface-100-900) disabled:text-(--color-surface-600-400)`}
													/>
													<p class="mt-1 text-xs text-(--color-surface-600-400)">
														{item.type === 'logout' ? $t('admin.navigationIgnoredForLogout') : $t('admin.navigationLinkUrlHelp')}
													</p>
												</div>
												
												<fieldset class="space-y-2">
													<legend class="block text-sm font-medium text-(--color-surface-800-200) mb-1">
														{$t('admin.navigationVisibleToRolesOptional')}
													</legend>
													<div class="flex flex-wrap gap-2">
														{#each ROLE_OPTIONS as roleOpt}
															{@const isSelected = item.roles?.includes(roleOpt.value) || false}
															<label class="flex items-center space-x-1 cursor-pointer" title={roleOpt.description}>
																<input
																	type="checkbox"
																	checked={isSelected}
																	onchange={(e) => {
																		const currentRoles = item.roles || [];
																		const newRoles = e.currentTarget.checked
																			? [...currentRoles, roleOpt.value]
																			: currentRoles.filter((r: string) => r !== roleOpt.value);
																		menuItems[index] = { 
																			...menuItems[index], 
																			roles: newRoles.length > 0 ? newRoles : undefined 
																		};
																		menuItems = [...menuItems];
																	}}
																	class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
																/>
																<span class="text-sm text-(--color-surface-800-200)">{roleOpt.label}</span>
															</label>
														{/each}
													</div>
													<p class="mt-1 text-xs text-(--color-surface-600-400)">
														{$t('admin.navigationRolesHelp')}
													</p>
												</fieldset>
												
												<div class="flex items-end">
													<label class="flex items-center space-x-2 cursor-pointer">
														<input
															type="checkbox"
															checked={item.external || false}
															onchange={(e) => {
																menuItems[index] = { ...menuItems[index], external: e.currentTarget.checked || undefined };
																menuItems = [...menuItems];
															}}
															class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
														/>
														<span class="text-sm text-(--color-surface-800-200)">{$t('admin.navigationOpenInNewTab')}</span>
													</label>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="text-center py-8 border border-surface-200-800 rounded-lg bg-(--color-surface-50-950)">
									<p class="text-(--color-surface-600-400) mb-4">{$t('admin.navigationNoItems')}</p>
									<p class="text-sm text-(--color-surface-400-600) mb-4">
										{$t('admin.navigationNoItemsHelp')}
									</p>
								</div>
							{/if}

							<div class="flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-surface-200-800">
								<div class="flex flex-wrap gap-2">
									<button
										type="button"
										onclick={() => {
											menuItems = [
												...menuItems,
												{ href: '', label: '' }
											];
										}}
										class={adminBtnPrimarySm}
									>
										+ {$t('admin.navigationAddMenuItem')}
									</button>
									<button
										type="button"
										onclick={() => {
											menuItems = [
												...menuItems,
												{ type: 'login', labelKey: 'auth.signIn', href: '/login', showWhen: 'loggedOut' }
											];
										}}
										class={adminBtnPrimarySm}
									>
										+ {$t('admin.navigationAddLogin')}
									</button>
									<button
										type="button"
										onclick={() => {
											menuItems = [
												...menuItems,
												{ type: 'logout', labelKey: 'header.logout', href: '#', showWhen: 'loggedIn' }
											];
										}}
										class={adminBtnPrimarySm}
									>
										+ {$t('admin.navigationAddLogout')}
									</button>
								</div>
								
								{#if menuItems.length > 0}
									<button
										type="button"
										onclick={openNavigationClearDialog}
										class="btn preset-tonal text-sm"
									>
										{$t('admin.navigationClearAll')}
									</button>
								{/if}
							</div>

							<div class="mt-6 p-4 bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] border border-[color-mix(in_oklab,var(--color-primary-500)_18%,transparent)] rounded-lg">
								<h4 class="text-sm font-semibold text-(--color-primary-900) mb-2">{$t('admin.navigationTipsTitle')}</h4>
								<ul class="text-xs text-(--color-primary-800) space-y-1 list-disc list-inside">
									<li>{$t('admin.navigationTipType')}</li>
									<li>{$t('admin.navigationTipTranslationKey')}</li>
									<li>{$t('admin.navigationTipDirectLabel')}</li>
									<li>{$t('admin.navigationTipPriority')}</li>
									<li>{$t('admin.navigationTipRolesRestrict')}</li>
									<li>{$t('admin.navigationTipRolesOpen')}</li>
									<li>{$t('admin.navigationTipExternal')}</li>
								</ul>
							</div>
						</div>
						</Tabs.Content>
						<Tabs.Content value="exifMetadata">
						<div class="space-y-4">
							<div>
								<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.exifDisplaySectionTitle')}</h3>
								<p class="text-sm text-(--color-surface-600-400) mb-4">
									{$t('admin.exifDisplaySectionHelp')}
								</p>
								<div class="flex gap-2 mb-4">
									<button
										type="button"
										onclick={() => {
											if (!config) return;
											config = {
												...(config),
												exifMetadata: {
													...config.exifMetadata,
													displayFields: EXIF_DISPLAY_FIELDS.map((f) => f.id)
												}
											} as SiteConfig;
										}}
										class="px-3 py-1.5 text-sm bg-(--color-surface-100-900) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-200-800)"
									>
										{$t('admin.metadataDisplaySelectAll')}
									</button>
									<button
										type="button"
										onclick={() => {
											if (!config) return;
											config = {
												...(config),
												exifMetadata: {
													...config.exifMetadata,
													displayFields: []
												}
											} as SiteConfig;
										}}
										class="px-3 py-1.5 text-sm bg-(--color-surface-100-900) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-200-800)"
									>
										{$t('admin.metadataDisplayDeselectAll')}
									</button>
								</div>
								<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto border border-surface-200-800 rounded-lg p-4 bg-(--color-surface-50-950)">
									{#each EXIF_DISPLAY_FIELDS as field}
										{@const isChecked = (config.exifMetadata?.displayFields ?? []).includes(field.id)}
										<label class="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={isChecked}
												onchange={(e) => {
													if (!config) return;
													const current = config.exifMetadata?.displayFields ?? [];
													const next = e.currentTarget.checked
														? [...current, field.id]
														: current.filter((id: string) => id !== field.id);
													config = {
														...config,
														exifMetadata: {
															...config.exifMetadata,
															displayFields: next
														}
													} as SiteConfig;
												}}
												class="rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
											/>
											<span class="text-sm text-(--color-surface-800-200)">{$t('admin.exifFields.' + field.id, field.label)}</span>
										</label>
									{/each}
								</div>
								<p class="text-xs text-(--color-surface-600-400) mt-2">
									{$t('admin.exifDisplayFooterHelp')}
								</p>
							</div>
						</div>
						</Tabs.Content>
						<Tabs.Content value="iptcXmpMetadata">
						<div class="space-y-4">
							<div>
								<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.iptcXmpDisplaySectionTitle')}</h3>
								<p class="text-sm text-(--color-surface-600-400) mb-4">
									{$t('admin.iptcXmpDisplaySectionHelp')}
								</p>
								<div class="flex gap-2 mb-4">
									<button
										type="button"
										onclick={() => {
											if (!config) return;
											config = {
												...(config),
												iptcXmpMetadata: {
													...config.iptcXmpMetadata,
													displayFields: IPTC_XMP_DISPLAY_FIELDS.map((f) => f.id)
												}
											} as SiteConfig;
										}}
										class="px-3 py-1.5 text-sm bg-(--color-surface-100-900) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-200-800)"
									>
										{$t('admin.metadataDisplaySelectAll')}
									</button>
									<button
										type="button"
										onclick={() => {
											if (!config) return;
											config = {
												...(config),
												iptcXmpMetadata: {
													...config.iptcXmpMetadata,
													displayFields: []
												}
											} as SiteConfig;
										}}
										class="px-3 py-1.5 text-sm bg-(--color-surface-100-900) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-200-800)"
									>
										{$t('admin.metadataDisplayDeselectAll')}
									</button>
								</div>
								<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto border border-surface-200-800 rounded-lg p-4 bg-(--color-surface-50-950)">
									{#each IPTC_XMP_DISPLAY_FIELDS as field}
										{@const isChecked = (config.iptcXmpMetadata?.displayFields ?? []).includes(field.id)}
										<label class="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={isChecked}
												onchange={(e) => {
													if (!config) return;
													const current = config.iptcXmpMetadata?.displayFields ?? [];
													const next = e.currentTarget.checked
														? [...current, field.id]
														: current.filter((id: string) => id !== field.id);
													config = {
														...config,
														iptcXmpMetadata: {
															...config.iptcXmpMetadata,
															displayFields: next
														}
													} as SiteConfig;
												}}
												class="rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
											/>
											<span class="text-sm text-(--color-surface-800-200)">{$t('admin.iptcXmpFields.' + field.id, field.label)}</span>
										</label>
									{/each}
								</div>
								<p class="text-xs text-(--color-surface-600-400) mt-2">
									{$t('admin.iptcXmpDisplayFooterHelp')}
								</p>
							</div>
						</div>
						</Tabs.Content>
						<Tabs.Content value="sharing">
						<div class="grid grid-cols-1 gap-6">
							<h3 class="text-lg font-semibold text-(--color-surface-950-50)">{$t('admin.collaborationSectionTitle')}</h3>
							<p class="text-sm text-(--color-surface-600-400) -mt-2">{$t('admin.collaborationMatrixHelp')}</p>
							<div class="mt-4 rounded-lg border border-surface-100-900 bg-(--color-surface-50-950) p-4 text-sm text-(--color-surface-800-200) space-y-2">
								<p class="font-medium text-(--color-surface-950-50)">{$t('admin.collabServicesExplainerTitle')}</p>
								<ul class="list-disc ps-5 space-y-1.5">
									<li>{$t('admin.collabServiceCommentsDesc')}</li>
									<li>{$t('admin.collabServiceTasksDesc')}</li>
									<li>{$t('admin.collabServiceActivityDesc')}</li>
								</ul>
							</div>
							{#if collabVisAdmin}
								<div
									class="overflow-x-auto border border-surface-200-800 rounded-lg mt-4"
									dir="ltr"
								>
									<table class="min-w-full text-sm">
										<thead>
											<tr class="bg-(--color-surface-50-950) border-b border-surface-200-800">
												<th class="p-3 font-medium text-(--color-surface-800-200) text-start align-bottom w-[min(40%,14rem)]"></th>
												<th class="p-3 font-medium text-(--color-surface-800-200) text-center align-bottom">
													{$t('admin.collabServiceEnabledColumn')}
												</th>
												<th class="p-3 font-medium text-(--color-surface-800-200) text-center align-bottom">
													{$t('admin.collabAudienceVisitors')}
												</th>
												<th class="p-3 font-medium text-(--color-surface-800-200) text-center align-bottom">
													{$t('admin.collabAudienceSignedIn')}
												</th>
											</tr>
										</thead>
										<tbody>
											<tr class="border-b border-surface-100-900">
												<td class="p-3 font-medium text-(--color-surface-900-100) text-start align-middle">
													{$t('admin.collabServiceComments')}
												</td>
												<td class="p-3 align-middle text-center">
													<input
														type="checkbox"
														class="h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
														checked={collabVisAdmin.comments.enabled}
														onchange={(e) =>
															setCollabServiceEnabled('comments', e.currentTarget.checked)}
														aria-label={$t('admin.collabServiceEnabledColumn')}
													/>
												</td>
												<td class="p-3 align-middle text-center">
													<input
														type="checkbox"
														class="h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
														checked={collabVisAdmin.comments.public}
														disabled={!collabVisAdmin.comments.enabled}
														onchange={(e) =>
															setCollabFlag('comments', 'public', e.currentTarget.checked)}
													/>
												</td>
												<td class="p-3 align-middle text-center">
													<input
														type="checkbox"
														class="h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
														checked={collabVisAdmin.comments.authenticated}
														disabled={!collabVisAdmin.comments.enabled}
														onchange={(e) =>
															setCollabFlag('comments', 'authenticated', e.currentTarget.checked)}
													/>
												</td>
											</tr>
											<tr class="border-b border-surface-100-900">
												<td class="p-3 font-medium text-(--color-surface-900-100) text-start align-middle">
													{$t('admin.collabServiceTasks')}
												</td>
												<td class="p-3 align-middle text-center">
													<input
														type="checkbox"
														class="h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
														checked={collabVisAdmin.tasks.enabled}
														onchange={(e) => setCollabServiceEnabled('tasks', e.currentTarget.checked)}
														aria-label={$t('admin.collabServiceEnabledColumn')}
													/>
												</td>
												<td class="p-3 align-middle text-center">
													<input
														type="checkbox"
														class="h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
														checked={collabVisAdmin.tasks.public}
														disabled={!collabVisAdmin.tasks.enabled}
														onchange={(e) => setCollabFlag('tasks', 'public', e.currentTarget.checked)}
													/>
												</td>
												<td class="p-3 align-middle text-center">
													<input
														type="checkbox"
														class="h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
														checked={collabVisAdmin.tasks.authenticated}
														disabled={!collabVisAdmin.tasks.enabled}
														onchange={(e) =>
															setCollabFlag('tasks', 'authenticated', e.currentTarget.checked)}
													/>
												</td>
											</tr>
											<tr>
												<td class="p-3 font-medium text-(--color-surface-900-100) text-start align-middle">
													{$t('admin.collabServiceActivity')}
												</td>
												<td class="p-3 align-middle text-center">
													<input
														type="checkbox"
														class="h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
														checked={collabVisAdmin.activity.enabled}
														onchange={(e) =>
															setCollabServiceEnabled('activity', e.currentTarget.checked)}
														aria-label={$t('admin.collabServiceEnabledColumn')}
													/>
												</td>
												<td class="p-3 align-middle text-center">
													<input
														type="checkbox"
														class="h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
														checked={collabVisAdmin.activity.public}
														disabled={!collabVisAdmin.activity.enabled}
														onchange={(e) =>
															setCollabFlag('activity', 'public', e.currentTarget.checked)}
													/>
												</td>
												<td class="p-3 align-middle text-center">
													<input
														type="checkbox"
														class="h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
														checked={collabVisAdmin.activity.authenticated}
														disabled={!collabVisAdmin.activity.enabled}
														onchange={(e) =>
															setCollabFlag('activity', 'authenticated', e.currentTarget.checked)}
													/>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
								<p class="text-xs text-(--color-surface-600-400) mt-2">{$t('admin.collaborationModeratorNote')}</p>
							{/if}
							<div class="border-t border-surface-200-800 pt-6 space-y-3">
								<h3 class="text-lg font-semibold text-(--color-surface-950-50)">{$t('admin.tagSearchFeedbackBoostSectionTitle')}</h3>
								<p class="text-sm text-(--color-surface-600-400) -mt-1">
									{$t('admin.tagSearchFeedbackBoostSectionHelp')}
								</p>
								<label class="flex items-center space-x-2 cursor-pointer">
									<input
										id="tag-feedback-search-boost"
										type="checkbox"
										checked={config.features?.enableTagFeedbackSearchBoost === true}
										onchange={(e) => {
											if (!config) return;
											config = {
												...(config),
												features: {
													...config.features,
													enableTagFeedbackSearchBoost: e.currentTarget.checked
												}
											} as SiteConfig;
										}}
										class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
									/>
									<span class="text-sm font-medium text-(--color-surface-800-200)">{$t('admin.tagSearchFeedbackBoostEnable')}</span>
								</label>
							</div>
							<div class="border-t border-surface-200-800 pt-6 space-y-4">
							<h3 class="text-lg font-semibold text-(--color-surface-950-50)">{$t('admin.socialSharingSectionTitle')}</h3>
							<p class="text-sm text-(--color-surface-600-400) -mt-2">
								{$t('admin.socialSharingSectionHelp')}
							</p>
							<div class="space-y-4">
								<Switch
									class="flex cursor-pointer items-center gap-3"
									checked={config.features?.enableSharing ?? true}
									onCheckedChange={(d) => {
										if (!config) return;
										config = {
											...(config),
											features: {
												...config.features,
												enableSharing: d.checked,
											},
										} as SiteConfig;
									}}
								>
									<Switch.Control
										class="preset-filled-secondary-50-950 data-[state=checked]:preset-filled-secondary-500"
									>
										<Switch.Thumb />
									</Switch.Control>
									<Switch.Label class="text-sm font-medium text-(--color-surface-800-200)">
										{$t('admin.socialSharingEnable')}
									</Switch.Label>
									<Switch.HiddenInput />
								</Switch>
								<div class="border-t border-surface-200-800 pt-4">
									<p class="text-sm font-medium text-(--color-surface-800-200) mb-2">{$t('admin.socialSharingWhereTitle')}</p>
									<div class="space-y-2">
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="sharing-on-album"
												type="checkbox"
												checked={config.features?.sharingOnAlbum !== false}
												onchange={(e) => {
													if (!config) return;
													config = {
														...(config),
														features: {
															...config.features,
															sharingOnAlbum: e.currentTarget.checked
														}
													} as SiteConfig;
												}}
												class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
											/>
											<span class="text-sm text-(--color-surface-800-200)">{$t('admin.socialSharingOnAlbum')}</span>
										</label>
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="sharing-on-photo"
												type="checkbox"
												checked={config.features?.sharingOnPhoto !== false}
												onchange={(e) => {
													if (!config) return;
													config = {
														...(config),
														features: {
															...config.features,
															sharingOnPhoto: e.currentTarget.checked
														}
													} as SiteConfig;
												}}
												class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
											/>
											<span class="text-sm text-(--color-surface-800-200)">{$t('admin.socialSharingOnPhoto')}</span>
										</label>
									</div>
								</div>
								<div class="border-t border-surface-200-800 pt-4">
									<p class="text-sm font-medium text-(--color-surface-800-200) mb-2">{$t('admin.socialSharingOptionsTitle')}</p>
									{#if config}
										{@const opts = config.features?.sharingOptions ?? ['twitter', 'facebook', 'whatsapp', 'copy']}
										<div class="flex flex-wrap gap-4">
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="share-twitter"
												type="checkbox"
												checked={opts.includes('twitter')}
												onchange={(e) => {
													if (!config) return;
													const current = config.features?.sharingOptions ?? ['twitter', 'facebook', 'whatsapp', 'copy'];
													const next = e.currentTarget.checked ? [...current.filter((x: string) => x !== 'twitter'), 'twitter'] : current.filter((x: string) => x !== 'twitter');
													config = { ...config, features: { ...config.features, sharingOptions: next } } as SiteConfig;
												}}
												class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
											/>
											<span class="text-sm text-(--color-surface-800-200)">{$t('admin.socialSharingX')}</span>
										</label>
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="share-facebook"
												type="checkbox"
												checked={opts.includes('facebook')}
												onchange={(e) => {
													if (!config) return;
													const current = config.features?.sharingOptions ?? ['twitter', 'facebook', 'whatsapp', 'copy'];
													const next = e.currentTarget.checked ? [...current.filter((x: string) => x !== 'facebook'), 'facebook'] : current.filter((x: string) => x !== 'facebook');
													config = { ...config, features: { ...config.features, sharingOptions: next } } as SiteConfig;
												}}
												class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
											/>
											<span class="text-sm text-(--color-surface-800-200)">{$t('admin.socialSharingFacebook')}</span>
										</label>
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="share-whatsapp"
												type="checkbox"
												checked={opts.includes('whatsapp')}
												onchange={(e) => {
													if (!config) return;
													const current = config.features?.sharingOptions ?? ['twitter', 'facebook', 'whatsapp', 'copy'];
													const next = e.currentTarget.checked ? [...current.filter((x: string) => x !== 'whatsapp'), 'whatsapp'] : current.filter((x: string) => x !== 'whatsapp');
													config = { ...config, features: { ...config.features, sharingOptions: next } } as SiteConfig;
												}}
												class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
											/>
											<span class="text-sm text-(--color-surface-800-200)">{$t('admin.socialSharingWhatsapp')}</span>
										</label>
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="share-copy"
												type="checkbox"
												checked={opts.includes('copy')}
												onchange={(e) => {
													if (!config) return;
													const current = config.features?.sharingOptions ?? ['twitter', 'facebook', 'whatsapp', 'copy'];
													const next = e.currentTarget.checked ? [...current.filter((x: string) => x !== 'copy'), 'copy'] : current.filter((x: string) => x !== 'copy');
													config = { ...config, features: { ...config.features, sharingOptions: next } } as SiteConfig;
												}}
												class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
											/>
											<span class="text-sm text-(--color-surface-800-200)">{$t('admin.socialSharingCopyLink')}</span>
										</label>
									</div>
									{/if}
								</div>
							</div>
							</div>
						</div>
						</Tabs.Content>
						<Tabs.Content value="email">
						<div class="grid grid-cols-1 gap-6">
							<h3 class="text-lg font-semibold text-(--color-surface-950-50)">{$t('admin.smtpSectionTitle')}</h3>
							<p class="text-sm text-(--color-surface-600-400) -mt-2">
								{$t('admin.smtpSectionHelp')}
							</p>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="mail-host" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">{$t('admin.smtpHost')}</label>
									<input
										id="mail-host"
										type="text"
										value={config.mail?.host ?? ''}
										oninput={(e) => {
											if (!config) return;
											config = {
												...(config),
												mail: { ...config.mail, host: e.currentTarget.value || undefined }
											} as SiteConfig;
										}}
										placeholder="smtp.example.com"
										class={adminInputSmClass}
									/>
								</div>
								<div>
									<label for="mail-port" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">{$t('admin.smtpPort')}</label>
									<input
										id="mail-port"
										type="number"
										value={config.mail?.port ?? ''}
										oninput={(e) => {
											if (!config) return;
											const v = e.currentTarget.value ? Number(e.currentTarget.value) : undefined;
											config = { ...(config), mail: { ...config.mail, port: v } } as SiteConfig;
										}}
										placeholder="587"
										class={adminInputSmClass}
									/>
									<p class="mt-1 text-xs text-(--color-surface-600-400)">{$t('admin.smtpPortHelp')}</p>
								</div>
								<div>
									<label for="mail-user" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">{$t('admin.smtpUser')}</label>
									<input
										id="mail-user"
										type="text"
										value={config.mail?.user ?? ''}
										oninput={(e) => {
											if (!config) return;
											config = {
												...(config),
												mail: { ...config.mail, user: e.currentTarget.value || undefined }
											} as SiteConfig;
										}}
										placeholder="noreply@example.com"
										class={adminInputSmClass}
									/>
								</div>
								<div>
									<label for="mail-password" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">{$t('admin.smtpPassword')}</label>
									<input
										id="mail-password"
										type="password"
										value={config.mail?.password ?? ''}
										oninput={(e) => {
											if (!config) return;
											config = {
												...(config),
												mail: { ...config.mail, password: e.currentTarget.value || undefined }
											} as SiteConfig;
										}}
										placeholder={$t('admin.smtpPasswordPlaceholder')}
										class={adminInputSmClass}
									/>
									<p class="mt-1 text-xs text-(--color-surface-600-400)">{$t('admin.smtpPasswordHelp')}</p>
								</div>
								<div>
									<label for="mail-from" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">{$t('admin.smtpFromAddress')}</label>
									<input
										id="mail-from"
										type="text"
										value={config.mail?.from ?? ''}
										oninput={(e) => {
											if (!config) return;
											config = {
												...(config),
												mail: { ...config.mail, from: e.currentTarget.value || undefined }
											} as SiteConfig;
										}}
										placeholder="OpenShutter &lt;noreply@example.com&gt;"
										class={adminInputSmClass}
									/>
								</div>
								<div class="flex items-end pb-2">
									<label class="flex items-center space-x-2 cursor-pointer">
										<input
											type="checkbox"
											checked={config.mail?.secure ?? false}
											onchange={(e) => {
												if (!config) return;
												config = {
													...(config),
													mail: { ...config.mail, secure: e.currentTarget.checked }
												} as SiteConfig;
											}}
											class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
										/>
										<span class="text-sm text-(--color-surface-800-200)">{$t('admin.smtpUseSsl')}</span>
									</label>
								</div>
							</div>

							<div class="border-t border-surface-200-800 pt-6">
								<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.welcomeEmailSectionTitle')}</h3>
								<p class="text-sm text-(--color-surface-600-400) mb-4">
									{$t('admin.welcomeEmailSectionHelp')}
								</p>
								<label class="flex items-center space-x-2 cursor-pointer mb-4">
									<input
										type="checkbox"
										checked={config.welcomeEmail?.enabled ?? false}
										onchange={(e) => {
											if (!config) return;
											config = {
												...(config),
												welcomeEmail: { ...config.welcomeEmail, enabled: e.currentTarget.checked }
											} as SiteConfig;
										}}
										class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
									/>
									<span class="text-sm font-medium text-(--color-surface-800-200)">{$t('admin.welcomeEmailEnabledLabel')}</span>
								</label>
								<div class="space-y-4">
									<div>
										<label for="welcome-email-subject" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">{$t('admin.welcomeEmailSubject')}</label>
										<MultiLangInput
											id="welcome-email-subject"
											value={config.welcomeEmail?.subject || {}}
											onChange={(value) => {
												if (!config) return;
												config = {
													...config,
													welcomeEmail: { ...config.welcomeEmail, subject: value }
												} as SiteConfig;
											}}
											placeholder={$t('admin.welcomeEmailSubjectPlaceholder')}
											showLanguageTabs={true}
											defaultLanguage={config.languages?.defaultLanguage || 'en'}
										/>
									</div>
									<div>
										<label for="welcome-email-body" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">{$t('admin.welcomeEmailBody')}</label>
										<MultiLangHTMLEditor
											id="welcome-email-body"
											value={config.welcomeEmail?.body || {}}
											onChange={(value) => {
												if (!config) return;
												config = {
													...config,
													welcomeEmail: { ...config.welcomeEmail, body: value }
												} as SiteConfig;
											}}
											placeholder={$t('admin.welcomeEmailBodyPlaceholder')}
											height={180}
											showLanguageTabs={true}
											defaultLanguage={config.languages?.defaultLanguage || 'en'}
										/>
										<p class="mt-1 text-xs text-(--color-surface-600-400)">
											{$t('admin.welcomeEmailPlaceholdersLabel')}: <code class="bg-(--color-surface-100-900) px-1 rounded">{'{{name}}'}</code>, <code class="bg-(--color-surface-100-900) px-1 rounded">{'{{username}}'}</code>, <code class="bg-(--color-surface-100-900) px-1 rounded">{'{{loginUrl}}'}</code>, <code class="bg-(--color-surface-100-900) px-1 rounded">{'{{siteTitle}}'}</code>, <code class="bg-(--color-surface-100-900) px-1 rounded">{'{{password}}'}</code> ({$t('admin.welcomeEmailPasswordNote')}).
										</p>
									</div>
								</div>
							</div>

							<div class="border-t border-surface-200-800 pt-6">
								<button
									type="button"
									onclick={openTestMailModal}
									class={adminBtnPrimarySm}
								>
									{$t('admin.sendTestEmail')}
								</button>
								<p class="mt-2 text-xs text-(--color-surface-600-400)">{$t('admin.sendTestEmailHelp')}</p>
							</div>
						</div>
						</Tabs.Content>

					<!-- Submit Button -->
					<div class="flex justify-end pt-6 border-t border-surface-200-800">
						<button
							type="submit"
							disabled={saving}
							class={`${adminBtnPrimary} px-6 disabled:opacity-50 disabled:cursor-not-allowed`}
						>
							{saving ? $t('admin.saving') : $t('admin.saveConfiguration')}
						</button>
					</div>
					</div>
				</Tabs>
			</form>
		</div>

		<!-- Test email modal -->
		{#if showTestMailModal}
			<div
				class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
				role="dialog"
				aria-modal="true"
				aria-labelledby="test-email-title"
			>
				<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
					<div class="p-4 border-b border-surface-200-800 flex items-center justify-between">
						<h2 id="test-email-title" class="text-lg font-semibold text-(--color-surface-950-50)">Send test email</h2>
						<button
							type="button"
							onclick={closeTestMailModal}
							class="text-(--color-surface-400-600) hover:text-(--color-surface-600-400) p-1 rounded"
							aria-label="Close"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
						</button>
					</div>
					<div class="p-4 overflow-y-auto flex-1">
						{#if testMailResult === 'idle' || testMailResult === 'sending'}
							<form onsubmit={(e) => {
										e.preventDefault();
										sendTestEmail(e);
									}} class="space-y-4">
								<div>
									<label for="test-email-to" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">To</label>
									<input
										id="test-email-to"
										type="email"
										bind:value={testTo}
										placeholder="recipient@example.com"
										required
										class={adminInputSmClass}
									/>
								</div>
								<div>
									<label for="test-email-subject" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">Subject</label>
									<input
										id="test-email-subject"
										type="text"
										bind:value={testSubject}
										class={adminInputSmClass}
									/>
								</div>
								<div>
									<label for="test-email-body" class="block text-sm font-medium text-(--color-surface-800-200) mb-1">Body</label>
									<textarea
										id="test-email-body"
										bind:value={testBody}
										rows={5}
										class={adminInputSmClass}
									></textarea>
								</div>
								<div class="flex gap-2 justify-end pt-2">
									<button
										type="button"
										onclick={closeTestMailModal}
										class="btn preset-tonal text-sm"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={testMailResult === 'sending'}
										class={`${adminBtnPrimarySm} disabled:opacity-50 disabled:cursor-not-allowed`}
									>
										{testMailResult === 'sending' ? 'Sending...' : 'Send'}
									</button>
								</div>
							</form>
						{:else}
							<div class="space-y-4">
								{#if testMailResult.success}
									<div
										class="rounded-lg border border-surface-200-800 bg-[color-mix(in_oklab,var(--color-surface-950)_4%,transparent)] p-4 text-(--color-surface-800-200) dark:bg-[color-mix(in_oklab,var(--color-surface-50)_6%,transparent)]"
									>
										<p class="font-medium">Email sent successfully.</p>
										<p class="mt-1 text-sm text-(--color-surface-600-400)">Check the recipient inbox.</p>
									</div>
								{:else}
									<div class="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
										<p class="font-medium">Failed to send</p>
										<p class="text-sm mt-1">{testMailResult.error}</p>
									</div>
								{/if}
								<div class="flex justify-end">
									<button
										type="button"
										onclick={closeTestMailModal}
										class={adminBtnPrimary}
									>
										Close
									</button>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<AdminConfirmDialog
	open={navigationClearDialogOpen}
	title={$t('admin.navigationClearAll')}
	message={$t('admin.navigationClearAllConfirm')}
	confirmText={$t('admin.navigationClearAll')}
	cancelText={$t('admin.cancel')}
	variant="danger"
	onOpenChange={(o) => {
		if (!o) closeNavigationClearDialog();
	}}
	onConfirm={confirmClearNavigationMenu}
/>

<AdminConfirmDialog
	open={unsavedTabSwitchDialogOpen}
	title={$t('admin.siteConfigUnsavedSwitchTitle')}
	message={$t('admin.siteConfigUnsavedSwitchMessage')}
	confirmText={$t('admin.siteConfigDiscardChanges')}
	cancelText={$t('admin.siteConfigKeepEditing')}
	variant="danger"
	onOpenChange={(o) => {
		if (!o) closeUnsavedTabSwitchDialog();
	}}
	onConfirm={confirmDiscardAndSwitchTab}
/>
