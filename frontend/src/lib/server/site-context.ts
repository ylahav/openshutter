import type { Cookies } from '@sveltejs/kit';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { forwardedHostHeadersFromRequest } from './forward-host';

export type AppSiteContext =
	| { type: 'global' }
	| {
			type: 'owner-site';
			ownerId: string;
	  };

/**
 * Resolves global vs owner custom domain context via the NestJS middleware + GET /api/site-context.
 */
export async function resolveSiteContext(
	cookies: Cookies,
	request: Request
): Promise<AppSiteContext> {
	try {
		const headers = forwardedHostHeadersFromRequest(request);
		const response = await backendGet('/site-context', { cookies, headers });
		const ctx = await parseBackendResponse<AppSiteContext>(response);
		return ctx ?? { type: 'global' };
	} catch {
		return { type: 'global' };
	}
}
