import type { PageLoad } from './$types';

export type StorageConfigRow = {
	providerId: string;
	name?: string;
	isEnabled?: boolean;
	config?: Record<string, unknown>;
};

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/admin/storage', { credentials: 'include' });
		const body = await response.json().catch(() => ({}));

		if (!response.ok) {
			const message =
				(typeof body === 'object' && body && 'message' in body
					? String((body as { message?: string }).message)
					: null) || `Failed to load storage (${response.status})`;
			return { initialStorageConfigs: null as StorageConfigRow[] | null, storageLoadError: message };
		}

		const configs = Array.isArray(body) ? body : [];
		return { initialStorageConfigs: configs as StorageConfigRow[], storageLoadError: '' };
	} catch {
		return {
			initialStorageConfigs: null as StorageConfigRow[] | null,
			storageLoadError: 'Failed to load storage configuration',
		};
	}
};
