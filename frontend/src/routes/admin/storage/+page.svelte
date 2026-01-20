<script lang="ts">
	import { onMount } from 'svelte';
	import StorageTreeItem from '$lib/components/StorageTreeItem.svelte';

	interface StorageConfig {
		providerId: string;
		name: string;
		isEnabled: boolean;
		config: Record<string, any>;
	}

	let configs: StorageConfig[] = [];
	let loading = true;
	let error = '';
	let activeTab: string = 'google-drive';
	let saving = false;
	let saveError = '';
	let saveSuccess = '';
	let testingConnection = false;
	let testResult = '';
	let treeData: any = null;
	let loadingTree = false;
	let treeError = '';
	let showTreeView = false;

	// Form data for each provider
	let formData: Record<string, any> = {};
	
	// Reactive computed property for current form data
	$: currentFormData = formData[activeTab] || {};

	onMount(async () => {
		await loadConfigs();
	});

	async function loadConfigs() {
		try {
			loading = true;
			error = '';
			const response = await fetch('/api/admin/storage', {
				credentials: 'include'
			});
			if (!response.ok) {
				throw new Error('Failed to fetch storage configurations');
			}
			const data = await response.json();
			configs = Array.isArray(data) ? data : data.data || [];
			
			// Initialize form data for each provider
			configs.forEach(config => {
				formData[config.providerId] = {
					isEnabled: config.isEnabled || false,
					...config.config
				};
			});
			
			// Set active tab to first enabled provider or first provider
			if (configs.length > 0) {
				const enabledProvider = configs.find(c => c.isEnabled);
				activeTab = enabledProvider?.providerId || configs[0].providerId;
			}
		} catch (err) {
			console.error('Failed to load storage configs:', err);
			error = err instanceof Error ? err.message : 'Failed to load storage configurations';
		} finally {
			loading = false;
		}
	}

	async function saveConfig(providerId: string) {
		try {
			saving = true;
			saveError = '';
			saveSuccess = '';
			
			const data = formData[providerId] || {};
			
			const response = await fetch(`/api/admin/storage/${providerId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(data)
			});
			
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || errorData.message || 'Failed to save configuration');
			}
			
			saveSuccess = 'Configuration saved successfully!';
			setTimeout(() => {
				saveSuccess = '';
			}, 3000);
			
			// Reload configs to get updated data
			await loadConfigs();
		} catch (err) {
			console.error('Failed to save config:', err);
			saveError = err instanceof Error ? err.message : 'Failed to save configuration';
		} finally {
			saving = false;
		}
	}

	async function testConnection(providerId: string) {
		try {
			testingConnection = true;
			testResult = '';
			
			const response = await fetch(`/api/admin/storage/${providerId}/test`, {
				method: 'POST',
				credentials: 'include'
			});
			
			const result = await response.json();
			
			if (result.success) {
				testResult = 'success';
			} else {
				testResult = 'error';
				throw new Error(result.error || 'Connection test failed');
			}
		} catch (err) {
			console.error('Connection test failed:', err);
			testResult = 'error';
			testResult = err instanceof Error ? err.message : 'Connection test failed';
		} finally {
			testingConnection = false;
		}
	}

	async function loadTree(providerId: string) {
		if (!providerId) return;
		
		try {
			loadingTree = true;
			treeError = '';
			treeData = null;
			
			const response = await fetch(`/api/admin/storage/${providerId}/tree?maxDepth=10`, {
				credentials: 'include'
			});
			
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Failed to load tree: ${response.statusText}`);
			}
			
			const result = await response.json();
			console.log('Tree response:', result);
			
			// Handle different response formats
			if (result.success && result.data) {
				treeData = result.data;
			} else if (result.data && !result.success) {
				// Sometimes data is returned directly
				treeData = result.data;
			} else if (result.path || result.folders || result.files) {
				// Tree data might be returned directly without wrapper
				treeData = result;
			} else {
				console.error('Invalid tree response format:', result);
				throw new Error('Invalid tree response format');
			}
		} catch (err) {
			console.error('Failed to load tree:', err);
			treeError = err instanceof Error ? err.message : 'Failed to load folder tree';
			treeData = null;
		} finally {
			loadingTree = false;
		}
	}

	function toggleTreeView(providerId: string) {
		if (showTreeView && activeTab === providerId) {
			showTreeView = false;
			treeData = null;
		} else {
			showTreeView = true;
			activeTab = providerId;
			loadTree(providerId);
		}
	}

	function getCurrentConfig() {
		return configs.find(c => c.providerId === activeTab);
	}
	
	function updateFormData(field: string, value: any) {
		if (!formData[activeTab]) {
			const config = configs.find(c => c.providerId === activeTab);
			formData[activeTab] = {
				isEnabled: config?.isEnabled || false,
				...(config?.config || {})
			};
		}
		formData[activeTab] = {
			...formData[activeTab],
			[field]: value
		};
		// Trigger reactivity
		formData = { ...formData };
	}
</script>

<svelte:head>
	<title>Storage Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900">Storage Management</h1>
			<p class="mt-2 text-sm text-gray-600">Configure and manage storage providers</p>
		</div>

		{#if error}
			<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		{/if}

		{#if loading}
			<div class="bg-white rounded-lg shadow p-6">
				<p class="text-gray-600">Loading storage configurations...</p>
			</div>
		{:else if configs.length === 0}
			<div class="bg-white rounded-lg shadow p-6">
				<p class="text-gray-600">No storage providers configured.</p>
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow">
				<!-- Tabs -->
				<div class="border-b border-gray-200">
					<nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
						{#each configs as config}
							<button
								type="button"
							on:click={() => {
								activeTab = config.providerId;
								showTreeView = false;
								treeData = null;
								// Ensure form data exists for this provider
								if (!formData[config.providerId]) {
									formData[config.providerId] = {
										isEnabled: config.isEnabled || false,
										...config.config
									};
									formData = { ...formData };
								}
							}}
								class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === config.providerId
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
							>
								{config.name}
								{#if config.isEnabled}
									<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
										Enabled
									</span>
								{/if}
							</button>
						{/each}
					</nav>
				</div>

				<!-- Tab Content -->
				<div class="p-6">
					{#if activeTab === 'google-drive'}
						<!-- Google Drive Configuration -->
						<div class="space-y-6">
							<div>
								<h2 class="text-xl font-semibold text-gray-900 mb-4">Google Drive Configuration</h2>
								
								{#if saveSuccess}
									<div class="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
										<p class="text-sm text-green-800">{saveSuccess}</p>
									</div>
								{/if}
								
								{#if saveError}
									<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
										<p class="text-sm text-red-800">{saveError}</p>
									</div>
								{/if}

								<form on:submit|preventDefault={() => saveConfig('google-drive')} class="space-y-4">
									<div class="flex items-center">
										<input
											type="checkbox"
											id="gd-enabled"
											checked={currentFormData.isEnabled || false}
											on:change={(e) => updateFormData('isEnabled', e.currentTarget.checked)}
											class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<label for="gd-enabled" class="ml-2 block text-sm font-medium text-gray-700">
											Enable Google Drive Storage
										</label>
									</div>

									<div>
										<label for="gd-client-id" class="block text-sm font-medium text-gray-700 mb-2">
											Client ID
										</label>
										<input
											type="text"
											id="gd-client-id"
											value={currentFormData.clientId || ''}
											on:input={(e) => updateFormData('clientId', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter Google OAuth Client ID"
										/>
									</div>

									<div>
										<label for="gd-client-secret" class="block text-sm font-medium text-gray-700 mb-2">
											Client Secret
										</label>
										<input
											type="password"
											id="gd-client-secret"
											value={currentFormData.clientSecret || ''}
											on:input={(e) => updateFormData('clientSecret', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter Google OAuth Client Secret"
										/>
									</div>

									<div>
										<label for="gd-refresh-token" class="block text-sm font-medium text-gray-700 mb-2">
											Refresh Token
										</label>
										<input
											type="text"
											id="gd-refresh-token"
											value={currentFormData.refreshToken || ''}
											on:input={(e) => updateFormData('refreshToken', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter OAuth Refresh Token"
										/>
										<p class="mt-1 text-xs text-gray-500">
											Get this by completing the OAuth flow after saving Client ID and Secret
										</p>
									</div>

									<div>
										<label for="gd-storage-type" class="block text-sm font-medium text-gray-700 mb-2">
											Storage Type
										</label>
										<select
											id="gd-storage-type"
											value={currentFormData.storageType || 'appdata'}
											on:change={(e) => updateFormData('storageType', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										>
											<option value="appdata">Hidden (AppData Folder)</option>
											<option value="visible">Visible in User's Drive</option>
										</select>
										<p class="mt-1 text-xs text-gray-500">
											{#if (currentFormData.storageType || 'appdata') === 'appdata'}
												Files will be hidden from users in AppData folder
											{:else}
												Files will be visible in user's Google Drive
											{/if}
										</p>
									</div>

									{#if (currentFormData.storageType || 'appdata') === 'visible'}
										<div>
											<label for="gd-folder-id" class="block text-sm font-medium text-gray-700 mb-2">
												Folder ID (Optional)
											</label>
											<input
												type="text"
												id="gd-folder-id"
												value={currentFormData.folderId || ''}
												on:input={(e) => updateFormData('folderId', e.currentTarget.value)}
												class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
												placeholder="Leave empty to use root folder"
											/>
											<p class="mt-1 text-xs text-gray-500">
												Google Drive folder ID where files will be stored. Leave empty for root folder.
											</p>
										</div>
									{/if}

									<div class="flex gap-4">
										<button
											type="submit"
											disabled={saving}
											class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{saving ? 'Saving...' : 'Save Configuration'}
										</button>
										<button
											type="button"
											on:click={() => testConnection('google-drive')}
											disabled={testingConnection}
											class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{testingConnection ? 'Testing...' : 'Test Connection'}
										</button>
										<button
											type="button"
											on:click={() => toggleTreeView('google-drive')}
											class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
										>
											{showTreeView && activeTab === 'google-drive' ? 'Hide Tree' : 'View Tree'}
										</button>
									</div>
								</form>
							</div>

							<!-- Tree View -->
							{#if showTreeView && activeTab === 'google-drive'}
								<div class="border-t border-gray-200 pt-6">
									<h3 class="text-lg font-semibold text-gray-900 mb-4">Folder Tree</h3>
									{#if loadingTree}
										<div class="text-center py-12">
											<p class="text-gray-600">Loading folder tree...</p>
										</div>
									{:else if treeError}
										<div class="bg-red-50 border border-red-200 rounded-md p-4">
											<p class="text-sm text-red-800">{treeError}</p>
											<button
												type="button"
												on:click={() => loadTree('google-drive')}
												class="mt-3 text-sm text-red-600 hover:text-red-800 underline"
											>
												Retry
											</button>
										</div>
									{:else if treeData}
										<div class="overflow-auto max-h-[600px] border border-gray-200 rounded-md p-4 bg-gray-50">
											<StorageTreeItem node={treeData} depth={0} />
										</div>
									{:else}
										<div class="text-center py-12">
											<p class="text-gray-600">No data available</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{:else if activeTab === 'aws-s3'}
						<!-- AWS S3 Configuration -->
						<div class="space-y-6">
							<div>
								<h2 class="text-xl font-semibold text-gray-900 mb-4">Amazon S3 Configuration</h2>
								
								{#if saveSuccess}
									<div class="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
										<p class="text-sm text-green-800">{saveSuccess}</p>
									</div>
								{/if}
								
								{#if saveError}
									<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
										<p class="text-sm text-red-800">{saveError}</p>
									</div>
								{/if}

								<form on:submit|preventDefault={() => saveConfig('aws-s3')} class="space-y-4">
									<div class="flex items-center">
										<input
											type="checkbox"
											id="s3-enabled"
											checked={currentFormData.isEnabled || false}
											on:change={(e) => updateFormData('isEnabled', e.currentTarget.checked)}
											class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<label for="s3-enabled" class="ml-2 block text-sm font-medium text-gray-700">
											Enable Amazon S3 Storage
										</label>
									</div>

									<div>
										<label for="s3-access-key" class="block text-sm font-medium text-gray-700 mb-2">
											Access Key ID
										</label>
										<input
											type="text"
											id="s3-access-key"
											value={currentFormData.accessKeyId || ''}
											on:input={(e) => updateFormData('accessKeyId', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter AWS Access Key ID"
										/>
									</div>

									<div>
										<label for="s3-secret-key" class="block text-sm font-medium text-gray-700 mb-2">
											Secret Access Key
										</label>
										<input
											type="password"
											id="s3-secret-key"
											value={currentFormData.secretAccessKey || ''}
											on:input={(e) => updateFormData('secretAccessKey', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter AWS Secret Access Key"
										/>
									</div>

									<div>
										<label for="s3-region" class="block text-sm font-medium text-gray-700 mb-2">
											Region
										</label>
										<input
											type="text"
											id="s3-region"
											value={currentFormData.region || 'us-east-1'}
											on:input={(e) => updateFormData('region', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="e.g., us-east-1"
										/>
									</div>

									<div>
										<label for="s3-bucket" class="block text-sm font-medium text-gray-700 mb-2">
											Bucket Name
										</label>
										<input
											type="text"
											id="s3-bucket"
											value={currentFormData.bucketName || ''}
											on:input={(e) => updateFormData('bucketName', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter S3 bucket name"
										/>
									</div>

									<div class="flex gap-4">
										<button
											type="submit"
											disabled={saving}
											class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{saving ? 'Saving...' : 'Save Configuration'}
										</button>
										<button
											type="button"
											on:click={() => testConnection('aws-s3')}
											disabled={testingConnection}
											class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{testingConnection ? 'Testing...' : 'Test Connection'}
										</button>
										<button
											type="button"
											on:click={() => toggleTreeView('aws-s3')}
											class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
										>
											{showTreeView && activeTab === 'aws-s3' ? 'Hide Tree' : 'View Tree'}
										</button>
									</div>
								</form>
							</div>

							<!-- Tree View -->
							{#if showTreeView && activeTab === 'aws-s3'}
								<div class="border-t border-gray-200 pt-6">
									<h3 class="text-lg font-semibold text-gray-900 mb-4">Folder Tree</h3>
									{#if loadingTree}
										<div class="text-center py-12">
											<p class="text-gray-600">Loading folder tree...</p>
										</div>
									{:else if treeError}
										<div class="bg-red-50 border border-red-200 rounded-md p-4">
											<p class="text-sm text-red-800">{treeError}</p>
											<button
												type="button"
												on:click={() => loadTree('aws-s3')}
												class="mt-3 text-sm text-red-600 hover:text-red-800 underline"
											>
												Retry
											</button>
										</div>
									{:else if treeData}
										<div class="overflow-auto max-h-[600px] border border-gray-200 rounded-md p-4 bg-gray-50">
											<StorageTreeItem node={treeData} depth={0} />
										</div>
									{:else}
										<div class="text-center py-12">
											<p class="text-gray-600">No data available</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{:else if activeTab === 'backblaze'}
						<!-- Backblaze Configuration -->
						<div class="space-y-6">
							<div>
								<h2 class="text-xl font-semibold text-gray-900 mb-4">Backblaze B2 Configuration</h2>
								
								{#if saveSuccess}
									<div class="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
										<p class="text-sm text-green-800">{saveSuccess}</p>
									</div>
								{/if}
								
								{#if saveError}
									<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
										<p class="text-sm text-red-800">{saveError}</p>
									</div>
								{/if}

								<form on:submit|preventDefault={() => saveConfig('backblaze')} class="space-y-4">
									<div class="flex items-center">
										<input
											type="checkbox"
											id="bb-enabled"
											checked={currentFormData.isEnabled || false}
											on:change={(e) => updateFormData('isEnabled', e.currentTarget.checked)}
											class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<label for="bb-enabled" class="ml-2 block text-sm font-medium text-gray-700">
											Enable Backblaze B2 Storage
										</label>
									</div>

									<div>
										<label for="bb-key-id" class="block text-sm font-medium text-gray-700 mb-2">
											Application Key ID
										</label>
										<input
											type="text"
											id="bb-key-id"
											value={currentFormData.applicationKeyId || ''}
											on:input={(e) => updateFormData('applicationKeyId', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="24-character key ID (starts with K)"
										/>
									</div>

									<div>
										<label for="bb-key" class="block text-sm font-medium text-gray-700 mb-2">
											Application Key
										</label>
										<input
											type="password"
											id="bb-key"
											value={currentFormData.applicationKey || ''}
											on:input={(e) => updateFormData('applicationKey', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="32-character application key"
										/>
									</div>

									<div>
										<label for="bb-bucket" class="block text-sm font-medium text-gray-700 mb-2">
											Bucket Name
										</label>
										<input
											type="text"
											id="bb-bucket"
											value={currentFormData.bucketName || ''}
											on:input={(e) => updateFormData('bucketName', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter B2 bucket name"
										/>
									</div>

									<div>
										<label for="bb-region" class="block text-sm font-medium text-gray-700 mb-2">
											Region
										</label>
										<input
											type="text"
											id="bb-region"
											value={currentFormData.region || ''}
											on:input={(e) => updateFormData('region', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="e.g., us-west-2"
										/>
									</div>

									<div>
										<label for="bb-endpoint" class="block text-sm font-medium text-gray-700 mb-2">
											Endpoint (Optional)
										</label>
										<input
											type="text"
											id="bb-endpoint"
											value={currentFormData.endpoint || ''}
											on:input={(e) => updateFormData('endpoint', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="e.g., https://s3.us-west-2.backblazeb2.com"
										/>
									</div>

									<div class="flex gap-4">
										<button
											type="submit"
											disabled={saving}
											class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{saving ? 'Saving...' : 'Save Configuration'}
										</button>
										<button
											type="button"
											on:click={() => testConnection('backblaze')}
											disabled={testingConnection}
											class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{testingConnection ? 'Testing...' : 'Test Connection'}
										</button>
										<button
											type="button"
											on:click={() => toggleTreeView('backblaze')}
											class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
										>
											{showTreeView && activeTab === 'backblaze' ? 'Hide Tree' : 'View Tree'}
										</button>
									</div>
								</form>
							</div>

							<!-- Tree View -->
							{#if showTreeView && activeTab === 'backblaze'}
								<div class="border-t border-gray-200 pt-6">
									<h3 class="text-lg font-semibold text-gray-900 mb-4">Folder Tree</h3>
									{#if loadingTree}
										<div class="text-center py-12">
											<p class="text-gray-600">Loading folder tree...</p>
										</div>
									{:else if treeError}
										<div class="bg-red-50 border border-red-200 rounded-md p-4">
											<p class="text-sm text-red-800">{treeError}</p>
											<button
												type="button"
												on:click={() => loadTree('backblaze')}
												class="mt-3 text-sm text-red-600 hover:text-red-800 underline"
											>
												Retry
											</button>
										</div>
									{:else if treeData}
										<div class="overflow-auto max-h-[600px] border border-gray-200 rounded-md p-4 bg-gray-50">
											<StorageTreeItem node={treeData} depth={0} />
										</div>
									{:else}
										<div class="text-center py-12">
											<p class="text-gray-600">No data available</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{:else if activeTab === 'wasabi'}
						<!-- Wasabi Configuration -->
						<div class="space-y-6">
							<div>
								<h2 class="text-xl font-semibold text-gray-900 mb-4">Wasabi Configuration</h2>
								
								{#if saveSuccess}
									<div class="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
										<p class="text-sm text-green-800">{saveSuccess}</p>
									</div>
								{/if}
								
								{#if saveError}
									<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
										<p class="text-sm text-red-800">{saveError}</p>
									</div>
								{/if}

								<form on:submit|preventDefault={() => saveConfig('wasabi')} class="space-y-4">
									<div class="flex items-center">
										<input
											type="checkbox"
											id="wa-enabled"
											checked={currentFormData.isEnabled || false}
											on:change={(e) => updateFormData('isEnabled', e.currentTarget.checked)}
											class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<label for="wa-enabled" class="ml-2 block text-sm font-medium text-gray-700">
											Enable Wasabi Storage
										</label>
									</div>

									<div>
										<label for="wa-access-key" class="block text-sm font-medium text-gray-700 mb-2">
											Access Key ID
										</label>
										<input
											type="text"
											id="wa-access-key"
											value={currentFormData.accessKeyId || ''}
											on:input={(e) => updateFormData('accessKeyId', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter Wasabi Access Key ID"
										/>
									</div>

									<div>
										<label for="wa-secret-key" class="block text-sm font-medium text-gray-700 mb-2">
											Secret Access Key
										</label>
										<input
											type="password"
											id="wa-secret-key"
											value={currentFormData.secretAccessKey || ''}
											on:input={(e) => updateFormData('secretAccessKey', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter Wasabi Secret Access Key"
										/>
									</div>

									<div>
										<label for="wa-bucket" class="block text-sm font-medium text-gray-700 mb-2">
											Bucket Name
										</label>
										<input
											type="text"
											id="wa-bucket"
											value={currentFormData.bucketName || ''}
											on:input={(e) => updateFormData('bucketName', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="Enter Wasabi bucket name"
										/>
									</div>

									<div>
										<label for="wa-region" class="block text-sm font-medium text-gray-700 mb-2">
											Region
										</label>
										<input
											type="text"
											id="wa-region"
											value={currentFormData.region || ''}
											on:input={(e) => updateFormData('region', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="e.g., us-east-1"
										/>
									</div>

									<div>
										<label for="wa-endpoint" class="block text-sm font-medium text-gray-700 mb-2">
											Endpoint
										</label>
										<input
											type="text"
											id="wa-endpoint"
											value={currentFormData.endpoint || ''}
											on:input={(e) => updateFormData('endpoint', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="e.g., https://s3.wasabisys.com"
										/>
									</div>

									<div class="flex gap-4">
										<button
											type="submit"
											disabled={saving}
											class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{saving ? 'Saving...' : 'Save Configuration'}
										</button>
										<button
											type="button"
											on:click={() => testConnection('wasabi')}
											disabled={testingConnection}
											class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{testingConnection ? 'Testing...' : 'Test Connection'}
										</button>
										<button
											type="button"
											on:click={() => toggleTreeView('wasabi')}
											class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
										>
											{showTreeView && activeTab === 'wasabi' ? 'Hide Tree' : 'View Tree'}
										</button>
									</div>
								</form>
							</div>

							<!-- Tree View -->
							{#if showTreeView && activeTab === 'wasabi'}
								<div class="border-t border-gray-200 pt-6">
									<h3 class="text-lg font-semibold text-gray-900 mb-4">Folder Tree</h3>
									{#if loadingTree}
										<div class="text-center py-12">
											<p class="text-gray-600">Loading folder tree...</p>
										</div>
									{:else if treeError}
										<div class="bg-red-50 border border-red-200 rounded-md p-4">
											<p class="text-sm text-red-800">{treeError}</p>
											<button
												type="button"
												on:click={() => loadTree('wasabi')}
												class="mt-3 text-sm text-red-600 hover:text-red-800 underline"
											>
												Retry
											</button>
										</div>
									{:else if treeData}
										<div class="overflow-auto max-h-[600px] border border-gray-200 rounded-md p-4 bg-gray-50">
											<StorageTreeItem node={treeData} depth={0} />
										</div>
									{:else}
										<div class="text-center py-12">
											<p class="text-gray-600">No data available</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{:else if activeTab === 'local'}
						<!-- Local Storage Configuration -->
						<div class="space-y-6">
							<div>
								<h2 class="text-xl font-semibold text-gray-900 mb-4">Local Storage Configuration</h2>
								
								{#if saveSuccess}
									<div class="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
										<p class="text-sm text-green-800">{saveSuccess}</p>
									</div>
								{/if}
								
								{#if saveError}
									<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
										<p class="text-sm text-red-800">{saveError}</p>
									</div>
								{/if}

								<form on:submit|preventDefault={() => saveConfig('local')} class="space-y-4">
									<div class="flex items-center">
										<input
											type="checkbox"
											id="local-enabled"
											checked={currentFormData.isEnabled || false}
											on:change={(e) => updateFormData('isEnabled', e.currentTarget.checked)}
											class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<label for="local-enabled" class="ml-2 block text-sm font-medium text-gray-700">
											Enable Local Storage
										</label>
									</div>

									<div>
										<label for="local-path" class="block text-sm font-medium text-gray-700 mb-2">
											Base Path
										</label>
										<input
											type="text"
											id="local-path"
											value={currentFormData.basePath || '/app/public/albums'}
											on:input={(e) => updateFormData('basePath', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="/app/public/albums"
										/>
										<p class="mt-1 text-xs text-gray-500">
											Base directory path where files will be stored on the server
										</p>
									</div>

									<div>
										<label for="local-max-size" class="block text-sm font-medium text-gray-700 mb-2">
											Max File Size
										</label>
										<input
											type="text"
											id="local-max-size"
											value={currentFormData.maxFileSize || '100MB'}
											on:input={(e) => updateFormData('maxFileSize', e.currentTarget.value)}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											placeholder="100MB"
										/>
										<p class="mt-1 text-xs text-gray-500">
											Maximum file size limit (e.g., 100MB, 500MB)
										</p>
									</div>

									<div class="flex gap-4">
										<button
											type="submit"
											disabled={saving}
											class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{saving ? 'Saving...' : 'Save Configuration'}
										</button>
										<button
											type="button"
											on:click={() => testConnection('local')}
											disabled={testingConnection}
											class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{testingConnection ? 'Testing...' : 'Test Connection'}
										</button>
										<button
											type="button"
											on:click={() => toggleTreeView('local')}
											class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
										>
											{showTreeView && activeTab === 'local' ? 'Hide Tree' : 'View Tree'}
										</button>
									</div>
								</form>
							</div>

							<!-- Tree View -->
							{#if showTreeView && activeTab === 'local'}
								<div class="border-t border-gray-200 pt-6">
									<h3 class="text-lg font-semibold text-gray-900 mb-4">Folder Tree</h3>
									{#if loadingTree}
										<div class="text-center py-12">
											<p class="text-gray-600">Loading folder tree...</p>
										</div>
									{:else if treeError}
										<div class="bg-red-50 border border-red-200 rounded-md p-4">
											<p class="text-sm text-red-800">{treeError}</p>
											<button
												type="button"
												on:click={() => loadTree('local')}
												class="mt-3 text-sm text-red-600 hover:text-red-800 underline"
											>
												Retry
											</button>
										</div>
									{:else if treeData}
										<div class="overflow-auto max-h-[600px] border border-gray-200 rounded-md p-4 bg-gray-50">
											<StorageTreeItem node={treeData} depth={0} />
										</div>
									{:else}
										<div class="text-center py-12">
											<p class="text-gray-600">No data available</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{:else}
						<!-- Unknown provider -->
						<div class="space-y-6">
							<div>
								<h2 class="text-xl font-semibold text-gray-900 mb-4">{getCurrentConfig()?.name || activeTab} Configuration</h2>
								<p class="text-gray-600">Configuration form for {activeTab} coming soon...</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
