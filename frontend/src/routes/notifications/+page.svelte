<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, loadSession } from '$lib/stores/auth';
	import { t } from '$stores/i18n';
	import { logger } from '$lib/utils/logger';

	interface Row {
		_id: string;
		kind: string;
		title: string;
		body: string;
		linkPath?: string;
		read: boolean;
		createdAt: string;
	}

	let rows: Row[] = [];
	let loading = true;
	let error = '';
	let markingAll = false;

	onMount(async () => {
		await loadSession();
		await refresh();
	});

	async function refresh() {
		if (!$auth.authenticated) {
			rows = [];
			loading = false;
			return;
		}
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/notifications?limit=50', { credentials: 'include' });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				error = data?.error || $t('notifications.loadError');
				rows = [];
				return;
			}
			rows = data.data || [];
		} catch (e) {
			logger.error('Notifications page:', e);
			error = $t('notifications.loadError');
			rows = [];
		} finally {
			loading = false;
		}
	}

	async function markRead(id: string) {
		try {
			const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
				method: 'PATCH',
				credentials: 'include',
			});
			if (res.ok) {
				rows = rows.map((r) => (r._id === id ? { ...r, read: true } : r));
			}
		} catch (e) {
			logger.error('Mark read:', e);
		}
	}

	async function markAllRead() {
		if (markingAll || !$auth.authenticated) return;
		markingAll = true;
		try {
			const res = await fetch('/api/notifications/read-all', {
				method: 'PATCH',
				credentials: 'include',
			});
			if (res.ok) {
				rows = rows.map((r) => ({ ...r, read: true }));
			}
		} catch (e) {
			logger.error('Mark all read:', e);
		} finally {
			markingAll = false;
		}
	}

	function formatWhen(iso: string) {
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	}
</script>

<svelte:head>
	<title>{$t('notifications.title')}</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-10">
	<div class="flex items-center justify-between gap-4 mb-6">
		<h1 class="text-2xl font-semibold text-gray-900">{$t('notifications.title')}</h1>
		{#if $auth.authenticated && rows.some((r) => !r.read)}
			<button
				type="button"
				class="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
				disabled={markingAll}
				on:click={markAllRead}
			>
				{markingAll ? '…' : $t('notifications.markAllRead')}
			</button>
		{/if}
	</div>

	{#if !$auth.authenticated}
		<p class="text-gray-600">{$t('notifications.signInPrompt')}</p>
	{:else if loading}
		<p class="text-gray-500">{$t('loading.loading')}</p>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else if rows.length === 0}
		<p class="text-gray-600">{$t('notifications.empty')}</p>
	{:else}
		<ul class="space-y-2">
			{#each rows as n (n._id)}
				<li
					class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm {n.read
						? 'opacity-70'
						: 'border-primary-200'}"
				>
					<div class="flex justify-between gap-2 text-sm text-gray-500">
						<span>{formatWhen(n.createdAt)}</span>
						{#if !n.read}
							<button
								type="button"
								class="text-primary-600 hover:text-primary-700 shrink-0"
								on:click={() => markRead(n._id)}
							>
								{$t('notifications.markRead')}
							</button>
						{/if}
					</div>
					<p class="mt-1 font-medium text-gray-900">{n.title}</p>
					{#if n.body}
						<p class="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{n.body}</p>
					{/if}
					{#if n.linkPath}
						<a
							href={n.linkPath}
							class="mt-2 inline-block text-sm text-primary-600 hover:text-primary-700"
						>
							{n.linkPath}
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
