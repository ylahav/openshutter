/** Built-in pack ids (must match registry keys and backend allowlists). */
export const TEMPLATE_PACK_IDS = ['noir', 'studio', 'atelier'] as const;

export type TemplatePackId = (typeof TEMPLATE_PACK_IDS)[number];

/** Old installs / DB rows may still reference removed packs — map to a current id. */
const LEGACY_PACK_ID_MAP: Record<string, TemplatePackId> = {
	default: 'noir',
	minimal: 'noir',
	simple: 'noir',
	modern: 'noir',
	elegant: 'noir'
};

export function normalizeTemplatePackId(id: string | null | undefined): TemplatePackId {
	const k = String(id ?? '')
		.trim()
		.toLowerCase();
	if ((TEMPLATE_PACK_IDS as readonly string[]).includes(k)) return k as TemplatePackId;
	const mapped = LEGACY_PACK_ID_MAP[k];
	if (mapped) return mapped;
	return 'atelier';
}

export function isKnownTemplatePack(name: string | null | undefined): boolean {
	const k = String(name ?? '')
		.trim()
		.toLowerCase();
	if ((TEMPLATE_PACK_IDS as readonly string[]).includes(k)) return true;
	return k in LEGACY_PACK_ID_MAP;
}
