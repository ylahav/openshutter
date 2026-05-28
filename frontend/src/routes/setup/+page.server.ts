import { fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/utils/logger';

function getBackendUrl(): string {
	return env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
}

export const actions: Actions = {
	default: async ({ request }) => {
		try {
			const formData = await request.formData();

			const username = formData.get('username')?.toString().trim() ?? '';
			const password = formData.get('password')?.toString() ?? '';
			const title = formData.get('title')?.toString().trim() ?? '';

			if (!username) {
				return fail(400, { error: 'Username is required' });
			}
			if (!password) {
				return fail(400, { error: 'Password is required' });
			}
			if (password.length < 6) {
				return fail(400, { error: 'Password must be at least 6 characters long' });
			}
			if (!title) {
				return fail(400, { error: 'Site title is required' });
			}

			const response = await fetch(`${getBackendUrl()}/api/init/setup`, {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Setup failed' }));
				const message =
					(typeof errorData === 'object' && errorData !== null && 'message' in errorData
						? String((errorData as { message?: string }).message)
						: null) ||
					(typeof errorData === 'object' && errorData !== null && 'error' in errorData
						? String((errorData as { error?: string }).error)
						: null) ||
					`Setup failed (${response.status})`;
				return fail(response.status, { error: message });
			}

			const data = await response.json();
			if (!data.success) {
				return fail(400, { error: data.message || data.error || 'Setup failed' });
			}

			throw redirect(303, '/login?redirect=/admin');
		} catch (err) {
			if (isRedirect(err)) {
				throw err;
			}
			logger.error('Failed to complete setup:', err);
			return fail(500, {
				error:
					err instanceof Error
						? err.message
						: 'An error occurred during setup. Please try again.',
			});
		}
	},
};
