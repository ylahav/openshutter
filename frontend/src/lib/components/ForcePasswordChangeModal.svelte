<script lang="ts">
	/** Called after password is changed and session refreshed. Parent should invalidate or redirect. */
	export let onSuccess: () => void | Promise<void> = () => {};

	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let error = '';
	let saving = false;

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		if (newPassword !== confirmPassword) {
			error = 'New passwords do not match';
			return;
		}
		if (newPassword.length < 6) {
			error = 'New password must be at least 6 characters';
			return;
		}
		if (!currentPassword) {
			error = 'Current password is required';
			return;
		}
		saving = true;
		try {
			const res = await fetch('/api/auth/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword,
					newPassword
				}),
				credentials: 'include'
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				error = data.error || 'Failed to update password';
				saving = false;
				return;
			}
			const refreshRes = await fetch('/api/auth/refresh-session', { method: 'POST', credentials: 'include' });
			if (!refreshRes.ok) {
				error = 'Password updated but session refresh failed. Please log in again.';
				saving = false;
				return;
			}
			await onSuccess();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update password';
		} finally {
			saving = false;
		}
	}
</script>

<div
	class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="force-password-title"
	aria-describedby="force-password-desc"
>
	<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
		<h2 id="force-password-title" class="text-xl font-semibold text-gray-900 mb-2">
			Change password required
		</h2>
		<p id="force-password-desc" class="text-sm text-gray-600 mb-4">
		 You must set a new password before continuing.
		</p>
		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			{#if error}
				<div class="p-3 rounded-md bg-red-50 text-red-700 text-sm">
					{error}
				</div>
			{/if}
			<div>
				<label for="force-current-pw" class="block text-sm font-medium text-gray-700 mb-1">Current password</label>
				<input
					id="force-current-pw"
					type="password"
					bind:value={currentPassword}
					required
					autocomplete="current-password"
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					placeholder="Enter current password"
				/>
			</div>
			<div>
				<label for="force-new-pw" class="block text-sm font-medium text-gray-700 mb-1">New password</label>
				<input
					id="force-new-pw"
					type="password"
					bind:value={newPassword}
					required
					minlength="6"
					autocomplete="new-password"
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					placeholder="At least 6 characters"
				/>
			</div>
			<div>
				<label for="force-confirm-pw" class="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
				<input
					id="force-confirm-pw"
					type="password"
					bind:value={confirmPassword}
					required
					minlength="6"
					autocomplete="new-password"
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					placeholder="Confirm new password"
				/>
			</div>
			<div class="pt-2">
				<button
					type="submit"
					disabled={saving}
					class="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
				>
					{saving ? 'Updating...' : 'Change password'}
				</button>
			</div>
		</form>
	</div>
</div>
