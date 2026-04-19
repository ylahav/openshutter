<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$stores/i18n';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import RowColumnLayoutBuilder from '$lib/page-builder/RowColumnLayoutBuilder.svelte';
	import IconSelector from '$lib/components/IconSelector.svelte';
	import type { MultiLangText, MultiLangHTML } from '$lib/types/multi-lang';
	import { AVAILABLE_ICON_NAMES } from '$lib/icons';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { useCrudLoader } from '$lib/composables/useCrudLoader';
	import { useCrudOperations } from '$lib/composables/useCrudOperations';
	import { useDialogManager } from '$lib/composables/useDialogManager';
	import { normalizeMultiLangText } from '$lib/utils/multiLangHelpers';
	import type { PageData } from './$types';
	import type { PageModuleData } from '$lib/types/page-builder';
	import type { Page } from './types';
	import PageFilters from './components/PageFilters.svelte';
	import PageList from './components/PageList.svelte';

	// Available icon names from icons.ts (sorted)
	const AVAILABLE_ICONS: string[] = [...AVAILABLE_ICON_NAMES].sort();

	// svelte-ignore export_let_unused - Required by SvelteKit page component
	export let data: PageData;

	// Module payload types
	interface ModulePayload {
		type: string;
		props: Record<string, unknown>;
		zone?: string;
		order?: number;
		rowOrder?: number;
		columnIndex?: number;
		columnProportion?: number;
		rowSpan?: number;
		colSpan?: number;
	}

	interface FeatureGridProps {
		title: MultiLangText;
		subtitle: MultiLangText;
		features: Array<{
			icon: string;
			title: MultiLangText;
			description: MultiLangHTML;
		}>;
	}

	interface RichTextProps {
		title: MultiLangText;
		body: MultiLangHTML;
		background: 'white' | 'gray';
	}

	interface HeroProps {
		title?: MultiLangText;
		subtitle?: MultiLangText;
		/** When false, hero does not render the CTA button. */
		showCta?: boolean;
		ctaLabel?: MultiLangText;
		ctaUrl?: string;
		backgroundStyle?: 'light' | 'dark' | 'image' | 'galleryLeading';
		backgroundImage?: string;
	}

	interface AlbumsGridProps {
		title: MultiLangText;
		description: MultiLangHTML;
		selectedAlbums: string[];
		/** Matches page-builder AlbumGallery: `row` = thumbnail left, details right. */
		albumCardLayout?: 'stack' | 'row';
	}

	interface MenuEditorItem {
		label?: string;
		labelKey?: string;
		href: string;
		type?: 'link' | 'login' | 'logout';
		showWhen?: 'always' | 'loggedIn' | 'loggedOut';
		external?: boolean;
	}

	interface MenuInstanceConfig {
		orientation?: 'horizontal' | 'vertical';
		showAuthButtons?: boolean;
		items?: MenuEditorItem[];
		itemClass?: string;
		activeItemClass?: string;
		containerClass?: string;
		separator?: string | boolean;
		showActiveIndicator?: boolean;
	}

	interface AlbumHierarchyNode {
		_id: string;
		name: string | { en?: string; he?: string };
		alias: string;
		parentAlbumId: string | null;
		level: number;
		children: AlbumHierarchyNode[];
	}

	interface AlbumDropdownItem {
		_id: string;
		name: string | { en?: string; he?: string };
		alias: string;
		level: number;
	}

	const CATEGORIES = [
		{ value: 'site', label: 'Site Page' },
		{ value: 'system', label: 'System Page' }
	];

	const PAGE_ROLES = [
		{ value: '', label: 'None' },
		{ value: 'home', label: 'Home' },
		{ value: 'gallery', label: 'Gallery' },
		{ value: 'album', label: 'Album detail' },
		{ value: 'login', label: 'Login' },
		{ value: 'search', label: 'Search' },
		{ value: 'blog', label: 'Blog' },
		{ value: 'blog-category', label: 'Blog category' },
		{ value: 'blog-article', label: 'Blog article' }
	];

	const PACK_OPTIONS = [
		{ value: 'atelier', label: 'Atelier' },
		{ value: 'noir', label: 'Noir' },
		{ value: 'studio', label: 'Studio' }
	] as const;

	function normalizePagePacks(page: Pick<Page, 'frontendTemplates' | 'frontendTemplate'> | null | undefined): string[] {
		if (!page) return [];
		const arr = Array.isArray(page.frontendTemplates) ? page.frontendTemplates : [];
		const normalized = arr
			.map((p) => String(p || '').trim().toLowerCase())
			.filter((p) => p === 'atelier' || p === 'noir' || p === 'studio');
		if (normalized.length) return Array.from(new Set(normalized));
		const legacy = String(page.frontendTemplate || '').trim().toLowerCase();
		return legacy === 'atelier' || legacy === 'noir' || legacy === 'studio' ? [legacy] : [];
	}

	const MODULE_TYPES = [
		{ value: 'pageTitle', label: 'Page title' },
		{ value: 'loginForm', label: 'Login Form' },
		{ value: 'logo', label: 'Logo' },
		{ value: 'siteTitle', label: 'Site title' },
		{ value: 'menu', label: 'Menu' },
		{ value: 'languageSelector', label: 'Language selector' },
		{ value: 'themeToggle', label: 'Theme toggle' },
		{ value: 'themeSelect', label: 'Theme select' },
		{ value: 'userGreeting', label: 'User greeting' },
		{ value: 'authButtons', label: 'Auth buttons' },
		{ value: 'socialMedia', label: 'Social media' },
		{ value: 'hero', label: 'Hero' },
		{ value: 'richText', label: 'Rich Text' },
		{ value: 'divider', label: 'Horizontal line' },
		{ value: 'featureGrid', label: 'Feature Grid' },
		{ value: 'albumsGrid', label: 'Albums Grid' },
		{ value: 'layoutShell', label: 'Layout region (named grid)' },
		{ value: 'cta', label: 'Call To Action' },
		{ value: 'blogCategory', label: 'Blog categories' },
		{ value: 'blogArticle', label: 'Blog articles' }
	];

	// Use CRUD composables
	const crudLoader = useCrudLoader<Page>('/api/admin/pages', {
		searchParam: 'search',
		searchValue: () => searchTerm,
		filterParams: {
			category: () => categoryFilter,
			published: () => publishedFilter
		}
	});
		const crudOps = useCrudOperations<Page>('/api/admin/pages', {
		createSuccessMessage: 'Page created successfully!',
		updateSuccessMessage: 'Page updated successfully!',
		deleteSuccessMessage: 'Page deleted successfully!',
		transformPayload: (data: Partial<Page> & { gridRows?: number; gridColumns?: number; urlParams?: string; layoutZones?: string; routeParamsCsv?: string }) => {
			const layout: { zones: string[]; gridRows?: number; gridColumns?: number; urlParams?: string } = { zones: parseZones(data.layoutZones || 'main') };
			if (data.gridRows !== undefined) layout.gridRows = data.gridRows;
			if (data.gridColumns !== undefined) layout.gridColumns = data.gridColumns;
			if (data.urlParams) layout.urlParams = data.urlParams;
			const routeParams = String((data as any).routeParamsCsv || '')
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			const packs = (Array.isArray((data as any).frontendTemplates) ? (data as any).frontendTemplates : [])
				.map((p: unknown) => String(p || '').trim().toLowerCase())
				.filter((p: string) => p === 'atelier' || p === 'noir' || p === 'studio');

			return {
				...data,
				slug: data.alias,
				pageRole: data.pageRole || undefined,
				parentPageId: data.parentPageId || null,
				frontendTemplates: packs,
				frontendTemplate: packs[0] || '',
				routeParams,
				layout
			};
		},
		onCreateSuccess: async (newPage) => {
			// Save modules after page is created
			if (pendingModules.length > 0 && newPage?._id) {
				try {
					for (const module of pendingModules) {
						const payload: Record<string, unknown> = {
							type: module.type,
							rowOrder: module.rowOrder,
							columnIndex: module.columnIndex,
							columnProportion: module.columnProportion || 1,
							props: module.props || {}
						};
						if (module.rowSpan && module.rowSpan > 1) payload.rowSpan = module.rowSpan;
						if (module.colSpan && module.colSpan > 1) payload.colSpan = module.colSpan;
						
						const response = await fetch(`/api/admin/pages/${newPage._id}/modules`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(payload)
						});
						
						if (!response.ok) {
							await handleApiErrorResponse(response);
						}
					}
				} catch (err) {
					logger.error('Error saving modules after page creation:', handleError(err, 'Failed to save module'));
					// Don't fail the page creation if modules fail
				}
			}
			
			pendingModules = [];
			crudLoader.items.update(items => [...items, newPage]);
			dialogs.closeAll();
			resetForm();
		},
		onUpdateSuccess: (updatedPage) => {
			const currentEditingPage = editingPage;
			if (currentEditingPage) {
				crudLoader.items.update(items => 
					items.map(p => p._id === currentEditingPage._id ? updatedPage : p)
				);
			}
			dialogs.closeAll();
			editingPage = null;
			resetForm();
		},
		onDeleteSuccess: () => {
			const currentPageToDelete = pageToDelete;
			if (currentPageToDelete) {
				crudLoader.items.update(items => 
					items.filter(p => p._id !== currentPageToDelete._id)
				);
			}
			dialogs.closeAll();
			pageToDelete = null;
		}
	});
	const dialogs = useDialogManager();

	// Reactive stores from composables
	let pages: Page[] = [];
	let loading = false;
	let saving = false;
	let message = '';
	let error = '';
	let searchTerm = '';
	let categoryFilter = 'all';
	let publishedFilter = 'all';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let showDuplicateDialog = false;
	let editingPage: Page | null = null;
	let pageToDelete: Page | null = null;
	let pageToDuplicate: Page | null = null;
	let duplicateTargetPacks: string[] = [];
	let duplicateAliasOverride = '';

	// Subscribe to stores
	crudLoader.items.subscribe(value => pages = value);
	crudLoader.loading.subscribe(value => loading = value);
	crudLoader.error.subscribe(value => {
		if (value) error = value;
	});
	crudOps.saving.subscribe(value => saving = value);
	crudOps.error.subscribe(value => {
		if (value) error = value;
	});
	crudOps.message.subscribe(value => message = value);
	dialogs.showCreate.subscribe(value => showCreateDialog = value);
	dialogs.showEdit.subscribe(value => showEditDialog = value);
	dialogs.showDelete.subscribe(value => showDeleteDialog = value);
	let modules: PageModuleData[] = [];
	let modulesLoading = false;
	let modulesError = '';
	let pendingModules: PageModuleData[] = []; // Modules to save after page creation
	let moduleForm = {
		id: '',
		type: 'hero',
		zone: 'main',
		order: 0,
		propsJson: '{}'
	};

	// Form state
	let formData = {
		title: { en: '', he: '' } as MultiLangText,
		subtitle: { en: '', he: '' } as MultiLangText,
		alias: '',
		pageRole: '' as '' | 'home' | 'gallery' | 'login' | 'search' | 'blog' | 'album' | 'blog-category' | 'blog-article',
		parentPageId: '',
		routeParamsCsv: '',
		leadingImage: '',
		frontendTemplate: '' as '' | 'noir' | 'studio' | 'atelier',
		frontendTemplates: [] as string[],
		category: 'site' as 'system' | 'site',
		isPublished: false,
		layoutZones: 'main',
		gridRows: 1,
		gridColumns: 1,
		urlParams: ''
	};
	
	// Grid builder state
	let showGridBuilder = false;
	let gridInitialized = false;
	let layoutShellInstances: Record<string, { gridRows?: number; gridColumns?: number; modules?: unknown[] }> = {};
	let menuInstances: Record<string, MenuInstanceConfig> = {};

	onMount(async () => {
		await Promise.all([crudLoader.loadItems(), loadAlbums(), loadBlogCategories(), loadLayoutPresetNames()]);
	});

	async function loadLayoutPresetNames() {
		try {
			const siteConfigRes = await fetch('/api/admin/site-config', { credentials: 'include' });
			if (siteConfigRes.ok) {
				const siteCfg = await siteConfigRes.json();
				const template = ((siteCfg?.template || siteCfg?.data?.template) || {}) as Record<string, unknown>;
				const siteInstances = (template.layoutShellInstances || template.layoutPresets || {}) as Record<
					string,
					{ gridRows?: number; gridColumns?: number; modules?: unknown[] }
				>;
				layoutShellInstances = { ...siteInstances };
				const siteMenuInstances = (template.menuInstances || {}) as Record<string, MenuInstanceConfig>;
				menuInstances = { ...siteMenuInstances };
			}

			const names = new Set<string>();
			for (const key of Object.keys(layoutShellInstances || {})) {
				const k = String(key || '').trim();
				if (k) names.add(k);
			}
			availableLayoutPresetNames = Array.from(names).sort((a, b) => a.localeCompare(b));
			availableMenuInstanceNames = Object.keys(menuInstances || {})
				.map((k) => String(k || '').trim())
				.filter(Boolean)
				.sort((a, b) => a.localeCompare(b));
		} catch (err) {
			logger.warn('Failed to load layout preset names:', err);
		}
	}

	async function loadBlogCategories() {
		try {
			const response = await fetch('/api/admin/blog-categories?limit=200&isActive=true');
			if (!response.ok) return;
			const result = await response.json();
			const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
			availableBlogCategories = rows
				.map((c: { alias?: string; title?: unknown }) => {
					const alias = String(c.alias || '').trim();
					const titleObj = c.title as MultiLangText | string | undefined;
					const title = typeof titleObj === 'string' ? titleObj : titleObj?.en || titleObj?.he || alias;
					return { alias, title };
				})
				.filter((c: { alias: string }) => Boolean(c.alias))
				.sort((a: { alias: string; title: string }, b: { alias: string; title: string }) =>
					a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
				);
		} catch (err) {
			logger.warn('Failed to load blog categories for module editor:', err);
		}
	}

	async function loadAlbums() {
		albumsLoading = true;
		try {
			const response = await fetch('/api/admin/albums');
			if (response.ok) {
				const result = await response.json();
				const albumsData = Array.isArray(result) ? result : (result.data || []);
				
				// Build hierarchy from flat list
				const albumMap = new Map<string, AlbumHierarchyNode>();
				const rootAlbums: AlbumHierarchyNode[] = [];
				
				// First pass: create album objects and map them
				for (const album of albumsData) {
					const albumObj: AlbumHierarchyNode = {
						_id: album._id,
						name: album.name,
						alias: album.alias,
						parentAlbumId: album.parentAlbumId || null,
						level: album.level || 0,
						children: []
					};
					albumMap.set(album._id, albumObj);
				}
				
				// Second pass: build tree and calculate levels
				for (const album of albumMap.values()) {
					if (album.parentAlbumId && albumMap.has(album.parentAlbumId)) {
						const parent = albumMap.get(album.parentAlbumId);
						if (parent) {
							parent.children.push(album);
							album.level = (parent.level || 0) + 1;
						}
					} else {
						rootAlbums.push(album);
						album.level = 0;
					}
				}
				
				// Flatten albums hierarchy for dropdown with proper levels
				const flattenAlbums = (items: AlbumHierarchyNode[], level = 0): AlbumDropdownItem[] => {
					let result: AlbumDropdownItem[] = [];
					for (const album of items) {
						result.push({
							_id: album._id,
							name: album.name,
							alias: album.alias,
							level: album.level !== undefined ? album.level : level
						});
						if (album.children && album.children.length > 0) {
							result = result.concat(flattenAlbums(album.children, level + 1));
						}
					}
					return result;
				};
				availableAlbums = flattenAlbums(rootAlbums);
			}
		} catch (err) {
			logger.error('Error loading albums:', err);
		} finally {
			albumsLoading = false;
		}
	}

	function getAlbumDisplayName(album: { name: string | MultiLangText; alias: string; level?: number }): string {
		if (typeof album.name === 'string') {
			return album.name;
		}
		const name = album.name as MultiLangText;
		return name.en || name.he || album.alias || '(No name)';
	}


	function resetForm() {
		formData = {
			title: { en: '', he: '' },
			subtitle: { en: '', he: '' },
			alias: '',
			pageRole: '',
			parentPageId: '',
			routeParamsCsv: '',
			leadingImage: '',
			frontendTemplate: '',
			frontendTemplates: [],
			category: 'site',
			isPublished: false,
			layoutZones: 'main',
			gridRows: 1,
			gridColumns: 1,
			urlParams: ''
		};
		showGridBuilder = false;
		gridInitialized = false;
		modules = [];
		pendingModules = [];
		rowStructure = new Map();
	}

	function openCreateDialog() {
		showDuplicateDialog = false;
		pageToDuplicate = null;
		resetForm();
		dialogs.openCreate();
		crudOps.error.set('');
		modules = [];
		modulesError = '';
		showGridBuilder = false;
		gridInitialized = false;
	}
	
	function initializeGrid() {
		if (formData.gridRows < 1 || formData.gridColumns < 1) {
			error = 'Grid dimensions must be at least 1x1';
			return;
		}
		
		// Initialize row structure with equal proportions for each column
		const newStructure = new Map<number, number[]>();
		const proportions = Array(formData.gridColumns).fill(1); // Equal proportions
		
		for (let row = 0; row < formData.gridRows; row++) {
			newStructure.set(row, proportions);
		}
		
		rowStructure = newStructure;
		showGridBuilder = true;
		gridInitialized = true;
		modules = [];
	}

	function inferGridFromModules(moduleList: PageModuleData[]): { rows: number; cols: number } {
		if (!moduleList.length) return { rows: 1, cols: 1 };
		let maxRow = 0;
		let maxCol = 0;
		for (const m of moduleList) {
			if (m.rowOrder !== undefined && m.columnIndex !== undefined) {
				const endRow = (m.rowOrder ?? 0) + (m.rowSpan ?? 1);
				const endCol = (m.columnIndex ?? 0) + (m.colSpan ?? 1);
				if (endRow > maxRow) maxRow = endRow;
				if (endCol > maxCol) maxCol = endCol;
			}
		}
		return { rows: Math.max(1, maxRow), cols: Math.max(1, maxCol) };
	}

	function openEditDialog(page: Page) {
		showDuplicateDialog = false;
		pageToDuplicate = null;
		editingPage = page;
		const titleField = typeof page.title === 'string' ? { en: page.title, he: '' } : page.title || { en: '', he: '' };
		const subtitleField = typeof page.subtitle === 'string'
			? { en: page.subtitle, he: '' }
			: page.subtitle || { en: '', he: '' };
		
		// Extract grid dimensions from layout (fallback to 1x1 if not persisted)
		const layout = page.layout || {};
		let gridRows = (layout as any).gridRows;
		let gridColumns = (layout as any).gridColumns;
		if (typeof gridRows !== 'number' || gridRows < 1) gridRows = 1;
		if (typeof gridColumns !== 'number' || gridColumns < 1) gridColumns = 1;
		const urlParams = (layout as any).urlParams || '';
		
		formData = {
			title: titleField,
			subtitle: subtitleField,
			alias: page.alias || '',
			pageRole: (page.pageRole || '') as any,
			parentPageId: page.parentPageId || '',
			routeParamsCsv: (page.routeParams || []).join(', '),
			leadingImage: page.leadingImage || '',
			frontendTemplate: (page.frontendTemplate || '') as any,
			frontendTemplates: normalizePagePacks(page),
			category: page.category || 'site',
			isPublished: page.isPublished || false,
			layoutZones: (layout.zones && layout.zones.length > 0)
				? layout.zones.join(', ')
				: 'main',
			gridRows,
			gridColumns,
			urlParams
		};
		
		// Initialize grid structure from existing modules or dimensions
		const newStructure = new Map<number, number[]>();
		const proportions = Array(gridColumns).fill(1);
		for (let row = 0; row < gridRows; row++) {
			newStructure.set(row, proportions);
		}
		rowStructure = newStructure;
		showGridBuilder = true;
		gridInitialized = true;
		
		dialogs.openEdit();
		crudOps.error.set('');
		loadModules(page._id);
		resetModuleForm();
	}

	function openDeleteDialog(page: Page) {
		showDuplicateDialog = false;
		pageToDuplicate = null;
		pageToDelete = page;
		dialogs.openDelete();
		crudOps.error.set('');
	}

	function openDuplicateDialog(page: Page) {
		dialogs.closeAll();
		showDuplicateDialog = true;
		pageToDuplicate = page;
		duplicateAliasOverride = '';
		duplicateTargetPacks = normalizePagePacks(page);
		crudOps.error.set('');
		error = '';
	}

	function closeDuplicateDialog() {
		showDuplicateDialog = false;
		pageToDuplicate = null;
	}

	async function handleDuplicatePage() {
		if (!pageToDuplicate) return;
		saving = true;
		error = '';
		crudOps.error.set('');
		try {
			const body: Record<string, unknown> = {};
			if (duplicateAliasOverride.trim()) {
				const a = duplicateAliasOverride.trim().toLowerCase();
				body.alias = a;
				body.slug = a;
			}
			const src = normalizePagePacks(pageToDuplicate);
			const tgt = Array.from(new Set(duplicateTargetPacks.map((p) => String(p || '').trim().toLowerCase())
				.filter((p) => p === 'atelier' || p === 'noir' || p === 'studio')));
			if (pageToDuplicate.pageRole || src.join(',') !== tgt.join(',')) {
				body.frontendTemplates = tgt;
			}
			const res = await fetch(`/api/admin/pages/${pageToDuplicate._id}/duplicate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				await handleApiErrorResponse(res);
			}
			closeDuplicateDialog();
			await crudLoader.loadItems();
			message = 'Page duplicated successfully.';
		} catch (err) {
			error = handleError(err, 'Duplicate failed');
			logger.error(error);
		} finally {
			saving = false;
		}
	}

	function getPageTitle(page: Page): string {
		const titleField = typeof page.title === 'string' ? page.title : page.title;
		if (typeof titleField === 'string') return titleField;
		return titleField?.en || titleField?.he || page.alias || '(No title)';
	}

	function parseZones(value: string): string[] {
		return value
			.split(',')
			.map((zone) => zone.trim())
			.filter(Boolean);
	}

	async function loadModules(pageId: string) {
		modulesLoading = true;
		modulesError = '';
		try {
			const response = await fetch(`/api/admin/pages/${pageId}/modules`);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			modules = Array.isArray(result.data) ? (result.data as PageModuleData[]) : [];
			
			// If editing and layout had no grid dimensions (1x1), infer from modules and update form + structure
			const layout = editingPage?.layout || {};
			const hadGridDims = typeof (layout as any).gridRows === 'number' && (layout as any).gridRows > 1
				|| typeof (layout as any).gridColumns === 'number' && (layout as any).gridColumns > 1;
			if (editingPage && !hadGridDims && modules.length > 0) {
				const { rows, cols } = inferGridFromModules(modules);
				formData.gridRows = rows;
				formData.gridColumns = cols;
				// Rebuild rowStructure with inferred dimensions
				const newStructure = new Map<number, number[]>();
				const proportions = Array(cols).fill(1);
				for (let r = 0; r < rows; r++) {
					newStructure.set(r, proportions);
				}
				rowStructure = newStructure;
			} else {
				// Populate rowStructure from loaded modules (original logic)
				const newStructure = new Map<number, number[]>();
				modules.forEach((module) => {
					if (module.rowOrder !== undefined && module.columnProportion !== undefined) {
						if (!newStructure.has(module.rowOrder)) {
							const rowModules = modules.filter((m) => m.rowOrder === module.rowOrder);
							const proportions = rowModules
								.sort((a, b) => (a.columnIndex || 0) - (b.columnIndex || 0))
								.map((m) => m.columnProportion || 1);
							newStructure.set(module.rowOrder, proportions);
						}
					}
				});
				rowStructure.forEach((proportions, rowOrder) => {
					if (!newStructure.has(rowOrder)) {
						newStructure.set(rowOrder, proportions);
					}
				});
				rowStructure = newStructure;
			}
		} catch (err) {
			logger.error('Error loading modules:', err);
			modulesError = handleError(err, 'Failed to load modules');
		} finally {
			modulesLoading = false;
		}
	}

	function resetModuleForm() {
		moduleForm = {
			id: '',
			type: 'hero',
			zone: parseZones(formData.layoutZones)[0] || 'main',
			order: 0,
			propsJson: '{}'
		};
		layoutShellPresetKey = '';
		layoutShellReusePick = '';
		layoutShellPresetError = '';
		menuPresetKey = '';
		menuReusePick = '';
		menuPresetError = '';
		menuOrientation = 'horizontal';
		menuShowAuthButtons = false;
		themeToggleVariant = 'icons';
		editingLayoutShellModule = false;
		moduleWrapperClassName = '';
		pageTitleShowTitle = true;
		pageTitleShowSubtitle = true;
		pageTitleAlign = 'center';
	}

	let showModuleEditDialog = false;
	let editingModule: PageModuleData | null = null;
	
	// Feature Grid form state
	interface FeatureGridItem {
		icon: string;
		title: MultiLangText;
		description: MultiLangHTML;
	}
	let featureGridTitle: MultiLangText = { en: '', he: '' };
	let featureGridSubtitle: MultiLangText = { en: '', he: '' };
	let featureGridItems: FeatureGridItem[] = [];
	let editingFeatureIndex: number | null = null;

	// Rich Text form state
	let richTextTitle: MultiLangText = { en: '', he: '' };
	let richTextBody: MultiLangHTML = { en: '', he: '' };
	let richTextBackground: 'white' | 'gray' = 'white';
	let pageTitleShowTitle = true;
	let pageTitleShowSubtitle = true;
	let pageTitleAlign: 'left' | 'center' = 'center';

	// Hero form state
	let heroTitle: MultiLangText = { en: '', he: '' };
	let heroSubtitle: MultiLangText = { en: '', he: '' };
	let heroCtaLabel: MultiLangText = { en: '', he: '' };
	let heroCtaUrl = '';
	let heroShowCta = true;
	let heroBackgroundStyle: 'light' | 'dark' | 'image' | 'galleryLeading' = 'light';
	let heroBackgroundImage = '';

	// Albums Grid module form state
	let albumsGridTitle: MultiLangText = { en: '', he: '' };
	let albumsGridDescription: MultiLangHTML = { en: '', he: '' };
	let albumsGridSelectedAlbums: string[] = []; // Array of album IDs
	let albumsGridAlbumCardLayout: 'stack' | 'row' = 'stack';
	let availableAlbums: Array<{ _id: string; name: string | MultiLangText; alias: string; level?: number }> = [];
	let albumsLoading = false;
	let blogCategoryAlias = '';
	let availableBlogCategories: Array<{ alias: string; title: string }> = [];
	let layoutShellPresetKey = '';
	let layoutShellReusePick = '';
	let layoutShellPresetError = '';
	let availableLayoutPresetNames: string[] = [];
	let showLayoutShellEditorDialog = false;
	let layoutShellEditorKey = '';
	let layoutShellEditorGridRows = 1;
	let layoutShellEditorGridColumns = 1;
	let layoutShellEditorModules: PageModuleData[] = [];
	let layoutShellEditorRowStructure: Map<number, number[]> = new Map();
	let editingLayoutShellModule = false;
	let layoutShellEditorSaving = false;
	let layoutShellEditorError = '';
	let menuPresetKey = '';
	let menuReusePick = '';
	let menuPresetError = '';
	let availableMenuInstanceNames: string[] = [];
	let showMenuEditorDialog = false;
	let menuEditorKey = '';
	let menuEditorOrientation: 'horizontal' | 'vertical' = 'horizontal';
	let menuEditorShowAuthButtons = false;
	let menuEditorItems: MenuEditorItem[] = [];
	let menuEditorItemClass = '';
	let menuEditorActiveItemClass = '';
	let menuEditorContainerClass = '';
	let menuEditorSeparatorEnabled = false;
	let menuEditorSeparatorText = '|';
	let menuEditorShowActiveIndicator = true;
	let menuEditorSaving = false;
	let menuEditorError = '';
	let menuOrientation: 'horizontal' | 'vertical' = 'horizontal';
	let menuShowAuthButtons = false;
	/** themeToggle module: icons vs text labels */
	let themeToggleVariant: 'icons' | 'text' = 'icons';
	let moduleWrapperClassName = '';

	function getLayoutShellRef(props: Record<string, unknown> | undefined): string {
		return String((props as any)?.instanceRef ?? (props as any)?.presetKey ?? '').trim();
	}

	function getMenuRef(props: Record<string, unknown> | undefined): string {
		return String((props as any)?.instanceRef ?? '').trim();
	}

	function openLayoutShellEditorDialog() {
		let key = layoutShellPresetKey.trim();
		if (!key && layoutShellReusePick.trim()) {
			key = layoutShellReusePick.trim();
			layoutShellPresetKey = key;
		}
		if (!key) {
			layoutShellPresetError = 'Enter an instance name first, or pick one from the saved list.';
			return;
		}
		layoutShellPresetError = '';
		layoutShellEditorError = '';
		layoutShellEditorKey = key;
		const existing = layoutShellInstances[key] || {};
		layoutShellEditorGridRows = Math.max(1, Number(existing.gridRows || 1));
		layoutShellEditorGridColumns = Math.max(1, Number(existing.gridColumns || 1));
		const rawMods = Array.isArray(existing.modules) ? existing.modules : [];
		layoutShellEditorModules = rawMods.map((m: any, idx) => ({
			_id: String(m?._id || `shell-${Date.now()}-${idx}`),
			pageId: '',
			type: String(m?.type || 'richText'),
			props: (m?.props && typeof m.props === 'object') ? m.props : {},
			rowOrder: Number(m?.rowOrder ?? 0),
			columnIndex: Number(m?.columnIndex ?? 0),
			columnProportion: Number(m?.columnProportion ?? 1),
			rowSpan: Number(m?.rowSpan ?? 1),
			colSpan: Number(m?.colSpan ?? 1),
			zone: m?.zone,
			order: m?.order
		}));
		const rowMap = new Map<number, number[]>();
		for (let r = 0; r < layoutShellEditorGridRows; r++) {
			rowMap.set(r, Array(layoutShellEditorGridColumns).fill(1));
		}
		layoutShellEditorRowStructure = rowMap;
		// Ensure the instance editor is visible (not hidden behind module dialog).
		showModuleEditDialog = false;
		showLayoutShellEditorDialog = true;
	}

	function openMenuEditorDialog() {
		let key = menuPresetKey.trim();
		if (!key && menuReusePick.trim()) {
			key = menuReusePick.trim();
			menuPresetKey = key;
		}
		if (!key) {
			menuPresetError = 'Enter an instance name first, or pick one from the saved list.';
			return;
		}
		menuPresetError = '';
		menuEditorError = '';
		menuEditorKey = key;
		const existing = menuInstances[key] || {};
		menuEditorOrientation = existing.orientation === 'vertical' ? 'vertical' : 'horizontal';
		menuEditorShowAuthButtons = existing.showAuthButtons === true;
		menuEditorItemClass = String(existing.itemClass || '');
		menuEditorActiveItemClass = String(existing.activeItemClass || '');
		menuEditorContainerClass = String(existing.containerClass || '');
		menuEditorShowActiveIndicator = existing.showActiveIndicator !== false;
		menuEditorSeparatorEnabled = Boolean(existing.separator);
		menuEditorSeparatorText = typeof existing.separator === 'string' && existing.separator.trim() ? existing.separator : '|';
		menuEditorItems = (Array.isArray(existing.items) ? existing.items : [])
			.map((item) => ({
				label: typeof item?.label === 'string' ? item.label : '',
				labelKey: typeof item?.labelKey === 'string' ? item.labelKey : '',
				href: String((item as any)?.href || ''),
				type: (item?.type === 'login' || item?.type === 'logout') ? item.type : 'link',
				showWhen: item?.showWhen === 'loggedIn' || item?.showWhen === 'loggedOut' ? item.showWhen : 'always',
				external: item?.external === true
			}));
		showModuleEditDialog = false;
		showMenuEditorDialog = true;
	}

	function addMenuEditorItem() {
		menuEditorItems = [
			...menuEditorItems,
			{ label: '', labelKey: '', href: '', type: 'link', showWhen: 'always', external: false }
		];
	}

	function removeMenuEditorItem(index: number) {
		menuEditorItems = menuEditorItems.filter((_, i) => i !== index);
	}

	async function saveMenuInstance() {
		menuEditorSaving = true;
		menuEditorError = '';
		try {
			const key = menuEditorKey.trim();
			if (!key) throw new Error('Instance name is required.');
			const cleanedItems: MenuEditorItem[] = menuEditorItems
				.map((item) => ({
					label: String(item.label || '').trim(),
					labelKey: String(item.labelKey || '').trim(),
					href: String(item.href || '').trim(),
					type: (item.type === 'login' || item.type === 'logout') ? item.type : 'link',
					showWhen: item.showWhen === 'loggedIn' || item.showWhen === 'loggedOut' ? item.showWhen : 'always',
					external: item.external === true
				}))
				.filter((item) => item.type === 'logout' || item.href.length > 0)
				.map((item): MenuEditorItem => {
					const normalizedType: 'link' | 'login' | 'logout' =
						item.type === 'login' || item.type === 'logout' ? item.type : 'link';
					const normalized: MenuEditorItem = {
						href: normalizedType === 'logout' ? '#' : item.href
					};
					if (item.label) normalized.label = item.label;
					if (item.labelKey) normalized.labelKey = item.labelKey;
					if (normalizedType !== 'link') normalized.type = normalizedType;
					if (item.showWhen === 'loggedIn' || item.showWhen === 'loggedOut') normalized.showWhen = item.showWhen;
					if (item.external) normalized.external = true;
					return normalized;
				});

			const instanceConfig: MenuInstanceConfig = {
				orientation: menuEditorOrientation,
				showAuthButtons: menuEditorShowAuthButtons,
				items: cleanedItems,
				showActiveIndicator: menuEditorShowActiveIndicator
			};
			if (menuEditorItemClass.trim()) instanceConfig.itemClass = menuEditorItemClass.trim();
			if (menuEditorActiveItemClass.trim()) instanceConfig.activeItemClass = menuEditorActiveItemClass.trim();
			if (menuEditorContainerClass.trim()) instanceConfig.containerClass = menuEditorContainerClass.trim();
			if (menuEditorSeparatorEnabled) instanceConfig.separator = menuEditorSeparatorText || '|';

			const nextInstances = {
				...menuInstances,
				[key]: instanceConfig
			};

			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					template: {
						layoutShellInstances,
						layoutPresets: layoutShellInstances,
						menuInstances: nextInstances
					}
				})
			});
			if (!response.ok) await handleApiErrorResponse(response);
			menuInstances = nextInstances;
			menuPresetKey = key;
			availableMenuInstanceNames = Object.keys(nextInstances).sort((a, b) => a.localeCompare(b));
			showMenuEditorDialog = false;
			message = `Menu instance "${key}" saved.`;
		} catch (err) {
			menuEditorError = handleError(err, 'Failed to save menu instance');
		} finally {
			menuEditorSaving = false;
		}
	}

	async function deleteMenuInstance() {
		const key = menuEditorKey.trim();
		if (!key) return;
		menuEditorSaving = true;
		menuEditorError = '';
		try {
			const nextInstances = { ...menuInstances };
			delete nextInstances[key];
			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					template: {
						layoutShellInstances,
						layoutPresets: layoutShellInstances,
						menuInstances: nextInstances
					}
				})
			});
			if (!response.ok) await handleApiErrorResponse(response);
			menuInstances = nextInstances;
			availableMenuInstanceNames = Object.keys(nextInstances).sort((a, b) => a.localeCompare(b));
			if (menuPresetKey === key) menuPresetKey = '';
			showMenuEditorDialog = false;
			message = `Menu instance "${key}" deleted.`;
		} catch (err) {
			menuEditorError = handleError(err, 'Failed to delete menu instance');
		} finally {
			menuEditorSaving = false;
		}
	}

	async function saveLayoutShellInstance() {
		layoutShellEditorSaving = true;
		layoutShellEditorError = '';
		try {
			const key = layoutShellEditorKey.trim();
			if (!key) throw new Error('Instance name is required.');
			const parsed = layoutShellEditorModules.map((m) => ({
				type: m.type,
				props: m.props || {},
				rowOrder: m.rowOrder ?? 0,
				columnIndex: m.columnIndex ?? 0,
				columnProportion: m.columnProportion ?? 1,
				rowSpan: m.rowSpan ?? 1,
				colSpan: m.colSpan ?? 1
			}));

			const nextInstances = {
				...layoutShellInstances,
				[key]: {
					gridRows: Math.max(1, Number(layoutShellEditorGridRows || 1)),
					gridColumns: Math.max(1, Number(layoutShellEditorGridColumns || 1)),
					modules: parsed
				}
			};

			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					template: {
						layoutShellInstances: nextInstances,
						layoutPresets: nextInstances
					}
				})
			});
			if (!response.ok) await handleApiErrorResponse(response);
			layoutShellInstances = nextInstances;
			layoutShellPresetKey = key;
			if (!availableLayoutPresetNames.includes(key)) {
				availableLayoutPresetNames = [...availableLayoutPresetNames, key].sort((a, b) => a.localeCompare(b));
			}
			showLayoutShellEditorDialog = false;
			message = `Layout instance "${key}" saved.`;
		} catch (err) {
			layoutShellEditorError = handleError(err, 'Failed to save layout instance');
			logger.error(layoutShellEditorError);
		} finally {
			layoutShellEditorSaving = false;
		}
	}

	async function deleteLayoutShellInstance() {
		const key = layoutShellEditorKey.trim();
		if (!key) return;
		layoutShellEditorSaving = true;
		layoutShellEditorError = '';
		try {
			const nextInstances = { ...layoutShellInstances };
			delete nextInstances[key];
			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					template: {
						layoutShellInstances: nextInstances,
						layoutPresets: nextInstances
					}
				})
			});
			if (!response.ok) await handleApiErrorResponse(response);
			layoutShellInstances = nextInstances;
			availableLayoutPresetNames = Object.keys(nextInstances).sort((a, b) => a.localeCompare(b));
			if (layoutShellPresetKey === key) layoutShellPresetKey = '';
			showLayoutShellEditorDialog = false;
			message = `Layout instance "${key}" deleted.`;
		} catch (err) {
			layoutShellEditorError = handleError(err, 'Failed to delete layout instance');
		} finally {
			layoutShellEditorSaving = false;
		}
	}

	function isCellInShellModule(row: number, col: number, m: PageModuleData): boolean {
		const r = m.rowOrder ?? -1;
		const c = m.columnIndex ?? -1;
		const rs = m.rowSpan ?? 1;
		const cs = m.colSpan ?? 1;
		return row >= r && row < r + rs && col >= c && col < c + cs;
	}

	async function handleAssignLayoutShellModule(
		rowOrder: number,
		columnIndex: number,
		moduleType: string,
		props: Record<string, unknown>,
		rowSpan: number = 1,
		colSpan: number = 1
	) {
		layoutShellEditorModules = layoutShellEditorModules.filter((m) => {
			const r = m.rowOrder ?? 0;
			const c = m.columnIndex ?? 0;
			return !isCellInShellModule(r, c, { rowOrder, columnIndex, rowSpan, colSpan } as PageModuleData);
		});
		layoutShellEditorModules = [
			...layoutShellEditorModules,
			{
				_id: `shell-${Date.now()}-${Math.random()}`,
				pageId: '',
				type: moduleType,
				props: props || {},
				rowOrder,
				columnIndex,
				columnProportion: 1,
				rowSpan,
				colSpan
			} as PageModuleData
		];
	}

	async function handleRemoveLayoutShellModule(moduleId: string) {
		layoutShellEditorModules = layoutShellEditorModules.filter((m) => m._id !== moduleId);
	}

	function handleEditLayoutShellModule(module: PageModuleData) {
		editingLayoutShellModule = true;
		editModule(module);
	}

	async function moveLayoutShellRow(fromRowOrder: number, toRowOrder: number) {
		if (fromRowOrder === toRowOrder) return;
		const next = layoutShellEditorModules.map((m) => {
			const r = m.rowOrder ?? 0;
			if (r === fromRowOrder) return { ...m, rowOrder: toRowOrder };
			if (r === toRowOrder) return { ...m, rowOrder: fromRowOrder };
			return m;
		});
		layoutShellEditorModules = next;
	}

	async function insertLayoutShellRow(atRowOrder: number) {
		const next = layoutShellEditorModules.map((m) => {
			const r = m.rowOrder ?? 0;
			if (r >= atRowOrder) return { ...m, rowOrder: r + 1 };
			return m;
		});
		layoutShellEditorModules = next;
		const rows = Math.max(layoutShellEditorGridRows + 1, atRowOrder + 1);
		layoutShellEditorGridRows = rows;
		const rowMap = new Map<number, number[]>();
		for (let r = 0; r < rows; r++) {
			rowMap.set(r, Array(layoutShellEditorGridColumns).fill(1));
		}
		layoutShellEditorRowStructure = rowMap;
	}

	function applyModuleWrapperClassName(props: Record<string, unknown>): Record<string, unknown> {
		const next = { ...props };
		const cls = moduleWrapperClassName.trim();
		if (cls) next.className = cls;
		else delete next.className;
		return next;
	}

	function editModule(module: PageModuleData) {
		editingModule = module;
		moduleForm = {
			id: module._id,
			type: module.type,
			zone: module.zone || '',
			order: module.order || 0,
			propsJson: JSON.stringify(module.props || {}, null, 2)
		};
		moduleWrapperClassName = String((module.props as Record<string, unknown> | undefined)?.className ?? '').trim();
		
		// Initialize feature grid form if it's a featureGrid module
		if (module.type === 'featureGrid') {
			const props = module.props || {};
			featureGridTitle = typeof props.title === 'string' 
				? { en: props.title, he: '' } 
				: (props.title || { en: '', he: '' });
			featureGridSubtitle = typeof props.subtitle === 'string'
				? { en: props.subtitle, he: '' }
				: (props.subtitle || { en: '', he: '' });
			featureGridItems = (props.features || []).map((f: Partial<FeatureGridItem> & { icon?: string; title?: string | MultiLangText; description?: string | MultiLangHTML }) => ({
				icon: f.icon || '',
				title: typeof f.title === 'string' ? { en: f.title, he: '' } : (f.title || { en: '', he: '' }),
				description: typeof f.description === 'string' ? { en: f.description, he: '' } : (f.description || { en: '', he: '' })
			}));
		} else {
			featureGridTitle = { en: '', he: '' };
			featureGridSubtitle = { en: '', he: '' };
			featureGridItems = [];
		}

		// Initialize rich text form if it's a richText module
		if (module.type === 'richText') {
			const props = module.props || {};
			richTextTitle = typeof props.title === 'string'
				? { en: props.title, he: '' }
				: (props.title || { en: '', he: '' });
			richTextBody = typeof props.body === 'string'
				? { en: props.body, he: '' }
				: (props.body || { en: '', he: '' });
			richTextBackground = props.background === 'gray' ? 'gray' : 'white';
		} else {
			richTextTitle = { en: '', he: '' };
			richTextBody = { en: '', he: '' };
			richTextBackground = 'white';
		}
		if (module.type === 'pageTitle') {
			const props = module.props || {};
			pageTitleShowTitle = props.showTitle !== false;
			pageTitleShowSubtitle = props.showSubtitle !== false;
			pageTitleAlign = props.align === 'left' ? 'left' : 'center';
		} else {
			pageTitleShowTitle = true;
			pageTitleShowSubtitle = true;
			pageTitleAlign = 'center';
		}

		// Initialize hero form if it's a hero module
		if (module.type === 'hero') {
			const props = module.props || {};
			const config = props.config ?? props;
			heroTitle = typeof config.title === 'string'
				? { en: config.title, he: '' }
				: (config.title || { en: '', he: '' });
			heroSubtitle = typeof config.subtitle === 'string'
				? { en: config.subtitle, he: '' }
				: (config.subtitle || { en: '', he: '' });
			heroCtaLabel = typeof config.ctaLabel === 'string'
				? { en: config.ctaLabel, he: '' }
				: (config.ctaLabel || { en: '', he: '' });
			heroCtaUrl = config.ctaUrl || '';
			heroShowCta = config.showCta !== false;
			heroBackgroundStyle = (config.backgroundStyle === 'dark' || config.backgroundStyle === 'image' || config.backgroundStyle === 'galleryLeading')
				? config.backgroundStyle
				: 'light';
			heroBackgroundImage = config.backgroundImage || '';
		} else {
			heroTitle = { en: '', he: '' };
			heroSubtitle = { en: '', he: '' };
			heroCtaLabel = { en: '', he: '' };
			heroCtaUrl = '';
			heroShowCta = true;
			heroBackgroundStyle = 'light';
			heroBackgroundImage = '';
		}

		// Initialize albums grid module form if it's an albumsGrid module
		if (module.type === 'albumsGrid') {
			const props = module.props || {};
			albumsGridTitle = typeof props.title === 'string'
				? { en: props.title, he: '' }
				: (props.title || { en: '', he: '' });
			albumsGridDescription = typeof props.description === 'string'
				? { en: props.description, he: '' }
				: (props.description || { en: '', he: '' });
			// Support both new format (selectedAlbums array) and legacy format (rootAlbumId/rootGallery)
			if (props.selectedAlbums && Array.isArray(props.selectedAlbums)) {
				albumsGridSelectedAlbums = props.selectedAlbums;
			} else if (props.rootAlbumId || props.rootGallery) {
				// Legacy: single album, convert to array
				albumsGridSelectedAlbums = [props.rootAlbumId || props.rootGallery];
			} else {
				albumsGridSelectedAlbums = [];
			}
			albumsGridAlbumCardLayout = props.albumCardLayout === 'row' ? 'row' : 'stack';
		} else {
			albumsGridTitle = { en: '', he: '' };
			albumsGridDescription = { en: '', he: '' };
			albumsGridSelectedAlbums = [];
			albumsGridAlbumCardLayout = 'stack';
		}

		if (module.type === 'blogCategory') {
			const props = module.props || {};
			blogCategoryAlias = typeof props.categoryAlias === 'string' ? props.categoryAlias : '';
		} else {
			blogCategoryAlias = '';
		}
		if (module.type === 'layoutShell') {
			const props = module.props || {};
			layoutShellPresetKey = getLayoutShellRef(props as Record<string, unknown>);
			layoutShellReusePick = '';
			layoutShellPresetError = '';
		} else {
			layoutShellPresetKey = '';
			layoutShellReusePick = '';
			layoutShellPresetError = '';
		}
		if (module.type === 'menu') {
			const props = module.props || {};
			menuPresetKey = getMenuRef(props as Record<string, unknown>);
			menuReusePick = '';
			menuPresetError = '';
			menuOrientation = (props as any).orientation === 'vertical' ? 'vertical' : 'horizontal';
			menuShowAuthButtons = (props as any).showAuthButtons === true;
		} else {
			menuPresetKey = '';
			menuReusePick = '';
			menuPresetError = '';
			menuOrientation = 'horizontal';
			menuShowAuthButtons = false;
		}
		if (module.type === 'themeToggle') {
			const props = module.props || {};
			themeToggleVariant = (props as { variant?: string }).variant === 'text' ? 'text' : 'icons';
		} else {
			themeToggleVariant = 'icons';
		}

		editingFeatureIndex = null;
		showModuleEditDialog = true;
	}
	
	function addFeatureItem() {
		featureGridItems = [...featureGridItems, {
			icon: '',
			title: { en: '', he: '' },
			description: { en: '', he: '' }
		}];
		editingFeatureIndex = featureGridItems.length - 1;
	}
	
	function removeFeatureItem(index: number) {
		featureGridItems = featureGridItems.filter((_, i) => i !== index);
		if (editingFeatureIndex === index) {
			editingFeatureIndex = null;
		} else if (editingFeatureIndex !== null && editingFeatureIndex > index) {
			editingFeatureIndex = editingFeatureIndex - 1;
		}
	}

	async function saveModuleEdit() {
		if (!editingModule) return;
		modulesError = '';
		try {
			let props: FeatureGridProps | RichTextProps | HeroProps | AlbumsGridProps | Record<string, unknown> = {};
			
			// Handle featureGrid module specially
			if (moduleForm.type === 'featureGrid') {
				props = {
					title: featureGridTitle,
					subtitle: featureGridSubtitle,
					features: featureGridItems.map(item => ({
						icon: item.icon,
						title: item.title,
						description: item.description
					}))
				} as FeatureGridProps;
			} else if (moduleForm.type === 'richText') {
				// Handle richText module
				props = {
					title: richTextTitle,
					body: richTextBody,
					background: richTextBackground
				} as RichTextProps;
			} else if (moduleForm.type === 'pageTitle') {
				props = {
					showTitle: pageTitleShowTitle,
					showSubtitle: pageTitleShowSubtitle,
					align: pageTitleAlign
				};
			} else if (moduleForm.type === 'hero') {
				// Handle hero module
				props = {
					title: heroTitle,
					subtitle: heroSubtitle,
					showCta: heroShowCta,
					ctaLabel: heroCtaLabel,
					ctaUrl: heroCtaUrl || undefined,
					backgroundStyle: heroBackgroundStyle,
					backgroundImage: heroBackgroundStyle === 'image' ? heroBackgroundImage : undefined
				} as HeroProps;
			} else if (moduleForm.type === 'albumsGrid') {
				// Handle albumsGrid module
				props = {
					title: albumsGridTitle,
					description: albumsGridDescription,
					selectedAlbums: albumsGridSelectedAlbums,
					albumCardLayout: albumsGridAlbumCardLayout
				} as AlbumsGridProps;
			} else if (moduleForm.type === 'blogCategory') {
				const parsed = moduleForm.propsJson.trim() ? JSON.parse(moduleForm.propsJson) as Record<string, unknown> : {};
				props = {
					...parsed,
					categoryAlias: blogCategoryAlias || undefined
				};
			} else if (moduleForm.type === 'layoutShell') {
				const key = layoutShellPresetKey.trim();
				if (!key) {
					layoutShellPresetError = 'Choose an existing preset or enter a new unique name.';
					return;
				}
				layoutShellPresetError = '';
				props = {
					presetKey: key,
					instanceRef: key
				};
			} else if (moduleForm.type === 'menu') {
				const key = menuPresetKey.trim();
				if (!key) {
					menuPresetError = 'Choose an existing menu instance or enter a new unique name.';
					return;
				}
				menuPresetError = '';
				props = {
					instanceRef: key,
					orientation: menuOrientation,
					showAuthButtons: menuShowAuthButtons
				};
			} else if (moduleForm.type === 'themeToggle') {
				props = themeToggleVariant === 'text' ? { variant: 'text' } : {};
			} else {
				props = moduleForm.propsJson.trim() ? JSON.parse(moduleForm.propsJson) as Record<string, unknown> : {};
			}

			props = applyModuleWrapperClassName(props as Record<string, unknown>);
			// Layout shell popup mode: update the shell-instance module list locally.
			if (editingLayoutShellModule) {
				layoutShellEditorModules = layoutShellEditorModules.map((m) =>
					m._id === editingModule!._id ? { ...m, type: moduleForm.type, props } : m
				);
				editingLayoutShellModule = false;
				showModuleEditDialog = false;
				editingModule = null;
				resetModuleForm();
				return;
			}

			// Create mode: update module locally (no API, page not created yet)
			if (!editingPage) {
				modules = modules.map((m) =>
					m._id === editingModule!._id ? { ...m, type: moduleForm.type, props } : m
				);
				showModuleEditDialog = false;
				editingModule = null;
				resetModuleForm();
				return;
			}

			// Edit mode: save via API
			const payload: ModulePayload = {
				type: moduleForm.type,
				props: props as Record<string, unknown>
			};
			if (editingModule.rowOrder !== undefined) {
				payload.rowOrder = editingModule.rowOrder;
				payload.columnIndex = editingModule.columnIndex;
				payload.columnProportion = editingModule.columnProportion || 1;
				if (editingModule.rowSpan) payload.rowSpan = editingModule.rowSpan;
				if (editingModule.colSpan) payload.colSpan = editingModule.colSpan;
			} else {
				// Legacy zone/order
				payload.zone = moduleForm.zone;
				payload.order = Number(moduleForm.order) || 0;
			}

			const response = await fetch(`/api/admin/pages/${editingPage._id}/modules/${editingModule._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			const moduleData = (result.data || result) as PageModuleData;
			modules = modules.map((m) => (m._id === editingModule!._id ? moduleData : m));
			showModuleEditDialog = false;
			editingModule = null;
			resetModuleForm();
			// Keep Edit Page dialog open after module save.
			showEditDialog = true;
			await loadModules(editingPage._id);
		} catch (err) {
			logger.error('Error updating module:', err);
			modulesError = handleError(err, 'Failed to update module');
		}
	}

	async function saveModule() {
		if (!editingPage) return;
		modulesError = '';
		try {
			let props: FeatureGridProps | RichTextProps | HeroProps | AlbumsGridProps | Record<string, unknown> = {};
			
			// Handle module-specific props
			if (moduleForm.type === 'featureGrid') {
				props = {
					title: featureGridTitle,
					subtitle: featureGridSubtitle,
					features: featureGridItems.map(item => ({
						icon: item.icon,
						title: item.title,
						description: item.description
					}))
				} as FeatureGridProps;
			} else if (moduleForm.type === 'richText') {
				props = {
					title: richTextTitle,
					body: richTextBody,
					background: richTextBackground
				} as RichTextProps;
			} else if (moduleForm.type === 'pageTitle') {
				props = {
					showTitle: pageTitleShowTitle,
					showSubtitle: pageTitleShowSubtitle,
					align: pageTitleAlign
				};
			} else if (moduleForm.type === 'hero') {
				props = {
					title: heroTitle,
					subtitle: heroSubtitle,
					showCta: heroShowCta,
					ctaLabel: heroCtaLabel,
					ctaUrl: heroCtaUrl || undefined,
					backgroundStyle: heroBackgroundStyle,
					backgroundImage: heroBackgroundStyle === 'image' ? heroBackgroundImage : undefined
				} as HeroProps;
			} else if (moduleForm.type === 'albumsGrid') {
				props = {
					title: albumsGridTitle,
					description: albumsGridDescription,
					selectedAlbums: albumsGridSelectedAlbums,
					albumCardLayout: albumsGridAlbumCardLayout
				} as AlbumsGridProps;
			} else if (moduleForm.type === 'blogCategory') {
				const parsed = moduleForm.propsJson.trim() ? JSON.parse(moduleForm.propsJson) as Record<string, unknown> : {};
				props = {
					...parsed,
					categoryAlias: blogCategoryAlias || undefined
				};
			} else if (moduleForm.type === 'layoutShell') {
				const key = layoutShellPresetKey.trim();
				if (!key) {
					layoutShellPresetError = 'Choose an existing preset or enter a new unique name.';
					return;
				}
				layoutShellPresetError = '';
				props = {
					presetKey: key,
					instanceRef: key
				};
			} else if (moduleForm.type === 'menu') {
				const key = menuPresetKey.trim();
				if (!key) {
					menuPresetError = 'Choose an existing menu instance or enter a new unique name.';
					return;
				}
				menuPresetError = '';
				props = {
					instanceRef: key,
					orientation: menuOrientation,
					showAuthButtons: menuShowAuthButtons
				};
			} else if (moduleForm.type === 'themeToggle') {
				props = themeToggleVariant === 'text' ? { variant: 'text' } : {};
			} else {
				props = moduleForm.propsJson.trim() ? JSON.parse(moduleForm.propsJson) as Record<string, unknown> : {};
			}

			props = applyModuleWrapperClassName(props as Record<string, unknown>);
			const propsPayload: Record<string, unknown> = { ...props };
			const payload: ModulePayload = {
				type: moduleForm.type,
				zone: moduleForm.zone,
				order: Number(moduleForm.order) || 0,
				props: propsPayload
			};
			const endpoint = moduleForm.id
				? `/api/admin/pages/${editingPage._id}/modules/${moduleForm.id}`
				: `/api/admin/pages/${editingPage._id}/modules`;
			const method = moduleForm.id ? 'PUT' : 'POST';
			const response = await fetch(endpoint, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			const moduleData = result.data || result;
			if (moduleForm.id) {
				modules = modules.map((m) => (m._id === moduleForm.id ? moduleData : m));
			} else {
				modules = [...modules, moduleData];
			}
			resetModuleForm();
		} catch (err) {
			logger.error('Error saving module:', err);
			modulesError = handleError(err, 'Failed to save module');
		}
	}

	async function deleteModule(moduleId: string) {
		modulesError = '';
		
		// If we're in create mode (no editingPage), remove module locally
		if (!editingPage) {
			modules = modules.filter((m) => m._id !== moduleId);
			return;
		}
		
		// Edit mode - delete via API
		try {
			const response = await fetch(`/api/admin/pages/${editingPage._id}/modules/${moduleId}`, {
				method: 'DELETE'
			});
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			modules = modules.filter((m) => m._id !== moduleId);
		} catch (err) {
			logger.error('Error deleting module:', err);
			modulesError = handleError(err, 'Failed to delete module');
		}
	}

	// Row/Column Layout Handlers
	let rowStructure: Map<number, number[]> = new Map(); // rowOrder -> proportions[]

	/** Check if a cell is inside a module's span */
	function isCellInModule(row: number, col: number, m: PageModuleData): boolean {
		const r = m.rowOrder ?? -1;
		const c = m.columnIndex ?? -1;
		const rs = m.rowSpan ?? 1;
		const cs = m.colSpan ?? 1;
		return row >= r && row < r + rs && col >= c && col < c + cs;
	}

	async function handleAssignModule(
		rowOrder: number,
		columnIndex: number,
		moduleType: string,
		props: Record<string, unknown>,
		rowSpan: number = 1,
		colSpan: number = 1
	) {
		modulesError = '';

		// Compute columnProportion from spanned columns
		let columnProportion = 1;
		if (rowStructure.has(rowOrder)) {
			const proportions = rowStructure.get(rowOrder)!;
			columnProportion = proportions.slice(columnIndex, columnIndex + colSpan).reduce((a, p) => a + (p || 1), 0);
		}

		// If we're in create mode (no editingPage), store modules locally
		if (!editingPage) {
			try {
				// Remove any modules that would be covered by this span (including origin - we'll replace)
				modules = modules.filter((m) => {
					const inSpan = isCellInModule(m.rowOrder!, m.columnIndex!, { rowOrder, columnIndex, rowSpan, colSpan } as PageModuleData);
					return !inSpan;
				});

				const newModule: PageModuleData = {
					_id: `temp-${Date.now()}-${Math.random()}`,
					pageId: '',
					type: moduleType,
					rowOrder,
					columnIndex,
					columnProportion,
					rowSpan: rowSpan > 1 ? rowSpan : undefined,
					colSpan: colSpan > 1 ? colSpan : undefined,
					props: props || {}
				};
				modules = [...modules, newModule];
			} catch (err) {
				logger.error('Error assigning module:', err);
				modulesError = handleError(err, 'Failed to assign module');
			}
			return;
		}

		// Edit mode - save via API
		try {
			// Remove modules that would be covered by this span
			const modulesToRemove = modules.filter((m) => {
				const inSpan = rowOrder <= (m.rowOrder ?? -1) && (m.rowOrder ?? -1) < rowOrder + rowSpan &&
					columnIndex <= (m.columnIndex ?? -1) && (m.columnIndex ?? -1) < columnIndex + colSpan;
				const isOrigin = m.rowOrder === rowOrder && m.columnIndex === columnIndex;
				return inSpan && !isOrigin;
			});
			for (const m of modulesToRemove) {
				await fetch(`/api/admin/pages/${editingPage._id}/modules/${m._id}`, { method: 'DELETE' });
			}
			modules = modules.filter((m) => !modulesToRemove.includes(m));

			const existingModule = modules.find((m) => m.rowOrder === rowOrder && m.columnIndex === columnIndex);
			const payload: Record<string, unknown> = {
				type: moduleType,
				rowOrder,
				columnIndex,
				columnProportion,
				props: props || {}
			};
			if (rowSpan > 1) payload.rowSpan = rowSpan;
			if (colSpan > 1) payload.colSpan = colSpan;

			if (existingModule) {
				const response = await fetch(`/api/admin/pages/${editingPage._id}/modules/${existingModule._id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!response.ok) await handleApiErrorResponse(response);
				const result = await response.json();
				const moduleData = (result.data || result) as PageModuleData;
				modules = modules.map((m) => (m._id === existingModule._id ? moduleData : m));
			} else {
				const response = await fetch(`/api/admin/pages/${editingPage._id}/modules`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!response.ok) await handleApiErrorResponse(response);
				const result = await response.json();
				const moduleData = result.data || result;
				modules = [...modules, moduleData];
			}

			await loadModules(editingPage._id);
		} catch (err) {
			logger.error('Error assigning module:', err);
			modulesError = handleError(err, 'Failed to assign module');
		}
	}

	function updateRowStructureAfterInsert(atRowOrder: number) {
		const next = new Map<number, number[]>();
		for (const [r, proportions] of rowStructure.entries()) {
			next.set(r >= atRowOrder ? r + 1 : r, [...proportions]);
		}
		if (!next.has(atRowOrder)) {
			const fallbackCols = Math.max(1, formData.gridColumns || rowStructure.get(0)?.length || 1);
			next.set(atRowOrder, Array(fallbackCols).fill(1));
		}
		rowStructure = next;
	}

	function updateRowStructureAfterMove(fromRowOrder: number, toRowOrder: number) {
		const next = new Map<number, number[]>();
		for (const [r, proportions] of rowStructure.entries()) {
			if (r === fromRowOrder) next.set(toRowOrder, [...proportions]);
			else if (r === toRowOrder) next.set(fromRowOrder, [...proportions]);
			else next.set(r, [...proportions]);
		}
		rowStructure = next;
	}

	async function persistModulesRowOrder(updatedModules: PageModuleData[]) {
		if (!editingPage) {
			modules = updatedModules;
			return;
		}
		try {
			for (const m of updatedModules) {
				if (!m._id) continue;
				const payload: Record<string, unknown> = {
					type: m.type,
					rowOrder: m.rowOrder ?? 0,
					columnIndex: m.columnIndex ?? 0,
					columnProportion: m.columnProportion ?? 1,
					props: m.props || {}
				};
				if (m.rowSpan && m.rowSpan > 1) payload.rowSpan = m.rowSpan;
				if (m.colSpan && m.colSpan > 1) payload.colSpan = m.colSpan;
				const response = await fetch(`/api/admin/pages/${editingPage._id}/modules/${m._id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!response.ok) await handleApiErrorResponse(response);
			}
			modules = updatedModules;
		} catch (err) {
			logger.error('Error updating row order:', err);
			modulesError = handleError(err, 'Failed to reorder rows');
		}
	}

	async function handleMoveRow(fromRowOrder: number, toRowOrder: number) {
		if (fromRowOrder === toRowOrder) return;
		const updated = modules.map((m) => {
			const r = m.rowOrder ?? 0;
			if (r === fromRowOrder) return { ...m, rowOrder: toRowOrder };
			if (r === toRowOrder) return { ...m, rowOrder: fromRowOrder };
			return m;
		});
		updateRowStructureAfterMove(fromRowOrder, toRowOrder);
		await persistModulesRowOrder(updated);
	}

	async function handleInsertRow(atRowOrder: number) {
		const idx = Math.max(0, Math.min(formData.gridRows, atRowOrder));
		const updated = modules.map((m) => {
			const r = m.rowOrder ?? 0;
			return r >= idx ? { ...m, rowOrder: r + 1 } : m;
		});
		formData.gridRows = Math.min(20, formData.gridRows + 1);
		updateRowStructureAfterInsert(idx);
		await persistModulesRowOrder(updated);
	}

	async function handleCreate() {
		// Store modules to save after page creation
		pendingModules = modules.filter(m => m.rowOrder !== undefined && m.columnIndex !== undefined);
		
		// Create the page (modules will be saved in onCreateSuccess callback)
		await crudOps.create({
			...formData,
			pageRole: formData.pageRole || undefined,
			parentPageId: formData.parentPageId || undefined
		} as Partial<Page> & Record<string, unknown>);
	}

	async function handleEdit() {
		if (!editingPage) return;
		
		// Prepare layout with grid dimensions and URL params
		const layoutData: any = {
			zones: parseZones(formData.layoutZones),
			gridRows: formData.gridRows,
			gridColumns: formData.gridColumns
		};
		if (formData.urlParams) {
			layoutData.urlParams = formData.urlParams;
		}
		
		const pageData = {
			...formData,
			pageRole: formData.pageRole || undefined,
			parentPageId: formData.parentPageId || undefined,
			layout: layoutData
		};
		
		await crudOps.update(editingPage._id, pageData as Partial<Page> & Record<string, unknown>);
	}

	async function handleDelete() {
		if (!pageToDelete) return;
		await crudOps.remove(pageToDelete._id);
	}
</script>

<svelte:head>
	<title>{$t('admin.pagesManagement')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.pagesManagement')}</h1>
				<p class="text-(--color-surface-600-400) mt-2">{$t('admin.pagesManagementDescription')}</p>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			<!-- Search and Filters -->
			<PageFilters
				bind:searchTerm
				bind:categoryFilter
				bind:publishedFilter
				categories={CATEGORIES}
				onFilterChange={() => crudLoader.loadItems()}
				onAddPage={openCreateDialog}
			/>

			<!-- Pages List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-(--color-primary-600)"></div>
					<p class="mt-2 text-(--color-surface-600-400)">{$t('admin.loadingPages')}</p>
				</div>
			{:else if pages.length === 0}
				<div class="text-center py-8">
					<svg
						class="h-12 w-12 text-(--color-surface-400-600) mx-auto mb-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.noPagesFound')}</h3>
					<p class="text-(--color-surface-600-400)">{$t('admin.startByCreatingFirstPage')}</p>
				</div>
			{:else}
				<PageList
					pages={pages}
					categories={CATEGORIES}
					onEdit={openEditDialog}
					onDuplicate={openDuplicateDialog}
					onDelete={openDeleteDialog}
				/>
			{/if}
		</div>
	</div>
</div>

<!-- Create Dialog -->
{#if showCreateDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">Add New Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="create-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Title *
						</label>
						<MultiLangInput id="create-title" bind:value={formData.title} />
					</div>

					<div>
						<label for="create-alias" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Alias *
						</label>
						<input
							id="create-alias"
							type="text"
							bind:value={formData.alias}
							placeholder="page-url-slug"
							required
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div>
					<label for="create-subtitle" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Subtitle
					</label>
					<MultiLangInput id="create-subtitle" bind:value={formData.subtitle} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="create-category" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Category
						</label>
						<select
							id="create-category"
							bind:value={formData.category}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						>
							{#each CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="create-template-pack" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Template packs (optional)
						</label>
						<p class="text-xs text-(--color-surface-600-400) mb-1">
							Assign one or more packs to this page. No selection means default fallback for this role.
						</p>
						<div id="create-template-pack" class="grid grid-cols-1 sm:grid-cols-3 gap-2">
							{#each PACK_OPTIONS as opt}
								<label class="inline-flex items-center gap-2 text-sm text-(--color-surface-800-200)">
									<input
										type="checkbox"
										checked={formData.frontendTemplates.includes(opt.value)}
										on:change={(e) => {
											const checked = (e.currentTarget as HTMLInputElement).checked;
											formData.frontendTemplates = checked
												? Array.from(new Set([...formData.frontendTemplates, opt.value]))
												: formData.frontendTemplates.filter((p) => p !== opt.value);
											formData.frontendTemplate = (formData.frontendTemplates[0] ?? '') as any;
										}}
									/>
									<span>{opt.label}</span>
								</label>
							{/each}
						</div>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="create-page-role" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Page role (optional)
						</label>
						<select
							id="create-page-role"
							bind:value={formData.pageRole}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						>
							{#each PAGE_ROLES as role}
								<option value={role.value}>{role.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="create-parent-page-id" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Parent page ID (optional)
						</label>
						<input
							id="create-parent-page-id"
							type="text"
							bind:value={formData.parentPageId}
							placeholder="Mongo ObjectId"
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
					<div>
						<label for="create-route-params" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Route params (optional)
						</label>
						<input
							id="create-route-params"
							type="text"
							bind:value={formData.routeParamsCsv}
							placeholder="albumAlias, categoryAlias"
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div>
					<label for="create-leading-image" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Leading Image URL
					</label>
					<input
						id="create-leading-image"
						type="text"
						bind:value={formData.leadingImage}
						placeholder="https://..."
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="create-grid-rows" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Grid Rows *
						</label>
						<input
							id="create-grid-rows"
							type="number"
							min="1"
							max="20"
							bind:value={formData.gridRows}
							placeholder="1"
							required
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">Number of rows in the page grid.</p>
					</div>

					<div>
						<label for="create-grid-cols" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Grid Columns *
						</label>
						<input
							id="create-grid-cols"
							type="number"
							min="1"
							max="12"
							bind:value={formData.gridColumns}
							placeholder="1"
							required
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">Number of columns in the page grid.</p>
					</div>
				</div>

				<div>
					<label for="create-url-params" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						URL Parameters (optional)
					</label>
					<input
						id="create-url-params"
						type="text"
						bind:value={formData.urlParams}
						placeholder="param1=value1&param2=value2"
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
					<p class="mt-1 text-xs text-(--color-surface-600-400)">Query parameters for the page URL (e.g., ?id=123&type=photo).</p>
				</div>

				{#if !showGridBuilder}
					<div class="flex justify-end">
						<button
							type="button"
							on:click={initializeGrid}
							disabled={!formData.title || !formData.alias.trim() || formData.gridRows < 1 || formData.gridColumns < 1}
							class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
						>
							Initialize Grid
						</button>
					</div>
				{/if}

				{#if showGridBuilder}
					<div class="border-t border-surface-200-800 pt-6">
						<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-4">Page Grid Layout</h3>
						<p class="text-sm text-(--color-surface-600-400) mb-4">
							Select cells in the grid and assign modules to them. Grid: {formData.gridRows} row{formData.gridRows !== 1 ? 's' : ''} × {formData.gridColumns} column{formData.gridColumns !== 1 ? 's' : ''}
						</p>
						
						{#if modulesError}
							<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
						{/if}

						{#if modulesLoading}
							<p class="text-sm text-(--color-surface-600-400)">Loading layout...</p>
						{:else}
							<RowColumnLayoutBuilder
								modules={modules}
								rowStructure={rowStructure}
								onAssignModule={handleAssignModule}
								onRemoveModule={deleteModule}
								onEditModule={editModule}
								onMoveRow={handleMoveRow}
								onInsertRow={handleInsertRow}
								availableModuleTypes={MODULE_TYPES}
							/>
						{/if}
					</div>
				{/if}

				<div class="flex items-center">
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.isPublished}
							class="sr-only peer"
						/>
						<div
							class="w-11 h-6 bg-(--color-surface-200-800) peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[color-mix(in_oklab,var(--color-primary-500)_35%,transparent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-(--color-surface-50-950) after:border-surface-300-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-(--color-primary-600)"
						></div>
						<span class="ml-3 text-sm font-medium text-(--color-surface-800-200)">
							Published
						</span>
					</label>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showCreateDialog = false;
							resetForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={saving || !formData.title || !formData.alias.trim() || !gridInitialized}
						class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Creating...
						{:else}
							Create Page
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Module Edit Dialog -->
{#if showModuleEditDialog && editingModule}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full {moduleForm.type === 'featureGrid' || moduleForm.type === 'richText' || moduleForm.type === 'hero' || moduleForm.type === 'albumsGrid' ? 'max-w-4xl' : 'max-w-2xl'} p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">Edit Module</h2>

			{#if modulesError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="module-type" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Module Type
					</label>
					<select
						id="module-type"
						bind:value={moduleForm.type}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					>
						{#each MODULE_TYPES as moduleType}
							<option value={moduleType.value}>{moduleType.label}</option>
						{/each}
					</select>
				</div>

				{#if moduleForm.type === 'featureGrid'}
					<!-- Feature Grid Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-feature-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title
							</label>
							<MultiLangInput id="module-feature-title" bind:value={featureGridTitle} />
						</div>

						<div>
							<label for="module-feature-subtitle" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-feature-subtitle" bind:value={featureGridSubtitle} />
						</div>

						<div class="border-t border-surface-200-800 pt-4">
							<div class="flex items-center justify-between mb-4">
								<span class="block text-sm font-medium text-(--color-surface-800-200)">
									Features
								</span>
								<button
									type="button"
									on:click={addFeatureItem}
									class="px-3 py-1.5 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) text-sm font-medium"
								>
									+ Add Item
								</button>
							</div>

							{#if featureGridItems.length === 0}
								<p class="text-sm text-(--color-surface-600-400) py-4 text-center border-2 border-dashed border-surface-300-700 rounded">
									No features yet. Click "Add Item" to add a feature.
								</p>
							{:else}
								<div class="space-y-4">
									{#each featureGridItems as item, index (index)}
										<div class="border border-surface-300-700 rounded-lg p-4 bg-(--color-surface-50-950)">
											<div class="flex items-center justify-between mb-3">
												<span class="text-sm font-medium text-(--color-surface-800-200)">Feature {index + 1}</span>
												<button
													type="button"
													on:click={() => removeFeatureItem(index)}
													class="text-sm text-red-600 hover:text-red-800"
												>
													Remove
												</button>
											</div>

											<div class="space-y-3">
												<div>
													<span class="block text-xs font-medium text-(--color-surface-600-400) mb-1">
														Icon
													</span>
													<div class="flex gap-2">
														<IconSelector
															bind:value={item.icon}
															placeholder="Select an icon..."
															on:change={(e) => {
																item.icon = e.detail.value as string;
															}}
														/>
														{#if item.icon === 'custom' || (item.icon && !AVAILABLE_ICONS.includes(item.icon))}
															<input
																type="text"
																bind:value={item.icon}
																placeholder="🎨 or custom text"
																class="flex-1 px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) text-sm"
																on:click|stopPropagation
																on:mousedown|stopPropagation
															/>
														{/if}
													</div>
													<p class="mt-1 text-xs text-(--color-surface-600-400)">
														Select an icon from the list, or choose "Custom..." to enter an emoji or custom text.
													</p>
												</div>

												<div>
													<label for="module-feature-item-{index}-title" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">
														Title
													</label>
													<MultiLangInput id="module-feature-item-{index}-title" bind:value={item.title} />
												</div>

												<div>
													<label for="module-feature-item-{index}-desc" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">
														Description (Rich Text)
													</label>
													<MultiLangHTMLEditor id="module-feature-item-{index}-desc" bind:value={item.description} />
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{:else if moduleForm.type === 'richText'}
					<!-- Rich Text Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-richtext-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title (optional)
							</label>
							<MultiLangInput id="module-richtext-title" bind:value={richTextTitle} />
						</div>

						<div>
							<label for="module-richtext-body" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Body Content
							</label>
							<MultiLangHTMLEditor id="module-richtext-body" bind:value={richTextBody} />
						</div>

						<div>
							<label for="module-richtext-bg" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Background Color
							</label>
							<select
								id="module-richtext-bg"
								bind:value={richTextBackground}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							>
								<option value="white">White</option>
								<option value="gray">Gray</option>
							</select>
						</div>
					</div>
				{:else if moduleForm.type === 'pageTitle'}
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label class="flex items-center gap-2">
								<input type="checkbox" bind:checked={pageTitleShowTitle} class="w-4 h-4" />
								<span class="text-sm text-(--color-surface-800-200)">Show page title</span>
							</label>
						</div>
						<div>
							<label class="flex items-center gap-2">
								<input type="checkbox" bind:checked={pageTitleShowSubtitle} class="w-4 h-4" />
								<span class="text-sm text-(--color-surface-800-200)">Show page subtitle</span>
							</label>
						</div>
						<div>
							<label for="module-page-title-align" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Alignment
							</label>
							<select
								id="module-page-title-align"
								bind:value={pageTitleAlign}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							>
								<option value="center">Center</option>
								<option value="left">Left</option>
							</select>
						</div>
					</div>
				{:else if moduleForm.type === 'hero'}
					<!-- Hero Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-hero-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title
							</label>
							<MultiLangInput id="module-hero-title" bind:value={heroTitle} />
						</div>

						<div>
							<label for="module-hero-subtitle" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-hero-subtitle" bind:value={heroSubtitle} />
						</div>

						<div class="flex items-start gap-3 rounded-md border border-surface-300-700 bg-(--color-surface-50-950) p-3">
							<input
								id="module-hero-show-cta"
								type="checkbox"
								bind:checked={heroShowCta}
								class="mt-1 h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
							/>
							<div class="min-w-0 flex-1">
								<label for="module-hero-show-cta" class="block text-sm font-medium text-(--color-surface-800-200)">
									Show call-to-action button
								</label>
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									When off, the hero shows title and subtitle only (no button).
								</p>
							</div>
						</div>

						{#if heroShowCta}
							<div>
								<label for="module-hero-cta-label" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									Button label
								</label>
								<MultiLangInput id="module-hero-cta-label" bind:value={heroCtaLabel} />
							</div>

							<div>
								<label for="module-hero-cta-url" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									Button URL
								</label>
								<input
									id="module-hero-cta-url"
									type="url"
									bind:value={heroCtaUrl}
									placeholder="https://..."
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								/>
							</div>
						{/if}

						<div>
							<label for="module-hero-bg-style" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Background style
							</label>
							<select
								id="module-hero-bg-style"
								bind:value={heroBackgroundStyle}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="image">Custom image (URL)</option>
								<option value="galleryLeading">Gallery leading photo</option>
							</select>
							<p class="mt-1.5 text-xs text-(--color-surface-600-400)">
								<strong>Custom image</strong> — paste a direct link to an image file. <strong>Gallery leading photo</strong> — uses a featured
								photo from your library (no URL field).
							</p>
						</div>

						{#if heroBackgroundStyle === 'image'}
							<div>
								<label for="module-hero-bg-image" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									Background image URL
								</label>
								<input
									id="module-hero-bg-image"
									type="url"
									bind:value={heroBackgroundImage}
									placeholder="https://example.com/path/to/image.jpg"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								/>
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									Use this only with <strong>Custom image (URL)</strong>. For a featured gallery photo, pick <strong>Gallery leading photo</strong> instead (no URL).
								</p>
							</div>
						{/if}

						{#if heroBackgroundStyle === 'galleryLeading'}
							<p class="rounded-md border border-surface-300-700 bg-(--color-surface-50-950) px-3 py-2 text-xs text-(--color-surface-600-400)">
								Background comes from your published gallery-leading or album-cover photos. No URL is used.
							</p>
						{/if}
					</div>
				{:else if moduleForm.type === 'albumsGrid'}
					<!-- Albums Grid Module Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-albums-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title
							</label>
							<MultiLangInput id="module-albums-title" bind:value={albumsGridTitle} />
						</div>

						<div>
							<label for="module-albums-desc" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Description (Rich Text)
							</label>
							<MultiLangHTMLEditor id="module-albums-desc" bind:value={albumsGridDescription} />
						</div>

						<div>
							<label for="module-albums-card-layout" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Album card layout
							</label>
							<select
								id="module-albums-card-layout"
								bind:value={albumsGridAlbumCardLayout}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) bg-(--color-surface-50-950) text-(--color-surface-800-200)"
							>
								<option value="stack">Image on top (grid)</option>
								<option value="row">Image left, details right (one per row)</option>
							</select>
							<p class="mt-1 text-xs text-(--color-surface-600-400)">
								Row layout lists each album as a full-width horizontal card.
							</p>
						</div>

						<div>
							<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Select Albums
							</span>
							{#if albumsLoading}
								<div class="text-sm text-(--color-surface-600-400)">Loading albums...</div>
							{:else}
								<div class="border border-surface-300-700 rounded-md p-3 max-h-64 overflow-y-auto bg-(--color-surface-50-950)">
									{#if availableAlbums.length === 0}
										<p class="text-sm text-(--color-surface-600-400)">No albums available.</p>
									{:else}
										<div class="space-y-2">
											{#each availableAlbums as album}
												<label class="flex items-center gap-2 p-2 hover:bg-(--color-surface-50-950) rounded cursor-pointer">
													<input
														type="checkbox"
														checked={albumsGridSelectedAlbums.includes(album._id)}
														on:change={(e) => {
															if (e.currentTarget.checked) {
																albumsGridSelectedAlbums = [...albumsGridSelectedAlbums, album._id];
															} else {
																albumsGridSelectedAlbums = albumsGridSelectedAlbums.filter(id => id !== album._id);
															}
														}}
														class="w-4 h-4 text-(--color-primary-600) border-surface-300-700 rounded focus:ring-(--color-primary-500)"
													/>
													<span class="text-sm text-(--color-surface-800-200) flex-1">
														{'  '.repeat(album.level || 0)}{getAlbumDisplayName(album)}
													</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
							<p class="mt-1 text-xs text-(--color-surface-600-400)">
								Select one or more albums to display in the grid. Only the selected albums will be shown.
							</p>
							{#if albumsGridSelectedAlbums.length > 0}
								<p class="mt-1 text-xs text-(--color-primary-600)">
									{albumsGridSelectedAlbums.length} album{albumsGridSelectedAlbums.length !== 1 ? 's' : ''} selected
								</p>
							{/if}
						</div>
					</div>
				{:else if moduleForm.type === 'layoutShell'}
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<p class="text-sm text-(--color-surface-600-400)">
							An <strong>instance name</strong> is shared storage: multiple layoutShell modules can reuse one named grid.
						</p>
						<div>
							<label for="module-layout-shell-preset" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Instance name
							</label>
							<input
								id="module-layout-shell-preset"
								type="text"
								bind:value={layoutShellPresetKey}
								placeholder="e.g. site_header"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								on:input={() => {
									layoutShellPresetError = '';
								}}
							/>
							{#if layoutShellPresetError}
								<p class="mt-1 text-xs text-red-600">{layoutShellPresetError}</p>
							{/if}
						</div>
						<div>
							<label for="module-layout-shell-reuse" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Reuse existing instance
							</label>
							<select
								id="module-layout-shell-reuse"
								bind:value={layoutShellReusePick}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								on:change={() => {
									if (!layoutShellReusePick) return;
									layoutShellPresetKey = layoutShellReusePick;
									layoutShellPresetError = '';
									layoutShellReusePick = '';
								}}
							>
								<option value="">— Pick a saved instance —</option>
								{#each availableLayoutPresetNames as name}
									<option value={name}>{name}</option>
								{/each}
							</select>
						</div>
						<div class="flex justify-end">
							<button
								type="button"
								on:click={openLayoutShellEditorDialog}
								disabled={!layoutShellPresetKey.trim() && !layoutShellReusePick.trim()}
								class="px-3 py-2 text-xs bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700)"
							>
								Edit this instance
							</button>
						</div>
					</div>
				{:else if moduleForm.type === 'menu'}
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<p class="text-sm text-(--color-surface-600-400)">
							A <strong>menu instance</strong> stores menu items and style behavior. Multiple menu modules can reuse one instance.
						</p>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="module-menu-orientation" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									Orientation
								</label>
								<select
									id="module-menu-orientation"
									bind:value={menuOrientation}
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								>
									<option value="horizontal">Horizontal</option>
									<option value="vertical">Vertical</option>
								</select>
							</div>
							<div class="flex items-end">
								<label class="inline-flex items-center gap-2 text-sm text-(--color-surface-800-200)">
									<input type="checkbox" bind:checked={menuShowAuthButtons} />
									<span>Auto add login/logout links</span>
								</label>
							</div>
						</div>
						<div>
							<label for="module-menu-instance" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Instance name
							</label>
							<input
								id="module-menu-instance"
								type="text"
								bind:value={menuPresetKey}
								placeholder="e.g. header_main"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								on:input={() => {
									menuPresetError = '';
								}}
							/>
							{#if menuPresetError}
								<p class="mt-1 text-xs text-red-600">{menuPresetError}</p>
							{/if}
						</div>
						<div>
							<label for="module-menu-reuse" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Reuse existing instance
							</label>
							<select
								id="module-menu-reuse"
								bind:value={menuReusePick}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								on:change={() => {
									if (!menuReusePick) return;
									menuPresetKey = menuReusePick;
									menuPresetError = '';
									menuReusePick = '';
								}}
							>
								<option value="">— Pick a saved menu instance —</option>
								{#each availableMenuInstanceNames as name}
									<option value={name}>{name}</option>
								{/each}
							</select>
						</div>
						<div class="flex justify-end">
							<button
								type="button"
								on:click={openMenuEditorDialog}
								disabled={!menuPresetKey.trim() && !menuReusePick.trim()}
								class="px-3 py-2 text-xs bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700)"
							>
								Edit this instance
							</button>
						</div>
					</div>
				{:else if moduleForm.type === 'themeToggle'}
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-theme-toggle-variant" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Display
							</label>
							<select
								id="module-theme-toggle-variant"
								bind:value={themeToggleVariant}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							>
								<option value="icons">Icons (sun / moon)</option>
								<option value="text">Text (Light / Dark)</option>
							</select>
							<p class="mt-1 text-xs text-(--color-surface-600-400)">
								Text labels describe the theme you switch to when clicking.
							</p>
						</div>
					</div>
				{/if}
				<div class="space-y-1 border-t border-surface-200-800 pt-4">
					<label for="module-wrapper-class" class="block text-sm font-medium text-(--color-surface-800-200)">
						Wrapper class name (optional)
					</label>
					<input
						id="module-wrapper-class"
						type="text"
						bind:value={moduleWrapperClassName}
						placeholder="e.g. tpl-about-header"
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
					<p class="text-xs text-(--color-surface-600-400)">
						If set, this class is added to the module wrapper in the page grid.
					</p>
				</div>
				{#if moduleForm.type === 'blogCategory'}
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-blog-category-alias" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Blog Category
							</label>
							<select
								id="module-blog-category-alias"
								bind:value={blogCategoryAlias}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							>
								<option value="">All categories</option>
								{#each availableBlogCategories as category}
									<option value={category.alias}>{category.title} ({category.alias})</option>
								{/each}
							</select>
							<p class="mt-1 text-xs text-(--color-surface-600-400)">
								Optional: show only one specific blog category in this module.
							</p>
						</div>
					</div>
				{:else if !['featureGrid', 'richText', 'pageTitle', 'hero', 'albumsGrid', 'layoutShell', 'menu', 'themeToggle'].includes(moduleForm.type)}
					<!-- JSON Editor for other module types -->
					<div>
						<label for="module-props-json" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Props (JSON)
						</label>
						<textarea
							id="module-props-json"
							bind:value={moduleForm.propsJson}
							rows={10}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) font-mono text-sm"
						></textarea>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">
							Enter module properties as JSON. Example: <code class="text-xs">{'{'}"title": {'{'}"en": "Hello"{'}'}, "description": {'{'}"en": "World"{'}'}{'}'}</code>
						</p>
					</div>
				{/if}

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showModuleEditDialog = false;
							editingModule = null;
							resetModuleForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={saveModuleEdit}
						class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) text-sm font-medium"
					>
						Save Module
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Dialog -->
{#if showEditDialog && editingPage}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">Edit Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="edit-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Title *
						</label>
						<MultiLangInput id="edit-title" bind:value={formData.title} />
					</div>

					<div>
						<label for="edit-alias" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Alias *
						</label>
						<input
							id="edit-alias"
							type="text"
							bind:value={formData.alias}
							placeholder="page-url-slug"
							required
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div>
					<label for="edit-subtitle" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Subtitle
					</label>
					<MultiLangInput id="edit-subtitle" bind:value={formData.subtitle} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="edit-category" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Category
						</label>
						<select
							id="edit-category"
							bind:value={formData.category}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						>
							{#each CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="edit-template-pack" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Template packs (optional)
						</label>
						<p class="text-xs text-(--color-surface-600-400) mb-1">
							Assign one or more packs to this page. No selection means default fallback for this role.
						</p>
						<div id="edit-template-pack" class="grid grid-cols-1 sm:grid-cols-3 gap-2">
							{#each PACK_OPTIONS as opt}
								<label class="inline-flex items-center gap-2 text-sm text-(--color-surface-800-200)">
									<input
										type="checkbox"
										checked={formData.frontendTemplates.includes(opt.value)}
										on:change={(e) => {
											const checked = (e.currentTarget as HTMLInputElement).checked;
											formData.frontendTemplates = checked
												? Array.from(new Set([...formData.frontendTemplates, opt.value]))
												: formData.frontendTemplates.filter((p) => p !== opt.value);
											formData.frontendTemplate = (formData.frontendTemplates[0] ?? '') as any;
										}}
									/>
									<span>{opt.label}</span>
								</label>
							{/each}
						</div>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="edit-page-role" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Page role (optional)
						</label>
						<select
							id="edit-page-role"
							bind:value={formData.pageRole}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						>
							{#each PAGE_ROLES as role}
								<option value={role.value}>{role.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="edit-parent-page-id" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Parent page ID (optional)
						</label>
						<input
							id="edit-parent-page-id"
							type="text"
							bind:value={formData.parentPageId}
							placeholder="Mongo ObjectId"
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
					<div>
						<label for="edit-route-params" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Route params (optional)
						</label>
						<input
							id="edit-route-params"
							type="text"
							bind:value={formData.routeParamsCsv}
							placeholder="albumAlias, categoryAlias"
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div>
					<label for="edit-leading-image" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Leading Image URL
					</label>
					<input
						id="edit-leading-image"
						type="text"
						bind:value={formData.leadingImage}
						placeholder="https://..."
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="edit-grid-rows" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Grid Rows
						</label>
						<input
							id="edit-grid-rows"
							type="number"
							min="1"
							max="20"
							bind:value={formData.gridRows}
							placeholder="1"
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>

					<div>
						<label for="edit-grid-cols" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Grid Columns
						</label>
						<input
							id="edit-grid-cols"
							type="number"
							min="1"
							max="12"
							bind:value={formData.gridColumns}
							placeholder="1"
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div>
					<label for="edit-url-params" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						URL Parameters (optional)
					</label>
					<input
						id="edit-url-params"
						type="text"
						bind:value={formData.urlParams}
						placeholder="param1=value1&param2=value2"
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
					<p class="mt-1 text-xs text-(--color-surface-600-400)">Query parameters for the page URL.</p>
				</div>

				<div class="border-t border-surface-200-800 pt-6">
					<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-4">Page Grid Layout</h3>
					<p class="text-sm text-(--color-surface-600-400) mb-4">
						Grid: {formData.gridRows} row{formData.gridRows !== 1 ? 's' : ''} × {formData.gridColumns} column{formData.gridColumns !== 1 ? 's' : ''}
					</p>
					{#if modulesError}
						<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
					{/if}

					{#if modulesLoading}
						<p class="text-sm text-(--color-surface-600-400)">Loading layout...</p>
					{:else}
						<RowColumnLayoutBuilder
							modules={modules}
							rowStructure={rowStructure}
							onAssignModule={handleAssignModule}
							onRemoveModule={deleteModule}
							onEditModule={editModule}
							onMoveRow={handleMoveRow}
							onInsertRow={handleInsertRow}
							availableModuleTypes={MODULE_TYPES}
						/>
					{/if}
				</div>

				<div class="flex items-center">
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.isPublished}
							class="sr-only peer"
						/>
						<div
							class="w-11 h-6 bg-(--color-surface-200-800) peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[color-mix(in_oklab,var(--color-primary-500)_35%,transparent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-(--color-surface-50-950) after:border-surface-300-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-(--color-primary-600)"
						></div>
						<span class="ml-3 text-sm font-medium text-(--color-surface-800-200)">
							Published
						</span>
					</label>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showEditDialog = false;
							editingPage = null;
							resetForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving || !formData.title || !formData.alias.trim()}
						class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Updating...
						{:else}
							Update Page
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Module Edit Dialog -->
{#if false && showModuleEditDialog && editingModule}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full {moduleForm.type === 'featureGrid' || moduleForm.type === 'richText' || moduleForm.type === 'hero' || moduleForm.type === 'albumsGrid' ? 'max-w-4xl' : 'max-w-2xl'} p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">Edit Module</h2>

			{#if modulesError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="module-type" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Module Type
					</label>
					<select
						id="module-type"
						bind:value={moduleForm.type}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					>
						{#each MODULE_TYPES as moduleType}
							<option value={moduleType.value}>{moduleType.label}</option>
						{/each}
					</select>
				</div>

				{#if moduleForm.type === 'featureGrid'}
					<!-- Feature Grid Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-feature-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title
							</label>
							<MultiLangInput id="module-feature-title" bind:value={featureGridTitle} />
						</div>

						<div>
							<label for="module-feature-subtitle" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-feature-subtitle" bind:value={featureGridSubtitle} />
						</div>

						<div class="border-t border-surface-200-800 pt-4">
							<div class="flex items-center justify-between mb-4">
								<span class="block text-sm font-medium text-(--color-surface-800-200)">
									Features
								</span>
								<button
									type="button"
									on:click={addFeatureItem}
									class="px-3 py-1.5 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) text-sm font-medium"
								>
									+ Add Item
								</button>
							</div>

							{#if featureGridItems.length === 0}
								<p class="text-sm text-(--color-surface-600-400) py-4 text-center border-2 border-dashed border-surface-300-700 rounded">
									No features yet. Click "Add Item" to add a feature.
								</p>
							{:else}
								<div class="space-y-4">
									{#each featureGridItems as item, index (index)}
										<div class="border border-surface-300-700 rounded-lg p-4 bg-(--color-surface-50-950)">
											<div class="flex items-center justify-between mb-3">
												<span class="text-sm font-medium text-(--color-surface-800-200)">Feature {index + 1}</span>
												<button
													type="button"
													on:click={() => removeFeatureItem(index)}
													class="text-sm text-red-600 hover:text-red-800"
												>
													Remove
												</button>
											</div>

											<div class="space-y-3">
												<div>
													<span class="block text-xs font-medium text-(--color-surface-600-400) mb-1">
														Icon
													</span>
													<div class="flex gap-2">
														<IconSelector
															bind:value={item.icon}
															placeholder="Select an icon..."
															on:change={(e) => {
																item.icon = e.detail.value as string;
															}}
														/>
														{#if item.icon === 'custom' || (item.icon && !AVAILABLE_ICONS.includes(item.icon))}
															<input
																type="text"
																bind:value={item.icon}
																placeholder="🎨 or custom text"
																class="flex-1 px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) text-sm"
																on:click|stopPropagation
																on:mousedown|stopPropagation
															/>
														{/if}
													</div>
													<p class="mt-1 text-xs text-(--color-surface-600-400)">
														Select an icon from the list, or choose "Custom..." to enter an emoji or custom text.
													</p>
												</div>

												<div>
													<label for="module-feature-item-{index}-title" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">
														Title
													</label>
													<MultiLangInput id="module-feature-item-{index}-title" bind:value={item.title} />
												</div>

												<div>
													<label for="module-feature-item-{index}-desc" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">
														Description (Rich Text)
													</label>
													<MultiLangHTMLEditor id="module-feature-item-{index}-desc" bind:value={item.description} />
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{:else if moduleForm.type === 'richText'}
					<!-- Rich Text Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-richtext-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title (optional)
							</label>
							<MultiLangInput id="module-richtext-title" bind:value={richTextTitle} />
						</div>

						<div>
							<label for="module-richtext-body" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Body Content
							</label>
							<MultiLangHTMLEditor id="module-richtext-body" bind:value={richTextBody} />
						</div>

						<div>
							<label for="module-richtext-bg" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Background Color
							</label>
							<select
								id="module-richtext-bg"
								bind:value={richTextBackground}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							>
								<option value="white">White</option>
								<option value="gray">Gray</option>
							</select>
						</div>
					</div>
				{:else if moduleForm.type === 'hero'}
					<!-- Hero Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-hero-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title
							</label>
							<MultiLangInput id="module-hero-title" bind:value={heroTitle} />
						</div>

						<div>
							<label for="module-hero-subtitle" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-hero-subtitle" bind:value={heroSubtitle} />
						</div>

						<div class="flex items-start gap-3 rounded-md border border-surface-300-700 bg-(--color-surface-50-950) p-3">
							<input
								id="module-hero-show-cta"
								type="checkbox"
								bind:checked={heroShowCta}
								class="mt-1 h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
							/>
							<div class="min-w-0 flex-1">
								<label for="module-hero-show-cta" class="block text-sm font-medium text-(--color-surface-800-200)">
									Show call-to-action button
								</label>
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									When off, the hero shows title and subtitle only (no button).
								</p>
							</div>
						</div>

						{#if heroShowCta}
							<div>
								<label for="module-hero-cta-label" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									Button label
								</label>
								<MultiLangInput id="module-hero-cta-label" bind:value={heroCtaLabel} />
							</div>

							<div>
								<label for="module-hero-cta-url" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									Button URL
								</label>
								<input
									id="module-hero-cta-url"
									type="url"
									bind:value={heroCtaUrl}
									placeholder="https://..."
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								/>
							</div>
						{/if}

						<div>
							<label for="module-hero-bg-style" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Background style
							</label>
							<select
								id="module-hero-bg-style"
								bind:value={heroBackgroundStyle}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="image">Custom image (URL)</option>
								<option value="galleryLeading">Gallery leading photo</option>
							</select>
							<p class="mt-1.5 text-xs text-(--color-surface-600-400)">
								<strong>Custom image</strong> — paste a direct link to an image file. <strong>Gallery leading photo</strong> — uses a featured
								photo from your library (no URL field).
							</p>
						</div>

						{#if heroBackgroundStyle === 'image'}
							<div>
								<label for="module-hero-bg-image" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									Background image URL
								</label>
								<input
									id="module-hero-bg-image"
									type="url"
									bind:value={heroBackgroundImage}
									placeholder="https://example.com/path/to/image.jpg"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								/>
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									Use this only with <strong>Custom image (URL)</strong>. For a featured gallery photo, pick <strong>Gallery leading photo</strong> instead (no URL).
								</p>
							</div>
						{/if}

						{#if heroBackgroundStyle === 'galleryLeading'}
							<p class="rounded-md border border-surface-300-700 bg-(--color-surface-50-950) px-3 py-2 text-xs text-(--color-surface-600-400)">
								Background comes from your published gallery-leading or album-cover photos. No URL is used.
							</p>
						{/if}
					</div>
				{:else if moduleForm.type === 'albumsGrid'}
					<!-- Albums Grid Module Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-albums-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title
							</label>
							<MultiLangInput id="module-albums-title" bind:value={albumsGridTitle} />
						</div>

						<div>
							<label for="module-albums-desc" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Description (Rich Text)
							</label>
							<MultiLangHTMLEditor id="module-albums-desc" bind:value={albumsGridDescription} />
						</div>

						<div>
							<label for="module-albums-card-layout" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Album card layout
							</label>
							<select
								id="module-albums-card-layout"
								bind:value={albumsGridAlbumCardLayout}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) bg-(--color-surface-50-950) text-(--color-surface-800-200)"
							>
								<option value="stack">Image on top (grid)</option>
								<option value="row">Image left, details right (one per row)</option>
							</select>
							<p class="mt-1 text-xs text-(--color-surface-600-400)">
								Row layout lists each album as a full-width horizontal card.
							</p>
						</div>

						<div>
							<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Select Albums
							</span>
							{#if albumsLoading}
								<div class="text-sm text-(--color-surface-600-400)">Loading albums...</div>
							{:else}
								<div class="border border-surface-300-700 rounded-md p-3 max-h-64 overflow-y-auto bg-(--color-surface-50-950)">
									{#if availableAlbums.length === 0}
										<p class="text-sm text-(--color-surface-600-400)">No albums available.</p>
									{:else}
										<div class="space-y-2">
											{#each availableAlbums as album}
												<label class="flex items-center gap-2 p-2 hover:bg-(--color-surface-50-950) rounded cursor-pointer">
													<input
														type="checkbox"
														checked={albumsGridSelectedAlbums.includes(album._id)}
														on:change={(e) => {
															if (e.currentTarget.checked) {
																albumsGridSelectedAlbums = [...albumsGridSelectedAlbums, album._id];
															} else {
																albumsGridSelectedAlbums = albumsGridSelectedAlbums.filter(id => id !== album._id);
															}
														}}
														class="w-4 h-4 text-(--color-primary-600) border-surface-300-700 rounded focus:ring-(--color-primary-500)"
													/>
													<span class="text-sm text-(--color-surface-800-200) flex-1">
														{'  '.repeat(album.level || 0)}{getAlbumDisplayName(album)}
													</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
							<p class="mt-1 text-xs text-(--color-surface-600-400)">
								Select one or more albums to display in the grid. Only the selected albums will be shown.
							</p>
							{#if albumsGridSelectedAlbums.length > 0}
								<p class="mt-1 text-xs text-(--color-primary-600)">
									{albumsGridSelectedAlbums.length} album{albumsGridSelectedAlbums.length !== 1 ? 's' : ''} selected
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<!-- JSON Editor for other module types -->
					<div>
						<label for="module-props-json" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Props (JSON)
						</label>
						<textarea
							id="module-props-json"
							bind:value={moduleForm.propsJson}
							rows={10}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) font-mono text-sm"
						></textarea>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">
							Enter module properties as JSON. Example: <code class="text-xs">{'{'}"title": {'{'}"en": "Hello"{'}'}, "description": {'{'}"en": "World"{'}'}{'}'}</code>
						</p>
					</div>
				{/if}

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showModuleEditDialog = false;
							editingModule = null;
							resetModuleForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={saveModuleEdit}
						class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) text-sm font-medium"
					>
						Save Module
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Duplicate Dialog -->
{#if showDuplicateDialog && pageToDuplicate}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-lg p-6">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-2">Duplicate page</h2>
			<p class="text-sm text-(--color-surface-600-400) mb-4">
				Copies layout modules and content. A new unique alias is generated unless you set one below.
				{#if pageToDuplicate.pageRole}
					Reserved role <code class="text-xs">{pageToDuplicate.pageRole}</code>: pick the template pack for the
<strong>new</strong> copy (selection cannot overlap packs already assigned to this role).
				{/if}
			</p>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="dup-pack" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Template packs for the copy
					</label>
					<div id="dup-pack" class="grid grid-cols-1 sm:grid-cols-3 gap-2">
						{#each PACK_OPTIONS as opt}
							<label class="inline-flex items-center gap-2 text-sm text-(--color-surface-800-200)">
								<input
									type="checkbox"
									checked={duplicateTargetPacks.includes(opt.value)}
									on:change={(e) => {
										const checked = (e.currentTarget as HTMLInputElement).checked;
										duplicateTargetPacks = checked
											? Array.from(new Set([...duplicateTargetPacks, opt.value]))
											: duplicateTargetPacks.filter((p) => p !== opt.value);
									}}
								/>
								<span>{opt.label}</span>
							</label>
						{/each}
					</div>
					<p class="mt-1 text-xs text-(--color-surface-600-400)">
						No selection means default fallback variant.
					</p>
				</div>
				<div>
					<label for="dup-alias" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Alias / slug (optional)
					</label>
					<input
						id="dup-alias"
						type="text"
						bind:value={duplicateAliasOverride}
						placeholder="e.g. home-noir (leave empty for auto: …-copy, …-copy-2)"
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
				</div>
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={closeDuplicateDialog}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleDuplicatePage}
						disabled={saving}
						class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Duplicating…
						{:else}
							Duplicate
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Layout Shell Instance Editor -->
{#if showLayoutShellEditorDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-2">Edit layoutShell instance</h2>
			<p class="text-sm text-(--color-surface-600-400) mb-4">
				Instance: <code>{layoutShellEditorKey}</code>
			</p>
			{#if layoutShellEditorError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{layoutShellEditorError}</div>
			{/if}
			<div class="grid grid-cols-2 gap-4 mb-4">
				<div>
					<label for="ls-grid-rows" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">Grid rows</label>
					<input id="ls-grid-rows" type="number" min="1" bind:value={layoutShellEditorGridRows}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)" />
				</div>
				<div>
					<label for="ls-grid-cols" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">Grid columns</label>
					<input id="ls-grid-cols" type="number" min="1" bind:value={layoutShellEditorGridColumns}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)" />
				</div>
			</div>
			<div class="mb-2">
				<button
					type="button"
					on:click={() => {
						const rows = Math.max(1, Number(layoutShellEditorGridRows || 1));
						const cols = Math.max(1, Number(layoutShellEditorGridColumns || 1));
						const rowMap = new Map<number, number[]>();
						for (let r = 0; r < rows; r++) rowMap.set(r, Array(cols).fill(1));
						layoutShellEditorRowStructure = rowMap;
						layoutShellEditorModules = layoutShellEditorModules.filter((m) => (m.rowOrder ?? 0) < rows && (m.columnIndex ?? 0) < cols);
					}}
					class="px-3 py-2 text-xs bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700)"
				>
					Apply grid size
				</button>
			</div>
			<RowColumnLayoutBuilder
				modules={layoutShellEditorModules}
				rowStructure={layoutShellEditorRowStructure}
				onAssignModule={handleAssignLayoutShellModule}
				onRemoveModule={handleRemoveLayoutShellModule}
				onEditModule={handleEditLayoutShellModule}
				availableModuleTypes={MODULE_TYPES}
				onMoveRow={moveLayoutShellRow}
				onInsertRow={insertLayoutShellRow}
			/>
			<div class="flex justify-end gap-2">
				<button type="button" on:click={deleteLayoutShellInstance} disabled={layoutShellEditorSaving}
					class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium mr-auto">
					Delete instance
				</button>
				<button type="button" on:click={() => (showLayoutShellEditorDialog = false)}
					class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium">
					Cancel
				</button>
				<button type="button" on:click={saveLayoutShellInstance} disabled={layoutShellEditorSaving}
					class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) disabled:opacity-50 text-sm font-medium">
					{layoutShellEditorSaving ? 'Saving...' : 'Save instance'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Menu Instance Editor -->
{#if showMenuEditorDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-2">Edit menu instance</h2>
			<p class="text-sm text-(--color-surface-600-400) mb-4">
				Instance: <code>{menuEditorKey}</code>
			</p>
			{#if menuEditorError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{menuEditorError}</div>
			{/if}
			<div class="grid grid-cols-2 gap-4 mb-4">
				<div>
					<label for="menu-editor-orientation" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">Orientation</label>
					<select id="menu-editor-orientation" bind:value={menuEditorOrientation}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)">
						<option value="horizontal">Horizontal</option>
						<option value="vertical">Vertical</option>
					</select>
				</div>
				<div class="flex items-end">
					<label class="inline-flex items-center gap-2 text-sm text-(--color-surface-800-200)">
						<input type="checkbox" bind:checked={menuEditorShowAuthButtons} />
						<span>Auto add auth links</span>
					</label>
				</div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<div>
					<label for="menu-editor-item-class" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">Item class (optional)</label>
					<input id="menu-editor-item-class" type="text" bind:value={menuEditorItemClass}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)" />
				</div>
				<div>
					<label for="menu-editor-active-item-class" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">Active item class (optional)</label>
					<input id="menu-editor-active-item-class" type="text" bind:value={menuEditorActiveItemClass}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)" />
				</div>
				<div>
					<label for="menu-editor-container-class" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">Container class (optional)</label>
					<input id="menu-editor-container-class" type="text" bind:value={menuEditorContainerClass}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)" />
				</div>
				<div class="space-y-2">
					<label class="inline-flex items-center gap-2 text-sm text-(--color-surface-800-200)">
						<input type="checkbox" bind:checked={menuEditorShowActiveIndicator} />
						<span>Show active item highlight</span>
					</label>
					<label class="inline-flex items-center gap-2 text-sm text-(--color-surface-800-200)">
						<input type="checkbox" bind:checked={menuEditorSeparatorEnabled} />
						<span>Show separator between links</span>
					</label>
					{#if menuEditorSeparatorEnabled}
						<input type="text" bind:value={menuEditorSeparatorText} placeholder="|"
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)" />
					{/if}
				</div>
			</div>
			<div class="border-t border-surface-200-800 pt-4 space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-semibold text-(--color-surface-900-100)">Menu items</h3>
					<button
						type="button"
						on:click={addMenuEditorItem}
						class="px-3 py-1.5 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) text-sm font-medium"
					>
						+ Add item
					</button>
				</div>
				{#if menuEditorItems.length === 0}
					<p class="text-sm text-(--color-surface-600-400)">No custom items. Defaults/menu config fallback will be used.</p>
				{:else}
					<div class="space-y-3">
						{#each menuEditorItems as item, idx (`menu-item-${idx}`)}
							<div class="border border-surface-300-700 rounded-md p-3 space-y-3">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div>
										<label for={"menu-item-label-" + idx} class="block text-xs font-medium text-(--color-surface-600-400) mb-1">Label</label>
										<input id={"menu-item-label-" + idx} type="text" bind:value={item.label}
											class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)" />
									</div>
									<div>
										<label for={"menu-item-label-key-" + idx} class="block text-xs font-medium text-(--color-surface-600-400) mb-1">Label key (i18n)</label>
										<input id={"menu-item-label-key-" + idx} type="text" bind:value={item.labelKey} placeholder="navigation.home"
											class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)" />
									</div>
									<div>
										<label for={"menu-item-type-" + idx} class="block text-xs font-medium text-(--color-surface-600-400) mb-1">Type</label>
										<select id={"menu-item-type-" + idx} bind:value={item.type}
											class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)">
											<option value="link">Link</option>
											<option value="login">Login</option>
											<option value="logout">Logout</option>
										</select>
									</div>
									<div>
										<label for={"menu-item-show-when-" + idx} class="block text-xs font-medium text-(--color-surface-600-400) mb-1">Show when</label>
										<select id={"menu-item-show-when-" + idx} bind:value={item.showWhen}
											class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)">
											<option value="always">Always</option>
											<option value="loggedIn">Logged in</option>
											<option value="loggedOut">Logged out</option>
										</select>
									</div>
									<div class="md:col-span-2">
										<label for={"menu-item-href-" + idx} class="block text-xs font-medium text-(--color-surface-600-400) mb-1">Href</label>
										<input id={"menu-item-href-" + idx} type="text" bind:value={item.href} placeholder="/about"
											class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)" />
									</div>
								</div>
								<div class="flex items-center justify-between">
									<label class="inline-flex items-center gap-2 text-xs text-(--color-surface-700-300)">
										<input type="checkbox" bind:checked={item.external} />
										<span>Open in new tab</span>
									</label>
									<button type="button" on:click={() => removeMenuEditorItem(idx)}
										class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
										Remove
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-2 mt-4">
				<button type="button" on:click={deleteMenuInstance} disabled={menuEditorSaving}
					class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium mr-auto">
					Delete instance
				</button>
				<button type="button" on:click={() => (showMenuEditorDialog = false)}
					class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium">
					Cancel
				</button>
				<button type="button" on:click={saveMenuInstance} disabled={menuEditorSaving}
					class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) disabled:opacity-50 text-sm font-medium">
					{menuEditorSaving ? 'Saving...' : 'Save instance'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && pageToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">Delete Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-(--color-surface-600-400)">
					Are you sure you want to delete <strong>{getPageTitle(pageToDelete)}</strong> ({pageToDelete.alias})? This
					action cannot be undone.
				</p>
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							showDeleteDialog = false;
							pageToDelete = null;
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleDelete}
						disabled={saving}
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Deleting...
						{:else}
							Delete Page
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Module Edit Dialog -->
{#if false && showModuleEditDialog && editingModule}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full {moduleForm.type === 'featureGrid' || moduleForm.type === 'richText' || moduleForm.type === 'hero' || moduleForm.type === 'albumsGrid' ? 'max-w-4xl' : 'max-w-2xl'} p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">Edit Module</h2>

			{#if modulesError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="module-type" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						Module Type
					</label>
					<select
						id="module-type"
						bind:value={moduleForm.type}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					>
						{#each MODULE_TYPES as moduleType}
							<option value={moduleType.value}>{moduleType.label}</option>
						{/each}
					</select>
				</div>

				{#if moduleForm.type === 'featureGrid'}
					<!-- Feature Grid Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-feature-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title
							</label>
							<MultiLangInput id="module-feature-title" bind:value={featureGridTitle} />
						</div>

						<div>
							<label for="module-feature-subtitle" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-feature-subtitle" bind:value={featureGridSubtitle} />
						</div>

						<div class="border-t border-surface-200-800 pt-4">
							<div class="flex items-center justify-between mb-4">
								<span class="block text-sm font-medium text-(--color-surface-800-200)">
									Features
								</span>
								<button
									type="button"
									on:click={addFeatureItem}
									class="px-3 py-1.5 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) text-sm font-medium"
								>
									+ Add Item
								</button>
							</div>

							{#if featureGridItems.length === 0}
								<p class="text-sm text-(--color-surface-600-400) py-4 text-center border-2 border-dashed border-surface-300-700 rounded">
									No features yet. Click "Add Item" to add a feature.
								</p>
							{:else}
								<div class="space-y-4">
									{#each featureGridItems as item, index (index)}
										<div class="border border-surface-300-700 rounded-lg p-4 bg-(--color-surface-50-950)">
											<div class="flex items-center justify-between mb-3">
												<span class="text-sm font-medium text-(--color-surface-800-200)">Feature {index + 1}</span>
												<button
													type="button"
													on:click={() => removeFeatureItem(index)}
													class="text-sm text-red-600 hover:text-red-800"
												>
													Remove
												</button>
											</div>

											<div class="space-y-3">
												<div>
													<span class="block text-xs font-medium text-(--color-surface-600-400) mb-1">
														Icon
													</span>
													<div class="flex gap-2">
														<IconSelector
															bind:value={item.icon}
															placeholder="Select an icon..."
															on:change={(e) => {
																item.icon = e.detail.value as string;
															}}
														/>
														{#if item.icon === 'custom' || (item.icon && !AVAILABLE_ICONS.includes(item.icon))}
															<input
																type="text"
																bind:value={item.icon}
																placeholder="🎨 or custom text"
																class="flex-1 px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) text-sm"
																on:click|stopPropagation
																on:mousedown|stopPropagation
															/>
														{/if}
													</div>
													<p class="mt-1 text-xs text-(--color-surface-600-400)">
														Select an icon from the list, or choose "Custom..." to enter an emoji or custom text.
													</p>
												</div>

												<div>
													<label for="module-feature-item-{index}-title" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">
														Title
													</label>
													<MultiLangInput id="module-feature-item-{index}-title" bind:value={item.title} />
												</div>

												<div>
													<label for="module-feature-item-{index}-desc" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">
														Description (Rich Text)
													</label>
													<MultiLangHTMLEditor id="module-feature-item-{index}-desc" bind:value={item.description} />
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{:else if moduleForm.type === 'richText'}
					<!-- Rich Text Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-richtext-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title (optional)
							</label>
							<MultiLangInput id="module-richtext-title" bind:value={richTextTitle} />
						</div>

						<div>
							<label for="module-richtext-body" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Body Content
							</label>
							<MultiLangHTMLEditor id="module-richtext-body" bind:value={richTextBody} />
						</div>

						<div>
							<label for="module-richtext-bg" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Background Color
							</label>
							<select
								id="module-richtext-bg"
								bind:value={richTextBackground}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							>
								<option value="white">White</option>
								<option value="gray">Gray</option>
							</select>
						</div>
					</div>
				{:else if moduleForm.type === 'hero'}
					<!-- Hero Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-hero-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title
							</label>
							<MultiLangInput id="module-hero-title" bind:value={heroTitle} />
						</div>

						<div>
							<label for="module-hero-subtitle" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-hero-subtitle" bind:value={heroSubtitle} />
						</div>

						<div class="flex items-start gap-3 rounded-md border border-surface-300-700 bg-(--color-surface-50-950) p-3">
							<input
								id="module-hero-show-cta"
								type="checkbox"
								bind:checked={heroShowCta}
								class="mt-1 h-4 w-4 rounded border-surface-300-700 text-(--color-primary-600) focus:ring-(--color-primary-500)"
							/>
							<div class="min-w-0 flex-1">
								<label for="module-hero-show-cta" class="block text-sm font-medium text-(--color-surface-800-200)">
									Show call-to-action button
								</label>
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									When off, the hero shows title and subtitle only (no button).
								</p>
							</div>
						</div>

						{#if heroShowCta}
							<div>
								<label for="module-hero-cta-label" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									Button label
								</label>
								<MultiLangInput id="module-hero-cta-label" bind:value={heroCtaLabel} />
							</div>

							<div>
								<label for="module-hero-cta-url" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									Button URL
								</label>
								<input
									id="module-hero-cta-url"
									type="url"
									bind:value={heroCtaUrl}
									placeholder="https://..."
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								/>
							</div>
						{/if}

						<div>
							<label for="module-hero-bg-style" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Background style
							</label>
							<select
								id="module-hero-bg-style"
								bind:value={heroBackgroundStyle}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="image">Custom image (URL)</option>
								<option value="galleryLeading">Gallery leading photo</option>
							</select>
							<p class="mt-1.5 text-xs text-(--color-surface-600-400)">
								<strong>Custom image</strong> — paste a direct link to an image file. <strong>Gallery leading photo</strong> — uses a featured
								photo from your library (no URL field).
							</p>
						</div>

						{#if heroBackgroundStyle === 'image'}
							<div>
								<label for="module-hero-bg-image" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									Background image URL
								</label>
								<input
									id="module-hero-bg-image"
									type="url"
									bind:value={heroBackgroundImage}
									placeholder="https://example.com/path/to/image.jpg"
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								/>
								<p class="mt-1 text-xs text-(--color-surface-600-400)">
									Use this only with <strong>Custom image (URL)</strong>. For a featured gallery photo, pick <strong>Gallery leading photo</strong> instead (no URL).
								</p>
							</div>
						{/if}

						{#if heroBackgroundStyle === 'galleryLeading'}
							<p class="rounded-md border border-surface-300-700 bg-(--color-surface-50-950) px-3 py-2 text-xs text-(--color-surface-600-400)">
								Background comes from your published gallery-leading or album-cover photos. No URL is used.
							</p>
						{/if}
					</div>
				{:else if moduleForm.type === 'albumsGrid'}
					<!-- Albums Grid Module Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-albums-title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Title
							</label>
							<MultiLangInput id="module-albums-title" bind:value={albumsGridTitle} />
						</div>

						<div>
							<label for="module-albums-desc" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Description (Rich Text)
							</label>
							<MultiLangHTMLEditor id="module-albums-desc" bind:value={albumsGridDescription} />
						</div>

						<div>
							<label for="module-albums-card-layout" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Album card layout
							</label>
							<select
								id="module-albums-card-layout"
								bind:value={albumsGridAlbumCardLayout}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) bg-(--color-surface-50-950) text-(--color-surface-800-200)"
							>
								<option value="stack">Image on top (grid)</option>
								<option value="row">Image left, details right (one per row)</option>
							</select>
							<p class="mt-1 text-xs text-(--color-surface-600-400)">
								Row layout lists each album as a full-width horizontal card.
							</p>
						</div>

						<div>
							<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Select Albums
							</span>
							{#if albumsLoading}
								<div class="text-sm text-(--color-surface-600-400)">Loading albums...</div>
							{:else}
								<div class="border border-surface-300-700 rounded-md p-3 max-h-64 overflow-y-auto bg-(--color-surface-50-950)">
									{#if availableAlbums.length === 0}
										<p class="text-sm text-(--color-surface-600-400)">No albums available.</p>
									{:else}
										<div class="space-y-2">
											{#each availableAlbums as album}
												<label class="flex items-center gap-2 p-2 hover:bg-(--color-surface-50-950) rounded cursor-pointer">
													<input
														type="checkbox"
														checked={albumsGridSelectedAlbums.includes(album._id)}
														on:change={(e) => {
															if (e.currentTarget.checked) {
																albumsGridSelectedAlbums = [...albumsGridSelectedAlbums, album._id];
															} else {
																albumsGridSelectedAlbums = albumsGridSelectedAlbums.filter(id => id !== album._id);
															}
														}}
														class="w-4 h-4 text-(--color-primary-600) border-surface-300-700 rounded focus:ring-(--color-primary-500)"
													/>
													<span class="text-sm text-(--color-surface-800-200) flex-1">
														{'  '.repeat(album.level || 0)}{getAlbumDisplayName(album)}
													</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
							<p class="mt-1 text-xs text-(--color-surface-600-400)">
								Select one or more albums to display in the grid. Only the selected albums will be shown.
							</p>
							{#if albumsGridSelectedAlbums.length > 0}
								<p class="mt-1 text-xs text-(--color-primary-600)">
									{albumsGridSelectedAlbums.length} album{albumsGridSelectedAlbums.length !== 1 ? 's' : ''} selected
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<!-- JSON Editor for other module types -->
					<div>
						<label for="module-props-json" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Props (JSON)
						</label>
						<textarea
							id="module-props-json"
							bind:value={moduleForm.propsJson}
							rows={10}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) font-mono text-sm"
						></textarea>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">
							Enter module properties as JSON. Example: <code class="text-xs">{'{'}"title": {'{'}"en": "Hello"{'}'}, "description": {'{'}"en": "World"{'}'}{'}'}</code>
						</p>
					</div>
				{/if}

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showModuleEditDialog = false;
							editingModule = null;
							resetModuleForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={saveModuleEdit}
						class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) text-sm font-medium"
					>
						Save Module
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
