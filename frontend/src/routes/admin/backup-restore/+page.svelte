<script lang="ts">
	import { onMount } from 'svelte';

  export const data = undefined as any; // From +layout.server.ts, not used in this component

	let loading = false;
	let message = '';
	let messageType: 'success' | 'error' = 'success';

	async function handleDatabaseBackup() {
		loading = true;
		message = '';
		try {
			const response = await fetch('/api/admin/backup/database', {
				method: 'POST'
			});

			const data = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			if (!response.ok) {
				const errorMessage = data?.message || `HTTP ${response.status}: Failed to create database backup`;
				throw new Error(errorMessage);
			}

			if (!data || !data.backup) {
				throw new Error('No backup data returned from server');
			}

			// Trigger download
			const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
				type: 'application/json'
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `database-backup-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			message = 'Database backup created and downloaded successfully!';
			messageType = 'success';

			setTimeout(() => {
				message = '';
			}, 5000);
		} catch (err) {
			console.error('Error creating database backup:', err);
			message = `Failed to create database backup: ${err instanceof Error ? err.message : 'Unknown error'}`;
			messageType = 'error';
		} finally {
			loading = false;
		}
	}

	async function handleDatabaseRestore(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		loading = true;
		message = '';

		try {
			const fileContent = await file.text();
			const backupData = JSON.parse(fileContent);

			if (!backupData || !backupData.collections) {
				throw new Error('Invalid backup file format');
			}

			// Confirm before restoring
			const confirmed = confirm(
				'⚠️ WARNING: This will DELETE all existing data and restore from backup. Are you absolutely sure?'
			);
			if (!confirmed) {
				loading = false;
				target.value = '';
				return;
			}

			const response = await fetch('/api/admin/backup/restore-database', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ backup: backupData })
			});

			const data = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			if (!response.ok) {
				const errorMessage = data?.message || `HTTP ${response.status}: Failed to restore database`;
				throw new Error(errorMessage);
			}

			message = data?.message || 'Database restored successfully!';
			messageType = 'success';

			setTimeout(() => {
				message = '';
			}, 5000);
		} catch (err) {
			console.error('Error restoring database:', err);
			message = `Failed to restore database: ${err instanceof Error ? err.message : 'Unknown error'}`;
			messageType = 'error';
		} finally {
			loading = false;
			// Reset file input
			target.value = '';
		}
	}

	async function handleFilesBackup() {
		loading = true;
		message = '';
		try {
			const response = await fetch('/api/admin/backup/files', {
				method: 'POST'
			});

			const data = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			if (!response.ok) {
				const errorMessage = data?.message || `HTTP ${response.status}: Failed to create files backup`;
				throw new Error(errorMessage);
			}

			if (response.headers.get('content-type')?.includes('application/zip')) {
				// Handle zip file download
				const blob = await response.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `files-backup-${new Date().toISOString().split('T')[0]}.zip`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);

				message = 'Files backup created and downloaded successfully!';
				messageType = 'success';
			} else {
				// Handle JSON response (not implemented message)
				message = data?.message || 'Files backup feature requires additional setup.';
				messageType = 'error';
			}

			setTimeout(() => {
				message = '';
			}, 5000);
		} catch (err) {
			console.error('Error creating files backup:', err);
			message = `Failed to create files backup: ${err instanceof Error ? err.message : 'Unknown error'}`;
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
				body: formData
			});

			const data = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			if (!response.ok) {
				const errorMessage = data?.message || `HTTP ${response.status}: Failed to restore files`;
				throw new Error(errorMessage);
			}

			message = data?.message || 'Files restored successfully!';
			messageType = 'success';

			setTimeout(() => {
				message = '';
			}, 5000);
		} catch (err) {
			console.error('Error restoring files:', err);
			message = `Failed to restore files: ${err instanceof Error ? err.message : 'Unknown error'}`;
			messageType = 'error';
		} finally {
			loading = false;
			// Reset file input
			target.value = '';
		}
	}
</script>

<svelte:head>
	<title>Backup & Restore - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-4xl mx-auto px-4">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Backup & Restore</h1>
				<p class="text-gray-600 mt-2">Create backups and restore your database and files</p>
			</div>
			<a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
				← Back to Admin
			</a>
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
			<div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
				<div class="flex items-center mb-4">
					<div class="p-2 bg-blue-100 rounded-lg mr-3">
						<svg
							class="w-6 h-6 text-blue-600"
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
						<h2 class="text-xl font-semibold text-gray-900">Database Backup</h2>
						<p class="text-gray-600 text-sm">Export all database collections to JSON</p>
					</div>
				</div>

				<div class="space-y-4">
					<button
						type="button"
						on:click={handleDatabaseBackup}
						disabled={loading}
						class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center"
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
							<svg
								class="w-5 h-5 mr-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						{/if}
						Backup Database
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
							class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm font-medium flex items-center justify-center cursor-pointer {loading
								? 'opacity-50 cursor-not-allowed'
								: ''}"
						>
							<svg
								class="w-5 h-5 mr-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
								/>
							</svg>
							Restore Database
						</label>
					</div>
				</div>
			</div>

			<!-- Files Backup & Restore -->
			<div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
				<div class="flex items-center mb-4">
					<div class="p-2 bg-green-100 rounded-lg mr-3">
						<svg
							class="w-6 h-6 text-green-600"
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
						<h2 class="text-xl font-semibold text-gray-900">Files Backup</h2>
						<p class="text-gray-600 text-sm">Backup uploaded files and storage</p>
					</div>
				</div>

				<div class="space-y-4">
					<button
						type="button"
						on:click={handleFilesBackup}
						disabled={loading}
						class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center"
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
							<svg
								class="w-5 h-5 mr-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						{/if}
						Backup Files
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
							class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm font-medium flex items-center justify-center cursor-pointer {loading
								? 'opacity-50 cursor-not-allowed'
								: ''}"
						>
							<svg
								class="w-5 h-5 mr-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
								/>
							</svg>
							Restore Files
						</label>
					</div>
				</div>
			</div>
		</div>

		<!-- Warning Notice -->
		<div class="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-yellow-800">⚠️ Important Warning</h3>
					<div class="mt-2 text-sm text-yellow-700">
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
</div>
