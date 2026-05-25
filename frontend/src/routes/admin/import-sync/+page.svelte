<script lang="ts">
	import { onDestroy } from 'svelte';
	import { t } from '$stores/i18n';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimarySm, adminRingPrimary } from '$lib/admin/admin-cerberus';
	import StorageRestoreAlbumsPreviewDialog from '$lib/components/admin/StorageRestoreAlbumsPreviewDialog.svelte';
	// PageData is loaded via +page.server.ts; this component does not
	// currently consume it directly, so we omit the prop to avoid unused-export warnings.

	type Tab = 'export' | 'import' | 'storage';
	type MigrationOption =
		| 'albums-photos-db'
		| 'storage-backup'
		| 'storage-migration'
		| 'full-db'
		| 'templates-pages';
	let migrationOption: MigrationOption = 'templates-pages';
	let activeTab: Tab = 'export';

	// Export
	let exportBundle = true;
	let exportScope: 'full' | 'templates-pages' = 'full';
	let exportIncludeConfig = true;
	let exportPreview: {
		albumCount: number;
		photoCount: number;
		estimatedSizeBytes: number;
		albumTree: any[];
		pageCount?: number;
		includesConfig?: boolean;
	} | null = null;
	let exportLoading = false;
	let exportJobId: string | null = null;
	let exportStatus: { status: string; progress: number; total: number; current?: string; error?: string } | null = null;
	let exportPollInterval: ReturnType<typeof setInterval> | null = null;
		let exportBundlePath: string | null = null;
		let exportSkippedCount: number | null = null;
		let exportBundleError: string | null = null;

	// Import
	let importPath = '';
	let importPathInput: HTMLInputElement | null = null;
	let importZipInput: HTMLInputElement | null = null;
	let importUploadLoading = false;
	let importMode: 'package' | 'raw' = 'package';
	let importIncludeConfig = true;
	let importConfigMode: 'merge' | 'replace' = 'merge';
	let importPreview: {
		albumCount: number;
		photoCount: number;
		albumTree?: any[];
		folderTree?: any[];
		pageCount?: number;
		hasTemplateConfig?: boolean;
	} | null = null;
	let importLoading = false;
	let importJobId: string | null = null;
	let importStatus: { status: string; progress: number; total: number; current?: string; error?: string } | null = null;
	let importPollInterval: ReturnType<typeof setInterval> | null = null;

	// Storage migration
	let storageProviders: string[] = [];
	let sourceProviderId = '';
	let targetProviderId = '';
	let storageAlbums: Array<{ _id: string; name: any; alias: string; photoCount: number; level: number; parentAlbumId?: string }> = [];
	let filteredStorageAlbums: typeof storageAlbums = [];
	let selectedStorageAlbumIds = new Set<string>();
	let storageSelectAll = false;
	let isFilteringAlbums = false;
	let storagePreview: { photoCount: number; estimatedSizeBytes: number } | null = null;
	let storageLoading = false;
	let storageJobId: string | null = null;
	let storageStatus: { status: string; progress: number; total: number; current?: string; error?: string } | null = null;
	let storagePollInterval: ReturnType<typeof setInterval> | null = null;

	let fullDbLoading = false;

	// Storage restore (index existing remote repository)
	type RestoreStage = 'albums' | 'photos';
	let restoreStage: RestoreStage = 'albums';
	let restoreProviders: string[] = [];
	let restoreProviderId = '';
	let restoreRootPrefix = '';
	let restoreLoading = false;
	let restoreAlbumReport: {
		summary: { total: number; existing: number; toCreate: number };
		items: Array<{
			id: string;
			storagePath: string;
			folderName: string;
			status: string;
			proposedAlias?: string;
		}>;
	} | null = null;
	let restorePhotoReport: {
		summary: { total: number; existing: number; toCreate: number; orphan: number };
		items: Array<{
			id: string;
			filename: string;
			albumName?: string;
			status: string;
			storagePath: string;
		}>;
	} | null = null;
	let restoreSelectedIds = new Set<string>();
	let restoreExecuteResult: { created: number; skipped: number; errors: Array<{ id: string; message: string }> } | null =
		null;
	let restoreAlbumsPreviewOpen = false;

	async function selectImportDirectory() {
		// Always use file input with webkitdirectory as it's more reliable
		// The File System Access API requires HTTPS and user permission
		if (importPathInput) {
			importPathInput.click();
		} else {
			// Try File System Access API as fallback
			try {
				if ('showDirectoryPicker' in window) {
					const dirHandle = await (window as any).showDirectoryPicker();
					const dirName = dirHandle.name;
					importPath = `./migration-data/${dirName}`;
					importPath = importPath; // Force reactivity
					showMsg(`Selected directory: ${dirName}. Adjust path if needed.`, 'info');
				} else {
					showMsg('Directory picker not available. Please enter path manually.', 'error');
				}
			} catch (e: any) {
				if (e.name !== 'AbortError') {
					console.error('Directory selection error:', e);
					showMsg('Directory selection cancelled or not supported', 'error');
				}
			}
		}
	}

	function handleImportDirectorySelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (files && files.length > 0) {
			// Get the directory name from the first file's path
			const firstFile = files[0];
			if (firstFile.webkitRelativePath) {
				const pathParts = firstFile.webkitRelativePath.split('/');
				if (pathParts.length > 0) {
					const dirName = pathParts[0];
					// Update the path - use the directory name directly or construct a path
					importPath = `./migration-data/${dirName}`;
					// Force reactivity by reassigning
					importPath = importPath;
					showMsg(`Selected directory: ${dirName}. Adjust path if needed.`, 'info');
					console.log('Import path set to:', importPath);
				}
			} else {
				// Fallback: try to get directory name from file path
				const fileName = firstFile.name;
				importPath = `./migration-data/${fileName}`;
				importPath = importPath;
				showMsg(`Selected file: ${fileName}. Please adjust path to directory.`, 'info');
			}
		} else {
			showMsg('No files selected', 'error');
		}
		// Reset input so same directory can be selected again
		setTimeout(() => {
			input.value = '';
		}, 100);
	}

	async function uploadImportZip(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (!file.name.toLowerCase().endsWith('.zip')) {
			showMsg('Please choose a .zip file', 'error');
			input.value = '';
			return;
		}
		importUploadLoading = true;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/admin/import/upload-package', {
				method: 'POST',
				body: formData,
			});
			if (!res.ok) await handleApiErrorResponse(res);
			const data = await res.json();
			const sourcePath = data?.sourcePath ?? data?.data?.sourcePath ?? '';
			const fileName = data?.fileName ?? data?.data?.fileName ?? file.name;
			importPath = sourcePath;
			showMsg(`ZIP uploaded: ${fileName}`);
		} catch (e) {
			showMsg(handleError(e, 'ZIP upload failed'), 'error');
		} finally {
			importUploadLoading = false;
			input.value = '';
		}
	}

	onDestroy(() => {
		if (exportPollInterval) clearInterval(exportPollInterval);
		if (importPollInterval) clearInterval(importPollInterval);
		if (storagePollInterval) clearInterval(storagePollInterval);
	});

	async function loadStorageProviders() {
		try {
			const res = await fetch('/api/admin/storage-migration/providers');
			if (!res.ok) await handleApiErrorResponse(res);
			const list = await res.json();
			storageProviders = Array.isArray(list) ? list : [];
			if (storageProviders.length && !targetProviderId) targetProviderId = storageProviders[0];
		} catch (e) {
			storageProviders = [];
		}
	}

	async function loadStorageAlbums() {
		try {
			const res = await fetch('/api/admin/albums');
			if (!res.ok) return;
			const result = await res.json();
			const albums = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
			storageAlbums = albums
				.map((a: any) => ({
					_id: a._id,
					name: a.name,
					alias: a.alias,
					photoCount: a.photoCount || 0,
					level: a.level || 0,
					parentAlbumId: a.parentAlbumId,
					order: a.order || 0,
					storageProvider: a.storageProvider,
				}))
				.sort((a: any, b: any) => (a.level || 0) - (b.level || 0) || (a.order || 0) - (b.order || 0));
			// Filter will be triggered by reactive statement if sourceProviderId is set
			if (sourceProviderId) {
				filterStorageAlbumsBySource();
			}
		} catch (e) {
			storageAlbums = [];
			filteredStorageAlbums = [];
		}
	}

	async function filterStorageAlbumsBySource() {
		// Prevent concurrent calls
		if (isFilteringAlbums) {
			return;
		}
		if (!sourceProviderId) {
			filteredStorageAlbums = [];
			selectedStorageAlbumIds = new Set();
			storageSelectAll = false;
			return;
		}
		isFilteringAlbums = true;
		try {
			const res = await fetch('/api/admin/storage-migration/albums-by-provider', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ providerId: sourceProviderId })
			});
			if (!res.ok) {
				filteredStorageAlbums = [];
				return;
			}
			const albumIds = await res.json();
			const albumIdSet = new Set(Array.isArray(albumIds) ? albumIds : []);
			filteredStorageAlbums = storageAlbums.filter((a) => albumIdSet.has(a._id));
			selectedStorageAlbumIds = new Set();
			storageSelectAll = false;
		} catch (e) {
			filteredStorageAlbums = [];
		} finally {
			isFilteringAlbums = false;
		}
	}

	// Reactive statement to filter albums when source provider or albums list changes
	// Track last values to prevent unnecessary calls
	let lastSourceProviderId = '';
	let lastStorageAlbumsLength = 0;
	$: {
		const providerChanged = sourceProviderId !== lastSourceProviderId;
		const albumsChanged = storageAlbums.length !== lastStorageAlbumsLength;
		
		if (providerChanged) {
			lastSourceProviderId = sourceProviderId;
		}
		if (albumsChanged) {
			lastStorageAlbumsLength = storageAlbums.length;
		}
		
		if (providerChanged || (albumsChanged && sourceProviderId)) {
			if (sourceProviderId && storageAlbums.length > 0) {
				filterStorageAlbumsBySource();
			} else if (!sourceProviderId) {
				filteredStorageAlbums = [];
				selectedStorageAlbumIds = new Set();
				storageSelectAll = false;
			}
		}
	}

	function getAlbumDisplayName(album: any): string {
		if (typeof album.name === 'object') {
			return album.name?.en || album.name?.he || album.alias;
		}
		return album.name || album.alias;
	}

	function toggleStorageAlbum(albumId: string, event?: Event) {
		if (event) {
			event.stopPropagation();
		}
		const newSet = new Set(selectedStorageAlbumIds);
		if (newSet.has(albumId)) {
			newSet.delete(albumId);
		} else {
			newSet.add(albumId);
		}
		selectedStorageAlbumIds = newSet;
		updateStorageSelectAllState();
	}

	function toggleStorageSelectAll(event?: Event) {
		if (event) {
			event.stopPropagation();
		}
		storageSelectAll = !storageSelectAll;
		if (storageSelectAll) {
			selectedStorageAlbumIds = new Set(filteredStorageAlbums.map((a) => a._id));
		} else {
			selectedStorageAlbumIds = new Set();
		}
	}

	function updateStorageSelectAllState() {
		storageSelectAll = filteredStorageAlbums.length > 0 && selectedStorageAlbumIds.size === filteredStorageAlbums.length;
	}

	loadStorageProviders();
	loadStorageAlbums();

	$: {
		if (migrationOption === 'templates-pages') {
			activeTab = activeTab === 'storage' ? 'export' : activeTab;
			exportScope = 'templates-pages';
			exportIncludeConfig = true;
		} else if (migrationOption === 'storage-backup') {
			activeTab = 'export';
			exportScope = 'full';
			exportIncludeConfig = false;
		} else if (migrationOption === 'storage-migration') {
			activeTab = 'storage';
		} else if (migrationOption === 'albums-photos-db') {
			activeTab = 'export';
		} else if (migrationOption === 'full-db') {
			activeTab = 'export';
		}
	}

	$: if (activeTab === 'storage' && storageAlbums.length === 0) {
		loadStorageAlbums();
	}

	function showMsg(msg: string, type: 'success' | 'error' | 'info' = 'success') {
		if (type === 'error') adminToast.error({ title: msg });
		else if (type === 'info') adminToast.info({ title: msg });
		else adminToast.success({ title: msg });
	}

	// --- Export ---
	async function exportDoPreview() {
		exportLoading = true;
		exportPreview = null;
		try {
			const res = await fetch('/api/admin/export/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bundle: exportBundle,
					includeConfig: exportScope === 'templates-pages' ? true : exportIncludeConfig,
					exportScope
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || res.statusText);
			}
			exportPreview = await res.json();
			showMsg('Preview loaded');
		} catch (e) {
			showMsg(handleError(e, 'Export preview failed'), 'error');
		} finally {
			exportLoading = false;
		}
	}

	async function exportStart() {
		exportLoading = true;
		exportJobId = null;
		exportStatus = null;
		try {
			const res = await fetch('/api/admin/export/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bundle: exportBundle,
					includeConfig: exportScope === 'templates-pages' ? true : exportIncludeConfig,
					exportScope
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || res.statusText);
			}
			const data = await res.json();
			exportJobId = data.jobId;
			exportStatus = { status: 'pending', progress: 0, total: 0 };
			exportPollInterval = setInterval(pollExportStatus, 1500);
			showMsg('Export started');
		} catch (e) {
			showMsg(handleError(e, 'Start export failed'), 'error');
		} finally {
			exportLoading = false;
		}
	}

	async function pollExportStatus() {
		if (!exportJobId) return;
		const res = await fetch(`/api/admin/export/status/${exportJobId}`);
		const state = await res.json().catch(() => ({}));
		exportStatus = {
			status: state.status ?? 'unknown',
			progress: state.progress ?? 0,
			total: state.total ?? 0,
			current: state.current,
			error: state.error
		};
		// Capture result bundle path for download action.
		exportBundlePath = state.result?.bundlePath ?? null;
		exportSkippedCount = typeof state.result?.skippedCount === 'number' ? state.result.skippedCount : null;
		exportBundleError = state.result?.bundleError ?? null;
		if (state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled') {
			if (exportPollInterval) {
				clearInterval(exportPollInterval);
				exportPollInterval = null;
			}
			if (state.status === 'completed') showMsg('Export completed');
			else if (state.status === 'failed') showMsg(state.error || 'Export failed', 'error');
		}
	}

	async function exportCancel() {
		if (!exportJobId) return;
		await fetch(`/api/admin/export/cancel/${exportJobId}`, { method: 'POST' });
		if (exportPollInterval) {
			clearInterval(exportPollInterval);
			exportPollInterval = null;
		}
		exportStatus = { ...exportStatus!, status: 'cancelled' };
		showMsg('Export cancelled');
	}

	function downloadExportBundle() {
		if (!exportJobId) return;
		window.location.href = `/api/admin/export/download/${exportJobId}`;
	}

	async function downloadFullDbBackup() {
		fullDbLoading = true;
		try {
			const res = await fetch('/api/admin/backup/database', { method: 'POST' });
			if (!res.ok) await handleApiErrorResponse(res);
			const payload = await res.json();
			if (!payload?.backup) throw new Error('Backup payload missing');
			const blob = new Blob([JSON.stringify(payload.backup, null, 2)], { type: 'application/json' });
			const stamp = new Date().toISOString().replace(/[:.]/g, '-');
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = `openshutter-full-db-backup-${stamp}.json`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(a.href);
			showMsg('Full DB backup downloaded');
		} catch (e) {
			showMsg(handleError(e, 'Full DB backup failed'), 'error');
		} finally {
			fullDbLoading = false;
		}
	}

	// --- Import ---
	async function importDoPreview() {
		if (!importPath.trim()) {
			showMsg('Enter a source path', 'error');
			return;
		}
		importLoading = true;
		importPreview = null;
		try {
			const res = await fetch('/api/admin/import/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sourcePath: importPath.trim(),
					mode: importMode,
					includeConfig: importMode === 'package' ? importIncludeConfig : false
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || res.statusText);
			}
			importPreview = await res.json();
			showMsg('Preview loaded');
		} catch (e) {
			showMsg(handleError(e, 'Import preview failed'), 'error');
		} finally {
			importLoading = false;
		}
	}

	async function importStart() {
		if (!importPath.trim()) {
			showMsg('Enter a source path', 'error');
			return;
		}
		importLoading = true;
		importJobId = null;
		importStatus = null;
		try {
			const res = await fetch('/api/admin/import/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sourcePath: importPath.trim(),
					mode: importMode,
					includeConfig: importMode === 'package' ? importIncludeConfig : false,
					configMode: importMode === 'package' ? importConfigMode : 'merge'
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || res.statusText);
			}
			const data = await res.json();
			importJobId = data.jobId;
			importStatus = { status: 'pending', progress: 0, total: 0 };
			importPollInterval = setInterval(pollImportStatus, 1500);
			showMsg('Import started');
		} catch (e) {
			showMsg(handleError(e, 'Start import failed'), 'error');
		} finally {
			importLoading = false;
		}
	}

	async function pollImportStatus() {
		if (!importJobId) return;
		const res = await fetch(`/api/admin/import/status/${importJobId}`);
		const state = await res.json().catch(() => ({}));
		importStatus = {
			status: state.status ?? 'unknown',
			progress: state.progress ?? 0,
			total: state.total ?? 0,
			current: state.current,
			error: state.error
		};
		if (state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled') {
			if (importPollInterval) {
				clearInterval(importPollInterval);
				importPollInterval = null;
			}
			if (state.status === 'completed') showMsg('Import completed');
			else if (state.status === 'failed') showMsg(state.error || 'Import failed', 'error');
		}
	}

	async function importCancel() {
		if (!importJobId) return;
		await fetch(`/api/admin/import/cancel/${importJobId}`, { method: 'POST' });
		if (importPollInterval) {
			clearInterval(importPollInterval);
			importPollInterval = null;
		}
		importStatus = { ...importStatus!, status: 'cancelled' };
		showMsg('Import cancelled');
	}

	// --- Storage migration ---
	async function storageDoPreview() {
		if (!targetProviderId) {
			showMsg('Select a target storage provider', 'error');
			return;
		}
		if (!sourceProviderId) {
			showMsg('Select a source storage provider', 'error');
			return;
		}
		storageLoading = true;
		storagePreview = null;
		try {
			const albumIds = selectedStorageAlbumIds.size > 0 ? Array.from(selectedStorageAlbumIds) : undefined;
			const res = await fetch('/api/admin/storage-migration/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sourceProviderId, targetProviderId, albumIds })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || res.statusText);
			}
			storagePreview = await res.json();
			showMsg('Preview loaded');
		} catch (e) {
			showMsg(handleError(e, 'Storage migration preview failed'), 'error');
		} finally {
			storageLoading = false;
		}
	}

	async function storageStart() {
		if (!targetProviderId) {
			showMsg('Select a target storage provider', 'error');
			return;
		}
		if (!sourceProviderId) {
			showMsg('Select a source storage provider', 'error');
			return;
		}
		storageLoading = true;
		storageJobId = null;
		storageStatus = null;
		try {
			const albumIds = selectedStorageAlbumIds.size > 0 ? Array.from(selectedStorageAlbumIds) : undefined;
			const res = await fetch('/api/admin/storage-migration/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sourceProviderId, targetProviderId, albumIds })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || res.statusText);
			}
			const data = await res.json();
			storageJobId = data.jobId;
			storageStatus = { status: 'pending', progress: 0, total: 0 };
			storagePollInterval = setInterval(pollStorageStatus, 1500);
			showMsg('Storage migration started');
		} catch (e) {
			showMsg(handleError(e, 'Start storage migration failed'), 'error');
		} finally {
			storageLoading = false;
		}
	}

	async function pollStorageStatus() {
		if (!storageJobId) return;
		const res = await fetch(`/api/admin/storage-migration/status/${storageJobId}`);
		const state = await res.json().catch(() => ({}));
		storageStatus = {
			status: state.status ?? 'unknown',
			progress: state.progress ?? 0,
			total: state.total ?? 0,
			current: state.current,
			error: state.error
		};
		if (state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled') {
			if (storagePollInterval) {
				clearInterval(storagePollInterval);
				storagePollInterval = null;
			}
			if (state.status === 'completed') showMsg('Storage migration completed');
			else if (state.status === 'failed') showMsg(state.error || 'Storage migration failed', 'error');
		}
	}

	async function storageCancel() {
		if (!storageJobId) return;
		await fetch(`/api/admin/storage-migration/cancel/${storageJobId}`, { method: 'POST' });
		if (storagePollInterval) {
			clearInterval(storagePollInterval);
			storagePollInterval = null;
		}
		storageStatus = { ...storageStatus!, status: 'cancelled' };
		showMsg('Storage migration cancelled');
	}

	function formatBytes(n: number) {
		if (n < 1024) return n + ' B';
		if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
		return (n / (1024 * 1024)).toFixed(1) + ' MB';
	}

	async function loadRestoreProviders() {
		try {
			const res = await fetch('/api/admin/storage-restore/providers');
			if (!res.ok) return;
			const list = await res.json();
			restoreProviders = Array.isArray(list) ? list : [];
			if (restoreProviders.length && !restoreProviderId) {
				restoreProviderId = restoreProviders.includes('wasabi')
					? 'wasabi'
					: restoreProviders[0];
			}
		} catch {
			restoreProviders = [];
		}
	}

	$: if (migrationOption === 'albums-photos-db' && restoreProviders.length === 0) {
		loadRestoreProviders();
	}

	function restoreCurrentReport() {
		return restoreStage === 'albums' ? restoreAlbumReport : restorePhotoReport;
	}

	function restoreSelectableItems() {
		const report = restoreCurrentReport();
		if (!report?.items) return [];
		if (restoreStage === 'albums') {
			return report.items.filter((i: { status: string }) => i.status === 'create');
		}
		return report.items.filter((i: { status: string }) => i.status === 'create');
	}

	function toggleRestoreItem(id: string) {
		const next = new Set(restoreSelectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		restoreSelectedIds = next;
	}

	function selectAllRestoreCreate() {
		restoreSelectedIds = new Set(restoreSelectableItems().map((i: { id: string }) => i.id));
	}

	function clearRestoreSelection() {
		restoreSelectedIds = new Set();
	}

	async function restoreScan(options?: { openAlbumsPreview?: boolean }) {
		restoreLoading = true;
		restoreExecuteResult = null;
		if (options?.openAlbumsPreview !== false) {
			restoreSelectedIds = new Set();
		}
		try {
			const endpoint =
				restoreStage === 'albums'
					? '/api/admin/storage-restore/scan-albums'
					: '/api/admin/storage-restore/scan-photos';
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					providerId: restoreProviderId,
					rootPrefix: restoreRootPrefix.trim() || undefined
				})
			});
			if (!res.ok) await handleApiErrorResponse(res);
			const data = await res.json();
			if (restoreStage === 'albums') {
				restoreAlbumReport = data;
				if (options?.openAlbumsPreview !== false) {
					selectAllRestoreCreate();
					restoreAlbumsPreviewOpen = true;
				} else {
					selectAllRestoreCreate();
				}
			} else {
				restorePhotoReport = data;
				selectAllRestoreCreate();
			}
			showMsg('Scan complete');
		} catch (e) {
			showMsg(handleError(e, 'Scan failed'), 'error');
		} finally {
			restoreLoading = false;
		}
	}

	async function restoreExecute(skipConfirm = false) {
		const toRun = restoreSelectableItems().filter((i: { id: string }) => restoreSelectedIds.has(i.id));
		if (!toRun.length) {
			showMsg('Select at least one item to create', 'error');
			return;
		}
		const label = restoreStage === 'albums' ? 'album' : 'photo';
		if (
			!skipConfirm &&
			!confirm(
				`Create ${toRun.length} ${label}${toRun.length === 1 ? '' : 's'} in the database? Existing records will be skipped.`
			)
		) {
			return;
		}
		restoreLoading = true;
		restoreExecuteResult = null;
		try {
			const endpoint =
				restoreStage === 'albums'
					? '/api/admin/storage-restore/execute-albums'
					: '/api/admin/storage-restore/execute-photos';
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					providerId: restoreProviderId,
					rootPrefix: restoreRootPrefix.trim() || undefined,
					itemIds: [...restoreSelectedIds]
				})
			});
			if (!res.ok) await handleApiErrorResponse(res);
			restoreExecuteResult = await res.json();
			showMsg(`Created ${restoreExecuteResult?.created ?? 0} ${label}(s)`);
			if (restoreStage === 'albums') {
				restoreAlbumsPreviewOpen = false;
				await restoreScan({ openAlbumsPreview: false });
			} else {
				await restoreScan();
			}
		} catch (e) {
			showMsg(handleError(e, 'Restore failed'), 'error');
		} finally {
			restoreLoading = false;
		}
	}

	async function restoreExecuteFromAlbumsModal() {
		await restoreExecute(true);
	}

	function restoreStatusLabel(status: string) {
		if (status === 'exists') return 'Already in DB';
		if (status === 'orphan') return 'No album in DB';
		return 'Will create';
	}
</script>

<svelte:head>
	<title>{$t('admin.migrationToolsPageTitle')} — {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-4xl mx-auto px-4">
		<div class="mb-6 mt-12">
			<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.migrationToolsPageTitle')}</h1>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mb-6">
			<button
				class="text-left px-4 py-3 rounded border {migrationOption === 'albums-photos-db' ? 'bg-(--color-surface-50-950) border-(--color-primary-600) text-(--color-surface-950-50)' : 'bg-(--color-surface-100-900) border-surface-200-800 text-(--color-surface-800-200)'}"
				on:click={() => (migrationOption = 'albums-photos-db')}
			>
				<strong>Albums &amp; Photos (DB only)</strong><br />
				<span class="text-xs opacity-80">{$t('admin.migrationAlbumsPhotosDbSubtitle')}</span>
			</button>
			<button
				class="text-left px-4 py-3 rounded border {migrationOption === 'storage-backup' ? 'bg-(--color-surface-50-950) border-(--color-primary-600) text-(--color-surface-950-50)' : 'bg-(--color-surface-100-900) border-surface-200-800 text-(--color-surface-800-200)'}"
				on:click={() => (migrationOption = 'storage-backup')}
			>
				<strong>Storage Backup</strong><br />
				<span class="text-xs opacity-80">Export photos + albums package</span>
			</button>
			<button
				class="text-left px-4 py-3 rounded border {migrationOption === 'storage-migration' ? 'bg-(--color-surface-50-950) border-(--color-primary-600) text-(--color-surface-950-50)' : 'bg-(--color-surface-100-900) border-surface-200-800 text-(--color-surface-800-200)'}"
				on:click={() => (migrationOption = 'storage-migration')}
			>
				<strong>Storage → Storage Migration</strong><br />
				<span class="text-xs opacity-80">Copy files and update DB references</span>
			</button>
			<button
				class="text-left px-4 py-3 rounded border {migrationOption === 'full-db' ? 'bg-(--color-surface-50-950) border-(--color-primary-600) text-(--color-surface-950-50)' : 'bg-(--color-surface-100-900) border-surface-200-800 text-(--color-surface-800-200)'}"
				on:click={() => (migrationOption = 'full-db')}
			>
				<strong>Full DB Backup</strong><br />
				<span class="text-xs opacity-80">All collections JSON snapshot</span>
			</button>
			<button
				class="text-left px-4 py-3 rounded border {migrationOption === 'templates-pages' ? 'bg-(--color-surface-50-950) border-(--color-primary-600) text-(--color-surface-950-50)' : 'bg-(--color-surface-100-900) border-surface-200-800 text-(--color-surface-800-200)'}"
				on:click={() => (migrationOption = 'templates-pages')}
			>
				<strong>Templates &amp; Pages</strong><br />
				<span class="text-xs opacity-80">Deploy style/layout changes from dev to prod</span>
			</button>
		</div>

		{#if migrationOption === 'full-db'}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 mb-6">
				<p class="text-(--color-surface-600-400) mb-4">
					Download a complete database snapshot (all collections) as JSON for backup or migration.
				</p>
				<button
					type="button"
					class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
					disabled={fullDbLoading}
					on:click={downloadFullDbBackup}
				>
					{fullDbLoading ? 'Preparing backup...' : 'Download full DB backup'}
				</button>
			</div>
		{/if}

		{#if migrationOption === 'albums-photos-db'}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 mb-6">
				<p class="text-(--color-surface-600-400) mb-4">
					Scan an existing storage repository (Wasabi, S3, Backblaze, or local) and rebuild album and photo
					records in the database without re-uploading files. Each folder is an album; variant subfolders
					(hero, large, medium, small, micro) are ignored. Only files named with a 13-digit timestamp prefix
					(e.g. <code class="text-sm">1703123456789-photo.jpg</code>) are imported as photos.
				</p>
				<div class="flex gap-2 mb-4 border-b border-surface-200-800">
					<button
						type="button"
						class="px-4 py-2 rounded-t {restoreStage === 'albums'
							? 'bg-(--color-surface-50-950) border border-b-0 border-surface-200-800 font-medium'
							: 'text-(--color-surface-600-400)'}"
						on:click={() => {
							restoreStage = 'albums';
							restoreSelectedIds = new Set();
							restoreExecuteResult = null;
							restoreAlbumsPreviewOpen = false;
						}}
					>
						1. Albums
					</button>
					<button
						type="button"
						class="px-4 py-2 rounded-t {restoreStage === 'photos'
							? 'bg-(--color-surface-50-950) border border-b-0 border-surface-200-800 font-medium'
							: 'text-(--color-surface-600-400)'}"
						on:click={() => {
							restoreStage = 'photos';
							restoreSelectedIds = new Set();
							restoreExecuteResult = null;
						}}
					>
						2. Photos
					</button>
				</div>
				<div class="grid gap-4 mb-4 md:grid-cols-2">
					<div>
						<label for="restore-provider" class="block font-medium text-(--color-surface-800-200) mb-1"
							>Storage provider</label
						>
						<select
							id="restore-provider"
							class="w-full border border-surface-300-700 rounded px-3 py-2"
							bind:value={restoreProviderId}
						>
							{#if restoreProviders.length === 0}
								<option value="">No providers enabled</option>
							{:else}
								{#each restoreProviders as p}
									<option value={p}>{p}</option>
								{/each}
							{/if}
						</select>
					</div>
					<div>
						<label for="restore-root" class="block font-medium text-(--color-surface-800-200) mb-1"
							>Root prefix (optional)</label
						>
						<input
							id="restore-root"
							type="text"
							class="w-full border border-surface-300-700 rounded px-3 py-2"
							placeholder="e.g. weddings/2024"
							bind:value={restoreRootPrefix}
						/>
					</div>
				</div>
				<div class="flex flex-wrap gap-2 mb-4">
					<button
						type="button"
						class="px-4 py-2 bg-(--color-surface-200-800) rounded hover:bg-(--color-surface-300-700) disabled:opacity-50"
						disabled={restoreLoading || !restoreProviderId}
						on:click={restoreScan}
					>
						{restoreLoading ? 'Scanning…' : 'Scan & preview'}
					</button>
					{#if restoreStage === 'photos'}
						<button
							type="button"
							class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
							disabled={restoreLoading || !restoreProviderId || restoreSelectedIds.size === 0}
							on:click={() => restoreExecute()}
						>
							Confirm &amp; create selected
						</button>
						{#if restoreCurrentReport()}
							<button
								type="button"
								class="px-3 py-2 text-sm text-(--color-surface-700-300) hover:underline"
								on:click={selectAllRestoreCreate}
							>
								Select all to create
							</button>
							<button
								type="button"
								class="px-3 py-2 text-sm text-(--color-surface-700-300) hover:underline"
								on:click={clearRestoreSelection}
							>
								Clear selection
							</button>
						{/if}
					{:else if restoreAlbumReport}
						<button
							type="button"
							class="px-3 py-2 text-sm text-(--color-surface-700-300) hover:underline"
							on:click={() => (restoreAlbumsPreviewOpen = true)}
						>
							Review scan results…
						</button>
					{/if}
				</div>

				<StorageRestoreAlbumsPreviewDialog
					open={restoreAlbumsPreviewOpen}
					report={restoreAlbumReport}
					selectedIds={restoreSelectedIds}
					loading={restoreLoading}
					onClose={() => (restoreAlbumsPreviewOpen = false)}
					onToggleSelect={toggleRestoreItem}
					onSelectAll={selectAllRestoreCreate}
					onClearSelection={clearRestoreSelection}
					onConfirm={restoreExecuteFromAlbumsModal}
				/>
				{#if restoreStage === 'photos'}
					<p class="text-sm text-(--color-surface-600-400) mb-3">
						Run the albums stage first so photos can be linked to album records.
					</p>
				{/if}
				{#if restoreCurrentReport()?.summary}
					<div class="mb-4 p-4 bg-(--color-surface-100-900) rounded text-sm">
						{#if restoreStage === 'albums'}
							<p>
								<strong>Total folders:</strong> {restoreAlbumReport?.summary.total} ·
								<strong>Already in DB:</strong> {restoreAlbumReport?.summary.existing} ·
								<strong>To create:</strong> {restoreAlbumReport?.summary.toCreate}
							</p>
						{:else}
							<p>
								<strong>Total photos:</strong> {restorePhotoReport?.summary.total} ·
								<strong>Already in DB:</strong> {restorePhotoReport?.summary.existing} ·
								<strong>To create:</strong> {restorePhotoReport?.summary.toCreate} ·
								<strong>No album:</strong> {restorePhotoReport?.summary.orphan}
							</p>
						{/if}
					</div>
				{/if}
				{#if restoreExecuteResult}
					<div class="mb-4 p-3 rounded border border-surface-200-800 text-sm">
						<p>
							Created: <strong>{restoreExecuteResult.created}</strong> · Skipped:
							<strong>{restoreExecuteResult.skipped}</strong>
						</p>
						{#if restoreExecuteResult.errors?.length}
							<ul class="mt-2 text-red-600 list-disc pl-5">
								{#each restoreExecuteResult.errors.slice(0, 10) as err}
									<li>{err.id}: {err.message}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
				{#if restoreStage === 'photos' && restoreCurrentReport()?.items?.length}
					<div class="border border-surface-300-700 rounded max-h-80 overflow-y-auto">
						<table class="w-full text-sm">
							<thead class="sticky top-0 bg-(--color-surface-100-900)">
								<tr>
									<th class="p-2 text-left w-8"></th>
									<th class="p-2 text-left">File</th>
									<th class="p-2 text-left">Status</th>
								</tr>
							</thead>
							<tbody>
								{#each restorePhotoReport?.items ?? [] as item}
									<tr class="border-t border-surface-200-800">
										<td class="p-2">
											{#if item.status === 'create'}
												<input
													type="checkbox"
													checked={restoreSelectedIds.has(item.id)}
													on:change={() => toggleRestoreItem(item.id)}
												/>
											{/if}
										</td>
										<td class="p-2 font-mono text-xs break-all">
											{item.filename}
											{#if item.albumName}
												<span class="block text-(--color-surface-600-400)">{item.albumName}</span>
											{/if}
										</td>
										<td class="p-2 whitespace-nowrap">{restoreStatusLabel(item.status)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else if restoreStage === 'photos' && restoreCurrentReport()}
					<p class="text-(--color-surface-600-400) text-sm">No items found under this prefix.</p>
				{/if}
			</div>
		{/if}

		{#if migrationOption !== 'full-db' && migrationOption !== 'albums-photos-db'}
		<div class="flex gap-2 mb-6 border-b border-surface-200-800">
			<button
				class="px-4 py-2 rounded-t {activeTab === 'export' ? 'bg-(--color-surface-50-950) border border-b-0 border-surface-200-800 font-medium text-(--color-surface-950-50)' : 'bg-(--color-surface-100-900) text-(--color-surface-800-200) hover:text-(--color-surface-950-50)'}"
				on:click={() => (activeTab = 'export')}
				disabled={migrationOption === 'storage-migration'}
			>
				Export
			</button>
			<button
				class="px-4 py-2 rounded-t {activeTab === 'import' ? 'bg-(--color-surface-50-950) border border-b-0 border-surface-200-800 font-medium text-(--color-surface-950-50)' : 'bg-(--color-surface-100-900) text-(--color-surface-800-200) hover:text-(--color-surface-950-50)'}"
				on:click={() => (activeTab = 'import')}
				disabled={migrationOption === 'storage-migration' || migrationOption === 'storage-backup'}
			>
				Import
			</button>
			<span
				class="inline-block"
				title={migrationOption !== 'storage-migration'
					? $t('admin.migrationTabStorageMigrationTooltip')
					: undefined}
			>
				<button
					class="px-4 py-2 rounded-t {activeTab === 'storage' ? 'bg-(--color-surface-50-950) border border-b-0 border-surface-200-800 font-medium text-(--color-surface-950-50)' : 'bg-(--color-surface-100-900) text-(--color-surface-800-200) hover:text-(--color-surface-950-50)'}"
					on:click={() => (activeTab = 'storage')}
					disabled={migrationOption !== 'storage-migration'}
				>
					Storage migration
				</button>
			</span>
		</div>
		{/if}

		{#if activeTab === 'export' && (migrationOption === 'storage-backup' || migrationOption === 'templates-pages')}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
				<p class="text-(--color-surface-600-400) mb-4">
					Export produces a portable ZIP package you can download directly (database reflection + photo tree).
				</p>
				<div class="mb-4 flex items-center gap-4">
					<label class="flex items-center gap-2 text-(--color-surface-800-200)">
						<input type="radio" name="exportScope" value="full" bind:group={exportScope} />
						Full data (photos, albums, metadata)
					</label>
					<label class="flex items-center gap-2 text-(--color-surface-800-200)">
						<input type="radio" name="exportScope" value="templates-pages" bind:group={exportScope} />
						Templates + pages only
					</label>
				</div>
				<input type="hidden" value={exportBundle ? '1' : '0'} />
				<div class="flex items-center gap-2 mb-4">
					<input
						id="export-include-config"
						type="checkbox"
						bind:checked={exportIncludeConfig}
						disabled={exportScope === 'templates-pages'}
					/>
					<label for="export-include-config" class="text-sm text-(--color-surface-800-200)">
						Include pages and template config
					</label>
				</div>
				<div class="flex gap-2 items-center mb-4">
					<button
						class="px-4 py-2 bg-(--color-surface-200-800) rounded hover:bg-(--color-surface-300-700) disabled:opacity-50"
						disabled={exportLoading}
						on:click={exportDoPreview}
					>
						Preview
					</button>
					<button
						type="button"
						class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
						disabled={exportLoading || !!exportJobId}
						on:click={exportStart}
					>
						Start export
					</button>
				</div>
				{#if exportPreview}
					<div class="mb-4 p-4 bg-(--color-surface-50-950) rounded">
						<p><strong>Albums:</strong> {exportPreview.albumCount} · <strong>Photos:</strong> {exportPreview.photoCount} · <strong>Est. size:</strong> {formatBytes(exportPreview.estimatedSizeBytes)}</p>
						{#if exportPreview.includesConfig}
							<p class="mt-1 text-sm text-(--color-surface-700-300)">
								Includes pages: <strong>{exportPreview.pageCount ?? 0}</strong>
							</p>
						{/if}
						{#if exportScope === 'templates-pages'}
							<p class="mt-1 text-sm text-(--color-surface-700-300)">
								This bundle excludes photos/albums and contains only page definitions + template configuration.
							</p>
						{/if}
					</div>
				{/if}
				{#if exportStatus}
					<div class="p-4 bg-(--color-surface-50-950) rounded">
						<p class="text-(--color-surface-800-200)">
							Status: <strong>{exportStatus.status}</strong>
						</p>
						{#if exportStatus.total > 0}
							<p class="text-(--color-surface-800-200)">
								Progress: {exportStatus.progress} / {exportStatus.total}
								{#if exportStatus.progress && exportStatus.total}
									({Math.round((exportStatus.progress / exportStatus.total) * 100)}%)
								{/if}
							</p>
							{#if exportStatus.current && exportStatus.status === 'running'}
								<p class="text-sm text-(--color-surface-600-400)">Current: {exportStatus.current}</p>
							{/if}
						{/if}
						{#if exportStatus.status === 'completed'}
							<div class="mt-2 space-y-1 text-sm">
								<p class="text-green-700">
									Export finished successfully.
									{#if exportBundlePath}
										<br />ZIP bundle: <code>{exportBundlePath}</code>
									{:else if exportBundle && !exportBundleError}
										<br /><span class="text-amber-700">ZIP bundle creation in progress...</span>
									{/if}
								</p>
								{#if exportBundlePath}
									<button
										type="button"
										class="{adminBtnPrimarySm} {adminRingPrimary}"
										on:click={downloadExportBundle}
									>
										Download ZIP
									</button>
								{/if}
								{#if exportBundleError}
									<p class="text-red-700">
										Bundle creation failed: {exportBundleError}
									</p>
								{/if}
								{#if exportSkippedCount && exportSkippedCount > 0}
									<p class="text-amber-700">
										Note: {exportSkippedCount} photo(s) could not be copied (for example, due to storage
										permission issues). Check server logs for details.
									</p>
								{/if}
							</div>
						{/if}
						{#if exportStatus.error}
							<p class="text-red-600">{exportStatus.error}</p>
						{/if}
						{#if exportStatus.status === 'running'}
							<button class="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded" on:click={exportCancel}>
								Cancel
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#if activeTab === 'import' && migrationOption === 'templates-pages'}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
				<p class="text-(--color-surface-600-400) mb-4">
					Import from a previously exported package (folder or .zip) or from a raw folder (folders → albums, images → photos). Path must be under the allowed base.
				</p>
				<div class="flex gap-4 mb-4">
					<label class="flex items-center gap-2 text-(--color-surface-800-200)">
						<input type="radio" name="importMode" value="package" bind:group={importMode} />
						Package (exported bundle)
					</label>
					<label class="flex items-center gap-2 text-(--color-surface-800-200)">
						<input type="radio" name="importMode" value="raw" bind:group={importMode} />
						Raw folder
					</label>
				</div>
				{#if importMode === 'package'}
					<div class="mb-4 space-y-2">
						<label class="flex items-center gap-2 text-(--color-surface-800-200)">
							<input type="checkbox" bind:checked={importIncludeConfig} />
							Import pages and template config
						</label>
						<div class="flex items-center gap-4 text-sm text-(--color-surface-700-300)">
							<span>Template config mode:</span>
							<label class="flex items-center gap-2">
								<input type="radio" name="importConfigMode" value="merge" bind:group={importConfigMode} />
								Merge
							</label>
							<label class="flex items-center gap-2">
								<input type="radio" name="importConfigMode" value="replace" bind:group={importConfigMode} />
								Replace
							</label>
						</div>
					</div>
				{/if}
				<div class="mb-4">
					<label for="import-path-input" class="block font-medium text-(--color-surface-800-200) mb-2">Source path:</label>
					<div class="flex gap-2 items-center">
						<input
							id="import-path-input"
							type="text"
							class="flex-1 border border-surface-300-700 rounded px-3 py-2 text-(--color-surface-950-50)"
							placeholder={importMode === 'package' ? 'path to package directory or .zip' : 'path to folder with photos'}
							bind:value={importPath}
						/>
						<input
							type="file"
							class="hidden"
							webkitdirectory
							bind:this={importPathInput}
							on:change={handleImportDirectorySelect}
						/>
						<input
							type="file"
							class="hidden"
							accept=".zip,application/zip"
							bind:this={importZipInput}
							on:change={uploadImportZip}
						/>
						<button
							type="button"
							class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded hover:bg-(--color-surface-300-700) disabled:opacity-50"
							disabled={importLoading}
							on:click={selectImportDirectory}
						>
							Browse...
						</button>
						{#if importMode === 'package'}
							<button
								type="button"
								class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded hover:bg-(--color-surface-300-700) disabled:opacity-50"
								disabled={importLoading || importUploadLoading}
								on:click={() => importZipInput?.click()}
							>
								{importUploadLoading ? 'Uploading...' : 'Upload ZIP...'}
							</button>
						{/if}
					</div>
				</div>
				<div class="flex gap-2 items-center mb-4">
					<button
						class="px-4 py-2 bg-(--color-surface-200-800) rounded hover:bg-(--color-surface-300-700) disabled:opacity-50"
						disabled={importLoading}
						on:click={importDoPreview}
					>
						Preview
					</button>
					<button
						class="px-4 py-2 bg-(--color-primary-600) text-white rounded hover:bg-(--color-primary-700) disabled:opacity-50"
						disabled={importLoading || !!importJobId}
						on:click={importStart}
					>
						Start import
					</button>
				</div>
				{#if importPreview}
					<div class="mb-4 p-4 bg-(--color-surface-50-950) rounded">
						<p><strong>Albums:</strong> {importPreview.albumCount} · <strong>Photos:</strong> {importPreview.photoCount}</p>
						{#if importMode === 'package' && (importPreview.pageCount !== undefined || importPreview.hasTemplateConfig !== undefined)}
							<p class="mt-1 text-sm text-(--color-surface-700-300)">
								Pages in package: <strong>{importPreview.pageCount ?? 0}</strong> ·
								Template config file: <strong>{importPreview.hasTemplateConfig ? 'yes' : 'no'}</strong>
							</p>
						{/if}
					</div>
				{/if}
				{#if importStatus}
					<div class="p-4 bg-(--color-surface-50-950) rounded">
						<p class="text-(--color-surface-800-200)">
							Status: <strong>{importStatus.status}</strong>
						</p>
						{#if importStatus.total > 0}
							<p class="text-(--color-surface-800-200)">
								Progress: {importStatus.progress} / {importStatus.total}
							</p>
							{#if importStatus.current}
								<p class="text-sm text-(--color-surface-600-400)">Current: {importStatus.current}</p>
							{/if}
						{/if}
						{#if importStatus.error}
							<p class="text-red-600">{importStatus.error}</p>
						{/if}
						{#if importStatus.status === 'running'}
							<button class="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded" on:click={importCancel}>
								Cancel
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#if activeTab === 'storage' && migrationOption === 'storage-migration'}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
				<p class="text-(--color-surface-600-400) mb-4">
					Copy photo assets from one storage provider to another (e.g. local → S3). DB references are updated after each copy.
					<span class="block mt-2 text-sm">
						<strong>Note:</strong> Configure storage providers in <a href="/admin/storage" class="text-(--color-primary-600) hover:underline">Storage Management</a> first.
					</span>
				</p>
				<div class="mb-4">
					<label for="source-provider" class="block font-medium text-(--color-surface-800-200) mb-2">Source storage provider:</label>
					<select
						id="source-provider"
						class="border border-surface-300-700 rounded px-3 py-2 text-(--color-surface-950-50) mb-3"
						bind:value={sourceProviderId}
					>
						<option value="">Select source provider...</option>
						{#if storageProviders.length === 0}
							<option value="" disabled>No providers configured</option>
						{:else}
							{#each storageProviders as p}
								<option value={p}>{p}</option>
							{/each}
						{/if}
					</select>
				</div>
				<div class="mb-4">
					<label for="target-provider" class="block font-medium text-(--color-surface-800-200) mb-2">Target storage provider:</label>
					<div class="flex gap-2 items-center">
						<select
							id="target-provider"
							class="border border-surface-300-700 rounded px-3 py-2 text-(--color-surface-950-50)"
							bind:value={targetProviderId}
						>
							<option value="">Select target provider...</option>
							{#if storageProviders.length === 0}
								<option value="" disabled>No providers configured</option>
							{:else}
								{#each storageProviders as p}
									<option value={p}>{p}</option>
								{/each}
							{/if}
						</select>
						<button
							class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded hover:bg-(--color-surface-300-700) disabled:opacity-50"
							disabled={storageLoading || !storageProviders.length || !sourceProviderId || !targetProviderId}
							on:click={storageDoPreview}
						>
							Preview
						</button>
						<button
							type="button"
							class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
							disabled={storageLoading || !storageProviders.length || !sourceProviderId || !targetProviderId || !!storageJobId}
							on:click={storageStart}
						>
							Start migration
						</button>
					</div>
				</div>
				<div class="mb-4">
					<p class="block font-medium text-(--color-surface-800-200) mb-2">
						Scope: <span class="text-sm font-normal text-(--color-surface-600-400)">(Optional - leave empty to migrate all photos from source)</span>
					</p>
					<p class="text-sm text-(--color-surface-600-400) mb-2">
						{#if !sourceProviderId}
							Select a source provider to see albums.
						{:else}
							Select specific albums to migrate. Child albums are automatically included.
						{/if}
					</p>
					<div class="border border-surface-300-700 rounded p-3 max-h-48 overflow-y-auto">
						{#if !sourceProviderId}
							<p class="text-(--color-surface-600-400) text-sm">Select a source provider first</p>
						{:else if filteredStorageAlbums.length === 0}
							<p class="text-(--color-surface-600-400) text-sm">No albums found for this provider</p>
						{:else}
							<label class="flex items-center gap-2 mb-2 text-(--color-surface-800-200) cursor-pointer">
								<input
									type="checkbox"
									checked={storageSelectAll}
									on:change={(e) => toggleStorageSelectAll(e)}
									on:click={(e) => e.stopPropagation()}
								/>
								<span class="font-medium">Select all albums ({filteredStorageAlbums.length})</span>
							</label>
							<div class="space-y-1">
								{#each filteredStorageAlbums as album}
									<label
										class="flex items-center gap-2 text-(--color-surface-800-200) cursor-pointer"
										style="padding-left: {(album.level || 0) * 1}rem;"
									>
										<input
											type="checkbox"
											checked={selectedStorageAlbumIds.has(album._id)}
											on:change={(e) => toggleStorageAlbum(album._id, e)}
											on:click={(e) => e.stopPropagation()}
										/>
										<span>{getAlbumDisplayName(album)} ({album.photoCount || 0} photos)</span>
									</label>
								{/each}
							</div>
						{/if}
					</div>
				</div>
				{#if storagePreview}
					<div class="mb-4 p-4 bg-(--color-surface-50-950) rounded">
						<p class="text-(--color-surface-800-200)"><strong>Photos:</strong> {storagePreview.photoCount} · <strong>Est. size:</strong> {formatBytes(storagePreview.estimatedSizeBytes)}</p>
					</div>
				{/if}
				{#if storageStatus}
					<div class="p-4 bg-(--color-surface-50-950) rounded">
						<p class="text-(--color-surface-800-200)">Status: <strong>{storageStatus.status}</strong></p>
						{#if storageStatus.total > 0}
							<p class="text-(--color-surface-800-200)">Progress: {storageStatus.progress} / {storageStatus.total}</p>
							{#if storageStatus.current}
								<p class="text-sm text-(--color-surface-600-400)">Current: {storageStatus.current}</p>
							{/if}
						{/if}
						{#if storageStatus.error}
							<p class="text-red-600">{storageStatus.error}</p>
						{/if}
						{#if storageStatus.status === 'running'}
							<button class="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded" on:click={storageCancel}>Cancel</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
