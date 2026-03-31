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
		type TemplateBreakpointId,
		type ShellLayout
	} from '$lib/template/breakpoints';
	import { DEFAULT_PAGE_LAYOUTS, DEFAULT_PAGE_MODULES } from '$lib/constants/default-page-layouts';

	/** Readable defaults when template / overrides omit a key (also fixes invisible #000 on white fields). */
	const DEFAULT_COLOR_HEX: Record<string, string> = {
		primary: '#3B82F6',
		secondary: '#6B7280',
		accent: '#F59E0B',
		background: '#FFFFFF',
		text: '#111827',
		muted: '#6B7280'
	};

	/** Force light inputs + readable text (fixes invisible text under dark `html` / admin themes). */
	const ADMIN_TEXT_INPUT_BASE =
		'min-h-[2.5rem] px-3 py-2 border border-gray-300 rounded-md shadow-sm !bg-white !text-gray-900 placeholder:text-gray-500 [color-scheme:light] focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
	const ADMIN_TEXT_INPUT_CLASS = `w-full ${ADMIN_TEXT_INPUT_BASE}`;
	const ADMIN_TEXT_INPUT_FLEX_CLASS = `flex-1 min-w-0 ${ADMIN_TEXT_INPUT_BASE}`;

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
		layout: {
			maxWidth: string;
			containerPadding: string;
			gridGap: string;
		};
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
	let activeTemplate: TemplateConfig | null = null;
	let loading = true;
	let saving = false;
	let resetting = false;
	let message = '';
	let error = '';
	let activeTab = 'colors';
	let hasChanges = false;
	let previewPageType: 'home' | 'gallery' | 'album' | 'search' | 'pageBuilder' = 'home';
	let editingPageType: 'home' | 'gallery' | 'album' | 'search' | 'header' | 'footer' = 'home';
	/** Shell + page grid/modules edit target (mobile-first breakpoints). */
	let editingBreakpoint: TemplateBreakpointId = 'lg';
	const PAGE_KEYS = ['home', 'gallery', 'album', 'search', 'header', 'footer'] as const;
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
		customLayoutByBreakpoint?: Record<string, { maxWidth?: string; containerPadding?: string; gridGap?: string }>;
		componentVisibility?: Record<string, boolean>;
		headerConfig?: Record<string, any>;
		/** Legacy flat per page, or full `{ pageKey: { xs: …, lg: … } }` map when saved from Admin. */
		pageModules?: Record<string, unknown>;
		pageLayout?: Record<string, unknown>;
		pageLayoutByBreakpoint?: Record<string, Partial<Record<string, { gridRows: number; gridColumns: number }>>>;
		pageModulesByBreakpoint?: Record<string, Partial<Record<string, any[]>>>;
	} = {};

	let editingTheme: {
		_id: string;
		name?: string;
		baseTemplate: string;
		customColors?: Record<string, string>;
		customFonts?: Record<string, string | FontSetting>;
		customLayout?: Record<string, unknown>;
		customLayoutByBreakpoint?: Record<string, { maxWidth?: string; containerPadding?: string; gridGap?: string }>;
		componentVisibility?: Record<string, boolean>;
		headerConfig?: Record<string, unknown>;
		/** Legacy flat per page, or full `{ pageKey: { xs: …, lg: … } }` map when saved from Admin. */
		pageModules?: Record<string, unknown>;
		pageLayout?: Record<string, unknown>;
		pageLayoutByBreakpoint?: Record<string, Partial<Record<string, { gridRows: number; gridColumns: number }>>>;
		pageModulesByBreakpoint?: Record<string, Partial<Record<string, any[]>>>;
	} | null = null;
	$: currentTemplateName = editingTheme?.baseTemplate ||
		$siteConfigData?.template?.frontendTemplate ||
		$siteConfigData?.template?.activeTemplate ||
		'modern';
	$: siteTemplateOverrides = $siteConfigData?.template || {};
	
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
			localOverrides = {
				customColors: editingTheme.customColors ? { ...editingTheme.customColors } : {},
				customFonts: editingTheme.customFonts ? { ...editingTheme.customFonts } : {},
				customLayoutByBreakpoint: shellByBp as Record<string, { maxWidth?: string; containerPadding?: string; gridGap?: string }>,
				customLayout: shellByBreakpointToCustomLayoutField(shellByBp),
				componentVisibility: editingTheme.componentVisibility ? { ...editingTheme.componentVisibility } : {},
				headerConfig: editingTheme.headerConfig ? { ...editingTheme.headerConfig } : {},
				pageLayoutByBreakpoint: seeded.pageLayoutByBreakpoint,
				pageModulesByBreakpoint: seeded.pageModulesByBreakpoint,
				pageLayout: pageLayoutByBreakpointToPageLayoutField(seeded.pageLayoutByBreakpoint),
				pageModules: pageModulesByBreakpointToPageModulesField(seeded.pageModulesByBreakpoint)
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
			localOverrides = {
				customColors: siteTemplateOverrides.customColors ? { ...siteTemplateOverrides.customColors } : {},
				customFonts: siteTemplateOverrides.customFonts ? { ...siteTemplateOverrides.customFonts } : {},
				customLayoutByBreakpoint: shellByBp as Record<string, { maxWidth?: string; containerPadding?: string; gridGap?: string }>,
				customLayout: shellByBreakpointToCustomLayoutField(shellByBp),
				componentVisibility: siteTemplateOverrides.componentVisibility
					? { ...siteTemplateOverrides.componentVisibility }
					: {},
				headerConfig: siteTemplateOverrides.headerConfig ? { ...siteTemplateOverrides.headerConfig } : {},
				pageLayoutByBreakpoint: seeded.pageLayoutByBreakpoint,
				pageModulesByBreakpoint: seeded.pageModulesByBreakpoint,
				pageLayout: pageLayoutByBreakpointToPageLayoutField(seeded.pageLayoutByBreakpoint),
				pageModules: pageModulesByBreakpointToPageModulesField(seeded.pageModulesByBreakpoint)
			};
		}
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
			'hero',
			'richText',
			'featureGrid',
			'albumsGrid',
			'albumGallery',
			'cta',
			'blogCategory',
			'blogArticle'
		].includes(m.type)
	);
	const HEADER_MODULES = PAGE_MODULE_TYPES.filter((m) =>
		['logo', 'siteTitle', 'menu', 'languageSelector', 'themeToggle', 'themeSelect', 'userGreeting', 'authButtons', 'socialMedia'].includes(m.type)
	);
	const FOOTER_MODULES = PAGE_MODULE_TYPES.filter((m) =>
		['richText', 'cta', 'socialMedia', 'themeSelect'].includes(m.type)
	);

	function migratePageModules(pm: Record<string, unknown> | undefined): Record<string, unknown> {
		if (!pm) return {};
		const out: Record<string, unknown> = {};
		for (const [pt, val] of Object.entries(pm)) {
			if (isPageModulesBreakpointMapForPage(val)) {
				out[pt] = JSON.parse(JSON.stringify(val));
				continue;
			}
			if (!Array.isArray(val)) continue;
			out[pt] = val.map((m, i) => {
				if (m.rowOrder !== undefined && m.columnIndex !== undefined) return m;
				return { ...m, rowOrder: i, columnIndex: 0 };
			});
		}
		return out;
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
		const pm = pageModulesByBreakpointToPageModulesField(localOverrides.pageModulesByBreakpoint || {});
		localOverrides = {
			...localOverrides,
			customLayout,
			pageLayout: pl,
			pageModules: pm,
			...(Object.keys(plByIn).length > 0 ? { pageLayoutByBreakpoint: plByIn } : {})
		};
	}

	function getModulesForPageType(pt: string, bp: TemplateBreakpointId) {
		const resolved = getPageModulesForBreakpoint(
			{
				pageModules: localOverrides.pageModules,
				pageModulesByBreakpoint: localOverrides.pageModulesByBreakpoint
			},
			pt,
			bp
		);
		if (resolved.length > 0) return resolved;
		const hasAnyPageModulesConfig =
			localOverrides.pageModules?.[pt] != null ||
			localOverrides.pageModulesByBreakpoint?.[pt] != null;
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

	/** Copy current breakpoint’s grid and module placements to xs…xl for the active page (TEMPLATING_REQUIREMENTS 2.2.4). */
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

	function saveModuleChanges() {
		if (!editingModule) return;
		const idx = getModulesForPageType(editingPageType, editingBreakpoint).findIndex((m) => m._id === editingModule._id);
		if (idx >= 0) {
			const arr = [...(getModulesForPageType(editingPageType, editingBreakpoint) ?? [])];
			const updated = [...arr];
			updated[idx] = { ...editingModule };
			const bp = editingBreakpoint;
			const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
			pmBy[editingPageType] = { ...(pmBy[editingPageType] || {}), [bp]: updated };
			localOverrides = { ...localOverrides, pageModulesByBreakpoint: pmBy };
			syncLegacyFromBreakpoints();
			hasChanges = true;
		}
		editingModule = null;
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
		const defaultProps: Record<string, any> = {};
		if (moduleType === 'albumsGrid' || moduleType === 'albumGallery') {
			defaultProps.albumSource = 'root';
		} else if (moduleType === 'hero') {
			defaultProps.backgroundStyle = 'light';
		} else if (moduleType === 'richText') {
			defaultProps.background = 'white';
		}
		const newMod: Record<string, any> = { _id: id, type: moduleType, props: defaultProps, rowOrder: r, columnIndex: c };
		if (rowSpan && rowSpan > 1) newMod.rowSpan = rowSpan;
		if (colSpan && colSpan > 1) newMod.colSpan = colSpan;

		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		const rowM = { ...(pmBy[pageType] || {}), [bp]: [...arr, newMod] };
		pmBy[pageType] = rowM;
		localOverrides = { ...localOverrides, pageLayoutByBreakpoint: plBy, pageModulesByBreakpoint: pmBy };
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
		if (newType === 'albumsGrid' || newType === 'albumGallery') {
			defaultProps.albumSource = old.props?.albumSource ?? 'root';
		}
		const updated = [...arr];
		updated[idx] = { ...old, type: newType, props: defaultProps };
		const pmBy = { ...(localOverrides.pageModulesByBreakpoint || {}) };
		pmBy[pageType] = { ...(pmBy[pageType] || {}), [bp]: updated };
		localOverrides = { ...localOverrides, pageModulesByBreakpoint: pmBy };
		syncLegacyFromBreakpoints();
		hasChanges = true;
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
		const m = all.find((x) => x.type === type) ?? all.find((x) => (x.type === 'albumsGrid' && type === 'albumGallery') || (x.type === 'albumGallery' && type === 'albumsGrid'));
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
				'modern';
			
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

	// Reactive color values to ensure inputs update when palette is applied
	let colorValues: Record<string, string> = {};
	$: colorValues = {
		primary:
			localOverrides.customColors?.primary ||
			activeTemplate?.colors?.primary ||
			DEFAULT_COLOR_HEX.primary,
		secondary:
			localOverrides.customColors?.secondary ||
			activeTemplate?.colors?.secondary ||
			DEFAULT_COLOR_HEX.secondary,
		accent:
			localOverrides.customColors?.accent || activeTemplate?.colors?.accent || DEFAULT_COLOR_HEX.accent,
		background:
			localOverrides.customColors?.background ||
			activeTemplate?.colors?.background ||
			DEFAULT_COLOR_HEX.background,
		text: localOverrides.customColors?.text || activeTemplate?.colors?.text || DEFAULT_COLOR_HEX.text,
		muted: localOverrides.customColors?.muted || activeTemplate?.colors?.muted || DEFAULT_COLOR_HEX.muted
	};

	function getEffectiveColor(colorType: string): string {
		const fallback = DEFAULT_COLOR_HEX[colorType] ?? DEFAULT_COLOR_HEX.primary;
		return (
			colorValues[colorType] ||
			localOverrides.customColors?.[colorType] ||
			activeTemplate?.colors?.[colorType as keyof typeof activeTemplate.colors] ||
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

	function getEffectiveLayout(layoutType: 'maxWidth' | 'containerPadding' | 'gridGap'): string {
		const bp = editingBreakpoint;
		const key = layoutType as keyof ShellLayout;
		const shell = localOverrides.customLayoutByBreakpoint?.[bp];
		if (shell && shell[key] != null && String(shell[key]).trim() !== '') {
			return String(shell[key]);
		}
		const raw = localOverrides.customLayout;
		if (raw && isBreakpointMapCustomLayout(raw)) {
			const cell = raw[bp];
			if (cell?.[key] != null && String(cell[key]).trim() !== '') return String(cell[key]);
		}
		if (raw && isLegacyCustomLayout(raw)) {
			const v = raw[layoutType];
			if (v != null && String(v).trim() !== '') return String(v);
		}
		const pack = activeTemplate?.layout[layoutType];
		if (pack != null && String(pack).trim() !== '') return String(pack);
		const hint = SHELL_HINT_BY_BREAKPOINT[bp]?.[key];
		if (hint != null && String(hint).trim() !== '') return String(hint);
		return DEFAULT_SHELL[key] ?? '';
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
		layout: {
			maxWidth: getEffectiveLayout('maxWidth') || '1200px',
			containerPadding: getEffectiveLayout('containerPadding') || '1rem',
			gridGap: getEffectiveLayout('gridGap') || '1.5rem'
		}
	} : null;

	function pageModulesFieldHasContent(v: unknown): boolean {
		if (Array.isArray(v)) return v.length > 0;
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
		return !!(
			(localOverrides.customColors && Object.keys(localOverrides.customColors).length > 0) ||
			(localOverrides.customFonts && Object.keys(localOverrides.customFonts).length > 0) ||
			(localOverrides.customLayout && Object.keys(localOverrides.customLayout).length > 0) ||
			hasBpShell ||
			(localOverrides.componentVisibility && Object.keys(localOverrides.componentVisibility).length > 0) ||
			(localOverrides.headerConfig && Object.keys(localOverrides.headerConfig).length > 0) ||
			hasPageModules ||
			hasPageLayout ||
			hasBpPages
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
				pageModulesByBreakpoint: localOverrides.pageModulesByBreakpoint || {}
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
	<title>{$t('admin.themeBuilder')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-[1600px] mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<!-- Header -->
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-4">
					<a
						href="/admin/templates"
						class="text-blue-600 hover:text-blue-800 text-sm font-medium"
					>
						{$t('admin.backToTemplates')}
					</a>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">{$t('admin.themeBuilder')}</h1>
						<p class="text-gray-600 mt-1">
							{themeId && editingTheme
								? $t('admin.editingTheme').replace('{name}', editingTheme.name || $t('admin.themeFallbackName'))
								: $t('admin.customizeActiveTemplate').replace(
										'{name}',
										activeTemplate?.displayName || currentTemplateName
								  )}
						</p>
					</div>
				</div>
				<div class="flex gap-2">
					{#if hasChanges}
						<button
							type="button"
							on:click={cancelChanges}
							class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
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
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
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
				<div class="mb-4 p-4 rounded-md bg-blue-50 text-blue-700 text-sm">
					{$t('admin.templateHasOverridesInfo')}
				</div>
			{/if}

			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">{$t('admin.loadingTemplateOverrides')}</p>
				</div>
			{:else if !activeTemplate}
				<div class="text-center py-8">
					<p class="text-gray-600">{$t('admin.noActiveTemplateFound')}</p>
				</div>
			{:else}
				<!-- Base palette presets -->
				<div class="mb-6">
					<h3 class="text-sm font-medium text-gray-700 mb-2">{$t('admin.basePalette')}</h3>
					<div class="flex flex-wrap gap-2">
						{#each ['light', 'dark', 'highContrast', 'muted'] as key}
							{@const preset = PALETTE_PRESETS[key]}
							<button
								type="button"
								on:click={() => applyPalette(key)}
								class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm font-medium transition-colors"
							>
								<span class="flex gap-0.5">
									{#each ['primary', 'secondary', 'accent'] as c}
										<span
											class="w-4 h-4 rounded-full border border-gray-300"
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

				<!-- Two-panel layout: controls left, preview right -->
				<div class="flex gap-8 flex-col lg:flex-row">
					<div class="flex-1 min-w-0">
						<!-- Tabs -->
				<div class="border-b border-gray-200 mb-6">
					<nav class="-mb-px flex space-x-8">
						<button
							type="button"
							on:click={() => (activeTab = 'colors')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'colors'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
						>
							🎨 Colors
						</button>
						<button
							type="button"
							on:click={() => (activeTab = 'fonts')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'fonts'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
						>
							🔤 Fonts
						</button>
						<button
							type="button"
							on:click={() => (activeTab = 'layout')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'layout'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
						>
							📐 Layout
						</button>
						{#if themeId}
							<button
								type="button"
								on:click={() => (activeTab = 'pages')}
								class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'pages'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
							>
								📄 Pages
							</button>
						{/if}
					</nav>
				</div>

				<!-- Tab Content -->
				{#if activeTab === 'colors'}
					<div class="space-y-6 [color-scheme:light]">
						<h2 class="text-xl font-semibold text-gray-900">Color Customization</h2>
						<p class="text-sm text-gray-600 mb-4">
							Customize the color scheme for your site. Each color is used by specific UI elements as described below.
						</p>
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
								<div class="border border-gray-200 rounded-lg p-4 bg-white text-gray-900">
									<label class="block text-sm font-medium text-gray-900 mb-2">
										{colorInfo.label}
									</label>
									<p class="text-xs text-gray-600 mb-3">
										{colorInfo.description}
									</p>
									<div class="flex gap-2 items-stretch">
										<div class="shrink-0 flex items-center rounded-md border border-gray-300 bg-white p-1 shadow-sm">
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
											class={ADMIN_TEXT_INPUT_FLEX_CLASS}
										/>
									</div>
									<p class="mt-2 text-xs text-gray-500">
										Template default: {activeTemplate.colors[colorInfo.type] ?? DEFAULT_COLOR_HEX[colorInfo.type]}
									</p>
								</div>
							{/each}
						</div>
					</div>
				{:else if activeTab === 'fonts'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900">Font Customization</h2>
						<p class="text-sm text-gray-600">
							Choose from popular Google Fonts (loaded automatically), or use <strong>Custom</strong> for a system or self-hosted font: enter the exact CSS font-family name and ensure the font is loaded on your site (e.g. in <code class="px-1 py-0.5 bg-gray-100 rounded text-xs">app.html</code> or global CSS).
						</p>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Heading Font
								</label>
								<select
									value={GOOGLE_FONT_NAMES.has(getEffectiveFont('heading')) ? getEffectiveFont('heading') : '__custom__'}
									on:change={(e) => {
										const v = (e.currentTarget as HTMLSelectElement).value;
										if (v !== '__custom__') updateFontFamily('heading', v);
									}}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									{#each GOOGLE_FONTS as font}
										<option value={font.value}>{font.label}</option>
									{/each}
									<option value="__custom__">Custom…</option>
								</select>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('heading'))}
									<input
										type="text"
										value={getEffectiveFont('heading')}
										on:input={(e) => updateFontFamily('heading', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div>
										<label class="block text-xs font-medium text-gray-500 mb-1">Size</label>
										<select
											value={getFontSizeOverride('heading')}
											on:change={(e) => updateFontSize('heading', (e.currentTarget as HTMLSelectElement).value)}
											class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
										>
											{#each FONT_SIZE_OPTIONS as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
									</div>
									<div>
										<label class="block text-xs font-medium text-gray-500 mb-1">Weight</label>
										<select
											value={getFontWeightOverride('heading')}
											on:change={(e) => updateFontWeight('heading', (e.currentTarget as HTMLSelectElement).value)}
											class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
										>
											{#each FONT_WEIGHT_OPTIONS as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
									</div>
								</div>
								<p class="mt-1 text-xs text-gray-500">Default: {getDefaultFontFamily('heading')}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Body Font
								</label>
								<select
									value={GOOGLE_FONT_NAMES.has(getEffectiveFont('body')) ? getEffectiveFont('body') : '__custom__'}
									on:change={(e) => {
										const v = (e.currentTarget as HTMLSelectElement).value;
										if (v !== '__custom__') updateFontFamily('body', v);
									}}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									{#each GOOGLE_FONTS as font}
										<option value={font.value}>{font.label}</option>
									{/each}
									<option value="__custom__">Custom…</option>
								</select>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('body'))}
									<input
										type="text"
										value={getEffectiveFont('body')}
										on:input={(e) => updateFontFamily('body', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div><label class="block text-xs font-medium text-gray-500 mb-1">Size</label>
										<select value={getFontSizeOverride('body')} on:change={(e) => updateFontSize('body', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
											{#each FONT_SIZE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
										</select></div>
									<div><label class="block text-xs font-medium text-gray-500 mb-1">Weight</label>
										<select value={getFontWeightOverride('body')} on:change={(e) => updateFontWeight('body', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
											{#each FONT_WEIGHT_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
										</select></div>
								</div>
								<p class="mt-1 text-xs text-gray-500">Default: {getDefaultFontFamily('body')}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Links
								</label>
								<select
									value={GOOGLE_FONT_NAMES.has(getEffectiveFont('links')) ? getEffectiveFont('links') : '__custom__'}
									on:change={(e) => {
										const v = (e.currentTarget as HTMLSelectElement).value;
										if (v !== '__custom__') updateFontFamily('links', v);
									}}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									{#each GOOGLE_FONTS as font}
										<option value={font.value}>{font.label}</option>
									{/each}
									<option value="__custom__">Custom…</option>
								</select>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('links'))}
									<input
										type="text"
										value={getEffectiveFont('links')}
										on:input={(e) => updateFontFamily('links', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div><label class="block text-xs font-medium text-gray-500 mb-1">Size</label>
										<select value={getFontSizeOverride('links')} on:change={(e) => updateFontSize('links', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
											{#each FONT_SIZE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
										</select></div>
									<div><label class="block text-xs font-medium text-gray-500 mb-1">Weight</label>
										<select value={getFontWeightOverride('links')} on:change={(e) => updateFontWeight('links', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
											{#each FONT_WEIGHT_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
										</select></div>
								</div>
								<p class="mt-1 text-xs text-gray-500">Default: {getDefaultFontFamily('links')}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Lists
								</label>
								<select
									value={GOOGLE_FONT_NAMES.has(getEffectiveFont('lists')) ? getEffectiveFont('lists') : '__custom__'}
									on:change={(e) => {
										const v = (e.currentTarget as HTMLSelectElement).value;
										if (v !== '__custom__') updateFontFamily('lists', v);
									}}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									{#each GOOGLE_FONTS as font}
										<option value={font.value}>{font.label}</option>
									{/each}
									<option value="__custom__">Custom…</option>
								</select>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('lists'))}
									<input
										type="text"
										value={getEffectiveFont('lists')}
										on:input={(e) => updateFontFamily('lists', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div><label class="block text-xs font-medium text-gray-500 mb-1">Size</label>
										<select value={getFontSizeOverride('lists')} on:change={(e) => updateFontSize('lists', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
											{#each FONT_SIZE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
										</select></div>
									<div><label class="block text-xs font-medium text-gray-500 mb-1">Weight</label>
										<select value={getFontWeightOverride('lists')} on:change={(e) => updateFontWeight('lists', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
											{#each FONT_WEIGHT_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
										</select></div>
								</div>
								<p class="mt-1 text-xs text-gray-500">Default: {getDefaultFontFamily('lists')}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Form inputs
								</label>
								<select
									value={GOOGLE_FONT_NAMES.has(getEffectiveFont('formInputs')) ? getEffectiveFont('formInputs') : '__custom__'}
									on:change={(e) => {
										const v = (e.currentTarget as HTMLSelectElement).value;
										if (v !== '__custom__') updateFontFamily('formInputs', v);
									}}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									{#each GOOGLE_FONTS as font}
										<option value={font.value}>{font.label}</option>
									{/each}
									<option value="__custom__">Custom…</option>
								</select>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('formInputs'))}
									<input
										type="text"
										value={getEffectiveFont('formInputs')}
										on:input={(e) => updateFontFamily('formInputs', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div><label class="block text-xs font-medium text-gray-500 mb-1">Size</label>
										<select value={getFontSizeOverride('formInputs')} on:change={(e) => updateFontSize('formInputs', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
											{#each FONT_SIZE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
										</select></div>
									<div><label class="block text-xs font-medium text-gray-500 mb-1">Weight</label>
										<select value={getFontWeightOverride('formInputs')} on:change={(e) => updateFontWeight('formInputs', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
											{#each FONT_WEIGHT_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
										</select></div>
								</div>
								<p class="mt-1 text-xs text-gray-500">Default: {getDefaultFontFamily('formInputs')}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Form labels
								</label>
								<select
									value={GOOGLE_FONT_NAMES.has(getEffectiveFont('formLabels')) ? getEffectiveFont('formLabels') : '__custom__'}
									on:change={(e) => {
										const v = (e.currentTarget as HTMLSelectElement).value;
										if (v !== '__custom__') updateFontFamily('formLabels', v);
									}}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									{#each GOOGLE_FONTS as font}
										<option value={font.value}>{font.label}</option>
									{/each}
									<option value="__custom__">Custom…</option>
								</select>
								{#if !GOOGLE_FONT_NAMES.has(getEffectiveFont('formLabels'))}
									<input
										type="text"
										value={getEffectiveFont('formLabels')}
										on:input={(e) => updateFontFamily('formLabels', (e.currentTarget as HTMLInputElement).value)}
										placeholder="e.g. Inter, My Custom Font"
										class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								{/if}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div><label class="block text-xs font-medium text-gray-500 mb-1">Size</label>
										<select value={getFontSizeOverride('formLabels')} on:change={(e) => updateFontSize('formLabels', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
											{#each FONT_SIZE_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
										</select></div>
									<div><label class="block text-xs font-medium text-gray-500 mb-1">Weight</label>
										<select value={getFontWeightOverride('formLabels')} on:change={(e) => updateFontWeight('formLabels', (e.currentTarget as HTMLSelectElement).value)} class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
											{#each FONT_WEIGHT_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
										</select></div>
								</div>
								<p class="mt-1 text-xs text-gray-500">Default: {getDefaultFontFamily('formLabels')}</p>
							</div>
						</div>
					</div>
				{:else if activeTab === 'layout'}
					<div class="space-y-4">
						<div>
							<h2 class="text-xl font-semibold text-gray-900">Layout Customization</h2>
							<p class="text-sm text-gray-600 mt-1">
								Choose a breakpoint tab. Each tab has its own max width, padding, and grid gap (stored per breakpoint).
							</p>
						</div>

						<div
							class="rounded-lg border border-gray-200 bg-white overflow-hidden [color-scheme:light]"
						>
							<div
								class="border-b border-gray-200 bg-gray-50 px-2 pt-2"
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
													? 'border-blue-600 text-blue-700 bg-white border-b-blue-600 z-10'
													: 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}"
										>
											<span class="uppercase tracking-wide">{bp}</span>
											<span
												class="block text-[10px] sm:inline sm:ml-1 sm:text-xs font-normal text-gray-400"
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
											<label class="block text-sm font-medium text-gray-700 mb-2" for="layout-mw-{editingBreakpoint}">
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
											<p class="mt-1 text-xs text-gray-500">
												Pack default: {activeTemplate.layout.maxWidth} · Suggested at {editingBreakpoint}: {SHELL_HINT_BY_BREAKPOINT[editingBreakpoint].maxWidth}
											</p>
										</div>
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2" for="layout-pad-{editingBreakpoint}">
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
											<p class="mt-1 text-xs text-gray-500">
												Pack default: {activeTemplate.layout.containerPadding} · Suggested: {SHELL_HINT_BY_BREAKPOINT[editingBreakpoint].containerPadding}
											</p>
										</div>
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2" for="layout-gap-{editingBreakpoint}">
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
											<p class="mt-1 text-xs text-gray-500">
												Pack default: {activeTemplate.layout.gridGap} · Suggested: {SHELL_HINT_BY_BREAKPOINT[editingBreakpoint].gridGap}
											</p>
										</div>
									</div>
								{/key}
							</div>
						</div>
					</div>
				{:else if activeTab === 'pages'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900">Page structure</h2>
						<p class="text-sm text-gray-600 max-w-3xl">
							Use the <strong>page</strong> tabs to pick a route region, then the <strong>breakpoint</strong> tabs to
							edit that page at each viewport width. Set <strong>grid</strong> rows/columns and <strong>place modules</strong>
							per breakpoint — the live site uses the layout that matches the visitor’s screen.
						</p>

						<div
							class="rounded-lg border border-gray-200 bg-white overflow-hidden [color-scheme:light]"
						>
							<!-- Outer tabs: pages -->
							<div
								class="border-b border-gray-200 bg-slate-50 px-2 pt-2"
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
													? 'border-violet-600 text-violet-800 bg-white border-b-violet-600 z-10'
													: 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}"
										>
											{pt}
										</button>
									{/each}
								</nav>
							</div>
							<!-- Inner tabs: breakpoints -->
							<div
								class="border-b border-gray-200 bg-gray-50/80 px-2 pt-2"
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
											on:click={() => (editingBreakpoint = bp)}
											class="min-w-0 flex-1 sm:flex-none px-3 py-2 text-sm font-medium border-b-2 transition-colors rounded-t-md
												{editingBreakpoint === bp
													? 'border-blue-600 text-blue-700 bg-white border-b-blue-600 z-10'
													: 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}"
										>
											<span class="uppercase tracking-wide">{bp}</span>
											<span
												class="block text-[10px] sm:inline sm:ml-1 sm:text-xs font-normal text-gray-400"
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
								<p class="text-xs text-gray-500">
									<span class="font-medium text-gray-700 capitalize">{editingPageType}</span>
									·
									<span class="uppercase">{editingBreakpoint}</span>
									<span class="text-gray-500">
										(≥{BREAKPOINT_MIN_WIDTH_PX[editingBreakpoint]}px) — grid {pageGrid.gridRows} × {pageGrid.gridColumns}
									</span>
								</p>

						{#key `${editingPageType}-${editingBreakpoint}`}
						<!-- Grid configuration (like template builder) -->
						<div class="bg-gray-50 p-4 rounded-lg">
							<h3 class="text-sm font-semibold text-gray-900 mb-3">Grid configuration</h3>
							{#if !showApplyCurrentBreakpointToAllBreakpoints}
								<p class="text-xs text-gray-500 mt-2">
									{$t('admin.allBreakpointsAlreadyMatchForPage')}
								</p>
								<p class="text-xs text-gray-500 mt-1">
									{$t('admin.switchBreakpointToMakeDifferent')}
								</p>
							{/if}
							<div class="grid grid-cols-2 gap-4 max-w-xs">
								<div>
									<label
										for="grid-rows-{editingPageType}-{editingBreakpoint}"
										class="block text-sm font-medium text-gray-700 mb-1"
									>Rows</label>
									<input
										id="grid-rows-{editingPageType}-{editingBreakpoint}"
										type="number"
										min="1"
										max="20"
										value={pageGrid.gridRows}
										on:input={(e) => updateGridForPageType(editingPageType, parseInt((e.target as HTMLInputElement).value) || 1, undefined)}
										class="w-full px-3 py-2 border border-gray-300 rounded-md"
									/>
								</div>
								<div>
									<label
										for="grid-cols-{editingPageType}-{editingBreakpoint}"
										class="block text-sm font-medium text-gray-700 mb-1"
									>Columns</label>
									<input
										id="grid-cols-{editingPageType}-{editingBreakpoint}"
										type="number"
										min="1"
										max="20"
										value={pageGrid.gridColumns}
										on:input={(e) => updateGridForPageType(editingPageType, undefined, parseInt((e.target as HTMLInputElement).value) || 1)}
										class="w-full px-3 py-2 border border-gray-300 rounded-md"
									/>
								</div>
							</div>
							{#if showApplyCurrentBreakpointToAllBreakpoints}
								<button
									type="button"
									title={$t('admin.applyCurrentBreakpointToAllBreakpointsHelp')}
									on:click={() => applyCurrentBreakpointToAllForEditingPage()}
									class="mt-3 text-sm px-3 py-1.5 border border-gray-300 text-gray-800 rounded-md hover:bg-gray-100"
								>
									{$t('admin.applyCurrentBreakpointToAllBreakpoints')}
								</button>
							{/if}
							{#if editingPageType === 'home' && getModulesForPageType(editingPageType, editingBreakpoint).length === 0}
								<button
									type="button"
									on:click={() => applyDefaultLayout(editingPageType)}
									class="mt-3 text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
								>
									Use default (2 rows × 1 col: Hero + Albums Grid)
								</button>
							{/if}
						</div>

						{#key pageGrid.gridRows + '-' + pageGrid.gridColumns + '-' + editingBreakpoint + '-' + getModulesForPageType(editingPageType, editingBreakpoint).length}
						<!-- Layout grid (like page builder: select cells, assign module) -->
						<div>
							<h3 class="text-sm font-semibold text-gray-900 mb-3">Layout grid</h3>
							<div
								class="gap-2 border-2 border-gray-300 p-2 bg-white select-none rounded-lg"
								style="display: grid; grid-template-columns: repeat({pageGrid.gridColumns}, 1fr); grid-template-rows: repeat({pageGrid.gridRows}, minmax(80px, auto));"
							>
								{#each getModulesForPageType(editingPageType, editingBreakpoint) as mod (mod._id)}
									{@const r = mod.rowOrder ?? 0}
									{@const c = mod.columnIndex ?? 0}
									{@const rs = mod.rowSpan ?? 1}
									{@const cs = mod.colSpan ?? 1}
									<div
										class="border border-green-300 rounded-lg p-3 bg-green-50/50"
										style="grid-column: {c + 1} / span {cs}; grid-row: {r + 1} / span {rs}"
									>
										<div class="flex flex-col h-full">
											<p class="text-sm font-medium text-gray-900">{mod.type}</p>
											{#if rs > 1 || cs > 1}
												<p class="text-xs text-gray-500 mt-1">{rs}×{cs} span</p>
											{/if}
											<div class="flex gap-2 mt-2">
												<button
													type="button"
													class="text-xs text-blue-600 hover:text-blue-800 font-medium"
													on:click|stopPropagation={() => {
														// Deep clone the module to avoid mutating the original
														editingModule = JSON.parse(JSON.stringify(mod));
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
													{selected ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-400' : 'border-gray-300 bg-white hover:bg-gray-50 cursor-pointer'}"
												style="grid-column: {col + 1}; grid-row: {row + 1}"
												on:click|stopPropagation={() => { if (!selected) toggleCell(row, col); }}
											>
												{#if selected}
													<div class="flex-1 flex flex-col items-center justify-center gap-2 p-1">
														<span class="text-xs text-blue-900 font-bold">Selected</span>
														<select
															bind:value={assignedModuleType}
															class="text-xs border-2 border-blue-500 rounded-md px-2 py-2 w-full bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer text-gray-900"
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
															<span class="text-xs text-blue-800 mt-0.5 font-semibold">
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
														<span class="text-xs text-gray-600 font-medium">Click to select</span>
													</div>
												{/if}
											</div>
										{/if}
									{/each}
								{/each}
							</div>

							<!-- Selection toolbar (like page builder) -->
							<div class="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 mt-4">
								<button
									type="button"
									on:click={selectAllEmptyCells}
									class="text-sm text-gray-600 hover:text-gray-900"
								>
									Select all
								</button>
								{#if selectedCount > 0}
									<span class="text-sm text-gray-600">
										{selectedCount} cell{selectedCount !== 1 ? 's' : ''} → 1 module
										{#if selectionBounds && (selectionBounds.rowSpan > 1 || selectionBounds.colSpan > 1)}
											({selectionBounds.rowSpan}×{selectionBounds.colSpan})
										{/if}
									</span>
									<select
										bind:value={assignedModuleType}
										class="text-sm border border-gray-300 rounded px-3 py-1.5"
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
										class="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Assign
									</button>
									<button
										type="button"
										on:click={clearSelection}
										class="text-sm text-gray-600 hover:text-gray-900"
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

					<!-- Right panel: Live preview -->
					<div class="lg:w-[420px] flex-shrink-0">
						<div class="sticky top-4">
							<h3 class="text-sm font-medium text-gray-700 mb-2">Live preview</h3>
							<div class="flex flex-wrap gap-1 mb-2">
								{#each ['home', 'gallery', 'album', 'search', 'header', 'footer', 'pageBuilder'] as p}
									{@const pageKey = p as typeof previewPageType}
									<button
										type="button"
										on:click={() => (previewPageType = pageKey)}
										class="px-2 py-1 text-xs rounded {previewPageType === pageKey
											? 'bg-blue-600 text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
									>
										{pageKey === 'pageBuilder' ? 'Page Builder' : pageKey.charAt(0).toUpperCase() + pageKey.slice(1)}
									</button>
								{/each}
							</div>
							{#if previewTokens}
								<ThemeBuilderPreview 
									tokens={previewTokens} 
									pageType={previewPageType}
									pageModules={getModulesForPageType(previewPageType, editingBreakpoint)}
									pageLayout={getGridForPageType(previewPageType, editingBreakpoint)}
								/>
							{:else}
								<div class="h-64 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500">
									Loading preview...
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Edit Module Modal -->
{#if editingModule}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-module-title">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
			<div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
				<h2 id="edit-module-title" class="text-lg font-semibold text-gray-900">
					Edit {getModuleLabel(editingModule.type)}
				</h2>
				<button
					type="button"
					on:click={() => editingModule = null}
					class="text-gray-400 hover:text-gray-600"
					aria-label="Close"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="p-6 space-y-4">
				<div>
					<p class="text-sm text-gray-600 mb-4">
						Module: <span class="font-medium text-gray-900">{editingModule.type}</span>
						<br />
						Position: Row {editingModule.rowOrder + 1}, Col {editingModule.columnIndex + 1}
						{#if (editingModule.rowSpan ?? 1) > 1 || (editingModule.colSpan ?? 1) > 1}
							<br />
							Span: {(editingModule.rowSpan ?? 1)}×{(editingModule.colSpan ?? 1)}
						{/if}
					</p>
				</div>

				{#if editingModule.type === 'albumsGrid' || editingModule.type === 'albumGallery'}
					<div>
						<label for="edit-album-source" class="block text-sm font-medium text-gray-700 mb-2">
							Albums source
						</label>
						<select
							id="edit-album-source"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<p class="mt-2 text-sm text-gray-500">Album picker for specific albums coming soon.</p>
						{/if}
						{#if editingModule.props?.albumSource === 'current'}
							<p class="mt-2 text-xs text-gray-500">
								Shows sub-albums of the album specified in the URL (album-alias parameter). Use this for album pages.
							</p>
						{/if}
					</div>
				{:else if editingModule.type === 'hero'}
					<div class="space-y-4">
						<div>
							<label for="hero-title" class="block text-sm font-medium text-gray-700 mb-2">
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
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="hero-subtitle" class="block text-sm font-medium text-gray-700 mb-2">
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
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="hero-cta-label" class="block text-sm font-medium text-gray-700 mb-2">
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
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="hero-cta-url" class="block text-sm font-medium text-gray-700 mb-2">
								Button URL (CTA)
							</label>
							<input
								id="hero-cta-url"
								type="url"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="hero-background-style" class="block text-sm font-medium text-gray-700 mb-2">
								Background Style
							</label>
							<select
								id="hero-background-style"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
								<label for="hero-background-image" class="block text-sm font-medium text-gray-700 mb-2">
									Background Image URL
								</label>
								<input
									id="hero-background-image"
									type="url"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="richtext-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title
							</label>
							{#if typeof editingModule.props?.title === 'object'}
								<MultiLangInput
									id="richtext-title"
									bind:value={editingModule.props.title}
									placeholder="Enter title"
									class="w-full"
								/>
							{:else}
								<input
									id="richtext-title"
									type="text"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={editingModule.props?.title || ''}
									placeholder="Enter title"
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
							<label for="richtext-body" class="block text-sm font-medium text-gray-700 mb-2">
								Body Content
							</label>
							{#if typeof editingModule.props?.body === 'object'}
								<MultiLangHTMLEditor
									id="richtext-body"
									bind:value={editingModule.props.body}
									class="w-full"
								/>
							{:else}
								<textarea
									id="richtext-body"
									rows="6"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
									value={editingModule.props?.body || ''}
									placeholder="Enter HTML content"
									on:input={(e) => {
										editingModule = {
											...editingModule,
											props: { ...editingModule.props, body: (e.currentTarget as HTMLTextAreaElement).value }
										};
									}}
								></textarea>
								<p class="mt-1 text-xs text-gray-500">HTML content editor. For rich text editing, use the multi-language editor above.</p>
							{/if}
						</div>

						<div>
							<label for="richtext-background" class="block text-sm font-medium text-gray-700 mb-2">
								Background Color
							</label>
							<select
								id="richtext-background"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<span class="text-sm font-medium text-gray-700">Show flags</span>
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
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<span class="text-sm font-medium text-gray-700">Show native names</span>
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
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<span class="text-sm font-medium text-gray-700">Compact mode</span>
							</label>
						</div>
						<div>
							<label for="lang-selector-class" class="block text-sm font-medium text-gray-700 mb-2">
								CSS Classes (optional)
							</label>
							<input
								id="lang-selector-class"
								type="text"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="logo-size" class="block text-sm font-medium text-gray-700 mb-2">
								Size
							</label>
							<select
								id="logo-size"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<p class="mt-1 text-xs text-gray-500">Display size of the logo image</p>
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
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<span class="text-sm font-medium text-gray-700">Show icon when no logo is set</span>
							</label>
							<p class="mt-1 text-xs text-gray-500">If site logo is not configured, show a camera icon placeholder</p>
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
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<span class="text-sm font-medium text-gray-700">Link to home</span>
							</label>
							<p class="mt-1 text-xs text-gray-500">When enabled, the site title is a link to the homepage</p>
						</div>
					</div>
				{:else if editingModule.type === 'menu'}
					<div class="space-y-4">
						<div>
							<label for="menu-orientation" class="block text-sm font-medium text-gray-700 mb-2">
								Orientation
							</label>
							<select
								id="menu-orientation"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<p class="mt-1 text-xs text-gray-500">Horizontal: items in a row. Vertical: items stacked.</p>
						</div>
					</div>
				{:else if editingModule.type === 'themeToggle'}
					<div class="space-y-4">
						<div class="text-sm text-gray-600">
							<p>Theme toggle module has no configuration options. It automatically toggles between light and dark themes.</p>
						</div>
					</div>
				{:else if editingModule.type === 'userGreeting'}
					<div class="space-y-4">
						<div>
							<label for="user-greeting-text" class="block text-sm font-medium text-gray-700 mb-2">
								Greeting Text
							</label>
							<input
								id="user-greeting-text"
								type="text"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								value={editingModule.props?.greeting || 'Hello'}
								placeholder="Hello"
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, greeting: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
							<p class="mt-1 text-xs text-gray-500">Displayed before the user's name (e.g., "Hello, John")</p>
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
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<span class="text-sm font-medium text-gray-700">Show email if name not available</span>
							</label>
						</div>
						<div>
							<label for="user-greeting-class" class="block text-sm font-medium text-gray-700 mb-2">
								CSS Classes (optional)
							</label>
							<input
								id="user-greeting-class"
								type="text"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								value={editingModule.props?.className || ''}
								placeholder="e.g., text-gray-600"
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
							<label for="auth-login-label" class="block text-sm font-medium text-gray-700 mb-2">
								Login Button Label
							</label>
							<input
								id="auth-login-label"
								type="text"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="auth-logout-label" class="block text-sm font-medium text-gray-700 mb-2">
								Logout Button Label
							</label>
							<input
								id="auth-logout-label"
								type="text"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="auth-login-url" class="block text-sm font-medium text-gray-700 mb-2">
								Login URL
							</label>
							<input
								id="auth-login-url"
								type="text"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="auth-container-class" class="block text-sm font-medium text-gray-700 mb-2">
								Container CSS Classes (optional)
							</label>
							<input
								id="auth-container-class"
								type="text"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
						<div class="text-sm text-gray-600 mb-4">
							<p>Social media links are pulled from site configuration by default. You can override them here if needed.</p>
						</div>
						<div>
							<label for="social-facebook" class="block text-sm font-medium text-gray-700 mb-2">
								Facebook URL (optional override)
							</label>
							<input
								id="social-facebook"
								type="url"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="social-instagram" class="block text-sm font-medium text-gray-700 mb-2">
								Instagram URL (optional override)
							</label>
							<input
								id="social-instagram"
								type="url"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="social-twitter" class="block text-sm font-medium text-gray-700 mb-2">
								Twitter URL (optional override)
							</label>
							<input
								id="social-twitter"
								type="url"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="social-linkedin" class="block text-sm font-medium text-gray-700 mb-2">
								LinkedIn URL (optional override)
							</label>
							<input
								id="social-linkedin"
								type="url"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="social-icon-size" class="block text-sm font-medium text-gray-700 mb-2">
								Icon Size
							</label>
							<select
								id="social-icon-size"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="social-icon-color" class="block text-sm font-medium text-gray-700 mb-2">
								Icon Color
							</label>
							<input
								id="social-icon-color"
								type="text"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								value={editingModule.props?.iconColor || 'current'}
								placeholder="current, gray-600, #000000, etc."
								on:input={(e) => {
									editingModule = {
										...editingModule,
										props: { ...editingModule.props, iconColor: (e.currentTarget as HTMLInputElement).value }
									};
								}}
							/>
							<p class="mt-1 text-xs text-gray-500">CSS color or Tailwind color class (e.g., current, gray-600, blue-500)</p>
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
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<span class="text-sm font-medium text-gray-700">Show Labels</span>
							</label>
						</div>
						<div>
							<label for="social-orientation" class="block text-sm font-medium text-gray-700 mb-2">
								Orientation
							</label>
							<select
								id="social-orientation"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="social-align" class="block text-sm font-medium text-gray-700 mb-2">
								Alignment
							</label>
							<select
								id="social-align"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="social-gap" class="block text-sm font-medium text-gray-700 mb-2">
								Gap Size
							</label>
							<select
								id="social-gap"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
							<label for="social-class" class="block text-sm font-medium text-gray-700 mb-2">
								CSS Classes (optional)
							</label>
							<input
								id="social-class"
								type="text"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="override-blog-category-title" class="block text-sm font-medium text-gray-700 mb-2">
								Section title (optional)
							</label>
							<MultiLangInput id="override-blog-category-title" bind:value={editingModule.props.title} />
						</div>
						<div>
							<label for="override-blog-category-alias" class="block text-sm font-medium text-gray-700 mb-2">
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
							<p class="mt-1 text-xs text-gray-500">
								Leave empty to list every active blog category (up to max items).
							</p>
						</div>
						<div>
							<label for="override-blog-category-layout" class="block text-sm font-medium text-gray-700 mb-2">
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
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
								<span class="text-sm font-medium text-gray-700">Show article counts</span>
							</label>
							<p class="mt-1 text-xs text-gray-500">Requires an extra aggregation on the server.</p>
						</div>
						<div>
							<label for="override-blog-category-max" class="block text-sm font-medium text-gray-700 mb-2">
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
							<label for="override-blog-category-sort" class="block text-sm font-medium text-gray-700 mb-2">
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
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
								<span class="text-sm font-medium text-gray-700">Link each category to the article list</span>
							</label>
							<p class="mt-1 text-xs text-gray-500">Uses the path below with <code class="text-xs">?category=</code> alias.</p>
						</div>
						<div>
							<label for="override-blog-articles-path" class="block text-sm font-medium text-gray-700 mb-2">
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
					<div class="text-sm text-gray-600">
						<p>Module-specific configuration options coming soon.</p>
					</div>
				{/if}
			</div>
			<div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
				<button
					type="button"
					on:click={() => editingModule = null}
					class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={saveModuleChanges}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
				>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}

