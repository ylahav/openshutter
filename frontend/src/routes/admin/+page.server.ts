import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { BackendHttpError } from '$lib/utils/backend-errors';
import { logger } from '$lib/utils/logger';
import type { AdminDashboardSummary } from '$lib/types/admin-dashboard';

export const load: PageServerLoad = async ({ cookies, locals }) => {
	if (locals.user?.role !== 'admin') {
		return {
			dashboard: null as AdminDashboardSummary | null,
			dashboardLoadFailed: false,
			dashboardBackendUnreachable: false
		};
	}
	try {
		const response = await backendGet('/admin/dashboard', { cookies });
		const dashboard = await parseBackendResponse<AdminDashboardSummary>(response);
		return { dashboard, dashboardLoadFailed: false, dashboardBackendUnreachable: false };
	} catch (err) {
		logger.error('[admin dashboard +page.server]', err);
		const unreachable =
			err instanceof BackendHttpError &&
			(err.statusCode === 502 || err.statusCode === 503 || err.statusCode === 504);
		return {
			dashboard: null as AdminDashboardSummary | null,
			dashboardLoadFailed: true,
			dashboardBackendUnreachable: unreachable
		};
	}
};
