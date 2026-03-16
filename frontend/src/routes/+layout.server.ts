import type { LayoutServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

type SiteContext =
	| { type: 'global' }
	| {
			type: 'owner-site';
			ownerId: string;
	  };

export const load: LayoutServerLoad = async ({ cookies }) => {
	try {
		const response = await backendGet('/site-context', { cookies });
		const ctx = await parseBackendResponse<SiteContext>(response);
		return {
			siteContext: ctx ?? { type: 'global' as const }
		};
	} catch {
		// On failure, fall back to global context
		return {
			siteContext: { type: 'global' as const }
		};
	}
};

