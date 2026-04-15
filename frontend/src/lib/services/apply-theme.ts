import { siteConfig } from '$stores/siteConfig';
import { handleApiErrorResponse } from '$lib/utils/errorHandler';
import { normalizeTemplatePackId } from '$lib/template/packs/ids';

export type ApplyThemeResult =
	| { ok: true; themeName: string }
	| { ok: false; error: string };

/**
 * Copies the full theme row from Mongo into live `site_config.template`
 * (colors, fonts, layout, pageModules, pageLayout, headerConfig, etc.).
 */
export async function applyThemeById(themeId: string): Promise<ApplyThemeResult> {
	const themeRes = await fetch(`/api/admin/themes/${themeId}`, { credentials: 'include' });
	if (!themeRes.ok) {
		try {
			await handleApiErrorResponse(themeRes);
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Request failed' };
		}
		return { ok: false, error: 'Failed to load theme' };
	}
	const themeResult = await themeRes.json();
	const theme = themeResult.data || themeResult;
	if (!theme?._id) {
		return { ok: false, error: 'Theme not found' };
	}
	const nextFrontendTemplate = normalizeTemplatePackId(theme.baseTemplate);

	const response = await fetch('/api/admin/site-config', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			replaceTemplateFromTheme: true,
			template: {
				frontendTemplate: nextFrontendTemplate,
				activeTemplate: nextFrontendTemplate,
				activeThemeId: theme._id,
				customColors: theme.customColors || {},
				customFonts: theme.customFonts || {},
				customLayout: theme.customLayout || {},
				customLayoutByBreakpoint: theme.customLayoutByBreakpoint || {},
				pageModules: theme.pageModules || {},
				pageLayout: theme.pageLayout || {},
				pageLayoutByBreakpoint: theme.pageLayoutByBreakpoint || {},
				pageModulesByBreakpoint: theme.pageModulesByBreakpoint || {},
				headerConfig: theme.headerConfig != null ? theme.headerConfig : null,
				componentVisibility: theme.componentVisibility != null ? theme.componentVisibility : null,
				layoutPresets: theme.layoutPresets && typeof theme.layoutPresets === 'object' ? theme.layoutPresets : {}
			}
		})
	});
	if (!response.ok) {
		try {
			await handleApiErrorResponse(response);
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Save failed' };
		}
		return { ok: false, error: 'Failed to update site config' };
	}

	await siteConfig.load();
	return { ok: true, themeName: theme.name || theme.baseTemplate || 'Theme' };
}

const BUILTIN_PACK_IDS = new Set(['noir', 'studio', 'atelier']);

/**
 * Used by the header template selector (`ui/template-selector`): same behavior as "Set as default" — load the **built-in**
 * theme row for this pack (fonts, colors, pageModules, …). Falls back to pack-name-only update
 * if no built-in row exists (e.g. DB not seeded).
 */
export async function applyBuiltInThemeForPack(baseTemplate: string): Promise<ApplyThemeResult> {
	const pack = normalizeTemplatePackId(baseTemplate);
	if (!BUILTIN_PACK_IDS.has(pack)) {
		return { ok: false, error: 'Unknown template pack' };
	}

	const listRes = await fetch('/api/admin/themes', { credentials: 'include' });
	if (!listRes.ok) {
		return { ok: false, error: 'Could not load themes' };
	}
	const listJson = await listRes.json();
	const themes: { _id?: string; baseTemplate?: string; isBuiltIn?: boolean }[] = Array.isArray(listJson)
		? listJson
		: listJson.data || [];
	const builtIn = themes.find(
		(t) => t.isBuiltIn && String(t.baseTemplate || '').toLowerCase() === pack
	);
	if (builtIn?._id) {
		return applyThemeById(builtIn._id);
	}

	const response = await fetch('/api/admin/site-config', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			replaceTemplateFromTheme: true,
			template: {
				frontendTemplate: pack,
				activeTemplate: pack,
				activeThemeId: null,
				customColors: {},
				customFonts: {},
				customLayout: {},
				customLayoutByBreakpoint: {},
				pageModules: {},
				pageLayout: {},
				pageLayoutByBreakpoint: {},
				pageModulesByBreakpoint: {},
				headerConfig: null,
				componentVisibility: null,
				layoutPresets: {}
			}
		})
	});
	if (!response.ok) {
		try {
			await handleApiErrorResponse(response);
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Save failed' };
		}
		return { ok: false, error: 'Failed to update site config' };
	}
	await siteConfig.load();
	return { ok: true, themeName: pack };
}
