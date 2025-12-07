<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$stores/language';

	interface TemplateAlbum {
		_id: string;
		name: string | Record<string, string>;
		[key: string]: any;
	}

	interface UploadProgress {
		filename: string;
		progress: number;
		status: 'pending' | 'uploading' | 'completed' | 'error';
		error?: string;
	}

	export let albums: TemplateAlbum[] = [];
	export let selectedAlbumId: string = '';
	export let returnTo: string | null = null;

	let uploads: UploadProgress[] = [];
	let isUploading = false;
	let title = '';
	let description = '';
	let tags = '';
	let isDragActive = false;
	let fileInput: HTMLInputElement | null = null;

	// Preselect album from query param
	onMount(() => {
		const albumIdFromQuery = $page.url.searchParams.get('albumId');
		if (albumIdFromQuery) {
			selectedAlbumId = albumIdFromQuery;
		}
		const returnToParam = $page.url.searchParams.get('returnTo');
		if (returnToParam) {
			returnTo = returnToParam;
		}
	});

	async function handleFilesSelected(files: FileList | null) {
		if (!files || files.length === 0) return;

		isUploading = true;

		// Initialize upload progress for each file
		const newUploads: UploadProgress[] = Array.from(files).map((file) => ({
			filename: file.name,
			progress: 0,
			status: 'pending'
		}));

		uploads = [...uploads, ...newUploads];

		// Upload each file
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const uploadIndex = uploads.length - files.length + i;

			try {
				// Update status to uploading
				uploads = uploads.map((upload, index) =>
					index === uploadIndex ? { ...upload, status: 'uploading' } : upload
				);

				// Create form data
				const formData = new FormData();
				formData.append('file', file);
				formData.append('albumId', selectedAlbumId);
				formData.append('title', title || file.name);
				formData.append('description', description);
				formData.append('tags', tags);

				// Upload file with progress tracking
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
					if (xhr.status === 200) {
						const response = JSON.parse(xhr.responseText);
						if (response.success || response._id) {
							uploads = uploads.map((upload, index) =>
								index === uploadIndex ? { ...upload, status: 'completed', progress: 100 } : upload
							);

							// If this is the last file and we have a returnTo URL, redirect after a short delay
							if (i === files.length - 1 && returnTo) {
								setTimeout(() => {
									window.location.href = returnTo;
								}, 1500);
							}
						} else {
							uploads = uploads.map((upload, index) =>
								index === uploadIndex
									? { ...upload, status: 'error', error: response.error || 'Upload failed' }
									: upload
							);
						}
					} else {
						uploads = uploads.map((upload, index) =>
							index === uploadIndex ? { ...upload, status: 'error', error: 'Upload failed' } : upload
						);
					}
					checkAllComplete();
				});

				// Handle upload error
				xhr.addEventListener('error', () => {
					uploads = uploads.map((upload, index) =>
						index === uploadIndex ? { ...upload, status: 'error', error: 'Network error' } : upload
					);
					checkAllComplete();
				});

				xhr.open('POST', '/api/photos/upload');
				xhr.send(formData);
			} catch (error) {
				console.error(`Upload failed for ${file.name}:`, error);
				uploads = uploads.map((upload, index) =>
					index === uploadIndex
						? {
								...upload,
								status: 'error',
								error: error instanceof Error ? error.message : 'Unknown error'
							}
						: upload
				);
				checkAllComplete();
			}
		}

		isUploading = false;
	}

	function checkAllComplete() {
		const allComplete = uploads.length > 0 && uploads.every((upload) => upload.status !== 'uploading');
		if (allComplete) {
			isUploading = false;
		}
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

	function removeUpload(index: number) {
		uploads = uploads.filter((_, i) => i !== index);
	}

	function clearForm() {
		title = '';
		description = '';
		tags = '';
		selectedAlbumId = '';
		uploads = [];
	}

	function validateFile(file: File): boolean {
		const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
		const maxSize = 100 * 1024 * 1024; // 100MB

		if (!validTypes.includes(file.type)) {
			return false;
		}

		if (file.size > maxSize) {
			return false;
		}

		return true;
	}

	function handleFileInputChange(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const files = target.files;
		if (files) {
			// Filter valid files
			const validFiles = Array.from(files).filter(validateFile);
			if (validFiles.length !== files.length) {
				alert('Some files were rejected. Only image files under 100MB are allowed.');
			}
			if (validFiles.length > 0) {
				// Create a FileList-like object
				const dataTransfer = new DataTransfer();
				validFiles.forEach((file) => dataTransfer.items.add(file));
				handleFilesSelected(dataTransfer.files);
			}
		}
	}
</script>

<div class="max-w-4xl mx-auto p-6">
	<div class="bg-white rounded-lg shadow-sm border border-gray-200">
		<div class="px-6 py-4 border-b border-gray-200">
			<h2 class="text-xl font-semibold text-gray-900">Upload Photos</h2>
			<p class="text-sm text-gray-600">Drag and drop your photos here or click to browse</p>
		</div>

		<div class="p-6 space-y-6">
			<!-- Upload Form -->
			<div class="space-y-6">
				<h3 class="text-lg font-medium text-gray-900">Upload Details</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="album" class="block text-sm font-medium text-gray-700 mb-2"> Album </label>
						<select
							id="album"
							bind:value={selectedAlbumId}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Select an album</option>
							{#each albums as album}
								<option value={album._id}>
									{typeof album.name === 'string'
										? album.name
										: MultiLangUtils.getTextValue(album.name, $currentLanguage) || 'Album'}
								</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="title" class="block text-sm font-medium text-gray-700 mb-2"> Title (Optional) </label>
						<input
							id="title"
							type="text"
							bind:value={title}
							placeholder="Enter photo title"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>

				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
						Description (Optional)
					</label>
					<textarea
						id="description"
						bind:value={description}
						placeholder="Enter photo description"
						rows={3}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					></textarea>
				</div>

				<div>
					<label for="tags" class="block text-sm font-medium text-gray-700 mb-2"> Tags (Optional) </label>
					<input
						id="tags"
						type="text"
						bind:value={tags}
						placeholder="Enter tags separated by commas"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<p class="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
				</div>
			</div>

			<!-- Drop Zone -->
			<div
				class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors {isDragActive
					? 'border-blue-500 bg-blue-50'
					: 'border-gray-300 hover:border-gray-400'} {isUploading ? 'opacity-50 cursor-not-allowed' : ''}"
				on:dragover={handleDragOver}
				on:dragleave={handleDragLeave}
				on:drop={handleDrop}
				on:click={() => !isUploading && fileInput?.click()}
				role="button"
				tabindex="0"
				on:keydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						if (!isUploading) {
							fileInput?.click();
						}
					}
				}}
			>
				<input
					bind:this={fileInput}
					type="file"
					accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp"
					multiple
					class="hidden"
					on:change={handleFileInputChange}
					disabled={isUploading}
				/>

				<div class="space-y-4">
					<div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
						<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
					</div>
					<div>
						<p class="text-lg font-medium text-gray-900">
							{isDragActive ? 'Drop files here' : 'Drag & drop photos here'}
						</p>
						<p class="text-sm text-gray-500">or click to select files</p>
					</div>
					<div class="text-xs text-gray-400">Supports: JPEG, PNG, GIF, WebP, BMP (Max 100MB per file)</div>
				</div>
			</div>

			<!-- Upload Progress -->
			{#if uploads.length > 0}
				<div class="mt-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-medium text-gray-900">Upload Progress</h3>
						<button
							on:click={clearForm}
							class="text-sm text-gray-500 hover:text-gray-700"
							disabled={isUploading}
						>
							Clear All
						</button>
					</div>

					<div class="space-y-3">
						{#each uploads as upload, index (upload.filename + index)}
							<div
								transition:fly={{ y: 20, duration: 300 }}
								class="bg-gray-50 rounded-lg p-4"
							>
								<div class="flex items-center justify-between mb-2">
									<span class="text-sm font-medium text-gray-900 truncate">
										{upload.filename}
									</span>
									<button
										on:click={() => removeUpload(index)}
										class="text-gray-400 hover:text-gray-600"
										disabled={upload.status === 'uploading'}
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>

								<div class="flex items-center space-x-3">
									<div class="flex-1 bg-gray-200 rounded-full h-2">
										<div
											class="h-2 rounded-full transition-all duration-300 {upload.status === 'completed'
												? 'bg-green-500'
												: upload.status === 'error'
													? 'bg-red-500'
													: upload.status === 'uploading'
														? 'bg-blue-500'
														: 'bg-gray-300'}"
											style="width: {upload.progress}%"
										/>
									</div>

									<span class="text-sm text-gray-500 min-w-[60px]">
										{upload.status === 'completed'
											? '100%'
											: upload.status === 'error'
												? 'Error'
												: upload.status === 'uploading'
													? `${upload.progress}%`
													: 'Pending'}
									</span>
								</div>

								{#if upload.status === 'error' && upload.error}
									<p class="text-sm text-red-600 mt-2">{upload.error}</p>
								{/if}

								{#if upload.status === 'completed'}
									<p class="text-sm text-green-600 mt-2">Upload successful!</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Upload Status -->
			{#if isUploading}
				<div class="mt-4 text-center">
					<div class="inline-flex items-center space-x-2 text-blue-600">
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
						<span>Uploading photos...</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
