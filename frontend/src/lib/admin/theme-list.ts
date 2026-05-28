/** Shared filter/sort for admin template (theme) list loads. */
export interface ThemeListItem {
	_id: string;
	name: string;
	baseTemplate?: string;
	isBuiltIn?: boolean;
	createdAt?: string;
	[key: string]: unknown;
}

const VALID_PACKS = new Set(['noir', 'studio', 'atelier']);
const PACK_ORDER = ['noir', 'studio', 'atelier'];

export function normalizeThemeList(raw: unknown[]): ThemeListItem[] {
	const list = (Array.isArray(raw) ? raw : []) as ThemeListItem[];
	const filtered = list.filter((t) =>
		VALID_PACKS.has(String(t.baseTemplate ?? 'noir').toLowerCase()),
	);
	return [...filtered].sort((a, b) => {
		const aIdx = a.isBuiltIn ? PACK_ORDER.indexOf(String(a.baseTemplate)) : -1;
		const bIdx = b.isBuiltIn ? PACK_ORDER.indexOf(String(b.baseTemplate)) : -1;
		if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
		if (aIdx >= 0) return -1;
		if (bIdx >= 0) return 1;
		return (
			new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
		);
	});
}
