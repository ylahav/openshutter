import { normalizeThemeList } from '$lib/admin/theme-list';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/admin/themes', { credentials: 'include' });
		const result = await response.json().catch(() => ({}));

		if (!response.ok) {
			const message =
				(typeof result === 'object' && result && 'error' in result
					? String((result as { error?: string }).error)
					: null) ||
				(typeof result === 'object' && result && 'message' in result
					? String((result as { message?: string }).message)
					: null) ||
				`Failed to load templates (${response.status})`;
			return { initialThemes: [], themesLoadError: message };
		}

		let raw = Array.isArray(result) ? result : (result as { data?: unknown[] })?.data ?? [];
		let themes = normalizeThemeList(raw);

		if (themes.length === 0) {
			const seedRes = await fetch('/api/admin/themes/seed', {
				method: 'POST',
				credentials: 'include',
			});
			if (seedRes.ok) {
				const seeded = await seedRes.json().catch(() => ({}));
				raw = Array.isArray(seeded) ? seeded : (seeded as { data?: unknown[] })?.data ?? [];
				themes = normalizeThemeList(raw);
			}
		}

		return {
			initialThemes: themes,
			themesLoadError: '',
		};
	} catch {
		return {
			initialThemes: [],
			themesLoadError: 'Failed to load templates',
		};
	}
};
