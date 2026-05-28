<script lang="ts">
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { t } from '$stores/i18n';
	import { handleError } from '$lib/utils/errorHandler';
	import { adminToast } from '$lib/admin/adminToast';
	import {
		adminBtnPrimarySm,
		adminBtnSecondary,
		adminRingPrimary,
		adminInputSmClass
	} from '$lib/admin/admin-cerberus';

	type ContactSubmission = {
		_id: string;
		name: string;
		email: string;
		phone?: string;
		message: string;
		pageAlias?: string;
		sourceUrl?: string;
		createdAt: string;
	};

	const loading = writable(true);
	let items: ContactSubmission[] = [];
	let page = 1;
	let limit = 20;
	let total = 0;
	let pages = 1;
	let search = '';

	async function load() {
		loading.set(true);
		try {
			const qs = new URLSearchParams();
			qs.set('page', String(page));
			qs.set('limit', String(limit));
			if (search.trim()) qs.set('search', search.trim());

			const res = await fetch(`/api/contact-submissions?${qs.toString()}`);
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json?.success) {
				throw new Error(json?.error || $t('admin.contactSubmissionsLoadFailed'));
			}
			items = Array.isArray(json?.data) ? json.data : [];
			total = Number(json?.pagination?.total || 0);
			pages = Math.max(1, Number(json?.pagination?.pages || 1));
		} catch (e) {
			adminToast.error({
				title: handleError(e, $t('admin.contactSubmissionsLoadFailed'))
			});
			items = [];
			total = 0;
			pages = 1;
		} finally {
			loading.set(false);
		}
	}

	function formatDate(v?: string) {
		if (!v) return '';
		const d = new Date(v);
		if (Number.isNaN(d.getTime())) return v;
		return d.toLocaleString();
	}

	function truncateMessage(v?: string, max = 180) {
		const text = String(v || '');
		if (text.length <= max) return text;
		return `${text.slice(0, max)}...`;
	}

	async function handleSearchSubmit(event: SubmitEvent) {
		event.preventDefault();
		page = 1;
		await load();
	}

	onMount(load);
</script>

<svelte:head>
	<title>{$t('admin.contactSubmissionsTitle')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-7xl mx-auto px-4 space-y-6">
		<div>
			<h1 class="text-3xl font-bold text-(--color-surface-950-50)">{$t('admin.contactSubmissionsTitle')}</h1>
			<p class="text-(--color-surface-600-400) mt-2">{$t('admin.contactSubmissionsDescription')}</p>
		</div>

		<form on:submit={handleSearchSubmit} class="flex flex-wrap items-center gap-2">
			<input
				type="text"
				bind:value={search}
				placeholder={$t('admin.contactSubmissionsSearchPlaceholder')}
				class="{adminInputSmClass} max-w-md flex-1 min-w-48"
			/>
			<button type="submit" class="{adminBtnPrimarySm} {adminRingPrimary}">
				{$t('admin.contactSubmissionsSearch')}
			</button>
		</form>

		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 overflow-hidden">
			{#if $loading}
				<div class="p-6 text-(--color-surface-600-400)">{$t('loading.loading')}</div>
			{:else if items.length === 0}
				<div class="p-6 text-(--color-surface-600-400)">{$t('admin.contactSubmissionsEmpty')}</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-surface-200-800">
						<thead class="bg-(--color-surface-100-900)">
							<tr>
								<th
									class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-surface-600-400)"
									>{$t('admin.contactSubmissionsColWhen')}</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-surface-600-400)"
									>{$t('admin.contactSubmissionsColName')}</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-surface-600-400)"
									>{$t('admin.contactSubmissionsColEmailPhone')}</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-surface-600-400)"
									>{$t('admin.contactSubmissionsColPage')}</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-surface-600-400)"
									>{$t('admin.contactSubmissionsColMessage')}</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-200-800">
							{#each items as row}
								<tr>
									<td class="px-4 py-3 text-sm text-(--color-surface-600-400) whitespace-nowrap"
										>{formatDate(row.createdAt)}</td
									>
									<td class="px-4 py-3 text-sm text-(--color-surface-950-50)">{row.name}</td>
									<td class="px-4 py-3 text-sm text-(--color-surface-800-200)">
										<div>{row.email}</div>
										{#if row.phone}
											<div class="text-xs text-(--color-surface-600-400)">{row.phone}</div>
										{/if}
									</td>
									<td class="px-4 py-3 text-sm text-(--color-surface-800-200)">{row.pageAlias || '-'}</td>
									<td class="px-4 py-3 text-sm text-(--color-surface-800-200)">{truncateMessage(row.message)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		{#if total > 0}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm text-(--color-surface-600-400)">
					{$t('admin.contactSubmissionsTotal').replace('{total}', String(total))}
				</p>
				<div class="flex items-center gap-2">
					<button
						type="button"
						disabled={page <= 1 || loading}
						on:click={async () => {
							if (page <= 1) return;
							page -= 1;
							await load();
						}}
						class="{adminBtnSecondary} disabled:opacity-50"
					>
						{$t('pagination.previous')}
					</button>
					<span class="text-sm text-(--color-surface-800-200)">
						{$t('admin.contactSubmissionsPage')
							.replace('{page}', String(page))
							.replace('{pages}', String(pages))}
					</span>
					<button
						type="button"
						disabled={page >= pages || loading}
						on:click={async () => {
							if (page >= pages) return;
							page += 1;
							await load();
						}}
						class="{adminBtnSecondary} disabled:opacity-50"
					>
						{$t('pagination.next')}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
