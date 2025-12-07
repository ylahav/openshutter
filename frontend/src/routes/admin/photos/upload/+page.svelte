<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$stores/language';

  export const data = undefined as any; // From +layout.server.ts, not used in this component

	interface UploadProgress {
		file: File;
		progress: number;
		status: 'uploading' | 'success' | 'error';
		error?: string;
	}

	let albumId: string | null = null;
	let albumName = '';
	let uploads: UploadProgress[] = [];
	let isUploading = false;
	let error: string | null = null;
	let isDragActive = false;
	let fileInput: HTMLInputElement | null = null;

	onMount(() => {
		albumId = $page.url.searchParams.get('albumId');
		if (albumId) {
			fetchAlbumName();
		}
	});

	async function fetchAlbumName() {
		if (!albumId) return;
		try {
			const response = await fetch(`/api/albums/${albumId}`);
			if (response.ok) {
				const album = await response.json();
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

	function handleFilesSelected(files: FileList | null) {
		if (!files || files.length === 0) return;
		if (!albumId) {
			error = 'No album selected for upload';
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

		Array.from(files).forEach((file, index) => {
			uploadFile(file, uploads.length - files.length + index);
		});
	}

	async function uploadFile(file: File, uploadIndex: number) {
		if (!albumId) return;

		const formData = new FormData();
		formData.append('file', file);
		formData.append('albumId', albumId);

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
				if (xhr.status === 200) {
					const response = JSON.parse(xhr.responseText);
					if (response.success || response._id) {
						uploads = uploads.map((upload, index) =>
							index === uploadIndex ? { ...upload, status: 'success', progress: 100 } : upload
						);
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
			console.error('Upload error:', error);
			uploads = uploads.map((upload, index) =>
				index === uploadIndex ? { ...upload, status: 'error', error: 'Upload failed' } : upload
			);
			checkAllComplete();
		}
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

	function handleFinish() {
		if (albumId) {
			goto(`/admin/albums/${albumId}`);
		} else {
			goto('/admin');
		}
	}

	const allUploadsComplete = uploads.length > 0 && uploads.every((upload) => upload.status !== 'uploading');
	const hasErrors = uploads.some((upload) => upload.status === 'error');
</script>

<svelte:head>
	<title>Upload Photos - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<Header />

	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Upload Photos</h1>
				{#if albumName}
					<p class="mt-2 text-gray-600">
						Uploading to album: <span class="font-medium">{albumName}</span>
					</p>
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

		<!-- Error Message -->
		{#if error}
			<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
				<p class="text-sm text-red-600">{error}</p>
			</div>
		{/if}

		<!-- Upload Area -->
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
							</div>

							<div class="flex-shrink-0 w-24">
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
										class="h-2 rounded-full transition-all duration-300 {upload.status === 'success'
											? 'bg-green-600'
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
										: upload.status === 'error'
											? 'text-red-600'
											: 'text-blue-600'}"
								>
									{upload.status === 'success'
										? 'Done'
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

	<Footer />
</div>
