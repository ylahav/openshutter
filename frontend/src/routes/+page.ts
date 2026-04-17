import type { PageLoad } from './$types';
import type { TemplateAlbum } from '$types';
import { logger } from '$lib/utils/logger';

export const load: PageLoad = async ({ fetch, parent }) => {
  const { visitorTemplatePack } = await parent();
  const pack = typeof visitorTemplatePack === 'string' ? visitorTemplatePack : 'atelier';

  let rootAlbums: TemplateAlbum[] = [];
  let albumsError: string | null = null;
  let page: any = null;
  let modules: any[] = [];

  try {
    // Fetch root albums (no parent) - API handles access control.
    // Use the frontend API route which will proxy to backend
    const res = await fetch('/api/albums?parentId=root');

    if (!res.ok) {
      logger.error('Failed to fetch root albums:', res.status, res.statusText);
      albumsError = 'Failed to fetch albums';
    } else {
      const albums = await res.json();
      if (Array.isArray(albums)) {
        rootAlbums = albums as TemplateAlbum[];
      } else {
        logger.error('Unexpected albums response format:', albums);
        albumsError = 'Failed to fetch albums';
      }
    }
  } catch (err) {
    logger.error('Error fetching root albums:', err);
    albumsError = 'Failed to fetch albums';
  }

  // Fetch the DB-defined home page via reserved page role.
  // Backend auto-creates it if missing.
  try {
    const pageRes = await fetch(`/api/pages/home?role=home&pack=${encodeURIComponent(pack)}`);
    if (pageRes.ok) {
      const result = await pageRes.json();
      const payload = result?.success ? result?.data : result;
      page = payload?.page ?? payload ?? null;
      modules = Array.isArray(payload?.modules) ? payload.modules : [];
    } else {
      logger.error('[Home] Failed to fetch DB home page:', pageRes.status, pageRes.statusText);
    }
  } catch (err) {
    logger.error('[Home] Error fetching DB home page:', err);
  }
  
  logger.debug('[Home] Final load result:', { 
    hasPage: !!page,
    modulesCount: modules.length,
  });

  return {
    rootAlbums,
    albumsError,
    page,
    modules
  };
};
