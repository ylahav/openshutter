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
export const load: LayoutServerLoad = async ({ url, locals, fetch }) => {
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

	// Theme preview: admin passes ?preview-theme-id=<id> to preview a theme on the live site.
	// The override is server-side so ThemeColorApplier and pageModules both see the preview theme.
	const previewThemeId = url.searchParams.get('preview-theme-id');
	if (previewThemeId && visitorSiteConfig) {
		try {
			const themeRes = await fetch(`/api/admin/themes/${previewThemeId}`);
			if (themeRes.ok) {
				const raw = await themeRes.json() as Record<string, unknown>;
				const theme = (raw.success === true && raw.data != null ? raw.data : raw) as Record<string, unknown>;
				if (theme?._id) {
					const pack = String(theme.baseTemplate ?? visitorTemplatePack);
					const previewTemplate: NonNullable<SiteConfig['template']> = {
						...(visitorSiteConfig.template ?? {}),
						activeTemplate: pack,
						frontendTemplate: pack,
						customColors: theme.customColors as NonNullable<SiteConfig['template']>['customColors'] ?? undefined,
						customFonts: theme.customFonts as NonNullable<SiteConfig['template']>['customFonts'] ?? undefined,
						customLayout: theme.customLayout as NonNullable<SiteConfig['template']>['customLayout'] ?? undefined,
						customLayoutByBreakpoint: theme.customLayoutByBreakpoint as NonNullable<SiteConfig['template']>['customLayoutByBreakpoint'] ?? undefined,
						componentVisibility: theme.componentVisibility as NonNullable<SiteConfig['template']>['componentVisibility'] ?? undefined,
						headerConfig: theme.headerConfig as NonNullable<SiteConfig['template']>['headerConfig'] ?? undefined,
						pageModules: theme.pageModules as NonNullable<SiteConfig['template']>['pageModules'] ?? undefined,
						pageLayout: theme.pageLayout as NonNullable<SiteConfig['template']>['pageLayout'] ?? undefined,
						layoutPresets: theme.layoutPresets as NonNullable<SiteConfig['template']>['layoutPresets'] ?? undefined,
						layoutShellInstances: theme.layoutShellInstances as NonNullable<SiteConfig['template']>['layoutShellInstances'] ?? undefined,
					};
					visitorSiteConfig = { ...visitorSiteConfig, template: previewTemplate };
					visitorTemplatePack = pack;
				}
			}
		} catch {
			/* preview fails silently — site renders with its real theme */
		}
	}

	return {
		siteContext: locals.siteContext,
		visitorTemplatePack,
		visitorSiteConfig,
		/** Alias for `visitorSiteConfig` — matches nested routes that read `{ siteConfig } = await parent()`. */
		siteConfig: visitorSiteConfig,
		isThemePreview: !!previewThemeId
	};
};

