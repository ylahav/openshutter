import type { LayoutServerLoad } from './$types';
import type { SiteConfig } from '$lib/types/site-config';
import { getConfiguredPackId } from '$lib/template-packs/resolve-visitor-pack';

function normalizeSiteConfigPayload(raw: unknown): SiteConfig | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	if ('error' in o && typeof o.error === 'string') return null;
	const data = o.success === true && o.data != null ? o.data : raw;
	return data as SiteConfig;
}

/** siteContext is resolved once in hooks.server (Host-forwarded); avoid a duplicate backend round-trip. */
export const load: LayoutServerLoad = async ({ locals, fetch }) => {
	let visitorTemplatePack = 'atelier';
	let visitorSiteConfig: SiteConfig | null = null;
	try {
		const res = await fetch('/api/site-config');
		if (res.ok) {
			const raw = await res.json();
			visitorSiteConfig = normalizeSiteConfigPayload(raw);
			if (visitorSiteConfig) {
				visitorTemplatePack = getConfiguredPackId(visitorSiteConfig);
			}
		}
	} catch {
		/* keep default */
	}
	return {
		siteContext: locals.siteContext,
		visitorTemplatePack,
		visitorSiteConfig
	};
};

