<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { TemplateBuilderConfig, TemplateLocation, TemplateModule, TemplateModuleAssignment, TemplatePageConfig } from '$lib/types/template-builder';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let templates: TemplateBuilderConfig[] = [];
	let selectedTemplate: TemplateBuilderConfig | null = null;
	let loading = true;
	let saving = false;
	let message = '';
	let error = '';
	let activeTab: 'grid' | 'templates' | 'pages' = 'templates';
	
	// Workflow steps - simplified to just 2 steps
	type WorkflowStep = 'grid' | 'pages';
	let currentStep: WorkflowStep | null = null;
	
	// Helper to determine current step based on template state
	function getCurrentStep(): WorkflowStep | null {
		if (!selectedTemplate) return null;
		if (!selectedTemplate.gridRows || !selectedTemplate.gridColumns) return 'grid';
		return 'pages';
	}
	
	$: currentStep = getCurrentStep();
	
	// Module assignment form state
	let showAddModuleToPageDialog = false;
	let editingModuleAssignment: { pageId: string; assignmentId?: string } | null = null;
	let newModuleInstanceName = '';
	let newModuleType = 'menu';
	let newModuleLocationId = '';
	let newModuleOrder = 1;
	let newModuleProps: Record<string, any> = {};
	
	// Template creation
	let showCreateTemplateDialog = false;
	let newTemplateName = '';
	
	// Grid builder
	let gridRows = 3;
	let gridColumns = 3;
	let selectedCells: { row: number; col: number }[] = [];
	let isSelecting = false;
	let selectionStart: { row: number; col: number } | null = null;
	let showLocationNameDialog = false;
	let newLocationName = '';
	let newLocationDescription = '';
	let editingLocationId: string | null = null;
	
	// Location management
	let showAddLocationDialog = false;
	let newLocationNameOld = '';
	let newLocationDescriptionOld = '';
	let newLocationOrder = 0;
	
	// Module management (old - kept for backward compatibility, but not used in simplified workflow)
	let showAddModuleDialog = false;
	let newModuleTitle = '';
	let newModulePublished = true;
	
	// Note: newModuleType and newModuleOrder are declared above in the module assignment form state
	
	// Delete confirmation dialogs
	let showDeleteTemplateDialog = false;
	let showDeleteLocationDialog = false;
	let showDeleteModuleDialog = false;
	let templateToDelete: string | null = null;
	let locationToDelete: string | null = null;
	let moduleToDelete: string | null = null;
	let deleting = false;
	
	// Editing location grid coordinates
	let editingLocationGridId: string | null = null;
	let editingStartRow = 1;
	let editingStartCol = 1;
	let editingEndRow = 1;
	let editingEndCol = 1;
	
	// Grid render key to force updates
	let gridRenderKey = 0;
	
	// Page management
	let showDeletePageDialog = false;
	let pageToDelete: string | null = null;
	let selectedPage: TemplatePageConfig | null = null;
	let availablePages: Array<{ _id: string; alias: string; title: any }> = [];
	let pagesLoading = false;
	
	// System page types (predefined routes)
	const SYSTEM_PAGE_TYPES = [
		{ value: 'home', label: 'Home', pageId: 'home' },
		{ value: 'albums', label: 'Albums', pageId: 'albums' },
		{ value: 'album', label: 'Album (single)', pageId: 'album' },
		{ value: 'search', label: 'Search', pageId: 'search' },
	];
	
	// Module types available
	const MODULE_TYPES = [
		{ value: 'menu', label: 'Menu' },
		{ value: 'albumGrid', label: 'Album Grid' },
		{ value: 'hero', label: 'Hero' },
		{ value: 'richText', label: 'Rich Text' },
		{ value: 'featureGrid', label: 'Feature Grid' },
		{ value: 'albumsGrid', label: 'Albums Grid' },
		{ value: 'cta', label: 'Call To Action' },
		{ value: 'logoAndTitle', label: 'Logo and Site Name / Title' },
		{ value: 'languageSelection', label: 'Language Selection' },
		{ value: 'themeSelection', label: 'Template / Theme Selection' },
		{ value: 'loginLogout', label: 'Login / Logout Button' },
		{ value: 'helloUser', label: 'Hello User' },
	];

	onMount(async () => {
		await loadTemplates();
		await loadAvailablePages();
		// Add global mouseup handler for selection (only in browser)
		if (browser) {
			document.addEventListener('mouseup', handleGlobalMouseUp);
		}
	});

	async function loadAvailablePages() {
		pagesLoading = true;
		try {
			const response = await fetch('/api/admin/pages?published=true');
			if (response.ok) {
				const result = await response.json();
				availablePages = Array.isArray(result.data) ? result.data : [];
			}
		} catch (err) {
			console.error('Error loading pages:', err);
		} finally {
			pagesLoading = false;
		}
	}

	onDestroy(() => {
		// Remove event listener only in browser
		if (browser) {
			document.removeEventListener('mouseup', handleGlobalMouseUp);
		}
	});

	// Update grid settings when template is selected
	$: if (selectedTemplate) {
		if (selectedTemplate.gridRows) gridRows = selectedTemplate.gridRows;
		if (selectedTemplate.gridColumns) gridColumns = selectedTemplate.gridColumns;
	}

	async function loadTemplates() {
		try {
			loading = true;
			error = '';
			const response = await fetch('/api/admin/template-builder');
			if (!response.ok) {
				throw new Error('Failed to load templates');
			}
			const result = await response.json();
			if (result.success) {
				templates = result.data || [];
				if (templates.length > 0 && !selectedTemplate) {
					selectedTemplate = templates[0];
					if (selectedTemplate.gridRows) gridRows = selectedTemplate.gridRows;
					if (selectedTemplate.gridColumns) gridColumns = selectedTemplate.gridColumns;
				}
				// Ensure pages array exists
				templates.forEach(t => {
					if (!t.pages) t.pages = [];
				});
			} else {
				throw new Error(result.error || 'Failed to load templates');
			}
		} catch (err) {
			console.error('Error loading templates:', err);
			error = err instanceof Error ? err.message : 'Failed to load templates';
		} finally {
			loading = false;
		}
	}

	async function createTemplate() {
		if (!newTemplateName.trim()) {
			error = 'Template name is required';
			return;
		}

		try {
			saving = true;
			error = '';
			const response = await fetch('/api/admin/template-builder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ templateName: newTemplateName })
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to create template');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Template created successfully!';
				showCreateTemplateDialog = false;
				newTemplateName = '';
				await loadTemplates();
				if (result.data) {
					selectedTemplate = result.data;
				}
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to create template');
			}
		} catch (err) {
			console.error('Error creating template:', err);
			error = err instanceof Error ? err.message : 'Failed to create template';
		} finally {
			saving = false;
		}
	}

	function openDeleteTemplateDialog(templateId: string) {
		templateToDelete = templateId;
		showDeleteTemplateDialog = true;
	}

	function closeDeleteTemplateDialog() {
		showDeleteTemplateDialog = false;
		templateToDelete = null;
	}

	async function confirmDeleteTemplate() {
		if (!templateToDelete) return;
		
		const templateId = templateToDelete;
		closeDeleteTemplateDialog();

		try {
			deleting = true;
			error = '';
			const response = await fetch(`/api/admin/template-builder?templateId=${templateId}&action=deleteTemplate`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to delete template');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Template deleted successfully!';
				if (selectedTemplate?.templateId === templateId) {
					selectedTemplate = null;
				}
				await loadTemplates();
				// Force reactive update if template still selected
				if (selectedTemplate) {
					const updated = templates.find(t => t.templateId === selectedTemplate?.templateId);
					if (updated) {
						selectedTemplate = { ...updated };
					}
				}
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to delete template');
			}
		} catch (err) {
			console.error('Error deleting template:', err);
			error = err instanceof Error ? err.message : 'Failed to delete template';
		} finally {
			deleting = false;
		}
	}

	function updateGridSize() {
		if (!selectedTemplate) return;
		if (gridRows < 1) gridRows = 1;
		if (gridColumns < 1) gridColumns = 1;
		if (gridRows > 20) gridRows = 20;
		if (gridColumns > 20) gridColumns = 20;
		
		// Clear selections that are out of bounds
		selectedCells = selectedCells.filter(cell => 
			cell.row <= gridRows && cell.col <= gridColumns
		);
	}

	function getLocationForCell(row: number, col: number): TemplateLocation | null {
		if (!selectedTemplate) return null;
		// Force reactivity by accessing selectedTemplate.locations
		// Access gridRenderKey to ensure reactivity
		const _key = gridRenderKey;
		const locations = selectedTemplate.locations || [];
		return locations.find(loc => 
			loc.startRow && loc.endRow && loc.startCol && loc.endCol &&
			row >= loc.startRow && row <= loc.endRow &&
			col >= loc.startCol && col <= loc.endCol
		) || null;
	}

	function isCellSelected(row: number, col: number): boolean {
		return selectedCells.some(cell => cell.row === row && cell.col === col);
	}

	function handleCellMouseDown(row: number, col: number, event: MouseEvent) {
		if (!selectedTemplate) return;
		event.preventDefault(); // Prevent text selection
		event.stopPropagation();
		isSelecting = true;
		selectionStart = { row, col };
		selectedCells = [{ row, col }];
	}

	function updateSelection(row: number, col: number) {
		if (!isSelecting || !selectionStart) return;
		
		const minRow = Math.min(selectionStart.row, row);
		const maxRow = Math.max(selectionStart.row, row);
		const minCol = Math.min(selectionStart.col, col);
		const maxCol = Math.max(selectionStart.col, col);
		
		selectedCells = [];
		for (let r = minRow; r <= maxRow; r++) {
			for (let c = minCol; c <= maxCol; c++) {
				selectedCells.push({ row: r, col: c });
			}
		}
	}

	function handleCellMouseEnter(row: number, col: number) {
		updateSelection(row, col);
	}

	function handleCellMouseMove(row: number, col: number, event: MouseEvent) {
		if (isSelecting) {
			event.preventDefault();
			updateSelection(row, col);
		}
	}

	function handleCellMouseUp(event?: MouseEvent) {
		if (event) {
			event.preventDefault();
		}
		if (isSelecting && selectedCells.length > 0) {
			// Check if this area overlaps with existing location
			const minRow = Math.min(...selectedCells.map(c => c.row));
			const maxRow = Math.max(...selectedCells.map(c => c.row));
			const minCol = Math.min(...selectedCells.map(c => c.col));
			const maxCol = Math.max(...selectedCells.map(c => c.col));
			
			const overlappingLocation = selectedTemplate?.locations.find(loc => 
				loc.startRow && loc.endRow && loc.startCol && loc.endCol &&
				!(
					maxRow < loc.startRow || minRow > loc.endRow ||
					maxCol < loc.startCol || minCol > loc.endCol
				)
			);
			
			if (overlappingLocation) {
				editingLocationId = overlappingLocation.id;
				newLocationName = overlappingLocation.name;
				newLocationDescription = overlappingLocation.description || '';
			} else {
				editingLocationId = null;
				newLocationName = '';
				newLocationDescription = '';
			}
			showLocationNameDialog = true;
		}
		isSelecting = false;
		selectionStart = null;
	}

	function handleGlobalMouseUp(event: MouseEvent) {
		if (isSelecting) {
			handleCellMouseUp(event);
		}
	}

	function cancelSelection() {
		selectedCells = [];
		isSelecting = false;
		selectionStart = null;
	}

	async function saveLocationFromGrid() {
		if (!selectedTemplate || !newLocationName.trim() || selectedCells.length === 0) {
			error = 'Location name is required and cells must be selected';
			return;
		}

		const minRow = Math.min(...selectedCells.map(c => c.row));
		const maxRow = Math.max(...selectedCells.map(c => c.row));
		const minCol = Math.min(...selectedCells.map(c => c.col));
		const maxCol = Math.max(...selectedCells.map(c => c.col));

		try {
			saving = true;
			error = '';
			
			const locationData = {
				name: newLocationName,
				description: newLocationDescription,
				order: editingLocationId ? 
					selectedTemplate.locations.find(l => l.id === editingLocationId)?.order || 
					(selectedTemplate.locations.length + 1) :
					(selectedTemplate.locations.length + 1),
				startRow: minRow,
				endRow: maxRow,
				startCol: minCol,
				endCol: maxCol
			};

			const action = editingLocationId ? 'updateLocation' : 'addLocation';
			const url = editingLocationId 
				? `/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=updateLocation&locationId=${editingLocationId}`
				: `/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=addLocation`;

			const response = await fetch(url, {
				method: editingLocationId ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(locationData)
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to add location');
			}

			const result = await response.json();
			if (result.success) {
				message = editingLocationId ? 'Location updated successfully!' : 'Location added successfully!';
				showLocationNameDialog = false;
				selectedCells = [];
				newLocationName = '';
				newLocationDescription = '';
				editingLocationId = null;
				// Force reactive update by creating a new object reference
				selectedTemplate = { ...result.data };
				// Update grid size if needed
				if (selectedTemplate && selectedTemplate.gridRows) gridRows = selectedTemplate.gridRows;
				if (selectedTemplate && selectedTemplate.gridColumns) gridColumns = selectedTemplate.gridColumns;
				// Force grid re-render
				gridRenderKey += 1;
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to save location');
			}
		} catch (err) {
			console.error('Error saving location:', err);
			error = err instanceof Error ? err.message : 'Failed to save location';
		} finally {
			saving = false;
		}
	}

	async function saveGridConfiguration() {
		if (!selectedTemplate) return;
		
		const templateId = selectedTemplate.templateId;
		
		try {
			saving = true;
			error = '';
			const response = await fetch(`/api/admin/template-builder?templateId=${templateId}&action=updateGrid`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					gridRows,
					gridColumns
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to update grid');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Grid configuration saved!';
				// Force reactive update
				selectedTemplate = { ...result.data };
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to update grid');
			}
		} catch (err) {
			console.error('Error updating grid:', err);
			error = err instanceof Error ? err.message : 'Failed to update grid';
		} finally {
			saving = false;
		}
	}

	async function addLocation() {
		if (!selectedTemplate || !newLocationNameOld.trim()) {
			error = 'Template must be selected and location name is required';
			return;
		}

		try {
			saving = true;
			error = '';
			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=addLocation`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newLocationNameOld,
					description: newLocationDescriptionOld,
					order: newLocationOrder || (selectedTemplate.locations.length + 1)
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to add location');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Location added successfully!';
				showAddLocationDialog = false;
				newLocationNameOld = '';
				newLocationDescriptionOld = '';
				newLocationOrder = 0;
				// Force reactive update
				selectedTemplate = { ...result.data };
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to add location');
			}
		} catch (err) {
			console.error('Error adding location:', err);
			error = err instanceof Error ? err.message : 'Failed to add location';
		} finally {
			saving = false;
		}
	}

	function openDeleteLocationDialog(locationId: string) {
		if (!selectedTemplate) return;
		locationToDelete = locationId;
		showDeleteLocationDialog = true;
	}

	function closeDeleteLocationDialog() {
		showDeleteLocationDialog = false;
		locationToDelete = null;
	}

	async function confirmDeleteLocation() {
		if (!selectedTemplate || !locationToDelete) return;
		
		const locationId = locationToDelete;
		closeDeleteLocationDialog();

		try {
			deleting = true;
			error = '';
			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=deleteLocation&locationId=${locationId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to delete location');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Location deleted successfully!';
				// Force reactive update
				selectedTemplate = { ...result.data };
				// Force grid re-render
				gridRenderKey += 1;
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to delete location');
			}
		} catch (err) {
			console.error('Error deleting location:', err);
			error = err instanceof Error ? err.message : 'Failed to delete location';
		} finally {
			deleting = false;
		}
	}

	async function addModule() {
		if (!selectedTemplate || !newModuleType) {
			error = 'Template must be selected and module type is required';
			return;
		}

		try {
			saving = true;
			error = '';
			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=addModule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: newModuleType,
					title: newModuleTitle || `${MODULE_TYPES.find(m => m.value === newModuleType)?.label || newModuleType} Instance`,
					props: {},
					order: newModuleOrder || (selectedTemplate.modules.length + 1),
					published: newModulePublished
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to add module');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Module instance created successfully!';
				showAddModuleDialog = false;
				newModuleType = 'menu';
				newModuleTitle = '';
				newModuleOrder = 0;
				newModulePublished = true;
				// Force reactive update
				selectedTemplate = { ...result.data };
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to add module');
			}
		} catch (err) {
			console.error('Error adding module:', err);
			error = err instanceof Error ? err.message : 'Failed to add module';
		} finally {
			saving = false;
		}
	}

	async function duplicateModule(moduleId: string) {
		if (!selectedTemplate) return;
		
		const moduleToDuplicate = selectedTemplate.modules.find(m => m.id === moduleId);
		if (!moduleToDuplicate) return;

		try {
			saving = true;
			error = '';
			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=addModule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: moduleToDuplicate.type,
					title: `${moduleToDuplicate.title || moduleToDuplicate.type} (Copy)`,
					props: { ...moduleToDuplicate.props },
					order: selectedTemplate.modules.length + 1,
					published: moduleToDuplicate.published
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to duplicate module');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Module instance duplicated successfully!';
				// Force reactive update
				selectedTemplate = { ...result.data };
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to duplicate module');
			}
		} catch (err) {
			console.error('Error duplicating module:', err);
			error = err instanceof Error ? err.message : 'Failed to duplicate module';
		} finally {
			saving = false;
		}
	}

	function openDeleteModuleDialog(moduleId: string) {
		if (!selectedTemplate) return;
		moduleToDelete = moduleId;
		showDeleteModuleDialog = true;
	}

	function closeDeleteModuleDialog() {
		showDeleteModuleDialog = false;
		moduleToDelete = null;
	}

	async function confirmDeleteModule() {
		if (!selectedTemplate || !moduleToDelete) return;
		
		const moduleId = moduleToDelete;
		closeDeleteModuleDialog();

		try {
			deleting = true;
			error = '';
			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=deleteModule&moduleId=${moduleId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to delete module');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Module deleted successfully!';
				// Force reactive update
				selectedTemplate = { ...result.data };
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to delete module');
			}
		} catch (err) {
			console.error('Error deleting module:', err);
			error = err instanceof Error ? err.message : 'Failed to delete module';
		} finally {
			deleting = false;
		}
	}

	async function assignModule(locationId: string, moduleId: string) {
		if (!selectedTemplate) return;

		try {
			saving = true;
			error = '';
			
			// Get current assignments for this location to determine order
			const locationAssignments = selectedTemplate.assignments
				.filter(a => a.locationId === locationId)
				.sort((a, b) => a.order - b.order);
			const nextOrder = locationAssignments.length > 0 
				? locationAssignments[locationAssignments.length - 1].order + 1 
				: 1;

			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=assignModule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					locationId,
					moduleId,
					order: nextOrder
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to assign module');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Module assigned successfully!';
				// Force reactive update
				selectedTemplate = { ...result.data };
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to assign module');
			}
		} catch (err) {
			console.error('Error assigning module:', err);
			error = err instanceof Error ? err.message : 'Failed to assign module';
		} finally {
			saving = false;
		}
	}

	async function unassignModule(locationId: string, moduleId: string) {
		if (!selectedTemplate) return;

		try {
			saving = true;
			error = '';
			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=unassignModule&locationId=${locationId}&moduleId=${moduleId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to unassign module');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Module unassigned successfully!';
				// Force reactive update
				selectedTemplate = { ...result.data };
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to unassign module');
			}
		} catch (err) {
			console.error('Error unassigning module:', err);
			error = err instanceof Error ? err.message : 'Failed to unassign module';
		} finally {
			saving = false;
		}
	}

	function getModulesForLocation(locationId: string): TemplateModule[] {
		if (!selectedTemplate) return [];
		const assignmentIds = selectedTemplate.assignments
			.filter(a => a.locationId === locationId)
			.sort((a, b) => a.order - b.order)
			.map(a => a.moduleId);
		return selectedTemplate.modules
			.filter(m => assignmentIds.includes(m.id))
			.sort((a, b) => {
				const aIndex = assignmentIds.indexOf(a.id);
				const bIndex = assignmentIds.indexOf(b.id);
				return aIndex - bIndex;
			});
	}

	function getUnassignedModules(): TemplateModule[] {
		if (!selectedTemplate) return [];
		const assignedIds = new Set(selectedTemplate.assignments.map(a => a.moduleId));
		return selectedTemplate.modules.filter(m => !assignedIds.has(m.id));
	}

	function getUnassignedModulesForPage(pageId: string): TemplateModule[] {
		if (!selectedTemplate || !selectedTemplate.pages) return [];
		const page = selectedTemplate.pages.find((p: TemplatePageConfig) => p.id === pageId);
		if (!page) return [];
		const assignedIds = new Set((page.moduleAssignments || []).map(a => a.moduleId));
		return selectedTemplate.modules.filter(m => !assignedIds.has(m.id));
	}

	function getModulesForPageLocation(pageId: string, locationId: string): TemplateModule[] {
		if (!selectedTemplate || !selectedTemplate.pages) return [];
		const page = selectedTemplate.pages.find((p: TemplatePageConfig) => p.id === pageId);
		if (!page) return [];
		const assignments = (page.moduleAssignments || [])
			.filter(a => a.locationId === locationId)
			.sort((a, b) => a.order - b.order);
		return assignments.map(assignment => {
			const module = selectedTemplate?.modules.find(m => m.id === assignment.moduleId);
			return module!;
		}).filter(Boolean) as TemplateModule[];
	}

	async function addPageToTemplate(pageType: 'home' | 'albums' | 'album' | 'search' | 'page', pageId?: string) {
		if (!selectedTemplate) return;

		// Check if page already exists in template
		const existingPage = selectedTemplate.pages?.find(p => 
			p.pageType === pageType && 
			(pageType === 'page' ? p.pageId === pageId : true)
		);
		if (existingPage) {
			error = 'This page is already added to the template';
			return;
		}

		try {
			saving = true;
			error = '';
			
			let pageName = '';
			if (pageType === 'page' && pageId) {
				const page = availablePages.find(p => p._id === pageId);
				pageName = page ? (typeof page.title === 'string' ? page.title : page.title?.en || page.title?.he || page.alias) : pageId;
			} else {
				const systemPage = SYSTEM_PAGE_TYPES.find(pt => pt.value === pageType);
				pageName = systemPage?.label || pageType;
			}

			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=addPage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					pageType,
					pageName,
					pageId: pageId || (pageType !== 'page' ? SYSTEM_PAGE_TYPES.find(pt => pt.value === pageType)?.pageId : undefined),
					moduleAssignments: []
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to add page');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Page added to template successfully!';
				selectedTemplate = { ...result.data };
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to add page');
			}
		} catch (err) {
			console.error('Error adding page:', err);
			error = err instanceof Error ? err.message : 'Failed to add page';
		} finally {
			saving = false;
		}
	}

	async function deletePage(pageId: string) {
		if (!selectedTemplate) return;

		try {
			saving = true;
			error = '';
			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=deletePage&pageId=${pageId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to delete page');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Page deleted successfully!';
				if (selectedPage?.id === pageId) {
					selectedPage = null;
				}
				selectedTemplate = { ...result.data };
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to delete page');
			}
		} catch (err) {
			console.error('Error deleting page:', err);
			error = err instanceof Error ? err.message : 'Failed to delete page';
		} finally {
			saving = false;
		}
	}

	async function saveModuleToPage() {
		if (!selectedTemplate || !editingModuleAssignment) return;
		if (!newModuleInstanceName.trim() || !newModuleLocationId || !newModuleType) {
			error = 'Instance name, module type, and location are required';
			return;
		}

		try {
			saving = true;
			error = '';
			
			// First, create the module instance
			const createModuleResponse = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=addModule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: newModuleType,
					title: newModuleInstanceName,
					props: newModuleProps,
					order: 0,
					published: true
				})
			});

			if (!createModuleResponse.ok) {
				const result = await createModuleResponse.json();
				throw new Error(result.error || 'Failed to create module instance');
			}

			const createResult = await createModuleResponse.json();
			if (!createResult.success) {
				throw new Error(createResult.error || 'Failed to create module instance');
			}

			// Get the created module ID
			const createdModule = createResult.data.modules.find((m: TemplateModule) => 
				m.title === newModuleInstanceName && m.type === newModuleType
			);
			if (!createdModule) {
				throw new Error('Failed to find created module');
			}

			// Then assign it to the page
			const assignResponse = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=assignModuleToPage&pageId=${editingModuleAssignment.pageId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					locationId: newModuleLocationId,
					moduleId: createdModule.id,
					order: newModuleOrder
				})
			});

			if (!assignResponse.ok) {
				const result = await assignResponse.json();
				throw new Error(result.error || 'Failed to assign module to page');
			}

			const assignResult = await assignResponse.json();
			if (assignResult.success) {
				message = 'Module instance added to page successfully!';
				selectedTemplate = { ...assignResult.data };
				const pages = (assignResult.data as TemplateBuilderConfig).pages || [];
				selectedPage = pages.find((p: TemplatePageConfig) => p.id === editingModuleAssignment.pageId) || null;
				showAddModuleToPageDialog = false;
				editingModuleAssignment = null;
				newModuleInstanceName = '';
				newModuleType = 'menu';
				newModuleLocationId = '';
				newModuleOrder = 1;
				newModuleProps = {};
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(assignResult.error || 'Failed to assign module to page');
			}
		} catch (err) {
			console.error('Error saving module to page:', err);
			error = err instanceof Error ? err.message : 'Failed to save module to page';
		} finally {
			saving = false;
		}
	}

	async function assignModuleToPage(pageId: string, locationId: string, moduleId: string) {
		if (!selectedTemplate) return;

		try {
			saving = true;
			error = '';
			const page = selectedTemplate.pages?.find(p => p.id === pageId);
			if (!page) {
				throw new Error('Page not found');
			}

			const locationAssignments = page.moduleAssignments
				.filter(a => a.locationId === locationId)
				.sort((a, b) => a.order - b.order);
			const nextOrder = locationAssignments.length > 0 
				? locationAssignments[locationAssignments.length - 1].order + 1 
				: 1;

			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=assignModuleToPage&pageId=${pageId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					locationId,
					moduleId,
					order: nextOrder
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to assign module to page');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Module assigned to page successfully!';
				selectedTemplate = { ...result.data };
				// Update selected page
				const pages = (result.data as TemplateBuilderConfig).pages || [];
				selectedPage = pages.find((p: TemplatePageConfig) => p.id === pageId) || null;
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to assign module to page');
			}
		} catch (err) {
			console.error('Error assigning module to page:', err);
			error = err instanceof Error ? err.message : 'Failed to assign module to page';
		} finally {
			saving = false;
		}
	}

	async function unassignModuleFromPage(pageId: string, locationId: string, moduleId: string) {
		if (!selectedTemplate) return;

		try {
			saving = true;
			error = '';
			const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=unassignModuleFromPage&pageId=${pageId}&locationId=${locationId}&moduleId=${moduleId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to unassign module from page');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Module unassigned from page successfully!';
				selectedTemplate = { ...result.data };
				// Update selected page
				const pages = (result.data as TemplateBuilderConfig).pages || [];
				selectedPage = pages.find((p: TemplatePageConfig) => p.id === pageId) || null;
				setTimeout(() => { message = ''; }, 3000);
			} else {
				throw new Error(result.error || 'Failed to unassign module from page');
			}
		} catch (err) {
			console.error('Error unassigning module from page:', err);
			error = err instanceof Error ? err.message : 'Failed to unassign module from page';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Template Builder - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-7xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<h1 class="text-2xl font-bold text-gray-900">Template Builder</h1>
				<a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm">Back to Admin</a>
			</div>

			{#if message}
				<div class="mb-4 p-4 bg-green-50 text-green-800 border border-green-300 rounded-lg">
					{message}
				</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-800 border border-red-300 rounded-lg">
					{error}
				</div>
			{/if}

			{#if loading}
				<div class="text-center py-12">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p class="mt-4 text-gray-600">Loading templates...</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
					<!-- Template List -->
					<div class="lg:col-span-1">
						<div class="flex items-center justify-between mb-4">
							<h2 class="text-lg font-semibold text-gray-900">Templates</h2>
							<button
								type="button"
								on:click={() => (showCreateTemplateDialog = true)}
								class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
							>
								+ New
							</button>
						</div>
						<div class="space-y-2">
							{#each templates as template}
								<div
									class="p-3 rounded-lg border cursor-pointer transition-colors {selectedTemplate?.templateId === template.templateId
										? 'bg-blue-50 border-blue-500'
										: 'bg-gray-50 border-gray-200 hover:bg-gray-100'}"
									on:click={() => (selectedTemplate = template)}
								>
									<div class="flex items-center justify-between">
										<div>
											<div class="font-medium text-gray-900">{template.templateName}</div>
											<div class="text-xs text-gray-500">
												{template.locations.length} locations, {template.modules.length} modules
											</div>
										</div>
									<button
										type="button"
										on:click|stopPropagation={() => openDeleteTemplateDialog(template.templateId)}
										class="text-red-600 hover:text-red-800 text-sm"
										>
											Delete
										</button>
									</div>
								</div>
							{/each}
							{#if templates.length === 0}
								<p class="text-gray-500 text-center py-4">No templates yet. Create one to get started.</p>
							{/if}
						</div>
					</div>

					<!-- Template Editor -->
					<div class="lg:col-span-3">
						{#if selectedTemplate}
							<div class="mb-4">
								<h2 class="text-lg font-semibold text-gray-900 mb-4">
									Editing: {selectedTemplate.templateName}
								</h2>
								
								<!-- Workflow Steps Indicator -->
								<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
									<div class="flex items-center justify-between">
										<div class="flex items-center space-x-4">
											<div class="flex items-center">
												<div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep === 'grid' ? 'bg-blue-600 text-white' : selectedTemplate.gridRows && selectedTemplate.gridColumns ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}">
													{#if selectedTemplate.gridRows && selectedTemplate.gridColumns}
														✓
													{:else}
														1
													{/if}
												</div>
												<span class="ml-2 text-sm font-medium {currentStep === 'grid' ? 'text-blue-700' : selectedTemplate.gridRows && selectedTemplate.gridColumns ? 'text-green-700' : 'text-gray-600'}">
													Define Grid
												</span>
											</div>
											<div class="w-8 h-0.5 {selectedTemplate.gridRows && selectedTemplate.gridColumns ? 'bg-green-500' : 'bg-gray-300'}"></div>
											<div class="flex items-center">
												<div class="flex items-center justify-center w-8 h-8 rounded-full {currentStep === 'pages' ? 'bg-blue-600 text-white' : selectedTemplate.pages && selectedTemplate.pages.length > 0 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}">
													{#if selectedTemplate.pages && selectedTemplate.pages.length > 0}
														✓
													{:else}
														2
													{/if}
												</div>
												<span class="ml-2 text-sm font-medium {currentStep === 'pages' ? 'text-blue-700' : selectedTemplate.pages && selectedTemplate.pages.length > 0 ? 'text-green-700' : 'text-gray-600'}">
													Assign Modules to Pages
												</span>
											</div>
										</div>
										{#if currentStep}
											<button
												type="button"
												on:click={() => {
													if (currentStep === 'grid') activeTab = 'grid';
													else if (currentStep === 'pages') activeTab = 'pages';
												}}
												class="text-blue-600 hover:text-blue-800 text-sm font-medium"
											>
												Go to Step →
											</button>
										{/if}
									</div>
								</div>
								
								<!-- Tabs -->
								<div class="border-b border-gray-200 mb-4">
									<nav class="-mb-px flex space-x-8">
										<button
											type="button"
											class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'grid'
												? 'border-blue-500 text-blue-600'
												: 'border-transparent text-gray-500 hover:text-gray-700'}"
											on:click={() => {
												activeTab = 'grid';
												if (selectedTemplate?.gridRows) gridRows = selectedTemplate.gridRows;
												if (selectedTemplate?.gridColumns) gridColumns = selectedTemplate.gridColumns;
											}}
										>
											1. Define Grid
										</button>
										<button
											type="button"
											class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'pages'
												? 'border-blue-500 text-blue-600'
												: 'border-transparent text-gray-500 hover:text-gray-700'}"
											on:click={() => (activeTab = 'pages')}
											disabled={!selectedTemplate.gridRows || !selectedTemplate.gridColumns}
										>
											2. Assign Modules to Pages ({selectedTemplate.pages?.length || 0})
										</button>
									</nav>
								</div>

								<!-- Grid Builder Tab -->
								{#if activeTab === 'grid'}
									<div class="space-y-6">
										<!-- Grid Configuration -->
										<div class="bg-gray-50 p-4 rounded-lg">
											<h3 class="text-lg font-semibold text-gray-900 mb-4">Grid Configuration</h3>
											<div class="grid grid-cols-2 gap-4">
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Rows</label>
													<input
														type="number"
														min="1"
														max="20"
														bind:value={gridRows}
														on:input={updateGridSize}
														class="w-full px-3 py-2 border border-gray-300 rounded-md"
													/>
												</div>
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Columns</label>
													<input
														type="number"
														min="1"
														max="20"
														bind:value={gridColumns}
														on:input={updateGridSize}
														class="w-full px-3 py-2 border border-gray-300 rounded-md"
													/>
												</div>
											</div>
											<button
												type="button"
												on:click={saveGridConfiguration}
												disabled={saving}
												class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
											>
												{saving ? 'Saving...' : 'Save Grid Configuration'}
											</button>
										</div>

										<!-- Grid Visual Builder -->
										<div>
											<h3 class="text-lg font-semibold text-gray-900 mb-4">Define Areas</h3>
											<p class="text-sm text-gray-600 mb-4">
												Click and drag on the grid to select cells, then name the area (location).
											</p>
											
											<div class="inline-block border-2 border-gray-300 p-2 bg-white select-none">
												{#key `${selectedTemplate?.templateId || ''}-${gridRenderKey}`}
												<div
													class="grid gap-1"
													style="grid-template-columns: repeat({gridColumns}, minmax(40px, 1fr));"
													on:mousemove={(e) => {
														if (isSelecting && selectionStart) {
															const target = e.target as HTMLElement;
															const cell = target.closest('[data-row][data-col]') as HTMLElement;
															if (cell) {
																const row = parseInt(cell.dataset.row || '0');
																const col = parseInt(cell.dataset.col || '0');
																if (row > 0 && col > 0) {
																	updateSelection(row, col);
																}
															}
														}
													}}
												>
													{#each Array(gridRows) as _, rowIndex}
														{#each Array(gridColumns) as _, colIndex}
															{@const row = rowIndex + 1}
															{@const col = colIndex + 1}
															{@const location = getLocationForCell(row, col)}
															{@const isSelected = isCellSelected(row, col)}
															{@const _renderKey = gridRenderKey}
															<div
																data-row={row}
																data-col={col}
																class="w-10 h-10 border border-gray-300 cursor-crosshair transition-all flex items-center justify-center text-xs font-medium select-none
																	{isSelected ? 'bg-blue-500 text-white border-blue-600 z-10' : ''}
																	{location && !isSelected ? 'bg-green-100 text-green-800 border-green-400' : ''}
																	{!location && !isSelected ? 'bg-gray-50 text-gray-600 hover:bg-gray-100' : ''}"
																on:mousedown={(e) => handleCellMouseDown(row, col, e)}
																on:mouseenter={() => handleCellMouseEnter(row, col)}
																on:mousemove={(e) => handleCellMouseMove(row, col, e)}
																title={location ? `Location: ${location.name}` : `Row ${row}, Col ${col}`}
															>
																{location ? location.name.charAt(0).toUpperCase() : ''}
															</div>
														{/each}
													{/each}
												</div>
												{/key}
											</div>

											{#if selectedCells.length > 0}
												{@const minRow = Math.min(...selectedCells.map(c => c.row))}
												{@const maxRow = Math.max(...selectedCells.map(c => c.row))}
												{@const minCol = Math.min(...selectedCells.map(c => c.col))}
												{@const maxCol = Math.max(...selectedCells.map(c => c.col))}
												<div class="mt-4 space-y-2">
													<div class="bg-blue-50 border border-blue-200 rounded-md p-3">
														<div class="text-sm font-medium text-blue-900 mb-1">Selected Area:</div>
														<div class="text-sm text-blue-700 font-mono">
															{minRow}:{minCol}:{maxRow}:{maxCol}
														</div>
														<div class="text-xs text-blue-600 mt-1">
															({selectedCells.length} cell{selectedCells.length !== 1 ? 's' : ''})
														</div>
													</div>
													<div class="flex gap-2">
														<button
															type="button"
															on:click={cancelSelection}
															class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
														>
															Clear Selection
														</button>
														<button
															type="button"
															on:click={() => {
																if (selectedCells.length > 0) {
																	const minRow = Math.min(...selectedCells.map(c => c.row));
																	const maxRow = Math.max(...selectedCells.map(c => c.row));
																	const minCol = Math.min(...selectedCells.map(c => c.col));
																	const maxCol = Math.max(...selectedCells.map(c => c.col));
																	
																	const overlappingLocation = selectedTemplate?.locations.find(loc => 
																		loc.startRow && loc.endRow && loc.startCol && loc.endCol &&
																		!(
																			maxRow < loc.startRow || minRow > loc.endRow ||
																			maxCol < loc.startCol || minCol > loc.endCol
																		)
																	);
																	
																	if (overlappingLocation) {
																		editingLocationId = overlappingLocation.id;
																		newLocationName = overlappingLocation.name;
																		newLocationDescription = overlappingLocation.description || '';
																	} else {
																		editingLocationId = null;
																		newLocationName = '';
																		newLocationDescription = '';
																	}
																	showLocationNameDialog = true;
																}
															}}
															class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
														>
															Create/Edit Location
														</button>
													</div>
												</div>
											{/if}
										</div>

										<!-- Existing Locations -->
										<div>
											<h3 class="text-lg font-semibold text-gray-900 mb-4">Defined Locations</h3>
											<div class="space-y-2">
												{#each selectedTemplate.locations.sort((a, b) => a.order - b.order) as location}
													<div class="p-4 border border-gray-200 rounded-lg bg-white">
														<div class="flex items-center justify-between">
															<div class="flex-1">
																<div class="font-medium text-gray-900">{location.name}</div>
																{#if location.description}
																	<div class="text-sm text-gray-600">{location.description}</div>
																{/if}
																{#if location.startRow && location.endRow && location.startCol && location.endCol}
																	{#if editingLocationGridId === location.id}
																		<div class="mt-2 space-y-2">
																			<div class="text-xs font-medium text-gray-700 mb-1">Grid Coordinates:</div>
																			<div class="flex items-center gap-2 flex-wrap">
																				<div class="flex items-center gap-1">
																					<label class="text-xs text-gray-600">Start Row:</label>
																					<input
																						type="number"
																						min="1"
																						max={gridRows}
																						bind:value={editingStartRow}
																						class="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
																					/>
																				</div>
																				<div class="flex items-center gap-1">
																					<label class="text-xs text-gray-600">Start Col:</label>
																					<input
																						type="number"
																						min="1"
																						max={gridColumns}
																						bind:value={editingStartCol}
																						class="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
																					/>
																				</div>
																				<div class="flex items-center gap-1">
																					<label class="text-xs text-gray-600">End Row:</label>
																					<input
																						type="number"
																						min="1"
																						max={gridRows}
																						bind:value={editingEndRow}
																						class="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
																					/>
																				</div>
																				<div class="flex items-center gap-1">
																					<label class="text-xs text-gray-600">End Col:</label>
																					<input
																						type="number"
																						min="1"
																						max={gridColumns}
																						bind:value={editingEndCol}
																						class="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
																					/>
																				</div>
																				<div class="flex gap-1">
																					<button
																						type="button"
																						on:click={async () => {
																							if (!selectedTemplate) return;
																							try {
																								saving = true;
																								error = '';
																								const response = await fetch(`/api/admin/template-builder?templateId=${selectedTemplate.templateId}&action=updateLocation&locationId=${location.id}`, {
																									method: 'PUT',
																									headers: { 'Content-Type': 'application/json' },
																									body: JSON.stringify({
																										startRow: editingStartRow,
																										endRow: editingEndRow,
																										startCol: editingStartCol,
																										endCol: editingEndCol
																									})
																								});
																								
																								if (!response.ok) {
																									const result = await response.json();
																									throw new Error(result.error || 'Failed to update location');
																								}
																								
																const result = await response.json();
																if (result.success) {
																	message = 'Location grid coordinates updated!';
																	// Force reactive update by creating a new object reference with deep copy of locations
																	selectedTemplate = {
																		...result.data,
																		locations: result.data.locations ? [...result.data.locations] : []
																	};
																	editingLocationGridId = null;
																	// Clear any selected cells to refresh the grid view
																	selectedCells = [];
																	// Force grid re-render by incrementing key
																	gridRenderKey += 1;
																	setTimeout(() => { message = ''; }, 3000);
																} else {
																	throw new Error(result.error || 'Failed to update location');
																}
																							} catch (err) {
																								console.error('Error updating location:', err);
																								error = err instanceof Error ? err.message : 'Failed to update location';
																							} finally {
																								saving = false;
																							}
																						}}
																						disabled={saving}
																						class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
																					>
																						Save
																					</button>
																					<button
																						type="button"
																						on:click={() => {
																							editingLocationGridId = null;
																						}}
																						class="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
																					>
																						Cancel
																					</button>
																				</div>
																			</div>
																		</div>
																	{:else}
																		<div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
																			<span>Grid: {location.startRow}:{location.startCol}:{location.endRow}:{location.endCol}</span>
																			<button
																				type="button"
																				on:click={() => {
																					editingLocationGridId = location.id;
																					editingStartRow = location.startRow || 1;
																					editingStartCol = location.startCol || 1;
																					editingEndRow = location.endRow || 1;
																					editingEndCol = location.endCol || 1;
																				}}
																				class="text-blue-600 hover:text-blue-800 text-xs underline"
																			>
																				Edit
																			</button>
																		</div>
																	{/if}
																{/if}
															</div>
															<button
																type="button"
																on:click={() => openDeleteLocationDialog(location.id)}
																class="text-red-600 hover:text-red-800 text-sm ml-2"
															>
																Delete
															</button>
														</div>
													</div>
												{/each}
												{#if selectedTemplate.locations.length === 0}
													<p class="text-gray-500 text-center py-4">No locations defined yet. Select cells on the grid above to create one.</p>
												{/if}
											</div>
										</div>
									</div>
								{/if}

								<!-- Locations Tab -->
								{#if activeTab === 'locations'}
									<div class="space-y-4">
										<div class="flex justify-end">
											<button
												type="button"
												on:click={() => (showAddLocationDialog = true)}
												class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
											>
												+ Add Location
											</button>
										</div>
										<div class="space-y-2">
											{#each selectedTemplate.locations.sort((a, b) => a.order - b.order) as location}
												<div class="p-4 border border-gray-200 rounded-lg">
													<div class="flex items-center justify-between">
														<div>
															<div class="font-medium text-gray-900">{location.name}</div>
															{#if location.description}
																<div class="text-sm text-gray-600">{location.description}</div>
															{/if}
															<div class="text-xs text-gray-500">Order: {location.order}</div>
														</div>
													<button
														type="button"
														on:click={() => openDeleteLocationDialog(location.id)}
														class="text-red-600 hover:text-red-800 text-sm"
														>
															Delete
														</button>
													</div>
												</div>
											{/each}
											{#if selectedTemplate.locations.length === 0}
												<p class="text-gray-500 text-center py-8">No locations yet. Add one to get started.</p>
											{/if}
										</div>
									</div>
								{/if}

								<!-- Modules Tab -->
								{#if activeTab === 'modules'}
									<div class="space-y-6">
										<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
											<h4 class="font-medium text-blue-900 mb-2">Module Instances</h4>
											<p class="text-sm text-blue-800">
												Create instances of predefined module types. Each instance can have its own parameters and settings. 
												For example, you can create multiple Menu instances (header menu, footer menu) with different configurations.
											</p>
										</div>
										
										<div class="flex justify-between items-center">
											<h3 class="text-lg font-semibold text-gray-900">Module Instances ({selectedTemplate.modules.length})</h3>
											<button
												type="button"
												on:click={() => (showAddModuleDialog = true)}
												class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
											>
												+ Create Instance
											</button>
										</div>
										
										<div class="space-y-2">
											{#each selectedTemplate.modules.sort((a, b) => a.order - b.order) as module}
												<div class="p-4 border border-gray-200 rounded-lg bg-white">
													<div class="flex items-center justify-between">
														<div class="flex-1">
															<div class="font-medium text-gray-900">
																{module.title || module.type}
																<span class="ml-2 text-xs text-gray-500">({MODULE_TYPES.find(m => m.value === module.type)?.label || module.type})</span>
															</div>
															<div class="text-xs text-gray-500 mt-1">
																Order: {module.order} | {module.published ? 'Published' : 'Unpublished'}
															</div>
														</div>
														<div class="flex gap-2">
															<button
																type="button"
																on:click={() => duplicateModule(module.id)}
																class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
																title="Duplicate this module instance"
															>
																Duplicate
															</button>
															<button
																type="button"
																on:click={() => openDeleteModuleDialog(module.id)}
																class="px-3 py-1 text-sm text-red-600 hover:text-red-800"
															>
																Delete
															</button>
														</div>
													</div>
												</div>
											{/each}
											{#if selectedTemplate.modules.length === 0}
												<div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
													<p class="text-gray-500 mb-4">No module instances yet.</p>
													<p class="text-sm text-gray-400">Create your first module instance to get started.</p>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								<!-- Assignments Tab -->
								{#if activeTab === 'assignments'}
									<div class="space-y-6">
										{#each selectedTemplate.locations.sort((a, b) => a.order - b.order) as location}
											<div class="border border-gray-200 rounded-lg p-4">
												<h3 class="font-semibold text-gray-900 mb-3">{location.name}</h3>
												<div class="space-y-2 mb-4">
													{#each getModulesForLocation(location.id) as module}
														<div class="p-2 bg-gray-50 rounded flex items-center justify-between">
															<span class="text-sm">{module.title || module.type}</span>
															<button
																type="button"
																on:click={() => unassignModule(location.id, module.id)}
																class="text-red-600 hover:text-red-800 text-xs"
															>
																Remove
															</button>
														</div>
													{/each}
													{#if getModulesForLocation(location.id).length === 0}
														<p class="text-sm text-gray-500 italic">No modules assigned</p>
													{/if}
												</div>
												{#if getUnassignedModules().length > 0}
													<select
														class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
														on:change={(e) => {
															const moduleId = e.currentTarget.value;
															if (moduleId) {
																assignModule(location.id, moduleId);
																e.currentTarget.value = '';
															}
														}}
													>
														<option value="">Assign a module...</option>
														{#each getUnassignedModules() as module}
															<option value={module.id}>{module.title || module.type}</option>
														{/each}
													</select>
												{/if}
											</div>
										{/each}
									</div>
								{/if}

								<!-- Pages Tab -->
								{#if activeTab === 'pages'}
									<div class="space-y-6">
										<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
											<h4 class="font-medium text-blue-900 mb-2">Assign Modules to Pages</h4>
											<p class="text-sm text-blue-800">
												Select pages and assign module instances to them. For each module, specify the instance name, module-specific parameters, location, and order within that location.
											</p>
										</div>

										<!-- Add Pages Section -->
										<div class="bg-gray-50 p-4 rounded-lg mb-6">
											<h4 class="font-medium text-gray-900 mb-3">Add Pages to Template</h4>
											
											<!-- System Pages -->
											<div class="mb-4">
												<div class="text-sm font-medium text-gray-700 mb-2">System Pages:</div>
												<div class="flex flex-wrap gap-2">
													{#each SYSTEM_PAGE_TYPES as pageType}
														{@const isAdded = selectedTemplate.pages?.some(p => p.pageType === pageType.value && !p.pageId)}
														<button
															type="button"
															on:click={() => addPageToTemplate(pageType.value as 'home' | 'albums' | 'album' | 'search')}
															disabled={isAdded || saving}
															class="px-3 py-1 text-sm rounded-md {isAdded 
																? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
																: 'bg-blue-600 text-white hover:bg-blue-700'} disabled:opacity-50"
														>
															{isAdded ? '✓ ' : '+ '}{pageType.label}
														</button>
													{/each}
												</div>
											</div>

											<!-- Custom Pages from Menu -->
											{#if availablePages.length > 0}
												<div>
													<div class="text-sm font-medium text-gray-700 mb-2">Custom Pages:</div>
													<div class="flex flex-wrap gap-2">
														{#each availablePages as page}
															{@const pageTitle = typeof page.title === 'string' ? page.title : (page.title?.en || page.title?.he || page.alias)}
															{@const isAdded = selectedTemplate.pages?.some(p => p.pageType === 'page' && p.pageId === page._id)}
															<button
																type="button"
																on:click={() => addPageToTemplate('page', page._id)}
																disabled={isAdded || saving}
																class="px-3 py-1 text-sm rounded-md {isAdded 
																	? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
																	: 'bg-green-600 text-white hover:bg-green-700'} disabled:opacity-50"
															>
																{isAdded ? '✓ ' : '+ '}{pageTitle}
															</button>
														{/each}
													</div>
												</div>
											{:else if pagesLoading}
												<div class="text-sm text-gray-500">Loading pages...</div>
											{:else}
												<div class="text-sm text-gray-500">No custom pages available. Create pages in the Pages section.</div>
											{/if}
										</div>

										<!-- Pages with Module Assignments -->
										{#if selectedTemplate.pages && selectedTemplate.pages.length > 0}
											<div class="space-y-4">
												<h4 class="font-medium text-gray-900">Configure Modules for Each Page</h4>
												{#each selectedTemplate.pages as page}
													<div class="border border-gray-200 rounded-lg p-4">
														<div class="flex items-center justify-between mb-4">
															<div>
																<h4 class="font-semibold text-gray-900">{page.pageName}</h4>
																<div class="text-sm text-gray-600">
																	Type: {page.pageType === 'page' ? 'Custom Page' : SYSTEM_PAGE_TYPES.find(pt => pt.value === page.pageType)?.label || page.pageType}
																	{#if page.pageId && page.pageType === 'page'}
																		<span class="ml-2">(ID: {page.pageId})</span>
																	{/if}
																</div>
															</div>
															<div class="flex gap-2">
																<button
																	type="button"
																	on:click={() => {
																		selectedPage = selectedPage?.id === page.id ? null : page;
																	}}
																	class="px-3 py-1 text-sm {selectedPage?.id === page.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} rounded-md hover:bg-gray-300"
																>
																	{selectedPage?.id === page.id ? 'Hide' : 'Edit'} Modules
																</button>
																<button
																	type="button"
																	on:click={() => {
																		pageToDelete = page.id;
																		showDeletePageDialog = true;
																	}}
																	class="px-3 py-1 text-sm text-red-600 hover:text-red-800"
																>
																	Remove
																</button>
															</div>
														</div>

														{#if selectedPage?.id === page.id}
															<div class="mt-4 space-y-4 border-t pt-4">
																{#if selectedTemplate.locations.length === 0}
																	<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
																		<p class="text-sm text-yellow-800">
																			⚠️ No locations defined. Define locations in the Grid Builder tab first.
																		</p>
																	</div>
																{:else}
																	<!-- Group modules by location -->
																	{#each selectedTemplate.locations.sort((a, b) => a.order - b.order) as location}
																		{@const locationModules = getModulesForPageLocation(page.id, location.id).sort((a, b) => {
																			const aOrder = page.moduleAssignments?.find(ma => ma.locationId === location.id && ma.moduleId === a.id)?.order || 0;
																			const bOrder = page.moduleAssignments?.find(ma => ma.locationId === location.id && ma.moduleId === b.id)?.order || 0;
																			return aOrder - bOrder;
																		})}
																		<div class="border border-gray-200 rounded-lg p-4">
																			<h5 class="font-medium text-gray-900 mb-3">{location.name}</h5>
																			<div class="space-y-2 mb-3">
																				{#each locationModules as module}
																					{@const assignment = page.moduleAssignments?.find(ma => ma.locationId === location.id && ma.moduleId === module.id)}
																					<div class="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
																						<div class="flex-1">
																							<div class="font-medium text-sm text-gray-900">{module.title || module.type}</div>
																							<div class="text-xs text-gray-500">
																								Order: {assignment?.order || 0} | Type: {MODULE_TYPES.find(m => m.value === module.type)?.label || module.type}
																							</div>
																						</div>
																						<button
																							type="button"
																							on:click={() => unassignModuleFromPage(page.id, location.id, module.id)}
																							class="px-2 py-1 text-xs text-red-600 hover:text-red-800 bg-white rounded"
																						>
																							Remove
																						</button>
																					</div>
																				{/each}
																				{#if locationModules.length === 0}
																					<p class="text-sm text-gray-500 italic text-center py-2">No modules assigned to this location</p>
																				{/if}
																			</div>
																			<button
																				type="button"
																				on:click={() => {
																					editingModuleAssignment = { pageId: page.id };
																					newModuleInstanceName = '';
																					newModuleType = 'menu';
																					newModuleLocationId = location.id;
																					newModuleOrder = (locationModules.length + 1);
																					newModuleProps = {};
																					showAddModuleToPageDialog = true;
																				}}
																				class="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
																			>
																				+ Add Module to {location.name}
																			</button>
																		</div>
																	{/each}
																{/if}
															</div>
														{/if}
													</div>
												{/each}
											</div>
										{:else}
											<div class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
												<p class="text-gray-700 mb-2">No pages added to this template yet.</p>
												<p class="text-sm text-gray-600">Add system pages or custom pages from the menu above to start assigning modules.</p>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{:else}
							<div class="text-center py-12 text-gray-500">
								<p>Select a template to edit, or create a new one</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create Template Dialog -->
{#if showCreateTemplateDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Create New Template</h3>
			<div class="mb-4">
				<label class="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
				<input
					type="text"
					bind:value={newTemplateName}
					placeholder="e.g., My Custom Template"
					class="w-full px-3 py-2 border border-gray-300 rounded-md"
				/>
			</div>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					on:click={() => {
						showCreateTemplateDialog = false;
						newTemplateName = '';
					}}
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={createTemplate}
					disabled={saving || !newTemplateName.trim()}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					{saving ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add Location Dialog -->
{#if showAddLocationDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Add Location</h3>
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
					<input
						type="text"
						bind:value={newLocationNameOld}
						placeholder="e.g., header, footer, sidebar"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
					<input
						type="text"
						bind:value={newLocationDescriptionOld}
						placeholder="Brief description"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
					<input
						type="number"
						bind:value={newLocationOrder}
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
				</div>
			</div>
			<div class="flex justify-end gap-2 mt-6">
				<button
					type="button"
					on:click={() => {
						showAddLocationDialog = false;
						newLocationNameOld = '';
						newLocationDescriptionOld = '';
						newLocationOrder = 0;
					}}
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={addLocation}
					disabled={saving || !newLocationNameOld.trim()}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					{saving ? 'Adding...' : 'Add'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Grid Builder Location Name Dialog -->
{#if showLocationNameDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">
				{editingLocationId ? 'Update Location' : 'Create Location'}
			</h3>
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
					<input
						type="text"
						bind:value={newLocationName}
						placeholder="e.g., header, footer, sidebar"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
						autofocus
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
					<input
						type="text"
						bind:value={newLocationDescription}
						placeholder="Brief description"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
				</div>
				{#if selectedCells.length > 0}
					{@const minRow = Math.min(...selectedCells.map(c => c.row))}
					{@const maxRow = Math.max(...selectedCells.map(c => c.row))}
					{@const minCol = Math.min(...selectedCells.map(c => c.col))}
					{@const maxCol = Math.max(...selectedCells.map(c => c.col))}
					<div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
						<div class="font-medium mb-1">Grid Coordinates:</div>
						<div class="font-mono text-blue-700">{minRow}:{minCol}:{maxRow}:{maxCol}</div>
						<div class="text-xs text-gray-500 mt-1">
							({selectedCells.length} cell{selectedCells.length !== 1 ? 's' : ''})
						</div>
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-2 mt-6">
				<button
					type="button"
					on:click={() => {
						showLocationNameDialog = false;
						newLocationName = '';
						newLocationDescription = '';
						selectedCells = [];
						editingLocationId = null;
					}}
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={saveLocationFromGrid}
					disabled={saving || !newLocationName.trim()}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					{saving ? 'Saving...' : (editingLocationId ? 'Update' : 'Create')}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add Module to Page Dialog -->
{#if showAddModuleToPageDialog && editingModuleAssignment}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Add Module Instance to Page</h3>
			<div class="space-y-4">
				<!-- Instance Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Instance Name *</label>
					<input
						type="text"
						bind:value={newModuleInstanceName}
						placeholder="e.g., Header Menu, Footer Menu, Main Logo"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
						autofocus
					/>
					<p class="text-xs text-gray-500 mt-1">Give this module instance a descriptive name</p>
				</div>

				<!-- Module Type -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Module Type *</label>
					<select
						bind:value={newModuleType}
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					>
						{#each MODULE_TYPES as type}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
				</div>

				<!-- Module-Specific Parameters -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Module Parameters</label>
					<div class="bg-gray-50 border border-gray-200 rounded-md p-3">
						<p class="text-sm text-gray-600 mb-2">Module-specific parameters will be configured here based on the selected module type.</p>
						<p class="text-xs text-gray-500">(This will be expanded with dynamic forms for each module type)</p>
						<!-- TODO: Add dynamic form fields based on newModuleType -->
					</div>
				</div>

				<!-- Location Selection -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Location *</label>
					<select
						bind:value={newModuleLocationId}
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					>
						<option value="">Select a location...</option>
						{#each selectedTemplate.locations.sort((a, b) => a.order - b.order) as location}
							<option value={location.id}>{location.name}</option>
						{/each}
					</select>
				</div>

				<!-- Order in Location -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Order in Location *</label>
					<input
						type="number"
						bind:value={newModuleOrder}
						min="1"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
					<p class="text-xs text-gray-500 mt-1">Order determines the sequence of modules within this location (e.g., 1 = first, 2 = second)</p>
				</div>
			</div>
			<div class="flex justify-end gap-2 mt-6">
				<button
					type="button"
					on:click={() => {
						showAddModuleToPageDialog = false;
						editingModuleAssignment = null;
						newModuleInstanceName = '';
						newModuleType = 'menu';
						newModuleLocationId = '';
						newModuleOrder = 1;
						newModuleProps = {};
					}}
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={saveModuleToPage}
					disabled={saving || !newModuleInstanceName.trim() || !newModuleLocationId || !newModuleType}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Add Module'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add Module Instance Dialog -->
{#if showAddModuleDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
			<h3 class="text-lg font-semibold text-gray-900 mb-2">Create Module Instance</h3>
			<p class="text-sm text-gray-600 mb-4">Create a new instance of a module type. You can create multiple instances of the same type (e.g., header menu, footer menu).</p>
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Module Type</label>
					<select
						bind:value={newModuleType}
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					>
						{#each MODULE_TYPES as type}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
					<p class="text-xs text-gray-500 mt-1">Select the type of module to create an instance of</p>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Instance Name</label>
					<input
						type="text"
						bind:value={newModuleTitle}
						placeholder="e.g., Header Menu, Footer Menu, Main Logo"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
						autofocus
					/>
					<p class="text-xs text-gray-500 mt-1">Give this instance a descriptive name to identify it (optional - will use module type if left empty)</p>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
					<input
						type="number"
						bind:value={newModuleOrder}
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
				</div>
				<div>
					<label class="flex items-center space-x-2">
						<input
							type="checkbox"
							bind:checked={newModulePublished}
							class="h-4 w-4 text-blue-600"
						/>
						<span class="text-sm text-gray-700">Published</span>
					</label>
				</div>
			</div>
			<div class="flex justify-end gap-2 mt-6">
				<button
					type="button"
					on:click={() => {
						showAddModuleDialog = false;
						newModuleType = 'menu';
						newModuleTitle = '';
						newModuleOrder = 0;
						newModulePublished = true;
					}}
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={addModule}
					disabled={saving || !newModuleType}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					{saving ? 'Adding...' : 'Add'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Template Confirmation Dialog -->
<ConfirmDialog
	isOpen={showDeleteTemplateDialog}
	title="Delete Template"
	message="Are you sure you want to delete this template? This action cannot be undone."
	confirmText={deleting ? 'Deleting...' : 'Delete'}
	cancelText="Cancel"
	variant="danger"
	disabled={deleting}
	on:confirm={confirmDeleteTemplate}
	on:cancel={closeDeleteTemplateDialog}
/>

<!-- Delete Location Confirmation Dialog -->
<ConfirmDialog
	isOpen={showDeleteLocationDialog}
	title="Delete Location"
	message="Are you sure you want to delete this location? All module assignments will be removed."
	confirmText={deleting ? 'Deleting...' : 'Delete'}
	cancelText="Cancel"
	variant="danger"
	disabled={deleting}
	on:confirm={confirmDeleteLocation}
	on:cancel={closeDeleteLocationDialog}
/>

<!-- Delete Module Confirmation Dialog -->
<ConfirmDialog
	isOpen={showDeleteModuleDialog}
	title="Delete Module"
	message="Are you sure you want to delete this module? All assignments will be removed."
	confirmText={deleting ? 'Deleting...' : 'Delete'}
	cancelText="Cancel"
	variant="danger"
	disabled={deleting}
	on:confirm={confirmDeleteModule}
	on:cancel={closeDeleteModuleDialog}
/>


<!-- Delete Page Confirmation Dialog -->
<ConfirmDialog
	isOpen={showDeletePageDialog}
	title="Delete Page"
	message="Are you sure you want to delete this page? All module assignments for this page will be removed."
	confirmText={deleting ? 'Deleting...' : 'Delete'}
	cancelText="Cancel"
	variant="danger"
	disabled={deleting}
	on:confirm={() => {
		if (pageToDelete) {
			deletePage(pageToDelete);
			showDeletePageDialog = false;
			pageToDelete = null;
		}
	}}
	on:cancel={() => {
		showDeletePageDialog = false;
		pageToDelete = null;
	}}
/>

<!-- Add Module to Page Dialog -->
{#if showAddModuleToPageDialog && editingModuleAssignment && selectedTemplate}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Add Module Instance to Page</h3>
			<div class="space-y-4">
				<!-- Instance Name -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Instance Name *</label>
					<input
						type="text"
						bind:value={newModuleInstanceName}
						placeholder="e.g., Header Menu, Footer Menu, Main Logo"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
						autofocus
					/>
					<p class="text-xs text-gray-500 mt-1">Give this module instance a descriptive name</p>
				</div>

				<!-- Module Type -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Module Type *</label>
					<select
						bind:value={newModuleType}
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					>
						{#each MODULE_TYPES as type}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
				</div>

				<!-- Module-Specific Parameters -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Module Parameters</label>
					<div class="bg-gray-50 border border-gray-200 rounded-md p-3">
						<p class="text-sm text-gray-600 mb-2">Module-specific parameters will be configured here based on the selected module type.</p>
						<p class="text-xs text-gray-500">(This will be expanded with dynamic forms for each module type)</p>
						<!-- TODO: Add dynamic form fields based on newModuleType -->
					</div>
				</div>

				<!-- Location Selection -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Location *</label>
					<select
						bind:value={newModuleLocationId}
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					>
						<option value="">Select a location...</option>
						{#each selectedTemplate.locations.sort((a, b) => a.order - b.order) as location}
							<option value={location.id}>{location.name}</option>
						{/each}
					</select>
				</div>

				<!-- Order in Location -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Order in Location *</label>
					<input
						type="number"
						bind:value={newModuleOrder}
						min="1"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
					<p class="text-xs text-gray-500 mt-1">Order determines the sequence of modules within this location (e.g., 1 = first, 2 = second)</p>
				</div>
			</div>
			<div class="flex justify-end gap-2 mt-6">
				<button
					type="button"
					on:click={() => {
						showAddModuleToPageDialog = false;
						editingModuleAssignment = null;
						newModuleInstanceName = '';
						newModuleType = 'menu';
						newModuleLocationId = '';
						newModuleOrder = 1;
						newModuleProps = {};
					}}
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={saveModuleToPage}
					disabled={saving || !newModuleInstanceName.trim() || !newModuleLocationId || !newModuleType}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Add Module'}
				</button>
			</div>
		</div>
	</div>
{/if}
