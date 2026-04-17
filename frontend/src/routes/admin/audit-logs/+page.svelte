<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { t } from '$stores/i18n';
import { logger } from '$lib/utils/logger';
import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

// PageData is loaded via +page.server.ts; this component does not
// currently consume it directly, so we omit the prop to avoid unused-export warnings.

	interface Log {
		_id: string;
		timestamp: string;
		action: string;
		userId?: string;
		userRole?: string;
		ip?: string;
		userAgent?: string;
		resourceType: string;
		resourceId?: string;
		resourceAlias?: string;
		details?: any;
	}

	let logs: Log[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadLogs();
	});

	async function loadLogs() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/admin/audit-logs?limit=100');
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			if (result.success) {
				logs = result.data || [];
			} else {
				throw new Error(result.error || 'Failed to load audit logs');
			}
		} catch (err) {
			logger.error('Error loading audit logs:', err);
			error = handleError(err, 'Failed to load audit logs');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.auditLogs')} - {$t('navigation.admin')}</title>
</svelte:head>

<Header />

<main class="py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-(--color-surface-950-50)">{$t('admin.auditLogs')}</h1>
			<p class="mt-2 text-(--color-surface-600-400)">{$t('admin.viewSystemActivity')}</p>
		</div>

		{#if error}
			<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
				<p class="text-red-800">{error}</p>
			</div>
		{/if}

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary-600)"></div>
				<p class="ml-4 text-(--color-surface-600-400)">{$t('admin.loadingAuditLogs')}</p>
			</div>
		{:else if logs.length === 0}
			<div class="text-center py-12">
				<p class="text-(--color-surface-600-400)">{$t('admin.noAuditLogsFound')}</p>
			</div>
		{:else}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-surface-200-800">
						<thead class="bg-(--color-surface-50-950)">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
									{$t('admin.time')}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
									{$t('admin.action')}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
									{$t('admin.user')}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
									{$t('admin.resource')}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
									{$t('admin.ipAddress')}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
									{$t('admin.userAgent')}
								</th>
							</tr>
						</thead>
						<tbody class="bg-(--color-surface-50-950) divide-y divide-surface-200-800">
							{#each logs as log}
								<tr class="hover:bg-(--color-surface-50-950)">
									<td class="px-6 py-4 whitespace-nowrap text-sm text-(--color-surface-950-50)">
										{new Date(log.timestamp).toLocaleString()}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-(--color-surface-950-50)">
										{log.action}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-(--color-surface-600-400)">
										{log.userId || 'anon'} {log.userRole ? `(${log.userRole})` : ''}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-(--color-surface-600-400)">
										{log.resourceType}:{log.resourceAlias || log.resourceId || '-'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-(--color-surface-600-400)">
										{log.ip || '-'}
									</td>
									<td class="px-6 py-4 text-sm text-(--color-surface-600-400) max-w-xs truncate" title={log.userAgent || ''}>
										{log.userAgent || '-'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</main>

<Footer />
