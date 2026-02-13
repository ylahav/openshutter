<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';
	import { handleAuthError } from '$lib/utils/auth-error-handler';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import ThemeBuilderPreview from '$lib/components/ThemeBuilderPreview.svelte';
	import { PAGE_MODULE_TYPES } from '$lib/page-builder/module-types';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import type { PageData } from './$types';
	import type { MultiLangText, MultiLangHTML } from '$lib/types/multi-lang';

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
		fonts: {
			heading: string;
			body: string;
		};
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
	// Multi-select like page builder: Set of "row:col" keys
	let selectedCells = new Set<string>();
	// Reactive: recalc when page type or pageLayout changes
	$: pageGrid = (() => {
		const layout = localOverrides?.pageLayout?.[editingPageType];
		return {
			gridRows: layout?.gridRows ?? 3,
			gridColumns: layout?.gridColumns ?? 1
		};
	})();

	// Local overrides state
	let localOverrides: {
		customColors?: Record<string, string>;
		customFonts?: Record<string, string>;
		customLayout?: Record<string, string>;
		componentVisibility?: Record<string, boolean>;
		headerConfig?: Record<string, any>;
		pageModules?: Record<string, any[]>;
		pageLayout?: Record<string, { gridRows: number; gridColumns: number }>;
	} = {};

	let editingTheme: { _id: string; name?: string; baseTemplate: string; customColors?: Record<string, string>; customFonts?: Record<string, string>; customLayout?: Record<string, string>; componentVisibility?: Record<string, boolean>; headerConfig?: Record<string, unknown>; pageModules?: Record<string, any[]>; pageLayout?: Record<string, { gridRows: number; gridColumns: number }> } | null = null;
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

	onMount(async () => {
		await siteConfig.load();
		if (themeId) {
			await loadTheme(themeId);
		}
		await loadTemplates();
		initializeLocalOverrides();
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

	import { DEFAULT_PAGE_LAYOUTS, DEFAULT_PAGE_MODULES } from '$lib/constants/default-page-layouts';

	function initializeLocalOverrides() {
		if (editingTheme) {
			const migrated = migratePageModules(editingTheme.pageModules);
			logger.debug('[Overrides] Loading theme pageModules:', {
				raw: editingTheme.pageModules,
				migrated: migrated,
				homeModules: migrated.home,
				firstHomeModule: migrated.home?.[0],
				firstHomeModuleProps: migrated.home?.[0]?.props
			});
			// Merge with defaults if pageModules/pageLayout are empty
			const pageModules = Object.keys(migrated).length > 0 ? migrated : DEFAULT_PAGE_MODULES;
			const pageLayout = editingTheme.pageLayout && Object.keys(editingTheme.pageLayout).length > 0
				? JSON.parse(JSON.stringify(editingTheme.pageLayout))
				: DEFAULT_PAGE_LAYOUTS;
			localOverrides = {
				customColors: editingTheme.customColors ? { ...editingTheme.customColors } : {},
				customFonts: editingTheme.customFonts ? { ...editingTheme.customFonts } : {},
				customLayout: editingTheme.customLayout ? { ...editingTheme.customLayout } : {},
				componentVisibility: editingTheme.componentVisibility ? { ...editingTheme.componentVisibility } : {},
				headerConfig: editingTheme.headerConfig ? { ...editingTheme.headerConfig } : {},
				pageModules,
				pageLayout
			};
		} else {
			localOverrides = {
				customColors: siteTemplateOverrides.customColors ? { ...siteTemplateOverrides.customColors } : {},
				customFonts: siteTemplateOverrides.customFonts ? { ...siteTemplateOverrides.customFonts } : {},
				customLayout: siteTemplateOverrides.customLayout ? { ...siteTemplateOverrides.customLayout } : {},
				componentVisibility: siteTemplateOverrides.componentVisibility ? { ...siteTemplateOverrides.componentVisibility } : {},
				headerConfig: siteTemplateOverrides.headerConfig ? { ...siteTemplateOverrides.headerConfig } : {},
				pageModules: DEFAULT_PAGE_MODULES,
				pageLayout: DEFAULT_PAGE_LAYOUTS
			};
		}
		logger.debug('[Overrides] Initialized local overrides:', { 
			editingTheme: !!editingTheme,
			pageModulesKeys: Object.keys(localOverrides.pageModules || {}),
			homeModulesCount: localOverrides.pageModules?.home?.length || 0
		});
	}

	// Use same module types as page builder / PageRenderer
	const PAGE_CONTENT_MODULES = PAGE_MODULE_TYPES.filter((m) =>
		['hero', 'richText', 'featureGrid', 'albumsGrid', 'albumGallery', 'cta'].includes(m.type)
	);
	const HEADER_MODULES = PAGE_MODULE_TYPES.filter((m) =>
		['logo', 'siteTitle', 'menu', 'languageSelector', 'themeToggle', 'userGreeting', 'authButtons', 'socialMedia'].includes(m.type)
	);
	const FOOTER_MODULES = PAGE_MODULE_TYPES.filter((m) =>
		['richText', 'cta', 'socialMedia'].includes(m.type)
	);

	function migratePageModules(pm: Record<string, any[]> | undefined): Record<string, any[]> {
		if (!pm) return {};
		const out: Record<string, any[]> = {};
		for (const [pt, arr] of Object.entries(pm)) {
			out[pt] = arr.map((m, i) => {
				if (m.rowOrder !== undefined && m.columnIndex !== undefined) return m;
				return { ...m, rowOrder: i, columnIndex: 0 };
			});
		}
		return out;
	}

	function getModulesForPageType(pt: string) {
		const modules = localOverrides.pageModules?.[pt];
		if (modules && modules.length > 0) {
			return modules;
		}
		// Fall back to defaults
		return DEFAULT_PAGE_MODULES[pt] || [];
	}

	function getGridForPageType(pt: string): { gridRows: number; gridColumns: number } {
		const layout = localOverrides.pageLayout?.[pt];
		if (layout?.gridRows && layout?.gridColumns) {
			return { gridRows: layout.gridRows, gridColumns: layout.gridColumns };
		}
		// Fall back to defaults
		return DEFAULT_PAGE_LAYOUTS[pt] || { gridRows: 3, gridColumns: 1 };
	}

	function updateGridForPageType(pt: string, gridRows?: number, gridColumns?: number) {
		const pl = localOverrides.pageLayout ?? {};
		const current = getGridForPageType(pt);
		const next = {
			gridRows: gridRows ?? current.gridRows,
			gridColumns: gridColumns ?? current.gridColumns
		};
		if (next.gridRows < 1) next.gridRows = 1;
		if (next.gridRows > 20) next.gridRows = 20;
		if (next.gridColumns < 1) next.gridColumns = 1;
		if (next.gridColumns > 20) next.gridColumns = 20;
		// Remove modules that fall outside the new grid (including span)
		const arr = localOverrides.pageModules?.[pt] ?? [];
		const keep = arr.filter((m) => {
			const r = m.rowOrder ?? 0;
			const c = m.columnIndex ?? 0;
			const rs = m.rowSpan ?? 1;
			const cs = m.colSpan ?? 1;
			return r >= 0 && c >= 0 && r + rs <= next.gridRows && c + cs <= next.gridColumns;
		});
		localOverrides = {
			...localOverrides,
			pageLayout: { ...pl, [pt]: next },
			pageModules: { ...localOverrides.pageModules, [pt]: keep }
		};
		hasChanges = true;
	}

	function getModuleAtCell(pt: string, row: number, col: number) {
		const arr = getModulesForPageType(pt);
		return arr.find((m) => (m.rowOrder ?? 0) === row && (m.columnIndex ?? 0) === col);
	}

	/** Check if cell (r,c) is covered by a module span but not the origin */
	function isCellCovered(pt: string, r: number, c: number) {
		for (const m of getModulesForPageType(pt)) {
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
		const grid = getGridForPageType(editingPageType);
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
		const idx = getModulesForPageType(editingPageType).findIndex((m) => m._id === editingModule._id);
		if (idx >= 0) {
			const arr = localOverrides.pageModules?.[editingPageType] ?? [];
			const updated = [...arr];
			updated[idx] = { ...editingModule };
			localOverrides = {
				...localOverrides,
				pageModules: { ...localOverrides.pageModules, [editingPageType]: updated }
			};
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
		const grid = getGridForPageType(pageType);
		const pl = localOverrides.pageLayout ?? {};
		const pm = localOverrides.pageModules ?? {};
		const arr = pm[pageType] ?? [];
		
		// Ensure pageLayout exists for this page type when adding first module
		const updatedPageLayout = !pl[pageType] 
			? { ...pl, [pageType]: { gridRows: grid.gridRows, gridColumns: grid.gridColumns } }
			: pl;
		
		// If no position given, find first empty cell or append
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
		
		// Update both pageLayout and pageModules in one operation
		localOverrides = {
			...localOverrides,
			pageLayout: updatedPageLayout,
			pageModules: { ...pm, [pageType]: [...arr, newMod] }
		};
		hasChanges = true;
		logger.debug('[Overrides] Added module:', { pageType, moduleType, rowOrder: r, columnIndex: c, rowSpan, colSpan });
	}

	function removeModuleFromPage(pageType: string, index: number) {
		const arr = localOverrides.pageModules?.[pageType];
		if (!arr) return;
		localOverrides = { ...localOverrides, pageModules: { ...localOverrides.pageModules, [pageType]: arr.filter((_, i) => i !== index) } };
		hasChanges = true;
	}

	function removeModuleFromCell(pageType: string, row: number, col: number) {
		const arr = localOverrides.pageModules?.[pageType];
		if (!arr) return;
		localOverrides = { ...localOverrides, pageModules: { ...localOverrides.pageModules, [pageType]: arr.filter((m) => (m.rowOrder ?? 0) !== row || (m.columnIndex ?? 0) !== col) } };
		hasChanges = true;
	}

	function replaceModuleInCell(pageType: string, row: number, col: number, newType: string) {
		const arr = localOverrides.pageModules?.[pageType];
		if (!arr) return;
		const idx = arr.findIndex((m) => (m.rowOrder ?? 0) === row && (m.columnIndex ?? 0) === col);
		if (idx < 0) return;
		const old = arr[idx];
		const defaultProps: Record<string, any> = {};
		if (newType === 'albumsGrid' || newType === 'albumGallery') {
			defaultProps.albumSource = old.props?.albumSource ?? 'root';
		}
		const updated = [...arr];
		updated[idx] = { ...old, type: newType, props: defaultProps };
		localOverrides = { ...localOverrides, pageModules: { ...localOverrides.pageModules, [pageType]: updated } };
		hasChanges = true;
	}

	function moveModule(pageType: string, index: number, direction: number) {
		const arr = localOverrides.pageModules?.[pageType];
		if (!arr || index + direction < 0 || index + direction >= arr.length) return;
		const next = index + direction;
		const copy = [...arr];
		[copy[index], copy[next]] = [copy[next], copy[index]];
		localOverrides = { ...localOverrides, pageModules: { ...localOverrides.pageModules, [pageType]: copy } };
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
		const arr = localOverrides.pageModules?.[pageType];
		if (!arr || !arr[index]) return;
		const mod = arr[index];
		const newProps = { ...(mod.props ?? {}), [key]: value };
		const updated = [...arr];
		updated[index] = { ...mod, props: newProps };
		localOverrides = { ...localOverrides, pageModules: { ...localOverrides.pageModules, [pageType]: updated } };
		hasChanges = true;
	}

	function applyDefaultLayout(pageType: string) {
		const pm = localOverrides.pageModules ?? {};
		const pl = localOverrides.pageLayout ?? {};
		const defaultModules = DEFAULT_PAGE_MODULES[pageType] || [];
		const defaultLayout = DEFAULT_PAGE_LAYOUTS[pageType] || { gridRows: 3, gridColumns: 1 };
		localOverrides = {
			...localOverrides,
			pageModules: { ...pm, [pageType]: [...defaultModules] },
			pageLayout: { ...pl, [pageType]: { ...defaultLayout } }
		};
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

	function updateFont(fontType: string, value: string) {
		if (!localOverrides.customFonts) {
			localOverrides.customFonts = {};
		}
		localOverrides.customFonts[fontType] = value;
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function updateLayout(layoutType: string, value: string) {
		if (!localOverrides.customLayout) {
			localOverrides.customLayout = {};
		}
		localOverrides.customLayout[layoutType] = value;
		localOverrides = { ...localOverrides };
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
		primary: localOverrides.customColors?.primary || activeTemplate?.colors?.primary || '#000000',
		secondary: localOverrides.customColors?.secondary || activeTemplate?.colors?.secondary || '#000000',
		accent: localOverrides.customColors?.accent || activeTemplate?.colors?.accent || '#000000',
		background: localOverrides.customColors?.background || activeTemplate?.colors?.background || '#000000',
		text: localOverrides.customColors?.text || activeTemplate?.colors?.text || '#000000',
		muted: localOverrides.customColors?.muted || activeTemplate?.colors?.muted || '#000000'
	};

	function getEffectiveColor(colorType: string): string {
		return colorValues[colorType] || localOverrides.customColors?.[colorType] || activeTemplate?.colors?.[colorType as keyof typeof activeTemplate.colors] || '#000000';
	}

	function getEffectiveFont(fontType: string): string {
		return localOverrides.customFonts?.[fontType] || activeTemplate?.fonts[fontType] || 'Inter';
	}

	function getEffectiveLayout(layoutType: string): string {
		return localOverrides.customLayout?.[layoutType] || activeTemplate?.layout[layoutType] || '';
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
		fonts: { heading: getEffectiveFont('heading'), body: getEffectiveFont('body') },
		layout: {
			maxWidth: getEffectiveLayout('maxWidth') || '1200px',
			containerPadding: getEffectiveLayout('containerPadding') || '1rem',
			gridGap: getEffectiveLayout('gridGap') || '1.5rem'
		}
	} : null;

	function hasOverrides(): boolean {
		const hasPageModules = localOverrides.pageModules && Object.keys(localOverrides.pageModules).some(
			(k) => (localOverrides.pageModules![k]?.length ?? 0) > 0
		);
		const hasPageLayout = localOverrides.pageLayout && Object.keys(localOverrides.pageLayout).length > 0;
		return !!(
			(localOverrides.customColors && Object.keys(localOverrides.customColors).length > 0) ||
			(localOverrides.customFonts && Object.keys(localOverrides.customFonts).length > 0) ||
			(localOverrides.customLayout && Object.keys(localOverrides.customLayout).length > 0) ||
			(localOverrides.componentVisibility && Object.keys(localOverrides.componentVisibility).length > 0) ||
			(localOverrides.headerConfig && Object.keys(localOverrides.headerConfig).length > 0) ||
			hasPageModules ||
			hasPageLayout
		);
	}

	async function saveOverrides() {
		saving = true;
		message = '';
		error = '';

		try {
			const payload = {
				customColors: localOverrides.customColors || {},
				customFonts: localOverrides.customFonts || {},
				customLayout: localOverrides.customLayout || {},
				componentVisibility: localOverrides.componentVisibility || {},
				headerConfig: localOverrides.headerConfig || {},
				pageModules: localOverrides.pageModules || {},
				pageLayout: localOverrides.pageLayout || {}
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
				editingTheme = result.data || result;
				
				// If this theme is currently active, also update siteConfig
				const isActiveTheme = editingTheme.baseTemplate === ($siteConfigData?.template?.frontendTemplate || $siteConfigData?.template?.activeTemplate);
				if (isActiveTheme) {
					const templateData: any = {
						activeTemplate: editingTheme.baseTemplate,
						frontendTemplate: editingTheme.baseTemplate,
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
	<title>Theme Builder - Admin</title>
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
						← Back to {themeId ? 'Themes' : 'Templates'}
					</a>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Theme Builder</h1>
						<p class="text-gray-600 mt-1">
							{themeId && editingTheme
								? `Editing theme: ${editingTheme.name || 'Theme'}`
								: `Customize your active template: ${activeTemplate?.displayName || currentTemplateName}`}
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
							Cancel
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
								Resetting...
							{:else}
								Reset to Default
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
							Saving...
						{:else}
							Save Changes
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
					This template has custom overrides applied. Changes will be merged with the base template
					configuration.
				</div>
			{/if}

			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading template overrides...</p>
				</div>
			{:else if !activeTemplate}
				<div class="text-center py-8">
					<p class="text-gray-600">No active template found.</p>
				</div>
			{:else}
				<!-- Base palette presets -->
				<div class="mb-6">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Base palette</h3>
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
								{key === 'highContrast' ? 'High contrast' : key.charAt(0).toUpperCase() + key.slice(1)}
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
					<div class="space-y-6">
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
								<div class="border border-gray-200 rounded-lg p-4 bg-white">
									<label class="block text-sm font-medium text-gray-900 mb-2">
										{colorInfo.label}
									</label>
									<p class="text-xs text-gray-600 mb-3">
										{colorInfo.description}
									</p>
									<div class="flex gap-2">
										<input
											type="color"
											value={colorValues[colorInfo.type] || getEffectiveColor(colorInfo.type)}
											on:input={(e) => updateColor(colorInfo.type, (e.target as HTMLInputElement).value)}
											class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
										/>
										<input
											type="text"
											value={colorValues[colorInfo.type] || getEffectiveColor(colorInfo.type)}
											on:input={(e) => updateColor(colorInfo.type, (e.target as HTMLInputElement).value)}
											placeholder="#000000"
											class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>
									<p class="mt-2 text-xs text-gray-500">
										Default: {activeTemplate.colors[colorInfo.type]}
									</p>
								</div>
							{/each}
						</div>
					</div>
				{:else if activeTab === 'fonts'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900">Font Customization</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Heading Font
								</label>
								<input
									type="text"
									value={getEffectiveFont('heading')}
									on:input={(e) => updateFont('heading', e.target.value)}
									placeholder="Inter"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">Default: {activeTemplate.fonts.heading}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Body Font
								</label>
								<input
									type="text"
									value={getEffectiveFont('body')}
									on:input={(e) => updateFont('body', e.target.value)}
									placeholder="Inter"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">Default: {activeTemplate.fonts.body}</p>
							</div>
						</div>
					</div>
				{:else if activeTab === 'layout'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900">Layout Customization</h2>
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Max Width
								</label>
								<input
									type="text"
									value={getEffectiveLayout('maxWidth')}
									on:input={(e) => updateLayout('maxWidth', e.target.value)}
									placeholder="1200px"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">Default: {activeTemplate.layout.maxWidth}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Container Padding
								</label>
								<input
									type="text"
									value={getEffectiveLayout('containerPadding')}
									on:input={(e) => updateLayout('containerPadding', e.target.value)}
									placeholder="1rem"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">
									Default: {activeTemplate.layout.containerPadding}
								</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Grid Gap
								</label>
								<input
									type="text"
									value={getEffectiveLayout('gridGap')}
									on:input={(e) => updateLayout('gridGap', e.target.value)}
									placeholder="1.5rem"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">Default: {activeTemplate.layout.gridGap}</p>
							</div>
						</div>
					</div>
				{:else if activeTab === 'pages'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900">Page structure</h2>
						<p class="text-sm text-gray-600">
							Select cells in the grid and assign modules to them. Grid: {pageGrid.gridRows} row{pageGrid.gridRows !== 1 ? 's' : ''} × {pageGrid.gridColumns} column{pageGrid.gridColumns !== 1 ? 's' : ''}
						</p>
						<div class="flex flex-wrap gap-2 mb-4">
							{#each ['home', 'gallery', 'album', 'search', 'header', 'footer'] as pt}
								<button
									type="button"
									on:click={() => { editingPageType = pt as typeof editingPageType; selectedCells = new Set(); assignedModuleType = ''; editingModule = null; }}
									class="px-3 py-2 text-sm rounded font-medium {editingPageType === pt
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
								>
									{pt.charAt(0).toUpperCase() + pt.slice(1)}
								</button>
							{/each}
						</div>

						{#key editingPageType}
						<!-- Grid configuration (like template builder) -->
						<div class="bg-gray-50 p-4 rounded-lg">
							<h3 class="text-sm font-semibold text-gray-900 mb-3">Grid configuration</h3>
							<div class="grid grid-cols-2 gap-4 max-w-xs">
								<div>
									<label for="grid-rows" class="block text-sm font-medium text-gray-700 mb-1">Rows</label>
									<input
										id="grid-rows"
										type="number"
										min="1"
										max="20"
										value={pageGrid.gridRows}
										on:input={(e) => updateGridForPageType(editingPageType, parseInt((e.target as HTMLInputElement).value) || 1, undefined)}
										class="w-full px-3 py-2 border border-gray-300 rounded-md"
									/>
								</div>
								<div>
									<label for="grid-cols" class="block text-sm font-medium text-gray-700 mb-1">Columns</label>
									<input
										id="grid-cols"
										type="number"
										min="1"
										max="20"
										value={pageGrid.gridColumns}
										on:input={(e) => updateGridForPageType(editingPageType, undefined, parseInt((e.target as HTMLInputElement).value) || 1)}
										class="w-full px-3 py-2 border border-gray-300 rounded-md"
									/>
								</div>
							</div>
							{#if editingPageType === 'home' && getModulesForPageType(editingPageType).length === 0}
								<button
									type="button"
									on:click={() => applyDefaultLayout(editingPageType)}
									class="mt-3 text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
								>
									Use default (2 rows × 1 col: Hero + Albums Grid)
								</button>
							{/if}
						</div>

						{#key pageGrid.gridRows + '-' + pageGrid.gridColumns + '-' + getModulesForPageType(editingPageType).length}
						<!-- Layout grid (like page builder: select cells, assign module) -->
						<div>
							<h3 class="text-sm font-semibold text-gray-900 mb-3">Layout grid</h3>
							<div
								class="gap-2 border-2 border-gray-300 p-2 bg-white select-none rounded-lg"
								style="display: grid; grid-template-columns: repeat({pageGrid.gridColumns}, 1fr); grid-template-rows: repeat({pageGrid.gridRows}, minmax(80px, auto));"
							>
								{#each getModulesForPageType(editingPageType) as mod (mod._id)}
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
									pageModules={getModulesForPageType(previewPageType)}
									pageLayout={getGridForPageType(previewPageType)}
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
										props: { ...editingModule.props, background: (e.currentTarget as HTMLSelectElement).value as 'white' | 'gray' }
									};
								}}
							>
								<option value="white">White</option>
								<option value="gray">Gray</option>
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

