<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { t } from '$stores/i18n';
	import { currentLanguage } from '$stores/language';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { adminToast } from '$lib/admin/adminToast';
	import {
		adminBtnPrimarySm,
		adminBtnSecondary,
		adminRingPrimary
	} from '$lib/admin/admin-cerberus';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { get } from 'svelte/store';

	interface Log {
		_id: string;
		timestamp: string;
		action: string;
		userId?: string;
		userRole?: string;
		userDisplayName?: string;
		ip?: string;
		userAgent?: string;
		resourceType: string;
		resourceId?: string;
		resourceAlias?: string;
		details?: Record<string, unknown>;
		summary?: string;
	}

	interface Pagination {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	}

	let logs: Log[] = [];
	let pagination: Pagination | null = null;
	let loading = true;
	let loadErrored = false;
	let exportBusy = false;

	let userChoices: { id: string; label: string }[] = [];

	let draftSince = '';
	let draftUntil = '';
	let draftUserId = '';
	let draftAction = '';

	function syncFiltersFromUrl(url: URL) {
		const qs = url.searchParams;
		draftSince = qs.get('since')?.slice(0, 10) || '';
		draftUntil = qs.get('until')?.slice(0, 10) || '';
		draftUserId = qs.get('userId') || '';
		draftAction = qs.get('action') || '';
	}

	function formatRelativeTime(iso: string, locale: string): string {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return '—';
		const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
		const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
		const abs = Math.abs(diffSec);
		const divisions: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
			{ unit: 'year', seconds: 31536000 },
			{ unit: 'month', seconds: 2592000 },
			{ unit: 'week', seconds: 604800 },
			{ unit: 'day', seconds: 86400 },
			{ unit: 'hour', seconds: 3600 },
			{ unit: 'minute', seconds: 60 },
			{ unit: 'second', seconds: 1 }
		];
		for (const { unit, seconds } of divisions) {
			if (abs >= seconds || unit === 'second') {
				const delta = Math.round(diffSec / seconds);
				return rtf.format(delta, unit);
			}
		}
		return rtf.format(0, 'second');
	}

	function isoDayStart(isoOrDay: string): string {
		const day = isoOrDay.slice(0, 10);
		const d = new Date(day + 'T00:00:00');
		return d.toISOString();
	}

	function isoDayEnd(isoOrDay: string): string {
		const day = isoOrDay.slice(0, 10);
		const d = new Date(day + 'T23:59:59.999');
		return d.toISOString();
	}

	function csvEscape(cell: string | undefined): string {
		const s = cell ?? '';
		if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
		return s;
	}

	async function loadLogs() {
		loading = true;
		loadErrored = false;
		try {
			const qs = $page.url.searchParams.toString();
			const url = qs ? `/api/admin/audit-logs?${qs}` : '/api/admin/audit-logs';
			const response = await fetch(url);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			if (result.success) {
				logs = Array.isArray(result.data) ? result.data : [];
				pagination = result.pagination ?? null;
			} else {
				throw new Error(result.error || 'Failed to load audit logs');
			}
		} catch (err) {
			logger.error('Error loading audit logs:', err);
			adminToast.error({ title: handleError(err, $t('admin.auditLogsLoadFailed')) });
			loadErrored = true;
			logs = [];
			pagination = null;
		} finally {
			loading = false;
		}
	}

	function navSearchParams(): URLSearchParams {
		return new URLSearchParams($page.url.searchParams);
	}

	function applyFilters() {
		const p = new URLSearchParams();
		const lim = navSearchParams().get('limit') || '25';
		p.set('page', '1');
		p.set('limit', lim);

		if (draftSince) p.set('since', isoDayStart(draftSince));
		if (draftUntil) p.set('until', isoDayEnd(draftUntil));
		if (draftUserId) p.set('userId', draftUserId);
		if (draftAction) p.set('action', draftAction);

		goto(`?${p.toString()}`, { replaceState: true, noScroll: true });
	}

	function clearFilters() {
		const lim = navSearchParams().get('limit') || '25';
		goto(`?page=1&limit=${encodeURIComponent(lim)}`, { replaceState: true, noScroll: true });
	}

	function setLimit(next: number) {
		const p = navSearchParams();
		p.set('limit', String(next));
		p.set('page', '1');
		goto(`?${p.toString()}`, { replaceState: true, noScroll: true });
	}

	function goPage(next: number) {
		const p = navSearchParams();
		p.set('page', String(next));
		goto(`?${p.toString()}`, { replaceState: true, noScroll: true });
	}

	async function downloadCsv() {
		exportBusy = true;
		try {
			const p = navSearchParams();
			p.set('page', '1');
			p.set('limit', '5000');
			const res = await fetch(`/api/admin/audit-logs?${p.toString()}`);
			if (!res.ok) await handleApiErrorResponse(res);
			const result = await res.json();
			if (!result.success || !Array.isArray(result.data)) {
				throw new Error(result.error || 'Export failed');
			}
			const rows = result.data as Log[];
			const header = [
				'timestamp',
				'userDisplayName',
				'action',
				'resourceType',
				'resourceAlias',
				'resourceId',
				'summary',
				'ip',
				'userAgent'
			];
			const lines = [
				header.join(','),
				...rows.map((log) =>
					[
						csvEscape(log.timestamp),
						csvEscape(log.userDisplayName),
						csvEscape(log.action),
						csvEscape(log.resourceType),
						csvEscape(log.resourceAlias),
						csvEscape(log.resourceId),
						csvEscape(log.summary),
						csvEscape(log.ip),
						csvEscape(log.userAgent)
					].join(',')
				)
			];
			const blob = new Blob(['\ufeff' + lines.join('\r\n')], {
				type: 'text/csv;charset=utf-8'
			});
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
			a.click();
			URL.revokeObjectURL(a.href);
			adminToast.success({ title: $t('admin.auditLogsCsvDownloaded') });
		} catch (err) {
			logger.error('CSV export failed:', err);
			adminToast.error({ title: handleError(err, 'Failed to export CSV') });
		} finally {
			exportBusy = false;
		}
	}

	afterNavigate((n) => {
		if (!browser) return;
		if (!n.to?.url.pathname.endsWith('/admin/audit-logs')) return;
		syncFiltersFromUrl(n.to.url);
		loadLogs();
	});

	onMount(async () => {
		try {
			const res = await fetch('/api/admin/users?limit=300&page=1');
			if (!res.ok) return;
			const body = await res.json();
			if (!body.success || !Array.isArray(body.data)) return;
			userChoices = body.data.map((u: { _id: string; name?: Record<string, string>; username: string }) => ({
				id: u._id,
				label: MultiLangUtils.getTextValue(u.name || {}, get(currentLanguage)) || u.username
			}));
			userChoices.sort((a, b) => a.label.localeCompare(b.label));
		} catch (e) {
			logger.warn('Could not load users for audit filter', e);
		}
	});

	$: rangeText = (() => {
		if (!pagination || pagination.total === 0) return '';
		const from = (pagination.page - 1) * pagination.limit + 1;
		const to = Math.min(pagination.page * pagination.limit, pagination.total);
		return $t('admin.auditLogsShowingRange')
			.replace('{from}', String(from))
			.replace('{to}', String(to))
			.replace('{total}', String(pagination.total));
	})();

	$: q = $page.url.searchParams;
	$: pageLimit = Math.min(100, Math.max(1, parseInt(q.get('limit') || '25', 10) || 25));
	$: currentPage = Math.max(1, parseInt(q.get('page') || '1', 10) || 1);
</script>

<svelte:head>
	<title>{$t('admin.auditLogs')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 class="text-3xl font-bold text-(--color-surface-950-50)">{$t('admin.auditLogs')}</h1>
				<p class="mt-2 text-(--color-surface-600-400)">{$t('admin.viewSystemActivity')}</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="{adminBtnSecondary}"
					disabled={exportBusy || logs.length === 0}
					on:click={downloadCsv}
				>
					{exportBusy ? '…' : $t('admin.auditLogsDownloadCsv')}
				</button>
			</div>
		</div>

		<div
			class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4 mb-6 space-y-4"
		>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div>
					<label for="audit-since" class="block text-sm font-medium text-(--color-surface-600-400) mb-1"
						>{$t('admin.auditLogsFilterDateFrom')}</label
					>
					<input
						id="audit-since"
						type="date"
						class="input w-full"
						bind:value={draftSince}
					/>
				</div>
				<div>
					<label for="audit-until" class="block text-sm font-medium text-(--color-surface-600-400) mb-1"
						>{$t('admin.auditLogsFilterDateTo')}</label
					>
					<input
						id="audit-until"
						type="date"
						class="input w-full"
						bind:value={draftUntil}
					/>
				</div>
				<div>
					<label for="audit-user" class="block text-sm font-medium text-(--color-surface-600-400) mb-1"
						>{$t('admin.auditLogsFilterUser')}</label
					>
					<select id="audit-user" class="select w-full" bind:value={draftUserId}>
						<option value="">{$t('admin.auditLogsFilterUserAll')}</option>
						{#each userChoices as u}
							<option value={u.id}>{u.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="audit-action" class="block text-sm font-medium text-(--color-surface-600-400) mb-1"
						>{$t('admin.auditLogsFilterAction')}</label
					>
					<select id="audit-action" class="select w-full" bind:value={draftAction}>
						<option value="">{$t('admin.auditLogsFilterActionAll')}</option>
						<option value="created">{$t('admin.auditLogsFilterActionCreated')}</option>
						<option value="updated">{$t('admin.auditLogsFilterActionUpdated')}</option>
						<option value="deleted">{$t('admin.auditLogsFilterActionDeleted')}</option>
						<option value="logged_in">{$t('admin.auditLogsFilterActionLoggedIn')}</option>
					</select>
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					class="{adminBtnPrimarySm} {adminRingPrimary}"
					on:click={applyFilters}
				>
					{$t('admin.auditLogsApplyFilters')}
				</button>
				<button type="button" class="{adminBtnSecondary}" on:click={clearFilters}>
					{$t('admin.auditLogsClearFilters')}
				</button>
				<div class="flex items-center gap-2 ml-auto">
					<label for="audit-limit" class="text-sm text-(--color-surface-600-400)"
						>{$t('admin.auditLogsPerPage')}</label
					>
					<select
						id="audit-limit"
						class="select w-auto!"
						value={String(pageLimit)}
						on:change={(e) => setLimit(parseInt(e.currentTarget.value, 10) || 25)}
					>
						<option value="25">25</option>
						<option value="50">50</option>
						<option value="100">100</option>
					</select>
				</div>
			</div>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary-600)"></div>
				<p class="ml-4 text-(--color-surface-600-400)">{$t('admin.loadingAuditLogs')}</p>
			</div>
		{:else if loadErrored}
			<div
				class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 text-center space-y-3"
			>
				<p class="text-(--color-surface-800-200)">{$t('admin.auditLogsLoadFailed')}</p>
				<button type="button" class="{adminBtnPrimarySm} {adminRingPrimary}" on:click={loadLogs}>
					{$t('admin.auditLogsRetry')}
				</button>
			</div>
		{:else if logs.length === 0}
			<div class="text-center py-12">
				<p class="text-(--color-surface-600-400)">{$t('admin.noAuditLogsFound')}</p>
			</div>
		{:else}
			{#if pagination && rangeText}
				<p class="text-sm text-(--color-surface-600-400) mb-3">{rangeText}</p>
			{/if}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-surface-200-800">
						<thead class="bg-(--color-surface-50-950)">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider"
								>
									{$t('admin.auditLogsColumnActivity')}
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider w-48"
								>
									{$t('admin.auditLogsColumnWhen')}
								</th>
							</tr>
						</thead>
						<tbody class="bg-(--color-surface-50-950) divide-y divide-surface-200-800">
							{#each logs as log}
								<tr class="hover:bg-(--color-surface-50-950) align-top">
									<td class="px-6 py-4 text-sm text-(--color-surface-950-50)">
										<div class="font-medium">{log.summary || log.action}</div>
										<div class="text-xs text-(--color-surface-600-400) mt-0.5">
											{new Date(log.timestamp).toLocaleString()}
										</div>
										<details class="mt-2 text-xs text-(--color-surface-600-400)">
											<summary class="cursor-pointer select-none hover:text-(--color-surface-950-50)">
												{$t('admin.auditLogsMoreDetails')}
											</summary>
											<dl class="mt-2 space-y-1 pl-1 border-l-2 border-surface-300-700">
												<div class="flex gap-2 flex-wrap">
													<dt class="font-medium">{$t('admin.action')}:</dt>
													<dd>{log.action}</dd>
												</div>
												{#if log.userDisplayName || log.userId}
													<div class="flex gap-2 flex-wrap">
														<dt class="font-medium">{$t('admin.user')}:</dt>
														<dd>{log.userDisplayName || log.userId}</dd>
													</div>
												{/if}
												<div class="flex gap-2 flex-wrap">
													<dt class="font-medium">{$t('admin.resource')}:</dt>
													<dd>
														{log.resourceType}{log.resourceAlias || log.resourceId
															? `:${log.resourceAlias || log.resourceId}`
															: ''}
													</dd>
												</div>
												<div class="flex gap-2 flex-wrap">
													<dt class="font-medium">{$t('admin.ipAddress')}:</dt>
													<dd>{log.ip || '—'}</dd>
												</div>
												<div class="flex gap-2 flex-wrap">
													<dt class="font-medium">{$t('admin.userAgent')}:</dt>
													<dd class="break-all">{log.userAgent || '—'}</dd>
												</div>
											</dl>
										</details>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-(--color-surface-600-400)">
										{formatRelativeTime(log.timestamp, $currentLanguage)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			{#if pagination && pagination.totalPages > 1}
				<div class="flex flex-wrap items-center justify-between gap-3 mt-6">
					<button
						type="button"
						class="{adminBtnSecondary}"
						disabled={currentPage <= 1}
						on:click={() => goPage(currentPage - 1)}
					>
						{$t('pagination.previous')}
					</button>
					<span class="text-sm text-(--color-surface-600-400)">
						{$t('admin.auditLogsPageIndicator')
							.replace('{page}', String(currentPage))
							.replace('{totalPages}', String(pagination.totalPages))}
					</span>
					<button
						type="button"
						class="{adminBtnSecondary}"
						disabled={currentPage >= pagination.totalPages}
						on:click={() => goPage(currentPage + 1)}
					>
						{$t('pagination.next')}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
