import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const albumId = params.id;
	let initialAlbum: Record<string, unknown> | null = null;
	let initialPhotos: unknown[] = [];
	let loadError = '';

	try {
		const cacheBuster = `t=${Date.now()}`;
		const [albumRes, photosRes] = await Promise.all([
			fetch(`/api/admin/albums/${encodeURIComponent(albumId)}?${cacheBuster}`, {
				cache: 'no-store',
				credentials: 'include',
			}),
			fetch(`/api/admin/albums/${encodeURIComponent(albumId)}/photos?${cacheBuster}`, {
				cache: 'no-store',
				credentials: 'include',
			}),
		]);

		if (!albumRes.ok) {
			loadError = `Failed to load album (${albumRes.status})`;
		} else {
			const albumBody = await albumRes.json();
			const album = (albumBody as { data?: unknown }).data ?? albumBody;
			if (album && typeof album === 'object') {
				initialAlbum = album as Record<string, unknown>;
			}
		}

		if (!photosRes.ok && !loadError) {
			loadError = `Failed to load photos (${photosRes.status})`;
		} else if (photosRes.ok) {
			const photosBody = await photosRes.json();
			const rows =
				(photosBody as { success?: boolean; data?: unknown[] }).success &&
				Array.isArray((photosBody as { data?: unknown[] }).data)
					? (photosBody as { data: unknown[] }).data
					: Array.isArray(photosBody)
						? photosBody
						: [];
			initialPhotos = rows;
		}
	} catch {
		loadError = loadError || 'Failed to load album';
	}

	return { albumId, initialAlbum, initialPhotos, loadError };
};
