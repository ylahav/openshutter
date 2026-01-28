import type { PageLoad } from './$types';
import type { TemplateAlbum } from '$types';
import { logger } from '$lib/utils/logger';

export const load: PageLoad = async ({ fetch, parent }) => {
  // Get data from parent (server load)
  await parent();

  try {
    // Fetch root albums (no parent) - API handles access control.
    // Use the frontend API route which will proxy to backend
    const res = await fetch('/api/albums?parentId=root');

    if (!res.ok) {
      logger.error('Failed to fetch root albums:', res.status, res.statusText);
      return { rootAlbums: [], albumsError: 'Failed to fetch albums' };
    }

    const albums = await res.json();

    if (Array.isArray(albums)) {
      return {
        rootAlbums: albums as TemplateAlbum[],
        albumsError: null,
      };
    }

    console.error('Unexpected albums response format:', albums);
    return { rootAlbums: [], albumsError: 'Failed to fetch albums' };
  } catch (err) {
    logger.error('Error fetching root albums:', err);
    return { rootAlbums: [], albumsError: 'Failed to fetch albums' };
  }
};
