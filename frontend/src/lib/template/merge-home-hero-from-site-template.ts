import { getPageModulesForBreakpoint, type TemplateBreakpointId } from './breakpoints';

/**
 * Owner hero lives in `owner_site_settings.hero` and is merged into GET /site-config → `template.pageModules.home`.
 * The DB home page still uses `page_modules` rows, which may omit gallery-leading until the public pages API merges.
 * For owner-site visits, merge template hero props with the page hero. **`pageModules` wins** on conflicts
 * so the public page API (incl. `owner_site_settings.hero`) stays authoritative over theme defaults.
 */
type TemplateModulesBag = Parameters<typeof getPageModulesForBreakpoint>[0];

export function mergeHomeHeroPropsFromSiteTemplate(
	pageModules: unknown[] | undefined,
	template: TemplateModulesBag | undefined,
	bp: TemplateBreakpointId = 'lg'
): unknown[] {
	if (!Array.isArray(pageModules) || pageModules.length === 0 || !template) {
		return pageModules ?? [];
	}

	const templateModules = getPageModulesForBreakpoint(template, 'home', bp);
	const templateHero = templateModules.find(
		(m) => m && typeof m === 'object' && String((m as { type?: unknown }).type ?? '') === 'hero'
	) as { props?: unknown } | undefined;

	const patch =
		templateHero?.props && typeof templateHero.props === 'object' && !Array.isArray(templateHero.props)
			? (templateHero.props as Record<string, unknown>)
			: null;

	if (!patch || Object.keys(patch).length === 0) {
		return pageModules;
	}

	const heroIdx = pageModules.findIndex(
		(m) => m && typeof m === 'object' && String((m as { type?: unknown }).type ?? '') === 'hero'
	);
	if (heroIdx < 0) {
		return pageModules;
	}

	const out = pageModules.map((m) =>
		m && typeof m === 'object' ? { ...(m as Record<string, unknown>) } : m
	);
	const cur = out[heroIdx] as Record<string, unknown>;
	const prevRaw = cur.props;
	const prev =
		prevRaw && typeof prevRaw === 'object' && !Array.isArray(prevRaw)
			? { ...(prevRaw as Record<string, unknown>) }
			: {};

	out[heroIdx] = {
		...cur,
		props: { ...patch, ...prev },
	};
	return out;
}
