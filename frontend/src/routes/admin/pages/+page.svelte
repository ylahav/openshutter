<script lang="ts">
	import { onMount } from 'svelte';
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

	// Available icon names from icons.ts (sorted)
	const AVAILABLE_ICONS: string[] = [...AVAILABLE_ICON_NAMES].sort();

	// svelte-ignore export_let_unused - Required by SvelteKit page component
	export let data: PageData;

	interface Page {
		_id: string;
		title: MultiLangText | string;
		subtitle?: MultiLangText | string;
		alias: string;
		slug?: string;
		leadingImage?: string;
		introText?: MultiLangHTML | string;
		content?: MultiLangHTML | string;
		layout?: {
			zones?: string[];
		};
		category: 'system' | 'site';
		isPublished?: boolean;
		createdAt?: string;
		updatedAt?: string;
	}

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
		{ value: 'hero', label: 'Hero' },
		{ value: 'richText', label: 'Rich Text' },
		{ value: 'featureGrid', label: 'Feature Grid' },
		{ value: 'albumsGrid', label: 'Albums Grid' },
		{ value: 'cta', label: 'Call To Action' }
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
		transformPayload: (data: Partial<Page> & { gridRows?: number; gridColumns?: number; urlParams?: string }) => {
			const layout: any = { zones: parseZones(data.layoutZones || 'main') };
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
							logger.error('Failed to save module:', await response.text());
						}
					}
				} catch (err) {
					logger.error('Error saving modules after page creation:', err);
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
		await Promise.all([crudLoader.loadItems(), loadAlbums()]);
	});

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
				props
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
			} else {
				props = moduleForm.propsJson.trim() ? JSON.parse(moduleForm.propsJson) as Record<string, unknown> : {};
			}
			
			const payload: ModulePayload = {
				type: moduleForm.type,
				zone: moduleForm.zone,
				order: Number(moduleForm.order) || 0,
				props
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
	<title>Pages Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Pages Management</h1>
					<p class="text-gray-600 mt-2">Create and manage site pages</p>
				</div>
				<a href="/admin" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium">
					← Back to Admin
				</a>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			<!-- Search and Filters -->
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center space-x-4">
					<div class="relative">
						<input
							type="text"
							placeholder="Search pages..."
							bind:value={searchTerm}
							on:input={() => crudLoader.loadItems()}
							class="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
						/>
						<svg
							class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>

					<select
						bind:value={categoryFilter}
						on:change={() => crudLoader.loadItems()}
						class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">All Categories</option>
						{#each CATEGORIES as cat}
							<option value={cat.value}>{cat.label}</option>
						{/each}
					</select>

					<select
						bind:value={publishedFilter}
						on:change={() => crudLoader.loadItems()}
						class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">All Status</option>
						<option value="true">Published</option>
						<option value="false">Draft</option>
					</select>
				</div>

				<button
					type="button"
					on:click={openCreateDialog}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Add Page
				</button>
			</div>

			<!-- Pages List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading pages...</p>
				</div>
			{:else if pages.length === 0}
				<div class="text-center py-8">
					<svg
						class="h-12 w-12 text-gray-400 mx-auto mb-4"
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
					<h3 class="text-lg font-semibold text-gray-900 mb-2">No pages found</h3>
					<p class="text-gray-600">Start by creating your first page.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each pages as page}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1">
									<h3 class="font-semibold text-gray-900 mb-1">{getPageTitle(page)}</h3>
									<p class="text-sm text-gray-500">
										Alias: <code class="bg-gray-100 px-1 rounded">{page.alias}</code>
									</p>
								</div>

								<div class="flex space-x-1">
									<button
										type="button"
										on:click={() => openEditDialog(page)}
										class="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
										aria-label="Edit page"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
									<button
										type="button"
										on:click={() => openDeleteDialog(page)}
										class="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
										aria-label="Delete page"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</div>

							<div class="flex items-center justify-between mt-3">
								<span
									class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800"
								>
									{CATEGORIES.find((c) => c.value === page.category)?.label || page.category}
								</span>
								{#if page.isPublished}
									<span class="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
										Published
									</span>
								{:else}
									<span class="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
										Draft
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create Dialog -->
{#if showCreateDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Add New Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="create-title" class="block text-sm font-medium text-gray-700 mb-2">
							Title *
						</label>
						<MultiLangInput id="create-title" bind:value={formData.title} />
					</div>

					<div>
						<label for="create-alias" class="block text-sm font-medium text-gray-700 mb-2">
							Alias *
						</label>
						<input
							id="create-alias"
							type="text"
							bind:value={formData.alias}
							placeholder="page-url-slug"
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div>
					<label for="create-subtitle" class="block text-sm font-medium text-gray-700 mb-2">
						Subtitle
					</label>
					<MultiLangInput id="create-subtitle" bind:value={formData.subtitle} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="create-category" class="block text-sm font-medium text-gray-700 mb-2">
							Category
						</label>
						<select
							id="create-category"
							bind:value={formData.category}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							{#each CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="create-leading-image" class="block text-sm font-medium text-gray-700 mb-2">
							Leading Image URL
						</label>
						<input
							id="create-leading-image"
							type="text"
							bind:value={formData.leadingImage}
							placeholder="https://..."
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="create-grid-rows" class="block text-sm font-medium text-gray-700 mb-2">
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
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<p class="mt-1 text-xs text-gray-500">Number of rows in the page grid.</p>
					</div>

					<div>
						<label for="create-grid-cols" class="block text-sm font-medium text-gray-700 mb-2">
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
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<p class="mt-1 text-xs text-gray-500">Number of columns in the page grid.</p>
					</div>
				</div>

				<div>
					<label for="create-url-params" class="block text-sm font-medium text-gray-700 mb-2">
						URL Parameters (optional)
					</label>
					<input
						id="create-url-params"
						type="text"
						bind:value={formData.urlParams}
						placeholder="param1=value1&param2=value2"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
					<p class="mt-1 text-xs text-gray-500">Query parameters for the page URL (e.g., ?id=123&type=photo).</p>
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
					<div class="border-t border-gray-200 pt-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Page Grid Layout</h3>
						<p class="text-sm text-gray-600 mb-4">
							Select cells in the grid and assign modules to them. Grid: {formData.gridRows} row{formData.gridRows !== 1 ? 's' : ''} × {formData.gridColumns} column{formData.gridColumns !== 1 ? 's' : ''}
						</p>
						
						{#if modulesError}
							<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
						{/if}

						{#if modulesLoading}
							<p class="text-sm text-gray-500">Loading layout...</p>
						{:else}
							<RowColumnLayoutBuilder
								modules={modules}
								rowStructure={rowStructure}
								onAssignModule={handleAssignModule}
								onRemoveModule={deleteModule}
								onEditModule={editModule}
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
							class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
						></div>
						<span class="ml-3 text-sm font-medium text-gray-700">
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
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={saving || !formData.title || !formData.alias.trim() || !gridInitialized}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
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
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full {moduleForm.type === 'featureGrid' || moduleForm.type === 'richText' || moduleForm.type === 'hero' || moduleForm.type === 'albumsGrid' ? 'max-w-4xl' : 'max-w-2xl'} p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit Module</h2>

			{#if modulesError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="module-type" class="block text-sm font-medium text-gray-700 mb-2">
						Module Type
					</label>
					<select
						id="module-type"
						bind:value={moduleForm.type}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						{#each MODULE_TYPES as moduleType}
							<option value={moduleType.value}>{moduleType.label}</option>
						{/each}
					</select>
				</div>

				{#if moduleForm.type === 'featureGrid'}
					<!-- Feature Grid Form -->
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-feature-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title
							</label>
							<MultiLangInput id="module-feature-title" bind:value={featureGridTitle} />
						</div>

						<div>
							<label for="module-feature-subtitle" class="block text-sm font-medium text-gray-700 mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-feature-subtitle" bind:value={featureGridSubtitle} />
						</div>

						<div class="border-t border-gray-200 pt-4">
							<div class="flex items-center justify-between mb-4">
								<span class="block text-sm font-medium text-gray-700">
									Features
								</span>
								<button
									type="button"
									on:click={addFeatureItem}
									class="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
								>
									+ Add Item
								</button>
							</div>

							{#if featureGridItems.length === 0}
								<p class="text-sm text-gray-500 py-4 text-center border-2 border-dashed border-gray-300 rounded">
									No features yet. Click "Add Item" to add a feature.
								</p>
							{:else}
								<div class="space-y-4">
									{#each featureGridItems as item, index (index)}
										<div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
											<div class="flex items-center justify-between mb-3">
												<span class="text-sm font-medium text-gray-700">Feature {index + 1}</span>
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
													<span class="block text-xs font-medium text-gray-600 mb-1">
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
																class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
																on:click|stopPropagation
																on:mousedown|stopPropagation
															/>
														{/if}
													</div>
													<p class="mt-1 text-xs text-gray-500">
														Select an icon from the list, or choose "Custom..." to enter an emoji or custom text.
													</p>
												</div>

												<div>
													<label for="module-feature-item-{index}-title" class="block text-xs font-medium text-gray-600 mb-1">
														Title
													</label>
													<MultiLangInput id="module-feature-item-{index}-title" bind:value={item.title} />
												</div>

												<div>
													<label for="module-feature-item-{index}-desc" class="block text-xs font-medium text-gray-600 mb-1">
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
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-richtext-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title (optional)
							</label>
							<MultiLangInput id="module-richtext-title" bind:value={richTextTitle} />
						</div>

						<div>
							<label for="module-richtext-body" class="block text-sm font-medium text-gray-700 mb-2">
								Body Content
							</label>
							<MultiLangHTMLEditor id="module-richtext-body" bind:value={richTextBody} />
						</div>

						<div>
							<label for="module-richtext-bg" class="block text-sm font-medium text-gray-700 mb-2">
								Background Color
							</label>
							<select
								id="module-richtext-bg"
								bind:value={richTextBackground}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="white">White</option>
								<option value="gray">Gray</option>
							</select>
						</div>
					</div>
				{:else if moduleForm.type === 'hero'}
					<!-- Hero Form -->
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-hero-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title
							</label>
							<MultiLangInput id="module-hero-title" bind:value={heroTitle} />
						</div>

						<div>
							<label for="module-hero-subtitle" class="block text-sm font-medium text-gray-700 mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-hero-subtitle" bind:value={heroSubtitle} />
						</div>

						<div>
							<label for="module-hero-cta-label" class="block text-sm font-medium text-gray-700 mb-2">
								CTA Label (optional)
							</label>
							<MultiLangInput id="module-hero-cta-label" bind:value={heroCtaLabel} />
						</div>

						<div>
							<label for="module-hero-cta-url" class="block text-sm font-medium text-gray-700 mb-2">
								CTA URL (optional)
							</label>
							<input
								id="module-hero-cta-url"
								type="url"
								bind:value={heroCtaUrl}
								placeholder="https://..."
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>

						<div>
							<label for="module-hero-bg-style" class="block text-sm font-medium text-gray-700 mb-2">
								Background Style
							</label>
							<select
								id="module-hero-bg-style"
								bind:value={heroBackgroundStyle}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="image">Image (URL)</option>
								<option value="galleryLeading">Gallery leading photo</option>
							</select>
						</div>

						{#if heroBackgroundStyle === 'image'}
							<div>
								<label for="module-hero-bg-image" class="block text-sm font-medium text-gray-700 mb-2">
									Background Image URL
								</label>
								<input
									id="module-hero-bg-image"
									type="text"
									bind:value={heroBackgroundImage}
									placeholder="https://..."
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
						{/if}
					</div>
				{:else if moduleForm.type === 'albumsGrid'}
					<!-- Albums Grid Module Form -->
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-albums-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title
							</label>
							<MultiLangInput id="module-albums-title" bind:value={albumsGridTitle} />
						</div>

						<div>
							<label for="module-albums-desc" class="block text-sm font-medium text-gray-700 mb-2">
								Description (Rich Text)
							</label>
							<MultiLangHTMLEditor id="module-albums-desc" bind:value={albumsGridDescription} />
						</div>

						<div>
							<span class="block text-sm font-medium text-gray-700 mb-2">
								Select Albums
							</span>
							{#if albumsLoading}
								<div class="text-sm text-gray-500">Loading albums...</div>
							{:else}
								<div class="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto bg-white">
									{#if availableAlbums.length === 0}
										<p class="text-sm text-gray-500">No albums available.</p>
									{:else}
										<div class="space-y-2">
											{#each availableAlbums as album}
												<label class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
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
														class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
													/>
													<span class="text-sm text-gray-700 flex-1">
														{'  '.repeat(album.level || 0)}{getAlbumDisplayName(album)}
													</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
							<p class="mt-1 text-xs text-gray-500">
								Select one or more albums to display in the grid. Only the selected albums will be shown.
							</p>
							{#if albumsGridSelectedAlbums.length > 0}
								<p class="mt-1 text-xs text-blue-600">
									{albumsGridSelectedAlbums.length} album{albumsGridSelectedAlbums.length !== 1 ? 's' : ''} selected
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<!-- JSON Editor for other module types -->
					<div>
						<label for="module-props-json" class="block text-sm font-medium text-gray-700 mb-2">
							Props (JSON)
						</label>
						<textarea
							id="module-props-json"
							bind:value={moduleForm.propsJson}
							rows={10}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
						></textarea>
						<p class="mt-1 text-xs text-gray-500">
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
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={saveModuleEdit}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
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
		<div class="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="edit-title" class="block text-sm font-medium text-gray-700 mb-2">
							Title *
						</label>
						<MultiLangInput id="edit-title" bind:value={formData.title} />
					</div>

					<div>
						<label for="edit-alias" class="block text-sm font-medium text-gray-700 mb-2">
							Alias *
						</label>
						<input
							id="edit-alias"
							type="text"
							bind:value={formData.alias}
							placeholder="page-url-slug"
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div>
					<label for="edit-subtitle" class="block text-sm font-medium text-gray-700 mb-2">
						Subtitle
					</label>
					<MultiLangInput id="edit-subtitle" bind:value={formData.subtitle} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="edit-category" class="block text-sm font-medium text-gray-700 mb-2">
							Category
						</label>
						<select
							id="edit-category"
							bind:value={formData.category}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							{#each CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="edit-leading-image" class="block text-sm font-medium text-gray-700 mb-2">
							Leading Image URL
						</label>
						<input
							id="edit-leading-image"
							type="text"
							bind:value={formData.leadingImage}
							placeholder="https://..."
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="edit-grid-rows" class="block text-sm font-medium text-gray-700 mb-2">
							Grid Rows
						</label>
						<input
							id="edit-grid-rows"
							type="number"
							min="1"
							max="20"
							bind:value={formData.gridRows}
							placeholder="1"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label for="edit-grid-cols" class="block text-sm font-medium text-gray-700 mb-2">
							Grid Columns
						</label>
						<input
							id="edit-grid-cols"
							type="number"
							min="1"
							max="12"
							bind:value={formData.gridColumns}
							placeholder="1"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div>
					<label for="edit-url-params" class="block text-sm font-medium text-gray-700 mb-2">
						URL Parameters (optional)
					</label>
					<input
						id="edit-url-params"
						type="text"
						bind:value={formData.urlParams}
						placeholder="param1=value1&param2=value2"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
					<p class="mt-1 text-xs text-gray-500">Query parameters for the page URL.</p>
				</div>

				<div class="border-t border-gray-200 pt-6">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">Page Grid Layout</h3>
					<p class="text-sm text-gray-600 mb-4">
						Grid: {formData.gridRows} row{formData.gridRows !== 1 ? 's' : ''} × {formData.gridColumns} column{formData.gridColumns !== 1 ? 's' : ''}
					</p>
					{#if modulesError}
						<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
					{/if}

					{#if modulesLoading}
						<p class="text-sm text-gray-500">Loading layout...</p>
					{:else}
						<RowColumnLayoutBuilder
							modules={modules}
							rowStructure={rowStructure}
							onAssignModule={handleAssignModule}
							onRemoveModule={deleteModule}
							onEditModule={editModule}
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
							class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
						></div>
						<span class="ml-3 text-sm font-medium text-gray-700">
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
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving || !formData.title || !formData.alias.trim()}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
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
{#if showModuleEditDialog && editingModule}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full {moduleForm.type === 'featureGrid' || moduleForm.type === 'richText' || moduleForm.type === 'hero' || moduleForm.type === 'albumsGrid' ? 'max-w-4xl' : 'max-w-2xl'} p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit Module</h2>

			{#if modulesError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="module-type" class="block text-sm font-medium text-gray-700 mb-2">
						Module Type
					</label>
					<select
						id="module-type"
						bind:value={moduleForm.type}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						{#each MODULE_TYPES as moduleType}
							<option value={moduleType.value}>{moduleType.label}</option>
						{/each}
					</select>
				</div>

				{#if moduleForm.type === 'featureGrid'}
					<!-- Feature Grid Form -->
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-feature-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title
							</label>
							<MultiLangInput id="module-feature-title" bind:value={featureGridTitle} />
						</div>

						<div>
							<label for="module-feature-subtitle" class="block text-sm font-medium text-gray-700 mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-feature-subtitle" bind:value={featureGridSubtitle} />
						</div>

						<div class="border-t border-gray-200 pt-4">
							<div class="flex items-center justify-between mb-4">
								<span class="block text-sm font-medium text-gray-700">
									Features
								</span>
								<button
									type="button"
									on:click={addFeatureItem}
									class="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
								>
									+ Add Item
								</button>
							</div>

							{#if featureGridItems.length === 0}
								<p class="text-sm text-gray-500 py-4 text-center border-2 border-dashed border-gray-300 rounded">
									No features yet. Click "Add Item" to add a feature.
								</p>
							{:else}
								<div class="space-y-4">
									{#each featureGridItems as item, index (index)}
										<div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
											<div class="flex items-center justify-between mb-3">
												<span class="text-sm font-medium text-gray-700">Feature {index + 1}</span>
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
													<span class="block text-xs font-medium text-gray-600 mb-1">
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
																class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
																on:click|stopPropagation
																on:mousedown|stopPropagation
															/>
														{/if}
													</div>
													<p class="mt-1 text-xs text-gray-500">
														Select an icon from the list, or choose "Custom..." to enter an emoji or custom text.
													</p>
												</div>

												<div>
													<label for="module-feature-item-{index}-title" class="block text-xs font-medium text-gray-600 mb-1">
														Title
													</label>
													<MultiLangInput id="module-feature-item-{index}-title" bind:value={item.title} />
												</div>

												<div>
													<label for="module-feature-item-{index}-desc" class="block text-xs font-medium text-gray-600 mb-1">
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
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-richtext-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title (optional)
							</label>
							<MultiLangInput id="module-richtext-title" bind:value={richTextTitle} />
						</div>

						<div>
							<label for="module-richtext-body" class="block text-sm font-medium text-gray-700 mb-2">
								Body Content
							</label>
							<MultiLangHTMLEditor id="module-richtext-body" bind:value={richTextBody} />
						</div>

						<div>
							<label for="module-richtext-bg" class="block text-sm font-medium text-gray-700 mb-2">
								Background Color
							</label>
							<select
								id="module-richtext-bg"
								bind:value={richTextBackground}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="white">White</option>
								<option value="gray">Gray</option>
							</select>
						</div>
					</div>
				{:else if moduleForm.type === 'hero'}
					<!-- Hero Form -->
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-hero-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title
							</label>
							<MultiLangInput id="module-hero-title" bind:value={heroTitle} />
						</div>

						<div>
							<label for="module-hero-subtitle" class="block text-sm font-medium text-gray-700 mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-hero-subtitle" bind:value={heroSubtitle} />
						</div>

						<div>
							<label for="module-hero-cta-label" class="block text-sm font-medium text-gray-700 mb-2">
								CTA Label (optional)
							</label>
							<MultiLangInput id="module-hero-cta-label" bind:value={heroCtaLabel} />
						</div>

						<div>
							<label for="module-hero-cta-url" class="block text-sm font-medium text-gray-700 mb-2">
								CTA URL (optional)
							</label>
							<input
								id="module-hero-cta-url"
								type="url"
								bind:value={heroCtaUrl}
								placeholder="https://..."
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>

						<div>
							<label for="module-hero-bg-style" class="block text-sm font-medium text-gray-700 mb-2">
								Background Style
							</label>
							<select
								id="module-hero-bg-style"
								bind:value={heroBackgroundStyle}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="image">Image (URL)</option>
								<option value="galleryLeading">Gallery leading photo</option>
							</select>
						</div>

						{#if heroBackgroundStyle === 'image'}
							<div>
								<label for="module-hero-bg-image" class="block text-sm font-medium text-gray-700 mb-2">
									Background Image URL
								</label>
								<input
									id="module-hero-bg-image"
									type="text"
									bind:value={heroBackgroundImage}
									placeholder="https://..."
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
						{/if}
					</div>
				{:else if moduleForm.type === 'albumsGrid'}
					<!-- Albums Grid Module Form -->
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-albums-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title
							</label>
							<MultiLangInput id="module-albums-title" bind:value={albumsGridTitle} />
						</div>

						<div>
							<label for="module-albums-desc" class="block text-sm font-medium text-gray-700 mb-2">
								Description (Rich Text)
							</label>
							<MultiLangHTMLEditor id="module-albums-desc" bind:value={albumsGridDescription} />
						</div>

						<div>
							<span class="block text-sm font-medium text-gray-700 mb-2">
								Select Albums
							</span>
							{#if albumsLoading}
								<div class="text-sm text-gray-500">Loading albums...</div>
							{:else}
								<div class="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto bg-white">
									{#if availableAlbums.length === 0}
										<p class="text-sm text-gray-500">No albums available.</p>
									{:else}
										<div class="space-y-2">
											{#each availableAlbums as album}
												<label class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
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
														class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
													/>
													<span class="text-sm text-gray-700 flex-1">
														{'  '.repeat(album.level || 0)}{getAlbumDisplayName(album)}
													</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
							<p class="mt-1 text-xs text-gray-500">
								Select one or more albums to display in the grid. Only the selected albums will be shown.
							</p>
							{#if albumsGridSelectedAlbums.length > 0}
								<p class="mt-1 text-xs text-blue-600">
									{albumsGridSelectedAlbums.length} album{albumsGridSelectedAlbums.length !== 1 ? 's' : ''} selected
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<!-- JSON Editor for other module types -->
					<div>
						<label for="module-props-json" class="block text-sm font-medium text-gray-700 mb-2">
							Props (JSON)
						</label>
						<textarea
							id="module-props-json"
							bind:value={moduleForm.propsJson}
							rows={10}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
						></textarea>
						<p class="mt-1 text-xs text-gray-500">
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
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={saveModuleEdit}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
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
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Delete Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-gray-600">
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
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
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
{#if showModuleEditDialog && editingModule}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full {moduleForm.type === 'featureGrid' || moduleForm.type === 'richText' || moduleForm.type === 'hero' || moduleForm.type === 'albumsGrid' ? 'max-w-4xl' : 'max-w-2xl'} p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit Module</h2>

			{#if modulesError}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">{modulesError}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="module-type" class="block text-sm font-medium text-gray-700 mb-2">
						Module Type
					</label>
					<select
						id="module-type"
						bind:value={moduleForm.type}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						{#each MODULE_TYPES as moduleType}
							<option value={moduleType.value}>{moduleType.label}</option>
						{/each}
					</select>
				</div>

				{#if moduleForm.type === 'featureGrid'}
					<!-- Feature Grid Form -->
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-feature-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title
							</label>
							<MultiLangInput id="module-feature-title" bind:value={featureGridTitle} />
						</div>

						<div>
							<label for="module-feature-subtitle" class="block text-sm font-medium text-gray-700 mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-feature-subtitle" bind:value={featureGridSubtitle} />
						</div>

						<div class="border-t border-gray-200 pt-4">
							<div class="flex items-center justify-between mb-4">
								<span class="block text-sm font-medium text-gray-700">
									Features
								</span>
								<button
									type="button"
									on:click={addFeatureItem}
									class="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
								>
									+ Add Item
								</button>
							</div>

							{#if featureGridItems.length === 0}
								<p class="text-sm text-gray-500 py-4 text-center border-2 border-dashed border-gray-300 rounded">
									No features yet. Click "Add Item" to add a feature.
								</p>
							{:else}
								<div class="space-y-4">
									{#each featureGridItems as item, index (index)}
										<div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
											<div class="flex items-center justify-between mb-3">
												<span class="text-sm font-medium text-gray-700">Feature {index + 1}</span>
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
													<span class="block text-xs font-medium text-gray-600 mb-1">
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
																class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
																on:click|stopPropagation
																on:mousedown|stopPropagation
															/>
														{/if}
													</div>
													<p class="mt-1 text-xs text-gray-500">
														Select an icon from the list, or choose "Custom..." to enter an emoji or custom text.
													</p>
												</div>

												<div>
													<label for="module-feature-item-{index}-title" class="block text-xs font-medium text-gray-600 mb-1">
														Title
													</label>
													<MultiLangInput id="module-feature-item-{index}-title" bind:value={item.title} />
												</div>

												<div>
													<label for="module-feature-item-{index}-desc" class="block text-xs font-medium text-gray-600 mb-1">
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
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-richtext-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title (optional)
							</label>
							<MultiLangInput id="module-richtext-title" bind:value={richTextTitle} />
						</div>

						<div>
							<label for="module-richtext-body" class="block text-sm font-medium text-gray-700 mb-2">
								Body Content
							</label>
							<MultiLangHTMLEditor id="module-richtext-body" bind:value={richTextBody} />
						</div>

						<div>
							<label for="module-richtext-bg" class="block text-sm font-medium text-gray-700 mb-2">
								Background Color
							</label>
							<select
								id="module-richtext-bg"
								bind:value={richTextBackground}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="white">White</option>
								<option value="gray">Gray</option>
							</select>
						</div>
					</div>
				{:else if moduleForm.type === 'hero'}
					<!-- Hero Form -->
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-hero-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title
							</label>
							<MultiLangInput id="module-hero-title" bind:value={heroTitle} />
						</div>

						<div>
							<label for="module-hero-subtitle" class="block text-sm font-medium text-gray-700 mb-2">
								Subtitle
							</label>
							<MultiLangInput id="module-hero-subtitle" bind:value={heroSubtitle} />
						</div>

						<div>
							<label for="module-hero-cta-label" class="block text-sm font-medium text-gray-700 mb-2">
								CTA Label (optional)
							</label>
							<MultiLangInput id="module-hero-cta-label" bind:value={heroCtaLabel} />
						</div>

						<div>
							<label for="module-hero-cta-url" class="block text-sm font-medium text-gray-700 mb-2">
								CTA URL (optional)
							</label>
							<input
								id="module-hero-cta-url"
								type="url"
								bind:value={heroCtaUrl}
								placeholder="https://..."
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>

						<div>
							<label for="module-hero-bg-style" class="block text-sm font-medium text-gray-700 mb-2">
								Background Style
							</label>
							<select
								id="module-hero-bg-style"
								bind:value={heroBackgroundStyle}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="image">Image (URL)</option>
								<option value="galleryLeading">Gallery leading photo</option>
							</select>
						</div>

						{#if heroBackgroundStyle === 'image'}
							<div>
								<label for="module-hero-bg-image" class="block text-sm font-medium text-gray-700 mb-2">
									Background Image URL
								</label>
								<input
									id="module-hero-bg-image"
									type="text"
									bind:value={heroBackgroundImage}
									placeholder="https://..."
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
						{/if}
					</div>
				{:else if moduleForm.type === 'albumsGrid'}
					<!-- Albums Grid Module Form -->
					<div class="space-y-4 border-t border-gray-200 pt-4">
						<div>
							<label for="module-albums-title" class="block text-sm font-medium text-gray-700 mb-2">
								Title
							</label>
							<MultiLangInput id="module-albums-title" bind:value={albumsGridTitle} />
						</div>

						<div>
							<label for="module-albums-desc" class="block text-sm font-medium text-gray-700 mb-2">
								Description (Rich Text)
							</label>
							<MultiLangHTMLEditor id="module-albums-desc" bind:value={albumsGridDescription} />
						</div>

						<div>
							<span class="block text-sm font-medium text-gray-700 mb-2">
								Select Albums
							</span>
							{#if albumsLoading}
								<div class="text-sm text-gray-500">Loading albums...</div>
							{:else}
								<div class="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto bg-white">
									{#if availableAlbums.length === 0}
										<p class="text-sm text-gray-500">No albums available.</p>
									{:else}
										<div class="space-y-2">
											{#each availableAlbums as album}
												<label class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
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
														class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
													/>
													<span class="text-sm text-gray-700 flex-1">
														{'  '.repeat(album.level || 0)}{getAlbumDisplayName(album)}
													</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
							<p class="mt-1 text-xs text-gray-500">
								Select one or more albums to display in the grid. Only the selected albums will be shown.
							</p>
							{#if albumsGridSelectedAlbums.length > 0}
								<p class="mt-1 text-xs text-blue-600">
									{albumsGridSelectedAlbums.length} album{albumsGridSelectedAlbums.length !== 1 ? 's' : ''} selected
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<!-- JSON Editor for other module types -->
					<div>
						<label for="module-props-json" class="block text-sm font-medium text-gray-700 mb-2">
							Props (JSON)
						</label>
						<textarea
							id="module-props-json"
							bind:value={moduleForm.propsJson}
							rows={10}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
						></textarea>
						<p class="mt-1 text-xs text-gray-500">
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
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={saveModuleEdit}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
					>
						Save Module
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
