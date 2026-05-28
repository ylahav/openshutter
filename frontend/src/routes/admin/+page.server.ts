import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { AuthenticationError, BackendHttpError } from '$lib/utils/backend-errors';
import { logger } from '$lib/utils/logger';
import type { AdminDashboardSummary } from '$lib/types/admin-dashboard';

function isValidDashboardSummary(
	value: AdminDashboardSummary | null | undefined,
): value is AdminDashboardSummary {
	return Boolean(value?.stats && typeof value.stats.totalPhotos === 'number');
}

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const user = locals.user;

	if (user?.role === 'owner') {
		throw redirect(303, '/owner');
	}
	if (user?.role !== 'admin') {
		throw redirect(303, '/login?redirect=' + encodeURIComponent('/admin'));
	}

	try {
		const response = await backendGet('/admin/dashboard', { cookies });
		const dashboard = await parseBackendResponse<AdminDashboardSummary>(response);
		if (!isValidDashboardSummary(dashboard)) {
			logger.error('[admin dashboard] API returned an unexpected or empty payload');
			return {
				user,
				dashboard: null as AdminDashboardSummary | null,
				dashboardLoadFailed: true,
				dashboardBackendUnreachable: false,
				dashboardAuthFailed: false,
			};
		}
		return {
			user,
			dashboard,
			dashboardLoadFailed: false,
			dashboardBackendUnreachable: false,
			dashboardAuthFailed: false,
		};
	} catch (err) {
		logger.error('[admin dashboard +page.server]', err);
		const unreachable =
			err instanceof BackendHttpError &&
			(err.statusCode === 502 || err.statusCode === 503 || err.statusCode === 504);
		const authFailed =
			err instanceof AuthenticationError ||
			(err instanceof BackendHttpError && err.statusCode === 401);
		if (authFailed) {
			logger.error(
				'[admin dashboard] API returned 401. AUTH_JWT_SECRET must match in backend/.env and frontend/.env.development (or .env.local). Log out and log in again after fixing.',
			);
		}
		return {
			user,
			dashboard: null as AdminDashboardSummary | null,
			dashboardLoadFailed: true,
			dashboardBackendUnreachable: unreachable,
			dashboardAuthFailed: authFailed,
		};
	}
};
