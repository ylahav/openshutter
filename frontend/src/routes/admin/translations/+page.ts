import type { PageLoad } from './$types';

export type TranslationLanguage = {
	code: string;
	name: string;
	flag: string;
};

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/admin/translations', { credentials: 'include' });
		const result = await response.json().catch(() => ({}));

		if (!response.ok || !result?.success) {
			const message =
				(typeof result === 'object' && result && 'error' in result
					? String((result as { error?: string }).error)
					: null) || `Failed to load languages (${response.status})`;
			return {
				initialLanguages: [] as TranslationLanguage[],
				loadError: message,
			};
		}

		const initialLanguages = Array.isArray(result.data) ? result.data : [];
		return { initialLanguages: initialLanguages as TranslationLanguage[], loadError: '' };
	} catch {
		return {
			initialLanguages: [] as TranslationLanguage[],
			loadError: 'Failed to load languages',
		};
	}
};
