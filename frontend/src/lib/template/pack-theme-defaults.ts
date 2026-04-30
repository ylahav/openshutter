import noirThemeDefaults from '$templates/noir/theme.defaults.json';
import studioThemeDefaults from '$templates/studio/theme.defaults.json';
import atelierThemeDefaults from '$templates/atelier/theme.defaults.json';
import type { TemplatePackId } from '$lib/template/packs/ids';

const BY_PACK: Record<TemplatePackId, { colors: Record<string, string>; fonts: Record<string, string> }> =
	{
		noir: {
			colors: noirThemeDefaults.colors as Record<string, string>,
			fonts: noirThemeDefaults.fonts as Record<string, string>
		},
		studio: {
			colors: studioThemeDefaults.colors as Record<string, string>,
			fonts: studioThemeDefaults.fonts as Record<string, string>
		},
		atelier: {
			colors: atelierThemeDefaults.colors as Record<string, string>,
			fonts: atelierThemeDefaults.fonts as Record<string, string>
		}
	};

export function getPackThemeDefaultColors(pack: TemplatePackId): Record<string, string> {
	return { ...BY_PACK[pack].colors };
}

export function getPackThemeDefaultFonts(pack: TemplatePackId): Record<string, string> {
	return { ...BY_PACK[pack].fonts };
}

/** Pack semantic colors as base; `customColors` from DB/theme wins per key when non-empty. */
export function mergePackColorsWithCustom(
	pack: TemplatePackId,
	custom: Record<string, string | undefined> | null | undefined
): Record<string, string | undefined> {
	const base = getPackThemeDefaultColors(pack);
	const out: Record<string, string | undefined> = { ...base };
	if (!custom) return out;
	for (const [k, v] of Object.entries(custom)) {
		if (v != null && String(v).trim() !== '') {
			out[k] = String(v).trim();
		}
	}
	return out;
}
