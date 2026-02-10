<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

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
	<title>Audit Logs - Admin</title>
</svelte:head>

<Header />

<main class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Audit Logs</h1>
				<p class="mt-2 text-gray-600">View system activity and user actions</p>
			</div>
			<a href="/admin" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium">
				← Back to Admin
			</a>
		</div>

		{#if error}
			<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
				<p class="text-red-800">{error}</p>
			</div>
		{/if}

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				<p class="ml-4 text-gray-600">Loading audit logs...</p>
			</div>
		{:else if logs.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-500">No audit logs found</p>
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow overflow-hidden">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Time
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Action
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									User
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Resource
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									IP Address
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									User Agent
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each logs as log}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{new Date(log.timestamp).toLocaleString()}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{log.action}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
										{log.userId || 'anon'} {log.userRole ? `(${log.userRole})` : ''}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
										{log.resourceType}:{log.resourceAlias || log.resourceId || '-'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
										{log.ip || '-'}
									</td>
									<td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={log.userAgent || ''}>
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
