<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$stores/language';
	import type { UploadReport } from '$types';
	import AlertModal from '$lib/components/AlertModal.svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	function setWebkitDirectory(node: HTMLInputElement) {
		(node as any).webkitdirectory = true;
		return {
			destroy() {}
		};
	}

	export let data: PageData;

	interface UploadProgress {
		file: File;
		progress: number;
		status: 'uploading' | 'success' | 'error' | 'skipped';
		error?: string;
		reason?: string;
		photoId?: string;
		progress100Timestamp?: number; // Timestamp when progress reached 100%
	}

	let albumId: string | null = null;
	let returnTo: string | null = null;
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
		returnTo = $page.url.searchParams.get('returnTo');
		if (albumId) {
			fetchAlbumName();
		}
	});

	async function fetchAlbumName() {
		if (!albumId) return;
		try {
			// Owners use /api/albums/:id (access control); admins use /api/admin/albums/:id
			const apiUrl = data?.user?.role === 'owner'
				? `/api/albums/${albumId}`
				: `/api/admin/albums/${albumId}`;
			const response = await fetch(apiUrl);
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
			logger.error('Failed to fetch album name:', error);
		}
	}

	async function showError(title: string, message: string) {
		errorModalTitle = title;
		errorModalMessage = message;
		showErrorModal = false; // Reset first to ensure reactivity
		await tick(); // Wait for reactivity
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
			let completionTimeout: ReturnType<typeof setTimeout> | null = null;
			let hasCompleted = false;

			// Track upload progress
			xhr.upload.addEventListener('progress', (event) => {
				if (event.lengthComputable) {
					const progress = Math.round((event.loaded / event.total) * 100);
					uploads = uploads.map((upload, index) =>
						index === uploadIndex ? { ...upload, progress } : upload
					);
					
					// If progress reaches 100%, set up a timeout fallback
					if (progress >= 100 && !hasCompleted) {
						// Mark timestamp when progress reached 100%
						uploads = uploads.map((upload, idx) =>
							idx === uploadIndex && !upload.progress100Timestamp
								? { ...upload, progress100Timestamp: Date.now() }
								: upload
						);
						
						// Clear any existing timeout
						if (completionTimeout) {
							clearTimeout(completionTimeout);
						}
						
						// Set a timeout to check if response hasn't arrived
						completionTimeout = setTimeout(() => {
							const currentUpload = uploads[uploadIndex];
							if (currentUpload && currentUpload.status === 'uploading') {
								logger.warn(`[Photo Upload] Timeout fallback for ${file.name} - checking XHR state:`, {
									readyState: xhr.readyState,
									status: xhr.status,
									statusText: xhr.statusText
								});
								
								// Check XHR readyState (4 = DONE)
								if (xhr.readyState === 4) {
									// Request is done, but we haven't received the load event
									// Try to process the response manually
									if (xhr.status >= 200 && xhr.status < 300) {
										try {
											const responseText = xhr.responseText || '';
											if (responseText) {
												const response = JSON.parse(responseText);
												if (response.success || response._id || response.photo?._id || !response.error) {
													uploads = uploads.map((upload, idx) =>
														idx === uploadIndex
															? {
																	...upload,
																	status: 'success',
																	progress: 100,
																	photoId: response._id || response.photo?._id
																}
															: upload
													);
													hasCompleted = true;
													checkAllComplete();
													return;
												}
											}
										} catch (e) {
											logger.error(`[Photo Upload] Timeout fallback parse error for ${file.name}:`, e);
										}
									}
									// If we can't parse or it's an error, mark as success anyway (upload completed)
									logger.warn(`[Photo Upload] Timeout fallback: marking ${file.name} as success (upload completed)`);
									uploads = uploads.map((upload, idx) =>
										idx === uploadIndex
											? { ...upload, status: 'success', progress: 100 }
											: upload
									);
									hasCompleted = true;
									checkAllComplete();
								} else {
									// Request not done yet, wait a bit more
									logger.debug(`[Photo Upload] ${file.name} still processing (readyState: ${xhr.readyState}), waiting...`);
								}
							}
						}, 5000); // 5 second timeout after 100% progress
					}
				}
			});

			// Handle upload completion
			xhr.addEventListener('load', () => {
				// Clear timeout if it exists
				if (completionTimeout) {
					clearTimeout(completionTimeout);
					completionTimeout = null;
				}
				
				// Prevent duplicate processing - but allow load event to always process (it's the primary handler)
				if (hasCompleted) {
					logger.debug(`[Photo Upload] Load event for ${file.name} already processed by readystatechange, but processing anyway to ensure completion`);
					// Don't return - process anyway to ensure status is set correctly
				}
				hasCompleted = true;
				
				if (xhr.status >= 200 && xhr.status < 300) {
					try {
						// Handle empty response
						if (!xhr.responseText || xhr.responseText.trim() === '') {
							logger.warn(`[Photo Upload] Empty response for ${file.name}, treating as success (status ${xhr.status})`);
							uploads = uploads.map((upload, index) =>
								index === uploadIndex
									? {
											...upload,
											status: 'success',
											progress: 100
										}
									: upload
							);
							checkAllComplete();
							return;
						}

						const response = JSON.parse(xhr.responseText);
						logger.debug(`[Photo Upload] Response for ${file.name}:`, {
							status: xhr.status,
							hasSuccess: !!response.success,
							hasId: !!response._id,
							hasSkipped: !!response.skipped,
							responseKeys: Object.keys(response)
						});

						// Check if photo was skipped (duplicate)
						if (response.skipped) {
							logger.debug(`[Photo Upload] Marking ${file.name} as skipped`);
							const updatedUploads = uploads.map((upload, index) =>
								index === uploadIndex
									? {
											...upload,
											status: 'skipped' as const,
											progress: 100,
											reason: response.reason || response.message || 'Photo already exists'
										}
									: upload
							);
							uploads = updatedUploads;
							logger.debug(`[Photo Upload] Status updated. Upload ${uploadIndex} status:`, updatedUploads[uploadIndex]?.status);
							checkAllComplete();
						} else if (response.success || response._id || response.photo?._id) {
							// Success: response has success flag, _id at root, or _id nested in photo
							logger.debug(`[Photo Upload] Marking ${file.name} as success`);
							const updatedUploads = uploads.map((upload, index) =>
								index === uploadIndex
									? {
											...upload,
											status: 'success' as const,
											progress: 100,
											photoId: response._id || response.photo?._id || response.id
										}
									: upload
							);
							uploads = updatedUploads;
							logger.debug(`[Photo Upload] Status updated. Upload ${uploadIndex} status:`, updatedUploads[uploadIndex]?.status);
							checkAllComplete();
						} else {
							// If we got a 2xx response but no clear success indicator, check if it's an error
							const errorMsg = response.error || response.message || 'Upload completed but response format unexpected';
							logger.warn(`[Photo Upload] Unexpected response format for ${file.name}:`, response);
							
							// If there's an explicit error, mark as error; otherwise treat as success (2xx = success)
							if (response.error) {
								uploads = uploads.map((upload, index) =>
									index === uploadIndex
										? { ...upload, status: 'error', error: errorMsg, progress: 100 }
										: upload
								);
							} else {
								// 2xx status without error - treat as success
								logger.debug(`[Photo Upload] Treating 2xx response as success for ${file.name}`);
								uploads = uploads.map((upload, index) =>
									index === uploadIndex
										? {
												...upload,
												status: 'success',
												progress: 100
											}
										: upload
								);
							}
						}
					} catch (parseError) {
						logger.error(`[Photo Upload] Failed to parse response for ${file.name}:`, {
							error: parseError,
							status: xhr.status,
							responseText: xhr.responseText?.substring(0, 200)
						});
						// If we got a 2xx status but can't parse, treat as success (upload likely completed)
						if (xhr.status >= 200 && xhr.status < 300) {
							logger.warn(`[Photo Upload] 2xx status with unparseable response for ${file.name}, treating as success`);
							uploads = uploads.map((upload, index) =>
								index === uploadIndex
									? { ...upload, status: 'success', progress: 100 }
									: upload
							);
						} else {
							uploads = uploads.map((upload, index) =>
								index === uploadIndex
									? { ...upload, status: 'error', error: 'Invalid server response', progress: 100 }
									: upload
							);
						}
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
					
					logger.error(`[Photo Upload] Upload failed for ${file.name}:`, {
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
				// Clear timeout if it exists
				if (completionTimeout) {
					clearTimeout(completionTimeout);
					completionTimeout = null;
				}
				hasCompleted = true;
				
				logger.error(`[Photo Upload] Network error for ${file.name}:`, {
					event: event,
					readyState: xhr.readyState,
					status: xhr.status,
					statusText: xhr.statusText,
					url: xhr.responseURL || '/api/photos/upload'
				});
				uploads = uploads.map((upload, index) =>
					index === uploadIndex ? { ...upload, status: 'error', error: 'Network error - check console for details', progress: 100 } : upload
				);
				checkAllComplete();
			});

			// Handle upload abort
			xhr.addEventListener('abort', () => {
				// Clear timeout if it exists
				if (completionTimeout) {
					clearTimeout(completionTimeout);
					completionTimeout = null;
				}
				hasCompleted = true;
				
				logger.warn(`[Photo Upload] Upload aborted for ${file.name}`);
				uploads = uploads.map((upload, index) =>
					index === uploadIndex ? { ...upload, status: 'error', error: 'Upload cancelled', progress: 100 } : upload
				);
				checkAllComplete();
			});

			// Backup: Handle readystatechange as fallback (in case load event doesn't fire)
			// Note: This should only run if load event doesn't fire within a reasonable time
			let readystatechangeProcessed = false;
			xhr.addEventListener('readystatechange', () => {
				if (xhr.readyState === 4 && !hasCompleted && !readystatechangeProcessed) {
					// Wait a bit to see if load event fires first
					setTimeout(() => {
						if (!hasCompleted && !readystatechangeProcessed) {
							readystatechangeProcessed = true;
							// Request is complete, but load event hasn't fired
							logger.warn(`[Photo Upload] readystatechange fallback for ${file.name} (status: ${xhr.status})`);
							
							// Clear timeout
							if (completionTimeout) {
								clearTimeout(completionTimeout);
								completionTimeout = null;
							}
							
							hasCompleted = true;
							if (xhr.status >= 200 && xhr.status < 300) {
								try {
									const responseText = xhr.responseText || '';
									if (responseText) {
										const response = JSON.parse(responseText);
										if (response.skipped) {
											logger.debug(`[Photo Upload] readystatechange: Marking ${file.name} as skipped`);
											uploads = uploads.map((upload, idx) =>
												idx === uploadIndex
													? {
															...upload,
															status: 'skipped',
															progress: 100,
															reason: response.reason || response.message || 'Photo already exists'
														}
													: upload
											);
											checkAllComplete();
										} else if (response.success || response._id || response.photo?._id || !response.error) {
											logger.debug(`[Photo Upload] readystatechange: Marking ${file.name} as success`);
											uploads = uploads.map((upload, idx) =>
												idx === uploadIndex
													? {
															...upload,
															status: 'success',
															progress: 100,
															photoId: response._id || response.photo?._id
														}
													: upload
											);
											checkAllComplete();
										} else {
											uploads = uploads.map((upload, idx) =>
												idx === uploadIndex
													? { ...upload, status: 'error', error: response.error || 'Upload failed', progress: 100 }
													: upload
											);
										}
									} else {
										// Empty response but 2xx status - treat as success
										uploads = uploads.map((upload, idx) =>
											idx === uploadIndex
												? { ...upload, status: 'success', progress: 100 }
												: upload
										);
									}
								} catch (e) {
									// Parse error but 2xx status - treat as success
									logger.warn(`[Photo Upload] readystatechange fallback: parse error for ${file.name}, treating as success`);
									uploads = uploads.map((upload, idx) =>
										idx === uploadIndex
											? { ...upload, status: 'success', progress: 100 }
											: upload
									);
								}
							} else {
								// Non-2xx status
								uploads = uploads.map((upload, idx) =>
									idx === uploadIndex
										? { ...upload, status: 'error', error: `Upload failed (${xhr.status})`, progress: 100 }
										: upload
								);
							}
							checkAllComplete();
						}
					}, 200); // Wait 200ms to let load event fire first if it's going to
				}
			});

			xhr.open('POST', '/api/photos/upload');
			logger.debug(`[Photo Upload] Starting upload for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) to album ${albumId}`);
			xhr.send(formData);
		} catch (error) {
			logger.error(`[Photo Upload] Exception during upload setup for ${file.name}:`, error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			uploads = uploads.map((upload, index) =>
				index === uploadIndex ? { ...upload, status: 'error', error: `Upload failed: ${errorMessage}` } : upload
			);
			checkAllComplete();
		}
	}

	function checkAllComplete() {
		logger.debug(`[Photo Upload] checkAllComplete called. Uploads:`, uploads.map(u => ({ name: u.file.name, status: u.status, progress: u.progress })));
		
		// Check for stuck uploads (100% progress but still 'uploading' status for > 10 seconds)
		const now = Date.now();
		let hasStuckUploads = false;
		uploads = uploads.map((upload) => {
			if (upload.status === 'uploading' && upload.progress >= 100 && upload.progress100Timestamp) {
				const stuckDuration = now - upload.progress100Timestamp;
				if (stuckDuration > 10000) { // 10 seconds
					logger.warn(`[Photo Upload] Detected stuck upload: ${upload.file.name} (stuck for ${stuckDuration}ms), marking as success`);
					hasStuckUploads = true;
					return { ...upload, status: 'success' as const };
				}
			}
			return upload;
		});
		
		const allComplete = uploads.length > 0 && uploads.every((upload) => upload.status !== 'uploading');
		const allCompleteReactive = uploads.length > 0 && uploads.every((upload) => upload.status !== 'uploading');
		logger.debug(`[Photo Upload] checkAllComplete: allComplete=${allComplete}, uploads.length=${uploads.length}, allCompleteReactive=${allCompleteReactive}`);
		logger.debug(`[Photo Upload] Upload statuses:`, uploads.map(u => ({ name: u.file.name, status: u.status })));
		
		if (allComplete) {
			logger.debug(`[Photo Upload] All uploads complete! Setting isUploading=false and generating report`);
			isUploading = false;
			generateFileUploadReport();
			logger.debug(`[Photo Upload] After generateFileUploadReport: fileUploadReport=`, fileUploadReport);
			logger.debug(`[Photo Upload] allUploadsComplete reactive value:`, allUploadsComplete);
			// If we're in folder mode and uploading, generate folder report too
			if (uploadMode === 'folder' && isUploadingFolder) {
				handleFolderUploadComplete();
			}
		} else if (hasStuckUploads) {
			// If we fixed stuck uploads, check again
			setTimeout(() => checkAllComplete(), 100);
		}
	}

	function generateFileUploadReport() {
		logger.debug(`[Photo Upload] generateFileUploadReport called. uploads.length=${uploads.length}`);
		if (uploads.length === 0) {
			fileUploadReport = null;
			logger.debug(`[Photo Upload] No uploads, setting report to null`);
			return;
		}

		const successes = uploads.filter((u) => u.status === 'success');
		const skipped = uploads.filter((u) => u.status === 'skipped');
		const failures = uploads.filter((u) => u.status === 'error');

		logger.debug(`[Photo Upload] Report stats: successes=${successes.length}, skipped=${skipped.length}, failures=${failures.length}`);

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
		logger.debug(`[Photo Upload] Report generated:`, fileUploadReport);
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
		if (returnTo) {
			goto(returnTo);
		} else if (albumId) {
			// Owner: go to owner album; admin: go to admin album
			goto(data?.user?.role === 'owner' ? `/owner/albums/${albumId}` : `/admin/albums/${albumId}`);
		} else {
			goto(data?.user?.role === 'owner' ? '/owner/albums' : '/admin');
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
			<a href="/admin" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium">
				← Back to Admin
			</a>
			<div class="flex space-x-3">
				<button
					on:click={() => {
						if (returnTo) goto(returnTo);
						else if (albumId) goto(data?.user?.role === 'owner' ? `/owner/albums/${albumId}` : `/admin/albums/${albumId}`);
						else goto(data?.user?.role === 'owner' ? '/owner/albums' : '/admin');
					}}
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
				{#if isUploadingFolder && uploads.length > 0 && isUploading}
					{@const folderUploads = uploads.filter(u => {
						const webkitPath = (u.file as any).webkitRelativePath || '';
						return webkitPath && webkitPath.includes(selectedFolderName);
					})}
					{@const totalFiles = folderUploads.length}
					{@const completedFiles = folderUploads.filter(u => u.status === 'success' || u.status === 'skipped' || u.status === 'error').length}
					{@const uploadingFiles = folderUploads.filter(u => u.status === 'uploading').length}
					{@const overallProgress = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0}
					{@const currentFileIndex = completedFiles + 1}
					
					<div class="mt-8 border-t border-gray-200 pt-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Upload Progress</h3>
						<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
							<div class="flex items-center justify-between mb-4">
								<div class="flex items-center gap-3">
									<svg class="w-6 h-6 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
									</svg>
									<div>
										<p class="text-sm font-medium text-gray-900">
											{#if uploadingFiles > 0}
												Uploading {currentFileIndex} of {totalFiles} photos
											{:else}
												Processing {completedFiles} of {totalFiles} photos
											{/if}
										</p>
										<p class="text-sm text-gray-600 mt-1">
											Uploaded {completedFiles} of {totalFiles} photos ({overallProgress}%)
										</p>
									</div>
								</div>
								<div class="text-right">
									<span class="text-2xl font-bold text-blue-600">{overallProgress}%</span>
								</div>
							</div>
							<div class="w-full bg-gray-200 rounded-full h-3">
								<div
									class="h-3 rounded-full bg-blue-600 transition-all duration-300"
									style="width: {overallProgress}%"
								></div>
							</div>
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
								<h4 class="text-sm font-semibold text-green-600 mb-2">
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
								<h4 class="text-sm font-semibold text-yellow-600 mb-2">
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
								<h4 class="text-sm font-semibold text-red-600 mb-2">
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
		{#if uploads.length > 0 && !isUploadingFolder && isUploading}
			{@const totalFiles = uploads.length}
			{@const completedFiles = uploads.filter(u => u.status === 'success' || u.status === 'skipped' || u.status === 'error').length}
			{@const uploadingFiles = uploads.filter(u => u.status === 'uploading').length}
			{@const overallProgress = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0}
			{@const currentFileIndex = completedFiles + 1}
			
			<div class="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Upload Progress</h3>
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center gap-3">
							<svg class="w-6 h-6 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							<div>
								<p class="text-sm font-medium text-gray-900">
									{#if uploadingFiles > 0}
										Uploading {currentFileIndex} of {totalFiles} photos
									{:else}
										Processing {completedFiles} of {totalFiles} photos
									{/if}
								</p>
								<p class="text-sm text-gray-600 mt-1">
									Uploaded {completedFiles} of {totalFiles} photos ({overallProgress}%)
								</p>
							</div>
						</div>
						<div class="text-right">
							<span class="text-2xl font-bold text-blue-600">{overallProgress}%</span>
						</div>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-3">
						<div
							class="h-3 rounded-full bg-blue-600 transition-all duration-300"
							style="width: {overallProgress}%"
						></div>
					</div>
				</div>

				{#if hasErrors}
					<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
						<p class="text-sm text-red-600">Some uploads failed. Please try again.</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- File Upload Report -->
		{#if fileUploadReport}
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
					on:click={() => {
						if (returnTo) goto(returnTo);
						else if (albumId) goto(data?.user?.role === 'owner' ? `/owner/albums/${albumId}` : `/admin/albums/${albumId}`);
						else goto(data?.user?.role === 'owner' ? '/owner/albums' : '/admin');
					}}
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
