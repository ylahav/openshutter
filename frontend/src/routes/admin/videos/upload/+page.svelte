<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$stores/language';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimarySm, adminBtnSecondary, adminRingPrimary } from '$lib/admin/admin-cerberus';
	import { logger } from '$lib/utils/logger';

	interface VideoMetadata {
		duration?: number;
		width?: number;
		height?: number;
	}

	let albumId: string | null = $state(null);
	let returnTo: string | null = $state(null);
	let albumName = $state('');
	let fileInput: HTMLInputElement | null = $state(null);
	let selectedFile: File | null = $state(null);
	let metadata: VideoMetadata | null = $state(null);
	let progress = $state(0);
	let isUploading = $state(false);
	let error: string | null = $state(null);

	const MAX_SIZE = 500 * 1024 * 1024; // 500MB

	onMount(() => {
		albumId = $page.url.searchParams.get('albumId');
		returnTo = $page.url.searchParams.get('returnTo');
		if (albumId) fetchAlbumName();
	});

	async function fetchAlbumName() {
		if (!albumId) return;
		try {
			const res = await fetch(`/api/admin/albums/${albumId}`);
			if (!res.ok) return;
			const result = await res.json();
			const album = result.data || result;
			const name = album.name;
			albumName =
				typeof name === 'string'
					? name
					: MultiLangUtils.getTextValue(name, $currentLanguage) || 'Album';
		} catch (err) {
			logger.error('Failed to fetch album name:', err);
		}
	}

	/**
	 * Read duration + intrinsic dimensions from the picked MP4 by loading it into a
	 * hidden `<video>`. Non-blocking: if the browser can't parse the file, we simply
	 * omit the fields (backend defaults them).
	 */
	function extractMetadata(file: File): Promise<VideoMetadata> {
		return new Promise((resolve) => {
			const url = URL.createObjectURL(file);
			const v = document.createElement('video');
			v.preload = 'metadata';
			const cleanup = () => {
				URL.revokeObjectURL(url);
				v.remove();
			};
			v.onloadedmetadata = () => {
				const out: VideoMetadata = {
					duration: Number.isFinite(v.duration) ? Math.round(v.duration) : undefined,
					width: v.videoWidth || undefined,
					height: v.videoHeight || undefined
				};
				cleanup();
				resolve(out);
			};
			v.onerror = () => {
				cleanup();
				resolve({});
			};
			v.src = url;
		});
	}

	async function handleFileSelected(files: FileList | null) {
		error = null;
		if (!files || files.length === 0) return;
		const file = files[0];
		if (file.type !== 'video/mp4') {
			error = `Only MP4 videos are supported (got ${file.type || 'unknown'}).`;
			return;
		}
		if (file.size > MAX_SIZE) {
			error = `File is ${(file.size / 1024 / 1024).toFixed(1)}MB — maximum is ${MAX_SIZE / 1024 / 1024}MB.`;
			return;
		}
		selectedFile = file;
		metadata = await extractMetadata(file);
	}

	function upload() {
		if (!selectedFile || !albumId || isUploading) return;
		isUploading = true;
		progress = 0;
		error = null;

		const form = new FormData();
		form.append('file', selectedFile);
		form.append('albumId', albumId);
		if (metadata?.duration != null) form.append('duration', String(metadata.duration));
		if (metadata?.width != null) form.append('width', String(metadata.width));
		if (metadata?.height != null) form.append('height', String(metadata.height));

		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/api/videos/upload');
		xhr.withCredentials = true;
		xhr.upload.addEventListener('progress', (e) => {
			if (e.lengthComputable) progress = Math.round((e.loaded / e.total) * 100);
		});
		xhr.onload = () => {
			isUploading = false;
			if (xhr.status >= 200 && xhr.status < 300) {
				let body: any = null;
				try {
					body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
				} catch {
					body = null;
				}
				if (body?.skipped) {
					adminToast.info({
						title: 'Video already exists',
						description: body.reason || 'Skipped duplicate.'
					});
				} else {
					adminToast.success({
						title: 'Video uploaded',
						description: selectedFile?.name || 'Upload complete'
					});
				}
				goto(returnTo || `/admin/albums/${albumId}`);
			} else {
				let msg = `Upload failed (${xhr.status})`;
				try {
					const body = JSON.parse(xhr.responseText || '{}');
					msg = body.message || body.error || msg;
				} catch {
					/* keep default */
				}
				error = msg;
				adminToast.error({ title: 'Upload failed', description: msg });
			}
		};
		xhr.onerror = () => {
			isUploading = false;
			error = 'Network error during upload.';
			adminToast.error({ title: 'Upload failed', description: error });
		};
		xhr.send(form);
	}

	function reset() {
		selectedFile = null;
		metadata = null;
		progress = 0;
		error = null;
		if (fileInput) fileInput.value = '';
	}
</script>

<svelte:head>
	<title>Upload Video</title>
</svelte:head>

<div class="min-h-screen bg-(--color-surface-50-950) p-6">
	<div class="mx-auto max-w-2xl">
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-(--color-surface-950-50)">Upload Video</h1>
				{#if albumName}
					<p class="mt-1 text-sm text-(--color-surface-600-400)">to album: {albumName}</p>
				{/if}
			</div>
			<a href={returnTo || (albumId ? `/admin/albums/${albumId}` : '/admin/albums')} class={adminBtnSecondary}>
				Cancel
			</a>
		</div>

		{#if !albumId}
			<div class="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
				No <code>albumId</code> in URL. Upload requires a target album.
			</div>
		{/if}

		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<label class="block">
				<span class="mb-2 block text-sm font-medium text-(--color-surface-950-50)">
					MP4 file (up to 500 MB)
				</span>
				<input
					bind:this={fileInput}
					type="file"
					accept="video/mp4"
					disabled={isUploading || !albumId}
					onchange={(e) => handleFileSelected((e.currentTarget as HTMLInputElement).files)}
					class="block w-full text-sm text-(--color-surface-700-300)
						file:mr-4 file:rounded-md file:border-0 file:bg-(--color-primary-500) file:px-4 file:py-2
						file:text-sm file:font-medium file:text-white hover:file:bg-(--color-primary-600)"
				/>
			</label>

			{#if selectedFile}
				<div class="mt-4 rounded-md bg-(--color-surface-100-800) p-3 text-sm text-(--color-surface-800-200)">
					<div class="font-medium">{selectedFile.name}</div>
					<div class="mt-1 text-xs opacity-80">
						{(selectedFile.size / 1024 / 1024).toFixed(1)} MB
						{#if metadata?.duration != null}
							· {metadata.duration}s
						{/if}
						{#if metadata?.width != null && metadata?.height != null}
							· {metadata.width}×{metadata.height}
						{/if}
					</div>
				</div>
			{/if}

			{#if isUploading}
				<div class="mt-4">
					<div class="mb-1 flex justify-between text-xs text-(--color-surface-700-300)">
						<span>Uploading…</span>
						<span>{progress}%</span>
					</div>
					<div class="h-2 w-full overflow-hidden rounded bg-(--color-surface-200-700)">
						<div
							class="h-full bg-(--color-primary-500) transition-all"
							style="width: {progress}%;"
						></div>
					</div>
				</div>
			{/if}

			{#if error}
				<div class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
			{/if}

			<div class="mt-6 flex gap-2">
				<button
					type="button"
					onclick={upload}
					disabled={!selectedFile || !albumId || isUploading}
					class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
				>
					{isUploading ? `Uploading… ${progress}%` : 'Upload'}
				</button>
				<button
					type="button"
					onclick={reset}
					disabled={isUploading || (!selectedFile && !error)}
					class={adminBtnSecondary}
				>
					Reset
				</button>
			</div>
		</div>
	</div>
</div>
