<script lang="ts">
	import { onMount } from 'svelte';
	import { productName } from '$stores/siteConfig';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { logger } from '$lib/utils/logger';

	interface ApiKeyInfo {
		_id: string;
		name: string;
		description?: string;
		scopes: string[];
		createdAt: string;
		lastUsedAt?: string;
		expiresAt?: string;
		isActive: boolean;
		rateLimitTier: string;
		key?: string; // Only present once on create
	}

	const SCOPE_OPTIONS = [
		{ value: 'read', label: 'read (all read operations)' },
		{ value: 'write', label: 'write (all write operations)' },
		{ value: 'albums:read', label: 'albums:read' },
		{ value: 'photos:read', label: 'photos:read' },
		{ value: 'tags:read', label: 'tags:read' },
		{ value: 'tags:write', label: 'tags:write' },
		{ value: 'people:read', label: 'people:read' },
		{ value: 'locations:read', label: 'locations:read' },
		{ value: 'pages:read', label: 'pages:read' },
		{ value: 'search:read', label: 'search:read' },
		{ value: 'photos:write', label: 'photos:write' },
	];

	const TIER_OPTIONS = [
		{ value: 'free', label: 'Free (60/min)' },
		{ value: 'basic', label: 'Basic (300/min)' },
		{ value: 'pro', label: 'Pro (1000/min)' },
		{ value: 'enterprise', label: 'Enterprise (10000/min)' },
	];

	let keys: ApiKeyInfo[] = [];
	let loading = true;
	let error = '';
	let creating = false;
	let createSuccess: { key: string; name: string } | null = null;
	let showCreateForm = false;
	let revokingId: string | null = null;

	let form = {
		name: '',
		description: '',
		scopes: [] as string[],
		rateLimitTier: 'free' as string,
		expiresInDays: '' as string | number,
	};

	onMount(() => {
		fetchKeys();
	});

	async function fetchKeys() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/api-keys', { credentials: 'include' });
			if (!res.ok) {
				await handleApiErrorResponse(res);
				return;
			}
			const json = await res.json();
			keys = json.data || [];
		} catch (e) {
			logger.error('Fetch API keys:', e);
			error = handleError(e, 'Failed to load API keys');
		} finally {
			loading = false;
		}
	}

	function toggleScope(scope: string) {
		if (form.scopes.includes(scope)) {
			form.scopes = form.scopes.filter((s) => s !== scope);
		} else {
			form.scopes = [...form.scopes, scope];
		}
	}

	async function createKey() {
		if (!form.name.trim()) {
			error = 'Name is required';
			return;
		}
		if (form.scopes.length === 0) {
			error = 'Select at least one scope';
			return;
		}
		creating = true;
		error = '';
		try {
			const body: Record<string, unknown> = {
				name: form.name.trim(),
				scopes: form.scopes,
				rateLimitTier: form.rateLimitTier,
			};
			if (form.description.trim()) body.description = form.description.trim();
			if (form.expiresInDays !== '' && Number(form.expiresInDays) > 0) {
				body.expiresInDays = Number(form.expiresInDays);
			}
			const res = await fetch('/api/api-keys', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				credentials: 'include',
			});
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				error = errData?.message || `Request failed: ${res.status}`;
				creating = false;
				return;
			}
			const json = await res.json();
			const newKey = json.data as ApiKeyInfo;
			createSuccess = { key: newKey.key || '', name: newKey.name };
			await fetchKeys(); // Refresh list (without the raw key)
			showCreateForm = false;
			form = { name: '', description: '', scopes: [], rateLimitTier: 'free', expiresInDays: '' };
		} catch (e) {
			logger.error('Create API key:', e);
			error = handleError(e, 'Failed to create API key');
		} finally {
			creating = false;
		}
	}

	async function revokeKey(keyId: string) {
		if (!confirm('Revoke this API key? It will stop working immediately and cannot be restored.')) return;
		revokingId = keyId;
		try {
			const res = await fetch(`/api/api-keys/${keyId}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			if (!res.ok) {
				await handleApiErrorResponse(res);
				return;
			}
			keys = keys.filter((k) => k._id !== keyId);
		} catch (e) {
			logger.error('Revoke API key:', e);
			error = handleError(e, 'Failed to revoke key');
		} finally {
			revokingId = null;
		}
	}

	function copyKeyToClipboard() {
		if (!createSuccess?.key) return;
		navigator.clipboard.writeText(createSuccess.key);
		// Could add a brief "Copied!" toast
	}

	function closeCreateSuccess() {
		createSuccess = null;
	}
</script>

<svelte:head>
	<title>API Keys - Developer Portal - {$productName}</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">API Keys</h1>
			<p class="mt-1 text-gray-600">
				Create and manage keys for the public API. The full key is only shown once when created.
			</p>
		</div>
		<button
			type="button"
			on:click={() => { showCreateForm = !showCreateForm; error = ''; }}
			class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
		>
			{showCreateForm ? 'Cancel' : 'Create API key'}
		</button>
	</div>

	{#if error}
		<div class="rounded-md bg-red-50 p-4 text-red-700 text-sm">
			{error}
		</div>
	{/if}

	{#if showCreateForm}
		<div class="bg-white rounded-lg border border-gray-200 p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">New API key</h2>
			<form
				on:submit|preventDefault={createKey}
				class="space-y-4"
			>
				<div>
					<label for="key-name" class="block text-sm font-medium text-gray-700">Name *</label>
					<input
						id="key-name"
						type="text"
						bind:value={form.name}
						class="mt-1 block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
						placeholder="e.g. My app"
					/>
				</div>
				<div>
					<label for="key-desc" class="block text-sm font-medium text-gray-700">Description (optional)</label>
					<input
						id="key-desc"
						type="text"
						bind:value={form.description}
						class="mt-1 block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
						placeholder="e.g. Production key"
					/>
				</div>
				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">Scopes *</span>
					<div class="flex flex-wrap gap-2">
						{#each SCOPE_OPTIONS as opt}
							<label class="inline-flex items-center gap-1.5 cursor-pointer">
								<input
									type="checkbox"
									checked={form.scopes.includes(opt.value)}
									on:change={() => toggleScope(opt.value)}
								/>
								<span class="text-sm text-gray-700">{opt.label}</span>
							</label>
						{/each}
					</div>
				</div>
				<div>
					<label for="key-tier" class="block text-sm font-medium text-gray-700">Rate limit tier</label>
					<select
						id="key-tier"
						bind:value={form.rateLimitTier}
						class="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
					>
						{#each TIER_OPTIONS as t}
							<option value={t.value}>{t.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="key-expires" class="block text-sm font-medium text-gray-700">Expires in days (optional)</label>
					<input
						id="key-expires"
						type="number"
						min="1"
						bind:value={form.expiresInDays}
						class="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
						placeholder="Leave empty for no expiry"
					/>
				</div>
				<button
					type="submit"
					disabled={creating}
					class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
				>
					{creating ? 'Creating...' : 'Create key'}
				</button>
			</form>
		</div>
	{/if}

	{#if createSuccess}
		<div class="rounded-lg border-2 border-amber-400 bg-amber-50 p-6">
			<h3 class="text-lg font-semibold text-gray-900">Key created: {createSuccess.name}</h3>
			<p class="mt-1 text-sm text-amber-800">Copy this key now. It won't be shown again.</p>
			<div class="mt-3 flex items-center gap-2">
				<code class="flex-1 rounded bg-white border border-amber-200 px-3 py-2 text-sm font-mono break-all select-all">
					{createSuccess.key}
				</code>
				<button
					type="button"
					on:click={copyKeyToClipboard}
					class="shrink-0 px-3 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm"
				>
					Copy
				</button>
			</div>
			<button
				type="button"
				on:click={closeCreateSuccess}
				class="mt-4 text-sm text-amber-800 underline hover:no-underline"
			>
				Done
			</button>
		</div>
	{/if}

	<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
		{#if loading}
			<p class="p-6 text-gray-500">Loading API keys...</p>
		{:else if keys.length === 0}
			<p class="p-6 text-gray-500">No API keys yet. Create one above.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scopes</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each keys as key}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3">
									<span class="font-medium text-gray-900">{key.name}</span>
									{#if key.description}
										<p class="text-xs text-gray-500">{key.description}</p>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-gray-600">
									{key.scopes?.join(', ') || '—'}
								</td>
								<td class="px-4 py-3 text-sm text-gray-600">{key.rateLimitTier || 'free'}</td>
								<td class="px-4 py-3">
									{#if key.isActive}
										<span class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Active</span>
									{:else}
										<span class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Revoked</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-gray-500">
									{key.createdAt ? new Date(key.createdAt).toLocaleDateString() : '—'}
								</td>
								<td class="px-4 py-3 text-right">
									{#if key.isActive}
										<button
											type="button"
											disabled={revokingId === key._id}
											on:click={() => revokeKey(key._id)}
											class="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
										>
											{revokingId === key._id ? 'Revoking...' : 'Revoke'}
										</button>
									{:else}
										—
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
