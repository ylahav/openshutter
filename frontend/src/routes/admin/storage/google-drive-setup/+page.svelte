<script lang="ts">
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { logger } from '$lib/utils/logger';
	import { adminToast } from '$lib/admin/adminToast';
	import {
		adminBtnPrimarySm,
		adminBtnSecondary,
		adminRingPrimary
	} from '$lib/admin/admin-cerberus';

	const loading = writable(true);
	let setupError = '';
	let success = false;

	onMount(async () => {
		const code = $page.url.searchParams.get('code');
		if (!code) {
			setupError = 'No authorization code received';
			adminToast.error({ title: setupError });
			loading.set(false);
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
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					code,
					clientId: config.config.clientId,
					clientSecret: config.config.clientSecret,
					redirectUri
				})
			});

			const tokenData = await tokenResponse.json();

			if (!tokenResponse.ok || !tokenData.success) {
				throw new Error(tokenData.error || 'Failed to exchange authorization code for refresh token');
			}

			// Update storage config with new refresh token
			const updateResponse = await fetch('/api/admin/storage/google-drive', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					refreshToken: tokenData.refreshToken
				})
			});

			if (!updateResponse.ok) {
				const updateError = await updateResponse.json();
				throw new Error(updateError.error || 'Failed to save refresh token');
			}

			success = true;
			adminToast.success({ title: 'Google Drive has been successfully configured.' });

			// Notify parent window if opened in popup
			if (typeof window !== 'undefined' && window.opener) {
				window.opener.postMessage(
					{
						type: 'GOOGLE_OAUTH_SUCCESS',
						refreshToken: tokenData.refreshToken
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
			logger.error('Error setting up Google Drive:', err);
			setupError = err instanceof Error ? err.message : 'Failed to set up Google Drive';
			adminToast.error({ title: setupError });

			// Notify parent window if opened in popup
			if (typeof window !== 'undefined' && window.opener) {
				window.opener.postMessage(
					{
						type: 'GOOGLE_OAUTH_ERROR',
						error: setupError
					},
					window.location.origin
				);
			}
		} finally {
			loading.set(false);
		}
	});
</script>

<svelte:head>
	<title>Google Drive Setup - Admin</title>
</svelte:head>

<div class="min-h-[50vh] flex items-center justify-center p-4">
	<div class="max-w-md w-full bg-(--color-surface-50-950) rounded-lg shadow-lg p-8">
		{#if $loading}
			<div class="text-center">
				<div
					class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary-600) mb-4"
				></div>
				<h2 class="text-xl font-semibold text-(--color-surface-950-50) mb-2">Setting up Google Drive...</h2>
				<p class="text-(--color-surface-600-400)">Exchanging authorization code for refresh token...</p>
			</div>
		{:else if success}
			<div class="text-center">
				<div class="text-6xl mb-4">✅</div>
				<h2 class="text-xl font-semibold text-(--color-surface-950-50) mb-2">Success!</h2>
				<p class="text-(--color-surface-600-400) mb-6">Google Drive has been successfully configured.</p>
				{#if typeof window !== 'undefined' && window.opener}
					<p class="text-sm text-(--color-surface-600-400)">This window will close automatically...</p>
				{:else}
					<a
						href="/admin/storage"
						class="{adminBtnPrimarySm} {adminRingPrimary} inline-block text-center no-underline"
					>
						Go to Storage Settings
					</a>
				{/if}
			</div>
		{:else if setupError}
			<div class="text-center">
				<div class="text-6xl mb-4">❌</div>
				<h2 class="text-xl font-semibold text-(--color-surface-950-50) mb-2">Setup Failed</h2>
				<p class="text-red-600 mb-6">{setupError}</p>
				<div class="space-y-2">
					<a
						href="/admin/storage"
						class="{adminBtnPrimarySm} {adminRingPrimary} inline-block w-full text-center no-underline"
					>
						Go to Storage Settings
					</a>
					{#if typeof window !== 'undefined' && window.opener}
						<button
							type="button"
							on:click={() => {
								if (typeof window !== 'undefined') {
									window.close();
								}
							}}
							class="{adminBtnSecondary} w-full"
						>
							Close Window
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
