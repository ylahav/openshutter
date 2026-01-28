<script lang="ts">
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface DeploymentStatus {
		project: {
			frontend: { version: string; buildExists: boolean; path: string };
			backend: { version: string; buildExists: boolean; path: string };
		};
		environment: {
			nodeVersion: string;
			docker: { available: boolean; version: string };
			pm2: { available: boolean; version: string };
		};
		deploymentPackages: Array<{
			name: string;
			size: number;
			sizeFormatted: string;
			modified: string;
		}>;
	}

	let status: DeploymentStatus | null = null;
	let loading = true;
	let error = '';
	let preparing = false;
	let prepareError = '';

	// Deployment configuration form
	let deploymentConfig = {
		domain: '',
		port: 4000,
		appName: 'openshutter',
		projectRoot: '/var/www/yourdomain.com',
	};

	onMount(async () => {
		await loadStatus();
	});

	async function loadStatus() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/admin/deployment/status');
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			status = result.data || result;
		} catch (err) {
			logger.error('Error loading deployment status:', err);
			error = handleError(err, 'Failed to load deployment status');
		} finally {
			loading = false;
		}
	}

	async function prepareDeployment() {
		if (!deploymentConfig.domain || deploymentConfig.domain === 'yourdomain.com') {
			prepareError = 'Please provide a valid domain name';
			return;
		}

		preparing = true;
		prepareError = '';

		try {
			const response = await fetch('/api/admin/deployment/prepare', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(deploymentConfig),
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			// Download the ZIP file
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `openshutter-deployment-${deploymentConfig.domain}.zip`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			// Reload status to show new package
			await loadStatus();
		} catch (err) {
			logger.error('Error preparing deployment:', err);
			prepareError = handleError(err, 'Failed to prepare deployment');
		} finally {
			preparing = false;
		}
	}

	function formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleString();
		} catch {
			return dateString;
		}
	}
</script>

<svelte:head>
	<title>Deployment Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Deployment Management</h1>
				<p class="text-gray-600 mt-2">Manage deployment packages and monitor deployment status</p>
			</div>
			<a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
				← Back to Admin
			</a>
		</div>

		{#if error}
			<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
		{/if}

		{#if loading}
			<div class="text-center py-8">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<p class="mt-2 text-gray-600">Loading deployment status...</p>
			</div>
		{:else if status}
			<!-- Environment Status -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Environment Status</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div class="p-4 bg-blue-50 rounded-lg">
						<p class="text-sm text-gray-600">Node.js</p>
						<p class="text-lg font-semibold text-blue-600">{status.environment.nodeVersion}</p>
					</div>
					<div class="p-4 {status.environment.docker.available ? 'bg-green-50' : 'bg-gray-50'} rounded-lg">
						<p class="text-sm text-gray-600">Docker</p>
						<p class="text-lg font-semibold {status.environment.docker.available ? 'text-green-600' : 'text-gray-400'}">
							{status.environment.docker.available ? status.environment.docker.version : 'Not Available'}
						</p>
					</div>
					<div class="p-4 {status.environment.pm2.available ? 'bg-green-50' : 'bg-gray-50'} rounded-lg">
						<p class="text-sm text-gray-600">PM2</p>
						<p class="text-lg font-semibold {status.environment.pm2.available ? 'text-green-600' : 'text-gray-400'}">
							{status.environment.pm2.available ? `v${status.environment.pm2.version}` : 'Not Available'}
						</p>
					</div>
					<div class="p-4 bg-purple-50 rounded-lg">
						<p class="text-sm text-gray-600">Deployment Packages</p>
						<p class="text-lg font-semibold text-purple-600">{status.deploymentPackages.length}</p>
					</div>
				</div>
			</div>

			<!-- Project Status -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Project Status</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<h3 class="text-sm font-medium text-gray-700 mb-2">Frontend</h3>
						<div class="space-y-2">
							<div class="flex justify-between">
								<span class="text-gray-600">Version</span>
								<span class="font-semibold">{status.project.frontend.version}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Build Status</span>
								<span class="{status.project.frontend.buildExists ? 'text-green-600' : 'text-red-600'}">
									{status.project.frontend.buildExists ? '✓ Built' : '✗ Not Built'}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Path</span>
								<span class="text-xs text-gray-500 font-mono">{status.project.frontend.path}</span>
							</div>
						</div>
					</div>
					<div>
						<h3 class="text-sm font-medium text-gray-700 mb-2">Backend</h3>
						<div class="space-y-2">
							<div class="flex justify-between">
								<span class="text-gray-600">Version</span>
								<span class="font-semibold">{status.project.backend.version}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Build Status</span>
								<span class="{status.project.backend.buildExists ? 'text-green-600' : 'text-red-600'}">
									{status.project.backend.buildExists ? '✓ Built' : '✗ Not Built'}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Path</span>
								<span class="text-xs text-gray-500 font-mono">{status.project.backend.path}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Deployment Packages -->
			{#if status.deploymentPackages.length > 0}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Deployment Packages</h2>
					<div class="space-y-3">
						{#each status.deploymentPackages as pkg}
							<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
								<div class="flex-1">
									<p class="font-medium text-gray-900">{pkg.name}</p>
									<p class="text-xs text-gray-500">
										{pkg.sizeFormatted} • Modified: {formatDate(pkg.modified)}
									</p>
								</div>
								<a
									href="/api/storage/serve/local/{pkg.name}"
									download
									class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
								>
									Download
								</a>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Prepare Deployment Package -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Prepare Deployment Package</h2>
				<p class="text-sm text-gray-600 mb-4">
					Create a deployment ZIP package for PM2 deployment. Make sure to build the frontend first using
					<code class="bg-gray-100 px-2 py-1 rounded">pnpm build</code>.
				</p>

				{#if prepareError}
					<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700 text-sm">{prepareError}</div>
				{/if}

				<form on:submit|preventDefault={prepareDeployment} class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="domain" class="block text-sm font-medium text-gray-700 mb-1">
								Domain Name
							</label>
							<input
								type="text"
								id="domain"
								bind:value={deploymentConfig.domain}
								placeholder="yourdomain.com"
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="port" class="block text-sm font-medium text-gray-700 mb-1">Port</label>
							<input
								type="number"
								id="port"
								bind:value={deploymentConfig.port}
								min="1"
								max="65535"
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="appName" class="block text-sm font-medium text-gray-700 mb-1">
								Application Name
							</label>
							<input
								type="text"
								id="appName"
								bind:value={deploymentConfig.appName}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="projectRoot" class="block text-sm font-medium text-gray-700 mb-1">
								Project Root Path (Server)
							</label>
							<input
								type="text"
								id="projectRoot"
								bind:value={deploymentConfig.projectRoot}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
					</div>
					<button
						type="submit"
						disabled={preparing}
						class="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{preparing ? 'Preparing...' : 'Prepare Deployment Package'}
					</button>
				</form>
			</div>

			<!-- Deployment Instructions -->
			<div class="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-6">
				<h2 class="text-lg font-semibold text-blue-900 mb-4">Deployment Instructions</h2>
				<div class="space-y-4 text-sm text-blue-800">
					<div>
						<h3 class="font-semibold mb-2">1. Build the Application</h3>
						<pre class="bg-blue-100 p-3 rounded overflow-x-auto"><code>cd frontend
pnpm build</code></pre>
					</div>
					<div>
						<h3 class="font-semibold mb-2">2. Prepare Deployment Package</h3>
						<p class="mb-2">Use the form above to create a deployment ZIP package.</p>
					</div>
					<div>
						<h3 class="font-semibold mb-2">3. Upload to Server</h3>
						<pre class="bg-blue-100 p-3 rounded overflow-x-auto"><code>scp openshutter-deployment-*.zip user@your-server:/tmp/</code></pre>
					</div>
					<div>
						<h3 class="font-semibold mb-2">4. Deploy on Server</h3>
						<pre class="bg-blue-100 p-3 rounded overflow-x-auto"><code>ssh user@your-server
cd /var/www/yourdomain.com
unzip -o /tmp/openshutter-deployment-*.zip
pnpm install --frozen-lockfile
pm2 start ecosystem.config.js
pm2 save</code></pre>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
