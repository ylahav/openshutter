<script lang="ts">
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import AdminConfirmDialog from '$lib/components/admin/AdminConfirmDialog.svelte';
	import { t } from '$stores/i18n';

	const LS_LAST_DB = 'openshutter.admin.lastBackup.database';
	const LS_LAST_FILES = 'openshutter.admin.lastBackup.files';

	let loading = false;
	let message = '';
	let messageType: 'success' | 'error' = 'success';

	let lastBackupDatabaseIso = '';
	let lastBackupFilesIso = '';

	function loadBackupTimesFromStorage() {
		if (typeof localStorage === 'undefined') return;
		try {
			lastBackupDatabaseIso = localStorage.getItem(LS_LAST_DB) || '';
			lastBackupFilesIso = localStorage.getItem(LS_LAST_FILES) || '';
		} catch {
			lastBackupDatabaseIso = '';
			lastBackupFilesIso = '';
		}
	}

	function recordSuccessfulBackup(kind: 'database' | 'files') {
		const iso = new Date().toISOString();
		try {
			localStorage.setItem(kind === 'database' ? LS_LAST_DB : LS_LAST_FILES, iso);
		} catch {
			/* quota / private mode */
		}
		if (kind === 'database') lastBackupDatabaseIso = iso;
		else lastBackupFilesIso = iso;
	}

	/** Relative time for a past ISO timestamp (e.g. "2 days ago"). */
	function formatRelativePast(iso: string): string {
		const date = new Date(iso);
		const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
		const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
		const abs = Math.abs(diffSec);
		if (abs < 60) return rtf.format(diffSec, 'second');
		if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
		if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
		if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), 'day');
		if (abs < 2592000) return rtf.format(Math.round(diffSec / 604800), 'week');
		if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), 'month');
		return rtf.format(Math.round(diffSec / 31536000), 'year');
	}

	onMount(() => {
		loadBackupTimesFromStorage();
	});

	let restoreDbDialog: {
		isOpen: boolean;
		backupData: Record<string, unknown> | null;
		fileInput: HTMLInputElement | null;
		isRestoring: boolean;
	} = {
		isOpen: false,
		backupData: null,
		fileInput: null,
		isRestoring: false,
	};

	const backupPrimaryClass =
		'w-full px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) disabled:opacity-50 text-sm font-medium flex items-center justify-center';

	const restoreCautionClass =
		'w-full px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center cursor-pointer border border-amber-500 bg-amber-50 text-amber-950 shadow-sm hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60';

	async function handleDatabaseBackup() {
		loading = true;
		message = '';
		try {
			const response = await fetch('/api/admin/backup/database', {
				method: 'POST',
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const data = await response.json();

			if (!data || !data.backup) {
				throw new Error('No backup data returned from server');
			}

			const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
				type: 'application/json',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `database-backup-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			recordSuccessfulBackup('database');

			message = 'Database backup created and downloaded successfully!';
			messageType = 'success';

			setTimeout(() => {
				message = '';
			}, 5000);
		} catch (err) {
			logger.error('Error creating database backup:', err);
			message = handleError(err, 'Failed to create database backup');
			messageType = 'error';
		} finally {
			loading = false;
		}
	}

	async function handleDatabaseRestore(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		message = '';

		try {
			const fileContent = await file.text();
			const backupData = JSON.parse(fileContent) as Record<string, unknown>;

			if (!backupData || !backupData.collections) {
				throw new Error('Invalid backup file format');
			}

			restoreDbDialog = {
				isOpen: true,
				backupData,
				fileInput: target,
				isRestoring: false,
			};
		} catch (err) {
			logger.error('Error reading database backup file:', err);
			message = handleError(err, 'Failed to restore database');
			messageType = 'error';
			target.value = '';
		}
	}

	function closeRestoreDbDialog() {
		const inp = restoreDbDialog.fileInput;
		restoreDbDialog = {
			isOpen: false,
			backupData: null,
			fileInput: null,
			isRestoring: false,
		};
		if (inp) inp.value = '';
	}

	async function confirmRestoreDatabase() {
		const backup = restoreDbDialog.backupData;
		if (!backup || restoreDbDialog.isRestoring) return;

		restoreDbDialog = { ...restoreDbDialog, isRestoring: true };
		loading = true;
		message = '';

		try {
			const response = await fetch('/api/admin/backup/restore-database', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ backup }),
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const json = await response.json();
			message = json?.message || 'Database restored successfully!';
			messageType = 'success';

			setTimeout(() => {
				message = '';
			}, 5000);
			closeRestoreDbDialog();
		} catch (err) {
			logger.error('Error restoring database:', err);
			message = handleError(err, 'Failed to restore database');
			messageType = 'error';
			restoreDbDialog = { ...restoreDbDialog, isRestoring: false };
		} finally {
			loading = false;
		}
	}

	async function handleFilesBackup() {
		loading = true;
		message = '';
		try {
			const response = await fetch('/api/admin/backup/files', {
				method: 'POST',
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			if (response.headers.get('content-type')?.includes('application/zip')) {
				const blob = await response.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `files-backup-${new Date().toISOString().split('T')[0]}.zip`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);

				recordSuccessfulBackup('files');

				message = 'Files backup created and downloaded successfully!';
				messageType = 'success';
			} else {
				const data = await response.json();
				message = data?.message || 'Files backup feature requires additional setup.';
				messageType = 'error';
			}

			setTimeout(() => {
				message = '';
			}, 5000);
		} catch (err) {
			logger.error('Error creating files backup:', err);
			message = handleError(err, 'Failed to create files backup');
			messageType = 'error';
		} finally {
			loading = false;
		}
	}

	async function handleFilesRestore(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		loading = true;
		message = '';

		try {
			const formData = new FormData();
			formData.append('backup', file);

			const response = await fetch('/api/admin/backup/restore-files', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const data = await response.json();
			message = data?.message || 'Files restored successfully!';
			messageType = 'success';

			setTimeout(() => {
				message = '';
			}, 5000);
		} catch (err) {
			logger.error('Error restoring files:', err);
			message = handleError(err, 'Failed to restore files');
			messageType = 'error';
		} finally {
			loading = false;
			target.value = '';
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.backupRestore')} — {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-4xl mx-auto px-4">
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.backupRestore')}</h1>
			<p class="text-(--color-surface-600-400) mt-2">{$t('admin.backupRestoreDescription')}</p>
		</div>

		{#if message}
			<div
				class="mb-6 p-4 rounded-md {messageType === 'success'
					? 'bg-green-50 border border-green-200 text-green-700'
					: 'bg-red-50 border border-red-200 text-red-700'}"
			>
				{message}
			</div>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Database Backup & Restore -->
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
				<div class="flex items-center mb-3">
					<div class="p-2 bg-[color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] rounded-lg mr-3">
						<svg
							class="w-6 h-6 text-(--color-primary-600)"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-semibold text-(--color-surface-950-50)">{$t('admin.databaseBackup')}</h2>
						<p class="text-(--color-surface-600-400) text-sm">{$t('admin.databaseBackupDescription')}</p>
					</div>
				</div>

				<p class="text-xs text-(--color-surface-600-400) mb-4">
					{$t('admin.backupLastBackupPrefix')}
					{#if lastBackupDatabaseIso}
						<time
							class="font-medium text-(--color-surface-800-200)"
							datetime={lastBackupDatabaseIso}
							title={lastBackupDatabaseIso}
						>
							{formatRelativePast(lastBackupDatabaseIso)}
						</time>
					{:else}
						<span class="font-medium text-(--color-surface-600-400)">{$t('admin.backupLastBackupNever')}</span>
					{/if}
				</p>

				<div class="space-y-4">
					<button
						type="button"
						on:click={handleDatabaseBackup}
						disabled={loading}
						class={backupPrimaryClass}
					>
						{#if loading}
							<svg
								class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{:else}
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						{/if}
						{$t('admin.backupDatabase')}
					</button>

					<div class="relative">
						<input
							type="file"
							accept=".json"
							on:change={handleDatabaseRestore}
							disabled={loading}
							class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
							id="database-restore"
						/>
						<label
							for="database-restore"
							class="{restoreCautionClass} {loading ? 'opacity-50 cursor-not-allowed' : ''}"
						>
							<svg class="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
								/>
							</svg>
							{$t('admin.restoreDatabase')}
						</label>
					</div>
				</div>
			</div>

			<!-- Files Backup & Restore -->
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
				<div class="flex items-center mb-3">
					<div class="p-2 bg-[color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] rounded-lg mr-3">
						<svg
							class="w-6 h-6 text-(--color-primary-600)"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-semibold text-(--color-surface-950-50)">{$t('admin.filesBackup')}</h2>
						<p class="text-(--color-surface-600-400) text-sm">{$t('admin.filesBackupDescription')}</p>
					</div>
				</div>

				<p class="text-xs text-(--color-surface-600-400) mb-4">
					{$t('admin.backupLastBackupPrefix')}
					{#if lastBackupFilesIso}
						<time
							class="font-medium text-(--color-surface-800-200)"
							datetime={lastBackupFilesIso}
							title={lastBackupFilesIso}
						>
							{formatRelativePast(lastBackupFilesIso)}
						</time>
					{:else}
						<span class="font-medium text-(--color-surface-600-400)">{$t('admin.backupLastBackupNever')}</span>
					{/if}
				</p>

				<div class="space-y-4">
					<button
						type="button"
						on:click={handleFilesBackup}
						disabled={loading}
						class={backupPrimaryClass}
					>
						{#if loading}
							<svg
								class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{:else}
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						{/if}
						{$t('admin.backupFiles')}
					</button>

					<div class="relative">
						<input
							type="file"
							accept=".zip"
							on:change={handleFilesRestore}
							disabled={loading}
							class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
							id="files-restore"
						/>
						<label
							for="files-restore"
							class="{restoreCautionClass} {loading ? 'opacity-50 cursor-not-allowed' : ''}"
						>
							<svg class="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
								/>
							</svg>
							{$t('admin.restoreFiles')}
						</label>
					</div>
				</div>
			</div>
		</div>

		<!-- Warning Notice -->
		<div class="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-950/25 dark:border-yellow-900/60">
			<div class="flex">
				<div class="shrink-0">
					<svg class="h-5 w-5 text-yellow-600 dark:text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-yellow-900 dark:text-yellow-100">
						{$t('admin.backupWarningImportant')}
					</h3>
					<div class="mt-2 text-sm text-yellow-800 dark:text-yellow-200/90">
						<p>
							<strong>Database Restore:</strong> Restoring a database backup will DELETE all existing data
							and replace it with the backup. Make sure you have a current backup before restoring.
						</p>
						<p class="mt-2">
							<strong>Files Backup:</strong> Files backup functionality may require additional setup
							depending on your storage provider. For cloud storage providers, use their native backup
							tools.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<AdminConfirmDialog
		open={restoreDbDialog.isOpen}
		title="Restore database from backup?"
		message="This will DELETE all existing data and replace it with this backup file. Make sure you have a current backup before continuing."
		confirmText={restoreDbDialog.isRestoring ? 'Restoring…' : 'Restore database'}
		cancelText="Cancel"
		variant="danger"
		confirmDisabled={restoreDbDialog.isRestoring}
		onOpenChange={(o) => {
			if (!o && !restoreDbDialog.isRestoring) closeRestoreDbDialog();
		}}
		onConfirm={confirmRestoreDatabase}
	/>
</div>
