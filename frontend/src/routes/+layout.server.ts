import type { LayoutServerLoad } from './$types';

/** siteContext is resolved once in hooks.server (Host-forwarded); avoid a duplicate backend round-trip. */
export const load: LayoutServerLoad = async ({ locals }) => ({
	siteContext: locals.siteContext
});

