import type { SiteConfig } from '$lib/types/site-config';
import { isKnownTemplatePack, normalizeTemplatePackId, type TemplatePackId } from './ids';

export type PageDataForPack = {
	page?: { frontendTemplate?: string } | null;
} | null | undefined;

export function getConfiguredPackId(config: SiteConfig | null | undefined): TemplatePackId {
	const raw =
		config?.template?.frontendTemplate || config?.template?.activeTemplate || 'atelier';
	return normalizeTemplatePackId(String(raw));
}

/**
 * Same resolution as `$stores/template` `activeTemplate` (see `active-template.svelte.ts`) for public routes (admin excluded here — caller should not mount visitor chrome).
 */
export function resolveVisitorTemplatePackId(
	pathname: string,
	config: SiteConfig | null | undefined,
	pageData: PageDataForPack
): TemplatePackId {
	if (pathname.startsWith('/admin')) {
		return 'noir';
	}
	const rawPageOverride = String(pageData?.page?.frontendTemplate ?? '').trim();
	if (rawPageOverride && isKnownTemplatePack(rawPageOverride)) {
		return normalizeTemplatePackId(rawPageOverride);
	}
	return getConfiguredPackId(config);
}
