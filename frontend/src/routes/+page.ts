import type { PageLoad } from './$types';
import type { TemplateAlbum } from '$types';
import { logger } from '$lib/utils/logger';

export const load: PageLoad = async ({ fetch, parent }) => {
  // Get data from parent (server load)
  await parent();

  let rootAlbums: TemplateAlbum[] = [];
  let albumsError: string | null = null;
  let pageModules: any[] = [];
  let pageLayout: { gridRows?: number; gridColumns?: number } | null = null;

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

  // Fetch site config to get pageModules for home page
  try {
    const configRes = await fetch('/api/site-config');
    if (configRes.ok) {
      const configData = await configRes.json();
      const siteConfig = configData.success ? configData.data : configData;
      logger.debug('[Home] Site config loaded:', { 
        hasTemplate: !!siteConfig?.template,
        hasPageModules: !!siteConfig?.template?.pageModules,
        hasHomeModules: !!siteConfig?.template?.pageModules?.home,
        homeModulesCount: siteConfig?.template?.pageModules?.home?.length || 0
      });
      if (siteConfig?.template?.pageModules?.home) {
        pageModules = Array.isArray(siteConfig.template.pageModules.home) 
          ? siteConfig.template.pageModules.home 
          : [];
        logger.debug('[Home] Loaded pageModules:', pageModules);
      }
      if (siteConfig?.template?.pageLayout?.home) {
        pageLayout = siteConfig.template.pageLayout.home;
        logger.debug('[Home] Loaded pageLayout:', pageLayout);
      }
    }
  } catch (err) {
    logger.error('Error fetching site config for pageModules:', err);
  }
  
  logger.debug('[Home] Final load result:', { 
    pageModulesCount: pageModules.length, 
    hasPageLayout: !!pageLayout 
  });

  return {
    rootAlbums,
    albumsError,
    pageModules,
    pageLayout
  };
};
