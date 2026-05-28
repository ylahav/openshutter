import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const albumId = params.id;
	let initialAlbum: Record<string, unknown> | null = null;
	let loadError = '';

	try {
		const response = await fetch(
			`/api/admin/albums/${encodeURIComponent(albumId)}?t=${Date.now()}`,
			{
				cache: 'no-store',
				credentials: 'include',
			},
		);

		if (!response.ok) {
			loadError = `Failed to load album (${response.status})`;
		} else {
			const body = await response.json();
			const album = (body as { data?: unknown }).data ?? body;
			if (album && typeof album === 'object') {
				initialAlbum = album as Record<string, unknown>;
			}
		}
	} catch {
		loadError = loadError || 'Failed to load album';
	}

	return { albumId, initialAlbum, loadError };
};
