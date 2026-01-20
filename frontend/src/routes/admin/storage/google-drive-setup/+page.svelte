<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let loading = true;
	let error = '';
	let success = false;

	onMount(async () => {
		const code = $page.url.searchParams.get('code');
		if (!code) {
			error = 'No authorization code received';
			loading = false;
			return;
		}

		try {
			// Get current Google Drive config to get client credentials
			const configResponse = await fetch('/api/admin/storage/google-drive');
			if (!configResponse.ok) {
				throw new Error('Failed to load Google Drive configuration');
			}
			const configData = await configResponse.json();
			const config = configData.success ? configData.data : configData;

			if (!config.config?.clientId || !config.config?.clientSecret) {
				throw new Error('Client ID and Client Secret must be configured first');
			}

			// Exchange authorization code for refresh token
			const redirectUri = `${window.location.origin}/api/auth/google/callback`;
			const tokenResponse = await fetch('/api/auth/google/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					code,
					clientId: config.config.clientId,
					clientSecret: config.config.clientSecret,
					redirectUri,
				}),
			});

			const tokenData = await tokenResponse.json();

			if (!tokenResponse.ok || !tokenData.success) {
				throw new Error(tokenData.error || 'Failed to exchange authorization code for refresh token');
			}

			// Update storage config with new refresh token
			const updateResponse = await fetch('/api/admin/storage/google-drive', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					refreshToken: tokenData.refreshToken,
				}),
			});

			if (!updateResponse.ok) {
				const updateError = await updateResponse.json();
				throw new Error(updateError.error || 'Failed to save refresh token');
			}

			success = true;

			// Notify parent window if opened in popup
			if (typeof window !== 'undefined' && window.opener) {
				window.opener.postMessage(
					{
						type: 'GOOGLE_OAUTH_SUCCESS',
						refreshToken: tokenData.refreshToken,
					},
					window.location.origin
				);
				// Close window after a short delay
				setTimeout(() => {
					if (typeof window !== 'undefined') {
						window.close();
					}
				}, 2000);
			} else {
				// Redirect back to storage settings after 3 seconds
				setTimeout(() => {
					goto('/admin/storage');
				}, 3000);
			}
		} catch (err) {
			console.error('Error setting up Google Drive:', err);
			error = err instanceof Error ? err.message : 'Failed to set up Google Drive';

			// Notify parent window if opened in popup
			if (typeof window !== 'undefined' && window.opener) {
				window.opener.postMessage(
					{
						type: 'GOOGLE_OAUTH_ERROR',
						error,
					},
					window.location.origin
				);
			}
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Google Drive Setup - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
		{#if loading}
			<div class="text-center">
				<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
				<h2 class="text-xl font-semibold text-gray-900 mb-2">Setting up Google Drive...</h2>
				<p class="text-gray-600">Exchanging authorization code for refresh token...</p>
			</div>
		{:else if success}
			<div class="text-center">
				<div class="text-6xl mb-4">✅</div>
				<h2 class="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
				<p class="text-gray-600 mb-6">Google Drive has been successfully configured.</p>
				{#if typeof window !== 'undefined' && window.opener}
					<p class="text-sm text-gray-500">This window will close automatically...</p>
				{:else}
					<a
						href="/admin/storage"
						class="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Go to Storage Settings
					</a>
				{/if}
			</div>
		{:else if error}
			<div class="text-center">
				<div class="text-6xl mb-4">❌</div>
				<h2 class="text-xl font-semibold text-gray-900 mb-2">Setup Failed</h2>
				<p class="text-red-600 mb-6">{error}</p>
				<div class="space-y-2">
					<a
						href="/admin/storage"
						class="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Go to Storage Settings
					</a>
					{#if typeof window !== 'undefined' && window.opener}
						<button
							on:click={() => {
								if (typeof window !== 'undefined') {
									window.close();
								}
							}}
							class="block w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
						>
							Close Window
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
