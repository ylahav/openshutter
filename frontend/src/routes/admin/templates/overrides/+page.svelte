<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';
	import { handleAuthError } from '$lib/utils/auth-error-handler';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import ThemeBuilderPreview from '$lib/components/ThemeBuilderPreview.svelte';
	import { PAGE_MODULE_TYPES } from '$lib/page-builder/module-types';
	import ModuleCellPlacementControls from '$lib/page-builder/ModuleCellPlacementControls.svelte';
	import { GOOGLE_FONTS, GOOGLE_FONT_NAMES } from '$lib/constants/google-fonts';
	import {
		normalizeFontSetting,
		FONT_SIZE_OPTIONS,
		FONT_WEIGHT_OPTIONS,
		type FontSetting,
		type FontRole
	} from '$lib/types/fonts';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { t } from '$stores/i18n';
	import type { PageData } from './$types';
	import type { MultiLangText, MultiLangHTML } from '$lib/types/multi-lang';
	import {
		TEMPLATE_BREAKPOINTS,
		BREAKPOINT_MIN_WIDTH_PX,
		SHELL_HINT_BY_BREAKPOINT,
		DEFAULT_SHELL,
		seedShellFromDb,
		shellByBreakpointToCustomLayoutField,
		seedPageLayoutByBreakpoint,
		normalizePageLayoutRowForPersistence,
		pageLayoutByBreakpointToPageLayoutField,
		pageModulesByBreakpointToPageModulesField,
		isLegacyCustomLayout,
		isBreakpointMapCustomLayout,
		isPageLayoutBreakpointMapForPage,
		isLegacyPageLayoutEntry,
		isPageModulesBreakpointMapForPage,
		getPageGridForBreakpoint,
		getPageModulesForBreakpoint,
		mergePageLayoutRowForBreakpointEdit,
		resolveBreakpointForWidth,
		type TemplateBreakpointId,
		type ShellLayout
	} from '$lib/template/breakpoints';
	import { DEFAULT_PAGE_LAYOUTS, DEFAULT_PAGE_MODULES } from '$lib/constants/default-page-layouts';
	import {
		DEFAULT_TEMPLATE_COLOR_EXTENDED,
		EXTENDED_COLOR_FIELD_META
	} from '$lib/theme/template-palette';
	import atelierThemePack from '$lib/templates/atelier/theme.defaults.json';

	/** Readable defaults when template / overrides omit a key (also fixes invisible #000 on white fields). */
	const DEFAULT_COLOR_HEX: Record<string, string> = {
		primary: '#3B82F6',
		secondary: '#6B7280',
		accent: '#F59E0B',
		background: '#FFFFFF',
		text: '#111827',
		muted: '#6B7280'
	};

	const DEFAULT_COLOR_FALLBACK: Record<string, string> = {
		...DEFAULT_COLOR_HEX,
		...DEFAULT_TEMPLATE_COLOR_EXTENDED
	};

	/** Skeleton `input` / `select`; fg/bg under `[data-admin-chrome]` come from `admin-skeleton.css`. */
	const ADMIN_TEXT_INPUT_BASE = 'input';
	const ADMIN_TEXT_INPUT_CLASS = 'input w-full';
	const ADMIN_TEXT_INPUT_FLEX_CLASS = 'input flex-1 min-w-0';
	const ADMIN_SELECT_CLASS = 'select';
	const ADMIN_SELECT_SM_CLASS = 'select text-sm';

	/**
	 * Hex #RRGGBB fields on the Color tab — `preset-filled` cards + `[color-scheme:light]` made
	 * `--base-font-color` / generic `input` text illegible; pair explicit surface bg + fg.
	 */
	const ADMIN_COLOR_HEX_INPUT_CLASS =
		'input flex-1 min-w-0 bg-[var(--color-surface-50)] text-[var(--color-surface-950)] placeholder:text-[var(--color-surface-500)] dark:bg-[var(--color-surface-900)] dark:text-[var(--color-surface-50)] dark:placeholder:text-[var(--color-surface-400)]';

	export let data: PageData;

	$: themeId = $page.url.searchParams.get('themeId');

	// Base palette presets per doc
	const PALETTE_PRESETS: Record<string, { colors: Record<string, string> }> = {
		light: {
			colors: { primary: '#3B82F6', secondary: '#6B7280', accent: '#F59E0B', background: '#FFFFFF', text: '#111827', muted: '#6B7280' }
		},
		dark: {
			colors: { primary: '#60A5FA', secondary: '#9CA3AF', accent: '#FBBF24', background: '#111827', text: '#F9FAFB', muted: '#9CA3AF' }
		},
		highContrast: {
			colors: { primary: '#2563EB', secondary: '#1F2937', accent: '#DC2626', background: '#FFFFFF', text: '#000000', muted: '#4B5563' }
		},
		muted: {
			colors: { primary: '#6B7280', secondary: '#9CA3AF', accent: '#A78BFA', background: '#F9FAFB', text: '#374151', muted: '#9CA3AF' }
		}
	};

	interface TemplateConfig {
		templateName: string;
		displayName: string;
		colors: {
			primary: string;
			secondary: string;
			accent: string;
			background: string;
			text: string;
			muted: string;
		};
		fonts: Record<FontRole, FontSetting>;
		layout: ShellLayout & { maxWidth: string; containerPadding: string; gridGap: string };
		visibility?: {
			hero?: boolean;
			languageSelector?: boolean;
			authButtons?: boolean;
			footerMenu?: boolean;
			statistics?: boolean;
			promotion?: boolean;
		};
		componentsConfig?: {
			header?: {
				showLogo?: boolean;
				showSiteTitle?: boolean;
				enableThemeToggle?: boolean;
				enableLanguageSelector?: boolean;
				showGreeting?: boolean;
				showAuthButtons?: boolean;
			};
		};
	}

	let templates: TemplateConfig[] = [];
	let sharedLayoutPresetsFromThemes: Record<string, { gridRows?: number; gridColumns?: number; modules?: unknown[] }> = {};
	let activeTemplate: TemplateConfig | null = null;
	let loading = true;
	let saving = false;
	let resetting = false;
	let message = '';
	let error = '';
	let activeTab = 'colors';
	let hasChanges = false;
	let previewPageType: 'home' | 'gallery' | 'album' | 'search' | 'login' = 'home';
	type PreviewDeviceId = 'desktop' | 'tablet' | 'mobile' | 'mobileSm';
	const PREVIEW_DEVICE_ORDER: PreviewDeviceId[] = ['desktop', 'tablet', 'mobile', 'mobileSm'];
	const PREVIEW_DEVICE_WIDTH_PX: Record<PreviewDeviceId, number> = {
		desktop: 1280,
		tablet: 834,
		mobile: 390,
		mobileSm: 360
	};
	let showThemePreviewModal = false;
	let previewDeviceId: PreviewDeviceId = 'desktop';
	/** Match live site: same breakpoint as `viewportWidth` for this emulated width */
	$: previewModalBreakpoint = resolveBreakpointForWidth(PREVIEW_DEVICE_WIDTH_PX[previewDeviceId]);
	$: previewDeviceLabels = {
		desktop: $t('admin.previewDeviceDesktop'),
		tablet: $t('admin.previewDeviceTablet'),
		mobile: $t('admin.previewDeviceMobile'),
		mobileSm: $t('admin.previewDeviceMobileSmall')
	} satisfies Record<PreviewDeviceId, string>;
	let editingPageType: 'home' | 'gallery' | 'album' | 'search' | 'login' = 'home';
	/** Shell + page grid/modules edit target (mobile-first breakpoints). */
	let editingBreakpoint: TemplateBreakpointId = 'lg';
	const PAGE_KEYS = ['home', 'gallery', 'album', 'search', 'login'] as const;
	let pageModulesActiveBreakpoints: Record<string, boolean> = {};
	// Multi-select like page builder: Set of "row:col" keys
	let selectedCells = new Set<string>();
	// Must read editingBreakpoint + localOverrides here — Svelte does not track vars only used inside helper closures.
	$: pageGrid = (() => {
		const lo = localOverrides;
		const layout = getPageGridForBreakpoint(
			{
				pageLayout: lo.pageLayout,
				pageLayoutByBreakpoint: lo.pageLayoutByBreakpoint
			},
			editingPageType,
			editingBreakpoint
		);
		return {
			gridRows: layout?.gridRows ?? 3,
			gridColumns: layout?.gridColumns ?? 1
		};
	})();

	// Local overrides state (customFonts values can be string | FontSetting for backward compat)
	let localOverrides: {
		customColors?: Record<string, string>;
		customFonts?: Record<string, string | FontSetting>;
		/** Legacy flat `{ maxWidth, … }` or full breakpoint map (preferred when saved). */
		customLayout?: Record<string, unknown>;
		customLayoutByBreakpoint?: Record<string, ShellLayout>;
		componentVisibility?: Record<string, boolean>;
		headerConfig?: Record<string, any>;
		/** Legacy flat per page, or full `{ pageKey: { xs: …, lg: … } }` map when saved from Admin. */
		pageModules?: Record<string, unknown>;
		pageLayout?: Record<string, unknown>;
		pageLayoutByBreakpoint?: Record<string, Partial<Record<string, { gridRows: number; gridColumns: number }>>>;
		pageModulesByBreakpoint?: Record<string, Partial<Record<string, any[]>>>;
		/** Named reusable grids for `layoutShell` (presetKey → grid + modules). */
		layoutPresets?: Record<string, { gridRows?: number; gridColumns?: number; modules?: unknown[] }>;
	} = {};

	let editingTheme: {
		_id: string;
		name?: string;
		baseTemplate: string;
		customColors?: Record<string, string>;
		customFonts?: Record<string, string | FontSetting>;
		customLayout?: Record<string, unknown>;
		customLayoutByBreakpoint?: Record<string, ShellLayout>;
		componentVisibility?: Record<string, boolean>;
		headerConfig?: Record<string, unknown>;
		/** Legacy flat per page, or full `{ pageKey: { xs: …, lg: … } }` map when saved from Admin. */
		pageModules?: Record<string, unknown>;
		pageLayout?: Record<string, unknown>;
		pageLayoutByBreakpoint?: Record<string, Partial<Record<string, { gridRows: number; gridColumns: number }>>>;
		pageModulesByBreakpoint?: Record<string, Partial<Record<string, any[]>>>;
		layoutPresets?: Record<string, unknown>;
	} | null = null;
	$: currentTemplateName = editingTheme?.baseTemplate ||
		$siteConfigData?.template?.frontendTemplate ||
		$siteConfigData?.template?.activeTemplate ||
		'noir';
	$: siteTemplateOverrides = $siteConfigData?.template || {};

	$: themeEditorDisplayName =
		themeId && editingTheme
			? (editingTheme.name || '').trim()
			: (activeTemplate?.displayName || currentTemplateName || '').trim();

	$: themeEditorHeadingText = $t('admin.themeEditorHeading').replace(
		'{name}',
		themeEditorDisplayName || $t('admin.themeFallbackName')
	);

	// Reactive: Update activeTemplate when templates or currentTemplateName changes
	$: if (templates.length > 0 && currentTemplateName) {
		const found = templates.find((t) => t.templateName === currentTemplateName);
		if (found && found !== activeTemplate) {
			activeTemplate = found;
			logger.debug('[Overrides] Active template updated:', {
				templateName: currentTemplateName,
				found: !!found,
				activeTemplate: activeTemplate?.templateName
			});
		} else if (!found && activeTemplate) {
			// Template name changed but template not found - try to find by displayName or use first
			const foundByDisplay = templates.find((t) => 
				t.displayName?.toLowerCase() === currentTemplateName.toLowerCase()
			);
			activeTemplate = foundByDisplay || templates[0] || null;
			if (!activeTemplate) {
				logger.warn('[Overrides] No template found for:', currentTemplateName);
			}
		}
	}

	onMount(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!hasChanges) return;
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		void (async () => {
			await siteConfig.load();
			if (themeId) {
				await loadTheme(themeId);
			}
			await loadSharedLayoutPresetsFromThemes();
			await loadTemplates();
			await loadBlogCategoriesForOverrides();
			initializeLocalOverrides();
		})();
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	beforeNavigate((navigation) => {
		if (!hasChanges) return;
		if (navigation.to?.url.pathname === navigation.from?.url.pathname) return;
		const leave = confirm('You have unsaved changes. Leave without saving?');
		if (!leave) {
			navigation.cancel();
		}
	});

	async function loadTheme(id: string) {
		try {
			const response = await fetch(`/api/admin/themes/${id}`, { credentials: 'include' });
			if (!response.ok) throw new Error('Failed to load theme');
			const result = await response.json();
			editingTheme = result.data || result;
		} catch (err) {
			logger.error('Load theme error:', err);
			error = handleError(err, 'Failed to load theme');
		}
	}

	async function loadSharedLayoutPresetsFromThemes() {
		try {
			const response = await fetch('/api/admin/themes', { credentials: 'include' });
			if (!response.ok) return;
			const result = await response.json();
			const rows: any[] = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
			const merged: Record<string, { gridRows?: number; gridColumns?: number; modules?: unknown[] }> = {};
			for (const theme of rows) {
				const presets = theme?.layoutPresets;
				if (!presets || typeof presets !== 'object' || Array.isArray(presets)) continue;
				for (const [k, v] of Object.entries(presets as Record<string, unknown>)) {
					if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
					merged[k] = JSON.parse(JSON.stringify(v)) as { gridRows?: number; gridColumns?: number; modules?: unknown[] };
				}
			}
			sharedLayoutPresetsFromThemes = merged;
		} catch (err) {
			logger.warn('Failed to load shared layout presets from themes:', err);
		}
	}

	function initializeLocalOverrides() {
		if (editingTheme) {
			const migrated = migratePageModules(editingTheme.pageModules as Record<string, unknown> | undefined);
			logger.debug('[Overrides] Loading theme pageModules:', {
				raw: editingTheme.pageModules,
				migrated: migrated,
				homeModules: migrated.home,
				firstHomeModule: Array.isArray(migrated.home) ? migrated.home?.[0] : undefined,
				firstHomeModuleProps: Array.isArray(migrated.home) ? migrated.home?.[0]?.props : undefined
			});
			const pageModules =
				Object.keys(migrated).length > 0 ? migrated : (DEFAULT_PAGE_MODULES as Record<string, unknown>);
			const rawPl =
				editingTheme.pageLayout && Object.keys(editingTheme.pageLayout).length > 0
					? (JSON.parse(JSON.stringify(editingTheme.pageLayout)) as Record<string, unknown>)
					: {};
			const shellByBp = seedShellFromDb(
				editingTheme.customLayout,
				editingTheme.customLayoutByBreakpoint
			);
			const seeded = seedPageLayoutByBreakpoint(
				[...PAGE_KEYS],
				rawPl,
				pageModules,
				{
					pageLayoutByBreakpoint: editingTheme.pageLayoutByBreakpoint,
					pageModulesByBreakpoint: editingTheme.pageModulesByBreakpoint
				}
			);
			const sharedLp =
				siteTemplateOverrides.layoutPresets && typeof siteTemplateOverrides.layoutPresets === 'object'
					? (JSON.parse(JSON.stringify(siteTemplateOverrides.layoutPresets)) as Record<
							string,
							{ gridRows?: number; gridColumns?: number; modules?: unknown[] }
						>)
					: {};
			const themeLp =
				editingTheme.layoutPresets && typeof editingTheme.layoutPresets === 'object'
					? (JSON.parse(JSON.stringify(editingTheme.layoutPresets)) as Record<
							string,
							{ gridRows?: number; gridColumns?: number; modules?: unknown[] }
						>)
					: {};
			// Shared pool is global (all themes) + site; edited theme keys override shared values.
			const rawLp = { ...sharedLayoutPresetsFromThemes, ...sharedLp, ...themeLp };
			localOverrides = {
				customColors: editingTheme.customColors ? { ...editingTheme.customColors } : {},
				customFonts: editingTheme.customFonts ? { ...editingTheme.customFonts } : {},
				customLayoutByBreakpoint: shellByBp as Record<string, ShellLayout>,
				customLayout: shellByBreakpointToCustomLayoutField(shellByBp),
				componentVisibility: editingTheme.componentVisibility ? { ...editingTheme.componentVisibility } : {},
				headerConfig: editingTheme.headerConfig ? { ...editingTheme.headerConfig } : {},
				pageLayoutByBreakpoint: seeded.pageLayoutByBreakpoint,
				pageModulesByBreakpoint: seeded.pageModulesByBreakpoint,
				pageLayout: pageLayoutByBreakpointToPageLayoutField(seeded.pageLayoutByBreakpoint),
				pageModules: pageModulesByBreakpointToPageModulesField(seeded.pageModulesByBreakpoint),
				layoutPresets: rawLp
			};
		} else {
			const sitePm = migratePageModules(siteTemplateOverrides.pageModules as Record<string, unknown> | undefined);
			const basePm = Object.keys(sitePm).length > 0 ? sitePm : (DEFAULT_PAGE_MODULES as Record<string, unknown>);
			const rawPl =
				siteTemplateOverrides.pageLayout && Object.keys(siteTemplateOverrides.pageLayout).length > 0
					? (JSON.parse(JSON.stringify(siteTemplateOverrides.pageLayout)) as Record<string, unknown>)
					: {};
			const shellByBp = seedShellFromDb(
				siteTemplateOverrides.customLayout,
				siteTemplateOverrides.customLayoutByBreakpoint
			);
			const seeded = seedPageLayoutByBreakpoint(
				[...PAGE_KEYS],
				rawPl,
				basePm,
				{
					pageLayoutByBreakpoint: siteTemplateOverrides.pageLayoutByBreakpoint,
					pageModulesByBreakpoint: siteTemplateOverrides.pageModulesByBreakpoint
				}
			);
			const siteLp =
				siteTemplateOverrides.layoutPresets && typeof siteTemplateOverrides.layoutPresets === 'object'
					? (JSON.parse(JSON.stringify(siteTemplateOverrides.layoutPresets)) as Record<
							string,
							{ gridRows?: number; gridColumns?: number; modules?: unknown[] }
						>)
					: {};
			localOverrides = {
				customColors: siteTemplateOverrides.customColors ? { ...siteTemplateOverrides.customColors } : {},
				customFonts: siteTemplateOverrides.customFonts ? { ...siteTemplateOverrides.customFonts } : {},
				customLayoutByBreakpoint: shellByBp as Record<string, ShellLayout>,
				customLayout: shellByBreakpointToCustomLayoutField(shellByBp),
				componentVisibility: siteTemplateOverrides.componentVisibility
					? { ...siteTemplateOverrides.componentVisibility }
					: {},
				headerConfig: siteTemplateOverrides.headerConfig ? { ...siteTemplateOverrides.headerConfig } : {},
				pageLayoutByBreakpoint: seeded.pageLayoutByBreakpoint,
				pageModulesByBreakpoint: seeded.pageModulesByBreakpoint,
				pageLayout: pageLayoutByBreakpointToPageLayoutField(seeded.pageLayoutByBreakpoint),
				pageModules: pageModulesByBreakpointToPageModulesField(seeded.pageModulesByBreakpoint),
				layoutPresets: { ...sharedLayoutPresetsFromThemes, ...siteLp }
			};
		}
		refreshPageModulesActiveBreakpointsMap();
		logger.debug('[Overrides] Initialized local overrides:', {
			editingTheme: !!editingTheme,
			pageModulesKeys: Object.keys(localOverrides.pageModules || {}),
			homeModulesCount: (() => {
				const h = localOverrides.pageModules?.home;
				if (Array.isArray(h)) return h.length;
				if (h && isPageModulesBreakpointMapForPage(h)) {
					const a = h.lg ?? h.md ?? h.sm;
					return Array.isArray(a) ? a.length : 0;
				}
				return 0;
			})()
		});
	}

	// Keep in sync with PAGE_MODULE_TYPES and PageRenderer moduleMap.
	// Missing an alias here can hide a registered module from Admin pickers.
	// Use same module types as page builder / PageRenderer
	const PAGE_CONTENT_MODULES = PAGE_MODULE_TYPES.filter((m) =>
		[
			'pageTitle',
			'loginForm',
			'hero',
			'richText',
			'divider',
			'featureGrid',
			'albumsGrid',
			'albumView',
			'cta',
			'blogCategory',
			'blogArticle',
			'layoutShell'
		].includes(m.type)
	);
	const HEADER_MODULES = PAGE_MODULE_TYPES.filter((m) =>
		[
			'logo',
			'siteTitle',
			'menu',
			'languageSelector',
			'themeToggle',
			'themeSelect',
			'userGreeting',
			'authButtons',
			'socialMedia',
			'divider',
			'layoutShell'
		].includes(m.type)
	);
	const FOOTER_MODULES = PAGE_MODULE_TYPES.filter((m) =>
		['richText', 'divider', 'cta', 'socialMedia', 'themeSelect', 'layoutShell'].includes(m.type)
	);

	const LAYOUT_SHELL_INNER_MODULE_TYPES = PAGE_MODULE_TYPES.filter((m) => m.type !== 'layoutShell');

	function migratePageModules(pm: Record<string, unknown> | undefined): Record<string, unknown> {
		if (!pm) return {};
		const out: Record<string, unknown> = {};
		const normalizeModuleType = (t: unknown): string => (t === 'albumGallery' ? 'albumView' : String(t ?? ''));
		for (const [pt, val] of Object.entries(pm)) {
			if (
				val &&
				typeof val === 'object' &&
				!Array.isArray(val) &&
				typeof (val as { activeBreakpoints?: unknown }).activeBreakpoints === 'boolean'
			) {
				out[pt] = JSON.parse(JSON.stringify(val));
				continue;
			}
			if (isPageModulesBreakpointMapForPage(val)) {
				out[pt] = JSON.parse(JSON.stringify(val));
				continue;
			}
			if (!Array.isArray(val)) continue;
			out[pt] = val.map((m: any, i) => {
				if (m.rowOrder !== undefined && m.columnIndex !== undefined) return m;
				const normalizedType = normalizeModuleType(m?.type);
				return { ...m, type: normalizedType, rowOrder: i, columnIndex: 0 };
			});
		}
		return out;
	}

	function refreshPageModulesActiveBreakpointsMap(): void {
		const next: Record<string, boolean> = {};
		for (const pk of PAGE_KEYS) {
			const row = localOverrides.pageModules?.[pk];
			if (
				row &&
				typeof row === 'object' &&
				!Array.isArray(row) &&
				typeof (row as { activeBreakpoints?: unknown }).activeBreakpoints === 'boolean'
			) {
				next[pk] = (row as { activeBreakpoints: boolean }).activeBreakpoints;
			} else {
				next[pk] = true;
			}
		}
		pageModulesActiveBreakpoints = next;
	}

	function syncLegacyFromBreakpoints() {
		const shell = localOverrides.customLayoutByBreakpoint;
		const customLayout = shell
			? shellByBreakpointToCustomLayoutField(shell as Record<TemplateBreakpointId, ShellLayout>)
			: localOverrides.customLayout;
		const plByIn = { ...(localOverrides.pageLayoutByBreakpoint || {}) };
		for (const pk of Object.keys(plByIn)) {
			const row = plByIn[pk];
			if (!row || Object.keys(row).length === 0) {
				delete plByIn[pk];
				continue;
			}
			plByIn[pk] = normalizePageLayoutRowForPersistence(pk, row) as (typeof plByIn)[string];
		}
		const pl = pageLayoutByBreakpointToPageLayoutField(plByIn);
		const pm = pageModulesByBreakpointToPageModulesField(
			localOverrides.pageModulesByBreakpoint || {},
			pageModulesActiveBreakpoints
		);
		localOverrides = {
			...localOverrides,
			customLayout,
			pageLayout: pl,
			pageModules: pm,
			...(Object.keys(plByIn).length > 0 ? { pageLayoutByBreakpoint: plByIn } : {})
		};
		refreshPageModulesActiveBreakpointsMap();
	}

	$: sameGridToAllBreakpoints = pageModulesActiveBreakpoints[editingPageType] === false;

	/** Reactive source for the visual layout grid (depends explicitly on localOverrides). */
	$: layoutEditorModules = (() => {
		const lo = localOverrides;
		const pt = editingPageType;
		const bp = editingBreakpoint;
		const byBpRow = lo.pageModulesByBreakpoint?.[pt] as
			| Partial<Record<TemplateBreakpointId, any[]>>
			| undefined;
		const fromByBp = pickModulesFromEditorBreakpointMap(byBpRow, bp);
		if (Array.isArray(fromByBp)) return fromByBp;
		const resolved = getPageModulesForBreakpoint(
			{
				pageModules: lo.pageModules
			},
			pt,
			bp
		);
		if (resolved.length > 0) return resolved as any[];
		const hasAnyPageModulesConfig = lo.pageModules?.[pt] != null;
		if (hasAnyPageModulesConfig) return resolved as any[];
		return (DEFAULT_PAGE_MODULES[pt] || []) as any[];
	})();

	/** Drives layout grid {#key} so row swaps re-render even when module count is unchanged. */
	$: layoutEditorModulesKey = (layoutEditorModules ?? [])
		.map(
			(m: any) =>
				`${m?._id ?? ''}:${m?.rowOrder ?? 0}:${m?.columnIndex ?? 0}:${m?.rowSpan ?? 1}:${m?.colSpan ?? 1}`
		)
		.join('|');

	function pickModulesFromEditorBreakpointMap(
		row: Partial<Record<TemplateBreakpointId, any[]>> | undefined,
		bp: TemplateBreakpointId
	): any[] | undefined {
		if (!row) return undefined;
		if (row[bp] !== undefined) return row[bp] as any[];
		const order = TEMPLATE_BREAKPOINTS as readonly TemplateBreakpointId[];
		const idx = order.indexOf(bp);
		for (let i = idx - 1; i >= 0; i--) {
			const b = order[i]!;
			if (row[b] !== undefined) return row[b] as any[];
		}
		for (let i = idx + 1; i < order.length; i++) {
			const b = order[i]!;
			if (row[b] !== undefined) return row[b] as any[];
		}
		return undefined;
	}

	function getModulesForPageType(pt: string, bp: TemplateBreakpointId) {
		const byBpRow = localOverrides.pageModulesByBreakpoint?.[pt] as
			| Partial<Record<TemplateBreakpointId, any[]>>
			| undefined;
		const fromByBp = pickModulesFromEditorBreakpointMap(byBpRow, bp);
		if (Array.isArray(fromByBp)) return fromByBp;
		const resolved = getPageModulesForBreakpoint(
			{
				pageModules: localOverrides.pageModules
			},
			pt,
			bp
		);
		if (resolved.length > 0) return resolved;
		const hasAnyPageModulesConfig =
			localOverrides.pageModules?.[pt] != null;
		if (hasAnyPageModulesConfig) return resolved;
		return DEFAULT_PAGE_MODULES[pt] || [];
	}

	function getGridForPageType(pt: string, bp: TemplateBreakpointId): { gridRows: number; gridColumns: number } {
		return getPageGridForBreakpoint(
			{
				pageLayout: localOverrides.pageLayout,
				pageLayoutByBreakpoint: localOverrides.pageLayoutByBreakpoint
			},
			pt,
			bp
		);
	}

	function updateGridForPageType(pt: string, gridRows?: number, gridColumns?: number) {
		const bp = editingBreakpoint;
		const current = getGridForPageType(pt, bp);
		const next = {
			gridRows: gridRows ?? current.gridRows,
			gridColumns: gridColumns ?? current.gridColumns
		};
		if (next.gridRows < 1) next.gridRows = 1;
		if (next.gridRows > 20) next.gridRows = 20;
		if (next.gridColumns < 1) next.gridColumns = 1;
		if (next.gridColumns > 20) next.gridColumns = 20;
		const arr = getModulesForPageType(pt, bp) ?? [];
		const keep = arr.filter((m: any) => {
			const r = m.rowOrder ?? 0;
			const c = m.columnIndex ?? 0;
			const rs = m.rowSpan ?? 1;
			const cs = m.colSpan ?? 1;
			return r >= 0 && c >= 0 && r + rs <= next.gridRows && c + cs <= next.gridColumns;
		});
		const plBy = { ...(localOverrides.pageLayoutByBreakpoint || {}) };
		const existingRow = plBy[pt];
		const fullRow = mergePageLayoutRowForBreakpointEdit(
			{
				pageLayout: localOverrides.pageLayout,
				pageLayoutByBreakpoint: localOverrides.pageLayoutByBreakpoint
			},
			pt,
			bp,
			next,
			existingRow
		);
		plBy[pt] = fullRow;
		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		const rowM = { ...(pmBy[pt] || {}), [bp]: keep };
		pmBy[pt] = rowM;
		localOverrides = { ...localOverrides, pageLayoutByBreakpoint: plBy, pageModulesByBreakpoint: pmBy };
		syncLegacyFromBreakpoints();
		hasChanges = true;
	}

	/**
	 * When `pageModules[page].activeBreakpoints === false` (“same modules for all widths”), persisted modules
	 * collapse to a single list taken from `lg` first (`pageModulesByBreakpointToPageModulesField`). Writes
	 * that only touch e.g. `xs` are ignored — broadcast the edited list to every breakpoint.
	 */
	function rowOrderNum(m: any): number {
		const v = Number(m?.rowOrder ?? 0);
		return Number.isFinite(v) ? Math.trunc(v) : 0;
	}

	function putPageModulesForBreakpointOrAll(
		pt: string,
		bp: TemplateBreakpointId,
		nextMods: any[]
	): void {
		const serialized = JSON.parse(JSON.stringify(nextMods)) as any[];
		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		const prev = (pmBy[pt] || {}) as Partial<Record<TemplateBreakpointId, any[]>>;
		let row: Partial<Record<TemplateBreakpointId, any[]>>;
		if (pageModulesActiveBreakpoints[pt] === false) {
			row = {};
			for (const b of TEMPLATE_BREAKPOINTS) {
				row[b] = JSON.parse(JSON.stringify(serialized)) as any[];
			}
		} else {
			row = { ...prev, [bp]: serialized };
		}
		pmBy[pt] = row;
		localOverrides = { ...localOverrides, pageModulesByBreakpoint: pmBy };
	}

	/**
	 * Swap two adjacent grid rows in a direction-safe way.
	 * Keeps unaffected rows untouched and normalizes rowOrder to numeric indices.
	 */
	function movePageGridRow(pt: string, fromIndex: number, toIndex: number) {
		const bp = editingBreakpoint;
		const grid = getGridForPageType(pt, bp);
		const rows = Math.max(1, grid.gridRows);
		const from = Math.max(0, Math.min(rows - 1, Math.floor(fromIndex) || 0));
		const to = Math.max(0, Math.min(rows - 1, Math.floor(toIndex) || 0));
		if (from === to || Math.abs(from - to) !== 1) return;
		const delta = to > from ? 1 : -1;
		const arr = [...(getModulesForPageType(pt, bp) ?? [])];
		const nextMods = arr.map((m: any) => {
			const r = rowOrderNum(m);
			const copy = { ...m, rowOrder: r };
			if (r === from) copy.rowOrder = r + delta;
			else if (r === to) copy.rowOrder = r - delta;
			return copy;
		});
		putPageModulesForBreakpointOrAll(pt, bp, nextMods);
		syncLegacyFromBreakpoints();
		hasChanges = true;
		clearSelection();
	}

	/** Insert an empty row at `atIndex` (0 = top); shifts modules with `rowOrder >= atIndex` down by one. */
	function insertPageGridRow(pt: string, atIndex: number) {
		const bp = editingBreakpoint;
		const grid = getGridForPageType(pt, bp);
		const rows = Math.max(1, grid.gridRows);
		if (rows >= 20) return;
		const idx = Math.max(0, Math.min(rows, Math.floor(atIndex) || 0));
		const arr = [...(getModulesForPageType(pt, bp) ?? [])];
		const nextMods = arr.map((m: any) => {
			const r = rowOrderNum(m);
			const copy = { ...m, rowOrder: r };
			if (r >= idx) copy.rowOrder = r + 1;
			return copy;
		});
		const nextGrid = { gridRows: rows + 1, gridColumns: grid.gridColumns };
		const plBy = { ...(localOverrides.pageLayoutByBreakpoint || {}) };
		let fullRow: Record<TemplateBreakpointId, { gridRows: number; gridColumns: number }>;
		if (pageModulesActiveBreakpoints[pt] === false) {
			fullRow = {} as Record<TemplateBreakpointId, { gridRows: number; gridColumns: number }>;
			for (const b of TEMPLATE_BREAKPOINTS) {
				fullRow[b] = { ...nextGrid };
			}
		} else {
			fullRow = mergePageLayoutRowForBreakpointEdit(
				{
					pageLayout: localOverrides.pageLayout,
					pageLayoutByBreakpoint: localOverrides.pageLayoutByBreakpoint
				},
				pt,
				bp,
				nextGrid,
				plBy[pt]
			);
		}
		plBy[pt] = fullRow;
		putPageModulesForBreakpointOrAll(pt, bp, nextMods);
		localOverrides = { ...localOverrides, pageLayoutByBreakpoint: plBy, pageModulesByBreakpoint: localOverrides.pageModulesByBreakpoint };
		syncLegacyFromBreakpoints();
		hasChanges = true;
		clearSelection();
	}

	/** Remove one grid row: drops modules occupying that band, shifts rows below up (inverse of insert). */
	function deletePageGridRow(pt: string, rowIndex: number) {
		const bp = editingBreakpoint;
		const grid = getGridForPageType(pt, bp);
		const rows = Math.max(1, grid.gridRows);
		if (rows <= 1) return;
		const del = Math.max(0, Math.min(rows - 1, Math.floor(rowIndex) || 0));
		const arr = [...(getModulesForPageType(pt, bp) ?? [])];
		const nextMods = arr
			.filter((m: any) => {
				const r = rowOrderNum(m);
				const rs = Math.max(1, Math.trunc(Number(m.rowSpan ?? 1)) || 1);
				const overlaps = r < del + 1 && r + rs > del;
				return !overlaps;
			})
			.map((m: any) => {
				const r = rowOrderNum(m);
				const copy = { ...m, rowOrder: r };
				if (r > del) copy.rowOrder = r - 1;
				return copy;
			});
		const nextGrid = { gridRows: rows - 1, gridColumns: grid.gridColumns };
		const plBy = { ...(localOverrides.pageLayoutByBreakpoint || {}) };
		let fullRow: Record<TemplateBreakpointId, { gridRows: number; gridColumns: number }>;
		if (pageModulesActiveBreakpoints[pt] === false) {
			fullRow = {} as Record<TemplateBreakpointId, { gridRows: number; gridColumns: number }>;
			for (const b of TEMPLATE_BREAKPOINTS) {
				fullRow[b] = { ...nextGrid };
			}
		} else {
			fullRow = mergePageLayoutRowForBreakpointEdit(
				{
					pageLayout: localOverrides.pageLayout,
					pageLayoutByBreakpoint: localOverrides.pageLayoutByBreakpoint
				},
				pt,
				bp,
				nextGrid,
				plBy[pt]
			);
		}
		plBy[pt] = fullRow;
		putPageModulesForBreakpointOrAll(pt, bp, nextMods);
		localOverrides = { ...localOverrides, pageLayoutByBreakpoint: plBy, pageModulesByBreakpoint: localOverrides.pageModulesByBreakpoint };
		syncLegacyFromBreakpoints();
		hasChanges = true;
		clearSelection();
	}

	/** Copy current breakpoint’s grid and module placements to xs…xl for the active page (TEMPLATING.md §2.2.4). */
	function applyCurrentBreakpointToAllForEditingPage() {
		const pt = editingPageType;
		const bp = editingBreakpoint;
		let grid = { ...getGridForPageType(pt, bp) };
		if (grid.gridRows < 1) grid.gridRows = 1;
		if (grid.gridRows > 20) grid.gridRows = 20;
		if (grid.gridColumns < 1) grid.gridColumns = 1;
		if (grid.gridColumns > 20) grid.gridColumns = 20;
		const modsRaw = (getModulesForPageType(pt, bp) ?? []) as any[];
		const modsFit = modsRaw.filter((m) => {
			const r = m.rowOrder ?? 0;
			const c = m.columnIndex ?? 0;
			const rs = m.rowSpan ?? 1;
			const cs = m.colSpan ?? 1;
			return r >= 0 && c >= 0 && r + rs <= grid.gridRows && c + cs <= grid.gridColumns;
		});
		const modsJson = JSON.stringify(modsFit);
		const fullRow = {} as Record<TemplateBreakpointId, { gridRows: number; gridColumns: number }>;
		for (const b of TEMPLATE_BREAKPOINTS) {
			fullRow[b] = { gridRows: grid.gridRows, gridColumns: grid.gridColumns };
		}
		const plBy = { ...(localOverrides.pageLayoutByBreakpoint || {}) };
		plBy[pt] = fullRow;
		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		const rowM: Partial<Record<TemplateBreakpointId, any[]>> = {
			...((pmBy[pt] as Partial<Record<TemplateBreakpointId, any[]>> | undefined) || {})
		};
		for (const b of TEMPLATE_BREAKPOINTS) {
			rowM[b] = JSON.parse(modsJson) as any[];
		}
		pmBy[pt] = rowM;
		localOverrides = { ...localOverrides, pageLayoutByBreakpoint: plBy, pageModulesByBreakpoint: pmBy };
		syncLegacyFromBreakpoints();
		hasChanges = true;
		clearSelection();
	}

	function setSameGridToAllBreakpointsForEditingPage(enabled: boolean) {
		pageModulesActiveBreakpoints = {
			...pageModulesActiveBreakpoints,
			[editingPageType]: !enabled
		};
		if (enabled) {
			applyCurrentBreakpointToAllForEditingPage();
			editingBreakpoint = 'lg';
		} else {
			hasChanges = true;
		}
	}

	function stableStringify(value: any): string {
		if (value === null || value === undefined) return JSON.stringify(value);
		const t = typeof value;
		if (t === 'number' || t === 'boolean' || t === 'string') return JSON.stringify(value);
		if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
		if (t !== 'object') return JSON.stringify(value);

		const keys = Object.keys(value).sort();
		return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
	}

	function modulePlacementSignature(mods: any[]): string {
		const normalized = (mods ?? [])
			.map((m) => {
				const props = m?.props && typeof m.props === 'object' ? m.props : {};
				return {
					type: m?.type ?? '',
					rowOrder: m?.rowOrder ?? 0,
					columnIndex: m?.columnIndex ?? 0,
					rowSpan: m?.rowSpan ?? 1,
					colSpan: m?.colSpan ?? 1,
					props
				};
			})
			.sort((a, b) => {
				const orderA = [a.type, a.rowOrder, a.columnIndex, a.rowSpan, a.colSpan];
				const orderB = [b.type, b.rowOrder, b.columnIndex, b.rowSpan, b.colSpan];
				for (let i = 0; i < orderA.length; i++) {
					// strings vs numbers both compare via < >
					if (orderA[i] !== orderB[i]) return orderA[i] < orderB[i] ? -1 : 1;
				}
				return stableStringify(a.props).localeCompare(stableStringify(b.props));
			});

		return stableStringify(normalized);
	}

	$: showApplyCurrentBreakpointToAllBreakpoints = (() => {
		const pt = editingPageType;
		const curBp = editingBreakpoint;
		const baseGrid = getGridForPageType(pt, curBp);
		const baseModsSig = modulePlacementSignature(getModulesForPageType(pt, curBp) ?? []);

		for (const bp of TEMPLATE_BREAKPOINTS) {
			const g = getGridForPageType(pt, bp);
			if (g.gridRows !== baseGrid.gridRows || g.gridColumns !== baseGrid.gridColumns) return true;
			const sig = modulePlacementSignature(getModulesForPageType(pt, bp) ?? []);
			if (sig !== baseModsSig) return true;
		}
		return false;
	})();

	function getModuleAtCell(pt: string, row: number, col: number) {
		const arr = getModulesForPageType(pt, editingBreakpoint);
		return arr.find((m) => (m.rowOrder ?? 0) === row && (m.columnIndex ?? 0) === col);
	}

	/** Check if cell (r,c) is covered by a module span but not the origin */
	function isCellCovered(pt: string, r: number, c: number) {
		for (const m of getModulesForPageType(pt, editingBreakpoint)) {
			if (m.rowOrder === undefined || m.columnIndex === undefined) continue;
			const rs = m.rowSpan ?? 1;
			const cs = m.colSpan ?? 1;
			const inSpan = r >= m.rowOrder && r < m.rowOrder + rs && c >= m.columnIndex && c < m.columnIndex + cs;
			const isOrigin = r === m.rowOrder && c === m.columnIndex;
			if (inSpan && !isOrigin) return m;
		}
		return null;
	}

	function cellKey(row: number, col: number): string {
		return `${row}:${col}`;
	}

	function toggleCell(row: number, col: number) {
		const key = cellKey(row, col);
		const next = new Set(selectedCells);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		selectedCells = next;
	}

	function selectAllEmptyCells() {
		const grid = getGridForPageType(editingPageType, editingBreakpoint);
		const next = new Set<string>();
		for (let r = 0; r < grid.gridRows; r++) {
			for (let c = 0; c < grid.gridColumns; c++) {
				if (getModuleAtCell(editingPageType, r, c) || isCellCovered(editingPageType, r, c)) continue;
				next.add(cellKey(r, c));
			}
		}
		selectedCells = next;
	}

	function clearSelection() {
		selectedCells = new Set();
		assignedModuleType = '';
		editingModule = null;
	}

	/** Ephemeral: layout-shell inner grid — must survive `editingModule = { ...editingModule, … }` from placement/orientation controls. */
	const PB_PRESET_KEY = '__pbLayoutPresetKey';
	const PB_MODULE_INDEX = '__pbLayoutModuleIndex';

	function stripLayoutPresetEditMeta(m: Record<string, any>): Record<string, any> {
		const o = { ...m };
		delete o[PB_PRESET_KEY];
		delete o[PB_MODULE_INDEX];
		return o;
	}

	function saveModuleChanges() {
		if (!editingModule) return;
		if (editingModule.type === 'albumGallery') {
			editingModule = { ...editingModule, type: 'albumView' };
		}
		// Editing a module inside a named layout region (layoutShell inner grid).
		const epk = String(
			(editingModule as any)[PB_PRESET_KEY] ?? editingInnerLayoutPresetKey ?? ''
		).trim();
		const rawInnerIdx = (editingModule as any)[PB_MODULE_INDEX];
		let eidx =
			typeof rawInnerIdx === 'number' && Number.isFinite(rawInnerIdx)
				? rawInnerIdx
				: editingInnerLayoutModuleIndex;
		if (epk && eidx < 0 && editingModule._id) {
			const shell = (localOverrides.layoutPresets || {})[epk] as { modules?: unknown[] } | undefined;
			const list = shell && Array.isArray(shell.modules) ? shell.modules : [];
			const found = list.findIndex((m: any) => m && m._id === editingModule._id);
			if (found >= 0) eidx = found;
		}
		if (epk && eidx >= 0) {
			const k = epk;
			const cur = { ...(localOverrides.layoutPresets || {}) };
			const prev = cur[k];
			const list = prev && Array.isArray(prev.modules) ? prev.modules : [];
			let modIndex = eidx;
			const atIdx = list[modIndex] as { _id?: string } | undefined;
			const id = editingModule._id;
			if (id && (!atIdx || atIdx._id !== id)) {
				const found = list.findIndex((m: any) => m && m._id === id);
				if (found >= 0) modIndex = found;
			}
			if (prev && Array.isArray(prev.modules) && prev.modules[modIndex] !== undefined) {
				const modules = [...prev.modules];
				modules[modIndex] = stripLayoutPresetEditMeta(editingModule as Record<string, any>);
				cur[k] = { ...prev, modules };
				localOverrides = { ...localOverrides, layoutPresets: cur };
				hasChanges = true;
				editingModule = null;
				editingInnerLayoutPresetKey = '';
				editingInnerLayoutModuleIndex = -1;
			} else {
				layoutShellPresetKeyError =
					'Could not save this inner module (preset data or module index is out of date). Close and try again.';
			}
			return;
		}
		const modulesForPage = getModulesForPageType(editingPageType, editingBreakpoint) ?? [];
		let idx = modulesForPage.findIndex((m) => editingModule._id && m._id === editingModule._id);
		// Backward compatibility: older saved modules may not have _id; match by placement + type.
		if (idx < 0) {
			idx = modulesForPage.findIndex((m) =>
				m.type === editingModule.type &&
				(m.rowOrder ?? 0) === (editingModule.rowOrder ?? 0) &&
				(m.columnIndex ?? 0) === (editingModule.columnIndex ?? 0)
			);
		}
		if (editingModule.type === 'layoutShell') {
			const pk = String(editingModule.props?.presetKey ?? '').trim();
			if (!pk) {
				layoutShellPresetKeyError = 'Choose an existing preset or enter a new unique name.';
				return;
			}
			const prevPk =
				idx >= 0
					? String((modulesForPage[idx] as any)?.props?.presetKey ?? '').trim()
					: '';
			const exists = !!localOverrides.layoutPresets?.[pk];
			if (exists && pk !== prevPk && !layoutShellUseExistingSelection) {
				layoutShellPresetKeyError = `Preset "${pk}" already exists. Pick it from "Reuse existing preset" or enter a unique name.`;
				return;
			}
			const nextPresets = { ...(localOverrides.layoutPresets || {}) } as Record<string, any>;
			if (prevPk && prevPk !== pk && nextPresets[prevPk] && !nextPresets[pk]) {
				nextPresets[pk] = JSON.parse(JSON.stringify(nextPresets[prevPk]));
			}
			if (!nextPresets[pk]) nextPresets[pk] = { gridRows: 1, gridColumns: 1, modules: [] };
			localOverrides = { ...localOverrides, layoutPresets: nextPresets };
			layoutShellPresetKeyError = '';
			hasChanges = true;
		}
		if (idx >= 0) {
			const arr = [...modulesForPage];
			const updated = [...arr];
			updated[idx] = stripLayoutPresetEditMeta({ ...(editingModule as Record<string, any>) });
			const bp = editingBreakpoint;
			const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
			pmBy[editingPageType] = { ...(pmBy[editingPageType] || {}), [bp]: updated };
			localOverrides = { ...localOverrides, pageModulesByBreakpoint: pmBy };
			syncLegacyFromBreakpoints();
			hasChanges = true;
		} else if (
			!(editingModule as any)[PB_PRESET_KEY] &&
			!editingInnerLayoutPresetKey &&
			editingModule.type !== 'layoutShell'
		) {
			layoutShellPresetKeyError =
				'Could not find this module on the current page grid (it may only exist inside a layout region — open the layout region and use Edit on the inner block).';
			return;
		}
		editingModule = null;
		editingInnerLayoutPresetKey = '';
		editingInnerLayoutModuleIndex = -1;
		layoutShellOriginalPresetKey = '';
	}

	$: selectedCount = selectedCells.size;
	$: selectedCellsArray = Array.from(selectedCells).map((key) => {
		const [r, c] = key.split(':').map(Number);
		return { row: r, col: c };
	});
	$: selectionBounds = (() => {
		if (selectedCellsArray.length === 0) return null;
		const minRow = Math.min(...selectedCellsArray.map((c) => c.row));
		const maxRow = Math.max(...selectedCellsArray.map((c) => c.row));
		const minCol = Math.min(...selectedCellsArray.map((c) => c.col));
		const maxCol = Math.max(...selectedCellsArray.map((c) => c.col));
		return { rowOrder: minRow, columnIndex: minCol, rowSpan: maxRow - minRow + 1, colSpan: maxCol - minCol + 1 };
	})();

	let assignedModuleType = '';
	let editingModule: any | null = null;
let editingInnerLayoutPresetKey = '';
let editingInnerLayoutModuleIndex = -1;
	let layoutShellReusePick = '';
let layoutShellOriginalPresetKey = '';
let layoutShellUseExistingSelection = false;
let layoutShellPresetKeyError = '';
	let layoutShellPresetDeleteInfo = '';
	// Layout shell editor (inner grid assignment)
	let layoutShellInnerAssignedModuleType = '';
	let layoutShellInnerSelectedCells = new Set<string>();
	let layoutShellInnerEditingRow = 0;
let draggedAlbumField: string | null = null;
let draggedPhotoField: string | null = null;
let draggedAlbumHeaderField: string | null = null;
	let availableBlogCategories: Array<{ alias: string; title: string }> = [];

	async function loadBlogCategoriesForOverrides() {
		try {
			const response = await fetch('/api/admin/blog-categories?limit=200&isActive=true', {
				credentials: 'include'
			});
			if (!response.ok) return;
			const result = await response.json();
			const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
			availableBlogCategories = rows
				.map((c: { alias?: string; title?: unknown }) => {
					const alias = String(c.alias || '').trim();
					const titleObj = c.title as MultiLangText | string | undefined;
					const title =
						typeof titleObj === 'string' ? titleObj : titleObj?.en || titleObj?.he || alias;
					return { alias, title };
				})
				.filter((c: { alias: string }) => Boolean(c.alias))
				.sort((a, b) =>
					a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
				);
		} catch (err) {
			logger.warn('Failed to load blog categories for template overrides:', err);
		}
	}

	function handleAssignToSelected(moduleType?: string) {
		const type = moduleType || assignedModuleType;
		logger.debug('[Overrides] handleAssignToSelected called:', { type, moduleType, assignedModuleType, selectionBounds, selectedCount });
		if (!type) {
			logger.warn('[Overrides] No module type provided');
			return;
		}
		if (!selectionBounds) {
			logger.warn('[Overrides] No selection bounds');
			return;
		}
		logger.debug('[Overrides] Assigning module:', { 
			pageType: editingPageType, 
			moduleType: type, 
			rowOrder: selectionBounds.rowOrder, 
			columnIndex: selectionBounds.columnIndex,
			rowSpan: selectionBounds.rowSpan,
			colSpan: selectionBounds.colSpan
		});
		addModuleToPage(editingPageType, type, selectionBounds.rowOrder, selectionBounds.columnIndex, selectionBounds.rowSpan, selectionBounds.colSpan);
		clearSelection();
		assignedModuleType = '';
	}

	function getDefaultPropsForNewModule(moduleType: string): Record<string, any> {
		const defaultProps: Record<string, any> = {};
		if (moduleType === 'albumsGrid' || moduleType === 'albumView' || moduleType === 'albumGallery') {
			defaultProps.albumSource = 'root';
			defaultProps.showTitle = true;
			defaultProps.showAlbumTitle = true;
			defaultProps.showPhotoTitle = true;
			defaultProps.albumHeaderFieldOrder = ['albumTitle', 'albumDescription', 'albumStats'];
			defaultProps.showAlbumPageTitle = true;
			defaultProps.showAlbumPageDescription = true;
			defaultProps.showAlbumPageStats = true;
			defaultProps.showCover = true;
			defaultProps.coverAspect = 'video';
			defaultProps.showDescription = true;
			defaultProps.showAlbumDescription = true;
			defaultProps.showPhotoDescription = true;
			defaultProps.descriptionLines = 2;
			defaultProps.cardFieldOrder = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
			defaultProps.albumCardFieldOrder = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
			defaultProps.albumCardLayout = 'stack';
			defaultProps.photoCardFieldOrder = ['cover', 'title', 'description', 'featuredBadge'];
			defaultProps.showPhotoCount = true;
			defaultProps.showFeaturedBadge = true;
			defaultProps.showAlbumFeaturedBadge = true;
			defaultProps.showPhotoFeaturedBadge = true;
			defaultProps.cardDataType = moduleType === 'albumView' || moduleType === 'albumGallery' ? 'both' : 'subAlbums';
			defaultProps.mixedDisplayMode = 'grouped';
			defaultProps.showSectionLabels = true;
			defaultProps.sortBy = 'manual';
			defaultProps.sortDirection = 'asc';
			defaultProps.limit = 12;
		} else if (moduleType === 'hero') {
			defaultProps.backgroundStyle = 'light';
		} else if (moduleType === 'richText') {
			defaultProps.background = 'white';
		}
		return defaultProps;
	}

	function addModuleToPage(pageType: string, moduleType: string, rowOrder?: number, columnIndex?: number, rowSpan?: number, colSpan?: number) {
		const bp = editingBreakpoint;
		const grid = getGridForPageType(pageType, bp);
		const arr = [...(getModulesForPageType(pageType, bp) ?? [])];
		const plBy = { ...(localOverrides.pageLayoutByBreakpoint || {}) };
		const fullRowPl = mergePageLayoutRowForBreakpointEdit(
			{
				pageLayout: localOverrides.pageLayout,
				pageLayoutByBreakpoint: localOverrides.pageLayoutByBreakpoint
			},
			pageType,
			bp,
			{ gridRows: grid.gridRows, gridColumns: grid.gridColumns },
			plBy[pageType]
		);
		plBy[pageType] = fullRowPl;

		let r = rowOrder;
		let c = columnIndex ?? 0;
		if (r === undefined) {
			for (let ri = 0; ri < grid.gridRows; ri++) {
				for (let ci = 0; ci < grid.gridColumns; ci++) {
					if (!getModuleAtCell(pageType, ri, ci)) {
						r = ri;
						c = ci;
						break;
					}
				}
				if (r !== undefined) break;
			}
			if (r === undefined) {
				r = grid.gridRows - 1;
				c = grid.gridColumns - 1;
			}
		}
		const id = `mod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		const defaultProps = getDefaultPropsForNewModule(moduleType);
		let layoutPresetPatch: Partial<typeof localOverrides> = {};
		if (moduleType === 'layoutShell') {
			// Must be selected from existing presets or entered as a unique name in the edit modal.
			defaultProps.presetKey = '';
		}
		const newMod: Record<string, any> = { _id: id, type: moduleType, props: defaultProps, rowOrder: r, columnIndex: c };
		if (rowSpan && rowSpan > 1) newMod.rowSpan = rowSpan;
		if (colSpan && colSpan > 1) newMod.colSpan = colSpan;

		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		const rowM = { ...(pmBy[pageType] || {}), [bp]: [...arr, newMod] };
		pmBy[pageType] = rowM;
		localOverrides = {
			...localOverrides,
			pageLayoutByBreakpoint: plBy,
			pageModulesByBreakpoint: pmBy,
			...(layoutPresetPatch.layoutPresets ? { layoutPresets: layoutPresetPatch.layoutPresets } : {})
		};
		syncLegacyFromBreakpoints();
		hasChanges = true;
		logger.debug('[Overrides] Added module:', { pageType, moduleType, rowOrder: r, columnIndex: c, rowSpan, colSpan });
	}

	function removeModuleFromPage(pageType: string, index: number) {
		const arr = [...(getModulesForPageType(pageType, editingBreakpoint) ?? [])];
		if (!arr.length) return;
		const bp = editingBreakpoint;
		const next = arr.filter((_, i) => i !== index);
		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		pmBy[pageType] = { ...(pmBy[pageType] || {}), [bp]: next };
		localOverrides = { ...localOverrides, pageModulesByBreakpoint: pmBy };
		syncLegacyFromBreakpoints();
		hasChanges = true;
	}

	function removeModuleFromCell(pageType: string, row: number, col: number) {
		const arr = [...(getModulesForPageType(pageType, editingBreakpoint) ?? [])];
		const bp = editingBreakpoint;
		const filtered = arr.filter((m) => (m.rowOrder ?? 0) !== row || (m.columnIndex ?? 0) !== col);
		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		pmBy[pageType] = { ...(pmBy[pageType] || {}), [bp]: filtered };
		localOverrides = { ...localOverrides, pageModulesByBreakpoint: pmBy };
		syncLegacyFromBreakpoints();
		hasChanges = true;
	}

	function replaceModuleInCell(pageType: string, row: number, col: number, newType: string) {
		const arr = [...(getModulesForPageType(pageType, editingBreakpoint) ?? [])];
		const idx = arr.findIndex((m) => (m.rowOrder ?? 0) === row && (m.columnIndex ?? 0) === col);
		if (idx < 0) return;
		const bp = editingBreakpoint;
		const old = arr[idx];
		const defaultProps: Record<string, any> = {};
		if (newType === 'albumsGrid' || newType === 'albumView' || newType === 'albumGallery') {
			defaultProps.albumSource = old.props?.albumSource ?? 'root';
			defaultProps.showTitle = old.props?.showTitle ?? true;
			defaultProps.showAlbumTitle = old.props?.showAlbumTitle ?? old.props?.showTitle ?? true;
			defaultProps.showPhotoTitle = old.props?.showPhotoTitle ?? old.props?.showTitle ?? true;
			defaultProps.albumHeaderFieldOrder = Array.isArray(old.props?.albumHeaderFieldOrder)
				? old.props.albumHeaderFieldOrder
				: ['albumTitle', 'albumDescription', 'albumStats'];
			defaultProps.showAlbumPageTitle = old.props?.showAlbumPageTitle ?? true;
			defaultProps.showAlbumPageDescription = old.props?.showAlbumPageDescription ?? true;
			defaultProps.showAlbumPageStats = old.props?.showAlbumPageStats ?? true;
			defaultProps.showCover = old.props?.showCover ?? true;
			defaultProps.coverAspect = old.props?.coverAspect ?? 'video';
			defaultProps.showDescription = old.props?.showDescription ?? true;
			defaultProps.showAlbumDescription = old.props?.showAlbumDescription ?? old.props?.showDescription ?? true;
			defaultProps.showPhotoDescription = old.props?.showPhotoDescription ?? old.props?.showDescription ?? true;
			defaultProps.descriptionLines = old.props?.descriptionLines ?? 2;
			defaultProps.cardFieldOrder = Array.isArray(old.props?.cardFieldOrder)
				? old.props.cardFieldOrder
				: ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
			defaultProps.albumCardFieldOrder = Array.isArray(old.props?.albumCardFieldOrder)
				? old.props.albumCardFieldOrder
				: (Array.isArray(old.props?.cardFieldOrder) ? old.props.cardFieldOrder : ['cover', 'title', 'description', 'photoCount', 'featuredBadge']);
			defaultProps.photoCardFieldOrder = Array.isArray(old.props?.photoCardFieldOrder)
				? old.props.photoCardFieldOrder
				: (Array.isArray(old.props?.cardFieldOrder)
					? old.props.cardFieldOrder.filter((k: string) => k !== 'photoCount')
					: ['cover', 'title', 'description', 'featuredBadge']);
			defaultProps.showPhotoCount = old.props?.showPhotoCount ?? true;
			defaultProps.showFeaturedBadge = old.props?.showFeaturedBadge ?? true;
			defaultProps.showAlbumFeaturedBadge = old.props?.showAlbumFeaturedBadge ?? old.props?.showFeaturedBadge ?? true;
			defaultProps.showPhotoFeaturedBadge = old.props?.showPhotoFeaturedBadge ?? old.props?.showFeaturedBadge ?? true;
			defaultProps.cardDataType = old.props?.cardDataType ?? (newType === 'albumView' || newType === 'albumGallery' ? 'both' : 'subAlbums');
			defaultProps.mixedDisplayMode = old.props?.mixedDisplayMode ?? 'grouped';
			defaultProps.showSectionLabels = old.props?.showSectionLabels ?? true;
			defaultProps.sortBy = old.props?.sortBy ?? 'manual';
			defaultProps.sortDirection = old.props?.sortDirection ?? 'asc';
			defaultProps.limit = old.props?.limit ?? 12;
		} else if (newType === 'layoutShell') {
			defaultProps.presetKey = '';
		}
		const updated = [...arr];
		updated[idx] = { ...old, type: newType, props: defaultProps };
		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		pmBy[pageType] = { ...(pmBy[pageType] || {}), [bp]: updated };
		const lpExtra = {};
		localOverrides = { ...localOverrides, pageModulesByBreakpoint: pmBy, ...lpExtra };
		syncLegacyFromBreakpoints();
		hasChanges = true;
	}

	function ensureLayoutPresetEntry(key: string): void {
		const k = key.trim();
		if (!k) return;
		const cur = localOverrides.layoutPresets || {};
		if (cur[k]) return;
		localOverrides = {
			...localOverrides,
			layoutPresets: { ...cur, [k]: { gridRows: 1, gridColumns: 1, modules: [] } }
		};
		hasChanges = true;
	}

	function updateLayoutShellPresetGrid(key: string, gridRows: number, gridColumns: number) {
		const k = key.trim();
		if (!k) return;
		ensureLayoutPresetEntry(k);
		const cur = { ...(localOverrides.layoutPresets || {}) };
		const prev = cur[k] || { gridRows: 1, gridColumns: 1, modules: [] };
		cur[k] = {
			...prev,
			gridRows: Math.max(1, Math.min(12, Math.floor(gridRows) || 1)),
			gridColumns: Math.max(1, Math.min(12, Math.floor(gridColumns) || 1)),
			modules: Array.isArray(prev.modules) ? prev.modules : []
		};
		localOverrides = { ...localOverrides, layoutPresets: cur };
		hasChanges = true;
	}

	function layoutShellInnerCellKey(row: number, col: number): string {
		return `${row}:${col}`;
	}

	function getLayoutPresetShell(pk: string): { gridRows?: number; gridColumns?: number; modules?: any[] } | null {
		const k = pk.trim();
		if (!k) return null;
		const shell = localOverrides.layoutPresets?.[k];
		if (!shell || typeof shell !== 'object') return null;
		return shell as any;
	}

	function getInnerModulesForPreset(pk: string): any[] {
		const shell = getLayoutPresetShell(pk);
		if (!shell || !Array.isArray(shell.modules)) return [];
		return shell.modules as any[];
	}

	function innerGetModuleAtCellFrom(mods: any[], row: number, col: number): any | null {
		return mods.find((m) => (m.rowOrder ?? 0) === row && (m.columnIndex ?? 0) === col) ?? null;
	}

	function innerIsCellCoveredFrom(mods: any[], row: number, col: number): boolean {
		for (const m of mods) {
			const r = m.rowOrder ?? 0;
			const c = m.columnIndex ?? 0;
			const rs = m.rowSpan ?? 1;
			const cs = m.colSpan ?? 1;
			if (row >= r && row < r + rs && col >= c && col < c + cs) {
				if (row === r && col === c) return false;
				return true;
			}
		}
		return false;
	}

	function innerToggleCell(pk: string, row: number, col: number) {
		const mods = getInnerModulesForPreset(pk);
		// Only allow selecting empty/uncovered cells (same UX as page grid).
		if (innerGetModuleAtCellFrom(mods, row, col) || innerIsCellCoveredFrom(mods, row, col)) return;
		const key = layoutShellInnerCellKey(row, col);
		const next = new Set(layoutShellInnerSelectedCells);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		layoutShellInnerSelectedCells = next;
	}

	/**
	 * Reactive source for the "Edit Layout region" modal grid.
	 * Keeping these as explicit reactive values avoids stale UI that only refreshes after Save.
	 */
	$: layoutShellEditingPresetKey =
		editingModule?.type === 'layoutShell'
			? String(editingModule.props?.presetKey ?? '').trim()
			: '';
	$: layoutShellEditingDisplayKey = (() => {
		if (layoutShellEditingPresetKey && localOverrides.layoutPresets?.[layoutShellEditingPresetKey]) {
			return layoutShellEditingPresetKey;
		}
		const original = layoutShellOriginalPresetKey.trim();
		if (original && localOverrides.layoutPresets?.[original]) return original;
		return layoutShellEditingPresetKey;
	})();
	$: layoutShellEditingShell =
		layoutShellEditingDisplayKey && localOverrides.layoutPresets
			? ((localOverrides.layoutPresets[layoutShellEditingDisplayKey] as any) ?? null)
			: null;
	$: layoutShellEditingModules = Array.isArray(layoutShellEditingShell?.modules)
		? (layoutShellEditingShell.modules as any[])
		: [];
	$: layoutShellActivePresetKey = (layoutShellEditingDisplayKey || '').trim();
	$: layoutShellActivePresetExists = !!(
		layoutShellActivePresetKey &&
		localOverrides.layoutPresets?.[layoutShellActivePresetKey]
	);
	$: layoutShellCurrentPresetUsage = listLayoutPresetUsages(layoutShellEditingDisplayKey);
	$: layoutShellUnusedPresetKeys = getUnusedLayoutPresetKeys();

	$: layoutShellInnerSelectedCellsArray = Array.from(layoutShellInnerSelectedCells).map((key) => {
		const [r, c] = key.split(':').map(Number);
		return { row: r, col: c };
	});
	$: layoutShellInnerSelectionBounds = (() => {
		if (layoutShellInnerSelectedCellsArray.length === 0) return null;
		const minRow = Math.min(...layoutShellInnerSelectedCellsArray.map((c) => c.row));
		const maxRow = Math.max(...layoutShellInnerSelectedCellsArray.map((c) => c.row));
		const minCol = Math.min(...layoutShellInnerSelectedCellsArray.map((c) => c.col));
		const maxCol = Math.max(...layoutShellInnerSelectedCellsArray.map((c) => c.col));
		return { rowOrder: minRow, columnIndex: minCol, rowSpan: maxRow - minRow + 1, colSpan: maxCol - minCol + 1 };
	})();

	function clearLayoutShellInnerSelection() {
		layoutShellInnerSelectedCells = new Set();
		layoutShellInnerAssignedModuleType = '';
	}

	function insertLayoutPresetRow(presetKey: string, atIndex: number) {
		const k = presetKey.trim();
		if (!k) return;
		ensureLayoutPresetEntry(k);
		const shell = getLayoutPresetShell(k) || { gridRows: 1, gridColumns: 1, modules: [] };
		const rows = Math.max(1, shell.gridRows ?? 1);
		if (rows >= 12) return;
		const idx = Math.max(0, Math.min(rows, Math.floor(atIndex) || 0));
		const mods = getInnerModulesForPreset(k).map((m) => ({ ...m }));
		for (const m of mods) {
			const r = m.rowOrder ?? 0;
			if (r >= idx) m.rowOrder = r + 1;
		}
		const nextShell = { ...shell, gridRows: rows + 1, modules: mods };
		localOverrides = {
			...localOverrides,
			layoutPresets: { ...(localOverrides.layoutPresets || {}), [k]: nextShell }
		};
		hasChanges = true;
		clearLayoutShellInnerSelection();
	}

	function moveLayoutPresetRow(presetKey: string, fromIndex: number, toIndex: number) {
		const k = presetKey.trim();
		if (!k) return;
		const shell = getLayoutPresetShell(k);
		if (!shell) return;
		const rows = Math.max(1, shell.gridRows ?? 1);
		const from = Math.max(0, Math.min(rows - 1, Math.floor(fromIndex) || 0));
		const to = Math.max(0, Math.min(rows - 1, Math.floor(toIndex) || 0));
		if (from === to) return;
		const mods = getInnerModulesForPreset(k).map((m) => ({ ...m }));
		for (const m of mods) {
			const r = m.rowOrder ?? 0;
			if (r === from) m.rowOrder = to;
			else if (from < to && r > from && r <= to) m.rowOrder = r - 1;
			else if (from > to && r >= to && r < from) m.rowOrder = r + 1;
		}
		const nextShell = { ...shell, modules: mods };
		localOverrides = {
			...localOverrides,
			layoutPresets: { ...(localOverrides.layoutPresets || {}), [k]: nextShell }
		};
		hasChanges = true;
		clearLayoutShellInnerSelection();
	}

	function addModuleToLayoutPreset(
		presetKey: string,
		moduleType: string,
		row: number,
		col: number,
		rowSpan?: number,
		colSpan?: number
	) {
		const k = presetKey.trim();
		if (!k || moduleType === 'layoutShell') return;
		ensureLayoutPresetEntry(k);
		const cur = { ...(localOverrides.layoutPresets || {}) };
		const prev = cur[k] || { gridRows: 1, gridColumns: 1, modules: [] };
		const modules = [...(Array.isArray(prev.modules) ? prev.modules : [])];
		const id = `mod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		const newMod: any = {
			_id: id,
			type: moduleType,
			props: getDefaultPropsForNewModule(moduleType),
			rowOrder: Math.max(0, row),
			columnIndex: Math.max(0, col)
		};
		if (rowSpan && rowSpan > 1) newMod.rowSpan = rowSpan;
		if (colSpan && colSpan > 1) newMod.colSpan = colSpan;
		modules.push(newMod);
		cur[k] = { ...prev, modules };
		localOverrides = { ...localOverrides, layoutPresets: cur };
		hasChanges = true;
	}

	function removeModuleFromLayoutPreset(presetKey: string, index: number) {
		const k = presetKey.trim();
		if (!k) return;
		const cur = { ...(localOverrides.layoutPresets || {}) };
		const prev = cur[k];
		if (!prev || !Array.isArray(prev.modules)) return;
		const modules = prev.modules.filter((_, i) => i !== index);
		cur[k] = { ...prev, modules };
		localOverrides = { ...localOverrides, layoutPresets: cur };
		hasChanges = true;
	}

	type LayoutPresetUsage = {
		pageType: string;
		breakpoint: TemplateBreakpointId;
		moduleIndex: number;
		rowOrder: number;
		columnIndex: number;
	};

	function listLayoutPresetUsages(presetKey: string): LayoutPresetUsage[] {
		const key = presetKey.trim();
		if (!key) return [];
		const usages: LayoutPresetUsage[] = [];
		for (const pt of PAGE_KEYS) {
			for (const bp of TEMPLATE_BREAKPOINTS) {
				const mods = getModulesForPageType(pt, bp) ?? [];
				mods.forEach((m: any, moduleIndex: number) => {
					if (m?.type !== 'layoutShell') return;
					const pk = String(m?.props?.presetKey ?? '').trim();
					if (pk !== key) return;
					usages.push({
						pageType: pt,
						breakpoint: bp,
						moduleIndex,
						rowOrder: Number(m?.rowOrder ?? 0) || 0,
						columnIndex: Number(m?.columnIndex ?? 0) || 0
					});
				});
			}
		}
		return usages;
	}

	function getUnusedLayoutPresetKeys(): string[] {
		const allKeys = Object.keys(localOverrides.layoutPresets || {});
		return allKeys.filter((k) => listLayoutPresetUsages(k).length === 0);
	}

	function deleteLayoutPresetIfUnused(presetKey: string): boolean {
		const key = presetKey.trim();
		if (!key) {
			layoutShellPresetDeleteInfo = 'Choose a preset name first.';
			return false;
		}
		const cur = { ...(localOverrides.layoutPresets || {}) };
		if (!cur[key]) {
			layoutShellPresetDeleteInfo = `Preset "${key}" does not exist.`;
			return false;
		}
		const usages = listLayoutPresetUsages(key);
		if (usages.length > 0) {
			layoutShellPresetDeleteInfo = `Cannot delete "${key}" because it is still used in ${usages.length} location${usages.length === 1 ? '' : 's'}.`;
			return false;
		}
		delete cur[key];
		localOverrides = { ...localOverrides, layoutPresets: cur };
		hasChanges = true;
		layoutShellPresetDeleteInfo = `Deleted unused preset "${key}".`;
		return true;
	}

	function deleteAllUnusedLayoutPresets(): number {
		const unused = getUnusedLayoutPresetKeys();
		if (unused.length === 0) {
			layoutShellPresetDeleteInfo = 'No unused presets found.';
			return 0;
		}
		const cur = { ...(localOverrides.layoutPresets || {}) };
		for (const key of unused) {
			delete cur[key];
		}
		localOverrides = { ...localOverrides, layoutPresets: cur };
		hasChanges = true;
		layoutShellPresetDeleteInfo = `Deleted ${unused.length} unused preset${unused.length === 1 ? '' : 's'}.`;
		return unused.length;
	}

	function moveModule(pageType: string, index: number, direction: number) {
		const arr = [...(getModulesForPageType(pageType, editingBreakpoint) ?? [])];
		if (index + direction < 0 || index + direction >= arr.length) return;
		const bp = editingBreakpoint;
		const next = index + direction;
		const copy = [...arr];
		[copy[index], copy[next]] = [copy[next], copy[index]];
		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		pmBy[pageType] = { ...(pmBy[pageType] || {}), [bp]: copy };
		localOverrides = { ...localOverrides, pageModulesByBreakpoint: pmBy };
		syncLegacyFromBreakpoints();
		hasChanges = true;
	}

	function getAvailableModulesForPageType(pt: string) {
		if (pt === 'header') return HEADER_MODULES;
		if (pt === 'footer') return FOOTER_MODULES;
		return PAGE_CONTENT_MODULES;
	}

	function getModuleLabel(type: string): string {
		const all = [...PAGE_CONTENT_MODULES, ...HEADER_MODULES, ...FOOTER_MODULES];
		const normalizedType = type === 'albumGallery' ? 'albumView' : type;
		const m = all.find((x) => x.type === normalizedType) ?? all.find((x) => x.type === 'albumsGrid' && normalizedType === 'albumView');
		return m?.label ?? type;
	}

	function updateModuleProp(pageType: string, index: number, key: string, value: any) {
		const arr = [...(getModulesForPageType(pageType, editingBreakpoint) ?? [])];
		if (!arr[index]) return;
		const mod = arr[index];
		const newProps = { ...(mod.props ?? {}), [key]: value };
		const updated = [...arr];
		updated[index] = { ...mod, props: newProps };
		const bp = editingBreakpoint;
		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		pmBy[pageType] = { ...(pmBy[pageType] || {}), [bp]: updated };
		localOverrides = { ...localOverrides, pageModulesByBreakpoint: pmBy };
		syncLegacyFromBreakpoints();
		hasChanges = true;
	}

	function applyDefaultLayout(pageType: string) {
		const bp = editingBreakpoint;
		const defaultModules = DEFAULT_PAGE_MODULES[pageType] || [];
		const defaultLayout = DEFAULT_PAGE_LAYOUTS[pageType] || { gridRows: 3, gridColumns: 1 };
		const plBy = { ...(localOverrides.pageLayoutByBreakpoint || {}) };
		const fullRowDef = mergePageLayoutRowForBreakpointEdit(
			{
				pageLayout: localOverrides.pageLayout,
				pageLayoutByBreakpoint: localOverrides.pageLayoutByBreakpoint
			},
			pageType,
			bp,
			{ ...defaultLayout },
			plBy[pageType]
		);
		plBy[pageType] = fullRowDef;
		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		pmBy[pageType] = { ...(pmBy[pageType] || {}), [bp]: [...defaultModules] };
		localOverrides = { ...localOverrides, pageLayoutByBreakpoint: plBy, pageModulesByBreakpoint: pmBy };
		syncLegacyFromBreakpoints();
		hasChanges = true;
	}

	async function loadTemplates() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/admin/templates', {
				credentials: 'include',
				headers: {
					'Cache-Control': 'no-cache'
				}
			});
			
			if (!response.ok) {
				// Clone response to read it multiple times if needed
				const responseClone = response.clone();
				let errorData: any = {};
				
				try {
					errorData = await response.json();
				} catch {
					// If JSON parsing fails, try text
					try {
						const errorText = await responseClone.text();
						errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
					} catch {
						errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
					}
				}
				
				// Check for auth errors and redirect
				if (response.status === 401 || response.status === 403 || errorData.authError) {
					const errorMsg = errorData.error || errorData.message || 'Invalid or expired token';
					logger.warn('[Overrides] Auth error detected:', errorMsg);
					if (handleAuthError({ error: errorMsg, status: response.status }, window.location.pathname)) {
						return; // Redirected to login
					}
				}
				
				// If not redirected, throw error
				throw new Error(errorData.error || errorData.message || `Failed to load templates: ${response.status}`);
			}
			const data = await response.json();
			logger.debug('[Overrides] Templates API response:', {
				hasSuccess: 'success' in data,
				hasData: 'data' in data,
				isArray: Array.isArray(data),
				dataKeys: Object.keys(data),
				dataType: typeof data
			});
			
			// Handle both wrapped {success, data} and direct array formats
			let templatesArray: any[] = [];
			if (data.success && data.data) {
				// Wrapped format: { success: true, data: [...] }
				templatesArray = Array.isArray(data.data) ? data.data : [];
			} else if (Array.isArray(data)) {
				// Direct array format
				templatesArray = data;
			} else if (data.templates && Array.isArray(data.templates)) {
				// Alternative wrapped format: { templates: [...] }
				templatesArray = data.templates;
			}
			
			templates = templatesArray;
			
			if (templates.length === 0) {
				error = 'No templates available. Please check server configuration.';
				activeTemplate = null;
				return;
			}
			
			// Use currentTemplateName (from editingTheme.baseTemplate or site config)
			const templateName = editingTheme?.baseTemplate ||
				$siteConfigData?.template?.frontendTemplate ||
				$siteConfigData?.template?.activeTemplate ||
				'noir';
			
			logger.debug('[Overrides] Loading templates:', {
				templatesCount: templates.length,
				templateNames: templates.map(t => t.templateName),
				templateName,
				editingTheme: !!editingTheme
			});
			
			// Find active template by name (reactive statement will also handle this)
			const found = templates.find((t) => t.templateName === templateName);
			if (found) {
				activeTemplate = found;
			} else {
				// If not found, try to find by displayName or use first template
				const foundByDisplay = templates.find((t) => 
					t.displayName?.toLowerCase() === templateName.toLowerCase()
				);
				activeTemplate = foundByDisplay || templates[0] || null;
				
				if (!activeTemplate) {
					logger.warn('[Overrides] No active template found:', {
						templateName,
						availableTemplates: templates.map(t => t.templateName)
					});
					error = `Template "${templateName}" not found. Available templates: ${templates.map(t => t.templateName).join(', ')}`;
				} else {
					logger.debug('[Overrides] Using fallback template:', activeTemplate.templateName);
				}
			}
		} catch (err) {
			logger.error('Error loading templates:', err);
			
			// Check if it's an auth error and redirect
			if (handleAuthError(err, window.location.pathname)) {
				return; // Redirecting, don't set error message
			}
			
			error = handleError(err, 'Failed to load templates');
			activeTemplate = null;
		} finally {
			loading = false;
		}
	}

	function updateColor(colorType: string, value: string) {
		if (!localOverrides.customColors) {
			localOverrides.customColors = {};
		}
		// Create a new object to ensure reactivity
		localOverrides = {
			...localOverrides,
			customColors: {
				...localOverrides.customColors,
				[colorType]: value
			}
		};
		hasChanges = true;
	}

	function updateFontFamily(fontType: FontRole, value: string) {
		if (!localOverrides.customFonts) localOverrides.customFonts = {};
		const prev = localOverrides.customFonts[fontType];
		localOverrides.customFonts[fontType] =
			typeof prev === 'string' ? value : { ...prev, family: value };
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function updateFontSize(fontType: FontRole, value: string) {
		if (!localOverrides.customFonts) localOverrides.customFonts = {};
		const prev = localOverrides.customFonts[fontType];
		const base: FontSetting = typeof prev === 'string' ? { family: prev } : { ...prev };
		localOverrides.customFonts[fontType] = { ...base, size: value || undefined };
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function updateFontWeight(fontType: FontRole, value: string) {
		if (!localOverrides.customFonts) localOverrides.customFonts = {};
		const prev = localOverrides.customFonts[fontType];
		const base: FontSetting = typeof prev === 'string' ? { family: prev } : { ...prev };
		localOverrides.customFonts[fontType] = { ...base, weight: value || undefined };
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function updateLayout(layoutType: string, value: string) {
		const bp = editingBreakpoint;
		const shell = { ...(localOverrides.customLayoutByBreakpoint || {}) };
		const prev = shell[bp] || {};
		shell[bp] = { ...prev, [layoutType]: value };
		localOverrides = {
			...localOverrides,
			customLayoutByBreakpoint: shell,
			customLayout: shellByBreakpointToCustomLayoutField(shell as Record<TemplateBreakpointId, ShellLayout>)
		};
		hasChanges = true;
	}

	function updateVisibility(component: string, value: boolean) {
		if (!localOverrides.componentVisibility) {
			localOverrides.componentVisibility = {};
		}
		localOverrides.componentVisibility[component] = value;
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function updateHeaderConfig(configType: string, value: any) {
		if (!localOverrides.headerConfig) {
			localOverrides.headerConfig = {};
		}
		localOverrides.headerConfig[configType] = value;
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function packAtelierColorDefault(key: string): string | undefined {
		if (activeTemplate?.templateName !== 'atelier') return undefined;
		const raw = (atelierThemePack as { colors?: Record<string, string> }).colors?.[key];
		return raw != null && String(raw).trim() !== '' ? String(raw).trim() : undefined;
	}

	function colorField(key: string): string {
		const fb = packAtelierColorDefault(key) ?? DEFAULT_COLOR_FALLBACK[key] ?? '#888888';
		const o = localOverrides.customColors?.[key];
		if (o != null && String(o).trim() !== '') return String(o).trim();
		const tpl = activeTemplate?.colors as Record<string, string> | undefined;
		const t = tpl?.[key];
		if (t != null && String(t).trim() !== '') return String(t).trim();
		return fb;
	}

	// Reactive color values to ensure inputs update when palette is applied
	let colorValues: Record<string, string> = {};
	$: colorValues = {
		primary: colorField('primary'),
		secondary: colorField('secondary'),
		accent: colorField('accent'),
		background: colorField('background'),
		text: colorField('text'),
		muted: colorField('muted'),
		...Object.fromEntries(EXTENDED_COLOR_FIELD_META.map(({ key }) => [key, colorField(key)]))
	};

	function getEffectiveColor(colorType: string): string {
		const fallback = DEFAULT_COLOR_FALLBACK[colorType] ?? DEFAULT_COLOR_HEX.primary;
		return (
			colorValues[colorType] ||
			localOverrides.customColors?.[colorType] ||
			(activeTemplate?.colors as Record<string, string> | undefined)?.[colorType] ||
			fallback
		);
	}

	function getEffectiveFontSetting(role: FontRole): FontSetting {
		const base = activeTemplate?.fonts?.[role];
		const override = localOverrides.customFonts?.[role];
		const baseFamily = base && typeof base === 'object' ? base.family : typeof base === 'string' ? base : 'Inter';
		const merged: Partial<FontSetting> = {
			...(typeof base === 'object' && base ? base : {}),
			...(typeof override === 'string' ? { family: override } : override && typeof override === 'object' ? override : {})
		};
		return normalizeFontSetting(
			{ family: merged.family ?? baseFamily, size: merged.size, weight: merged.weight },
			baseFamily,
			role
		);
	}

	function getEffectiveFont(fontType: FontRole): string {
		return getEffectiveFontSetting(fontType).family;
	}

	function getFontSizeOverride(role: FontRole): string {
		const o = localOverrides.customFonts?.[role];
		return o && typeof o === 'object' && o.size != null ? o.size : '';
	}

	function getFontWeightOverride(role: FontRole): string {
		const o = localOverrides.customFonts?.[role];
		return o && typeof o === 'object' && o.weight != null ? o.weight : '';
	}

	function getDefaultFontFamily(role: FontRole): string {
		const t = activeTemplate?.fonts?.[role];
		if (t == null) return 'Inter';
		if (typeof t === 'string') return t;
		return (t as FontSetting).family ?? 'Inter';
	}

	/** Pack default family from `theme.defaults.json` (placeholders on Atelier font table). */
	function atelierPackFontFamily(role: FontRole): string {
		const raw = (atelierThemePack as { fonts?: Record<string, string> }).fonts?.[role];
		return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
	}

	type AtelierPackTokens = {
		packTokens?: {
			layout?: Record<string, string>;
			radii?: Record<string, string>;
			card?: Record<string, string>;
			hero?: { height?: string };
			header?: { height?: string };
			grid?: Record<string, string | number>;
			motion?: Record<string, string>;
		};
	};

	function aspectFromPackToken(v: unknown): string {
		if (v == null) return '';
		const s = String(v).trim();
		if (!s) return '';
		return /\//.test(s) ? s.replace(/\s*\/\s*/, ' / ') : s;
	}

	function atelierPackLayoutDefault(layoutKey: string): string {
		const pt = (atelierThemePack as AtelierPackTokens).packTokens;
		if (!pt) return '';
		const layout = pt.layout;
		const radii = pt.radii;
		const card = pt.card;
		const hero = pt.hero;
		const header = pt.header;
		const grid = pt.grid;
		const motion = pt.motion;
		const map: Record<string, string> = {
			maxWidth: layout?.maxWidth ?? '',
			containerPadding: layout?.padX ?? '',
			gridGap: layout?.gap ?? '',
			gapGrid: layout?.gapGrid ?? '',
			radius: radii?.default ?? '',
			radiusLg: radii?.lg ?? '',
			radiusSm: radii?.sm ?? '',
			borderWidth: '1px',
			heroHeight: hero?.height ?? '',
			headerHeight: header?.height ?? '',
			cardRadius: card?.radius ?? '',
			cardShadow: card?.shadow ?? '',
			cardShadowHover: card?.shadowHover ?? '',
			albumAspect: aspectFromPackToken(grid?.albumAspect),
			photoAspect: aspectFromPackToken(grid?.photoAspect),
			animDuration: motion?.animDuration ?? '',
			transition: motion?.transition ?? ''
		};
		return map[layoutKey] ?? '';
	}

	function getEffectiveLayout(layoutType: string): string {
		const bp = editingBreakpoint;
		const key = layoutType as keyof ShellLayout;
		const shell = localOverrides.customLayoutByBreakpoint?.[bp];
		if (shell && shell[key] != null && String(shell[key]).trim() !== '') {
			return String(shell[key]);
		}
		const raw = localOverrides.customLayout;
		if (raw && isBreakpointMapCustomLayout(raw)) {
			const cell = raw[bp];
			if (cell && typeof cell === 'object' && cell[key] != null && String(cell[key]).trim() !== '') {
				return String(cell[key]);
			}
		}
		if (raw && isLegacyCustomLayout(raw)) {
			const legacyCell = raw as ShellLayout;
			const v = legacyCell[key];
			if (v != null && String(v).trim() !== '') return String(v);
		}
		const pack = activeTemplate?.layout as Record<string, string | undefined> | undefined;
		const pv = pack?.[layoutType];
		if (pv != null && String(pv).trim() !== '') return String(pv);
		const hint = SHELL_HINT_BY_BREAKPOINT[bp]?.[key];
		if (hint != null && String(hint).trim() !== '') return String(hint);
		if (key === 'maxWidth' || key === 'containerPadding' || key === 'gridGap') {
			const d = DEFAULT_SHELL[key];
			if (d != null && String(d).trim() !== '') return d;
		}
		const ap = atelierPackLayoutDefault(layoutType);
		if (ap != null && ap.trim() !== '') return ap;
		return '';
	}

	function getEffectiveVisibility(component: string): boolean {
		return localOverrides.componentVisibility?.[component] !== undefined
			? localOverrides.componentVisibility[component]
			: activeTemplate?.visibility?.[component] ?? true;
	}

	function getEffectiveHeaderConfig(configType: string): boolean {
		return localOverrides.headerConfig?.[configType] !== undefined
			? localOverrides.headerConfig[configType]
			: activeTemplate?.componentsConfig?.header?.[configType] ?? true;
	}

	function applyPalette(presetKey: string) {
		const preset = PALETTE_PRESETS[presetKey];
		if (!preset) return;
		// Force reactivity by creating a new object reference
		localOverrides = {
			...localOverrides,
			customColors: { ...preset.colors }
		};
		hasChanges = true;
	}

	function onThemePreviewModalKeydown(e: KeyboardEvent) {
		if (!showThemePreviewModal || !activeTemplate) return;
		if (e.key === 'Escape') {
			showThemePreviewModal = false;
		}
	}

	// Tokens for live preview (effective values)
	$: previewTokens = activeTemplate ? {
		colors: {
			primary: getEffectiveColor('primary'),
			secondary: getEffectiveColor('secondary'),
			accent: getEffectiveColor('accent'),
			background: getEffectiveColor('background'),
			text: getEffectiveColor('text'),
			muted: getEffectiveColor('muted')
		},
		fonts: {
			heading: getEffectiveFontSetting('heading'),
			body: getEffectiveFontSetting('body'),
			links: getEffectiveFontSetting('links'),
			lists: getEffectiveFontSetting('lists'),
			formInputs: getEffectiveFontSetting('formInputs'),
			formLabels: getEffectiveFontSetting('formLabels')
		},
		layout: (() => {
			const base: ShellLayout & { maxWidth: string; containerPadding: string; gridGap: string } = {
				maxWidth: getEffectiveLayout('maxWidth') || '1200px',
				containerPadding: getEffectiveLayout('containerPadding') || '1rem',
				gridGap: getEffectiveLayout('gridGap') || '1.5rem'
			};
			if (activeTemplate.templateName !== 'atelier') return base;
			const rows = (atelierThemePack as { layoutEditor?: { key: string }[] }).layoutEditor ?? [];
			const extra: ShellLayout = {};
			for (const { key: k } of rows) {
				if (k === 'maxWidth' || k === 'containerPadding' || k === 'gridGap') continue;
				const v = getEffectiveLayout(k);
				if (v) (extra as Record<string, string>)[k] = v;
			}
			return { ...base, ...extra };
		})()
	} : null;

	/** Live preview: unsaved layout presets override site template. */
	$: previewLayoutPresets = {
		...($siteConfigData?.template?.layoutPresets &&
		typeof $siteConfigData.template.layoutPresets === 'object'
			? ($siteConfigData.template.layoutPresets as Record<string, unknown>)
			: {}),
		...(localOverrides.layoutPresets && typeof localOverrides.layoutPresets === 'object'
			? (localOverrides.layoutPresets as Record<string, unknown>)
			: {})
	};

	function pageModulesFieldHasContent(v: unknown): boolean {
		if (Array.isArray(v)) return v.length > 0;
		if (v && typeof v === 'object' && !Array.isArray(v) && typeof (v as any).activeBreakpoints === 'boolean') {
			if ((v as any).activeBreakpoints) {
				const b = (v as any).breakpoints || {};
				return TEMPLATE_BREAKPOINTS.some((bp) => Array.isArray(b[bp]) && b[bp].length > 0);
			}
			return Array.isArray((v as any).modules) && (v as any).modules.length > 0;
		}
		if (isPageModulesBreakpointMapForPage(v)) {
			return TEMPLATE_BREAKPOINTS.some(
				(bp) => Array.isArray(v[bp]) && (v[bp] as unknown[]).length > 0
			);
		}
		return false;
	}

	function hasOverrides(): boolean {
		const hasPageModules =
			localOverrides.pageModules &&
			Object.keys(localOverrides.pageModules).some((k) =>
				pageModulesFieldHasContent(localOverrides.pageModules![k])
			);
		const hasPageLayout = localOverrides.pageLayout && Object.keys(localOverrides.pageLayout).length > 0;
		const hasBpShell =
			localOverrides.customLayoutByBreakpoint &&
			Object.keys(localOverrides.customLayoutByBreakpoint).length > 0;
		const hasBpPages =
			localOverrides.pageModulesByBreakpoint &&
			Object.keys(localOverrides.pageModulesByBreakpoint).length > 0;
		const hasLayoutPresets =
			localOverrides.layoutPresets && Object.keys(localOverrides.layoutPresets).length > 0;
		return !!(
			(localOverrides.customColors && Object.keys(localOverrides.customColors).length > 0) ||
			(localOverrides.customFonts && Object.keys(localOverrides.customFonts).length > 0) ||
			(localOverrides.customLayout && Object.keys(localOverrides.customLayout).length > 0) ||
			hasBpShell ||
			(localOverrides.componentVisibility && Object.keys(localOverrides.componentVisibility).length > 0) ||
			(localOverrides.headerConfig && Object.keys(localOverrides.headerConfig).length > 0) ||
			hasPageModules ||
			hasPageLayout ||
			hasBpPages ||
			hasLayoutPresets
		);
	}

	async function saveOverrides() {
		saving = true;
		message = '';
		error = '';

		try {
			syncLegacyFromBreakpoints();
			const payload = {
				customColors: localOverrides.customColors || {},
				customFonts: localOverrides.customFonts || {},
				customLayout: localOverrides.customLayout || {},
				customLayoutByBreakpoint: localOverrides.customLayoutByBreakpoint || {},
				componentVisibility: localOverrides.componentVisibility || {},
				headerConfig: localOverrides.headerConfig || {},
				pageModules: localOverrides.pageModules || {},
				pageLayout: localOverrides.pageLayout || {},
				pageLayoutByBreakpoint: localOverrides.pageLayoutByBreakpoint || {},
				layoutPresets: localOverrides.layoutPresets || {}
			};

			if (themeId && editingTheme) {
				// Save to theme
				const response = await fetch(`/api/admin/themes/${themeId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(payload)
				});
				if (!response.ok) await handleApiErrorResponse(response);
				const result = await response.json();
				const savedTheme = (result.data || result) as NonNullable<typeof editingTheme>;
				editingTheme = savedTheme;
				initializeLocalOverrides();

				// Sync live site only when this row is the applied theme (same base pack is not enough).
				const activeId = $siteConfigData?.template?.activeThemeId;
				const isActiveTheme =
					!!savedTheme._id && !!activeId && String(savedTheme._id) === String(activeId);
				const isActiveThemeLegacy =
					!activeId &&
					savedTheme.baseTemplate ===
						($siteConfigData?.template?.frontendTemplate || $siteConfigData?.template?.activeTemplate);

				if (isActiveTheme || isActiveThemeLegacy) {
					const templateData: any = {
						activeTemplate: savedTheme.baseTemplate,
						frontendTemplate: savedTheme.baseTemplate,
						...payload
					};
					const configResponse = await fetch('/api/admin/site-config', {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify({ template: templateData })
					});
					if (!configResponse.ok) await handleApiErrorResponse(configResponse);
					await siteConfig.load();
					message = 'Theme saved and applied successfully!';
					setTimeout(() => window.location.reload(), 500);
				} else {
					message = 'Theme saved successfully! Remember to apply it from the themes list to see changes on the site.';
				}
			} else {
				// Save to site config
				const templateData: any = {
					activeTemplate: currentTemplateName,
					frontendTemplate: currentTemplateName,
					...payload
				};
				const response = await fetch('/api/admin/site-config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ template: templateData })
				});
				if (!response.ok) await handleApiErrorResponse(response);
				message = 'Template overrides saved successfully!';
				await siteConfig.load();
				setTimeout(() => window.location.reload(), 500);
			}

			hasChanges = false;
			setTimeout(() => (message = ''), 3000);
		} catch (err) {
			logger.error('Error saving overrides:', err);
			error = handleError(err, 'Failed to save overrides');
		} finally {
			saving = false;
		}
	}

	async function resetOverrides() {
		if (!confirm('Are you sure you want to reset all template overrides to default?')) {
			return;
		}

		resetting = true;
		message = '';
		error = '';

		try {
			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					template: {
						activeTemplate: currentTemplateName,
						customColors: {},
						customFonts: {},
						customLayout: {},
						componentVisibility: {},
						headerConfig: {}
					}
				})
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			message = 'Template overrides reset to default!';
			localOverrides = {};
			hasChanges = false;
			siteConfig.load(); // Refresh site config store

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			logger.error('Error resetting overrides:', err);
			error = handleError(err, 'Failed to reset overrides');
		} finally {
			resetting = false;
		}
	}

	function cancelChanges() {
		if (hasChanges && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
			return;
		}
		initializeLocalOverrides();
		hasChanges = false;
	}
</script>

<svelte:head>
	<title>{themeEditorHeadingText} - {$t('navigation.admin')}</title>
</svelte:head>

<svelte:window on:keydown={onThemePreviewModalKeydown} />

<div class="py-8">
	<div class="max-w-[1600px] mx-auto px-4">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<!-- Header -->
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-[var(--color-surface-950-50)]">{themeEditorHeadingText}</h1>
				</div>
				<div class="flex flex-wrap items-center gap-2 sm:justify-end">
					<a
						href="/admin/templates"
						class="inline-flex items-center justify-center px-4 py-2 border border-surface-300-700 rounded-md shadow-sm text-sm font-medium text-[var(--color-surface-800-200)] bg-[var(--color-surface-50-950)] hover:bg-[var(--color-surface-50-950)]"
					>
						{$t('admin.backToTemplates')}
					</a>
					<button
						type="button"
						disabled={loading || !activeTemplate}
						on:click={() => (showThemePreviewModal = true)}
						class="inline-flex items-center justify-center px-4 py-2 border border-indigo-200 rounded-md shadow-sm text-sm font-medium text-indigo-800 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{$t('admin.openLivePreview')}
					</button>
					{#if hasChanges}
						<button
							type="button"
							on:click={cancelChanges}
							class="px-4 py-2 bg-[var(--color-surface-200-800)] text-[var(--color-surface-800-200)] rounded-md hover:bg-[var(--color-surface-300-700)] text-sm font-medium"
						>
							{$t('admin.cancel')}
						</button>
					{/if}
					{#if hasOverrides() && !themeId}
							<button
								type="button"
								on:click={resetOverrides}
								disabled={resetting}
								class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
							>
								{#if resetting}
									{$t('admin.resetting')}
								{:else}
									{$t('admin.resetToDefault')}
								{/if}
							</button>
					{/if}
					<button
						type="button"
						on:click={saveOverrides}
						disabled={!hasChanges || saving}
						class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							{$t('admin.saving')}
						{:else}
							{$t('admin.applyChanges')}
						{/if}
					</button>
				</div>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			{#if hasOverrides()}
				<div class="mb-4 p-4 rounded-md bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] text-[var(--color-primary-700)] text-sm">
					{$t('admin.templateHasOverridesInfo')}
				</div>
			{/if}

			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary-600)]"></div>
					<p class="mt-2 text-[var(--color-surface-600-400)]">{$t('admin.loadingTemplateOverrides')}</p>
				</div>
			{:else if !activeTemplate}
				<div class="text-center py-8">
					<p class="text-[var(--color-surface-600-400)]">{$t('admin.noActiveTemplateFound')}</p>
				</div>
			{:else}
				<div class="min-w-0">
						<!-- Tabs -->
				<div class="border-b border-surface-200-800 mb-6">
					<nav class="-mb-px flex space-x-8">
						<button
							type="button"
							on:click={() => (activeTab = 'colors')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'colors'
								? 'border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
								: 'border-transparent text-[var(--color-surface-600-400)] hover:text-[var(--color-surface-800-200)] hover:border-surface-300-700'}"
						>
							🎨 Colors
						</button>
						<button
							type="button"
							on:click={() => (activeTab = 'fonts')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'fonts'
								? 'border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
								: 'border-transparent text-[var(--color-surface-600-400)] hover:text-[var(--color-surface-800-200)] hover:border-surface-300-700'}"
						>
							🔤 Fonts
						</button>
						<button
							type="button"
							on:click={() => (activeTab = 'layout')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'layout'
								? 'border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
								: 'border-transparent text-[var(--color-surface-600-400)] hover:text-[var(--color-surface-800-200)] hover:border-surface-300-700'}"
						>
							📐 Layout
						</button>
						<button
							type="button"
							on:click={() => (activeTab = 'pages')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'pages'
								? 'border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
								: 'border-transparent text-[var(--color-surface-600-400)] hover:text-[var(--color-surface-800-200)] hover:border-surface-300-700'}"
						>
							📄 Pages
						</button>
					</nav>
				</div>

				<p class="text-xs text-[var(--color-surface-600-400)] mb-4 max-w-3xl leading-relaxed">
					{$t('admin.themeEditorTabsHint')}
				</p>

				<!-- Tab Content -->
				{#if activeTab === 'colors'}
					{#if activeTemplate?.templateName === 'atelier'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-[var(--heading-font-color)]">Color Customization</h2>
						<p class="text-sm text-[var(--color-surface-600-400)] mb-4 max-w-3xl">
							Each row maps a token to <strong>light</strong> (<code class="text-xs font-mono">html.light</code>) and
							<strong>dark</strong> (<code class="text-xs font-mono">html.dark</code>). Defaults and the field list live in
							<code class="text-xs font-mono">lib/templates/atelier/theme.defaults.json</code> (<code class="text-xs font-mono">colorEditor</code>).
						</p>
						<div class="overflow-x-auto rounded-lg border border-surface-200-800 bg-[var(--color-surface-50-950)]">
							<table class="w-full text-sm min-w-[640px]">
								<thead>
									<tr class="bg-[var(--color-surface-100-900)] border-b border-surface-200-800 text-left">
										<th class="p-3 font-semibold text-[var(--color-surface-800-200)] w-0 whitespace-nowrap">Token</th>
										<th class="p-3 font-semibold text-[var(--color-surface-800-200)]">Description</th>
										<th class="p-3 font-semibold text-[var(--color-surface-800-200)]">Light</th>
										<th class="p-3 font-semibold text-[var(--color-surface-800-200)]">Dark</th>
									</tr>
								</thead>
								<tbody>
									{#each atelierThemePack.colorEditor as row}
										<tr class="border-b border-surface-200-800 align-top">
											<td class="p-3 font-mono text-xs text-[var(--color-primary-600)] whitespace-nowrap align-middle">{row.token}</td>
											<td class="p-3 text-[var(--color-surface-700-300)] align-middle">{row.label}</td>
											<td class="p-3">
												{#if row.kind === 'filter'}
													<input
														type="text"
														value={colorField(row.lightKey)}
														on:input={(e) => updateColor(row.lightKey, (e.currentTarget as HTMLInputElement).value)}
														class={ADMIN_TEXT_INPUT_CLASS}
														placeholder={(atelierThemePack.colors as Record<string, string>)[row.lightKey] ?? ''}
													/>
												{:else}
													<div class="flex gap-2 items-stretch">
														{#if /^#[0-9A-Fa-f]{6}$/.test(String(colorField(row.lightKey)).trim())}
															<div class="shrink-0 flex items-center rounded-md border border-surface-300-700 p-0.5 bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-900)]">
																<input
																	type="color"
																	value={colorField(row.lightKey)}
																	on:input={(e) => updateColor(row.lightKey, (e.currentTarget as HTMLInputElement).value)}
																	class="h-9 w-11 cursor-pointer rounded border-0 bg-transparent p-0"
																/>
															</div>
														{/if}
														<input
															type="text"
															value={colorField(row.lightKey)}
															on:input={(e) => updateColor(row.lightKey, (e.currentTarget as HTMLInputElement).value)}
															class={ADMIN_COLOR_HEX_INPUT_CLASS}
														/>
													</div>
												{/if}
											</td>
											<td class="p-3">
												{#if row.kind === 'filter'}
													<input
														type="text"
														value={colorField(row.darkKey)}
														on:input={(e) => updateColor(row.darkKey, (e.currentTarget as HTMLInputElement).value)}
														class={ADMIN_TEXT_INPUT_CLASS}
														placeholder={(atelierThemePack.colors as Record<string, string>)[row.darkKey] ?? ''}
													/>
												{:else}
													<div class="flex gap-2 items-stretch">
														{#if /^#[0-9A-Fa-f]{6}$/.test(String(colorField(row.darkKey)).trim())}
															<div class="shrink-0 flex items-center rounded-md border border-surface-300-700 p-0.5 bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-900)]">
																<input
																	type="color"
																	value={colorField(row.darkKey)}
																	on:input={(e) => updateColor(row.darkKey, (e.currentTarget as HTMLInputElement).value)}
																	class="h-9 w-11 cursor-pointer rounded border-0 bg-transparent p-0"
																/>
															</div>
														{/if}
														<input
															type="text"
															value={colorField(row.darkKey)}
															on:input={(e) => updateColor(row.darkKey, (e.currentTarget as HTMLInputElement).value)}
															class={ADMIN_COLOR_HEX_INPUT_CLASS}
														/>
													</div>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
					{:else}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-[var(--heading-font-color)]">Color Customization</h2>
						<p class="text-sm text-[var(--color-surface-600-400)] mb-4">
							Customize the color scheme for your site. Each color is used by specific UI elements as described below.
						</p>

						<div
							class="card preset-filled-surface-100-900 border border-[color:color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] px-4 py-3 space-y-2"
							aria-label={$t('admin.themeColorPresetsHeading')}
						>
							<h3 class="text-sm font-semibold text-[var(--heading-font-color)]">
								{$t('admin.themeColorPresetsHeading')}
							</h3>
							<p class="text-xs text-[var(--color-surface-600-400)] leading-relaxed">
								{$t('admin.themeColorPresetsHelp')}
							</p>
							<div class="flex flex-wrap gap-2 pt-1">
								{#each ['light', 'dark', 'highContrast', 'muted'] as key}
									{@const preset = PALETTE_PRESETS[key]}
									<button
										type="button"
										on:click={() => applyPalette(key)}
										class="btn btn-sm preset-outlined-surface-200-800 inline-flex items-center gap-2 shadow-sm"
									>
										<span class="flex gap-0.5" aria-hidden="true">
											{#each ['primary', 'secondary', 'accent'] as c}
												<span
													class="w-4 h-4 rounded-full border border-surface-300-700"
													style="background-color: {preset.colors[c]}"
												></span>
											{/each}
										</span>
										{key === 'light'
											? $t('admin.basePaletteLight')
											: key === 'dark'
												? $t('admin.basePaletteDark')
												: key === 'highContrast'
													? $t('admin.basePaletteHighContrast')
													: $t('admin.basePaletteMuted')}
									</button>
								{/each}
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each [
								{ 
									type: 'primary', 
									label: 'Primary Color',
									description: 'Used for: Primary buttons, logo backgrounds, main links, call-to-action elements'
								},
								{ 
									type: 'secondary', 
									label: 'Secondary Color',
									description: 'Used for: Secondary buttons, borders, subtle UI elements, secondary text'
								},
								{ 
									type: 'accent', 
									label: 'Accent Color',
									description: 'Used for: Highlights, special accents, hover states, decorative elements'
								},
								{ 
									type: 'background', 
									label: 'Background Color',
									description: 'Used for: Main page background, card backgrounds, container backgrounds'
								},
								{ 
									type: 'text', 
									label: 'Text Color',
									description: 'Used for: Main body text, headings, primary content text throughout the site'
								},
								{ 
									type: 'muted', 
									label: 'Muted Color',
									description: 'Used for: Secondary text, placeholders, less important content, disabled states'
								}
							] as colorInfo}
								{@const currentColor = colorValues[colorInfo.type] || getEffectiveColor(colorInfo.type)}
								<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4 min-w-0">
									<span class="label-text text-[var(--base-font-color)]">{colorInfo.label}</span>
									<p class="text-xs text-[var(--color-surface-600-400)] mb-3 mt-1">
										{colorInfo.description}
									</p>
									<div class="flex gap-2 items-stretch">
										<div
											class="[color-scheme:light] shrink-0 flex items-center rounded-[var(--radius-base)] border border-[color:color-mix(in_oklab,var(--color-surface-950)_14%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_16%,transparent)] preset-filled-surface-50-950 p-1"
										>
											<input
												type="color"
												value={currentColor}
												on:input={(e) => updateColor(colorInfo.type, (e.target as HTMLInputElement).value)}
												class="h-9 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
												title="Pick color"
											/>
										</div>
										<input
											type="text"
											value={currentColor}
											on:input={(e) => updateColor(colorInfo.type, (e.target as HTMLInputElement).value)}
											placeholder={DEFAULT_COLOR_HEX[colorInfo.type] ?? '#3B82F6'}
											autocomplete="off"
											spellcheck="false"
											class={ADMIN_COLOR_HEX_INPUT_CLASS}
										/>
									</div>
									<p class="mt-2 text-xs text-[var(--color-surface-600-400)]">
										Template default: {activeTemplate.colors[colorInfo.type] ?? DEFAULT_COLOR_HEX[colorInfo.type]}
									</p>
								</div>
							{/each}
						</div>

						<div class="border-t border-[color:color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_14%,transparent)] pt-8 mt-8 space-y-4">
							<h3 class="text-lg font-semibold text-[var(--heading-font-color)]">
								Surfaces &amp; borders (template packs)
							</h3>
							<p class="text-sm text-[var(--color-surface-600-400)]">
								Optional elevated surfaces, tertiary text, and hairline borders. Used by packs such as <strong>Noir</strong> (
								<code class="text-xs preset-filled-surface-200-800 px-1 rounded">--tp-*</code> CSS variables). You can use
								<code class="text-xs px-1 rounded">rgba(…)</code> in the text field for transparency.
							</p>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								{#each EXTENDED_COLOR_FIELD_META.filter((m) => m.group === 'surfaces') as colorInfo}
									{@const currentColor = colorValues[colorInfo.key] || getEffectiveColor(colorInfo.key)}
									{@const hexPick = /^#[0-9A-Fa-f]{6}$/.test(String(currentColor).trim())}
									<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4 min-w-0">
										<span class="label-text text-[var(--base-font-color)]">{colorInfo.label}</span>
										<p class="text-xs text-[var(--color-surface-600-400)] mb-3 mt-1">
											{colorInfo.description}
										</p>
										<div class="flex gap-2 items-stretch">
											{#if hexPick}
												<div
													class="[color-scheme:light] shrink-0 flex items-center rounded-[var(--radius-base)] border border-[color:color-mix(in_oklab,var(--color-surface-950)_14%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_16%,transparent)] preset-filled-surface-50-950 p-1"
												>
													<input
														type="color"
														value={currentColor}
														on:input={(e) =>
															updateColor(colorInfo.key, (e.target as HTMLInputElement).value)}
														class="h-9 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
														title="Pick color"
													/>
												</div>
											{/if}
											<input
												type="text"
												value={currentColor}
												on:input={(e) =>
													updateColor(colorInfo.key, (e.target as HTMLInputElement).value)}
												placeholder={DEFAULT_COLOR_FALLBACK[colorInfo.key] ?? '#888888'}
												autocomplete="off"
												spellcheck="false"
												class={ADMIN_COLOR_HEX_INPUT_CLASS}
											/>
										</div>
										<p class="mt-2 text-xs text-[var(--color-surface-600-400)]">
											Template default:
											{(activeTemplate?.colors as Record<string, string> | undefined)?.[colorInfo.key] ??
												DEFAULT_COLOR_FALLBACK[colorInfo.key] ??
												'—'}
										</p>
									</div>
								{/each}
							</div>
						</div>

						<div class="border-t border-[color:color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_14%,transparent)] pt-8 mt-8 space-y-4">
							<h3 class="text-lg font-semibold text-[var(--heading-font-color)]">
								Hero &amp; footer strips (Studio and similar packs)
							</h3>
							<p class="text-sm text-[var(--color-surface-600-400)]">
								Optional backgrounds for dark hero bands and footers (
								<code class="text-xs preset-filled-surface-200-800 px-1 rounded">--tp-hero-strip-bg</code>,
								<code class="text-xs preset-filled-surface-200-800 px-1 rounded">--tp-footer-strip-bg</code>).
							</p>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								{#each EXTENDED_COLOR_FIELD_META.filter((m) => m.group === 'strips') as colorInfo}
									{@const currentColor = colorValues[colorInfo.key] || getEffectiveColor(colorInfo.key)}
									{@const hexPick = /^#[0-9A-Fa-f]{6}$/.test(String(currentColor).trim())}
									<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4 min-w-0">
										<span class="label-text text-[var(--base-font-color)]">{colorInfo.label}</span>
										<p class="text-xs text-[var(--color-surface-600-400)] mb-3 mt-1">
											{colorInfo.description}
										</p>
										<div class="flex gap-2 items-stretch">
											{#if hexPick}
												<div
													class="[color-scheme:light] shrink-0 flex items-center rounded-[var(--radius-base)] border border-[color:color-mix(in_oklab,var(--color-surface-950)_14%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_16%,transparent)] preset-filled-surface-50-950 p-1"
												>
													<input
														type="color"
														value={currentColor}
														on:input={(e) =>
															updateColor(colorInfo.key, (e.target as HTMLInputElement).value)}
														class="h-9 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
														title="Pick color"
													/>
												</div>
											{/if}
											<input
												type="text"
												value={currentColor}
												on:input={(e) =>
													updateColor(colorInfo.key, (e.target as HTMLInputElement).value)}
												placeholder={DEFAULT_COLOR_FALLBACK[colorInfo.key] ?? '#888888'}
												autocomplete="off"
												spellcheck="false"
												class={ADMIN_COLOR_HEX_INPUT_CLASS}
											/>
										</div>
										<p class="mt-2 text-xs text-[var(--color-surface-600-400)]">
											Template default:
											{(activeTemplate?.colors as Record<string, string> | undefined)?.[colorInfo.key] ??
												DEFAULT_COLOR_FALLBACK[colorInfo.key] ??
												'—'}
										</p>
									</div>
								{/each}
							</div>
						</div>

						<div class="border-t border-[color:color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_14%,transparent)] pt-8 mt-8 space-y-4">
							<h3 class="text-lg font-semibold text-[var(--heading-font-color)]">Light theme overrides</h3>
							<p class="text-sm text-[var(--color-surface-600-400)]">
								When visitors use <strong>light</strong> mode (<code class="text-xs px-1 rounded">html.light</code>), these
								values drive <code class="text-xs preset-filled-surface-200-800 px-1 rounded">--tp-*</code> if set. Dark mode
								uses the six core colors plus “Surfaces” above.
							</p>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								{#each EXTENDED_COLOR_FIELD_META.filter((m) => m.group === 'light') as colorInfo}
									{@const currentColor = colorValues[colorInfo.key] || getEffectiveColor(colorInfo.key)}
									{@const hexPick = /^#[0-9A-Fa-f]{6}$/.test(String(currentColor).trim())}
									<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4 min-w-0">
										<span class="label-text text-[var(--base-font-color)]">{colorInfo.label}</span>
										<p class="text-xs text-[var(--color-surface-600-400)] mb-3 mt-1">
											{colorInfo.description}
										</p>
										<div class="flex gap-2 items-stretch">
											{#if hexPick}
												<div
													class="[color-scheme:light] shrink-0 flex items-center rounded-[var(--radius-base)] border border-[color:color-mix(in_oklab,var(--color-surface-950)_14%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_16%,transparent)] preset-filled-surface-50-950 p-1"
												>
													<input
														type="color"
														value={currentColor}
														on:input={(e) =>
															updateColor(colorInfo.key, (e.target as HTMLInputElement).value)}
														class="h-9 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
														title="Pick color"
													/>
												</div>
											{/if}
											<input
												type="text"
												value={currentColor}
												on:input={(e) =>
													updateColor(colorInfo.key, (e.target as HTMLInputElement).value)}
												placeholder={DEFAULT_COLOR_FALLBACK[colorInfo.key] ?? '#888888'}
												autocomplete="off"
												spellcheck="false"
												class={ADMIN_COLOR_HEX_INPUT_CLASS}
											/>
										</div>
										<p class="mt-2 text-xs text-[var(--color-surface-600-400)]">
											Template default:
											{(activeTemplate?.colors as Record<string, string> | undefined)?.[colorInfo.key] ??
												DEFAULT_COLOR_FALLBACK[colorInfo.key] ??
												'—'}
										</p>
									</div>
								{/each}
							</div>
						</div>
					</div>
					{/if}
				{:else if activeTab === 'fonts'}
					{#if activeTemplate?.templateName === 'atelier'}
						<div class="space-y-6">
							<h2 class="text-xl font-semibold text-[var(--heading-font-color)]">Font Customization</h2>
							<p class="text-sm text-[var(--color-surface-600-400)] mb-4 max-w-3xl">
								Each row maps a role to the CSS variables used on the site (e.g. in
								<code class="text-xs font-mono">ThemeColorApplier</code>). The field list and pack defaults live in
								<code class="text-xs font-mono">lib/templates/atelier/theme.defaults.json</code>
								(<code class="text-xs font-mono">fontEditor</code> /
								<code class="text-xs font-mono">fonts</code>). Choose a Google Font or
								<strong>Custom</strong> and enter the exact <code class="text-xs font-mono">font-family</code> name.
							</p>
							<div class="overflow-x-auto rounded-lg border border-surface-200-800 bg-[var(--color-surface-50-950)]">
								<table class="w-full text-sm min-w-[720px]">
									<thead>
										<tr class="bg-[var(--color-surface-100-900)] border-b border-surface-200-800 text-left">
											<th class="p-3 font-semibold text-[var(--color-surface-800-200)] w-0 whitespace-nowrap">Token</th>
											<th class="p-3 font-semibold text-[var(--color-surface-800-200)]">Role</th>
											<th class="p-3 font-semibold text-[var(--color-surface-800-200)] min-w-[200px]">Family</th>
											<th class="p-3 font-semibold text-[var(--color-surface-800-200)] w-0 whitespace-nowrap">Size</th>
											<th class="p-3 font-semibold text-[var(--color-surface-800-200)] w-0 whitespace-nowrap">Weight</th>
										</tr>
									</thead>
									<tbody>
										{#each atelierThemePack.fontEditor as row}
											{@const role = row.role as FontRole}
											<tr class="border-b border-surface-200-800 align-top">
												<td class="p-3 font-mono text-xs text-[var(--color-primary-600)] whitespace-nowrap align-middle">{row.token}</td>
												<td class="p-3 text-[var(--color-surface-700-300)] align-middle">
													<div class="font-medium text-[var(--color-surface-800-200)]">{role}</div>
													<div class="text-xs text-[var(--color-surface-600-400)] mt-0.5">{row.label}</div>
												</td>
												<td class="p-3 min-w-0">
													<select
														value={GOOGLE_FONT_NAMES.has(getEffectiveFont(role)) ? getEffectiveFont(role) : '__custom__'}
														on:change={(e) => {
															const v = (e.currentTarget as HTMLSelectElement).value;
															if (v !== '__custom__') updateFontFamily(role, v);
														}}
														class="{ADMIN_SELECT_CLASS} w-full max-w-full"
													>
														{#each GOOGLE_FONTS as font}
															<option value={font.value}>{font.label}</option>
														{/each}
														<option value="__custom__">Custom…</option>
													</select>
													{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont(role))}
														<input
															type="text"
															value={getEffectiveFont(role)}
															on:input={(e) => updateFontFamily(role, (e.currentTarget as HTMLInputElement).value)}
															placeholder={atelierPackFontFamily(role)}
															class={`mt-2 ${ADMIN_TEXT_INPUT_CLASS}`}
														/>
													{/if}
													<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
														Template default: {getDefaultFontFamily(role)}
													</p>
												</td>
												<td class="p-3 align-middle">
													<select
														value={getFontSizeOverride(role)}
														on:change={(e) => updateFontSize(role, (e.currentTarget as HTMLSelectElement).value)}
														class="{ADMIN_SELECT_SM_CLASS} w-full min-w-[9rem]"
													>
														{#each FONT_SIZE_OPTIONS as opt}
															<option value={opt.value}>{opt.label}</option>
														{/each}
													</select>
												</td>
												<td class="p-3 align-middle">
													<select
														value={getFontWeightOverride(role)}
														on:change={(e) => updateFontWeight(role, (e.currentTarget as HTMLSelectElement).value)}
														class="{ADMIN_SELECT_SM_CLASS} w-full min-w-[9rem]"
													>
														{#each FONT_WEIGHT_OPTIONS as opt}
															<option value={opt.value}>{opt.label}</option>
														{/each}
													</select>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{:else}
						<div class="space-y-6">
						<h2 class="text-xl font-semibold text-[var(--heading-font-color)]">Font Customization</h2>
						<p class="text-sm text-[var(--color-surface-600-400)]">
							Choose from popular Google Fonts (loaded automatically), or use <strong>Custom</strong> for a system or self-hosted font: enter the exact CSS font-family name and ensure the font is loaded on your site (e.g. in <code class="rounded px-1 py-0.5 text-xs preset-filled-surface-200-800">app.html</code> or global CSS).
						</p>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="label">
									<span class="label-text">Heading Font</span>
									<select
										value={GOOGLE_FONT_NAMES.has(getEffectiveFont('heading')) ? getEffectiveFont('heading') : '__custom__'}
										on:change={(e) => {
											const v = (e.currentTarget as HTMLSelectElement).value;
											if (v !== '__custom__') updateFontFamily('heading', v);
										}}
										class={ADMIN_SELECT_CLASS}
									>
										{#each GOOGLE_FONTS as font}
											<option value={font.value}>{font.label}</option>
										{/each}
										<option value="__custom__">Custom…</option>
									</select>
								</label>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('heading'))}
									<input
										type="text"
										value={getEffectiveFont('heading')}
										on:input={(e) => updateFontFamily('heading', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class={`mt-2 ${ADMIN_TEXT_INPUT_CLASS}`}
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div>
										<label class="label">
											<span class="label-text opacity-80">Size</span>
											<select
												value={getFontSizeOverride('heading')}
												on:change={(e) => updateFontSize('heading', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_SIZE_OPTIONS as opt}
													<option value={opt.value}>{opt.label}</option>
												{/each}
											</select>
										</label>
									</div>
									<div>
										<label class="label">
											<span class="label-text opacity-80">Weight</span>
											<select
												value={getFontWeightOverride('heading')}
												on:change={(e) => updateFontWeight('heading', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_WEIGHT_OPTIONS as opt}
													<option value={opt.value}>{opt.label}</option>
												{/each}
											</select>
										</label>
									</div>
								</div>
								<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Default: {getDefaultFontFamily('heading')}</p>
							</div>
							<div>
								<label class="label">
									<span class="label-text">Body Font</span>
									<select
										value={GOOGLE_FONT_NAMES.has(getEffectiveFont('body')) ? getEffectiveFont('body') : '__custom__'}
										on:change={(e) => {
											const v = (e.currentTarget as HTMLSelectElement).value;
											if (v !== '__custom__') updateFontFamily('body', v);
										}}
										class={ADMIN_SELECT_CLASS}
									>
										{#each GOOGLE_FONTS as font}
											<option value={font.value}>{font.label}</option>
										{/each}
										<option value="__custom__">Custom…</option>
									</select>
								</label>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('body'))}
									<input
										type="text"
										value={getEffectiveFont('body')}
										on:input={(e) => updateFontFamily('body', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class={`mt-2 ${ADMIN_TEXT_INPUT_CLASS}`}
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div>
										<label class="label">
											<span class="label-text opacity-80">Size</span>
											<select
												value={getFontSizeOverride('body')}
												on:change={(e) => updateFontSize('body', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_SIZE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
											</select>
										</label>
									</div>
									<div>
										<label class="label">
											<span class="label-text opacity-80">Weight</span>
											<select
												value={getFontWeightOverride('body')}
												on:change={(e) => updateFontWeight('body', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_WEIGHT_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
											</select>
										</label>
									</div>
								</div>
								<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Default: {getDefaultFontFamily('body')}</p>
							</div>
							<div>
								<label class="label">
									<span class="label-text">Links</span>
									<select
										value={GOOGLE_FONT_NAMES.has(getEffectiveFont('links')) ? getEffectiveFont('links') : '__custom__'}
										on:change={(e) => {
											const v = (e.currentTarget as HTMLSelectElement).value;
											if (v !== '__custom__') updateFontFamily('links', v);
										}}
										class={ADMIN_SELECT_CLASS}
									>
										{#each GOOGLE_FONTS as font}
											<option value={font.value}>{font.label}</option>
										{/each}
										<option value="__custom__">Custom…</option>
									</select>
								</label>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('links'))}
									<input
										type="text"
										value={getEffectiveFont('links')}
										on:input={(e) => updateFontFamily('links', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class={`mt-2 ${ADMIN_TEXT_INPUT_CLASS}`}
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div>
										<label class="label">
											<span class="label-text opacity-80">Size</span>
											<select
												value={getFontSizeOverride('links')}
												on:change={(e) => updateFontSize('links', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_SIZE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
											</select>
										</label>
									</div>
									<div>
										<label class="label">
											<span class="label-text opacity-80">Weight</span>
											<select
												value={getFontWeightOverride('links')}
												on:change={(e) => updateFontWeight('links', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_WEIGHT_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
											</select>
										</label>
									</div>
								</div>
								<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Default: {getDefaultFontFamily('links')}</p>
							</div>
							<div>
								<label class="label">
									<span class="label-text">Lists</span>
									<select
										value={GOOGLE_FONT_NAMES.has(getEffectiveFont('lists')) ? getEffectiveFont('lists') : '__custom__'}
										on:change={(e) => {
											const v = (e.currentTarget as HTMLSelectElement).value;
											if (v !== '__custom__') updateFontFamily('lists', v);
										}}
										class={ADMIN_SELECT_CLASS}
									>
										{#each GOOGLE_FONTS as font}
											<option value={font.value}>{font.label}</option>
										{/each}
										<option value="__custom__">Custom…</option>
									</select>
								</label>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('lists'))}
									<input
										type="text"
										value={getEffectiveFont('lists')}
										on:input={(e) => updateFontFamily('lists', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class={`mt-2 ${ADMIN_TEXT_INPUT_CLASS}`}
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div>
										<label class="label">
											<span class="label-text opacity-80">Size</span>
											<select
												value={getFontSizeOverride('lists')}
												on:change={(e) => updateFontSize('lists', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_SIZE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
											</select>
										</label>
									</div>
									<div>
										<label class="label">
											<span class="label-text opacity-80">Weight</span>
											<select
												value={getFontWeightOverride('lists')}
												on:change={(e) => updateFontWeight('lists', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_WEIGHT_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
											</select>
										</label>
									</div>
								</div>
								<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Default: {getDefaultFontFamily('lists')}</p>
							</div>
							<div>
								<label class="label">
									<span class="label-text">Form inputs</span>
									<select
										value={GOOGLE_FONT_NAMES.has(getEffectiveFont('formInputs')) ? getEffectiveFont('formInputs') : '__custom__'}
										on:change={(e) => {
											const v = (e.currentTarget as HTMLSelectElement).value;
											if (v !== '__custom__') updateFontFamily('formInputs', v);
										}}
										class={ADMIN_SELECT_CLASS}
									>
										{#each GOOGLE_FONTS as font}
											<option value={font.value}>{font.label}</option>
										{/each}
										<option value="__custom__">Custom…</option>
									</select>
								</label>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('formInputs'))}
									<input
										type="text"
										value={getEffectiveFont('formInputs')}
										on:input={(e) => updateFontFamily('formInputs', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class={`mt-2 ${ADMIN_TEXT_INPUT_CLASS}`}
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div>
										<label class="label">
											<span class="label-text opacity-80">Size</span>
											<select
												value={getFontSizeOverride('formInputs')}
												on:change={(e) => updateFontSize('formInputs', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_SIZE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
											</select>
										</label>
									</div>
									<div>
										<label class="label">
											<span class="label-text opacity-80">Weight</span>
											<select
												value={getFontWeightOverride('formInputs')}
												on:change={(e) => updateFontWeight('formInputs', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_WEIGHT_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
											</select>
										</label>
									</div>
								</div>
								<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Default: {getDefaultFontFamily('formInputs')}</p>
							</div>
							<div>
								<label class="label">
									<span class="label-text">Form labels</span>
									<select
										value={GOOGLE_FONT_NAMES.has(getEffectiveFont('formLabels')) ? getEffectiveFont('formLabels') : '__custom__'}
										on:change={(e) => {
											const v = (e.currentTarget as HTMLSelectElement).value;
											if (v !== '__custom__') updateFontFamily('formLabels', v);
										}}
										class={ADMIN_SELECT_CLASS}
									>
										{#each GOOGLE_FONTS as font}
											<option value={font.value}>{font.label}</option>
										{/each}
										<option value="__custom__">Custom…</option>
									</select>
								</label>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('formLabels'))}
									<input
										type="text"
										value={getEffectiveFont('formLabels')}
										on:input={(e) => updateFontFamily('formLabels', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class={`mt-2 ${ADMIN_TEXT_INPUT_CLASS}`}
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div>
										<label class="label">
											<span class="label-text opacity-80">Size</span>
											<select
												value={getFontSizeOverride('formLabels')}
												on:change={(e) => updateFontSize('formLabels', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_SIZE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
											</select>
										</label>
									</div>
									<div>
										<label class="label">
											<span class="label-text opacity-80">Weight</span>
											<select
												value={getFontWeightOverride('formLabels')}
												on:change={(e) => updateFontWeight('formLabels', (e.currentTarget as HTMLSelectElement).value)}
												class={ADMIN_SELECT_SM_CLASS}
											>
												{#each FONT_WEIGHT_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
											</select>
										</label>
									</div>
								</div>
								<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Default: {getDefaultFontFamily('formLabels')}</p>
							</div>
						</div>
						</div>
					{/if}
				{:else if activeTab === 'layout'}
					{#if activeTemplate?.templateName === 'atelier'}
						<div class="space-y-4">
							<div>
								<h2 class="text-xl font-semibold text-[var(--color-surface-950-50)]">Layout & spacing</h2>
								<p class="text-sm text-[var(--color-surface-600-400)] mt-1 max-w-3xl">
									Values are stored <strong>per breakpoint</strong>. The field list lives in
									<code class="text-xs font-mono">lib/templates/atelier/theme.defaults.json</code>
									(<code class="text-xs font-mono">layoutEditor</code>); defaults also reference
									<code class="text-xs font-mono">packTokens</code>. Applied on the site as
									<code class="text-xs font-mono">--os-*</code> via <code class="text-xs font-mono">ThemeColorApplier</code>.
								</p>
							</div>

							<div
								class="rounded-lg border border-surface-200-800 bg-[var(--color-surface-50-950)] overflow-hidden [color-scheme:light]"
							>
								<div
									class="border-b border-surface-200-800 bg-[var(--color-surface-50-950)] px-2 pt-2"
									role="tablist"
									aria-label="Breakpoint"
								>
									<nav class="-mb-px flex flex-wrap gap-0.5 sm:gap-1">
										{#each TEMPLATE_BREAKPOINTS as bp}
											<button
												type="button"
												role="tab"
												id="layout-tab-atelier-{bp}"
												aria-selected={editingBreakpoint === bp}
												aria-controls="layout-panel-atelier-shell"
												tabindex={editingBreakpoint === bp ? 0 : -1}
												on:click={() => (editingBreakpoint = bp)}
												class="min-w-0 flex-1 sm:flex-none px-3 py-2.5 text-sm font-medium border-b-2 transition-colors rounded-t-md
													{editingBreakpoint === bp
														? 'border-[var(--color-primary-600)] text-[var(--color-primary-700)] bg-[var(--color-surface-50-950)] border-b-[var(--color-primary-600)] z-10'
														: 'border-transparent text-[var(--color-surface-600-400)] hover:text-[var(--color-surface-900-100)] hover:border-surface-300-700'}"
											>
												<span class="uppercase tracking-wide">{bp}</span>
												<span
													class="block text-[10px] sm:inline sm:ml-1 sm:text-xs font-normal text-[var(--color-surface-400-600)]"
													>≥{BREAKPOINT_MIN_WIDTH_PX[bp]}px</span
												>
											</button>
										{/each}
									</nav>
								</div>

								<div
									id="layout-panel-atelier-shell"
									class="p-4 sm:p-6"
									role="tabpanel"
									aria-labelledby="layout-tab-atelier-{editingBreakpoint}"
								>
									{#key editingBreakpoint}
										<div class="overflow-x-auto rounded-lg border border-surface-200-800 bg-[var(--color-surface-50-950)]">
											<table class="w-full text-sm min-w-[640px]">
												<thead>
													<tr class="bg-[var(--color-surface-100-900)] border-b border-surface-200-800 text-left">
														<th class="p-3 font-semibold text-[var(--color-surface-800-200)] w-0 whitespace-nowrap">Token</th>
														<th class="p-3 font-semibold text-[var(--color-surface-800-200)]">Description</th>
														<th class="p-3 font-semibold text-[var(--color-surface-800-200)] min-w-[200px]">Value</th>
														<th class="p-3 font-semibold text-[var(--color-surface-800-200)]">Hint</th>
													</tr>
												</thead>
												<tbody>
													{#each atelierThemePack.layoutEditor as row}
														<tr class="border-b border-surface-200-800 align-top">
															<td class="p-3 font-mono text-xs text-[var(--color-primary-600)] whitespace-nowrap align-middle">{row.token}</td>
															<td class="p-3 text-[var(--color-surface-700-300)] align-middle">{row.label}</td>
															<td class="p-3 min-w-0">
																<input
																	type="text"
																	value={getEffectiveLayout(row.key)}
																	on:input={(e) =>
																		updateLayout(row.key, (e.currentTarget as HTMLInputElement).value)}
																	placeholder={atelierPackLayoutDefault(row.key)}
																	autocomplete="off"
																	spellcheck="false"
																	class={ADMIN_TEXT_INPUT_CLASS}
																/>
															</td>
															<td class="p-3 text-xs text-[var(--color-surface-600-400)] align-middle">
																{#if row.key === 'maxWidth' || row.key === 'containerPadding' || row.key === 'gridGap'}
																	Suggested ({editingBreakpoint}):
																	{SHELL_HINT_BY_BREAKPOINT[editingBreakpoint][row.key] ?? '—'}
																{:else}
																	Pack default:
																	{((activeTemplate.layout as unknown as Record<string, string | undefined>)[row.key] ??
																	atelierPackLayoutDefault(row.key)) || '—'}
																{/if}
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{/key}
								</div>
							</div>
						</div>
					{:else}
						<div class="space-y-4">
							<div>
								<h2 class="text-xl font-semibold text-[var(--color-surface-950-50)]">Layout Customization</h2>
								<p class="text-sm text-[var(--color-surface-600-400)] mt-1">
									Choose a breakpoint tab. Each tab has its own max width, padding, and grid gap (stored per breakpoint).
								</p>
							</div>

							<div
								class="rounded-lg border border-surface-200-800 bg-[var(--color-surface-50-950)] overflow-hidden [color-scheme:light]"
							>
								<div
									class="border-b border-surface-200-800 bg-[var(--color-surface-50-950)] px-2 pt-2"
									role="tablist"
									aria-label="Breakpoint"
								>
									<nav class="-mb-px flex flex-wrap gap-0.5 sm:gap-1">
										{#each TEMPLATE_BREAKPOINTS as bp}
											<button
												type="button"
												role="tab"
												id="layout-tab-{bp}"
												aria-selected={editingBreakpoint === bp}
												aria-controls="layout-panel-shell"
												tabindex={editingBreakpoint === bp ? 0 : -1}
												on:click={() => (editingBreakpoint = bp)}
												class="min-w-0 flex-1 sm:flex-none px-3 py-2.5 text-sm font-medium border-b-2 transition-colors rounded-t-md
													{editingBreakpoint === bp
														? 'border-[var(--color-primary-600)] text-[var(--color-primary-700)] bg-[var(--color-surface-50-950)] border-b-[var(--color-primary-600)] z-10'
														: 'border-transparent text-[var(--color-surface-600-400)] hover:text-[var(--color-surface-900-100)] hover:border-surface-300-700'}"
											>
												<span class="uppercase tracking-wide">{bp}</span>
												<span
													class="block text-[10px] sm:inline sm:ml-1 sm:text-xs font-normal text-[var(--color-surface-400-600)]"
													>≥{BREAKPOINT_MIN_WIDTH_PX[bp]}px</span
												>
											</button>
										{/each}
									</nav>
								</div>

								<div
									id="layout-panel-shell"
									class="p-4 sm:p-6"
									role="tabpanel"
									aria-labelledby="layout-tab-{editingBreakpoint}"
								>
									{#key editingBreakpoint}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
											<div>
												<label class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2" for="layout-mw-{editingBreakpoint}">
													Max width
												</label>
												<input
													id="layout-mw-{editingBreakpoint}"
													type="text"
													value={getEffectiveLayout('maxWidth')}
													on:input={(e) => updateLayout('maxWidth', (e.target as HTMLInputElement).value)}
													placeholder={SHELL_HINT_BY_BREAKPOINT[editingBreakpoint].maxWidth}
													class={ADMIN_TEXT_INPUT_CLASS}
												/>
												<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
													Pack default: {activeTemplate.layout.maxWidth} · Suggested at {editingBreakpoint}: {SHELL_HINT_BY_BREAKPOINT[editingBreakpoint].maxWidth}
												</p>
											</div>
											<div>
												<label class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2" for="layout-pad-{editingBreakpoint}">
													Container padding
												</label>
												<input
													id="layout-pad-{editingBreakpoint}"
													type="text"
													value={getEffectiveLayout('containerPadding')}
													on:input={(e) => updateLayout('containerPadding', (e.target as HTMLInputElement).value)}
													placeholder={SHELL_HINT_BY_BREAKPOINT[editingBreakpoint].containerPadding}
													class={ADMIN_TEXT_INPUT_CLASS}
												/>
												<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
													Pack default: {activeTemplate.layout.containerPadding} · Suggested: {SHELL_HINT_BY_BREAKPOINT[editingBreakpoint].containerPadding}
												</p>
											</div>
											<div>
												<label class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2" for="layout-gap-{editingBreakpoint}">
													Grid gap
												</label>
												<input
													id="layout-gap-{editingBreakpoint}"
													type="text"
													value={getEffectiveLayout('gridGap')}
													on:input={(e) => updateLayout('gridGap', (e.target as HTMLInputElement).value)}
													placeholder={SHELL_HINT_BY_BREAKPOINT[editingBreakpoint].gridGap}
													class={ADMIN_TEXT_INPUT_CLASS}
												/>
												<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
													Pack default: {activeTemplate.layout.gridGap} · Suggested: {SHELL_HINT_BY_BREAKPOINT[editingBreakpoint].gridGap}
												</p>
											</div>
										</div>
									{/key}
								</div>
							</div>
						</div>
					{/if}
				{:else if activeTab === 'pages'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-[var(--color-surface-950-50)]">Page structure</h2>
						<p class="text-sm text-[var(--color-surface-600-400)] max-w-3xl">
							Use the <strong>page</strong> tabs to pick a route region, then the <strong>breakpoint</strong> tabs to
							edit that page at each viewport width. Set <strong>grid</strong> rows/columns and <strong>place modules</strong>
							per breakpoint — the live site uses the layout that matches the visitor’s screen.
						</p>

						<div
							class="rounded-lg border border-surface-200-800 bg-[var(--color-surface-50-950)] overflow-hidden [color-scheme:light]"
						>
							<!-- Outer tabs: pages -->
							<div
								class="border-b border-surface-200-800 bg-slate-50 px-2 pt-2"
								role="tablist"
								aria-label="Page"
							>
								<nav class="-mb-px flex flex-wrap gap-0.5 sm:gap-1">
									{#each PAGE_KEYS as pt}
										<button
											type="button"
											role="tab"
											id="pages-tab-{pt}"
											aria-selected={editingPageType === pt}
											aria-controls="pages-editor-panel"
											tabindex={editingPageType === pt ? 0 : -1}
											on:click={() => {
												editingPageType = pt;
												selectedCells = new Set();
												assignedModuleType = '';
												editingModule = null;
											}}
											class="min-w-0 flex-1 sm:flex-none px-3 py-2.5 text-sm font-medium border-b-2 transition-colors rounded-t-md capitalize
												{editingPageType === pt
													? 'border-violet-600 text-violet-800 bg-[var(--color-surface-50-950)] border-b-violet-600 z-10'
													: 'border-transparent text-[var(--color-surface-600-400)] hover:text-[var(--color-surface-900-100)] hover:border-surface-300-700'}"
										>
											{pt}
										</button>
									{/each}
								</nav>
							</div>
							<!-- Inner tabs: breakpoints -->
							<div
								class="border-b border-surface-200-800 bg-[var(--color-surface-50-950)]/80 px-2 pt-2"
								role="tablist"
								aria-label="Breakpoint for {editingPageType}"
							>
								<nav class="-mb-px flex flex-wrap gap-0.5 sm:gap-1">
									{#each TEMPLATE_BREAKPOINTS as bp}
										<button
											type="button"
											role="tab"
											id="pages-bp-tab-{editingPageType}-{bp}"
											aria-selected={editingBreakpoint === bp}
											aria-controls="pages-editor-panel"
											tabindex={editingBreakpoint === bp ? 0 : -1}
											disabled={sameGridToAllBreakpoints}
											on:click={() => {
												if (sameGridToAllBreakpoints) return;
												editingBreakpoint = bp;
											}}
											class="min-w-0 flex-1 sm:flex-none px-3 py-2 text-sm font-medium border-b-2 transition-colors rounded-t-md
												{editingBreakpoint === bp
													? 'border-[var(--color-primary-600)] text-[var(--color-primary-700)] bg-[var(--color-surface-50-950)] border-b-[var(--color-primary-600)] z-10'
													: 'border-transparent text-[var(--color-surface-600-400)] hover:text-[var(--color-surface-900-100)] hover:border-surface-300-700'}
												{sameGridToAllBreakpoints ? ' opacity-50 cursor-not-allowed hover:text-[var(--color-surface-600-400)] hover:border-transparent' : ''}"
										>
											<span class="uppercase tracking-wide">{bp}</span>
											<span
												class="block text-[10px] sm:inline sm:ml-1 sm:text-xs font-normal text-[var(--color-surface-400-600)]"
												>≥{BREAKPOINT_MIN_WIDTH_PX[bp]}px</span
											>
										</button>
									{/each}
								</nav>
							</div>

							<div
								id="pages-editor-panel"
								role="tabpanel"
								aria-labelledby="pages-tab-{editingPageType}"
								class="p-4 sm:p-5 space-y-6"
							>
								<p class="text-xs text-[var(--color-surface-600-400)]">
									<span class="font-medium text-[var(--color-surface-800-200)] capitalize">{editingPageType}</span>
									·
									<span class="uppercase">{editingBreakpoint}</span>
									<span class="text-[var(--color-surface-600-400)]">
										(≥{BREAKPOINT_MIN_WIDTH_PX[editingBreakpoint]}px) — grid {pageGrid.gridRows} × {pageGrid.gridColumns}
									</span>
								</p>

						{#key `${editingPageType}-${editingBreakpoint}`}
						<!-- Grid configuration (like template builder) -->
						<div class="bg-[var(--color-surface-50-950)] p-4 rounded-lg">
							<div class="mb-3">
								<label class="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-surface-800-200)]">
									<input
										type="checkbox"
										checked={sameGridToAllBreakpoints}
										on:change={(e) =>
											setSameGridToAllBreakpointsForEditingPage(
												(e.currentTarget as HTMLInputElement).checked
											)}
									/>
									Same grid to all breakpoints
								</label>
								<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
									When enabled, breakpoint tabs are locked and the current grid/modules are copied to all breakpoints.
								</p>
							</div>
							<h3 class="text-sm font-semibold text-[var(--color-surface-950-50)] mb-3">Grid configuration</h3>
							{#if !showApplyCurrentBreakpointToAllBreakpoints}
								<p class="text-xs text-[var(--color-surface-600-400)] mt-2">
									{$t('admin.allBreakpointsAlreadyMatchForPage')}
								</p>
								<p class="text-xs text-[var(--color-surface-600-400)] mt-1">
									{$t('admin.switchBreakpointToMakeDifferent')}
								</p>
							{/if}
							<div class="grid grid-cols-2 gap-4 max-w-xs">
								<div>
									<label
										for="grid-rows-{editingPageType}-{editingBreakpoint}"
										class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-1"
									>Rows</label>
									<input
										id="grid-rows-{editingPageType}-{editingBreakpoint}"
										type="number"
										min="1"
										max="20"
										value={pageGrid.gridRows}
										on:input={(e) => updateGridForPageType(editingPageType, parseInt((e.target as HTMLInputElement).value) || 1, undefined)}
										class="w-full px-3 py-2 border border-surface-300-700 rounded-md"
									/>
								</div>
								<div>
									<label
										for="grid-cols-{editingPageType}-{editingBreakpoint}"
										class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-1"
									>Columns</label>
									<input
										id="grid-cols-{editingPageType}-{editingBreakpoint}"
										type="number"
										min="1"
										max="20"
										value={pageGrid.gridColumns}
										on:input={(e) => updateGridForPageType(editingPageType, undefined, parseInt((e.target as HTMLInputElement).value) || 1)}
										class="w-full px-3 py-2 border border-surface-300-700 rounded-md"
									/>
								</div>
							</div>
							{#if showApplyCurrentBreakpointToAllBreakpoints}
								<button
									type="button"
									title={$t('admin.applyCurrentBreakpointToAllBreakpointsHelp')}
									on:click={() => applyCurrentBreakpointToAllForEditingPage()}
									class="mt-3 text-sm px-3 py-1.5 border border-surface-300-700 text-[var(--color-surface-900-100)] rounded-md hover:bg-[var(--color-surface-100-900)]"
								>
									{$t('admin.applyCurrentBreakpointToAllBreakpoints')}
								</button>
							{/if}
							{#if editingPageType === 'home' && getModulesForPageType(editingPageType, editingBreakpoint).length === 0}
								<button
									type="button"
									on:click={() => applyDefaultLayout(editingPageType)}
									class="mt-3 text-sm px-3 py-1.5 bg-[color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] text-[var(--color-primary-700)] rounded hover:bg-[color-mix(in_oklab,var(--color-primary-500)_28%,transparent)]"
								>
									Use default (2 rows × 1 col: Hero + Albums Grid)
								</button>
							{/if}
						</div>

						{#key pageGrid.gridRows + '-' + pageGrid.gridColumns + '-' + editingBreakpoint + '-' + layoutEditorModulesKey}
						<!-- Layout grid (like page builder: select cells, assign module) -->
						<div>
							<h3 class="text-sm font-semibold text-[var(--color-surface-950-50)] mb-3">Layout grid</h3>
							<p class="text-xs text-[var(--color-surface-600-400)] mb-3 max-w-3xl">
								Each row has a <span class="font-medium">row rail</span> on the left (label + reorder). Applies to
								<span class="font-medium capitalize">{editingPageType}</span> ·
								<span class="uppercase font-medium">{editingBreakpoint}</span>.
								{#if sameGridToAllBreakpoints}
									Same grid is on for all breakpoints — use “Apply current breakpoint to all…” so other widths match.
								{/if}
							</p>
							<div
								class="gap-2 border-2 border-surface-300-700 p-2 bg-[var(--color-surface-50-950)] select-none rounded-lg"
								style="display: grid; grid-template-columns: minmax(10.5rem, 12rem) repeat({pageGrid.gridColumns}, 1fr); grid-template-rows: repeat({pageGrid.gridRows}, minmax(80px, auto));"
							>
								{#each Array(pageGrid.gridRows) as _, rIdx (rIdx)}
									<div
										class="flex flex-col justify-center gap-1 rounded-md border border-surface-200-800 bg-[color-mix(in_oklab,var(--color-surface-500)_8%,var(--color-surface-50-950))] px-2 py-2"
										style="grid-column: 1; grid-row: {rIdx + 1}"
									>
										<div class="text-[11px] font-semibold text-[var(--color-surface-800-200)] leading-tight">
											Row {rIdx + 1}
										</div>
										<div class="text-[10px] text-[var(--color-surface-500)] leading-tight">
											Band · grid row {rIdx + 1} of {pageGrid.gridRows}
										</div>
										<div class="mt-1 flex flex-wrap gap-1">
											<button
												type="button"
												title="Move this row up (swap with row above)"
												class="px-1.5 py-0.5 text-[11px] rounded border bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-200-800 hover:bg-[var(--color-surface-100-900)] disabled:opacity-40"
												disabled={rIdx === 0}
												on:click|stopPropagation={() => movePageGridRow(editingPageType, rIdx, rIdx - 1)}
											>
												↑
											</button>
											<button
												type="button"
												title="Move this row down (swap with row below)"
												class="px-1.5 py-0.5 text-[11px] rounded border bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-200-800 hover:bg-[var(--color-surface-100-900)] disabled:opacity-40"
												disabled={rIdx >= pageGrid.gridRows - 1}
												on:click|stopPropagation={() => movePageGridRow(editingPageType, rIdx, rIdx + 1)}
											>
												↓
											</button>
											<button
												type="button"
												title="Insert empty row above this band"
												class="px-1.5 py-0.5 text-[11px] rounded border bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-200-800 hover:bg-[var(--color-surface-100-900)] disabled:opacity-40"
												disabled={pageGrid.gridRows >= 20}
												on:click|stopPropagation={() => insertPageGridRow(editingPageType, rIdx)}
											>
												+↑
											</button>
											<button
												type="button"
												title="Insert empty row below this band"
												class="px-1.5 py-0.5 text-[11px] rounded border bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-200-800 hover:bg-[var(--color-surface-100-900)] disabled:opacity-40"
												disabled={pageGrid.gridRows >= 20}
												on:click|stopPropagation={() => insertPageGridRow(editingPageType, rIdx + 1)}
											>
												+↓
											</button>
											<button
												type="button"
												title="Delete this row (removes modules in this band; cannot remove last row)"
												class="px-1.5 py-0.5 text-[11px] rounded border bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-200-800 hover:bg-red-500/15 hover:border-red-400/60 dark:hover:border-red-500/50 disabled:opacity-40 inline-flex items-center justify-center"
												disabled={pageGrid.gridRows <= 1}
												aria-label="Delete row"
												on:click|stopPropagation={() => deletePageGridRow(editingPageType, rIdx)}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 16 16"
													class="w-3.5 h-3.5 shrink-0"
													fill="currentColor"
													aria-hidden="true"
												>
													<path
														d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"
													/>
													<path
														d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
													/>
												</svg>
											</button>
										</div>
									</div>
								{/each}
								{#each layoutEditorModules as mod (mod._id)}
									{@const r = mod.rowOrder ?? 0}
									{@const c = mod.columnIndex ?? 0}
									{@const rs = mod.rowSpan ?? 1}
									{@const cs = mod.colSpan ?? 1}
									<div
										class="border border-green-300 rounded-lg p-3 bg-green-50/50"
										style="grid-column: {c + 2} / span {cs}; grid-row: {r + 1} / span {rs}"
									>
										<div class="flex flex-col h-full">
											<p class="text-sm font-medium text-[var(--color-surface-950-50)]">{mod.type}</p>
											{#if rs > 1 || cs > 1}
												<p class="text-xs text-[var(--color-surface-600-400)] mt-1">{rs}×{cs} span</p>
											{/if}
											<div class="flex gap-2 mt-2">
												<button
													type="button"
													class="text-xs text-[var(--color-primary-600)] hover:text-[var(--color-primary-800)] font-medium"
													on:click|stopPropagation={() => {
														layoutShellPresetKeyError = '';
														// Deep clone the module to avoid mutating the original
														editingModule = JSON.parse(JSON.stringify(mod));
														if (!editingModule._id) {
															editingModule._id = `mod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
														}
														logger.debug('[Overrides] Editing module (before init):', { 
															type: editingModule.type, 
															props: editingModule.props,
															title: editingModule.props?.title,
															subtitle: editingModule.props?.subtitle,
															ctaLabel: editingModule.props?.ctaLabel
														});
														// Ensure props exist
														if (!editingModule.props) {
															editingModule.props = {};
														}
														// Initialize hero props if needed
														if (editingModule.type === 'hero') {
															if (!editingModule.props.backgroundStyle) {
																editingModule.props.backgroundStyle = 'light';
															}
															// Ensure MultiLangText fields are objects, not strings
															// Only initialize if missing or null - preserve existing objects
															if (editingModule.props.title === null || editingModule.props.title === undefined) {
																editingModule.props.title = {};
															} else if (typeof editingModule.props.title === 'string') {
																editingModule.props.title = { en: editingModule.props.title };
															}
															// subtitle
															if (editingModule.props.subtitle === null || editingModule.props.subtitle === undefined) {
																editingModule.props.subtitle = {};
															} else if (typeof editingModule.props.subtitle === 'string') {
																editingModule.props.subtitle = { en: editingModule.props.subtitle };
															}
															// ctaLabel
															if (editingModule.props.ctaLabel === null || editingModule.props.ctaLabel === undefined) {
																editingModule.props.ctaLabel = {};
															} else if (typeof editingModule.props.ctaLabel === 'string') {
																editingModule.props.ctaLabel = { en: editingModule.props.ctaLabel };
															}
														}
														// Initialize richText props if needed
														if (editingModule.type === 'richText') {
															if (!editingModule.props.background) {
																editingModule.props.background = 'white';
															}
															// Ensure MultiLangText fields are objects, not strings
															if (editingModule.props.title === null || editingModule.props.title === undefined) {
																editingModule.props.title = {};
															} else if (typeof editingModule.props.title === 'string') {
																editingModule.props.title = { en: editingModule.props.title };
															}
															// Ensure MultiLangHTML fields are objects, not strings
															if (editingModule.props.body === null || editingModule.props.body === undefined) {
																editingModule.props.body = {};
															} else if (typeof editingModule.props.body === 'string') {
																editingModule.props.body = { en: editingModule.props.body };
															}
														}
														// Initialize pageTitle props if needed
														if (editingModule.type === 'pageTitle') {
															if (editingModule.props.showTitle === undefined) {
																editingModule.props.showTitle = true;
															}
															if (editingModule.props.showSubtitle === undefined) {
																editingModule.props.showSubtitle = true;
															}
															if (editingModule.props.align !== 'left' && editingModule.props.align !== 'center') {
																editingModule.props.align = 'center';
															}
														}
														// Initialize languageSelector props if needed
														if (editingModule.type === 'languageSelector') {
															if (editingModule.props.showFlags === undefined) {
																editingModule.props.showFlags = true;
															}
															if (editingModule.props.showNativeNames === undefined) {
																editingModule.props.showNativeNames = true;
															}
															if (editingModule.props.compact === undefined) {
																editingModule.props.compact = false;
															}
														}
														// Initialize userGreeting props if needed
														if (editingModule.type === 'userGreeting') {
															if (!editingModule.props.greeting) {
																editingModule.props.greeting = 'Hello';
															}
															if (editingModule.props.showEmail === undefined) {
																editingModule.props.showEmail = false;
															}
														}
														// Initialize authButtons props if needed
														if (editingModule.type === 'authButtons') {
															if (!editingModule.props.loginLabel) {
																editingModule.props.loginLabel = 'Login';
															}
															if (!editingModule.props.logoutLabel) {
																editingModule.props.logoutLabel = 'Logout';
															}
															if (!editingModule.props.loginUrl) {
																editingModule.props.loginUrl = '/login';
															}
															if (!editingModule.props.containerClass) {
																editingModule.props.containerClass = 'flex items-center gap-2';
															}
														}
														// Initialize logo props if needed
														if (editingModule.type === 'logo') {
															if (!editingModule.props.size) {
																editingModule.props.size = 'md';
															}
															if (editingModule.props.fallbackIcon === undefined) {
																editingModule.props.fallbackIcon = true;
															}
														}
														// Initialize siteTitle props if needed
														if (editingModule.type === 'siteTitle') {
															if (editingModule.props.showAsLink === undefined) {
																editingModule.props.showAsLink = true;
															}
														}
														// Initialize menu props if needed
														if (editingModule.type === 'menu') {
															if (!editingModule.props.orientation) {
																editingModule.props.orientation = 'horizontal';
															}
														}
														if (editingModule.type === 'divider') {
															if (!editingModule.props.thickness) {
																editingModule.props.thickness = 'thin';
															}
															if (!editingModule.props.margin) {
																editingModule.props.margin = 'sm';
															}
															if (!editingModule.props.lineStyle) {
																editingModule.props.lineStyle = 'solid';
															}
														}
														// Initialize socialMedia props if needed
														if (editingModule.type === 'socialMedia') {
															if (!editingModule.props.socialMedia) {
																editingModule.props.socialMedia = {};
															}
															if (!editingModule.props.iconSize) {
																editingModule.props.iconSize = 'md';
															}
															if (!editingModule.props.iconColor) {
																editingModule.props.iconColor = 'current';
															}
															if (editingModule.props.showLabels === undefined) {
																editingModule.props.showLabels = false;
															}
															if (!editingModule.props.orientation) {
																editingModule.props.orientation = 'horizontal';
															}
															if (!editingModule.props.align) {
																editingModule.props.align = 'start';
															}
															if (!editingModule.props.gap) {
																editingModule.props.gap = 'normal';
															}
														}
														if (editingModule.type === 'blogCategory') {
															if (
																editingModule.props.title === null ||
																editingModule.props.title === undefined
															) {
																editingModule.props.title = {};
															} else if (typeof editingModule.props.title === 'string') {
																editingModule.props.title = { en: editingModule.props.title };
															}
															if (
																!editingModule.props.layout ||
																!['chips', 'list'].includes(editingModule.props.layout)
															) {
																editingModule.props.layout = 'chips';
															}
															if (editingModule.props.showCount === undefined) {
																editingModule.props.showCount = false;
															}
															if (
																editingModule.props.maxItems === undefined ||
																editingModule.props.maxItems === null
															) {
																editingModule.props.maxItems = 10;
															}
															if (
																!editingModule.props.sortBy ||
																!['name', 'count'].includes(editingModule.props.sortBy)
															) {
																editingModule.props.sortBy = 'name';
															}
															if (editingModule.props.linkToArticles === undefined) {
																editingModule.props.linkToArticles = false;
															}
															if (
																!editingModule.props.articlesListPath ||
																typeof editingModule.props.articlesListPath !== 'string'
															) {
																editingModule.props.articlesListPath = '/blog';
															}
														}
														if (editingModule.type === 'layoutShell') {
															layoutShellOriginalPresetKey = String(editingModule.props?.presetKey ?? '').trim();
															layoutShellReusePick = '';
															layoutShellUseExistingSelection = false;
															layoutShellPresetKeyError = '';
															clearLayoutShellInnerSelection();
															layoutShellInnerEditingRow = 0;
														}
														logger.debug('[Overrides] After initialization:', { 
															type: editingModule.type, 
															props: editingModule.props,
															title: editingModule.props?.title,
															subtitle: editingModule.props?.subtitle,
															ctaLabel: editingModule.props?.ctaLabel
														});
													}}
												>
													Edit
												</button>
												<button
													type="button"
													class="text-xs text-red-600 hover:text-red-800 font-medium"
													on:click|stopPropagation={() => removeModuleFromCell(editingPageType, r, c)}
												>
													Remove
												</button>
											</div>
										</div>
									</div>
								{/each}
								{#each Array(pageGrid.gridRows) as _, rowIndex}
									{#each Array(pageGrid.gridColumns) as _, colIndex}
										{@const row = rowIndex}
										{@const col = colIndex}
										{@const covered = isCellCovered(editingPageType, row, col)}
										{@const mod = getModuleAtCell(editingPageType, row, col)}
										{@const key = cellKey(row, col)}
										{@const selected = selectedCells.has(key)}
										{#if covered}
											<!-- Covered by module span -->
										{:else if !mod}
											<div
												class="border rounded-lg p-3 min-h-[80px] transition-colors flex flex-col
													{selected ? 'ring-2 ring-[var(--color-primary-500)] bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] border-[color-mix(in_oklab,var(--color-primary-500)_30%,transparent)]' : 'border-surface-300-700 bg-[var(--color-surface-50-950)] hover:bg-[var(--color-surface-50-950)] cursor-pointer'}"
												style="grid-column: {col + 2}; grid-row: {row + 1}"
												on:click|stopPropagation={() => { if (!selected) toggleCell(row, col); }}
											>
												{#if selected}
													<div class="flex-1 flex flex-col items-center justify-center gap-2 p-1">
														<span class="text-xs text-[var(--color-primary-900)] font-bold">Selected</span>
														<select
															bind:value={assignedModuleType}
															class="text-xs border-2 border-[var(--color-primary-500)] rounded-md px-2 py-2 w-full bg-[var(--color-surface-50-950)] shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] font-medium cursor-pointer text-[var(--color-surface-950-50)]"
															on:change={(e) => {
																e.stopPropagation();
																const v = (e.currentTarget as HTMLSelectElement).value;
																logger.debug('[Overrides] Dropdown changed:', { value: v, assignedModuleType });
																if (v) {
																	handleAssignToSelected(v);
																}
															}}
															on:click={(e) => e.stopPropagation()}
															on:mousedown={(e) => e.stopPropagation()}
														>
															<option value="">Assign module...</option>
															{#each getAvailableModulesForPageType(editingPageType) as m}
																<option value={m.type}>{m.label}</option>
															{/each}
														</select>
														{#if selectedCount > 1}
															<span class="text-xs text-[var(--color-primary-800)] mt-0.5 font-semibold">
																{selectedCount} cells → 1 module
																{#if selectionBounds && (selectionBounds.rowSpan > 1 || selectionBounds.colSpan > 1)}
																	({selectionBounds.rowSpan}×{selectionBounds.colSpan})
																{/if}
															</span>
														{/if}
													</div>
												{:else}
													<div
														role="button"
														tabindex="0"
														class="flex-1 flex items-center justify-center"
														on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCell(row, col); } }}
													>
														<span class="text-xs text-[var(--color-surface-600-400)] font-medium">Click to select</span>
													</div>
												{/if}
											</div>
										{/if}
									{/each}
								{/each}
							</div>

							<!-- Selection toolbar (like page builder) -->
							<div class="flex flex-wrap items-center gap-3 border-t border-surface-200-800 pt-4 mt-4">
								<button
									type="button"
									on:click={selectAllEmptyCells}
									class="text-sm text-[var(--color-surface-600-400)] hover:text-[var(--color-surface-950-50)]"
								>
									Select all
								</button>
								{#if selectedCount > 0}
									<span class="text-sm text-[var(--color-surface-600-400)]">
										{selectedCount} cell{selectedCount !== 1 ? 's' : ''} → 1 module
										{#if selectionBounds && (selectionBounds.rowSpan > 1 || selectionBounds.colSpan > 1)}
											({selectionBounds.rowSpan}×{selectionBounds.colSpan})
										{/if}
									</span>
									<select
										bind:value={assignedModuleType}
										class="text-sm border border-surface-300-700 rounded px-3 py-1.5"
									>
										<option value="">Choose module...</option>
										{#each getAvailableModulesForPageType(editingPageType) as m}
											<option value={m.type}>{m.label}</option>
										{/each}
									</select>
									<button
										type="button"
										on:click={() => handleAssignToSelected()}
										disabled={!assignedModuleType}
										class="px-3 py-1.5 text-sm font-medium bg-[var(--color-primary-600)] text-white rounded hover:bg-[var(--color-primary-700)] disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Assign
									</button>
									<button
										type="button"
										on:click={clearSelection}
										class="text-sm text-[var(--color-surface-600-400)] hover:text-[var(--color-surface-950-50)]"
									>
										Clear selection
									</button>
								{/if}
							</div>
						</div>
						{/key}
						{/key}
							</div>
						</div>
					</div>
				{/if}
					</div>
			{/if}
		</div>
	</div>
</div>

{#if showThemePreviewModal && activeTemplate}
	<div
		class="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 pointer-events-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="theme-preview-modal-title"
	>
		<button
			type="button"
			class="absolute inset-0 w-full h-full bg-black/50 border-0 p-0 cursor-pointer"
			aria-label={$t('admin.close')}
			on:click={() => (showThemePreviewModal = false)}
		></button>
		<div
			class="relative flex flex-col w-full max-w-[min(100vw-1.5rem,1400px)] max-h-[min(92vh,56rem)] card preset-outlined-surface-200-800 bg-surface-50-950 shadow-2xl overflow-hidden pointer-events-auto"
			on:click|stopPropagation
			role="document"
		>
			<div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-surface-200-800 bg-[var(--color-surface-50-950)] shrink-0">
				<h2 id="theme-preview-modal-title" class="text-lg font-semibold text-[var(--color-surface-950-50)]">
					{$t('admin.themePreviewModalTitle')}
				</h2>
				<button
					type="button"
					on:click={() => (showThemePreviewModal = false)}
					class="ml-auto px-3 py-1.5 text-sm font-medium text-[var(--color-surface-800-200)] border border-surface-300-700 rounded-md bg-[var(--color-surface-50-950)] hover:bg-[var(--color-surface-50-950)]"
				>
					{$t('admin.close')}
				</button>
			</div>
			<div
				class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 border-b border-surface-100-900 bg-[var(--color-surface-50-950)] text-sm shrink-0"
			>
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-[var(--color-surface-600-400)] font-medium shrink-0">{$t('admin.previewDeviceLabel')}</span>
					<div class="flex flex-wrap gap-1.5">
						{#each PREVIEW_DEVICE_ORDER as devId}
							<button
								type="button"
								on:click={() => (previewDeviceId = devId)}
								class="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors {previewDeviceId === devId
									? 'bg-indigo-600 text-white border-indigo-600'
									: 'bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-300-700 hover:bg-[var(--color-surface-50-950)]'}"
							>
								{previewDeviceLabels[devId]}
								<span class="opacity-80 font-normal">·{PREVIEW_DEVICE_WIDTH_PX[devId]}px</span>
							</button>
						{/each}
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-[var(--color-surface-600-400)] font-medium shrink-0">{$t('admin.previewPageLabel')}</span>
					<div class="flex flex-wrap gap-1">
						{#each ['home', 'gallery', 'album', 'search'] as p}
							{@const pageKey = p as typeof previewPageType}
							<button
								type="button"
								on:click={() => (previewPageType = pageKey)}
								class="px-2 py-1 text-xs rounded border transition-colors {previewPageType === pageKey
									? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]'
									: 'bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-200-800 hover:bg-[var(--color-surface-100-900)]'}"
							>
								{pageKey.charAt(0).toUpperCase() + pageKey.slice(1)}
							</button>
						{/each}
					</div>
				</div>
			</div>
			<p class="px-4 py-2 text-xs text-[var(--color-surface-600-400)] border-b border-surface-100-900 shrink-0 bg-slate-50/80">
				{$t('admin.previewModalHint')}
			</p>
			<div class="flex-1 min-h-0 overflow-auto bg-slate-200/80 p-4">
				<div class="flex justify-center">
					<div
						class="bg-[var(--color-surface-50-950)] shadow-lg rounded-lg border border-surface-300-700 overflow-hidden transition-[max-width] duration-200 ease-out w-full"
						style="max-width: {PREVIEW_DEVICE_WIDTH_PX[previewDeviceId]}px;"
					>
						{#if previewTokens}
							<ThemeBuilderPreview
								tokens={previewTokens}
								pageType={previewPageType}
								pageModules={getModulesForPageType(previewPageType, previewModalBreakpoint)}
								pageLayout={getGridForPageType(previewPageType, previewModalBreakpoint)}
								layoutPresets={previewLayoutPresets}
							/>
						{:else}
							<div class="h-64 flex items-center justify-center text-[var(--color-surface-600-400)] text-sm">
								Loading…
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Module Modal -->
{#if editingModule}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-module-title">
		<div
			class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-h-[90vh] overflow-y-auto {editingModule.type === 'layoutShell'
				? 'max-w-2xl'
				: 'max-w-md'}"
		>
			<div class="sticky top-0 bg-[var(--color-surface-50-950)] border-b border-surface-200-800 px-6 py-4 flex items-center justify-between">
				<h2 id="edit-module-title" class="text-lg font-semibold text-[var(--color-surface-950-50)]">
					Edit {getModuleLabel(editingModule.type)}
				</h2>
				<button
					type="button"
					on:click={() => editingModule = null}
					class="text-[var(--color-surface-400-600)] hover:text-[var(--color-surface-600-400)]"
					aria-label="Close"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="p-6 space-y-4">
				<div>
					<p class="text-sm text-[var(--color-surface-600-400)] mb-4">
						Module: <span class="font-medium text-[var(--color-surface-950-50)]">{editingModule.type === 'albumGallery' ? 'albumView' : editingModule.type}</span>
						<br />
						Position: Row {editingModule.rowOrder + 1}, Col {editingModule.columnIndex + 1}
						{#if (editingModule.rowSpan ?? 1) > 1 || (editingModule.colSpan ?? 1) > 1}
							<br />
							Span: {(editingModule.rowSpan ?? 1)}×{(editingModule.colSpan ?? 1)}
						{/if}
					</p>
				</div>

				<ModuleCellPlacementControls bind:editingModule />

				{#if layoutShellPresetKeyError && editingModule.type !== 'layoutShell'}
					<p class="text-sm text-red-600" role="alert">{layoutShellPresetKeyError}</p>
				{/if}

				{#if editingModule.type === 'layoutShell'}
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<p class="text-sm text-[var(--color-surface-600-400)]">
							A <strong>preset name</strong> is shared storage: several layout regions can use the same name to reuse one grid
							definition.
						</p>
						<div>
							<label class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-1" for="layout-shell-preset-key">
								Preset name
							</label>
							<input
								id="layout-shell-preset-key"
								type="text"
								class={ADMIN_TEXT_INPUT_CLASS}
								value={editingModule.props?.presetKey ?? ''}
								placeholder="e.g. site_header"
								on:input={(e) => {
									const v = (e.currentTarget as HTMLInputElement).value;
									editingModule = { ...editingModule, props: { ...editingModule.props, presetKey: v } };
									layoutShellUseExistingSelection = false;
									layoutShellPresetKeyError = '';
									layoutShellPresetDeleteInfo = '';
								}}
							/>
							{#if layoutShellPresetKeyError}
								<p class="mt-1 text-xs text-red-600">{layoutShellPresetKeyError}</p>
							{/if}
						</div>
						<div>
							<label class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-1" for="layout-shell-reuse">
								Reuse existing preset
							</label>
							<select
								id="layout-shell-reuse"
								class="{ADMIN_SELECT_CLASS} w-full"
								bind:value={layoutShellReusePick}
								on:change={() => {
									if (!layoutShellReusePick) return;
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, presetKey: layoutShellReusePick }
									};
									layoutShellOriginalPresetKey = layoutShellReusePick;
									layoutShellUseExistingSelection = true;
									layoutShellPresetKeyError = '';
									layoutShellPresetDeleteInfo = '';
									layoutShellReusePick = '';
								}}
							>
								<option value="">— Pick a saved name —</option>
								{#each Object.keys(localOverrides.layoutPresets || {}).sort() as rk}
									<option value={rk}>{rk}</option>
								{/each}
							</select>
						</div>
						<div class="rounded-md border border-surface-200-800 p-3 space-y-2">
							<div class="flex flex-wrap gap-2">
								<button
									type="button"
									class="px-3 py-1.5 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
									disabled={!layoutShellActivePresetExists || layoutShellCurrentPresetUsage.length > 0}
									on:click={() => {
										if (!layoutShellActivePresetKey) return;
										if (!confirm(`Delete preset "${layoutShellActivePresetKey}"? This cannot be undone before save.`)) return;
										deleteLayoutPresetIfUnused(layoutShellActivePresetKey);
									}}
								>
									Delete preset
								</button>
								<button
									type="button"
									class="px-3 py-1.5 text-xs rounded border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
									disabled={layoutShellUnusedPresetKeys.length === 0}
									on:click={() => {
										if (!confirm(`Delete all unused presets (${layoutShellUnusedPresetKeys.length})?`)) return;
										deleteAllUnusedLayoutPresets();
									}}
								>
									Delete all unused presets ({layoutShellUnusedPresetKeys.length})
								</button>
							</div>
							{#if layoutShellActivePresetExists}
								{#if layoutShellCurrentPresetUsage.length > 0}
									<p class="text-xs text-amber-700 dark:text-amber-400/90">
										Cannot delete "{layoutShellActivePresetKey}" yet — it is used in:
									</p>
									<ul class="list-disc pl-5 text-xs text-[var(--color-surface-700-300)] space-y-1">
										{#each layoutShellCurrentPresetUsage as u}
											<li>
												{u.pageType} / {u.breakpoint} (row {u.rowOrder + 1}, col {u.columnIndex + 1})
											</li>
										{/each}
									</ul>
								{:else}
									<p class="text-xs text-emerald-700 dark:text-emerald-400/90">
										"{layoutShellActivePresetKey}" is unused and can be deleted safely.
									</p>
								{/if}
							{/if}
							{#if layoutShellPresetDeleteInfo}
								<p class="text-xs text-[var(--color-surface-700-300)]">{layoutShellPresetDeleteInfo}</p>
							{/if}
						</div>
						{#key (editingModule.props?.presetKey ?? '') + ':' + (layoutShellEditingDisplayKey ?? '') + ':' + layoutShellEditingModules.length}
							{@const pk = (editingModule.props?.presetKey ?? '').trim()}
							{@const shell = layoutShellEditingShell}
							{#if pk}
								<div class="grid grid-cols-2 gap-3">
									<label class="block text-sm">
										<span class="font-medium text-[var(--color-surface-800-200)]">Rows</span>
										<input
											type="number"
											min="1"
											max="12"
											class={`mt-1 ${ADMIN_TEXT_INPUT_CLASS}`}
											value={shell?.gridRows ?? 1}
											on:input={(e) => {
												const gr = parseInt((e.currentTarget as HTMLInputElement).value, 10);
												updateLayoutShellPresetGrid(pk, gr, shell?.gridColumns ?? 1);
											}}
										/>
									</label>
									<label class="block text-sm">
										<span class="font-medium text-[var(--color-surface-800-200)]">Columns</span>
										<input
											type="number"
											min="1"
											max="12"
											class={`mt-1 ${ADMIN_TEXT_INPUT_CLASS}`}
											value={shell?.gridColumns ?? 1}
											on:input={(e) => {
												const gc = parseInt((e.currentTarget as HTMLInputElement).value, 10);
												updateLayoutShellPresetGrid(pk, shell?.gridRows ?? 1, gc);
											}}
										/>
									</label>
								</div>
								<div class="rounded-md border border-surface-200-800 p-3 space-y-2">
									<div class="text-sm font-semibold text-[var(--color-surface-950-50)]">Row order</div>
									<p class="text-xs text-[var(--color-surface-600-400)]">
										Move rows up/down or insert a new row above/below — existing inner modules shift with the rows.
									</p>
									{#each Array(shell?.gridRows ?? 1) as _, rIdx (rIdx)}
										<div class="flex items-center justify-between gap-2 py-1 border-b border-surface-100-900 last:border-0">
											<div class="text-sm text-[var(--color-surface-800-200)]">
												Row {rIdx + 1}
											</div>
											<div class="flex flex-wrap gap-1">
												<button
													type="button"
													class="px-2 py-1 text-xs rounded border bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-200-800 hover:bg-[var(--color-surface-100-900)] disabled:opacity-50"
													disabled={rIdx === 0}
													on:click={() => moveLayoutPresetRow(pk, rIdx, rIdx - 1)}
												>
													Up
												</button>
												<button
													type="button"
													class="px-2 py-1 text-xs rounded border bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-200-800 hover:bg-[var(--color-surface-100-900)] disabled:opacity-50"
													disabled={rIdx >= (shell?.gridRows ?? 1) - 1}
													on:click={() => moveLayoutPresetRow(pk, rIdx, rIdx + 1)}
												>
													Down
												</button>
												<button
													type="button"
													class="px-2 py-1 text-xs rounded border bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-200-800 hover:bg-[var(--color-surface-100-900)] disabled:opacity-50"
													disabled={(shell?.gridRows ?? 1) >= 12}
													on:click={() => insertLayoutPresetRow(pk, rIdx)}
												>
													Insert above
												</button>
												<button
													type="button"
													class="px-2 py-1 text-xs rounded border bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border-surface-200-800 hover:bg-[var(--color-surface-100-900)] disabled:opacity-50"
													disabled={(shell?.gridRows ?? 1) >= 12}
													on:click={() => insertLayoutPresetRow(pk, rIdx + 1)}
												>
													Insert below
												</button>
											</div>
										</div>
									{/each}
								</div>
								{#if !shell}
									<p class="text-xs text-amber-700 dark:text-amber-400/90">
										No data for this name yet — change rows or columns to create the preset.
									</p>
								{/if}
								<div class="rounded-md border border-surface-200-800 p-3 space-y-2">
									<div class="text-sm font-semibold text-[var(--color-surface-950-50)]">Inner modules</div>
									<p class="text-xs text-[var(--color-surface-600-400)]">
										Select empty cells, then assign a module. (Spans work like the page grid.)
									</p>

									<div
										class="gap-2 border-2 border-surface-300-700 p-2 bg-[var(--color-surface-50-950)] select-none rounded-lg"
										style="display: grid; grid-template-columns: repeat({shell?.gridColumns ?? 1}, 1fr); grid-template-rows: repeat({shell?.gridRows ?? 1}, minmax(60px, auto));"
									>
										{#each layoutShellEditingModules as mod, idx (mod._id || idx)}
											{@const r = mod.rowOrder ?? 0}
											{@const c = mod.columnIndex ?? 0}
											{@const rs = mod.rowSpan ?? 1}
											{@const cs = mod.colSpan ?? 1}
											<div
												class="border border-green-300 rounded-lg p-2 bg-green-50/50"
												style="grid-column: {c + 1} / span {cs}; grid-row: {r + 1} / span {rs}"
											>
												<div class="flex flex-col h-full">
													<p class="text-xs font-medium text-[var(--color-surface-950-50)]">{mod.type}</p>
													{#if rs > 1 || cs > 1}
														<p class="text-[10px] text-[var(--color-surface-600-400)] mt-0.5">{rs}×{cs} span</p>
													{/if}
													<div class="flex gap-2 mt-2">
														<button
															type="button"
															class="text-[10px] text-[var(--color-primary-600)] hover:text-[var(--color-primary-800)] font-medium"
															on:click|stopPropagation={() => {
																const cloned = JSON.parse(JSON.stringify(mod)) as Record<
																	string,
																	unknown
																>;
																cloned[PB_PRESET_KEY] = pk;
																cloned[PB_MODULE_INDEX] = idx;
																editingModule = cloned;
																editingInnerLayoutPresetKey = pk;
																editingInnerLayoutModuleIndex = idx;
																layoutShellPresetKeyError = '';
															}}
														>
															Edit
														</button>
														<button
															type="button"
															class="text-[10px] text-red-600 hover:text-red-800 font-medium"
															on:click|stopPropagation={() => removeModuleFromLayoutPreset(pk, idx)}
														>
															Remove
														</button>
													</div>
												</div>
											</div>
										{/each}

										{#each Array(shell?.gridRows ?? 1) as _, rowIndex (rowIndex)}
											{#each Array(shell?.gridColumns ?? 1) as _, colIndex (colIndex)}
												{@const row = rowIndex}
												{@const col = colIndex}
												{@const covered = innerIsCellCoveredFrom(layoutShellEditingModules, row, col)}
												{@const m = innerGetModuleAtCellFrom(layoutShellEditingModules, row, col)}
												{@const key = layoutShellInnerCellKey(row, col)}
												{@const selected = layoutShellInnerSelectedCells.has(key)}
												{#if covered}
													<!-- Covered by module span -->
												{:else if !m}
													<div
														class="border rounded-lg p-2 min-h-[60px] transition-colors flex flex-col
															{selected
																? 'ring-2 ring-[var(--color-primary-500)] bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] border-[color-mix(in_oklab,var(--color-primary-500)_30%,transparent)]'
																: 'border-surface-300-700 bg-[var(--color-surface-50-950)] hover:bg-[var(--color-surface-50-950)] cursor-pointer'}"
														style="grid-column: {col + 1}; grid-row: {row + 1}"
														on:click|stopPropagation={() => innerToggleCell(pk, row, col)}
													>
														<div class="text-[10px] text-[var(--color-surface-600-400)]">
															Row {row + 1}, Col {col + 1}
														</div>
													</div>
												{/if}
											{/each}
										{/each}
									</div>

									<div class="flex flex-wrap items-end gap-2 pt-2">
										<label class="text-xs shrink-0">
											<span class="block opacity-80 mb-1">Assign module</span>
											<select class={ADMIN_SELECT_SM_CLASS} bind:value={layoutShellInnerAssignedModuleType}>
												<option value="">— Select —</option>
												{#each LAYOUT_SHELL_INNER_MODULE_TYPES as opt}
													<option value={opt.type}>{opt.label}</option>
												{/each}
											</select>
										</label>
										<button
											type="button"
											class="mt-5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] disabled:opacity-50"
											disabled={!layoutShellInnerSelectionBounds || !layoutShellInnerAssignedModuleType}
											on:click={() => {
												if (!layoutShellInnerSelectionBounds) return;
												if (!layoutShellInnerAssignedModuleType) return;
												addModuleToLayoutPreset(
													pk,
													layoutShellInnerAssignedModuleType,
													layoutShellInnerSelectionBounds.rowOrder,
													layoutShellInnerSelectionBounds.columnIndex,
													layoutShellInnerSelectionBounds.rowSpan,
													layoutShellInnerSelectionBounds.colSpan
												);
												clearLayoutShellInnerSelection();
											}}
										>
											Assign to selected
										</button>
										<button
											type="button"
											class="mt-5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--color-surface-50-950)] text-[var(--color-surface-800-200)] border border-surface-200-800 hover:bg-[var(--color-surface-100-900)]"
											on:click={() => clearLayoutShellInnerSelection()}
										>
											Clear selection
										</button>
									</div>
								</div>
							{:else}
								<p class="text-xs text-[var(--color-surface-600-400)]">Enter a preset name to configure the inner grid.</p>
							{/if}
						{/key}
					</div>
				{/if}

				{#if editingModule.type === 'albumsGrid' || editingModule.type === 'albumView' || editingModule.type === 'albumGallery'}
					<div class="space-y-4">
						<div>
							<label for="edit-album-source" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Albums source
							</label>
							<select
								id="edit-album-source"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.albumSource ?? 'root'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, albumSource: (e.currentTarget as HTMLSelectElement).value }
									};
								}}
							>
								<option value="root">Root albums only</option>
								<option value="featured">Featured albums (all levels)</option>
								<option value="selected">Specific albums</option>
								<option value="current">Current album (from URL)</option>
							</select>
							{#if editingModule.props?.albumSource === 'selected'}
								<p class="mt-2 text-sm text-[var(--color-surface-600-400)]">Album picker for specific albums coming soon.</p>
							{/if}
							{#if editingModule.props?.albumSource === 'current'}
								<p class="mt-2 text-xs text-[var(--color-surface-600-400)]">
									For Album view, this source can render sub-albums, photos, or both from the current album (URL alias).
								</p>
							{/if}
						</div>

						{#if editingModule.type === 'albumView' || editingModule.type === 'albumGallery'}
							<div class="rounded-md border border-surface-200-800 bg-[var(--color-surface-50-950)] p-4 space-y-3">
								<div class="text-sm font-semibold text-[var(--color-surface-950-50)]">Album header (current album)</div>
								<p class="text-xs text-[var(--color-surface-600-400)]">
									Shown when Albums source is <span class="font-medium">Current album (from URL)</span>.
								</p>

								<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
									<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
										<input
											type="checkbox"
											checked={editingModule.props?.showAlbumPageTitle !== false}
											on:change={(e) => {
												editingModule = {
													...editingModule,
													props: { ...editingModule.props, showAlbumPageTitle: (e.currentTarget as HTMLInputElement).checked }
												};
											}}
										/>
										Title
									</label>
									<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
										<input
											type="checkbox"
											checked={editingModule.props?.showAlbumPageDescription !== false}
											on:change={(e) => {
												editingModule = {
													...editingModule,
													props: { ...editingModule.props, showAlbumPageDescription: (e.currentTarget as HTMLInputElement).checked }
												};
											}}
										/>
										Description
									</label>
									<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
										<input
											type="checkbox"
											checked={editingModule.props?.showAlbumPageStats !== false}
											on:change={(e) => {
												editingModule = {
													...editingModule,
													props: { ...editingModule.props, showAlbumPageStats: (e.currentTarget as HTMLInputElement).checked }
												};
											}}
										/>
										Stats (counts)
									</label>
								</div>

								<div>
									<label class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">Album header order (drag to reorder)</label>
									<div class="space-y-2">
										{#each (Array.isArray(editingModule.props?.albumHeaderFieldOrder)
											? editingModule.props.albumHeaderFieldOrder
											: ['albumTitle', 'albumDescription', 'albumStats']) as fieldKey, idx (fieldKey)}
											<div
												class="flex items-center justify-between px-3 py-2 border border-surface-300-700 rounded-md bg-[var(--color-surface-50-950)] cursor-move"
												draggable="true"
												on:dragstart={(e) => {
													draggedAlbumHeaderField = fieldKey;
													e.dataTransfer?.setData('text/plain', fieldKey);
													e.dataTransfer!.effectAllowed = 'move';
												}}
												on:dragend={() => {
													draggedAlbumHeaderField = null;
												}}
												on:dragover={(e) => e.preventDefault()}
												on:drop={(e) => {
													e.preventDefault();
													const fromKey =
														e.dataTransfer?.getData('text/plain') || draggedAlbumHeaderField || null;
													if (!fromKey || fromKey === fieldKey) return;
													const current = Array.isArray(editingModule.props?.albumHeaderFieldOrder)
														? [...editingModule.props.albumHeaderFieldOrder]
														: ['albumTitle', 'albumDescription', 'albumStats'];
													const from = current.indexOf(fromKey);
													const to = current.indexOf(fieldKey);
													if (from < 0 || to < 0) return;
													const [moved] = current.splice(from, 1);
													const adjustedTo = from < to ? to - 1 : to;
													current.splice(adjustedTo, 0, moved);
													editingModule = {
														...editingModule,
														props: { ...editingModule.props, albumHeaderFieldOrder: current }
													};
													draggedAlbumHeaderField = null;
												}}
											>
												<span class="text-sm text-[var(--color-surface-900-100)]">
													{fieldKey === 'albumTitle' ? 'Title' :
													 fieldKey === 'albumDescription' ? 'Description' :
													 'Stats (counts)'}
												</span>
												<span class="text-xs text-[var(--color-surface-400-600)]">#{idx + 1}</span>
											</div>
										{/each}
									</div>
								</div>
							</div>

						{/if}

						{#if editingModule.type === 'albumView' || editingModule.type === 'albumGallery'}
							<div>
								<label for="edit-card-data-type" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">Card data type</label>
								<select
									id="edit-card-data-type"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
									value={editingModule.props?.cardDataType ?? 'both'}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, cardDataType: (e.currentTarget as HTMLSelectElement).value }
										};
									}}
								>
									<option value="subAlbums">Sub-albums cards</option>
									<option value="photos">Photo cards</option>
									<option value="both">Sub-albums + photos</option>
								</select>
							</div>
							{#if (editingModule.props?.cardDataType ?? 'both') === 'both'}
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label for="edit-mixed-display-mode" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">Mixed display mode</label>
										<select
											id="edit-mixed-display-mode"
											class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
											value={editingModule.props?.mixedDisplayMode ?? 'grouped'}
											on:change={(e) => {
												editingModule = {
													...editingModule,
													props: { ...editingModule.props, mixedDisplayMode: (e.currentTarget as HTMLSelectElement).value }
												};
											}}
										>
											<option value="grouped">Grouped (sub-albums, then photos)</option>
											<option value="interleaved">Interleaved (single ordered stream)</option>
										</select>
									</div>
									<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)] mt-8">
										<input
											type="checkbox"
											checked={editingModule.props?.showSectionLabels !== false}
											on:change={(e) => {
												editingModule = {
													...editingModule,
													props: { ...editingModule.props, showSectionLabels: (e.currentTarget as HTMLInputElement).checked }
												};
											}}
										/>
										Show section labels
									</label>
								</div>
							{/if}
						{/if}

						{#if editingModule.type === 'albumView' || editingModule.type === 'albumGallery'}
							<div class="space-y-3">
								<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
									<input
										type="checkbox"
										checked={editingModule.props?.showCover !== false}
										on:change={(e) => {
											editingModule = {
												...editingModule,
												props: { ...editingModule.props, showCover: (e.currentTarget as HTMLInputElement).checked }
											};
										}}
									/>
									Show image (both)
								</label>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div class="rounded-md border border-surface-200-800 bg-[var(--color-surface-50-950)] p-3">
										<div class="text-sm font-semibold text-[var(--color-surface-950-50)] mb-2">Sub-album card</div>
										<div class="space-y-2">
											<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
												<input
													type="checkbox"
													checked={editingModule.props?.showAlbumTitle ?? true}
													on:change={(e) => {
														editingModule = {
															...editingModule,
															props: { ...editingModule.props, showAlbumTitle: (e.currentTarget as HTMLInputElement).checked }
														};
													}}
												/>
												Title
											</label>
											<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
												<input
													type="checkbox"
													checked={editingModule.props?.showAlbumDescription ?? true}
													on:change={(e) => {
														editingModule = {
															...editingModule,
															props: { ...editingModule.props, showAlbumDescription: (e.currentTarget as HTMLInputElement).checked }
														};
													}}
												/>
												Description
											</label>
											<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
												<input
													type="checkbox"
													checked={editingModule.props?.showPhotoCount !== false}
													on:change={(e) => {
														editingModule = {
															...editingModule,
															props: { ...editingModule.props, showPhotoCount: (e.currentTarget as HTMLInputElement).checked }
														};
													}}
												/>
												Photo count
											</label>
											<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
												<input
													type="checkbox"
													checked={editingModule.props?.showAlbumFeaturedBadge ?? true}
													on:change={(e) => {
														editingModule = {
															...editingModule,
															props: { ...editingModule.props, showAlbumFeaturedBadge: (e.currentTarget as HTMLInputElement).checked }
														};
													}}
												/>
												Featured badge
											</label>
										</div>
									</div>

									<div class="rounded-md border border-surface-200-800 bg-[var(--color-surface-50-950)] p-3">
										<div class="text-sm font-semibold text-[var(--color-surface-950-50)] mb-2">Photo card</div>
										<div class="space-y-2">
											<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
												<input
													type="checkbox"
													checked={editingModule.props?.showPhotoTitle ?? true}
													on:change={(e) => {
														editingModule = {
															...editingModule,
															props: { ...editingModule.props, showPhotoTitle: (e.currentTarget as HTMLInputElement).checked }
														};
													}}
												/>
												Title
											</label>
											<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
												<input
													type="checkbox"
													checked={editingModule.props?.showPhotoDescription ?? true}
													on:change={(e) => {
														editingModule = {
															...editingModule,
															props: { ...editingModule.props, showPhotoDescription: (e.currentTarget as HTMLInputElement).checked }
														};
													}}
												/>
												Description
											</label>
											<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
												<input
													type="checkbox"
													checked={editingModule.props?.showPhotoFeaturedBadge ?? true}
													on:change={(e) => {
														editingModule = {
															...editingModule,
															props: { ...editingModule.props, showPhotoFeaturedBadge: (e.currentTarget as HTMLInputElement).checked }
														};
													}}
												/>
												Featured badge
											</label>
										</div>
									</div>
								</div>
							</div>
						{:else}
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
									<input
										type="checkbox"
										checked={editingModule.props?.showCover !== false}
										on:change={(e) => {
											editingModule = {
												...editingModule,
												props: { ...editingModule.props, showCover: (e.currentTarget as HTMLInputElement).checked }
											};
										}}
									/>
									Show cover image
								</label>
								<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
									<input
										type="checkbox"
										checked={editingModule.props?.showDescription !== false}
										on:change={(e) => {
											editingModule = {
												...editingModule,
												props: { ...editingModule.props, showDescription: (e.currentTarget as HTMLInputElement).checked }
											};
										}}
									/>
									Show description
								</label>
								<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
									<input
										type="checkbox"
										checked={editingModule.props?.showPhotoCount !== false}
										on:change={(e) => {
											editingModule = {
												...editingModule,
												props: { ...editingModule.props, showPhotoCount: (e.currentTarget as HTMLInputElement).checked }
											};
										}}
									/>
									Show photo count
								</label>
								<label class="flex items-center gap-2 text-sm text-[var(--color-surface-800-200)]">
									<input
										type="checkbox"
										checked={editingModule.props?.showFeaturedBadge !== false}
										on:change={(e) => {
											editingModule = {
												...editingModule,
												props: { ...editingModule.props, showFeaturedBadge: (e.currentTarget as HTMLInputElement).checked }
											};
										}}
									/>
									Show featured badge
								</label>
							</div>
						{/if}

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="edit-cover-aspect" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">Cover aspect</label>
								<select
									id="edit-cover-aspect"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
									value={editingModule.props?.coverAspect ?? 'video'}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, coverAspect: (e.currentTarget as HTMLSelectElement).value }
										};
									}}
								>
									<option value="video">Video (16:9)</option>
									<option value="square">Square (1:1)</option>
									<option value="portrait">Portrait (3:4)</option>
								</select>
							</div>

							<div>
								<label for="edit-description-lines" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">Description lines</label>
								<input
									id="edit-description-lines"
									type="number"
									min="1"
									max="6"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
									value={String(editingModule.props?.descriptionLines ?? 2)}
									on:input={(e) => {
										const parsed = Math.max(1, Math.min(6, Number((e.currentTarget as HTMLInputElement).value) || 2));
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, descriptionLines: parsed }
										};
									}}
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">Album card content order (drag to reorder)</label>
								<div class="space-y-2">
									{#each (Array.isArray(editingModule.props?.albumCardFieldOrder)
										? editingModule.props.albumCardFieldOrder
										: Array.isArray(editingModule.props?.cardFieldOrder)
											? editingModule.props.cardFieldOrder
										: ['cover', 'title', 'description', 'photoCount', 'featuredBadge']) as fieldKey, idx (fieldKey)}
										<div
											class="flex items-center justify-between px-3 py-2 border border-surface-300-700 rounded-md bg-[var(--color-surface-50-950)] cursor-move"
											draggable="true"
											on:dragstart={() => {
												draggedAlbumField = fieldKey;
											}}
											on:dragover={(e) => e.preventDefault()}
											on:drop={(e) => {
												e.preventDefault();
												if (!draggedAlbumField || draggedAlbumField === fieldKey) return;
												const current = Array.isArray(editingModule.props?.albumCardFieldOrder)
													? [...editingModule.props.albumCardFieldOrder]
													: Array.isArray(editingModule.props?.cardFieldOrder)
														? [...editingModule.props.cardFieldOrder]
													: ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
												const from = current.indexOf(draggedAlbumField);
												const to = current.indexOf(fieldKey);
												if (from < 0 || to < 0) return;
												const [moved] = current.splice(from, 1);
												current.splice(to, 0, moved);
												editingModule = {
													...editingModule,
													props: { ...editingModule.props, albumCardFieldOrder: current }
												};
												draggedAlbumField = null;
											}}
										>
											<span class="text-sm text-[var(--color-surface-900-100)]">
												{fieldKey === 'title' ? 'Title' :
												 fieldKey === 'cover' ? 'Leading photo' :
												 fieldKey === 'description' ? 'Description' :
												 fieldKey === 'photoCount' ? 'Photo count' :
												 'Featured badge'}
											</span>
											<span class="text-xs text-[var(--color-surface-400-600)]">#{idx + 1}</span>
										</div>
									{/each}
								</div>
							</div>
							{#if editingModule.type === 'albumView' || editingModule.type === 'albumGallery'}
								<div>
									<label class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">Photo card content order (drag to reorder)</label>
									<div class="space-y-2">
										{#each (Array.isArray(editingModule.props?.photoCardFieldOrder)
											? editingModule.props.photoCardFieldOrder
											: ['cover', 'title', 'description', 'featuredBadge']) as fieldKey, idx (fieldKey)}
											<div
												class="flex items-center justify-between px-3 py-2 border border-surface-300-700 rounded-md bg-[var(--color-surface-50-950)] cursor-move"
												draggable="true"
										on:dragstart={(e) => {
											draggedPhotoField = fieldKey;
											e.dataTransfer?.setData('text/plain', fieldKey);
											e.dataTransfer!.effectAllowed = 'move';
										}}
										on:dragend={() => {
											draggedPhotoField = null;
										}}
												on:dragover={(e) => e.preventDefault()}
												on:drop={(e) => {
													e.preventDefault();
											const fromKey =
												e.dataTransfer?.getData('text/plain') || draggedPhotoField || null;
											if (!fromKey || fromKey === fieldKey) return;
													const current = Array.isArray(editingModule.props?.photoCardFieldOrder)
														? [...editingModule.props.photoCardFieldOrder]
														: ['cover', 'title', 'description', 'featuredBadge'];
											const from = current.indexOf(fromKey);
													const to = current.indexOf(fieldKey);
													if (from < 0 || to < 0) return;
													const [moved] = current.splice(from, 1);
											const adjustedTo = from < to ? to - 1 : to;
											current.splice(adjustedTo, 0, moved);
													editingModule = {
														...editingModule,
														props: { ...editingModule.props, photoCardFieldOrder: current }
													};
											draggedPhotoField = null;
												}}
											>
												<span class="text-sm text-[var(--color-surface-900-100)]">
													{fieldKey === 'title' ? 'Title' :
													 fieldKey === 'cover' ? 'Photo' :
													 fieldKey === 'description' ? 'Description' :
													 'Featured badge'}
												</span>
												<span class="text-xs text-[var(--color-surface-400-600)]">#{idx + 1}</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<div>
								<label for="edit-sort-by" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">Sort by</label>
								<select
									id="edit-sort-by"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
									value={editingModule.props?.sortBy ?? 'manual'}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, sortBy: (e.currentTarget as HTMLSelectElement).value }
										};
									}}
								>
									<option value="manual">Manual/source order</option>
									<option value="order">Album order</option>
									<option value="name">Name</option>
									<option value="photoCount">Photo count</option>
									<option value="createdAt">Created date</option>
									<option value="lastPhotoDate">Last photo date</option>
								</select>
							</div>

							<div>
								<label for="edit-sort-direction" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">Sort direction</label>
								<select
									id="edit-sort-direction"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
									value={editingModule.props?.sortDirection ?? 'asc'}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, sortDirection: (e.currentTarget as HTMLSelectElement).value }
										};
									}}
								>
									<option value="asc">Ascending</option>
									<option value="desc">Descending</option>
								</select>
							</div>
						</div>

						<div>
							<label for="edit-limit" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">Maximum items</label>
							<input
								id="edit-limit"
								type="number"
								min="1"
								max="60"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={String(editingModule.props?.limit ?? 12)}
								on:input={(e) => {
									const parsed = Math.max(1, Math.min(60, Number((e.currentTarget as HTMLInputElement).value) || 12));
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, limit: parsed }
									};
								}}
							/>
						</div>
					</div>
				{:else if editingModule.type === 'hero'}
					<div class="space-y-4">
						<div>
							<label for="hero-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							{#if typeof editingModule.props?.title === 'object'}
								<MultiLangInput
									id="hero-title"
									bind:value={editingModule.props.title}
									placeholder="Enter hero title"
									class="w-full"
								/>
							{:else}
								<input
									id="hero-title"
									type="text"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
									value={editingModule.props?.title || ''}
									placeholder="Enter hero title"
									on:input={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, title: (e.currentTarget as HTMLInputElement).value }
										};
									}}
								/>
							{/if}
						</div>

						<div>
							<label for="hero-subtitle" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Subtitle
							</label>
							{#if typeof editingModule.props?.subtitle === 'object'}
								<MultiLangInput
									id="hero-subtitle"
									bind:value={editingModule.props.subtitle}
									placeholder="Enter hero subtitle"
									class="w-full"
								/>
							{:else}
								<input
									id="hero-subtitle"
									type="text"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
									value={editingModule.props?.subtitle || ''}
									placeholder="Enter hero subtitle"
									on:input={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, subtitle: (e.currentTarget as HTMLInputElement).value }
										};
									}}
								/>
							{/if}
						</div>

						<div>
							<label for="hero-cta-label" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Button Label (CTA)
							</label>
							{#if typeof editingModule.props?.ctaLabel === 'object'}
								<MultiLangInput
									id="hero-cta-label"
									bind:value={editingModule.props.ctaLabel}
									placeholder="Enter button label"
									class="w-full"
								/>
							{:else}
								<input
									id="hero-cta-label"
									type="text"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
									value={editingModule.props?.ctaLabel || ''}
									placeholder="Enter button label"
									on:input={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, ctaLabel: (e.currentTarget as HTMLInputElement).value }
										};
									}}
								/>
							{/if}
						</div>

						<div>
							<label for="hero-cta-url" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Button URL (CTA)
							</label>
							<input
								id="hero-cta-url"
								type="url"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.ctaUrl || ''}
								placeholder="https://example.com"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, ctaUrl: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
						</div>

						<div>
							<label for="hero-background-style" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Background Style
							</label>
							<select
								id="hero-background-style"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.backgroundStyle || 'light'}
								on:change={(e) => {
									const style = (e.currentTarget as HTMLSelectElement).value;
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											backgroundStyle: style,
											...(style !== 'image' ? { backgroundImage: undefined } : {})
										}
									};
								}}
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="image">Image</option>
								<option value="galleryLeading">Gallery Leading</option>
							</select>
						</div>

						{#if editingModule.props?.backgroundStyle === 'image'}
							<div>
								<label for="hero-background-image" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
									Background Image URL
								</label>
								<input
									id="hero-background-image"
									type="url"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
									value={editingModule.props?.backgroundImage || ''}
									placeholder="https://example.com/image.jpg"
									on:input={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, backgroundImage: (e.currentTarget as HTMLInputElement).value }
										};
									}}
								/>
							</div>
							{/if}
					</div>
				{:else if editingModule.type === 'richText'}
					<div class="space-y-4">
						<div>
							<label for="richtext-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							<MultiLangInput
								id="richtext-title"
								bind:value={editingModule.props.title}
								placeholder="Enter title"
								className="w-full"
							/>
						</div>

						<div>
							<label for="richtext-body" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Body Content
							</label>
							<MultiLangHTMLEditor
								id="richtext-body"
								bind:value={editingModule.props.body}
								className="w-full"
							/>
						</div>

						<div>
							<label for="richtext-background" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Background Color
							</label>
							<select
								id="richtext-background"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.background || 'white'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, background: (e.currentTarget as HTMLSelectElement).value as 'white' | 'gray' | 'transparent' }
									};
								}}
							>
								<option value="white">White</option>
								<option value="gray">Gray</option>
								<option value="transparent">Transparent</option>
							</select>
						</div>
					</div>
				{:else if editingModule.type === 'pageTitle'}
					<div class="space-y-4">
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={editingModule.props?.showTitle !== false}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, showTitle: (e.currentTarget as HTMLInputElement).checked }
										};
									}}
								/>
								<span class="text-sm text-[var(--color-surface-800-200)]">Show page title</span>
							</label>
						</div>
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={editingModule.props?.showSubtitle !== false}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, showSubtitle: (e.currentTarget as HTMLInputElement).checked }
										};
									}}
								/>
								<span class="text-sm text-[var(--color-surface-800-200)]">Show page subtitle</span>
							</label>
						</div>
						<div>
							<label for="page-title-align" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Alignment
							</label>
							<select
								id="page-title-align"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.align === 'left' ? 'left' : 'center'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, align: (e.currentTarget as HTMLSelectElement).value }
									};
								}}
							>
								<option value="center">Center</option>
								<option value="left">Left</option>
							</select>
						</div>
					</div>
				{:else if editingModule.type === 'languageSelector'}
					<div class="space-y-4">
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={editingModule.props?.showFlags !== false}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, showFlags: (e.currentTarget as HTMLInputElement).checked }
										};
									}}
									class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
								/>
								<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Show flags</span>
							</label>
						</div>
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={editingModule.props?.showNativeNames !== false}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, showNativeNames: (e.currentTarget as HTMLInputElement).checked }
										};
									}}
									class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
								/>
								<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Show native names</span>
							</label>
						</div>
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={editingModule.props?.compact === true}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, compact: (e.currentTarget as HTMLInputElement).checked }
										};
									}}
									class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
								/>
								<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Compact mode</span>
							</label>
						</div>
						<div>
							<label for="lang-selector-class" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								CSS Classes (optional)
							</label>
							<input
								id="lang-selector-class"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.className || ''}
								placeholder="e.g., ml-4"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, className: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
						</div>
					</div>
				{:else if editingModule.type === 'logo'}
					<div class="space-y-4">
						<div>
							<label for="logo-size" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Size
							</label>
							<select
								id="logo-size"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.size ?? 'md'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, size: (e.currentTarget as HTMLSelectElement).value as 'sm' | 'md' | 'lg' }
									};
								}}
							>
								<option value="sm">Small</option>
								<option value="md">Medium</option>
								<option value="lg">Large</option>
							</select>
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Display size of the logo image</p>
						</div>
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={editingModule.props?.fallbackIcon !== false}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, fallbackIcon: (e.currentTarget as HTMLInputElement).checked }
										};
									}}
									class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
								/>
								<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Show icon when no logo is set</span>
							</label>
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">If site logo is not configured, show a camera icon placeholder</p>
						</div>
					</div>
				{:else if editingModule.type === 'siteTitle'}
					<div class="space-y-4">
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={editingModule.props?.showAsLink !== false}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, showAsLink: (e.currentTarget as HTMLInputElement).checked }
										};
									}}
									class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
								/>
								<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Link to home</span>
							</label>
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">When enabled, the site title is a link to the homepage</p>
						</div>
					</div>
				{:else if editingModule.type === 'menu'}
					<div class="space-y-4">
						<div>
							<label for="menu-orientation" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Orientation
							</label>
							<select
								id="menu-orientation"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.orientation ?? 'horizontal'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, orientation: (e.currentTarget as HTMLSelectElement).value as 'horizontal' | 'vertical' }
									};
								}}
							>
								<option value="horizontal">Horizontal</option>
								<option value="vertical">Vertical</option>
							</select>
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Horizontal: items in a row. Vertical: items stacked.</p>
						</div>
					</div>
				{:else if editingModule.type === 'divider'}
					<div class="space-y-4">
						<p class="text-sm text-[var(--color-surface-600-400)]">
							A horizontal rule using the theme border color. Use placement above to align it in the grid cell.
						</p>
						<div>
							<label for="divider-thickness" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Thickness
							</label>
							<select
								id="divider-thickness"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.thickness ?? 'thin'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											thickness: (e.currentTarget as HTMLSelectElement).value as 'thin' | 'medium'
										}
									};
								}}
							>
								<option value="thin">Thin</option>
								<option value="medium">Medium</option>
							</select>
						</div>
						<div>
							<label for="divider-margin" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Vertical spacing
							</label>
							<select
								id="divider-margin"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.margin ?? 'sm'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											margin: (e.currentTarget as HTMLSelectElement).value as
												'none' | 'sm' | 'md' | 'lg'
										}
									};
								}}
							>
								<option value="none">None</option>
								<option value="sm">Small</option>
								<option value="md">Medium</option>
								<option value="lg">Large</option>
							</select>
						</div>
						<div>
							<label for="divider-line-style" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Line style
							</label>
							<select
								id="divider-line-style"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.lineStyle ?? 'solid'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											lineStyle: (e.currentTarget as HTMLSelectElement).value as 'solid' | 'dashed' | 'dotted'
										}
									};
								}}
							>
								<option value="solid">Solid</option>
								<option value="dashed">Dashed</option>
								<option value="dotted">Dotted</option>
							</select>
						</div>
						<div>
							<label for="divider-class" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Extra CSS classes (optional)
							</label>
							<input
								id="divider-class"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.className ?? ''}
								placeholder="e.g. opacity-60"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											className: (e.currentTarget as HTMLInputElement).value
										}
									};
								}}
							/>
						</div>
					</div>
				{:else if editingModule.type === 'themeToggle'}
					<div class="space-y-4">
						<div class="text-sm text-[var(--color-surface-600-400)]">
							<p>Theme toggle module has no configuration options. It automatically toggles between light and dark themes.</p>
						</div>
					</div>
				{:else if editingModule.type === 'userGreeting'}
					<div class="space-y-4">
						<div>
							<label for="user-greeting-text" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Greeting Text
							</label>
							<input
								id="user-greeting-text"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.greeting || 'Hello'}
								placeholder="Hello"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, greeting: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Displayed before the user's name (e.g., "Hello, John")</p>
						</div>
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={editingModule.props?.showEmail === true}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, showEmail: (e.currentTarget as HTMLInputElement).checked }
										};
									}}
									class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
								/>
								<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Show email if name not available</span>
							</label>
						</div>
						<div>
							<label for="user-greeting-class" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								CSS Classes (optional)
							</label>
							<input
								id="user-greeting-class"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.className || ''}
								placeholder="e.g., text-[var(--color-surface-600-400)]"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, className: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
						</div>
					</div>
				{:else if editingModule.type === 'authButtons'}
					<div class="space-y-4">
						<div>
							<label for="auth-login-label" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Login Button Label
							</label>
							<input
								id="auth-login-label"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.loginLabel || 'Login'}
								placeholder="Login"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, loginLabel: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
						</div>
						<div>
							<label for="auth-logout-label" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Logout Button Label
							</label>
							<input
								id="auth-logout-label"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.logoutLabel || 'Logout'}
								placeholder="Logout"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, logoutLabel: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
						</div>
						<div>
							<label for="auth-login-url" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Login URL
							</label>
							<input
								id="auth-login-url"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.loginUrl || '/login'}
								placeholder="/login"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, loginUrl: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
						</div>
						<div>
							<label for="auth-container-class" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Container CSS Classes (optional)
							</label>
							<input
								id="auth-container-class"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.containerClass || 'flex items-center gap-2'}
								placeholder="flex items-center gap-2"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, containerClass: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
						</div>
					</div>
				{:else if editingModule.type === 'socialMedia'}
					<div class="space-y-4">
						<div class="text-sm text-[var(--color-surface-600-400)] mb-4">
							<p>Social media links are pulled from site configuration by default. You can override them here if needed.</p>
						</div>
						<div>
							<label for="social-facebook" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Facebook URL (optional override)
							</label>
							<input
								id="social-facebook"
								type="url"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.socialMedia?.facebook || ''}
								placeholder="Leave empty to use site config"
								on:input={(e) => {
									if (!editingModule.props.socialMedia) editingModule.props.socialMedia = {};
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											socialMedia: {
												...editingModule.props.socialMedia,
												facebook: (e.currentTarget as HTMLInputElement).value
											}
										}
									};
								}}
							/>
						</div>
						<div>
							<label for="social-instagram" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Instagram URL (optional override)
							</label>
							<input
								id="social-instagram"
								type="url"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.socialMedia?.instagram || ''}
								placeholder="Leave empty to use site config"
								on:input={(e) => {
									if (!editingModule.props.socialMedia) editingModule.props.socialMedia = {};
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											socialMedia: {
												...editingModule.props.socialMedia,
												instagram: (e.currentTarget as HTMLInputElement).value
											}
										}
									};
								}}
							/>
						</div>
						<div>
							<label for="social-twitter" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Twitter URL (optional override)
							</label>
							<input
								id="social-twitter"
								type="url"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.socialMedia?.twitter || ''}
								placeholder="Leave empty to use site config"
								on:input={(e) => {
									if (!editingModule.props.socialMedia) editingModule.props.socialMedia = {};
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											socialMedia: {
												...editingModule.props.socialMedia,
												twitter: (e.currentTarget as HTMLInputElement).value
											}
										}
									};
								}}
							/>
						</div>
						<div>
							<label for="social-linkedin" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								LinkedIn URL (optional override)
							</label>
							<input
								id="social-linkedin"
								type="url"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.socialMedia?.linkedin || ''}
								placeholder="Leave empty to use site config"
								on:input={(e) => {
									if (!editingModule.props.socialMedia) editingModule.props.socialMedia = {};
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											socialMedia: {
												...editingModule.props.socialMedia,
												linkedin: (e.currentTarget as HTMLInputElement).value
											}
										}
									};
								}}
							/>
						</div>
						<div>
							<label for="social-icon-size" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Icon Size
							</label>
							<select
								id="social-icon-size"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.iconSize || 'md'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, iconSize: (e.currentTarget as HTMLSelectElement).value }
									};
								}}
							>
								<option value="sm">Small</option>
								<option value="md">Medium</option>
								<option value="lg">Large</option>
							</select>
						</div>
						<div>
							<label for="social-icon-color" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Icon Color
							</label>
							<input
								id="social-icon-color"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.iconColor || 'current'}
								placeholder="current, gray-600, #000000, etc."
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, iconColor: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">CSS color or Tailwind color class (e.g., current, gray-600, blue-500)</p>
						</div>
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={editingModule.props?.showLabels === true}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, showLabels: (e.currentTarget as HTMLInputElement).checked }
										};
									}}
									class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
								/>
								<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Show Labels</span>
							</label>
						</div>
						<div>
							<label for="social-orientation" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Orientation
							</label>
							<select
								id="social-orientation"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.orientation || 'horizontal'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, orientation: (e.currentTarget as HTMLSelectElement).value }
									};
								}}
							>
								<option value="horizontal">Horizontal</option>
								<option value="vertical">Vertical</option>
							</select>
						</div>
						<div>
							<label for="social-align" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Alignment
							</label>
							<select
								id="social-align"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.align || 'start'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, align: (e.currentTarget as HTMLSelectElement).value }
									};
								}}
							>
								<option value="start">Start</option>
								<option value="center">Center</option>
								<option value="end">End</option>
							</select>
						</div>
						<div>
							<label for="social-gap" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Gap Size
							</label>
							<select
								id="social-gap"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.gap || 'normal'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, gap: (e.currentTarget as HTMLSelectElement).value }
									};
								}}
							>
								<option value="tight">Tight</option>
								<option value="normal">Normal</option>
								<option value="loose">Loose</option>
							</select>
						</div>
						<div>
							<label for="social-class" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								CSS Classes (optional)
							</label>
							<input
								id="social-class"
								type="text"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								value={editingModule.props?.className || ''}
								placeholder="e.g., mt-4"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, className: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
						</div>
					</div>
				{:else if editingModule.type === 'blogCategory'}
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="override-blog-category-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Section title (optional)
							</label>
							<MultiLangInput id="override-blog-category-title" bind:value={editingModule.props.title} />
						</div>
						<div>
							<label for="override-blog-category-alias" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Show only this category
							</label>
							<select
								id="override-blog-category-alias"
								class={ADMIN_TEXT_INPUT_CLASS}
								value={editingModule.props?.categoryAlias ?? ''}
								on:change={(e) => {
									const v = (e.currentTarget as HTMLSelectElement).value.trim();
									const next = { ...editingModule.props };
									if (v) next.categoryAlias = v;
									else delete next.categoryAlias;
									editingModule = { ...editingModule, props: next };
								}}
							>
								<option value="">All categories</option>
								{#if editingModule.props?.categoryAlias && !availableBlogCategories.some((c) => c.alias === editingModule.props.categoryAlias)}
									<option value={editingModule.props.categoryAlias}>
										{editingModule.props.categoryAlias} (saved)
									</option>
								{/if}
								{#each availableBlogCategories as category}
									<option value={category.alias}>{category.title} ({category.alias})</option>
								{/each}
							</select>
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
								Leave empty to list every active blog category (up to max items).
							</p>
						</div>
						<div>
							<label for="override-blog-category-layout" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Layout
							</label>
							<select
								id="override-blog-category-layout"
								class={ADMIN_TEXT_INPUT_CLASS}
								value={editingModule.props?.layout ?? 'chips'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											layout: (e.currentTarget as HTMLSelectElement).value as 'chips' | 'list'
										}
									};
								}}
							>
								<option value="chips">Chips</option>
								<option value="list">List</option>
							</select>
						</div>
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
									checked={editingModule.props?.showCount === true}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: {
												...editingModule.props,
												showCount: (e.currentTarget as HTMLInputElement).checked
											}
										};
									}}
								/>
								<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Show article counts</span>
							</label>
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Requires an extra aggregation on the server.</p>
						</div>
						<div>
							<label for="override-blog-category-max" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Max items
							</label>
							<input
								id="override-blog-category-max"
								type="number"
								min="1"
								max="100"
								class={ADMIN_TEXT_INPUT_CLASS}
								value={editingModule.props?.maxItems ?? 10}
								on:input={(e) => {
									const n = parseInt((e.currentTarget as HTMLInputElement).value, 10);
									const maxItems = Number.isFinite(n) ? Math.min(100, Math.max(1, n)) : 10;
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, maxItems }
									};
								}}
							/>
						</div>
						<div>
							<label for="override-blog-category-sort" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Sort by
							</label>
							<select
								id="override-blog-category-sort"
								class={ADMIN_TEXT_INPUT_CLASS}
								value={editingModule.props?.sortBy ?? 'name'}
								on:change={(e) => {
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											sortBy: (e.currentTarget as HTMLSelectElement).value as 'name' | 'count'
										}
									};
								}}
							>
								<option value="name">Name</option>
								<option value="count">Article count</option>
							</select>
						</div>
						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
									checked={editingModule.props?.linkToArticles === true}
									on:change={(e) => {
										editingModule = {
											...editingModule,
											props: {
												...editingModule.props,
												linkToArticles: (e.currentTarget as HTMLInputElement).checked
											}
										};
									}}
								/>
								<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Link each category to the article list</span>
							</label>
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Uses the path below with <code class="text-xs">?category=</code> alias.</p>
						</div>
						<div>
							<label for="override-blog-articles-path" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Articles list path
							</label>
							<input
								id="override-blog-articles-path"
								type="text"
								class={ADMIN_TEXT_INPUT_CLASS}
								value={editingModule.props?.articlesListPath ?? '/blog'}
								placeholder="/blog"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: {
											...editingModule.props,
											articlesListPath: (e.currentTarget as HTMLInputElement).value || '/blog'
										}
									};
								}}
							/>
						</div>
					</div>
				{:else}
					<div class="text-sm text-[var(--color-surface-600-400)]">
						<p>Module-specific configuration options coming soon.</p>
					</div>
				{/if}
			</div>
			<div class="sticky bottom-0 bg-[var(--color-surface-50-950)] border-t border-surface-200-800 px-6 py-4 flex justify-end gap-2">
				<button
					type="button"
					on:click={() => {
						editingModule = null;
						editingInnerLayoutPresetKey = '';
						editingInnerLayoutModuleIndex = -1;
						layoutShellOriginalPresetKey = '';
					}}
					class="px-4 py-2 text-[var(--color-surface-800-200)] hover:bg-[var(--color-surface-200-800)] rounded-md text-sm font-medium"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={saveModuleChanges}
					class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] text-sm font-medium"
				>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}

