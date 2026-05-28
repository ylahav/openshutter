import type { PageLoad } from './$types';
import type { SiteConfig } from '$lib/types/site-config';

export const load: PageLoad = async ({ fetch, url }) => {
	try {
		const response = await fetch('/api/admin/site-config', { credentials: 'include' });
		const result = await response.json().catch(() => ({}));

		if (!response.ok) {
			const errMsg =
				(typeof result === 'object' && result && 'error' in result
					? String((result as { error?: string }).error)
					: null) || `Failed to load configuration (${response.status})`;
			return { initialConfig: null as SiteConfig | null, loadError: errMsg, initialTab: null as string | null };
		}

		const data =
			typeof result === 'object' && result && 'success' in result && (result as { success?: boolean }).success
				? (result as { data: SiteConfig }).data
				: (result as SiteConfig);

		const tab = url.searchParams.get('tab');
		return {
			initialConfig: data ?? null,
			loadError: data ? '' : 'No configuration data received',
			initialTab: tab,
		};
	} catch {
		return {
			initialConfig: null as SiteConfig | null,
			loadError: 'Failed to load configuration',
			initialTab: null as string | null,
		};
	}
};
