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
		ctaLabel?: MultiLangText;
		ctaUrl?: string;
		backgroundStyle?: 'light' | 'dark' | 'image' | 'galleryLeading';
		backgroundImage?: string;
	}

	interface AlbumsGridProps {
		title: MultiLangText;
		description: MultiLangHTML;
		selectedAlbums: string[];
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

	const MODULE_TYPES = [
		{ value: 'pageTitle', label: 'Page title' },
		{ value: 'loginForm', label: 'Login Form' },
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
		transformPayload: (data: Partial<Page> & { gridRows?: number; gridColumns?: number; urlParams?: string; layoutZones?: string }) => {
			const layout: { zones: string[]; gridRows?: number; gridColumns?: number; urlParams?: string } = { zones: parseZones(data.layoutZones || 'main') };
			if (data.gridRows !== undefined) layout.gridRows = data.gridRows;
			if (data.gridColumns !== undefined) layout.gridColumns = data.gridColumns;
			if (data.urlParams) layout.urlParams = data.urlParams;

			return {
				...data,
				slug: data.alias,
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
	let editingPage: Page | null = null;
	let pageToDelete: Page | null = null;

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
		leadingImage: '',
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

	onMount(async () => {
		await Promise.all([crudLoader.loadItems(), loadAlbums(), loadBlogCategories(), loadLayoutPresetNames()]);
	});

	async function loadLayoutPresetNames() {
		try {
			const response = await fetch('/api/admin/themes', { credentials: 'include' });
			if (!response.ok) return;
			const result = await response.json();
			const rows: any[] = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
			const names = new Set<string>();
			for (const row of rows) {
				const presets = row?.layoutPresets;
				if (!presets || typeof presets !== 'object' || Array.isArray(presets)) continue;
				for (const key of Object.keys(presets as Record<string, unknown>)) {
					const k = String(key || '').trim();
					if (k) names.add(k);
				}
			}
			availableLayoutPresetNames = Array.from(names).sort((a, b) => a.localeCompare(b));
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
			leadingImage: '',
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
			leadingImage: page.leadingImage || '',
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
		pageToDelete = page;
		dialogs.openDelete();
		crudOps.error.set('');
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
	let heroBackgroundStyle: 'light' | 'dark' | 'image' | 'galleryLeading' = 'light';
	let heroBackgroundImage = '';

	// Albums Grid module form state
	let albumsGridTitle: MultiLangText = { en: '', he: '' };
	let albumsGridDescription: MultiLangHTML = { en: '', he: '' };
	let albumsGridSelectedAlbums: string[] = []; // Array of album IDs
	let availableAlbums: Array<{ _id: string; name: string | MultiLangText; alias: string; level?: number }> = [];
	let albumsLoading = false;
	let blogCategoryAlias = '';
	let availableBlogCategories: Array<{ alias: string; title: string }> = [];
	let layoutShellPresetKey = '';
	let layoutShellReusePick = '';
	let layoutShellPresetError = '';
	let availableLayoutPresetNames: string[] = [];

	function editModule(module: PageModuleData) {
		editingModule = module;
		moduleForm = {
			id: module._id,
			type: module.type,
			zone: module.zone || '',
			order: module.order || 0,
			propsJson: JSON.stringify(module.props || {}, null, 2)
		};
		
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
			heroBackgroundStyle = (config.backgroundStyle === 'dark' || config.backgroundStyle === 'image' || config.backgroundStyle === 'galleryLeading')
				? config.backgroundStyle
				: 'light';
			heroBackgroundImage = config.backgroundImage || '';
		} else {
			heroTitle = { en: '', he: '' };
			heroSubtitle = { en: '', he: '' };
			heroCtaLabel = { en: '', he: '' };
			heroCtaUrl = '';
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
		} else {
			albumsGridTitle = { en: '', he: '' };
			albumsGridDescription = { en: '', he: '' };
			albumsGridSelectedAlbums = [];
		}

		if (module.type === 'blogCategory') {
			const props = module.props || {};
			blogCategoryAlias = typeof props.categoryAlias === 'string' ? props.categoryAlias : '';
		} else {
			blogCategoryAlias = '';
		}
		if (module.type === 'layoutShell') {
			const props = module.props || {};
			layoutShellPresetKey = typeof props.presetKey === 'string' ? props.presetKey : '';
			layoutShellReusePick = '';
			layoutShellPresetError = '';
		} else {
			layoutShellPresetKey = '';
			layoutShellReusePick = '';
			layoutShellPresetError = '';
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
					selectedAlbums: albumsGridSelectedAlbums
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
					presetKey: key
				};
			} else {
				props = moduleForm.propsJson.trim() ? JSON.parse(moduleForm.propsJson) as Record<string, unknown> : {};
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
					ctaLabel: heroCtaLabel,
					ctaUrl: heroCtaUrl || undefined,
					backgroundStyle: heroBackgroundStyle,
					backgroundImage: heroBackgroundStyle === 'image' ? heroBackgroundImage : undefined
				} as HeroProps;
			} else if (moduleForm.type === 'albumsGrid') {
				props = {
					title: albumsGridTitle,
					description: albumsGridDescription,
					selectedAlbums: albumsGridSelectedAlbums
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
					presetKey: key
				};
			} else {
				props = moduleForm.propsJson.trim() ? JSON.parse(moduleForm.propsJson) as Record<string, unknown> : {};
			}

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
		await crudOps.create(formData);
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
			layout: layoutData
		};
		
		await crudOps.update(editingPage._id, pageData);
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
				<h1 class="text-2xl font-bold text-[var(--color-surface-950-50)]">{$t('admin.pagesManagement')}</h1>
				<p class="text-[var(--color-surface-600-400)] mt-2">{$t('admin.pagesManagementDescription')}</p>
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
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary-600)]"></div>
					<p class="mt-2 text-[var(--color-surface-600-400)]">{$t('admin.loadingPages')}</p>
				</div>
			{:else if pages.length === 0}
				<div class="text-center py-8">
					<svg
						class="h-12 w-12 text-[var(--color-surface-400-600)] mx-auto mb-4"
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
					<h3 class="text-lg font-semibold text-[var(--color-surface-950-50)] mb-2">{$t('admin.noPagesFound')}</h3>
					<p class="text-[var(--color-surface-600-400)]">{$t('admin.startByCreatingFirstPage')}</p>
				</div>
			{:else}
				<PageList
					pages={pages}
					categories={CATEGORIES}
					onEdit={openEditDialog}
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
			<h2 class="text-xl font-bold text-[var(--color-surface-950-50)] mb-4">Add New Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="create-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Title *
						</label>
						<MultiLangInput id="create-title" bind:value={formData.title} />
					</div>

					<div>
						<label for="create-alias" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Alias *
						</label>
						<input
							id="create-alias"
							type="text"
							bind:value={formData.alias}
							placeholder="page-url-slug"
							required
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						/>
					</div>
				</div>

				<div>
					<label for="create-subtitle" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						Subtitle
					</label>
					<MultiLangInput id="create-subtitle" bind:value={formData.subtitle} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="create-category" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Category
						</label>
						<select
							id="create-category"
							bind:value={formData.category}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						>
							{#each CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="create-leading-image" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Leading Image URL
						</label>
						<input
							id="create-leading-image"
							type="text"
							bind:value={formData.leadingImage}
							placeholder="https://..."
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="create-grid-rows" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
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
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						/>
						<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Number of rows in the page grid.</p>
					</div>

					<div>
						<label for="create-grid-cols" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
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
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						/>
						<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Number of columns in the page grid.</p>
					</div>
				</div>

				<div>
					<label for="create-url-params" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						URL Parameters (optional)
					</label>
					<input
						id="create-url-params"
						type="text"
						bind:value={formData.urlParams}
						placeholder="param1=value1&param2=value2"
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
					/>
					<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Query parameters for the page URL (e.g., ?id=123&type=photo).</p>
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
						<h3 class="text-lg font-semibold text-[var(--color-surface-950-50)] mb-4">Page Grid Layout</h3>
						<p class="text-sm text-[var(--color-surface-600-400)] mb-4">
							Select cells in the grid and assign modules to them. Grid: {formData.gridRows} row{formData.gridRows !== 1 ? 's' : ''} × {formData.gridColumns} column{formData.gridColumns !== 1 ? 's' : ''}
						</p>
						
						{#if modulesError}
							<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
						{/if}

						{#if modulesLoading}
							<p class="text-sm text-[var(--color-surface-600-400)]">Loading layout...</p>
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
							class="w-11 h-6 bg-[var(--color-surface-200-800)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[color-mix(in_oklab,var(--color-primary-500)_35%,transparent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface-50-950)] after:border-surface-300-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-600)]"
						></div>
						<span class="ml-3 text-sm font-medium text-[var(--color-surface-800-200)]">
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
						class="px-4 py-2 bg-[var(--color-surface-200-800)] text-[var(--color-surface-800-200)] rounded-md hover:bg-[var(--color-surface-300-700)] text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={saving || !formData.title || !formData.alias.trim() || !gridInitialized}
						class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] disabled:opacity-50 text-sm font-medium"
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
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full {moduleForm.type === 'featureGrid' || moduleForm.type === 'richText' || moduleForm.type === 'hero' || moduleForm.type === 'albumsGrid' ? 'max-w-4xl' : 'max-w-2xl'} p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-[var(--color-surface-950-50)] mb-4">Edit Module</h2>

			{#if modulesError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="module-type" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						Module Type
					</label>
					<select
						id="module-type"
						bind:value={moduleForm.type}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
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
							<label for="module-feature-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							<MultiLangInput id="module-feature-title" bind:value={featureGridTitle} />
						</div>

						<div>
							<label for="module-feature-subtitle" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-feature-subtitle" bind:value={featureGridSubtitle} />
						</div>

						<div class="border-t border-surface-200-800 pt-4">
							<div class="flex items-center justify-between mb-4">
								<span class="block text-sm font-medium text-[var(--color-surface-800-200)]">
									Features
								</span>
								<button
									type="button"
									on:click={addFeatureItem}
									class="px-3 py-1.5 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] text-sm font-medium"
								>
									+ Add Item
								</button>
							</div>

							{#if featureGridItems.length === 0}
								<p class="text-sm text-[var(--color-surface-600-400)] py-4 text-center border-2 border-dashed border-surface-300-700 rounded">
									No features yet. Click "Add Item" to add a feature.
								</p>
							{:else}
								<div class="space-y-4">
									{#each featureGridItems as item, index (index)}
										<div class="border border-surface-300-700 rounded-lg p-4 bg-[var(--color-surface-50-950)]">
											<div class="flex items-center justify-between mb-3">
												<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Feature {index + 1}</span>
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
													<span class="block text-xs font-medium text-[var(--color-surface-600-400)] mb-1">
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
																class="flex-1 px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] text-sm"
																on:click|stopPropagation
																on:mousedown|stopPropagation
															/>
														{/if}
													</div>
													<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
														Select an icon from the list, or choose "Custom..." to enter an emoji or custom text.
													</p>
												</div>

												<div>
													<label for="module-feature-item-{index}-title" class="block text-xs font-medium text-[var(--color-surface-600-400)] mb-1">
														Title
													</label>
													<MultiLangInput id="module-feature-item-{index}-title" bind:value={item.title} />
												</div>

												<div>
													<label for="module-feature-item-{index}-desc" class="block text-xs font-medium text-[var(--color-surface-600-400)] mb-1">
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
							<label for="module-richtext-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title (optional)
							</label>
							<MultiLangInput id="module-richtext-title" bind:value={richTextTitle} />
						</div>

						<div>
							<label for="module-richtext-body" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Body Content
							</label>
							<MultiLangHTMLEditor id="module-richtext-body" bind:value={richTextBody} />
						</div>

						<div>
							<label for="module-richtext-bg" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Background Color
							</label>
							<select
								id="module-richtext-bg"
								bind:value={richTextBackground}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
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
								<span class="text-sm text-[var(--color-surface-800-200)]">Show page title</span>
							</label>
						</div>
						<div>
							<label class="flex items-center gap-2">
								<input type="checkbox" bind:checked={pageTitleShowSubtitle} class="w-4 h-4" />
								<span class="text-sm text-[var(--color-surface-800-200)]">Show page subtitle</span>
							</label>
						</div>
						<div>
							<label for="module-page-title-align" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Alignment
							</label>
							<select
								id="module-page-title-align"
								bind:value={pageTitleAlign}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
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
							<label for="module-hero-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							<MultiLangInput id="module-hero-title" bind:value={heroTitle} />
						</div>

						<div>
							<label for="module-hero-subtitle" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-hero-subtitle" bind:value={heroSubtitle} />
						</div>

						<div>
							<label for="module-hero-cta-label" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								CTA Label (optional)
							</label>
							<MultiLangInput id="module-hero-cta-label" bind:value={heroCtaLabel} />
						</div>

						<div>
							<label for="module-hero-cta-url" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								CTA URL (optional)
							</label>
							<input
								id="module-hero-cta-url"
								type="url"
								bind:value={heroCtaUrl}
								placeholder="https://..."
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
							/>
						</div>

						<div>
							<label for="module-hero-bg-style" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Background Style
							</label>
							<select
								id="module-hero-bg-style"
								bind:value={heroBackgroundStyle}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="image">Image (URL)</option>
								<option value="galleryLeading">Gallery leading photo</option>
							</select>
						</div>

						{#if heroBackgroundStyle === 'image'}
							<div>
								<label for="module-hero-bg-image" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
									Background Image URL
								</label>
								<input
									id="module-hero-bg-image"
									type="text"
									bind:value={heroBackgroundImage}
									placeholder="https://..."
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								/>
							</div>
						{/if}
					</div>
				{:else if moduleForm.type === 'albumsGrid'}
					<!-- Albums Grid Module Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-albums-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							<MultiLangInput id="module-albums-title" bind:value={albumsGridTitle} />
						</div>

						<div>
							<label for="module-albums-desc" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Description (Rich Text)
							</label>
							<MultiLangHTMLEditor id="module-albums-desc" bind:value={albumsGridDescription} />
						</div>

						<div>
							<span class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Select Albums
							</span>
							{#if albumsLoading}
								<div class="text-sm text-[var(--color-surface-600-400)]">Loading albums...</div>
							{:else}
								<div class="border border-surface-300-700 rounded-md p-3 max-h-64 overflow-y-auto bg-[var(--color-surface-50-950)]">
									{#if availableAlbums.length === 0}
										<p class="text-sm text-[var(--color-surface-600-400)]">No albums available.</p>
									{:else}
										<div class="space-y-2">
											{#each availableAlbums as album}
												<label class="flex items-center gap-2 p-2 hover:bg-[var(--color-surface-50-950)] rounded cursor-pointer">
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
														class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
													/>
													<span class="text-sm text-[var(--color-surface-800-200)] flex-1">
														{'  '.repeat(album.level || 0)}{getAlbumDisplayName(album)}
													</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
								Select one or more albums to display in the grid. Only the selected albums will be shown.
							</p>
							{#if albumsGridSelectedAlbums.length > 0}
								<p class="mt-1 text-xs text-[var(--color-primary-600)]">
									{albumsGridSelectedAlbums.length} album{albumsGridSelectedAlbums.length !== 1 ? 's' : ''} selected
								</p>
							{/if}
						</div>
					</div>
				{:else if moduleForm.type === 'layoutShell'}
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<p class="text-sm text-[var(--color-surface-600-400)]">
							A <strong>preset name</strong> is shared storage: multiple layoutShell modules can reuse one named grid.
						</p>
						<div>
							<label for="module-layout-shell-preset" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Preset name
							</label>
							<input
								id="module-layout-shell-preset"
								type="text"
								bind:value={layoutShellPresetKey}
								placeholder="e.g. site_header"
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								on:input={() => {
									layoutShellPresetError = '';
								}}
							/>
							{#if layoutShellPresetError}
								<p class="mt-1 text-xs text-red-600">{layoutShellPresetError}</p>
							{/if}
						</div>
						<div>
							<label for="module-layout-shell-reuse" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Reuse existing preset
							</label>
							<select
								id="module-layout-shell-reuse"
								bind:value={layoutShellReusePick}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								on:change={() => {
									if (!layoutShellReusePick) return;
									layoutShellPresetKey = layoutShellReusePick;
									layoutShellPresetError = '';
									layoutShellReusePick = '';
								}}
							>
								<option value="">— Pick a saved name —</option>
								{#each availableLayoutPresetNames as name}
									<option value={name}>{name}</option>
								{/each}
							</select>
						</div>
					</div>
				{:else if moduleForm.type === 'blogCategory'}
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-blog-category-alias" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Blog Category
							</label>
							<select
								id="module-blog-category-alias"
								bind:value={blogCategoryAlias}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
							>
								<option value="">All categories</option>
								{#each availableBlogCategories as category}
									<option value={category.alias}>{category.title} ({category.alias})</option>
								{/each}
							</select>
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
								Optional: show only one specific blog category in this module.
							</p>
						</div>
					</div>
				{:else}
					<!-- JSON Editor for other module types -->
					<div>
						<label for="module-props-json" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Props (JSON)
						</label>
						<textarea
							id="module-props-json"
							bind:value={moduleForm.propsJson}
							rows={10}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] font-mono text-sm"
						></textarea>
						<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
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
						class="px-4 py-2 bg-[var(--color-surface-200-800)] text-[var(--color-surface-800-200)] rounded-md hover:bg-[var(--color-surface-300-700)] text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={saveModuleEdit}
						class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] text-sm font-medium"
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
			<h2 class="text-xl font-bold text-[var(--color-surface-950-50)] mb-4">Edit Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="edit-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Title *
						</label>
						<MultiLangInput id="edit-title" bind:value={formData.title} />
					</div>

					<div>
						<label for="edit-alias" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Alias *
						</label>
						<input
							id="edit-alias"
							type="text"
							bind:value={formData.alias}
							placeholder="page-url-slug"
							required
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						/>
					</div>
				</div>

				<div>
					<label for="edit-subtitle" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						Subtitle
					</label>
					<MultiLangInput id="edit-subtitle" bind:value={formData.subtitle} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="edit-category" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Category
						</label>
						<select
							id="edit-category"
							bind:value={formData.category}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						>
							{#each CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="edit-leading-image" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Leading Image URL
						</label>
						<input
							id="edit-leading-image"
							type="text"
							bind:value={formData.leadingImage}
							placeholder="https://..."
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="edit-grid-rows" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Grid Rows
						</label>
						<input
							id="edit-grid-rows"
							type="number"
							min="1"
							max="20"
							bind:value={formData.gridRows}
							placeholder="1"
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						/>
					</div>

					<div>
						<label for="edit-grid-cols" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Grid Columns
						</label>
						<input
							id="edit-grid-cols"
							type="number"
							min="1"
							max="12"
							bind:value={formData.gridColumns}
							placeholder="1"
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
						/>
					</div>
				</div>

				<div>
					<label for="edit-url-params" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						URL Parameters (optional)
					</label>
					<input
						id="edit-url-params"
						type="text"
						bind:value={formData.urlParams}
						placeholder="param1=value1&param2=value2"
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
					/>
					<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">Query parameters for the page URL.</p>
				</div>

				<div class="border-t border-surface-200-800 pt-6">
					<h3 class="text-lg font-semibold text-[var(--color-surface-950-50)] mb-4">Page Grid Layout</h3>
					<p class="text-sm text-[var(--color-surface-600-400)] mb-4">
						Grid: {formData.gridRows} row{formData.gridRows !== 1 ? 's' : ''} × {formData.gridColumns} column{formData.gridColumns !== 1 ? 's' : ''}
					</p>
					{#if modulesError}
						<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
					{/if}

					{#if modulesLoading}
						<p class="text-sm text-[var(--color-surface-600-400)]">Loading layout...</p>
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
							class="w-11 h-6 bg-[var(--color-surface-200-800)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[color-mix(in_oklab,var(--color-primary-500)_35%,transparent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface-50-950)] after:border-surface-300-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-600)]"
						></div>
						<span class="ml-3 text-sm font-medium text-[var(--color-surface-800-200)]">
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
						class="px-4 py-2 bg-[var(--color-surface-200-800)] text-[var(--color-surface-800-200)] rounded-md hover:bg-[var(--color-surface-300-700)] text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving || !formData.title || !formData.alias.trim()}
						class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] disabled:opacity-50 text-sm font-medium"
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
			<h2 class="text-xl font-bold text-[var(--color-surface-950-50)] mb-4">Edit Module</h2>

			{#if modulesError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="module-type" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						Module Type
					</label>
					<select
						id="module-type"
						bind:value={moduleForm.type}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
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
							<label for="module-feature-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							<MultiLangInput id="module-feature-title" bind:value={featureGridTitle} />
						</div>

						<div>
							<label for="module-feature-subtitle" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-feature-subtitle" bind:value={featureGridSubtitle} />
						</div>

						<div class="border-t border-surface-200-800 pt-4">
							<div class="flex items-center justify-between mb-4">
								<span class="block text-sm font-medium text-[var(--color-surface-800-200)]">
									Features
								</span>
								<button
									type="button"
									on:click={addFeatureItem}
									class="px-3 py-1.5 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] text-sm font-medium"
								>
									+ Add Item
								</button>
							</div>

							{#if featureGridItems.length === 0}
								<p class="text-sm text-[var(--color-surface-600-400)] py-4 text-center border-2 border-dashed border-surface-300-700 rounded">
									No features yet. Click "Add Item" to add a feature.
								</p>
							{:else}
								<div class="space-y-4">
									{#each featureGridItems as item, index (index)}
										<div class="border border-surface-300-700 rounded-lg p-4 bg-[var(--color-surface-50-950)]">
											<div class="flex items-center justify-between mb-3">
												<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Feature {index + 1}</span>
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
													<span class="block text-xs font-medium text-[var(--color-surface-600-400)] mb-1">
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
																class="flex-1 px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] text-sm"
																on:click|stopPropagation
																on:mousedown|stopPropagation
															/>
														{/if}
													</div>
													<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
														Select an icon from the list, or choose "Custom..." to enter an emoji or custom text.
													</p>
												</div>

												<div>
													<label for="module-feature-item-{index}-title" class="block text-xs font-medium text-[var(--color-surface-600-400)] mb-1">
														Title
													</label>
													<MultiLangInput id="module-feature-item-{index}-title" bind:value={item.title} />
												</div>

												<div>
													<label for="module-feature-item-{index}-desc" class="block text-xs font-medium text-[var(--color-surface-600-400)] mb-1">
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
							<label for="module-richtext-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title (optional)
							</label>
							<MultiLangInput id="module-richtext-title" bind:value={richTextTitle} />
						</div>

						<div>
							<label for="module-richtext-body" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Body Content
							</label>
							<MultiLangHTMLEditor id="module-richtext-body" bind:value={richTextBody} />
						</div>

						<div>
							<label for="module-richtext-bg" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Background Color
							</label>
							<select
								id="module-richtext-bg"
								bind:value={richTextBackground}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
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
							<label for="module-hero-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							<MultiLangInput id="module-hero-title" bind:value={heroTitle} />
						</div>

						<div>
							<label for="module-hero-subtitle" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-hero-subtitle" bind:value={heroSubtitle} />
						</div>

						<div>
							<label for="module-hero-cta-label" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								CTA Label (optional)
							</label>
							<MultiLangInput id="module-hero-cta-label" bind:value={heroCtaLabel} />
						</div>

						<div>
							<label for="module-hero-cta-url" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								CTA URL (optional)
							</label>
							<input
								id="module-hero-cta-url"
								type="url"
								bind:value={heroCtaUrl}
								placeholder="https://..."
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
							/>
						</div>

						<div>
							<label for="module-hero-bg-style" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Background Style
							</label>
							<select
								id="module-hero-bg-style"
								bind:value={heroBackgroundStyle}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="image">Image (URL)</option>
								<option value="galleryLeading">Gallery leading photo</option>
							</select>
						</div>

						{#if heroBackgroundStyle === 'image'}
							<div>
								<label for="module-hero-bg-image" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
									Background Image URL
								</label>
								<input
									id="module-hero-bg-image"
									type="text"
									bind:value={heroBackgroundImage}
									placeholder="https://..."
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								/>
							</div>
						{/if}
					</div>
				{:else if moduleForm.type === 'albumsGrid'}
					<!-- Albums Grid Module Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-albums-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							<MultiLangInput id="module-albums-title" bind:value={albumsGridTitle} />
						</div>

						<div>
							<label for="module-albums-desc" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Description (Rich Text)
							</label>
							<MultiLangHTMLEditor id="module-albums-desc" bind:value={albumsGridDescription} />
						</div>

						<div>
							<span class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Select Albums
							</span>
							{#if albumsLoading}
								<div class="text-sm text-[var(--color-surface-600-400)]">Loading albums...</div>
							{:else}
								<div class="border border-surface-300-700 rounded-md p-3 max-h-64 overflow-y-auto bg-[var(--color-surface-50-950)]">
									{#if availableAlbums.length === 0}
										<p class="text-sm text-[var(--color-surface-600-400)]">No albums available.</p>
									{:else}
										<div class="space-y-2">
											{#each availableAlbums as album}
												<label class="flex items-center gap-2 p-2 hover:bg-[var(--color-surface-50-950)] rounded cursor-pointer">
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
														class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
													/>
													<span class="text-sm text-[var(--color-surface-800-200)] flex-1">
														{'  '.repeat(album.level || 0)}{getAlbumDisplayName(album)}
													</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
								Select one or more albums to display in the grid. Only the selected albums will be shown.
							</p>
							{#if albumsGridSelectedAlbums.length > 0}
								<p class="mt-1 text-xs text-[var(--color-primary-600)]">
									{albumsGridSelectedAlbums.length} album{albumsGridSelectedAlbums.length !== 1 ? 's' : ''} selected
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<!-- JSON Editor for other module types -->
					<div>
						<label for="module-props-json" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Props (JSON)
						</label>
						<textarea
							id="module-props-json"
							bind:value={moduleForm.propsJson}
							rows={10}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] font-mono text-sm"
						></textarea>
						<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
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
						class="px-4 py-2 bg-[var(--color-surface-200-800)] text-[var(--color-surface-800-200)] rounded-md hover:bg-[var(--color-surface-300-700)] text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={saveModuleEdit}
						class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] text-sm font-medium"
					>
						Save Module
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && pageToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-[var(--color-surface-950-50)] mb-4">Delete Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-[var(--color-surface-600-400)]">
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
						class="px-4 py-2 bg-[var(--color-surface-200-800)] text-[var(--color-surface-800-200)] rounded-md hover:bg-[var(--color-surface-300-700)] text-sm font-medium"
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
			<h2 class="text-xl font-bold text-[var(--color-surface-950-50)] mb-4">Edit Module</h2>

			{#if modulesError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="module-type" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
						Module Type
					</label>
					<select
						id="module-type"
						bind:value={moduleForm.type}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
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
							<label for="module-feature-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							<MultiLangInput id="module-feature-title" bind:value={featureGridTitle} />
						</div>

						<div>
							<label for="module-feature-subtitle" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-feature-subtitle" bind:value={featureGridSubtitle} />
						</div>

						<div class="border-t border-surface-200-800 pt-4">
							<div class="flex items-center justify-between mb-4">
								<span class="block text-sm font-medium text-[var(--color-surface-800-200)]">
									Features
								</span>
								<button
									type="button"
									on:click={addFeatureItem}
									class="px-3 py-1.5 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] text-sm font-medium"
								>
									+ Add Item
								</button>
							</div>

							{#if featureGridItems.length === 0}
								<p class="text-sm text-[var(--color-surface-600-400)] py-4 text-center border-2 border-dashed border-surface-300-700 rounded">
									No features yet. Click "Add Item" to add a feature.
								</p>
							{:else}
								<div class="space-y-4">
									{#each featureGridItems as item, index (index)}
										<div class="border border-surface-300-700 rounded-lg p-4 bg-[var(--color-surface-50-950)]">
											<div class="flex items-center justify-between mb-3">
												<span class="text-sm font-medium text-[var(--color-surface-800-200)]">Feature {index + 1}</span>
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
													<span class="block text-xs font-medium text-[var(--color-surface-600-400)] mb-1">
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
																class="flex-1 px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] text-sm"
																on:click|stopPropagation
																on:mousedown|stopPropagation
															/>
														{/if}
													</div>
													<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
														Select an icon from the list, or choose "Custom..." to enter an emoji or custom text.
													</p>
												</div>

												<div>
													<label for="module-feature-item-{index}-title" class="block text-xs font-medium text-[var(--color-surface-600-400)] mb-1">
														Title
													</label>
													<MultiLangInput id="module-feature-item-{index}-title" bind:value={item.title} />
												</div>

												<div>
													<label for="module-feature-item-{index}-desc" class="block text-xs font-medium text-[var(--color-surface-600-400)] mb-1">
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
							<label for="module-richtext-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title (optional)
							</label>
							<MultiLangInput id="module-richtext-title" bind:value={richTextTitle} />
						</div>

						<div>
							<label for="module-richtext-body" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Body Content
							</label>
							<MultiLangHTMLEditor id="module-richtext-body" bind:value={richTextBody} />
						</div>

						<div>
							<label for="module-richtext-bg" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Background Color
							</label>
							<select
								id="module-richtext-bg"
								bind:value={richTextBackground}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
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
							<label for="module-hero-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							<MultiLangInput id="module-hero-title" bind:value={heroTitle} />
						</div>

						<div>
							<label for="module-hero-subtitle" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-hero-subtitle" bind:value={heroSubtitle} />
						</div>

						<div>
							<label for="module-hero-cta-label" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								CTA Label (optional)
							</label>
							<MultiLangInput id="module-hero-cta-label" bind:value={heroCtaLabel} />
						</div>

						<div>
							<label for="module-hero-cta-url" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								CTA URL (optional)
							</label>
							<input
								id="module-hero-cta-url"
								type="url"
								bind:value={heroCtaUrl}
								placeholder="https://..."
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
							/>
						</div>

						<div>
							<label for="module-hero-bg-style" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Background Style
							</label>
							<select
								id="module-hero-bg-style"
								bind:value={heroBackgroundStyle}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="image">Image (URL)</option>
								<option value="galleryLeading">Gallery leading photo</option>
							</select>
						</div>

						{#if heroBackgroundStyle === 'image'}
							<div>
								<label for="module-hero-bg-image" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
									Background Image URL
								</label>
								<input
									id="module-hero-bg-image"
									type="text"
									bind:value={heroBackgroundImage}
									placeholder="https://..."
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
								/>
							</div>
						{/if}
					</div>
				{:else if moduleForm.type === 'albumsGrid'}
					<!-- Albums Grid Module Form -->
					<div class="space-y-4 border-t border-surface-200-800 pt-4">
						<div>
							<label for="module-albums-title" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Title
							</label>
							<MultiLangInput id="module-albums-title" bind:value={albumsGridTitle} />
						</div>

						<div>
							<label for="module-albums-desc" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Description (Rich Text)
							</label>
							<MultiLangHTMLEditor id="module-albums-desc" bind:value={albumsGridDescription} />
						</div>

						<div>
							<span class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
								Select Albums
							</span>
							{#if albumsLoading}
								<div class="text-sm text-[var(--color-surface-600-400)]">Loading albums...</div>
							{:else}
								<div class="border border-surface-300-700 rounded-md p-3 max-h-64 overflow-y-auto bg-[var(--color-surface-50-950)]">
									{#if availableAlbums.length === 0}
										<p class="text-sm text-[var(--color-surface-600-400)]">No albums available.</p>
									{:else}
										<div class="space-y-2">
											{#each availableAlbums as album}
												<label class="flex items-center gap-2 p-2 hover:bg-[var(--color-surface-50-950)] rounded cursor-pointer">
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
														class="w-4 h-4 text-[var(--color-primary-600)] border-surface-300-700 rounded focus:ring-[var(--color-primary-500)]"
													/>
													<span class="text-sm text-[var(--color-surface-800-200)] flex-1">
														{'  '.repeat(album.level || 0)}{getAlbumDisplayName(album)}
													</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
							<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
								Select one or more albums to display in the grid. Only the selected albums will be shown.
							</p>
							{#if albumsGridSelectedAlbums.length > 0}
								<p class="mt-1 text-xs text-[var(--color-primary-600)]">
									{albumsGridSelectedAlbums.length} album{albumsGridSelectedAlbums.length !== 1 ? 's' : ''} selected
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<!-- JSON Editor for other module types -->
					<div>
						<label for="module-props-json" class="block text-sm font-medium text-[var(--color-surface-800-200)] mb-2">
							Props (JSON)
						</label>
						<textarea
							id="module-props-json"
							bind:value={moduleForm.propsJson}
							rows={10}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] font-mono text-sm"
						></textarea>
						<p class="mt-1 text-xs text-[var(--color-surface-600-400)]">
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
						class="px-4 py-2 bg-[var(--color-surface-200-800)] text-[var(--color-surface-800-200)] rounded-md hover:bg-[var(--color-surface-300-700)] text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={saveModuleEdit}
						class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] text-sm font-medium"
					>
						Save Module
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
