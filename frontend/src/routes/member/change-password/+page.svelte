<script lang="ts">
	import { goto } from '$app/navigation';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let saving = false;
	let error: string | null = null;
	let success: string | null = null;

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		success = null;

		if (newPassword !== confirmPassword) {
			error = 'New password and confirmation do not match';
			return;
		}
		if (newPassword.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}
		if (!currentPassword.trim()) {
			error = 'Current password is required';
			return;
		}

		saving = true;
		try {
			const response = await fetch('/api/auth/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword: currentPassword,
					newPassword: newPassword
				})
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			success = 'Password changed successfully.';
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';

			// Refresh session so JWT has updated forcePasswordChange if it was set
			try {
				const refreshRes = await fetch('/api/auth/refresh-session', { method: 'POST' });
				if (refreshRes.ok) {
					// Session updated
				}
			} catch (_) {}
		} catch (err) {
			logger.error('Failed to change password:', err);
			error = handleError(err, 'Failed to change password');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Change Password - My Account</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-md mx-auto px-4">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Change Password</h1>
				<p class="text-gray-600 mt-2">Update your password securely</p>
			</div>
			<a
				href="/member"
				class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Back to My Account
			</a>
		</div>

		<div class="bg-white rounded-lg shadow-md p-6">
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

			<form on:submit={handleSubmit} class="space-y-6">
				<div>
					<label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-2">
						Current Password
					</label>
					<input
						type="password"
						id="currentPassword"
						bind:value={currentPassword}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="Enter current password"
					/>
				</div>

				<div>
					<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
						New Password
					</label>
					<input
						type="password"
						id="newPassword"
						bind:value={newPassword}
						required
						minlength="6"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="Enter new password (min 6 characters)"
					/>
				</div>

				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
						Confirm New Password
					</label>
					<input
						type="password"
						id="confirmPassword"
						bind:value={confirmPassword}
						required
						minlength="6"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="Confirm new password"
					/>
				</div>

				<div class="flex justify-end">
					<button
						type="submit"
						disabled={saving}
						class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if saving}
							<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Updating...
						{:else}
							Change Password
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
