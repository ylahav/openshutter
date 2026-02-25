<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { productName } from '$stores/siteConfig';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { logger } from '$lib/utils/logger';

	export let data: PageData;

	const CATEGORIES = [
		{ value: 'integration', label: 'Integration' },
		{ value: 'tool', label: 'Tool' },
		{ value: 'app', label: 'App' },
		{ value: 'script', label: 'Script' },
		{ value: 'theme', label: 'Theme' },
	];

	let form = {
		name: '',
		description: '',
		category: 'integration' as string,
		developerName: '',
		developerEmail: '',
		version: '1.0.0',
		tags: '' as string,
		documentationUrl: '',
		downloadUrl: '',
		repositoryUrl: '',
	};
	let submitting = false;
	let error = '';
	let success = false;

	async function submitListing() {
		if (!form.name.trim() || !form.description.trim() || !form.developerName.trim() || !form.developerEmail.trim()) {
			error = 'Name, description, developer name, and developer email are required.';
			return;
		}
		submitting = true;
		error = '';
		try {
			const body: Record<string, string> = {
				name: form.name.trim(),
				description: form.description.trim(),
				category: form.category,
				developerName: form.developerName.trim(),
				developerEmail: form.developerEmail.trim(),
				version: form.version.trim() || '1.0.0',
			};
			if (form.documentationUrl.trim()) body.documentationUrl = form.documentationUrl.trim();
			if (form.downloadUrl.trim()) body.downloadUrl = form.downloadUrl.trim();
			if (form.repositoryUrl.trim()) body.repositoryUrl = form.repositoryUrl.trim();
			const tags = form.tags.trim().split(',').map((t) => t.trim()).filter(Boolean);
			if (tags.length) body.tags = tags;
			const res = await fetch('/api/admin/marketplace', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				credentials: 'include',
			});
			if (!res.ok) {
				await handleApiErrorResponse(res);
				error = 'Submission failed. Try again.';
				submitting = false;
				return;
			}
			success = true;
			setTimeout(() => goto('/marketplace'), 2000);
		} catch (e) {
			logger.error('Submit listing:', e);
			error = handleError(e, 'Failed to submit');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Submit integration - Marketplace - {$productName}</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-8">
	<a href="/marketplace" class="text-sm text-primary-600 hover:underline mb-4 inline-block">← Marketplace</a>
	<h1 class="text-2xl font-bold text-gray-900">Submit an integration</h1>
	<p class="mt-1 text-gray-600">Your listing will be reviewed by an admin before it appears on the marketplace.</p>

	{#if success}
		<div class="mt-6 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
			<p class="font-medium">Submission received.</p>
			<p class="text-sm mt-1">It will appear in the marketplace after admin approval. Redirecting...</p>
		</div>
	{:else}
		<form on:submit|preventDefault={submitListing} class="mt-6 space-y-4">
			{#if error}
				<div class="rounded-md bg-red-50 p-4 text-red-700 text-sm">{error}</div>
			{/if}
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700">Name *</label>
				<input id="name" type="text" bind:value={form.name} required class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="My WordPress Plugin" />
			</div>
			<div>
				<label for="description" class="block text-sm font-medium text-gray-700">Description *</label>
				<textarea id="description" bind:value={form.description} required rows="4" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="What does it do?"></textarea>
			</div>
			<div>
				<label for="category" class="block text-sm font-medium text-gray-700">Category *</label>
				<select id="category" bind:value={form.category} class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
					{#each CATEGORIES as c}
						<option value={c.value}>{c.label}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="developerName" class="block text-sm font-medium text-gray-700">Developer name *</label>
				<input id="developerName" type="text" bind:value={form.developerName} required class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
			</div>
			<div>
				<label for="developerEmail" class="block text-sm font-medium text-gray-700">Developer email *</label>
				<input id="developerEmail" type="email" bind:value={form.developerEmail} required class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
			</div>
			<div>
				<label for="version" class="block text-sm font-medium text-gray-700">Version</label>
				<input id="version" type="text" bind:value={form.version} class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm" placeholder="1.0.0" />
			</div>
			<div>
				<label for="tags" class="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
				<input id="tags" type="text" bind:value={form.tags} class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm" placeholder="export, cli, backup" />
			</div>
			<div>
				<label for="documentationUrl" class="block text-sm font-medium text-gray-700">Documentation URL</label>
				<input id="documentationUrl" type="url" bind:value={form.documentationUrl} class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm" placeholder="https://..." />
			</div>
			<div>
				<label for="downloadUrl" class="block text-sm font-medium text-gray-700">Download URL</label>
				<input id="downloadUrl" type="url" bind:value={form.downloadUrl} class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm" placeholder="https://..." />
			</div>
			<div>
				<label for="repositoryUrl" class="block text-sm font-medium text-gray-700">Repository URL</label>
				<input id="repositoryUrl" type="url" bind:value={form.repositoryUrl} class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm" placeholder="https://github.com/..." />
			</div>
			<button type="submit" disabled={submitting} class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
				{submitting ? 'Submitting...' : 'Submit for review'}
			</button>
		</form>
	{/if}
</div>
