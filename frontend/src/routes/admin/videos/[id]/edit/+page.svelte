<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$stores/language';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimarySm, adminBtnSecondary, adminRingPrimary } from '$lib/admin/admin-cerberus';
	import { logger } from '$lib/utils/logger';
	import { handleError } from '$lib/utils/errorHandler';
	import { t } from '$stores/i18n';

	type MultiLang = { en?: string; he?: string; [k: string]: string | undefined };

	interface VideoDoc {
		_id: string;
		title?: MultiLang | string;
		description?: MultiLang | string;
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
	}

	interface LookupOption {
		_id: string;
		name?: MultiLang | string;
		fullName?: MultiLang | string;
		firstName?: MultiLang | string;
		lastName?: MultiLang | string;
	}

	const videoId = $derived($page.params.id as string);
	let video = $state<VideoDoc | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let errorMsg = $state<string | null>(null);

	let titleEn = $state('');
	let titleHe = $state('');
	let descriptionEn = $state('');
	let descriptionHe = $state('');
	let selectedTags = $state<string[]>([]);
	let selectedPeople = $state<string[]>([]);
	let selectedLocation = $state<string>('');
	let isPublished = $state(true);

	let tags = $state<LookupOption[]>([]);
	let people = $state<LookupOption[]>([]);
	let locations = $state<LookupOption[]>([]);

	function resolveLabel(item: LookupOption): string {
		const anyName = item.fullName ?? item.name ?? (item.firstName && item.lastName ? `${resolveText(item.firstName)} ${resolveText(item.lastName)}`.trim() : item.firstName ?? item.lastName);
		return resolveText(anyName) || item._id;
	}

	function resolveText(v: unknown): string {
		if (!v) return '';
		if (typeof v === 'string') return v;
		if (typeof v === 'object')
			return MultiLangUtils.getTextValue(v as Record<string, string>, $currentLanguage) || '';
		return '';
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
			const title = data.title;
			if (typeof title === 'string') {
				titleEn = title;
				titleHe = '';
			} else if (title && typeof title === 'object') {
				titleEn = title.en ?? '';
				titleHe = title.he ?? '';
			}
			const desc = data.description;
			if (typeof desc === 'string') {
				descriptionEn = desc;
				descriptionHe = '';
			} else if (desc && typeof desc === 'object') {
				descriptionEn = desc.en ?? '';
				descriptionHe = desc.he ?? '';
			}
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
				fetch('/api/admin/locations?limit=1000', { credentials: 'include' }),
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

	async function save() {
		if (!video) return;
		saving = true;
		errorMsg = null;
		try {
			const title: Record<string, string> = {};
			if (titleEn.trim()) title.en = titleEn.trim();
			if (titleHe.trim()) title.he = titleHe.trim();
			const description: Record<string, string> = {};
			if (descriptionEn.trim()) description.en = descriptionEn.trim();
			if (descriptionHe.trim()) description.he = descriptionHe.trim();

			const body = {
				title,
				description,
				tags: selectedTags,
				people: selectedPeople,
				location: selectedLocation || null,
				isPublished,
			};

			const res = await fetch(`/api/videos/${videoId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(body),
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

				<!-- Title -->
				<div>
					<label for="title-en" class="block text-sm font-medium text-(--color-surface-950-50)">
						Title (EN)
					</label>
					<input
						id="title-en"
						type="text"
						bind:value={titleEn}
						class="mt-1 block w-full rounded-md border border-surface-300-700 bg-(--color-surface-50-950) px-3 py-2 text-sm text-(--color-surface-900-100) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)"
					/>
					<label for="title-he" class="mt-3 block text-sm font-medium text-(--color-surface-950-50)">
						Title (HE)
					</label>
					<input
						id="title-he"
						type="text"
						bind:value={titleHe}
						dir="rtl"
						class="mt-1 block w-full rounded-md border border-surface-300-700 bg-(--color-surface-50-950) px-3 py-2 text-sm text-(--color-surface-900-100) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)"
					/>
				</div>

				<!-- Description -->
				<div>
					<label for="desc-en" class="block text-sm font-medium text-(--color-surface-950-50)">
						Description (EN)
					</label>
					<textarea
						id="desc-en"
						rows="3"
						bind:value={descriptionEn}
						class="mt-1 block w-full rounded-md border border-surface-300-700 bg-(--color-surface-50-950) px-3 py-2 text-sm text-(--color-surface-900-100) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)"
					></textarea>
					<label for="desc-he" class="mt-3 block text-sm font-medium text-(--color-surface-950-50)">
						Description (HE)
					</label>
					<textarea
						id="desc-he"
						rows="3"
						bind:value={descriptionHe}
						dir="rtl"
						class="mt-1 block w-full rounded-md border border-surface-300-700 bg-(--color-surface-50-950) px-3 py-2 text-sm text-(--color-surface-900-100) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)"
					></textarea>
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
