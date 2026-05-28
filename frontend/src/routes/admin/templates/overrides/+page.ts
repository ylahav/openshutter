import type { PageLoad } from './$types';

function parseTemplatesPayload(data: unknown): unknown[] {
	if (!data || typeof data !== 'object') return [];
	const d = data as Record<string, unknown>;
	if (d.success && Array.isArray(d.data)) return d.data;
	if (Array.isArray(data)) return data as unknown[];
	if (Array.isArray(d.templates)) return d.templates as unknown[];
	return [];
}

export const load: PageLoad = async ({ fetch, url }) => {
	const themeId = url.searchParams.get('themeId');
	let initialTheme: Record<string, unknown> | null = null;
	let initialTemplates: unknown[] = [];
	let loadError = '';

	try {
		const templatesRes = await fetch('/api/admin/templates', {
			credentials: 'include',
			headers: { 'Cache-Control': 'no-cache' },
		});

		if (!templatesRes.ok) {
			loadError = `Failed to load templates (${templatesRes.status})`;
		} else {
			initialTemplates = parseTemplatesPayload(await templatesRes.json());
		}

		if (themeId) {
			const themeRes = await fetch(`/api/admin/themes/${encodeURIComponent(themeId)}`, {
				credentials: 'include',
			});
			if (!themeRes.ok) {
				loadError = loadError || `Failed to load theme (${themeRes.status})`;
			} else {
				const body = await themeRes.json();
				const theme = (body as { data?: unknown }).data ?? body;
				if (theme && typeof theme === 'object') {
					initialTheme = theme as Record<string, unknown>;
				}
			}
		}
	} catch {
		loadError = loadError || 'Failed to load theme editor';
	}

	return { themeId, initialTheme, initialTemplates, loadError };
};
