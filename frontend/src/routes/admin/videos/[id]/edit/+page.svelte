<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import type { MultiLangText, MultiLangHTML } from '$lib/types/multi-lang';
	import { currentLanguage } from '$stores/language';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimarySm, adminBtnSecondary, adminRingPrimary } from '$lib/admin/admin-cerberus';
	import { logger } from '$lib/utils/logger';
	import { handleError } from '$lib/utils/errorHandler';
	import { t } from '$stores/i18n';

	interface VideoDoc {
		_id: string;
		title?: MultiLangText | string;
		description?: MultiLangHTML | string;
		originalFilename?: string;
		filename?: string;
		mimeType?: string;
		size?: number;
		duration?: number;
		dimensions?: { width?: number; height?: number };
		albumId?: string | null;
		tags?: string[];
		people?: string[];
		location?: string | null;
		isPublished?: boolean;
		storage?: { url?: string };
		poster?: {
			url?: string;
			width?: number;
			height?: number;
			capturedAtSeconds?: number;
		};
	}

	interface LookupOption {
		_id: string;
		name?: MultiLangText | string;
		fullName?: MultiLangText | string;
		firstName?: MultiLangText | string;
		lastName?: MultiLangText | string;
	}

	const videoId = $derived($page.params.id as string);
	let video = $state<VideoDoc | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let capturing = $state(false);
	let errorMsg = $state<string | null>(null);

	let titleValue = $state<MultiLangText>({});
	let descriptionValue = $state<MultiLangHTML>({});
	let selectedTags = $state<string[]>([]);
	let selectedPeople = $state<string[]>([]);
	let selectedLocation = $state<string>('');
	let isPublished = $state(true);

	let tags = $state<LookupOption[]>([]);
	let people = $state<LookupOption[]>([]);
	let locations = $state<LookupOption[]>([]);

	let videoEl: HTMLVideoElement | null = $state(null);
	let captureVideoEl: HTMLVideoElement | null = $state(null);

	function resolveLabel(item: LookupOption): string {
		const anyName =
			item.fullName ??
			item.name ??
			(item.firstName && item.lastName
				? `${resolveText(item.firstName)} ${resolveText(item.lastName)}`.trim()
				: item.firstName ?? item.lastName);
		return resolveText(anyName) || item._id;
	}

	function resolveText(v: unknown): string {
		if (!v) return '';
		if (typeof v === 'string') return v;
		if (typeof v === 'object')
			return MultiLangUtils.getTextValue(v as Record<string, string>, $currentLanguage) || '';
		return '';
	}

	function normalizeMultiLang(v: unknown): Record<string, string> {
		if (!v) return {};
		if (typeof v === 'string') return { en: v };
		if (typeof v === 'object') {
			const out: Record<string, string> = {};
			for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
				if (typeof val === 'string') out[k] = val;
			}
			return out;
		}
		return {};
	}

	async function loadVideo() {
		loading = true;
		errorMsg = null;
		try {
			const res = await fetch(`/api/videos/${videoId}/admin`, { credentials: 'include' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message || body.error || `HTTP ${res.status}`);
			}
			const data = (await res.json()) as VideoDoc;
			video = data;
			titleValue = normalizeMultiLang(data.title);
			descriptionValue = normalizeMultiLang(data.description);
			selectedTags = Array.isArray(data.tags) ? [...data.tags] : [];
			selectedPeople = Array.isArray(data.people) ? [...data.people] : [];
			selectedLocation = data.location ?? '';
			isPublished = data.isPublished !== false;
		} catch (err) {
			logger.error('Failed to load video:', err);
			errorMsg = handleError(err, 'Failed to load video');
		} finally {
			loading = false;
		}
	}

	async function loadLookups() {
		try {
			const [tagsRes, peopleRes, locsRes] = await Promise.all([
				fetch('/api/admin/tags?limit=1000', { credentials: 'include' }),
				fetch('/api/admin/people?limit=1000', { credentials: 'include' }),
				fetch('/api/admin/locations?limit=1000', { credentials: 'include' })
			]);
			if (tagsRes.ok) {
				const j = await tagsRes.json();
				tags = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [];
			}
			if (peopleRes.ok) {
				const j = await peopleRes.json();
				people = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [];
			}
			if (locsRes.ok) {
				const j = await locsRes.json();
				locations = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [];
			}
		} catch (err) {
			logger.warn('Failed to load lookups:', err);
		}
	}

	function toggleId(list: string[], id: string): string[] {
		return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
	}

	const CORS_HINT =
		'Frame capture needs CORS on the video URL. Add `Access-Control-Allow-Origin: https://yairl.com` to the cdn.yairl.com Worker response.';

	/** Wait for the hidden video to reach `HAVE_METADATA` (readyState ≥ 1). Rejects on error or timeout. */
	function waitForMetadata(el: HTMLVideoElement, timeoutMs = 8000): Promise<void> {
		if (el.readyState >= 1) return Promise.resolve();
		return new Promise((resolve, reject) => {
			const cleanup = () => {
				el.removeEventListener('loadedmetadata', onLoaded);
				el.removeEventListener('error', onErr);
				clearTimeout(timer);
			};
			const onLoaded = () => {
				cleanup();
				resolve();
			};
			const onErr = () => {
				cleanup();
				reject(new Error(CORS_HINT));
			};
			const timer = setTimeout(() => {
				cleanup();
				reject(new Error(`${CORS_HINT} (hidden video never loaded metadata after ${timeoutMs}ms)`));
			}, timeoutMs);
			el.addEventListener('loadedmetadata', onLoaded, { once: true });
			el.addEventListener('error', onErr, { once: true });
			// Force a load in case preload didn't kick in.
			try {
				el.load();
			} catch {
				/* ignore */
			}
		});
	}

	/** Seek the hidden video to `time` and wait for a `seeked` event. Timeout guards against silent hangs. */
	function seekAndReady(el: HTMLVideoElement, time: number, timeoutMs = 8000): Promise<void> {
		return new Promise((resolve, reject) => {
			const cleanup = () => {
				el.removeEventListener('seeked', onSeeked);
				el.removeEventListener('error', onErr);
				clearTimeout(timer);
			};
			const onSeeked = () => {
				cleanup();
				resolve();
			};
			const onErr = () => {
				cleanup();
				reject(new Error(CORS_HINT));
			};
			const timer = setTimeout(() => {
				cleanup();
				reject(new Error(`Seek to ${time.toFixed(2)}s timed out after ${timeoutMs}ms.`));
			}, timeoutMs);
			el.addEventListener('seeked', onSeeked, { once: true });
			el.addEventListener('error', onErr, { once: true });
			if (Math.abs(el.currentTime - time) < 0.05) {
				el.currentTime = time + 0.001;
			} else {
				el.currentTime = time;
			}
		});
	}

	/**
	 * Probe the video URL with a cross-origin `fetch` before touching the hidden `<video>`.
	 * If CORS is missing, `fetch` rejects with a TypeError that gives us a clear reason
	 * to surface to the user, instead of the video element silently failing to load.
	 */
	async function probeCors(url: string): Promise<void> {
		try {
			const res = await fetch(url, { method: 'HEAD', mode: 'cors' });
			if (!res.ok && res.status !== 405) {
				throw new Error(`Video URL returned ${res.status} on HEAD probe.`);
			}
		} catch (err) {
			if (err instanceof TypeError) {
				throw new Error(CORS_HINT);
			}
			throw err;
		}
	}

	/**
	 * Grab the current frame from the visible player → PNG blob → POST to /api/videos/:id/poster.
	 * Uses a hidden second `<video crossorigin="anonymous">` for the actual pixel read,
	 * so playback in the main player works even without CORS on the video URL. The
	 * hidden loader only needs CORS at capture time.
	 */
	async function captureCurrentFrame() {
		if (!videoEl || !captureVideoEl || !video) return;
		capturing = true;
		errorMsg = null;
		try {
			const time = videoEl.currentTime;
			// Fast-fail if CORS is missing on the video URL — otherwise the hidden
			// video element sits in a loading state forever with no `error` event.
			if (video.storage?.url) {
				await probeCors(video.storage.url);
			}
			await waitForMetadata(captureVideoEl);
			await seekAndReady(captureVideoEl, time);
			if (!captureVideoEl.videoWidth || !captureVideoEl.videoHeight) {
				throw new Error('Hidden video did not report dimensions.');
			}
			const canvas = document.createElement('canvas');
			canvas.width = captureVideoEl.videoWidth;
			canvas.height = captureVideoEl.videoHeight;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Canvas 2D context unavailable');
			ctx.drawImage(captureVideoEl, 0, 0, canvas.width, canvas.height);
			const blob: Blob = await new Promise((resolve, reject) => {
				canvas.toBlob(
					(b) => (b ? resolve(b) : reject(new Error('Failed to encode frame as PNG'))),
					'image/png'
				);
			});
			const form = new FormData();
			form.append('file', new File([blob], 'poster.png', { type: 'image/png' }));
			form.append('width', String(canvas.width));
			form.append('height', String(canvas.height));
			form.append('capturedAtSeconds', String(time.toFixed(3)));

			const res = await fetch(`/api/videos/${videoId}/poster`, {
				method: 'POST',
				credentials: 'include',
				body: form
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(body.message || body.error || `Poster upload failed (${res.status})`);
			}
			video = body;
			adminToast.success({ title: 'Poster updated' });
		} catch (err) {
			logger.error('Capture frame failed:', err);
			const msg =
				err instanceof DOMException && err.name === 'SecurityError'
					? 'Frame capture blocked by CORS. The video URL must return Access-Control-Allow-Origin for browser frame capture — likely needs a fix in the cdn.yairl.com Worker.'
					: handleError(err, 'Failed to capture frame');
			errorMsg = msg;
			adminToast.error({ title: 'Capture failed', description: msg });
		} finally {
			capturing = false;
		}
	}

	async function clearPoster() {
		if (!video) return;
		if (!confirm('Remove the current poster? The default frame will be used again.')) return;
		try {
			const res = await fetch(`/api/videos/${videoId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ poster: null })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message || body.error || `HTTP ${res.status}`);
			}
			video = (await res.json()) as VideoDoc;
			adminToast.success({ title: 'Poster removed' });
		} catch (err) {
			logger.error('Failed to clear poster:', err);
			const msg = handleError(err, 'Failed to remove poster');
			errorMsg = msg;
			adminToast.error({ title: 'Remove failed', description: msg });
		}
	}

	async function save() {
		if (!video) return;
		saving = true;
		errorMsg = null;
		try {
			const title: Record<string, string> = {};
			for (const [k, v] of Object.entries(titleValue)) {
				const s = (v ?? '').trim();
				if (s) title[k] = s;
			}
			const description: Record<string, string> = {};
			for (const [k, v] of Object.entries(descriptionValue)) {
				const s = (v ?? '').trim();
				if (s) description[k] = s;
			}

			const body = {
				title,
				description,
				tags: selectedTags,
				people: selectedPeople,
				location: selectedLocation || null,
				isPublished
			};

			const res = await fetch(`/api/videos/${videoId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const responseBody = await res.json().catch(() => ({}));
				throw new Error(responseBody.message || responseBody.error || `HTTP ${res.status}`);
			}
			adminToast.success({ title: 'Video saved' });
			if (video.albumId) {
				goto(`/admin/albums/${video.albumId}`);
			} else {
				goto('/admin/albums');
			}
		} catch (err) {
			logger.error('Failed to save video:', err);
			errorMsg = handleError(err, 'Failed to save video');
			adminToast.error({ title: 'Save failed', description: errorMsg ?? undefined });
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		await Promise.all([loadVideo(), loadLookups()]);
	});
</script>

<svelte:head>
	<title>Edit Video</title>
</svelte:head>

<div class="min-h-screen bg-(--color-surface-50-950) p-6">
	<div class="mx-auto max-w-3xl">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-2xl font-bold text-(--color-surface-950-50)">Edit Video</h1>
			<a
				href={video?.albumId ? `/admin/albums/${video.albumId}` : '/admin/albums'}
				class={adminBtnSecondary}
			>
				{$t('admin.cancel') || 'Cancel'}
			</a>
		</div>

		{#if loading}
			<div class="rounded-md bg-(--color-surface-100-800) p-6 text-sm text-(--color-surface-600-400)">
				Loading…
			</div>
		{:else if !video}
			<div class="rounded-md bg-red-50 p-4 text-sm text-red-700">
				{errorMsg || 'Video not found.'}
			</div>
		{:else}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 space-y-6">
				<!-- File info readout -->
				<div class="rounded-md bg-(--color-surface-100-800) p-3 text-xs text-(--color-surface-700-300)">
					<div class="font-medium">{video.originalFilename || video.filename || 'Video'}</div>
					<div class="mt-0.5 opacity-80">
						{video.mimeType || 'video/mp4'}
						{#if video.size}
							· {(video.size / 1024 / 1024).toFixed(1)} MB
						{/if}
						{#if video.duration}
							· {Math.floor(video.duration / 60)}:{String(Math.round(video.duration % 60)).padStart(2, '0')}
						{/if}
						{#if video.dimensions?.width && video.dimensions?.height}
							· {video.dimensions.width}×{video.dimensions.height}
						{/if}
					</div>
				</div>

				{#if errorMsg}
					<div class="rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
				{/if}

				<!-- Video preview + poster capture -->
				{#if video.storage?.url}
					<div>
						<div class="block text-sm font-medium text-(--color-surface-950-50) mb-2">
							Leading image
						</div>
						<div class="flex flex-col gap-3 md:flex-row md:items-start">
							<div class="md:w-2/3">
								<video
									bind:this={videoEl}
									src={video.storage.url}
									poster={video.poster?.url}
									controls
									preload="metadata"
									class="w-full rounded-md border border-surface-300-700 bg-black"
								>
									<track kind="captions" />
								</video>
								<!-- Hidden second element used only for cross-origin pixel reads. -->
								<video
									bind:this={captureVideoEl}
									src={video.storage.url}
									crossorigin="anonymous"
									preload="metadata"
									muted
									playsinline
									class="hidden"
								>
									<track kind="captions" />
								</video>
								<p class="mt-1 text-xs text-(--color-surface-500-500)">
									Scrub to the frame you want, then click "Capture current frame".
								</p>
							</div>
							<div class="md:w-1/3 space-y-2">
								{#if video.poster?.url}
									<div class="text-xs font-medium text-(--color-surface-700-300)">
										Current poster
									</div>
									<img
										src={video.poster.url}
										alt="Video poster"
										class="w-full rounded-md border border-surface-300-700"
									/>
									{#if video.poster.capturedAtSeconds != null}
										<div class="text-xs text-(--color-surface-500-500)">
											Captured at {video.poster.capturedAtSeconds.toFixed(1)}s
										</div>
									{/if}
								{:else}
									<div class="text-xs text-(--color-surface-500-500)">
										No poster set. The first frame is used by default.
									</div>
								{/if}
								<div class="flex flex-col gap-2">
									<button
										type="button"
										onclick={captureCurrentFrame}
										disabled={capturing}
										class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
									>
										{capturing ? 'Capturing…' : 'Capture current frame'}
									</button>
									{#if video.poster?.url}
										<button
											type="button"
											onclick={clearPoster}
											class={adminBtnSecondary}
										>
											Remove poster
										</button>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Title -->
				<div>
					<div class="block text-sm font-medium text-(--color-surface-950-50) mb-2">
						Title
					</div>
					<MultiLangInput
						value={titleValue}
						onChange={(v) => {
							titleValue = { ...titleValue, ...v };
						}}
						placeholder="Enter video title..."
					/>
				</div>

				<!-- Description -->
				<div>
					<div class="block text-sm font-medium text-(--color-surface-950-50) mb-2">
						Description
					</div>
					<MultiLangHTMLEditor
						bind:value={descriptionValue}
						placeholder="Enter video description..."
						height={240}
					/>
				</div>

				<!-- Location -->
				<div>
					<label for="video-location" class="block text-sm font-medium text-(--color-surface-950-50)">
						Location
					</label>
					<select
						id="video-location"
						bind:value={selectedLocation}
						class="mt-1 block w-full rounded-md border border-surface-300-700 bg-(--color-surface-50-950) px-3 py-2 text-sm text-(--color-surface-900-100) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)"
					>
						<option value="">— none —</option>
						{#each locations as loc}
							<option value={loc._id}>{resolveLabel(loc)}</option>
						{/each}
					</select>
				</div>

				<!-- Tags -->
				<div>
					<div class="block text-sm font-medium text-(--color-surface-950-50)">Tags</div>
					{#if tags.length === 0}
						<div class="mt-1 text-xs text-(--color-surface-500-500)">No tags available.</div>
					{:else}
						<div class="mt-1 max-h-48 overflow-y-auto rounded-md border border-surface-300-700 p-2">
							<div class="flex flex-wrap gap-2">
								{#each tags as tag}
									{@const checked = selectedTags.includes(tag._id)}
									<label class="inline-flex items-center gap-1 text-sm text-(--color-surface-900-100)">
										<input
											type="checkbox"
											{checked}
											onchange={() => (selectedTags = toggleId(selectedTags, tag._id))}
										/>
										<span>{resolveLabel(tag)}</span>
									</label>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- People -->
				<div>
					<div class="block text-sm font-medium text-(--color-surface-950-50)">People</div>
					{#if people.length === 0}
						<div class="mt-1 text-xs text-(--color-surface-500-500)">No people available.</div>
					{:else}
						<div class="mt-1 max-h-48 overflow-y-auto rounded-md border border-surface-300-700 p-2">
							<div class="flex flex-wrap gap-2">
								{#each people as person}
									{@const checked = selectedPeople.includes(person._id)}
									<label class="inline-flex items-center gap-1 text-sm text-(--color-surface-900-100)">
										<input
											type="checkbox"
											{checked}
											onchange={() => (selectedPeople = toggleId(selectedPeople, person._id))}
										/>
										<span>{resolveLabel(person)}</span>
									</label>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Published toggle -->
				<div>
					<label class="inline-flex items-center gap-2 text-sm text-(--color-surface-950-50)">
						<input type="checkbox" bind:checked={isPublished} />
						<span>Published (visible to visitors)</span>
					</label>
				</div>

				<div class="flex gap-2 pt-2">
					<button
						type="button"
						onclick={save}
						disabled={saving}
						class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
					<a
						href={video?.albumId ? `/admin/albums/${video.albumId}` : '/admin/albums'}
						class={adminBtnSecondary}
					>
						{$t('admin.cancel') || 'Cancel'}
					</a>
				</div>
			</div>
		{/if}
	</div>
</div>
