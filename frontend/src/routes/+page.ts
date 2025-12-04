import type { PageLoad } from './$types';
import type { TemplateAlbum } from '$types';

export const load: PageLoad = async ({ fetch }) => {
  try {
    // Fetch root albums (no parent) - API handles access control.
    // Use absolute backend URL so this works in SSR as well.
    const backendUrl = 'http://localhost:5000';
    const res = await fetch(`${backendUrl}/api/albums?parentId=root`);

    if (!res.ok) {
      console.error('Failed to fetch root albums:', res.status, res.statusText);
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
    console.error('Error fetching root albums:', err);
    return { rootAlbums: [], albumsError: 'Failed to fetch albums' };
  }
};
