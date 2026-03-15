<script lang="ts">
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

	export let backHref = '/owner';

	interface StorageOption {
		id: string;
		name: string;
		type: string;
		isEnabled: boolean;
	}

	interface UserProfile {
		storageConfig?: {
			useAdminConfig?: boolean;
			googleDrive?: {
				rootFolderId?: string;
				sharedDriveId?: string;
				folderPrefix?: string;
				authMethod?: string;
				clientId?: string;
				clientSecret?: string;
				refreshToken?: string;
				storageType?: string;
				folderId?: string;
				serviceAccountJson?: string;
			};
			wasabi?: {
				endpoint?: string;
				bucketName?: string;
				region?: string;
				accessKeyId?: string;
				secretAccessKey?: string;
			};
		};
	}

	let profile: UserProfile | null = null as UserProfile | null;
	let storageOptions: StorageOption[] = [];
	let loading = true;
	let saving = false;
	let error: string | null = null;
	let success: string | null = null;
	let activeTab = '';

	let formData = {
		storageRootFolderId: '',
		storageSharedDriveId: '',
		storageFolderPrefix: '',
		gdAuthMethod: 'oauth',
		gdClientId: '',
		gdClientSecret: '',
		gdRefreshToken: '',
		gdStorageType: 'appdata',
		gdFolderId: '',
		gdServiceAccountJson: '',
		wasabiEndpoint: '',
		wasabiBucketName: '',
		wasabiRegion: '',
		wasabiAccessKeyId: '',
		wasabiSecretAccessKey: ''
	};

	let googleDriveMessage: { type: 'success' | 'error'; text: string } | null = null;
	let oauthWindow: Window | null = null;

	$: activeOption = storageOptions.find((o) => o.id === activeTab) || storageOptions[0];

	onMount(async () => {
		try {
			await Promise.all([fetchProfile(), fetchStorageOptions()]);
		} finally {
			loading = false;
		}
		setupGoogleOAuthListener();
	});

	function setupGoogleOAuthListener() {
		if (typeof window === 'undefined') return;
		window.addEventListener('message', async (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return;
			if (event.data?.type === 'GOOGLE_OAUTH_CODE') {
				const code = event.data.code as string | undefined;
				if (code) await handleGoogleOAuthCode(code);
			} else if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
				googleDriveMessage = { type: 'error', text: String(event.data.error || 'Authorization failed') };
				if (oauthWindow && !oauthWindow.closed) oauthWindow.close();
			}
		});
	}

	function buildGoogleAuthUrl(): string {
		const clientId = formData.gdClientId?.trim();
		const redirectUri = `${window.location.origin}/api/auth/google/callback`;
		const storageType = formData.gdStorageType || 'appdata';
		const scope = storageType === 'visible'
			? 'https://www.googleapis.com/auth/drive.file'
			: 'https://www.googleapis.com/auth/drive.appdata';
		return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId || '')}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
	}

	async function startGoogleOAuth() {
		googleDriveMessage = null;
		const clientId = formData.gdClientId?.trim();
		const clientSecret = formData.gdClientSecret?.trim();
		if (!clientId || !clientSecret) {
			googleDriveMessage = { type: 'error', text: 'Please enter and save Client ID and Client Secret first.' };
			return;
		}
		const authUrl = buildGoogleAuthUrl();
		oauthWindow = window.open(authUrl, 'google-drive-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');
		if (!oauthWindow) {
			googleDriveMessage = { type: 'error', text: 'Popup blocked. Please allow popups for this site and try again.' };
			return;
		}
		googleDriveMessage = { type: 'success', text: 'Authorization window opened. Complete the Google consent screen to continue.' };
	}

	async function handleGoogleOAuthCode(code: string) {
		googleDriveMessage = null;
		const clientId = formData.gdClientId?.trim();
		const clientSecret = formData.gdClientSecret?.trim();
		if (!clientId || !clientSecret) {
			googleDriveMessage = { type: 'error', text: 'Client ID / Secret are missing. Please save them and try again.' };
			return;
		}
		const redirectUri = `${window.location.origin}/api/auth/google/callback`;
		try {
			const tokenResponse = await fetch('/api/auth/google/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code, clientId, clientSecret, redirectUri })
			});
			const tokenData = await tokenResponse.json().catch(() => ({}));
			if (!tokenResponse.ok || !tokenData?.success || !tokenData?.refreshToken) {
				throw new Error(tokenData?.error || 'Failed to exchange code for tokens.');
			}
			formData.gdRefreshToken = tokenData.refreshToken;
			// Save to profile immediately
			await saveStorageConfig();
			googleDriveMessage = { type: 'success', text: 'New refresh token generated and saved successfully.' };
		} catch (err) {
			googleDriveMessage = { type: 'error', text: err instanceof Error ? err.message : 'Failed to complete Google authorization.' };
		} finally {
			if (oauthWindow && !oauthWindow.closed) oauthWindow.close();
			oauthWindow = null;
		}
	}

	async function saveStorageConfig() {
		if (!profile || profile.storageConfig?.useAdminConfig === true) return;
		const storageConfig = buildStorageConfig();
		const response = await fetch('/api/auth/profile', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ storageConfig })
		});
		if (!response.ok) await handleApiErrorResponse(response);
		const result = await response.json();
		profile = (result.user || result) as UserProfile;
	}

	$: if (storageOptions.length > 0 && !activeTab) {
		activeTab = storageOptions[0].id;
	}

	async function fetchProfile() {
		try {
			const response = await fetch('/api/auth/profile');
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			profile = (result.user || result) as UserProfile;
			if (profile?.storageConfig?.googleDrive) {
				const gd = profile.storageConfig.googleDrive;
				formData.storageRootFolderId = gd.rootFolderId ?? '';
				formData.storageSharedDriveId = gd.sharedDriveId ?? '';
				formData.storageFolderPrefix = gd.folderPrefix ?? '';
				formData.gdAuthMethod = gd.authMethod ?? 'oauth';
				formData.gdClientId = gd.clientId ?? '';
				formData.gdClientSecret = gd.clientSecret ?? '';
				formData.gdRefreshToken = gd.refreshToken ?? '';
				formData.gdStorageType = gd.storageType ?? 'appdata';
				formData.gdFolderId = gd.folderId ?? '';
				formData.gdServiceAccountJson = gd.serviceAccountJson ?? '';
			}
			if (profile?.storageConfig?.wasabi) {
				const wa = profile.storageConfig.wasabi;
				formData.wasabiEndpoint = wa.endpoint ?? '';
				formData.wasabiBucketName = wa.bucketName ?? '';
				formData.wasabiRegion = wa.region ?? '';
				formData.wasabiAccessKeyId = wa.accessKeyId ?? '';
				formData.wasabiSecretAccessKey = wa.secretAccessKey ?? '';
			}
		} catch (err) {
			logger.error('Failed to fetch profile:', err);
			error = handleError(err, 'Failed to load profile');
		}
	}

	async function fetchStorageOptions() {
		try {
			const response = await fetch('/api/owner/storage-options');
			if (!response.ok) return;
			const result = await response.json();
			const data = result.data ?? result;
			const all = Array.isArray(data) ? data : [];
			storageOptions = all.filter((o: StorageOption) => o.id !== 'local');
		} catch (err) {
			logger.error('Failed to fetch storage options:', err);
		}
	}

	function buildStorageConfig() {
		return {
			useAdminConfig: false,
			googleDrive: {
				rootFolderId: formData.storageRootFolderId?.trim() || undefined,
				sharedDriveId: formData.storageSharedDriveId?.trim() || undefined,
				folderPrefix: formData.storageFolderPrefix?.trim() || undefined,
				authMethod: formData.gdAuthMethod || undefined,
				clientId: formData.gdClientId?.trim() || undefined,
				clientSecret: formData.gdClientSecret?.trim() || undefined,
				refreshToken: formData.gdRefreshToken?.trim() || undefined,
				storageType: formData.gdStorageType || undefined,
				folderId: formData.gdFolderId?.trim() || undefined,
				serviceAccountJson: formData.gdServiceAccountJson?.trim() || undefined
			},
			wasabi: {
				endpoint: formData.wasabiEndpoint?.trim() || undefined,
				bucketName: formData.wasabiBucketName?.trim() || undefined,
				region: formData.wasabiRegion?.trim() || undefined,
				accessKeyId: formData.wasabiAccessKeyId?.trim() || undefined,
				secretAccessKey: formData.wasabiSecretAccessKey?.trim() || undefined
			}
		};
	}

	async function handleSubmit(e: Event, _providerId?: string) {
		e.preventDefault();
		if (!profile || profile.storageConfig?.useAdminConfig === true) return;
		saving = true;
		error = null;
		success = null;
		try {
			const storageConfig = buildStorageConfig();
			const response = await fetch('/api/auth/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ storageConfig })
			});
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			profile = (result.user || result) as UserProfile;
			success = 'Storage settings saved.';
		} catch (err) {
			logger.error('Failed to save storage:', err);
			error = handleError(err, 'Failed to save');
		} finally {
			saving = false;
		}
	}

	const useOwnConnection = profile?.storageConfig?.useAdminConfig !== true;
</script>

{#if loading}
	<div class="min-h-[40vh] flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else if !useOwnConnection}
	<div class="bg-white rounded-lg shadow-md p-6">
		<h2 class="text-xl font-bold text-gray-900 mb-2">Storage management</h2>
		<p class="text-gray-600 mb-4">
			You are using the main site's storage connection. Storage is managed by the administrator. If you need your own connection, ask an admin to change your setting in User management.
		</p>
		<a
			href={backHref}
			class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
		>
			Back to dashboard
		</a>
	</div>
{:else}
	<div>
		{#if error}
			<div class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		{/if}
		{#if success}
			<div class="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
				<p class="text-sm text-green-800">{success}</p>
			</div>
		{/if}

		<p class="text-sm text-gray-600 mb-4">
			Local storage is always managed by the administrator. Configure the providers below that are enabled for your account.
		</p>

		{#if storageOptions.length === 0}
			<div class="bg-white rounded-lg shadow-md p-6">
				<p class="text-gray-600">No additional storage providers (Wasabi, Google Drive, etc.) are enabled for your account. Local storage is managed by the admin. Contact an administrator to enable other providers.</p>
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow border border-gray-200">
				<!-- Tabs -->
				<div class="border-b border-gray-200">
					<nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
						{#each storageOptions as option}
							<button
								type="button"
								on:click={() => (activeTab = option.id)}
								class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap {activeTab === option.id
									? 'border-green-600 text-green-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
							>
								{option.name}
							</button>
						{/each}
					</nav>
				</div>

				<!-- Tab content -->
				<div class="p-6">
					{#if activeTab === 'google-drive'}
						<div class="space-y-6">
							<h2 class="text-xl font-semibold text-gray-900">Google Drive Configuration</h2>
							<p class="text-sm text-gray-500">Same configuration as admin: OAuth or Service account, credentials, and folder. Data is stored in your account only.</p>

							{#if googleDriveMessage}
								<div class="rounded-md p-3 text-sm {googleDriveMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
									{googleDriveMessage.text}
								</div>
							{/if}

							<form on:submit={(e) => handleSubmit(e, 'google-drive')} class="space-y-4">
								<div>
									<label for="owner-gd-auth-method" class="block text-sm font-medium text-gray-700 mb-2">Auth method</label>
									<select
										id="owner-gd-auth-method"
										bind:value={formData.gdAuthMethod}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
									>
										<option value="oauth">OAuth (Client ID + refresh token)</option>
										<option value="service_account">Service account (recommended for production)</option>
									</select>
									<p class="mt-1 text-xs text-gray-500">
										Service account avoids OAuth popups and token expiry. Create a service account in Google Cloud, share a Drive folder with its email, then paste the JSON key below.
									</p>
								</div>

								{#if formData.gdAuthMethod === 'service_account'}
									<div>
										<label for="owner-gd-sa-json" class="block text-sm font-medium text-gray-700 mb-2">Service account JSON</label>
										<textarea
											id="owner-gd-sa-json"
											rows="8"
											bind:value={formData.gdServiceAccountJson}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
											placeholder='Paste the full contents of your service account key JSON (from Google Cloud Console → IAM → Service Accounts → Keys → Add key → JSON). Must include "client_email" and "private_key".'
										></textarea>
										<p class="mt-1 text-xs text-gray-500">
											Download the JSON key from Google Cloud Console → IAM &amp; Admin → Service Accounts → your account → Keys → Add key → Create new key → JSON.
										</p>
									</div>
									<div>
										<label for="owner-gd-sa-folder-id" class="block text-sm font-medium text-gray-700 mb-2">Folder ID <span class="text-red-600">*</span></label>
										<input
											id="owner-gd-sa-folder-id"
											type="text"
											bind:value={formData.gdFolderId}
											placeholder="e.g. 1ABC123xyz"
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
										/>
										<p class="mt-1 text-xs text-gray-500">
											Create a folder in Google Drive, share it with the service account email (Editor). Copy the folder ID from the URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
										</p>
									</div>
								{:else}
									<div>
										<label for="owner-gd-client-id" class="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
										<input
											id="owner-gd-client-id"
											type="text"
											bind:value={formData.gdClientId}
											placeholder="Enter Google OAuth Client ID"
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
										/>
									</div>
									<div>
										<label for="owner-gd-client-secret" class="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
										<input
											id="owner-gd-client-secret"
											type="password"
											bind:value={formData.gdClientSecret}
											placeholder="Enter Google OAuth Client Secret"
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
										/>
									</div>
									<div>
										<label for="owner-gd-refresh-token" class="block text-sm font-medium text-gray-700 mb-2">Refresh Token</label>
										<div class="flex gap-3">
											<input
												id="owner-gd-refresh-token"
												type="text"
												bind:value={formData.gdRefreshToken}
												placeholder="Enter OAuth Refresh Token (or click Renew Token)"
												class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
											/>
											<button
												type="button"
												on:click={startGoogleOAuth}
												class="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
											>
												Renew Token
											</button>
										</div>
										<p class="mt-1 text-xs text-gray-500">
											Click <strong>Renew Token</strong> to open Google's authorization window and automatically save a new refresh token.
										</p>
									</div>
									<div>
										<label for="owner-gd-storage-type" class="block text-sm font-medium text-gray-700 mb-2">Storage Type</label>
										<select
											id="owner-gd-storage-type"
											bind:value={formData.gdStorageType}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
										>
											<option value="appdata">Hidden (AppData Folder)</option>
											<option value="visible">Visible in User's Drive</option>
										</select>
										<p class="mt-1 text-xs text-gray-500">
											{#if formData.gdStorageType === 'appdata'}
												Files will be hidden from users in AppData folder
											{:else}
												Files will be visible in user's Google Drive
											{/if}
										</p>
									</div>
									{#if formData.gdStorageType === 'visible'}
										<div>
											<label for="owner-gd-folder-id" class="block text-sm font-medium text-gray-700 mb-2">Folder ID (Optional)</label>
											<input
												id="owner-gd-folder-id"
												type="text"
												bind:value={formData.gdFolderId}
												placeholder="Leave empty to use root folder"
												class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
											/>
											<p class="mt-1 text-xs text-gray-500">Google Drive folder ID where files will be stored. Leave empty for root folder.</p>
										</div>
									{/if}
								{/if}

								<div class="flex gap-4 pt-2">
									<button
										type="submit"
										disabled={saving}
										class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
									>
										{saving ? 'Saving...' : 'Save Configuration'}
									</button>
								</div>
							</form>
						</div>

					{:else if activeTab === 'wasabi'}
						<div class="space-y-4">
							<h2 class="text-lg font-semibold text-gray-900">Wasabi</h2>
							<p class="text-sm text-gray-500">Configure your Wasabi (S3-compatible) connection. Your credentials are stored in your account only.</p>
							<form on:submit={(e) => handleSubmit(e, 'wasabi')} class="space-y-4">
								<div>
									<label for="owner-wa-endpoint" class="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
									<input
										id="owner-wa-endpoint"
										type="text"
										bind:value={formData.wasabiEndpoint}
										placeholder="e.g. https://s3.wasabisys.com"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
									/>
								</div>
								<div>
									<label for="owner-wa-bucket" class="block text-sm font-medium text-gray-700 mb-1">Bucket name</label>
									<input
										id="owner-wa-bucket"
										type="text"
										bind:value={formData.wasabiBucketName}
										placeholder="Your bucket name"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
									/>
								</div>
								<div>
									<label for="owner-wa-region" class="block text-sm font-medium text-gray-700 mb-1">Region</label>
									<input
										id="owner-wa-region"
										type="text"
										bind:value={formData.wasabiRegion}
										placeholder="e.g. us-east-1"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
									/>
								</div>
								<div>
									<label for="owner-wa-access-key" class="block text-sm font-medium text-gray-700 mb-1">Access Key ID</label>
									<input
										id="owner-wa-access-key"
										type="text"
										bind:value={formData.wasabiAccessKeyId}
										placeholder="Wasabi Access Key ID"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
									/>
								</div>
								<div>
									<label for="owner-wa-secret-key" class="block text-sm font-medium text-gray-700 mb-1">Secret Access Key</label>
									<input
										id="owner-wa-secret-key"
										type="password"
										bind:value={formData.wasabiSecretAccessKey}
										placeholder="Wasabi Secret Access Key"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
									/>
								</div>
								<button
									type="submit"
									disabled={saving}
									class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
								>
									{saving ? 'Saving...' : 'Save Wasabi'}
								</button>
							</form>
						</div>

					{:else}
						<div class="space-y-2">
							<h2 class="text-lg font-semibold text-gray-900">{activeOption?.name ?? activeTab}</h2>
							<p class="text-sm text-gray-500">Per-owner configuration for this provider is not available yet. Connection is managed by the main site.</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
