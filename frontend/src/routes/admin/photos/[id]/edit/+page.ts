import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const photoId = params.id;
	let initialPhoto: Record<string, unknown> | null = null;
	let loadError = '';

	try {
		const response = await fetch(`/api/admin/photos/${encodeURIComponent(photoId)}?t=${Date.now()}`, {
			cache: 'no-store',
			credentials: 'include',
		});

		if (!response.ok) {
			loadError = `Failed to load photo (${response.status})`;
		} else {
			const body = await response.json();
			const photo = (body as { data?: unknown }).data ?? body;
			if (photo && typeof photo === 'object') {
				initialPhoto = photo as Record<string, unknown>;
			}
		}
	} catch {
		loadError = loadError || 'Failed to load photo';
	}

	return { photoId, initialPhoto, loadError };
};
