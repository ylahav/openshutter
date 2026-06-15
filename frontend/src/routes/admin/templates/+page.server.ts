import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

const VALID_PACKS = new Set(['noir', 'studio', 'atelier']);
const BUILTIN_ORDER = ['noir', 'studio', 'atelier'];

function normalizeThemes(raw: unknown[]): unknown[] {
	const filtered = raw.filter(
		(t) =>
			t &&
			typeof t === 'object' &&
			VALID_PACKS.has(String((t as { baseTemplate?: string }).baseTemplate ?? 'noir').toLowerCase())
	);

	return [...filtered].sort((a, b) => {
		const ta = a as { isBuiltIn?: boolean; baseTemplate?: string; createdAt?: string };
		const tb = b as { isBuiltIn?: boolean; baseTemplate?: string; createdAt?: string };
		const aIdx = ta.isBuiltIn ? BUILTIN_ORDER.indexOf(String(ta.baseTemplate)) : -1;
		const bIdx = tb.isBuiltIn ? BUILTIN_ORDER.indexOf(String(tb.baseTemplate)) : -1;
		if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
		if (aIdx >= 0) return -1;
		if (bIdx >= 0) return 1;
		return new Date(tb.createdAt || 0).getTime() - new Date(ta.createdAt || 0).getTime();
	});
}

export const load: PageServerLoad = async ({ cookies, depends }) => {
	depends('admin:templates');

	try {
		const response = await backendGet('/admin/themes', { cookies });
		const result = await parseBackendResponse<unknown[] | { data?: unknown[] }>(response);
		const raw = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];

		return {
			themes: normalizeThemes(raw),
			themesLoadError: null as string | null
		};
	} catch (err) {
		return {
			themes: [] as unknown[],
			themesLoadError: err instanceof Error ? err.message : 'Failed to load themes'
		};
	}
};
