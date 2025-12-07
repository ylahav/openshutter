<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { canEditAlbum } from '$lib/access-control';

	export let data; // From +layout.server.ts, contains user info

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		description?: string | { en?: string; he?: string };
		isPublic: boolean;
		isFeatured: boolean;
		showExifData?: boolean;
		order: number;
		createdBy?: string;
	}

	let album: Album | null = null;
	let loading = true;
	let saving = false;
	let error: string | null = null;
	let albumId = $page.params.id;

	let formData = {
		name: {} as { en?: string; he?: string },
		description: {} as { en?: string; he?: string },
		isPublic: false,
		isFeatured: false,
		showExifData: true,
		order: 0
	};

	onMount(async () => {
		await fetchAlbum();
	});

	async function fetchAlbum() {
		try {
			loading = true;
			const res = await fetch(`/api/albums/${albumId}`);
			if (!res.ok) throw new Error('Failed to fetch album');
			const result = await res.json();
			const a = result.data || result;
			if (!canEditAlbum(a, data.user)) {
				error = 'Forbidden';
				return;
			}
			album = a;
			formData = {
				name:
					typeof a.name === 'string' ? { en: a.name } : (a.name || {}) as { en?: string; he?: string },
				description:
					typeof a.description === 'string'
						? { en: a.description }
						: (a.description || {}) as { en?: string; he?: string },
				isPublic: a.isPublic || false,
				isFeatured: a.isFeatured || false,
				showExifData: a.showExifData !== undefined ? a.showExifData : true,
				order: a.order || 0
			};
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to fetch album';
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		try {
			saving = true;
			error = null;
			const res = await fetch(`/api/albums/${albumId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...formData,
					name: MultiLangUtils.clean(formData.name),
					description: MultiLangUtils.clean(formData.description)
				})
			});
			if (!res.ok) throw new Error('Failed to update album');
			const result = await res.json();
			if (!result.success) throw new Error(result.error || 'Failed to update album');
			goto('/owner/albums');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update album';
		} finally {
			saving = false;
		}
	}

	function handleInputChange(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const { name, type } = target;
		const value = type === 'checkbox' ? target.checked : type === 'number' ? parseInt(target.value) || 0 : target.value;
		formData = { ...formData, [name]: value };
	}
</script>

<svelte:head>
	<title>Edit Album - Owner</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else if error || !album}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="text-red-600 text-xl mb-4">⚠️</div>
			<p class="text-gray-600">{error || 'Album not found'}</p>
			<button
				on:click={() => goto('/owner/albums')}
				class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
			>
				Back
			</button>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-3xl mx-auto px-4">
			<div class="mb-6">
				<button
					on:click={() => goto('/owner/albums')}
					class="text-blue-600 hover:text-blue-800 mb-4"
				>
					← Back to Albums
				</button>
				<h1 class="text-2xl font-bold text-gray-900">Edit Album</h1>
			</div>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
					<p class="text-red-800">{error}</p>
				</div>
			{/if}

			<form on:submit={handleSubmit} class="space-y-6 bg-white border rounded p-6">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Album Name</label>
					<MultiLangInput
						bind:value={formData.name}
						placeholder="Enter album name..."
						required
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
					<MultiLangHTMLEditor
						bind:value={formData.description}
						placeholder="Enter album description..."
						height={200}
					/>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="isPublic"
							checked={formData.isPublic}
							on:change={handleInputChange}
							class="h-4 w-4 text-blue-600"
						/>
						Public
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="isFeatured"
							checked={formData.isFeatured}
							on:change={handleInputChange}
							class="h-4 w-4 text-blue-600"
						/>
						Featured
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="showExifData"
							checked={formData.showExifData}
							on:change={handleInputChange}
							class="h-4 w-4 text-blue-600"
						/>
						Show EXIF
					</label>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
					<input
						type="number"
						name="order"
						bind:value={formData.order}
						on:change={handleInputChange}
						class="w-full border rounded px-3 py-2"
					/>
				</div>
				<div class="flex justify-between gap-2">
					<button
						type="button"
						on:click={() => goto(`/admin/photos/upload?albumId=${albumId}&returnTo=/owner/albums`)}
						class="px-4 py-2 border rounded hover:bg-gray-50"
					>
						Add Photos
					</button>
					<div class="flex gap-2">
						<button
							type="button"
							on:click={() => goto('/owner/albums')}
							class="px-4 py-2 border rounded hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving}
							class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
						>
							{saving ? 'Saving...' : 'Save'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
