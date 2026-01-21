<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$stores/language';
	import type { UploadReport } from '$types';
	import AlertModal from '$lib/components/AlertModal.svelte';

	function setWebkitDirectory(node: HTMLInputElement) {
		(node as any).webkitdirectory = true;
		return {
			destroy() {}
		};
	}

  export const data = undefined as any; // From +layout.server.ts, not used in this component

	interface UploadProgress {
		file: File;
		progress: number;
		status: 'uploading' | 'success' | 'error' | 'skipped';
		error?: string;
		reason?: string;
		photoId?: string;
	}

	let albumId: string | null = null;
	let albumName = '';
	let uploads: UploadProgress[] = [];
	let isUploading = false;
	let error: string | null = null;
	let isDragActive = false;
	let fileInput: HTMLInputElement | null = null;
	let fileUploadReport: UploadReport | null = null;
	let replaceIfExists = false; // Option to replace existing files
	
	// Folder upload state
	let uploadMode: 'files' | 'folder' = 'files';
	let folderInput: HTMLInputElement | null = null;
	let selectedFolderName = '';
	let folderUploadReport: UploadReport | null = null;
	let isUploadingFolder = false;
	let folderError: string | null = null;
	let showErrorModal = false;
	let errorModalTitle = '';
	let errorModalMessage = '';

	onMount(() => {
		albumId = $page.url.searchParams.get('albumId');
		if (albumId) {
			fetchAlbumName();
		}
	});

	async function fetchAlbumName() {
		if (!albumId) return;
		try {
			const response = await fetch(`/api/admin/albums/${albumId}`);
			if (response.ok) {
				const result = await response.json();
				// Handle both wrapped {success, data} and direct album formats
				const album = result.data || result;
				const name = album.name;
				const nameText =
					typeof name === 'string'
						? name
						: MultiLangUtils.getTextValue(name, $currentLanguage) || 'Album';
				albumName = nameText;
			}
		} catch (error) {
			console.error('Failed to fetch album name:', error);
		}
	}

	function showError(title: string, message: string) {
		errorModalTitle = title;
		errorModalMessage = message;
		showErrorModal = true;
	}

	function handleFilesSelected(files: FileList | null) {
		if (!files || files.length === 0) return;
		if (!albumId) {
			showError('No Album Selected', 'Please select an album first before uploading photos.');
			return;
		}

		const newUploads: UploadProgress[] = Array.from(files).map((file) => ({
			file,
			progress: 0,
			status: 'uploading' as const
		}));

		uploads = [...uploads, ...newUploads];
		isUploading = true;
		error = null;
		fileUploadReport = null; // Reset report

		Array.from(files).forEach((file, index) => {
			uploadFile(file, uploads.length - files.length + index);
		});
	}

	async function uploadFile(file: File, uploadIndex: number) {
		if (!albumId) return;

		const formData = new FormData();
		formData.append('file', file);
		formData.append('albumId', albumId);
		if (replaceIfExists) {
			formData.append('replaceIfExists', 'true');
		}

		try {
			const xhr = new XMLHttpRequest();

			// Track upload progress
			xhr.upload.addEventListener('progress', (event) => {
				if (event.lengthComputable) {
					const progress = Math.round((event.loaded / event.total) * 100);
					uploads = uploads.map((upload, index) =>
						index === uploadIndex ? { ...upload, progress } : upload
					);
				}
			});

			// Handle upload completion
			xhr.addEventListener('load', () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					try {
						const response = JSON.parse(xhr.responseText);
						// Check if photo was skipped (duplicate)
						if (response.skipped) {
							uploads = uploads.map((upload, index) =>
								index === uploadIndex
									? {
											...upload,
											status: 'skipped',
											progress: 100,
											reason: response.reason || response.message || 'Photo already exists'
										}
									: upload
							);
						} else if (response.success || response._id) {
							uploads = uploads.map((upload, index) =>
								index === uploadIndex
									? {
											...upload,
											status: 'success',
											progress: 100,
											photoId: response._id || response.photo?._id
										}
									: upload
							);
						} else {
							const errorMsg = response.error || response.message || 'Upload failed';
							console.error(`[Photo Upload] Upload failed for ${file.name}:`, {
								status: xhr.status,
								response: response
							});
							uploads = uploads.map((upload, index) =>
								index === uploadIndex
									? { ...upload, status: 'error', error: errorMsg }
									: upload
							);
						}
					} catch (parseError) {
						console.error(`[Photo Upload] Failed to parse response for ${file.name}:`, parseError);
						uploads = uploads.map((upload, index) =>
							index === uploadIndex ? { ...upload, status: 'error', error: 'Invalid server response' } : upload
						);
					}
				} else {
					// Non-2xx status code
					let errorMsg = `Upload failed (${xhr.status})`;
					
					// Handle 413 Request Entity Too Large
					if (xhr.status === 413) {
						// Check if it's a SvelteKit body size limit error
						const responseText = xhr.responseText || '';
						if (responseText.includes('Content-length') || responseText.includes('exceeds limit')) {
							errorMsg = 'File too large: SvelteKit body size limit exceeded. Set BODY_SIZE_LIMIT=100M environment variable and restart the server.';
						} else {
							errorMsg = 'File too large: The file exceeds the server\'s upload size limit. Configure nginx with `client_max_body_size 100M;` and set `BODY_SIZE_LIMIT=100M` environment variable.';
						}
					} else {
						try {
							const errorResponse = JSON.parse(xhr.responseText);
							errorMsg = errorResponse.error || errorResponse.message || errorResponse.statusCode || errorMsg;
						} catch {
							// If response isn't JSON, check if it's HTML (nginx error page)
							const responseText = xhr.responseText || xhr.statusText || 'Unknown error';
							if (responseText.includes('413') || responseText.includes('Request Entity Too Large') || responseText.includes('<html>')) {
								errorMsg = 'File too large: The file exceeds the server\'s upload size limit. Configure nginx with `client_max_body_size 100M;` and set `BODY_SIZE_LIMIT=100M` environment variable.';
							} else if (responseText.includes('Content-length') || responseText.includes('exceeds limit')) {
								errorMsg = 'File too large: SvelteKit body size limit exceeded. Set BODY_SIZE_LIMIT=100M environment variable and restart the server.';
							} else {
								errorMsg = responseText.length > 200 ? responseText.substring(0, 200) : responseText;
							}
						}
					}
					
					console.error(`[Photo Upload] Upload failed for ${file.name}:`, {
						status: xhr.status,
						statusText: xhr.statusText,
						responseText: xhr.responseText?.substring(0, 500),
						url: xhr.responseURL || '/api/photos/upload'
					});
					uploads = uploads.map((upload, index) =>
						index === uploadIndex ? { ...upload, status: 'error', error: errorMsg } : upload
					);
				}
				checkAllComplete();
			});

			// Handle upload error (network errors, CORS, etc.)
			xhr.addEventListener('error', (event) => {
				console.error(`[Photo Upload] Network error for ${file.name}:`, {
					event: event,
					readyState: xhr.readyState,
					status: xhr.status,
					statusText: xhr.statusText,
					url: xhr.responseURL || '/api/photos/upload'
				});
				uploads = uploads.map((upload, index) =>
					index === uploadIndex ? { ...upload, status: 'error', error: 'Network error - check console for details' } : upload
				);
				checkAllComplete();
			});

			// Handle upload abort
			xhr.addEventListener('abort', () => {
				console.warn(`[Photo Upload] Upload aborted for ${file.name}`);
				uploads = uploads.map((upload, index) =>
					index === uploadIndex ? { ...upload, status: 'error', error: 'Upload cancelled' } : upload
				);
				checkAllComplete();
			});

			xhr.open('POST', '/api/photos/upload');
			console.log(`[Photo Upload] Starting upload for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) to album ${albumId}`);
			xhr.send(formData);
		} catch (error) {
			console.error(`[Photo Upload] Exception during upload setup for ${file.name}:`, error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			uploads = uploads.map((upload, index) =>
				index === uploadIndex ? { ...upload, status: 'error', error: `Upload failed: ${errorMessage}` } : upload
			);
			checkAllComplete();
		}
	}

	function checkAllComplete() {
		const allComplete = uploads.length > 0 && uploads.every((upload) => upload.status !== 'uploading');
		if (allComplete) {
			isUploading = false;
			generateFileUploadReport();
			// If we're in folder mode and uploading, generate folder report too
			if (uploadMode === 'folder' && isUploadingFolder) {
				handleFolderUploadComplete();
			}
		}
	}

	function generateFileUploadReport() {
		if (uploads.length === 0) {
			fileUploadReport = null;
			return;
		}

		const successes = uploads.filter((u) => u.status === 'success');
		const skipped = uploads.filter((u) => u.status === 'skipped');
		const failures = uploads.filter((u) => u.status === 'error');

		fileUploadReport = {
			total: uploads.length,
			successful: successes.length,
			skipped: skipped.length,
			failed: failures.length,
			successes: successes.map((u) => ({
				filename: u.file.name,
				photoId: u.photoId,
				message: 'Uploaded successfully'
			})),
			skippedItems: skipped.map((u) => ({
				filename: u.file.name,
				reason: u.reason || 'Photo already exists'
			})),
			failures: failures.map((u) => ({
				filename: u.file.name,
				error: u.error || 'Upload failed'
			}))
		};
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragActive = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragActive = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragActive = false;

		const files = e.dataTransfer?.files;
		if (files) {
			handleFilesSelected(files);
		}
	}

	function handleFinish() {
		if (albumId) {
			goto(`/admin/albums/${albumId}`);
		} else {
			goto('/admin');
		}
	}

	const allUploadsComplete = uploads.length > 0 && uploads.every((upload) => upload.status !== 'uploading');
	const hasErrors = uploads.some((upload) => upload.status === 'error');

	function handleFolderSelected(files: FileList | null) {
		if (!files || files.length === 0) {
			selectedFolderName = '';
			return;
		}
		
		// Get folder name from the first file's path
		if (files.length > 0) {
			const firstFile = files[0];
			// Extract folder name from webkitRelativePath (e.g., "folder/file.jpg" -> "folder")
			const webkitPath = (firstFile as any).webkitRelativePath || '';
			const pathParts = webkitPath.split('/');
			selectedFolderName = pathParts.length > 1 ? pathParts[0] : 'Selected Folder';
		}
		
		if (!albumId) {
			showError('No Album Selected', 'Please select an album first before uploading photos from a folder.');
			return;
		}

		// Filter to only image files
		const imageFiles = Array.from(files).filter(file => {
			const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff'];
			const ext = file.name.toLowerCase().split('.').pop();
			const validExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'];
			return validTypes.includes(file.type) || (ext && validExts.includes(ext));
		});

		if (imageFiles.length === 0) {
			showError('No Image Files Found', 'The selected folder does not contain any valid image files. Please select a folder with images (JPEG, PNG, GIF, BMP, WebP, or TIFF).');
			return;
		}

		folderError = null;
		folderUploadReport = null;
		isUploadingFolder = true;

		// Create upload progress entries for all files
		const newUploads: UploadProgress[] = imageFiles.map((file) => ({
			file,
			progress: 0,
			status: 'uploading' as const
		}));

		uploads = [...uploads, ...newUploads];
		isUploading = true;
		error = null;
		fileUploadReport = null;

		// Upload each file
		imageFiles.forEach((file, index) => {
			uploadFile(file, uploads.length - imageFiles.length + index);
		});
	}

	function handleFolderUploadComplete() {
		isUploadingFolder = false;
		// Generate folder upload report from the uploads
		if (uploads.length > 0) {
		const folderUploads = uploads.filter(u => {
			// Check if this upload is from the folder (has webkitRelativePath)
			const webkitPath = (u.file as any).webkitRelativePath || '';
			return webkitPath && webkitPath.includes(selectedFolderName);
		});

			if (folderUploads.length > 0) {
				const successes = folderUploads.filter((u) => u.status === 'success');
				const skipped = folderUploads.filter((u) => u.status === 'skipped');
				const failures = folderUploads.filter((u) => u.status === 'error');

				folderUploadReport = {
					total: folderUploads.length,
					successful: successes.length,
					skipped: skipped.length,
					failed: failures.length,
					successes: successes.map((u) => ({
						filename: u.file.name,
						photoId: u.photoId,
						message: 'Uploaded successfully'
					})),
					skippedItems: skipped.map((u) => ({
						filename: u.file.name,
						reason: u.reason || 'Photo already exists'
					})),
					failures: failures.map((u) => ({
						filename: u.file.name,
						error: u.error || 'Upload failed'
					}))
				};
			}
		}
	}
</script>

<svelte:head>
	<title>{albumName ? `Upload Photos - ${albumName}` : 'Upload Photos'} - Admin</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">
					Upload Photos
					{#if albumName}
						<span class="text-2xl font-semibold text-gray-700"> - {albumName}</span>
					{/if}
				</h1>
				{#if albumName}
					<p class="mt-2 text-gray-600">
						Uploading to album: <span class="font-medium">{albumName}</span>
					</p>
				{:else if albumId}
					<p class="mt-2 text-sm text-gray-500">Loading album information...</p>
				{/if}
			</div>
			<div class="flex space-x-3">
				<button
					on:click={() => goto(albumId ? `/admin/albums/${albumId}` : '/admin')}
					class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
				>
					{albumId ? 'Back to Album' : 'Back to Photos'}
				</button>
			</div>
		</div>

		<!-- Error Modal -->
		<AlertModal
			isOpen={showErrorModal}
			title={errorModalTitle}
			message={errorModalMessage}
			variant="error"
			onClose={() => {
				showErrorModal = false;
				error = null;
				folderError = null;
			}}
		/>

		<!-- Upload Mode Tabs -->
		<div class="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
			<div class="flex space-x-1">
				<button
					on:click={() => uploadMode = 'files'}
					class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors {uploadMode === 'files'
						? 'bg-blue-600 text-white'
						: 'text-gray-700 hover:bg-gray-100'}"
				>
					Upload Files
				</button>
				<button
					on:click={() => uploadMode = 'folder'}
					class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors {uploadMode === 'folder'
						? 'bg-blue-600 text-white'
						: 'text-gray-700 hover:bg-gray-100'}"
				>
					Upload from Folder
				</button>
			</div>
		</div>

		<!-- Replace Existing Files Option -->
		<div class="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<label class="flex items-center space-x-3 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={replaceIfExists}
					class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
				/>
				<div>
					<span class="text-sm font-medium text-gray-900">Replace existing files</span>
					<p class="text-xs text-gray-500 mt-1">
						If a file with the same name or hash already exists, it will be replaced instead of skipped.
					</p>
				</div>
			</label>
		</div>

		<!-- Folder Upload Section -->
		{#if uploadMode === 'folder'}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Upload from Local Folder</h2>
				<p class="text-sm text-gray-600 mb-6">
					Select a folder from your computer containing images to upload. The system will automatically detect duplicates and skip them.
				</p>

				<div class="space-y-4">
					<div>
						<label for="folderInput" class="block text-sm font-medium text-gray-700 mb-2">
							Select Folder
						</label>
						<input
							bind:this={folderInput}
							id="folderInput"
							type="file"
							multiple
							accept="image/*"
							class="hidden"
							use:setWebkitDirectory
							on:change={(e) => handleFolderSelected((e.currentTarget as HTMLInputElement).files)}
						/>
						<button
							type="button"
							on:click={() => folderInput?.click()}
							disabled={isUploadingFolder || !albumId}
							class="w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
							</svg>
							{selectedFolderName ? `Selected: ${selectedFolderName}` : 'Choose Folder'}
						</button>
						{#if selectedFolderName}
							<p class="mt-2 text-sm text-gray-600">
								Folder: <span class="font-medium">{selectedFolderName}</span>
							</p>
						{/if}
						<p class="mt-2 text-xs text-gray-500">
							Click the button above to select a folder from your computer. All images in the folder will be uploaded.
						</p>
					</div>

				</div>

				<!-- Upload Progress (shown during upload) -->
				{#if isUploadingFolder && uploads.length > 0}
					<div class="mt-8 border-t border-gray-200 pt-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Upload Progress</h3>
						<div class="space-y-4">
							{#each uploads.filter(u => {
								const webkitPath = (u.file as any).webkitRelativePath || '';
								return webkitPath && webkitPath.includes(selectedFolderName);
							}) as upload, index}
								<div class="flex items-center space-x-4">
									<div class="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
										{#if upload.status === 'success'}
											<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{:else if upload.status === 'skipped'}
											<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
											</svg>
										{:else if upload.status === 'error'}
											<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										{:else}
											<svg class="w-6 h-6 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
											</svg>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-900 truncate">{upload.file.name}</p>
										<p class="text-xs text-gray-500">{(upload.file.size / 1024 / 1024).toFixed(2)} MB</p>
										{#if upload.status === 'skipped' && upload.reason}
											<p class="text-xs text-yellow-600 mt-1 truncate" title={upload.reason}>{upload.reason}</p>
										{:else if upload.status === 'error' && upload.error}
											<p class="text-xs text-red-600 mt-1 truncate" title={upload.error}>{upload.error}</p>
										{/if}
									</div>
									<div class="flex-shrink-0 w-24">
										<div class="w-full bg-gray-200 rounded-full h-2">
											<div
												class="h-2 rounded-full transition-all duration-300 {upload.status === 'success'
													? 'bg-green-600'
													: upload.status === 'skipped'
														? 'bg-yellow-600'
														: upload.status === 'error'
															? 'bg-red-600'
															: 'bg-blue-600'}"
												style="width: {upload.progress}%"
											></div>
										</div>
									</div>
									<div class="flex-shrink-0 w-16 text-right">
										<span
											class="text-xs font-medium {upload.status === 'success'
												? 'text-green-600'
												: upload.status === 'skipped'
													? 'text-yellow-600'
													: upload.status === 'error'
														? 'text-red-600'
														: 'text-blue-600'}"
										>
											{upload.status === 'success'
												? 'Done'
												: upload.status === 'skipped'
													? 'Skipped'
													: upload.status === 'error'
														? 'Error'
														: `${upload.progress}%`}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Upload Report -->
				{#if folderUploadReport}
					<div class="mt-8 border-t border-gray-200 pt-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Upload Report</h3>
						
						<!-- Summary -->
						<div class="grid grid-cols-4 gap-4 mb-6">
							<div class="bg-gray-50 rounded-lg p-4">
								<div class="text-2xl font-bold text-gray-900">{folderUploadReport.total}</div>
								<div class="text-sm text-gray-600">Total Files</div>
							</div>
							<div class="bg-green-50 rounded-lg p-4">
								<div class="text-2xl font-bold text-green-600">{folderUploadReport.successful}</div>
								<div class="text-sm text-green-600">Successful</div>
							</div>
							<div class="bg-yellow-50 rounded-lg p-4">
								<div class="text-2xl font-bold text-yellow-600">{folderUploadReport.skipped}</div>
								<div class="text-sm text-yellow-600">Skipped</div>
							</div>
							<div class="bg-red-50 rounded-lg p-4">
								<div class="text-2xl font-bold text-red-600">{folderUploadReport.failed}</div>
								<div class="text-sm text-red-600">Failed</div>
							</div>
						</div>

						<!-- Successful Uploads -->
						{#if folderUploadReport.successes.length > 0}
							<div class="mb-6">
								<h4 class="text-sm font-semibold text-gray-900 mb-2 text-green-600">
									✓ Successful ({folderUploadReport.successes.length})
								</h4>
								<div class="bg-green-50 border border-green-200 rounded-md p-4 max-h-48 overflow-y-auto">
									<ul class="space-y-1">
										{#each folderUploadReport.successes as item}
											<li class="text-sm text-green-800">
												{item.filename}
												{#if item.photoId}
													<span class="text-green-600"> (ID: {item.photoId.substring(0, 8)}...)</span>
												{/if}
											</li>
										{/each}
									</ul>
								</div>
							</div>
						{/if}

						<!-- Skipped Files -->
						{#if folderUploadReport.skippedItems.length > 0}
							<div class="mb-6">
								<h4 class="text-sm font-semibold text-gray-900 mb-2 text-yellow-600">
									⊘ Skipped ({folderUploadReport.skippedItems.length})
								</h4>
								<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 max-h-48 overflow-y-auto">
									<ul class="space-y-1">
										{#each folderUploadReport.skippedItems as item}
											<li class="text-sm text-yellow-800">
												{item.filename}
												<span class="text-yellow-600"> - {item.reason}</span>
											</li>
										{/each}
									</ul>
								</div>
							</div>
						{/if}

						<!-- Failed Uploads -->
						{#if folderUploadReport.failures.length > 0}
							<div class="mb-6">
								<h4 class="text-sm font-semibold text-gray-900 mb-2 text-red-600">
									✗ Failed ({folderUploadReport.failures.length})
								</h4>
								<div class="bg-red-50 border border-red-200 rounded-md p-4 max-h-48 overflow-y-auto">
									<ul class="space-y-1">
										{#each folderUploadReport.failures as item}
											<li class="text-sm text-red-800">
												{item.filename}
												<span class="text-red-600"> - {item.error}</span>
											</li>
										{/each}
									</ul>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- File Upload Area -->
		{#if uploadMode === 'files'}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
			<div
				role="button"
				tabindex="0"
				class="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors {isDragActive
					? 'border-blue-400 bg-blue-50'
					: 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}"
				on:dragover={handleDragOver}
				on:dragleave={handleDragLeave}
				on:drop={handleDrop}
				on:click={() => fileInput?.click()}
				on:keydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						fileInput?.click();
					}
				}}
			>
				<input
					bind:this={fileInput}
					type="file"
					accept="image/*"
					multiple
					class="hidden"
					on:change={(e) => handleFilesSelected((e.currentTarget as HTMLInputElement).files)}
				/>

				<div class="space-y-4">
					<div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
						<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
							/>
						</svg>
					</div>

					<div>
						<p class="text-lg font-medium text-gray-900">
							{isDragActive ? 'Drop photos here' : 'Drag & drop photos here'}
						</p>
						<p class="text-sm text-gray-500 mt-1">or click to select files</p>
					</div>

					<div class="text-xs text-gray-400">Supports: JPEG, PNG, GIF, BMP, WebP</div>
				</div>
			</div>
		</div>

		<!-- Upload Progress -->
		{#if uploads.length > 0}
			<div class="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Upload Progress</h3>

				<div class="space-y-4">
					{#each uploads as upload, index}
						<div class="flex items-center space-x-4">
							<div class="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
								{#if upload.status === 'success'}
									<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
								{:else if upload.status === 'skipped'}
									<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
										/>
									</svg>
								{:else if upload.status === 'error'}
									<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								{:else}
									<svg
										class="w-6 h-6 text-blue-600 animate-spin"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										/>
									</svg>
								{/if}
							</div>

							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-gray-900 truncate">{upload.file.name}</p>
								<p class="text-xs text-gray-500">
									{(upload.file.size / 1024 / 1024).toFixed(2)} MB
								</p>
								{#if upload.status === 'skipped' && upload.reason}
									<p class="text-xs text-yellow-600 mt-1 truncate" title={upload.reason}>
										{upload.reason}
									</p>
								{:else if upload.status === 'error' && upload.error}
									<p class="text-xs text-red-600 mt-1 truncate" title={upload.error}>
										{upload.error}
									</p>
								{/if}
							</div>

							<div class="flex-shrink-0 w-24">
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
									class="h-2 rounded-full transition-all duration-300 {upload.status === 'success'
										? 'bg-green-600'
										: upload.status === 'skipped'
											? 'bg-yellow-600'
											: upload.status === 'error'
												? 'bg-red-600'
												: 'bg-blue-600'}"
										style="width: {upload.progress}%"
									></div>
								</div>
							</div>

							<div class="flex-shrink-0 w-16 text-right">
								<span
									class="text-xs font-medium {upload.status === 'success'
										? 'text-green-600'
										: upload.status === 'skipped'
											? 'text-yellow-600'
											: upload.status === 'error'
												? 'text-red-600'
												: 'text-blue-600'}"
								>
									{upload.status === 'success'
										? 'Done'
										: upload.status === 'skipped'
											? 'Skipped'
											: upload.status === 'error'
												? 'Error'
												: `${upload.progress}%`}
								</span>
							</div>
						</div>
					{/each}
				</div>

				{#if hasErrors}
					<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
						<p class="text-sm text-red-600">Some uploads failed. Please try again.</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- File Upload Report -->
		{#if fileUploadReport && allUploadsComplete}
			<div class="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Upload Report</h3>
				
				<!-- Summary -->
				<div class="grid grid-cols-4 gap-4 mb-6">
					<div class="bg-gray-50 rounded-lg p-4">
						<div class="text-2xl font-bold text-gray-900">{fileUploadReport.total}</div>
						<div class="text-sm text-gray-600">Total Files</div>
					</div>
					<div class="bg-green-50 rounded-lg p-4">
						<div class="text-2xl font-bold text-green-600">{fileUploadReport.successful}</div>
						<div class="text-sm text-green-600">Successful</div>
					</div>
					<div class="bg-yellow-50 rounded-lg p-4">
						<div class="text-2xl font-bold text-yellow-600">{fileUploadReport.skipped}</div>
						<div class="text-sm text-yellow-600">Skipped</div>
					</div>
					<div class="bg-red-50 rounded-lg p-4">
						<div class="text-2xl font-bold text-red-600">{fileUploadReport.failed}</div>
						<div class="text-sm text-red-600">Failed</div>
					</div>
				</div>

				<!-- Successful Uploads -->
				{#if fileUploadReport.successes.length > 0}
					<div class="mb-6">
						<h4 class="text-sm font-semibold mb-2 text-green-600">
							✓ Successful ({fileUploadReport.successes.length})
						</h4>
						<div class="bg-green-50 border border-green-200 rounded-md p-4 max-h-48 overflow-y-auto">
							<ul class="space-y-1">
								{#each fileUploadReport.successes as item}
									<li class="text-sm text-green-800">
										{item.filename}
										{#if item.photoId}
											<span class="text-green-600"> (ID: {item.photoId.substring(0, 8)}...)</span>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}

				<!-- Skipped Files -->
				{#if fileUploadReport.skippedItems.length > 0}
					<div class="mb-6">
						<h4 class="text-sm font-semibold mb-2 text-yellow-600">
							⊘ Skipped ({fileUploadReport.skippedItems.length})
						</h4>
						<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 max-h-48 overflow-y-auto">
							<ul class="space-y-1">
								{#each fileUploadReport.skippedItems as item}
									<li class="text-sm text-yellow-800">
										{item.filename}
										<span class="text-yellow-600"> - {item.reason}</span>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}

				<!-- Failed Uploads -->
				{#if fileUploadReport.failures.length > 0}
					<div class="mb-6">
						<h4 class="text-sm font-semibold mb-2 text-red-600">
							✗ Failed ({fileUploadReport.failures.length})
						</h4>
						<div class="bg-red-50 border border-red-200 rounded-md p-4 max-h-48 overflow-y-auto">
							<ul class="space-y-1">
								{#each fileUploadReport.failures as item}
									<li class="text-sm text-red-800">
										{item.filename}
										<span class="text-red-600"> - {item.error}</span>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}
			</div>
		{/if}
		{/if}

		<!-- Action Buttons -->
		{#if allUploadsComplete}
			<div class="mt-8 flex justify-end space-x-3">
				<button
					on:click={() => goto(albumId ? `/admin/albums/${albumId}` : '/admin')}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
				>
					{albumId ? 'Back to Album' : 'Upload More Photos'}
				</button>
				<button
					on:click={handleFinish}
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
				>
					{albumId ? 'Go to Album' : 'Go to Photos'}
				</button>
			</div>
		{/if}
	</div>
